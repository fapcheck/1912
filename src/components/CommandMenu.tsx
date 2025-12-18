// src/components/CommandMenu.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Clipboard, Briefcase, CornerDownLeft, X, Image as ImageIcon, FileText } from 'lucide-react';
import { useStore } from '../store';
import clipboard from 'tauri-plugin-clipboard-api';
import { readFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { APP_CONFIG } from '../constants';

interface CommandMenuProps {
  onNavigateProject: (projectId: string) => void;
  onClose?: () => void;
}

// 🔧 Helper: Uint8Array -> Base64 (Standalone to ensure isolation)
function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return window.btoa(binary);
}

export function CommandMenu({ onNavigateProject, onClose }: CommandMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { history, projects } = useStore();

  // --- Keyboard Event Listeners ---
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

  // Focus input when opened
  useEffect(() => { 
    if (isOpen) { 
      // Small delay to ensure render is complete
      setTimeout(() => inputRef.current?.focus(), 50); 
    } 
  }, [isOpen]);

  // --- Filtering Logic (Memoized) ---
  const filteredItems = useMemo(() => {
    if (!query) return [];
    
    const lowerQuery = query.toLowerCase();
    
    const projectItems = projects
        .filter((p) => p.name.toLowerCase().includes(lowerQuery))
        .map((p) => ({ type: 'project' as const, data: p, id: p.id }));
    
    const historyItems = history
        .filter((item) => item.text.toLowerCase().includes(lowerQuery))
        .map((item) => ({ type: 'history' as const, data: item, id: item.id }));
    
    // Prioritize exact matches or projects, limit results for performance
    return [...projectItems, ...historyItems].slice(0, 10);
  }, [query, history, projects]);

  // --- Navigation Logic ---
  useEffect(() => {
    const handleNav = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'ArrowDown') { 
        e.preventDefault(); 
        setSelectedIndex((i) => (i + 1) % filteredItems.length); 
      } 
      else if (e.key === 'ArrowUp') { 
        e.preventDefault(); 
        setSelectedIndex((i) => (i - 1 + filteredItems.length) % filteredItems.length); 
      } 
      else if (e.key === 'Enter') { 
        e.preventDefault(); 
        if (filteredItems[selectedIndex]) handleSelect(filteredItems[selectedIndex]); 
      }
    };
    
    window.addEventListener('keydown', handleNav);
    return () => window.removeEventListener('keydown', handleNav);
  }, [isOpen, filteredItems, selectedIndex]);

  // --- Action Logic ---
  const handleSelect = async (item: any) => {
    if (!item) return;

    if (item.type === 'history') {
      try {
        const historyItem = item.data;

        // 🚨 Logic Fix: Handle Images correctly
        if (historyItem.contentType === 'image' && historyItem.imageData) {
             toast.info("Загрузка изображения...");
             
             if (historyItem.imageData.startsWith('data:')) {
                 // Legacy Base64 support
                 const base64 = historyItem.imageData.replace(/^data:image\/[a-z]+;base64,/, "");
                 await clipboard.writeImageBase64(base64);
             } else {
                 // File System support
                 const imageBytes = await readFile(`images/${historyItem.imageData}`, {
                     baseDir: BaseDirectory.AppLocalData,
                 });
                 const base64String = arrayBufferToBase64(imageBytes);
                 await clipboard.writeImageBase64(base64String);
             }
             toast.success('Изображение скопировано');
        } else {
            // Standard Text Copy
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
                placeholder="Поиск по проектам и истории..." 
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
                    {query ? 'Ничего не найдено' : 'Начните вводить текст для поиска...'}
                </div>
              ) : (
                filteredItems.map((item, index) => {
                    const isSelected = index === selectedIndex;
                    const isHistory = item.type === 'history';
                    const isImage = isHistory && item.data.contentType === 'image';

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
                                {isHistory 
                                    ? (isImage ? <ImageIcon size={16} /> : <Clipboard size={16} />)
                                    : <Briefcase size={16} />
                                }
                            </div>
                            
                            <div className="flex-1 truncate flex flex-col justify-center">
                                <span className="font-medium truncate leading-tight">
                                    {isHistory ? item.data.text : item.data.name}
                                </span>
                                <span className={cn("text-[10px] mt-0.5 transition-colors", isSelected ? "text-white/70" : "text-text-secondary/50")}>
                                    {isHistory 
                                        ? `История • ${item.data.date} • ${item.data.contentType}` 
                                        : `Проект • ${item.data.folders.length} папок`
                                    }
                                </span>
                            </div>
                            
                            {isSelected && (
                                <div className="absolute right-3 flex items-center gap-1 opacity-70">
                                    <span className="text-[10px] font-medium uppercase tracking-wider mr-1">
                                        {isHistory ? 'Copy' : 'Open'}
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