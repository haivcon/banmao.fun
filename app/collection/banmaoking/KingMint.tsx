"use client";
import { metadataTraits } from "./composition";
import { useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { decodeEventLog, encodeFunctionData, erc20Abi, formatUnits, zeroAddress, type Hash, type PublicClient } from "viem";
import { ConnectButton } from "../../components/wallet/WalletConnection";
import { BANMAO_KING_DEPLOYMENT as deployment, banmaoKingMintReady } from "./deployment";
import { kingAbi, kingAddress, paymentAddress, validateMintState, decodeKingMetadata, parseKingRecipients } from "./mint";
import { KING_T, kingError, type Lang } from "./i18n";
import { identifiedKingImage, kingSharePath } from "./identity";
import { animatedKingImage } from "./animated-image";

export default function KingMint({ lang }: { lang: Lang }) {
  const { address, chainId } = useAccount();
  const client = usePublicClient({ chainId: 196 }) as PublicClient | undefined;
  const { data: wallet } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const [state, setState] = useState<{ supply: bigint; max: bigint; balance: bigint; allowance: bigint }>();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [readFailed, setReadFailed] = useState(false);
  const [readRetry, setReadRetry] = useState(0);
  const lock = useRef(false);
  const [message, setMessage] = useState("");
  const [hash, setHash] = useState<Hash>();
  const [tokenId, setTokenId] = useState<bigint>();
  const [metadata, setMetadata] = useState<ReturnType<typeof decodeKingMetadata>>();
  const [displayImage, setDisplayImage] = useState<string>();
  const [reload, setReload] = useState(0);
  const t = KING_T[lang];
  const [mode, setMode] = useState("self");
  const [recipient, setRecipient] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [rows, setRows] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [minted, setMinted] = useState<{ to: string; id: bigint }[]>([]);
  let plan: ReturnType<typeof parseKingRecipients> | undefined;
  let inputError = "";
  try {
    plan = parseKingRecipients(mode === "multi" ? rows : `${mode === "self" ? address || "" : recipient},${quantity}`);
    if (!deployment.supportsBatchMint && plan.total > 1n) throw new Error(lang === "vi" ? "Contract hiện tại chỉ hỗ trợ mint đơn." : "This deployment only supports single mint.");
  } catch (error) { inputError = (error as Error).message; plan = undefined; }
  const price = BigInt(deployment.mintPrice) * (plan?.total ?? 1n);
  useEffect(() => { setConfirmed(false); }, [mode, recipient, quantity, rows, address, chainId]);
  const storageKey = `king:196:${kingAddress}:${address}`;
  const session = useRef({ address, chainId });
  if (session.current.address !== address || session.current.chainId !== chainId) session.current = { address, chainId };
  useEffect(() => {
    session.current = { address, chainId };
    return () => { session.current = { address: undefined, chainId: undefined }; };
  }, [address, chainId]);
  useEffect(() => {
    let active = true;
    setMinted([]); setDisplayImage(undefined);
    setPending(false); setState(undefined); setHash(undefined); setTokenId(undefined); setMetadata(undefined); setMessage("");
    try { const saved = localStorage.getItem(storageKey); if (saved && /^0x[0-9a-f]{64}$/i.test(saved)) { setHash(saved as Hash); setPending(true); } } catch { /* Storage is optional. */ }
    async function refresh() {
      if (!client) return;
      try {
        const [supply, max, balance, allowance] = await Promise.all([
          client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "totalSupply" }),
          client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "maxSupply" }),
          address ? client.readContract({ authorizationList: undefined, address: paymentAddress, abi: erc20Abi, functionName: "balanceOf", args: [address] }) : 0n,
          address ? client.readContract({ authorizationList: undefined, address: paymentAddress, abi: erc20Abi, functionName: "allowance", args: [address, kingAddress] }) : 0n,
        ]);
        if (active) { setState({ supply, max, balance, allowance }); setReadFailed(false); }
      } catch { if (active) { setState(undefined); setReadFailed(true); } }
    }
    void refresh(); const timer = setInterval(refresh, 12000);
    return () => { active = false; clearInterval(timer); };
  }, [client, address, storageKey, readRetry]);
  useEffect(() => {
    if (!hash || !client || !address) return;
    let active = true;
    let checking = false;
    const timer = setInterval(check, 5000);
    async function check() {
      if (!client || !hash || checking) return;
      checking = true;
      try {
        const receipt = await client.waitForTransactionReceipt({ hash, timeout: 180000, onReplaced: ({ transaction }) => {
          if (!active) return;
          try { localStorage.setItem(storageKey, transaction.hash); } catch { /* Optional storage. */ }
          setHash(transaction.hash);
        } });
        if (!active) return;
        clearInterval(timer);
        // A mined receipt is terminal, including a reverted approval/mint.
        // This also releases transactions restored from localStorage on reload.
        setPending(false);
        try { if (localStorage.getItem(storageKey) === receipt.transactionHash) localStorage.removeItem(storageKey); } catch { /* Optional storage. */ }
        setMessage(t.confirmed);
        void Promise.all([
          client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "totalSupply" }),
          client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "maxSupply" }),
          client.readContract({ authorizationList: undefined, address: paymentAddress, abi: erc20Abi, functionName: "balanceOf", args: [address!] }),
          client.readContract({ authorizationList: undefined, address: paymentAddress, abi: erc20Abi, functionName: "allowance", args: [address!, kingAddress] }),
        ]).then(([supply, max, balance, allowance]) => {
          if (active) setState({ supply, max, balance, allowance });
        }).catch(() => { /* Regular balance polling retries failed reads. */ });
        if (receipt.status === "reverted") { setMessage(t.reverted); return; }
        const results: { to: string; id: bigint }[] = [];
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() !== kingAddress.toLowerCase()) continue;
          try {
            const event = decodeEventLog({ abi: kingAbi, eventName: "KingMinted", data: log.data, topics: (log as typeof log & { topics: [Hash, ...Hash[]] }).topics });
            if (event.args.payer.toLowerCase() === address?.toLowerCase()) results.push({ to: event.args.to, id: event.args.tokenId });
          } catch { /* Ignore other logs. */ }
        }
        setMinted(results);
        setTokenId(results[0]?.id);
      } catch { if (active) setMessage(t.pendingWarning); }
      finally { checking = false; }
    }
    void check(); return () => { active = false; clearInterval(timer); };
  }, [hash, client, address, storageKey, t]);
  useEffect(() => {
    let active = true;
    setMetadata(undefined);
    setDisplayImage(undefined);
    if (tokenId !== undefined && client) client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "tokenURI", args: [tokenId] }).then(uri => {
      if (!active) return;
      const decoded = decodeKingMetadata(uri);
      const image = identifiedKingImage(animatedKingImage(decoded.image), metadataTraits(decoded.attributes));
      setMetadata(decoded);
      setDisplayImage(image);
    }).catch(() => { if (active) setMessage(t.imageError); });
    return () => { active = false; };
  }, [tokenId, client, t, reload]);
  async function transact() {
    if (pending || lock.current || !client || !wallet || !address || !plan || !confirmed || !banmaoKingMintReady()) return;
    lock.current = true; setBusy(true); setMessage("");
    let sent: Hash | undefined;
    const started = session.current;
    const isCurrent = () => session.current === started;
    async function verifyWallet() {
      if (!wallet || !isCurrent() || await wallet.getChainId() !== 196) throw new Error("Wallet or network changed");
      const [current] = await wallet.getAddresses();
      if (!current || current.toLowerCase() !== address?.toLowerCase() || !isCurrent()) throw new Error("Wallet changed");
    }
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
      if (supply + plan.total > max) throw new Error("Not enough remaining supply / Không đủ nguồn cung");
      if (!state || (state.allowance >= price) !== (allowance >= price) || (state.allowance > 0n && state.allowance < price) !== (allowance > 0n && allowance < price)) throw new Error("Allowance updated. Wait for refresh before confirming the next step.");
      if (balance < price) throw new Error("Not enough BANMAO");
      const data = allowance < price
        ? encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [kingAddress, allowance > 0n ? 0n : price] })
        : plan.total === 1n
          ? encodeFunctionData({ abi: kingAbi, functionName: "mint", args: [plan.recipients[0], paymentAddress] })
          : encodeFunctionData({ abi: kingAbi, functionName: "mintBatchTo", args: [plan.recipients, plan.quantities, paymentAddress] });
      const [units, fees] = await Promise.all([
        client.estimateGas({ account: address, to: allowance < price ? paymentAddress : kingAddress, data, value: 0n }),
        client.estimateFeesPerGas(),
      ]);
      const estimatedFee = units * fees.maxFeePerGas;
      if (gas < estimatedFee * 120n / 100n) throw new Error("Not enough OKB for estimated gas plus 20% buffer");
      await verifyWallet();
      if (allowance < price) {
        const simulation = await client.simulateContract({ account: address, address: paymentAddress, abi: erc20Abi, functionName: "approve", args: [kingAddress, allowance > 0n ? 0n : price] });
        await verifyWallet();
        sent = await wallet.writeContract(simulation.request);
      } else {
        setTokenId(undefined); setMetadata(undefined); setMinted([]);
        if (plan.total === 1n) {
          const simulation = await client.simulateContract({ account: address, address: kingAddress, abi: kingAbi, functionName: "mint", args: [plan.recipients[0], paymentAddress], value: 0n });
          await verifyWallet();
          sent = await wallet.writeContract(simulation.request);
        } else {
          if (!deployment.supportsBatchMint) throw new Error("Batch deployment not verified");
          const simulation = await client.simulateContract({ account: address, address: kingAddress, abi: kingAbi, functionName: "mintBatchTo", args: [plan.recipients, plan.quantities, paymentAddress], value: 0n });
          await verifyWallet();
          sent = await wallet.writeContract(simulation.request);
        }
      }
      try { localStorage.setItem(storageKey, sent); } catch { /* Optional storage. */ }
      if (!isCurrent()) return;
      // One receipt watcher owns terminal state, including restored transactions.
      setHash(sent); setPending(true); setMessage(t.submitted);
    } catch (error) {
      if (isCurrent()) setMessage(sent ? t.pendingWarning : kingError(error, t));
    } finally { setBusy(false); lock.current = false; }
  }
  return <section className="king-mint-box" aria-label={t.mint}>
    <div className="king-mint-title"><h2>{t.mint} · Banmao King</h2><span className="king-preview-badge">{t.verified}</span></div>
    <p><strong>{new Intl.NumberFormat(lang).format(6666)} BANMAO / NFT</strong> · {state ? `${new Intl.NumberFormat(lang).format(state.supply)} / ${new Intl.NumberFormat(lang).format(state.max)}` : t.loading}</p>
    <p>{t.mintNote}</p><p className="king-chip">{t.gas}</p>{state && <progress aria-label={t.supply} value={Number(state.supply)} max={Number(state.max)} />}
    {address && <p>{t.balance} · BANMAO: {state ? formatUnits(state.balance, 18) : "—"}</p>}
    <fieldset disabled={busy || pending}>
      <legend>{lang === "vi" ? "Người nhận NFT" : "NFT recipients"}</legend>
      <label>{lang === "vi" ? "Chế độ " : "Mode "}<select value={mode} onChange={e => setMode(e.target.value)}>
        <option value="self">{lang === "vi" ? "Mint cho tôi" : "Mint for me"}</option>
        <option value="gift">{lang === "vi" ? "Tặng một ví" : "Gift to a wallet"}</option>
        <option value="multi" disabled={!deployment.supportsBatchMint}>{lang === "vi" ? "Nhiều ví" : "Multiple wallets"}</option>
      </select></label>
      {!deployment.supportsBatchMint && <p>{lang === "vi" ? "Collection hiện tại chỉ mint 1 NFT/lần. Batch cần deployment mới đã xác minh." : "Current collection supports one NFT per transaction. Batch requires a verified new deployment."}</p>}
      {mode === "gift" && <label>{lang === "vi" ? "Ví nhận " : "Recipient "}<input value={recipient} onChange={e => setRecipient(e.target.value)} spellCheck={false} /></label>}
      {mode !== "multi" ? <label>{lang === "vi" ? "Số lượng " : "Quantity "}<input type="number" min="1" max={deployment.supportsBatchMint ? 50 : 1} value={quantity} onChange={e => setQuantity(e.target.value)} /></label> : <label>{lang === "vi" ? "Mỗi dòng: địa chỉ, số lượng" : "One row per recipient: address, quantity"}<textarea rows={5} value={rows} onChange={e => setRows(e.target.value)} spellCheck={false} /></label>}
      {address && inputError && <p role="alert">{inputError}</p>}
      {plan && <div>
        <p>X Layer · {lang === "vi" ? "Ví trả tiền" : "Payer"}: {address}</p>
        <ul>{plan.recipients.map((to, i) => <li key={i} style={{ overflowWrap: "anywhere" }}>{to} · {plan!.quantities[i].toString()} NFT</li>)}</ul>
        <p>{plan.total.toString()} NFT · {formatUnits(price, 18)} BANMAO</p>
        <p>{lang === "vi" ? "Gas OKB tính riêng, ví sẽ hiển thị trước khi ký. NFT tặng không thể tự thu hồi." : "OKB gas is separate and shown by your wallet before signing. Gifts cannot be recalled."}</p>
        <label><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />{lang === "vi" ? "Tôi đã kiểm tra người nhận, mạng và tổng tiền" : "I verified recipients, network and total payment"}</label>
      </div>}
    </fieldset>
    {minted.length > 0 && <ul>{minted.map(item => <li key={item.id.toString()} style={{ overflowWrap: "anywhere" }}>{item.to}: <a href={kingSharePath(item.id)}>#{item.id.toString()}</a></li>)}</ul>}
    <div className="king-wallet-row"><ConnectButton accountStatus="address" chainStatus="none" showBalance={false} label={t.connect} />
      {address && chainId !== 196 ? <button type="button" onClick={() => void switchChainAsync({ chainId: 196 }).catch(() => setMessage(t.switchHelp))}>{t.switchNetwork}</button> : <button type="button" disabled={!address || !state || !plan || !confirmed || busy || pending || state.balance < price || state.supply + (plan?.total ?? 1n) > state.max} onClick={() => void transact()}>{busy || pending ? t.processing : !state ? t.waiting : state.supply >= state.max ? t.soldOut : state.balance < price ? t.insufficient : state.allowance >= price ? t.mintAction : state.allowance > 0n ? t.resetAllowance : t.approve}</button>}
    </div>
    {readFailed && <div role="status"><p>{t.readError}</p><button type="button" disabled={busy || pending} onClick={() => { setReadFailed(false); setReadRetry(n => n + 1); }}>{t.retry}</button></div>}
    <p role="status" aria-live="polite">{message}</p>
    {hash && <a href={`https://www.oklink.com/xlayer/tx/${hash}`} target="_blank" rel="noopener noreferrer">{t.transaction}</a>}
    {tokenId !== undefined && (
      <div>
        <h3>{t.success} #{tokenId.toString()}</h3>
        <p><a href={kingSharePath(tokenId)}>{lang === "vi" ? "Tra cứu / chia sẻ NFT" : "Look up / share NFT"}</a></p>
        {displayImage && <a href={displayImage} download={`BanmaoKing-${tokenId}-preview.svg`}>{lang === "vi" ? "Tải bản xem thử có mã số" : "Download preview with ID"}</a>}
        {metadata ? (
          <>
            {/* On-chain SVG data URI: render the original without an image optimization proxy. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={displayImage} onError={() => { setMetadata(undefined); setDisplayImage(undefined); setMessage(t.imageError); }} alt={metadata.name} width={320} height={320} style={{ maxWidth: "100%", height: "auto" }} />
            <p>{metadata.attributes.map(a => `${a.trait_type}: ${a.value}`).join(" · ")}</p>
          </>
        ) : (
          <button type="button" onClick={() => setReload(n => n + 1)}>{t.reloadImage}</button>
        )}
      </div>
    )}
    <p>{t.postMint}</p>
    {metadata && <a href={metadata.image} download={`BanmaoKing-${tokenId}.svg`}>{t.download}</a>}
    <details><summary>{t.details}</summary>
      <p>{t.step2Desc}</p>
      <p>{t.faq1Answer}</p>
      <p>{t.payment} {paymentAddress}</p>
      <a href={deployment.explorerUrl} target="_blank" rel="noopener noreferrer">NFT: {kingAddress} ↗</a>
    </details>
  </section>;
}
