// src/hooks/useClipboardMonitor.ts
import { useEffect, useRef } from 'react';
import clipboard from 'tauri-plugin-clipboard-api';
import { useStore } from '../store';
import { APP_CONFIG } from '../constants';
import { saveImageToDisk } from '../lib/storage';

export function useClipboardMonitor() {
  const { processClipboardContent } = useStore();

  // Refs allow us to track values across renders without triggering re-renders
  const lastTextRef = useRef<string>('');
  const lastImageHashRef = useRef<string>('');
  const isPollingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    let timerId: ReturnType<typeof setTimeout>;

    const checkClipboard = async () => {
      // 🛑 Safety: Stop if unmounted or if previous check is still crunching data
      if (!isMountedRef.current || isPollingRef.current) return;

      isPollingRef.current = true;

      try {
        // --- 1. Text Check (Fast & Cheap) ---
        const hasText = await clipboard.hasText();
        if (hasText) {
          const text = await clipboard.readText();

          // Check if valid, not empty, and strictly different from the last valid text
          if (text && text.trim().length > 0 && text !== lastTextRef.current) {
            lastTextRef.current = text;
            processClipboardContent({ type: 'text', value: text });

            // 💡 Optimization: If we found text, we likely don't have a NEW image 
            // at the exact same millisecond. Skip image check to save CPU.
            isPollingRef.current = false;
            timerId = setTimeout(checkClipboard, APP_CONFIG.CLIPBOARD_POLL_INTERVAL);
            return;
          }
        }

        // --- 2. Image Check (Expensive) ---
        // Only check if we didn't just process text
        const hasImage = await clipboard.hasImage();
        if (hasImage) {
          // Read Base64 (This operation can be heavy for 4K screenshots)
          const base64 = await clipboard.readImageBase64();

          if (base64) {
            // ⚡ Optimization: Compare only start+end of string instead of full blob
            // This makes change detection significantly faster
            const previewHash = base64.substring(0, 50) + base64.slice(-50);

            if (previewHash !== lastImageHashRef.current) {
              lastImageHashRef.current = previewHash;

              // Save to disk (Async I/O)
              try {
                const fileName = await saveImageToDisk(base64);

                if (isMountedRef.current) {
                  processClipboardContent({
                    type: 'image',
                    value: fileName
                  });
                }
              } catch (saveErr) {
                console.error("Failed to save clipboard image:", saveErr);
              }
            }
          }
        }

      } catch (err) {
        console.error("Clipboard Monitor Error:", err);
      } finally {
        isPollingRef.current = false;

        // 🔄 Schedule next check only after this one completes
        if (isMountedRef.current) {
          timerId = setTimeout(checkClipboard, APP_CONFIG.CLIPBOARD_POLL_INTERVAL);
        }
      }
    };

    // Kick off the loop
    checkClipboard();

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [processClipboardContent]);
}