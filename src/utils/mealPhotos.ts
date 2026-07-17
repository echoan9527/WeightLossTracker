import * as FileSystem from "expo-file-system/legacy";

function getMealPhotoDir() {
  if (!FileSystem.documentDirectory) {
    throw new Error("File system document directory is unavailable.");
  }
  return `${FileSystem.documentDirectory}meal-photos/`;
}

function getExtension(uri: string) {
  const cleanUri = uri.split("?")[0];
  const match = cleanUri.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : "jpg";
}

function isLocalMealPhoto(uri: string) {
  return FileSystem.documentDirectory
    ? uri.startsWith(getMealPhotoDir())
    : false;
}

async function ensurePhotoDir() {
  await FileSystem.makeDirectoryAsync(getMealPhotoDir(), {
    intermediates: true,
  });
}

export async function persistMealPhoto(uri: string) {
  if (isLocalMealPhoto(uri)) return uri;

  await ensurePhotoDir();
  const targetUri = `${getMealPhotoDir()}${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${getExtension(uri)}`;

  await FileSystem.copyAsync({ from: uri, to: targetUri });
  return targetUri;
}

export async function persistMealPhotos(uris: string[]) {
  return Promise.all(uris.map((uri) => persistMealPhoto(uri)));
}

export async function deleteMealPhoto(uri: string) {
  if (!isLocalMealPhoto(uri)) return;

  await FileSystem.deleteAsync(uri, { idempotent: true });
}

export async function deleteMealPhotos(uris: string[] = []) {
  await Promise.all(uris.map((uri) => deleteMealPhoto(uri)));
}

export async function deleteRemovedMealPhotos(
  previousUris: string[] = [],
  nextUris: string[] = [],
) {
  const nextSet = new Set(nextUris);
  const removedUris = previousUris.filter((uri) => !nextSet.has(uri));
  await deleteMealPhotos(removedUris);
}
