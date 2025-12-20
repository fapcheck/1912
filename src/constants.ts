// src/constants.ts
import type { Project } from './types';

export const APP_CONFIG = {
  DB_NAME: 'ClipboardManagerDB',
  STORE_NAME: 'app_store',
  MAX_HISTORY_ITEMS: 50,
  CLIPBOARD_POLL_INTERVAL: 1000,
  SAVE_DEBOUNCE_DELAY: 500,
  KEYBOARD_SHORTCUTS: {
    SEARCH: 'k',
    FOCUS_MODE: 'f',
  }
};

export const DEFAULT_PROJECT: Project = {
  id: 'p1',
  name: 'Личное',
  folders: [
    {
      id: 'f1',
      name: 'Входящие',
      notes: []
    }
  ]
};