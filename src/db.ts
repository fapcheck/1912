// src/db.ts
import { APP_CONFIG } from './constants';

const DB_CONFIG = {
    DB_NAME: APP_CONFIG.DB_NAME,
    STORE_NAME: APP_CONFIG.STORE_NAME,
    VERSION: 1,
};

// Singleton promise to prevent multiple concurrent open requests
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Opens or returns the existing IndexedDB connection.
 * Implements the Singleton pattern for the database connection.
 */
const openDB = (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_CONFIG.DB_NAME, DB_CONFIG.VERSION);

        request.onerror = () => {
            console.error("IndexedDB Open Error:", request.error);
            dbPromise = null; // Reset promise so we can try again later
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(DB_CONFIG.STORE_NAME)) {
                db.createObjectStore(DB_CONFIG.STORE_NAME);
            }
        };
    });

    return dbPromise;
};

/**
 * Saves data to IndexedDB.
 * @param key The storage key
 * @param data The data to save
 * @param onError Optional callback for handling errors without try/catch
 */
export const saveToDB = async (
    key: string, 
    data: any, 
    onError?: (err: any) => void
): Promise<void> => {
    try {
        const db = await openDB();
        
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(DB_CONFIG.STORE_NAME, 'readwrite');
            const store = tx.objectStore(DB_CONFIG.STORE_NAME);
            const request = store.put(data, key);

            tx.oncomplete = () => resolve();
            
            tx.onerror = () => {
                const err = tx.error;
                if (onError) onError(err);
                reject(err);
            };

            // Capture specific request errors if they don't bubble to tx
            request.onerror = () => {
                const err = request.error;
                if (onError) onError(err);
                // We don't reject here because tx.onerror will likely fire too
            };
        });
    } catch (err) {
        if (onError) onError(err);
        throw err;
    }
};

/**
 * Loads data from IndexedDB.
 * @param key The storage key
 * @returns The data or null if not found/error
 */
export const loadFromDB = async <T = any>(key: string): Promise<T | null> => {
    try {
        const db = await openDB();
        
        return new Promise((resolve, reject) => {
            const tx = db.transaction(DB_CONFIG.STORE_NAME, 'readonly');
            const store = tx.objectStore(DB_CONFIG.STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result as T);
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        // We return null on error to allow the app to fallback to default state
        // rather than crashing the entire initialization flow.
        console.error(`DB Load Error (${key}):`, err);
        return null;
    }
};