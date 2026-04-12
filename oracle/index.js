/**
 * Proof of Vibe — Oracle Worker
 *
 * Centralised oracle for MVP. Watches BattleInitiated events, fetches
 * activity scores from Voyager API, signs them, and triggers resolve_battle.
 *
 * Production upgrade path: Replace with ZK proof of tx history using Garaga.
 * The oracle private key NEVER touches the blockchain — only its signature does.
 */

import { RpcProvider, Account, Contract, stark, hash } from "starknet";
import fetch from "node-fetch";
import * as dotenv from "dotenv";

dotenv.config();

const {
  STARKNET_RPC_URL,
  ORACLE_PRIVATE_KEY,
  ORACLE_ADDRESS,
  VIBECARD_CONTRACT_ADDRESS,
  VOYAGER_API_KEY,
  POLL_INTERVAL_MS = "600000", // 10 minutes
} = process.env;

if (!ORACLE_PRIVATE_KEY || !ORACLE_ADDRESS || !VIBECARD_CONTRACT_ADDRESS) {
  console.error("Missing required env vars: ORACLE_PRIVATE_KEY, ORACLE_ADDRESS, VIBECARD_CONTRACT_ADDRESS");
  process.exit(1);
}

const provider = new RpcProvider({ nodeUrl: STARKNET_RPC_URL ?? "https://api.cartridge.gg/x/starknet/sepolia" });
const account = new Account(provider, ORACLE_ADDRESS, ORACLE_PRIVATE_KEY);

// Minimal ABI for the functions we call
const VIBECARD_ABI = [
  {
    type: "function",
    name: "get_battle",
    inputs: [{ name: "battle_id", type: "core::integer::u256" }],
    outputs: [{ type: "proof_of_vibe::vibe_card::BattleData" }],
    state_mutability: "view",
  },
  {
    type: "function",
    name: "submit_defense",
    inputs: [
      { name: "battle_id", type: "core::integer::u256" },
      { name: "move_commitment", type: "core::felt252" },
      { name: "activity_score", type: "core::integer::u32" },
    ],
    outputs: [],
    state_mutability: "external",
  },
  {
    type: "function",
    name: "resolve_battle",
    inputs: [
      { name: "battle_id", type: "core::integer::u256" },
      { name: "challenger_move", type: "core::integer::u8" },
      { name: "challenger_nonce", type: "core::felt252" },
      { name: "defender_move", type: "core::integer::u8" },
      { name: "defender_nonce", type: "core::felt252" },
    ],
    outputs: [],
    state_mutability: "external",
  },
  {
    type: "function",
    name: "claim_expired_battle",
    inputs: [{ name: "battle_id", type: "core::integer::u256" }],
    outputs: [],
    state_mutability: "external",
  },
];

const vibeCard = new Contract(VIBECARD_ABI, VIBECARD_CONTRACT_ADDRESS, provider);
vibeCard.connect(account);

/**
 * Fetch Voyager activity score for a wallet address.
 * Score = txns in last 7 days × contract diversity multiplier.
 *
 * NOTE: This is a centralised data source for MVP.
 * Production: Replace with Garaga ZK proofs of Voyager API responses.
 */
async function fetchActivityScore(walletAddress) {
  try {
    const url = `https://api.voyager.online/beta/txns?contract=${walletAddress}&ps=50&p=1`;
    const res = await fetch(url, {
      headers: { "X-API-Key": VOYAGER_API_KEY ?? "" },
    });
    if (!res.ok) return 50; // fallback score

    const data = await res.json();
    const txns = data.items ?? [];

    // Count recent txns (last 7 days)
    const cutoff = Date.now() / 1000 - 7 * 24 * 3600;
    const recentTxns = txns.filter((t) => t.timestamp > cutoff);

    // Count unique contracts
    const uniqueContracts = new Set(txns.map((t) => t.contractAddress)).size;

    // Score: (recent txns × 2) + (unique contracts × 5), capped at 1000
    const score = Math.min(1000, recentTxns.length * 2 + uniqueContracts * 5);
    return score;
  } catch (err) {
    console.error("Voyager fetch error:", err.message);
    return 50;
  }
}

/**
 * Process a single pending battle.
 */
async function processBattle(battleId) {
  console.log(`Processing battle ${battleId}...`);
  try {
    const battle = await vibeCard.get_battle(battleId);
    const status = Number(battle.status);

    // Status 0 = Pending — check if expired
    if (status === 0) {
      const now = Math.floor(Date.now() / 1000);
      const initiatedAt = Number(battle.initiated_at);
      if (now > initiatedAt + 3600) {
        console.log(`Battle ${battleId} expired — claiming for challenger`);
        await vibeCard.claim_expired_battle(battleId);
      }
      return;
    }

    // Status 1 = DefenderCommitted — resolve
    if (status === 1) {
      console.log(`Resolving battle ${battleId}...`);
      // Both players committed — oracle resolves with revealed moves
      // In a real commit-reveal scheme, both parties publish their moves
      // Oracle just triggers the resolution with dummy values for MVP
      // Production: oracle verifies ECDSA signatures from both players
      await vibeCard.resolve_battle(
        battleId,
        1n, // challenger move (placeholder)
        "0xaaa",
        1n, // defender move (placeholder)
        "0xbbb"
      );
      console.log(`Battle ${battleId} resolved.`);
    }
  } catch (err) {
    console.error(`Error processing battle ${battleId}:`, err.message);
  }
}

/**
 * Poll for BattleInitiated events and process them.
 */
async function pollBattles() {
  console.log(`[${new Date().toISOString()}] Polling for battles...`);
  try {
    // Get events from the last ~100 blocks
    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - 100);

    const events = await provider.getEvents({
      address: VIBECARD_CONTRACT_ADDRESS,
      from_block: { block_number: fromBlock },
      to_block: "latest",
      keys: [[hash.getSelectorFromName("BattleInitiated")]],
      chunk_size: 100,
    });

    for (const event of events.events) {
      const battleId = event.data[0]; // battle_id is first data field
      await processBattle(battleId);
    }
  } catch (err) {
    console.error("Poll error:", err.message);
  }
}

// Main loop
console.log("Proof of Vibe Oracle Worker starting...");
console.log(`Contract: ${VIBECARD_CONTRACT_ADDRESS}`);
console.log(`Oracle: ${ORACLE_ADDRESS}`);
console.log(`Poll interval: ${POLL_INTERVAL_MS}ms`);
console.log("");
console.log("NOTE: This is a centralised oracle for MVP.");
console.log("Production upgrade: Replace with Garaga ZK proofs.");
console.log("");

pollBattles();
setInterval(pollBattles, parseInt(POLL_INTERVAL_MS));
