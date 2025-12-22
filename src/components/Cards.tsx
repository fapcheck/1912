// src/components/Cards.tsx
import React, { useState, useCallback, memo, useEffect, useRef } from 'react';

import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { AlignJustify, Pencil, Trash2, ExternalLink, Check, Star } from 'lucide-react';
// 🛠️ Tauri Plugins
import clipboard from 'tauri-plugin-clipboard-api';
import * as opener from '@tauri-apps/plugin-opener';
import { readFile, BaseDirectory } from '@tauri-apps/plugin-fs';

import { cn, TypeBadge } from './ui-elements';
import { arrayBufferToBase64 } from '../lib/utils';
import { ErrorBoundary, CompactErrorFallback } from './ErrorBoundary';
import { HighlightText } from './HighlightText';
import { NoteItem } from '../types';

// --- Syntax Highlighter Imports ---
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('js', javascript);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('bash', bash);

interface CardProps {
  item: NoteItem;
  onDelete: (id: string) => void;
  onEdit?: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onToggleFavorite?: (id: string) => void;
  searchTerm?: string;
  // Selection props
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

// 🔥 OPTIMIZED: Image Preview
const ImagePreview = ({ fileName, compact }: { fileName: string, compact?: boolean }) => {
  const [src, setSrc] = useState<string>("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    let currentObjectUrl: string | null = null;

    const loadImage = async () => {
      // 1. Fast path for old data types
      if (fileName.startsWith('data:') || fileName.startsWith('http')) {
        if (isActive) {
          setSrc(fileName);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        // 2. Read file from disk
        const imageBytes = await readFile(`images/${fileName}`, {
          baseDir: BaseDirectory.AppLocalData,
        });

        // 3. Check active status before processing
        if (!isActive) return;

        const blob = new Blob([imageBytes]);
        const url = URL.createObjectURL(blob);
        currentObjectUrl = url;

        if (isActive) {
          setSrc(url);
          setLoading(false);
        } else {
          URL.revokeObjectURL(url);
        }
      } catch {
        if (isActive) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isActive = false;
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [fileName]);

  if (error) {
    if (compact) return <div className="text-[9px] text-red-400">Error</div>;
    return (
      <div className="mt-2 text-red-400 text-[10px] p-2 border border-red-500/20 rounded bg-red-500/10">
        Файл не найден
      </div>
    );
  }

  // Compact View
  if (compact) {
    return (
      <div className={cn("relative w-full h-full transition-opacity duration-300", loading ? "opacity-50" : "opacity-100")}>
        <img src={src || undefined} alt="Preview" className="w-full h-full object-cover block" />
      </div>
    );
  }

  // Normal View
  return (
    <div className={cn("relative mt-2 rounded-lg overflow-hidden border border-white/5 bg-black/20 transition-opacity duration-300", loading ? "opacity-50" : "opacity-100")}>
      {loading && <div className="absolute inset-0 flex items-center justify-center text-xs text-text-secondary">Загрузка...</div>}
      <img src={src || undefined} alt="Preview" className="w-full h-auto max-h-[200px] object-contain block" />
    </div>
  );
};

// ⚡ Custom Hook for Card Logic
function useCardActions(item: NoteItem) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      if (item.contentType === 'image' && item.imageData) {
        if (item.imageData.startsWith('data:')) {
          const base64 = item.imageData.replace(/^data:image\/[a-z]+;base64,/, "");
          await clipboard.writeImageBase64(base64);
        } else {
          try {
            const imageBytes = await readFile(`images/${item.imageData}`, {
              baseDir: BaseDirectory.AppLocalData,
            });
            const base64String = arrayBufferToBase64(imageBytes);
            await clipboard.writeImageBase64(base64String);
          } catch {
            await clipboard.writeText(`[Image Missing: ${item.imageData}]`);
          }
        }
        setCopied(true);
      } else {
        await clipboard.writeText(item.text);
        setCopied(true);
      }

      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      // Set new timer
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silent fail for copy
    }
  }, [item]);

  const handleOpenUrl = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.contentType === 'url') {
      try {
        await opener.openUrl(item.text);
      } catch {
        // Silent fail for URL open
      }
    }
  }, [item.contentType, item.text]);

  return { copied, handleCopy, handleOpenUrl };
}

const CopyFeedback = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className="absolute bottom-2 right-2 bg-accent-blue text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg flex items-center gap-1 pointer-events-none z-20"
  >
    <Check size={10} strokeWidth={3} /> <span>Copied</span>
  </motion.div>
);

