import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Processor, SimulationResult, SimulationRegister, SimulationMemoryCell, TraceStep, SimulationError, AiChatMessage, PipelineCycleState } from '../types';
import { SAMPLE_CODE } from '../constants';
import * as geminiService from '../services/geminiService';
import * as simulationService from '../services/simulationService';
import { PlayIcon, SparklesIcon, TerminalIcon, PauseIcon, SkipForwardIcon, RewindIcon, RefreshCwIcon, MemoryStickIcon, CpuIcon, EyeIcon, BugIcon, ArrowRightIcon, SpinnerIcon, AlertCircleIcon, ZapIcon } from './Icons';
import MarkdownRenderer from './MarkdownRenderer';
import PipelineVisualizer from './PipelineVisualizer';
import { Chat } from '@google/genai';
import { useUserProgress } from '../contexts/UserProgressContext';
import RegisterView from './RegisterView';


// --- SYNTAX HIGHLIGHTING ---

const escapeHtml = (unsafe: string): string => {
    return unsafe.replace(/[&<>"']/g, (m) => {
        switch (m) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#039;';
            default: return m;
        }
    });
};

const assemblyKeywords = [
    // 8085/8086/Z80
    'MOV', 'MVI', 'LXI', 'LDA', 'STA', 'ADD', 'SUB', 'INR', 'DCR', 'JMP', 'HLT', 'INC', 'DEC',
    'PUSH', 'POP', 'XCHG', 'AND', 'OR', 'XOR', 'TEST', 'SHL', 'SHR', 'ROL', 'ROR', 'ADC', 'SBB', 'DAA', 'NOT',
    'JNZ', 'JZ', 'JC', 'JNC', 'CALL', 'RET', 'INT', 'CMP', 'JE', 'JNE', 'JG', 'JL', 'JGE', 'JLE', 'JA', 'JB',
    'LOOP', 'NOP', 'LD', 'DJNZ', 'HALT',
    // RISC-V
    'LA', 'LI', 'ADDI', 'ADD', 'LW', 'SW', 'BNE', 'BEQ', 'BLT', 'BGE', 'BLTU', 'BGEU', 'J', 'JAL', 'JALR',
    'ECALL', 'MV', 'AUIPC', 'LUI', 'LB', 'SB', 'SLT', 'SLTI', 'XORI', 'ORI', 'ANDI', 'SLLI', 'SRLI', 'SRAI', 'NEG',
    // 6502
    'LDA', 'LDX', 'LDY', 'STA', 'STX', 'STY', 'ADC', 'SBC', 'INX', 'INY', 'DEX', 'DEY', 'JMP', 'JSR', 'RTS', 'BRK', 'BPL', 'BMI', 'BVC', 'BVS', 'BCC', 'BCS', 'CLC',
    // 68000
    'MOVE', 'ADD', 'SUB', 'BRA', 'BSR', 'JMP', 'JSR', 'RTS', 'TST', 'CLR', 'NOT', 'AND', 'OR', 'EOR', 'LSL', 'LSR', 'ASL', 'ASR', 'ROL', 'ROR', 'CMP'
].join('|');
const assemblyRegisters = ['A', 'B', 'C', 'D', 'E', 'H', 'L', 'F', 'IX', 'IY', 'AX', 'BX', 'CX', 'DX', 'SI', 'DI', 'BP', 'SP', 'IP', 'CS', 'DS', 'ES', 'SS', 'ZERO', 'RA', 'GP', 'TP', 'FP', 'S0', 'S1', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'X\\d+', 'D\\d+', 'A\\d+', 'X', 'Y'].join('|');

const ASSEMBLY_REGEX = new RegExp([
    '(;[^\n]*|#[^\n]*)', // 1: Comment
    '(".*?")', // 2: String
    '([a-zA-Z_][a-zA-Z0-9_]+:)', // 3: Label
    '(\\.[a-zA-Z_]+)', // 4: Directive
    `\\b(${assemblyKeywords})\\b`, // 5: Instruction
    '(\\[[^\\]]+\\]|\\d*\\([a-zA-Z0-9_]+\\))', // 6: Memory Operand (e.g., [BX+SI] or 0(a0))
    `\\b(${assemblyRegisters})\\b`, // 7: Register
    '\\b(0x[0-9a-fA-F]+|[0-9]+H?|\\$[0-9a-fA-F]+|-?[0-9]+)\\b', // 8: Number (Hex, Decimal, H-suffix, $-prefix, signed dec)
].join('|'), 'gi');
const ASSEMBLY_CLASSES = ['text-gray-500', 'text-green-400', 'text-pink-400', 'text-purple-400', 'text-cyan-400', 'text-fuchsia-400', 'text-orange-400', 'text-yellow-400'];


