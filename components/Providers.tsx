"use client";

import { StarknetConfig, jsonRpcProvider, argent, braavos } from "@starknet-react/core";
import { sepolia } from "@starknet-react/chains";
import { ReactNode, useMemo, useState, useEffect } from "react";

// ControllerConnector is lazy-imported to prevent WASM from loading during SSR
export function Providers({ children }: { children: ReactNode }) {
  const [ControllerConnector, setControllerConnector] = useState<any>(null);
  // Store the FeeSource enum directly — NOT wrapped in () => ... (that would
  // store a getter function, making FeeSource.CREDITS undefined)
  const [feeSourceEnum, setFeeSourceEnum] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      import("@cartridge/connector"),
      import("@cartridge/controller"),
    ]).then(([connectorMod, controllerMod]) => {
      // Classes must be wrapped to prevent React treating them as reducers
      setControllerConnector(() => connectorMod.ControllerConnector);
      // Plain enum objects must NOT be wrapped — pass directly
      setFeeSourceEnum(controllerMod.FeeSource ?? null);
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
      // FeeSource.CREDITS tells Cartridge to use their paymaster — covers gas
      // for brand-new accounts that haven't been deployed on-chain yet.
      ...(feeSourceEnum?.CREDITS != null
        ? { feeSource: feeSourceEnum.CREDITS }
        : {}),
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
  }, [ControllerConnector, feeSourceEnum]);

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
