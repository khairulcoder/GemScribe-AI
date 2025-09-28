import React, { useState, useEffect, useCallback } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import type { HistoryItem } from './types';
import { Sidebar } from './components/Sidebar';
import { ContentGeneratorView } from './components/ContentGeneratorView';
import { ProjectView } from './components/ProjectView';
import { NewsletterModal } from './components/NewsletterModal';
import { ContentImproverView } from './components/ContentImproverView';

type Theme = 'light' | 'dark';
type View = 'generator' | 'project' | 'improver';

const SINGLE_PROJECT_ID = 'default_project';

export function App() {
  const [theme, setTheme] = useLocalStorage<Theme>('theme', 'light');
  const [view, setView] = useState<View>('generator');
  
  const [history, setHistory] = useLocalStorage<HistoryItem[]>('history', []);
  const [activeHistoryItem, setActiveHistoryItem] = useState<HistoryItem | null>(null);

  const [generationCount, setGenerationCount] = useLocalStorage<number>('generationCount', 0);
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);
  const [newsletterSubscribed, setNewsletterSubscribed] = useLocalStorage<boolean>('newsletterSubscribed', false);


  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  
  // Newsletter popup logic
  useEffect(() => {
    if (!newsletterSubscribed && generationCount >= 3) {
        setIsNewsletterOpen(true);
    }
  }, [generationCount, newsletterSubscribed]);

  const incrementGenerationCount = () => {
    setGenerationCount(prev => prev + 1);
  };

  const handleNewsletterSubmit = async (data: { name: string; email: string }) => {
    // This is a mock submission. In a real app, you'd send this to your backend.
    console.log("Newsletter submission:", data);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network request
    setNewsletterSubscribed(true);
    return { success: true };
    // Example error case: return { success: false, message: "This email is already subscribed." };
  };

  const saveHistory = useCallback((item: Omit<HistoryItem, 'id' | 'createdAt' | 'projectId'>) => {
    setHistory(prev => {
        const existingItemFromHistory = activeHistoryItem && prev.find(h => h.id === activeHistoryItem.id);
        
        if (existingItemFromHistory) {
            // Updating an item that was loaded from history
            return prev.map(h => h.id === existingItemFromHistory.id ? { ...h, generatedContent: item.generatedContent } : h);
        } else {
             // Creating a new history item after generation
            const newHistoryItem: HistoryItem = {
                ...item,
                projectId: SINGLE_PROJECT_ID, // All history belongs to one project now
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
            };
            // Prevent duplicates from rapid streaming updates
            const lastItem = prev[prev.length - 1];
            if (lastItem && lastItem.projectId === newHistoryItem.projectId && JSON.stringify(lastItem.params) === JSON.stringify(newHistoryItem.params) && (new Date().getTime() - new Date(lastItem.createdAt).getTime() < 5000)) {
                return [...prev.slice(0, -1), newHistoryItem];
            }
            return [...prev, newHistoryItem];
        }
    });

  }, [setHistory, activeHistoryItem]);
  
  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear all project history? This action cannot be undone.')) {
        setHistory([]);
    }
  };

  const handleViewHistoryItem = (item: HistoryItem) => {
    setActiveHistoryItem(item);
    setView('generator');
  };
  
  const clearActiveHistoryItem = useCallback(() => setActiveHistoryItem(null), []);

  const switchView = (newView: View) => {
    if (newView === 'generator' && view !== 'generator') {
        clearActiveHistoryItem();
    }
    setView(newView);
  }

  return (
    <div className="flex h-screen w-screen bg-background-light dark:bg-background-dark text-text-primary-light dark:text-text-primary-dark font-sans">
      <Sidebar
        theme={theme}
        setTheme={setTheme}
        view={view}
        setView={switchView}
      />
      <main className="flex-1 overflow-hidden transition-opacity duration-300">
        {view === 'generator' && (
          <ContentGeneratorView 
            onSaveHistory={saveHistory}
            activeHistoryItem={activeHistoryItem}
            clearActiveHistoryItem={clearActiveHistoryItem}
            incrementGenerationCount={incrementGenerationCount}
          />
        )}
         {view === 'improver' && (
          <ContentImproverView />
        )}
        {view === 'project' && (
          <ProjectView
            history={history} // Pass the entire history
            onViewHistoryItem={handleViewHistoryItem}
            onClearHistory={clearHistory}
          />
        )}
      </main>
      <NewsletterModal 
        isOpen={isNewsletterOpen}
        onClose={() => setIsNewsletterOpen(false)}
        onSubmit={handleNewsletterSubmit}
      />
    </div>
  );
}
