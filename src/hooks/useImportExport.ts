// src/hooks/useImportExport.ts
import { useStore } from '../store';
import { logger } from '../lib/logger';

interface UseImportExportReturn {
    importData: (e: React.ChangeEvent<HTMLInputElement>) => void;
    exportData: () => void;
}

/**
 * Handles import/export functionality for backup and restore.
 */
export function useImportExport(): UseImportExportReturn {
    const { history, projects, globalTags, setHistory, setProjects, setGlobalTags } = useStore();

    const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                if (!data || !Array.isArray(data.history) || !Array.isArray(data.projects)) {
                    throw new Error('Invalid format');
                }
                if (data.history) setHistory(data.history);
                if (data.projects) setProjects(data.projects);
                if (Array.isArray(data.globalTags)) setGlobalTags(data.globalTags);
                alert('✅ Данные восстановлены!');
            } catch (err) {
                logger.error('Import failed:', err);
                alert('❌ Ошибка файла');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const exportData = () => {
        const blob = new Blob(
            [
                JSON.stringify(
                    {
                        history,
                        projects,
                        globalTags,
                        version: 2,
                        date: new Date().toISOString(),
                    },
                    null,
                    2
                ),
            ],
            { type: 'application/json' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return { importData, exportData };
}
