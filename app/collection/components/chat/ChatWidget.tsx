'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useChat } from './ChatProvider';
import { useEnsName } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { X, ChevronRight, MessageSquare, Link2, ExternalLink, Copy, Edit2, Send, ChevronLeft, Image as ImageIcon, Coins, Ban, Users, Video, Phone, PhoneOff, Mic, Square, CornerUpLeft } from 'lucide-react';
import TipModal from '../TipModal';
import CreateGroupModal from './CreateGroupModal';
import ChatMiniProfile from './ChatMiniProfile';
import './Chat.css';

interface ChatWidgetProps {
    isOpen: boolean;
    onClose: () => void;
    t: any;
}

const isImageUrl = (url: string) => {
    return /\.(jpeg|jpg|gif|png|webp)$/i.test(url) || url.startsWith('data:image/');
};

// --- Subcomponents ---
function ConversationItem({ chat, onSelect, isRequest, onAccept, t }: { chat: any, onSelect: (addr: string) => void, isRequest: boolean, onAccept?: (addr: string) => void, t: any }) {
    const { nicknames } = useChat();
    const peerParts = chat.did.split(':');
    const peerAddr = peerParts[peerParts.length - 1];

    const { data: ensName } = useEnsName({
        address: peerAddr as `0x${string}`,
        chainId: mainnet.id,
    });

    const customNick = nicknames[peerAddr];
    const displayName = customNick || ensName || chat.name || (peerAddr ? peerAddr.slice(0, 6) + '...' + peerAddr.slice(-4) : '?');

    return (
        <div className="hub-chat-list-item" onClick={() => onSelect(peerAddr)}>
            <div className="hub-chat-avatar">
                {chat.profilePicture ? <img src={chat.profilePicture} alt="" /> : (displayName[0]?.toUpperCase() || '?')}
            </div>
            <div className="hub-chat-info">
                <div className="hub-chat-name">{displayName}</div>
                <div className="hub-chat-address">{chat.msg?.messageContent || (t.tapToChat || 'Tap to chat')}</div>
                {isRequest && onAccept && (
                    <div className="hub-chat-request-actions">
                        <button
                            className="hub-chat-request-btn hub-chat-request-accept"
                            onClick={(e) => { e.stopPropagation(); onAccept(peerAddr); }}
                        >
                            {t.accept || 'Accept'}
                        </button>
                    </div>
                )}
            </div>
            {!isRequest && <div className="hub-chat-arrow"><ChevronRight size={20} /></div>}
        </div>
    );
}

