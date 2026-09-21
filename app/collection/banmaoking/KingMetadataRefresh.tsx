"use client";
import { xLayerExplorerUrl } from "../../../lib/explorer";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { ConnectButton } from "../../components/wallet/WalletConnection";
import { type Address, type Hash, type PublicClient } from "viem";
import { kingAbi, kingAddress } from "./mint";

export default function KingMetadataRefresh({ tokenId, isVi }: { tokenId: bigint; isVi: boolean }) {
  const { address, chainId } = useAccount();
  return <RefreshAction key={`${tokenId}:${address}:${chainId}`} tokenId={tokenId} account={address} isVi={isVi} />;
}

function RefreshAction({ tokenId, account, isVi }: {
  tokenId: bigint; account?: Address; isVi: boolean;
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
  const mounted = useRef(true);
  const key = `king-refresh:196:${kingAddress}:${account}:${tokenId}`;
  useEffect(() => {
    mounted.current = true;
    try {
      const saved = localStorage.getItem(key);
      if (saved === "confirmed") setDone(true);
      else if (saved && /^0x[0-9a-f]{64}$/i.test(saved)) { setHash(saved as Hash); setPending(true); }
    } catch { /* Storage is optional. */ }
    return () => { mounted.current = false; };
  }, [key]);
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
    if (lock.current || pending || !client || !wallet || !account) return;
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
      if (mounted.current) setError(e instanceof Error ? e.message.split("\n")[0].slice(0, 200) : "Refresh unavailable");
    } finally { if (mounted.current) setSigning(false); lock.current = false; }
  }, [pending, client, wallet, account, tokenId, key]);
  return <div aria-busy={signing || pending}>
    <p>{isVi ? `Làm mới metadata NFT #${tokenId} trên explorer: phát tín hiệu ERC-4906, chỉ tốn gas OKB, không tốn BANMAO. Không thay đổi ảnh hay quyền sở hữu và không bảo đảm OKX Explorer cập nhật ngay. Chỉ ký nếu bạn muốn gửi yêu cầu.` : `Refresh NFT #${tokenId} metadata on explorers: emit an ERC-4906 signal, paying OKB gas only, no BANMAO. This does not change artwork or ownership and does not guarantee an immediate OKX Explorer update. Sign only if you want to send the request.`}</p>
    <div className="king-wallet-row">
      {!account ? <ConnectButton accountStatus="address" chainStatus="none" showBalance={false} label={isVi ? "Kết nối ví để refresh" : "Connect wallet to refresh"} /> : chainId !== 196 ? <button type="button" onClick={() => void switchChainAsync({ chainId: 196 }).catch(() => setError(isVi ? "Vui lòng chuyển ví sang X Layer." : "Please switch your wallet to X Layer."))}>{isVi ? "Chuyển sang X Layer" : "Switch to X Layer"}</button> : <button type="button" disabled={signing || pending || !wallet || !client} onClick={() => void refresh()}>{signing ? (isVi ? "Chờ ký trong ví…" : "Confirm in wallet…") : pending ? (isVi ? "Chờ xác nhận giao dịch…" : "Waiting for confirmation…") : (isVi ? "Làm mới metadata trên explorer" : "Refresh explorer metadata")}</button>}
    </div>
    {error && <p role="alert">{error}</p>}
    {hash && <p><a href={xLayerExplorerUrl("tx", hash, isVi ? "vi" : "en")} target="_blank" rel="noopener noreferrer">{isVi ? "Giao dịch refresh ↗" : "Refresh transaction ↗"}</a></p>}
    {done && <p>{isVi ? "Đã phát tín hiệu refresh. Marketplace có thể cần thêm thời gian để cập nhật." : "Refresh signal confirmed. Marketplace indexing may take more time."}</p>}
  </div>;
}
