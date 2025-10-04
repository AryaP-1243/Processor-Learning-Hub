

import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Processor } from '../types';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
export const ai = new GoogleGenAI({ apiKey });

const generateContent = async (prompt: string): Promise<string> => {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Sorry, I encountered an error while processing your request.";
  }
};

export const getProcessorOverview = (processor: Processor) => {
  const prompt = `You are a world-class computer historian and architect. Provide a detailed overview of the ${processor.name} processor. Cover its history, key architectural features, its significance in the industry, and what it was commonly used for. Use markdown for clear formatting, including headers and bullet points.`;
  return generateContent(prompt);
};

export const explainConcept = (concept: string, processorName: string) => {
  const prompt = `You are an expert computer architecture professor. Explain the concept of "${concept}" specifically for the ${processorName} processor. Provide a detailed, clear explanation suitable for a university student. Use markdown for formatting, including headers, bold text, and bullet points.`;
  return generateContent(prompt);
};

export const explainCode = (code: string, language: string, processorName: string) => {
  const prompt = `As an expert in embedded systems, provide a line-by-line explanation of the following ${language} code written for the ${processorName} processor. Explain what each line does and its effect on the processor's state.\n\nCode:\n\`\`\`${language.toLowerCase()}\n${code}\n\`\`\``;
  return generateContent(prompt);
};

export const analyzeCode = (code: string, language: string, processorName: string) => {
    const prompt = `You are a Socratic computer architecture tutor. The user has written the following ${language} code for the ${processorName}. 
    Your goal is to help them learn, not to give them the answer.
    Analyze the code for correctness, efficiency, and style.
    - If there is an error, DO NOT state the error directly. Instead, ask a leading question about the line or concept that is wrong. For example, "Interesting use of the MOV instruction on line 3. What does the manual say about the allowed operands for MOV?".
    - If the code is correct but inefficient, suggest a better way by asking a question. For example, "This loop works well. Is there an instruction on the ${processorName} that might make it run in fewer cycles?".
    - If the code is correct and efficient, praise the user and suggest a more challenging follow-up task, like "Excellent work! This is a very clean solution. As a bonus challenge, could you modify it to handle 16-bit numbers?".
    - Always be encouraging and frame your response as a helpful tutor. Use markdown for formatting.

    Code:\n\`\`\`${language.toLowerCase()}\n${code}\n\`\`\``;
    return generateContent(prompt);
};


export const explainSimulation = (simulationResult: string, processorName:string) => {
  const prompt = `A simulation for the ${processorName} processor produced the following result: \n\n${simulationResult}\n\nExplain why the registers and memory have these final values based on typical assembly/C execution for this processor.`;
  return generateContent(prompt);
};

export const getQuizQuestion = async (processor: Processor): Promise<string> => {
    const prompt = `Generate a single multiple-choice quiz question about the ${processor.name} processor. The question should be challenging but fair for an undergraduate student. Focus on its architecture, ISA, or key features.`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        options: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                        },
                        correctAnswer: { type: Type.STRING },
                        explanation: { type: Type.STRING },
                    },
                },
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error generating quiz question:", error);
        return "Failed to generate quiz question.";
    }
};


export const compareProcessors = async (proc1: Processor, proc2: Processor): Promise<string> => {
  const prompt = `Provide a detailed comparison between the ${proc1.name} and ${proc2.name} processors. Cover architecture, ISA, performance, common use cases, and key peripherals.`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    comparison: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                feature: { type: Type.STRING },
                                proc1: { type: Type.STRING, description: `Details for ${proc1.name}` },
                                proc2: { type: Type.STRING, description: `Details for ${proc2.name}` },
                            },
                        },
                    },
                },
            },
        },
    });
    return response.text;
  } catch (error) {
    console.error("Error comparing processors:", error);
    return JSON.stringify({ error: "Failed to generate comparison." });
  }
};

