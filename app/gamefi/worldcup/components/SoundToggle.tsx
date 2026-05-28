"use client";
import React from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useSoundFX } from "../hooks/SoundContext";

export default function SoundToggle() {
    const { isMuted, toggleMute, playPop } = useSoundFX();

    return (
        <button 
            className={`wc-sound-toggle ${isMuted ? 'muted' : 'active'}`} 
            onClick={() => {
                toggleMute();
                if (isMuted) {
                    setTimeout(() => playPop(), 50); // Play pop when unmuting
                }
            }}
            title={isMuted ? "Enable Sound" : "Mute Sound"}
            aria-label="Toggle Sound"
        >
            {isMuted ? <VolumeX size={18} strokeWidth={2.4} /> : <Volume2 size={18} strokeWidth={2.4} />}
        </button>
    );
}
