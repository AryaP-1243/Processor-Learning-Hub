

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Processor, LearningModule, QuizQuestion } from '../types';
import { LEARNING_MODULES, MOCK_QUIZ_QUESTIONS } from '../constants';
import * as geminiService from '../services/geminiService';
import { ArrowLeftIcon, BookOpenIcon, CodeIcon, CpuIcon, HelpCircleIcon, LightBulbIcon, MemoryStickIcon, ProjectsIcon, InterviewPrepIcon, SparklesIcon, CheckCircleIcon } from './Icons';
import MarkdownRenderer from './MarkdownRenderer';
import { CodeEditor } from './CodeEditor';
import DetailsView from './DetailsView';
import ArchitectureDiagram from './ArchitectureDiagram';
import ProjectsView from './ProjectsView';
import InterviewPrepView from './InterviewPrepView';
import IA32DeepDiveView from './IA32DeepDiveView';
import { useUserProgress } from '../contexts/UserProgressContext';

const ModuleSelector: React.FC<{ modules: LearningModule[], onSelect: (module: LearningModule) => void; activeModuleId: string | null, completedModules: string[] }> = ({ modules, onSelect, activeModuleId, completedModules }) => {
    const iconMap: { [key: string]: React.ElementType } = {
        architecture: CpuIcon,
        isa: BookOpenIcon,
        'ia32-deep-dive': BookOpenIcon,
        programming: CodeIcon,
        registers: MemoryStickIcon,
        memory: MemoryStickIcon,
        quiz: HelpCircleIcon,
        projects: ProjectsIcon,
        interview: InterviewPrepIcon,
    };
    
    return (
        <div className="relative">
            {/* Dashed line connecting the modules */}
            <div className="absolute left-[23px] top-[2.5rem] bottom-[2.5rem] w-0.5 bg-gray-600 border-l-2 border-dashed"></div>
            
            <div className="space-y-2">
            {modules.map(module => {
                const Icon = iconMap[module.id] || LightBulbIcon;
                const isActive = activeModuleId === module.id;
                const isCompleted = completedModules.includes(module.id);

                return (
                    <div key={module.id} className="relative z-10">
                        <button
                            onClick={() => onSelect(module)}
                            className="w-full flex items-center gap-3 text-left transition-colors group"
                        >
                             <div className={`w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isActive ? 'bg-blue-600 border-blue-400' : 'bg-gray-800 border-gray-600 group-hover:border-blue-500'}`}>
                                <Icon className={`w-6 h-6 transition-colors duration-300 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-blue-400'}`} />
                            </div>

                            <div className={`p-3 rounded-lg flex-grow transition-colors duration-300 ${isActive ? 'bg-blue-600/20' : 'group-hover:bg-gray-700'}`}>
                                <div className="flex items-center gap-2">
                                  <span className={`font-bold transition-colors duration-300 ${isActive ? 'text-white' : 'text-gray-200'}`}>{module.title}</span>
                                  {isCompleted && <CheckCircleIcon className="w-4 h-4 text-green-400" />}
                                </div>
                                <p className="text-xs text-gray-400">{module.description}</p>
                            </div>
                           
                            {module.isAiFeature && !isActive && (
                                <SparklesIcon className="w-4 h-4 text-yellow-300 flex-shrink-0 absolute top-2 right-2" />
                            )}
                        </button>
                    </div>
                );
            })}
            </div>
        </div>
    );
};

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center space-x-2">
        <div className="w-4 h-4 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-4 h-4 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-4 h-4 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        <span className="text-gray-300">AI is thinking...</span>
    </div>
);

const QuizView: React.FC<{ processor: Processor; onComplete: () => void }> = ({ processor, onComplete }) => {
    const [question, setQuestion] = useState<QuizQuestion | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const fetchQuestion = useCallback(async () => {
        setIsLoading(true);
        setQuestion(null);
        setSelectedAnswer(null);
        setIsSubmitted(false);
        try {
            const questionData = await geminiService.getQuizQuestion(processor);
            const parsed = JSON.parse(questionData);
            if (parsed && parsed.question && Array.isArray(parsed.options) && parsed.options.length > 0 && parsed.correctAnswer) {
                setQuestion(parsed);
            } else {
                const mockSet = MOCK_QUIZ_QUESTIONS[processor.id] || MOCK_QUIZ_QUESTIONS.default;
                setQuestion(mockSet[0]);
            }
        } catch (e) {
            console.error("Failed to parse quiz question, using mock.", e);
            const mockSet = MOCK_QUIZ_QUESTIONS[processor.id] || MOCK_QUIZ_QUESTIONS.default;
            setQuestion(mockSet[0]);
        } finally {
            setIsLoading(false);
        }
    }, [processor]);

    useEffect(() => {
        fetchQuestion();
    }, [fetchQuestion]);
    
    if (isLoading) return <LoadingSpinner />;
    if (!question) return <p className="text-center text-gray-400">Failed to load quiz question.</p>;

    const handleAnswer = (option: string) => {
        if (isSubmitted) return;
        setSelectedAnswer(option);
    };

    const handleSubmit = () => {
        if (!selectedAnswer) return;
        setIsSubmitted(true);
        onComplete();
    };

    return (
        <div className="animate-fade-in max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold mb-4 text-white">{question.question}</h3>
            <div className="space-y-3">
                {question.options.map((option, index) => {
                    const isCorrect = option === question.correctAnswer;
                    let buttonClass = 'bg-gray-700 hover:bg-gray-600';
                    if (isSubmitted) {
                        if (isCorrect) {
                            buttonClass = 'bg-green-600';
                        } else if (selectedAnswer === option) {
                            buttonClass = 'bg-red-600';
                        }
                    } else if (selectedAnswer === option) {
                        buttonClass = 'bg-blue-600';
                    }
                    return (
                        <button key={index} onClick={() => handleAnswer(option)} disabled={isSubmitted} className={`w-full text-left p-3 rounded-lg transition-colors text-white ${buttonClass}`}>
                            {option}
                        </button>
                    );
                })}
            </div>
            {isSubmitted && (
                <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
                    <p className={`font-bold ${selectedAnswer === question.correctAnswer ? 'text-green-400' : 'text-red-400'}`}>
                        {selectedAnswer === question.correctAnswer ? 'Correct!' : 'Incorrect.'}
                    </p>
                    <p className="mt-2 text-gray-300">{question.explanation}</p>
                </div>
            )}
            <div className="mt-6 flex justify-end">
                {isSubmitted ? (
                    <button onClick={fetchQuestion} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Next Question
                    </button>
                ) : (
                    <button onClick={handleSubmit} disabled={!selectedAnswer} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-500">
                        Submit
                    </button>
                )}
            </div>
        </div>
    );
};

