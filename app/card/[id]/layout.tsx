import { Metadata } from "next";
import { ReactNode } from "react";

const BASE_URL = "https://proof-of-vibe-kohl.vercel.app";
const RPC_URL =
  process.env.NEXT_PUBLIC_STARKNET_RPC_URL ??
  "https://starknet-sepolia.public.blastapi.io";
const CONTRACT =
  (process.env.NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS ?? "0x0").trim();

/** Starknet function selector = low 250 bits of keccak256(name).
 *  These are pre-computed constants — no starknet.js import needed at build time. */
const SELECTOR_GET_CARD =
  "0x24253a19dd3c15a43538f59004c20c0d6b540deafc84f59b217cb80dc538ad";
const SELECTOR_GET_BATTLE_WINS =
  "0x31394c921547c3a6309c500a6a533ff0ba9658d6d5e55e8dc238538e08915a0";
const SELECTOR_GET_BATTLE_LOSSES =
  "0x35ca64843a20f510a5c4bee741d88b6933c07e989367c0044b930fe603e63b";

interface CardRpcResult {
  personaName: string;
  revealedType: number | null;
  wins: number;
  losses: number;
}

async function fetchCardData(tokenId: number): Promise<CardRpcResult> {
  const calldata = [`0x${tokenId.toString(16)}`, "0x0"];

  async function rpcCall(selector: string, cd: string[]) {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "starknet_call",
        params: {
          request: {
            contract_address: CONTRACT,
            entry_point_selector: selector,
            calldata: cd,
          },
          block_id: "latest",
        },
      }),
      next: { revalidate: 60 }, // 1-minute cache on each card
    } as any);
    const j = await res.json();
    return j.result as string[] | undefined;
  }

  try {
    const [cardResult, winsResult, lossesResult] = await Promise.all([
      rpcCall(SELECTOR_GET_CARD, calldata),
      rpcCall(SELECTOR_GET_BATTLE_WINS, calldata),
      rpcCall(SELECTOR_GET_BATTLE_LOSSES, calldata),
    ]);

    // CardData struct layout:
    // [0] owner, [1] commitment, [2] ipfs_cid, [3] revealed_type,
    // [4] palette_revealed, [5] mint_timestamp, [6] persona_name
    let personaName = `Vibe #${tokenId}`;
    let revealedType: number | null = null;

    if (cardResult && cardResult.length >= 7) {
      const revealedRaw = parseInt(cardResult[3], 16);
      if (revealedRaw !== 255) revealedType = revealedRaw;

      // Decode short-string felt252 (ASCII bytes packed into a hex felt)
      const felt = cardResult[6];
      const hex = felt.startsWith("0x") ? felt.slice(2) : felt;
      const bytes = Buffer.from(hex.replace(/^0+/, "") || "0", "hex");
      const decoded = bytes.toString("ascii").replace(/\0/g, "").trim();
      if (decoded) personaName = decoded;
    }

    const wins = winsResult ? parseInt(winsResult[0] ?? "0", 16) : 0;
    const losses = lossesResult ? parseInt(lossesResult[0] ?? "0", 16) : 0;

    return { personaName, revealedType, wins, losses };
  } catch {
    return { personaName: `Vibe #${tokenId}`, revealedType: null, wins: 0, losses: 0 };
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const tokenId = parseInt(params.id, 10);

  if (!tokenId || tokenId <= 0 || tokenId >= 1_000_000) {
    return {
      title: "Proof of Vibe",
      description: "Your onchain soul. Proven. Hidden.",
    };
  }

  const { personaName, revealedType, wins, losses } = await fetchCardData(tokenId);

  const typeParam =
    revealedType !== null ? revealedType.toString() : "hidden";
  const ogImageUrl =
    `${BASE_URL}/api/og` +
    `?name=${encodeURIComponent(personaName)}` +
    `&type=${typeParam}` +
    `&wins=${wins}` +
    `&losses=${losses}`;

  const title =
    revealedType !== null
      ? `${personaName} | Proof of Vibe`
      : `${personaName} — Identity Sealed | Proof of Vibe`;

  const description =
    revealedType !== null
      ? `${personaName}'s vibe has been revealed on Starknet. Battle to protect your privacy.`
      : `Can you crack ${personaName}'s identity? Battle on Proof of Vibe to expose their hidden vibe type.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function CardLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
