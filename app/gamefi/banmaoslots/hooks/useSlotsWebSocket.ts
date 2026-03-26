// hooks/useSlotsWebSocket.ts
// WebSocket subscription hook for real-time SpinRevealed events
// Uses X Layer's native WebSocket endpoint for instant event streaming

import { useState, useEffect, useCallback, useRef } from 'react';
import { decodeEventLog, formatEther } from 'viem';
import { SLOTS_ABI, SLOTS_CONTRACT_ADDRESS } from '../lib/abis';

// X Layer WebSocket endpoints
const WS_ENDPOINTS = [
    'wss://xlayerws.okx.com',
    'wss://ws.xlayer.tech',
];

// SpinRevealed event topic (keccak256 of signature with seed param - V2)
const SPIN_REVEALED_TOPIC = '0x8f83c66c6b819cd305467cbd9747122330c345104ee2764212e5ff3787b5b3e0';

// SpinRevealed event ABI for decoding (V2 with seed)
const SPIN_REVEALED_EVENT_ABI = [
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "poolId", type: "uint256" },
            { indexed: true, internalType: "address", name: "player", type: "address" },
            { indexed: false, internalType: "uint8[5]", name: "result", type: "uint8[5]" },
            { indexed: false, internalType: "uint256", name: "payout", type: "uint256" },
            { indexed: false, internalType: "bool", name: "isJackpot", type: "bool" },
            { indexed: false, internalType: "bytes32", name: "seed", type: "bytes32" },
        ],
        name: "SpinRevealed",
        type: "event",
    },
] as const;

export interface WebSocketSpinEvent {
    poolId: number;
    player: string;
    result: number[];
    payout: bigint;
    payoutFormatted: string;
    isJackpot: boolean;
    seed: string;  // V2: seed for verification
    txHash: string;
    blockNumber: number;
    logIndex: number;
    timestamp: number;
}

interface UseSlotsWebSocketOptions {
    enabled?: boolean;
    onNewSpin?: (spin: WebSocketSpinEvent) => void;
    filterAddress?: string;
    filterPoolId?: bigint;
}

