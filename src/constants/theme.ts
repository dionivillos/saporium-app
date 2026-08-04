/**
 * Design tokens. Colors are defined for light and dark mode and read through
 * `useTheme()`; components never hardcode a color.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1F1B16',
    textSecondary: '#6B6257',
    background: '#FFFCF7',
    backgroundElement: '#F2ECE2',
    backgroundSelected: '#E7DFD2',
  },
  dark: {
    text: '#F7F3EC',
    textSecondary: '#A9A199',
    background: '#151312',
    backgroundElement: '#23201D',
    backgroundSelected: '#2E2A26',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 800;
