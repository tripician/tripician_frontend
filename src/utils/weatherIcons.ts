import type React from 'react';
import {
  IconSun, IconCloud, IconCloudFilled, IconMist, IconCloudRain,
  IconCloudStorm, IconSnowflake, IconDroplet, IconTemperature,
} from '@tabler/icons-react';

/**
 * Weather condition to icon, in one place.
 *
 * Both the Risk Monitor and the planner's News panel drew weather with their
 * own emoji ladders - one keyed on WMO numeric codes, one on condition strings -
 * which meant the same forecast could render as two different pictures in two
 * parts of the product. Emoji also render ~1.3x the metrics of surrounding text
 * and never match the icon set, so both are Tabler now.
 */

/** WMO weather interpretation code (Open-Meteo) to icon. */
export function wmoIcon(code: number | null | undefined): React.ElementType {
  if (code === null || code === undefined) return IconTemperature;
  if (code === 0) return IconSun;              // clear
  if (code <= 2) return IconCloudFilled;       // mainly clear / partly cloudy
  if (code === 3) return IconCloud;            // overcast
  if (code <= 48) return IconMist;             // fog
  if (code <= 57) return IconDroplet;          // drizzle
  if (code <= 67) return IconCloudRain;        // rain
  if (code <= 77) return IconSnowflake;        // snow
  if (code <= 82) return IconCloudRain;        // showers
  return IconCloudStorm;                       // thunderstorm
}

/** Condition slug (the News panel's own vocabulary) to the same icon set. */
export function conditionIcon(kind: string): React.ElementType {
  switch (kind) {
    case 'thunder':    return IconCloudStorm;
    case 'heavy-rain': return IconCloudRain;
    case 'rain':       return IconCloudRain;
    case 'snow':       return IconSnowflake;
    case 'fog':        return IconMist;
    case 'drizzle':    return IconDroplet;
    case 'clear':      return IconSun;
    case 'partly':     return IconCloudFilled;
    case 'cloudy':     return IconCloud;
    default:           return IconTemperature;
  }
}
