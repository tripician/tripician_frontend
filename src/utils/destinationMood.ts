/**
 * destinationMood.ts
 * Utility to derive mood tint color + highlights for a destination name.
 * Feature 5 (mood tinting) and Feature 1 (auto highlights).
 */

export type DestinationMood = 'beach' | 'desert' | 'mountain' | 'jungle' | 'urban' | 'default';

export interface MoodConfig {
  mood: DestinationMood;
  /** RGBA / hex tint applied at low opacity as card background */
  cardTint: string;
  /** Fully-opaque base color for line segments / node states */
  accentColor: string;
  /** 2-3 auto-suggested highlights */
  highlights: string[];
}

const MOOD_MAP: { keywords: string[]; config: Omit<MoodConfig, 'highlights'> & { highlights: string[] } }[] = [
  {
    keywords: ['beach', 'coast', 'coastal', 'island', 'bali', 'maldives', 'hawaii', 'phuket', 'cancun',
               'miami', 'sydney', 'barceloneta', 'goa', 'zanzibar', 'maui', 'ibiza', 'trinidad',
               'caribbean', 'bay', 'gulf', 'sea', 'ocean', 'shore'],
    config: {
      mood: 'beach',
      cardTint: 'rgba(224, 247, 250, 0.42)',
      accentColor: '#0ea5e9',
      highlights: ['Sunrise swim 🏊', 'Beachside café ☕', 'Sunset cruise 🚢'],
    },
  },
  {
    keywords: ['desert', 'sahara', 'dubai', 'abu dhabi', 'riyadh', 'doha', 'muscat', 'petra', 'marrakech',
               'cairo', 'luxor', 'agra', 'rajasthan', 'jaipur', 'oman', 'uae', 'qatar', 'kuwait',
               'arid', 'dune', 'sand', 'sahel', 'arizona', 'nevada', 'las vegas', 'phoenix'],
    config: {
      mood: 'desert',
      cardTint: 'rgba(255, 248, 230, 0.42)',
      accentColor: '#f59e0b',
      highlights: ['Sunrise dunes 🌅', 'Souk / bazaar 🛍️', 'Camel ride 🐫'],
    },
  },
  {
    keywords: ['mountain', 'alpine', 'himalaya', 'himalayas', 'nepal', 'tibet', 'swiss', 'switzerland',
               'alaska', 'patagonia', 'andes', 'colorado', 'rockies', 'pyrenees', 'caucasus',
               'kilimanjaro', 'everest', 'base camp', 'trekking', 'ski', 'summit', 'peak', 'highlands',
               'innsbruck', 'verbier', 'zermatt', 'banff', 'queenstown'],
    config: {
      mood: 'mountain',
      cardTint: 'rgba(241, 245, 249, 0.42)',
      accentColor: '#64748b',
      highlights: ['Summit hike 🏔️', 'Scenic cable car 🚡', 'Alpine lodge 🏨'],
    },
  },
  {
    keywords: ['jungle', 'forest', 'amazon', 'rainforest', 'tropical', 'costa rica', 'borneo', 'sumatra',
               'manaus', 'cambodia', 'laos', 'vietnam', 'thailand', 'indonesia', 'papua', 'congo',
               'madagascar', 'kerala', 'sri lanka', 'chiang mai', 'belize', 'yucatan', 'oaxaca',
               'colombia', 'ecuador', 'peru', 'tree'],
    config: {
      mood: 'jungle',
      cardTint: 'rgba(220, 252, 231, 0.42)',
      accentColor: '#16a34a',
      highlights: ['Canopy walk 🌿', 'Wildlife spotting 🦜', 'River kayak 🛶'],
    },
  },
  {
    keywords: ['city', 'urban', 'metro', 'new york', 'london', 'paris', 'tokyo', 'berlin', 'amsterdam',
               'rome', 'madrid', 'barcelona', 'singapore', 'hong kong', 'seoul', 'shanghai', 'beijing',
               'chicago', 'toronto', 'moscow', 'istanbul', 'bangkok', 'mexico city', 'sao paulo',
               'buenos aires', 'mumbai', 'delhi', 'jakarta', 'lagos', 'nairobi', 'downtown'],
    config: {
      mood: 'urban',
      cardTint: 'rgba(248, 248, 248, 0.42)',
      accentColor: '#6366f1',
      highlights: ['Street food tour 🍜', 'Museum + gallery 🎨', 'Rooftop bar 🍸'],
    },
  },
];

const DEFAULT_CONFIG: MoodConfig = {
  mood: 'default',
  cardTint: 'transparent',
  accentColor: '#e8436a',
  highlights: ['Explore local culture 🗺️', 'Find the best view 📸', 'Ask Navia for tips ✨'],
};

export function getDestinationMood(destinationName: string): MoodConfig {
  const lower = destinationName.toLowerCase();
  for (const { keywords, config } of MOOD_MAP) {
    if (keywords.some(kw => lower.includes(kw))) {
      return config as MoodConfig;
    }
  }
  return DEFAULT_CONFIG;
}
