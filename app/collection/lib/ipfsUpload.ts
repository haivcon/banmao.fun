// app/collection/lib/ipfsUpload.ts
// IPFS upload utility using public gateways

const IPFS_GATEWAYS = [
    'https://api.nft.storage/upload',   // NFT.Storage
    'https://api.web3.storage/upload',  // web3.storage
];

interface UploadResult {
    cid: string;
    url: string;
    gateway: string;
}

/**
 * Upload a file to IPFS via HTTP gateway
 * Falls back to local URL if no API key is configured
 */
export async function uploadToIPFS(
    file: File,
    apiKey?: string
): Promise<UploadResult | null> {
    // If we have an API key, try NFT.Storage
    if (apiKey) {
        try {
            const res = await fetch('https://api.nft.storage/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: file,
            });
            const data = await res.json();
            if (data.ok && data.value?.cid) {
                return {
                    cid: data.value.cid,
                    url: `https://${data.value.cid}.ipfs.nftstorage.link/${file.name}`,
                    gateway: 'nft.storage',
                };
            }
        } catch (err) {
            console.error('NFT.Storage upload failed:', err);
        }
    }

    // Fallback: use web3.storage if secondary key exists
    const w3Key = typeof window !== 'undefined'
        ? localStorage.getItem('banmao-web3storage-key')
        : null;

    if (w3Key) {
        try {
            const res = await fetch('https://api.web3.storage/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${w3Key}` },
                body: file,
            });
            const data = await res.json();
            if (data.cid) {
                return {
                    cid: data.cid,
                    url: `https://${data.cid}.ipfs.w3s.link/${file.name}`,
                    gateway: 'web3.storage',
                };
            }
        } catch (err) {
            console.error('web3.storage upload failed:', err);
        }
    }

    return null;
}

/**
 * Generate an IPFS metadata JSON for an NFT
 */
export function createNFTMetadata(opts: {
    name: string;
    description: string;
    imageCid: string;
    attributes?: Array<{ trait_type: string; value: string }>;
}) {
    return JSON.stringify({
        name: opts.name,
        description: opts.description,
        image: `ipfs://${opts.imageCid}`,
        attributes: opts.attributes || [],
    }, null, 2);
}

/**
 * Get the best IPFS gateway URL for a CID
 */
export function ipfsUrl(cid: string, filename?: string): string {
    const base = `https://${cid}.ipfs.nftstorage.link`;
    return filename ? `${base}/${filename}` : base;
}
