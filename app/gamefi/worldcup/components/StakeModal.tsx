"use client";
import React, { useState, useEffect } from "react";
import { parseEther, formatEther } from "viem";
import type { TeamPoolData, UserTeamInfo } from "../hooks/useWorldCup";
import TeamCrest from "./TeamCrest";
import { cleanLabel } from "../lib/labels";
import { LockKeyhole, Minus, Plus, ShieldX, X, CheckCircle2, Loader2, AlertTriangle, ExternalLink, WalletCards } from "lucide-react";

interface Props {
    team: TeamPoolData; userStake: UserTeamInfo; tokenBalance: bigint; allowance: bigint;
    onApprove: (a: bigint) => void; onStake: (id: number, a: bigint) => void; onUnstake: (id: number, a: bigint) => void; onClaimRewards: (id: number) => void;
    isPending: boolean; onClose: () => void; t: Record<string,any>;
    tournamentStarted: boolean; tournamentEnded: boolean; paused: boolean; minStakeAmount: bigint; stakeFeeBp: bigint; unstakeFeeBp: bigint;
    txSuccess: boolean; txError: Error | null;
    txHash?: `0x${string}`;
    explorerBaseUrl?: string;
}

export default function StakeModal({ team, userStake, tokenBalance, allowance, onApprove, onStake, onUnstake, onClaimRewards, isPending, onClose, t, tournamentStarted, tournamentEnded, paused, minStakeAmount, stakeFeeBp, unstakeFeeBp, txSuccess, txError, txHash, explorerBaseUrl }: Props) {
    const [tab, setTab] = useState<'stake'|'unstake'>('stake');
    const [amount, setAmount] = useState('');
    const [txStatus, setTxStatus] = useState<{
        action: 'stake' | 'unstake' | 'approve' | 'claim' | null;
        amount: string;
        successShow: boolean;
        errorMsg: string | null;
    }>({ action: null, amount: '', successShow: false, errorMsg: null });
    const [ignoredTxHash, setIgnoredTxHash] = useState<`0x${string}` | null>(null);
    const [activeTxHash, setActiveTxHash] = useState<`0x${string}` | null>(null);

    const parsedAmount = (() => { try { return parseEther(amount || '0'); } catch { return BigInt(0); } })();
    const needsApproval = tab === 'stake' && parsedAmount > BigInt(0) && allowance < parsedAmount;
    const isEliminated = team.status === 'eliminated';
    const isLocked = team.locked;
    const BP = BigInt(10000);
    const unstakeFeeWaived = isEliminated || tournamentEnded;
    const stakeFeeAmount = tab === 'stake' && parsedAmount > BigInt(0) ? (parsedAmount * (stakeFeeBp || BigInt(0))) / BP : BigInt(0);
    const stakeNetAmount = tab === 'stake' && parsedAmount > stakeFeeAmount ? parsedAmount - stakeFeeAmount : BigInt(0);
    const unstakeFeeAmount = tab === 'unstake' && parsedAmount > BigInt(0) && !unstakeFeeWaived ? (parsedAmount * (unstakeFeeBp || BigInt(0))) / BP : BigInt(0);
    const unstakePayoutAmount = tab === 'unstake' && parsedAmount > unstakeFeeAmount ? parsedAmount - unstakeFeeAmount : BigInt(0);
    const stakeFeeText = `${Number(stakeFeeBp || BigInt(0)) / 100}%`;
    const unstakeFeeText = `${Number(unstakeFeeBp || BigInt(0)) / 100}%`;
    const balStr = formatEther(tab === 'stake' ? tokenBalance : userStake.amount);
    const explorerTxUrl = activeTxHash && explorerBaseUrl ? `${explorerBaseUrl.replace(/\/$/, '')}/tx/${activeTxHash}` : '';
    
    const actionBlockedReason = (() => {
        if (paused) return 'Contract is paused by admin.';
        if (tab === 'stake' && !tournamentStarted) return 'Tournament is not active. Admin must start the tournament before users can approve and stake.';
        if (tab === 'stake' && tournamentEnded) return 'Tournament has ended. New stakes are closed.';
        if (tab === 'stake' && parsedAmount > BigInt(0) && parsedAmount < minStakeAmount) return `Minimum stake is ${formatEther(minStakeAmount)} $BANMAO.`;
        if (tab === 'stake' && parsedAmount > tokenBalance) return 'Insufficient token balance.';
        if (tab === 'unstake' && parsedAmount > userStake.amount) return 'Insufficient staked principal.';
        return '';
    })();

    useEffect(() => {
        if (txSuccess && txStatus.action && activeTxHash && txHash === activeTxHash) {
            setTxStatus(prev => ({ ...prev, successShow: true, errorMsg: null }));
            setAmount('');
        }
    }, [txSuccess, txStatus.action, activeTxHash, txHash]);

    useEffect(() => {
        if (txStatus.action && txHash && txHash !== ignoredTxHash && txHash !== activeTxHash) {
            setActiveTxHash(txHash);
        }
    }, [txHash, ignoredTxHash, activeTxHash, txStatus.action]);

    useEffect(() => {
        if (txError && txStatus.action) {
            let cleanError = txError.message || String(txError);
            if (cleanError.includes("User rejected the request")) {
                cleanError = t.userRejected || "Giao dịch bị từ chối / Transaction was rejected.";
            } else if (cleanError.includes("insufficient funds")) {
                cleanError = t.insufficientGas || "Tài khoản không đủ phí gas / Insufficient funds for gas fee.";
            } else {
                cleanError = cleanError.slice(0, 100) + (cleanError.length > 100 ? "..." : "");
            }
            setTxStatus(prev => ({ ...prev, successShow: false, errorMsg: cleanError }));
        }
    }, [txError]);

    const handleAmountChange = (val: string) => {
        setAmount(val);
        if (txStatus.successShow || txStatus.errorMsg) {
            setTxStatus({ action: null, amount: '', successShow: false, errorMsg: null });
            setIgnoredTxHash(null);
            setActiveTxHash(null);
        }
    };

    const handleTabChange = (nextTab: 'stake' | 'unstake') => {
        setTab(nextTab);
        setAmount('');
        setTxStatus({ action: null, amount: '', successShow: false, errorMsg: null });
        setIgnoredTxHash(null);
        setActiveTxHash(null);
    };

    const beginAction = (action: 'stake' | 'unstake' | 'approve' | 'claim', nextAmount: string) => {
        setIgnoredTxHash(txHash || null);
        setActiveTxHash(null);
        setTxStatus({ action, amount: nextAmount, successShow: false, errorMsg: null });
    };

    const sanitizeAmount = (value: string) => value.replace(',', '.').replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    
    const stepAmount = (delta: number) => {
        const current = Number(amount || '0');
        const max = Number(balStr);
        const next = Math.min(Math.max(current + delta, 0), Number.isFinite(max) ? max : current + delta);
        const nextStr = Number.isInteger(next) ? String(next) : next.toFixed(6).replace(/\.?0+$/, '');
        handleAmountChange(nextStr);
    };

    const renderTxStatusBanner = () => {
        if (!txStatus.action) return null;

        // 1. Pending State
        if (isPending && !txStatus.successShow && !txStatus.errorMsg) {
            let pendingMsg = "";
            if (txStatus.action === 'approve') {
                pendingMsg = t.txPendingApprove || "Approving tokens...";
            } else if (txStatus.action === 'stake') {
                pendingMsg = (t.txPendingStake || "Staking {amount} $BANMAO into {team}...").replace('{amount}', txStatus.amount).replace('{team}', team.name);
            } else if (txStatus.action === 'unstake') {
                pendingMsg = (t.txPendingUnstake || "Unstaking {amount} $BANMAO from {team}...").replace('{amount}', txStatus.amount).replace('{team}', team.name);
            } else if (txStatus.action === 'claim') {
                pendingMsg = (t.txPendingClaim || "Claiming rewards from {team}...").replace('{team}', team.name);
            }
            return (
                <div className="wc-modal-tx-status is-pending">
                    <Loader2 size={16} className="animate-spin" />
                    <span>{pendingMsg}</span>
                </div>
            );
        }

        // 2. Success State
        if (txStatus.successShow) {
            let successMsg = "";
            if (txStatus.action === 'approve') {
                successMsg = t.txSuccessApprove || "Approval successful!";
            } else if (txStatus.action === 'stake') {
                successMsg = (t.txSuccessStake || "Staking successful! Contributed {amount} $BANMAO to {team}.").replace('{amount}', txStatus.amount).replace('{team}', team.name);
            } else if (txStatus.action === 'unstake') {
                successMsg = (t.txSuccessUnstake || "Unstake successful! Withdrew {amount} $BANMAO from {team}.").replace('{amount}', txStatus.amount).replace('{team}', team.name);
            } else if (txStatus.action === 'claim') {
                successMsg = t.txSuccessClaim || "Rewards claimed successfully!";
            }
            return (
                <div className="wc-modal-tx-status is-success">
                    <CheckCircle2 size={16} />
                    <span>{successMsg}</span>
                </div>
            );
        }

        // 3. Error State
        if (txStatus.errorMsg) {
            return (
                <div className="wc-modal-tx-status is-error">
                    <AlertTriangle size={16} />
                    <span>{(t.txErrorPrefix || "Failed: ") + txStatus.errorMsg}</span>
                </div>
            );
        }

        return null;
    };
    const renderTxTimeline = () => {
        if (!txStatus.action) return null;
        const walletDone = !!activeTxHash || txStatus.successShow || !!txStatus.errorMsg;
        const submitted = !!activeTxHash;
        const updated = txStatus.successShow;
        return (
            <div className="wc-tx-timeline">
                <div className={walletDone ? 'done' : isPending ? 'active' : ''}>
                    <span><WalletCards size={13} /></span>
                    <strong>{t.wallet || 'Wallet'}</strong>
                    <small>{walletDone ? 'Signed' : 'Waiting'}</small>
                </div>
                <div className={submitted ? 'done' : isPending ? 'active' : ''}>
                    <span><ExternalLink size={13} /></span>
                    <strong>Submitted</strong>
                    {explorerTxUrl ? <a href={explorerTxUrl} target="_blank" rel="noreferrer">Explorer</a> : <small>Pending</small>}
                </div>
                <div className={updated ? 'done' : submitted ? 'active' : ''}>
                    <span><CheckCircle2 size={13} /></span>
                    <strong>Updated</strong>
                    <small>{updated ? 'Synced' : 'Refreshing'}</small>
                </div>
            </div>
        );
    };

    return (
        <div className="wc-modal-overlay" onClick={onClose}>
            <div className="wc-modal" onClick={e => e.stopPropagation()}>
                <button className="wc-modal-close" onClick={onClose} aria-label="Close"><X size={17} strokeWidth={2.6} /></button>
                <div className="wc-modal-header">
                    <TeamCrest code={team.code} name={team.name} color={team.color} colorSecondary={team.colorSecondary} size="md" />
                    <h2>{team.name}</h2>
                </div>
                <div className="wc-modal-info">
                    <div><span>{t.poolTvl || 'Total in pool'}</span><strong>{team.tvlFormatted}</strong></div>
                    <div><span>{t.yourStake || 'Your stake'}</span><strong>{Number(formatEther(userStake.amount)).toLocaleString(undefined,{maximumFractionDigits:2})}</strong></div>
                    <div><span>{t.pendingRewards || 'Your reward'}</span><strong>{Number(formatEther(userStake.pendingRewards)).toLocaleString(undefined,{maximumFractionDigits:2})}</strong></div>
                    <div><span>{t.fee}</span><strong>{tab === 'stake' ? stakeFeeText : unstakeFeeWaived ? '0%' : unstakeFeeText}</strong></div>
                </div>

                {tab === 'stake' && (
                    <div className="wc-stake-wizard">
                        <div className={allowance > BigInt(0) || !needsApproval ? 'done' : 'active'}><span>1</span><strong>{cleanLabel(t.approve, 'Approve')}</strong><small>{needsApproval ? (t.approveRequired || 'Required before staking') : (t.ready || 'Ready')}</small></div>
                        <div className={!needsApproval && parsedAmount > BigInt(0) ? 'active' : userStake.amount > BigInt(0) ? 'done' : ''}><span>2</span><strong>{cleanLabel(t.stake, 'Stake')}</strong><small>{parsedAmount > BigInt(0) ? `${amount} BANMAO` : 'Enter amount'}</small></div>
                        <div className={userStake.amount > BigInt(0) || userStake.pendingRewards > BigInt(0) ? 'done' : ''}><span>3</span><strong>{t.track || 'Track'}</strong><small>{t.rewardsUpdateAfterMatches || 'Rewards update after matches'}</small></div>
                    </div>
                )}

                {renderTxStatusBanner()}
                {renderTxTimeline()}

                {userStake.pendingRewards > BigInt(0) && (
                    <button className="wc-modal-claim" disabled={isPending} 
                        onClick={() => {
                            beginAction('claim', formatEther(userStake.pendingRewards));
                            onClaimRewards(team.id);
                        }}>
                        <span>{isPending ? cleanLabel(t.processing, 'Processing...') : cleanLabel(t.claimRewards, 'Claim Rewards')}</span>
                        <strong>{Number(formatEther(userStake.pendingRewards)).toLocaleString(undefined,{maximumFractionDigits:2})} $BANMAO</strong>
                    </button>
                )}
                {isLocked && <div className="wc-modal-warning"><LockKeyhole size={16} strokeWidth={2.4} />{t.lockedMsg}</div>}
                {isEliminated && <div className="wc-modal-warning"><ShieldX size={16} strokeWidth={2.4} />{t.elimMsg}</div>}
                {actionBlockedReason && <div className="wc-modal-warning"><ShieldX size={16} strokeWidth={2.4} />{actionBlockedReason}</div>}
                {!isLocked && !isEliminated && !tournamentEnded && (
                    <div className="wc-modal-tabs">
                        <button className={tab==='stake'?'active':''} onClick={()=>handleTabChange('stake')}>{cleanLabel(t.stake, 'Stake')}</button>
                        <button className={tab==='unstake'?'active':''} onClick={()=>handleTabChange('unstake')} disabled={userStake.amount===BigInt(0)}>{cleanLabel(t.unstake, 'Unstake')}</button>
                    </div>
                )}
                {(isEliminated || tournamentEnded) && userStake.amount > BigInt(0) && (
                    <div className="wc-modal-tabs"><button className="active" onClick={()=>handleTabChange('unstake')}>{cleanLabel(t.unstake, 'Unstake')} (0% {t.fee})</button></div>
                )}
                {!isLocked && (
                    <>
                        <div className="wc-modal-input-group">
                            <button type="button" className="wc-step-btn" onClick={()=>stepAmount(-1)} disabled={isPending || parsedAmount === BigInt(0)} aria-label="Decrease amount">
                                <Minus size={15} strokeWidth={2.7} />
                            </button>
                            <input className="wc-modal-input" type="text" inputMode="decimal" placeholder="0.0" value={amount} onChange={e=>handleAmountChange(sanitizeAmount(e.target.value))} />
                            <button type="button" className="wc-step-btn" onClick={()=>stepAmount(1)} disabled={isPending} aria-label="Increase amount">
                                <Plus size={15} strokeWidth={2.7} />
                            </button>
                            <button type="button" className="wc-max-btn" onClick={()=>handleAmountChange(balStr)}>{t.max}</button>
                        </div>
                        <div className="wc-modal-balance">{cleanLabel(t.wallet, 'Wallet')}: {Number(balStr).toLocaleString(undefined,{maximumFractionDigits:2})} $BANMAO</div>
                        {parsedAmount > BigInt(0) && (
                            <div className="wc-amount-preview">
                                {tab === 'stake' ? (
                                    <>
                                        <div><span>{t.inputAmount || 'Input amount'}</span><strong>{Number(formatEther(parsedAmount)).toLocaleString(undefined,{maximumFractionDigits:4})}</strong></div>
                                        <div><span>{t.stakeFee || 'Stake fee'}</span><strong>{Number(formatEther(stakeFeeAmount)).toLocaleString(undefined,{maximumFractionDigits:4})}</strong></div>
                                        <div className="is-primary"><span>{t.netPrincipal || 'Net principal'}</span><strong>{Number(formatEther(stakeNetAmount)).toLocaleString(undefined,{maximumFractionDigits:4})}</strong></div>
                                    </>
                                ) : (
                                    <>
                                        <div><span>{t.requestedWithdraw || 'Requested withdraw'}</span><strong>{Number(formatEther(parsedAmount)).toLocaleString(undefined,{maximumFractionDigits:4})}</strong></div>
                                        <div><span>{t.unstakeFee || 'Unstake fee'}</span><strong>{Number(formatEther(unstakeFeeAmount)).toLocaleString(undefined,{maximumFractionDigits:4})}</strong></div>
                                        <div className="is-primary"><span>{t.estimatedPayout || 'Estimated payout'}</span><strong>{Number(formatEther(unstakePayoutAmount)).toLocaleString(undefined,{maximumFractionDigits:4})}</strong></div>
                                    </>
                                )}
                            </div>
                        )}
                        {tab === 'stake' && !isEliminated && <div className="wc-modal-tip">{cleanLabel(t.stakeTip, 'Stake early for higher time-weighted shares.')}</div>}
                        {needsApproval ? (
                            <button className="wc-modal-action" disabled={isPending || !!actionBlockedReason} 
                                onClick={() => {
                                    beginAction('approve', amount);
                                    onApprove(parsedAmount);
                                }}>
                                {isPending ? cleanLabel(t.processing, 'Processing...') : cleanLabel(t.approve, 'Approve')}
                            </button>
                        ) : (
                            <button className="wc-modal-action" disabled={isPending || parsedAmount === BigInt(0) || !!actionBlockedReason}
                                onClick={() => {
                                    const actionType = tab === 'stake' ? 'stake' : 'unstake';
                                    beginAction(actionType, amount);
                                    if (tab === 'stake') {
                                        onStake(team.id, parsedAmount);
                                    } else {
                                        onUnstake(team.id, parsedAmount);
                                    }
                                }}>
                                {isPending ? cleanLabel(t.processing, 'Processing...') : tab==='stake' ? cleanLabel(t.stake, 'Stake') : cleanLabel(t.unstake, 'Unstake')}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
