// src/components/Cards.tsx
import React, { useState, useCallback, memo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { AlignJustify, Pencil, Trash2, ExternalLink, Check } from 'lucide-react';
// 🛠️ Tauri Plugins
import clipboard from 'tauri-plugin-clipboard-api';
import * as opener from '@tauri-apps/plugin-opener';
import { readFile, BaseDirectory } from '@tauri-apps/plugin-fs';

import { cn, TypeBadge } from './ui-elements';
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
}

// 🔧 Helper: Uint8Array -> Base64 (needed for clipboard write)
function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return window.btoa(binary);
}

// 🔥 OPTIMIZED: Image Preview with Memory Leak Protection
const ImagePreview = ({ fileName }: { fileName: string }) => {
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
          // If component unmounted during read, revoke immediately
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        console.error("Failed to load image:", fileName, err);
        if (isActive) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadImage();

    // 🧹 CLEANUP: Crucial to prevent memory leaks
    return () => {
      isActive = false;
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [fileName]);

  if (error) {
    return (
      <div className="mt-2 text-red-400 text-[10px] p-2 border border-red-500/20 rounded bg-red-500/10">
        Файл не найден
      </div>
    );
  }

  return (
    <div className={cn("relative mt-2 rounded-lg overflow-hidden border border-white/5 bg-black/20 transition-opacity duration-300", loading ? "opacity-50" : "opacity-100")}>
      {loading && <div className="absolute inset-0 flex items-center justify-center text-xs text-text-secondary">Загрузка...</div>}
      <img src={src} alt="Preview" className="w-full h-auto max-h-[200px] object-contain block" />
    </div>
  );
};

// ⚡ Custom Hook for Card Logic
function useCardActions(item: NoteItem) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      if (item.contentType === 'image' && item.imageData) {
        if (item.imageData.startsWith('data:')) {
          const base64 = item.imageData.replace(/^data:image\/[a-z]+;base64,/, "");
          await clipboard.writeImageBase64(base64);
        } else {
          // File based image
          try {
            const imageBytes = await readFile(`images/${item.imageData}`, {
              baseDir: BaseDirectory.AppLocalData,
            });
            const base64String = arrayBufferToBase64(imageBytes);
            await clipboard.writeImageBase64(base64String);
          } catch (readErr) {
            console.error("Error reading file for copy:", readErr);
            await clipboard.writeText(`[Image Missing: ${item.imageData}]`);
          }
        }
        setCopied(true);
      } else {
        await clipboard.writeText(item.text);
        setCopied(true);
      }
      
      const timer = setTimeout(() => setCopied(false), 1500);
      return () => clearTimeout(timer);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [item]);

  const handleOpenUrl = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.contentType === 'url') {
      try {
        await (opener as any).open(item.text);
      } catch (error) {
        console.error("Failed to open URL:", error);
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

const CardContent = memo(({ item }: { item: NoteItem }) => {
  if (item.contentType === 'image' && item.imageData) {
      return <ImagePreview fileName={item.imageData} />;
  }
  
  const isTooLong = item.text.length > 2000;
  
  if (item.contentType === 'code' && !isTooLong) {
     return (
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
    );
  }
  
  return (
    <div className="relative flex-1 mt-2">
      <p className={cn("text-sm text-text-primary font-medium leading-relaxed break-all font-sans line-clamp-6", isTooLong && "font-mono text-xs text-text-secondary")}>
        {item.text}
      </p>
    </div>
  );
}, (prev, next) => {
  // Strict comparison to avoid unnecessary re-renders of content
  return prev.item.text === next.item.text && 
         prev.item.contentType === next.item.contentType && 
         prev.item.imageData === next.item.imageData;
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

const CardActions = ({ item, onEdit, onDelete, handleOpenUrl, className }: any) => (
  <div className={cn("absolute top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-bg-card/90 backdrop-blur-sm rounded-lg pl-1 py-0.5", className)}>
    {item.contentType === 'url' && (
      <button onClick={handleOpenUrl} className="p-1.5 rounded hover:bg-blue-500/10 hover:text-blue-400 text-text-secondary transition-colors" title="Open">
        <ExternalLink size={12} />
      </button>
    )}
    {onEdit && item.contentType !== 'image' && (
      <button onClick={(e) => { e.stopPropagation(); onEdit(item.id); }} className="p-1.5 rounded hover:bg-accent-blue hover:text-white text-text-secondary transition-colors" title="Edit">
        <Pencil size={12} />
      </button>
    )}
    <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="p-1.5 rounded hover:bg-red-500/10 hover:text-red-400 text-text-secondary transition-colors" title="Delete">
      <Trash2 size={12} />
    </button>
  </div>
);

// --- Exported Components ---

export const DraggableCard = memo(({ item, onDelete, onEdit }: CardProps) => {
  const { copied, handleCopy, handleOpenUrl } = useCardActions(item);
  
  return (
    <Reorder.Item 
      value={item} 
      id={item.id} 
      whileDrag={{ scale: 1.02, backgroundColor: "#2a2d33", boxShadow: "0 8px 20px rgba(0,0,0,0.6)", zIndex: 50 }} 
      className="relative group h-full"
    >
      <motion.div 
        layout="position" 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ 
          opacity: 1, 
          scale: 1, 
          borderColor: copied ? "#3689e6" : "#2f3136" 
        }} 
        transition={{ duration: 0.2 }} 
        onClick={handleCopy} 
        className={cn("bg-bg-card border rounded-2xl p-3.5 cursor-pointer transition-colors duration-200 flex flex-col hover:shadow-lg hover:shadow-black/20 h-full min-h-[140px] relative overflow-hidden", !copied && "hover:border-accent-blue/30")}
      >
        <div className="absolute top-3 right-3 text-[#2f3136] group-hover:text-text-secondary cursor-grab active:cursor-grabbing p-1 transition-colors z-10" onPointerDown={(e) => e.preventDefault()}>
          <AlignJustify size={14} />
        </div>
        
        <CardActions item={item} onEdit={onEdit} onDelete={onDelete} handleOpenUrl={handleOpenUrl} className="right-9" />
        <CardHeader item={item} />
        <CardContent item={item} />
        <TagsList tags={item.tags} />
        <AnimatePresence>{copied && <CopyFeedback />}</AnimatePresence>
      </motion.div>
    </Reorder.Item>
  );
});

export const SimpleCard = memo(({ item, onDelete }: CardProps) => {
  const { copied, handleCopy, handleOpenUrl } = useCardActions(item);

  return (
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
      className={cn("group relative bg-bg-card border rounded-2xl p-3.5 cursor-pointer hover:shadow-lg transition-colors duration-200 flex flex-col h-full min-h-[120px] overflow-hidden", !copied && "hover:border-accent-blue/30")}
    >
      <CardActions item={item} onDelete={onDelete} handleOpenUrl={handleOpenUrl} className="right-3" />
      <CardHeader item={item} />
      <CardContent item={item} />
      <TagsList tags={item.tags} />
      <AnimatePresence>{copied && <CopyFeedback />}</AnimatePresence>
    </motion.div>
  );
});