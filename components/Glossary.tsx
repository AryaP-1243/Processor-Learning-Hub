
import React, { useState, useEffect, useMemo } from 'react';
import { GlossaryTerm } from '../types';
import * as geminiService from '../services/geminiService';
import { SpinnerIcon } from './Icons';

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center space-x-2 py-8">
        <div className="w-4 h-4 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-4 h-4 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-4 h-4 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        <span className="text-gray-300">AI is compiling glossary...</span>
    </div>
);

const Glossary: React.FC = () => {
    const [terms, setTerms] = useState<GlossaryTerm[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchTerms = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const responseString = await geminiService.getGlossaryTerms();
                const data = JSON.parse(responseString);
                if (data.error) {
                    setError(data.error);
                } else if (data.terms && Array.isArray(data.terms)) {
                    // Filter out invalid items before sorting to prevent crashes
                    const validTerms = data.terms.filter((item: any): item is GlossaryTerm => 
                        item && typeof item === 'object' && typeof item.term === 'string'
                    );
                    // Sort terms alphabetically
                    const sortedTerms = validTerms.sort((a: GlossaryTerm, b: GlossaryTerm) => a.term.localeCompare(b.term));
                    setTerms(sortedTerms);
                } else {
                    setError("AI returned an unexpected data format.");
                }
            } catch (e) {
                setError("Failed to fetch or parse glossary terms.");
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTerms();
    }, []);

    const filteredTerms = useMemo(() => {
        if (!searchTerm) return terms;
        const lowercasedFilter = searchTerm.toLowerCase();
        return terms.filter(item =>
            item.term.toLowerCase().includes(lowercasedFilter) ||
            item.definition.toLowerCase().includes(lowercasedFilter)
        );
    }, [searchTerm, terms]);
    
    const groupedTerms = useMemo(() => {
        return filteredTerms.reduce((acc, term) => {
            const firstLetter = term.term[0].toUpperCase();
            if (!acc[firstLetter]) {
                acc[firstLetter] = [];
            }
            acc[firstLetter].push(term);
            return acc;
        }, {} as Record<string, GlossaryTerm[]>);
    }, [filteredTerms]);

    return (
        <div className="max-w-7xl mx-auto animate-fade-in">
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Glossary of Terms</h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-400">
                    An AI-generated glossary of common computer architecture and processor terms.
                </p>
            </div>

            <div className="mb-8 max-w-2xl mx-auto">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search for a term (e.g., ALU, Pipelining)..."
                    className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
            </div>
            
            {isLoading && <LoadingSpinner />}
            {error && <p className="text-center text-red-400 mt-4">{error}</p>}
            
            {!isLoading && !error && Object.keys(groupedTerms).length > 0 && (
                <div className="space-y-12">
                    {Object.keys(groupedTerms).sort().map(letter => (
                         <div key={letter}>
                            <h2 className="text-3xl font-bold text-blue-300 border-b-2 border-blue-400/30 pb-2 mb-6 sticky top-[65px] bg-gray-900 py-2 z-10">{letter}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {groupedTerms[letter].map(item => (
                                    <div key={item.term} className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                                        <h3 className="text-xl font-bold text-white mb-2">{item.term}</h3>
                                        <p className="text-gray-400 text-sm">{item.definition}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!isLoading && !error && Object.keys(groupedTerms).length === 0 && (
                 <p className="text-center text-gray-400 py-8">No terms found matching your search.</p>
            )}
        </div>
    );
};

export default Glossary;