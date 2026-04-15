"use client";

import { StarknetConfig, jsonRpcProvider, argent, braavos } from "@starknet-react/core";
import { sepolia } from "@starknet-react/chains";
import { ReactNode, useMemo, useState, useEffect } from "react";

// ControllerConnector is lazy-imported to prevent WASM from loading during SSR
export function Providers({ children }: { children: ReactNode }) {
  const [ControllerConnector, setControllerConnector] = useState<any>(null);
  const [FeeSource, setFeeSource] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      import("@cartridge/connector"),
      import("@cartridge/controller"),
    ]).then(([connectorMod, controllerMod]) => {
      setControllerConnector(() => connectorMod.ControllerConnector);
      setFeeSource(() => controllerMod.FeeSource);
    });
  }, []);

  const connectors = useMemo(() => {
    if (!ControllerConnector) return [argent(), braavos()];

    const contractAddress =
      process.env.NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS ?? "0x0";

    const cartridge = new ControllerConnector({
      // Use Cartridge's own RPC so account deployment + session keys work correctly
      rpcUrl: "https://api.cartridge.gg/x/starknet/sepolia",
      // feeSource: CREDITS lets Cartridge's paymaster cover gas — handles new
      // account deployment without the user needing Sepolia ETH
      ...(FeeSource ? { feeSource: FeeSource.CREDITS } : {}),
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
  }, [ControllerConnector, FeeSource]);

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
