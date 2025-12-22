// src/hooks/useSelectionMode.ts
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useStore } from '../store';

interface UseSelectionModeReturn {
    selectedItems: Set<string>;
    toggleSelectItem: (id: string) => void;
    clearSelection: () => void;
    deleteSelectedItems: () => void;
}

/**
 * Manages batch selection mode for history items.
 */
export function useSelectionMode(): UseSelectionModeReturn {
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const deleteHistoryItem = useStore((state) => state.deleteHistoryItem);

    const toggleSelectItem = useCallback((id: string) => {
        setSelectedItems((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedItems(new Set());
    }, []);

    const deleteSelectedItems = useCallback(() => {
        const count = selectedItems.size;
        if (count === 0) return;

        selectedItems.forEach((id) => {
            deleteHistoryItem(id);
        });

        setSelectedItems(new Set());
        toast.success(`Удалено ${count} элементов`);
    }, [selectedItems, deleteHistoryItem]);

    return {
        selectedItems,
        toggleSelectItem,
        clearSelection,
        deleteSelectedItems,
    };
}
