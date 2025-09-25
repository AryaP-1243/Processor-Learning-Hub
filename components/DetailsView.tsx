import React, { useState, useEffect, useMemo } from 'react';
import { Processor, ArchitectureRegister, ArchitectureMemoryRegion, InstructionCategory, ArchitectureInstruction } from '../types';
import * as geminiService from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';
import { ArrowRightIcon } from './Icons';

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center space-x-2 py-4">
        <div className="w-4 h-4 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-4 h-4 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-4 h-4 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        <span className="text-gray-300">AI is fetching details...</span>
    </div>
);

interface DetailsViewProps {
    processor: Processor;
    moduleType: 'registers' | 'memory' | 'isa';
}

const DetailsView: React.FC<DetailsViewProps> = ({ processor, moduleType }) => {
    const [overview, setOverview] = useState('');
    const [details, setDetails] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // State for ISA view
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInstruction, setSelectedInstruction] = useState<ArchitectureInstruction | null>(null);


    useEffect(() => {
        const fetchDetails = async () => {
            setIsLoading(true);
            setError(null);
            setDetails([]);
            setOverview('');
            setSearchTerm('');
            setSelectedInstruction(null);

            const moduleTitle = moduleType === 'registers' ? 'Registers' : moduleType === 'memory' ? 'Memory Organization' : 'Instruction Set (ISA)';

            try {
                const responseString = await geminiService.getProcessorDetails(moduleTitle, processor);
                const data = JSON.parse(responseString);
                
                if (data.error) {
                    setError(data.error + " Displaying general info as a fallback.");
                    const fallbackContent = await geminiService.explainConcept(moduleTitle, processor.name);
                    setOverview(fallbackContent);
                    setDetails([]);
                } else {
                    setOverview(data.overview);
                    if (moduleType === 'registers') {
                        setDetails(Array.isArray(data.registers) ? data.registers : []);
                    } else if (moduleType === 'memory') {
                        setDetails(Array.isArray(data.memory_map) ? data.memory_map : []);
                    } else if (moduleType === 'isa') {
                        if (Array.isArray(data.instruction_categories)) {
                            setDetails(data.instruction_categories);
                             // Set the first instruction as the default selection
                            if (data.instruction_categories.length > 0 && data.instruction_categories[0].instructions.length > 0) {
                                setSelectedInstruction(data.instruction_categories[0].instructions[0]);
                            }
                        } else {
                           throw new Error("ISA data is not in the expected categorized format.");
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to fetch or parse details:", e);
                setError("Could not load structured details. Displaying general information as a fallback.");
                 const fallbackContent = await geminiService.explainConcept(moduleTitle, processor.name);
                 setOverview(fallbackContent);
                 setDetails([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDetails();
    }, [processor, moduleType]);
    
    const filteredCategories = useMemo(() => {
        if (moduleType !== 'isa' || !Array.isArray(details)) return [];
        const instructionCategories = details as InstructionCategory[];
        if (!searchTerm) return instructionCategories;
        
        const lowercasedFilter = searchTerm.toLowerCase();
        return instructionCategories
            .map(category => ({
                ...category,
                instructions: category.instructions.filter(instr =>
                    instr.mnemonic.toLowerCase().includes(lowercasedFilter) ||
                    instr.summary.toLowerCase().includes(lowercasedFilter) ||
                    instr.operands.toLowerCase().includes(lowercasedFilter)
                ),
            }))
            .filter(category => category.instructions.length > 0);
    }, [searchTerm, details, moduleType]);

    if (isLoading) {
        return <LoadingSpinner />;
    }
    
    if (error && !overview) {
        return <p className="text-red-400">{error}</p>
    }

    const isRegisterData = (item: any): item is ArchitectureRegister => moduleType === 'registers' && typeof item.name === 'string';
    const isMemoryData = (item: any): item is ArchitectureMemoryRegion => moduleType === 'memory' && typeof item.address_range === 'string';

    const renderDetails = () => {
        if (details.length === 0) return null;

        if (moduleType === 'isa') {
            return (
                 <div className="mt-6 flex flex-col md:flex-row gap-6 h-[calc(100vh-300px)]">
                    {/* Left Pane: Instruction List */}
                    <div className="w-full md:w-1/3 flex flex-col border border-gray-700 rounded-lg">
                        <div className="p-3 border-b border-gray-700">
                             <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search instructions..."
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div className="overflow-y-auto flex-grow">
                             {filteredCategories.length > 0 ? filteredCategories.map(category => (
                                <div key={category.category_name}>
                                    <h3 className="text-sm font-semibold text-blue-300 bg-gray-700/50 px-4 py-2 sticky top-0">{category.category_name}</h3>
                                    <ul>
                                        {category.instructions.map(instr => (
                                            <li key={`${category.category_name}-${instr.mnemonic}`}>
                                                <button 
                                                    onClick={() => setSelectedInstruction(instr)}
                                                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${selectedInstruction?.mnemonic === instr.mnemonic ? 'bg-blue-600/30 text-white' : 'text-gray-300 hover:bg-gray-700/50'}`}
                                                >
                                                    <span className="font-mono font-medium text-cyan-400">{instr.mnemonic}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )) : <p className="p-4 text-sm text-gray-500">No instructions found.</p>}
                        </div>
                    </div>
                    {/* Right Pane: Instruction Details */}
                    <div className="w-full md:w-2/3 overflow-y-auto border border-gray-700 rounded-lg p-6 bg-gray-900/30">
                        {selectedInstruction ? (
                             <div className="space-y-6">
                                <div>
                                    <div className="flex items-baseline gap-4">
                                        <h2 className="text-2xl font-bold font-mono text-cyan-300">{selectedInstruction.mnemonic}</h2>
                                        <p className="text-md font-mono text-yellow-300">{selectedInstruction.operands}</p>
                                    </div>
                                    <p className="mt-1 text-gray-400 italic">{selectedInstruction.summary}</p>
                                </div>
                                <div className="prose prose-invert max-w-none prose-sm text-gray-300 border-t border-gray-700 pt-4">
                                    <h4 className="font-semibold text-gray-200 not-prose mb-2">Technical Description</h4>
                                    <MarkdownRenderer content={selectedInstruction.description} />
                                </div>
                                <div className="text-sm pt-4 border-t border-gray-700 grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="font-semibold text-gray-400">Flags Affected</h4>
                                        <p className="font-mono text-orange-400 mt-1">{selectedInstruction.flags_affected || 'None'}</p>
                                    </div>
                                     <div>
                                        <h4 className="font-semibold text-gray-400">Timing/Cycles</h4>
                                        <p className="font-mono text-purple-400 mt-1">{selectedInstruction.timing || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-gray-500">Select an instruction to see its details.</p>
                            </div>
                        )}
                    </div>
                 </div>
            );
        }

        const headers = moduleType === 'registers' ? ['Name', 'Size', 'Description'] : 
                        ['Address Range', 'Size', 'Description'];

        return (
            <div className="mt-6 overflow-x-auto border border-gray-700 rounded-lg">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-200 uppercase bg-gray-700/50">
                        <tr>
                            {headers.map(h => <th key={h} scope="col" className="px-6 py-3">{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {details.map((item, index) => {
                            let key: string;
                            let rowContent: React.ReactNode;

                            if (isRegisterData(item)) {
                                key = item.name + index;
                                rowContent = <>
                                    <td className="px-6 py-4 font-mono font-medium text-white whitespace-nowrap">{item.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{item.size}</td>
                                    <td className="px-6 py-4"><MarkdownRenderer content={item.description} /></td>
                                </>;
                            } else if (isMemoryData(item)) {
                                key = item.address_range + index;
                                rowContent = <>
                                    <td className="px-6 py-4 font-mono font-medium text-white whitespace-nowrap">{item.address_range}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{item.size}</td>
                                    <td className="px-6 py-4"><MarkdownRenderer content={item.description} /></td>
                                </>;
                            } else {
                                return null;
                            }

                            return (
                                <tr key={key} className="bg-gray-800/60 border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                                    {rowContent}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className="animate-fade-in flex flex-col h-full">
            {error && <p className="text-yellow-400 mb-4 bg-yellow-900/50 p-3 rounded-md text-sm border border-yellow-700">{error}</p>}
            <div className="prose prose-invert max-w-none flex-shrink-0">
                <MarkdownRenderer content={overview} />
            </div>
            <div className="flex-grow min-h-0">
                {renderDetails()}
            </div>
        </div>
    );
};

export default DetailsView;