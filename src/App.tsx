// src/App.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  Search, PanelLeftClose, PanelLeftOpen, 
  AlignJustify, FolderOpen, ChevronDown, 
  GripVertical, Pencil, Trash2, Copy,
  Pin, PinOff
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
// 🛠️ Tauri Window API
import { getCurrentWindow } from '@tauri-apps/api/window';
import clipboard from 'tauri-plugin-clipboard-api';

import { DraggableCard, SimpleCard } from './components/Cards';
import { CustomModal } from './components/CustomModal';
import { AddNoteButton } from './components/ui-elements';
import { Sidebar } from './components/Sidebar';
import { APP_CONFIG } from './constants';
import { Folder } from './types';
import { useStore } from './store';
import { useClipboardMonitor } from './hooks/useClipboardMonitor';

export default function App() {
  // --- UI State ---
  const [activeView, setActiveView] = useState<'history' | 'project'>('history');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  
  // Persistent Expanded Folders State
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    try {
        const saved = localStorage.getItem('expandedFolders');
        return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
        return new Set();
    }
  });

  // --- Store & Hooks ---
  const { 
    history, projects, globalTags, 
    initData, deleteHistoryItem, addProject, addFolder, addNote, 
    editNote, deleteProject, deleteFolder, deleteNote, 
    renameProject, renameFolder, setHistory, setGlobalTags, setProjects 
  } = useStore();

  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize Data & Monitor Clipboard
  useEffect(() => { initData(); }, [initData]);
  useClipboardMonitor();

  // Persist expanded folders
  useEffect(() => { 
    localStorage.setItem('expandedFolders', JSON.stringify([...expandedFolders])); 
  }, [expandedFolders]);

  // Check initial Pin state on mount
  useEffect(() => {
    getCurrentWindow().isAlwaysOnTop().then(setIsPinned);
  }, []);

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

  // --- Derived Data (Memoized) ---
  const currentProject = useMemo(() => 
    projects.find(p => p.id === selectedProjectId), 
  [projects, selectedProjectId]);

  const filteredHistory = useMemo(() => {
    if (!search) return history;
    const lowerSearch = search.toLowerCase();
    return history.filter(h => h.text.toLowerCase().includes(lowerSearch));
  }, [history, search]);

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

  // Auto-expand folders on search
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

  // --- Handlers ---
  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) newSet.delete(folderId);
      else newSet.add(folderId);
      return newSet;
    });
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

  // --- Modal Logic ---
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean; 
    title: string; 
    placeholder: string; 
    initialValue: string; 
    initialTags?: string[];
    type: 'createProject' | 'createFolder' | 'createNote' | 'editNote' | 'renameProject' | 'renameFolder';
    targetId?: { projectId?: string, folderId?: string, noteId?: string };
  }>({ isOpen: false, title: '', placeholder: '', initialValue: '', type: 'createProject' });

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

  // Modal Openers
  const openCreateProject = () => setModalConfig({ isOpen: true, title: "Создать новый проект", placeholder: "Например: Работа", initialValue: "", type: "createProject" });
  const openCreateFolder = (projectId: string) => setModalConfig({ isOpen: true, title: "Создать папку", placeholder: "Например: Пароли", initialValue: "", type: "createFolder", targetId: { projectId } });
  const openCreateNote = (projectId: string, folderId: string) => setModalConfig({ isOpen: true, title: "Новая заметка", placeholder: "Текст заметки...", initialValue: "", initialTags: [], type: "createNote", targetId: { projectId, folderId } });
  const openEditNote = (projectId: string, folderId: string, noteId: string, text: string, tags: string[] = []) => setModalConfig({ isOpen: true, title: "Редактировать", placeholder: "", initialValue: text, initialTags: tags, type: "editNote", targetId: { projectId, folderId, noteId } });
  const openRenameProject = (projectId: string, currentName: string) => setModalConfig({ isOpen: true, title: "Переименовать проект", placeholder: "Новое название проекта", initialValue: currentName, type: "renameProject", targetId: { projectId } });
  const openRenameFolder = (projectId: string, folderId: string, currentName: string) => setModalConfig({ isOpen: true, title: "Переименовать папку", placeholder: "Новое название папки", initialValue: currentName, type: "renameFolder", targetId: { projectId, folderId } });

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

  // Import/Export
  const exportData = () => { 
    const blob = new Blob([JSON.stringify({ history, projects, globalTags, version: 2, date: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); 
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `backup-${new Date().toISOString().slice(0,10)}.json`; 
    a.click(); 
    URL.revokeObjectURL(url); 
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

  const foldersToDisplay = activeView === 'project' && currentProject ? filteredFolders : [];

  return (
    <div className="flex h-screen bg-bg text-text-primary overflow-hidden font-sans">
      <Sidebar 
        focusMode={focusMode} activeView={activeView} setActiveView={setActiveView}
        selectedProjectId={selectedProjectId} setSelectedProjectId={setSelectedProjectId}
        onOpenCreateProject={openCreateProject} onRenameProject={openRenameProject} onDeleteProject={handleDeleteProject}
        onExport={exportData} onImport={importData}
      />
      
      <div className="flex-1 flex flex-col min-w-0 bg-bg relative overflow-x-hidden select-none">
        {/* Header / Search Bar */}
        <div className="h-16 flex items-center px-6 gap-4 sticky top-0 bg-bg/95 backdrop-blur-xl z-30 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => setFocusMode(!focusMode)} className="text-text-secondary hover:text-white transition-colors p-2 hover:bg-[#2f3136] rounded-lg" title="Toggle Sidebar">
              {focusMode ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
            
            {/* 🆕 Always On Top Toggle */}
            <button 
                onClick={togglePin} 
                className={`transition-colors p-2 rounded-lg ${isPinned ? "text-accent-blue bg-accent-blue/10 hover:bg-accent-blue/20" : "text-text-secondary hover:text-white hover:bg-[#2f3136]"}`}
                title={isPinned ? "Открепить" : "Закрепить поверх окон"}
            >
              {isPinned ? <Pin size={20} fill="currentColor" /> : <PinOff size={20} />}
            </button>
          </div>
          
          <div className="flex-1 flex items-center gap-3 bg-bg-card/50 px-3 py-2 rounded-xl border border-transparent focus-within:border-accent-blue/50 focus-within:bg-bg-card transition-all">
            <Search size={16} className="text-text-secondary"/>
            <input 
              ref={searchInputRef} 
              type="text" 
              placeholder="Поиск... (⌘K)" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="bg-transparent border-none outline-none text-sm w-full text-text-primary placeholder:text-text-secondary/50 h-full" 
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {activeView === 'history' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Недавнее</h2>
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <span>{history.length} / {APP_CONFIG.MAX_HISTORY_ITEMS}</span>
                    {history.length >= APP_CONFIG.MAX_HISTORY_ITEMS && <span className="text-yellow-400">⚠️ Лимит</span>}
                </div>
              </div>
              
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                <AnimatePresence mode='popLayout'>
                    {filteredHistory.map(item => (
                        <SimpleCard key={item.id} item={item} onDelete={deleteHistoryItem} />
                    ))}
                </AnimatePresence>
              </div>
              
              {history.length === 0 && (
                <div className="text-center text-text-secondary py-20 opacity-40">Пусто. Скопируй что-нибудь!</div>
              )}
            </motion.div>
          )}

          {activeView === 'project' && currentProject && (
             <motion.div key={currentProject.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-5xl mx-auto pb-20">
                {/* Project Header */}
                <div className="flex flex-wrap items-end justify-between mb-8 gap-4 border-b border-border-subtle/30 pb-4">
                    <div className="flex-1 min-w-[200px]">
                        <h2 className="text-3xl font-bold text-white mb-1 truncate leading-tight" title={currentProject.name}>{currentProject.name}</h2>
                        <p className="text-text-secondary text-sm">{foldersToDisplay.length} папок</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                     <button 
                        onClick={() => { 
                            const allIds = currentProject.folders.map(f => f.id); 
                            const allExpanded = allIds.every(id => expandedFolders.has(id)); 
                            setExpandedFolders(allExpanded ? new Set() : new Set(allIds)); 
                        }} 
                        className="flex items-center gap-2 px-3 py-2 bg-transparent hover:bg-[#2a2d33] text-text-secondary hover:text-white rounded-lg transition-colors text-sm font-medium border border-border-subtle"
                     >
                        <AlignJustify size={14} /> 
                        {currentProject.folders.every(f => expandedFolders.has(f.id)) ? 'Свернуть' : 'Развернуть'}
                     </button>
                     <button 
                        onClick={() => openCreateFolder(currentProject.id)} 
                        className="flex items-center gap-2 px-4 py-2 bg-[#2a2d33] hover:bg-[#32353b] text-white rounded-lg transition-colors text-sm font-medium border border-border-subtle"
                     >
                        <FolderOpen size={16} /> Новая папка
                     </button>
                   </div>
                </div>

                {/* Folders List (Reorder Group) */}
                <Reorder.Group 
                    axis="y" 
                    values={foldersToDisplay} 
                    onReorder={(newFolders) => { 
                        if (search) return; // Disable reordering while searching
                        const updatedProject = { ...currentProject, folders: newFolders };
                        const newProjects = projects.map(p => p.id === currentProject.id ? updatedProject : p);
                        setProjects(newProjects);
                    }} 
                    className="space-y-6"
                >
                  {foldersToDisplay.map(folder => {
                    const isExpanded = expandedFolders.has(folder.id);
                    return (
                      <Reorder.Item key={folder.id} value={folder} className="relative bg-transparent group/folder" dragListener={!search}>
                        {/* Folder Header */}
                        <div onClick={() => toggleFolder(folder.id)} className="flex items-center gap-2 mb-3 mt-6 text-text-secondary/70 px-1 cursor-pointer hover:text-accent-blue transition-colors relative group select-none">
                          <motion.div animate={{ rotate: isExpanded ? 0 : -90 }} className="shrink-0"><ChevronDown size={14} /></motion.div>
                          
                          {!search && (
                             <GripVertical size={16} className="opacity-0 group-hover/folder:opacity-100 transition-opacity text-[#4b4e57] cursor-grab active:cursor-grabbing" onPointerDown={(e) => e.preventDefault()} />
                          )}
                          
                          <FolderOpen size={14} />
                          <span className="text-xs font-bold uppercase tracking-widest flex-1">{folder.name}</span>
                          <span className="text-[10px] text-text-secondary/50 font-medium">{folder.notes.length}</span>
                          
                          <div className="flex gap-1 absolute right-0 opacity-0 group-hover/folder:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                              <button onClick={(e) => handleCopyFolderContent(e, folder)} className="p-1 rounded text-text-secondary hover:text-green-400 transition-colors" title="Копировать список"><Copy size={12} /></button>
                              <button onClick={() => openRenameFolder(currentProject.id, folder.id, folder.name)} className="p-1 rounded text-text-secondary hover:text-accent-blue transition-colors"><Pencil size={12} /></button>
                              <button onClick={() => handleDeleteFolder(currentProject.id, folder.id, folder.name)} className="p-1 rounded text-text-secondary hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                          </div>
                        </div>

                        {/* Notes Grid (Collapsible) */}
                        <AnimatePresence initial={false}>
                           {isExpanded && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }} 
                                animate={{ height: 'auto', opacity: 1 }} 
                                exit={{ height: 0, opacity: 0 }} 
                                className="overflow-hidden will-change-[height]" 
                                style={{ transformOrigin: 'top' }}
                            >
                               <div className="py-3 px-1">
                                   <Reorder.Group 
                                        axis="y" 
                                        values={folder.notes} 
                                        onReorder={(newNotes) => { 
                                            if (search) return;
                                            const updatedFolder = { ...folder, notes: newNotes }; 
                                            const updatedProject = { ...currentProject, folders: currentProject.folders.map(f => f.id === folder.id ? updatedFolder : f) };
                                            const newProjects = projects.map(p => p.id === currentProject.id ? updatedProject : p); 
                                            setProjects(newProjects);
                                        }} 
                                        className="grid grid-cols-2 md:grid-cols-3 gap-3"
                                   >
                                        {folder.notes.map(note => (
                                            <DraggableCard 
                                                key={note.id} 
                                                item={note} 
                                                onDelete={(id) => deleteNote(currentProject.id, folder.id, id)} 
                                                onEdit={(id) => { 
                                                    const n = folder.notes.find(n => n.id === id); 
                                                    if (n) openEditNote(currentProject.id, folder.id, id, n.text, n.tags); 
                                                }} 
                                            />
                                        ))}
                                        <div className="h-full min-h-[120px]">
                                            <AddNoteButton onClick={() => openCreateNote(currentProject.id, folder.id)} />
                                        </div>
                                    </Reorder.Group>
                                    
                                    {folder.notes.length === 0 && (
                                        <div className="text-center py-4 text-text-secondary/40 text-xs border border-dashed border-border-subtle rounded-lg mt-3">Папка пуста</div>
                                    )}
                                </div>
                            </motion.div>
                          )}
                      </AnimatePresence>
                    </Reorder.Item>
                    );
                  })}
                </Reorder.Group>
                
                {foldersToDisplay.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-[#2f3136] rounded-xl text-text-secondary/50">
                        {search ? 'Нет совпадений' : 'В этом проекте пока нет папок'}
                    </div>
                )}
             </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {modalConfig.isOpen && (
            <CustomModal 
                isOpen={modalConfig.isOpen} 
                title={modalConfig.title} 
                placeholder={modalConfig.placeholder} 
                initialValue={modalConfig.initialValue} 
                initialTags={modalConfig.initialTags} 
                globalTags={globalTags} 
                enableTags={modalConfig.type === 'createNote' || modalConfig.type === 'editNote'} 
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))} 
                onConfirm={handleModalConfirm} 
            />
        )}
      </AnimatePresence>
      <Toaster position="bottom-center" theme="dark" />
    </div>
  );
}