interface LearningHubProps {
  processor: Processor;
  onBack: () => void;
}

const LearningHub: React.FC<LearningHubProps> = ({ processor, onBack }) => {
    const [activeModule, setActiveModule] = useState<LearningModule | null>(null);
    const { markModuleAsCompleted, getCompletedModules } = useUserProgress();
    const completedModules = getCompletedModules(processor.id);

    const availableModules = useMemo(() => {
        const ia32Processors = ['intel-80386', 'intel-80486', 'intel-pentium'];
        let modules = LEARNING_MODULES;

        if (!ia32Processors.includes(processor.id)) {
            modules = modules.filter(m => m.id !== 'ia32-deep-dive');
        }

        const order = ['architecture', 'ia32-deep-dive', 'isa', 'registers', 'memory', 'programming', 'projects', 'quiz', 'interview'];
        
        return [...modules].sort((a, b) => {
            const indexA = order.indexOf(a.id);
            const indexB = order.indexOf(b.id);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }, [processor.id]);

    useEffect(() => {
        const firstModule = availableModules[0] || null;
        setActiveModule(firstModule);
        if (firstModule && firstModule.id !== 'quiz') {
            markModuleAsCompleted(processor.id, firstModule.id);
        }
    }, [processor, availableModules, markModuleAsCompleted]);

    const handleModuleSelect = useCallback((module: LearningModule) => {
        setActiveModule(module);
        // Mark as complete on view, except for quiz which is marked on submission.
        // Also don't mark programming as complete until user interacts with it.
        if (module.id !== 'quiz' && module.id !== 'programming') {
            markModuleAsCompleted(processor.id, module.id);
        }
    }, [processor.id, markModuleAsCompleted]);

    const handleCodeInteraction = useCallback(() => {
        markModuleAsCompleted(processor.id, 'programming');
    }, [processor.id, markModuleAsCompleted]);

    const renderContent = () => {
        if (!activeModule) {
            return (
                <div className="text-center text-gray-400 flex items-center justify-center h-full">
                    <div>
                        <p className="text-lg font-semibold">Select a module to begin.</p>
                        <p>Explore the architecture, dive into the instruction set, or test your knowledge.</p>
                    </div>
                </div>
            );
        }
        
        switch (activeModule.id) {
            case 'architecture':
                return <ArchitectureDiagram processor={processor} />;
            case 'ia32-deep-dive':
                return <IA32DeepDiveView processor={processor} />;
            case 'isa':
                return <DetailsView processor={processor} moduleType="isa" />;
            case 'programming':
                return <CodeEditor processor={processor} onInteraction={handleCodeInteraction} />;
            case 'registers':
                return <DetailsView processor={processor} moduleType="registers" />;
            case 'memory':
                return <DetailsView processor={processor} moduleType="memory" />;
            case 'quiz':
                return <QuizView processor={processor} onComplete={() => markModuleAsCompleted(processor.id, 'quiz')} />;
            case 'projects':
                return <ProjectsView processor={processor} />;
            case 'interview':
                return <InterviewPrepView processor={processor} />;
            default:
                return (
                    <div className="p-4">
                        <h3 className="text-lg font-bold">{activeModule.title}</h3>
                        <p>{activeModule.description}</p>
                    </div>
                );
        }
    };
    
    return (
        <div className="animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6">
                <ArrowLeftIcon className="w-5 h-5" />
                Back to Selector
            </button>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="md:col-span-1">
                    <ModuleSelector 
                        modules={availableModules}
                        onSelect={handleModuleSelect} 
                        activeModuleId={activeModule?.id || null}
                        completedModules={completedModules}
                    />
                </div>
                <div className="md:col-span-3 bg-gray-800/50 rounded-xl p-6 min-h-[500px] border border-gray-700 shadow-lg shadow-blue-900/20">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default LearningHub;