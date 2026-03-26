// ===== PROFILE EDIT MODAL =====
// Modal for editing player profile (avatar, name, telegram, twitter)

'use client';

import React from 'react';
import { SLOTS_AVATARS, SlotsAvatarIndex, getSlotsAvatarEmoji } from '../lib/slotsAvatars';
import { slotsSounds } from '../lib/sounds';
import { SlotsTranslations } from '../lib/i18n';

interface ProfileEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => Promise<boolean>;
    isSaving: boolean;
    error: string | null;
    editCount: number;
    maxEdits?: number;
    t: SlotsTranslations; // Translation object

    // Form state
    editName: string;
    setEditName: (name: string) => void;
    editAvatar: SlotsAvatarIndex;
    setEditAvatar: (avatar: SlotsAvatarIndex) => void;
    editTelegram: string;
    setEditTelegram: (telegram: string) => void;
    editTwitter: string;
    setEditTwitter: (twitter: string) => void;
}

export function ProfileEditModal({
    isOpen,
    onClose,
    onSave,
    isSaving,
    error,
    editCount,
    maxEdits = 3,
    t,
    editName,
    setEditName,
    editAvatar,
    setEditAvatar,
    editTelegram,
    setEditTelegram,
    editTwitter,
    setEditTwitter,
}: ProfileEditModalProps) {
    if (!isOpen) return null;

    const remainingEdits = Math.max(0, maxEdits - editCount);
    const isLimitReached = remainingEdits <= 0;

    const handleSave = async () => {
        slotsSounds.click();
        const success = await onSave();
        if (success) {
            slotsSounds.success();
        } else {
            slotsSounds.error();
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99999,
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.95) 100%)',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    borderRadius: 16,
                    padding: 24,
                    width: '90%',
                    maxWidth: 420,
                    maxHeight: '85vh',
                    overflowY: 'auto',
                    boxShadow: '0 0 60px rgba(168, 85, 247, 0.3)',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 20,
                }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#a855f7',
                        fontFamily: "'Space Mono', monospace",
                        textTransform: 'uppercase',
                    }}>
                        {t.editProfileTitle || '✏️ Edit Profile'}
                    </h2>
                    <button
                        onClick={() => { slotsSounds.click(); onClose(); }}
                        style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            borderRadius: 8,
                            color: '#ef4444',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: 14,
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Edit Limit Warning */}
                <div style={{
                    padding: '10px 14px',
                    background: isLimitReached
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(250, 204, 21, 0.1)',
                    border: `1px solid ${isLimitReached ? 'rgba(239, 68, 68, 0.4)' : 'rgba(250, 204, 21, 0.3)'}`,
                    borderRadius: 10,
                    marginBottom: 20,
                    fontSize: 12,
                    color: isLimitReached ? '#ef4444' : '#facc15',
                    textAlign: 'center',
                }}>
                    {isLimitReached
                        ? (t.editLimitReached || '❌ Edit limit reached (3/3). You cannot edit anymore.')
                        : `⚠️ ${remainingEdits} ${t.editsRemaining || 'edit(s) remaining'} (${editCount}/3)`
                    }
                </div>

                {/* Avatar Picker */}
                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                        {t.avatarLabel || 'AVATAR'}
                    </label>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(8, 1fr)',
                        gap: 6,
                    }}>
                        {SLOTS_AVATARS.map((emoji, index) => (
                            <button
                                key={index}
                                onClick={() => { slotsSounds.hover(); setEditAvatar(index as SlotsAvatarIndex); }}
                                disabled={isLimitReached}
                                style={{
                                    width: 40,
                                    height: 40,
                                    fontSize: 22,
                                    background: editAvatar === index
                                        ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.4), rgba(139, 92, 246, 0.3))'
                                        : 'rgba(255, 255, 255, 0.05)',
                                    border: editAvatar === index
                                        ? '2px solid #a855f7'
                                        : '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: 10,
                                    cursor: isLimitReached ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    opacity: isLimitReached ? 0.5 : 1,
                                }}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Name Input */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                        {t.nameLabel || 'NAME (max 20 chars)'}
                    </label>
                    <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value.slice(0, 20))}
                        disabled={isLimitReached}
                        placeholder={t.namePlaceholder || 'Your display name'}
                        style={{
                            width: '100%',
                            padding: '12px 14px',
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            borderRadius: 10,
                            color: '#fff',
                            fontSize: 14,
                            outline: 'none',
                            opacity: isLimitReached ? 0.5 : 1,
                        }}
                    />
                </div>

                {/* Telegram Input */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                        {t.telegramLabel || '📱 TELEGRAM (optional)'}
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#0088cc', fontSize: 14 }}>@</span>
                        <input
                            type="text"
                            value={editTelegram}
                            onChange={(e) => setEditTelegram(e.target.value.replace(/^@/, '').slice(0, 32))}
                            disabled={isLimitReached}
                            placeholder={t.usernamePlaceholder || 'username'}
                            style={{
                                flex: 1,
                                padding: '12px 14px',
                                background: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid rgba(0, 136, 204, 0.3)',
                                borderRadius: 10,
                                color: '#fff',
                                fontSize: 14,
                                outline: 'none',
                                opacity: isLimitReached ? 0.5 : 1,
                            }}
                        />
                    </div>
                </div>

                {/* Twitter/X Input */}
                <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                        {t.twitterLabel || '𝕏 TWITTER / X (optional)'}
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#1da1f2', fontSize: 14 }}>@</span>
                        <input
                            type="text"
                            value={editTwitter}
                            onChange={(e) => setEditTwitter(e.target.value.replace(/^@/, '').slice(0, 32))}
                            disabled={isLimitReached}
                            placeholder={t.usernamePlaceholder || 'username'}
                            style={{
                                flex: 1,
                                padding: '12px 14px',
                                background: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid rgba(29, 161, 242, 0.3)',
                                borderRadius: 10,
                                color: '#fff',
                                fontSize: 14,
                                outline: 'none',
                                opacity: isLimitReached ? 0.5 : 1,
                            }}
                        />
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        padding: '10px 14px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: 10,
                        marginBottom: 16,
                        fontSize: 12,
                        color: '#ef4444',
                        textAlign: 'center',
                    }}>
                        ❌ {error}
                    </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={() => { slotsSounds.click(); onClose(); }}
                        style={{
                            flex: 1,
                            padding: '14px',
                            background: 'rgba(100, 116, 139, 0.2)',
                            border: '1px solid rgba(100, 116, 139, 0.4)',
                            borderRadius: 10,
                            color: '#94a3b8',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        {t.cancelBtn || 'Cancel'}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLimitReached || isSaving}
                        style={{
                            flex: 1,
                            padding: '14px',
                            background: isLimitReached
                                ? 'rgba(100, 116, 139, 0.2)'
                                : 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                            border: 'none',
                            borderRadius: 10,
                            color: '#fff',
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: isLimitReached || isSaving ? 'not-allowed' : 'pointer',
                            opacity: isLimitReached ? 0.5 : 1,
                            boxShadow: isLimitReached ? 'none' : '0 0 20px rgba(168, 85, 247, 0.4)',
                        }}
                    >
                        {isSaving ? (t.savingBtn || '⏳ Saving...') : (t.saveBtn || '💾 Save')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ProfileEditModal;
