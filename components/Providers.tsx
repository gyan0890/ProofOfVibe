"use client";

import { StarknetConfig, jsonRpcProvider, argent, braavos, useConnect, useAccount } from "@starknet-react/core";
import { sepolia } from "@starknet-react/chains";
import { ReactNode, useMemo, useState, useEffect } from "react";

/** Persists which connector was last used so CartridgeAutoReconnect can restore it on refresh. */
function ConnectorPersist() {
  const { status, connector } = useAccount();
  useEffect(() => {
    if (status === "connected" && connector?.id) {
      console.log("[ConnectorPersist] saving lastUsedConnector:", connector.id);
      localStorage.setItem("lastUsedConnector", connector.id);
    }
  }, [status, connector]);
  return null;
}

function CartridgeAutoReconnect({ cartridgeAvailable }: { cartridgeAvailable: boolean }) {
  const { connect, connectors } = useConnect();
  const { status } = useAccount();

  useEffect(() => {
    console.log("[CartridgeAutoReconnect] fired — cartridgeAvailable:", cartridgeAvailable, "status:", status);
    if (!cartridgeAvailable) return;
    if (status === "connected") return;

    const lastUsed =
      typeof window !== "undefined" ? localStorage.getItem("lastUsedConnector") : null;
    console.log("[CartridgeAutoReconnect] lastUsedConnector:", lastUsed);
    // Cartridge connector id is "controller" (not "cartridge")
    if (lastUsed !== "controller") return;

    const cartridge = connectors.find((c) => c.id === "controller");
    console.log("[CartridgeAutoReconnect] found connector:", cartridge?.id ?? "none", "available ids:", connectors.map(c => c.id));
    if (!cartridge) return;

    // isReady() = iframe initialized; probe() = active session exists.
    // We must probe first — calling connect() without a session opens the popup.
    (async () => {
      const ctrl = (cartridge as any).controller;
      if (!ctrl) {
        console.warn("[CartridgeAutoReconnect] no controller instance found");
        return;
      }
      const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

      // Wait up to ~4s for the Cartridge iframe to fully load
      let probeResult: any = null;
      for (let i = 0; i < 7; i++) {
        try {
          probeResult = await ctrl.probe?.();
          console.log(`[CartridgeAutoReconnect] probe attempt ${i + 1}:`, probeResult);
          if (probeResult && !Array.isArray(probeResult) && (probeResult.username || probeResult.address)) break;
        } catch (e) {
          console.warn(`[CartridgeAutoReconnect] probe attempt ${i + 1} threw:`, e);
        }
        probeResult = null;
        await delay(600);
      }

      if (!probeResult?.username && !probeResult?.address) {
        console.log("[CartridgeAutoReconnect] no active session — staying disconnected");
        return;
      }

      console.log("[CartridgeAutoReconnect] session found for", probeResult.username ?? probeResult.address, "— reconnecting silently");
      connect({ connector: cartridge });
    })();
  }, [cartridgeAvailable, connectors, status, connect]);

  return null;
}

// ControllerConnector is lazy-imported to prevent WASM from loading during SSR
export function Providers({ children }: { children: ReactNode }) {
  const [ControllerConnector, setControllerConnector] = useState<any>(null);

  useEffect(() => {
    import("@cartridge/connector").then((mod) => {
      // Class must be wrapped so React doesn't treat it as a functional state updater
      setControllerConnector(() => mod.ControllerConnector);
    });
  }, []);

  const connectors = useMemo(() => {
    if (!ControllerConnector) return [argent(), braavos()];

    const contractAddress =
      process.env.NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS ?? "0x0";

    const cartridge = new ControllerConnector({
      rpcUrl:
        process.env.NEXT_PUBLIC_STARKNET_RPC_URL ??
        "https://starknet-sepolia.public.blastapi.io",
      // Note: FeeSource.CREDITS is NOT used here — on Sepolia it fails because
      // Cartridge's CREDITS token has no Ekubo liquidity routes on testnet.
      // Users need a small amount of Sepolia ETH/STRK in their Cartridge account.
      // Faucet: https://faucet.starknet.io
      policies: [
        { target: contractAddress, method: "mint" },
        { target: contractAddress, method: "initiate_battle" },
        { target: contractAddress, method: "submit_defense" },
        { target: contractAddress, method: "resolve_battle" },
        { target: contractAddress, method: "owner_reveal" },
        { target: contractAddress, method: "submit_guess" },
      ],
    });
    return [cartridge, argent(), braavos()];
  }, [ControllerConnector]);

  const provider = jsonRpcProvider({
    rpc: () => ({
      nodeUrl:
        process.env.NEXT_PUBLIC_STARKNET_RPC_URL ??
        "https://api.cartridge.gg/x/starknet/sepolia",
    }),
  });

  return (
    <StarknetConfig
      chains={[sepolia]}
      provider={provider}
      connectors={connectors}
      autoConnect={false}
    >
      <ConnectorPersist />
      <CartridgeAutoReconnect cartridgeAvailable={!!ControllerConnector} />
      {children}
    </StarknetConfig>
  );
}
