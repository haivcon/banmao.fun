// Avatar icons for player profiles - Full animal emoji collection
export const AVATARS = [
    // Cats & Dogs
    '🐱', '🐈', '🐈‍⬛', '🐶', '🐕', '🦮', '🐩',
    // Wild cats
    '🦁', '🐯', '🐆', '🐅',
    // Forest animals
    '🦊', '🐺', '🐻', '🐻‍❄️', '🐼',
    // Farm animals  
    '🐮', '🐷', '🐽', '🐴', '🐑', '🐐', '🐓', '🐔', '🐣', '🐤', '🐥',
    // Small animals
    '🐰', '🐹', '🐭', '🐀', '🐿️', '🦔',
    // Water animals
    '🐸', '🐊', '🐢', '🦎', '🐍', '🐳', '🐋', '🐬', '🦭', '🐟', '🐠', '🐡', '🦈', '🐙', '🦑', '🦐', '🦞', '🦀', '🦪',
    // Monkeys
    '🐵', '🙈', '🙉', '🙊', '🦍', '🦧',
    // Safari
    '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦓', '🦬',
    // Australian
    '🦘', '🦥', '🦨', '🦡',
    // Birds
    '🦅', '🦆', '🦢', '🦉', '🦤', '🪶', '🦩', '🦚', '🦜', '🐦', '🐧', '🕊️',
    // Bugs
    '🦋', '🐛', '🐝', '🐞', '🦗', '🪲', '🪳', '🦟', '🪰', '🪱', '🐌', '🦂', '🕷️',
    // Mythical
    '🦄', '🐉', '🐲'
] as const;

// Avatar colors for UI theming
export const AVATAR_COLORS: { [key: number]: string } = {
    // Default colors based on avatar type
    0: '#fbbf24',  // Cat - yellow/gold
    1: '#f97316',  // Orange cat
    2: '#1e293b',  // Black cat
    3: '#a855f7',  // Dog
    4: '#6366f1',  // Dog
    5: '#ec4899',  // Guide dog
    6: '#8b5cf6',  // Poodle
    7: '#fbbf24',  // Lion
    8: '#f97316',  // Tiger
    9: '#fbbf24',  // Leopard
    10: '#f97316', // Tiger 2
    11: '#f97316', // Fox
    12: '#64748b', // Wolf
    13: '#8b4513', // Bear
    14: '#e2e8f0', // Polar bear  
    15: '#1e293b', // Panda
    16: '#f97316', // Cow
    17: '#f472b6', // Pig
    18: '#f472b6', // Pig nose
    19: '#8b4513', // Horse
    20: '#e2e8f0', // Sheep
    21: '#94a3b8', // Goat
    22: '#ef4444', // Rooster
    23: '#fbbf24', // Chicken
    24: '#fef08a', // Hatching chick
    25: '#fef08a', // Chick
    26: '#fef08a', // Front chick
    27: '#e2e8f0', // Rabbit
    28: '#f97316', // Hamster
    29: '#94a3b8', // Mouse
    30: '#64748b', // Rat
    31: '#f97316', // Chipmunk
    32: '#8b4513', // Hedgehog
    33: '#22c55e', // Frog
    34: '#22c55e', // Crocodile
    35: '#22c55e', // Turtle
    36: '#22c55e', // Lizard
    37: '#22c55e', // Snake
    38: '#3b82f6', // Whale
    39: '#3b82f6', // Whale 2
    40: '#0ea5e9', // Dolphin
};

// Get color for avatar index
export function getAvatarColor(index: number): string {
    return AVATAR_COLORS[index] || '#22d3ee'; // Default cyan
}

export type AvatarIndex = number;
