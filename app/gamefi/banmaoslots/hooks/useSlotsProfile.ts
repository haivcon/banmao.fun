// ===== USE SLOTS PROFILE HOOK =====
// Manages player profile state and sync with database

import { useState, useEffect, useCallback } from 'react';
import {
    SlotsPlayerProfile,
    getSlotsProfile,
    saveSlotsProfile,
    createDefaultSlotsProfile,
    SlotsAvatarIndex
} from '../lib/slotsProfiles';

interface UseSlotsProfileOptions {
    address: string | undefined;
    maxEdits?: number;
}

interface UseSlotsProfileReturn {
    profile: SlotsPlayerProfile | null;
    editCount: number;
    isEditing: boolean;
    isSaving: boolean;
    error: string | null;

    // Edit form state
    editName: string;
    editAvatar: SlotsAvatarIndex;
    editTelegram: string;
    editTwitter: string;

    // Actions
    setEditName: (name: string) => void;
    setEditAvatar: (avatar: SlotsAvatarIndex) => void;
    setEditTelegram: (telegram: string) => void;
    setEditTwitter: (twitter: string) => void;
    startEditing: () => void;
    cancelEditing: () => void;
    saveChanges: () => Promise<boolean>;

    // Sync
    refreshFromDatabase: () => Promise<void>;
}

const LEADERBOARD_API = '/api/slots/leaderboard';

export function useSlotsProfile(options: UseSlotsProfileOptions): UseSlotsProfileReturn {
    const { address, maxEdits = 3 } = options;

    const [profile, setProfile] = useState<SlotsPlayerProfile | null>(null);
    const [editCount, setEditCount] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Edit form state
    const [editName, setEditName] = useState('');
    const [editAvatar, setEditAvatar] = useState<SlotsAvatarIndex>(0);
    const [editTelegram, setEditTelegram] = useState('');
    const [editTwitter, setEditTwitter] = useState('');

    // Load profile on address change
    useEffect(() => {
        if (address) {
            let loadedProfile = getSlotsProfile(address);
            if (!loadedProfile) {
                loadedProfile = createDefaultSlotsProfile(address);
                saveSlotsProfile(loadedProfile);
            }
            setProfile(loadedProfile);
            setEditName(loadedProfile.name);
            setEditAvatar(loadedProfile.avatar);
            setEditTelegram(loadedProfile.telegram || '');
            setEditTwitter(loadedProfile.twitter || '');
        } else {
            setProfile(null);
        }
    }, [address]);

    // Fetch profile from database to get latest edit count and sync
    const refreshFromDatabase = useCallback(async () => {
        if (!address) return;

        try {
            const response = await fetch(LEADERBOARD_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.player) {
                    setEditCount(data.player.editCount || 0);

                    // Sync local profile with DB values if DB has custom name
                    const dbHasCustomName = data.player.name && !data.player.name.startsWith('Spinner 0x');
                    if (dbHasCustomName && profile) {
                        const updatedProfile: SlotsPlayerProfile = {
                            ...profile,
                            name: data.player.name,
                            avatar: data.player.avatar as SlotsAvatarIndex,
                            telegram: data.player.telegram,
                            twitter: data.player.twitter,
                        };
                        setProfile(updatedProfile);
                        saveSlotsProfile(updatedProfile);
                        setEditName(data.player.name);
                        setEditAvatar(data.player.avatar);
                        if (data.player.telegram) setEditTelegram(data.player.telegram);
                        if (data.player.twitter) setEditTwitter(data.player.twitter);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to refresh profile from database:', err);
        }
    }, [address, profile]);

    // Fetch on mount
    useEffect(() => {
        if (address) {
            refreshFromDatabase();
        }
    }, [address]); // eslint-disable-line react-hooks/exhaustive-deps

    const startEditing = useCallback(() => {
        if (profile) {
            setEditName(profile.name);
            setEditAvatar(profile.avatar);
            setEditTelegram(profile.telegram || '');
            setEditTwitter(profile.twitter || '');
            setIsEditing(true);
            setError(null);
        }
    }, [profile]);

    const cancelEditing = useCallback(() => {
        setIsEditing(false);
        setError(null);
    }, []);

    const saveChanges = useCallback(async (): Promise<boolean> => {
        if (!address || !profile) return false;

        if (editCount >= maxEdits) {
            setError(`Edit limit reached (${maxEdits} max)`);
            return false;
        }

        setIsSaving(true);
        setError(null);

        try {
            // Update on database
            const response = await fetch(LEADERBOARD_API, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address,
                    name: editName.trim() || `Spinner ${address.slice(0, 6)}`,
                    avatar: editAvatar,
                    telegram: editTelegram.trim().replace(/^@/, '') || undefined,
                    twitter: editTwitter.trim().replace(/^@/, '') || undefined,
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setError(data.error || 'Failed to save profile');
                return false;
            }

            // Update local profile
            const updatedProfile: SlotsPlayerProfile = {
                ...profile,
                name: editName.trim() || `Spinner ${address.slice(0, 6)}`,
                avatar: editAvatar,
                telegram: editTelegram.trim().replace(/^@/, '') || undefined,
                twitter: editTwitter.trim().replace(/^@/, '') || undefined,
            };

            saveSlotsProfile(updatedProfile);
            setProfile(updatedProfile);
            setEditCount(data.editCount);
            setIsEditing(false);

            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save profile');
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [address, profile, editName, editAvatar, editTelegram, editTwitter, editCount, maxEdits]);

    return {
        profile,
        editCount,
        isEditing,
        isSaving,
        error,
        editName,
        editAvatar,
        editTelegram,
        editTwitter,
        setEditName,
        setEditAvatar,
        setEditTelegram,
        setEditTwitter,
        startEditing,
        cancelEditing,
        saveChanges,
        refreshFromDatabase,
    };
}

export default useSlotsProfile;
