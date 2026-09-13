"use client";
import { useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { decodeEventLog, erc20Abi, formatUnits, zeroAddress, type Hash, type PublicClient } from "viem";
import { ConnectButton } from "../../components/wallet/WalletConnection";
import { BANMAO_KING_DEPLOYMENT as deployment, banmaoKingMintReady } from "./deployment";
import { kingAbi, kingAddress, paymentAddress, validateMintState, decodeKingMetadata } from "./mint";
import KingMetadataRefresh from "./KingMetadataRefresh";

export default function KingMint({ isVi }: { isVi: boolean }) {
  const { address, chainId } = useAccount();
  const client = usePublicClient({ chainId: 196 }) as PublicClient | undefined;
  const { data: wallet } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const [state, setState] = useState<{ supply: bigint; balance: bigint; allowance: bigint }>();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState("");
  const [hash, setHash] = useState<Hash>();
  const [tokenId, setTokenId] = useState<bigint>();
  const [metadata, setMetadata] = useState<ReturnType<typeof decodeKingMetadata>>();
  const [reload, setReload] = useState(0);
  const text = (vi: string, en: string) => isVi ? vi : en;
  const price = BigInt(deployment.mintPrice);
  const storageKey = `king:196:${kingAddress}:${address}`;
  useEffect(() => {
    let active = true;
    setAutoRefresh(false); setPending(false); setState(undefined); setHash(undefined); setTokenId(undefined); setMetadata(undefined); setMessage("");
    try { const saved = localStorage.getItem(storageKey); if (saved && /^0x[0-9a-f]{64}$/i.test(saved)) { setHash(saved as Hash); setPending(true); } } catch { /* Storage is optional. */ }
    async function refresh() {
      if (!client) return;
      try {
        const [supply, balance, allowance] = await Promise.all([
          client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "totalSupply" }),
          address ? client.readContract({ authorizationList: undefined, address: paymentAddress, abi: erc20Abi, functionName: "balanceOf", args: [address] }) : 0n,
          address ? client.readContract({ authorizationList: undefined, address: paymentAddress, abi: erc20Abi, functionName: "allowance", args: [address, kingAddress] }) : 0n,
        ]);
        if (active) setState({ supply, balance, allowance });
      } catch { if (active) setState(undefined); }
    }
    void refresh(); const timer = setInterval(refresh, 12000);
    return () => { active = false; clearInterval(timer); };
  }, [client, address, storageKey]);
  useEffect(() => {
    if (!hash || !client || !address) return;
    let active = true;
    const timer = setInterval(check, 5000);
    async function check() {
      if (!client || !hash) return;
      try {
        const receipt = await client.getTransactionReceipt({ hash });
        if (!active) return;
        clearInterval(timer);
        // A mined receipt is terminal, including a reverted approval/mint.
        // This also releases transactions restored from localStorage on reload.
        setPending(false);
        setMessage(isVi ? "Giao dịch đã xác nhận. Đang cập nhật quyền sử dụng BANMAO…" : "Transaction confirmed. Refreshing BANMAO allowance…");
        void Promise.all([
          client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "totalSupply" }),
          client.readContract({ authorizationList: undefined, address: paymentAddress, abi: erc20Abi, functionName: "balanceOf", args: [address!] }),
          client.readContract({ authorizationList: undefined, address: paymentAddress, abi: erc20Abi, functionName: "allowance", args: [address!, kingAddress] }),
        ]).then(([supply, balance, allowance]) => {
          if (active) setState({ supply, balance, allowance });
        }).catch(() => { /* Regular balance polling retries failed reads. */ });
        if (receipt.status === "reverted") { setMessage(isVi ? "Giao dịch đã revert. Không mint thành công." : "Transaction reverted; no NFT minted."); return; }
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() !== kingAddress.toLowerCase()) continue;
          try {
            const event = decodeEventLog({ abi: kingAbi, eventName: "KingMinted", data: log.data, topics: (log as typeof log & { topics: [Hash, ...Hash[]] }).topics });
            if (event.args.to.toLowerCase() === address?.toLowerCase()) setTokenId(event.args.tokenId);
          } catch { /* Ignore other logs. */ }
        }
      } catch { /* Receipt may still be pending; keep polling. */ }
    }
    void check(); return () => { active = false; clearInterval(timer); };
  }, [hash, client, address, isVi]);
  useEffect(() => {
    let active = true;
    if (tokenId !== undefined && client) client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "tokenURI", args: [tokenId] }).then(uri => { if (active) setMetadata(decodeKingMetadata(uri)); }).catch(() => { if (active) setMessage(isVi ? "NFT đã mint; ảnh chưa tải được. Bấm tải lại ảnh." : "NFT minted; image unavailable. Retry loading the image."); });
    return () => { active = false; };
  }, [tokenId, client, isVi, reload]);
  async function transact() {
    if (refreshBusy || pending || lock.current || !client || !wallet || !address || !banmaoKingMintReady()) return;
    lock.current = true; setBusy(true); setMessage("");
    let sent: Hash | undefined;
    try {
      if (chainId !== 196 || await wallet.getChainId() !== 196) throw new Error("Switch to X Layer");
      const [current] = await wallet.getAddresses();
      if (current.toLowerCase() !== address.toLowerCase()) throw new Error("Wallet changed");
      const [actualPrice, accepted, supply, max, native, balance, allowance, gas] = await Promise.all([
        client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "mintPrice", args: [paymentAddress] }),
        client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "isPaymentToken", args: [paymentAddress] }),
        client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "totalSupply" }),
        client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "maxSupply" }),
        client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "isPaymentToken", args: [zeroAddress] }),
        client.readContract({ authorizationList: undefined, address: paymentAddress, abi: erc20Abi, functionName: "balanceOf", args: [address] }),
        client.readContract({ authorizationList: undefined, address: paymentAddress, abi: erc20Abi, functionName: "allowance", args: [address, kingAddress] }),
        client.getBalance({ address }),
      ]);
      validateMintState(actualPrice, accepted && !native, supply, max);
      if (!state || (state.allowance >= price) !== (allowance >= price) || (state.allowance > 0n && state.allowance < price) !== (allowance > 0n && allowance < price)) throw new Error("Allowance updated. Wait for refresh before confirming the next step.");
      if (balance < price) throw new Error("Not enough BANMAO");
      if (gas === 0n) throw new Error("Need OKB for network gas");
      if (allowance < price) {
        const simulation = await client.simulateContract({ account: address, address: paymentAddress, abi: erc20Abi, functionName: "approve", args: [kingAddress, allowance > 0n ? 0n : price] });
        sent = await wallet.writeContract(simulation.request);
      } else {
        setTokenId(undefined); setMetadata(undefined); setAutoRefresh(true);
        const simulation = await client.simulateContract({ account: address, address: kingAddress, abi: kingAbi, functionName: "mint", args: [address, paymentAddress], value: 0n });
        sent = await wallet.writeContract(simulation.request);
      }
      setHash(sent); setPending(true);
      try { localStorage.setItem(storageKey, sent); } catch { /* Optional storage. */ }
      setMessage(text("Đã gửi. Đang chờ xác nhận…", "Submitted. Waiting for confirmation…"));
      const receipt = await client.waitForTransactionReceipt({ hash: sent, timeout: 180000, onReplaced: ({ transaction }) => { setHash(transaction.hash); try { localStorage.setItem(storageKey, transaction.hash); } catch { /* Optional storage. */ } } });
      setPending(false);
      if (receipt.status !== "success") throw new Error("Transaction reverted");
      setMessage(text("Đã xác nhận. Dữ liệu cập nhật tự động.", "Confirmed. Data updates automatically."));
    } catch (error) {
      setMessage(sent ? text("Đã gửi; kiểm tra Explorer trước khi thử lại. Không gửi trùng.", "Submitted; check Explorer before retrying. Do not duplicate.") : (error instanceof Error ? error.message.split("\n")[0].slice(0, 220) : "Transaction unavailable"));
    } finally { setBusy(false); lock.current = false; }
  }
  return <section className="king-mint-box" aria-label="Mint Banmao King">
    <div className="king-mint-title"><h2>Mint Banmao King</h2><span className="king-preview-badge">Verified · X Layer</span></div>
    <p><strong>6,666 BANMAO / NFT</strong> · {state ? `${state.supply} / 9,216` : text("Đang tải dữ liệu…", "Loading chain data…")}</p>
    <p>{text("OKB chỉ trả phí mạng. NFT về ví đang kết nối. Không thể chọn trait khi mint.", "OKB pays network gas only. NFT goes to your connected wallet. Preview traits are not mint selections.")}</p>
    {address && <p>BANMAO: {state ? formatUnits(state.balance, 18) : "—"}</p>}
    <div className="king-wallet-row"><ConnectButton accountStatus="address" chainStatus="none" showBalance={false} />
      {address && chainId !== 196 ? <button type="button" onClick={() => void switchChainAsync({ chainId: 196 }).catch(() => setMessage(text("Vui lòng chuyển mạng trong ví.", "Please switch networks in your wallet.")))}>{text("Chuyển sang X Layer", "Switch to X Layer")}</button> : <button type="button" disabled={!address || !state || busy || pending || refreshBusy || state.balance < price || state.supply >= 9216n} onClick={() => void transact()}>{busy || pending ? text("Đang xử lý…", "Processing…") : !state ? text("Chờ dữ liệu", "Waiting for data") : state.supply >= 9216n ? text("Đã mint hết", "Sold out") : state.balance < price ? text("Không đủ BANMAO", "Insufficient BANMAO") : state.allowance >= price ? "2/2 · Mint NFT" : state.allowance > 0n ? text("Đặt lại quyền cũ", "Reset existing allowance") : text("1/2 · Cho phép 6.666 BANMAO", "1/2 · Approve 6,666 BANMAO")}</button>}
    </div>
    <p role="status" aria-live="polite">{message}</p>
    {hash && <a href={`https://www.oklink.com/xlayer/tx/${hash}`} target="_blank" rel="noopener noreferrer">{text("Xem giao dịch ↗", "View transaction ↗")}</a>}
    {tokenId !== undefined && (
      <div>
        <h3>{text("Mint thành công!", "Mint successful!")} #{tokenId.toString()}</h3>
        {metadata ? (
          <>
            {/* On-chain SVG data URI: render the original without an image optimization proxy. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={metadata.image} alt={metadata.name} width={320} height={320} style={{ maxWidth: "100%", height: "auto" }} />
            <p>{metadata.attributes.map(a => `${a.trait_type}: ${a.value}`).join(" · ")}</p>
          </>
        ) : (
          <button type="button" onClick={() => setReload(n => n + 1)}>{text("Tải lại ảnh NFT", "Reload NFT image")}</button>
        )}
      </div>
    )}
    {tokenId !== undefined && address && <KingMetadataRefresh key={`${address}:${tokenId}`} tokenId={tokenId} account={address} auto={autoRefresh && !busy} isVi={isVi} onBusy={setRefreshBusy} />}
    <p>{text("Sau mint, ví sẽ yêu cầu ký refresh metadata riêng (gas OKB). SVG gốc có chuyển động; thumbnail marketplace có thể là ảnh tĩnh. Nếu bật Giảm chuyển động trên thiết bị, animation sẽ dừng.", "After mint, your wallet requests a separate metadata refresh signature (OKB gas). The original SVG is animated; marketplace thumbnails may be static. Device Reduce Motion settings stop animation.")}</p>
    {metadata && <a href={metadata.image} download={`BanmaoKing-${tokenId}.svg`}>{text("Tải SVG động gốc", "Download original animated SVG")}</a>}
    <details><summary>{text("Hướng dẫn & chi tiết contract", "Help & contract details")}</summary>
      <p>{text("Cấp quyền cho phép contract dùng đúng 6.666 BANMAO. Sau xác nhận, bấm Mint. Mỗi bước cần ký trong ví và trả gas OKB. Nếu quyền cũ không đủ, đặt lại về 0 trước.", "Approval lets this contract spend exactly 6,666 BANMAO. After confirmation, press Mint. Each step needs a wallet signature and OKB gas. Insufficient existing allowance is reset to zero first.")}</p>
      <p>{text("Seed công khai: kết quả có thể tính trước. Royalty 2% tùy marketplace. Verified source không đồng nghĩa đã audit.", "The public seed makes outcomes predictable. The 2% royalty depends on marketplace support. Verified source is not a security audit.")}</p>
      <p>{text("Kiểm tra đúng token trên X Layer trước khi mua hoặc chuyển vào ví:", "Verify the X Layer token before buying or transferring:")} {paymentAddress}</p>
      <a href={deployment.explorerUrl} target="_blank" rel="noopener noreferrer">NFT: {kingAddress} ↗</a>
    </details>
  </section>;
}
