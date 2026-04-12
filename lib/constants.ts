export const SEASON_DURATION_DAYS = 14;
export const SEASON_START = new Date("2025-01-01T00:00:00Z").getTime();
export const SEASON_END = SEASON_START + SEASON_DURATION_DAYS * 24 * 60 * 60 * 1000;

export const BATTLE_EXPIRY_SECONDS = 3600; // 1 hour

export const TRAIT_EXPOSE_THRESHOLDS = {
  TRAIT_1: 1,
  TRAIT_2: 2,
  BAR_ACCURATE: 3,
  PALETTE: 5,
  FULL_REVEAL: 8,
};

export const STARKNET_CHAIN_ID =
  process.env.NEXT_PUBLIC_CHAIN_ID ?? "SN_SEPOLIA";

export const CONTRACT_ADDRESSES = {
  vibeCard:
    process.env.NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS ??
    "0x0000000000000000000000000000000000000000",
  leaderboard:
    process.env.NEXT_PUBLIC_LEADERBOARD_CONTRACT_ADDRESS ??
    "0x0000000000000000000000000000000000000000",
  seasonClock:
    process.env.NEXT_PUBLIC_SEASON_CLOCK_CONTRACT_ADDRESS ??
    "0x0000000000000000000000000000000000000000",
};

export const SHARE_TWEET_TEMPLATE = (cardUrl: string) =>
  `I just minted my Proof of Vibe on Starknet 👁️\nMy type is hidden. Can you guess what I am?\nChallenge me: ${cardUrl}\n#ProofOfVibe #Starknet`;

export const VOYAGER_API_BASE = "https://api.voyager.online/beta";
