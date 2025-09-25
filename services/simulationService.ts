// FIX: Import PipelineStageState to resolve 'Cannot find name' error.
import { SimulationResult, TraceStep, SimulationError, PipelineCycleState, PipelineStageState } from '../types';

// --- SIMULATION LOGIC ---
const MAX_INSTRUCTIONS = 1000;
const MAX_CYCLES = 5000;


const robustParse = (line: string): string[] => {
    // Replaces commas with spaces, then splits by whitespace, effectively tokenizing the line.
    return line.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
};

const parseImmediate = (val: string): number => {
    if (!val) return 0; // Handle optional operands
    const lowerVal = val.toLowerCase().trim();
    if (lowerVal === '') return 0;

    let num;
    if (lowerVal.startsWith('0x')) {
        num = parseInt(lowerVal.substring(2), 16);
    } else if (lowerVal.endsWith('h')) {
        num = parseInt(lowerVal.slice(0, -1), 16);
    } else if (lowerVal.startsWith('$')) {
        num = parseInt(lowerVal.substring(1), 16);
    } else if (lowerVal.startsWith('0b')) {
        num = parseInt(lowerVal.substring(2), 2);
    } else {
        num = parseInt(lowerVal, 10);
    }
    if (isNaN(num)) throw new Error(`Invalid number format: ${val}`);
    return num;
}

// FIX: Export preprocessAssemblyCode so it can be used in CodeEditor.tsx
export const preprocessAssemblyCode = (assemblyCode: string): { labels: { [key: string]: number }, cleanLines: string[], lineMap: number[], initialMemory: { [key: number]: number } } => {
    const labels: { [key: string]: number } = {};
    const cleanLines: string[] = [];
    const lineMap: number[] = [];
    const initialMemory: { [key: number]: number } = {};
    let currentSection: 'text' | 'data' = 'text';
    let dataAddress = 0x1000;
    
    assemblyCode.split('\n').forEach((originalLine, originalIndex) => {
        const cleaned = originalLine.split(';')[0].split('#')[0].trim();
        if (cleaned === '') return;
        if (cleaned.toLowerCase() === '.data') { currentSection = 'data'; return; }
        if (cleaned.toLowerCase() === '.text' || cleaned.toLowerCase() === '.globl main') { currentSection = 'text'; if(cleaned.toLowerCase() === '.globl main') return; }

        const labelMatch = cleaned.match(/^([a-zA-Z0-9_]+):/);
        let instructionPart = cleaned;
        if (labelMatch) {
            const label = labelMatch[1].toUpperCase();
            if (currentSection === 'text') labels[label] = cleanLines.length;
            else labels[label] = dataAddress;
            instructionPart = cleaned.substring(labelMatch[0].length).trim();
        }

        if (instructionPart) {
            if (currentSection === 'text') {
                cleanLines.push(instructionPart);
                lineMap.push(originalIndex);
            } else {
                const parts = instructionPart.split(/\s+/);
                const directive = parts[0]?.toUpperCase().replace('.', '');
                const valueStr = parts.slice(1).join(' ');
                if (valueStr) {
                    const value = parseImmediate(valueStr);
                    if (directive === 'DB' || directive === 'BYTE') {
                        initialMemory[dataAddress++] = value & 0xFF;
                    } else if (directive === 'DW' || directive === 'WORD') {
                        initialMemory[dataAddress++] = value & 0xFF; // Low byte
                        initialMemory[dataAddress++] = (value >> 8) & 0xFF; // High byte
                    }
                }
            }
        }
    });
    return { labels, cleanLines, lineMap, initialMemory };
};

