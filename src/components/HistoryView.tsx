import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Virtuoso } from 'react-virtuoso';
import { Trash2, X, CheckSquare, Star, Image as ImageIcon, Link as LinkIcon, Code as CodeIcon } from 'lucide-react';
import { SimpleCard } from './Cards';
import { HistoryItem } from '../types';
import { cn } from './ui-elements';

type FilterType = 'all' | 'favorites' | 'images' | 'links' | 'code';

export interface HistoryViewProps {
    history: HistoryItem[];
    filteredHistory: HistoryItem[];
    onDelete: (id: string) => void;
    onContextMenu: (e: React.MouseEvent, id: string) => void;
    onToggleFavorite?: (id: string) => void;
    searchTerm?: string;
    // Selection props
    selectedItems?: Set<string>;
    onToggleSelect?: (id: string) => void;
    onClearSelection?: () => void;
    onDeleteSelected?: () => void;
    // Smart collections data
    smartCollections?: {
        favorites: HistoryItem[];
        images: HistoryItem[];
        links: HistoryItem[];
        code: HistoryItem[];
    };
}

// Filter pill component
const FilterPill = ({
    icon: Icon,
    label,
    count,
    isActive,
    onClick
}: {
    icon?: typeof Star;
    label: string;
    count?: number;
    isActive: boolean;
    onClick: () => void;
}) => (
    <button
        onClick={onClick}
        className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
            isActive
                ? "bg-accent-blue text-white"
                : "bg-white/5 text-text-secondary hover:text-white hover:bg-white/10"
        )}
    >
        {Icon && <Icon size={12} />}
        <span>{label}</span>
        {count !== undefined && count > 0 && (
            <span className={cn(
                "text-[10px] px-1 rounded-full",
                isActive ? "bg-white/20" : "bg-white/10"
            )}>
                {count}
            </span>
        )}
    </button>
);

export function HistoryView({
    history,
    filteredHistory,
    onDelete,
    onContextMenu,
    onToggleFavorite,
    searchTerm,
    selectedItems,
    onToggleSelect,
    onClearSelection,
    onDeleteSelected,
    smartCollections
}: HistoryViewProps) {
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');

    const selectionCount = selectedItems?.size || 0;
    const isSelectionMode = selectionCount > 0;

    // Get items based on active filter
    const getDisplayItems = () => {
        if (!smartCollections) return filteredHistory;

        switch (activeFilter) {
            case 'favorites':
                return smartCollections.favorites;
            case 'images':
                return smartCollections.images;
            case 'links':
                return smartCollections.links;
            case 'code':
                return smartCollections.code;
            default:
                return filteredHistory;
        }
    };

    const displayItems = getDisplayItems();
    const displayTitle = activeFilter === 'all' ? 'История' :
        activeFilter === 'favorites' ? 'Избранное' :
            activeFilter === 'images' ? 'Изображения' :
                activeFilter === 'links' ? 'Ссылки' : 'Сниппеты кода';

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto h-full flex flex-col relative">
            {/* Header with Filter Pills */}
            <div className="flex flex-col gap-4 mb-6 border-b border-border-subtle pb-4 shrink-0">
                <div className="flex items-end justify-between">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-1 tracking-tight">{displayTitle}</h2>
                        <div className="flex items-center gap-2 text-text-secondary text-sm">
                            <span>{displayItems.length} элементов</span>
                            {isSelectionMode && (
                                <span className="text-accent-blue">• {selectionCount} выбрано</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-2 flex-wrap">
                    <FilterPill
                        label="Все"
                        count={history.length}
                        isActive={activeFilter === 'all'}
                        onClick={() => setActiveFilter('all')}
                    />
                    <FilterPill
                        icon={Star}
                        label="Избранное"
                        count={smartCollections?.favorites.length}
                        isActive={activeFilter === 'favorites'}
                        onClick={() => setActiveFilter('favorites')}
                    />
                    <FilterPill
                        icon={ImageIcon}
                        label="Фото"
                        count={smartCollections?.images.length}
                        isActive={activeFilter === 'images'}
                        onClick={() => setActiveFilter('images')}
                    />
                    <FilterPill
                        icon={LinkIcon}
                        label="Ссылки"
                        count={smartCollections?.links.length}
                        isActive={activeFilter === 'links'}
                        onClick={() => setActiveFilter('links')}
                    />
                    <FilterPill
                        icon={CodeIcon}
                        label="Код"
                        count={smartCollections?.code.length}
                        isActive={activeFilter === 'code'}
                        onClick={() => setActiveFilter('code')}
                    />
                </div>
            </div>

            {/* Virtualized List */}
            {displayItems.length > 0 ? (
                <Virtuoso
                    data={displayItems}
                    overscan={200}
                    className="flex-1"
                    itemContent={(_index, item) => (
                        <div className="pb-3">
                            <SimpleCard
                                key={item.id}
                                item={item}
                                onDelete={onDelete}
                                onContextMenu={(e) => onContextMenu(e, item.id)}
                                onToggleFavorite={onToggleFavorite}
                                searchTerm={searchTerm}
                                isSelected={selectedItems?.has(item.id)}
                                onToggleSelect={onToggleSelect}
                            />
                        </div>
                    )}
                />
            ) : (
                <div className="text-center py-20 opacity-50 flex-1 flex items-center justify-center">
                    <p className="text-xl font-medium text-text-secondary">Пусто</p>
                </div>
            )}

            {/* Floating Selection Action Bar */}
            <AnimatePresence>
                {isSelectionMode && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-bg-card border border-border-subtle rounded-2xl shadow-2xl shadow-black/50 px-4 py-3 flex items-center gap-3 z-50"
                    >
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                            <CheckSquare size={16} className="text-accent-blue" />
                            <span>{selectionCount} выбрано</span>
                        </div>

                        <div className="w-px h-5 bg-border-subtle" />

                        <button
                            onClick={onDeleteSelected}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
                        >
                            <Trash2 size={14} />
                            Удалить
                        </button>

                        <button
                            onClick={onClearSelection}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/10 transition-colors"
                            title="Снять выделение"
                        >
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
