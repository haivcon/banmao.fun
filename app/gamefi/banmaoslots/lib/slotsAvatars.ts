// ===== SLOTS AVATARS =====
// Avatar emoji list for player profiles

export const SLOTS_AVATARS = [
    '🎰', '🐱', '💰', '🎲', '⭐', '🔥', '💎', '🎯',
    '🦊', '🐉', '🦁', '🐯', '🐼', '🐨', '🐸', '🦄'
] as const;

export type SlotsAvatarIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export function getSlotsAvatarEmoji(index: SlotsAvatarIndex): string {
    return SLOTS_AVATARS[index] || SLOTS_AVATARS[0];
}
