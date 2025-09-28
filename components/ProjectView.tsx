import React, { useState, useMemo } from 'react';
import type { HistoryItem } from '../types';
import { HistoryItemCard } from './HistoryItemCard';
import { HistoryIcon } from './icons/HistoryIcon';
import { TrashIcon } from './icons/TrashIcon';

interface ProjectViewProps {
    history: HistoryItem[];
    onViewHistoryItem: (item: HistoryItem) => void;
    onClearHistory: () => void;
}

export const ProjectView: React.FC<ProjectViewProps> = ({ history, onViewHistoryItem, onClearHistory }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredHistory = useMemo(() => {
        const sortedHistory = [...history].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (!searchTerm) {
            return sortedHistory;
        }
        return sortedHistory.filter(item =>
            item.params.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.params.contentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.generatedContent.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [history, searchTerm]);

    return (
        <div className="p-4 md:p-6 h-full flex flex-col">
            <h2 className="text-2xl font-bold mb-4 text-text-primary-light dark:text-text-primary-dark">Project History</h2>
            <div className="flex justify-between items-center mb-4 gap-4">
                <input
                    type="text"
                    placeholder="Search history..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-lg bg-foreground-light dark:bg-foreground-dark border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-light focus:border-primary-light dark:focus:ring-primary-dark dark:focus:border-primary-dark text-text-primary-light dark:text-text-primary-dark"
                />
                {history.length > 0 && (
                    <button
                        onClick={onClearHistory}
                        className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20 dark:hover:bg-red-500/30 transition-colors"
                        title="Clear all history"
                    >
                        <TrashIcon className="w-4 h-4 mr-2" />
                        Clear History
                    </button>
                )}
            </div>
            {filteredHistory.length > 0 ? (
                <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                    {filteredHistory.map(item => (
                        <HistoryItemCard key={item.id} item={item} onView={onViewHistoryItem} />
                    ))}
                </div>
            ) : (
                <div className="flex-grow flex items-center justify-center text-center text-text-secondary-light dark:text-text-secondary-dark">
                    <div>
                        <HistoryIcon className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                        <h3 className="text-xl font-semibold text-text-primary-light dark:text-text-primary-dark">No History Found</h3>
                        <p>Generate some content to see your history here.</p>
                    </div>
                </div>
            )}
        </div>
    );
};