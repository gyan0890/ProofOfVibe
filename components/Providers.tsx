"use client";

import { StarknetConfig, jsonRpcProvider, argent, braavos } from "@starknet-react/core";
import { sepolia } from "@starknet-react/chains";
import { ReactNode, useMemo, useState, useEffect } from "react";

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
      {children}
    </StarknetConfig>
  );
}
