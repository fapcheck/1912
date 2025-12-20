// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ContentType } from '../types';

// --- CSS Utils ---
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Binary Utils ---
/**
 * Converts a Uint8Array to a Base64 string.
 * Used for image clipboard operations.
 */
export function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return window.btoa(binary);
}

// --- Content Detection Utils ---

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function detectContentType(text: string): ContentType {
  if (!text) return 'text';
  const trimmed = text.trim();

  // 1. URL Check
  if ((trimmed.startsWith('http://') || trimmed.startsWith('https://')) && isSafeUrl(trimmed)) {
    return 'url';
  }

  // 2. Color Check (Hex, RGB, HSL)
  if (/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(trimmed)) return 'color';
  if (trimmed.startsWith('rgb(') || trimmed.startsWith('rgba(')) return 'color';
  if (trimmed.startsWith('hsl(') || trimmed.startsWith('hsla(')) return 'color';

  // 3. Code Check (Expanded for multi-language support)
  const codeKeywords = [
    'function', 'const ', 'let ', 'var ', 'import ',
    'export ', 'npm ', 'class ', 'interface ', '{}', '=>',
    '<div>', 'console.log', 'return ', '<?php', 'public static',
    '#include', 'fn ', 'impl ', 'struct ', 'def ', 'package ',
    'go mod', 'pip install', 'cargo '
  ];

  // Heuristic: explicit keywords OR structural symbols common in code
  if (
    codeKeywords.some(kw => trimmed.includes(kw)) ||
    (trimmed.includes(';') && trimmed.includes('{') && trimmed.includes('}')) ||
    (trimmed.startsWith('<') && trimmed.endsWith('>')) // XML/HTML-like
  ) {
    return 'code';
  }

  return 'text';
}