// --- Main Widget ---
export function ChatWidget({ isOpen, onClose, t }: ChatWidgetProps) {
    const { pushUser, initPush, isInitializing, error, refreshTrigger, triggerRefresh, realtimeMessages, nicknames, setNickname } = useChat();

    // -- Inbox States --
    const [conversations, setConversations] = useState<any[]>([]);
    const [loadingInbox, setLoadingInbox] = useState(false);
    const [activeTab, setActiveTab] = useState<'CHATS' | 'REQUESTS' | 'ALERTS'>('CHATS');
    const [accepting, setAccepting] = useState<string | null>(null);

    // -- Alerts States --
    const [pushAlerts, setPushAlerts] = useState<any[]>([]);
    const [isSubscribedToBanmao, setIsSubscribedToBanmao] = useState(false);
    const BANMAO_CHANNEL = "eip155:1:0x91df43f65eD859eC0d12e8DDA39DeFA12EFA3f9a"; // Treasury as dummy channel
    const [subscribing, setSubscribing] = useState(false);

    // -- Chat View States --
    const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
    const [historyMessages, setHistoryMessages] = useState<any[]>([]);
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingChat, setLoadingChat] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState('');
    const [showTipModal, setShowTipModal] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

    // -- Video Call States --
    const [isVideoCalling, setIsVideoCalling] = useState(false);
    const [videoCallStatus, setVideoCallStatus] = useState<"idle" | "ringing" | "connected">("idle");
    const [incomingCallFrom, setIncomingCallFrom] = useState<string | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const localStream = useRef<MediaStream | null>(null);

    // -- Advanced Chat States --
    const [replyingTo, setReplyingTo] = useState<any | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [viewProfileAddr, setViewProfileAddr] = useState<string | null>(null);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('banmao_blocked_users');
        if (saved) {
            setBlockedUsers(JSON.parse(saved));
        }
    }, []);

    const toggleBlockUser = (addr: string) => {
        const isBlocked = blockedUsers.includes(addr);
        const next = isBlocked ? blockedUsers.filter(u => u !== addr) : [...blockedUsers, addr];
        setBlockedUsers(next);
        localStorage.setItem('banmao_blocked_users', JSON.stringify(next));
        if (!isBlocked) {
            setSelectedPeer(null);
            alert(t.userBlocked || "User blocked.");
        }
    };

    // --- Hooks for Inbox (Chats & Alerts) ---
    useEffect(() => {
        let mounted = true;
        const fetchChats = async () => {
            if (!pushUser || !isOpen) return;
            if (activeTab === 'ALERTS') {
                setLoadingInbox(true);
                try {
                    const subscriptions = await pushUser.notification.subscriptions();
                    const isSub = subscriptions.some((s: any) => s.channel?.toLowerCase() === BANMAO_CHANNEL.split(':')[2].toLowerCase() || s.channel === BANMAO_CHANNEL);
                    if (mounted) setIsSubscribedToBanmao(isSub);

                    const feeds = await pushUser.notification.list('INBOX');
                    if (mounted) setPushAlerts(feeds || []);
                } catch (err) {
                    console.error('Error fetching alerts:', err);
                } finally {
                    if (mounted) setLoadingInbox(false);
                }
                return;
            }

            setLoadingInbox(true);
            try {
                const chats = await pushUser.chat.list(activeTab);
                if (mounted) setConversations(chats || []);
            } catch (err) {
                console.error('Error fetching chats:', err);
            } finally {
                if (mounted) setLoadingInbox(false);
            }
        };
        fetchChats();
        return () => { mounted = false; };
    }, [pushUser, isOpen, activeTab, refreshTrigger]);

    const handleSubscribe = async () => {
        if (!pushUser) return;
        setSubscribing(true);
        try {
            if (isSubscribedToBanmao) {
                await pushUser.notification.unsubscribe(BANMAO_CHANNEL);
                setIsSubscribedToBanmao(false);
                alert(t.unsubscribedSuccess || 'Unsubscribed from Banmao Alerts');
            } else {
                await pushUser.notification.subscribe(BANMAO_CHANNEL);
                setIsSubscribedToBanmao(true);
                alert(t.subscribedSuccess || 'Subscribed to Banmao Alerts!');
            }
            triggerRefresh();
        } catch (err) {
            console.error('Error subscribing:', err);
            alert('Failed to update subscription');
        } finally {
            setSubscribing(false);
        }
    };

    const handleAccept = async (peerAddr: string) => {
        if (!pushUser) return;
        setAccepting(peerAddr);
        try {
            await pushUser.chat.accept(peerAddr);
            triggerRefresh();
            setActiveTab('CHATS');
        } catch (err) {
            console.error('Error accepting request:', err);
            alert(t.failedToAccept || 'Failed to accept request');
        } finally {
            setAccepting(null);
        }
    };

    // --- Hooks for Chat Window ---
    useEffect(() => {
        let mounted = true;
        const loadHistory = async () => {
            if (!pushUser || !selectedPeer) return;
            setLoadingChat(true);
            try {
                const history = await pushUser.chat.history(selectedPeer);
                if (mounted) setHistoryMessages(history || []);
            } catch (err) {
                console.error('Error loading history:', err);
            } finally {
                if (mounted) setLoadingChat(false);
            }
        };
        loadHistory();
        return () => { mounted = false; };
    }, [pushUser, selectedPeer]);

    // Merge static and realtime
    const realtimeForPeer = selectedPeer ? (realtimeMessages[selectedPeer] || []) : [];
    const baseMessages = [...historyMessages];
    realtimeForPeer.forEach(rtMsg => {
        const isDuplicate = baseMessages.some(m => m.timestamp === rtMsg.timestamp && m.messageContent === rtMsg.messageContent);
        if (!isDuplicate) {
            baseMessages.push(rtMsg);
        }
    });

    const { allMessages, messageReactions } = useMemo(() => {
        const normal: any[] = [];
        const rx: Record<string, string[]> = {};
        for (const m of baseMessages) {
            const content = m.messageContent || '';
            if (content.startsWith('{"action":"reaction"')) {
                try {
                    const parsed = JSON.parse(content);
                    const tk = String(parsed.targetMsg);
                    if (!rx[tk]) rx[tk] = [];
                    if (!rx[tk].includes(parsed.emoji)) rx[tk].push(parsed.emoji);
                } catch (e) { }
                continue;
            }
            normal.push(m);
        }
        return { allMessages: normal, messageReactions: rx };
    }, [baseMessages]);

    // Check for incoming WEBRTC signaling
    useEffect(() => {
        const checkSignaling = async () => {
            const newRTC = allMessages.filter(m => {
                const isSig = m.messageContent?.startsWith('{"action":"webrtc_');
                return isSig;
            });

            for (const m of newRTC) {
                // If it's from peer and recent (last 30s)
                if (m.fromCAIP10?.includes(pushUser?.account?.split(':')[1] || '') || Date.now() - (m.timestamp || 0) > 30000) continue;

                try {
                    const data = JSON.parse(m.messageContent);
                    const peerAddr = m.fromCAIP10.split(':').pop();

                    if (data.action === 'webrtc_offer') {
                        if (!isVideoCalling && videoCallStatus === 'idle') {
                            setIncomingCallFrom(peerAddr);
                            setVideoCallStatus('ringing');
                            // Save offer to answer later
                            sessionStorage.setItem('pending_webrtc_offer', JSON.stringify(data.offer));
                        }
                    } else if (data.action === 'webrtc_answer' && peerConnection.current) {
                        try {
                            if (peerConnection.current.signalingState !== 'stable') {
                                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
                            }
                        } catch (e) {
                            console.error('Failed to set remote answer:', e);
                        }
                    } else if (data.action === 'webrtc_candidate' && peerConnection.current) {
                        try {
                            await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
                        } catch (e) {
                            console.error('Failed to add ICE candidate:', e);
                        }
                    } else if (data.action === 'webrtc_end') {
                        endVideoCall();
                    }
                } catch (e) { }
            }
        };
        checkSignaling();
    }, [allMessages, isVideoCalling, videoCallStatus, pushUser]);

    allMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [allMessages]);

    const handleSendMessage = async () => {
        if (!messageText.trim() && !replyingTo) return;
        if (!pushUser || !selectedPeer) return;

        setSending(true);
        try {
            let finalContent = messageText;
            if (replyingTo) {
                const preview = replyingTo.messageContent?.substring(0, 30) || 'Audio/Image';
                finalContent = `[Replying to: ${preview}...]\n\n${messageText}`;
            }

            await pushUser.chat.send(selectedPeer, { type: 'Text', content: finalContent });
            setHistoryMessages(prev => [...prev, { messageContent: finalContent, fromCAIP10: pushUser.account, timestamp: Date.now() }]);
            setMessageText('');
            setReplyingTo(null);

            triggerRefresh(); // refetch inbox to update lastMessage
        } catch (err: any) {
            console.error('Send error:', err);
            if (err.message?.includes('Signer not present')) {
                alert('Vui lòng kết nối lại ví (Please reconnect wallet)');
            } else {
                alert(t.sendMessageFailed || 'Failed to send message');
            }
        } finally {
            setSending(false);
        }
    };

    const sendReaction = async (targetMsgTimestamp: number, emoji: string) => {
        if (!pushUser || !selectedPeer) return;
        const payload = JSON.stringify({ action: 'reaction', targetMsg: targetMsgTimestamp, emoji });
        try {
            await pushUser.chat.send(selectedPeer, { type: 'Text', content: payload });
            setHistoryMessages(prev => [...prev, { messageContent: payload, fromCAIP10: pushUser.account, timestamp: Date.now() }]);
        } catch (e) {
            console.error('Reaction error:', e);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !pushUser || !selectedPeer) return;

        if (file.size > 2 * 1024 * 1024) {
            alert(t.fileTooLarge || 'Image is too large (max 2MB).');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64data = reader.result as string;
            setSending(true);
            try {
                await pushUser.chat.send(selectedPeer, { type: 'Text', content: base64data });
                setHistoryMessages(prev => [...prev, { messageContent: base64data, fromCAIP10: pushUser.account, timestamp: Date.now() }]);
            } catch (err: any) {
                console.error('Send image error:', err);
                alert(t.sendImageFailed || 'Failed to send image');
            } finally {
                setSending(false);
            }
        };
        reader.readAsDataURL(file);
    };

    // VOICE NOTE LOGIC
    const toggleRecording = async () => {
        if (!pushUser || !selectedPeer) return;

        if (isRecording && mediaRecorder.current) {
            mediaRecorder.current.stop();
            setIsRecording(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder.current = new MediaRecorder(stream);
                audioChunks.current = [];

                mediaRecorder.current.ondataavailable = (event) => {
                    if (event.data.size > 0) audioChunks.current.push(event.data);
                };

                mediaRecorder.current.onstop = async () => {
                    const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        const base64Audio = reader.result as string;
                        setSending(true);
                        try {
                            await pushUser.chat.send(selectedPeer, { type: 'Text', content: base64Audio });
                            setHistoryMessages(prev => [...prev, { messageContent: base64Audio, fromCAIP10: pushUser.account, timestamp: Date.now() }]);
                        } catch (err) {
                            console.error('Failed to send audio:', err);
                        } finally {
                            setSending(false);
                        }
                    };
                    reader.readAsDataURL(audioBlob);
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.current.start();
                setIsRecording(true);
            } catch (err) {
                console.error('Mic error:', err);
                alert('Could not access microphone.');
            }
        }
    };

    // WEBRTC CALL LOGIC
    const setupWebRTC = async (isInitiator: boolean, offerData?: any) => {
        if (!pushUser || (!selectedPeer && !incomingCallFrom)) return;
        const targetPeer = selectedPeer || incomingCallFrom;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStream.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            peerConnection.current = pc;

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.ontrack = (event) => {
                if (remoteVideoRef.current && event.streams[0]) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
            };

            pc.onicecandidate = (event) => {
                if (event.candidate && targetPeer) {
                    pushUser.chat.send(targetPeer, {
                        type: 'Text',
                        content: JSON.stringify({ action: 'webrtc_candidate', candidate: event.candidate })
                    });
                }
            };

            if (isInitiator) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                await pushUser.chat.send(targetPeer!, {
                    type: 'Text',
                    content: JSON.stringify({ action: 'webrtc_offer', offer })
                });
            } else if (offerData) {
                await pc.setRemoteDescription(new RTCSessionDescription(offerData));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await pushUser.chat.send(targetPeer!, {
                    type: 'Text',
                    content: JSON.stringify({ action: 'webrtc_answer', answer })
                });
            }

            setVideoCallStatus('connected');

        } catch (err) {
            console.error("WebRTC Error:", err);
            alert("Could not access camera/mic for video call.");
            endVideoCall();
        }
    };

    const startVideoCall = () => {
        setIsVideoCalling(true);
        setVideoCallStatus('ringing');
        setupWebRTC(true);
    };

    const acceptVideoCall = () => {
        setIsVideoCalling(true);
        setSelectedPeer(incomingCallFrom);
        setIncomingCallFrom(null);

        const pendingOffer = sessionStorage.getItem('pending_webrtc_offer');
        if (pendingOffer) {
            const parsed = JSON.parse(pendingOffer);
            sessionStorage.removeItem('pending_webrtc_offer');
            setupWebRTC(false, parsed);
        }
    };

    const endVideoCall = () => {
        if (localStream.current) {
            localStream.current.getTracks().forEach(t => t.stop());
            localStream.current = null;
        }
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }

        if (isVideoCalling || incomingCallFrom) {
            const targetPeer = selectedPeer || incomingCallFrom;
            if (targetPeer && pushUser) {
                pushUser.chat.send(targetPeer, {
                    type: 'Text',
                    content: JSON.stringify({ action: 'webrtc_end' })
                }).catch(() => { });
            }
        }

        setIsVideoCalling(false);
        setIncomingCallFrom(null);
        setVideoCallStatus('idle');
    };

    // Selected Peer Display Logic
    const { data: ensName } = useEnsName({
        address: (selectedPeer || '') as `0x${string}`,
        chainId: mainnet.id,
    });
    const customNick = selectedPeer ? nicknames[selectedPeer] : '';
    const selectedDisplayName = customNick || ensName || (selectedPeer ? selectedPeer.slice(0, 6) + '...' + selectedPeer.slice(-4) : '?');

    useEffect(() => {
        if (isEditingName) setTempName(customNick || '');
    }, [isEditingName, customNick]);

    const filteredConversations = conversations.filter(chat => {
        const addr = chat.did.split(':').pop();
        return !blockedUsers.includes(addr!);
    });

    if (!isOpen) return null;

    return (
        <div className="hub-messenger-overlay" onClick={onClose}>
            <div className={`hub-messenger-container ${selectedPeer ? 'mobile-show-chat' : 'mobile-show-inbox'}`} onClick={e => e.stopPropagation()}>

                {/* --- LEFT: INBOX SIDEBAR --- */}
                <div className="hub-messenger-sidebar">
                    <div className="hub-messenger-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 600 }}>
                            <MessageSquare size={24} /> {t.messages || 'Messenger'}
                        </div>
                        {/* Close button chỉ hiện ở mobile khi đang ở inbox, hoặc desktop luôn hiện */}
                        <button className="hub-messenger-action-btn mobile-only-close" onClick={onClose}><X size={24} /></button>
                    </div>

                    {!pushUser ? (
                        <div className="hub-chat-init">
                            <p>{t.connectToChat || 'Connect to Push Protocol to view your messages.'}</p>
                            {error && <p style={{ color: '#ff6b6b', fontSize: '0.85rem', marginBottom: 8 }}>⚠️ {error}</p>}
                            <button className="hub-btn hub-btn-primary" onClick={initPush} disabled={isInitializing} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                {isInitializing ? (t.connecting || 'Connecting...') : <><Link2 size={18} /> {t.connect || 'Connect'}</>}
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="hub-chat-tabs">
                                <button className={`hub-chat-tab ${activeTab === 'CHATS' ? 'active' : ''}`} onClick={() => setActiveTab('CHATS')}>
                                    {t.chats || 'Chats'}
                                </button>
                                <button className={`hub-chat-tab ${activeTab === 'REQUESTS' ? 'active' : ''}`} onClick={() => setActiveTab('REQUESTS')}>
                                    {t.requests || 'Requests'}
                                </button>
                                <button className={`hub-chat-tab ${activeTab === 'ALERTS' ? 'active' : ''}`} onClick={() => setActiveTab('ALERTS')}>
                                    Alerts
                                </button>
                                <button className="hub-chat-tab" onClick={() => setShowCreateGroup(true)} title={t.createGroup || 'Create Group'} style={{ padding: '4px 8px', marginLeft: 'auto', flex: 'none' }}>
                                    <Users size={18} />
                                </button>
                            </div>

                            <div className="hub-chat-list">
                                {loadingInbox ? (
                                    <div className="hub-chat-loading">{t.loadingMessages || "Loading..."}</div>
                                ) : activeTab === 'ALERTS' ? (
                                    <div className="hub-alerts-container" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div className="hub-subscribe-banner" style={{ background: 'var(--hub-card-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--hub-border)' }}>
                                            <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--hub-text)' }}>Banmao Official Alerts</h4>
                                            <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--hub-text-muted)' }}>Opt-in to get the latest updates on $BANMAO price, new games, and governance.</p>
                                            <button
                                                className={`hub-btn ${isSubscribedToBanmao ? 'hub-btn-outline' : 'hub-btn-primary'}`}
                                                style={{ width: '100%' }}
                                                onClick={handleSubscribe}
                                                disabled={subscribing}
                                            >
                                                {subscribing ? 'Processing...' : isSubscribedToBanmao ? 'Unsubscribe' : 'Opt-in to Alerts'}
                                            </button>
                                        </div>
                                        <div className="hub-alerts-list">
                                            {pushAlerts.length === 0 ? (
                                                <div className="hub-chat-empty">No alerts yet.</div>
                                            ) : (
                                                pushAlerts.map((alert: any, i: number) => (
                                                    <div key={i} className="hub-alert-card" style={{ padding: '12px', background: 'var(--hub-card-bg)', borderRadius: '8px', marginBottom: '8px', border: '1px solid var(--hub-border)' }}>
                                                        <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px', color: 'var(--hub-text)' }}>{alert.title}</strong>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--hub-text-muted)' }}>{alert.message}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                ) : filteredConversations.length === 0 ? (
                                    <div className="hub-chat-empty">
                                        {activeTab === 'CHATS' ? (t.noChats || 'No chats yet.') : (t.noRequests || 'No message requests.')}
                                    </div>
                                ) : (
                                    filteredConversations.map(chat => (
                                        <ConversationItem
                                            key={chat.did}
                                            chat={chat}
                                            onSelect={setSelectedPeer}
                                            isRequest={activeTab === 'REQUESTS'}
                                            onAccept={handleAccept}
                                            t={t}
                                        />
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* --- RIGHT: CHAT AREA --- */}
                <div className="hub-messenger-chatarea">
                    {selectedPeer ? (
                        <>
                            <div className="hub-messenger-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                                    <div className="hub-chat-header">
                                        <button className="hub-messenger-back-btn" onClick={() => setSelectedPeer(null)}>
                                            <ChevronLeft size={24} />
                                        </button>
                                        <div className="hub-chat-avatar-sm" onClick={() => setViewProfileAddr(selectedPeer)} style={{ cursor: 'pointer' }} title={t.viewProfile || 'View Profile'}>
                                            {selectedDisplayName[0]?.toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="hub-chat-name" style={{ fontSize: '1rem', marginBottom: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedDisplayName}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
                                            <button onClick={startVideoCall} title="Video Call" className="hub-messenger-action-btn" style={{ color: '#0084ff' }}><Video size={20} /></button>
                                            <button onClick={() => setShowTipModal(true)} title={t.tipCreator || "Tip $BANMAO"} className="hub-messenger-action-btn" style={{ color: '#ec4899' }}><Coins size={20} /></button>
                                            <a href={`https://www.okx.com/web3/explorer/xlayer/address/${selectedPeer}`} target="_blank" rel="noreferrer" title={t.viewExplorer || "View OKX Explorer"} className="hub-messenger-action-btn"><ExternalLink size={20} /></a>
                                            <button onClick={() => { navigator.clipboard.writeText(selectedPeer); alert(t.copied || 'Copied!'); }} title={t.copyAddress || "Copy Address"} className="hub-messenger-action-btn"><Copy size={20} /></button>
                                            <button onClick={() => setIsEditingName(!isEditingName)} title={t.editNickname || "Edit Nickname"} className="hub-messenger-action-btn"><Edit2 size={20} /></button>
                                            <button onClick={() => toggleBlockUser(selectedPeer!)} title={t.blockUser || "Block User"} className="hub-messenger-action-btn" style={{ color: '#ef4444' }}><Ban size={20} /></button>
                                            <button className="hub-messenger-action-btn desktop-close-btn" onClick={onClose}><X size={24} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {isEditingName && (
                                <div className="hub-messenger-edit-name-bar">
                                    <input
                                        type="text"
                                        value={tempName}
                                        onChange={e => setTempName(e.target.value)}
                                        placeholder={t.typeNickname || "Type nickname..."}
                                        className="hub-messenger-input hub-messenger-input-sm"
                                        onKeyDown={e => { if (e.key === 'Enter') { setNickname(selectedPeer, tempName); setIsEditingName(false); } }}
                                    />
                                    <button className="hub-btn hub-btn-primary" style={{ padding: '6px 12px' }} onClick={() => { setNickname(selectedPeer, tempName); setIsEditingName(false); }}>{t.save || 'Save'}</button>
                                </div>
                            )}

                            <div className="hub-messenger-messages">
                                {loadingChat ? (
                                    <div className="hub-chat-empty">{t.loadingMessages || 'Loading messages...'}</div>
                                ) : allMessages.length === 0 ? (
                                    <div className="hub-chat-empty">{t.sayHello || '👋 Say hello!'}</div>
                                ) : (
                                    allMessages.map((msg, i) => {
                                        const content = msg.messageContent || '';
                                        if (content.startsWith('{"action":"webrtc_')) return null;

                                        const rxList = messageReactions[String(msg.timestamp)] || [];
                                        const timeString = new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                        const isSelf = pushUser?.account && msg.fromCAIP10?.toLowerCase().includes(pushUser.account.split(':')[1]?.toLowerCase() || pushUser.account.toLowerCase());
                                        const isImage = isImageUrl(content);
                                        const isAudio = content.startsWith('data:audio/');

                                        const prevMsg = i > 0 ? allMessages[i - 1] : null;
                                        const nextMsg = i < allMessages.length - 1 ? allMessages[i + 1] : null;
                                        const isNextSameSender = nextMsg && (nextMsg.fromCAIP10 === msg.fromCAIP10) && ((nextMsg.timestamp || 0) - (msg.timestamp || 0) < 60000);
                                        const showAvatar = !isSelf && (!isNextSameSender);

                                        return (
                                            <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                                                <div className={`hub-msg-row ${isSelf ? 'self' : 'peer'} ${!showAvatar && !isSelf ? 'no-avatar' : ''}`} style={{ marginBottom: isNextSameSender ? '2px' : '12px' }}>
                                                    {!isSelf && (
                                                        <div className="hub-msg-avatar" onClick={() => setViewProfileAddr(msg.fromCAIP10?.split(':')[1])} style={{ visibility: showAvatar ? 'visible' : 'hidden', cursor: 'pointer' }} title={t.viewProfile || 'View Profile'}>
                                                            {conversations.find(c => c.did.includes(selectedPeer))?.profilePicture ? (
                                                                <img src={conversations.find(c => c.did.includes(selectedPeer))?.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                selectedDisplayName[0]?.toUpperCase()
                                                            )}
                                                        </div>
                                                    )}
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start', maxWidth: '100%', position: 'relative' }} className="hub-msg-bubble-container">
                                                        <div className={`hub-msg-bubble ${isSelf ? 'self' : 'peer'} ${isImage || isAudio ? 'media' : ''}`}>
                                                            {isImage ? (
                                                                <img src={content} alt="Attachment" style={{ width: '100%', borderRadius: '12px', cursor: 'pointer' }} onClick={() => window.open(content, '_blank')} />
                                                            ) : isAudio ? (
                                                                <audio controls src={content} style={{ height: '36px', maxWidth: '200px' }} />
                                                            ) : (
                                                                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                                    {content.split('\n').map((line: string, idx: number) =>
                                                                        line.startsWith('[Replying to:') ? <div key={idx} style={{ opacity: 0.7, fontSize: '0.8rem', fontStyle: 'italic', background: 'rgba(0,0,0,0.1)', padding: '4px 8px', borderRadius: '4px', marginBottom: '4px', borderLeft: '2px solid rgba(255,255,255,0.4)' }}>{line}</div> : <span key={idx}>{line}{idx < content.split('\n').length - 1 && <br />}</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {rxList.length > 0 && (
                                                                <div style={{ position: 'absolute', bottom: '-10px', [isSelf ? 'right' : 'left']: '10px', background: 'var(--hub-bg)', border: '1px solid var(--hub-border)', borderRadius: '12px', padding: '2px 6px', fontSize: '0.8rem', zIndex: 1, display: 'flex', gap: '2px' }}>
                                                                    {rxList.map((e, ei) => <span key={ei}>{e}</span>)}
                                                                </div>
                                                            )}
                                                            <div style={{ fontSize: '0.65rem', color: isSelf ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)', textAlign: 'right', marginTop: '4px' }}>
                                                                {timeString} {isSelf && <span style={{ marginLeft: 4, letterSpacing: '-2px', color: '#38bdf8' }}>✓✓</span>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Reply Button on hover */}
                                                    <div className="hub-msg-actions" style={{ padding: '0 8px', cursor: 'pointer', opacity: 0.5, alignSelf: 'center', transition: 'opacity 0.2s', display: 'flex', gap: '4px', ...((isSelf ? { marginRight: 'auto' } : { marginLeft: 'auto' }) as any) }}>
                                                        <button onClick={() => sendReaction(msg.timestamp, '❤️')} title="React ❤️" style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>❤️</button>
                                                        <button onClick={() => sendReaction(msg.timestamp, '👍')} title="React 👍" style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>👍</button>
                                                        <button onClick={() => setReplyingTo(msg)} title="Reply" style={{ border: 'none', background: 'transparent', color: 'var(--hub-text-muted)', cursor: 'pointer' }}><CornerUpLeft size={16} /></button>
                                                        {!isSelf && selectedPeer?.length! > 42 && (
                                                            <button onClick={() => alert(t.onlyAdminCanKick || 'Quản trị viên mới có thể xoá thành viên (Admin only)')} title="Kick (Admin)" style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', marginLeft: '4px' }}><Ban size={14} /></button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="hub-chat-input-area" style={{ flexDirection: 'column', padding: '12px' }}>
                                {replyingTo && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px 8px 0 0', width: '100%', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#888' }}>
                                            Replying to: <i>{replyingTo.messageContent?.substring(0, 30)}...</i>
                                        </span>
                                        <button onClick={() => setReplyingTo(null)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}><X size={14} /></button>
                                    </div>
                                )}
                                <div style={{ display: 'flex', width: '100%', gap: '8px', alignItems: 'center', padding: replyingTo ? '8px 0 0 0' : '0' }}>
                                    <label title={t.sendImage || "Send Banner"} className="hub-chat-upload-btn" style={{ flex: 'none' }}>
                                        <ImageIcon size={20} />
                                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} disabled={sending} />
                                    </label>
                                    <button
                                        onClick={toggleRecording}
                                        className={`hub-chat-upload-btn ${isRecording ? 'recording' : ''}`}
                                        title={isRecording ? "Stop Recording" : "Send Voice Note"}
                                        style={{ flex: 'none', color: isRecording ? '#ef4444' : 'inherit' }}
                                    >
                                        {isRecording ? <Square size={20} /> : <Mic size={20} />}
                                    </button>
                                    <input
                                        type="text"
                                        placeholder={isRecording ? "Recording audio..." : (replyingTo ? "Type a reply..." : (t.typeMsg || 'Type message...'))}
                                        className="hub-chat-input"
                                        value={messageText}
                                        onChange={e => setMessageText(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleSendMessage() }}
                                        disabled={sending || isRecording}
                                        style={{ flex: 1 }}
                                    />
                                    <button className="hub-chat-send-btn" onClick={handleSendMessage} disabled={sending || (!messageText.trim() && !replyingTo) || isRecording} style={{ flex: 'none' }}>
                                        {sending ? '...' : <Send size={20} />}
                                    </button>
                                </div>
                            </div>

                            {showTipModal && pushUser && (
                                <TipModal
                                    t={t}
                                    postId={0} // Chat tips aren't explicitly tied to a post
                                    creatorAddress={selectedPeer}
                                    creatorName={selectedDisplayName}
                                    tipperAddress={pushUser.account.split(':')[1] || pushUser.account}
                                    onClose={() => setShowTipModal(false)}
                                    onSuccess={async (amount) => {
                                        setShowTipModal(false);
                                        // Automated tip text via chat
                                        const msgAmount = amount ? amount.toString() : "";
                                        const tipMessageText = `🎉 I just sent you a tip of ${msgAmount} $BANMAO! 🎁`;
                                        try {
                                            await pushUser.chat.send(selectedPeer, { type: 'Text', content: tipMessageText });
                                            setHistoryMessages(prev => [...prev, { messageContent: tipMessageText, fromCAIP10: pushUser.account, timestamp: Date.now() }]);
                                        } catch (e) {
                                            console.error('Failed to send automated tip message', e);
                                        }
                                    }}
                                />
                            )}
                            {viewProfileAddr && (
                                <ChatMiniProfile address={viewProfileAddr} onClose={() => setViewProfileAddr(null)} nickname={nicknames[viewProfileAddr.toLowerCase()]} t={t} />
                            )}
                        </>
                    ) : (
                        <div className="hub-messenger-placeholder">
                            <MessageSquare size={64} style={{ opacity: 0.2, marginBottom: '20px' }} />
                            <h3>{t.messages || 'Messenger'}</h3>
                            <p>{t.selectChatStart || 'Select a chat to start messaging'}</p>
                            {/* Close button cho desktop khi chưa chọn chat */}
                            <button className="hub-btn hub-btn-outline" style={{ marginTop: '20px' }} onClick={onClose}>{t.close || 'Close'}</button>
                        </div>
                    )}
                </div>
            </div>

            {/* WEBRTC VIDEO CALL OVERLAY */}
            {(isVideoCalling || incomingCallFrom) && (
                <div className="hub-video-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '800px', height: '60vh', background: '#000', borderRadius: '16px', overflow: 'hidden' }}>
                        {/* Remote Video (Full Size) */}
                        <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                        {/* Local Video (Picture-in-Picture) */}
                        <video ref={localVideoRef} autoPlay playsInline muted style={{ position: 'absolute', bottom: '20px', right: '20px', width: '120px', height: '160px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #ec4899', background: '#222' }} />

                        {/* Calling State Overlay */}
                        {videoCallStatus === 'ringing' && (
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
                                <div className="hub-chat-avatar" style={{ width: 80, height: 80, marginBottom: 20, fontSize: 32 }}>
                                    {incomingCallFrom ? (conversations.find(c => c.did.includes(incomingCallFrom))?.profilePicture ? <img src={conversations.find(c => c.did.includes(incomingCallFrom))?.profilePicture} alt="" /> : '📞') : '📞'}
                                </div>
                                <h3 style={{ color: '#fff' }}>{incomingCallFrom ? 'Incoming Call...' : 'Calling...'}</h3>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
                        {incomingCallFrom && videoCallStatus === 'ringing' && (
                            <button onClick={acceptVideoCall} className="hub-btn hub-btn-primary" style={{ background: '#10b981', color: '#fff', padding: '16px 32px', borderRadius: '50px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Phone size={24} /> Accept
                            </button>
                        )}
                        <button onClick={endVideoCall} className="hub-btn" style={{ background: '#ef4444', color: '#fff', padding: '16px 32px', borderRadius: '50px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <PhoneOff size={24} /> {incomingCallFrom && videoCallStatus === 'ringing' ? 'Decline' : 'End Call'}
                        </button>
                    </div>
                </div>
            )}

            {showCreateGroup && pushUser && (
                <CreateGroupModal
                    pushUser={pushUser}
                    onClose={() => setShowCreateGroup(false)}
                    onSuccess={(newGroup) => {
                        setShowCreateGroup(false);
                        triggerRefresh();
                        if (newGroup?.chatId) setSelectedPeer(newGroup.chatId);
                    }}
                    t={t}
                />
            )}
        </div>
    );
}
