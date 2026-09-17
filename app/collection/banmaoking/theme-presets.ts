import { BODY_TRAITS, EXPRESSION_TRAITS, ACCESSORY_TRAITS, BACKGROUND_TRAITS, type BanmaoKingTraitSelection } from './traits';

export const THEME_CATEGORIES = ['all', 'royal', 'cosmic', 'nature', 'lifestyle'] as const;
export type ThemeCategory = typeof THEME_CATEGORIES[number];
export type KingThemePreset = BanmaoKingTraitSelection & { name: string; category: Exclude<ThemeCategory, 'all'> };

// Resolve by catalogue names: historical expansion preset body IDs predate consolidation.
function preset(name: string, category: KingThemePreset['category'], body: string, expression: string, accessory: string, background: string): KingThemePreset {
  const selection = {
    body: BODY_TRAITS.findIndex(v => v.name === body),
    expression: EXPRESSION_TRAITS.findIndex(v => v === expression),
    accessory: ACCESSORY_TRAITS.findIndex(v => v === accessory),
    background: BACKGROUND_TRAITS.findIndex(v => v.name === background),
  };
  if (Object.values(selection).some(id => id < 0)) throw new Error(`Invalid Theme Lab preset: ${name}`);
  return { name, category, ...selection };
}

export const KING_THEME_PRESETS: KingThemePreset[] = [
  preset('King', 'royal', BODY_TRAITS[13].name, 'Royal Decree', 'Imperial Regalia', 'Throne Room'),
  preset('Cosmic', 'cosmic', 'Cosmic Suit', 'Cosmic Wonder', 'Astronaut Helmet', 'Deep Cosmos'),
  preset('Bitcoin', 'lifestyle', 'Bitcoin Suit', 'Diamond Gaze', 'Bitcoin Medallion', 'Bitcoin Blocks'),
  preset('Ethereum', 'cosmic', 'Ethereum Suit', 'Diamond Gaze', 'Ethereum Scepter', 'Ethereum Network'),
  preset('OKB', 'cosmic', 'OKB Suit', 'Determined Grin', 'OKB Shield', 'OKB Orbit'),
  preset('Developer', 'lifestyle', 'Developer Suit', 'Focused Coder', 'Developer Laptop', 'Code Terminal'),
  preset('Office', 'lifestyle', 'Office Suit', 'Monday Mood', 'Coffee Break', 'Office'),
  preset('Nature', 'nature', 'Nature Suit', 'Blushing', 'Flower Crown', 'Sakura Garden'),
  preset('Royal', 'royal', 'Royal Suit', 'Determined Grin', 'Bubble Blaster', 'Royal Hall'),
  preset('Frost Monarch', 'royal', 'Frost Suit', 'Diamond Gaze', 'King Crown', 'Throne Room'),
  preset('Arctic Explorer', 'cosmic', 'Frost Suit', 'Cosmic Wonder', 'Astronaut Helmet', 'Deep Cosmos'),
  preset('Sakura Dream', 'nature', 'Nature Suit', 'Dreaming', 'Flower Crown', 'Sakura Garden'),
  preset('Mint Blaster', 'nature', 'Lime Banana', 'Joy', 'Bubble Blaster', 'Mint Bubbles'),
  preset('Cloud Companion', 'nature', 'Frost Suit', 'Happy Smile', 'Mini Companions', 'Cloud Blue'),
  preset('Midnight Coder', 'lifestyle', 'Developer Suit', 'Focused Coder', 'Developer Laptop', 'Midnight Grid'),
  preset('Neon Guardian', 'cosmic', 'Cyborg Suit', 'Determined', 'OKB Shield', 'Cyberpunk Nexus'),
  preset('Golden Hour', 'royal', 'Golden Banana', 'Wink', 'King Crown', 'Mango Burst'),
  preset('Candy Party', 'lifestyle', 'Peach Banana', 'Silly', 'Party Hat', 'Candy Ring'),
  preset('Moonlight Wizard', 'cosmic', 'Cosmic Suit', 'Starstruck', 'Wizard Hat', 'Midnight Grid'),
  preset('Garden Zen', 'nature', 'Lime Banana', 'Zen', 'Halo', 'Sakura Garden'),
  preset('Royal Champion', 'royal', 'Royal Suit', 'Determined Grin', 'Boxing Gloves', 'Royal Hall'),
  preset('Coffee & Clouds', 'lifestyle', 'Office Suit', 'Sleepy', 'Coffee Break', 'Cloud Blue'),
  preset('Starlight DJ', 'cosmic', 'Cosmic Suit', 'Cool Gaze', 'Headphones', 'Deep Cosmos'),
  preset('Peach Blossom', 'nature', 'Peach Banana', 'Love Eyes', 'Red Bow', 'Sakura Garden'),
];

export function filterKingPresets(category: ThemeCategory, query: string) {
  const search = query.trim().toLowerCase();
  return KING_THEME_PRESETS.filter(p => (category === 'all' || p.category === category) &&
    `${p.name} ${BODY_TRAITS[p.body].name} ${EXPRESSION_TRAITS[p.expression]} ${ACCESSORY_TRAITS[p.accessory]} ${BACKGROUND_TRAITS[p.background].name}`.toLowerCase().includes(search));
}
