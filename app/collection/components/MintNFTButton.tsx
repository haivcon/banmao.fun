'use client';
import React, { useState, useCallback, memo } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

// Minimal ERC-721 mint ABI — compatible with most mint contracts
const MINT_ABI = [
    {
        name: 'mint',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'uri', type: 'string' },
        ],
        outputs: [{ name: 'tokenId', type: 'uint256' }],
    },
] as const;

interface MintNFTButtonProps {
    t: Record<string, string>;
    address?: string;
    postId: number;
    mediaUrl: string;
    caption: string;
    contractAddress?: `0x${string}`;
    onMinted?: (txHash: string) => void;
}

const MintNFTButton = memo(function MintNFTButton({
    t,
    address,
    postId,
    mediaUrl,
    caption,
    contractAddress,
    onMinted,
}: MintNFTButtonProps) {
    const [showModal, setShowModal] = useState(false);
    const [minting, setMinting] = useState(false);

    const { writeContract, data: txHash } = useWriteContract();
    const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

    const handleMint = useCallback(async () => {
        if (!address || !contractAddress) return;
        setMinting(true);
        try {
            // Create metadata URI (in production, this would upload to IPFS)
            const metadataUri = `data:application/json;base64,${btoa(JSON.stringify({
                name: `BanmaoHub Post #${postId}`,
                description: caption || 'A BanmaoHub collectible',
                image: mediaUrl,
                attributes: [
                    { trait_type: 'Source', value: 'BanmaoHub' },
                    { trait_type: 'Post ID', value: String(postId) },
                ],
            }))}`;

            writeContract({
                address: contractAddress,
                abi: MINT_ABI,
                functionName: 'mint',
                args: [address as `0x${string}`, metadataUri],
            } as any);
        } catch (err) {
            console.error('Mint error:', err);
        } finally {
            setMinting(false);
        }
    }, [address, contractAddress, postId, mediaUrl, caption, writeContract]);

    // Notify parent on successful mint (useEffect prevents infinite re-render)
    const [notified, setNotified] = useState(false);
    React.useEffect(() => {
        if (isSuccess && txHash && !notified) {
            setNotified(true);
            onMinted?.(txHash);
        }
    }, [isSuccess, txHash, notified, onMinted]);

    if (!address) return null;

    return (
        <>
            <button
                className="hub-action mint-nft-btn"
                onClick={() => setShowModal(true)}
                title={t.mintNFT || 'Mint as NFT'}
            >
                <span className="mint-nft-icon">💎</span>
                <span className="hub-action-label">{t.mint || 'Mint'}</span>
            </button>

            {showModal && (
                <div className="hub-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="hub-modal mint-modal" onClick={e => e.stopPropagation()}>
                        <div className="hub-modal-header">
                            <h3>💎 {t.mintAsNFT || 'Mint as NFT'}</h3>
                            <button className="hub-modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div className="hub-modal-body">
                            <div className="mint-preview">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={mediaUrl} alt="" className="mint-preview-img" />
                                <div className="mint-preview-info">
                                    <p className="mint-preview-title">BanmaoHub Post #{postId}</p>
                                    <p className="mint-preview-caption">{caption || 'No caption'}</p>
                                </div>
                            </div>

                            {!contractAddress ? (
                                <div className="mint-notice">
                                    <span>⚠️</span>
                                    <p>{t.mintContractNeeded || 'NFT minting contract not configured yet. Coming soon!'}</p>
                                </div>
                            ) : isSuccess ? (
                                <div className="mint-success">
                                    <span className="mint-success-icon">✅</span>
                                    <p>{t.mintSuccess || 'Successfully minted!'}</p>
                                    <a href={`https://www.okx.com/web3/explorer/xlayer/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="mint-tx-link">
                                        {t.viewTx || 'View Transaction'} →
                                    </a>
                                </div>
                            ) : (
                                <button
                                    className="hub-btn hub-btn-primary mint-confirm-btn"
                                    onClick={handleMint}
                                    disabled={minting || confirming}
                                >
                                    {confirming ? '⏳ Confirming...' : minting ? '⏳ Minting...' : `💎 ${t.mintNow || 'Mint Now'}`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
});

export default MintNFTButton;
