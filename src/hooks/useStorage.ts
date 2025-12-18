import { useState, useEffect, useRef } from 'react';
import { APP_CONFIG } from '../constants';

// --- Низкоуровневые функции DB ---

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(APP_CONFIG.DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(APP_CONFIG.STORE_NAME)) {
        db.createObjectStore(APP_CONFIG.STORE_NAME);
      }
    };
  });
};

const saveToDB = async (key: string, data: any) => {
  const db = await initDB();
  const tx = db.transaction(APP_CONFIG.STORE_NAME, 'readwrite');
  const store = tx.objectStore(APP_CONFIG.STORE_NAME);
  store.put(data, key);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

const loadFromDB = async (key: string): Promise<any> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(APP_CONFIG.STORE_NAME, 'readonly');
      const store = tx.objectStore(APP_CONFIG.STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    return null;
  }
};

// --- Наш умный Хук ---

export function useStorage<T>(key: string, initialValue: T) {
  const [data, setData] = useState<T>(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Ref для таймера debounce
  const saveTimeoutRef = useRef<number | null>(null);

  // 1. Загрузка при старте
  useEffect(() => {
    const load = async () => {
      try {
        const result = await loadFromDB(key);
        if (result) {
          setData(result);
        } else {
          // Если в базе пусто, сохраняем начальное значение
          await saveToDB(key, initialValue);
        }
        setIsLoaded(true);
      } catch (err) {
        console.error(`Ошибка загрузки ${key}:`, err);
        setError(`Ошибка загрузки данных: ${key}`);
      }
    };
    load();
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Сохранение при изменении data (с Debounce)
  useEffect(() => {
    // Не сохраняем, пока данные не загрузились из базы
    if (!isLoaded) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveToDB(key, data);
        setError(null);
      } catch (err) {
        console.error(`Ошибка сохранения ${key}:`, err);
        setError(`Не удалось сохранить: ${key}`);
      }
    }, APP_CONFIG.SAVE_DEBOUNCE_DELAY) as unknown as number;

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [data, key, isLoaded]);

  return { data, setData, error, isLoaded };
}