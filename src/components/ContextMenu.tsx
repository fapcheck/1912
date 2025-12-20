import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ContextMenuItem {
  label?: string;
  icon?: LucideIcon;
  onClick?: () => void;
  variant?: 'default' | 'danger';
  type?: 'item' | 'separator';
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    // Логика, чтобы меню не уходило за пределы экрана
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let newX = x;
      let newY = y;

      if (x + rect.width > window.innerWidth) {
        newX = window.innerWidth - rect.width - 10;
      }
      if (y + rect.height > window.innerHeight) {
        newY = window.innerHeight - rect.height - 10;
      }
      setPosition({ x: newX, y: newY });
    }
  }, [x, y]);

  // Закрытие при клике вне меню
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Закрытие при скролле
    const handleScroll = () => onClose();

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', onClose);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        style={{ top: position.y, left: position.x }}
        className="fixed z-[100] w-48 bg-[#232529] border border-[#2f3136] rounded-lg shadow-2xl py-1 overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Чтобы клик по меню не закрывал его сразу
      >
        {items.map((item, index) => {
          if (item.type === 'separator') {
            return <div key={index} className="h-[1px] bg-[#2f3136] my-1 mx-2" />;
          }

          return (
            <button
              key={index}
              onClick={() => {
                item.onClick?.();
                onClose();
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors text-left",
                item.variant === 'danger'
                  ? "text-red-400 hover:bg-red-400/10"
                  : "text-text-secondary hover:text-white hover:bg-[#2f3136]"
              )}
            >
              {item.icon && <item.icon size={14} />}
              {item.label}
            </button>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}