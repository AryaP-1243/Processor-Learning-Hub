

export interface User {
  username: string;
}

export interface Processor {
  id: string;
  name: string;
  description: string;
  architecture: string;
  language: 'Assembly' | 'C';
}

export interface LearningModule {
  id:string;
  title: string;
  description: string;
  isAiFeature?: boolean;
}

// For Simulation Results
export interface SimulationRegister {
  name: string;
  number?: string; // e.g., 'x1' for RISC-V
  value: string;
}

export interface SimulationMemoryCell {
  address: string;
  value: string;
}

// For Architecture Details (ISA, Registers, Memory Map)
export interface ArchitectureRegister {
    name: string;
    size: string;
    description: string;
}

export interface ArchitectureMemoryRegion {
    address_range: string;
    size: string;
    description: string;
}

export interface ArchitectureInstruction {
    mnemonic: string;
    operands: string;
    summary: string;
    description: string;
    flags_affected: string;
    timing: string;
}

export interface InstructionCategory {
    category_name: string;
    description: string;
    instructions: ArchitectureInstruction[];
}


export interface TraceStep {
  lineIndex: number;
  instructionText: string;
  readRegs: string[];
  writeRegs: string[];
  readMem: string | null;
  writeMem: string | null;
  aluOp: string | null;
  cycleCost: number;
  totalCycles: number;
  registers: SimulationRegister[];
  memory: SimulationMemoryCell[];
}

export interface SimulationError {
  lineIndex: number;
  message: string;
}

// --- NEW Pipeline Simulation Types ---
export interface PipelineStageState {
  instruction: string | null;
  pc: number | null;
  isBubble: boolean;
  // FIX: Add aluResult and memResult to allow carrying execution data between stages.
  aluResult?: number | null;
  memResult?: number | null;
}

export interface ForwardingPath {
  sourceStage: 'EX' | 'MEM' | 'WB';
  destStage: 'ID' | 'EX'; // From EX/MEM/WB to ID/EX
  register: string;
}

export interface HazardInfo {
    type: 'Data Hazard (Forwarded)' | 'Load-Use Hazard (Stalled)' | 'Control Hazard';
    details: string;
}

export interface PipelineCycleState {
  cycle: number;
  IF: PipelineStageState;
  ID: PipelineStageState;
  EX: PipelineStageState;
  MEM: PipelineStageState;
  WB: PipelineStageState;
  registers: SimulationRegister[];
  memory: SimulationMemoryCell[];
  forwardingPaths: ForwardingPath[];
  hazardInfo: HazardInfo | null;
  instructionCompleted: string | null;
}


export interface SimulationResult {
  registers: SimulationRegister[];
  memory: SimulationMemoryCell[];
  output: string;
  cycles?: number;
  trace?: TraceStep[];
  pipelineTrace?: PipelineCycleState[]; // New for pipeline simulators
  error?: SimulationError;
}


export interface AiChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface ProjectIdea {
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  components: string[];
}

export interface InterviewQuestion {
  question: string;
  answer: string;
}

export interface ArchitectureComponent {
  id: string;
  name: string;
  description: string;
  position: { x: number; y: number };
}

export interface ArchitectureConnection {
  source: string;
  target: string;
  label: string;
}

export interface ArchitectureData {
  overview: string;
  components: ArchitectureComponent[];
  connections: ArchitectureConnection[];
}

// --- User Progress Tracking ---
export interface ProcessorProgress {
    completedModules: string[];
    savedCode?: string;
}

export interface UserProgress {
    [processorId: string]: ProcessorProgress;
}

export interface GlossaryTerm {
    term: string;
    definition: string;
}