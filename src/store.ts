// src/store.ts
import { create } from 'zustand';
import { DEFAULT_PROJECT, APP_CONFIG } from './constants';
import { detectContentType } from './lib/utils';
import { saveToDB, loadFromDB } from './db';
import type { Project, HistoryItem } from './types';

// 🆕 Explicit type definition: Images now carry filenames, not Base64
export type ClipboardContent =
    | { type: 'text'; value: string }
    | { type: 'image'; value: string }; // value = filename (e.g., "img_123.png")

interface AppState {
    projects: Project[];
    history: HistoryItem[];
    globalTags: string[];
    isDbLoaded: boolean;

    initData: () => Promise<void>;

    // Setters (Internal/Low-level)
    setProjects: (projects: Project[]) => void;
    setHistory: (history: HistoryItem[]) => void;
    setGlobalTags: (tags: string[]) => void;

    // Actions
    addProject: (name: string) => void;
    deleteProject: (id: string) => void;
    renameProject: (id: string, newName: string) => void;

    addFolder: (projectId: string, name: string) => string;
    deleteFolder: (projectId: string, folderId: string) => void;
    renameFolder: (projectId: string, folderId: string, newName: string) => void;

    addNote: (projectId: string, folderId: string, text: string, tags?: string[]) => void;
    editNote: (projectId: string, folderId: string, noteId: string, text: string, tags?: string[]) => void;
    deleteNote: (projectId: string, folderId: string, noteId: string) => void;

    processClipboardContent: (content: ClipboardContent) => void;

    deleteHistoryItem: (id: string) => void;
    restoreHistoryItem: (item: HistoryItem) => void;
    clearHistory: () => void;

    addGlobalTag: (tag: string) => void;
    deleteGlobalTag: (tag: string) => void;

    toggleFavorite: (id: string) => void;
}

// 🛠️ Improved Debounce Logic
const createDebouncedSaver = () => {
    const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

    return (key: string, data: any) => {
        if (timeouts.has(key)) {
            clearTimeout(timeouts.get(key));
        }

        const timeout = setTimeout(() => {
            saveToDB(key, data, (err) => {
                if (err) console.error(`Failed to save ${key}:`, err);
            });
            timeouts.delete(key);
        }, APP_CONFIG.SAVE_DEBOUNCE_DELAY);

        timeouts.set(key, timeout);
    };
};
const debouncedSave = createDebouncedSaver();

