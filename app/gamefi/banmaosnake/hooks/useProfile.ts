// ===== USE PROFILE HOOK =====
// Manages player profile state and sync with database

import { useState, useEffect, useCallback } from 'react';
import {
    PlayerProfile,
    getProfile,
    saveProfile,
    createDefaultProfile
} from '../lib/profiles';
import { updateProfileOnLeaderboard, OnchainPlayer } from '../lib/onchainLeaderboard';
import { AvatarIndex } from '../lib/avatars';

interface UseProfileOptions {
    address: string | undefined;
    onchainData?: OnchainPlayer | undefined;
    maxEdits?: number;
}

interface UseProfileReturn {
    profile: PlayerProfile | null;
    editCount: number;
    isEditing: boolean;
    isSaving: boolean;
    error: string | null;

    // Edit form state
    editName: string;
    editAvatar: AvatarIndex;
    editTelegram: string;
    editTwitter: string;

    // Actions
    setEditName: (name: string) => void;
    setEditAvatar: (avatar: AvatarIndex) => void;
    setEditTelegram: (telegram: string) => void;
    setEditTwitter: (twitter: string) => void;
    startEditing: () => void;
    cancelEditing: () => void;
    saveChanges: () => Promise<boolean>;

    // Sync
    syncFromDatabase: (dbData: OnchainPlayer) => void;
}

export function useProfile(options: UseProfileOptions): UseProfileReturn {
    const { address, onchainData, maxEdits = 3 } = options;

    const [profile, setProfile] = useState<PlayerProfile | null>(null);
    const [editCount, setEditCount] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Edit form state
    const [editName, setEditName] = useState('');
    const [editAvatar, setEditAvatar] = useState<AvatarIndex>(0);
    const [editTelegram, setEditTelegram] = useState('');
    const [editTwitter, setEditTwitter] = useState('');

    // Load profile on address change
    useEffect(() => {
        if (address) {
            let loadedProfile = getProfile(address);
            if (!loadedProfile) {
                loadedProfile = createDefaultProfile(address);
                saveProfile(loadedProfile);
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

    // Load edit count from localStorage or database
    useEffect(() => {
        if (!address) return;

        if (onchainData?.editCount !== undefined) {
            setEditCount(onchainData.editCount);
            localStorage.setItem(`snake_edit_count_${address.toLowerCase()}`, String(onchainData.editCount));
        } else {
            const key = `snake_edit_count_${address.toLowerCase()}`;
            const count = parseInt(localStorage.getItem(key) || '0', 10);
            setEditCount(count);
        }
    }, [address, onchainData]);

    // Sync profile from database when local has default name
    const syncFromDatabase = useCallback((dbData: OnchainPlayer) => {
        if (!profile) return;

        const isDefaultName = profile.name.startsWith('Player 0x');
        const dbHasCustomName = dbData.name && !dbData.name.startsWith('Player 0x');

        if (isDefaultName && dbHasCustomName) {
            const updatedProfile: PlayerProfile = {
                ...profile,
                name: dbData.name,
                avatar: (dbData.avatar || 0) as AvatarIndex,
                telegram: dbData.telegram || profile.telegram,
                twitter: dbData.twitter || profile.twitter,
            };
            setProfile(updatedProfile);
            setEditName(dbData.name);
            setEditAvatar(dbData.avatar || 0);
            if (dbData.telegram) setEditTelegram(dbData.telegram);
            if (dbData.twitter) setEditTwitter(dbData.twitter);
            saveProfile(updatedProfile);
        }
    }, [profile]);

    // Sync when onchainData changes
    useEffect(() => {
        if (onchainData && profile) {
            syncFromDatabase(onchainData);
        }
    }, [onchainData, profile, syncFromDatabase]);

    const startEditing = useCallback(() => {
        if (profile) {
            setEditName(profile.name);
            setEditAvatar(profile.avatar);
            setEditTelegram(profile.telegram || '');
            setEditTwitter(profile.twitter || '');
            setIsEditing(true);
        }
    }, [profile]);

    const cancelEditing = useCallback(() => {
        setIsEditing(false);
        setError(null);
    }, []);

    const saveChanges = useCallback(async (): Promise<boolean> => {
        if (!address || !profile) return false;

        if (editCount >= maxEdits) {
            setError(`Edit limit reached (${maxEdits})`);
            return false;
        }

        setIsSaving(true);
        setError(null);

        try {
            const updatedProfile: PlayerProfile = {
                ...profile,
                name: editName.trim() || `Player ${address.slice(0, 6)}`,
                avatar: editAvatar,
                telegram: editTelegram.trim() || undefined,
                twitter: editTwitter.trim() || undefined,
            };

            // Save locally
            saveProfile(updatedProfile);
            setProfile(updatedProfile);

            // Sync to database
            const result = await updateProfileOnLeaderboard(
                address,
                updatedProfile.name,
                updatedProfile.avatar,
                updatedProfile.telegram,
                updatedProfile.twitter
            );

            if (result.success) {
                setEditCount(result.editCount);
                localStorage.setItem(`snake_edit_count_${address.toLowerCase()}`, String(result.editCount));
            }

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
        syncFromDatabase,
    };
}

export default useProfile;
