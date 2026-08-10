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
    border: '#E8E0D4',
    /** Destructive actions and validation errors. */
    danger: '#C0392B',
    /** Inline navigation that is not a button. */
    link: '#0A7EA4',
  },
  dark: {
    text: '#F7F3EC',
    textSecondary: '#A9A199',
    background: '#151312',
    backgroundElement: '#23201D',
    backgroundSelected: '#2E2A26',
    border: '#33302B',
    // Lightened for the dark background: the light-mode red and blue sit at
    // 3.4:1 and 4.0:1 against #151312, both under the 4.5:1 WCAG AA needs.
    danger: '#F08A7A',
    link: '#3FA9CC',
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
