"use client";
import React, { useState, useCallback, useEffect } from "react";
import "./EditProfileModal.css";

interface EditProfileModalProps {
    t: Record<string, string>;
    address: string;
    onClose: () => void;
    onUpdated: () => void;
}

export default function EditProfileModal({ t, address, onClose, onUpdated }: EditProfileModalProps) {
    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string>("");
    const [bannerPreview, setBannerPreview] = useState<string>("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Fetch existing profile data on mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch(`/api/hub/profiles?address=${address}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.username) setUsername(data.username);
                    if (data.bio) setBio(data.bio);
                    if (data.avatar_url) setAvatarPreview(data.avatar_url);
                    if (data.banner_url) setBannerPreview(data.banner_url);
                }
            } catch (err) {
                console.error("Failed to load profile", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [address]);

    const handleAvatarFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setAvatarFile(f);
        setAvatarPreview(URL.createObjectURL(f));
        setError("");
    }, []);

    const handleBannerFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setBannerFile(f);
        setBannerPreview(URL.createObjectURL(f));
        setError("");
    }, []);

    // Helper to upload a file through our existing Cloudinary API route
    const uploadImage = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("address", address);
        const res = await fetch("/api/hub/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Image upload failed");
        return data.mediaUrl;
    };

    const handleSubmit = async () => {
        if (!address) return;
        setSaving(true);
        setError("");

        try {
            let finalAvatarUrl = undefined;
            let finalBannerUrl = undefined;

            // Upload new images to Cloudinary if they were selected
            if (avatarFile) finalAvatarUrl = await uploadImage(avatarFile);
            if (bannerFile) finalBannerUrl = await uploadImage(bannerFile);

            // Save profile details
            const saveRes = await fetch("/api/hub/profiles", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    address,
                    username,
                    bio,
                    ...(finalAvatarUrl && { avatar_url: finalAvatarUrl }),
                    ...(finalBannerUrl && { banner_url: finalBannerUrl })
                }),
            });

            const saveData = await saveRes.json();
            if (!saveRes.ok) throw new Error(saveData.error || "Failed to update profile");

            onUpdated();
            onClose();
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="hub-modal-overlay">
                <div className="hub-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="hub-modal-body" style={{ textAlign: "center", padding: "40px" }}>
                        {t.loading || "Loading..."}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="hub-modal-overlay" onClick={onClose}>
            <div className="hub-modal hub-profile-modal" onClick={(e) => e.stopPropagation()}>
                <div className="hub-modal-header">
                    <h3>⚙️ {t.editProfile || "Edit Profile"}</h3>
                    <button className="hub-modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="hub-modal-body">
                    {/* Banner Section */}
                    <div className="hub-ep-field">
                        <label>{t.profileBanner || "Profile Banner"}</label>
                        <div
                            className="hub-ep-banner-preview"
                            style={{ backgroundImage: bannerPreview ? `url(${bannerPreview})` : "none" }}
                        >
                            {!bannerPreview && <span>{t.noBanner || "No banner"}</span>}
                            <label className="hub-ep-upload-btn">
                                <input type="file" accept="image/*" onChange={handleBannerFile} hidden />
                                📷 {t.changeBanner || "Change Banner"}
                            </label>
                        </div>
                    </div>

                    {/* Avatar Section */}
                    <div className="hub-ep-field">
                        <label>{t.avatar || "Avatar"}</label>
                        <div className="hub-ep-avatar-row">
                            <div className="hub-ep-avatar-preview">
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Avatar" />
                                ) : (
                                    <div className="hub-ep-avatar-placeholder">{(username || "?")[0].toUpperCase()}</div>
                                )}
                            </div>
                            <label className="hub-btn hub-btn-secondary">
                                <input type="file" accept="image/*" onChange={handleAvatarFile} hidden />
                                📷 {t.uploadAvatar || "Upload Avatar"}
                            </label>
                        </div>
                    </div>

                    {/* Username Section */}
                    <div className="hub-ep-field">
                        <label>{t.username || "Username"}</label>
                        <input
                            type="text"
                            placeholder={t.usernamePlaceholder || "Enter a unique username..."}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            maxLength={20}
                            className="hub-ep-input"
                        />
                        <p className="hub-ep-hint">{t.usernameHint || "3-20 characters. Letters, numbers, and underscores only."}</p>
                    </div>

                    {/* Bio Section */}
                    <div className="hub-ep-field">
                        <label>{t.bio || "Bio"}</label>
                        <textarea
                            placeholder={t.bioPlaceholder || "Tell everyone a little about yourself..."}
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            maxLength={160}
                            className="hub-ep-textarea"
                        />
                        <p className="hub-ep-hint">{160 - bio.length} {t.charsRemaining || "characters remaining."}</p>
                    </div>

                    {error && <div className="hub-error">{error}</div>}
                </div>

                <div className="hub-modal-footer">
                    <button className="hub-btn hub-btn-secondary" onClick={onClose} disabled={saving}>{t.zipCancel || "Cancel"}</button>
                    <button
                        className="hub-btn hub-btn-primary"
                        onClick={handleSubmit}
                        disabled={saving}
                        style={{ minWidth: '100px' }}
                    >
                        {saving ? (t.saving || "Saving...") : (t.saveProfile || "Save Profile")}
                    </button>
                </div>
            </div>
        </div>
    );
}
