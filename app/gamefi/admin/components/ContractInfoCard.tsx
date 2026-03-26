import React from 'react';

interface ContractInfoCardProps {
    title: string;
    address: string;
    description?: string;
    chainId?: number;
    networkName?: string;
    explorerBaseUrl?: string;
}

export default function ContractInfoCard({
    title,
    address,
    description,
    chainId = 196, // Default to Mainnet
    networkName = "X Layer Mainnet",
    explorerBaseUrl = "https://web3.okx.com/explorer/x-layer/address"
}: ContractInfoCardProps) {
    const explorerUrl = `${explorerBaseUrl}/${address}`;

    return (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 mb-6">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <span>📜</span> {title}
            </h3>
            {description && <p className="text-slate-400 text-sm mb-3">{description}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                    <span className="text-slate-500 block mb-1">Network</span>
                    <span className="font-mono text-blue-400 font-bold bg-blue-400/10 px-2 py-1 rounded inline-block">
                        {networkName} (Chain ID: {chainId})
                    </span>
                </div>
                <div>
                    <span className="text-slate-500 block mb-1">Contract Address</span>
                    <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-orange-400 hover:text-orange-300 flex items-center gap-1 break-all bg-orange-400/10 px-2 py-1 rounded"
                    >
                        {address}
                        <span className="text-xs">↗️</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
