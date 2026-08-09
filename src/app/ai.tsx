import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AiError, testCredentials, type AiFailure } from '@/lib/ai/client';
import {
  AI_PROVIDERS,
  clearCredentials,
  loadCredentials,
  redact,
  saveCredentials,
  type AiCredentials,
  type AiProvider,
} from '@/lib/ai/credentials';

const ERRORS = {
  unauthorized: 'ai.errors.unauthorized',
  'rate-limited': 'ai.errors.rateLimited',
  unreachable: 'ai.errors.unreachable',
  timeout: 'ai.errors.timeout',
  'bad-response': 'ai.errors.badResponse',
} as const satisfies Record<AiFailure, string>;

type Status =
  { kind: 'idle' } | { kind: 'testing' } | { kind: 'ok' } | { kind: 'failed'; reason: AiFailure };

export default function AiSettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [saved, setSaved] = useState<AiCredentials | null>(null);
  const [provider, setProvider] = useState<AiProvider>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void loadCredentials().then((credentials) => {
      setSaved(credentials);
      if (credentials !== null) setProvider(credentials.provider);
      setReady(true);
    });
  }, []);

  async function save() {
    const credentials = { provider, apiKey: apiKey.trim() };
    await saveCredentials(credentials);

    // Dropped from state as soon as it is stored; from here on the screen only
    // ever shows the redacted form.
    setApiKey('');
    setSaved(credentials);
    setStatus({ kind: 'idle' });
  }

  async function test(credentials: AiCredentials) {
    setStatus({ kind: 'testing' });
    try {
      await testCredentials(credentials);
      setStatus({ kind: 'ok' });
    } catch (error) {
      setStatus({
        kind: 'failed',
        reason: error instanceof AiError ? error.reason : 'unreachable',
      });
    }
  }

  function confirmRemove() {
    Alert.alert(t('ai.removeTitle'), t('ai.removeDescription'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('ai.remove'),
        style: 'destructive',
        onPress: () => {
          void clearCredentials().then(() => {
            setSaved(null);
            setStatus({ kind: 'idle' });
          });
        },
      },
    ]);
  }

  if (!ready) return <ThemedView style={styles.container} />;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText themeColor="textSecondary">{t('ai.description')}</ThemedText>

        {saved === null ? (
          <>
            <View style={styles.group}>
              <ThemedText type="smallBold">{t('ai.provider')}</ThemedText>
              <View style={styles.options}>
                {AI_PROVIDERS.map((option) => (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected: provider === option }}
                    onPress={() => setProvider(option)}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        backgroundColor:
                          provider === option || pressed
                            ? theme.backgroundSelected
                            : theme.backgroundElement,
                        borderColor: provider === option ? theme.text : 'transparent',
                      },
                    ]}
                  >
                    <ThemedText type="small">{t(`ai.providers.${option}`)}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            <TextField
              label={t('ai.key')}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder={t('ai.keyPlaceholder')}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />

            <Action
              label={t('ai.save')}
              disabled={apiKey.trim().length === 0}
              onPress={() => void save()}
            />
          </>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">{t(`ai.providers.${saved.provider}`)}</ThemedText>
              <ThemedText themeColor="textSecondary">{redact(saved.apiKey)}</ThemedText>
            </View>

            <Action
              label={status.kind === 'testing' ? t('ai.testing') : t('ai.test')}
              disabled={status.kind === 'testing'}
              busy={status.kind === 'testing'}
              onPress={() => void test(saved)}
            />

            {status.kind === 'ok' && (
              <ThemedText type="small" themeColor="textSecondary">
                {t('ai.testOk')}
              </ThemedText>
            )}
            {status.kind === 'failed' && (
              <ThemedText type="small" style={styles.error}>
                {t(ERRORS[status.reason])}
              </ThemedText>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={confirmRemove}
              style={({ pressed }) => [
                styles.remove,
                { backgroundColor: pressed ? theme.backgroundSelected : 'transparent' },
              ]}
            >
              <ThemedText type="smallBold" style={styles.error}>
                {t('ai.remove')}
              </ThemedText>
            </Pressable>
          </>
        )}

        <ThemedText type="small" themeColor="textSecondary">
          {t('ai.privacy')}
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

function Action({
  label,
  onPress,
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
          opacity: disabled === true ? 0.5 : 1,
        },
      ]}
    >
      <View style={styles.actionLabel}>
        {busy === true && <ActivityIndicator />}
        <ThemedText type="smallBold">{label}</ThemedText>
      </View>
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
  option: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    borderWidth: 1,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  action: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  actionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  remove: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  error: {
    color: '#C0392B',
  },
});
