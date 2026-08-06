import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Tagged so leaving the screen only releases this screen's hold. */
const TAG = 'recipe-detail';

/**
 * Hands wet, phone on the counter: the screen dimming mid-step is the small
 * annoyance that makes people prop the phone against a jar instead. Off by
 * default, and released on leaving the recipe so it can never drain the battery
 * in a pocket.
 */
export function KeepAwakeToggle() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    void activateKeepAwakeAsync(TAG);
    return () => {
      void deactivateKeepAwake(TAG);
    };
  }, [enabled]);

  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.label}>
        <ThemedText type="smallBold">{t('recipes.detail.keepAwake')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('recipes.detail.keepAwakeHint')}
        </ThemedText>
      </View>
      <Switch
        value={enabled}
        onValueChange={setEnabled}
        accessibilityLabel={t('recipes.detail.keepAwake')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  label: {
    flex: 1,
    gap: Spacing.half,
  },
});
