// src/components/CommandMenu.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Clipboard, Briefcase, CornerDownLeft, X, Image as ImageIcon, Folder, Plus, Trash2, Download } from 'lucide-react';
import { useStore } from '../store';
import clipboard from 'tauri-plugin-clipboard-api';
import { readFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { toast } from 'sonner';
import { cn, arrayBufferToBase64 } from '../lib/utils';
import { APP_CONFIG } from '../constants';
import type { Project, HistoryItem, Folder as FolderType } from '../types';

interface CommandMenuProps {
  onNavigateProject: (projectId: string) => void;
  onNavigateFolder: (projectId: string, folderId: string) => void;
  onClose?: () => void;
}

// Search result item types
type ProjectSearchItem = { type: 'project'; data: Project; id: string };
type FolderSearchItem = { type: 'folder'; data: FolderType; projectId: string; projectName: string; id: string };
type HistorySearchItem = { type: 'history'; data: HistoryItem; id: string };
type ActionSearchItem = { type: 'action'; id: string; label: string; description: string; icon: 'plus' | 'trash' | 'download'; action: () => void };
type SearchItem = ProjectSearchItem | FolderSearchItem | HistorySearchItem | ActionSearchItem;

export function CommandMenu({ onNavigateProject, onNavigateFolder, onClose }: CommandMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { history, projects } = useStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifierPressed = e.metaKey || e.ctrlKey;
      const isKeyK = e.key.toLowerCase() === APP_CONFIG.KEYBOARD_SHORTCUTS.SEARCH || e.code === 'KeyK';

      if (isModifierPressed && isKeyK) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setQuery('');
        setSelectedIndex(0);
      }

      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Quick actions available without search
  const quickActions: ActionSearchItem[] = useMemo(() => [
    {
      type: 'action',
      id: 'action-new-project',
      label: 'Новый проект',
      description: 'Создать новый проект',
      icon: 'plus',
      action: () => {
        setIsOpen(false);
        // Trigger new project modal through a custom event
        window.dispatchEvent(new CustomEvent('clipka:new-project'));
      }
    },
    {
      type: 'action',
      id: 'action-clear-history',
      label: 'Очистить историю',
      description: 'Удалить все записи из истории',
      icon: 'trash',
      action: () => {
        if (confirm('Удалить всю историю?')) {
          useStore.getState().clearHistory();
          toast.success('История очищена');
        }
        setIsOpen(false);
      }
    },
    {
      type: 'action',
      id: 'action-export',
      label: 'Экспорт данных',
      description: 'Скачать резервную копию',
      icon: 'download',
      action: () => {
        const state = useStore.getState();
        const exportData = {
          version: 1,
          exportDate: new Date().toISOString(),
          projects: state.projects,
          history: state.history,
          globalTags: state.globalTags
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clipka-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Данные экспортированы');
        setIsOpen(false);
      }
    }
  ], []);

  const filteredItems = useMemo((): SearchItem[] => {
    // No query = show quick actions
    if (!query) {
      return quickActions;
    }

    const lowerQuery = query.toLowerCase();

    // Projects
    const projectItems: ProjectSearchItem[] = projects
      .filter((p) => p.name.toLowerCase().includes(lowerQuery))
      .map((p) => ({ type: 'project' as const, data: p, id: p.id }));

    // Folders (search across all projects)
    const folderItems: FolderSearchItem[] = projects.flatMap((project) =>
      project.folders
        .filter((folder) => folder.name.toLowerCase().includes(lowerQuery))
        .map((folder) => ({
          type: 'folder' as const,
          data: folder,
          projectId: project.id,
          projectName: project.name,
          id: folder.id
        }))
    );

    // History
    const historyItems: HistorySearchItem[] = history
      .filter((item) => item.text.toLowerCase().includes(lowerQuery))
      .map((item) => ({ type: 'history' as const, data: item, id: item.id }));

    // Filter actions by query
    const actionItems: ActionSearchItem[] = quickActions.filter(
      (action) => action.label.toLowerCase().includes(lowerQuery) || action.description.toLowerCase().includes(lowerQuery)
    );

    return [...actionItems, ...projectItems, ...folderItems, ...historyItems].slice(0, 12);
  }, [query, history, projects, quickActions]);

  useEffect(() => {
    const handleNav = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % Math.max(filteredItems.length, 1));
      }
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filteredItems.length) % Math.max(filteredItems.length, 1));
      }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) handleSelect(filteredItems[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleNav);
    return () => window.removeEventListener('keydown', handleNav);
  }, [isOpen, filteredItems, selectedIndex]);

  const handleSelect = async (item: SearchItem) => {
    if (!item) return;

    if (item.type === 'action') {
      item.action();
      return;
    }

    if (item.type === 'folder') {
      onNavigateFolder(item.projectId, item.id);
      setIsOpen(false);
      onClose?.();
      return;
    }

    if (item.type === 'history') {
      try {
        const historyItem = item.data;

        if (historyItem.contentType === 'image' && historyItem.imageData) {
          toast.info("Загрузка изображения...");

          if (historyItem.imageData.startsWith('data:')) {
            const base64 = historyItem.imageData.replace(/^data:image\/[a-z]+;base64,/, "");
            await clipboard.writeImageBase64(base64);
          } else {
            const imageBytes = await readFile(`images/${historyItem.imageData}`, {
              baseDir: BaseDirectory.AppLocalData,
            });
            const base64String = arrayBufferToBase64(imageBytes);
            await clipboard.writeImageBase64(base64String);
          }
          toast.success('Изображение скопировано');
        } else {
          await clipboard.writeText(historyItem.text);
          toast.success('Скопировано в буфер');
        }
      } catch (e) {
        console.error(e);
        toast.error('Ошибка копирования');
      }
    } else if (item.type === 'project') {
      onNavigateProject(item.data.id);
    }

    setIsOpen(false);
    onClose?.();
  };

  const getItemIcon = (item: SearchItem) => {
    if (item.type === 'action') {
      switch (item.icon) {
        case 'plus': return <Plus size={16} />;
        case 'trash': return <Trash2 size={16} />;
        case 'download': return <Download size={16} />;
      }
    }
    if (item.type === 'folder') return <Folder size={16} />;
    if (item.type === 'project') return <Briefcase size={16} />;
    if (item.type === 'history') {
      return item.data.contentType === 'image' ? <ImageIcon size={16} /> : <Clipboard size={16} />;
    }
  };

  const getItemLabel = (item: SearchItem) => {
    if (item.type === 'action') return item.label;
    if (item.type === 'folder') return item.data.name;
    if (item.type === 'project') return item.data.name;
    if (item.type === 'history') return item.data.text;
    return '';
  };

  const getItemDescription = (item: SearchItem) => {
    if (item.type === 'action') return item.description;
    if (item.type === 'folder') return `Папка в ${item.projectName} • ${item.data.notes.length} заметок`;
    if (item.type === 'project') return `Проект • ${item.data.folders.length} папок`;
    if (item.type === 'history') return `История • ${item.data.date} • ${item.data.contentType}`;
    return '';
  };

  const getActionLabel = (item: SearchItem) => {
    if (item.type === 'action') return 'Run';
    if (item.type === 'folder') return 'Open';
    if (item.type === 'project') return 'Open';
    if (item.type === 'history') return 'Copy';
    return '';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-full max-w-xl bg-[#232529] border border-[#2f3136] rounded-xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center px-4 py-4 border-b border-[#2f3136] gap-3">
              <Search className="text-text-secondary w-5 h-5" />
              <input
                ref={inputRef}
                autoFocus
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-text-secondary/50 text-lg h-6 font-medium"
                placeholder="Поиск проектов, папок, истории..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
              />
              <div className="flex items-center gap-2">
                <button onClick={() => setIsOpen(false)} className="text-text-secondary hover:text-white transition-colors">
                  <X size={18} />
                </button>
                <span className="text-[10px] font-bold text-text-secondary border border-[#2f3136] px-1.5 py-0.5 rounded bg-[#1a1c20]">ESC</span>
              </div>
            </div>

            <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-2 bg-[#1a1c20]/50">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-text-secondary/40 text-sm flex flex-col items-center gap-2">
                  <Search size={32} className="opacity-20" />
                  Ничего не найдено
                </div>
              ) : (
                filteredItems.map((item, index) => {
                  const isSelected = index === selectedIndex;

                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all duration-150 text-sm group relative",
                        isSelected ? "bg-[#3689e6] text-white shadow-md shadow-blue-500/10" : "text-text-secondary hover:bg-[#2f3136]"
                      )}
                    >
                      <div className={cn("flex items-center justify-center w-8 h-8 rounded-md shrink-0 transition-colors", isSelected ? "bg-white/20 text-white" : "bg-[#2a2d33] text-text-secondary")}>
                        {getItemIcon(item)}
                      </div>

                      <div className="flex-1 truncate flex flex-col justify-center">
                        <span className="font-medium truncate leading-tight">
                          {getItemLabel(item)}
                        </span>
                        <span className={cn("text-[10px] mt-0.5 transition-colors", isSelected ? "text-white/70" : "text-text-secondary/50")}>
                          {getItemDescription(item)}
                        </span>
                      </div>

                      {isSelected && (
                        <div className="absolute right-3 flex items-center gap-1 opacity-70">
                          <span className="text-[10px] font-medium uppercase tracking-wider mr-1">
                            {getActionLabel(item)}
                          </span>
                          <CornerDownLeft size={14} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}