export const getProcessorDetails = async (detailType: 'Registers' | 'Memory Organization' | 'Instruction Set (ISA)', processor: Processor): Promise<string> => {
    let prompt;
    let schema;

    if (detailType === 'Registers') {
        prompt = `Provide the Register set for the ${processor.name} processor.`;
        schema = {
            type: Type.OBJECT,
            properties: {
                overview: { type: Type.STRING, description: `A detailed overview of the register architecture for the ${processor.name}.` },
                registers: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            size: { type: Type.STRING, description: "e.g., 8-bit, 16-bit, 32-bit" },
                            description: { type: Type.STRING, description: "A detailed description of the register's purpose and usage." },
                        },
                    },
                },
            },
        };
    } else if (detailType === 'Memory Organization') {
        prompt = `Provide the Memory Organization for the ${processor.name} processor.`;
        schema = { 
            type: Type.OBJECT,
            properties: {
                overview: { type: Type.STRING, description: `A detailed overview of the memory organization for the ${processor.name}.` },
                memory_map: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            address_range: { type: Type.STRING },
                            size: { type: Type.STRING },
                            description: { type: Type.STRING, description: "A detailed description of what this memory region is used for (e.g., RAM, ROM, Peripherals)." },
                        },
                    },
                },
            },
        };
    } else { // Instruction Set (ISA)
        prompt = `You are a world-class computer architecture expert and technical writer, tasked with creating a definitive, exhaustive, and highly-detailed reference manual for the ${processor.name} processor. Your work must be of archival quality, suitable for hardware engineers and compiler developers.

Your task is to generate the **complete and unabridged instruction set**. This is not a summary. You must include every single instruction, including privileged, FPU, SIMD, and system control instructions if they exist for this architecture.

The response must be a JSON object conforming to the provided schema. It must contain:
1.  An 'overview' string: A detailed introduction to the processor's ISA philosophy (e.g., CISC/RISC), primary addressing modes, register architecture, and any unique features.
2.  An 'instruction_categories' array: Each object in this array represents a logical group of instructions (e.g., 'Data Transfer Instructions', 'Arithmetic and Logic Instructions', 'Control Flow Instructions', 'I/O and System Instructions').

Each category object must contain:
- 'category_name': The name of the category.
- 'description': A brief explanation of the category's purpose.
- 'instructions': An array of instruction objects.

For **every single instruction**, each instruction object must contain:
- 'mnemonic': The instruction's official mnemonic (e.g., 'MOV', 'ADD').
- 'operands': Typical operands for the instruction (e.g., 'dest, src', 'reg, mem/imm').
- 'summary': A concise, one-sentence summary of the instruction's function.
- 'description': A detailed, technical paragraph describing the instruction's precise operation. Explain exactly what happens when it is executed.
- 'flags_affected': A comprehensive list of all processor flags affected by this instruction (e.g., 'Z, S, P, CY, AC'). If none are affected, state 'None'. Be specific about how they are set or cleared.
- 'timing': The typical cycle count, T-states, or timing information for the instruction. This can be a range or depend on operands (e.g., '4-12 cycles', '7 T-states').

It is absolutely critical that you provide the **full and complete ISA**. Your response will be programmatically validated against the schema for correctness and critically evaluated against official vendor documentation for 100% completeness. Do not summarize, omit, or simplify.`;
        schema = {
            type: Type.OBJECT,
            properties: {
                overview: { type: Type.STRING, description: `A detailed overview of the Instruction Set Architecture for the ${processor.name}.` },
                instruction_categories: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            category_name: { type: Type.STRING, description: "The name of the instruction category (e.g., Data Transfer, Arithmetic Operations)." },
                            description: { type: Type.STRING, description: "A brief overview of what instructions in this category do." },
                            instructions: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        mnemonic: { type: Type.STRING, description: "The instruction's official mnemonic (e.g., 'MOV', 'ADD')." },
                                        operands: { type: Type.STRING, description: "Typical operands for the instruction (e.g., 'dest, src', 'reg, mem/imm')." },
                                        summary: { type: Type.STRING, description: "A concise, one-sentence summary of the instruction's function." },
                                        description: { type: Type.STRING, description: "A detailed, technical paragraph describing the instruction's precise operation." },
                                        flags_affected: { type: Type.STRING, description: "List all processor flags affected by this instruction (e.g., 'Z, S, P, CY, AC') or 'None'." },
                                        timing: { type: Type.STRING, description: "Typical cycle count or timing information for the instruction (e.g., '4-12 cycles', '7 T-states')." },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        };
    }
  
  
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        return response.text;
    } catch (error) {
        console.error(`Error generating ${detailType} details:`, error);
        return JSON.stringify({ error: `Failed to generate ${detailType} details.` });
    }
};