const cKeywords = ['#include', '#define', 'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while', 'true', 'false', 'uint', 'NULL', 'IRAM_ATTR', 'uint8_t', 'uint16_t', 'uint32_t'];
const C_REGEX = new RegExp([
    '(\\/\\/[^\n]*|\\/\\*[\\s\\S]*?\\*\\/)', // 1: Comment
    '(".*?")', // 2: String
    '(^\\s*#[a-zA-Z_]+)', // 3: Preprocessor
    `\\b(${cKeywords.join('|')})\\b`, // 4: Keyword
    '([a-zA-Z_][a-zA-Z0-9_]*)(?=\\s*\\()', // 5: Function call
    '\\b(0x[0-9a-fA-F]+|[0-9.]+)\\b' // 6: Number
].join('|'), 'gm');
const C_CLASSES = ['text-gray-500', 'text-green-400', 'text-purple-400', 'text-cyan-400', 'text-blue-400', 'text-yellow-400'];


const highlightCode = (code: string, language: 'Assembly' | 'C') => {
    const regex = language === 'Assembly' ? ASSEMBLY_REGEX : C_REGEX;
    const classNames = language === 'Assembly' ? ASSEMBLY_CLASSES : C_CLASSES;
    let result = '';
    let lastIndex = 0;
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(code)) !== null) {
        result += escapeHtml(code.substring(lastIndex, match.index));
        let matchedGroupContent = '';
        let matchedGroupClass = '';
        for (let i = 1; i < match.length; i++) {
            if (match[i]) {
                matchedGroupContent = match[i];
                matchedGroupClass = classNames[i - 1];
                break;
            }
        }
        if (matchedGroupContent) {
            result += `<span class="${matchedGroupClass}">${escapeHtml(matchedGroupContent)}</span>`;
        } else {
             result += escapeHtml(match[0]);
        }
        lastIndex = regex.lastIndex;
        if (match.index === lastIndex) lastIndex++;
    }
    result += escapeHtml(code.substring(lastIndex));
    return result;
};

