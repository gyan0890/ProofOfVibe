#!/usr/bin/env bash
# Proof of Vibe — Starknet Sepolia Deployment Script
# Requires: starkli, scarb, jq
# Usage: ./scripts/deploy.sh

set -euo pipefail

echo "=== Proof of Vibe Deployment ==="
echo "Network: Starknet Sepolia Testnet"
echo ""

# Load env
source .env 2>/dev/null || true

# Config
ACCOUNT_FILE="${ACCOUNT_FILE:-~/.starkli-wallets/deployer/account.json}"
KEYSTORE_FILE="${KEYSTORE_FILE:-~/.starkli-wallets/deployer/keystore.json}"
RPC="${STARKNET_RPC_URL:-https://free-rpc.nethermind.io/sepolia-juno}"

# Season end = now + 14 days (in seconds)
SEASON_END=$(( $(date +%s) + 14 * 24 * 3600 ))
DEPLOYER_ADDRESS=$(starkli account fetch "$ACCOUNT_FILE" 2>/dev/null | jq -r '.address')

echo "Deployer: $DEPLOYER_ADDRESS"
echo "Season end: $SEASON_END ($(date -d @$SEASON_END 2>/dev/null || date -r $SEASON_END))"
echo ""

# Build contracts
echo "[1/5] Building contracts..."
cd contracts && scarb build && cd ..
echo "✓ Build complete"

SIERRA_DIR="contracts/target/dev"

# Declare VibeCard
echo "[2/5] Declaring VibeCard..."
VIBECARD_CLASS=$(starkli declare \
  "$SIERRA_DIR/proof_of_vibe_VibeCard.contract_class.json" \
  --account "$ACCOUNT_FILE" \
  --keystore "$KEYSTORE_FILE" \
  --rpc "$RPC" \
  --watch 2>&1 | tail -1)
echo "✓ VibeCard class: $VIBECARD_CLASS"

# Declare SeasonClock
echo "[3/5] Declaring SeasonClock..."
CLOCK_CLASS=$(starkli declare \
  "$SIERRA_DIR/proof_of_vibe_SeasonClock.contract_class.json" \
  --account "$ACCOUNT_FILE" \
  --keystore "$KEYSTORE_FILE" \
  --rpc "$RPC" \
  --watch 2>&1 | tail -1)
echo "✓ SeasonClock class: $CLOCK_CLASS"

# Declare Leaderboard
echo "[4/5] Declaring VibeLeaderboard..."
LB_CLASS=$(starkli declare \
  "$SIERRA_DIR/proof_of_vibe_VibeLeaderboard.contract_class.json" \
  --account "$ACCOUNT_FILE" \
  --keystore "$KEYSTORE_FILE" \
  --rpc "$RPC" \
  --watch 2>&1 | tail -1)
echo "✓ VibeLeaderboard class: $LB_CLASS"

# Deploy with placeholder addresses first, then update
echo "[5/5] Deploying contracts..."

# Deploy SeasonClock (needs VibeCard address — deploy with placeholder, update via admin)
PLACEHOLDER="0x0"

CLOCK_ADDR=$(starkli deploy \
  "$CLOCK_CLASS" \
  "$SEASON_END" "$PLACEHOLDER" "$DEPLOYER_ADDRESS" \
  --account "$ACCOUNT_FILE" \
  --keystore "$KEYSTORE_FILE" \
  --rpc "$RPC" \
  --watch 2>&1 | tail -1)
echo "✓ SeasonClock deployed: $CLOCK_ADDR"

VIBECARD_ADDR=$(starkli deploy \
  "$VIBECARD_CLASS" \
  "$SEASON_END" "$CLOCK_ADDR" \
  --account "$ACCOUNT_FILE" \
  --keystore "$KEYSTORE_FILE" \
  --rpc "$RPC" \
  --watch 2>&1 | tail -1)
echo "✓ VibeCard deployed: $VIBECARD_ADDR"

LB_ADDR=$(starkli deploy \
  "$LB_CLASS" \
  "$VIBECARD_ADDR" \
  --account "$ACCOUNT_FILE" \
  --keystore "$KEYSTORE_FILE" \
  --rpc "$RPC" \
  --watch 2>&1 | tail -1)
echo "✓ VibeLeaderboard deployed: $LB_ADDR"

echo ""
echo "=== Deployment complete ==="
echo ""
echo "Add these to your .env.local:"
echo "NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS=$VIBECARD_ADDR"
echo "NEXT_PUBLIC_SEASON_CLOCK_CONTRACT_ADDRESS=$CLOCK_ADDR"
echo "NEXT_PUBLIC_LEADERBOARD_CONTRACT_ADDRESS=$LB_ADDR"
echo ""
echo "Next steps:"
echo "1. Update oracle/.env with VIBECARD_CONTRACT_ADDRESS=$VIBECARD_ADDR"
echo "2. Start oracle: cd oracle && npm start"
echo "3. Update .env.local and restart Next.js"