export const run8085Simulation = (code: string): SimulationResult => {
    const registers: { [key: string]: number } = { 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'H': 0, 'L': 0 };
    const flags = { S:0, Z:0, AC:0, P:0, CY:0 };
    const { labels, cleanLines, lineMap, initialMemory } = preprocessAssemblyCode(code);
    const memory = { ...initialMemory };
    const trace: TraceStep[] = [];
    let pc = labels['START'] || 0, cycleCount = 0, executedInstructions = 0, output = '', error: SimulationError | undefined = undefined;

    while (pc < cleanLines.length && executedInstructions < MAX_INSTRUCTIONS) {
        executedInstructions++;
        const line = cleanLines[pc], parts = robustParse(line), instruction = parts[0]?.toUpperCase();
        let jumped = false;
        const currentStep: Partial<TraceStep> = { lineIndex: pc, instructionText: line, readRegs: [], writeRegs: [], readMem: null, writeMem: null, aluOp: null, cycleCost: 0 };

        try {
            if (!instruction) { pc++; continue; }
            switch (instruction) {
                case 'MVI': {
                    registers[parts[1].toUpperCase()] = parseImmediate(parts[2]) & 0xFF;
                    currentStep.writeRegs!.push(parts[1].toUpperCase()); currentStep.cycleCost=7; break;
                }
                case 'MOV': {
                    const dest=parts[1].toUpperCase(), src=parts[2].toUpperCase();
                    if (dest==='M') {
                        const addr = (registers.H<<8)|registers.L;
                        memory[addr] = registers[src];
                        currentStep.readRegs!.push('H','L',src); currentStep.writeMem=`0x${addr.toString(16)}`; currentStep.cycleCost=7;
                    } else if (src==='M') {
                        const addr = (registers.H<<8)|registers.L;
                        registers[dest] = memory[addr] || 0;
                        currentStep.readRegs!.push('H','L'); currentStep.readMem=`0x${addr.toString(16)}`; currentStep.writeRegs!.push(dest); currentStep.cycleCost=7;
                    } else {
                        registers[dest] = registers[src];
                        currentStep.readRegs!.push(src); currentStep.writeRegs!.push(dest); currentStep.cycleCost=5;
                    } break;
                }
                case 'LXI': {
                    let val = labels[parts[2].toUpperCase()] ?? parseImmediate(parts[2]);
                    const regPair = parts[1].toUpperCase();
                    if(regPair === 'H') { registers.H = (val>>8)&0xFF; registers.L = val&0xFF; currentStep.writeRegs!.push('H','L'); }
                    // Add other pairs like B, D, SP
                    currentStep.cycleCost=10; break;
                }
                case 'ADD': {
                    registers.A = (registers.A + registers[parts[1].toUpperCase()]) & 0xFF;
                    currentStep.readRegs!.push('A', parts[1].toUpperCase()); currentStep.writeRegs!.push('A'); currentStep.aluOp='ADD'; currentStep.cycleCost=4; break;
                }
                 case 'SUB': registers.A = (registers.A - registers[parts[1].toUpperCase()]) & 0xFF; currentStep.readRegs!.push('A', parts[1].toUpperCase()); currentStep.writeRegs!.push('A'); currentStep.aluOp = 'SUB'; currentStep.cycleCost = 4; break;
                case 'INR': registers[parts[1].toUpperCase()] = (registers[parts[1].toUpperCase()] + 1) & 0xFF; currentStep.readRegs!.push(parts[1].toUpperCase()); currentStep.writeRegs!.push(parts[1].toUpperCase()); currentStep.aluOp = 'INC'; currentStep.cycleCost = 5; break;
                case 'DCR': registers[parts[1].toUpperCase()] = (registers[parts[1].toUpperCase()] - 1) & 0xFF; currentStep.readRegs!.push(parts[1].toUpperCase()); currentStep.writeRegs!.push(parts[1].toUpperCase()); currentStep.aluOp = 'DEC'; currentStep.cycleCost = 5; break;
                case 'JNZ': if (flags.Z === 0) { pc = labels[parts[1].toUpperCase()]; jumped = true; } currentStep.cycleCost = 10; break;
                case 'HLT': output='Execution halted.'; pc=cleanLines.length; currentStep.cycleCost=7; break;
                default: throw new Error(`Unknown instruction: ${instruction}`);
            }
        } catch (e: any) { error = { lineIndex: pc, message: e.message }; break; }
        
        cycleCount += currentStep.cycleCost!; currentStep.totalCycles = cycleCount;
        const nextPc = jumped ? pc : pc+1;
        currentStep.registers = Object.entries(registers).map(([n,v])=>({name:n, value:`0x${v.toString(16).padStart(2,'0')}`}));
        currentStep.registers.push({name:'PC', value:`0x${nextPc.toString(16).padStart(4,'0')}`});
        currentStep.memory = Object.entries(memory).map(([a,v])=>({address:`0x${Number(a).toString(16)}`, value:`0x${v.toString(16).padStart(2,'0')}`}));
        trace.push(currentStep as TraceStep);
        if (!jumped) pc++;
    }

    if (!error && executedInstructions >= MAX_INSTRUCTIONS) error = { lineIndex: pc > 0 ? pc - 1 : 0, message: 'Max instruction limit reached.' };
    output = error ? `Error on line ${lineMap[error.lineIndex]+1}: ${error.message}` : (output || 'Execution finished.');
    
    return { registers: trace[trace.length-1]?.registers || [], memory: trace[trace.length-1]?.memory || [], output, cycles: cycleCount, trace, error };
};

