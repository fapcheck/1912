// src/components/Sidebar.tsx
import React, { useRef, useState, useCallback, memo } from 'react';
import { motion, Reorder } from 'framer-motion';
import { 
  Clipboard, Layout, Plus, Briefcase, GripVertical, 
  Pencil, Trash2, Download, Upload, Eraser, X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store';
import { Project } from '../types';

interface SidebarProps {
  focusMode: boolean;
  activeView: 'history' | 'project';
  setActiveView: (view: 'history' | 'project') => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  onOpenCreateProject: () => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string, name: string) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// ⚡ 1. Memoized Project Item to prevent re-renders when History count changes
const SidebarProjectItem = memo(({ 
  project, 
  isSelected, 
  onClick, 
  onRename, 
  onDelete 
}: { 
  project: Project; 
  isSelected: boolean; 
  onClick: (id: string) => void; 
  onRename: (id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
}) => {
  return (
    <Reorder.Item value={project} id={project.id} className="relative group">
      <div 
        onClick={() => onClick(project.id)} 
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer relative pr-8", 
          isSelected 
            ? "bg-[#2a2d33] text-white shadow-sm" 
            : "text-text-secondary hover:text-white hover:bg-[#232529]"
        )}
      >
        {/* Drag Handle */}
        <div 
          className="absolute right-2 opacity-0 group-hover:opacity-100 text-[#4b4e57] hover:text-white cursor-grab active:cursor-grabbing transition-opacity z-10" 
          onPointerDown={(e) => e.preventDefault()}
        >
          <GripVertical size={14} />
        </div>

        <Briefcase size={16} className={isSelected ? "text-accent-blue" : "text-text-secondary"} />
        <span className='flex-1 truncate'>{project.name}</span>
        
        {/* Action Buttons */}
        <div className="flex gap-1 absolute right-0 opacity-0 group-hover:opacity-100 transition-opacity z-20 mr-6">
          <button 
            onClick={(e) => { e.stopPropagation(); onRename(project.id, project.name); }} 
            className="p-1 rounded text-text-secondary hover:text-white transition-colors"
            title="Переименовать"
          >
            <Pencil size={12} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(project.id, project.name); }} 
            className="p-1 rounded text-text-secondary hover:text-red-400 transition-colors"
            title="Удалить"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </Reorder.Item>
  );
});