export function useSlotsWebSocket(options: UseSlotsWebSocketOptions = {}) {
    const { enabled = true, onNewSpin, filterAddress, filterPoolId } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
    const [lastError, setLastError] = useState<string | null>(null);
    const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
    const [recentSpins, setRecentSpins] = useState<WebSocketSpinEvent[]>([]);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);
    const endpointIndex = useRef(0);

    // Process incoming log event
    const processLogEvent = useCallback((log: any) => {
        try {
            // Decode the event log
            const decoded = decodeEventLog({
                abi: SPIN_REVEALED_EVENT_ABI,
                data: log.data,
                topics: log.topics,
            });

            // Type assertion for decoded args (V2 with seed)
            type SpinRevealedArgs = {
                poolId: bigint;
                player: `0x${string}`;
                result: readonly number[];
                payout: bigint;
                isJackpot: boolean;
                seed: `0x${string}`;
            };

            const args = (decoded as { args: SpinRevealedArgs }).args;

            // Apply filters
            if (filterAddress && args.player.toLowerCase() !== filterAddress.toLowerCase()) {
                return;
            }
            if (filterPoolId !== undefined && args.poolId !== filterPoolId) {
                return;
            }

            const spin: WebSocketSpinEvent = {
                poolId: Number(args.poolId),
                player: args.player,
                result: [...args.result],
                payout: args.payout,
                payoutFormatted: formatEther(args.payout),
                isJackpot: args.isJackpot,
                seed: args.seed,  // V2: include seed for verification
                txHash: log.transactionHash,
                blockNumber: parseInt(log.blockNumber, 16),
                logIndex: parseInt(log.logIndex, 16),
                timestamp: Date.now(),
            };

            console.log('[WS] 🎰 New spin received:', spin);

            // Update recent spins (keep last 50)
            setRecentSpins(prev => [spin, ...prev].slice(0, 50));

            // Call callback
            onNewSpin?.(spin);

        } catch (e) {
            console.error('[WS] Failed to decode log:', e);
        }
    }, [filterAddress, filterPoolId, onNewSpin]);

    // Connect to WebSocket
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            console.log('[WS] Already connected');
            return;
        }

        const endpoint = WS_ENDPOINTS[endpointIndex.current % WS_ENDPOINTS.length];
        console.log('[WS] Connecting to', endpoint);
        setConnectionStatus('connecting');

        try {
            const ws = new WebSocket(endpoint);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[WS] ✅ Connected to', endpoint);
                setIsConnected(true);
                setConnectionStatus('connected');
                setLastError(null);
                reconnectAttempts.current = 0;

                // Subscribe to SpinRevealed logs
                const subscribeMessage = {
                    jsonrpc: "2.0",
                    method: "eth_subscribe",
                    params: [
                        "logs",
                        {
                            address: SLOTS_CONTRACT_ADDRESS,
                            topics: [SPIN_REVEALED_TOPIC]
                        }
                    ],
                    id: 1
                };

                console.log('[WS] Subscribing to SpinRevealed events...');
                ws.send(JSON.stringify(subscribeMessage));
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Handle subscription confirmation
                    if (data.id === 1 && data.result) {
                        console.log('[WS] ✅ Subscribed! ID:', data.result);
                        setSubscriptionId(data.result);
                    }

                    // Handle incoming log events
                    if (data.method === 'eth_subscription' && data.params?.result) {
                        const log = data.params.result;

                        // Only process if it's a SpinRevealed event (check topic)
                        if (log.topics?.[0]?.toLowerCase() === SPIN_REVEALED_TOPIC.toLowerCase()) {
                            processLogEvent(log);
                        }
                    }

                } catch (e) {
                    console.error('[WS] Failed to parse message:', e);
                }
            };

            ws.onerror = (error) => {
                console.error('[WS] ❌ Error:', error);
                setLastError('WebSocket error');
                setConnectionStatus('error');
            };

            ws.onclose = (event) => {
                console.log('[WS] Disconnected:', event.code, event.reason);
                setIsConnected(false);
                setConnectionStatus('disconnected');
                setSubscriptionId(null);
                wsRef.current = null;

                // Auto-reconnect with exponential backoff
                if (enabled && reconnectAttempts.current < 10) {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
                    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttempts.current++;
                        // Try next endpoint on failure
                        if (reconnectAttempts.current % 2 === 0) {
                            endpointIndex.current++;
                        }
                        connect();
                    }, delay);
                }
            };

        } catch (e: any) {
            console.error('[WS] Failed to create WebSocket:', e);
            setLastError(e.message || 'Failed to connect');
            setConnectionStatus('error');
        }
    }, [enabled, processLogEvent]);

    // Disconnect WebSocket
    const disconnect = useCallback(() => {
        console.log('[WS] Disconnecting...');

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            // Unsubscribe first if we have a subscription
            if (subscriptionId) {
                try {
                    wsRef.current.send(JSON.stringify({
                        jsonrpc: "2.0",
                        method: "eth_unsubscribe",
                        params: [subscriptionId],
                        id: 2
                    }));
                } catch (e) {
                    // Ignore errors during cleanup
                }
            }

            wsRef.current.close();
            wsRef.current = null;
        }

        setIsConnected(false);
        setConnectionStatus('disconnected');
        setSubscriptionId(null);
    }, [subscriptionId]);

    // Effect: Connect on mount, disconnect on unmount
    useEffect(() => {
        if (enabled) {
            connect();
        } else {
            disconnect();
        }

        return () => {
            disconnect();
        };
    }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

    // Clear recent spins
    const clearRecentSpins = useCallback(() => {
        setRecentSpins([]);
    }, []);

    return {
        isConnected,
        connectionStatus,
        lastError,
        subscriptionId,
        recentSpins,
        connect,
        disconnect,
        clearRecentSpins,
    };
}

export default useSlotsWebSocket;
