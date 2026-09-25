"use client";
import { kingRefreshCopy } from './i18n/refresh';
import { KING_T, kingError, type Lang } from './i18n';
import { xLayerExplorerUrl } from "../../../lib/explorer";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { ConnectButton } from "../../components/wallet/WalletConnection";
import { type Address, type Hash, type PublicClient } from "viem";
import { kingAbi, kingAddress } from "./mint";
import { parsePendingMint, serializePendingMint } from './mint-result';
import { MINT_RESULT_COPY } from './i18n/mint-result';

export default function KingMetadataRefresh({ tokenId, lang }: { tokenId: bigint; lang: Lang }) {
  const { address, chainId } = useAccount();
  return <RefreshAction key={`${tokenId}:${address}:${chainId}`} tokenId={tokenId} account={address} lang={lang} />;
}

function RefreshAction({ tokenId, account, lang }: {
  tokenId: bigint; account?: Address; lang: Lang;
}) {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const client = usePublicClient({ chainId: 196 }) as PublicClient | undefined;
  const { data: wallet } = useWalletClient();
  const [hash, setHash] = useState<Hash>();
  const [pending, setPending] = useState(false);
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const replacement = useRef(false);
  const mounted = useRef(true);
  const key = `king-refresh:196:${kingAddress}:${account}:${tokenId}`;
  useEffect(() => {
    mounted.current = true;
    try {
      const saved = localStorage.getItem(key);
      if (saved === "confirmed") setDone(true);
      else {
        const record = parsePendingMint(saved);
        if (record) { replacement.current = record.replaced ?? false; setHash(record.hash); setPending(true); }
      }
    } catch { /* Storage is optional. */ }
    return () => { mounted.current = false; };
  }, [key]);
  useEffect(() => {
    if (!hash || !pending || !client) return;
    let active = true;
    let checking = false;
    async function check() {
      if (checking) return;
      checking = true;
      try {
        const receipt = await client!.waitForTransactionReceipt({ hash: hash!, timeout: 180000, onReplaced: ({ reason, transaction }) => {
          if (!active) return;
          replacement.current = replacement.current || reason !== 'repriced';
          try { localStorage.setItem(key, serializePendingMint(transaction.hash, undefined, replacement.current)); } catch { /* Optional storage. */ }
        } });
        if (!active) return;
        setPending(false);
        setHash(receipt.transactionHash);
        setDone(receipt.status === "success" && !replacement.current);
        if (replacement.current) {
          setError(MINT_RESULT_COPY[lang].states.replaced[1]);
          try { localStorage.removeItem(key); } catch { /* Optional storage. */ }
        } else if (receipt.status === "success") {
          try { localStorage.setItem(key, "confirmed"); } catch { /* Optional storage. */ }
        } else {
          setError(kingRefreshCopy(lang, "Refresh reverted. Your NFT is safe; you can retry refresh."));
          try { localStorage.removeItem(key); } catch { /* Optional storage. */ }
        }
      } catch { /* Unknown transactions remain locked; poll until a mined receipt is available. */ }
      finally { checking = false; }
    }
    void check(); const timer = setInterval(check, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [hash, pending, client, key, lang]);
  const refresh = useCallback(async () => {
    if (lock.current || pending || !client || !wallet || !account) return;
    replacement.current = false;
    lock.current = true; setSigning(true); setError(""); setDone(false); setHash(undefined);
    try {
      if (await wallet.getChainId() !== 196) throw new Error("Switch to X Layer");
      const [current] = await wallet.getAddresses();
      if (current?.toLowerCase() !== account.toLowerCase()) throw new Error("Wallet changed");
      const { request } = await client.simulateContract({ account, address: kingAddress, abi: kingAbi, functionName: "refreshMetadata", args: [tokenId] });
      if (!mounted.current) return;
      const [signer] = await wallet.getAddresses();
      if (!mounted.current) return;
      if (signer?.toLowerCase() !== account.toLowerCase()) throw new Error("Wallet changed");
      if (await wallet.getChainId() !== 196) throw new Error("Switch to X Layer");
      if (!mounted.current) return;
      const sent = await wallet.writeContract(request);
      try { localStorage.setItem(key, sent); } catch { /* Optional storage. */ }
      if (mounted.current) { setHash(sent); setPending(true); }
    } catch (e) {
      if (mounted.current) setError(kingError(e, KING_T[lang]));
    } finally { if (mounted.current) setSigning(false); lock.current = false; }
  }, [pending, client, wallet, account, tokenId, key, lang]);
  return <div aria-busy={signing || pending}>
    <p>{kingRefreshCopy(lang, "Refresh NFT #{id} metadata on explorers: emit an ERC-4906 signal, paying OKB gas only, no BANMAO. This does not change artwork or ownership and does not guarantee an immediate OKX Explorer update. Sign only if you want to send the request.", tokenId)}</p>
    <div className="king-wallet-row">
      {!account ? <ConnectButton accountStatus="address" chainStatus="none" showBalance={false} label={kingRefreshCopy(lang, "Connect wallet to refresh")} /> : chainId !== 196 ? <button type="button" onClick={() => void switchChainAsync({ chainId: 196 }).catch(() => setError(kingRefreshCopy(lang, "Please switch your wallet to X Layer.")))}>{kingRefreshCopy(lang, "Switch to X Layer")}</button> : <button type="button" disabled={signing || pending || !wallet || !client} onClick={() => void refresh()}>{signing ? (kingRefreshCopy(lang, "Confirm in wallet…")) : pending ? (kingRefreshCopy(lang, "Waiting for confirmation…")) : (kingRefreshCopy(lang, "Refresh explorer metadata"))}</button>}
    </div>
    {error && <p role="alert">{error}</p>}
    {hash && <p><a href={xLayerExplorerUrl("tx", hash, lang)} target="_blank" rel="noopener noreferrer">{kingRefreshCopy(lang, "Refresh transaction ↗")}</a></p>}
    {done && <p>{kingRefreshCopy(lang, "Refresh signal confirmed. Marketplace indexing may take more time.")}</p>}
  </div>;
}
