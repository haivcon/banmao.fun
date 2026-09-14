"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { type Address, type Hash, type PublicClient } from "viem";
import { kingAbi, kingAddress } from "./mint";

export default function KingMetadataRefresh({ tokenId, account, auto, isVi, onBusy }: {
  tokenId: bigint; account: Address; auto: boolean; isVi: boolean; onBusy: (busy: boolean) => void;
}) {
  const client = usePublicClient({ chainId: 196 }) as PublicClient | undefined;
  const { data: wallet } = useWalletClient();
  const [hash, setHash] = useState<Hash>();
  const [pending, setPending] = useState(false);
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const attempted = useRef(false);
  const mounted = useRef(true);
  const key = `king-refresh:196:${kingAddress}:${account}:${tokenId}`;
  useEffect(() => {
    mounted.current = true;
    try {
      const saved = localStorage.getItem(key);
      if (saved === "confirmed") setDone(true);
      else if (saved && /^0x[0-9a-f]{64}$/i.test(saved)) { setHash(saved as Hash); setPending(true); }
    } catch { /* Storage is optional. */ }
    return () => { mounted.current = false; onBusy(false); };
  }, [key, onBusy]);
  useEffect(() => { onBusy(signing || pending); }, [signing, pending, onBusy]);
  useEffect(() => {
    if (!hash || !pending || !client) return;
    let active = true;
    async function check() {
      try {
        const receipt = await client!.getTransactionReceipt({ hash: hash! });
        if (!active) return;
        setPending(false);
        setDone(receipt.status === "success");
        if (receipt.status === "success") {
          try { localStorage.setItem(key, "confirmed"); } catch { /* Optional storage. */ }
        } else {
          setError(isVi ? "Refresh bị revert. NFT vẫn thuộc ví bạn; có thể thử refresh lại." : "Refresh reverted. Your NFT is safe; you can retry refresh.");
          try { localStorage.removeItem(key); } catch { /* Optional storage. */ }
        }
      } catch { /* Unknown transactions remain locked; poll until a mined receipt is available. */ }
    }
    void check(); const timer = setInterval(check, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [hash, pending, client, key, isVi]);
  const refresh = useCallback(async () => {
    if (lock.current || pending || done || !client || !wallet) return;
    lock.current = true; setSigning(true); setError("");
    try {
      if (await wallet.getChainId() !== 196) throw new Error("Switch to X Layer");
      const [current] = await wallet.getAddresses();
      if (current?.toLowerCase() !== account.toLowerCase()) throw new Error("Wallet changed");
      const { request } = await client.simulateContract({ account, address: kingAddress, abi: kingAbi, functionName: "refreshMetadata", args: [tokenId] });
      if (!mounted.current) return;
      const sent = await wallet.writeContract(request);
      try { localStorage.setItem(key, sent); } catch { /* Optional storage. */ }
      if (mounted.current) { setHash(sent); setPending(true); }
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message.split("\n")[0].slice(0, 200) : "Refresh unavailable");
    } finally { if (mounted.current) setSigning(false); lock.current = false; }
  }, [pending, done, client, wallet, account, tokenId, key]);
  useEffect(() => {
    if (!auto || attempted.current || !wallet || !client) return;
    attempted.current = true;
    // Never automatically resubmit a recovered or confirmed refresh.
    try { if (localStorage.getItem(key)) return; } catch { /* Optional storage. */ }
    void refresh();
  }, [auto, wallet, client, key, refresh]);
  return <div>
    <p>{isVi ? "Sau mint: ký thêm refresh metadata để marketplace đọc lại NFT. Chỉ tốn gas OKB, không tốn BANMAO. Từ chối không ảnh hưởng NFT đã mint." : "After mint: sign a metadata refresh so marketplaces can reindex your NFT. OKB gas only, no BANMAO. Rejecting does not affect your minted NFT."}</p>
    <button type="button" disabled={signing || pending || done || !wallet} onClick={() => void refresh()}>{done ? (isVi ? "Đã xác nhận refresh" : "Refresh confirmed") : signing || pending ? (isVi ? "Đang refresh metadata…" : "Refreshing metadata…") : "Refresh metadata"}</button>
    {error && <p role="alert">{error}</p>}
    {hash && <p><a href={`https://www.oklink.com/xlayer/tx/${hash}`} target="_blank" rel="noopener noreferrer">{isVi ? "Giao dịch refresh ↗" : "Refresh transaction ↗"}</a></p>}
    {done && <p>{isVi ? "Đã phát tín hiệu refresh. Marketplace có thể cần thêm thời gian để cập nhật." : "Refresh signal confirmed. Marketplace indexing may take more time."}</p>}
  </div>;
}
