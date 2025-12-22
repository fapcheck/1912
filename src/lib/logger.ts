// src/lib/logger.ts

/**
 * Simple logging utility that only logs in development mode.
 * Provides consistent logging interface across the application.
 */

const isDev = import.meta.env.DEV;

export const logger = {
    debug: (...args: unknown[]): void => {
        if (isDev) {
            console.log('[DEBUG]', ...args);
        }
    },

    info: (...args: unknown[]): void => {
        if (isDev) {
            console.info('[INFO]', ...args);
        }
    },

    warn: (...args: unknown[]): void => {
        if (isDev) {
            console.warn('[WARN]', ...args);
        }
    },

    error: (...args: unknown[]): void => {
        if (isDev) {
            console.error('[ERROR]', ...args);
        }
    },
};
