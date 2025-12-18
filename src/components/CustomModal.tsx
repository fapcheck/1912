// src/components/CustomModal.tsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Tag, Check } from 'lucide-react';
import { cn } from './ui-elements';

interface ModalProps {
  isOpen: boolean;
  title: string;
  initialValue?: string;
  initialTags?: string[]; 
  globalTags?: string[]; 
  enableTags?: boolean;   
  onClose: () => void;
  onConfirm: (value: string, tags: string[]) => void;
  placeholder?: string;
}

export function CustomModal({ 
  isOpen, 
  title, 
  initialValue = '', 
  initialTags = [], 
  globalTags = [], 
  enableTags = false,
  onClose, 
  onConfirm, 
  placeholder 
}: ModalProps) {
  const [value, setValue] = useState(initialValue);
  const [tags, setTags] = useState<string[]>(initialTags || []);
  const [tagInput, setTagInput] = useState('');
  
  const inputRef = useRef<HTMLInputElement>(null);

  // 🛠️ ИСПРАВЛЕНИЕ: Зависимость только от [isOpen]. 
  // Это предотвращает бесконечный цикл (Maximum update depth), 
  // если родитель передает новый массив initialTags при каждом рендере.
  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setTags(initialTags || []);
      setTagInput('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); 

  if (!isOpen) return null;

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed]);
      setTagInput('');
    }
  };

  const toggleGlobalTag = (tag: string) => {
    if (tags.includes(tag)) {
        setTags(prev => prev.filter(t => t !== tag));
    } else {
        setTags(prev => [...prev, tag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleConfirm = () => {
    if (value.trim()) {
      onConfirm(value, tags);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => {
         if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#232529] border border-[#2f3136] w-full max-w-md rounded-xl shadow-2xl overflow-hidden relative z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2f3136]">
          <h3 className="text-white font-medium text-sm">{title}</h3>
          <button onClick={onClose} className="text-[#9ca3af] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <input
              ref={inputRef}
              autoFocus
              type="text"
              className="w-full bg-[#1a1c20] border border-[#2f3136] rounded-lg px-3 py-2 text-white placeholder-[#9ca3af]/50 focus:border-[#3689e6] focus:ring-1 focus:ring-[#3689e6] transition-all outline-none select-text cursor-text"
              placeholder={placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm();
                if (e.key === 'Escape') onClose();
              }}
            />
          </div>

          {enableTags && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-[#1a1c20] border border-[#2f3136] rounded-lg px-2 py-1.5 focus-within:border-[#3689e6] transition-colors">
                <Tag size={14} className="text-[#9ca3af]" />
                <input 
                  type="text"
                  className="bg-transparent border-none outline-none text-xs text-white w-full placeholder-[#9ca3af]/50 select-text cursor-text"
                  placeholder="Добавить тег (Enter)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
              </div>
              
              <div className="flex flex-wrap gap-2 min-h-[24px]">
                <AnimatePresence>
                  {(tags || []).map(tag => (
                    <motion.span 
                      key={tag}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#3689e6]/20 text-[#3689e6] text-[10px] font-medium cursor-pointer hover:bg-[#3689e6]/30 transition-colors"
                      onClick={() => removeTag(tag)}
                    >
                      #{tag} <X size={10} />
                    </motion.span>
                  ))}
                </AnimatePresence>
                {(!tags || tags.length === 0) && (
                  <span className="text-[10px] text-[#9ca3af]/40 italic">Нет тегов</span>
                )}
              </div>

              {globalTags.length > 0 && (
                <div className="pt-2 border-t border-[#2f3136]">
                    <p className="text-[10px] text-[#9ca3af] mb-2 uppercase tracking-wider font-bold">Быстрый выбор</p>
                    <div className="flex flex-wrap gap-2 max-h-[80px] overflow-y-auto custom-scrollbar">
                        {globalTags.map(tag => {
                            const isSelected = tags.includes(tag);
                            return (
                                <button
                                    key={tag}
                                    onClick={() => toggleGlobalTag(tag)}
                                    className={cn(
                                        "px-2 py-1 rounded text-[10px] border transition-all flex items-center gap-1",
                                        isSelected 
                                            ? "bg-accent-blue text-white border-accent-blue" 
                                            : "bg-[#2a2d33] text-text-secondary border-transparent hover:border-[#3f4148] hover:text-white"
                                    )}
                                >
                                    {isSelected && <Check size={10} />}
                                    #{tag}
                                </button>
                            );
                        })}
                    </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 bg-[#1a1c20]/50 border-t border-[#2f3136]">
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-[#9ca3af] hover:text-white transition-colors rounded-md hover:bg-[#2f3136]">
            Отмена
          </button>
          <button 
            onClick={handleConfirm} 
            disabled={!value.trim()} 
            className={cn(
              "px-3 py-1.5 text-xs font-medium text-white bg-[#3689e6] rounded-md flex items-center gap-1.5 transition-all",
              !value.trim() 
                ? "opacity-50 cursor-not-allowed grayscale" 
                : "hover:bg-[#2b74c7]"
            )}
          >
            <Save size={14} /> Сохранить
          </button>
        </div>
      </motion.div>
    </div>
  );
}