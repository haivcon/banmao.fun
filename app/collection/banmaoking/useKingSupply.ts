"use client";
import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { type PublicClient } from 'viem';
import { kingAbi, kingAddress } from './mint';

export const kingSupplyKey = ['king-supply', 196, kingAddress] as const;

export function useKingSupply() {
  const client = usePublicClient({ chainId: 196 }) as PublicClient | undefined;
  return useQuery({
    queryKey: kingSupplyKey,
    enabled: !!client,
    queryFn: async () => {
      if (!client) throw new Error('Public client unavailable');
      const blockNumber = await client.getBlockNumber();
      const [supply, max] = await Promise.all([
        client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: 'totalSupply', blockNumber }),
        client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: 'maxSupply', blockNumber }),
      ]);
      return { supply, max };
    },
    refetchInterval: 12000,
    staleTime: 10000,
    retry: 1,
  });
}