export function Sidebar({
  focusMode,
  activeView,
  setActiveView,
  selectedProjectId,
  setSelectedProjectId,
  onOpenCreateProject,
  onRenameProject,
  onDeleteProject,
  onExport,
  onImport
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [isTagSectionOpen, setIsTagSectionOpen] = useState(false);

  // Store subscription
  const { 
    history, 
    projects, 
    setProjects, 
    globalTags, 
    addGlobalTag, 
    deleteGlobalTag,
    clearHistory
  } = useStore();

  const handleAddGlobalTag = (e?: React.FormEvent) => {
    e?.preventDefault();
    const tag = newTagInput.trim();
    if (tag) {
        addGlobalTag(tag);
        setNewTagInput('');
    }
  };

  // ⚡ 2. Stable Handlers for Project Items
  const handleProjectClick = useCallback((id: string) => {
    setActiveView('project');
    setSelectedProjectId(id);
  }, [setActiveView, setSelectedProjectId]);

  return (
    <motion.div 
      animate={{ width: focusMode ? 0 : 256, opacity: focusMode ? 0 : 1 }} 
      transition={{ type: "spring", stiffness: 300, damping: 30 }} 
      className="bg-bg-sidebar border-r border-border-subtle flex flex-col overflow-hidden shrink-0 z-20 whitespace-nowrap select-none"
    >
      <div className="p-4 flex flex-col h-full w-64"> 
        {/* App Brand */}
        <div className="mb-6 px-2 flex items-center gap-2.5 text-accent-blue">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-blue to-accent-blueHover flex items-center justify-center text-white shadow-lg shadow-accent-blue/20">
            <Clipboard size={18} strokeWidth={3} />
          </div>
          <div>
            <span className="font-bold tracking-tight text-white text-sm block leading-none">Buffer Pro</span>
            <span className="text-[10px] text-text-secondary font-medium">v4.0 Turbo</span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          
          {/* --- History Section --- */}
          <div>
            <p className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-wider px-3 mb-2">Входящие</p>
            <button 
              onClick={() => { setActiveView('history'); setSelectedProjectId(null); }} 
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group", 
                activeView === 'history' ? "bg-[#2a2d33] text-white" : "text-text-secondary hover:text-white hover:bg-[#232529]"
              )}
            >
              <div className="flex items-center gap-3">
                <Layout size={18} /> История
              </div>
              {history.length > 0 && (
                <span className="text-[10px] bg-accent-blue/20 text-accent-blue px-2 py-0.5 rounded-full font-bold">
                  {history.length}
                </span>
              )}
            </button>
          </div>

          {/* --- Projects Section --- */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-wider">Проекты</p>
              <button 
                onClick={onOpenCreateProject} 
                className="text-text-secondary hover:text-white transition-colors p-1 hover:bg-[#2f3136] rounded cursor-pointer"
                title="Создать проект"
              >
                <Plus size={12} />
              </button>
            </div>
            
            <Reorder.Group axis="y" values={projects} onReorder={setProjects} className="space-y-0.5">
              {projects.map(project => (
                <SidebarProjectItem 
                  key={project.id} 
                  project={project} 
                  isSelected={selectedProjectId === project.id}
                  onClick={handleProjectClick}
                  onRename={onRenameProject}
                  onDelete={onDeleteProject}
                />
              ))}
            </Reorder.Group>
          </div>

          {/* --- Tags Section --- */}
          <div>
             <div 
                className="flex items-center justify-between px-3 mb-2 cursor-pointer group"
                onClick={() => setIsTagSectionOpen(!isTagSectionOpen)}
             >
                <p className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-wider group-hover:text-white transition-colors">
                  Теги ({globalTags.length})
                </p>
                <Plus size={12} className={cn("text-text-secondary transition-transform", isTagSectionOpen ? "rotate-45" : "")} />
            </div>

            {isTagSectionOpen && (
                <div className="px-3 space-y-3 mb-4">
                    <form onSubmit={handleAddGlobalTag} className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Новый тег..." 
                            className="bg-[#2a2d33] text-xs text-white px-2 py-1 rounded w-full border border-border-subtle focus:border-accent-blue outline-none select-text cursor-text placeholder:text-text-secondary/40"
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                        />
                        <button type="submit" className="bg-accent-blue text-white p-1 rounded hover:bg-accent-blueHover">
                            <Plus size={14} />
                        </button>
                    </form>
                    
                    <div className="flex flex-wrap gap-2">
                        {globalTags.map(tag => (
                          <div key={tag} className="flex items-center gap-1 bg-[#232529] border border-border-subtle text-xs text-text-secondary px-2 py-1 rounded-md group hover:border-white/20 hover:text-white transition-colors">
                            <span>#{tag}</span>
                            <button 
                              onClick={() => deleteGlobalTag(tag)} 
                              className="hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        {globalTags.length === 0 && <span className="text-xs text-text-secondary/40 italic">Список пуст</span>}
                    </div>
                </div>
            )}
          </div>
        </div>

        {/* --- Footer Actions --- */}
        <div className="pt-4 border-t border-border-subtle mt-2 space-y-2">
           <button onClick={onExport} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary hover:text-white hover:bg-[#2f3136] rounded-lg transition-colors">
               <Download size={14} /> Сохранить файл
           </button>
           
           <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary hover:text-white hover:bg-[#2f3136] rounded-lg transition-colors">
              <Upload size={14} /> Загрузить файл
           </button>
           <input 
              type="file" 
              ref={fileInputRef} 
              onChange={onImport} 
              accept=".json" 
              className="hidden" 
           />
           
           {activeView === 'history' && (
             <button onClick={clearHistory} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
               <Eraser size={14} /> Очистить всё
             </button>
           )}
        </div>
      </div>
    </motion.div>
  );
}