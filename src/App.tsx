// src/App.tsx
import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Star, Copy, Trash2, Pencil } from 'lucide-react';
import { Toaster, toast } from 'sonner';

import { CustomModal } from './components/CustomModal';
import { ContextMenu } from './components/ContextMenu';
import { NavigationHeader } from './components/NavigationHeader';
import { HistoryView } from './components/HistoryView';
import { ProjectView } from './components/ProjectView';
import { ProjectsOverview } from './components/ProjectsOverview';
import { CommandMenu } from './components/CommandMenu';

import { useStore } from './store';
import { useClipboardMonitor } from './hooks/useClipboardMonitor';
import { useAppLogic } from './hooks/useAppLogic';

export default function App() {
  // --- Core Logic Hook ---
  const {
    // State
    activeView, setActiveView,
    selectedProjectId, setSelectedProjectId,
    search, setSearch,
    isPinned, togglePin,
    expandedFolders, setExpandedFolders, toggleFolder,
    modalConfig, setModalConfig,

    // Selection
    selectedItems, toggleSelectItem, clearSelection, deleteSelectedItems,

    // Data
    history, projects, globalTags,
    currentProject, filteredHistory, filteredFolders,
    smartCollections,

    // Refs
    searchInputRef,

    // Handlers
    handleModalConfirm,
    handleCopyFolderContent,
    handleDeleteFolder,
    handleDropItem,

    // Store Actions
    deleteNote,

    // UI
    contextMenu, setContextMenu, handleContextMenu
  } = useAppLogic();

  // --- Initialization ---
  const { initData, deleteHistoryItem, restoreHistoryItem, toggleFavorite, history: fullHistory } = useStore();

  // Initialize Data & Monitor Clipboard
  useEffect(() => { initData(); }, [initData]);
  useClipboardMonitor();

  // Undo delete handler
  const handleDeleteWithUndo = useCallback((id: string) => {
    const itemToDelete = fullHistory.find(item => item.id === id);
    if (!itemToDelete) return;

    deleteHistoryItem(id);

    toast('Запись удалена', {
      action: {
        label: 'Отменить',
        onClick: () => {
          restoreHistoryItem(itemToDelete);
          toast.success('Восстановлено');
        }
      },
      duration: 5000
    });
  }, [fullHistory, deleteHistoryItem, restoreHistoryItem]);

  // Modal Openers (Convenience Wrappers)
  const openEditNote = (projectId: string, folderId: string, noteId: string, text: string, tags: string[] = []) => setModalConfig({ isOpen: true, title: "Редактировать", placeholder: "", initialValue: text, initialTags: tags, type: "editNote", targetId: { projectId, folderId, noteId } });

  const [scrollToFolderId, setScrollToFolderId] = useState<string | null>(null);

  // Clear scroll target after it's processed (handled in ProjectView ideally, or a timeout here?)
  // Better: Pass it to ProjectView, let it scroll, then call onScrolled() callback?
  // Or just pass the ID and rely on a useEffect in ProjectView that fires when ID changes.

  return (
    <div className="flex flex-col h-screen bg-bg text-text-primary overflow-hidden font-sans selection:bg-accent-blue/30">
      {/* New Navigation Header */}
      <NavigationHeader
        activeView={activeView}
        setActiveView={setActiveView}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
        search={search}
        setSearch={setSearch}
        searchInputRef={searchInputRef}
        isPinned={isPinned}
        togglePin={togglePin}
        projects={projects}
        onCreateProject={() => setModalConfig({ ...modalConfig, isOpen: true, type: 'createProject', title: 'Новый проект', placeholder: 'Название проекта', initialValue: '' })}
        onSelectFolder={(_projectId: string, folderId: string) => {
          setExpandedFolders(prev => new Set(prev).add(folderId));
          setScrollToFolderId(folderId);
        }}
      />

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
        {/* History View - handles all history + smart collections via internal filter pills */}
        {(activeView === 'history' || activeView === 'favorites' || activeView === 'images' || activeView === 'links' || activeView === 'code') && (
          <HistoryView
            history={history}
            filteredHistory={filteredHistory}
            onDelete={handleDeleteWithUndo}
            onContextMenu={(e: React.MouseEvent, id: string) => handleContextMenu(e, id, 'history')}
            onToggleFavorite={(id: string) => toggleFavorite(id)}
            searchTerm={search}
            selectedItems={selectedItems}
            onToggleSelect={toggleSelectItem}
            onClearSelection={clearSelection}
            onDeleteSelected={deleteSelectedItems}
            smartCollections={smartCollections}
          />
        )}

        {/* Projects Overview - main projects screen */}
        {activeView === 'project' && !currentProject && (
          <ProjectsOverview
            projects={projects}
            onSelectProject={(projectId) => {
              setSelectedProjectId(projectId);
            }}
            onSelectFolder={(projectId, folderId) => {
              setSelectedProjectId(projectId);
              setExpandedFolders(prev => new Set(prev).add(folderId));
              setScrollToFolderId(folderId);
            }}
            onCreateProject={() => setModalConfig({ ...modalConfig, isOpen: true, type: 'createProject', title: 'Новый проект', placeholder: 'Название проекта', initialValue: '' })}
            onCreateFolder={(projectId) => setModalConfig({ ...modalConfig, isOpen: true, type: 'createFolder', title: 'Новая папка', placeholder: 'Название папки', initialValue: '', targetId: { projectId } })}
            onRenameProject={(projectId, currentName) => setModalConfig({ ...modalConfig, isOpen: true, type: 'renameProject', title: 'Переименовать проект', placeholder: 'Новое название', initialValue: currentName, targetId: { projectId } })}
            onDeleteProject={(projectId, projectName) => {
              if (confirm(`Удалить проект "${projectName}"?`)) {
                useStore.getState().deleteProject(projectId);
              }
            }}
            onRenameFolder={(projectId, folderId, currentName) => setModalConfig({ ...modalConfig, isOpen: true, type: 'renameFolder', title: 'Переименовать папку', placeholder: 'Новое название', initialValue: currentName, targetId: { projectId, folderId } })}
            onDeleteFolder={(projectId, folderId, folderName) => handleDeleteFolder(projectId, folderId, folderName)}
            onDropItem={handleDropItem}
          />
        )}

        {/* Project View - specific project selected */}
        {activeView === 'project' && currentProject && (
          <ProjectView
            project={currentProject}
            foldersToDisplay={filteredFolders}
            expandedFolders={expandedFolders}
            search={search}
            onToggleExpandAll={(expand) => {
              if (expand) {
                const allIds = new Set(currentProject.folders.map(f => f.id));
                setExpandedFolders(allIds);
              } else {
                setExpandedFolders(new Set());
              }
            }}
            onOpenCreateFolder={() => setModalConfig({ ...modalConfig, isOpen: true, type: 'createFolder', title: 'Новая папка', placeholder: 'Название папки', initialValue: '', targetId: { projectId: currentProject.id } })}
            onReorderFolders={(newFolders) => {
              const newProject = { ...currentProject, folders: newFolders };
              const newProjects = projects.map(p => p.id === currentProject.id ? newProject : p);
              useStore.getState().setProjects(newProjects);
            }}
            onToggleFolder={toggleFolder}
            onCopyFolder={handleCopyFolderContent}
            onRenameFolder={(id, name) => setModalConfig({ ...modalConfig, isOpen: true, type: 'renameFolder', title: 'Переименовать папку', placeholder: 'Новое название', initialValue: name, targetId: { projectId: currentProject.id, folderId: id } })}
            onDeleteFolder={(id, name) => handleDeleteFolder(currentProject.id, id, name)}
            onReorderNotes={(folderId, newNotes) => {
              // Update notes order in store
              const pIndex = projects.findIndex(p => p.id === currentProject.id);
              if (pIndex === -1) return;
              // Deep clone to avoid mutation issues if strict
              // Assuming useStore setup allows direct replacement via map
              useStore.getState().setProjects(projects.map(p => {
                if (p.id !== currentProject.id) return p;
                return {
                  ...p,
                  folders: p.folders.map(f => f.id === folderId ? { ...f, notes: newNotes } : f)
                };
              }));
            }}
            onDeleteNote={(folderId, noteId) => useStore.getState().deleteNote(currentProject.id, folderId, noteId)}
            onEditNote={(folderId, noteId) => {
              const note = currentProject.folders.find(f => f.id === folderId)?.notes.find(n => n.id === noteId);
              if (note) openEditNote(currentProject.id, folderId, noteId, note.text, note.tags);
            }}
            onCreateNote={(folderId) => setModalConfig({ ...modalConfig, isOpen: true, type: 'createNote', title: 'Новая заметка', placeholder: 'Текст заметки...', initialValue: '', targetId: { projectId: currentProject.id, folderId } })}
            onNoteContextMenu={(e, folderId, noteId) => handleContextMenu(e, noteId, 'note', { projectId: currentProject.id, folderId })}
            scrollToFolderId={scrollToFolderId}
            onScrollComplete={() => setScrollToFolderId(null)}
          />
        )}
      </main>

      <AnimatePresence>
        {contextMenu.isOpen && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
            items={[
              {
                label: 'Копировать',
                icon: Copy,
                onClick: () => {
                  // Logic to copy content
                  // Ideally reuse handleCopy from Cards? But that's internal.
                  // We can write to clipboard here using API directly.
                  // Need item text.
                  let text = "";
                  if (contextMenu.itemType === 'history') {
                    const item = history.find(h => h.id === contextMenu.itemId);
                    text = item?.text || "";
                  } else if (contextMenu.itemType === 'note' && currentProject && contextMenu.targetId?.folderId) {
                    const folder = currentProject.folders.find(f => f.id === contextMenu.targetId?.folderId);
                    const note = folder?.notes.find(n => n.id === contextMenu.itemId);
                    text = note?.text || "";
                  }
                  if (text) navigator.clipboard.writeText(text);
                }
              },
              ...(contextMenu.itemType === 'history' ? [
                {
                  label: history.find(h => h.id === contextMenu.itemId)?.isFavorite ? 'Убрать из избранного' : 'В избранное',
                  icon: Star,
                  onClick: () => contextMenu.itemId && useStore.getState().toggleFavorite(contextMenu.itemId)
                }
              ] : []),
              ...(contextMenu.itemType === 'note' ? [
                {
                  label: 'Редактировать',
                  icon: Pencil,
                  onClick: () => {
                    if (currentProject && contextMenu.targetId?.folderId && contextMenu.itemId) {
                      const folder = currentProject.folders.find(f => f.id === contextMenu.targetId?.folderId);
                      if (folder) {
                        const note = folder.notes.find(n => n.id === contextMenu.itemId);
                        if (note) openEditNote(currentProject.id, folder.id, note.id, note.text, note.tags);
                      }
                    }
                  }
                }
              ] : []),
              { type: 'separator' },
              {
                label: 'Удалить',
                icon: Trash2,
                variant: 'danger',
                onClick: () => {
                  if (contextMenu.itemType === 'history') {
                    contextMenu.itemId && useStore.getState().deleteHistoryItem(contextMenu.itemId);
                  } else if (contextMenu.itemType === 'note' && contextMenu.targetId?.projectId && contextMenu.targetId?.folderId && contextMenu.itemId) {
                    deleteNote(contextMenu.targetId.projectId, contextMenu.targetId.folderId, contextMenu.itemId);
                  }
                }
              }
            ]}
          />
        )}
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

      {/* Command Palette (⌘K) */}
      <CommandMenu
        onNavigateProject={(projectId) => {
          setActiveView('project');
          setSelectedProjectId(projectId);
        }}
        onNavigateFolder={(projectId, folderId) => {
          setActiveView('project');
          setSelectedProjectId(projectId);
          setExpandedFolders(prev => new Set(prev).add(folderId));
          setScrollToFolderId(folderId);
        }}
      />

      <Toaster position="bottom-center" theme="dark" />
    </div >
  );
}