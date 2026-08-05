import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Directory, File, Paths } from 'expo-file-system';

// Photos are files in the app sandbox, referenced from the database by a path
// relative to the documents directory. Storing the absolute URI would break on
// every reinstall, because iOS gives the container a new UUID each time.

const FOLDER = 'photos';

/** Long side in pixels. Enough for a full-screen hero, far from a 4 MB original. */
const MAX_DIMENSION = 1600;
const QUALITY = 0.8;

function photosDirectory(): Directory {
  const directory = new Directory(Paths.document, FOLDER);
  if (!directory.exists) directory.create({ intermediates: true });
  return directory;
}

export function photoUri(relativePath: string): string {
  return new File(Paths.document, relativePath).uri;
}

/**
 * Downscales and re-encodes the picked image into the sandbox, and returns the
 * path to store. Respects the user's storage: originals from a modern phone
 * are several megabytes each.
 */
export async function savePhoto(sourceUri: string): Promise<string> {
  const context = ImageManipulator.manipulate(sourceUri).resize({ width: MAX_DIMENSION });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: QUALITY, format: SaveFormat.JPEG });

  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const destination = new File(photosDirectory(), name);

  new File(result.uri).move(destination);

  return `${FOLDER}/${name}`;
}

/** Safe to call with a path whose file is already gone. */
export function deletePhoto(relativePath: string | null): void {
  if (relativePath === null) return;

  try {
    const file = new File(Paths.document, relativePath);
    if (file.exists) file.delete();
  } catch {
    // A leftover file wastes a little space; failing here would be worse.
  }
}
