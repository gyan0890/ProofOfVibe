"use client";

import { StarknetConfig, jsonRpcProvider, argent, braavos } from "@starknet-react/core";
import { sepolia } from "@starknet-react/chains";
import { ReactNode, useMemo, useState, useEffect } from "react";

// ControllerConnector is lazy-imported to prevent WASM from loading during SSR
export function Providers({ children }: { children: ReactNode }) {
  const [ControllerConnector, setControllerConnector] = useState<any>(null);

  useEffect(() => {
    import("@cartridge/connector").then((mod) => {
      setControllerConnector(() => mod.ControllerConnector);
    });
  }, []);

  const connectors = useMemo(() => {
    if (!ControllerConnector) return [argent(), braavos()];
    const cartridge = new ControllerConnector({
      policies: [
        { target: process.env.NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS ?? "0x0", method: "mint" },
        { target: process.env.NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS ?? "0x0", method: "initiate_battle" },
        { target: process.env.NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS ?? "0x0", method: "submit_defense" },
        { target: process.env.NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS ?? "0x0", method: "resolve_battle" },
        { target: process.env.NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS ?? "0x0", method: "owner_reveal" },
        { target: process.env.NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS ?? "0x0", method: "submit_guess" },
      ],
      rpc: process.env.NEXT_PUBLIC_STARKNET_RPC_URL ?? "https://api.cartridge.gg/x/starknet/sepolia",
    });
    return [cartridge, argent(), braavos()];
  }, [ControllerConnector]);

  const provider = jsonRpcProvider({
    rpc: () => ({
      nodeUrl: process.env.NEXT_PUBLIC_STARKNET_RPC_URL ?? "https://api.cartridge.gg/x/starknet/sepolia",
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
