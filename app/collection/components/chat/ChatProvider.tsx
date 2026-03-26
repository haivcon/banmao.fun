'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useWalletClient, useAccount } from 'wagmi';
import { PushAPI, CONSTANTS } from '@pushprotocol/restapi';
import { createSocketConnection, EVENTS } from '@pushprotocol/socket';

export interface ToastItem {
    id: string;
    message: string;
    from: string;
}

interface ChatContextType {
    pushUser: PushAPI | null;
    isInitializing: boolean;
    error: string | null;
    initPush: () => Promise<void>;
    disconnect: () => void;
    // Realtime features
    pushSocket: any | null;
    realtimeMessages: Record<string, any[]>; // K: peerAddress, V: message[]
    addRealtimeMessage: (peerAddress: string, message: any) => void;
    toasts: ToastItem[];
    removeToast: (id: string) => void;
    // Triggers for refetching
    refreshTrigger: number;
    triggerRefresh: () => void;
    // Nicknames feature
    nicknames: Record<string, string>;
    setNickname: (address: string, name: string) => void;
    // Unread counts
    unreadCount: number;
    clearUnread: () => void;
}

const ChatContext = createContext<ChatContextType>({
    pushUser: null,
    isInitializing: false,
    error: null,
    initPush: async () => { },
    disconnect: () => { },
    pushSocket: null,
    realtimeMessages: {},
    addRealtimeMessage: () => { },
    toasts: [],
    removeToast: () => { },
    refreshTrigger: 0,
    triggerRefresh: () => { },
    nicknames: {},
    setNickname: () => { },
    unreadCount: 0,
    clearUnread: () => { },
});

export function ChatProvider({ children }: { children: ReactNode }) {
    const { address, isConnected } = useAccount();
    const { data: walletClient } = useWalletClient();

    const [pushUser, setPushUser] = useState<PushAPI | null>(null);
    const [pushSocket, setPushSocket] = useState<any | null>(null);
    const [isInitializing, setIsInitializing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [realtimeMessages, setRealtimeMessages] = useState<Record<string, any[]>>({});
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [nicknames, setNicknamesState] = useState<Record<string, string>>({});
    const [unreadCount, setUnreadCount] = useState(0);
    const clearUnread = useCallback(() => setUnreadCount(0), []);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('hub-chat-nicknames');
            if (stored) setNicknamesState(JSON.parse(stored));
        } catch (e) {
            console.error('Error loading nicknames:', e);
        }
    }, []);

    const setNickname = useCallback((addr: string, name: string) => {
        setNicknamesState(prev => {
            const next = { ...prev };
            if (name.trim() === '') {
                delete next[addr];
            } else {
                next[addr] = name.trim();
            }
            localStorage.setItem('hub-chat-nicknames', JSON.stringify(next));
            return next;
        });
    }, []);

    const socketRef = useRef<any>(null);

    const triggerRefresh = useCallback(() => setRefreshTrigger(prev => prev + 1), []);

    const addRealtimeMessage = useCallback((peerAddress: string, message: any) => {
        setRealtimeMessages(prev => {
            const current = prev[peerAddress] || [];
            return { ...prev, [peerAddress]: [...current, message] };
        });
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((from: string, message: string) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, from }]);
        setTimeout(() => removeToast(id), 5000); // Tự tắt sau 5s
    }, [removeToast]);

    // Xóa user khi đổi ví hoặc ngắt kết nối
    useEffect(() => {
        if (!isConnected || !address) {
            setPushUser(null);
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setPushSocket(null);
            }
        }
    }, [isConnected, address]);

    const initPush = useCallback(async () => {
        if (!walletClient || !address) {
            setError('Vui lòng kết nối ví trước (Please connect wallet first).');
            return;
        }

        try {
            setIsInitializing(true);
            setError(null);

            const mockSigner = {
                account: address,
                getAddress: async () => address,
                getChainId: async () => walletClient.chain?.id || 1,
                signMessage: async (data: string | Uint8Array) => {
                    const message = typeof data === 'string' ? data : Buffer.from(data).toString('utf8');
                    return await walletClient.signMessage({ account: walletClient.account, message });
                }
            };

            const user = await PushAPI.initialize(mockSigner as any, {
                env: CONSTANTS.ENV.PROD,
            });

            setPushUser(user);

            // Fetch pending requests for unread badge
            try {
                const requests = await user.chat.list('REQUESTS');
                if (requests && requests.length > 0) {
                    setUnreadCount(requests.length);
                }
            } catch (e) {
                console.error('Failed to fetch requests for unread count', e);
            }

            // Initialize Sockets
            if (socketRef.current) {
                socketRef.current.disconnect();
            }

            const pushSDKSocket = await createSocketConnection({
                user: address,
                env: CONSTANTS.ENV.PROD,
                socketType: 'chat',
                socketOptions: { autoConnect: true, reconnectionAttempts: 3 }
            });

            if (pushSDKSocket) {
                socketRef.current = pushSDKSocket;
                setPushSocket(pushSDKSocket);

                pushSDKSocket.on(EVENTS.CHAT_RECEIVED_MESSAGE, (message: any) => {
                    console.log('📬 [Push Socket] CHAT_RECEIVED_MESSAGE:', message);
                    const peerParts = message.fromCAIP10.split(':');
                    const peerAddr = peerParts[peerParts.length - 1];
                    const content = message.messageContent;

                    // Thêm vào realtime list
                    addRealtimeMessage(peerAddr, {
                        ...message,
                        timestamp: Date.now()
                    });

                    // Trigger refetch cho Inbox
                    triggerRefresh();

                    // Hiện Toast (tránh hiện nếu là tin chính mình gửi từ device khác)
                    if (peerAddr.toLowerCase() !== address.toLowerCase()) {
                        addToast(peerAddr, content);
                        setUnreadCount(prev => prev + 1);
                    }
                });
            }

        } catch (err: any) {
            console.error('Failed to initialize Push client:', err);
            setError(err?.message || 'Khởi tạo Push thất bại (Initialization failed)');
            setPushUser(null);
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setPushSocket(null);
            }
        } finally {
            setIsInitializing(false);
        }
    }, [walletClient, address, addRealtimeMessage, addToast, triggerRefresh]);

    const disconnect = useCallback(() => {
        setPushUser(null);
        setError(null);
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            setPushSocket(null);
        }
    }, []);

    return (
        <ChatContext.Provider value={{
            pushUser, isInitializing, error, initPush, disconnect, pushSocket,
            realtimeMessages, addRealtimeMessage, toasts, removeToast,
            refreshTrigger, triggerRefresh, nicknames, setNickname, unreadCount, clearUnread
        }}>
            {children}
            {/* IN-APP TOASTS COMPONENT */}
            <div className="hub-chat-toasts-container">
                {toasts.map(toast => {
                    const shortAddr = toast.from ? toast.from.slice(0, 6) + '...' + toast.from.slice(-4) : '?';
                    return (
                        <div key={toast.id} className="hub-chat-toast">
                            <strong>{shortAddr}</strong>
                            <p>{toast.message}</p>
                            <button onClick={() => removeToast(toast.id)}>✕</button>
                        </div>
                    );
                })}
            </div>
        </ChatContext.Provider>
    );
}

export function useChat() {
    return useContext(ChatContext);
}
