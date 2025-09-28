import React from 'react';
import { SunIcon } from './icons/SunIcon.tsx';
import { MoonIcon } from './icons/MoonIcon.tsx';
import { SparklesIcon } from './icons/SparklesIcon.tsx';
import { HistoryIcon } from './icons/HistoryIcon.tsx';
import { PencilIcon } from './icons/PencilIcon.tsx';

type Theme = 'light' | 'dark';
type View = 'generator' | 'project' | 'improver';

interface SidebarProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  view: View;
  setView: (view: View) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  theme, setTheme, view, setView
}) => {
  return (
    <div className="w-64 bg-foreground-light dark:bg-foreground-dark flex flex-col h-full border-r border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-primary-light dark:text-primary-dark flex items-center">
            <SparklesIcon className="w-6 h-6 mr-2"/>
            GemScribe AI
        </h1>
      </div>

      <nav className="p-4 space-y-2 flex-grow">
         <button onClick={() => setView('generator')} className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 transform hover:translate-x-1 ${view === 'generator' ? 'bg-primary-light dark:bg-primary-dark text-white shadow-md' : 'text-text-primary-light dark:text-text-primary-dark hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            <SparklesIcon className="w-5 h-5 mr-3"/> Generator
         </button>
          <button onClick={() => setView('improver')} className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 transform hover:translate-x-1 ${view === 'improver' ? 'bg-primary-light dark:bg-primary-dark text-white shadow-md' : 'text-text-primary-light dark:text-text-primary-dark hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            <PencilIcon className="w-5 h-5 mr-3"/> Content Improver
         </button>
         <button onClick={() => setView('project')} className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 transform hover:translate-x-1 ${view === 'project' ? 'bg-primary-light dark:bg-primary-dark text-white shadow-md' : 'text-text-primary-light dark:text-text-primary-dark hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
            <HistoryIcon className="w-5 h-5 mr-3"/> Project History
         </button>
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="w-full flex items-center justify-center p-2 rounded-md text-sm font-medium text-text-primary-light dark:text-text-primary-dark hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          {theme === 'light' ? <MoonIcon className="w-5 h-5 mr-2" /> : <SunIcon className="w-5 h-5 mr-2" />}
          <span>{theme === 'light' ? 'Dark' : 'Light'} Mode</span>
        </button>
      </div>
    </div>
  );
};