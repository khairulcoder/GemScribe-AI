
import React from 'react';
import type { HistoryItem } from '../types';
import { HistoryIcon } from './icons/HistoryIcon';

interface HistoryItemCardProps {
    item: HistoryItem;
    onView: (item: HistoryItem) => void;
}

export const HistoryItemCard: React.FC<HistoryItemCardProps> = ({ item, onView }) => {
    const { params, createdAt } = item;
    return (
        <div className="p-4 bg-foreground-light dark:bg-foreground-dark rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-primary-light dark:text-primary-dark">{params.productName}</p>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{params.contentType} for {params.country}</p>
                </div>
                <button 
                    onClick={() => onView(item)}
                    className="px-3 py-1.5 text-sm font-medium rounded-md bg-secondary-light dark:bg-secondary-dark text-white hover:opacity-90 transition-opacity"
                >
                    View
                </button>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 flex items-center text-xs text-text-secondary-light dark:text-text-secondary-dark">
                <HistoryIcon className="w-4 h-4 mr-2" />
                <span>{new Date(createdAt).toLocaleString()}</span>
            </div>
        </div>
    );
};
