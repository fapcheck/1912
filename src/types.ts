// src/types.ts

export type ContentType = 'url' | 'color' | 'code' | 'text' | 'image';

/**
 * Represents the payload coming from the Clipboard Monitor.
 * Used to normalize data before it hits the Store.
 */
export type ClipboardContent =
  | { type: 'text'; value: string }
  | { type: 'image'; value: string }; // value is the Filename (e.g. "img_uuid.png")

export interface NoteItem {
  id: string;
  text: string;
  date: string;
  contentType: ContentType;
  tags?: string[];
  /**
   * For images: Stores the filename located in `AppLocalData/images/`.
   * The actual image data is loaded asynchronously by the component.
   */
  imageData?: string;
  isFavorite?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  notes: NoteItem[];
}

export interface Project {
  id: string;
  name: string;
  folders: Folder[];
}

export interface HistoryItem {
  id: string;
  text: string;
  date: string;
  contentType: ContentType;
  /**
   * For images: Stores the filename located in `AppLocalData/images/`.
   * Legacy support: May contain "data:image..." base64 strings (rare).
   */
  imageData?: string;
  isFavorite?: boolean;
}