const CardContent = memo(({ item, compact, searchTerm }: { item: NoteItem; compact?: boolean; searchTerm?: string }) => {
  if (item.contentType === 'image' && item.imageData) {
    if (compact) {
      return (
        <div className="flex items-center gap-2 mt-1">
          <div className="w-8 h-8 rounded bg-black/20 overflow-hidden shrink-0">
            <ErrorBoundary fallback={<CompactErrorFallback />}>
              <ImagePreview fileName={item.imageData} compact />
            </ErrorBoundary>
          </div>
          <span className="text-xs text-text-secondary italic">[Изображение]</span>
        </div>
      );
    }
    return (
      <ErrorBoundary>
        <ImagePreview fileName={item.imageData} />
      </ErrorBoundary>
    );
  }

  const isTooLong = item.text.length > 2000;

  if (item.contentType === 'code' && !isTooLong) {
    if (compact) {
      return <p className="text-xs text-text-secondary font-mono truncate mt-0.5">{item.text.slice(0, 100)}</p>;
    }
    return (
      <ErrorBoundary fallback={<div className="p-3 text-xs text-red-400 bg-red-500/10 rounded">Ошибка подсветки кода</div>}>
        <div className="relative flex-1 mt-3 overflow-hidden rounded-md border border-white/5 text-[11px] max-h-[140px] group/code bg-[#1a1c20]">
          <div className="pointer-events-none">
            <SyntaxHighlighter
              language="javascript"
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: '12px',
                paddingBottom: '24px',
                background: 'transparent',
                fontSize: '11px',
                lineHeight: '1.4'
              }}
              wrapLongLines={false}
              codeTagProps={{ style: { fontFamily: 'monospace' } }}
            >
              {item.text}
            </SyntaxHighlighter>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#1a1c20] to-transparent pointer-events-none" />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <div className={cn("relative flex-1", !compact && "mt-2")}>
      <p className={cn("text-sm text-text-primary font-medium leading-relaxed font-sans",
        compact ? "truncate" : "break-all line-clamp-6",
        isTooLong && "font-mono text-xs text-text-secondary"
      )}>
        <HighlightText text={item.text} highlight={searchTerm} />
      </p>
    </div>
  );
}, (prev, next) => {
  return prev.item.text === next.item.text &&
    prev.item.contentType === next.item.contentType &&
    prev.item.imageData === next.item.imageData &&
    prev.compact === next.compact &&
    prev.searchTerm === next.searchTerm;
});

const TagsList = memo(({ tags }: { tags?: string[] }) => {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-3">
      {tags.map(tag => (
        <span key={tag} className="text-[9px] bg-[#2a2d33] text-text-secondary px-1.5 py-0.5 rounded border border-white/5">
          #{tag}
        </span>
      ))}
    </div>
  );
});

const CardHeader = memo(({ item }: { item: NoteItem }) => (
  <div className="flex items-center gap-2 overflow-hidden w-full pr-8">
    <TypeBadge type={item.contentType} text={item.text} />
    <span className="text-[10px] text-text-secondary/60 font-medium truncate">
      {item.date}
    </span>
  </div>
));

interface CardActionsProps {
  item: NoteItem;
  onEdit?: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  handleOpenUrl: (e: React.MouseEvent) => void;
  className?: string;
}

