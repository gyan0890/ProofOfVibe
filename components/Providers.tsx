"use client";

import { StarknetConfig, jsonRpcProvider, argent, braavos, useConnect, useAccount } from "@starknet-react/core";
import { sepolia } from "@starknet-react/chains";
import { ReactNode, useMemo, useState, useEffect } from "react";

/**
 * Re-attempts auto-reconnect once the Cartridge connector finishes loading.
 * starknet-react's built-in autoConnect runs once on mount — but Cartridge is
 * lazy-loaded via useEffect, so it's missing from the connectors list at that
 * moment.  This component fires when cartridgeAvailable flips true and retries.
 */
function CartridgeAutoReconnect({ cartridgeAvailable }: { cartridgeAvailable: boolean }) {
  const { connect, connectors } = useConnect();
  const { status } = useAccount();

  useEffect(() => {
    if (!cartridgeAvailable) return;
    if (status === "connected") return;

    const lastUsed =
      typeof window !== "undefined" ? localStorage.getItem("lastUsedConnector") : null;
    if (lastUsed !== "cartridge") return;

    const cartridge = connectors.find((c) => c.id === "cartridge");
    if (!cartridge) return;

    cartridge
      .ready()
      .then((isReady) => {
        if (isReady) connect({ connector: cartridge });
      })
      .catch(() => {});
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
      autoConnect
    >
      <CartridgeAutoReconnect cartridgeAvailable={!!ControllerConnector} />
      {children}
    </StarknetConfig>
  );
}
