// ===== MY PROFILE CARD COMPONENT =====
// Displays current player's profile card in sidebar

import React from 'react';
import { sounds } from '../lib/sounds';
import { getAvatarEmoji, PlayerProfile } from '../lib/profiles';
import { OnchainPlayer } from '../lib/onchainLeaderboard';
import { getPlayerLevel } from '../lib/gameEngine';
import { SnakeStrings } from '../lib/i18n';

interface MyProfileCardProps {
    address: string;
    myProfile: PlayerProfile;
    onchainLeaderboard: OnchainPlayer[];
    t: SnakeStrings;
    onViewProfile: (player: OnchainPlayer) => void;
    onEditProfile: () => void;
}

/**
 * My Profile Card - displays current player's avatar, name, level, rank with view/edit buttons
 */
export function MyProfileCard({
    address,
    myProfile,
    onchainLeaderboard,
    t,
    onViewProfile,
    onEditProfile
}: MyProfileCardProps) {
    const myPlayerData = onchainLeaderboard.find(p => p.address.toLowerCase() === address.toLowerCase());
    const level = getPlayerLevel(myPlayerData?.totalClaimed ?? BigInt(0));
    const rank = onchainLeaderboard.findIndex(p => p.address.toLowerCase() === address.toLowerCase());

    const handleViewClick = () => {
        sounds.click();
        if (myPlayerData) {
            onViewProfile(myPlayerData);
        } else {
            onViewProfile({
                address: address,
                name: myProfile.name,
                avatar: myProfile.avatar,
                totalClaimed: BigInt(0),
                highestClaim: BigInt(0),
                claimCount: 0,
                lastClaimTime: 0,
                telegram: myProfile.telegram,
                twitter: myProfile.twitter
            });
        }
    };

    return (
        <div style={{
            padding: 14,
            background: 'linear-gradient(145deg, rgba(34,211,238,0.08), rgba(168,85,247,0.05))',
            borderRadius: 14,
            border: '1px solid rgba(34,211,238,0.25)'
        }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#22d3ee', textAlign: 'center', marginBottom: 10 }}>
                {t.myProfileTitle || '👤 My Profile'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Avatar */}
                <div
                    style={{ fontSize: 36, cursor: 'pointer', transition: 'transform 0.2s' }}
                    onMouseEnter={e => { sounds.hover(); e.currentTarget.style.transform = 'scale(1.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                    onClick={handleViewClick}
                >
                    {getAvatarEmoji(myProfile.avatar)}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: 14, fontWeight: 700, color: '#fff',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        marginBottom: 2
                    }}>
                        {myProfile.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                        Lv.{level.level} {level.name}
                    </div>
                    <div style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                        borderRadius: 8, fontSize: 10, fontWeight: 700, color: '#000'
                    }}>
                        {t.rankLabel || 'Rank'} #{rank >= 0 ? rank + 1 : 0 || '-'}
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button
                        onClick={handleViewClick}
                        onMouseEnter={() => sounds.hover()}
                        className="hover-btn"
                        style={{
                            padding: '6px 10px',
                            background: 'rgba(168,85,247,0.2)',
                            border: '1px solid rgba(168,85,247,0.4)',
                            borderRadius: 8, fontSize: 9, color: '#a855f7',
                            cursor: 'pointer', fontWeight: 600
                        }}
                        title={t.viewProfile || 'View'}
                    >
                        👁️ {t.viewProfile || 'View'}
                    </button>
                    <button
                        onClick={() => { sounds.click(); onEditProfile(); }}
                        onMouseEnter={() => sounds.hover()}
                        className="hover-btn"
                        style={{
                            padding: '6px 10px',
                            background: 'rgba(34,211,238,0.2)',
                            border: '1px solid rgba(34,211,238,0.4)',
                            borderRadius: 8, fontSize: 9, color: '#22d3ee',
                            cursor: 'pointer', fontWeight: 600
                        }}
                        title={t.editProfileBtn || 'Edit'}
                    >
                        ✏️ {t.editProfileBtn || 'Edit'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default MyProfileCard;
