// Staking Supporter Avatars
// Array of emoji avatars for supporter profiles

export const STAKING_AVATARS = [
    '😺', // 0 - Cat
    '🐱', // 1 - Cat face
    '🦁', // 2 - Lion
    '🐯', // 3 - Tiger
    '🐶', // 4 - Dog
    '🐺', // 5 - Wolf
    '🦊', // 6 - Fox
    '🐻', // 7 - Bear
    '🐼', // 8 - Panda
    '🐨', // 9 - Koala
    '🦄', // 10 - Unicorn
    '🐲', // 11 - Dragon
    '🦅', // 12 - Eagle
    '🦉', // 13 - Owl
    '🐸', // 14 - Frog
    '🦋', // 15 - Butterfly
    '🌟', // 16 - Star
    '💎', // 17 - Diamond
    '🔥', // 18 - Fire
    '⚡', // 19 - Lightning
];

export type AvatarIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19;

export function getAvatarEmoji(index: number): string {
    return STAKING_AVATARS[index] || STAKING_AVATARS[0];
}
