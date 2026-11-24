import hubTaproomImage from '../assets/images/hub_feather_oaks_taproom.jpg';

/**
 * Photos bundled into the app build. Vite renames them with a hash on every build, so Firestore
 * stores a stable reference like "bundled:hub_feather_oaks_taproom" and the app resolves it here.
 */
const BUNDLED_IMAGES: Record<string, string> = {
  hub_feather_oaks_taproom: hubTaproomImage,
};

const PREFIX = 'bundled:';

export const bundledImageRef = (key: string) => `${PREFIX}${key}`;

/** Shown when a bar has no photo yet (or a photo link is broken). */
export const PLACEHOLDER_BAR_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">' +
      '<rect width="800" height="500" fill="#36302C"/>' +
      '<circle cx="400" cy="230" r="70" fill="none" stroke="#A86B45" stroke-width="10"/>' +
      '<path d="M370 205h60l-8 60h-44z" fill="#C99B72"/>' +
      '<text x="400" y="360" text-anchor="middle" font-family="sans-serif" font-size="34" fill="#F2E8DD">Bar Tap</text>' +
      '</svg>'
  );

export function resolveBarImage(image: string | undefined | null): string {
  if (!image) return PLACEHOLDER_BAR_IMAGE;
  if (image.startsWith(PREFIX)) {
    return BUNDLED_IMAGES[image.slice(PREFIX.length)] || PLACEHOLDER_BAR_IMAGE;
  }
  return image;
}

export const isBundledImage = (image: string | undefined | null) => !!image && image.startsWith(PREFIX);
