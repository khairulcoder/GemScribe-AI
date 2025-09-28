import React, { useState, useCallback, useEffect } from 'react';
import { ContentForm } from './ContentForm.tsx';
import { ContentOutput } from './ContentOutput.tsx';
import type { ContentGenerationParams, HistoryItem } from '../types.ts';
import { streamGeneratedContent } from '../services/geminiService.ts';

interface ContentGeneratorViewProps {
  onSaveHistory: (item: Omit<HistoryItem, 'id' | 'createdAt' | 'projectId'>) => void;
  activeHistoryItem: HistoryItem | null;
  clearActiveHistoryItem: () => void;
  incrementGenerationCount: () => void;
}

export const ContentGeneratorView: React.FC<ContentGeneratorViewProps> = ({ onSaveHistory, activeHistoryItem, clearActiveHistoryItem, incrementGenerationCount }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [currentParams, setCurrentParams] = useState<ContentGenerationParams | null>(null);

  useEffect(() => {
    // When an active history item is passed, populate the view
    if (activeHistoryItem) {
      setGeneratedContent(activeHistoryItem.generatedContent);
      setCurrentParams(activeHistoryItem.params);
    } else {
      // Optional: Clear fields when there's no active item, or handle as needed
      // setGeneratedContent(null);
      // setCurrentParams(null);
    }
  }, [activeHistoryItem]);


  const handleGenerate = useCallback(async (params: ContentGenerationParams) => {
    setIsLoading(true);
    setError(null);
    setCurrentParams(params);
    setGeneratedContent(''); // Clear previous content for streaming
    
    try {
      incrementGenerationCount();
      const finalContent = await streamGeneratedContent(params, (chunk) => {
        setGeneratedContent(prev => (prev || '') + chunk);
      });
      onSaveHistory({ params, generatedContent: finalContent });
      clearActiveHistoryItem();
    } catch (e: any) {
      setError(e.message || "An unknown error occurred.");
      setGeneratedContent(null);
    } finally {
      setIsLoading(false);
    }
  }, [onSaveHistory, clearActiveHistoryItem, incrementGenerationCount]);
  
  const handleUpdateFullContent = (newContent: string) => {
    setGeneratedContent(newContent);
    if(currentParams){
        onSaveHistory({ params: currentParams, generatedContent: newContent });
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      <div className="lg:overflow-y-auto p-4 lg:p-1 rounded-lg">
        <div className="p-6 bg-background-light dark:bg-background-dark rounded-lg">
          <h2 className="text-2xl font-bold mb-6 text-text-primary-light dark:text-text-primary-dark">Content Generator</h2>
          <ContentForm 
            onSubmit={handleGenerate} 
            isLoading={isLoading}
            initialParams={activeHistoryItem?.params}
          />
        </div>
      </div>
      <div className="bg-foreground-light dark:bg-foreground-dark rounded-lg lg:overflow-y-auto p-4 lg:p-6 border border-gray-200 dark:border-gray-700">
        <ContentOutput
          rawContent={generatedContent}
          isLoading={isLoading}
          error={error}
          params={currentParams}
          onRegenerateAll={() => currentParams && handleGenerate(currentParams)}
          onUpdateFullContent={handleUpdateFullContent}
        />
      </div>
    </div>
  );
};