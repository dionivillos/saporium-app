import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { photoUri, savePhoto } from '@/lib/photos';

type Props = {
  /** Path relative to the documents directory, or null when there is none. */
  value: string | null;
  onChange: (path: string | null) => void;
};

export function PhotoField({ value, onChange }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  async function pick(from: 'camera' | 'library') {
    const permission =
      from === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(t('recipes.form.photoPermission'));
      return;
    }

    const result =
      from === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 1 });

    const asset = result.canceled ? undefined : result.assets[0];
    if (asset === undefined) return;

    try {
      onChange(await savePhoto(asset.uri));
    } catch {
      Alert.alert(t('recipes.form.photoError'));
    }
  }

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{t('recipes.form.coverImage')}</ThemedText>

      {value !== null && (
        <Image source={{ uri: photoUri(value) }} style={styles.preview} contentFit="cover" />
      )}

      <View style={styles.actions}>
        <Action label={t('recipes.form.photoTake')} onPress={() => void pick('camera')} />
        <Action label={t('recipes.form.photoChoose')} onPress={() => void pick('library')} />
        {value !== null && (
          <Action
            label={t('recipes.form.photoRemove')}
            onPress={() => onChange(null)}
            destructive
          />
        )}
      </View>
    </View>
  );

  function Action({
    label,
    onPress,
    destructive,
  }: {
    label: string;
    onPress: () => void;
    destructive?: boolean;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.action,
          { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
        ]}
      >
        <ThemedText type="small" style={destructive === true ? { color: theme.danger } : undefined}>
          {label}
        </ThemedText>
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  action: {
    paddingHorizontal: Spacing.three,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 999,
  },
});
