// FIX: Import PipelineStageState to resolve 'Cannot find name' error.
import { SimulationResult, TraceStep, SimulationError, PipelineCycleState, PipelineStageState } from '../types';

// --- SIMULATION LOGIC ---
const MAX_INSTRUCTIONS = 10000;
const MAX_CYCLES = 50000;

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
    const registers: { [key: string]: number } = { 
        'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'H': 0, 'L': 0, 'SP': 0xFFFF, 'PC': 0 
    };
    const flags = { S: 0, Z: 0, AC: 0, P: 0, CY: 0 };
    const { labels, cleanLines, lineMap, initialMemory } = preprocessAssemblyCode(code);
    const memory = { ...initialMemory };
    const trace: TraceStep[] = [];
    let pc = labels['START'] || labels['MAIN'] || 0;
    let cycleCount = 0, executedInstructions = 0, output = '', error: SimulationError | undefined = undefined;

    const setFlags = (result: number, isArithmetic = false) => {
        flags.Z = (result & 0xFF) === 0 ? 1 : 0;
        flags.S = (result & 0x80) ? 1 : 0;
        let parity = 0;
        for (let i = 0; i < 8; i++) {
            if (result & (1 << i)) parity++;
        }
        flags.P = (parity % 2 === 0) ? 1 : 0;
        if (isArithmetic) {
            flags.CY = result > 0xFF ? 1 : 0;
            flags.AC = ((registers.A & 0x0F) + (result & 0x0F)) > 0x0F ? 1 : 0;
        }
    };

    const getHL = () => (registers.H << 8) | registers.L;
    const setHL = (val: number) => { registers.H = (val >> 8) & 0xFF; registers.L = val & 0xFF; };
    const getBC = () => (registers.B << 8) | registers.C;
    const setBC = (val: number) => { registers.B = (val >> 8) & 0xFF; registers.C = val & 0xFF; };
    const getDE = () => (registers.D << 8) | registers.E;
    const setDE = (val: number) => { registers.D = (val >> 8) & 0xFF; registers.E = val & 0xFF; };

    while (pc < cleanLines.length && executedInstructions < MAX_INSTRUCTIONS && cycleCount < MAX_CYCLES) {
        executedInstructions++;
        const line = cleanLines[pc];
        const parts = robustParse(line);
        const instruction = parts[0]?.toUpperCase();
        let jumped = false;
        const currentStep: Partial<TraceStep> = { 
            lineIndex: pc, instructionText: line, readRegs: [], writeRegs: [], 
            readMem: null, writeMem: null, aluOp: null, cycleCost: 0 
        };

        try {
            if (!instruction) { pc++; continue; }
            
            switch (instruction) {
                // Data Transfer Instructions
                case 'MOV': {
                    const dest = parts[1].toUpperCase();
                    const src = parts[2].toUpperCase();
                    if (dest === 'M') {
                        const addr = getHL();
                        memory[addr] = registers[src];
                        currentStep.readRegs!.push('H', 'L', src);
                        currentStep.writeMem = `0x${addr.toString(16)}`;
                        currentStep.cycleCost = 7;
                    } else if (src === 'M') {
                        const addr = getHL();
                        registers[dest] = memory[addr] || 0;
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.readMem = `0x${addr.toString(16)}`;
                        currentStep.writeRegs!.push(dest);
                        currentStep.cycleCost = 7;
                    } else {
                        registers[dest] = registers[src];
                        currentStep.readRegs!.push(src);
                        currentStep.writeRegs!.push(dest);
                        currentStep.cycleCost = 5;
                    }
                    break;
                }
                case 'MVI': {
                    const dest = parts[1].toUpperCase();
                    const value = parseImmediate(parts[2]) & 0xFF;
                    if (dest === 'M') {
                        const addr = getHL();
                        memory[addr] = value;
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.writeMem = `0x${addr.toString(16)}`;
                        currentStep.cycleCost = 10;
                    } else {
                        registers[dest] = value;
                        currentStep.writeRegs!.push(dest);
                        currentStep.cycleCost = 7;
                    }
                    break;
                }
                case 'LXI': {
                    const regPair = parts[1].toUpperCase();
                    let val = labels[parts[2].toUpperCase()] ?? parseImmediate(parts[2]);
                    val = val & 0xFFFF;
                    if (regPair === 'H') {
                        setHL(val);
                        currentStep.writeRegs!.push('H', 'L');
                    } else if (regPair === 'B') {
                        setBC(val);
                        currentStep.writeRegs!.push('B', 'C');
                    } else if (regPair === 'D') {
                        setDE(val);
                        currentStep.writeRegs!.push('D', 'E');
                    } else if (regPair === 'SP') {
                        registers.SP = val;
                        currentStep.writeRegs!.push('SP');
                    }
                    currentStep.cycleCost = 10;
                    break;
                }
                case 'LDA': {
                    const addr = labels[parts[1].toUpperCase()] ?? parseImmediate(parts[1]);
                    registers.A = memory[addr] || 0;
                    currentStep.readMem = `0x${addr.toString(16)}`;
                    currentStep.writeRegs!.push('A');
                    currentStep.cycleCost = 13;
                    break;
                }
                case 'STA': {
                    const addr = labels[parts[1].toUpperCase()] ?? parseImmediate(parts[1]);
                    memory[addr] = registers.A;
                    currentStep.readRegs!.push('A');
                    currentStep.writeMem = `0x${addr.toString(16)}`;
                    currentStep.cycleCost = 13;
                    break;
                }
                case 'LDAX': {
                    const regPair = parts[1].toUpperCase();
                    const addr = regPair === 'B' ? getBC() : getDE();
                    registers.A = memory[addr] || 0;
                    currentStep.readRegs!.push(regPair === 'B' ? 'B' : 'D', regPair === 'B' ? 'C' : 'E');
                    currentStep.readMem = `0x${addr.toString(16)}`;
                    currentStep.writeRegs!.push('A');
                    currentStep.cycleCost = 7;
                    break;
                }
                case 'STAX': {
                    const regPair = parts[1].toUpperCase();
                    const addr = regPair === 'B' ? getBC() : getDE();
                    memory[addr] = registers.A;
                    currentStep.readRegs!.push('A', regPair === 'B' ? 'B' : 'D', regPair === 'B' ? 'C' : 'E');
                    currentStep.writeMem = `0x${addr.toString(16)}`;
                    currentStep.cycleCost = 7;
                    break;
                }
                case 'LHLD': {
                    const addr = labels[parts[1].toUpperCase()] ?? parseImmediate(parts[1]);
                    registers.L = memory[addr] || 0;
                    registers.H = memory[addr + 1] || 0;
                    currentStep.readMem = `0x${addr.toString(16)}`;
                    currentStep.writeRegs!.push('H', 'L');
                    currentStep.cycleCost = 16;
                    break;
                }
                case 'SHLD': {
                    const addr = labels[parts[1].toUpperCase()] ?? parseImmediate(parts[1]);
                    memory[addr] = registers.L;
                    memory[addr + 1] = registers.H;
                    currentStep.readRegs!.push('H', 'L');
                    currentStep.writeMem = `0x${addr.toString(16)}`;
                    currentStep.cycleCost = 16;
                    break;
                }
                case 'XCHG': {
                    const tempH = registers.H, tempL = registers.L;
                    registers.H = registers.D;
                    registers.L = registers.E;
                    registers.D = tempH;
                    registers.E = tempL;
                    currentStep.readRegs!.push('H', 'L', 'D', 'E');
                    currentStep.writeRegs!.push('H', 'L', 'D', 'E');
                    currentStep.cycleCost = 5;
                    break;
                }

                // Arithmetic Instructions
                case 'ADD': {
                    const src = parts[1].toUpperCase();
                    let operand;
                    if (src === 'M') {
                        const addr = getHL();
                        operand = memory[addr] || 0;
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.readMem = `0x${addr.toString(16)}`;
                        currentStep.cycleCost = 7;
                    } else {
                        operand = registers[src];
                        currentStep.readRegs!.push(src);
                        currentStep.cycleCost = 4;
                    }
                    const result = registers.A + operand;
                    registers.A = result & 0xFF;
                    setFlags(result, true);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'ADD';
                    break;
                }
                case 'ADI': {
                    const operand = parseImmediate(parts[1]);
                    const result = registers.A + operand;
                    registers.A = result & 0xFF;
                    setFlags(result, true);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'ADD';
                    currentStep.cycleCost = 7;
                    break;
                }
                case 'ADC': {
                    const src = parts[1].toUpperCase();
                    let operand;
                    if (src === 'M') {
                        const addr = getHL();
                        operand = memory[addr] || 0;
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.readMem = `0x${addr.toString(16)}`;
                        currentStep.cycleCost = 7;
                    } else {
                        operand = registers[src];
                        currentStep.readRegs!.push(src);
                        currentStep.cycleCost = 4;
                    }
                    const result = registers.A + operand + flags.CY;
                    registers.A = result & 0xFF;
                    setFlags(result, true);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'ADC';
                    break;
                }
                case 'ACI': {
                    const operand = parseImmediate(parts[1]);
                    const result = registers.A + operand + flags.CY;
                    registers.A = result & 0xFF;
                    setFlags(result, true);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'ADC';
                    currentStep.cycleCost = 7;
                    break;
                }
                case 'SUB': {
                    const src = parts[1].toUpperCase();
                    let operand;
                    if (src === 'M') {
                        const addr = getHL();
                        operand = memory[addr] || 0;
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.readMem = `0x${addr.toString(16)}`;
                        currentStep.cycleCost = 7;
                    } else {
                        operand = registers[src];
                        currentStep.readRegs!.push(src);
                        currentStep.cycleCost = 4;
                    }
                    const result = registers.A - operand;
                    registers.A = result & 0xFF;
                    flags.CY = result < 0 ? 1 : 0;
                    setFlags(result);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'SUB';
                    break;
                }
                case 'SUI': {
                    const operand = parseImmediate(parts[1]);
                    const result = registers.A - operand;
                    registers.A = result & 0xFF;
                    flags.CY = result < 0 ? 1 : 0;
                    setFlags(result);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'SUB';
                    currentStep.cycleCost = 7;
                    break;
                }
                case 'SBB': {
                    const src = parts[1].toUpperCase();
                    let operand;
                    if (src === 'M') {
                        const addr = getHL();
                        operand = memory[addr] || 0;
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.readMem = `0x${addr.toString(16)}`;
                        currentStep.cycleCost = 7;
                    } else {
                        operand = registers[src];
                        currentStep.readRegs!.push(src);
                        currentStep.cycleCost = 4;
                    }
                    const result = registers.A - operand - flags.CY;
                    registers.A = result & 0xFF;
                    flags.CY = result < 0 ? 1 : 0;
                    setFlags(result);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'SBB';
                    break;
                }
                case 'SBI': {
                    const operand = parseImmediate(parts[1]);
                    const result = registers.A - operand - flags.CY;
                    registers.A = result & 0xFF;
                    flags.CY = result < 0 ? 1 : 0;
                    setFlags(result);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'SBB';
                    currentStep.cycleCost = 7;
                    break;
                }
                case 'INR': {
                    const reg = parts[1].toUpperCase();
                    if (reg === 'M') {
                        const addr = getHL();
                        const result = ((memory[addr] || 0) + 1) & 0xFF;
                        memory[addr] = result;
                        setFlags(result);
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.readMem = `0x${addr.toString(16)}`;
                        currentStep.writeMem = `0x${addr.toString(16)}`;
                        currentStep.cycleCost = 10;
                    } else {
                        const result = (registers[reg] + 1) & 0xFF;
                        registers[reg] = result;
                        setFlags(result);
                        currentStep.readRegs!.push(reg);
                        currentStep.writeRegs!.push(reg);
                        currentStep.cycleCost = 5;
                    }
                    currentStep.aluOp = 'INC';
                    break;
                }
                case 'DCR': {
                    const reg = parts[1].toUpperCase();
                    if (reg === 'M') {
                        const addr = getHL();
                        const result = ((memory[addr] || 0) - 1) & 0xFF;
                        memory[addr] = result;
                        setFlags(result);
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.readMem = `0x${addr.toString(16)}`;
                        currentStep.writeMem = `0x${addr.toString(16)}`;
                        currentStep.cycleCost = 10;
                    } else {
                        const result = (registers[reg] - 1) & 0xFF;
                        registers[reg] = result;
                        setFlags(result);
                        currentStep.readRegs!.push(reg);
                        currentStep.writeRegs!.push(reg);
                        currentStep.cycleCost = 5;
                    }
                    currentStep.aluOp = 'DEC';
                    break;
                }
                case 'INX': {
                    const regPair = parts[1].toUpperCase();
                    if (regPair === 'H') {
                        setHL((getHL() + 1) & 0xFFFF);
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.writeRegs!.push('H', 'L');
                    } else if (regPair === 'B') {
                        setBC((getBC() + 1) & 0xFFFF);
                        currentStep.readRegs!.push('B', 'C');
                        currentStep.writeRegs!.push('B', 'C');
                    } else if (regPair === 'D') {
                        setDE((getDE() + 1) & 0xFFFF);
                        currentStep.readRegs!.push('D', 'E');
                        currentStep.writeRegs!.push('D', 'E');
                    } else if (regPair === 'SP') {
                        registers.SP = (registers.SP + 1) & 0xFFFF;
                        currentStep.readRegs!.push('SP');
                        currentStep.writeRegs!.push('SP');
                    }
                    currentStep.cycleCost = 5;
                    break;
                }
                case 'DCX': {
                    const regPair = parts[1].toUpperCase();
                    if (regPair === 'H') {
                        setHL((getHL() - 1) & 0xFFFF);
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.writeRegs!.push('H', 'L');
                    } else if (regPair === 'B') {
                        setBC((getBC() - 1) & 0xFFFF);
                        currentStep.readRegs!.push('B', 'C');
                        currentStep.writeRegs!.push('B', 'C');
                    } else if (regPair === 'D') {
                        setDE((getDE() - 1) & 0xFFFF);
                        currentStep.readRegs!.push('D', 'E');
                        currentStep.writeRegs!.push('D', 'E');
                    } else if (regPair === 'SP') {
                        registers.SP = (registers.SP - 1) & 0xFFFF;
                        currentStep.readRegs!.push('SP');
                        currentStep.writeRegs!.push('SP');
                    }
                    currentStep.cycleCost = 5;
                    break;
                }
                case 'DAD': {
                    const regPair = parts[1].toUpperCase();
                    let operand;
                    if (regPair === 'H') {
                        operand = getHL();
                        currentStep.readRegs!.push('H', 'L');
                    } else if (regPair === 'B') {
                        operand = getBC();
                        currentStep.readRegs!.push('B', 'C');
                    } else if (regPair === 'D') {
                        operand = getDE();
                        currentStep.readRegs!.push('D', 'E');
                    } else if (regPair === 'SP') {
                        operand = registers.SP;
                        currentStep.readRegs!.push('SP');
                    }
                    const result = getHL() + operand;
                    flags.CY = result > 0xFFFF ? 1 : 0;
                    setHL(result & 0xFFFF);
                    currentStep.readRegs!.push('H', 'L');
                    currentStep.writeRegs!.push('H', 'L');
                    currentStep.aluOp = 'ADD';
                    currentStep.cycleCost = 10;
                    break;
                }

                // Logical Instructions
                case 'ANA': {
                    const src = parts[1].toUpperCase();
                    let operand;
                    if (src === 'M') {
                        const addr = getHL();
                        operand = memory[addr] || 0;
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.readMem = `0x${addr.toString(16)}`;
                        currentStep.cycleCost = 7;
                    } else {
                        operand = registers[src];
                        currentStep.readRegs!.push(src);
                        currentStep.cycleCost = 4;
                    }
                    registers.A = registers.A & operand;
                    flags.CY = 0;
                    setFlags(registers.A);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'AND';
                    break;
                }
                case 'ANI': {
                    const operand = parseImmediate(parts[1]);
                    registers.A = registers.A & operand;
                    flags.CY = 0;
                    setFlags(registers.A);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'AND';
                    currentStep.cycleCost = 7;
                    break;
                }
                case 'ORA': {
                    const src = parts[1].toUpperCase();
                    let operand;
                    if (src === 'M') {
                        const addr = getHL();
                        operand = memory[addr] || 0;
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.readMem = `0x${addr.toString(16)}`;
                        currentStep.cycleCost = 7;
                    } else {
                        operand = registers[src];
                        currentStep.readRegs!.push(src);
                        currentStep.cycleCost = 4;
                    }
                    registers.A = registers.A | operand;
                    flags.CY = 0;
                    setFlags(registers.A);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'OR';
                    break;
                }
                case 'ORI': {
                    const operand = parseImmediate(parts[1]);
                    registers.A = registers.A | operand;
                    flags.CY = 0;
                    setFlags(registers.A);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'OR';
                    currentStep.cycleCost = 7;
                    break;
                }
                case 'XRA': {
                    const src = parts[1].toUpperCase();
                    let operand;
                    if (src === 'M') {
                        const addr = getHL();
                        operand = memory[addr] || 0;
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.readMem = `0x${addr.toString(16)}`;
                        currentStep.cycleCost = 7;
                    } else {
                        operand = registers[src];
                        currentStep.readRegs!.push(src);
                        currentStep.cycleCost = 4;
                    }
                    registers.A = registers.A ^ operand;
                    flags.CY = 0;
                    setFlags(registers.A);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'XOR';
                    break;
                }
                case 'XRI': {
                    const operand = parseImmediate(parts[1]);
                    registers.A = registers.A ^ operand;
                    flags.CY = 0;
                    setFlags(registers.A);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'XOR';
                    currentStep.cycleCost = 7;
                    break;
                }
                case 'CMP': {
                    const src = parts[1].toUpperCase();
                    let operand;
                    if (src === 'M') {
                        const addr = getHL();
                        operand = memory[addr] || 0;
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.readMem = `0x${addr.toString(16)}`;
                        currentStep.cycleCost = 7;
                    } else {
                        operand = registers[src];
                        currentStep.readRegs!.push(src);
                        currentStep.cycleCost = 4;
                    }
                    const result = registers.A - operand;
                    flags.CY = result < 0 ? 1 : 0;
                    setFlags(result);
                    currentStep.readRegs!.push('A');
                    currentStep.aluOp = 'CMP';
                    break;
                }
                case 'CPI': {
                    const operand = parseImmediate(parts[1]);
                    const result = registers.A - operand;
                    flags.CY = result < 0 ? 1 : 0;
                    setFlags(result);
                    currentStep.readRegs!.push('A');
                    currentStep.aluOp = 'CMP';
                    currentStep.cycleCost = 7;
                    break;
                }

                // Rotate Instructions
                case 'RLC': {
                    const bit7 = (registers.A & 0x80) >> 7;
                    registers.A = ((registers.A << 1) | bit7) & 0xFF;
                    flags.CY = bit7;
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'ROL';
                    currentStep.cycleCost = 4;
                    break;
                }
                case 'RRC': {
                    const bit0 = registers.A & 0x01;
                    registers.A = ((registers.A >> 1) | (bit0 << 7)) & 0xFF;
                    flags.CY = bit0;
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'ROR';
                    currentStep.cycleCost = 4;
                    break;
                }
                case 'RAL': {
                    const bit7 = (registers.A & 0x80) >> 7;
                    registers.A = ((registers.A << 1) | flags.CY) & 0xFF;
                    flags.CY = bit7;
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'ROL';
                    currentStep.cycleCost = 4;
                    break;
                }
                case 'RAR': {
                    const bit0 = registers.A & 0x01;
                    registers.A = ((registers.A >> 1) | (flags.CY << 7)) & 0xFF;
                    flags.CY = bit0;
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'ROR';
                    currentStep.cycleCost = 4;
                    break;
                }
                case 'CMA': {
                    registers.A = (~registers.A) & 0xFF;
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'NOT';
                    currentStep.cycleCost = 4;
                    break;
                }
                case 'CMC': {
                    flags.CY = flags.CY ? 0 : 1;
                    currentStep.cycleCost = 4;
                    break;
                }
                case 'STC': {
                    flags.CY = 1;
                    currentStep.cycleCost = 4;
                    break;
                }

                // Branch Instructions
                case 'JMP': {
                    const target = labels[parts[1].toUpperCase()];
                    if (target !== undefined) {
                        pc = target;
                        jumped = true;
                    } else {
                        throw new Error(`Undefined label: ${parts[1]}`);
                    }
                    currentStep.cycleCost = 10;
                    break;
                }
                case 'JNZ': {
                    if (flags.Z === 0) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = 10;
                    break;
                }
                case 'JZ': {
                    if (flags.Z === 1) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = 10;
                    break;
                }
                case 'JNC': {
                    if (flags.CY === 0) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = 10;
                    break;
                }
                case 'JC': {
                    if (flags.CY === 1) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = 10;
                    break;
                }
                case 'JPO': {
                    if (flags.P === 0) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = 10;
                    break;
                }
                case 'JPE': {
                    if (flags.P === 1) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = 10;
                    break;
                }
                case 'JP': {
                    if (flags.S === 0) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = 10;
                    break;
                }
                case 'JM': {
                    if (flags.S === 1) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = 10;
                    break;
                }

                // Stack Instructions
                case 'PUSH': {
                    const regPair = parts[1].toUpperCase();
                    let high, low;
                    if (regPair === 'B') {
                        high = registers.B; low = registers.C;
                        currentStep.readRegs!.push('B', 'C');
                    } else if (regPair === 'D') {
                        high = registers.D; low = registers.E;
                        currentStep.readRegs!.push('D', 'E');
                    } else if (regPair === 'H') {
                        high = registers.H; low = registers.L;
                        currentStep.readRegs!.push('H', 'L');
                    } else if (regPair === 'PSW') {
                        high = registers.A;
                        low = (flags.S << 7) | (flags.Z << 6) | (flags.AC << 4) | (flags.P << 2) | (1 << 1) | flags.CY;
                        currentStep.readRegs!.push('A');
                    }
                    registers.SP = (registers.SP - 1) & 0xFFFF;
                    memory[registers.SP] = high;
                    registers.SP = (registers.SP - 1) & 0xFFFF;
                    memory[registers.SP] = low;
                    currentStep.readRegs!.push('SP');
                    currentStep.writeRegs!.push('SP');
                    currentStep.writeMem = `0x${registers.SP.toString(16)}`;
                    currentStep.cycleCost = 11;
                    break;
                }
                case 'POP': {
                    const regPair = parts[1].toUpperCase();
                    const low = memory[registers.SP] || 0;
                    registers.SP = (registers.SP + 1) & 0xFFFF;
                    const high = memory[registers.SP] || 0;
                    registers.SP = (registers.SP + 1) & 0xFFFF;
                    
                    if (regPair === 'B') {
                        registers.B = high; registers.C = low;
                        currentStep.writeRegs!.push('B', 'C');
                    } else if (regPair === 'D') {
                        registers.D = high; registers.E = low;
                        currentStep.writeRegs!.push('D', 'E');
                    } else if (regPair === 'H') {
                        registers.H = high; registers.L = low;
                        currentStep.writeRegs!.push('H', 'L');
                    } else if (regPair === 'PSW') {
                        registers.A = high;
                        flags.S = (low & 0x80) ? 1 : 0;
                        flags.Z = (low & 0x40) ? 1 : 0;
                        flags.AC = (low & 0x10) ? 1 : 0;
                        flags.P = (low & 0x04) ? 1 : 0;
                        flags.CY = (low & 0x01) ? 1 : 0;
                        currentStep.writeRegs!.push('A');
                    }
                    currentStep.readRegs!.push('SP');
                    currentStep.writeRegs!.push('SP');
                    currentStep.readMem = `0x${(registers.SP - 2).toString(16)}`;
                    currentStep.cycleCost = 10;
                    break;
                }
                case 'XTHL': {
                    const tempL = registers.L;
                    const tempH = registers.H;
                    registers.L = memory[registers.SP] || 0;
                    registers.H = memory[registers.SP + 1] || 0;
                    memory[registers.SP] = tempL;
                    memory[registers.SP + 1] = tempH;
                    currentStep.readRegs!.push('H', 'L', 'SP');
                    currentStep.writeRegs!.push('H', 'L');
                    currentStep.readMem = `0x${registers.SP.toString(16)}`;
                    currentStep.writeMem = `0x${registers.SP.toString(16)}`;
                    currentStep.cycleCost = 18;
                    break;
                }
                case 'SPHL': {
                    registers.SP = getHL();
                    currentStep.readRegs!.push('H', 'L');
                    currentStep.writeRegs!.push('SP');
                    currentStep.cycleCost = 5;
                    break;
                }

                // Call and Return Instructions
                case 'CALL': {
                    const target = labels[parts[1].toUpperCase()];
                    if (target !== undefined) {
                        const returnAddr = pc + 1;
                        registers.SP = (registers.SP - 1) & 0xFFFF;
                        memory[registers.SP] = (returnAddr >> 8) & 0xFF;
                        registers.SP = (registers.SP - 1) & 0xFFFF;
                        memory[registers.SP] = returnAddr & 0xFF;
                        pc = target;
                        jumped = true;
                        currentStep.readRegs!.push('SP');
                        currentStep.writeRegs!.push('SP');
                        currentStep.writeMem = `0x${registers.SP.toString(16)}`;
                    } else {
                        throw new Error(`Undefined label: ${parts[1]}`);
                    }
                    currentStep.cycleCost = 17;
                    break;
                }
                case 'RET': {
                    const lowByte = memory[registers.SP] || 0;
                    registers.SP = (registers.SP + 1) & 0xFFFF;
                    const highByte = memory[registers.SP] || 0;
                    registers.SP = (registers.SP + 1) & 0xFFFF;
                    pc = (highByte << 8) | lowByte;
                    jumped = true;
                    currentStep.readRegs!.push('SP');
                    currentStep.writeRegs!.push('SP');
                    currentStep.readMem = `0x${(registers.SP - 2).toString(16)}`;
                    currentStep.cycleCost = 10;
                    break;
                }

                // I/O and Machine Control
                case 'IN': {
                    const port = parseImmediate(parts[1]);
                    registers.A = 0; // Simulate reading 0 from port
                    currentStep.writeRegs!.push('A');
                    currentStep.cycleCost = 10;
                    break;
                }
                case 'OUT': {
                    const port = parseImmediate(parts[1]);
                    // Simulate output - could add to output string
                    output += `OUT ${port}: ${registers.A.toString(16)}\n`;
                    currentStep.readRegs!.push('A');
                    currentStep.cycleCost = 10;
                    break;
                }
                case 'EI': {
                    // Enable interrupts (no-op in simulation)
                    currentStep.cycleCost = 4;
                    break;
                }
                case 'DI': {
                    // Disable interrupts (no-op in simulation)
                    currentStep.cycleCost = 4;
                    break;
                }
                case 'NOP': {
                    currentStep.cycleCost = 4;
                    break;
                }
                case 'HLT': {
                    output = output || 'Execution halted.';
                    pc = cleanLines.length;
                    currentStep.cycleCost = 7;
                    break;
                }

                default:
                    throw new Error(`Unknown instruction: ${instruction}`);
            }
        } catch (e: any) {
            error = { lineIndex: pc, message: e.message };
            break;
        }
        
        cycleCount += currentStep.cycleCost!;
        currentStep.totalCycles = cycleCount;
        const nextPc = jumped ? pc : pc + 1;
        
        // Build register state
        const regEntries = Object.entries(registers).map(([n, v]) => ({
            name: n,
            value: `0x${v.toString(16).padStart(n === 'SP' || n === 'PC' ? 4 : 2, '0')}`
        }));
        regEntries.push({ name: 'PC', value: `0x${nextPc.toString(16).padStart(4, '0')}` });
        
        // Add flags
        const flagString = Object.entries(flags)
            .filter(([, v]) => v === 1)
            .map(([k]) => k)
            .join(' ') || 'NONE';
        regEntries.push({ name: 'FLAGS', value: flagString });
        
        currentStep.registers = regEntries;
        currentStep.memory = Object.entries(memory).map(([a, v]) => ({
            address: `0x${Number(a).toString(16)}`,
            value: `0x${v.toString(16).padStart(2, '0')}`
        }));
        
        trace.push(currentStep as TraceStep);
        if (!jumped) pc++;
    }

    if (!error && executedInstructions >= MAX_INSTRUCTIONS) {
        error = { lineIndex: pc > 0 ? pc - 1 : 0, message: 'Max instruction limit reached.' };
    }
    if (!error && cycleCount >= MAX_CYCLES) {
        error = { lineIndex: pc > 0 ? pc - 1 : 0, message: 'Max cycle limit reached.' };
    }
    
    output = error ? `Error on line ${lineMap[error.lineIndex] + 1}: ${error.message}` : (output || 'Execution finished.');
    
    return {
        registers: trace[trace.length - 1]?.registers || [],
        memory: trace[trace.length - 1]?.memory || [],
        output,
        cycles: cycleCount,
        trace,
        error
    };
};