export const getIA32Details = async (processor: Processor): Promise<string> => {
    const prompt = `You are a world-class computer architect and technical writer, specializing in the Intel x86 family. Your task is to provide a comprehensive and detailed deep-dive into the IA-32 architecture, specifically as it was implemented on the ${processor.name}. Your explanation should be suitable for a university undergraduate studying computer architecture.

Your response must be in JSON format and cover the following sections in detail, using markdown for formatting within string values:

1.  **Overview**: A thorough introduction to the significance of the 32-bit IA-32 architecture. Explain its evolution from the 16-bit 8086. Detail its most important contributions, such as paving the way for modern operating systems.

2.  **Operating Modes**: A detailed comparison of 'Real Mode' and 'Protected Mode'. Explain what each mode is, its memory addressing capabilities (e.g., 1MB limit vs. 4GB), and its purpose. Also, briefly touch upon 'Virtual 8086 Mode'.

3.  **Registers**: A comprehensive list of the core IA-32 registers. For each register, provide its name, its size in bits, its type (e.g., General Purpose, Segment, EFLAGS, Instruction Pointer, Control), and a detailed description of its primary function and common uses. Be sure to cover EAX, EBX, ECX, EDX, ESI, EDI, EBP, ESP, CS, DS, SS, ES, FS, GS, EIP, and the EFLAGS register (explaining key flags like CF, ZF, SF, OF, DF, IF).

4.  **Memory Organization**: A detailed explanation of both the Segmented and Flat memory models.
    - For the **Segmented Model**: Explain how a logical address (segment:offset) is translated into a 20-bit or 32-bit physical address using segment registers and descriptors.
    - For the **Paging Mechanism**: Explain how paging works within protected mode to provide virtual memory, translating linear addresses to physical addresses via page directories and page tables.

5.  **Key Instructions**: A curated list of representative IA-32 instructions that showcase its CISC nature. For each instruction, provide its mnemonic, typical operands, and a detailed description of its operation and why it's significant. Include instructions like: MOV, PUSH, POP, ADD, SUB, JMP, CALL, RET, LEA, CMP, INT, and a string instruction like MOVSB.`;

    const registerSchema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            size: { type: Type.STRING },
            type: { type: Type.STRING, description: "e.g., General Purpose, Segment, Instruction Pointer, EFLAGS" },
            description: { type: Type.STRING },
        },
    };

    const instructionSchema = {
        type: Type.OBJECT,
        properties: {
            mnemonic: { type: Type.STRING },
            operands: { type: Type.STRING },
            description: { type: Type.STRING },
        },
    };
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            overview: { type: Type.STRING, description: "A detailed overview of the IA-32 architecture." },
            operating_modes: { type: Type.STRING, description: "A detailed comparison of Real Mode, Protected Mode, and Virtual 8086 Mode, formatted with markdown." },
            registers: { type: Type.ARRAY, items: registerSchema },
            memory_organization: { type: Type.STRING, description: "A detailed explanation of the memory model (segmented, paging), formatted with markdown." },
            key_instructions: { type: Type.ARRAY, items: instructionSchema },
        },
    };

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        return response.text;
    } catch (error) {
        console.error(`Error generating IA-32 details:`, error);
        return JSON.stringify({ error: `Failed to generate IA-32 details.` });
    }
};

export const getProjectIdeas = async (processor: Processor): Promise<string> => {
    const prompt = `Generate 3-5 practical project ideas for a hobbyist or student using the ${processor.name}.`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        projects: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    difficulty: { type: Type.STRING, enum: ['Beginner', 'Intermediate', 'Advanced'] },
                                    components: { type: Type.ARRAY, items: { type: Type.STRING } },
                                },
                            },
                        },
                    },
                },
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error generating project ideas:", error);
        return JSON.stringify({ error: "Failed to generate project ideas." });
    }
};

