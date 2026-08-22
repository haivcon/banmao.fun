"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import type { Address } from "viem";
import { BANMAO_BOX_ABI, BANMAO_BOX_FACTORY_ABI, getBoxChainConfig, type BoxChainId } from "./contracts";
import { classifyRendererAdminAccess, type RendererAdminAccessStatus } from "./rendererAdminPolicy";

export type { RendererAdminAccessStatus } from "./rendererAdminPolicy";

export function useRendererAdminAccess(chainId: BoxChainId) {
  const { address, chainId: connectedChainId } = useAccount();
  const client = usePublicClient({ chainId });
  const config = getBoxChainConfig(chainId);
  const [roles, setRoles] = useState<{ factoryAdmin?: Address; boxAdmin?: Address }>({});
  const [loading, setLoading] = useState(false);
  const [readFailed, setReadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setRoles({});
    setReadFailed(false);

    if (!address || connectedChainId !== chainId) {
      setLoading(false);
      return () => { active = false; };
    }
    if (!client || !config.factoryAddress || !config.boxAddress) {
      setLoading(false);
      setReadFailed(true);
      return () => { active = false; };
    }

    setLoading(true);
    void Promise.all([
      client.readContract({ address: config.factoryAddress, abi: BANMAO_BOX_FACTORY_ABI, functionName: "rendererAdmin" } as never) as Promise<Address>,
      client.readContract({ address: config.boxAddress, abi: BANMAO_BOX_ABI, functionName: "rendererAdmin" } as never) as Promise<Address>,
    ]).then(([factoryAdmin, boxAdmin]) => {
      if (active) setRoles({ factoryAdmin, boxAdmin });
    }).catch(() => {
      if (active) setReadFailed(true);
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [address, chainId, client, config.boxAddress, config.factoryAddress, connectedChainId]);

  const status: RendererAdminAccessStatus = loading
    ? "loading"
    : readFailed
      ? "unavailable"
      : classifyRendererAdminAccess(address, connectedChainId, chainId, roles.factoryAdmin, roles.boxAdmin);

  return {
    ...roles,
    status,
    isAuthorized: status === "authorized",
  };
}
