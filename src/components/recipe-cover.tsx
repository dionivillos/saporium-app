import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { photoUri } from '@/lib/photos';

const LOGO = require('../../assets/images/logo-mark.png');

type Props = {
  coverImagePath: string | null;
  style?: StyleProp<ViewStyle>;
  /** Side of the mark in pixels; the hero wants a bigger one than a card. */
  markSize?: number;
};

/**
 * The photo when there is one, and otherwise the app's own mark on a neutral
 * tone. Deliberately identical for every recipe: a collection of photo-less
 * cards should read as a quiet, consistent surface, not as decoration.
 */
export function RecipeCover({ coverImagePath, style, markSize = 72 }: Props) {
  const theme = useTheme();

  // The photo and the placeholder share one wrapper so callers can style either
  // the same way; an Image and a View do not accept the same style type.
  if (coverImagePath !== null) {
    return (
      <View style={[styles.frame, style]}>
        <Image
          source={{ uri: photoUri(coverImagePath) }}
          style={styles.fill}
          contentFit="cover"
          transition={200}
          accessibilityIgnoresInvertColors
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.frame,
        style,
        styles.placeholder,
        { backgroundColor: theme.backgroundSelected },
      ]}
    >
      <Image
        source={LOGO}
        style={[styles.mark, { width: markSize, height: markSize }]}
        contentFit="contain"
        tintColor={theme.textSecondary}
        accessibilityElementsHidden
      />
    </View>
  );
}

const styles = StyleSheet.create({
  /** Clips the child so a caller's borderRadius actually rounds the image. */
  frame: {
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    opacity: 0.7,
  },
});