export const getInterviewQuestions = async (processor: Processor): Promise<string> => {
    const prompt = `Generate 3-5 common technical interview questions related to the ${processor.name} processor or its general architecture type (e.g., RISC, CISC, microcontroller specifics). Provide a concise but thorough answer for each.`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        questions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    question: { type: Type.STRING },
                                    answer: { type: Type.STRING },
                                },
                            },
                        },
                    },
                },
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error generating interview questions:", error);
        return JSON.stringify({ error: "Failed to generate interview questions." });
    }
};

export const simulateCCode = async (code: string, processor: Processor): Promise<string> => {
    const prompt = `
    You are a C code execution simulator for embedded systems.
    Given the following C code for the ${processor.name} processor, perform a conceptual execution of the code.
    
    Do not actually compile or run it, but determine the logical outcome.
    
    Specifically:
    1. Analyze the main function.
    2. Track the values of key variables.
    3. Determine the final state of any arrays or important memory locations modified by the code.
    4. Determine any output that would be printed (e.g., via Serial.println).
    5. Based on the architecture of a ${processor.name} (${processor.architecture}), provide a plausible final state for a few key registers (e.g., general-purpose registers like R0, R1, a stack pointer SP, and a program counter PC). The values should be reasonable but not necessarily cycle-accurate.
    
    Return the result as a JSON object. Do not include any other text or markdown.
    
    Code:
    \`\`\`c
    ${code}
    \`\`\`
    `;
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            registers: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        value: { type: Type.STRING, description: "Hexadecimal value, e.g., 0x00000096" }
                    }
                }
            },
            memory: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        address: { type: Type.STRING, description: "Hexadecimal address, e.g., 0x20000000" },
                        value: { type: Type.STRING, description: "Hexadecimal value, e.g., 0x0A" }
                    }
                }
            },
            output: { type: Type.STRING, description: "The final output of the program." }
        }
    };

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error simulating C code:", error);
        return JSON.stringify({ error: "Failed to simulate C code." });
    }
};