const CardActions = ({ item, onEdit, onDelete, onToggleFavorite, handleOpenUrl, className }: CardActionsProps) => (
  <div className={cn("absolute bottom-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 bg-[#1e2024] shadow-lg shadow-black/40 border border-[#2f3136] rounded-xl p-1", className)}>
    {onToggleFavorite && (
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
        className={cn("p-1.5 rounded-lg transition-colors", item.isFavorite ? "text-yellow-400 hover:bg-yellow-400/10" : "text-text-secondary hover:text-white hover:bg-white/10")}
        title={item.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
      >
        <Star size={14} fill={item.isFavorite ? "currentColor" : "none"} />
      </button>
    )}
    {/* Divider if we have other actions */}
    {(!!onEdit || !!onDelete || item.contentType === 'url') && <div className="w-[1px] h-3 bg-[#2f3136] mx-0.5" />}

    {item.contentType === 'url' && (
      <button onClick={handleOpenUrl} className="p-1.5 rounded-lg hover:bg-blue-500/10 hover:text-blue-400 text-text-secondary transition-colors" title="Open">
        <ExternalLink size={14} />
      </button>
    )}
    {onEdit && item.contentType !== 'image' && (
      <button onClick={(e) => { e.stopPropagation(); onEdit(item.id); }} className="p-1.5 rounded-lg hover:bg-accent-blue hover:text-white text-text-secondary transition-colors" title="Edit">
        <Pencil size={14} />
      </button>
    )}
    <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-text-secondary transition-colors" title="Delete">
      <Trash2 size={14} />
    </button>
  </div>
);

// --- Exported Components ---

export const DraggableCard = memo(({ item, onEdit, onContextMenu }: CardProps) => {
  const { copied, handleCopy } = useCardActions(item);

  return (
    <Reorder.Item
      value={item}
      id={item.id}
      whileDrag={{ scale: 1.02, backgroundColor: "#2a2d33", boxShadow: "0 4px 12px rgba(0,0,0,0.4)", zIndex: 50, cursor: "grabbing" }}
      className="relative group touch-none"
    >
      <motion.div
        layout="position"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: 1,
          scale: 1,
          borderColor: copied ? "#3689e6" : "#2f3136"
        }}
        transition={{ duration: 0.2 }}
        onClick={handleCopy}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onEdit?.(item.id);
        }}
        onContextMenu={onContextMenu}
        className={cn("bg-bg-card border rounded-lg p-2.5 cursor-pointer hover:shadow-md transition-all duration-200 flex items-center gap-3 relative overflow-hidden group/card", !copied && "hover:border-accent-blue/30 hover:bg-[#25272c]")}
      >
        {/* Grip Handle (Left) */}
        <div
          className="text-[#2f3136] group-hover/card:text-text-secondary/60 cursor-grab active:cursor-grabbing p-1 hover:bg-black/20 rounded transition-colors shrink-0"
        >
          <AlignJustify size={14} />
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-2 w-full">
            <TypeBadge type={item.contentType} text={item.text} />

            {/* Tags next to type */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex items-center gap-1 overflow-hidden">
                {item.tags.map(t => (
                  <span key={t} className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-[#2f3136] text-text-secondary border border-white/5 whitespace-nowrap">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            <span className="text-[10px] text-text-secondary/40 shrink-0 ml-auto">{item.date}</span>
          </div>

          <CardContent item={item} compact={true} />
        </div>

        {/* Actions removed (use context menu/double click) */}

        {/* Copy Feedback Overlay (Optional, or just subtle border change) */}
        <AnimatePresence>{copied && <CopyFeedback />}</AnimatePresence>
      </motion.div>
    </Reorder.Item>
  );
});

export const SimpleCard = memo(({ item, onDelete, onEdit, onContextMenu, onToggleFavorite, searchTerm, isSelected, onToggleSelect }: CardProps) => {
  const { copied, handleCopy, handleOpenUrl } = useCardActions(item);

  const handleClick = (e: React.MouseEvent) => {
    // Ctrl/Cmd + Click for selection
    if ((e.ctrlKey || e.metaKey) && onToggleSelect) {
      e.preventDefault();
      onToggleSelect(item.id);
      return;
    }
    handleCopy();
  };

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: 1,
        scale: 1,
        borderColor: isSelected ? "#3689e6" : copied ? "#3689e6" : "#2f3136"
      }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEdit?.(item.id);
      }}
      onContextMenu={onContextMenu}
      draggable
      onDragStart={(e) => {
        const nativeEvent = e as unknown as React.DragEvent<HTMLDivElement>;
        nativeEvent.dataTransfer.setData('text/plain', item.text);
        nativeEvent.dataTransfer.setData('app/item-id', item.id);
        nativeEvent.dataTransfer.setData('app/type', 'history');
        nativeEvent.dataTransfer.effectAllowed = 'copy';
      }}
      className={cn(
        "group relative bg-bg-card border rounded-2xl p-3.5 cursor-pointer hover:shadow-lg transition-colors duration-200 flex flex-col h-full min-h-[120px] overflow-hidden",
        !copied && !isSelected && "hover:border-accent-blue/30",
        isSelected && "border-accent-blue bg-accent-blue/5 ring-2 ring-accent-blue/30"
      )}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-accent-blue flex items-center justify-center z-20">
          <Check size={12} className="text-white" />
        </div>
      )}
      <CardActions item={item} onDelete={onDelete} onToggleFavorite={onToggleFavorite} handleOpenUrl={handleOpenUrl} />
      <CardHeader item={item} />
      <CardContent item={item} searchTerm={searchTerm} />
      <TagsList tags={item.tags} />
      <AnimatePresence>{copied && <CopyFeedback />}</AnimatePresence>
    </motion.div>
  );
});