// --- HELPER COMPONENTS (Moved outside main component to prevent re-creation on render) ---
const MemoryView: React.FC<{ memory: SimulationMemoryCell[], readAddress?: string | null, writeAddress?: string | null }> = ({ memory, readAddress, writeAddress }) => {
    if (memory.length === 0) return <p className="text-gray-500">No memory data to display.</p>;
    
    return (
        <div>
            <h4 className="text-gray-400 font-semibold mb-2">Memory</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-xs">
                {[...memory].sort((a, b) => parseInt(a.address, 16) - parseInt(b.address, 16)).map(({ address, value }) => {
                    let highlightClass = '';
                    if (address === writeAddress) {
                        highlightClass = 'bg-yellow-600/30'; // Write highlight
                    } else if (address === readAddress) {
                        highlightClass = 'bg-blue-600/30'; // Read highlight
                    }
                    return (
                        <div key={address} className={`flex justify-between items-baseline p-1 rounded transition-colors duration-300 ${highlightClass}`}>
                            <span className="text-gray-300">{address}</span>
                            <span className="text-yellow-400">{value}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const TraceView: React.FC<{ trace: TraceStep[], onStepSelect: (index: number) => void, selectedStep: number | null }> = ({ trace, onStepSelect, selectedStep }) => {
    if (trace.length === 0) return <p className="text-gray-500">No trace data available. Run the simulation with the debug button to generate a trace.</p>;
    
    const traceListRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if(selectedStep !== null && traceListRef.current) {
            const item = traceListRef.current.children[selectedStep] as HTMLDivElement;
            if (item) {
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [selectedStep]);

    return (
        <div ref={traceListRef} className="space-y-1 text-xs">
            {trace.map((step, i) => (
                <button 
                    key={i} 
                    onClick={() => onStepSelect(i)}
                    className={`w-full text-left p-2 rounded flex items-center gap-4 transition-colors ${selectedStep === i ? 'bg-blue-600/30' : 'bg-gray-800 hover:bg-gray-700/50'}`}
                >
                    <span className="font-bold text-gray-500 w-6 text-right">{step.lineIndex + 1}</span>
                    <span className="font-mono text-cyan-400 flex-grow">{step.instructionText}</span>
                    <span className="text-gray-400">Cycles: {step.totalCycles}</span>
                </button>
            ))}
        </div>
    );
};

type OutputTab = 'Output' | 'Registers' | 'Memory' | 'Trace' | 'AI Helper';

const TabButton: React.FC<{
    tabName: OutputTab;
    Icon: React.FC<any>;
    activeTab: OutputTab;
    onClick: (tabName: OutputTab) => void;
}> = ({ tabName, Icon, activeTab, onClick }) => (
    <button
        onClick={() => onClick(tabName)}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-all duration-300 ${activeTab === tabName ? 'text-blue-400 border-blue-400' : 'text-gray-400 border-transparent hover:text-white hover:border-gray-500'}`}
    >
        <Icon className="w-4 h-4" />
        {tabName}
    </button>
);


// --- MAIN COMPONENT ---
export const CodeEditor: React.FC<{ processor: Processor; onInteraction: () => void; }> = React.memo(({ processor, onInteraction }) => {
    const [code, setCode] = useState<string>('');
    const [debouncedCode, setDebouncedCode] = useState<string>('');
    const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [activeTab, setActiveTab] = useState<OutputTab>('Output');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isAiFixing, setIsAiFixing] = useState(false);
    
    // Debugging State
    const [isPipelineStepping, setIsPipelineStepping] = useState(false);
    const [isTraceStepping, setIsTraceStepping] = useState(false);
    const [currentCycle, setCurrentCycle] = useState<number>(-1);
    const [selectedTraceStep, setSelectedTraceStep] = useState<number | null>(null);
    const [pipelineHighlightedRegs, setPipelineHighlightedRegs] = useState<{ read: string[], write: string[] }>({ read: [], write: [] });

    
    // AI Chat State
    const [aiChatHistory, setAiChatHistory] = useState<AiChatMessage[]>([]);
    const [aiChatInput, setAiChatInput] = useState('');
    const chatSessionRef = useRef<Chat | null>(null);
    const chatHistoryRef = useRef<HTMLDivElement>(null);

    const { getSavedCode, saveCodeForProcessor } = useUserProgress();
    const interactionReported = useRef(false);

    const editorRef = useRef<HTMLTextAreaElement>(null);
    const codeOverlayRef = useRef<HTMLPreElement>(null);

    const isAiSimulated = useMemo(() => {
        if (processor.language === 'C') return true;
        const localSimulators = new Set(['8085', 'risc-v', 'intel-8086', 'zilog-z80', 'mos-6502']);
        return !localSimulators.has(processor.id);
    }, [processor]);

    const handleInteractionOnce = useCallback(() => {
        if (!interactionReported.current) {
            onInteraction();
            interactionReported.current = true;
        }
    }, [onInteraction]);

    const resetSimulation = useCallback(() => {
        setSimulationResult(null);
        setIsPipelineStepping(false);
        setIsTraceStepping(false);
        setCurrentCycle(-1);
        setSelectedTraceStep(null);
        setActiveTab('Output');
    }, []);

    // Load code (saved or sample) when processor changes
    useEffect(() => {
        const savedCode = getSavedCode(processor.id);
        const sampleCode = SAMPLE_CODE[processor.id] || SAMPLE_CODE[processor.language === 'C' ? 'arm-cortex-a' : 'risc-v'] || '';
        const initialCode = savedCode ?? sampleCode;
        setCode(initialCode);
        setDebouncedCode(initialCode);
        resetSimulation();
        interactionReported.current = false;
    }, [processor, getSavedCode, resetSimulation]);
    
    // Debounced save code
    useEffect(() => {
        const handler = setTimeout(() => {
            saveCodeForProcessor(processor.id, code);
        }, 1000);

        return () => clearTimeout(handler);
    }, [code, processor.id, saveCodeForProcessor]);

    // Debounce code for expensive operations like syntax highlighting
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedCode(code);
        }, 250);
        return () => clearTimeout(handler);
    }, [code]);

    useEffect(() => {
        // AI Chat initialization
        if (processor) {
            try {
                chatSessionRef.current = geminiService.ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                        systemInstruction: `You are an expert AI assistant and tutor for the ${processor.name} processor. Your name is Chip. You will be helping a user with the code they are writing in the editor. Always be helpful, encouraging, and concise.`
                    }
                });
                setAiChatHistory([]);
            } catch(e) {
                console.error("Failed to initialize AI Chat", e);
                setAiChatHistory([{role: 'model', content: "Sorry, I couldn't initialize the AI chat session."}]);
            }
        }
    }, [processor]);

    useEffect(() => {
        if (chatHistoryRef.current) {
            chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
        }
    }, [aiChatHistory]);

    const highlightedHtml = useMemo(() => {
        if (processor.language === 'C') {
            return highlightCode(debouncedCode, 'C');
        }
        return highlightCode(debouncedCode, 'Assembly');
    }, [debouncedCode, processor.language]);
    
    const runSimulation = useCallback(async (debug = false) => {
        handleInteractionOnce();
        setIsRunning(true);
        resetSimulation();
        let result: SimulationResult | null = null;
        try {
            if (processor.language === 'C') {
                const resultString = await geminiService.simulateCCode(code, processor);
                result = JSON.parse(resultString);
            } else {
                const useLocalSimulator = ['8085', 'risc-v', 'intel-8086', 'zilog-z80', 'mos-6502'].includes(processor.id);
                if (useLocalSimulator) {
                     switch (processor.id) {
                        case '8085': result = simulationService.run8085Simulation(code); break;
                        case 'risc-v': result = simulationService.runRiscVSimulation(code); break;
                        case 'intel-8086': result = simulationService.run8086Simulation(code); break;
                        case 'zilog-z80': result = simulationService.runZ80Simulation(code); break;
                        case 'mos-6502': result = simulationService.run6502Simulation(code); break;
                    }
                } else {
                     const resultString = await geminiService.simulateAssemblyCodeWithAI(code, processor);
                     result = JSON.parse(resultString);
                }
            }
        } catch (e) {
            console.error("Simulation error:", e);
            result = { registers: [], memory: [], output: `An unexpected error occurred during simulation.`, error: { lineIndex: 0, message: "Execution failed." } };
        } finally {
            setIsRunning(false);
            if(result) {
                setSimulationResult(result);
                if (debug) {
                    if (processor.id === 'risc-v' && result.pipelineTrace && result.pipelineTrace.length > 0) {
                        setIsPipelineStepping(true);
                        setCurrentCycle(0);
                    } else if (result.trace && result.trace.length > 0) {
                        setIsTraceStepping(true);
                        setSelectedTraceStep(0);
                        setActiveTab('Registers');
                    } else {
                        // Handle case where debug is pressed but no trace is generated (e.g. error)
                        setActiveTab('Output');
                    }
                }
            }
        }
    }, [code, processor, handleInteractionOnce, resetSimulation]);

    const handleDebug = useCallback(() => runSimulation(true), [runSimulation]);

    const handlePipelineStep = useCallback((direction: 'forward' | 'backward') => {
        if (!simulationResult?.pipelineTrace) return;
        const traceLength = simulationResult.pipelineTrace.length;
        
        setCurrentCycle(prev => {
            const next = direction === 'forward' ? prev + 1 : prev - 1;
            if (next >= 0 && next < traceLength) {
                return next;
            }
            return prev;
        });
    }, [simulationResult]);

    const handleTraceStep = useCallback((direction: 'forward' | 'backward') => {
        if (!simulationResult?.trace) return;
        const traceLength = simulationResult.trace.length;
        
        setSelectedTraceStep(prev => {
            if (prev === null) return 0;
            const next = direction === 'forward' ? prev + 1 : prev - 1;
            if (next >= 0 && next < traceLength) {
                return next;
            }
            return prev;
        });
    }, [simulationResult]);


    const analyzeUserCode = useCallback(async () => {
        handleInteractionOnce();
        setIsAiLoading(true);
        setActiveTab('AI Helper');
        const analysis = await geminiService.analyzeCode(code, processor.language, processor.name);
        setAiChatHistory(prev => [...prev, { role: 'user', content: `Please analyze this code:\n\`\`\`${processor.language.toLowerCase()}\n${code}\n\`\`\`` }, { role: 'model', content: analysis }]);
        setIsAiLoading(false);
    }, [code, processor.language, processor.name, handleInteractionOnce]);

    const handleAiFixCode = useCallback(async () => {
        if (!simulationResult?.error) return;
        handleInteractionOnce();
        setIsAiFixing(true);
        try {
            const resultString = await geminiService.fixCode(code, processor, simulationResult.error);
            const result = JSON.parse(resultString);
            if (result.fixedCode) {
                setCode(result.fixedCode);
                setAiChatHistory(prev => [
                    ...prev,
                    { role: 'user', content: `My code failed with the error: "${simulationResult.error?.message}". Can you fix it?` },
                    { role: 'model', content: `Of course! Here is the corrected code. \n\n**Explanation:**\n${result.explanation}` }
                ]);
                setActiveTab('AI Helper');
                resetSimulation();
            } else {
                 setAiChatHistory(prev => [
                    ...prev,
                    { role: 'model', content: "Sorry, I wasn't able to fix the code automatically. Could you describe what you're trying to do?" }
                ]);
                setActiveTab('AI Helper');
            }
        } catch (e) {
            console.error("Failed to fix code with AI:", e);
             setAiChatHistory(prev => [
                ...prev,
                { role: 'model', content: "An error occurred while trying to fix the code." }
            ]);
            setActiveTab('AI Helper');
        } finally {
            setIsAiFixing(false);
        }
    }, [code, processor, simulationResult, handleInteractionOnce, resetSimulation]);
    
    const handleOptimizeCode = useCallback(async () => {
        handleInteractionOnce();
        setIsAiLoading(true);
        setActiveTab('AI Helper');
        try {
            const resultString = await geminiService.optimizeCode(code, processor);
            const result = JSON.parse(resultString);
            if (result.optimizedCode && result.explanation) {
                 setAiChatHistory(prev => [
                    ...prev,
                    { role: 'user', content: `Can you optimize this code for the ${processor.name}?` },
                    { role: 'model', content: `Certainly! Here is an optimized version:\n\n\`\`\`${processor.language.toLowerCase()}\n${result.optimizedCode}\n\`\`\`\n\n**Explanation of Changes:**\n${result.explanation}` }
                ]);
            } else {
                throw new Error(result.explanation || "Failed to get optimized code.");
            }
        } catch (e: any) {
            console.error("Failed to optimize code with AI:", e);
             setAiChatHistory(prev => [
                ...prev,
                { role: 'model', content: `Sorry, an error occurred while trying to optimize the code: ${e.message}` }
            ]);
        } finally {
            setIsAiLoading(false);
        }
    }, [code, processor, handleInteractionOnce]);

    const handleAiChatSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!aiChatInput.trim() || !chatSessionRef.current || isAiLoading) return;

        handleInteractionOnce();
        const userInput = aiChatInput;
        
        const fullMessageForAI = `The user is currently working on the following ${processor.language} code for the ${processor.name}:\n\n\`\`\`${processor.language.toLowerCase()}\n${code}\n\`\`\`\n\nConsidering this code, the user's question is: "${userInput}"`;

        setAiChatInput('');
        setAiChatHistory(prev => [...prev, { role: 'user', content: userInput }]);
        setIsAiLoading(true);
        
        try {
            const result = await chatSessionRef.current.sendMessage({ message: fullMessageForAI });
            setAiChatHistory(prev => [...prev, { role: 'model', content: result.text }]);
        } catch (error) {
            console.error("AI Chat error:", error);
            setAiChatHistory(prev => [...prev, { role: 'model', content: "Sorry, I encountered an error while trying to get a response." }]);
        } finally {
            setIsAiLoading(false);
        }
    }, [aiChatInput, isAiLoading, handleInteractionOnce, processor, code]);

    const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCode(e.target.value);
        if (simulationResult) setSimulationResult(null);
        handleInteractionOnce();
    }, [simulationResult, handleInteractionOnce]);

    const currentLineMap = useMemo(() => simulationService.preprocessAssemblyCode(debouncedCode).lineMap, [debouncedCode]);
    const originalErrorLine = simulationResult?.error ? currentLineMap[simulationResult.error.lineIndex] : undefined;
    
    if (isPipelineStepping && simulationResult?.pipelineTrace && processor.id === 'risc-v') {
        const cycleState = simulationResult.pipelineTrace[currentCycle];
        const traceLength = simulationResult.pipelineTrace.length;
        if (!cycleState) return null; // Should not happen
        return (
             <div className="flex flex-col h-full min-h-[80vh] gap-4">
                <div className="flex-shrink-0 bg-gray-800/50 rounded-xl p-3 flex items-center justify-between border border-gray-700">
                    <h3 className="font-semibold text-blue-300">Pipeline Visualizer</h3>
                    <div className="flex items-center gap-4">
                         <button onClick={() => handlePipelineStep('backward')} disabled={currentCycle <= 0} className="p-2 rounded-full text-gray-300 hover:bg-gray-700 disabled:opacity-50 transition-colors"><RewindIcon className="w-5 h-5"/></button>
                         <span className="text-sm text-gray-400 font-mono">Cycle: <span className="font-bold text-white">{currentCycle + 1}</span> / {traceLength}</span>
                         <button onClick={() => handlePipelineStep('forward')} disabled={currentCycle >= traceLength - 1} className="p-2 rounded-full text-gray-300 hover:bg-gray-700 disabled:opacity-50 transition-colors"><SkipForwardIcon className="w-5 h-5"/></button>
                    </div>
                     <button onClick={resetSimulation} className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors shadow-md rounded-lg flex items-center gap-2"><PauseIcon className="w-5 h-5"/> Stop</button>
                </div>
                
                <div className="flex-grow min-h-0">
                    <PipelineVisualizer 
                        cycleState={cycleState} 
                        code={code} 
                        lineMap={currentLineMap} 
                        onRegisterHighlight={setPipelineHighlightedRegs}
                    />
                </div>
                 
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-shrink-0 h-1/3">
                    <div className="bg-gray-800/50 rounded-xl p-4 overflow-hidden border border-gray-700 flex flex-col">
                        <div className="overflow-y-auto">
                            <RegisterView 
                                registers={cycleState.registers} 
                                readRegs={pipelineHighlightedRegs.read}
                                writeRegs={pipelineHighlightedRegs.write}
                            />
                        </div>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4 overflow-hidden border border-gray-700 flex flex-col">
                        <div className="overflow-y-auto"><MemoryView memory={cycleState.memory} /></div>
                    </div>
                </div>
             </div>
        )
    }

    const selectedStep = (simulationResult?.trace && selectedTraceStep !== null) ? simulationResult.trace[selectedTraceStep] : null;
    
    if (isTraceStepping && simulationResult?.trace) {
        const traceLength = simulationResult.trace.length;
        const highlightTop = selectedStep ? currentLineMap[selectedStep.lineIndex] * 24 : -999; // 24px line height

        return (
            <div className="flex flex-col h-full min-h-[80vh] gap-4">
                 <div className="flex-shrink-0 bg-gray-800/50 rounded-xl p-3 flex items-center justify-between border border-gray-700">
                    <h3 className="font-semibold text-blue-300">Instruction-Step Debugger</h3>
                    <div className="flex items-center gap-4">
                         <button onClick={() => handleTraceStep('backward')} disabled={selectedTraceStep === null || selectedTraceStep <= 0} className="p-2 rounded-full text-gray-300 hover:bg-gray-700 disabled:opacity-50 transition-colors"><RewindIcon className="w-5 h-5"/></button>
                         <span className="text-sm text-gray-400 font-mono">Step: <span className="font-bold text-white">{selectedTraceStep !== null ? selectedTraceStep + 1 : '-'}</span> / {traceLength}</span>
                         <button onClick={() => handleTraceStep('forward')} disabled={selectedTraceStep === null || selectedTraceStep >= traceLength - 1} className="p-2 rounded-full text-gray-300 hover:bg-gray-700 disabled:opacity-50 transition-colors"><SkipForwardIcon className="w-5 h-5"/></button>
                    </div>
                     <button onClick={resetSimulation} className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors shadow-md rounded-lg flex items-center gap-2"><PauseIcon className="w-5 h-5"/> Stop</button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-grow min-h-0">
                     <div className="relative font-mono text-sm bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
                        <div className="relative flex-grow h-full">
                            <div className="absolute bg-blue-500/30 pointer-events-none z-0" style={{ top: `${highlightTop}px`, left: 0, width: '100%', height: '24px', transition: 'top 0.2s ease-in-out' }}/>
                            <pre className="absolute top-0 left-0 w-full h-full p-4 font-mono text-sm bg-transparent pointer-events-none overflow-auto leading-6">
                                <code dangerouslySetInnerHTML={{ __html: highlightedHtml + '\n' }} />
                            </pre>
                        </div>
                    </div>
                    <div className="grid grid-rows-2 gap-4">
                        <div className="bg-gray-800/50 rounded-xl p-4 overflow-hidden border border-gray-700 flex flex-col">
                           <div className="overflow-y-auto">
                                <RegisterView 
                                    registers={selectedStep?.registers || []} 
                                    readRegs={selectedStep?.readRegs}
                                    writeRegs={selectedStep?.writeRegs}
                                />
                            </div>
                        </div>
                        <div className="bg-gray-800/50 rounded-xl p-4 overflow-hidden border border-gray-700 flex flex-col">
                            <div className="overflow-y-auto">
                                <MemoryView 
                                    memory={selectedStep?.memory || []} 
                                    readAddress={selectedStep?.readMem} 
                                    writeAddress={selectedStep?.writeMem} 
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-full min-h-[70vh] gap-6">
            <div className="relative font-mono text-sm bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden flex-grow flex flex-col focus-within:border-blue-500/80 transition-all duration-300 shadow-lg shadow-blue-900/20">
                <div className="flex-shrink-0 bg-gray-900/40 p-2 border-b border-gray-700 text-xs text-gray-400">
                    {processor.name} {processor.language} Editor
                </div>
                <div className="relative flex-grow h-full">
                    <textarea
                        ref={editorRef}
                        value={code}
                        onChange={handleCodeChange}
                        className="absolute top-0 left-0 w-full h-full p-4 bg-transparent text-transparent caret-white resize-none outline-none overflow-auto z-10 leading-6"
                        spellCheck="false"
                        onScroll={(e) => { 
                            if (codeOverlayRef.current) {
                                codeOverlayRef.current.scrollTop = e.currentTarget.scrollTop; 
                                codeOverlayRef.current.scrollLeft = e.currentTarget.scrollLeft; 
                            }
                        }}
                    />
                    <pre
                        ref={codeOverlayRef}
                        aria-hidden="true"
                        className="absolute top-0 left-0 w-full h-full p-4 font-mono text-sm bg-transparent pointer-events-none overflow-auto leading-6"
                    >
                        <code dangerouslySetInnerHTML={{ __html: highlightedHtml + '\n' }} />
                    </pre>
                    {simulationResult?.error && typeof originalErrorLine === 'number' && (
                        <div
                            className="absolute bg-red-500/30 pointer-events-none z-20"
                            style={{ top: `${originalErrorLine * 24}px`, left: 0, width: '100%', height: '24px' }}
                            title={simulationResult.error.message}
                        />
                    )}
                </div>
            </div>

            <div className="flex flex-col min-h-0 bg-gray-800/50 rounded-xl border border-gray-700 shadow-lg shadow-blue-900/20">
                <div className="flex-shrink-0 flex items-center justify-between p-2 border-b border-gray-700">
                    <button onClick={resetSimulation} className="p-2 rounded-full hover:bg-gray-700/50 transition-colors" title="Reset Simulation">
                        <RefreshCwIcon className="w-5 h-5 text-gray-400" />
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => runSimulation()}
                            disabled={isRunning || isPipelineStepping || isTraceStepping}
                            className="px-4 py-2 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors shadow-md rounded-lg flex items-center gap-2 disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            {isRunning ? <SpinnerIcon className="animate-spin w-5 h-5"/> : <PlayIcon className="w-5 h-5" />} Run
                        </button>
                        <button
                            onClick={handleDebug}
                            disabled={isRunning || isPipelineStepping || isTraceStepping || isAiSimulated}
                            className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-md rounded-lg flex items-center gap-2 disabled:bg-gray-500 disabled:cursor-not-allowed"
                            title={isAiSimulated ? "Interactive debugging is only available for local simulators." : "Run with step-by-step debugger"}
                        >
                            <BugIcon className="w-5 h-5" /> Debug
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={analyzeUserCode}
                            disabled={isAiLoading || isRunning}
                            className="px-4 py-2 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors shadow-md rounded-lg flex items-center gap-2 disabled:bg-gray-500"
                        >
                            <SparklesIcon className="w-5 h-5" /> Analyze
                        </button>
                        <button
                            onClick={handleOptimizeCode}
                            disabled={isAiLoading || isRunning}
                            className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-md rounded-lg flex items-center gap-2 disabled:bg-gray-500"
                        >
                            <ZapIcon className="w-5 h-5" /> Optimize
                        </button>
                        {simulationResult?.error && (
                            <button
                                onClick={handleAiFixCode}
                                disabled={isAiFixing || isRunning}
                                className="px-4 py-2 text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-colors shadow-md rounded-lg flex items-center gap-2 disabled:bg-gray-500 glowing-border"
                            >
                                {isAiFixing ? <SpinnerIcon className="animate-spin w-5 h-5"/> : <SparklesIcon className="w-5 h-5" />} Auto-Fix
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex-shrink-0 flex items-center border-b border-gray-700 px-2">
                    <TabButton tabName="Output" Icon={TerminalIcon} activeTab={activeTab} onClick={setActiveTab} />
                    <TabButton tabName="Registers" Icon={CpuIcon} activeTab={activeTab} onClick={setActiveTab} />
                    <TabButton tabName="Memory" Icon={MemoryStickIcon} activeTab={activeTab} onClick={setActiveTab} />
                    <TabButton tabName="Trace" Icon={EyeIcon} activeTab={activeTab} onClick={setActiveTab} />
                    <TabButton tabName="AI Helper" Icon={SparklesIcon} activeTab={activeTab} onClick={setActiveTab} />
                </div>
                 <div className="p-4 overflow-auto flex-grow min-h-[200px]">
                    {activeTab === 'Output' && (
                         <div className="flex flex-col h-full">
                            {isAiSimulated && !simulationResult && !isRunning && (
                                <div className="p-3 mb-4 bg-gray-700/50 border border-yellow-600/50 rounded-lg text-sm text-yellow-300 flex gap-3">
                                    <AlertCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <span>This simulation uses AI and may not be cycle-accurate or support all instructions. For precise hardware behavior, consult the official documentation.</span>
                                </div>
                            )}
                            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono flex-grow">
                                {isRunning ? 'Running simulation...' : (simulationResult?.output || 'Output will be shown here after running the code.')}
                            </pre>
                        </div>
                    )}
                    {activeTab === 'Registers' && <RegisterView registers={selectedStep?.registers || simulationResult?.registers || []} readRegs={selectedStep?.readRegs} writeRegs={selectedStep?.writeRegs} />}
                    {activeTab === 'Memory' && <MemoryView memory={selectedStep?.memory || simulationResult?.memory || []} readAddress={selectedStep?.readMem} writeAddress={selectedStep?.writeMem} />}
                    {activeTab === 'Trace' && <TraceView trace={simulationResult?.trace || []} onStepSelect={setSelectedTraceStep} selectedStep={selectedTraceStep} />}
                    {activeTab === 'AI Helper' && (
                        <div className="flex flex-col h-full">
                            <div ref={chatHistoryRef} className="flex-grow overflow-y-auto space-y-4 mb-4 pr-2">
                                {aiChatHistory.length === 0 && (
                                    <div className="text-center text-gray-500 h-full flex items-center justify-center">
                                        <div>
                                            <SparklesIcon className="w-10 h-10 mx-auto mb-2 text-purple-400"/>
                                            <p>Ask Chip, your AI assistant, a question about your code, or click 'Analyze Code' for a Socratic review.</p>
                                        </div>
                                    </div>
                                )}
                                {aiChatHistory.map((msg, index) => (
                                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`p-3 rounded-lg max-w-xl ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                            <MarkdownRenderer content={msg.content} />
                                        </div>
                                    </div>
                                ))}
                                {isAiLoading && <div className="flex justify-start"><div className="p-3 rounded-lg bg-gray-700"><SpinnerIcon className="animate-spin w-5 h-5 text-gray-300"/></div></div>}
                            </div>
                            <form onSubmit={handleAiChatSubmit} className="flex-shrink-0 flex gap-2">
                                <input
                                    type="text"
                                    value={aiChatInput}
                                    onChange={(e) => setAiChatInput(e.target.value)}
                                    placeholder="Ask Chip about your code..."
                                    disabled={isAiLoading}
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <button type="submit" disabled={isAiLoading || !aiChatInput.trim()} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-500">
                                    <ArrowRightIcon className="w-5 h-5"/>
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});