export const simulateAssemblyCodeWithAI = async (code: string, processor: Processor): Promise<string> => {
    // 1. Get the full ISA for the processor to provide as context.
    let isaData: any;
    try {
        const isaString = await getProcessorDetails('Instruction Set (ISA)', processor);
        isaData = JSON.parse(isaString);
        if (isaData.error) {
            return JSON.stringify({ 
                registers: [], memory: [], output: `Failed to fetch ISA details for ${processor.name}. Cannot perform accurate simulation.`, 
                error: { lineIndex: 0, message: "ISA data unavailable." } 
            });
        }
    } catch (e) {
        console.error("Failed to fetch/parse ISA for simulation", e);
        return JSON.stringify({ 
            registers: [], memory: [], output: `An error occurred while fetching processor architecture details.`, 
            error: { lineIndex: 0, message: "Internal error fetching ISA." } 
        });
    }
    
    // 2. Construct the powerful, ISA-informed prompt.
    const prompt = `
    You are a meticulous, cycle-accurate virtual machine for the ${processor.name} processor.
    Your task is to simulate the provided assembly code with the highest degree of precision.

    You have been given the complete Instruction Set Architecture (ISA) for this processor as a JSON object. You MUST adhere to it strictly.

    For each instruction in the user's code:
    1.  Look up the instruction in the provided ISA JSON.
    2.  Simulate its exact effect on registers, memory, and processor flags as described in the ISA.
    3.  Calculate a plausible cycle cost based on the instruction's timing information from the ISA.
    4.  Track the state of all registers and any modified memory locations.

    Your simulation must be a step-by-step trace. If the code has an error (e.g., invalid syntax, incorrect operands for an instruction according to the ISA), you must stop and report the error on the specific line.

    You MUST also simulate the execution on a generic 5-stage RISC-like pipeline (IF, ID, EX, MEM, WB), even for CISC architectures.
    - For simple instructions (e.g., ADD R1, R2), they will flow through the pipeline one cycle per stage.
    - For complex CISC instructions (e.g., MOV [MEM1], [MEM2]), you must break them down into a sequence of micro-operations (like Load, Execute, Store) and show how these flow through the pipeline across multiple cycles.
    - You must model data dependencies, stalls (for load-use hazards), and forwarding paths conceptually.
    - The output must include a 'pipelineTrace' array, detailing the state of each of the 5 stages for every single cycle of the entire execution.

    The final output MUST be a single JSON object conforming to the provided schema. Do not include any other text, explanations, or markdown formatting outside of the JSON object.

    **ISA for ${processor.name}:**
    \`\`\`json
    ${JSON.stringify(isaData, null, 2)}
    \`\`\`

    **Assembly Code to Simulate:**
    \`\`\`assembly
    ${code}
    \`\`\`
    `;

    // 3. Define the output schema (this must match the SimulationResult type).
    const registerSchema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            value: { type: Type.STRING, description: "Hexadecimal value, e.g., 0xFF, 0x1234" }
        }
    };

    const memorySchema = {
        type: Type.OBJECT,
        properties: {
            address: { type: Type.STRING, description: "Hexadecimal address, e.g., 0x1000" },
            value: { type: Type.STRING, description: "Hexadecimal value, e.g., 0xFF" }
        }
    };

    const traceStepSchema = {
        type: Type.OBJECT,
        properties: {
            lineIndex: { type: Type.INTEGER, description: "The zero-based index of the clean instruction line being executed." },
            instructionText: { type: Type.STRING, description: "The text of the instruction being executed." },
            readRegs: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of registers read by this instruction." },
            writeRegs: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of registers written to by this instruction." },
            readMem: { type: Type.STRING, description: "The memory address read from, or an empty string." },
            writeMem: { type: Type.STRING, description: "The memory address written to, or an empty string." },
            aluOp: { type: Type.STRING, description: "The ALU operation performed (e.g., ADD, SUB), or an empty string." },
            cycleCost: { type: Type.INTEGER, description: "Estimated cycle cost for this instruction." },
            totalCycles: { type: Type.INTEGER, description: "The total cycle count after this instruction." },
            registers: { type: Type.ARRAY, items: registerSchema, description: "The complete state of all registers AFTER this step." },
            memory: { type: Type.ARRAY, items: memorySchema, description: "The complete state of all modified memory locations AFTER this step." }
        }
    };

    const pipelineStageStateSchema = {
        type: Type.OBJECT,
        properties: {
            instruction: { type: Type.STRING, nullable: true },
            pc: { type: Type.INTEGER, nullable: true },
            isBubble: { type: Type.BOOLEAN },
        }
    };
    
    const forwardingPathSchema = {
        type: Type.OBJECT,
        properties: {
            sourceStage: { type: Type.STRING, enum: ['EX', 'MEM', 'WB'] },
            destStage: { type: Type.STRING, enum: ['ID', 'EX'] },
            register: { type: Type.STRING },
        }
    };
    
    const hazardInfoSchema = {
        type: Type.OBJECT,
        properties: {
            type: { type: Type.STRING, enum: ['Data Hazard (Forwarded)', 'Load-Use Hazard (Stalled)', 'Control Hazard'] },
            details: { type: Type.STRING },
        }
    };
    
    const pipelineCycleStateSchema = {
        type: Type.OBJECT,
        properties: {
            cycle: { type: Type.INTEGER },
            IF: pipelineStageStateSchema,
            ID: pipelineStageStateSchema,
            EX: pipelineStageStateSchema,
            MEM: pipelineStageStateSchema,
            WB: pipelineStageStateSchema,
            registers: { type: Type.ARRAY, items: registerSchema },
            memory: { type: Type.ARRAY, items: memorySchema },
            forwardingPaths: { type: Type.ARRAY, items: forwardingPathSchema },
            hazardInfo: { ...hazardInfoSchema, nullable: true },
            instructionCompleted: { type: Type.STRING, nullable: true },
        }
    };
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            registers: { type: Type.ARRAY, items: registerSchema, description: "The FINAL state of all registers." },
            memory: { type: Type.ARRAY, items: memorySchema, description: "The FINAL state of all modified memory locations." },
            output: { type: Type.STRING, description: "Any textual output from the program, or a final status message (e.g., 'Execution Halted')." },
            cycles: { type: Type.INTEGER, description: "The TOTAL number of cycles for the entire execution." },
            trace: { type: Type.ARRAY, items: traceStepSchema, description: "A step-by-step trace of the execution." },
            pipelineTrace: { type: Type.ARRAY, items: pipelineCycleStateSchema, description: "A cycle-by-cycle trace of the pipeline state." },
            error: { 
                type: Type.OBJECT,
                properties: {
                    lineIndex: { type: Type.INTEGER, description: "The zero-based index of the clean instruction line where the error occurred." },
                    message: { type: Type.STRING, description: "A description of the error." }
                },
            }
        },
        nullable: ["error", "pipelineTrace"]
    };

    // 4. Call the Gemini API with the new context-rich prompt.
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error simulating Assembly code with AI:", error);
        return JSON.stringify({ 
            registers: [], 
            memory: [], 
            output: "Failed to get a valid simulation response from the AI. The model may have been unable to process the request with the provided ISA and code.", 
            error: { lineIndex: 0, message: "AI API call failed or returned invalid format." } 
        });
    }
};

