/**
 * Read a picture the maker brings from their own device, shrink it to a size
 * a saved book can carry, and return it as a data URL the book format accepts.
 */
export const PICTURE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export async function readPicture(file: File, longest = 640): Promise<string> {
  if (!PICTURE_TYPES.includes(file.type)) throw new Error('Choose a PNG, JPEG, WebP or GIF picture.');
  if (file.size > 12 * 1024 * 1024) throw new Error('Choose a picture smaller than 12 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('That picture could not be read.'));
      img.src = url;
    });
    const scale = Math.min(1, longest / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('That picture could not be read.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    // WebP keeps transparency at a fraction of PNG's size; older browsers fall back to PNG.
    const webp = canvas.toDataURL('image/webp', .9);
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}
