/**
 * useFomoWebSocket — Real-time WebSocket subscription for BanMaoFomo events
 * Subscribes to AttackPerformed and RoundFinalized events via X Layer WSS
 * Falls back gracefully if WSS connection fails (existing polling still works)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { decodeEventLog } from 'viem';
import { BANMAOFOMO_ADDRESS } from '../lib/constants';

// X Layer WebSocket endpoints
const WS_ENDPOINTS = [
    'wss://xlayerws.okx.com',
    'wss://ws.xlayer.tech',
];

// Event topic hashes (keccak256 of signatures)
const ATTACK_PERFORMED_TOPIC = '0xe2699ca58b4b4062fc408e233b9b77b80fdaf7172112147cdce703bea92c51e8';
const ROUND_FINALIZED_TOPIC = '0x69899f7e86e8d2427968f1b71e78b2ce5d18b262df88adf1bd700cfb543749eb';

// ABI fragments for decoding
const ATTACK_PERFORMED_ABI = [{
    anonymous: false,
    inputs: [
        { indexed: true, internalType: "uint256", name: "roundId", type: "uint256" },
        { indexed: true, internalType: "address", name: "player", type: "address" },
        { indexed: false, internalType: "uint256", name: "count", type: "uint256" },
        { indexed: false, internalType: "uint256", name: "jackpot", type: "uint256" },
        { indexed: false, internalType: "uint256", name: "newHardDeadline", type: "uint256" },
    ],
    name: "AttackPerformed",
    type: "event",
}] as const;

const ROUND_FINALIZED_ABI = [{
    anonymous: false,
    inputs: [
        { indexed: true, internalType: "uint256", name: "roundId", type: "uint256" },
        { indexed: true, internalType: "address", name: "winner", type: "address" },
        { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
        { indexed: false, internalType: "string", name: "winType", type: "string" },
    ],
    name: "RoundFinalized",
    type: "event",
}] as const;

// Decoded event types
export interface WsAttackEvent {
    roundId: bigint;
    player: `0x${string}`;
    count: bigint;
    jackpot: bigint;
    newHardDeadline: bigint;
    txHash: string;
    blockNumber: number;
    timestamp: number;
}

export interface WsRoundFinalizedEvent {
    roundId: bigint;
    winner: `0x${string}`;
    amount: bigint;
    winType: string;
    txHash: string;
    blockNumber: number;
    timestamp: number;
}

interface UseFomoWebSocketOptions {
    enabled?: boolean;
    onAttack?: (event: WsAttackEvent) => void;
    onRoundFinalized?: (event: WsRoundFinalizedEvent) => void;
}

export function useFomoWebSocket(options: UseFomoWebSocketOptions = {}) {
    const { enabled = true, onAttack, onRoundFinalized } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
    const [lastError, setLastError] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);
    const endpointIndex = useRef(0);
    const subscriptionIds = useRef<string[]>([]);

    // Callbacks stored in refs to avoid reconnecting on change
    const onAttackRef = useRef(onAttack);
    onAttackRef.current = onAttack;
    const onRoundFinalizedRef = useRef(onRoundFinalized);
    onRoundFinalizedRef.current = onRoundFinalized;

    // Process incoming log
    const processLog = useCallback((log: any) => {
        try {
            const topic0 = log.topics?.[0]?.toLowerCase();

            if (topic0 === ATTACK_PERFORMED_TOPIC.toLowerCase()) {
                const decoded = decodeEventLog({
                    abi: ATTACK_PERFORMED_ABI,
                    data: log.data,
                    topics: log.topics,
                });
                const args = (decoded as any).args;
                const event: WsAttackEvent = {
                    roundId: args.roundId,
                    player: args.player,
                    count: args.count,
                    jackpot: args.jackpot,
                    newHardDeadline: args.newHardDeadline,
                    txHash: log.transactionHash || '',
                    blockNumber: parseInt(log.blockNumber, 16),
                    timestamp: Date.now(),
                };
                console.log('[WS-FOMO] ⚔️ Attack:', event.player, 'x', Number(event.count));
                onAttackRef.current?.(event);
            }

            if (topic0 === ROUND_FINALIZED_TOPIC.toLowerCase()) {
                const decoded = decodeEventLog({
                    abi: ROUND_FINALIZED_ABI,
                    data: log.data,
                    topics: log.topics,
                });
                const args = (decoded as any).args;
                const event: WsRoundFinalizedEvent = {
                    roundId: args.roundId,
                    winner: args.winner,
                    amount: args.amount,
                    winType: args.winType || 'WIN',
                    txHash: log.transactionHash || '',
                    blockNumber: parseInt(log.blockNumber, 16),
                    timestamp: Date.now(),
                };
                console.log('[WS-FOMO] 🏆 RoundFinalized:', event.winType);
                onRoundFinalizedRef.current?.(event);
            }
        } catch (e) {
            console.error('[WS-FOMO] Failed to decode log:', e);
        }
    }, []);

    // Connect
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const endpoint = WS_ENDPOINTS[endpointIndex.current % WS_ENDPOINTS.length];
        console.log('[WS-FOMO] Connecting to', endpoint);
        setConnectionStatus('connecting');

        try {
            const ws = new WebSocket(endpoint);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[WS-FOMO] ✅ Connected');
                setIsConnected(true);
                setConnectionStatus('connected');
                setLastError(null);
                reconnectAttempts.current = 0;

                // Subscribe to AttackPerformed logs
                ws.send(JSON.stringify({
                    jsonrpc: "2.0",
                    method: "eth_subscribe",
                    params: ["logs", {
                        address: BANMAOFOMO_ADDRESS,
                        topics: [ATTACK_PERFORMED_TOPIC]
                    }],
                    id: 1,
                }));

                // Subscribe to RoundFinalized logs
                ws.send(JSON.stringify({
                    jsonrpc: "2.0",
                    method: "eth_subscribe",
                    params: ["logs", {
                        address: BANMAOFOMO_ADDRESS,
                        topics: [ROUND_FINALIZED_TOPIC]
                    }],
                    id: 2,
                }));
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Subscription confirmations
                    if ((data.id === 1 || data.id === 2) && data.result) {
                        console.log(`[WS-FOMO] ✅ Subscribed (id=${data.id}):`, data.result);
                        subscriptionIds.current.push(data.result);
                    }

                    // Incoming events
                    if (data.method === 'eth_subscription' && data.params?.result) {
                        processLog(data.params.result);
                    }
                } catch (e) {
                    console.error('[WS-FOMO] Parse error:', e);
                }
            };

            ws.onerror = () => {
                setLastError('WebSocket error');
                setConnectionStatus('error');
            };

            ws.onclose = (event) => {
                console.log('[WS-FOMO] Disconnected:', event.code);
                setIsConnected(false);
                setConnectionStatus('disconnected');
                subscriptionIds.current = [];
                wsRef.current = null;

                // Auto-reconnect
                if (enabled && reconnectAttempts.current < 10) {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
                    console.log(`[WS-FOMO] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttempts.current++;
                        if (reconnectAttempts.current % 2 === 0) endpointIndex.current++;
                        connect();
                    }, delay);
                }
            };
        } catch (e: any) {
            console.error('[WS-FOMO] Create failed:', e);
            setLastError(e.message || 'Failed to connect');
            setConnectionStatus('error');
        }
    }, [enabled, processLog]);

    // Disconnect
    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (wsRef.current) {
            // Unsubscribe
            subscriptionIds.current.forEach((id, i) => {
                try {
                    wsRef.current?.send(JSON.stringify({
                        jsonrpc: "2.0",
                        method: "eth_unsubscribe",
                        params: [id],
                        id: 100 + i,
                    }));
                } catch { /* ignore */ }
            });
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
        setConnectionStatus('disconnected');
        subscriptionIds.current = [];
    }, []);

    // Lifecycle
    useEffect(() => {
        if (enabled) {
            connect();
        } else {
            disconnect();
        }
        return () => disconnect();
    }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        isConnected,
        connectionStatus,
        lastError,
        connect,
        disconnect,
    };
}

export default useFomoWebSocket;
