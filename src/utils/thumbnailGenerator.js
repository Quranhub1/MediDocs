const THUMBNAIL_SIZE = 200;
const THUMBNAIL_QUALITY = 0.8;

export const generateImageThumbnail = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > THUMBNAIL_SIZE) {
            height = (height * THUMBNAIL_SIZE) / width;
            width = THUMBNAIL_SIZE;
          }
        } else {
          if (height > THUMBNAIL_SIZE) {
            width = (width * THUMBNAIL_SIZE) / height;
            height = THUMBNAIL_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const thumbnailFile = new File([blob], 'thumb_' + file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve({ success: true, file: thumbnailFile, url: URL.createObjectURL(blob) });
            } else {
              reject(new Error('Failed to create thumbnail blob'));
            }
          },
          'image/jpeg',
          THUMBNAIL_QUALITY
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export const generateThumbnail = async (file) => {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  const imageExtensions = /(\.(jpg|jpeg|png|gif|webp|svg)$)/i;

  if (fileType.startsWith('image/') || imageExtensions.test(fileName)) {
    return generateImageThumbnail(file);
  }

  return { success: false, error: 'Auto-thumbnail is only supported for image files. Please upload a separate thumbnail image for PDFs and other formats.' };
};
