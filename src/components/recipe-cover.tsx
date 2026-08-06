import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { photoUri } from '@/lib/photos';
import { placeholderFor } from '@/lib/recipe-placeholder';

type Props = {
  id: string;
  title: string;
  coverImagePath: string | null;
  tags?: readonly string[];
  style?: StyleProp<ViewStyle>;
  /** Scales the glyph; the hero wants a much bigger one than a card. */
  glyphSize?: number;
};

/**
 * The photo when there is one, and otherwise art derived from the recipe itself
 * so an empty collection still looks like a cookbook.
 */
export function RecipeCover({
  id,
  title,
  coverImagePath,
  tags = [],
  style,
  glyphSize = 44,
}: Props) {
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

  const { colors, glyph } = placeholderFor(id, tags, title);

  return (
    <View style={[styles.frame, style]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Decorative: the glyph echoes the tags, which are written out anyway. */}
        <Text style={[styles.glyph, { fontSize: glyphSize }]} accessibilityElementsHidden>
          {glyph}
        </Text>
      </LinearGradient>
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
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    opacity: 0.9,
  },
});