export const useStore = create<AppState>((set, get) => ({
    projects: [DEFAULT_PROJECT],
    history: [],
    globalTags: [],
    isDbLoaded: false,

    initData: async () => {
        try {
            const [dbHistory, dbProjects, dbGlobalTags] = await Promise.all([
                loadFromDB('history'),
                loadFromDB('projects'),
                loadFromDB('globalTags')
            ]);

            set({
                history: dbHistory || [],
                projects: dbProjects || [DEFAULT_PROJECT],
                globalTags: dbGlobalTags || [],
                isDbLoaded: true
            });
        } catch (err) {
            console.error("Failed to initialize DB:", err);
        }
    },

    setProjects: (projects) => {
        set({ projects });
        debouncedSave('projects', projects);
    },

    setHistory: (history) => {
        set({ history });
        debouncedSave('history', history);
    },

    setGlobalTags: (globalTags) => {
        set({ globalTags });
        debouncedSave('globalTags', globalTags);
    },

    // --- Project Actions ---
    addProject: (name) => {
        const newProjects = [...get().projects, { id: Date.now().toString(), name, folders: [] }];
        get().setProjects(newProjects);
    },
    deleteProject: (id) => {
        get().setProjects(get().projects.filter((p) => p.id !== id));
    },
    renameProject: (id, newName) => {
        get().setProjects(get().projects.map((p) => p.id === id ? { ...p, name: newName } : p));
    },

    // --- Folder Actions ---
    addFolder: (projectId, name) => {
        const newFolderId = Date.now().toString();
        const store = get();
        const newProjects = store.projects.map((p) =>
            p.id !== projectId ? p : {
                ...p,
                folders: [...p.folders, { id: newFolderId, name, notes: [] }]
            }
        );
        store.setProjects(newProjects);
        return newFolderId;
    },
    deleteFolder: (projectId, folderId) => {
        const store = get();
        store.setProjects(store.projects.map((p) =>
            p.id !== projectId ? p : {
                ...p,
                folders: p.folders.filter((f) => f.id !== folderId)
            }
        ));
    },
    renameFolder: (projectId, folderId, newName) => {
        const store = get();
        store.setProjects(store.projects.map((p) =>
            p.id !== projectId ? p : {
                ...p,
                folders: p.folders.map((f) => f.id === folderId ? { ...f, name: newName } : f)
            }
        ));
    },

    // --- Note Actions ---
    addNote: (projectId, folderId, text, tags = []) => {
        const store = get();
        store.setProjects(store.projects.map((p) =>
            p.id !== projectId ? p : {
                ...p,
                folders: p.folders.map((f) =>
                    f.id !== folderId ? f : {
                        ...f,
                        notes: [...f.notes, {
                            id: Date.now().toString(),
                            text,
                            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            contentType: detectContentType(text),
                            tags
                        }]
                    }
                )
            }
        ));
    },
    editNote: (projectId, folderId, noteId, text, tags) => {
        const store = get();
        store.setProjects(store.projects.map((p) =>
            p.id !== projectId ? p : {
                ...p,
                folders: p.folders.map((f) =>
                    f.id !== folderId ? f : {
                        ...f,
                        notes: f.notes.map((n) =>
                            n.id === noteId ? {
                                ...n,
                                text,
                                contentType: detectContentType(text),
                                tags: tags !== undefined ? tags : n.tags
                            } : n
                        )
                    }
                )
            }
        ));
    },
    deleteNote: (projectId, folderId, noteId) => {
        const store = get();
        store.setProjects(store.projects.map((p) =>
            p.id !== projectId ? p : {
                ...p,
                folders: p.folders.map((f) =>
                    f.id !== folderId ? f : {
                        ...f,
                        notes: f.notes.filter((n) => n.id !== noteId)
                    }
                )
            }
        ));
    },

    // --- Clipboard Logic ---
    processClipboardContent: (content) => {
        const state = get();
        const history = state.history;

        // 1. Strict Duplicate Check
        if (history.length > 0) {
            const lastItem = history[0];

            // Text Comparison
            if (content.type === 'text' && lastItem.text === content.value) return;

            // Image Comparison (Filename based)
            if (content.type === 'image' &&
                lastItem.contentType === 'image' &&
                lastItem.imageData === content.value) {
                return;
            }
        }

        const newItem: HistoryItem = {
            id: Date.now().toString(),
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: content.type === 'text' ? content.value : 'Image',
            contentType: content.type === 'image' ? 'image' : detectContentType(content.value),
            imageData: content.type === 'image' ? content.value : undefined,
        };

        const newHistory = [newItem, ...state.history].slice(0, APP_CONFIG.MAX_HISTORY_ITEMS);
        get().setHistory(newHistory);
    },

    deleteHistoryItem: (id) => {
        get().setHistory(get().history.filter((i) => i.id !== id));
    },
    restoreHistoryItem: (item) => {
        // Restore at the beginning (most recent)
        const currentHistory = get().history;
        // Avoid duplicates
        if (currentHistory.some(h => h.id === item.id)) return;
        get().setHistory([item, ...currentHistory]);
    },
    clearHistory: () => {
        get().setHistory([]);
    },

    // --- Tag Actions ---
    addGlobalTag: (tag) => {
        if (!get().globalTags.includes(tag)) {
            get().setGlobalTags([...get().globalTags, tag]);
        }
    },
    deleteGlobalTag: (tag) => {
        get().setGlobalTags(get().globalTags.filter(t => t !== tag));
    },

    // --- Favorite Toggle ---
    toggleFavorite: (id) => {
        const newHistory = get().history.map((item) =>
            item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
        );
        get().setHistory(newHistory);
    },
}));