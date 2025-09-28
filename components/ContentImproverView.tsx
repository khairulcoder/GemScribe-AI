
import React, { useState, useCallback } from 'react';
import { streamImprovedContent } from '../services/geminiService';
import { Selector } from './Selector';
import { Loader } from './Loader';
import { ErrorMessage } from './ErrorMessage';
import { TONES, IMPROVEMENT_ACTIONS } from '../constants/constants';
import { SparklesIcon } from './icons/SparklesIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';

export const ContentImproverView: React.FC = () => {
    const [originalText, setOriginalText] = useState('');
    const [improvedText, setImprovedText] = useState('');
    const [improvementAction, setImprovementAction] = useState(IMPROVEMENT_ACTIONS[0]);
    const [tone, setTone] = useState(TONES[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleImprove = useCallback(async () => {
        if (!originalText.trim()) return;

        setIsLoading(true);
        setError(null);
        setImprovedText('');

        try {
            await streamImprovedContent(originalText, improvementAction, tone, (chunk) => {
                setImprovedText(prev => prev + chunk);
            });
        } catch (e: any) {
            setError(e.message || "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [originalText, improvementAction, tone]);
    
    const handleCopy = () => {
        if (!improvedText) return;
        navigator.clipboard.writeText(improvedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-6">
            <h2 className="text-2xl font-bold mb-4 text-text-primary-light dark:text-text-primary-dark">Content Improver</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-grow overflow-hidden">
                {/* Input Column */}
                <div className="flex flex-col space-y-4">
                    <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">Original Content</h3>
                    <textarea
                        value={originalText}
                        onChange={(e) => setOriginalText(e.target.value)}
                        placeholder="Paste your content here..."
                        className="w-full flex-grow bg-foreground-light dark:bg-foreground-dark border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-3 focus:outline-none focus:ring-primary-light focus:border-primary-light dark:focus:ring-primary-dark dark:focus:border-primary-dark text-text-primary-light dark:text-text-primary-dark resize-none"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Selector
                            label="Action"
                            name="improvementAction"
                            value={improvementAction}
                            onChange={(e) => setImprovementAction(e.target.value)}
                            options={IMPROVEMENT_ACTIONS}
                        />
                        {improvementAction === 'Change Tone' && (
                            <Selector
                                label="New Tone"
                                name="tone"
                                value={tone}
                                onChange={(e) => setTone(e.target.value)}
                                options={TONES}
                            />
                        )}
                    </div>
                    <button
                        onClick={handleImprove}
                        disabled={isLoading || !originalText.trim()}
                        className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-light dark:bg-primary-dark hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    >
                        {isLoading ? (
                            <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> Improving...</>
                        ) : (
                            <><SparklesIcon className="w-5 h-5 mr-2" /> Improve Content</>
                        )}
                    </button>
                </div>

                {/* Output Column */}
                <div className="flex flex-col bg-foreground-light dark:bg-foreground-dark rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">Improved Content</h3>
                        <button onClick={handleCopy} title="Copy" disabled={!improvedText || isLoading} className="p-2 rounded-full text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-primary-light dark:hover:text-primary-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                            {copied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <ClipboardIcon className="w-5 h-5" />}
                        </button>
                    </div>
                    <div className="p-4 flex-grow overflow-y-auto">
                        {isLoading && !improvedText && <div className="flex items-center justify-center h-full"><Loader text="Improving..." /></div>}
                        {error && <ErrorMessage message={error} />}
                        {!isLoading && !error && !improvedText && (
                             <div className="flex flex-col items-center justify-center h-full text-center text-text-secondary-light dark:text-text-secondary-dark">
                                <SparklesIcon className="w-12 h-12 mb-4 text-gray-400 dark:text-gray-600" />
                                <p>Your improved content will appear here.</p>
                            </div>
                        )}
                        {improvedText && (
                            <div className="whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
                                {improvedText}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
