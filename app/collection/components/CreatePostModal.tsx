"use client";
import React, { useState, useCallback } from "react";

interface CreatePostModalProps {
    t: Record<string, string>;
    address: string;
    onClose: () => void;
    onCreated: () => void;
}

export default function CreatePostModal({ t, address, onClose, onCreated }: CreatePostModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string>("");
    const [caption, setCaption] = useState("");
    const [hashtags, setHashtags] = useState("");
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");

    const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        setPreview(URL.createObjectURL(f));
        setError("");
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!file || !address) return;
        setUploading(true);
        setError("");
        try {
            // Step 1: Upload to Cloudinary
            const formData = new FormData();
            formData.append("file", file);
            formData.append("address", address);
            const uploadRes = await fetch("/api/hub/upload", { method: "POST", body: formData });
            const uploadData = await uploadRes.json();
            if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");

            // Step 2: Create post
            const postRes = await fetch("/api/hub/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    authorAddress: address,
                    mediaUrl: uploadData.mediaUrl,
                    thumbUrl: uploadData.thumbUrl,
                    mediaType: uploadData.mediaType,
                    caption,
                    hashtags,
                }),
            });
            const postData = await postRes.json();
            if (!postRes.ok) throw new Error(postData.error || "Post failed");

            onCreated();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error");
        } finally {
            setUploading(false);
        }
    }, [file, address, caption, hashtags, onClose, onCreated]);

    return (
        <div className="hub-modal-overlay" onClick={onClose}>
            <div className="hub-modal" onClick={(e) => e.stopPropagation()}>
                <div className="hub-modal-header">
                    <h3>📸 {t.createPost}</h3>
                    <button className="hub-modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="hub-modal-body">
                    {!preview ? (
                        <label className="hub-upload-zone">
                            <input type="file" accept="image/*,video/*" onChange={handleFile} hidden />
                            <div className="hub-upload-icon">📁</div>
                            <span>{t.uploadMedia}</span>
                        </label>
                    ) : (
                        <div className="hub-preview-container">
                            {file?.type.startsWith("video/") ? (
                                <video src={preview} controls className="hub-preview-media" />
                            ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={preview} alt="Preview" className="hub-preview-media" />
                            )}
                            <button className="hub-change-file" onClick={() => { setFile(null); setPreview(""); }}>
                                🔄 Change
                            </button>
                        </div>
                    )}

                    <textarea
                        className="hub-caption-input"
                        placeholder={t.captionPlaceholder}
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        maxLength={300}
                    />

                    <input
                        className="hub-hashtag-input"
                        placeholder={t.hashtagPlaceholder}
                        value={hashtags}
                        onChange={(e) => setHashtags(e.target.value)}
                        maxLength={100}
                    />

                    {error && <div className="hub-error">{error}</div>}
                </div>

                <div className="hub-modal-footer">
                    <button className="hub-btn hub-btn-secondary" onClick={onClose}>{t.zipCancel || "Cancel"}</button>
                    <button
                        className="hub-btn hub-btn-primary"
                        disabled={!file || uploading}
                        onClick={handleSubmit}
                    >
                        {uploading ? t.posting : t.createPost}
                    </button>
                </div>
            </div>
        </div>
    );
}
