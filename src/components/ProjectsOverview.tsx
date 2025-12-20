// src/components/ProjectsOverview.tsx
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Folder, FolderOpen, ChevronDown, ChevronRight,
    Plus, FileText, Pencil, Trash2, MoreVertical
} from 'lucide-react';
import { cn } from './ui-elements';
import { Project } from '../types';

interface ProjectsOverviewProps {
    projects: Project[];
    onSelectProject: (projectId: string) => void;
    onSelectFolder: (projectId: string, folderId: string) => void;
    onCreateProject: () => void;
    onCreateFolder: (projectId: string) => void;
    // Context menu actions
    onRenameProject: (projectId: string, currentName: string) => void;
    onDeleteProject: (projectId: string, projectName: string) => void;
    onRenameFolder: (projectId: string, folderId: string, currentName: string) => void;
    onDeleteFolder: (projectId: string, folderId: string, folderName: string) => void;
    // Drag and drop
    onDropItem?: (itemId: string, projectId: string, folderId: string) => void;
}

// Inline context menu component
const ContextMenuButton = ({
    onRename,
    onDelete,
    itemName: _itemName
}: {
    onRename: () => void;
    onDelete: () => void;
    itemName: string;
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
            >
                <MoreVertical size={14} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />
                        {/* Menu */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 top-full mt-1 w-40 bg-bg-card border border-border-subtle rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50"
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRename();
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-white/5 transition-colors text-left"
                            >
                                <Pencil size={14} />
                                Переименовать
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
                            >
                                <Trash2 size={14} />
                                Удалить
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export function ProjectsOverview({
    projects,
    onSelectProject: _onSelectProject,
    onSelectFolder,
    onCreateProject,
    onCreateFolder,
    onRenameProject,
    onDeleteProject,
    onRenameFolder,
    onDeleteFolder,
    onDropItem
}: ProjectsOverviewProps) {
    const [search, setSearch] = useState('');
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null); // Closed by default

    // Filter projects and folders based on search
    const filteredData = useMemo(() => {
        if (!search.trim()) {
            return projects.map(p => ({ ...p, filteredFolders: p.folders }));
        }

        const query = search.toLowerCase();
        return projects
            .map(project => {
                const matchingFolders = project.folders.filter(folder =>
                    folder.name.toLowerCase().includes(query) ||
                    folder.notes.some(note => note.text.toLowerCase().includes(query))
                );
                const projectMatches = project.name.toLowerCase().includes(query);

                return {
                    ...project,
                    filteredFolders: projectMatches ? project.folders : matchingFolders,
                    isMatch: projectMatches || matchingFolders.length > 0
                };
            })
            .filter(p => p.isMatch !== false);
    }, [projects, search]);

    const toggleProject = (projectId: string) => {
        setExpandedProjects(prev => {
            const next = new Set(prev);
            if (next.has(projectId)) {
                next.delete(projectId);
            } else {
                next.add(projectId);
            }
            return next;
        });
    };

    const totalFolders = projects.reduce((sum, p) => sum + p.folders.length, 0);
    const totalNotes = projects.reduce((sum, p) =>
        sum + p.folders.reduce((s, f) => s + f.notes.length, 0), 0
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto h-full flex flex-col"
        >
            {/* Header with Search */}
            <div className="shrink-0 mb-6">
                <div className="flex items-end justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Проекты</h1>
                        <p className="text-text-secondary text-sm mt-1">
                            {projects.length} проектов • {totalFolders} папок • {totalNotes} заметок
                        </p>
                    </div>
                    <button
                        onClick={onCreateProject}
                        className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-xl font-medium text-sm hover:bg-accent-blue/90 transition-colors"
                    >
                        <Plus size={16} />
                        Новый проект
                    </button>
                </div>

                {/* Search */}
                <div className="flex items-center gap-3 bg-bg-card px-4 py-3 rounded-xl border border-border-subtle focus-within:border-accent-blue/50 transition-colors">
                    <Search size={18} className="text-text-secondary shrink-0" />
                    <input
                        type="text"
                        placeholder="Поиск проектов и папок..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm w-full text-text-primary placeholder:text-text-secondary/50"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="text-text-secondary hover:text-white text-xs"
                        >
                            Очистить
                        </button>
                    )}
                </div>
            </div>

            {/* Projects List */}
            <div className="flex-1 overflow-y-auto space-y-3">
                {filteredData.length === 0 ? (
                    <div className="text-center py-20 text-text-secondary">
                        <Folder size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">Нет проектов</p>
                        <p className="text-sm mt-1">Создайте первый проект для начала работы</p>
                    </div>
                ) : (
                    filteredData.map(project => (
                        <div
                            key={project.id}
                            className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden"
                        >
                            {/* Project Header */}
                            <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors group">
                                <button
                                    onClick={() => toggleProject(project.id)}
                                    className="flex items-center gap-3 flex-1 text-left"
                                >
                                    <div className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        expandedProjects.has(project.id) ? "bg-accent-blue/10 text-accent-blue" : "bg-white/5 text-text-secondary"
                                    )}>
                                        {expandedProjects.has(project.id) ? <FolderOpen size={18} /> : <Folder size={18} />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-white truncate">{project.name}</h3>
                                        <p className="text-xs text-text-secondary">
                                            {project.folders.length} папок • {project.folders.reduce((s, f) => s + f.notes.length, 0)} заметок
                                        </p>
                                    </div>

                                    <ChevronDown
                                        size={18}
                                        className={cn(
                                            "text-text-secondary transition-transform",
                                            expandedProjects.has(project.id) && "rotate-180"
                                        )}
                                    />
                                </button>

                                {/* Context Menu */}
                                <ContextMenuButton
                                    itemName={project.name}
                                    onRename={() => onRenameProject(project.id, project.name)}
                                    onDelete={() => onDeleteProject(project.id, project.name)}
                                />
                            </div>

                            {/* Folders List */}
                            <AnimatePresence>
                                {expandedProjects.has(project.id) && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden border-t border-border-subtle"
                                    >
                                        <div className="p-2 space-y-1">
                                            {project.filteredFolders.length === 0 ? (
                                                <p className="text-center text-text-secondary text-sm py-4">
                                                    {search ? 'Нет совпадений' : 'Нет папок'}
                                                </p>
                                            ) : (
                                                project.filteredFolders.map(folder => (
                                                    <div
                                                        key={folder.id}
                                                        className={cn(
                                                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group",
                                                            dragOverFolderId === folder.id
                                                                ? "bg-accent-blue/20 border-2 border-dashed border-accent-blue"
                                                                : "hover:bg-white/5"
                                                        )}
                                                        onDragOver={(e) => {
                                                            e.preventDefault();
                                                            setDragOverFolderId(folder.id);
                                                        }}
                                                        onDragLeave={() => setDragOverFolderId(null)}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            setDragOverFolderId(null);
                                                            const itemId = e.dataTransfer.getData('text/plain');
                                                            if (itemId && onDropItem) {
                                                                onDropItem(itemId, project.id, folder.id);
                                                            }
                                                        }}
                                                    >
                                                        <button
                                                            onClick={() => onSelectFolder(project.id, folder.id)}
                                                            className="flex items-center gap-3 flex-1 text-left"
                                                        >
                                                            <ChevronRight size={14} className="text-text-secondary group-hover:text-accent-blue transition-colors" />
                                                            <Folder size={16} className="text-text-secondary group-hover:text-accent-blue transition-colors" />
                                                            <span className="flex-1 text-sm text-text-primary group-hover:text-white transition-colors truncate">
                                                                {folder.name}
                                                            </span>
                                                            <div className="flex items-center gap-1 text-xs text-text-secondary">
                                                                <FileText size={12} />
                                                                {folder.notes.length}
                                                            </div>
                                                        </button>

                                                        {/* Folder Context Menu */}
                                                        <ContextMenuButton
                                                            itemName={folder.name}
                                                            onRename={() => onRenameFolder(project.id, folder.id, folder.name)}
                                                            onDelete={() => onDeleteFolder(project.id, folder.id, folder.name)}
                                                        />
                                                    </div>
                                                ))
                                            )}

                                            {/* Add Folder Button */}
                                            <button
                                                onClick={() => onCreateFolder(project.id)}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-accent-blue hover:bg-accent-blue/10 transition-colors text-left text-sm"
                                            >
                                                <Plus size={14} />
                                                <span>Новая папка</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))
                )}
            </div>
        </motion.div>
    );
}
