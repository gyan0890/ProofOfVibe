import { RpcProvider } from "starknet";
import type { ProviderInterface } from "starknet";

/**
 * Creates an RpcProvider that automatically falls back to the next URL
 * when a request fails with a 503 / -32001 "unable to complete" error.
 *
 * Usage:
 *   const provider = createFallbackProvider([primaryUrl, fallback1, fallback2]);
 */
export function createFallbackProvider(urls: string[]): ProviderInterface {
  const activeUrls = urls.filter(Boolean);
  if (activeUrls.length === 0) throw new Error("[FallbackRPC] No RPC URLs provided");
  if (activeUrls.length === 1) return new RpcProvider({ nodeUrl: activeUrls[0] });

  const providers = activeUrls.map((url) => new RpcProvider({ nodeUrl: url }));

  function isRetryable(err: any): boolean {
    const msg: string = err?.message ?? "";
    return (
      msg.includes("503") ||
      msg.includes("Service Unavailable") ||
      msg.includes("Unable to complete") ||
      msg.includes("ECONNREFUSED") ||
      err?.code === -32001
    );
  }

  async function withFallback<T>(fn: (p: RpcProvider) => Promise<T>): Promise<T> {
    let lastErr: any;
    for (let i = 0; i < providers.length; i++) {
      try {
        return await fn(providers[i]);
      } catch (err: any) {
        lastErr = err;
        if (isRetryable(err) && i < providers.length - 1) {
          console.warn(`[FallbackRPC] ${activeUrls[i]} failed — trying ${activeUrls[i + 1]}`);
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }

  // Proxy the first provider; intercept every method call to use fallback logic
  const handler: ProxyHandler<RpcProvider> = {
    get(target, prop: string | symbol) {
      const value = Reflect.get(target, prop);
      if (typeof value !== "function" || prop === "constructor") return value;
      return function (...args: any[]) {
        const result = withFallback((p) =>
          (Reflect.get(p, prop) as (...a: any[]) => any).apply(p, args)
        );
        // If the original method is not async, return synchronously
        return result;
      };
    },
  };

  return new Proxy(providers[0], handler) as unknown as ProviderInterface;
}

/** Collect all RPC URLs from env vars into a prioritised list */
export function getRpcUrls(): string[] {
  return [
    process.env.NEXT_PUBLIC_STARKNET_RPC_URL,
    process.env.NEXT_PUBLIC_STARKNET_RPC_FALLBACK_1,
    process.env.NEXT_PUBLIC_STARKNET_RPC_FALLBACK_2,
    process.env.NEXT_PUBLIC_STARKNET_RPC_FALLBACK_3,
    // Hard-coded last-resort public endpoints
    "https://starknet-sepolia-rpc.publicnode.com",
    "https://starknet-sepolia.drpc.org",
  ].filter((u): u is string => Boolean(u));
}
