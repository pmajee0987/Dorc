import { storage } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, UploadTask } from 'firebase/storage';

export interface UploadOptions {
  onProgress?: (progress: number) => void;
  onStateChange?: (state: string) => void;
  onTaskReady?: (task: UploadTask) => void;
  compressImages?: boolean;
}

export async function compressImage(file: File | Blob): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;
  // Skip compression for very small images or SVGs
  if (file.size < 500 * 1024 || file.type.includes('svg')) return file;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1920;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // fallback
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else resolve(file);
        }, 'image/jpeg', 0.85); // 85% quality
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export async function uploadFile(
  file: File | Blob,
  path: string,
  options?: UploadOptions
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const storageRef = ref(storage, path);
      
      let finalFile = file;
      if (options?.compressImages && file.type.startsWith('image/')) {
        try {
          finalFile = await compressImage(file);
        } catch (compErr) {
          console.warn('Compression failed, using original file:', compErr);
          finalFile = file;
        }
      }

      // Use the file object directly for better performance and lower memory usage
      const uploadTask = uploadBytesResumable(storageRef, finalFile, { 
        contentType: file.type || 'application/octet-stream'
      });

      if (options?.onTaskReady) {
        options.onTaskReady(uploadTask);
      }

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (options?.onProgress) {
              options.onProgress(Math.min(100, Math.max(0, progress)));
            }
          }
          if (options?.onStateChange) {
            options.onStateChange(snapshot.state);
          }
        },
        (error) => {
          console.error('Firebase Storage upload failed:', error);
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            if (options?.onProgress) options.onProgress(100);
            resolve(downloadURL);
          } catch (error) {
            console.error('getDownloadURL failed:', error);
            reject(error);
          }
        }
      );
    } catch (err) {
      console.error('Storage upload initialization failed:', err);
      reject(err);
    }
  });
}

export async function deleteFile(fileUrl: string): Promise<void> {
  try {
    if (fileUrl.startsWith('data:')) return;
    if (fileUrl.includes('firebasestorage')) {
      const decodedUrl = decodeURIComponent(fileUrl);
      const urlPath = decodedUrl.split('/o/')[1]?.split('?alt=')[0];
      if (urlPath) {
        const fileRef = ref(storage, urlPath);
        await deleteObject(fileRef);
      }
    }
  } catch (err) {
    console.warn("Error deleting file from storage:", err);
  }
}