export const run8086Simulation = (code: string): SimulationResult => {
    const regs: { [key: string]: number } = { AX: 0, BX: 0, CX: 0, DX: 0, SI: 0, DI: 0, BP: 0, SP: 0x1000, IP: 0 };
    const flags = { CF:0, ZF:0, SF:0, OF:0, PF:0, AF:0, IF:0, DF:0 };
    const { labels, cleanLines, lineMap, initialMemory } = preprocessAssemblyCode(code);
    const memory = { ...initialMemory };
    const trace: TraceStep[] = [];
    let pc = 0, cycleCount = 0, executedInstructions = 0, output = '', error: SimulationError | undefined = undefined;

    while (pc < cleanLines.length && executedInstructions < MAX_INSTRUCTIONS) {
        executedInstructions++;
        const line = cleanLines[pc], parts = robustParse(line), instruction = parts[0]?.toUpperCase();
        let jumped = false;
        const currentStep: Partial<TraceStep> = { lineIndex: pc, instructionText: line, readRegs: [], writeRegs: [], readMem: null, writeMem: null, aluOp: null, cycleCost: 0 };

        const getEffectiveAddress = (expr: string): number => {
            let address = 0;
            const upper = expr.toUpperCase().replace(/\s/g, '');
            // Tokenize based on registers, numbers, and operators
            const tokens = upper.match(/[A-Z0-9_]+|[+-]/g) || [];
            let currentOperator = '+';

            for (const token of tokens) {
                if (token === '+' || token === '-') {
                    currentOperator = token;
                    continue;
                }
                let value = 0;
                if (regs.hasOwnProperty(token)) {
                    value = regs[token];
                    currentStep.readRegs!.push(token);
                } else {
                    try {
                       value = parseImmediate(token);
                    } catch {
                        throw new Error(`Invalid term in memory expression: ${token}`);
                    }
                }

                if (currentOperator === '+') {
                    address += value;
                } else {
                    address -= value;
                }
            }
            return address & 0xFFFF; // 16-bit address space
        };

        const setFlagsLogic = (result: number, op1: number, op2: number, isSub: boolean, is16bit: boolean) => {
            const size = is16bit ? 0xFFFF : 0xFF, msb = is16bit ? 0x8000 : 0x80;
            flags.ZF = (result & size) === 0 ? 1 : 0;
            flags.SF = (result & msb) ? 1 : 0;
            const op1Sign = (op1 & msb) !== 0, op2Sign = (op2 & msb) !== 0, resSign = (result & msb) !== 0;
            if (isSub) flags.OF = (op1Sign !== op2Sign) && (op1Sign !== resSign) ? 1 : 0;
            else flags.OF = (op1Sign === op2Sign) && (op1Sign !== resSign) ? 1 : 0;
            let pCount = 0;
            for (let i = 0; i < 8; i++) if ((result & (1 << i)) > 0) pCount++;
            flags.PF = (pCount % 2 === 0) ? 1 : 0;
        };

        const getValue = (op: string, is16bit = true): number => {
            const upper = op.toUpperCase();
            if (regs.hasOwnProperty(upper)) { 
                currentStep.readRegs!.push(upper); 
                return regs[upper];
            }
            const memMatch = op.match(/\[(.*?)\]/);
            if (memMatch) {
                const expr = memMatch[1];
                const addr = labels[expr.toUpperCase()] ?? getEffectiveAddress(expr);
                currentStep.readMem = `0x${addr.toString(16)}`;
                const lowByte = memory[addr] || 0;
                const highByte = is16bit ? (memory[addr+1] || 0) : 0;
                return (highByte << 8) | lowByte;
            }
            return parseImmediate(op);
        };

        const setValue = (op: string, value: number, is16bit = true) => {
            const upper = op.toUpperCase();
            if (regs.hasOwnProperty(upper)) {
                regs[upper] = value & 0xFFFF;
                currentStep.writeRegs!.push(upper);
            } else {
                const memMatch = op.match(/\[(.*?)\]/);
                if(memMatch) {
                     const expr = memMatch[1];
                     const addr = labels[expr.toUpperCase()] ?? getEffectiveAddress(expr);
                     memory[addr] = value & 0xFF;
                     if (is16bit) memory[addr + 1] = (value >> 8) & 0xFF;
                     currentStep.writeMem = `0x${addr.toString(16)}`;
                } else throw new Error(`Invalid destination operand: ${op}`);
            }
        };

        try {
            if (!instruction) { pc++; continue; }
            switch (instruction) {
                case 'MOV': setValue(parts[1], getValue(parts[2])); currentStep.cycleCost=4; break;
                case 'ADD': {
                    const dest = parts[1], op1 = getValue(dest), op2 = getValue(parts[2]);
                    const result = op1 + op2;
                    setValue(dest, result);
                    flags.CF = result > 0xFFFF ? 1 : 0;
                    setFlagsLogic(result, op1, op2, false, true);
                    currentStep.aluOp = 'ADD'; currentStep.cycleCost=3; break;
                }
                case 'SUB': {
                    const dest = parts[1], op1 = getValue(dest), op2 = getValue(parts[2]);
                    const result = op1 - op2;
                    setValue(dest, result);
                    flags.CF = op1 < op2 ? 1 : 0;
                    setFlagsLogic(result, op1, op2, true, true);
                    currentStep.aluOp = 'SUB'; currentStep.cycleCost=3; break;
                }
                case 'INC': {
                    const dest = parts[1], op1 = getValue(dest), result = op1 + 1;
                    setValue(dest, result);
                    setFlagsLogic(result, op1, 1, false, true); // Does not affect CF
                    currentStep.aluOp = 'INC'; currentStep.cycleCost=2; break;
                }
                case 'DEC': {
                    const dest = parts[1], op1 = getValue(dest), result = op1 - 1;
                    setValue(dest, result);
                    setFlagsLogic(result, op1, 1, true, true); // Does not affect CF
                    currentStep.aluOp = 'DEC'; currentStep.cycleCost=2; break;
                }
                case 'AND': case 'OR': case 'XOR': case 'TEST': {
                    const op1 = getValue(parts[1]), op2 = getValue(parts[2]);
                    let result = 0;
                    if (instruction === 'AND' || instruction === 'TEST') result = op1 & op2;
                    else if (instruction === 'OR') result = op1 | op2;
                    else result = op1 ^ op2;
                    if (instruction !== 'TEST') setValue(parts[1], result);
                    flags.CF = 0; flags.OF = 0;
                    setFlagsLogic(result, op1, op2, false, true);
                    currentStep.aluOp = instruction; currentStep.cycleCost=3; break;
                }
                case 'CMP': {
                    const op1 = getValue(parts[1]), op2 = getValue(parts[2]);
                    const result = op1 - op2;
                    flags.CF = op1 < op2 ? 1 : 0;
                    setFlagsLogic(result, op1, op2, true, true);
                    currentStep.aluOp = 'CMP'; currentStep.cycleCost=3; break;
                }
                case 'JMP': pc = labels[parts[1].toUpperCase()]; jumped = true; currentStep.cycleCost=15; break;
                case 'JE': if (flags.ZF === 1) { pc = labels[parts[1].toUpperCase()]; jumped = true; } currentStep.cycleCost= jumped ? 16 : 4; break;
                case 'JNE': if (flags.ZF === 0) { pc = labels[parts[1].toUpperCase()]; jumped = true; } currentStep.cycleCost= jumped ? 16 : 4; break;
                case 'JG': if (flags.ZF === 0 && flags.SF === flags.OF) { pc = labels[parts[1].toUpperCase()]; jumped = true; } currentStep.cycleCost= jumped ? 16 : 4; break;
                case 'JL': if (flags.SF !== flags.OF) { pc = labels[parts[1].toUpperCase()]; jumped = true; } currentStep.cycleCost= jumped ? 16 : 4; break;
                case 'JGE': if (flags.SF === flags.OF) { pc = labels[parts[1].toUpperCase()]; jumped = true; } currentStep.cycleCost= jumped ? 16 : 4; break;
                case 'JLE': if (flags.ZF === 1 || flags.SF !== flags.OF) { pc = labels[parts[1].toUpperCase()]; jumped = true; } currentStep.cycleCost= jumped ? 16 : 4; break;
                case 'JC': if (flags.CF === 1) { pc = labels[parts[1].toUpperCase()]; jumped = true; } currentStep.cycleCost= jumped ? 16 : 4; break;
                case 'JNC': if (flags.CF === 0) { pc = labels[parts[1].toUpperCase()]; jumped = true; } currentStep.cycleCost= jumped ? 16 : 4; break;
                case 'PUSH': regs.SP -= 2; setValue(`[SP]`, getValue(parts[1])); currentStep.cycleCost=11; break;
                case 'POP': setValue(parts[1], getValue(`[SP]`)); regs.SP += 2; currentStep.cycleCost=8; break;
                case 'HLT': output='Execution halted.'; pc=cleanLines.length; currentStep.cycleCost=2; break;
                default: throw new Error(`Unknown instruction: ${instruction}`);
            }
        } catch (e: any) { error = { lineIndex: pc, message: e.message }; break; }

        cycleCount += currentStep.cycleCost!; currentStep.totalCycles = cycleCount;
        const nextPc = jumped ? pc : pc+1;
        currentStep.registers = Object.entries({...regs, IP: nextPc}).map(([n,v])=>({name:n, value:`0x${v.toString(16).padStart(4,'0')}`}));
        const flagString = Object.entries(flags).filter(([,v]) => v === 1).map(([k]) => k).join(' ') || 'NONE';
        currentStep.registers.push({name: 'FLAGS', value: flagString});
        currentStep.memory = Object.entries(memory).map(([a,v])=>({address:`0x${Number(a).toString(16)}`, value:`0x${v.toString(16).padStart(2,'0')}`}));
        trace.push(currentStep as TraceStep);
        if (!jumped) pc++;
    }
    if (!error && executedInstructions >= MAX_INSTRUCTIONS) error = { lineIndex: pc > 0 ? pc - 1 : 0, message: 'Max instruction limit reached.' };
    output = error ? `Error on line ${lineMap[error.lineIndex]+1}: ${error.message}` : (output || 'Execution finished.');
    return { registers: trace[trace.length-1]?.registers || [], memory: trace[trace.length-1]?.memory || [], output, cycles: cycleCount, trace, error };
};

