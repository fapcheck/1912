// src/components/HighlightText.tsx
import { memo } from 'react';

interface HighlightTextProps {
    text: string;
    highlight?: string;
    className?: string;
}

/**
 * Renders text with highlighted matching portions.
 * If no highlight term or no match, renders plain text.
 */
export const HighlightText = memo(({ text, highlight, className = '' }: HighlightTextProps) => {
    if (!highlight || !highlight.trim()) {
        return <span className={className}>{text}</span>;
    }

    const query = highlight.trim().toLowerCase();
    const textLower = text.toLowerCase();
    const index = textLower.indexOf(query);

    if (index === -1) {
        return <span className={className}>{text}</span>;
    }

    const before = text.slice(0, index);
    const match = text.slice(index, index + query.length);
    const after = text.slice(index + query.length);

    return (
        <span className={className}>
            {before}
            <mark className="bg-yellow-400/40 text-yellow-200 rounded px-0.5">{match}</mark>
            {after && <HighlightText text={after} highlight={highlight} />}
        </span>
    );
});
