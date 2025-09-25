
import React, { useMemo } from 'react';
import { Processor } from '../types';
import { ArrowRightIcon } from './Icons';

interface TimelineProps {
    processors: Processor[];
    onSelectProcessor: (processor: Processor) => void;
}

const getYearFromName = (name: string): number | null => {
    const match = name.match(/\((\d{4})\)/);
    return match ? parseInt(match[1], 10) : null;
};

const eras = [
    { name: 'The Pioneers (1970s)', years: [1970, 1979] },
    { name: 'The 16/32-bit Revolution (1980s)', years: [1980, 1989] },
    { name: 'The Multimedia & Internet Age (1990s)', years: [1990, 1999] },
    { name: 'The Multi-Core & Mobile Era (2000s)', years: [2000, 2009] },
    { name: 'The Age of SoCs, AI, & Many Cores (2010s-Present)', years: [2010, 2024] },
];

const TimelineCard: React.FC<{ processor: Processor; onSelect: (p: Processor) => void; isLeft: boolean }> = ({ processor, onSelect, isLeft }) => {
    const year = getYearFromName(processor.name);

    return (
        <div className={`relative mb-8 w-1/2 ${isLeft ? 'pr-8 self-start' : 'pl-8 self-end'}`}>
            <div
                className={`absolute top-5 w-4 h-4 bg-blue-500 rounded-full border-4 border-gray-900 ${isLeft ? '-right-2' : '-left-2'}`}
            ></div>
            <div 
                onClick={() => onSelect(processor)}
                className="bg-gray-800 p-4 rounded-lg shadow-lg border-2 border-gray-700 hover:border-blue-500 transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
            >
                 <div className="flex items-center justify-between mb-2">
                    <h3 className="text-md font-bold text-white truncate">{processor.name.replace(/\s\(\d{4}\)/, '')}</h3>
                    {year && <span className="text-xs font-semibold px-2 py-1 bg-gray-700 text-gray-300 rounded-full">{year}</span>}
                </div>
                <p className="text-gray-400 text-sm line-clamp-2 mb-3">{processor.description}</p>
                <div className="text-right text-blue-400 font-semibold text-xs flex items-center justify-end gap-1">
                    Explore <ArrowRightIcon className="w-3 h-3" />
                </div>
            </div>
        </div>
    );
};


const Timeline: React.FC<TimelineProps> = ({ processors, onSelectProcessor }) => {
    const processorsByEra = useMemo(() => {
        const sortedProcessors = [...processors]
            .map(p => ({ ...p, year: getYearFromName(p.name) }))
            .filter(p => p.year !== null)
            .sort((a, b) => a.year! - b.year!);

        return eras.map(era => ({
            ...era,
            processors: sortedProcessors.filter(p => p.year! >= era.years[0] && p.year! <= era.years[1]),
        })).filter(era => era.processors.length > 0);
    }, [processors]);

    let processorCount = 0;

    return (
        <div className="animate-fade-in max-w-5xl mx-auto">
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Processor Timeline</h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-400">
                    A chronological journey through the history of microprocessors.
                </p>
            </div>

            <div className="relative">
                <div className="absolute top-0 left-1/2 -ml-px h-full w-0.5 bg-gray-700" aria-hidden="true"></div>
                
                <div className="flex flex-col items-center">
                    {processorsByEra.map(era => (
                        <React.Fragment key={era.name}>
                            <div className="my-8 z-10">
                                <h2 className="text-2xl font-bold bg-gray-900 px-4 py-2 border-2 border-gray-700 rounded-lg text-blue-300">{era.name}</h2>
                            </div>
                            {era.processors.map(processor => {
                                const isLeft = processorCount % 2 === 0;
                                processorCount++;
                                return <TimelineCard key={processor.id} processor={processor} onSelect={onSelectProcessor} isLeft={isLeft} />;
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Timeline;
