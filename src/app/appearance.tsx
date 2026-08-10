import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { usePreferences } from '@/hooks/use-preferences';
import { useTheme } from '@/hooks/use-theme';
import { AVAILABLE_LOCALES } from '@/i18n';
import type { LocaleChoice, ThemeChoice } from '@/lib/preferences';

const THEMES: { value: ThemeChoice; icon: string }[] = [
  { value: 'system', icon: '⚙' },
  { value: 'light', icon: '☀' },
  { value: 'dark', icon: '☾' },
];

/**
 * Each language is written in itself, not behind a flag: a flag is a country,
 * and Spanish belongs to twenty of them. Written this way it is also legible to
 * someone who cannot read the language the app is currently in — which is the
 * whole reason they came to this screen.
 */
const LOCALE_NAMES: Record<string, string> = {
  es: 'Español',
  en: 'English',
};

export default function AppearanceScreen() {
  const { t } = useTranslation();
  const { preferences, setPreference } = usePreferences();

  const locales: LocaleChoice[] = ['system', ...AVAILABLE_LOCALES];

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.group}>
          <ThemedText type="smallBold">{t('appearance.theme')}</ThemedText>
          <View style={styles.options}>
            {THEMES.map(({ value, icon }) => (
              <Choice
                key={value}
                icon={icon}
                label={t(`appearance.themes.${value}`)}
                selected={preferences.theme === value}
                onPress={() => setPreference('theme', value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.group}>
          <ThemedText type="smallBold">{t('appearance.language')}</ThemedText>
          <View style={styles.options}>
            {locales.map((value) => (
              <Choice
                key={value}
                label={value === 'system' ? t('appearance.themes.system') : LOCALE_NAMES[value]}
                selected={preferences.locale === value}
                onPress={() => setPreference('locale', value)}
              />
            ))}
          </View>
        </View>

        <ThemedText type="small" themeColor="textSecondary">
          {t('appearance.systemHint')}
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

function Choice({
  icon,
  label,
  selected,
  onPress,
}: {
  icon?: string;
  label?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        {
          backgroundColor: selected || pressed ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: selected ? theme.text : 'transparent',
        },
      ]}
    >
      {icon !== undefined && (
        <ThemedText type="small" accessibilityElementsHidden>
          {icon}
        </ThemedText>
      )}
      <ThemedText type="small">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  group: {
    gap: Spacing.two,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
  },
});
