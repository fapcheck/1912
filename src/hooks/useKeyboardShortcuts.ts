// src/hooks/useKeyboardShortcuts.ts
import { useEffect, RefObject } from 'react';
import { APP_CONFIG } from '../constants';

interface UseKeyboardShortcutsOptions {
    searchInputRef: RefObject<HTMLInputElement | null>;
    onToggleFocusMode: () => void;
    onClearSearch: () => void;
}

/**
 * Handles global keyboard shortcuts for the application.
 */
export function useKeyboardShortcuts({
    searchInputRef,
    onToggleFocusMode,
    onClearSearch,
}: UseKeyboardShortcutsOptions): void {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            const isMod = e.metaKey || e.ctrlKey;

            if (isMod && e.key === APP_CONFIG.KEYBOARD_SHORTCUTS.SEARCH) {
                e.preventDefault();
                searchInputRef.current?.focus();
            }

            if (isMod && e.key === APP_CONFIG.KEYBOARD_SHORTCUTS.FOCUS_MODE) {
                e.preventDefault();
                onToggleFocusMode();
            }

            if (e.key === 'Escape') {
                searchInputRef.current?.blur();
                onClearSearch();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [searchInputRef, onToggleFocusMode, onClearSearch]);
}
