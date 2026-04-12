# Proof of Vibe

A privacy-focused, visually stunning 14-day seasonal campaign built on Starknet.

**Your onchain soul. Proven. Hidden.**

Mint your Vibe Card. Battle to reveal. Season ends and all is unmasked.

---

## Quick Start

```bash
git clone <repo>
cd ProofOfVibe
npm install
cp .env.example .env.local
npm run dev
```

Visit `http://localhost:3000/demo` for a full no-wallet preview.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + Framer Motion |
| Onchain | Starknet.js + starknet-react |
| Auth | Cartridge Controller (passkeys) |
| Contracts | Cairo on Starknet Sepolia |
| Storage | web3.storage (IPFS for encrypted salts) |
| Oracle | Node.js cron worker |

---

## Project Structure

```
ProofOfVibe/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Landing
│   ├── onboard/            # Connect wallet or take quiz
│   ├── quiz/               # 5-question vibe quiz
│   ├── reveal/             # Post-mint reveal sequence
│   ├── card/[id]/          # Public card view
│   ├── battle/[id]/        # Battle flow
│   ├── leaderboard/        # Season leaderboard
│   ├── season/             # Season stats
│   └── demo/               # Full mock demo (no wallet needed)
├── components/
│   ├── VibeCard.tsx        # The core card component
│   ├── Providers.tsx       # StarknetConfig + connectors
│   └── icons/
├── contracts/              # Cairo smart contracts
│   ├── src/
│   │   ├── vibe_card.cairo
│   │   ├── season_clock.cairo
│   │   └── vibe_leaderboard.cairo
│   └── tests/
├── demo/
│   └── mockData.ts         # Seeded mock data for /demo
├── lib/
│   ├── types.ts
│   ├── vibeTypes.ts        # 7 vibe types + battle affinity matrix
│   ├── constants.ts
│   └── utils.ts
├── oracle/                 # Node.js oracle worker
│   └── index.js
└── scripts/
    └── deploy.sh           # starkli deployment script
```

---

## Vibe Types

| # | Type | Color | Strong vs | Weak vs |
|---|------|-------|-----------|---------|
| 0 | The Architect | `#7F77DD` | Degen | Ghost |
| 1 | The Degen | `#D85A30` | Socialite | Architect |
| 2 | The Ghost | `#888780` | Architect | Oracle |
| 3 | The Builder | `#1D9E75` | Ghost | Whale Hunter |
| 4 | The Whale Hunter | `#185FA5` | Builder | Degen |
| 5 | The Socialite | `#D4537E` | Oracle | Degen |
| 6 | The Oracle | `#BA7517` | Ghost | Socialite |

---

## Testnet Deployment

### Prerequisites
- [scarb](https://docs.swmansion.com/scarb/) ≥ 2.8.0
- [starkli](https://book.starkli.rs/) configured with a Sepolia account
- A funded Sepolia account

### Steps

```bash
# 1. Set up starkli account (if needed)
starkli account fetch --output ~/.starkli-wallets/deployer/account.json

# 2. Deploy all three contracts
chmod +x scripts/deploy.sh
./scripts/deploy.sh

# 3. Copy the output addresses into .env.local
# 4. Start the oracle worker
cd oracle && npm install && npm start
```

---

## Smart Contracts

### VibeCard.cairo
ERC721-like contract holding card state.

Key mechanics:
- `mint()` — stores keccak commitment, IPFS CID for encrypted salt
- `initiate_battle() / submit_defense() / resolve_battle()` — commit-reveal battle system
- `_apply_trait_exposure()` — progressive reveal at 1, 2, 3, 5, 8 losses
- `owner_reveal() / force_reveal()` — early or season-end reveal with commitment verification

### SeasonClock.cairo
- `trigger_mass_reveal()` — callable by anyone after `season_end` timestamp
- `publish_salt_key()` — owner publishes IPFS CID of decryption key so community can verify all reveals

### VibeLeaderboard.cairo
- Tracks battle wins, guess accuracy
- Called by VibeCard contract only (access-controlled)

---

## Privacy Model

| What | Visibility |
|------|-----------|
| Wallet address | Public (linked to card on mint) |
| Vibe Type | Hidden until revealed |
| Commitment hash | Public onchain from mint |
| Salt (type secret) | Encrypted on IPFS, released at season end |
| Trait words (partial) | Revealed progressively through battle losses |
| Aura palette color | Revealed after 5 losses |
| Full type name | Revealed after 8 losses OR voluntary OR season end |

**What is proven:** The commitment `keccak256(address + vibe_type + salt)` is stored onchain at mint. At reveal, anyone can verify the salt decrypts to the correct type — the Starknet Foundation cannot change it, and neither can the player.

**What is centralised (MVP):** The oracle that fetches Voyager tx history. The salt encryption key held by the Starknet Foundation.

---

## Season Operator Guide

At season end (Day 14):

1. **Publish the salt key** — call `SeasonClock.publish_salt_key(ipfs_cid)` from the owner account. This makes the master decryption key available on IPFS.

2. **Trigger mass reveal** — anyone can call `SeasonClock.trigger_mass_reveal()` after the timestamp passes.

3. **Run the reveal script** — community members (or the Foundation) run the off-chain script that:
   - Downloads salts from IPFS
   - Decrypts each salt with the published key
   - Calls `VibeCard.force_reveal(token_id, vibe_type, salt)` for all unrevealed cards

4. **Verify** — anyone can verify any reveal by computing `keccak256(owner + vibe_type + salt)` and comparing to the onchain commitment.

---

## Production Upgrade Path (ZK Oracle)

The centralised Voyager oracle is documented as a **temporary MVP shortcut**.

Production replacement using [Garaga](https://github.com/keep-starknet-strange/garaga):

1. User fetches their Voyager API response client-side
2. Garaga generates a ZK proof that the response is authentic (ECDSA verification of Voyager's signing key)
3. The proof is submitted onchain instead of a trusted oracle signature
4. No trusted party required — fully verifiable activity scoring

This removes the oracle as a centralised trust assumption entirely.

---

## Environment Variables

See `.env.example` for the full list. Required for production:

```bash
NEXT_PUBLIC_STARKNET_RPC_URL
NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS
NEXT_PUBLIC_LEADERBOARD_CONTRACT_ADDRESS
NEXT_PUBLIC_SEASON_CLOCK_CONTRACT_ADDRESS
NEXT_PUBLIC_CHAIN_ID=SN_SEPOLIA
ORACLE_PRIVATE_KEY          # server-side only
WEB3_STORAGE_TOKEN
```

---

## Demo

Visit `/demo` for a fully mock, no-wallet experience:
- Card reveal slider (all 8 reveal levels)
- Mock battle step-through
- Seeded leaderboard with 20 cards
- Season clock at Day 7 of 14

---

Built on [Starknet](https://starknet.io) · Auth by [Cartridge Controller](https://docs.cartridge.gg)