export const runRiscVSimulation = (code: string): SimulationResult => {
    const { labels, cleanLines, lineMap, initialMemory } = preprocessAssemblyCode(code);
    const memory = { ...initialMemory };
    let regs = new Array(32).fill(0);
    let pc = labels['MAIN'] || 0;
    
    let pipeline: { [stage: string]: PipelineStageState } = {
        IF: { instruction: null, pc: null, isBubble: true },
        ID: { instruction: null, pc: null, isBubble: true },
        EX: { instruction: null, pc: null, isBubble: true },
        MEM: { instruction: null, pc: null, isBubble: true },
        WB: { instruction: null, pc: null, isBubble: true }
    };

    const pipelineTrace: PipelineCycleState[] = [];
    let cycle = 0;
    let completedInstructions = 0;

    const ABI_NAMES: { [key: string]: string } = {
        'x0': 'zero', 'x1': 'ra', 'x2': 'sp', 'x3': 'gp', 'x4': 'tp', 'x5': 't0', 'x6': 't1', 'x7': 't2', 'x8': 's0', 'x9': 's1', 'x10': 'a0', 'x11': 'a1', 'x12': 'a2', 'x13': 'a3', 'x14': 'a4', 'x15': 'a5', 'x16': 'a6', 'x17': 'a7', 'x18': 's2', 'x19': 's3', 'x20': 's4', 'x21': 's5', 'x22': 's6', 'x23': 's7', 'x24': 's8', 'x25': 's9', 'x26': 's10', 'x27': 's11', 'x28': 't3', 'x29': 't4', 'x30': 't5', 'x31': 't6'
    };
    
    const getRegAbiName = (regNum: number) => ABI_NAMES[`x${regNum}`] || `x${regNum}`;
    
    const parseInstruction = (instrStr: string | null) => {
        if (!instrStr) return null;
        const parts = robustParse(instrStr);
        const mnemonic = parts[0]?.toUpperCase();
        let rd = null, rs1 = null, rs2 = null, imm = null;

        const regNameToNum = (name: string): number | null => {
            if (!name) return null;
            name = name.toLowerCase();
            const abiIndex = Object.values(ABI_NAMES).indexOf(name);
            if (abiIndex !== -1) {
                const key = Object.keys(ABI_NAMES)[abiIndex];
                return parseInt(key.substring(1));
            }
            if (name.startsWith('x')) {
                const num = parseInt(name.substring(1));
                if (!isNaN(num) && num >= 0 && num < 32) return num;
            }
            if (name === 'zero') return 0;
            return null;
        }

        try {
            switch (mnemonic) {
                case 'ADD': case 'SUB': case 'OR': case 'AND': case 'SLT':
                    rd = regNameToNum(parts[1]); rs1 = regNameToNum(parts[2]); rs2 = regNameToNum(parts[3]); break;
                case 'ADDI': case 'ORI': case 'ANDI': case 'SLLI': case 'SRLI': case 'SRAI': case 'SLTI':
                    rd = regNameToNum(parts[1]); rs1 = regNameToNum(parts[2]); imm = parseImmediate(parts[3]); break;
                case 'LW':
                    rd = regNameToNum(parts[1]);
                    const lwParts = parts[2].match(/(-?\d+)\((.*?)\)/);
                    if (lwParts) { imm = parseImmediate(lwParts[1]); rs1 = regNameToNum(lwParts[2]); } break;
                case 'SW':
                    rs2 = regNameToNum(parts[1]);
                    const swParts = parts[2].match(/(-?\d+)\((.*?)\)/);
                    if (swParts) { imm = parseImmediate(swParts[1]); rs1 = regNameToNum(swParts[2]); } break;
                case 'BNE': case 'BEQ':
                    rs1 = regNameToNum(parts[1]); rs2 = regNameToNum(parts[2]); imm = labels[parts[3].toUpperCase()]; break;
                 case 'LI': rd = regNameToNum(parts[1]); imm = parseImmediate(parts[2]); break;
                 case 'LA': rd = regNameToNum(parts[1]); imm = labels[parts[2].toUpperCase()]; break;
                 case 'ECALL': break;
                default: return { mnemonic, error: `Unknown mnemonic` };
            }
            return { mnemonic, rd, rs1, rs2, imm, text: instrStr };
        } catch (e: any) {
            return { mnemonic, error: e.message, text: instrStr };
        }
    };

    while (cycle < MAX_CYCLES && (completedInstructions < cleanLines.length || !pipeline.WB.isBubble)) {
        let forwardingPaths: any[] = [];
        let hazardInfo: any = null;
        let stall = false;
        let branchTaken = false;
        let branchTargetPC = 0;
        
        const regsBefore = [...regs];

        // --- DECODE & HAZARD DETECTION ---
        const id_instr = parseInstruction(pipeline.ID.instruction);
        const ex_instr = parseInstruction(pipeline.EX.instruction);
        const mem_instr = parseInstruction(pipeline.MEM.instruction);
        
        if (id_instr && ex_instr && ex_instr.mnemonic === 'LW' && ex_instr.rd !== null && ex_instr.rd !== 0) {
            if (id_instr.rs1 === ex_instr.rd || id_instr.rs2 === ex_instr.rd) {
                stall = true;
                hazardInfo = { type: 'Load-Use Hazard (Stalled)', details: `Stalling for LW on ${getRegAbiName(ex_instr.rd)}`};
            }
        }

        // --- EXECUTE STAGES (in logical order for dataflow) ---
        
        // --- EX Stage ---
        let aluResult: number | null = null;
        if (ex_instr && !pipeline.EX.isBubble) {
            let op1 = ex_instr.rs1 !== null ? regsBefore[ex_instr.rs1] : 0;
            let op2 = ex_instr.rs2 !== null ? regsBefore[ex_instr.rs2] : (ex_instr.imm ?? 0);

            // Data Forwarding from MEM stage
            if (mem_instr && mem_instr.rd !== null && mem_instr.rd !== 0) {
                if (mem_instr.rd === ex_instr.rs1) { op1 = pipeline.MEM.aluResult!; forwardingPaths.push({ sourceStage: 'MEM', destStage: 'EX', register: getRegAbiName(mem_instr.rd) });}
                if (mem_instr.rd === ex_instr.rs2) { op2 = pipeline.MEM.aluResult!; forwardingPaths.push({ sourceStage: 'MEM', destStage: 'EX', register: getRegAbiName(mem_instr.rd) });}
            }
            // Data Forwarding from WB stage (value is in memResult or aluResult)
            const wb_instr = parseInstruction(pipeline.WB.instruction);
            if (wb_instr && wb_instr.rd !== null && wb_instr.rd !== 0) {
                const wb_val = pipeline.WB.memResult ?? pipeline.WB.aluResult;
                if(wb_val !== null) {
                    if (wb_instr.rd === ex_instr.rs1) { op1 = wb_val; forwardingPaths.push({ sourceStage: 'WB', destStage: 'EX', register: getRegAbiName(wb_instr.rd) });}
                    if (wb_instr.rd === ex_instr.rs2) { op2 = wb_val; forwardingPaths.push({ sourceStage: 'WB', destStage: 'EX', register: getRegAbiName(wb_instr.rd) });}
                }
            }
            if(forwardingPaths.length > 0 && !hazardInfo) hazardInfo = { type: 'Data Hazard (Forwarded)', details: `Forwarding from ${forwardingPaths[0].sourceStage} to EX`};
            
            switch (ex_instr.mnemonic) {
                case 'ADD': aluResult = op1 + op2; break;
                case 'ADDI': aluResult = op1 + (ex_instr.imm!); break;
                case 'SUB': aluResult = op1 - op2; break;
                case 'AND': aluResult = op1 & op2; break;
                case 'ANDI': aluResult = op1 & (ex_instr.imm!); break;
                case 'OR': aluResult = op1 | op2; break;
                case 'ORI': aluResult = op1 | (ex_instr.imm!); break;
                case 'LW': case 'SW': aluResult = op1 + (ex_instr.imm!); break;
                case 'BEQ': if (op1 === op2 && ex_instr.imm !== null) { branchTargetPC = ex_instr.imm; branchTaken = true; } break;
                case 'BNE': if (op1 !== op2 && ex_instr.imm !== null) { branchTargetPC = ex_instr.imm; branchTaken = true; } break;
                case 'SLLI': aluResult = op1 << (ex_instr.imm! & 0x1F); break;
                case 'SRLI': aluResult = op1 >>> (ex_instr.imm! & 0x1F); break;
                case 'SRAI': aluResult = op1 >> (ex_instr.imm! & 0x1F); break;
                case 'SLT': aluResult = op1 < op2 ? 1 : 0; break;
                case 'SLTI': aluResult = op1 < ex_instr.imm! ? 1 : 0; break;
                case 'LI': case 'LA': aluResult = ex_instr.imm; break;
            }
            if (branchTaken) hazardInfo = { type: 'Control Hazard', details: `Branch taken to 0x${branchTargetPC.toString(16)}. Flushing IF/ID.`};
        }

        // --- MEM Stage ---
        let memResult = pipeline.MEM.aluResult;
        if (mem_instr && !pipeline.MEM.isBubble) {
            if (mem_instr.mnemonic === 'LW') {
                const addr = pipeline.MEM.aluResult!;
                memResult = (memory[addr+3]<<24)|(memory[addr+2]<<16)|(memory[addr+1]<<8)|(memory[addr]||0);
            } else if (mem_instr.mnemonic === 'SW') {
                const addr = pipeline.MEM.aluResult!;
                const val = regsBefore[mem_instr.rs2!];
                memory[addr] = val & 0xFF; memory[addr+1] = (val >> 8) & 0xFF;
                memory[addr+2] = (val >> 16) & 0xFF; memory[addr+3] = (val >> 24) & 0xFF;
            }
        }
        
        // --- WB Stage ---
        const wb_instr_final = parseInstruction(pipeline.WB.instruction);
        let instructionCompleted = null;
        if (wb_instr_final && !pipeline.WB.isBubble) {
            instructionCompleted = wb_instr_final.text;
            completedInstructions++;
            if (wb_instr_final.rd !== null && wb_instr_final.rd !== 0) {
                const valueToWrite = pipeline.WB.memResult ?? pipeline.WB.aluResult;
                if (valueToWrite !== null && typeof valueToWrite !== 'undefined') {
                    regs[wb_instr_final.rd] = valueToWrite;
                }
            }
        }
        
        // --- RECORD STATE FOR THIS CYCLE ---
        pipelineTrace.push({
            cycle: cycle + 1, IF: { ...pipeline.IF }, ID: { ...pipeline.ID }, EX: { ...pipeline.EX }, MEM: { ...pipeline.MEM }, WB: { ...pipeline.WB },
            registers: Array.from({ length: 32 }, (_, i) => ({ name: `${ABI_NAMES[`x${i}`]}(X${i})`, value: `0x${(regs[i] >>> 0).toString(16).padStart(8, '0')}` })),
            memory: Object.entries(memory).map(([a, v]) => ({ address: `0x${Number(a).toString(16)}`, value: `0x${v.toString(16).padStart(2, '0')}` })),
            forwardingPaths, hazardInfo, instructionCompleted
        });

        // --- ADVANCE PIPELINE FOR NEXT CYCLE ---
        pipeline.WB = { ...pipeline.MEM, memResult };
        pipeline.MEM = { ...pipeline.EX, aluResult };
        
        if (stall) {
            pipeline.EX = { instruction: null, pc: null, isBubble: true };
        } else {
            pipeline.EX = { ...pipeline.ID };
        }
        
        if (branchTaken) {
            pipeline.ID = { instruction: null, pc: null, isBubble: true };
            pipeline.IF = { instruction: null, pc: null, isBubble: true };
            pc = branchTargetPC;
        } else if (!stall) {
            pipeline.ID = { ...pipeline.IF };
        }

        if (!stall) {
            if (pc < cleanLines.length) {
                pipeline.IF = { instruction: cleanLines[pc], pc: pc, isBubble: false };
                pc++;
            } else {
                pipeline.IF = { instruction: null, pc: null, isBubble: true };
            }
        }
        
        if (wb_instr_final && wb_instr_final.mnemonic === 'ECALL') break;
        cycle++;
    }

    const finalRegs = pipelineTrace[pipelineTrace.length-1]?.registers || [];
    const finalMem = pipelineTrace[pipelineTrace.length-1]?.memory || [];
    const output = `Execution finished in ${cycle} cycles.`;

    return { registers: finalRegs, memory: finalMem, output, cycles: cycle, pipelineTrace, error: undefined };
};


