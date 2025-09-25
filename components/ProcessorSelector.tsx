
import React, { useState, useCallback, useMemo } from 'react';
import { Processor } from '../types';
import { CpuIcon, ArrowRightIcon, AlertCircleIcon } from './Icons';
import * as geminiService from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';

interface ProcessorSelectorProps {
  processors: Processor[];
  onSelect: (processor: Processor) => void;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center space-x-2 py-8">
        <div className="w-4 h-4 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-4 h-4 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-4 h-4 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        <span className="text-gray-300">AI is thinking...</span>
    </div>
);


const ProcessorCard: React.FC<{ 
    processor: Processor, 
    onSelect: (processor: Processor) => void, 
    onLearnMore: (processor: Processor) => void,
    isInteractive: boolean
}> = ({ processor, onSelect, onLearnMore, isInteractive }) => {
  const handleLearnMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card's onSelect from firing
    onLearnMore(processor);
  };
  
  return (
    <div
      onClick={() => onSelect(processor)}
      className="relative bg-gray-800 rounded-lg p-4 shadow-lg hover:shadow-blue-500/20 hover:border-blue-500 border-2 border-gray-700 transition-all duration-300 cursor-pointer flex flex-col justify-between transform hover:-translate-y-1"
    >
      {isInteractive && (
          <span className="absolute top-2 right-2 px-2 py-0.5 text-xs font-semibold text-cyan-300 bg-cyan-900/70 rounded-full border border-cyan-700/50">
            Simulator
          </span>
        )}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <CpuIcon className="w-6 h-6 text-blue-400 flex-shrink-0" />
          <h3 className="text-lg font-bold text-white truncate pr-20">{processor.name}</h3>
        </div>
        <p className="text-gray-400 text-sm line-clamp-2">{processor.description}</p>
      </div>
      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={handleLearnMoreClick}
          className="px-3 py-1 text-xs font-semibold text-gray-300 bg-gray-700 rounded-full hover:bg-gray-600 hover:text-white transition-colors"
        >
          Learn More
        </button>
        <div className="text-blue-400 font-semibold text-sm flex items-center gap-1">
          Explore <ArrowRightIcon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

const getYearFromName = (name: string): number | null => {
  const match = name.match(/\((\d{4})\)/);
  return match ? parseInt(match[1]) : null;
}

const eras = [
    { name: 'All', years: [0, 9999] },
    { name: 'The Pioneers (1970s)', years: [1970, 1979] },
    { name: 'The 16/32-bit Revolution (1980s)', years: [1980, 1989] },
    { name: 'The Multimedia & Internet Age (1990s)', years: [1990, 1999] },
    { name: 'The Multi-Core & Mobile Era (2000s)', years: [2000, 2009] },
    { name: 'The Age of SoCs, AI, & Many Cores (2010s-Present)', years: [2010, 2024] },
];

const ProcessorSelector: React.FC<ProcessorSelectorProps> = ({ processors, onSelect }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalProcessor, setModalProcessor] = useState<Processor | null>(null);
    const [modalContent, setModalContent] = useState('');
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEra, setSelectedEra] = useState('All');

    const handleLearnMore = useCallback(async (processor: Processor) => {
        setModalProcessor(processor);
        setIsModalOpen(true);
        setIsModalLoading(true);
        setModalContent('');
        const overview = await geminiService.getProcessorOverview(processor);
        setModalContent(overview);
        setIsModalLoading(false);
    }, []);

    const filteredProcessors = useMemo(() => {
        let result = processors;

        if (selectedEra !== 'All') {
            const era = eras.find(e => e.name === selectedEra);
            if (era) {
                result = result.filter(p => {
                    const year = getYearFromName(p.name);
                    return year && year >= era.years[0] && year <= era.years[1];
                });
            }
        }

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            result = result.filter(
                p =>
                    p.name.toLowerCase().includes(lowercasedTerm) ||
                    p.description.toLowerCase().includes(lowercasedTerm) ||
                    p.architecture.toLowerCase().includes(lowercasedTerm)
            );
        }

        return result;
    }, [processors, searchTerm, selectedEra]);
    
    const interactiveProcessors = new Set(['8085', 'risc-v', 'intel-8086', 'zilog-z80', 'mos-6502']);
    
    return (
        <div className="animate-fade-in">
            <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Explore Processors</h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-400">
                    Select a microprocessor to learn about its architecture, instruction set, and history.
                </p>
            </div>
            
            <div className="mb-8 p-4 bg-gray-800/50 rounded-lg border border-gray-700 sticky top-[65px] z-40 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row gap-4">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name, architecture, or description..."
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="flex-shrink-0 flex items-center gap-2 overflow-x-auto pb-2">
                        {eras.map(era => (
                            <button
                                key={era.name}
                                onClick={() => setSelectedEra(era.name)}
                                className={`px-3 py-1.5 text-sm font-semibold rounded-full whitespace-nowrap transition-colors ${selectedEra === era.name ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                            >
                                {era.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {filteredProcessors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProcessors.map(processor => (
                        <ProcessorCard
                            key={processor.id}
                            processor={processor}
                            onSelect={onSelect}
                            onLearnMore={handleLearnMore}
                            isInteractive={interactiveProcessors.has(processor.id) || processor.language === 'C'}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16">
                     <AlertCircleIcon className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                    <p className="text-gray-400 text-lg">No processors found matching your criteria.</p>
                </div>
            )}
            
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-700" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">{modalProcessor?.name}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">&times;</button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            {isModalLoading ? <LoadingSpinner /> : <MarkdownRenderer content={modalContent} />}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProcessorSelector;