export const fixCode = async (code: string, processor: Processor, error: { lineIndex: number, message: string }): Promise<string> => {
    const prompt = `
    You are an expert assembly language and C debugger for embedded systems.
    The following ${processor.language} code for the ${processor.name} processor failed to run.
    Error message: "${error.message}" on line ${error.lineIndex + 1}.

    Please analyze the code and the error, and provide a corrected version.
    Explain the change you made and why it fixes the issue.
    Return the result as a JSON object.

    Broken Code:
    \`\`\`${processor.language.toLowerCase()}
    ${code}
    \`\`\`
    `;
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            fixedCode: { type: Type.STRING, description: "The corrected and complete version of the code." },
            explanation: { type: Type.STRING, description: "A brief explanation of what was wrong and how you fixed it." }
        }
    };

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        return response.text;
    } catch (err) {
        console.error("Error fixing code with AI:", err);
        return JSON.stringify({ 
            fixedCode: null,
            explanation: "Sorry, an error occurred while trying to fix the code."
        });
    }
};

export const optimizeCode = async (code: string, processor: Processor): Promise<string> => {
    const prompt = `
    You are an expert assembly language and C programmer specializing in code optimization for historical and embedded processors.
    The user has provided the following ${processor.language} code for the ${processor.name} processor.

    Your task is to analyze this code and rewrite it to be more optimal. Optimization can mean:
    1.  **Fewer Cycles:** Using instructions that are faster on the ${processor.name}.
    2.  **Smaller Size:** Using fewer instructions or more compact instruction encodings.

    Prioritize cycle count optimization unless the code is for a severely memory-constrained system (like a PIC microcontroller).

    You MUST return a JSON object with two fields:
    - "optimizedCode": The complete, rewritten, and optimized version of the code.
    - "explanation": A detailed, step-by-step explanation of the changes you made and why they improve performance on the ${processor.name} architecture. Use markdown for formatting.

    Original Code:
    \`\`\`${processor.language.toLowerCase()}
    ${code}
    \`\`\`
    `;
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            optimizedCode: { type: Type.STRING, description: "The optimized version of the code." },
            explanation: { type: Type.STRING, description: "An explanation of the optimizations." }
        }
    };

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        return response.text;
    } catch (err) {
        console.error("Error optimizing code with AI:", err);
        return JSON.stringify({ 
            optimizedCode: null,
            explanation: "Sorry, an error occurred while trying to optimize the code."
        });
    }
};

export const getGlossaryTerms = async (): Promise<string> => {
    const prompt = `Generate a comprehensive list of about 25-30 essential computer architecture and microprocessor terms for a university-level glossary. For each term, provide a clear and concise definition.`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        terms: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    term: { type: Type.STRING },
                                    definition: { type: Type.STRING },
                                },
                            },
                        },
                    },
                },
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error generating glossary terms:", error);
        return JSON.stringify({ error: "Failed to generate glossary terms." });
    }
};