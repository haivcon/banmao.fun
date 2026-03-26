// ===== FLOATING SETTINGS SECTION COMPONENT =====
// Fixed position settings button with expandable settings panel

import React from 'react';
import { sounds } from '../lib/sounds';
import { SnakeStrings, LangKey } from '../lib/i18n';
import SettingsPanel from './SettingsPanel';

interface FloatingSettingsSectionProps {
    isOpen: boolean;
    onToggle: () => void;
    isMobile: boolean;
    lang: LangKey;
    uiScale: 'xs' | 'sm' | 'md' | 'lg';
    t: SnakeStrings;
    onChangeLang: (lang: LangKey) => void;
    onChangeScale: (scale: 'xs' | 'sm' | 'md' | 'lg') => void;
}

/**
 * FloatingSettingsSection - fixed position settings button with expandable panel
 */
export function FloatingSettingsSection({
    isOpen,
    onToggle,
    isMobile,
    lang,
    uiScale,
    t,
    onChangeLang,
    onChangeScale
}: FloatingSettingsSectionProps) {
    return (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 999 }}>
            <button
                onClick={() => { sounds.click(); onToggle(); }}
                onMouseEnter={() => sounds.hover()}
                className="hover-btn"
                style={{
                    width: 52, height: 52, borderRadius: 16,
                    background: isOpen
                        ? 'linear-gradient(145deg, #22d3ee, #0891b2)'
                        : 'linear-gradient(145deg, rgba(30,41,59,0.95), rgba(15,23,42,0.9))',
                    border: '1px solid rgba(34,211,238,0.3)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.4), 0 0 20px rgba(34,211,238,0.15)',
                    fontSize: 22,
                    transition: 'all 0.3s ease'
                }}
            >
                ⚙️
            </button>

            {/* Settings Panel */}
            <SettingsPanel
                isOpen={isOpen}
                isMobile={isMobile}
                lang={lang}
                uiScale={uiScale}
                t={t}
                onChangeLang={onChangeLang}
                onChangeScale={onChangeScale}
            />
        </div>
    );
}

export default FloatingSettingsSection;
