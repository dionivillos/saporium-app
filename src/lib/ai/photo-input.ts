import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { InlineImage } from '@/lib/ai/client';

/**
 * Preparing a photograph of a page for the model.
 *
 * Downscaled and re-encoded before it is sent, not for our convenience but for
 * the user's: the image goes over their mobile data, and every byte is billed
 * to their own vendor account. A modern phone photo is several megabytes and
 * base64 adds a third on top, while the text on a page stops getting easier to
 * read well below that.
 */

/** Long side in pixels. Enough to read a printed page, far from an original. */
const MAX_DIMENSION = 1600;
const QUALITY = 0.7;
const MEDIA_TYPE = 'image/jpeg';

export async function toInlineImage(sourceUri: string): Promise<InlineImage> {
  const context = ImageManipulator.manipulate(sourceUri).resize({ width: MAX_DIMENSION });
  const image = await context.renderAsync();
  const result = await image.saveAsync({
    compress: QUALITY,
    format: SaveFormat.JPEG,
    base64: true,
  });

  const base64 = result.base64 ?? (await new File(result.uri).base64());

  return { mediaType: MEDIA_TYPE, base64 };
}
