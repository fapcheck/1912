// src/components/NavigationHeader.tsx
import { useState, useRef, useEffect, RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, PinOff, Clipboard, Folder, ArrowLeft, Settings, Download, Upload } from 'lucide-react';
import { cn } from './ui-elements';
import { Project } from '../types';
import { useStore } from '../store';
import { toast } from 'sonner';

type ViewType = 'history' | 'project' | 'favorites' | 'images' | 'links' | 'code';

interface NavigationHeaderProps {
    // View state
    activeView: ViewType;
    setActiveView: (view: ViewType) => void;
    selectedProjectId: string | null;
    setSelectedProjectId: (id: string | null) => void;

    // Search (kept for history view)
    search: string;
    setSearch: (value: string) => void;
    searchInputRef: RefObject<HTMLInputElement | null>;

    // Pin
    isPinned: boolean;
    togglePin: () => void;

    // Data
    projects: Project[];

    // Actions
    onCreateProject: () => void;
    onSelectFolder: (projectId: string, folderId: string) => void;
}

// Tab button component
const TabButton = ({
    icon: Icon,
    label,
    isActive,
    onClick
}: {
    icon: typeof Clipboard;
    label: string;
    isActive: boolean;
    onClick: () => void;
}) => (
    <button
        onClick={onClick}
        className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            isActive
                ? "bg-accent-blue text-white"
                : "text-text-secondary hover:text-white hover:bg-white/5"
        )}
    >
        <Icon size={16} />
        <span>{label}</span>
    </button>
);

export function NavigationHeader({
    activeView,
    setActiveView,
    selectedProjectId,
    setSelectedProjectId,
    search: _search,
    setSearch: _setSearch,
    searchInputRef: _searchInputRef,
    isPinned,
    togglePin,
    projects,
    onCreateProject: _onCreateProject,
    onSelectFolder: _onSelectFolder
}: NavigationHeaderProps) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const settingsRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const currentProject = projects.find(p => p.id === selectedProjectId);
    const isInProjectDetail = activeView === 'project' && currentProject;

    // Close settings when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
                setIsSettingsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleBackToProjects = () => {
        setSelectedProjectId(null);
    };

    // Export data as JSON
    const handleExport = () => {
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
        setIsSettingsOpen(false);
    };

    // Import data from JSON
    const handleImport = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.projects || !data.history) {
                throw new Error('Invalid backup file');
            }

            const state = useStore.getState();

            // Merge or replace? Let's merge to avoid data loss
            const existingProjectIds = new Set(state.projects.map(p => p.id));
            const newProjects = data.projects.filter((p: Project) => !existingProjectIds.has(p.id));

            const existingHistoryIds = new Set(state.history.map(h => h.id));
            const newHistory = data.history.filter((h: { id: string }) => !existingHistoryIds.has(h.id));

            if (newProjects.length > 0) {
                state.setProjects([...state.projects, ...newProjects]);
            }
            if (newHistory.length > 0) {
                state.setHistory([...state.history, ...newHistory]);
            }
            if (data.globalTags) {
                const allTags = [...new Set([...state.globalTags, ...data.globalTags])];
                state.setGlobalTags(allTags);
            }

            toast.success(`Импортировано: ${newProjects.length} проектов, ${newHistory.length} записей`);
        } catch {
            toast.error('Ошибка при импорте данных');
        }

        // Reset file input
        e.target.value = '';
        setIsSettingsOpen(false);
    };

    return (
        <header className="h-14 flex items-center px-4 gap-3 sticky top-0 bg-bg/95 backdrop-blur-xl z-30 border-b border-border-subtle shrink-0">
            {/* Back button when in project detail */}
            {isInProjectDetail && (
                <button
                    onClick={handleBackToProjects}
                    className="flex items-center gap-1 text-text-secondary hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
                    title="Назад к проектам"
                >
                    <ArrowLeft size={18} />
                </button>
            )}

            {/* Main Tabs */}
            <nav className="flex items-center gap-1">
                <TabButton
                    icon={Folder}
                    label={isInProjectDetail ? currentProject.name : "Проекты"}
                    isActive={activeView === 'project'}
                    onClick={() => {
                        if (isInProjectDetail) {
                            handleBackToProjects();
                        } else {
                            setActiveView('project');
                        }
                    }}
                />
                <TabButton
                    icon={Clipboard}
                    label="История"
                    isActive={activeView === 'history' || activeView === 'favorites' || activeView === 'images' || activeView === 'links' || activeView === 'code'}
                    onClick={() => setActiveView('history')}
                />
            </nav>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Settings Menu */}
            <div className="relative" ref={settingsRef}>
                <button
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    className="p-2 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
                    title="Настройки"
                >
                    <Settings size={18} />
                </button>

                <AnimatePresence>
                    {isSettingsOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute right-0 top-full mt-2 w-48 bg-bg-card border border-border-subtle rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50"
                        >
                            <div className="py-1">
                                <button
                                    onClick={handleExport}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-white/5 transition-colors text-left"
                                >
                                    <Download size={16} className="text-text-secondary" />
                                    Экспорт данных
                                </button>
                                <button
                                    onClick={handleImport}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-white/5 transition-colors text-left"
                                >
                                    <Upload size={16} className="text-text-secondary" />
                                    Импорт данных
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Hidden file input for import */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                />
            </div>

            {/* Pin Button */}
            <button
                onClick={togglePin}
                className={cn(
                    "p-2 rounded-lg transition-colors",
                    isPinned
                        ? "text-accent-blue bg-accent-blue/10 hover:bg-accent-blue/20"
                        : "text-text-secondary hover:text-white hover:bg-white/5"
                )}
                title={isPinned ? "Открепить" : "Закрепить поверх окон"}
            >
                {isPinned ? <Pin size={18} fill="currentColor" /> : <PinOff size={18} />}
            </button>
        </header>
    );
}