export const runZ80Simulation = (code: string): SimulationResult => {
    const regs: { [key: string]: number } = { A: 0, F: 0, B: 0, C: 0, D: 0, E: 0, H: 0, L: 0 };
    const { labels, cleanLines, lineMap, initialMemory } = preprocessAssemblyCode(code);
    const memory = { ...initialMemory };
    const trace: TraceStep[] = [];
    let pc = labels['START'] || 0, cycleCount = 0, executedInstructions = 0, output = '', error: SimulationError | undefined = undefined;

    const setFlags = (val: number) => {
        regs.F = (val === 0) ? 0b01000000 : 0;
    };

    while (pc < cleanLines.length && executedInstructions < MAX_INSTRUCTIONS) {
        executedInstructions++;
        const line = cleanLines[pc], parts = robustParse(line), instruction = parts[0]?.toUpperCase();
        let jumped = false;
        const currentStep: Partial<TraceStep> = { lineIndex: pc, instructionText: line, readRegs: [], writeRegs: [], readMem: null, writeMem: null, aluOp: null, cycleCost: 0 };

        try {
            if (!instruction) { pc++; continue; }
            switch (instruction) {
                case 'LD': {
                    const dest = parts[1].toUpperCase();
                    const src = parts[2].toUpperCase();
                    let val: number;
                    if (regs.hasOwnProperty(src)) {
                        val = regs[src];
                        currentStep.readRegs!.push(src);
                    } else if (src.startsWith('(') && src.endsWith(')')) {
                        const addrReg = src.substring(1, src.length - 1);
                        const addr = (regs[addrReg[0]] << 8) | regs[addrReg[1]];
                        val = memory[addr] || 0;
                        currentStep.readRegs!.push(addrReg[0], addrReg[1]);
                        currentStep.readMem = `0x${addr.toString(16)}`;
                    } else {
                        val = parseImmediate(src);
                    }

                    if (regs.hasOwnProperty(dest)) {
                        regs[dest] = val & 0xFF;
                        currentStep.writeRegs!.push(dest);
                    }
                    currentStep.cycleCost = 7;
                    break;
                }
                case 'ADD': {
                    const src = parts[2].toUpperCase();
                    const sum = regs.A + regs[src];
                    regs.A = sum & 0xFF;
                    setFlags(regs.A);
                    currentStep.readRegs!.push('A', src);
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'ADD';
                    currentStep.cycleCost = 4;
                    break;
                }
                case 'DJNZ': {
                    regs.B = (regs.B - 1) & 0xFF;
                    currentStep.readRegs!.push('B');
                    currentStep.writeRegs!.push('B');
                    if (regs.B !== 0) {
                        pc = labels[parts[1].toUpperCase()];
                        jumped = true;
                        currentStep.cycleCost = 13;
                    } else {
                        currentStep.cycleCost = 8;
                    }
                    break;
                }
                case 'HALT':
                    output = 'Execution halted.';
                    pc = cleanLines.length;
                    currentStep.cycleCost = 4;
                    break;
                default:
                    throw new Error(`Unknown instruction: ${instruction}`);
            }
        } catch (e: any) { error = { lineIndex: pc, message: e.message }; break; }
        
        cycleCount += currentStep.cycleCost!; currentStep.totalCycles = cycleCount;
        const nextPc = jumped ? pc : pc + 1;
        currentStep.registers = Object.entries(regs).map(([n, v]) => ({ name: n, value: `0x${v.toString(16).padStart(2, '0')}` }));
        currentStep.registers.push({ name: 'PC', value: `0x${nextPc.toString(16).padStart(4, '0')}` });
        currentStep.memory = Object.entries(memory).map(([a, v]) => ({ address: `0x${Number(a).toString(16)}`, value: `0x${v.toString(16).padStart(2, '0')}` }));
        trace.push(currentStep as TraceStep);
        if (!jumped) pc++;
    }

    if (!error && executedInstructions >= MAX_INSTRUCTIONS) error = { lineIndex: pc > 0 ? pc - 1 : 0, message: 'Max instruction limit reached.' };
    output = error ? `Error on line ${lineMap[error.lineIndex] + 1}: ${error.message}` : (output || 'Execution finished.');
    
    return { registers: trace[trace.length - 1]?.registers || [], memory: trace[trace.length - 1]?.memory || [], output, cycles: cycleCount, trace, error };
};

