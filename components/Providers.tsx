"use client";

import { StarknetConfig, publicProvider, argent, braavos } from "@starknet-react/core";
import { sepolia } from "@starknet-react/chains";
import CartridgeConnector from "@cartridge/connector";
import { ReactNode } from "react";

const cartridgeConnector = new CartridgeConnector({
  policies: [
    {
      target: process.env.NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS ?? "0x0",
      method: "mint",
    },
    {
      target: process.env.NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS ?? "0x0",
      method: "initiate_battle",
    },
    {
      target: process.env.NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS ?? "0x0",
      method: "submit_defense",
    },
    {
      target: process.env.NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS ?? "0x0",
      method: "resolve_battle",
    },
    {
      target: process.env.NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS ?? "0x0",
      method: "owner_reveal",
    },
    {
      target: process.env.NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS ?? "0x0",
      method: "submit_guess",
    },
  ],
  rpc: process.env.NEXT_PUBLIC_STARKNET_RPC_URL ?? "https://api.cartridge.gg/x/starknet/sepolia",
});

const connectors = [
  cartridgeConnector,
  argent(),
  braavos(),
];

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StarknetConfig
      chains={[sepolia]}
      provider={publicProvider()}
      connectors={connectors}
      autoConnect
    >
      {children}
    </StarknetConfig>
  );
}
