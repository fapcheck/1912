// src/components/ui-elements.tsx
import { Globe, Code2, FileText, Plus, Image as ImageIcon } from 'lucide-react';
import { clsx, ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function TypeBadge({ type, text }: { type: string, text: string }) {
  if (type === 'url') return <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full"><Globe size={10} /> Link</span>;
  if (type === 'code') return <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full"><Code2 size={10} /> Code</span>;
  if (type === 'color') return (
    <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-text-secondary bg-[#2f3136] px-2 py-0.5 rounded-full">
      <div className="w-2.5 h-2.5 rounded-full border border-white/10" style={{ backgroundColor: text }} /> Color
    </span>
  );
  // 🆕 Добавили бейдж для картинки
  if (type === 'image') return <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full"><ImageIcon size={10} /> Image</span>;

  return <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-text-secondary bg-[#2f3136] px-2 py-0.5 rounded-full"><FileText size={10} /> Text</span>;
}

export function AddNoteButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full py-2 border border-dashed border-border-subtle rounded-lg flex items-center justify-center gap-2 text-text-secondary hover:text-accent-blue hover:border-accent-blue/50 hover:bg-accent-blue/5 transition-all group mb-3 opacity-60 hover:opacity-100">
        <Plus size={14} className="group-hover:scale-110 transition-transform" />
        <span className="text-[11px] font-medium">Добавить заметку</span>
    </button>
  );
}