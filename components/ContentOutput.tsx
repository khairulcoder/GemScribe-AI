
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Loader } from './Loader';
import { ErrorMessage } from './ErrorMessage';
import { ContentCard } from './ContentCard';
import type { GeneratedContentChunk, ContentGenerationParams } from '../types';
import { regenerateContentChunk } from '../services/geminiService';
import { RefreshCwIcon } from './icons/RefreshCwIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { DownloadIcon } from './icons/DownloadIcon';

interface ContentOutputProps {
    rawContent: string | null;
    isLoading: boolean;
    error: string | null;
    params: ContentGenerationParams | null;
    onRegenerateAll: () => void;
    onUpdateFullContent: (newContent: string) => void;
}

const parseContent = (rawContent: string): GeneratedContentChunk[] => {
    if (!rawContent) return [];
    
    const sections = rawContent.split(/(?=###\s)/).filter(s => s.trim() !== '');
    if (sections.length <= 1 && rawContent.trim()) {
        return [{ id: `chunk-0`, title: 'Generated Content', content: rawContent.trim() }];
    }

    return sections.map((section, index) => {
        const lines = section.trim().split('\n');
        const title = lines[0].replace('###', '').trim();
        const content = lines.slice(1).join('\n').trim();
        return { id: `chunk-${index}`, title, content };
    });
};

export const ContentOutput: React.FC<ContentOutputProps> = ({ rawContent, isLoading, error, params, onRegenerateAll, onUpdateFullContent }) => {
    const [chunks, setChunks] = useState<GeneratedContentChunk[]>([]);
    const [regeneratingChunkId, setRegeneratingChunkId] = useState<string | null>(null);
    const [copiedAll, setCopiedAll] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setChunks(parseContent(rawContent || ''));
    }, [rawContent]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const updateFullContentFromChunks = useCallback((updatedChunks: GeneratedContentChunk[]) => {
        const newRawContent = updatedChunks.map(c => `### ${c.title}\n\n${c.content}`).join('\n\n');
        onUpdateFullContent(newRawContent);
    }, [onUpdateFullContent]);

    const handleDeleteChunk = (id: string) => {
        const newChunks = chunks.filter(chunk => chunk.id !== id);
        setChunks(newChunks);
        updateFullContentFromChunks(newChunks);
    };

    const handleUpdateChunk = (id: string, newContent: string) => {
        const newChunks = chunks.map(chunk => chunk.id === id ? { ...chunk, content: newContent } : chunk);
        setChunks(newChunks);
        updateFullContentFromChunks(newChunks);
    };

    const handleRegenerateChunk = async (chunkToRegen: GeneratedContentChunk) => {
        if (!params) return;
        setRegeneratingChunkId(chunkToRegen.id);
        try {
            const newContent = await regenerateContentChunk(params, chunkToRegen);
            const newChunks = chunks.map(c => c.id === chunkToRegen.id ? { ...c, content: newContent } : c);
            setChunks(newChunks);
            updateFullContentFromChunks(newChunks);
        } catch (e) {
            // Handle error, maybe show a toast
            console.error("Failed to regenerate chunk", e);
        } finally {
            setRegeneratingChunkId(null);
        }
    };
    
    const handleCopyAll = () => {
        const allContent = chunks.map(c => `### ${c.title}\n\n${c.content}`).join('\n\n');
        navigator.clipboard.writeText(allContent);
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
    };
    
    const handleExport = (format: 'txt' | 'md' | 'html') => {
        if (!params?.productName || chunks.length === 0) return;

        let fileContent = '';
        let mimeType = '';
        
        const sanitizedProductName = params.productName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${sanitizedProductName}_content.${format}`;

        switch (format) {
            case 'txt':
                fileContent = chunks.map(c => `${c.title}\n\n${c.content}`).join('\n\n---\n\n');
                mimeType = 'text/plain;charset=utf-8';
                break;
            case 'md':
                fileContent = chunks.map(c => `### ${c.title}\n\n${c.content}`).join('\n\n');
                mimeType = 'text/markdown;charset=utf-8';
                break;
            case 'html':
                const bodyContent = chunks.map(c => {
                    const titleHtml = `<h3>${c.title}</h3>`;
                    const contentHtml = `<p>${c.content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
                    return `${titleHtml}\n${contentHtml}`;
                }).join('\n<hr>\n');
                fileContent = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${params.productName}</title>\n  <style>body { font-family: sans-serif; line-height: 1.6; padding: 1em 2em; max-width: 800px; margin: auto; } h3 { color: #4f46e5; } hr { border: 0; border-top: 1px solid #e2e8f0; margin: 2em 0; }</style>\n</head>\n<body>\n${bodyContent}\n</body>\n</html>`;
                mimeType = 'text/html;charset=utf-8';
                break;
        }
        
        const blob = new Blob([fileContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    
        setIsExportMenuOpen(false);
    };

    const memoizedChunks = useMemo(() => {
        return chunks.map(chunk => (
            <ContentCard
                key={chunk.id}
                chunk={chunk}
                onDelete={handleDeleteChunk}
                onUpdate={handleUpdateChunk}
                onRegenerate={handleRegenerateChunk}
                isRegenerating={regeneratingChunkId === chunk.id}
            />
        ));
    }, [chunks, regeneratingChunkId]); // eslint-disable-line react-hooks/exhaustive-deps

    if (isLoading) {
        return <div className="flex items-center justify-center h-full"><Loader /></div>;
    }

    if (error) {
        return <ErrorMessage message={error} />;
    }

    if (!rawContent) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-text-secondary-light dark:text-text-secondary-dark">
                <SparklesIcon className="w-16 h-16 mb-4 text-gray-400 dark:text-gray-600" />
                <h2 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark">Ready to create?</h2>
                <p>Fill out the form to generate your content.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
             <div className="flex items-center justify-end space-x-2">
                <div className="relative" ref={exportMenuRef}>
                    <button 
                        onClick={() => setIsExportMenuOpen(prev => !prev)} 
                        className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-secondary-light dark:bg-secondary-dark text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                        disabled={chunks.length === 0}
                    >
                        <DownloadIcon className="w-4 h-4 mr-1.5" />
                        Export
                    </button>
                    {isExportMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-background-light dark:bg-background-dark border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 animate-fade-in-sm">
                            <ul className="py-1">
                                <li>
                                    <button onClick={() => handleExport('txt')} className="w-full text-left px-4 py-2 text-sm text-text-primary-light dark:text-text-primary-dark hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                        as Text (.txt)
                                    </button>
                                </li>
                                <li>
                                    <button onClick={() => handleExport('md')} className="w-full text-left px-4 py-2 text-sm text-text-primary-light dark:text-text-primary-dark hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                        as Markdown (.md)
                                    </button>
                                </li>
                                <li>
                                    <button onClick={() => handleExport('html')} className="w-full text-left px-4 py-2 text-sm text-text-primary-light dark:text-text-primary-dark hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                        as HTML (.html)
                                    </button>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
                <button onClick={handleCopyAll} disabled={chunks.length === 0} className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-secondary-light dark:bg-secondary-dark text-white hover:opacity-90 transition-opacity disabled:opacity-50">
                    {copiedAll ? <CheckIcon className="w-4 h-4 mr-1.5"/> : <ClipboardIcon className="w-4 h-4 mr-1.5" />}
                    {copiedAll ? 'Copied!' : 'Copy All'}
                </button>
                <button onClick={onRegenerateAll} className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-primary-light dark:bg-primary-dark text-white hover:opacity-90 transition-opacity">
                    <RefreshCwIcon className="w-4 h-4 mr-1.5" />
                    Regenerate All
                </button>
            </div>
            <div className="space-y-4">
                {memoizedChunks}
            </div>
        </div>
    );
};

const style = document.createElement('style');
style.innerHTML = `
  @keyframes fade-in-sm {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  .animate-fade-in-sm {
    animation: fade-in-sm 0.1s ease-out forwards;
    transform-origin: top right;
  }
`;
document.head.appendChild(style);
