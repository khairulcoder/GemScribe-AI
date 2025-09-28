
import React, { useState, useEffect, useRef } from 'react';
import type { GeneratedContentChunk } from '../types';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';
import { TrashIcon } from './icons/TrashIcon';
import { RefreshCwIcon } from './icons/RefreshCwIcon';

// Debounce hook to delay function execution
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

interface ContentCardProps {
  chunk: GeneratedContentChunk;
  onDelete: (id: string) => void;
  onUpdate: (id: string, newContent: string) => void;
  onRegenerate: (chunk: GeneratedContentChunk) => void;
  isRegenerating: boolean;
}

export const ContentCard: React.FC<ContentCardProps> = ({ chunk, onDelete, onUpdate, onRegenerate, isRegenerating }) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(chunk.content);
  const [isVisible, setIsVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const debouncedContent = useDebounce(content, 500); // 500ms debounce delay

  useEffect(() => {
    // Fade-in animation on mount
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setContent(chunk.content);
  }, [chunk.content]);

  useEffect(() => {
    if (debouncedContent !== chunk.content) {
      onUpdate(chunk.id, debouncedContent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedContent]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing, content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBlur = () => {
    setIsEditing(false);
    // onUpdate is now handled by the debounced effect
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  return (
    <div className={`relative bg-foreground-light dark:bg-foreground-dark p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {isRegenerating && (
        <div className="absolute inset-0 bg-background-light/80 dark:bg-background-dark/80 flex items-center justify-center rounded-lg z-10">
          <div className="flex items-center space-x-2 text-text-primary-light dark:text-text-primary-dark">
            <div className="w-5 h-5 border-2 border-primary-light dark:border-primary-dark border-t-transparent rounded-full animate-spin"></div>
            <span>Regenerating...</span>
          </div>
        </div>
      )}
      <div className={`transition-opacity ${isRegenerating ? 'opacity-30' : 'opacity-100'}`}>
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg text-primary-light dark:text-primary-dark">{chunk.title}</h3>
          <div className="flex items-center space-x-1">
            <button onClick={() => onRegenerate(chunk)} title="Regenerate" className="p-1.5 rounded-full text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-primary-light dark:hover:text-primary-dark transition-all duration-200 transform hover:scale-110">
              <RefreshCwIcon className="w-4 h-4" />
            </button>
            <button onClick={handleCopy} title="Copy" className="p-1.5 rounded-full text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-primary-light dark:hover:text-primary-dark transition-all duration-200 transform hover:scale-110">
              {copied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardIcon className="w-4 h-4" />}
            </button>
            <button onClick={() => onDelete(chunk.id)} title="Delete" className="p-1.5 rounded-full text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-red-500 transition-all duration-200 transform hover:scale-110">
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextChange}
            onBlur={handleBlur}
            autoFocus
            className="w-full p-2 bg-background-light dark:bg-background-dark border border-accent-light dark:border-accent-dark rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-accent-light dark:focus:ring-accent-dark text-text-primary-light dark:text-text-primary-dark"
            rows={5}
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="text-text-primary-light dark:text-text-primary-dark whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none cursor-pointer rounded-md p-2 -m-2 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
          >
            {content || <span className="text-text-secondary-light dark:text-text-secondary-dark">Click to edit...</span>}
          </div>
        )}
      </div>
    </div>
  );
};
