export const SEASON_DURATION_DAYS = 14;
export const SEASON_START = new Date(
  process.env.NEXT_PUBLIC_SEASON_START ?? "2026-05-03T00:00:00Z"
).getTime();
export const SEASON_END = SEASON_START + SEASON_DURATION_DAYS * 24 * 60 * 60 * 1000;

export const BATTLE_EXPIRY_SECONDS = 3600; // 1 hour

export const TRAIT_EXPOSE_THRESHOLDS = {
  TRAIT_1: 1,       // identity hint
  TRAIT_2: 2,       // geographic hint + bars accurate
  TRAIT_3: 3,       // behavioral hint
  PALETTE: 4,       // palette cracked
  FULL_REVEAL: 6,   // oracle auto-reveal trigger
};

export const STARKNET_CHAIN_ID =
  process.env.NEXT_PUBLIC_CHAIN_ID ?? "SN_SEPOLIA";

export const CONTRACT_ADDRESSES = {
  vibeCard:
    (process.env.NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS ?? "0x0000000000000000000000000000000000000000").trim(),
  leaderboard:
    (process.env.NEXT_PUBLIC_LEADERBOARD_CONTRACT_ADDRESS ?? "0x0000000000000000000000000000000000000000").trim(),
  seasonClock:
    (process.env.NEXT_PUBLIC_SEASON_CLOCK_CONTRACT_ADDRESS ?? "0x0000000000000000000000000000000000000000").trim(),
};

export const SHARE_TWEET_TEMPLATE = (cardUrl: string) =>
  `I just minted my Proof of Vibe on Starknet 👁️
My type is hidden. Can you guess what I am?
Challenge me: ${cardUrl}
#ProofOfVibe #Starknet`;

export const VOYAGER_API_BASE = "https://api.voyager.online/beta";
