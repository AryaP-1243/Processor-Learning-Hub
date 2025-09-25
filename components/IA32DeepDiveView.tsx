import React, { useState, useEffect } from 'react';
// FIX: Removed unused `ArchitectureInstruction` import to use a local, more specific type.
import { Processor, ArchitectureRegister } from '../types';
import * as geminiService from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';
import { BookOpenIcon, CpuIcon, MemoryStickIcon } from './Icons';

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center space-x-2 py-8">
        <div className="w-4 h-4 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-4 h-4 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-4 h-4 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        <span className="text-gray-300">AI is fetching details...</span>
    </div>
);

// FIX: Defined a local type for key instructions that matches the API response schema for this specific view.
interface IA32KeyInstruction {
    mnemonic: string;
    operands: string;
    description: string;
}

interface IA32Data {
    overview: string;
    operating_modes: string;
    registers: (ArchitectureRegister & { type: string })[];
    memory_organization: string;
    // FIX: Use the new local type for better type safety.
    key_instructions: IA32KeyInstruction[];
}

const IA32DeepDiveView: React.FC<{ processor: Processor }> = ({ processor }) => {
    const [data, setData] = useState<IA32Data | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const responseString = await geminiService.getIA32Details(processor);
                const parsedData = JSON.parse(responseString);
                if (parsedData.error) {
                    setError(parsedData.error);
                } else {
                    setData(parsedData);
                }
            } catch (e) {
                setError("Failed to fetch or parse IA-32 details.");
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [processor]);

    if (isLoading) return <LoadingSpinner />;
    if (error) return <p className="text-red-400">{error}</p>;
    if (!data) return <p className="text-gray-400">No data available for IA-32 Deep Dive.</p>;

    const groupedRegisters = data.registers.reduce((acc, reg) => {
        const type = reg.type || 'Other';
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(reg);
        return acc;
    }, {} as Record<string, (ArchitectureRegister & { type: string })[]>);
    
    const registerTypeOrder = ['General Purpose', 'Segment', 'Instruction Pointer', 'EFLAGS', 'Control'];
    const sortedRegisterGroups = Object.entries(groupedRegisters).sort(([a], [b]) => {
        const indexA = registerTypeOrder.indexOf(a);
        const indexB = registerTypeOrder.indexOf(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });


    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-blue-300 border-b border-gray-700 pb-2 mb-4">IA-32 Architecture Overview</h2>
                <div className="prose prose-invert max-w-none"><MarkdownRenderer content={data.overview} /></div>
            </div>

            {data.operating_modes && (
                 <div>
                    <h2 className="flex items-center gap-2 text-2xl font-bold text-blue-300 border-b border-gray-700 pb-2 mb-4">
                        Operating Modes
                    </h2>
                    <div className="prose prose-invert max-w-none"><MarkdownRenderer content={data.operating_modes} /></div>
                </div>
            )}

            <div>
                <h2 className="flex items-center gap-2 text-2xl font-bold text-blue-300 border-b border-gray-700 pb-2 mb-4">
                    <CpuIcon className="w-6 h-6" /> Core Registers
                </h2>
                <div className="space-y-6">
                    {sortedRegisterGroups.map(([type, regs]) => (
                        <div key={type}>
                            <h3 className="text-lg font-semibold text-gray-300 mb-2">{type} Registers</h3>
                            <div className="overflow-x-auto border border-gray-700 rounded-lg">
                                <table className="w-full text-sm text-left text-gray-300">
                                    <thead className="text-xs text-gray-200 uppercase bg-gray-700/50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">Name</th>
                                            <th scope="col" className="px-6 py-3">Size</th>
                                            <th scope="col" className="px-6 py-3">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {regs.map((reg, index) => (
                                            <tr key={reg.name + index} className="bg-gray-800/60 border-b border-gray-700 hover:bg-gray-700/50">
                                                <td className="px-6 py-4 font-mono font-medium text-white">{reg.name}</td>
                                                <td className="px-6 py-4">{reg.size}</td>
                                                <td className="px-6 py-4 prose prose-sm prose-invert max-w-none"><MarkdownRenderer content={reg.description} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h2 className="flex items-center gap-2 text-2xl font-bold text-blue-300 border-b border-gray-700 pb-2 mb-4">
                    <MemoryStickIcon className="w-6 h-6" /> Memory Organization
                </h2>
                <div className="prose prose-invert max-w-none"><MarkdownRenderer content={data.memory_organization} /></div>
            </div>

            <div>
                <h2 className="flex items-center gap-2 text-2xl font-bold text-blue-300 border-b border-gray-700 pb-2 mb-4">
                    <BookOpenIcon className="w-6 h-6" /> Key Instructions
                </h2>
                 <div className="space-y-2">
                    {/* FIX: Added a type guard to ensure `data.key_instructions` is an array before calling `.map()`. This prevents a runtime error if the API response is malformed. */}
                    {Array.isArray(data.key_instructions) && data.key_instructions.map((item, index) => (
                         <div key={item.mnemonic + index} className="bg-gray-800/60 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-baseline gap-4 mb-2">
                                <span className="font-mono font-bold text-cyan-400 text-md">{item.mnemonic}</span>
                                <span className="font-mono text-sm text-yellow-400">{item.operands}</span>
                            </div>
                            <div className="prose prose-invert max-w-none prose-sm">
                                <MarkdownRenderer content={item.description} />
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
        </div>
    );
};

export default IA32DeepDiveView;