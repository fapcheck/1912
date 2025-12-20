// src/components/ui-elements.tsx
import { Globe, Code2, FileText, Plus, Image as ImageIcon } from 'lucide-react';
import { clsx, ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function TypeBadge({ type, text }: { type: string, text: string }) {
  const safeText = text || "";

  // 1. Color Smart Preview
  const isColor = /^#(?:[0-9a-fA-F]{3}){1,2}$/i.test(safeText.trim());

  if (type === 'color' || (type === 'text' && isColor)) {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-text-secondary bg-[#2f3136] px-2 py-0.5 rounded-full border border-white/5">
        <div className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: safeText.trim() }} />
        {isColor ? safeText.trim() : 'Color'}
      </span>
    );
  }

  // 2. URL Smart Preview (Favicon)
  if (type === 'url') {
    let domain = "";
    try {
      const urlStr = safeText.startsWith('http') ? safeText : `https://${safeText}`;
      const url = new URL(urlStr);
      domain = url.hostname;
    } catch (e) {
      domain = "";
    }

    return (
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-400/20">
        {domain ? (
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
            alt="icon"
            className="w-3 h-3 rounded-sm"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; ((e.target as HTMLElement).nextSibling as HTMLElement)?.classList.remove('hidden'); }}
          />
        ) : null}
        <Globe size={11} className={domain ? "hidden" : ""} />
        Link
      </span>
    );
  }

  if (type === 'code') return <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full border border-purple-400/20"><Code2 size={11} /> Code</span>;
  if (type === 'image') return <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20"><ImageIcon size={11} /> Image</span>;

  return <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-text-secondary bg-[#2f3136] px-2 py-0.5 rounded-full border border-white/5"><FileText size={11} /> Text</span>;
}

export function AddNoteButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full py-2 border border-dashed border-border-subtle rounded-lg flex items-center justify-center gap-2 text-text-secondary hover:text-accent-blue hover:border-accent-blue/50 hover:bg-accent-blue/5 transition-all group mb-3 opacity-60 hover:opacity-100">
      <Plus size={14} className="group-hover:scale-110 transition-transform" />
      <span className="text-[11px] font-medium">Добавить заметку</span>
    </button>
  );
}