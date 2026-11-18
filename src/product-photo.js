export const PHOTO_BUCKET = 'doxa-product-photos';
export function validatePhoto(file) {
 if (!file || !file.size) return 'Kies een foto.';
 if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return 'Gebruik een JPG-, PNG- of WebP-afbeelding.';
 if (file.size > 5 * 1024 * 1024) return 'Deze foto is te groot. Kies een foto van maximaal 5 MB.';
 return '';
}
export function photoPath(id, file) {
 const extension = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
 if (validatePhoto(file) || !extension) throw Error('Ongeldige foto');
 return `${id}/${crypto.randomUUID()}.${extension}`;
}