export const run6502Simulation = (code: string): SimulationResult => {
    const regs: { [key: string]: number } = { A: 0, X: 0, Y: 0 };
    let flags = { C: 0, Z: 0, N: 0, V: 0 };
    const { labels, cleanLines, lineMap, initialMemory } = preprocessAssemblyCode(code);
    const memory = { ...initialMemory };
    const trace: TraceStep[] = [];
    let pc = labels['START'] || 0, cycleCount = 0, executedInstructions = 0, output = '', error: SimulationError | undefined = undefined;

    const getValue = (op: string, step: Partial<TraceStep>): number => {
        if (op.startsWith('#$')) {
            return parseImmediate(op.substring(1));
        }
        if (op.startsWith('$')) {
            const addr = parseImmediate(op);
            step.readMem = `0x${addr.toString(16)}`;
            return memory[addr] || 0;
        }
        const addr = labels[op.toUpperCase()];
        step.readMem = `0x${addr.toString(16)}`;
        return memory[addr] || 0;
    };
    
    const setAddress = (op: string, value: number, step: Partial<TraceStep>): void => {
        let addr: number;
        if (op.startsWith('$')) {
            addr = parseImmediate(op);
        } else {
            addr = labels[op.toUpperCase()];
        }
        memory[addr] = value & 0xFF;
        step.writeMem = `0x${addr.toString(16)}`;
    };

    while (pc < cleanLines.length && executedInstructions < MAX_INSTRUCTIONS) {
        executedInstructions++;
        const line = cleanLines[pc], parts = robustParse(line), instruction = parts[0]?.toUpperCase();
        let jumped = false;
        const currentStep: Partial<TraceStep> = { lineIndex: pc, instructionText: line, readRegs: [], writeRegs: [], readMem: null, writeMem: null, aluOp: null, cycleCost: 0 };

        try {
            if (!instruction) { pc++; continue; }
            switch (instruction) {
                case 'LDA': {
                    regs.A = getValue(parts[1], currentStep);
                    flags.Z = regs.A === 0 ? 1 : 0;
                    currentStep.writeRegs!.push('A');
                    currentStep.cycleCost = 4;
                    break;
                }
                 case 'LDX': regs.X = getValue(parts[1], currentStep); flags.Z = regs.X === 0 ? 1 : 0; currentStep.writeRegs!.push('X'); currentStep.cycleCost = 4; break;
                case 'LDY': regs.Y = getValue(parts[1], currentStep); flags.Z = regs.Y === 0 ? 1 : 0; currentStep.writeRegs!.push('Y'); currentStep.cycleCost = 4; break;
                case 'CLC': {
                    flags.C = 0;
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'ADC': {
                    const val = getValue(parts[1], currentStep);
                    const sum = regs.A + val + flags.C;
                    flags.C = sum > 0xFF ? 1 : 0;
                    regs.A = sum & 0xFF;
                    flags.Z = regs.A === 0 ? 1 : 0;
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'ADC';
                    currentStep.cycleCost = 4;
                    break;
                }
                case 'STA': {
                    setAddress(parts[1], regs.A, currentStep);
                    currentStep.readRegs!.push('A');
                    currentStep.cycleCost = 4;
                    break;
                }
                 case 'BNE': if (flags.Z === 0) { pc = labels[parts[1].toUpperCase()]; jumped = true; } currentStep.cycleCost = 3; break;
                case 'DEX': regs.X = (regs.X - 1) & 0xFF; flags.Z = regs.X === 0 ? 1 : 0; currentStep.writeRegs!.push('X'); currentStep.cycleCost = 2; break;
                case 'BRK': {
                    output = 'Execution halted.';
                    pc = cleanLines.length;
                    currentStep.cycleCost = 7;
                    break;
                }
                default:
                    throw new Error(`Unknown instruction: ${instruction}`);
            }
        } catch (e: any) { error = { lineIndex: pc, message: e.message }; break; }
        
        cycleCount += currentStep.cycleCost!; currentStep.totalCycles = cycleCount;
        const nextPc = jumped ? pc : pc + 1;
        const statusReg = (flags.N << 7) | (flags.V << 6) | (1 << 5) | (0 << 4) | (0 << 3) | (flags.Z << 1) | flags.C;
        currentStep.registers = Object.entries(regs).map(([n, v]) => ({ name: n, value: `$${v.toString(16).padStart(2, '0')}` }));
        currentStep.registers.push({ name: 'P', value: `$${statusReg.toString(16).padStart(2, '0')}` });
        currentStep.registers.push({ name: 'PC', value: `$${nextPc.toString(16).padStart(4, '0')}` });
        currentStep.memory = Object.entries(memory).map(([a, v]) => ({ address: `0x${Number(a).toString(16)}`, value: `$${v.toString(16).padStart(2, '0')}` }));
        trace.push(currentStep as TraceStep);
        if (!jumped) pc++;
    }

    if (!error && executedInstructions >= MAX_INSTRUCTIONS) error = { lineIndex: pc > 0 ? pc - 1 : 0, message: 'Max instruction limit reached.' };
    output = error ? `Error on line ${lineMap[error.lineIndex] + 1}: ${error.message}` : (output || 'Execution finished.');
    
    return { registers: trace[trace.length - 1]?.registers || [], memory: trace[trace.length - 1]?.memory || [], output, cycles: cycleCount, trace, error };
};