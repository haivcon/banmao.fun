// ===== EXPLORER LINK COMPONENT =====
// Link to view address on XLayer Explorer

import React from 'react';
import { sounds } from '../lib/sounds';

interface ExplorerLinkProps {
    address: string;
    label?: string;
}

/**
 * Explorer Link component to view address on XLayer blockchain explorer
 */
export function ExplorerLink({ address, label = '🔍 View on XLayer Explorer' }: ExplorerLinkProps) {
    return (
        <a
            href={`https://web3.okx.com/explorer/x-layer/address/${address}`}
            target="_blank" rel="noopener noreferrer"
            className="hover-btn"
            onClick={() => sounds.click()}
            onMouseEnter={() => sounds.hover()}
            style={{
                display: 'block', padding: '10px',
                background: 'rgba(34,211,238,0.1)', borderRadius: 10,
                border: '1px solid rgba(34,211,238,0.2)',
                fontSize: 11, color: '#22d3ee', textDecoration: 'none',
                fontWeight: 600, marginBottom: 8
            }}
        >
            {label}
        </a>
    );
}

export default ExplorerLink;
