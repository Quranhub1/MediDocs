import { getDocument } from 'pdfjs-dist/legacy/build/pdf.js';

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
              const thumbnailFile = new File([blob], `thumb_${file.name}`, {
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

export const generatePDFThumbnail = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    
    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(THUMBNAIL_SIZE / viewport.width, THUMBNAIL_SIZE / viewport.height);
    const scaledViewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    
    await page.render({
      canvasContext: ctx,
      viewport: scaledViewport
    }).promise;
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const thumbnailFile = new File([blob], `thumb_${file.name.replace('.pdf', '.jpg')}`, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve({ success: true, file: thumbnailFile, url: URL.createObjectURL(blob) });
          } else {
            reject(new Error('Failed to create PDF thumbnail blob'));
          }
        },
        'image/jpeg',
        THUMBNAIL_QUALITY
      });
    });
  } catch (error) {
    console.error('Error generating PDF thumbnail:', error);
    return { success: false, error: error.message };
  }
};

export const generateThumbnail = async (file) => {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  if (fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/.test(fileName)) {
    return generateImageThumbnail(file);
  } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return generatePDFThumbnail(file);
  } else {
    return { success: false, error: 'Unsupported file type for thumbnail generation' };
  }
};
