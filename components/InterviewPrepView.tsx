import React, { useState, useEffect } from 'react';
import { Processor, InterviewQuestion } from '../types';
import * as geminiService from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center space-x-2 py-8">
        <div className="w-4 h-4 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-4 h-4 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-4 h-4 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        <span className="text-gray-300">AI is preparing questions...</span>
    </div>
);

const QuestionCard: React.FC<{ item: InterviewQuestion }> = ({ item }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg">
            <button
                className="w-full p-4 text-left flex justify-between items-center"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h3 className="text-md font-semibold text-white">{item.question}</h3>
                <svg
                    className={`w-5 h-5 text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && (
                <div className="p-4 border-t border-gray-700">
                    <div className="prose prose-invert max-w-none prose-sm">
                         <MarkdownRenderer content={item.answer} />
                    </div>
                </div>
            )}
        </div>
    );
};

const InterviewPrepView: React.FC<{ processor: Processor }> = ({ processor }) => {
    const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchQuestions = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const responseString = await geminiService.getInterviewQuestions(processor);
                const data = JSON.parse(responseString);
                if (data.error) {
                    setError(data.error);
                } else if (data.questions && Array.isArray(data.questions)) {
                    setQuestions(data.questions);
                } else {
                    setError("AI returned an unexpected data format.");
                }
            } catch (e) {
                setError("Failed to fetch or parse interview questions.");
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuestions();
    }, [processor]);

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return <p className="text-center text-red-400">Error: {error}</p>;
    }
    
    if (questions.length === 0) {
        return <p className="text-center text-gray-500">No interview questions could be generated for this processor.</p>;
    }

    return (
        <div className="animate-fade-in max-w-4xl mx-auto space-y-4">
            {questions.map((q, i) => (
                <QuestionCard key={i} item={q} />
            ))}
        </div>
    );
};

export default InterviewPrepView;
