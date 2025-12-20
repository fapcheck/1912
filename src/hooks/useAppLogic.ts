import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { toast } from 'sonner';
import clipboard from 'tauri-plugin-clipboard-api';
import { useStore } from '../store';
import { Folder } from '../types';
import { APP_CONFIG } from '../constants';

export type ModalConfig = {
    isOpen: boolean;
    title: string;
    placeholder: string;
    initialValue: string;
    initialTags?: string[];
    type: 'createProject' | 'createFolder' | 'createNote' | 'editNote' | 'renameProject' | 'renameFolder';
    targetId?: { projectId?: string, folderId?: string, noteId?: string };
};

export function useAppLogic() {
    // --- Store ---
    const {
        history, projects, globalTags,
        addProject, addFolder, addNote,
        editNote, deleteProject, deleteFolder, deleteNote,
        renameProject, renameFolder, setHistory, setGlobalTags, setProjects,
        deleteHistoryItem
    } = useStore();

    // --- UI State ---
    const [activeView, setActiveView] = useState<'history' | 'project' | 'favorites' | 'images' | 'links' | 'code'>('project');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [focusMode, setFocusMode] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const searchInputRef = useRef<HTMLInputElement>(null);

    // --- Persistent Expanded Folders ---
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem('expandedFolders');
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch (e) {
            return new Set();
        }
    });

    useEffect(() => {
        localStorage.setItem('expandedFolders', JSON.stringify([...expandedFolders]));
    }, [expandedFolders]);

    // --- Window State ---
    useEffect(() => {
        getCurrentWindow().isAlwaysOnTop().then(setIsPinned);
    }, []);

    const togglePin = async () => {
        try {
            const newValue = !isPinned;
            await getCurrentWindow().setAlwaysOnTop(newValue);
            setIsPinned(newValue);
            toast.success(newValue ? "Закреплено поверх окон" : "Откреплено");
        } catch (err) {
            console.error(err);
            toast.error("Не удалось изменить режим окна");
        }
    };

    // --- Keyboard Shortcuts ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            const isMod = e.metaKey || e.ctrlKey;

            if (isMod && e.key === APP_CONFIG.KEYBOARD_SHORTCUTS.SEARCH) {
                e.preventDefault();
                searchInputRef.current?.focus();
            }

            if (isMod && e.key === APP_CONFIG.KEYBOARD_SHORTCUTS.FOCUS_MODE) {
                e.preventDefault();
                setFocusMode(prev => !prev);
            }

            if (e.key === 'Escape') {
                searchInputRef.current?.blur();
                setSearch('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // --- Search & Filtering Logic ---
    const currentProject = useMemo(() =>
        projects.find(p => p.id === selectedProjectId),
        [projects, selectedProjectId]);

    const smartCollections = useMemo(() => {
        return {
            favorites: history.filter(h => h.isFavorite),
            images: history.filter(h => h.contentType === 'image'),
            links: history.filter(h => h.contentType === 'url'),
            code: history.filter(h => h.contentType === 'code'),
        };
    }, [history]);

    const filteredHistory = useMemo(() => {
        // If searching, we search GLOBAL history? Or just "Recent"?
        // Original logic: "if (!search) return history".
        // Let's keep it simple.
        if (!search) return history;
        const lowerSearch = search.toLowerCase();
        return history.filter(h => h.text.toLowerCase().includes(lowerSearch));
    }, [history, search]);

    const filteredSmartCollection = useMemo(() => {
        const lowerSearch = search.toLowerCase();
        // Return a function or object that gives filtered results based on activeView?
        // No, better to let the View component handle filtering or do it here if we pass "activeCollection" type.
        // Actually, let's just return the raw smartCollections and let the UI filter if needed, 
        // OR return pre-filtered.
        // If I type "foo", 'images' collection should show images matching "foo".

        if (!search) return smartCollections;

        return {
            favorites: smartCollections.favorites.filter(h => h.text.toLowerCase().includes(lowerSearch)),
            images: smartCollections.images.filter(h => h.text.toLowerCase().includes(lowerSearch)),
            links: smartCollections.links.filter(h => h.text.toLowerCase().includes(lowerSearch)),
            code: smartCollections.code.filter(h => h.text.toLowerCase().includes(lowerSearch)),
        };
    }, [smartCollections, search]);

    const filteredFolders = useMemo(() => {
        if (!currentProject) return [];
        if (!search) return currentProject.folders;

        const lowerSearch = search.toLowerCase();

        return currentProject.folders.map(folder => {
            const filteredNotes = folder.notes.filter(note => {
                const matchText = note.text.toLowerCase().includes(lowerSearch);
                const matchTag = (note.tags || []).some(tag => tag.toLowerCase().includes(lowerSearch));
                return matchText || matchTag;
            });

            if (filteredNotes.length > 0 || folder.name.toLowerCase().includes(lowerSearch)) {
                return { ...folder, notes: filteredNotes };
            }
            return null;
        }).filter((f): f is Folder => f !== null);
    }, [currentProject, search]);

    // Auto-expand on search
    useEffect(() => {
        if (!search || !currentProject) return;

        const lowerSearch = search.toLowerCase();
        const idsToExpand = new Set<string>();

        currentProject.folders.forEach(folder => {
            const hasMatchingNotes = folder.notes.some(note =>
                note.text.toLowerCase().includes(lowerSearch) ||
                (note.tags || []).some(t => t.toLowerCase().includes(lowerSearch))
            );
            if (hasMatchingNotes || folder.name.toLowerCase().includes(lowerSearch)) {
                idsToExpand.add(folder.id);
            }
        });

        if (idsToExpand.size > 0) {
            setExpandedFolders(prev => {
                const next = new Set(prev);
                let changed = false;
                idsToExpand.forEach(id => {
                    if (!next.has(id)) {
                        next.add(id);
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
        }
    }, [search, currentProject]);

    const toggleFolder = useCallback((folderId: string) => {
        setExpandedFolders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(folderId)) newSet.delete(folderId);
            else newSet.add(folderId);
            return newSet;
        });
    }, []);

    // --- Modal & Context Menu Logic ---
    const [modalConfig, setModalConfig] = useState<ModalConfig>({
        isOpen: false, title: '', placeholder: '', initialValue: '', type: 'createProject'
    });

    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        x: number;
        y: number;
        itemId?: string;
        itemType?: 'history' | 'note' | 'folder' | 'project';
        targetId?: { projectId?: string; folderId?: string };
    }>({ isOpen: false, x: 0, y: 0 });

    const handleContextMenu = useCallback((e: React.MouseEvent, itemId: string, itemType: 'history' | 'note' | 'folder' | 'project' = 'history', targetId?: { projectId?: string; folderId?: string }) => {
        e.preventDefault();
        setContextMenu({
            isOpen: true,
            x: e.clientX,
            y: e.clientY,
            itemId,
            itemType,
            targetId
        });
    }, []);

    const handleDropItem = useCallback((itemId: string, targetProjectId: string, targetFolderId?: string) => {
        // 1. Try to find in History
        let itemText = history.find(i => i.id === itemId)?.text;

        // 2. If not in History, search in Projects (it might be a Note being moved)
        if (!itemText) {
            for (const p of projects) {
                for (const f of p.folders) {
                    const note = f.notes.find(n => n.id === itemId);
                    if (note) {
                        itemText = note.text;
                        break;
                    }
                }
                if (itemText) break;
            }
        }

        if (!itemText) return;

        const targetProject = projects.find(p => p.id === targetProjectId);
        if (!targetProject) return;

        let targetFolder;

        if (targetFolderId) {
            targetFolder = targetProject.folders.find(f => f.id === targetFolderId);
            if (!targetFolder) {
                toast.error('Папка не найдена');
                return;
            }
        } else {
            // Default to "General" or create it
            targetFolder = targetProject.folders.find(f => f.name === 'General');
            if (!targetFolder) {
                useStore.getState().addFolder(targetProjectId, 'General');
                const updatedProjects = useStore.getState().projects;
                const updatedProject = updatedProjects.find(p => p.id === targetProjectId);
                targetFolder = updatedProject?.folders.find(f => f.name === 'General');
            }
        }

        if (!targetFolder) return;

        useStore.getState().addNote(targetProjectId, targetFolder.id, itemText, []);

        toast.success('Заметка скопирована', {
            description: `Добавлено в ${targetProject.name} / ${targetFolder.name}`
        });

    }, [history, projects]);

    const handleModalConfirm = (value: string, tags: string[]) => {
        if (!value.trim()) return;
        const safeTags = tags || [];
        const { type, targetId } = modalConfig;

        switch (type) {
            case 'createProject':
                addProject(value);
                setActiveView('project');
                break;
            case 'createFolder':
                if (targetId?.projectId) {
                    const newId = addFolder(targetId.projectId, value);
                    setExpandedFolders(prev => new Set(prev).add(newId));
                }
                break;
            case 'createNote':
                if (targetId?.projectId && targetId?.folderId)
                    addNote(targetId.projectId, targetId.folderId, value, safeTags);
                break;
            case 'editNote':
                if (targetId?.projectId && targetId?.folderId && targetId?.noteId)
                    editNote(targetId.projectId, targetId.folderId, targetId.noteId, value, safeTags);
                break;
            case 'renameProject':
                if (targetId?.projectId) renameProject(targetId.projectId, value);
                break;
            case 'renameFolder':
                if (targetId?.projectId && targetId?.folderId)
                    renameFolder(targetId.projectId, targetId.folderId, value);
                break;
        }
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    };

    // --- Handlers ---
    const handleCopyFolderContent = async (e: React.MouseEvent, folder: Folder) => {
        e.stopPropagation();
        if (!folder.notes || folder.notes.length === 0) {
            toast.error("Папка пуста");
            return;
        }

        try {
            const allText = folder.notes.map(note => {
                if (note.contentType === 'image') return '[Картинка]';
                return note.text.trim().replace(/(\r\n|\n|\r)/gm, " ");
            }).join('\r\n');

            await clipboard.writeText(allText);
            toast.success(`Скопировано ${folder.notes.length} заметок!`);
        } catch (err) {
            console.error(err);
            toast.error("Ошибка копирования");
        }
    };

    const handleDeleteProject = (projectId: string, projectName: string) => {
        if (window.confirm(`Удалить проект "${projectName}"?`)) {
            deleteProject(projectId);
            if (selectedProjectId === projectId) { setActiveView('history'); setSelectedProjectId(null); }
        }
    };

    const handleDeleteFolder = (projectId: string, folderId: string, folderName: string) => {
        if (window.confirm(`Удалить папку "${folderName}"?`)) {
            deleteFolder(projectId, folderId);
            setExpandedFolders(prev => { const newSet = new Set(prev); newSet.delete(folderId); return newSet; });
        }
    };

    const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                if (!data || !Array.isArray(data.history) || !Array.isArray(data.projects)) throw new Error("Неверный формат");
                if (data.history) setHistory(data.history);
                if (data.projects) setProjects(data.projects);
                if (Array.isArray(data.globalTags)) setGlobalTags(data.globalTags);
                alert('✅ Данные восстановлены!');
            } catch (err) { alert('❌ Ошибка файла'); }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const exportData = () => {
        const blob = new Blob([JSON.stringify({ history, projects, globalTags, version: 2, date: new Date().toISOString() }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // --- Batch Selection ---
    const toggleSelectItem = useCallback((id: string) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedItems(new Set());
    }, []);

    const deleteSelectedItems = useCallback(() => {
        const count = selectedItems.size;
        if (count === 0) return;

        selectedItems.forEach(id => {
            deleteHistoryItem(id);
        });

        setSelectedItems(new Set());
        toast.success(`Удалено ${count} элементов`);
    }, [selectedItems, deleteHistoryItem]);

    return {
        // State
        activeView, setActiveView,
        selectedProjectId, setSelectedProjectId,
        search, setSearch,
        focusMode, setFocusMode,
        isPinned, togglePin,
        expandedFolders, setExpandedFolders, toggleFolder,
        modalConfig, setModalConfig,
        contextMenu, setContextMenu, handleContextMenu,

        // Selection
        selectedItems, toggleSelectItem, clearSelection, deleteSelectedItems,

        // Data
        history, projects, globalTags,
        currentProject, filteredHistory, filteredFolders,
        smartCollections: filteredSmartCollection,

        // Refs
        searchInputRef,

        // Handlers
        handleModalConfirm,
        handleCopyFolderContent,
        handleDeleteProject,
        handleDeleteFolder,
        handleDropItem,
        importData,
        exportData,

        // Store Actions (passthrough if needed directly)
        addProject, addFolder, addNote, editNote, deleteNote,
        setProjects, deleteHistoryItem,
        renameFolder, renameProject, deleteProject, deleteFolder
    };
}
