import React from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { AlignJustify, FolderOpen, ChevronDown, GripVertical, Copy, Pencil, Trash2 } from 'lucide-react';
import { DraggableCard } from './Cards';
import { AddNoteButton } from './ui-elements';
import { Project, Folder, NoteItem } from '../types';

interface ProjectViewProps {
    project: Project;
    foldersToDisplay: Folder[];
    expandedFolders: Set<string>;
    search: string;
    onToggleExpandAll: (expand: boolean) => void;
    onOpenCreateFolder: () => void;
    onReorderFolders: (newFolders: Folder[]) => void;
    onToggleFolder: (folderId: string) => void;
    onCopyFolder: (e: React.MouseEvent, folder: Folder) => void;
    onRenameFolder: (folderId: string, currentName: string) => void;
    onDeleteFolder: (folderId: string, folderName: string) => void;
    onReorderNotes: (folderId: string, newNotes: NoteItem[]) => void;
    onDeleteNote: (folderId: string, noteId: string) => void;
    onEditNote: (folderId: string, noteId: string) => void;
    onCreateNote: (folderId: string) => void;
    onNoteContextMenu: (e: React.MouseEvent, folderId: string, noteId: string) => void;
    scrollToFolderId?: string | null;
    onScrollComplete?: () => void;
}

export function ProjectView({
    project, foldersToDisplay, expandedFolders, search,
    onToggleExpandAll, onOpenCreateFolder,
    onReorderFolders, onToggleFolder,
    onCopyFolder, onRenameFolder, onDeleteFolder,
    onReorderNotes, onDeleteNote, onEditNote, onCreateNote,
    onNoteContextMenu,
    scrollToFolderId, onScrollComplete
}: ProjectViewProps) {

    const allExpanded = project.folders.every(f => expandedFolders.has(f.id));

    // Scroll to folder effect
    React.useEffect(() => {
        if (scrollToFolderId) {
            const element = document.getElementById(`folder-${scrollToFolderId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Highlight effect?
                element.animate([
                    { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
                    { backgroundColor: 'transparent' }
                ], { duration: 1000, easing: 'ease-out' });

                onScrollComplete?.();
            }
        }
    }, [scrollToFolderId, onScrollComplete]);

    return (
        <motion.div key={project.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-5xl mx-auto pb-20">
            {/* Project Header */}
            <div className="flex flex-wrap items-end justify-between mb-8 gap-4 border-b border-border-subtle/30 pb-4">
                <div className="flex-1 min-w-[200px]">
                    <h2 className="text-3xl font-bold text-white mb-1 truncate leading-tight" title={project.name}>{project.name}</h2>
                    <p className="text-text-secondary text-sm">{foldersToDisplay.length} папок</p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={() => onToggleExpandAll(!allExpanded)}
                        className="flex items-center gap-2 px-3 py-2 bg-transparent hover:bg-[#2a2d33] text-text-secondary hover:text-white rounded-lg transition-colors text-sm font-medium border border-border-subtle"
                    >
                        <AlignJustify size={14} />
                        {allExpanded ? 'Свернуть' : 'Развернуть'}
                    </button>
                    <button
                        onClick={onOpenCreateFolder}
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
                onReorder={onReorderFolders}
                className="space-y-6"
            >
                {foldersToDisplay.map(folder => {
                    const isExpanded = expandedFolders.has(folder.id);
                    return (
                        <Reorder.Item key={folder.id} value={folder} id={`folder-${folder.id}`} className="relative bg-transparent group/folder scroll-mt-24" dragListener={!search}>
                            {/* Folder Header */}
                            <div onClick={() => onToggleFolder(folder.id)} className="flex items-center gap-2 mb-3 mt-6 text-text-secondary/70 px-1 cursor-pointer hover:text-accent-blue transition-colors relative group select-none">
                                <motion.div animate={{ rotate: isExpanded ? 0 : -90 }} className="shrink-0"><ChevronDown size={14} /></motion.div>

                                {!search && (
                                    <GripVertical size={16} className="opacity-0 group-hover/folder:opacity-100 transition-opacity text-[#4b4e57] cursor-grab active:cursor-grabbing" onPointerDown={(e) => e.preventDefault()} />
                                )}

                                <FolderOpen size={14} />
                                <span className="text-xs font-bold uppercase tracking-widest flex-1">{folder.name}</span>
                                <span className="text-[10px] text-text-secondary/50 font-medium">{folder.notes.length}</span>

                                <div className="flex gap-1 absolute right-0 opacity-0 group-hover/folder:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                    <button onClick={(e) => onCopyFolder(e, folder)} className="p-1 rounded text-text-secondary hover:text-green-400 transition-colors" title="Копировать список"><Copy size={12} /></button>
                                    <button onClick={() => onRenameFolder(folder.id, folder.name)} className="p-1 rounded text-text-secondary hover:text-accent-blue transition-colors"><Pencil size={12} /></button>
                                    <button onClick={() => onDeleteFolder(folder.id, folder.name)} className="p-1 rounded text-text-secondary hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
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
                                                onReorder={(newNotes) => onReorderNotes(folder.id, newNotes)}
                                                className="flex flex-col gap-3 list-none p-0"
                                            >
                                                {folder.notes.map(note => (
                                                    <DraggableCard
                                                        key={note.id}
                                                        item={note}
                                                        onDelete={(id) => onDeleteNote(folder.id, id)}
                                                        onEdit={(id) => onEditNote(folder.id, id)}
                                                        onContextMenu={(e) => onNoteContextMenu(e, folder.id, note.id)}
                                                    />
                                                ))}
                                                <div className="h-full min-h-[120px]">
                                                    <AddNoteButton onClick={() => onCreateNote(folder.id)} />
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
    );
}