export const run8086Simulation = (code: string): SimulationResult => {
    const regs: { [key: string]: number } = { 
        AX: 0, BX: 0, CX: 0, DX: 0, SI: 0, DI: 0, BP: 0, SP: 0x1000, IP: 0,
        CS: 0, DS: 0, ES: 0, SS: 0
    };
    const flags = { CF: 0, ZF: 0, SF: 0, OF: 0, PF: 0, AF: 0, IF: 1, DF: 0, TF: 0 };
    const { labels, cleanLines, lineMap, initialMemory } = preprocessAssemblyCode(code);
    const memory = { ...initialMemory };
    const trace: TraceStep[] = [];
    let pc = labels['START'] || labels['MAIN'] || 0;
    let cycleCount = 0, executedInstructions = 0, output = '', error: SimulationError | undefined = undefined;

    const setFlags = (result: number, op1: number, op2: number, isSub: boolean, is16bit: boolean) => {
        const size = is16bit ? 0xFFFF : 0xFF;
        const msb = is16bit ? 0x8000 : 0x80;
        flags.ZF = (result & size) === 0 ? 1 : 0;
        flags.SF = (result & msb) ? 1 : 0;
        const op1Sign = (op1 & msb) !== 0;
        const op2Sign = (op2 & msb) !== 0;
        const resSign = (result & msb) !== 0;
        if (isSub) {
            flags.OF = (op1Sign !== op2Sign) && (op1Sign !== resSign) ? 1 : 0;
        } else {
            flags.OF = (op1Sign === op2Sign) && (op1Sign !== resSign) ? 1 : 0;
        }
        let pCount = 0;
        for (let i = 0; i < 8; i++) {
            if ((result & (1 << i)) > 0) pCount++;
        }
        flags.PF = (pCount % 2 === 0) ? 1 : 0;
    };

    const getEffectiveAddress = (expr: string, step: Partial<TraceStep>): number => {
        let address = 0;
        const upper = expr.toUpperCase().replace(/\s/g, '');
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
                step.readRegs!.push(token);
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
        return address & 0xFFFF;
    };

    const getValue = (op: string, step: Partial<TraceStep>, is16bit = true): number => {
        const upper = op.toUpperCase();
        if (regs.hasOwnProperty(upper)) {
            step.readRegs!.push(upper);
            return regs[upper];
        }
        const memMatch = op.match(/\[(.*?)\]/);
        if (memMatch) {
            const expr = memMatch[1];
            const addr = labels[expr.toUpperCase()] ?? getEffectiveAddress(expr, step);
            step.readMem = `0x${addr.toString(16)}`;
            const lowByte = memory[addr] || 0;
            const highByte = is16bit ? (memory[addr + 1] || 0) : 0;
            return (highByte << 8) | lowByte;
        }
        return parseImmediate(op);
    };

    const setValue = (op: string, value: number, step: Partial<TraceStep>, is16bit = true) => {
        const upper = op.toUpperCase();
        if (regs.hasOwnProperty(upper)) {
            regs[upper] = value & 0xFFFF;
            step.writeRegs!.push(upper);
        } else {
            const memMatch = op.match(/\[(.*?)\]/);
            if (memMatch) {
                const expr = memMatch[1];
                const addr = labels[expr.toUpperCase()] ?? getEffectiveAddress(expr, step);
                memory[addr] = value & 0xFF;
                if (is16bit) memory[addr + 1] = (value >> 8) & 0xFF;
                step.writeMem = `0x${addr.toString(16)}`;
            } else {
                throw new Error(`Invalid destination operand: ${op}`);
            }
        }
    };

    while (pc < cleanLines.length && executedInstructions < MAX_INSTRUCTIONS && cycleCount < MAX_CYCLES) {
        executedInstructions++;
        const line = cleanLines[pc];
        const parts = robustParse(line);
        const instruction = parts[0]?.toUpperCase();
        let jumped = false;
        const currentStep: Partial<TraceStep> = {
            lineIndex: pc, instructionText: line, readRegs: [], writeRegs: [],
            readMem: null, writeMem: null, aluOp: null, cycleCost: 0
        };

        try {
            if (!instruction) { pc++; continue; }

            switch (instruction) {
                // Data Transfer Instructions
                case 'MOV': {
                    setValue(parts[1], getValue(parts[2], currentStep), currentStep);
                    currentStep.cycleCost = 4;
                    break;
                }
                case 'XCHG': {
                    const temp = regs.AX;
                    regs.AX = regs.DX;
                    regs.DX = temp;
                    currentStep.readRegs!.push('AX', 'DX');
                    currentStep.writeRegs!.push('AX', 'DX');
                    currentStep.cycleCost = 4;
                    break;
                }
                case 'LEA': {
                    const memMatch = parts[2].match(/\[(.*?)\]/);
                    if (memMatch) {
                        const addr = getEffectiveAddress(memMatch[1], currentStep);
                        setValue(parts[1], addr, currentStep);
                    }
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'LDS': case 'LES': {
                    const memMatch = parts[2].match(/\[(.*?)\]/);
                    if (memMatch) {
                        const addr = getEffectiveAddress(memMatch[1], currentStep);
                        const offset = (memory[addr + 1] << 8) | (memory[addr] || 0);
                        const segment = (memory[addr + 3] << 8) | (memory[addr + 2] || 0);
                        setValue(parts[1], offset, currentStep);
                        if (instruction === 'LDS') {
                            regs.DS = segment;
                            currentStep.writeRegs!.push('DS');
                        } else {
                            regs.ES = segment;
                            currentStep.writeRegs!.push('ES');
                        }
                        currentStep.readMem = `0x${addr.toString(16)}`;
                    }
                    currentStep.cycleCost = 16;
                    break;
                }

                // Arithmetic Instructions
                case 'ADD': {
                    const dest = parts[1];
                    const op1 = getValue(dest, currentStep);
                    const op2 = getValue(parts[2], currentStep);
                    const result = op1 + op2;
                    setValue(dest, result, currentStep);
                    flags.CF = result > 0xFFFF ? 1 : 0;
                    setFlags(result, op1, op2, false, true);
                    currentStep.aluOp = 'ADD';
                    currentStep.cycleCost = 3;
                    break;
                }
                case 'ADC': {
                    const dest = parts[1];
                    const op1 = getValue(dest, currentStep);
                    const op2 = getValue(parts[2], currentStep);
                    const result = op1 + op2 + flags.CF;
                    setValue(dest, result, currentStep);
                    flags.CF = result > 0xFFFF ? 1 : 0;
                    setFlags(result, op1, op2, false, true);
                    currentStep.aluOp = 'ADC';
                    currentStep.cycleCost = 3;
                    break;
                }
                case 'SUB': {
                    const dest = parts[1];
                    const op1 = getValue(dest, currentStep);
                    const op2 = getValue(parts[2], currentStep);
                    const result = op1 - op2;
                    setValue(dest, result, currentStep);
                    flags.CF = op1 < op2 ? 1 : 0;
                    setFlags(result, op1, op2, true, true);
                    currentStep.aluOp = 'SUB';
                    currentStep.cycleCost = 3;
                    break;
                }
                case 'SBB': {
                    const dest = parts[1];
                    const op1 = getValue(dest, currentStep);
                    const op2 = getValue(parts[2], currentStep);
                    const result = op1 - op2 - flags.CF;
                    setValue(dest, result, currentStep);
                    flags.CF = (op1 - flags.CF) < op2 ? 1 : 0;
                    setFlags(result, op1, op2, true, true);
                    currentStep.aluOp = 'SBB';
                    currentStep.cycleCost = 3;
                    break;
                }
                case 'INC': {
                    const dest = parts[1];
                    const op1 = getValue(dest, currentStep);
                    const result = op1 + 1;
                    setValue(dest, result, currentStep);
                    setFlags(result, op1, 1, false, true);
                    currentStep.aluOp = 'INC';
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'DEC': {
                    const dest = parts[1];
                    const op1 = getValue(dest, currentStep);
                    const result = op1 - 1;
                    setValue(dest, result, currentStep);
                    setFlags(result, op1, 1, true, true);
                    currentStep.aluOp = 'DEC';
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'NEG': {
                    const dest = parts[1];
                    const op1 = getValue(dest, currentStep);
                    const result = -op1;
                    setValue(dest, result, currentStep);
                    flags.CF = op1 !== 0 ? 1 : 0;
                    setFlags(result, 0, op1, true, true);
                    currentStep.aluOp = 'NEG';
                    currentStep.cycleCost = 3;
                    break;
                }
                case 'MUL': {
                    const op2 = getValue(parts[1], currentStep);
                    const result = regs.AX * op2;
                    regs.AX = result & 0xFFFF;
                    regs.DX = (result >> 16) & 0xFFFF;
                    flags.CF = flags.OF = regs.DX !== 0 ? 1 : 0;
                    currentStep.readRegs!.push('AX');
                    currentStep.writeRegs!.push('AX', 'DX');
                    currentStep.aluOp = 'MUL';
                    currentStep.cycleCost = 70;
                    break;
                }
                case 'IMUL': {
                    const op2 = getValue(parts[1], currentStep);
                    const result = (regs.AX | 0) * (op2 | 0); // Signed multiplication
                    regs.AX = result & 0xFFFF;
                    regs.DX = (result >> 16) & 0xFFFF;
                    flags.CF = flags.OF = (result < -32768 || result > 32767) ? 1 : 0;
                    currentStep.readRegs!.push('AX');
                    currentStep.writeRegs!.push('AX', 'DX');
                    currentStep.aluOp = 'IMUL';
                    currentStep.cycleCost = 80;
                    break;
                }
                case 'DIV': {
                    const op2 = getValue(parts[1], currentStep);
                    if (op2 === 0) throw new Error('Division by zero');
                    const dividend = (regs.DX << 16) | regs.AX;
                    const quotient = Math.floor(dividend / op2);
                    const remainder = dividend % op2;
                    if (quotient > 0xFFFF) throw new Error('Division overflow');
                    regs.AX = quotient;
                    regs.DX = remainder;
                    currentStep.readRegs!.push('AX', 'DX');
                    currentStep.writeRegs!.push('AX', 'DX');
                    currentStep.aluOp = 'DIV';
                    currentStep.cycleCost = 80;
                    break;
                }
                case 'IDIV': {
                    const op2 = getValue(parts[1], currentStep);
                    if (op2 === 0) throw new Error('Division by zero');
                    const dividend = ((regs.DX << 16) | regs.AX) | 0; // Signed
                    const quotient = Math.floor(dividend / (op2 | 0));
                    const remainder = dividend % (op2 | 0);
                    if (quotient < -32768 || quotient > 32767) throw new Error('Division overflow');
                    regs.AX = quotient & 0xFFFF;
                    regs.DX = remainder & 0xFFFF;
                    currentStep.readRegs!.push('AX', 'DX');
                    currentStep.writeRegs!.push('AX', 'DX');
                    currentStep.aluOp = 'IDIV';
                    currentStep.cycleCost = 101;
                    break;
                }

                // Logical Instructions
                case 'AND': {
                    const dest = parts[1];
                    const op1 = getValue(dest, currentStep);
                    const op2 = getValue(parts[2], currentStep);
                    const result = op1 & op2;
                    setValue(dest, result, currentStep);
                    flags.CF = 0;
                    flags.OF = 0;
                    setFlags(result, op1, op2, false, true);
                    currentStep.aluOp = 'AND';
                    currentStep.cycleCost = 3;
                    break;
                }
                case 'OR': {
                    const dest = parts[1];
                    const op1 = getValue(dest, currentStep);
                    const op2 = getValue(parts[2], currentStep);
                    const result = op1 | op2;
                    setValue(dest, result, currentStep);
                    flags.CF = 0;
                    flags.OF = 0;
                    setFlags(result, op1, op2, false, true);
                    currentStep.aluOp = 'OR';
                    currentStep.cycleCost = 3;
                    break;
                }
                case 'XOR': {
                    const dest = parts[1];
                    const op1 = getValue(dest, currentStep);
                    const op2 = getValue(parts[2], currentStep);
                    const result = op1 ^ op2;
                    setValue(dest, result, currentStep);
                    flags.CF = 0;
                    flags.OF = 0;
                    setFlags(result, op1, op2, false, true);
                    currentStep.aluOp = 'XOR';
                    currentStep.cycleCost = 3;
                    break;
                }
                case 'NOT': {
                    const dest = parts[1];
                    const op1 = getValue(dest, currentStep);
                    const result = (~op1) & 0xFFFF;
                    setValue(dest, result, currentStep);
                    currentStep.aluOp = 'NOT';
                    currentStep.cycleCost = 3;
                    break;
                }
                case 'TEST': {
                    const op1 = getValue(parts[1], currentStep);
                    const op2 = getValue(parts[2], currentStep);
                    const result = op1 & op2;
                    flags.CF = 0;
                    flags.OF = 0;
                    setFlags(result, op1, op2, false, true);
                    currentStep.aluOp = 'TEST';
                    currentStep.cycleCost = 3;
                    break;
                }
                case 'CMP': {
                    const op1 = getValue(parts[1], currentStep);
                    const op2 = getValue(parts[2], currentStep);
                    const result = op1 - op2;
                    flags.CF = op1 < op2 ? 1 : 0;
                    setFlags(result, op1, op2, true, true);
                    currentStep.aluOp = 'CMP';
                    currentStep.cycleCost = 3;
                    break;
                }

                // Shift and Rotate Instructions
                case 'SHL': case 'SAL': {
                    const dest = parts[1];
                    const op1 = getValue(dest, currentStep);
                    const count = parts[2] === '1' ? 1 : (getValue(parts[2], currentStep) & 0x1F);
                    let result = op1;
                    for (let i = 0; i < count; i++) {
                        flags.CF = (result & 0x8000) ? 1 : 0;
                        result = (result << 1) & 0xFFFF;
                    }
                    setValue(dest, result, currentStep);
                    setFlags(result, op1, count, false, true);
                    currentStep.aluOp = 'SHL';
                    currentStep.cycleCost = count === 1 ? 2 : 8 + 4 * count;
                    break;
                }
                case 'SHR': {
                    const dest = parts[1];
                    const op1 = getValue(dest, currentStep);
                    const count = parts[2] === '1' ? 1 : (getValue(parts[2], currentStep) & 0x1F);
                    let result = op1;
                    for (let i = 0; i < count; i++) {
                        flags.CF = result & 1;
                        result = result >> 1;
                    }
                    setValue(dest, result, currentStep);
                    setFlags(result, op1, count, false, true);
                    currentStep.aluOp = 'SHR';
                    currentStep.cycleCost = count === 1 ? 2 : 8 + 4 * count;
                    break;
                }
                case 'SAR': {
                    const dest = parts[1];
                    const op1 = getValue(dest, currentStep);
                    const count = parts[2] === '1' ? 1 : (getValue(parts[2], currentStep) & 0x1F);
                    let result = op1;
                    const signBit = result & 0x8000;
                    for (let i = 0; i < count; i++) {
                        flags.CF = result & 1;
                        result = (result >> 1) | signBit;
                    }
                    setValue(dest, result, currentStep);
                    setFlags(result, op1, count, false, true);
                    currentStep.aluOp = 'SAR';
                    currentStep.cycleCost = count === 1 ? 2 : 8 + 4 * count;
                    break;
                }
                case 'ROL': {
                    const dest = parts[1];
                    const op1 = getValue(dest, currentStep);
                    const count = parts[2] === '1' ? 1 : (getValue(parts[2], currentStep) & 0x1F);
                    let result = op1;
                    for (let i = 0; i < count; i++) {
                        const msb = (result & 0x8000) ? 1 : 0;
                        result = ((result << 1) | msb) & 0xFFFF;
                        flags.CF = msb;
                    }
                    setValue(dest, result, currentStep);
                    currentStep.aluOp = 'ROL';
                    currentStep.cycleCost = count === 1 ? 2 : 8 + 4 * count;
                    break;
                }
                case 'ROR': {
                    const dest = parts[1];
                    const op1 = getValue(dest, currentStep);
                    const count = parts[2] === '1' ? 1 : (getValue(parts[2], currentStep) & 0x1F);
                    let result = op1;
                    for (let i = 0; i < count; i++) {
                        const lsb = result & 1;
                        result = (result >> 1) | (lsb << 15);
                        flags.CF = lsb;
                    }
                    setValue(dest, result, currentStep);
                    currentStep.aluOp = 'ROR';
                    currentStep.cycleCost = count === 1 ? 2 : 8 + 4 * count;
                    break;
                }
                case 'RCL': {
                    const dest = parts[1];
                    const op1 = getValue(dest, currentStep);
                    const count = parts[2] === '1' ? 1 : (getValue(parts[2], currentStep) & 0x1F);
                    let result = op1;
                    for (let i = 0; i < count; i++) {
                        const msb = (result & 0x8000) ? 1 : 0;
                        result = ((result << 1) | flags.CF) & 0xFFFF;
                        flags.CF = msb;
                    }
                    setValue(dest, result, currentStep);
                    currentStep.aluOp = 'RCL';
                    currentStep.cycleCost = count === 1 ? 2 : 8 + 4 * count;
                    break;
                }
                case 'RCR': {
                    const dest = parts[1];
                    const op1 = getValue(dest, currentStep);
                    const count = parts[2] === '1' ? 1 : (getValue(parts[2], currentStep) & 0x1F);
                    let result = op1;
                    for (let i = 0; i < count; i++) {
                        const lsb = result & 1;
                        result = (result >> 1) | (flags.CF << 15);
                        flags.CF = lsb;
                    }
                    setValue(dest, result, currentStep);
                    currentStep.aluOp = 'RCR';
                    currentStep.cycleCost = count === 1 ? 2 : 8 + 4 * count;
                    break;
                }

                // String Instructions
                case 'MOVSB': case 'MOVSW': {
                    const is16bit = instruction === 'MOVSW';
                    const srcAddr = regs.SI;
                    const destAddr = regs.DI;
                    if (is16bit) {
                        const value = (memory[srcAddr + 1] << 8) | (memory[srcAddr] || 0);
                        memory[destAddr] = value & 0xFF;
                        memory[destAddr + 1] = (value >> 8) & 0xFF;
                        regs.SI += flags.DF ? -2 : 2;
                        regs.DI += flags.DF ? -2 : 2;
                    } else {
                        memory[destAddr] = memory[srcAddr] || 0;
                        regs.SI += flags.DF ? -1 : 1;
                        regs.DI += flags.DF ? -1 : 1;
                    }
                    currentStep.readRegs!.push('SI', 'DI');
                    currentStep.writeRegs!.push('SI', 'DI');
                    currentStep.readMem = `0x${srcAddr.toString(16)}`;
                    currentStep.writeMem = `0x${destAddr.toString(16)}`;
                    currentStep.cycleCost = 18;
                    break;
                }
                case 'CMPSB': case 'CMPSW': {
                    const is16bit = instruction === 'CMPSW';
                    const srcAddr = regs.SI;
                    const destAddr = regs.DI;
                    let op1, op2;
                    if (is16bit) {
                        op1 = (memory[srcAddr + 1] << 8) | (memory[srcAddr] || 0);
                        op2 = (memory[destAddr + 1] << 8) | (memory[destAddr] || 0);
                        regs.SI += flags.DF ? -2 : 2;
                        regs.DI += flags.DF ? -2 : 2;
                    } else {
                        op1 = memory[srcAddr] || 0;
                        op2 = memory[destAddr] || 0;
                        regs.SI += flags.DF ? -1 : 1;
                        regs.DI += flags.DF ? -1 : 1;
                    }
                    const result = op1 - op2;
                    flags.CF = op1 < op2 ? 1 : 0;
                    setFlags(result, op1, op2, true, is16bit);
                    currentStep.readRegs!.push('SI', 'DI');
                    currentStep.writeRegs!.push('SI', 'DI');
                    currentStep.readMem = `0x${srcAddr.toString(16)}`;
                    currentStep.aluOp = 'CMP';
                    currentStep.cycleCost = 22;
                    break;
                }
                case 'SCASB': case 'SCASW': {
                    const is16bit = instruction === 'SCASW';
                    const destAddr = regs.DI;
                    let op2;
                    if (is16bit) {
                        op2 = (memory[destAddr + 1] << 8) | (memory[destAddr] || 0);
                        regs.DI += flags.DF ? -2 : 2;
                    } else {
                        op2 = memory[destAddr] || 0;
                        regs.DI += flags.DF ? -1 : 1;
                    }
                    const result = regs.AX - op2;
                    flags.CF = regs.AX < op2 ? 1 : 0;
                    setFlags(result, regs.AX, op2, true, is16bit);
                    currentStep.readRegs!.push('AX', 'DI');
                    currentStep.writeRegs!.push('DI');
                    currentStep.readMem = `0x${destAddr.toString(16)}`;
                    currentStep.aluOp = 'CMP';
                    currentStep.cycleCost = 15;
                    break;
                }
                case 'LODSB': case 'LODSW': {
                    const is16bit = instruction === 'LODSW';
                    const srcAddr = regs.SI;
                    if (is16bit) {
                        regs.AX = (memory[srcAddr + 1] << 8) | (memory[srcAddr] || 0);
                        regs.SI += flags.DF ? -2 : 2;
                    } else {
                        regs.AX = (regs.AX & 0xFF00) | (memory[srcAddr] || 0);
                        regs.SI += flags.DF ? -1 : 1;
                    }
                    currentStep.readRegs!.push('SI');
                    currentStep.writeRegs!.push('AX', 'SI');
                    currentStep.readMem = `0x${srcAddr.toString(16)}`;
                    currentStep.cycleCost = 12;
                    break;
                }
                case 'STOSB': case 'STOSW': {
                    const is16bit = instruction === 'STOSW';
                    const destAddr = regs.DI;
                    if (is16bit) {
                        memory[destAddr] = regs.AX & 0xFF;
                        memory[destAddr + 1] = (regs.AX >> 8) & 0xFF;
                        regs.DI += flags.DF ? -2 : 2;
                    } else {
                        memory[destAddr] = regs.AX & 0xFF;
                        regs.DI += flags.DF ? -1 : 1;
                    }
                    currentStep.readRegs!.push('AX', 'DI');
                    currentStep.writeRegs!.push('DI');
                    currentStep.writeMem = `0x${destAddr.toString(16)}`;
                    currentStep.cycleCost = 11;
                    break;
                }

                // Control Transfer Instructions
                case 'JMP': {
                    const target = labels[parts[1].toUpperCase()];
                    if (target !== undefined) {
                        pc = target;
                        jumped = true;
                    } else {
                        throw new Error(`Undefined label: ${parts[1]}`);
                    }
                    currentStep.cycleCost = 15;
                    break;
                }
                case 'JE': case 'JZ': {
                    if (flags.ZF === 1) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 16 : 4;
                    break;
                }
                case 'JNE': case 'JNZ': {
                    if (flags.ZF === 0) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 16 : 4;
                    break;
                }
                case 'JG': case 'JNLE': {
                    if (flags.ZF === 0 && flags.SF === flags.OF) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 16 : 4;
                    break;
                }
                case 'JL': case 'JNGE': {
                    if (flags.SF !== flags.OF) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 16 : 4;
                    break;
                }
                case 'JGE': case 'JNL': {
                    if (flags.SF === flags.OF) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 16 : 4;
                    break;
                }
                case 'JLE': case 'JNG': {
                    if (flags.ZF === 1 || flags.SF !== flags.OF) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 16 : 4;
                    break;
                }
                case 'JA': case 'JNBE': {
                    if (flags.CF === 0 && flags.ZF === 0) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 16 : 4;
                    break;
                }
                case 'JB': case 'JNAE': case 'JC': {
                    if (flags.CF === 1) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 16 : 4;
                    break;
                }
                case 'JAE': case 'JNB': case 'JNC': {
                    if (flags.CF === 0) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 16 : 4;
                    break;
                }
                case 'JBE': case 'JNA': {
                    if (flags.CF === 1 || flags.ZF === 1) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 16 : 4;
                    break;
                }
                case 'JS': {
                    if (flags.SF === 1) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 16 : 4;
                    break;
                }
                case 'JNS': {
                    if (flags.SF === 0) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 16 : 4;
                    break;
                }
                case 'JO': {
                    if (flags.OF === 1) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 16 : 4;
                    break;
                }
                case 'JNO': {
                    if (flags.OF === 0) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 16 : 4;
                    break;
                }
                case 'JP': case 'JPE': {
                    if (flags.PF === 1) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 16 : 4;
                    break;
                }
                case 'JNP': case 'JPO': {
                    if (flags.PF === 0) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 16 : 4;
                    break;
                }
                case 'JCXZ': {
                    if (regs.CX === 0) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.readRegs!.push('CX');
                    currentStep.cycleCost = jumped ? 18 : 6;
                    break;
                }
                case 'LOOP': {
                    regs.CX = (regs.CX - 1) & 0xFFFF;
                    if (regs.CX !== 0) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.readRegs!.push('CX');
                    currentStep.writeRegs!.push('CX');
                    currentStep.cycleCost = jumped ? 17 : 5;
                    break;
                }
                case 'LOOPE': case 'LOOPZ': {
                    regs.CX = (regs.CX - 1) & 0xFFFF;
                    if (regs.CX !== 0 && flags.ZF === 1) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.readRegs!.push('CX');
                    currentStep.writeRegs!.push('CX');
                    currentStep.cycleCost = jumped ? 18 : 6;
                    break;
                }
                case 'LOOPNE': case 'LOOPNZ': {
                    regs.CX = (regs.CX - 1) & 0xFFFF;
                    if (regs.CX !== 0 && flags.ZF === 0) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.readRegs!.push('CX');
                    currentStep.writeRegs!.push('CX');
                    currentStep.cycleCost = jumped ? 19 : 5;
                    break;
                }

                // Stack Instructions
                case 'PUSH': {
                    const value = getValue(parts[1], currentStep);
                    regs.SP = (regs.SP - 2) & 0xFFFF;
                    memory[regs.SP] = value & 0xFF;
                    memory[regs.SP + 1] = (value >> 8) & 0xFF;
                    currentStep.readRegs!.push('SP');
                    currentStep.writeRegs!.push('SP');
                    currentStep.writeMem = `0x${regs.SP.toString(16)}`;
                    currentStep.cycleCost = 11;
                    break;
                }
                case 'POP': {
                    const value = (memory[regs.SP + 1] << 8) | (memory[regs.SP] || 0);
                    regs.SP = (regs.SP + 2) & 0xFFFF;
                    setValue(parts[1], value, currentStep);
                    currentStep.readRegs!.push('SP');
                    currentStep.writeRegs!.push('SP');
                    currentStep.readMem = `0x${(regs.SP - 2).toString(16)}`;
                    currentStep.cycleCost = 8;
                    break;
                }
                case 'PUSHF': {
                    const flagsValue = (flags.CF) | (flags.PF << 2) | (flags.AF << 4) | (flags.ZF << 6) |
                                     (flags.SF << 7) | (flags.TF << 8) | (flags.IF << 9) | (flags.DF << 10) | (flags.OF << 11);
                    regs.SP = (regs.SP - 2) & 0xFFFF;
                    memory[regs.SP] = flagsValue & 0xFF;
                    memory[regs.SP + 1] = (flagsValue >> 8) & 0xFF;
                    currentStep.readRegs!.push('SP');
                    currentStep.writeRegs!.push('SP');
                    currentStep.writeMem = `0x${regs.SP.toString(16)}`;
                    currentStep.cycleCost = 10;
                    break;
                }
                case 'POPF': {
                    const flagsValue = (memory[regs.SP + 1] << 8) | (memory[regs.SP] || 0);
                    regs.SP = (regs.SP + 2) & 0xFFFF;
                    flags.CF = flagsValue & 1;
                    flags.PF = (flagsValue >> 2) & 1;
                    flags.AF = (flagsValue >> 4) & 1;
                    flags.ZF = (flagsValue >> 6) & 1;
                    flags.SF = (flagsValue >> 7) & 1;
                    flags.TF = (flagsValue >> 8) & 1;
                    flags.IF = (flagsValue >> 9) & 1;
                    flags.DF = (flagsValue >> 10) & 1;
                    flags.OF = (flagsValue >> 11) & 1;
                    currentStep.readRegs!.push('SP');
                    currentStep.writeRegs!.push('SP');
                    currentStep.readMem = `0x${(regs.SP - 2).toString(16)}`;
                    currentStep.cycleCost = 8;
                    break;
                }

                // Procedure Instructions
                case 'CALL': {
                    const target = labels[parts[1].toUpperCase()];
                    if (target !== undefined) {
                        const returnAddr = pc + 1;
                        regs.SP = (regs.SP - 2) & 0xFFFF;
                        memory[regs.SP] = returnAddr & 0xFF;
                        memory[regs.SP + 1] = (returnAddr >> 8) & 0xFF;
                        pc = target;
                        jumped = true;
                        currentStep.readRegs!.push('SP');
                        currentStep.writeRegs!.push('SP');
                        currentStep.writeMem = `0x${regs.SP.toString(16)}`;
                    } else {
                        throw new Error(`Undefined label: ${parts[1]}`);
                    }
                    currentStep.cycleCost = 19;
                    break;
                }
                case 'RET': {
                    const returnAddr = (memory[regs.SP + 1] << 8) | (memory[regs.SP] || 0);
                    regs.SP = (regs.SP + 2) & 0xFFFF;
                    pc = returnAddr;
                    jumped = true;
                    currentStep.readRegs!.push('SP');
                    currentStep.writeRegs!.push('SP');
                    currentStep.readMem = `0x${(regs.SP - 2).toString(16)}`;
                    currentStep.cycleCost = 16;
                    break;
                }

                // Flag Instructions
                case 'CLC': {
                    flags.CF = 0;
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'STC': {
                    flags.CF = 1;
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'CMC': {
                    flags.CF = flags.CF ? 0 : 1;
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'CLD': {
                    flags.DF = 0;
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'STD': {
                    flags.DF = 1;
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'CLI': {
                    flags.IF = 0;
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'STI': {
                    flags.IF = 1;
                    currentStep.cycleCost = 2;
                    break;
                }

                // I/O Instructions
                case 'IN': {
                    const port = getValue(parts[2], currentStep);
                    regs.AX = 0; // Simulate reading 0 from port
                    currentStep.writeRegs!.push('AX');
                    currentStep.cycleCost = 10;
                    break;
                }
                case 'OUT': {
                    const port = getValue(parts[1], currentStep);
                    const value = getValue(parts[2], currentStep);
                    output += `OUT ${port}: ${value.toString(16)}\n`;
                    currentStep.cycleCost = 10;
                    break;
                }

                // Miscellaneous Instructions
                case 'NOP': {
                    currentStep.cycleCost = 3;
                    break;
                }
                case 'HLT': {
                    output = output || 'Execution halted.';
                    pc = cleanLines.length;
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'WAIT': {
                    currentStep.cycleCost = 3;
                    break;
                }
                case 'LOCK': {
                    // Prefix instruction - no operation in simulation
                    currentStep.cycleCost = 0;
                    break;
                }

                default:
                    throw new Error(`Unknown instruction: ${instruction}`);
            }
        } catch (e: any) {
            error = { lineIndex: pc, message: e.message };
            break;
        }

        cycleCount += currentStep.cycleCost!;
        currentStep.totalCycles = cycleCount;
        const nextPc = jumped ? pc : pc + 1;
        
        // Build register state
        const regEntries = Object.entries(regs).map(([n, v]) => ({
            name: n,
            value: `0x${v.toString(16).padStart(4, '0')}`
        }));
        regEntries.push({ name: 'IP', value: `0x${nextPc.toString(16).padStart(4, '0')}` });
        
        // Add flags
        const flagString = Object.entries(flags)
            .filter(([, v]) => v === 1)
            .map(([k]) => k)
            .join(' ') || 'NONE';
        regEntries.push({ name: 'FLAGS', value: flagString });
        
        currentStep.registers = regEntries;
        currentStep.memory = Object.entries(memory).map(([a, v]) => ({
            address: `0x${Number(a).toString(16)}`,
            value: `0x${v.toString(16).padStart(2, '0')}`
        }));
        
        trace.push(currentStep as TraceStep);
        if (!jumped) pc++;
    }

    if (!error && executedInstructions >= MAX_INSTRUCTIONS) {
        error = { lineIndex: pc > 0 ? pc - 1 : 0, message: 'Max instruction limit reached.' };
    }
    if (!error && cycleCount >= MAX_CYCLES) {
        error = { lineIndex: pc > 0 ? pc - 1 : 0, message: 'Max cycle limit reached.' };
    }
    
    output = error ? `Error on line ${lineMap[error.lineIndex] + 1}: ${error.message}` : (output || 'Execution finished.');
    
    return {
        registers: trace[trace.length - 1]?.registers || [],
        memory: trace[trace.length - 1]?.memory || [],
        output,
        cycles: cycleCount,
        trace,
        error
    };
};

export const runRiscVSimulation = (code: string): SimulationResult => {
    const { labels, cleanLines, lineMap, initialMemory } = preprocessAssemblyCode(code);
    const memory = { ...initialMemory };
    let regs = new Array(32).fill(0);
    let pc = labels['MAIN'] || labels['START'] || 0;
    
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
                // R-type instructions
                case 'ADD': case 'SUB': case 'OR': case 'AND': case 'SLT': case 'SLTU':
                case 'XOR': case 'SLL': case 'SRL': case 'SRA':
                    rd = regNameToNum(parts[1]); rs1 = regNameToNum(parts[2]); rs2 = regNameToNum(parts[3]); break;
                
                // I-type instructions
                case 'ADDI': case 'ORI': case 'ANDI': case 'SLLI': case 'SRLI': case 'SRAI': case 'SLTI': case 'SLTIU': case 'XORI':
                    rd = regNameToNum(parts[1]); rs1 = regNameToNum(parts[2]); imm = parseImmediate(parts[3]); break;
                
                // Load instructions
                case 'LW': case 'LH': case 'LB': case 'LHU': case 'LBU':
                    rd = regNameToNum(parts[1]);
                    const loadParts = parts[2].match(/(-?\d+)\((.*?)\)/);
                    if (loadParts) { imm = parseImmediate(loadParts[1]); rs1 = regNameToNum(loadParts[2]); } break;
                
                // Store instructions
                case 'SW': case 'SH': case 'SB':
                    rs2 = regNameToNum(parts[1]);
                    const storeParts = parts[2].match(/(-?\d+)\((.*?)\)/);
                    if (storeParts) { imm = parseImmediate(storeParts[1]); rs1 = regNameToNum(storeParts[2]); } break;
                
                // Branch instructions
                case 'BNE': case 'BEQ': case 'BLT': case 'BGE': case 'BLTU': case 'BGEU':
                    rs1 = regNameToNum(parts[1]); rs2 = regNameToNum(parts[2]); imm = labels[parts[3].toUpperCase()]; break;
                
                // Jump instructions
                case 'JAL':
                    rd = regNameToNum(parts[1]); imm = labels[parts[2].toUpperCase()]; break;
                case 'JALR':
                    rd = regNameToNum(parts[1]); rs1 = regNameToNum(parts[2]); imm = parseImmediate(parts[3] || '0'); break;
                
                // Upper immediate instructions
                case 'LUI': case 'AUIPC':
                    rd = regNameToNum(parts[1]); imm = parseImmediate(parts[2]); break;
                
                // Pseudo-instructions
                case 'LI': rd = regNameToNum(parts[1]); imm = parseImmediate(parts[2]); break;
                case 'LA': rd = regNameToNum(parts[1]); imm = labels[parts[2].toUpperCase()]; break;
                case 'MV': rd = regNameToNum(parts[1]); rs1 = regNameToNum(parts[2]); break;
                case 'NEG': rd = regNameToNum(parts[1]); rs1 = regNameToNum(parts[2]); break;
                case 'NOT': rd = regNameToNum(parts[1]); rs1 = regNameToNum(parts[2]); break;
                case 'J': imm = labels[parts[1].toUpperCase()]; break;
                
                // System instructions
                case 'ECALL': case 'EBREAK': break;
                
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
        
        if (id_instr && ex_instr && ['LW', 'LH', 'LB', 'LHU', 'LBU'].includes(ex_instr.mnemonic) && ex_instr.rd !== null && ex_instr.rd !== 0) {
            if (id_instr.rs1 === ex_instr.rd || id_instr.rs2 === ex_instr.rd) {
                stall = true;
                hazardInfo = { type: 'Load-Use Hazard (Stalled)', details: `Stalling for load on ${getRegAbiName(ex_instr.rd)}`};
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
            // Data Forwarding from WB stage
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
                // Arithmetic
                case 'ADD': aluResult = (op1 + op2) & 0xFFFFFFFF; break;
                case 'ADDI': aluResult = (op1 + (ex_instr.imm!)) & 0xFFFFFFFF; break;
                case 'SUB': aluResult = (op1 - op2) & 0xFFFFFFFF; break;
                
                // Logical
                case 'AND': aluResult = op1 & op2; break;
                case 'ANDI': aluResult = op1 & (ex_instr.imm!); break;
                case 'OR': aluResult = op1 | op2; break;
                case 'ORI': aluResult = op1 | (ex_instr.imm!); break;
                case 'XOR': aluResult = op1 ^ op2; break;
                case 'XORI': aluResult = op1 ^ (ex_instr.imm!); break;
                
                // Shifts
                case 'SLL': aluResult = (op1 << (op2 & 0x1F)) & 0xFFFFFFFF; break;
                case 'SLLI': aluResult = (op1 << (ex_instr.imm! & 0x1F)) & 0xFFFFFFFF; break;
                case 'SRL': aluResult = op1 >>> (op2 & 0x1F); break;
                case 'SRLI': aluResult = op1 >>> (ex_instr.imm! & 0x1F); break;
                case 'SRA': aluResult = op1 >> (op2 & 0x1F); break;
                case 'SRAI': aluResult = op1 >> (ex_instr.imm! & 0x1F); break;
                
                // Comparisons
                case 'SLT': aluResult = ((op1 | 0) < (op2 | 0)) ? 1 : 0; break;
                case 'SLTI': aluResult = ((op1 | 0) < (ex_instr.imm! | 0)) ? 1 : 0; break;
                case 'SLTU': aluResult = (op1 < op2) ? 1 : 0; break;
                case 'SLTIU': aluResult = (op1 < ex_instr.imm!) ? 1 : 0; break;
                
                // Memory
                case 'LW': case 'LH': case 'LB': case 'LHU': case 'LBU':
                case 'SW': case 'SH': case 'SB':
                    aluResult = (op1 + (ex_instr.imm!)) & 0xFFFFFFFF; break;
                
                // Branches
                case 'BEQ': if (op1 === op2 && ex_instr.imm !== null) { branchTargetPC = ex_instr.imm; branchTaken = true; } break;
                case 'BNE': if (op1 !== op2 && ex_instr.imm !== null) { branchTargetPC = ex_instr.imm; branchTaken = true; } break;
                case 'BLT': if ((op1 | 0) < (op2 | 0) && ex_instr.imm !== null) { branchTargetPC = ex_instr.imm; branchTaken = true; } break;
                case 'BGE': if ((op1 | 0) >= (op2 | 0) && ex_instr.imm !== null) { branchTargetPC = ex_instr.imm; branchTaken = true; } break;
                case 'BLTU': if (op1 < op2 && ex_instr.imm !== null) { branchTargetPC = ex_instr.imm; branchTaken = true; } break;
                case 'BGEU': if (op1 >= op2 && ex_instr.imm !== null) { branchTargetPC = ex_instr.imm; branchTaken = true; } break;
                
                // Jumps
                case 'JAL': aluResult = pc + 1; if (ex_instr.imm !== null) { branchTargetPC = ex_instr.imm; branchTaken = true; } break;
                case 'JALR': aluResult = pc + 1; branchTargetPC = (op1 + (ex_instr.imm!)) & 0xFFFFFFFE; branchTaken = true; break;
                case 'J': if (ex_instr.imm !== null) { branchTargetPC = ex_instr.imm; branchTaken = true; } break;
                
                // Upper immediate
                case 'LUI': aluResult = (ex_instr.imm! << 12) & 0xFFFFFFFF; break;
                case 'AUIPC': aluResult = ((ex_instr.imm! << 12) + pc) & 0xFFFFFFFF; break;
                
                // Pseudo-instructions
                case 'LI': case 'LA': aluResult = ex_instr.imm; break;
                case 'MV': aluResult = op1; break;
                case 'NEG': aluResult = (-op1) & 0xFFFFFFFF; break;
                case 'NOT': aluResult = (~op1) & 0xFFFFFFFF; break;
            }
            if (branchTaken) hazardInfo = { type: 'Control Hazard', details: `Branch taken to 0x${branchTargetPC.toString(16)}. Flushing IF/ID.`};
        }

        // --- MEM Stage ---
        let memResult = pipeline.MEM.aluResult;
        if (mem_instr && !pipeline.MEM.isBubble) {
            const addr = pipeline.MEM.aluResult!;
            switch (mem_instr.mnemonic) {
                case 'LW':
                    memResult = (memory[addr+3]<<24)|(memory[addr+2]<<16)|(memory[addr+1]<<8)|(memory[addr]||0);
                    break;
                case 'LH':
                    memResult = (memory[addr+1]<<8)|(memory[addr]||0);
                    if (memResult & 0x8000) memResult |= 0xFFFF0000; // Sign extend
                    break;
                case 'LB':
                    memResult = memory[addr] || 0;
                    if (memResult & 0x80) memResult |= 0xFFFFFF00; // Sign extend
                    break;
                case 'LHU':
                    memResult = (memory[addr+1]<<8)|(memory[addr]||0);
                    break;
                case 'LBU':
                    memResult = memory[addr] || 0;
                    break;
                case 'SW':
                    const val32 = regsBefore[mem_instr.rs2!];
                    memory[addr] = val32 & 0xFF; memory[addr+1] = (val32 >> 8) & 0xFF;
                    memory[addr+2] = (val32 >> 16) & 0xFF; memory[addr+3] = (val32 >> 24) & 0xFF;
                    break;
                case 'SH':
                    const val16 = regsBefore[mem_instr.rs2!];
                    memory[addr] = val16 & 0xFF; memory[addr+1] = (val16 >> 8) & 0xFF;
                    break;
                case 'SB':
                    const val8 = regsBefore[mem_instr.rs2!];
                    memory[addr] = val8 & 0xFF;
                    break;
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
                    regs[wb_instr_final.rd] = valueToWrite & 0xFFFFFFFF;
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
    const regs: { [key: string]: number } = { 
        A: 0, F: 0, B: 0, C: 0, D: 0, E: 0, H: 0, L: 0, 
        IX: 0, IY: 0, SP: 0xFFFF, PC: 0, I: 0, R: 0,
        // Shadow registers
        A_: 0, F_: 0, B_: 0, C_: 0, D_: 0, E_: 0, H_: 0, L_: 0
    };
    const { labels, cleanLines, lineMap, initialMemory } = preprocessAssemblyCode(code);
    const memory = { ...initialMemory };
    const trace: TraceStep[] = [];
    let pc = labels['START'] || labels['MAIN'] || 0;
    let cycleCount = 0, executedInstructions = 0, output = '', error: SimulationError | undefined = undefined;

    const setFlags = (val: number) => {
        regs.F = 0;
        if ((val & 0xFF) === 0) regs.F |= 0x40; // Z flag
        if (val & 0x80) regs.F |= 0x80; // S flag
        let parity = 0;
        for (let i = 0; i < 8; i++) {
            if (val & (1 << i)) parity++;
        }
        if (parity % 2 === 0) regs.F |= 0x04; // P/V flag
    };

    const getHL = () => (regs.H << 8) | regs.L;
    const setHL = (val: number) => { regs.H = (val >> 8) & 0xFF; regs.L = val & 0xFF; };
    const getBC = () => (regs.B << 8) | regs.C;
    const setBC = (val: number) => { regs.B = (val >> 8) & 0xFF; regs.C = val & 0xFF; };
    const getDE = () => (regs.D << 8) | regs.E;
    const setDE = (val: number) => { regs.D = (val >> 8) & 0xFF; regs.E = val & 0xFF; };

    while (pc < cleanLines.length && executedInstructions < MAX_INSTRUCTIONS && cycleCount < MAX_CYCLES) {
        executedInstructions++;
        const line = cleanLines[pc];
        const parts = robustParse(line);
        const instruction = parts[0]?.toUpperCase();
        let jumped = false;
        const currentStep: Partial<TraceStep> = {
            lineIndex: pc, instructionText: line, readRegs: [], writeRegs: [],
            readMem: null, writeMem: null, aluOp: null, cycleCost: 0
        };

        try {
            if (!instruction) { pc++; continue; }

            switch (instruction) {
                // 8-bit Load Group
                case 'LD': {
                    const dest = parts[1].toUpperCase();
                    const src = parts[2].toUpperCase();
                    let val: number;
                    
                    if (regs.hasOwnProperty(src)) {
                        val = regs[src];
                        currentStep.readRegs!.push(src);
                        currentStep.cycleCost = 4;
                    } else if (src.startsWith('(') && src.endsWith(')')) {
                        const addrExpr = src.substring(1, src.length - 1);
                        let addr;
                        if (addrExpr === 'HL') {
                            addr = getHL();
                            currentStep.readRegs!.push('H', 'L');
                        } else if (addrExpr === 'BC') {
                            addr = getBC();
                            currentStep.readRegs!.push('B', 'C');
                        } else if (addrExpr === 'DE') {
                            addr = getDE();
                            currentStep.readRegs!.push('D', 'E');
                        } else if (addrExpr.startsWith('IX+') || addrExpr.startsWith('IY+')) {
                            const baseReg = addrExpr.substring(0, 2);
                            const offset = parseImmediate(addrExpr.substring(3));
                            addr = (regs[baseReg] + offset) & 0xFFFF;
                            currentStep.readRegs!.push(baseReg);
                        } else {
                            addr = parseImmediate(addrExpr);
                        }
                        val = memory[addr] || 0;
                        currentStep.readMem = `0x${addr.toString(16)}`;
                        currentStep.cycleCost = 7;
                    } else {
                        val = parseImmediate(src);
                        currentStep.cycleCost = 7;
                    }

                    if (regs.hasOwnProperty(dest)) {
                        regs[dest] = val & 0xFF;
                        currentStep.writeRegs!.push(dest);
                    } else if (dest.startsWith('(') && dest.endsWith(')')) {
                        const addrExpr = dest.substring(1, dest.length - 1);
                        let addr;
                        if (addrExpr === 'HL') {
                            addr = getHL();
                            currentStep.readRegs!.push('H', 'L');
                        } else if (addrExpr === 'BC') {
                            addr = getBC();
                            currentStep.readRegs!.push('B', 'C');
                        } else if (addrExpr === 'DE') {
                            addr = getDE();
                            currentStep.readRegs!.push('D', 'E');
                        } else {
                            addr = parseImmediate(addrExpr);
                        }
                        memory[addr] = val & 0xFF;
                        currentStep.writeMem = `0x${addr.toString(16)}`;
                        currentStep.cycleCost = 7;
                    }
                    break;
                }

                // 16-bit Load Group
                case 'LD16': {
                    const dest = parts[1].toUpperCase();
                    const src = parts[2].toUpperCase();
                    let val: number;
                    
                    if (src.startsWith('(') && src.endsWith(')')) {
                        const addr = parseImmediate(src.substring(1, src.length - 1));
                        val = (memory[addr + 1] << 8) | (memory[addr] || 0);
                        currentStep.readMem = `0x${addr.toString(16)}`;
                        currentStep.cycleCost = 20;
                    } else {
                        val = labels[src] ?? parseImmediate(src);
                        currentStep.cycleCost = 10;
                    }
                    
                    if (dest === 'HL') {
                        setHL(val);
                        currentStep.writeRegs!.push('H', 'L');
                    } else if (dest === 'BC') {
                        setBC(val);
                        currentStep.writeRegs!.push('B', 'C');
                    } else if (dest === 'DE') {
                        setDE(val);
                        currentStep.writeRegs!.push('D', 'E');
                    } else if (dest === 'SP') {
                        regs.SP = val & 0xFFFF;
                        currentStep.writeRegs!.push('SP');
                    } else if (dest === 'IX' || dest === 'IY') {
                        regs[dest] = val & 0xFFFF;
                        currentStep.writeRegs!.push(dest);
                    }
                    break;
                }

                // Exchange Group
                case 'EX': {
                    const op1 = parts[1].toUpperCase();
                    const op2 = parts[2].toUpperCase();
                    if (op1 === 'DE' && op2 === 'HL') {
                        const tempDE = getDE();
                        const tempHL = getHL();
                        setDE(tempHL);
                        setHL(tempDE);
                        currentStep.readRegs!.push('D', 'E', 'H', 'L');
                        currentStep.writeRegs!.push('D', 'E', 'H', 'L');
                    } else if (op1 === 'AF' && op2 === 'AF_') {
                        const tempA = regs.A, tempF = regs.F;
                        regs.A = regs.A_; regs.F = regs.F_;
                        regs.A_ = tempA; regs.F_ = tempF;
                        currentStep.readRegs!.push('A', 'F', 'A_', 'F_');
                        currentStep.writeRegs!.push('A', 'F', 'A_', 'F_');
                    }
                    currentStep.cycleCost = 4;
                    break;
                }
                case 'EXX': {
                    const tempB = regs.B, tempC = regs.C, tempD = regs.D, tempE = regs.E, tempH = regs.H, tempL = regs.L;
                    regs.B = regs.B_; regs.C = regs.C_; regs.D = regs.D_; regs.E = regs.E_; regs.H = regs.H_; regs.L = regs.L_;
                    regs.B_ = tempB; regs.C_ = tempC; regs.D_ = tempD; regs.E_ = tempE; regs.H_ = tempH; regs.L_ = tempL;
                    currentStep.readRegs!.push('B', 'C', 'D', 'E', 'H', 'L', 'B_', 'C_', 'D_', 'E_', 'H_', 'L_');
                    currentStep.writeRegs!.push('B', 'C', 'D', 'E', 'H', 'L', 'B_', 'C_', 'D_', 'E_', 'H_', 'L_');
                    currentStep.cycleCost = 4;
                    break;
                }

                // Block Transfer Group
                case 'LDI': {
                    const srcAddr = getHL();
                    const destAddr = getDE();
                    memory[destAddr] = memory[srcAddr] || 0;
                    setHL((srcAddr + 1) & 0xFFFF);
                    setDE((destAddr + 1) & 0xFFFF);
                    setBC((getBC() - 1) & 0xFFFF);
                    currentStep.readRegs!.push('H', 'L', 'D', 'E', 'B', 'C');
                    currentStep.writeRegs!.push('H', 'L', 'D', 'E', 'B', 'C');
                    currentStep.readMem = `0x${srcAddr.toString(16)}`;
                    currentStep.writeMem = `0x${destAddr.toString(16)}`;
                    currentStep.cycleCost = 16;
                    break;
                }
                case 'LDIR': {
                    const srcAddr = getHL();
                    const destAddr = getDE();
                    const count = getBC();
                    for (let i = 0; i < count && i < 1000; i++) { // Limit to prevent infinite loops
                        memory[destAddr + i] = memory[srcAddr + i] || 0;
                    }
                    setHL((srcAddr + count) & 0xFFFF);
                    setDE((destAddr + count) & 0xFFFF);
                    setBC(0);
                    currentStep.readRegs!.push('H', 'L', 'D', 'E', 'B', 'C');
                    currentStep.writeRegs!.push('H', 'L', 'D', 'E', 'B', 'C');
                    currentStep.readMem = `0x${srcAddr.toString(16)}`;
                    currentStep.writeMem = `0x${destAddr.toString(16)}`;
                    currentStep.cycleCost = 21 * count;
                    break;
                }

                // Arithmetic Group
                case 'ADD': {
                    const dest = parts[1].toUpperCase();
                    const src = parts[2].toUpperCase();
                    if (dest === 'A') {
                        let operand;
                        if (regs.hasOwnProperty(src)) {
                            operand = regs[src];
                            currentStep.readRegs!.push(src);
                            currentStep.cycleCost = 4;
                        } else if (src === '(HL)') {
                            operand = memory[getHL()] || 0;
                            currentStep.readRegs!.push('H', 'L');
                            currentStep.readMem = `0x${getHL().toString(16)}`;
                            currentStep.cycleCost = 7;
                        } else {
                            operand = parseImmediate(src);
                            currentStep.cycleCost = 7;
                        }
                        const result = regs.A + operand;
                        regs.A = result & 0xFF;
                        if (result > 0xFF) regs.F |= 0x01; // C flag
                        setFlags(regs.A);
                        currentStep.readRegs!.push('A');
                        currentStep.writeRegs!.push('A');
                        currentStep.aluOp = 'ADD';
                    } else if (dest === 'HL') {
                        let operand;
                        if (src === 'BC') {
                            operand = getBC();
                            currentStep.readRegs!.push('B', 'C');
                        } else if (src === 'DE') {
                            operand = getDE();
                            currentStep.readRegs!.push('D', 'E');
                        } else if (src === 'HL') {
                            operand = getHL();
                            currentStep.readRegs!.push('H', 'L');
                        } else if (src === 'SP') {
                            operand = regs.SP;
                            currentStep.readRegs!.push('SP');
                        }
                        const result = getHL() + operand;
                        if (result > 0xFFFF) regs.F |= 0x01; // C flag
                        setHL(result & 0xFFFF);
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.writeRegs!.push('H', 'L');
                        currentStep.aluOp = 'ADD';
                        currentStep.cycleCost = 11;
                    }
                    break;
                }
                case 'ADC': {
                    const src = parts[2].toUpperCase();
                    let operand;
                    if (regs.hasOwnProperty(src)) {
                        operand = regs[src];
                        currentStep.readRegs!.push(src);
                        currentStep.cycleCost = 4;
                    } else if (src === '(HL)') {
                        operand = memory[getHL()] || 0;
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.readMem = `0x${getHL().toString(16)}`;
                        currentStep.cycleCost = 7;
                    } else {
                        operand = parseImmediate(src);
                        currentStep.cycleCost = 7;
                    }
                    const carry = (regs.F & 0x01) ? 1 : 0;
                    const result = regs.A + operand + carry;
                    regs.A = result & 0xFF;
                    if (result > 0xFF) regs.F |= 0x01; // C flag
                    setFlags(regs.A);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'ADC';
                    break;
                }
                case 'SUB': {
                    const src = parts[1].toUpperCase();
                    let operand;
                    if (regs.hasOwnProperty(src)) {
                        operand = regs[src];
                        currentStep.readRegs!.push(src);
                        currentStep.cycleCost = 4;
                    } else if (src === '(HL)') {
                        operand = memory[getHL()] || 0;
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.readMem = `0x${getHL().toString(16)}`;
                        currentStep.cycleCost = 7;
                    } else {
                        operand = parseImmediate(src);
                        currentStep.cycleCost = 7;
                    }
                    const result = regs.A - operand;
                    if (result < 0) regs.F |= 0x01; // C flag
                    regs.A = result & 0xFF;
                    setFlags(regs.A);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'SUB';
                    break;
                }
                case 'SBC': {
                    const src = parts[2].toUpperCase();
                    let operand;
                    if (regs.hasOwnProperty(src)) {
                        operand = regs[src];
                        currentStep.readRegs!.push(src);
                        currentStep.cycleCost = 4;
                    } else if (src === '(HL)') {
                        operand = memory[getHL()] || 0;
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.readMem = `0x${getHL().toString(16)}`;
                        currentStep.cycleCost = 7;
                    } else {
                        operand = parseImmediate(src);
                        currentStep.cycleCost = 7;
                    }
                    const carry = (regs.F & 0x01) ? 1 : 0;
                    const result = regs.A - operand - carry;
                    if (result < 0) regs.F |= 0x01; // C flag
                    regs.A = result & 0xFF;
                    setFlags(regs.A);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'SBC';
                    break;
                }
                case 'INC': {
                    const reg = parts[1].toUpperCase();
                    if (regs.hasOwnProperty(reg)) {
                        const result = (regs[reg] + 1) & 0xFF;
                        regs[reg] = result;
                        setFlags(result);
                        currentStep.readRegs!.push(reg);
                        currentStep.writeRegs!.push(reg);
                        currentStep.cycleCost = 4;
                    } else if (reg === '(HL)') {
                        const addr = getHL();
                        const result = ((memory[addr] || 0) + 1) & 0xFF;
                        memory[addr] = result;
                        setFlags(result);
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.readMem = `0x${addr.toString(16)}`;
                        currentStep.writeMem = `0x${addr.toString(16)}`;
                        currentStep.cycleCost = 11;
                    } else if (reg === 'HL' || reg === 'BC' || reg === 'DE' || reg === 'SP' || reg === 'IX' || reg === 'IY') {
                        if (reg === 'HL') {
                            setHL((getHL() + 1) & 0xFFFF);
                            currentStep.readRegs!.push('H', 'L');
                            currentStep.writeRegs!.push('H', 'L');
                        } else if (reg === 'BC') {
                            setBC((getBC() + 1) & 0xFFFF);
                            currentStep.readRegs!.push('B', 'C');
                            currentStep.writeRegs!.push('B', 'C');
                        } else if (reg === 'DE') {
                            setDE((getDE() + 1) & 0xFFFF);
                            currentStep.readRegs!.push('D', 'E');
                            currentStep.writeRegs!.push('D', 'E');
                        } else {
                            regs[reg] = (regs[reg] + 1) & 0xFFFF;
                            currentStep.readRegs!.push(reg);
                            currentStep.writeRegs!.push(reg);
                        }
                        currentStep.cycleCost = 6;
                    }
                    currentStep.aluOp = 'INC';
                    break;
                }
                case 'DEC': {
                    const reg = parts[1].toUpperCase();
                    if (regs.hasOwnProperty(reg)) {
                        const result = (regs[reg] - 1) & 0xFF;
                        regs[reg] = result;
                        setFlags(result);
                        currentStep.readRegs!.push(reg);
                        currentStep.writeRegs!.push(reg);
                        currentStep.cycleCost = 4;
                    } else if (reg === '(HL)') {
                        const addr = getHL();
                        const result = ((memory[addr] || 0) - 1) & 0xFF;
                        memory[addr] = result;
                        setFlags(result);
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.readMem = `0x${addr.toString(16)}`;
                        currentStep.writeMem = `0x${addr.toString(16)}`;
                        currentStep.cycleCost = 11;
                    } else if (reg === 'HL' || reg === 'BC' || reg === 'DE' || reg === 'SP' || reg === 'IX' || reg === 'IY') {
                        if (reg === 'HL') {
                            setHL((getHL() - 1) & 0xFFFF);
                            currentStep.readRegs!.push('H', 'L');
                            currentStep.writeRegs!.push('H', 'L');
                        } else if (reg === 'BC') {
                            setBC((getBC() - 1) & 0xFFFF);
                            currentStep.readRegs!.push('B', 'C');
                            currentStep.writeRegs!.push('B', 'C');
                        } else if (reg === 'DE') {
                            setDE((getDE() - 1) & 0xFFFF);
                            currentStep.readRegs!.push('D', 'E');
                            currentStep.writeRegs!.push('D', 'E');
                        } else {
                            regs[reg] = (regs[reg] - 1) & 0xFFFF;
                            currentStep.readRegs!.push(reg);
                            currentStep.writeRegs!.push(reg);
                        }
                        currentStep.cycleCost = 6;
                    }
                    currentStep.aluOp = 'DEC';
                    break;
                }

                // Logical Group
                case 'AND': {
                    const src = parts[1].toUpperCase();
                    let operand;
                    if (regs.hasOwnProperty(src)) {
                        operand = regs[src];
                        currentStep.readRegs!.push(src);
                        currentStep.cycleCost = 4;
                    } else if (src === '(HL)') {
                        operand = memory[getHL()] || 0;
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.readMem = `0x${getHL().toString(16)}`;
                        currentStep.cycleCost = 7;
                    } else {
                        operand = parseImmediate(src);
                        currentStep.cycleCost = 7;
                    }
                    regs.A = regs.A & operand;
                    regs.F &= ~0x01; // Clear C flag
                    setFlags(regs.A);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'AND';
                    break;
                }
                case 'OR': {
                    const src = parts[1].toUpperCase();
                    let operand;
                    if (regs.hasOwnProperty(src)) {
                        operand = regs[src];
                        currentStep.readRegs!.push(src);
                        currentStep.cycleCost = 4;
                    } else if (src === '(HL)') {
                        operand = memory[getHL()] || 0;
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.readMem = `0x${getHL().toString(16)}`;
                        currentStep.cycleCost = 7;
                    } else {
                        operand = parseImmediate(src);
                        currentStep.cycleCost = 7;
                    }
                    regs.A = regs.A | operand;
                    regs.F &= ~0x01; // Clear C flag
                    setFlags(regs.A);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'OR';
                    break;
                }
                case 'XOR': {
                    const src = parts[1].toUpperCase();
                    let operand;
                    if (regs.hasOwnProperty(src)) {
                        operand = regs[src];
                        currentStep.readRegs!.push(src);
                        currentStep.cycleCost = 4;
                    } else if (src === '(HL)') {
                        operand = memory[getHL()] || 0;
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.readMem = `0x${getHL().toString(16)}`;
                        currentStep.cycleCost = 7;
                    } else {
                        operand = parseImmediate(src);
                        currentStep.cycleCost = 7;
                    }
                    regs.A = regs.A ^ operand;
                    regs.F &= ~0x01; // Clear C flag
                    setFlags(regs.A);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'XOR';
                    break;
                }
                case 'CP': {
                    const src = parts[1].toUpperCase();
                    let operand;
                    if (regs.hasOwnProperty(src)) {
                        operand = regs[src];
                        currentStep.readRegs!.push(src);
                        currentStep.cycleCost = 4;
                    } else if (src === '(HL)') {
                        operand = memory[getHL()] || 0;
                        currentStep.readRegs!.push('H', 'L');
                        currentStep.readMem = `0x${getHL().toString(16)}`;
                        currentStep.cycleCost = 7;
                    } else {
                        operand = parseImmediate(src);
                        currentStep.cycleCost = 7;
                    }
                    const result = regs.A - operand;
                    if (result < 0) regs.F |= 0x01; // C flag
                    setFlags(result);
                    currentStep.readRegs!.push('A');
                    currentStep.aluOp = 'CMP';
                    break;
                }

                // Rotate and Shift Group
                case 'RLCA': {
                    const bit7 = (regs.A & 0x80) >> 7;
                    regs.A = ((regs.A << 1) | bit7) & 0xFF;
                    if (bit7) regs.F |= 0x01; else regs.F &= ~0x01;
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'ROL';
                    currentStep.cycleCost = 4;
                    break;
                }
                case 'RRCA': {
                    const bit0 = regs.A & 0x01;
                    regs.A = ((regs.A >> 1) | (bit0 << 7)) & 0xFF;
                    if (bit0) regs.F |= 0x01; else regs.F &= ~0x01;
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'ROR';
                    currentStep.cycleCost = 4;
                    break;
                }
                case 'RLA': {
                    const bit7 = (regs.A & 0x80) >> 7;
                    const carry = (regs.F & 0x01) ? 1 : 0;
                    regs.A = ((regs.A << 1) | carry) & 0xFF;
                    if (bit7) regs.F |= 0x01; else regs.F &= ~0x01;
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'ROL';
                    currentStep.cycleCost = 4;
                    break;
                }
                case 'RRA': {
                    const bit0 = regs.A & 0x01;
                    const carry = (regs.F & 0x01) ? 1 : 0;
                    regs.A = ((regs.A >> 1) | (carry << 7)) & 0xFF;
                    if (bit0) regs.F |= 0x01; else regs.F &= ~0x01;
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'ROR';
                    currentStep.cycleCost = 4;
                    break;
                }

                // Jump Group
                case 'JP': {
                    if (parts.length === 2) {
                        // Unconditional jump
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                        currentStep.cycleCost = 10;
                    } else {
                        // Conditional jump
                        const condition = parts[1].toUpperCase();
                        let shouldJump = false;
                        switch (condition) {
                            case 'Z': shouldJump = (regs.F & 0x40) !== 0; break;
                            case 'NZ': shouldJump = (regs.F & 0x40) === 0; break;
                            case 'C': shouldJump = (regs.F & 0x01) !== 0; break;
                            case 'NC': shouldJump = (regs.F & 0x01) === 0; break;
                            case 'M': shouldJump = (regs.F & 0x80) !== 0; break;
                            case 'P': shouldJump = (regs.F & 0x80) === 0; break;
                            case 'PE': shouldJump = (regs.F & 0x04) !== 0; break;
                            case 'PO': shouldJump = (regs.F & 0x04) === 0; break;
                        }
                        if (shouldJump) {
                            const target = labels[parts[2].toUpperCase()];
                            if (target !== undefined) {
                                pc = target;
                                jumped = true;
                            } else {
                                throw new Error(`Undefined label: ${parts[2]}`);
                            }
                        }
                        currentStep.cycleCost = 10;
                    }
                    break;
                }
                case 'JR': {
                    if (parts.length === 2) {
                        // Unconditional relative jump
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                        currentStep.cycleCost = 12;
                    } else {
                        // Conditional relative jump
                        const condition = parts[1].toUpperCase();
                        let shouldJump = false;
                        switch (condition) {
                            case 'Z': shouldJump = (regs.F & 0x40) !== 0; break;
                            case 'NZ': shouldJump = (regs.F & 0x40) === 0; break;
                            case 'C': shouldJump = (regs.F & 0x01) !== 0; break;
                            case 'NC': shouldJump = (regs.F & 0x01) === 0; break;
                        }
                        if (shouldJump) {
                            const target = labels[parts[2].toUpperCase()];
                            if (target !== undefined) {
                                pc = target;
                                jumped = true;
                            } else {
                                throw new Error(`Undefined label: ${parts[2]}`);
                            }
                        }
                        currentStep.cycleCost = shouldJump ? 12 : 7;
                    }
                    break;
                }
                case 'DJNZ': {
                    regs.B = (regs.B - 1) & 0xFF;
                    currentStep.readRegs!.push('B');
                    currentStep.writeRegs!.push('B');
                    if (regs.B !== 0) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                        currentStep.cycleCost = 13;
                    } else {
                        currentStep.cycleCost = 8;
                    }
                    break;
                }

                // Call and Return Group
                case 'CALL': {
                    if (parts.length === 2) {
                        // Unconditional call
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            const returnAddr = pc + 1;
                            regs.SP = (regs.SP - 1) & 0xFFFF;
                            memory[regs.SP] = (returnAddr >> 8) & 0xFF;
                            regs.SP = (regs.SP - 1) & 0xFFFF;
                            memory[regs.SP] = returnAddr & 0xFF;
                            pc = target;
                            jumped = true;
                            currentStep.readRegs!.push('SP');
                            currentStep.writeRegs!.push('SP');
                            currentStep.writeMem = `0x${regs.SP.toString(16)}`;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                        currentStep.cycleCost = 17;
                    }
                    break;
                }
                case 'RET': {
                    if (parts.length === 1) {
                        // Unconditional return
                        const lowByte = memory[regs.SP] || 0;
                        regs.SP = (regs.SP + 1) & 0xFFFF;
                        const highByte = memory[regs.SP] || 0;
                        regs.SP = (regs.SP + 1) & 0xFFFF;
                        pc = (highByte << 8) | lowByte;
                        jumped = true;
                        currentStep.readRegs!.push('SP');
                        currentStep.writeRegs!.push('SP');
                        currentStep.readMem = `0x${(regs.SP - 2).toString(16)}`;
                        currentStep.cycleCost = 10;
                    }
                    break;
                }

                // Stack Group
                case 'PUSH': {
                    const regPair = parts[1].toUpperCase();
                    let high, low;
                    if (regPair === 'AF') {
                        high = regs.A; low = regs.F;
                        currentStep.readRegs!.push('A', 'F');
                    } else if (regPair === 'BC') {
                        high = regs.B; low = regs.C;
                        currentStep.readRegs!.push('B', 'C');
                    } else if (regPair === 'DE') {
                        high = regs.D; low = regs.E;
                        currentStep.readRegs!.push('D', 'E');
                    } else if (regPair === 'HL') {
                        high = regs.H; low = regs.L;
                        currentStep.readRegs!.push('H', 'L');
                    } else if (regPair === 'IX') {
                        high = (regs.IX >> 8) & 0xFF; low = regs.IX & 0xFF;
                        currentStep.readRegs!.push('IX');
                    } else if (regPair === 'IY') {
                        high = (regs.IY >> 8) & 0xFF; low = regs.IY & 0xFF;
                        currentStep.readRegs!.push('IY');
                    }
                    regs.SP = (regs.SP - 1) & 0xFFFF;
                    memory[regs.SP] = high;
                    regs.SP = (regs.SP - 1) & 0xFFFF;
                    memory[regs.SP] = low;
                    currentStep.readRegs!.push('SP');
                    currentStep.writeRegs!.push('SP');
                    currentStep.writeMem = `0x${regs.SP.toString(16)}`;
                    currentStep.cycleCost = 11;
                    break;
                }
                case 'POP': {
                    const regPair = parts[1].toUpperCase();
                    const low = memory[regs.SP] || 0;
                    regs.SP = (regs.SP + 1) & 0xFFFF;
                    const high = memory[regs.SP] || 0;
                    regs.SP = (regs.SP + 1) & 0xFFFF;
                    
                    if (regPair === 'AF') {
                        regs.A = high; regs.F = low;
                        currentStep.writeRegs!.push('A', 'F');
                    } else if (regPair === 'BC') {
                        regs.B = high; regs.C = low;
                        currentStep.writeRegs!.push('B', 'C');
                    } else if (regPair === 'DE') {
                        regs.D = high; regs.E = low;
                        currentStep.writeRegs!.push('D', 'E');
                    } else if (regPair === 'HL') {
                        regs.H = high; regs.L = low;
                        currentStep.writeRegs!.push('H', 'L');
                    } else if (regPair === 'IX') {
                        regs.IX = (high << 8) | low;
                        currentStep.writeRegs!.push('IX');
                    } else if (regPair === 'IY') {
                        regs.IY = (high << 8) | low;
                        currentStep.writeRegs!.push('IY');
                    }
                    currentStep.readRegs!.push('SP');
                    currentStep.writeRegs!.push('SP');
                    currentStep.readMem = `0x${(regs.SP - 2).toString(16)}`;
                    currentStep.cycleCost = 10;
                    break;
                }

                // I/O Group
                case 'IN': {
                    const reg = parts[1].toUpperCase();
                    const port = parseImmediate(parts[2]);
                    if (reg === 'A') {
                        regs.A = 0; // Simulate reading 0 from port
                        currentStep.writeRegs!.push('A');
                    }
                    currentStep.cycleCost = 11;
                    break;
                }
                case 'OUT': {
                    const port = parseImmediate(parts[1]);
                    const reg = parts[2].toUpperCase();
                    if (reg === 'A') {
                        output += `OUT ${port}: ${regs.A.toString(16)}\n`;
                        currentStep.readRegs!.push('A');
                    }
                    currentStep.cycleCost = 11;
                    break;
                }

                // Miscellaneous
                case 'NOP': {
                    currentStep.cycleCost = 4;
                    break;
                }
                case 'HALT': {
                    output = output || 'Execution halted.';
                    pc = cleanLines.length;
                    currentStep.cycleCost = 4;
                    break;
                }
                case 'DI': {
                    // Disable interrupts (no-op in simulation)
                    currentStep.cycleCost = 4;
                    break;
                }
                case 'EI': {
                    // Enable interrupts (no-op in simulation)
                    currentStep.cycleCost = 4;
                    break;
                }

                default:
                    throw new Error(`Unknown instruction: ${instruction}`);
            }
        } catch (e: any) {
            error = { lineIndex: pc, message: e.message };
            break;
        }
        
        cycleCount += currentStep.cycleCost!;
        currentStep.totalCycles = cycleCount;
        const nextPc = jumped ? pc : pc + 1;
        
        // Build register state
        const regEntries = Object.entries(regs).map(([n, v]) => ({
            name: n,
            value: `0x${v.toString(16).padStart(n.includes('_') || ['SP', 'PC', 'IX', 'IY'].includes(n) ? 4 : 2, '0')}`
        }));
        regEntries.push({ name: 'PC', value: `0x${nextPc.toString(16).padStart(4, '0')}` });
        
        currentStep.registers = regEntries;
        currentStep.memory = Object.entries(memory).map(([a, v]) => ({
            address: `0x${Number(a).toString(16)}`,
            value: `0x${v.toString(16).padStart(2, '0')}`
        }));
        
        trace.push(currentStep as TraceStep);
        if (!jumped) pc++;
    }

    if (!error && executedInstructions >= MAX_INSTRUCTIONS) {
        error = { lineIndex: pc > 0 ? pc - 1 : 0, message: 'Max instruction limit reached.' };
    }
    if (!error && cycleCount >= MAX_CYCLES) {
        error = { lineIndex: pc > 0 ? pc - 1 : 0, message: 'Max cycle limit reached.' };
    }
    
    output = error ? `Error on line ${lineMap[error.lineIndex] + 1}: ${error.message}` : (output || 'Execution finished.');
    
    return {
        registers: trace[trace.length - 1]?.registers || [],
        memory: trace[trace.length - 1]?.memory || [],
        output,
        cycles: cycleCount,
        trace,
        error
    };
};

export const run6502Simulation = (code: string): SimulationResult => {
    const regs: { [key: string]: number } = { A: 0, X: 0, Y: 0, SP: 0xFF, PC: 0 };
    let flags = { N: 0, V: 0, B: 0, D: 0, I: 0, Z: 0, C: 0 };
    const { labels, cleanLines, lineMap, initialMemory } = preprocessAssemblyCode(code);
    const memory = { ...initialMemory };
    const trace: TraceStep[] = [];
    let pc = labels['START'] || labels['MAIN'] || 0;
    let cycleCount = 0, executedInstructions = 0, output = '', error: SimulationError | undefined = undefined;

    const setNZ = (val: number) => {
        flags.N = (val & 0x80) ? 1 : 0;
        flags.Z = (val & 0xFF) === 0 ? 1 : 0;
    };

    const getValue = (op: string, step: Partial<TraceStep>): number => {
        if (op.startsWith('#$')) {
            return parseImmediate(op.substring(1));
        }
        if (op.startsWith('#')) {
            return parseImmediate(op.substring(1));
        }
        if (op.startsWith('$')) {
            const addr = parseImmediate(op);
            step.readMem = `0x${addr.toString(16)}`;
            return memory[addr] || 0;
        }
        const addr = labels[op.toUpperCase()];
        if (addr !== undefined) {
            step.readMem = `0x${addr.toString(16)}`;
            return memory[addr] || 0;
        }
        throw new Error(`Invalid operand: ${op}`);
    };
    
    const setAddress = (op: string, value: number, step: Partial<TraceStep>): void => {
        let addr: number;
        if (op.startsWith('$')) {
            addr = parseImmediate(op);
        } else {
            addr = labels[op.toUpperCase()];
            if (addr === undefined) throw new Error(`Undefined label: ${op}`);
        }
        memory[addr] = value & 0xFF;
        step.writeMem = `0x${addr.toString(16)}`;
    };

    const getZeroPageAddr = (op: string): number => {
        if (op.includes(',X')) {
            const base = parseImmediate(op.split(',')[0]);
            return (base + regs.X) & 0xFF;
        }
        if (op.includes(',Y')) {
            const base = parseImmediate(op.split(',')[0]);
            return (base + regs.Y) & 0xFF;
        }
        return parseImmediate(op) & 0xFF;
    };

    const getAbsoluteAddr = (op: string): number => {
        if (op.includes(',X')) {
            const base = parseImmediate(op.split(',')[0]);
            return (base + regs.X) & 0xFFFF;
        }
        if (op.includes(',Y')) {
            const base = parseImmediate(op.split(',')[0]);
            return (base + regs.Y) & 0xFFFF;
        }
        return parseImmediate(op) & 0xFFFF;
    };

    while (pc < cleanLines.length && executedInstructions < MAX_INSTRUCTIONS && cycleCount < MAX_CYCLES) {
        executedInstructions++;
        const line = cleanLines[pc];
        const parts = robustParse(line);
        const instruction = parts[0]?.toUpperCase();
        let jumped = false;
        const currentStep: Partial<TraceStep> = {
            lineIndex: pc, instructionText: line, readRegs: [], writeRegs: [],
            readMem: null, writeMem: null, aluOp: null, cycleCost: 0
        };

        try {
            if (!instruction) { pc++; continue; }

            switch (instruction) {
                // Load/Store Instructions
                case 'LDA': {
                    regs.A = getValue(parts[1], currentStep);
                    setNZ(regs.A);
                    currentStep.writeRegs!.push('A');
                    currentStep.cycleCost = parts[1].startsWith('#') ? 2 : 3;
                    break;
                }
                case 'LDX': {
                    regs.X = getValue(parts[1], currentStep);
                    setNZ(regs.X);
                    currentStep.writeRegs!.push('X');
                    currentStep.cycleCost = parts[1].startsWith('#') ? 2 : 3;
                    break;
                }
                case 'LDY': {
                    regs.Y = getValue(parts[1], currentStep);
                    setNZ(regs.Y);
                    currentStep.writeRegs!.push('Y');
                    currentStep.cycleCost = parts[1].startsWith('#') ? 2 : 3;
                    break;
                }
                case 'STA': {
                    setAddress(parts[1], regs.A, currentStep);
                    currentStep.readRegs!.push('A');
                    currentStep.cycleCost = 3;
                    break;
                }
                case 'STX': {
                    setAddress(parts[1], regs.X, currentStep);
                    currentStep.readRegs!.push('X');
                    currentStep.cycleCost = 3;
                    break;
                }
                case 'STY': {
                    setAddress(parts[1], regs.Y, currentStep);
                    currentStep.readRegs!.push('Y');
                    currentStep.cycleCost = 3;
                    break;
                }

                // Transfer Instructions
                case 'TAX': {
                    regs.X = regs.A;
                    setNZ(regs.X);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('X');
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'TAY': {
                    regs.Y = regs.A;
                    setNZ(regs.Y);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('Y');
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'TXA': {
                    regs.A = regs.X;
                    setNZ(regs.A);
                    currentStep.readRegs!.push('X');
                    currentStep.writeRegs!.push('A');
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'TYA': {
                    regs.A = regs.Y;
                    setNZ(regs.A);
                    currentStep.readRegs!.push('Y');
                    currentStep.writeRegs!.push('A');
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'TSX': {
                    regs.X = regs.SP;
                    setNZ(regs.X);
                    currentStep.readRegs!.push('SP');
                    currentStep.writeRegs!.push('X');
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'TXS': {
                    regs.SP = regs.X;
                    currentStep.readRegs!.push('X');
                    currentStep.writeRegs!.push('SP');
                    currentStep.cycleCost = 2;
                    break;
                }

                // Stack Instructions
                case 'PHA': {
                    memory[0x100 + regs.SP] = regs.A;
                    regs.SP = (regs.SP - 1) & 0xFF;
                    currentStep.readRegs!.push('A', 'SP');
                    currentStep.writeRegs!.push('SP');
                    currentStep.writeMem = `0x${(0x100 + ((regs.SP + 1) & 0xFF)).toString(16)}`;
                    currentStep.cycleCost = 3;
                    break;
                }
                case 'PLA': {
                    regs.SP = (regs.SP + 1) & 0xFF;
                    regs.A = memory[0x100 + regs.SP] || 0;
                    setNZ(regs.A);
                    currentStep.readRegs!.push('SP');
                    currentStep.writeRegs!.push('A', 'SP');
                    currentStep.readMem = `0x${(0x100 + regs.SP).toString(16)}`;
                    currentStep.cycleCost = 4;
                    break;
                }
                case 'PHP': {
                    const statusReg = (flags.N << 7) | (flags.V << 6) | (1 << 5) | (flags.B << 4) | (flags.D << 3) | (flags.I << 2) | (flags.Z << 1) | flags.C;
                    memory[0x100 + regs.SP] = statusReg;
                    regs.SP = (regs.SP - 1) & 0xFF;
                    currentStep.readRegs!.push('SP');
                    currentStep.writeRegs!.push('SP');
                    currentStep.writeMem = `0x${(0x100 + ((regs.SP + 1) & 0xFF)).toString(16)}`;
                    currentStep.cycleCost = 3;
                    break;
                }
                case 'PLP': {
                    regs.SP = (regs.SP + 1) & 0xFF;
                    const statusReg = memory[0x100 + regs.SP] || 0;
                    flags.N = (statusReg >> 7) & 1;
                    flags.V = (statusReg >> 6) & 1;
                    flags.B = (statusReg >> 4) & 1;
                    flags.D = (statusReg >> 3) & 1;
                    flags.I = (statusReg >> 2) & 1;
                    flags.Z = (statusReg >> 1) & 1;
                    flags.C = statusReg & 1;
                    currentStep.readRegs!.push('SP');
                    currentStep.writeRegs!.push('SP');
                    currentStep.readMem = `0x${(0x100 + regs.SP).toString(16)}`;
                    currentStep.cycleCost = 4;
                    break;
                }

                // Arithmetic Instructions
                case 'ADC': {
                    const operand = getValue(parts[1], currentStep);
                    const result = regs.A + operand + flags.C;
                    flags.V = ((regs.A ^ result) & (operand ^ result) & 0x80) ? 1 : 0;
                    flags.C = result > 0xFF ? 1 : 0;
                    regs.A = result & 0xFF;
                    setNZ(regs.A);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'ADC';
                    currentStep.cycleCost = parts[1].startsWith('#') ? 2 : 3;
                    break;
                }
                case 'SBC': {
                    const operand = getValue(parts[1], currentStep);
                    const result = regs.A - operand - (1 - flags.C);
                    flags.V = ((regs.A ^ result) & ((regs.A ^ operand) & 0x80)) ? 1 : 0;
                    flags.C = result >= 0 ? 1 : 0;
                    regs.A = result & 0xFF;
                    setNZ(regs.A);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'SBC';
                    currentStep.cycleCost = parts[1].startsWith('#') ? 2 : 3;
                    break;
                }

                // Logical Instructions
                case 'AND': {
                    const operand = getValue(parts[1], currentStep);
                    regs.A = regs.A & operand;
                    setNZ(regs.A);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'AND';
                    currentStep.cycleCost = parts[1].startsWith('#') ? 2 : 3;
                    break;
                }
                case 'ORA': {
                    const operand = getValue(parts[1], currentStep);
                    regs.A = regs.A | operand;
                    setNZ(regs.A);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'OR';
                    currentStep.cycleCost = parts[1].startsWith('#') ? 2 : 3;
                    break;
                }
                case 'EOR': {
                    const operand = getValue(parts[1], currentStep);
                    regs.A = regs.A ^ operand;
                    setNZ(regs.A);
                    currentStep.readRegs!.push('A');
                    currentStep.writeRegs!.push('A');
                    currentStep.aluOp = 'XOR';
                    currentStep.cycleCost = parts[1].startsWith('#') ? 2 : 3;
                    break;
                }

                // Compare Instructions
                case 'CMP': {
                    const operand = getValue(parts[1], currentStep);
                    const result = regs.A - operand;
                    flags.C = regs.A >= operand ? 1 : 0;
                    setNZ(result);
                    currentStep.readRegs!.push('A');
                    currentStep.aluOp = 'CMP';
                    currentStep.cycleCost = parts[1].startsWith('#') ? 2 : 3;
                    break;
                }
                case 'CPX': {
                    const operand = getValue(parts[1], currentStep);
                    const result = regs.X - operand;
                    flags.C = regs.X >= operand ? 1 : 0;
                    setNZ(result);
                    currentStep.readRegs!.push('X');
                    currentStep.aluOp = 'CMP';
                    currentStep.cycleCost = parts[1].startsWith('#') ? 2 : 3;
                    break;
                }
                case 'CPY': {
                    const operand = getValue(parts[1], currentStep);
                    const result = regs.Y - operand;
                    flags.C = regs.Y >= operand ? 1 : 0;
                    setNZ(result);
                    currentStep.readRegs!.push('Y');
                    currentStep.aluOp = 'CMP';
                    currentStep.cycleCost = parts[1].startsWith('#') ? 2 : 3;
                    break;
                }

                // Increment/Decrement Instructions
                case 'INC': {
                    if (parts[1].toUpperCase() === 'A') {
                        regs.A = (regs.A + 1) & 0xFF;
                        setNZ(regs.A);
                        currentStep.readRegs!.push('A');
                        currentStep.writeRegs!.push('A');
                        currentStep.cycleCost = 2;
                    } else {
                        const addr = getAbsoluteAddr(parts[1]);
                        const result = ((memory[addr] || 0) + 1) & 0xFF;
                        memory[addr] = result;
                        setNZ(result);
                        currentStep.readMem = `0x${addr.toString(16)}`;
                        currentStep.writeMem = `0x${addr.toString(16)}`;
                        currentStep.cycleCost = 6;
                    }
                    currentStep.aluOp = 'INC';
                    break;
                }
                case 'INX': {
                    regs.X = (regs.X + 1) & 0xFF;
                    setNZ(regs.X);
                    currentStep.readRegs!.push('X');
                    currentStep.writeRegs!.push('X');
                    currentStep.aluOp = 'INC';
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'INY': {
                    regs.Y = (regs.Y + 1) & 0xFF;
                    setNZ(regs.Y);
                    currentStep.readRegs!.push('Y');
                    currentStep.writeRegs!.push('Y');
                    currentStep.aluOp = 'INC';
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'DEC': {
                    if (parts[1].toUpperCase() === 'A') {
                        regs.A = (regs.A - 1) & 0xFF;
                        setNZ(regs.A);
                        currentStep.readRegs!.push('A');
                        currentStep.writeRegs!.push('A');
                        currentStep.cycleCost = 2;
                    } else {
                        const addr = getAbsoluteAddr(parts[1]);
                        const result = ((memory[addr] || 0) - 1) & 0xFF;
                        memory[addr] = result;
                        setNZ(result);
                        currentStep.readMem = `0x${addr.toString(16)}`;
                        currentStep.writeMem = `0x${addr.toString(16)}`;
                        currentStep.cycleCost = 6;
                    }
                    currentStep.aluOp = 'DEC';
                    break;
                }
                case 'DEX': {
                    regs.X = (regs.X - 1) & 0xFF;
                    setNZ(regs.X);
                    currentStep.readRegs!.push('X');
                    currentStep.writeRegs!.push('X');
                    currentStep.aluOp = 'DEC';
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'DEY': {
                    regs.Y = (regs.Y - 1) & 0xFF;
                    setNZ(regs.Y);
                    currentStep.readRegs!.push('Y');
                    currentStep.writeRegs!.push('Y');
                    currentStep.aluOp = 'DEC';
                    currentStep.cycleCost = 2;
                    break;
                }

                // Shift Instructions
                case 'ASL': {
                    if (parts.length === 1 || parts[1].toUpperCase() === 'A') {
                        flags.C = (regs.A & 0x80) ? 1 : 0;
                        regs.A = (regs.A << 1) & 0xFF;
                        setNZ(regs.A);
                        currentStep.readRegs!.push('A');
                        currentStep.writeRegs!.push('A');
                        currentStep.cycleCost = 2;
                    } else {
                        const addr = getAbsoluteAddr(parts[1]);
                        const value = memory[addr] || 0;
                        flags.C = (value & 0x80) ? 1 : 0;
                        const result = (value << 1) & 0xFF;
                        memory[addr] = result;
                        setNZ(result);
                        currentStep.readMem = `0x${addr.toString(16)}`;
                        currentStep.writeMem = `0x${addr.toString(16)}`;
                        currentStep.cycleCost = 6;
                    }
                    currentStep.aluOp = 'ASL';
                    break;
                }
                case 'LSR': {
                    if (parts.length === 1 || parts[1].toUpperCase() === 'A') {
                        flags.C = regs.A & 1;
                        regs.A = regs.A >> 1;
                        setNZ(regs.A);
                        currentStep.readRegs!.push('A');
                        currentStep.writeRegs!.push('A');
                        currentStep.cycleCost = 2;
                    } else {
                        const addr = getAbsoluteAddr(parts[1]);
                        const value = memory[addr] || 0;
                        flags.C = value & 1;
                        const result = value >> 1;
                        memory[addr] = result;
                        setNZ(result);
                        currentStep.readMem = `0x${addr.toString(16)}`;
                        currentStep.writeMem = `0x${addr.toString(16)}`;
                        currentStep.cycleCost = 6;
                    }
                    currentStep.aluOp = 'LSR';
                    break;
                }
                case 'ROL': {
                    if (parts.length === 1 || parts[1].toUpperCase() === 'A') {
                        const newCarry = (regs.A & 0x80) ? 1 : 0;
                        regs.A = ((regs.A << 1) | flags.C) & 0xFF;
                        flags.C = newCarry;
                        setNZ(regs.A);
                        currentStep.readRegs!.push('A');
                        currentStep.writeRegs!.push('A');
                        currentStep.cycleCost = 2;
                    } else {
                        const addr = getAbsoluteAddr(parts[1]);
                        const value = memory[addr] || 0;
                        const newCarry = (value & 0x80) ? 1 : 0;
                        const result = ((value << 1) | flags.C) & 0xFF;
                        memory[addr] = result;
                        flags.C = newCarry;
                        setNZ(result);
                        currentStep.readMem = `0x${addr.toString(16)}`;
                        currentStep.writeMem = `0x${addr.toString(16)}`;
                        currentStep.cycleCost = 6;
                    }
                    currentStep.aluOp = 'ROL';
                    break;
                }
                case 'ROR': {
                    if (parts.length === 1 || parts[1].toUpperCase() === 'A') {
                        const newCarry = regs.A & 1;
                        regs.A = (regs.A >> 1) | (flags.C << 7);
                        flags.C = newCarry;
                        setNZ(regs.A);
                        currentStep.readRegs!.push('A');
                        currentStep.writeRegs!.push('A');
                        currentStep.cycleCost = 2;
                    } else {
                        const addr = getAbsoluteAddr(parts[1]);
                        const value = memory[addr] || 0;
                        const newCarry = value & 1;
                        const result = (value >> 1) | (flags.C << 7);
                        memory[addr] = result;
                        flags.C = newCarry;
                        setNZ(result);
                        currentStep.readMem = `0x${addr.toString(16)}`;
                        currentStep.writeMem = `0x${addr.toString(16)}`;
                        currentStep.cycleCost = 6;
                    }
                    currentStep.aluOp = 'ROR';
                    break;
                }

                // Jump Instructions
                case 'JMP': {
                    const target = labels[parts[1].toUpperCase()];
                    if (target !== undefined) {
                        pc = target;
                        jumped = true;
                    } else {
                        throw new Error(`Undefined label: ${parts[1]}`);
                    }
                    currentStep.cycleCost = 3;
                    break;
                }
                case 'JSR': {
                    const target = labels[parts[1].toUpperCase()];
                    if (target !== undefined) {
                        const returnAddr = pc;
                        memory[0x100 + regs.SP] = (returnAddr >> 8) & 0xFF;
                        regs.SP = (regs.SP - 1) & 0xFF;
                        memory[0x100 + regs.SP] = returnAddr & 0xFF;
                        regs.SP = (regs.SP - 1) & 0xFF;
                        pc = target;
                        jumped = true;
                        currentStep.readRegs!.push('SP');
                        currentStep.writeRegs!.push('SP');
                        currentStep.writeMem = `0x${(0x100 + ((regs.SP + 2) & 0xFF)).toString(16)}`;
                    } else {
                        throw new Error(`Undefined label: ${parts[1]}`);
                    }
                    currentStep.cycleCost = 6;
                    break;
                }
                case 'RTS': {
                    regs.SP = (regs.SP + 1) & 0xFF;
                    const lowByte = memory[0x100 + regs.SP] || 0;
                    regs.SP = (regs.SP + 1) & 0xFF;
                    const highByte = memory[0x100 + regs.SP] || 0;
                    pc = ((highByte << 8) | lowByte) + 1;
                    jumped = true;
                    currentStep.readRegs!.push('SP');
                    currentStep.writeRegs!.push('SP');
                    currentStep.readMem = `0x${(0x100 + ((regs.SP - 1) & 0xFF)).toString(16)}`;
                    currentStep.cycleCost = 6;
                    break;
                }

                // Branch Instructions
                case 'BPL': {
                    if (flags.N === 0) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 3 : 2;
                    break;
                }
                case 'BMI': {
                    if (flags.N === 1) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 3 : 2;
                    break;
                }
                case 'BVC': {
                    if (flags.V === 0) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 3 : 2;
                    break;
                }
                case 'BVS': {
                    if (flags.V === 1) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 3 : 2;
                    break;
                }
                case 'BCC': {
                    if (flags.C === 0) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 3 : 2;
                    break;
                }
                case 'BCS': {
                    if (flags.C === 1) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 3 : 2;
                    break;
                }
                case 'BNE': {
                    if (flags.Z === 0) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 3 : 2;
                    break;
                }
                case 'BEQ': {
                    if (flags.Z === 1) {
                        const target = labels[parts[1].toUpperCase()];
                        if (target !== undefined) {
                            pc = target;
                            jumped = true;
                        } else {
                            throw new Error(`Undefined label: ${parts[1]}`);
                        }
                    }
                    currentStep.cycleCost = jumped ? 3 : 2;
                    break;
                }

                // Flag Instructions
                case 'CLC': {
                    flags.C = 0;
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'SEC': {
                    flags.C = 1;
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'CLI': {
                    flags.I = 0;
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'SEI': {
                    flags.I = 1;
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'CLV': {
                    flags.V = 0;
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'CLD': {
                    flags.D = 0;
                    currentStep.cycleCost = 2;
                    break;
                }
                case 'SED': {
                    flags.D = 1;
                    currentStep.cycleCost = 2;
                    break;
                }

                // System Instructions
                case 'BRK': {
                    output = output || 'Execution halted (BRK).';
                    pc = cleanLines.length;
                    currentStep.cycleCost = 7;
                    break;
                }
                case 'RTI': {
                    // Return from interrupt
                    regs.SP = (regs.SP + 1) & 0xFF;
                    const statusReg = memory[0x100 + regs.SP] || 0;
                    flags.N = (statusReg >> 7) & 1;
                    flags.V = (statusReg >> 6) & 1;
                    flags.B = (statusReg >> 4) & 1;
                    flags.D = (statusReg >> 3) & 1;
                    flags.I = (statusReg >> 2) & 1;
                    flags.Z = (statusReg >> 1) & 1;
                    flags.C = statusReg & 1;
                    
                    regs.SP = (regs.SP + 1) & 0xFF;
                    const lowByte = memory[0x100 + regs.SP] || 0;
                    regs.SP = (regs.SP + 1) & 0xFF;
                    const highByte = memory[0x100 + regs.SP] || 0;
                    pc = (highByte << 8) | lowByte;
                    jumped = true;
                    currentStep.readRegs!.push('SP');
                    currentStep.writeRegs!.push('SP');
                    currentStep.readMem = `0x${(0x100 + ((regs.SP - 2) & 0xFF)).toString(16)}`;
                    currentStep.cycleCost = 6;
                    break;
                }
                case 'NOP': {
                    currentStep.cycleCost = 2;
                    break;
                }

                default:
                    throw new Error(`Unknown instruction: ${instruction}`);
            }
        } catch (e: any) {
            error = { lineIndex: pc, message: e.message };
            break;
        }
        
        cycleCount += currentStep.cycleCost!;
        currentStep.totalCycles = cycleCount;
        const nextPc = jumped ? pc : pc + 1;
        
        // Build register state
        const statusReg = (flags.N << 7) | (flags.V << 6) | (1 << 5) | (flags.B << 4) | (flags.D << 3) | (flags.I << 2) | (flags.Z << 1) | flags.C;
        const regEntries = Object.entries(regs).map(([n, v]) => ({
            name: n,
            value: `$${v.toString(16).padStart(n === 'SP' || n === 'PC' ? 4 : 2, '0')}`
        }));
        regEntries.push({ name: 'P', value: `$${statusReg.toString(16).padStart(2, '0')}` });
        regEntries.push({ name: 'PC', value: `$${nextPc.toString(16).padStart(4, '0')}` });
        
        currentStep.registers = regEntries;
        currentStep.memory = Object.entries(memory).map(([a, v]) => ({
            address: `0x${Number(a).toString(16)}`,
            value: `$${v.toString(16).padStart(2, '0')}`
        }));
        
        trace.push(currentStep as TraceStep);
        if (!jumped) pc++;
    }

    if (!error && executedInstructions >= MAX_INSTRUCTIONS) {
        error = { lineIndex: pc > 0 ? pc - 1 : 0, message: 'Max instruction limit reached.' };
    }
    if (!error && cycleCount >= MAX_CYCLES) {
        error = { lineIndex: pc > 0 ? pc - 1 : 0, message: 'Max cycle limit reached.' };
    }
    
    output = error ? `Error on line ${lineMap[error.lineIndex] + 1}: ${error.message}` : (output || 'Execution finished.');
    
    return {
        registers: trace[trace.length - 1]?.registers || [],
        memory: trace[trace.length - 1]?.memory || [],
        output,
        cycles: cycleCount,
        trace,
        error
    };
};