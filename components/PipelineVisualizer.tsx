import React, { useEffect, useMemo } from 'react';
import { PipelineCycleState, PipelineStageState } from '../types';

interface PipelineVisualizerProps {
  cycleState: PipelineCycleState;
  code: string;
  lineMap: number[];
  onRegisterHighlight: (regs: { read: string[], write: string[] }) => void;
}

const PipelineStage: React.FC<{ name: string; state: PipelineStageState; lineMap: number[] }> = ({ name, state, lineMap }) => {
    let instructionText = state.instruction || '---';
    if (state.isBubble) {
        instructionText = 'bubble';
    }
    
    const originalLineIndex = state.pc !== null ? lineMap[state.pc] : null;

    let bgColor = 'bg-gray-800';
    if (state.isBubble) bgColor = 'bg-yellow-900/50';
    else if (state.instruction) bgColor = 'bg-gray-700';

    return (
        <div className="flex flex-col items-center">
            <div className="font-bold text-gray-400 text-sm mb-2">{name}</div>
            <div className={`w-full p-3 h-24 rounded-lg border-2 border-gray-600 flex flex-col justify-center items-center text-center transition-colors duration-300 ${bgColor}`}>
                <div className="font-mono text-cyan-400 text-sm truncate w-full" title={instructionText}>
                    {instructionText}
                </div>
                {originalLineIndex !== null && !state.isBubble && (
                    <div className="text-xs text-gray-500 mt-1">
                        (Line {originalLineIndex + 1})
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Register Parsing Logic ---
const ABI_TO_FULL_NAME_MAP: { [key: string]: string } = {
    'zero': 'zero(X0)', 'ra': 'ra(X1)', 'sp': 'sp(X2)', 'gp': 'gp(X3)', 'tp': 'tp(X4)',
    't0': 't0(X5)', 't1': 't1(X6)', 't2': 't2(X7)', 's0': 's0(X8)', 'fp': 's0(X8)',
    's1': 's1(X9)', 'a0': 'a0(X10)', 'a1': 'a1(X11)', 'a2': 'a2(X12)', 'a3': 'a3(X13)',
    'a4': 'a4(X14)', 'a5': 'a5(X15)', 'a6': 'a6(X16)', 'a7': 'a7(X17)', 's2': 's2(X18)',
    's3': 's3(X19)', 's4': 's4(X20)', 's5': 's5(X21)', 's6': 's6(X22)', 's7': 's7(X23)',
    's8': 's8(X24)', 's9': 's9(X25)', 's10': 's10(X26)', 's11': 's11(X27)', 't3': 't3(X28)',
    't4': 't4(X29)', 't5': 't5(X30)', 't6': 't6(X31)'
};

for (let i = 0; i < 32; i++) {
    const xName = `x${i}`;
    if (!Object.values(ABI_TO_FULL_NAME_MAP).some(val => val.includes(`(X${i})`))) {
        ABI_TO_FULL_NAME_MAP[xName] = `${xName}(X${i})`;
    } else {
        const abiName = Object.keys(ABI_TO_FULL_NAME_MAP).find(key => ABI_TO_FULL_NAME_MAP[key].includes(`(X${i})`));
        if (abiName) {
            ABI_TO_FULL_NAME_MAP[xName] = ABI_TO_FULL_NAME_MAP[abiName];
        }
    }
}

const getInstructionRegs = (instruction: string | null): { read: string[], write: string[] } => {
    if (!instruction) return { read: [], write: [] };
    
    const parts = instruction.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
    const mnemonic = parts[0]?.toLowerCase();
    const read: string[] = [];
    const write: string[] = [];

    const mapToFullName = (reg: string) => ABI_TO_FULL_NAME_MAP[reg.toLowerCase()] || reg;

    switch (mnemonic) {
        case 'add': case 'sub': case 'slt': case 'and': case 'or': // R-type
            if (parts[1]) write.push(mapToFullName(parts[1]));
            if (parts[2]) read.push(mapToFullName(parts[2]));
            if (parts[3]) read.push(mapToFullName(parts[3]));
            break;
        case 'addi': case 'slti': case 'andi': case 'ori': // I-type
            if (parts[1]) write.push(mapToFullName(parts[1]));
            if (parts[2]) read.push(mapToFullName(parts[2]));
            break;
        case 'lw': // I-type (load)
            if (parts[1]) write.push(mapToFullName(parts[1]));
            const lwMatch = parts[2]?.match(/\((.*?)\)/);
            if (lwMatch && lwMatch[1]) read.push(mapToFullName(lwMatch[1]));
            break;
        case 'sw': // S-type
            if (parts[1]) read.push(mapToFullName(parts[1])); // rs2
            const swMatch = parts[2]?.match(/\((.*?)\)/);
            if (swMatch && swMatch[1]) read.push(mapToFullName(swMatch[1])); // rs1
            break;
        case 'bne': case 'beq': // B-type
            if (parts[1]) read.push(mapToFullName(parts[1]));
            if (parts[2]) read.push(mapToFullName(parts[2]));
            break;
        case 'li': case 'la': // Pseudo-instructions
            if (parts[1]) write.push(mapToFullName(parts[1]));
            break;
    }

    return { read, write };
};


const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({ cycleState, code, lineMap, onRegisterHighlight }) => {
    
    useEffect(() => {
        const stages = [cycleState.EX, cycleState.MEM, cycleState.WB];
        const allReadRegs = new Set<string>();
        const allWriteRegs = new Set<string>();

        stages.forEach(stage => {
            if (stage.instruction && !stage.isBubble) {
                const { read, write } = getInstructionRegs(stage.instruction);
                read.forEach(r => allReadRegs.add(r));
                write.forEach(w => allWriteRegs.add(w));
            }
        });

        onRegisterHighlight({ read: Array.from(allReadRegs), write: Array.from(allWriteRegs) });
    }, [cycleState, onRegisterHighlight]);

    return (
        <div className="h-full flex flex-col gap-4 p-4 bg-gray-900/50 rounded-xl border border-gray-700">
            <div className="flex-grow grid grid-cols-5 gap-4 items-center">
                <PipelineStage name="IF" state={cycleState.IF} lineMap={lineMap} />
                <PipelineStage name="ID" state={cycleState.ID} lineMap={lineMap} />
                <PipelineStage name="EX" state={cycleState.EX} lineMap={lineMap} />
                <PipelineStage name="MEM" state={cycleState.MEM} lineMap={lineMap} />
                <PipelineStage name="WB" state={cycleState.WB} lineMap={lineMap} />
            </div>
             <div className="flex-shrink-0 min-h-[6rem] bg-gray-800 rounded-lg p-3 border border-gray-700 flex flex-col justify-center">
                <h4 className="text-sm font-semibold text-gray-400 mb-2">Pipeline Status</h4>
                 <div className="space-y-2 text-xs">
                    {cycleState.hazardInfo ? (
                        <div>
                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                                cycleState.hazardInfo.type.includes('Stalled') ? 'bg-red-500 text-white' : 
                                cycleState.hazardInfo.type.includes('Forwarded') ? 'bg-blue-500 text-white' :
                                'bg-yellow-400 text-black' // for Control Hazard
                            }`}>
                                {cycleState.hazardInfo.type}
                            </span>
                            <p className="text-gray-300 mt-1 font-mono">{cycleState.hazardInfo.details}</p>
                            {cycleState.forwardingPaths.length > 0 && (
                                 <div className="font-mono text-gray-300 space-y-1 mt-1 pl-2">
                                     {cycleState.forwardingPaths.map((path, index) => (
                                         <p key={index}>
                                             - Forwarding <span className="text-orange-400 font-semibold">{path.register}</span> from <span className="text-yellow-300">{path.sourceStage}</span> &rarr; <span className="text-yellow-300">{path.destStage}</span>
                                         </p>
                                     ))}
                                 </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">Nominal operation. No hazards detected.</p>
                    )}

                    {cycleState.instructionCompleted && (
                        <p className="text-green-400 font-mono mt-1">✓ Completed: {cycleState.instructionCompleted}</p>
                    )}
                </div>
             </div>
        </div>
    );
};

export default PipelineVisualizer;
