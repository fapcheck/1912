// src/lib/storage.ts
import { writeFile, mkdir, BaseDirectory, exists } from '@tauri-apps/plugin-fs';

// Cache the directory existence to avoid repeated FS syscalls
let dirChecked = false;

/**
 * Converts a Base64 string (with or without data URI scheme) to a Uint8Array.
 * Optimized for binary data handling.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  // Strip the header if present (e.g., "data:image/png;base64,...")
  const base64Clean = base64.includes(',') 
    ? base64.split(',')[1] 
    : base64;

  const binaryString = atob(base64Clean);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes;
}

/**
 * Ensures the 'images' directory exists in AppLocalData.
 * Uses a lazy check mechanism to minimize I/O.
 */
async function ensureImagesDirectory(): Promise<void> {
  if (dirChecked) return;

  try {
    const dirExists = await exists('images', { baseDir: BaseDirectory.AppLocalData });
    if (!dirExists) {
      await mkdir('images', { baseDir: BaseDirectory.AppLocalData, recursive: true });
    }
    dirChecked = true;
  } catch (err) {
    console.error("Critical FS Error: Could not verify images directory", err);
    throw new Error("FileSystem initialization failed");
  }
}

/**
 * Saves a Base64 image to the local data directory.
 * @param base64Data Raw Base64 string or Data URI
 * @returns The generated filename (e.g., "img_uuid.png")
 */
export async function saveImageToDisk(base64Data: string): Promise<string> {
  await ensureImagesDirectory();

  try {
    // Generate a secure, collision-resistant filename
    const uuid = crypto.randomUUID();
    const timestamp = Date.now();
    const fileName = `img_${timestamp}_${uuid}.png`;
    const filePath = `images/${fileName}`;

    const binaryData = base64ToUint8Array(base64Data);
    
    await writeFile(filePath, binaryData, { 
      baseDir: BaseDirectory.AppLocalData 
    });

    console.log(`✅ File saved: ${fileName} (${binaryData.byteLength} bytes)`);
    return fileName;

  } catch (err) {
    console.error('❌ Save failed:', err);
    throw new Error(`Failed to save image: ${err instanceof Error ? err.message : String(err)}`);
  }
}