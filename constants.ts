import { Processor, LearningModule, QuizQuestion, ArchitectureData } from './types';

export const PROCESSORS: Processor[] = [
  // The Pioneers (1970s)
  { id: 'intel-4004', name: 'Intel 4004 (1971)', description: 'One of the first commercially available microprocessors.', architecture: 'CISC', language: 'Assembly' },
  { id: 'intel-8008', name: 'Intel 8008 (1972)', description: 'An early 8-bit microprocessor, predecessor to the 8080.', architecture: 'CISC', language: 'Assembly' },
  { id: 'intel-8080', name: 'Intel 8080 (1974)', description: 'A highly influential 8-bit microprocessor, forming the basis for many systems.', architecture: 'CISC', language: 'Assembly' },
  { id: 'mos-6502', name: 'MOS Technology 6502 (1975)', description: 'An inexpensive 8-bit microprocessor used in iconic home computers like the Apple II and Commodore 64.', architecture: 'CISC', language: 'Assembly' },
  { id: 'zilog-z80', name: 'Zilog Z80 (1976)', description: 'An 8-bit microprocessor that was software-compatible with the Intel 8080 but offered improvements.', architecture: 'CISC', language: 'Assembly' },
  { id: '8085', name: 'Intel 8085 (1976)', description: 'An 8-bit microprocessor, software-compatible with the 8080 with a few extensions.', architecture: 'Von Neumann', language: 'Assembly' },
  { id: 'intel-8086', name: 'Intel 8086 (1978)', description: 'A 16-bit microprocessor chip that gave rise to the x86 architecture.', architecture: 'CISC', language: 'Assembly' },
  { id: 'intel-8088', name: 'Intel 8088 (1979)', description: 'A variant of the 8086 with an 8-bit external data bus, famously used in the original IBM PC.', architecture: 'CISC', language: 'Assembly' },
  { id: 'motorola-6800', name: 'Motorola 6800 (1974)', description: 'An 8-bit microprocessor that competed with the Intel 8080.', architecture: 'CISC', language: 'Assembly' },
  { id: 'motorola-68000', name: 'Motorola 68000 (1979)', description: 'A 16/32-bit microprocessor used in the Apple Macintosh, Amiga, and Atari ST.', architecture: 'CISC', language: 'Assembly' },

  // The 16/32-bit Revolution (1980s)
  { id: 'intel-80286', name: 'Intel 80286 (1982)', description: 'A 16-bit microprocessor that introduced protected mode.', architecture: 'CISC', language: 'Assembly' },
  { id: 'intel-80386', name: 'Intel 80386 (1985)', description: 'A 32-bit microprocessor that greatly enhanced the x86 architecture.', architecture: 'CISC', language: 'Assembly' },
  { id: 'acorn-arm1', name: 'Acorn ARM1 (1985)', description: 'The first ARM processor, a 32-bit RISC chip developed by Acorn Computers.', architecture: 'RISC', language: 'Assembly' },
  { id: 'mips-r2000', name: 'MIPS R2000 (1985)', description: 'An influential 32-bit RISC microprocessor design.', architecture: 'RISC', language: 'Assembly' },
  { id: 'motorola-68020', name: 'Motorola 68020 (1984)', description: 'A 32-bit microprocessor, an enhancement of the 68000.', architecture: 'CISC', language: 'Assembly' },
  { id: 'sparc', name: 'Sun SPARC (1987)', description: 'A RISC instruction set architecture originally developed by Sun Microsystems.', architecture: 'RISC', language: 'Assembly' },

  // The Multimedia & Internet Age (1990s)
  { id: 'intel-80486', name: 'Intel 80486 (1989)', description: 'A higher performance 32-bit processor with an on-chip floating-point unit.', architecture: 'CISC', language: 'Assembly' },
  { id: 'dec-alpha-21064', name: 'DEC Alpha 21064 (1992)', description: 'A 64-bit RISC microprocessor known for its high performance.', architecture: 'RISC', language: 'Assembly' },
  { id: 'intel-pentium', name: 'Intel Pentium (1993)', description: 'A 32-bit processor that introduced a superscalar architecture to the x86 line.', architecture: 'CISC', language: 'Assembly' },
  { id: 'powerpc-601', name: 'PowerPC 601 (1993)', description: 'The first generation of PowerPC microprocessors, from the Apple-IBM-Motorola alliance.', architecture: 'RISC', language: 'Assembly' },
  { id: 'arm7tdmi', name: 'ARM7TDMI (1994)', description: 'A highly successful 32-bit ARM processor core that was widely licensed.', architecture: 'RISC', language: 'Assembly' },
  { id: 'amd-athlon', name: 'AMD Athlon (1999)', description: 'A high-performance x86 processor that decoded complex x86 instructions into simpler, RISC-like micro-operations. It was the first processor to break the 1 GHz clock speed barrier.', architecture: 'CISC', language: 'Assembly' },
  { id: 'pic16f84a', name: 'Microchip PIC16F84A', description: 'A popular 8-bit microcontroller known for its simplicity and use in hobbyist projects.', architecture: 'Harvard', language: 'Assembly' },


  // The Multi-Core & Mobile Era (2000s)
  { id: 'intel-pentium-4', name: 'Intel Pentium 4 (2000)', description: 'A single-core processor known for its high clock speeds and NetBurst architecture.', architecture: 'CISC', language: 'Assembly' },
  { id: 'arm11', name: 'ARM11 (2002)', description: 'An ARM processor architecture used in early smartphones, including the original iPhone.', architecture: 'RISC', language: 'Assembly' },
  { id: 'amd-athlon-64', name: 'AMD Athlon 64 (2003)', description: 'The first consumer-level 64-bit processor, introducing the AMD64 architecture.', architecture: 'CISC', language: 'Assembly' },
  { id: 'intel-core-2-duo', name: 'Intel Core 2 Duo (2006)', description: 'A highly successful dual-core processor that marked a major shift in Intel\'s design philosophy.', architecture: 'CISC', language: 'Assembly' },
  { id: 'cell-be', name: 'Sony/IBM/Toshiba Cell (2006)', description: 'A multi-core processor with a unique architecture, famously used in the PlayStation 3.', architecture: 'Cell', language: 'Assembly' },
  { id: 'arm-cortex-a', name: 'ARM Cortex-A Series', description: 'A family of 32/64-bit RISC ARM processor cores for performance-oriented applications like smartphones.', architecture: 'RISC', language: 'C' },


  // The Age of SoCs, AI, & Many Cores (2010s-Present)
  { id: 'intel-i5-2500k', name: 'Intel Core i5-2500K (Sandy Bridge) (2011)', description: 'A hugely popular quad-core processor for desktops, known for its performance and overclocking.', architecture: 'CISC', language: 'Assembly' },
  { id: 'google-tpu', name: 'Google TPU (2016)', description: 'A custom ASIC developed by Google specifically for neural network machine learning.', architecture: 'Custom', language: 'C' },
  { id: 'amd-ryzen-7-1800x', name: 'AMD Ryzen 7 1800X (2017)', description: 'An 8-core, 16-thread processor that marked AMD\'s major comeback in the high-performance desktop market.', architecture: 'CISC', language: 'Assembly' },
  { id: 'apple-m1', name: 'Apple M1 (2020)', description: 'An ARM-based system on a chip (SoC) designed by Apple, marking their transition away from Intel.', architecture: 'RISC', language: 'C' },
  { id: 'rp2040', name: 'Raspberry Pi Pico (RP2040)', description: 'A low-cost microcontroller with a dual-core ARM Cortex-M0+ processor.', architecture: 'Harvard', language: 'C' },
  { id: 'risc-v', name: 'RISC-V (Various)', description: 'An open standard instruction set architecture (ISA) based on RISC principles.', architecture: 'RISC', language: 'Assembly' },
  { id: 'esp32', name: 'ESP32', description: 'A series of low-cost, low-power system on a chip microcontrollers with Wi-Fi & Bluetooth.', architecture: 'Xtensa LX6', language: 'C' },
  { id: 'avr', name: 'AVR (ATmega328P)', description: 'Modified Harvard architecture 8-bit RISC single-chip microcontrollers.', architecture: 'Harvard', language: 'C' },
];


export const LEARNING_MODULES: LearningModule[] = [
    { id: 'programming', title: 'Debugger', description: 'Write and debug code with a real-time execution trace.' },
    { id: 'architecture', title: 'Architecture', description: 'Visualize the core components and data paths.' },
    { id: 'ia32-deep-dive', title: 'IA-32 Deep Dive', description: 'Explore registers, memory, and instructions for this 32-bit architecture.', isAiFeature: true },
    { id: 'projects', title: 'Projects', description: 'Get AI-generated project ideas for this processor.', isAiFeature: true },
    { id: 'quiz', title: 'Quizzes', description: 'Test your understanding with AI-generated quizzes.', isAiFeature: true },
    { id: 'interview', title: 'Interview Prep', description: 'Practice with common interview questions.', isAiFeature: true },
    { id: 'isa', title: 'Instruction Set (ISA)', description: 'Explore the supported instructions and addressing modes.' },
    { id: 'registers', title: 'Registers', description: 'Learn about the general-purpose and special-function registers.' },
    { id: 'memory', title: 'Memory Organization', description: 'Understand how memory is structured and accessed.' },
];

export const SAMPLE_CODE: { [key: string]: string } = {
  '8085': `; Load a value from memory, add 10 to it, and store it back.
START:
LXI H, var1      ; Load memory address of var1 into HL pair
MOV A, M         ; Move value from memory (pointed by HL) to Accumulator
MVI B, 10H       ; Load immediate value 10H into register B
ADD B            ; Add content of B to A. A = A + B
LXI H, var2      ; Load memory address of var2 into HL pair
MOV M, A         ; Store Accumulator content at memory address pointed by HL
HLT              ; Halt execution

; Data definitions
var1: DB 20H     ; Define byte variable var1 with value 20H
var2: DB 00H     ; Define byte variable var2 for the result`,
  'zilog-z80': `; Z80 code to sum numbers from 10 down to 1
START:
  LD B, 10      ; Load 10 into B to act as a counter
  LD A, 0       ; Clear accumulator A to store the sum
LOOP:
  ADD A, B      ; Add the counter value to the sum
  DJNZ LOOP     ; Decrement B and jump to LOOP if B is not zero
  HALT          ; Halt execution`,
  'mos-6502': `; 6502 code to add two numbers from memory
START:
  LDA num1      ; Load first number into accumulator
  CLC           ; Clear carry flag before addition
  ADC num2      ; Add second number to accumulator
  STA result    ; Store the result
  BRK           ; Halt

; Data section (will be placed at a default address)
.data
num1: .BYTE $0A ; 10 decimal
num2: .BYTE $14 ; 20 decimal
result: .BYTE $00`,
  'arm-cortex-a': `// Simple C program to sum an array
// (Illustrative for architecture exploration)
#include <stdio.h>

int main() {
    int data[] = {10, 20, 30, 40, 50};
    int sum = 0;
    int i;
    int count = sizeof(data) / sizeof(data[0]);

    for (i = 0; i < count; i++) {
        sum += data[i];
    }

    // In a real scenario, 'sum' would be used.
    // On a bare-metal system, this might be
    // written to a peripheral register.
    // Expected sum: 150
    return sum;
}`,
  'rp2040': `// Blink an LED on a Raspberry Pi Pico
#include "pico/stdlib.h"

int main() {
    const uint LED_PIN = PICO_DEFAULT_LED_PIN;
    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);
    while (true) {
        gpio_put(LED_PIN, 1);
        sleep_ms(250);
        gpio_put(LED_PIN, 0);
        sleep_ms(250);
    }
}`,
  'pic16f84a': `; PIC16F84A Assembly Code
; Toggles all pins on PORTB indefinitely
PROCESSOR 16F84A
#include <p16F84A.inc>

  __CONFIG _CP_OFF & _WDT_OFF & _PWRTE_ON & _HS_OSC

RES_VECT  CODE    0x0000
    GOTO    START

MAIN_PROG CODE
START
    BSF     STATUS, RP0   ; Select Register Bank 1
    CLRF    TRISB         ; Make PORTB all output
    BCF     STATUS, RP0   ; Select Register Bank 0
LOOP
    MOVLW   0xFF          ; Load W with all 1s
    MOVWF   PORTB         ; Turn on all PORTB LEDs
    CALL    DELAY
    CLRF    PORTB         ; Clear PORTB, turn off LEDs
    CALL    DELAY
    GOTO    LOOP

DELAY
    ; A simple delay loop
    MOVLW   d'255'
    MOVWF   R1
D1
    DECFSZ  R1, F
    GOTO    D1
    RETURN

    END`,
  'risc-v': `# Computes the sum of numbers from 1 to N
.data
result: .word 0

.text
.globl main

main:
    li t0, 10      # t0 = 10 (loop counter / N)
    li t1, 0       # t1 = 0 (sum)
    li t2, 1       # t2 = 1 (incrementor, not used in this version)

loop:
    add t1, t1, t0 # sum = sum + counter
    addi t0, t0, -1# counter--
    bne t0, zero, loop # if counter != 0, jump to loop

store_result:
    la a0, result
    sw t1, 0(a0)   # store sum in memory

exit:
    li a7, 10      # exit syscall
    ecall`,
  'intel-8086': `; Add two numbers from memory and store the result
.data
var1 DW 1234H     ; Define word (16-bit) variable var1
var2 DW 5678H     ; Define word variable var2
result DW 0       ; Define a word for the result

.text
MOV AX, [var1]    ; Load first variable into AX
MOV BX, [var2]    ; Load second variable into BX
ADD AX, BX        ; Add them: AX = AX + BX
MOV [result], AX  ; Store the result in memory
HLT               ; Halt execution`,
'esp32': `// ESP32 with Serial and mock interrupt
#include <Arduino.h>

#define LED_PIN 2

// This is a mock for simulation purposes
void IRAM_ATTR onTimer() {
  // Toggle an internal state
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  
  // Simulate setting up a timer interrupt
  // In a real scenario, this would involve timer configuration.
  // We use attachInterrupt as a keyword for the simulator.
  attachInterrupt(digitalPinToInterrupt(LED_PIN), onTimer, RISING);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  Serial.println("LED is ON");
  delay(500);
  
  digitalWrite(LED_PIN, LOW);
  Serial.println("LED is OFF");
  delay(500);
}`,
'avr': `// Simple LED blink for ATmega328P (Arduino Uno)
void setup() {
  // Pin 13 has an LED connected on most Arduino boards.
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);   // turn the LED on
  delay(1000);              // wait for a second
  digitalWrite(13, LOW);    // turn the LED off
  delay(1000);              // wait for a second
}`,
};

export const MOCK_QUIZ_QUESTIONS: { [key: string]: QuizQuestion[] } = {
  'intel-4004': [{
    question: "The Intel 4004, released in 1971, is widely recognized for what major milestone in computing history?",
    options: ["First 16-bit processor", "First commercially available microprocessor", "First processor to use RISC architecture", "First processor with an integrated GPU"],
    correctAnswer: "First commercially available microprocessor",
    explanation: "The Intel 4004 was the first complete CPU on a single chip to be made commercially available, paving the way for the personal computer revolution."
  }],
  'intel-8008': [{
    question: "The Intel 8008 was an 8-bit microprocessor. What was its primary limitation regarding memory addressing?",
    options: ["It had no stack pointer", "It could only address 16KB of memory", "It had no interrupt support", "It used a 4-bit data bus"],
    correctAnswer: "It could only address 16KB of memory",
    explanation: "The Intel 8008 used a 14-bit address bus, which limited its addressable memory space to 16KB, a significant constraint for developers."
  }],
  'intel-8080': [{
    question: "The Intel 8080 was a major improvement over the 8008. What popular operating system was initially developed for it?",
    options: ["MS-DOS", "Unix", "CP/M", "Apple DOS"],
    correctAnswer: "CP/M",
    explanation: "CP/M (Control Program for Microcomputers) was a mass-market operating system created for the Intel 8080 and Z80 microprocessors."
  }],
  'mos-6502': [{
    question: "The MOS 6502 was famous for its use in many home computers. Which feature made it cost-effective and popular with designers?",
    options: ["A large number of general-purpose registers", "An integrated floating-point unit", "A simple instruction set and addressing modes", "Built-in graphics and sound capabilities"],
    correctAnswer: "A simple instruction set and addressing modes",
    explanation: "The 6502 had a smaller, simpler design than its competitors, which made it very inexpensive to produce. Its efficient addressing modes, especially the zero-page mode, allowed for fast and compact code."
  }],
  'zilog-z80': [{
    question: "The Zilog Z80 was designed to be software-compatible with the Intel 8080. What was a key advantage it had over the 8080?",
    options: ["It ran at a lower clock speed", "It required multiple voltage supplies", "It had an extended instruction set and more registers", "It was a 16-bit processor"],
    correctAnswer: "It had an extended instruction set and more registers",
    explanation: "The Z80 was a superset of the 8080. It included all 8080 instructions, plus new ones. It also featured an alternate register set and two index registers (IX, IY), making it more powerful."
  }],
  '8085': [{
    question: "What is the size of the data bus in an 8085 microprocessor?",
    options: ["4-bit", "8-bit", "16-bit", "32-bit"],
    correctAnswer: "8-bit",
    explanation: "The Intel 8085 is an 8-bit microprocessor, meaning its data bus can transfer 8 bits of data at a time."
  }],
  'intel-8086': [{
    question: "What architectural feature did the Intel 8086 introduce to the x86 line, which defined memory access for years to come?",
    options: ["Protected Mode", "Segmented memory addressing", "A 32-bit data bus", "An on-chip cache"],
    correctAnswer: "Segmented memory addressing",
    explanation: "The 8086 used a segmented memory model to address more than 64KB of memory. It combined a 16-bit segment register with a 16-bit offset to create a 20-bit physical address."
  }],
  'intel-8088': [{
    question: "The Intel 8088 was famously used in the original IBM PC. How did its external data bus differ from the 8086?",
    options: ["It was 16-bit, same as the 8086", "It had a 4-bit external data bus", "It had an 8-bit external data bus", "It had no external data bus"],
    correctAnswer: "It had an 8-bit external data bus",
    explanation: "While internally a 16-bit processor like the 8086, the 8088 used an 8-bit external data bus. This made motherboards and peripherals cheaper to produce, which was a key factor in its selection for the IBM PC."
  }],
  'motorola-6800': [{
    question: "The Motorola 6800 was a contemporary of the Intel 8080. What was a notable feature of its programming model?",
    options: ["It had sixteen 16-bit general purpose registers", "It had two accumulators (A and B)", "It used memory segmentation", "It had a built-in math coprocessor"],
    correctAnswer: "It had two accumulators (A and B)",
    explanation: "Unlike the single-accumulator 8080, the Motorola 6800 featured two 8-bit accumulators, A and B, which could be used for arithmetic and logic operations."
  }],
  'motorola-68000': [{
    question: "The Motorola 68000 is often described as a '16/32-bit' processor. Why?",
    options: ["It could run in either 16-bit or 32-bit mode", "It had 32-bit internal registers but a 16-bit external data bus", "Half its registers were 16-bit and half were 32-bit", "It was developed over 16 years by 32 engineers"],
    correctAnswer: "It had 32-bit internal registers but a 16-bit external data bus",
    explanation: "The 68000 had a 32-bit instruction set and 32-bit general-purpose registers, but it interfaced with the rest of the system over a 16-bit data bus to reduce pin count and cost."
  }],
  'intel-80286': [{
    question: "What significant new operating mode did the Intel 80286 introduce that was foundational for modern multitasking operating systems?",
    options: ["Real Mode", "Virtual 8086 Mode", "System Management Mode", "Protected Mode"],
    correctAnswer: "Protected Mode",
    explanation: "Protected Mode, introduced with the 80286, allowed for hardware-level memory protection and multitasking, enabling operating systems to isolate processes from one another."
  }],
  'intel-80386': [{
    question: "The Intel 80386 was a major leap for the x86 architecture. What was its native data width?",
    options: ["8-bit", "16-bit", "32-bit", "64-bit"],
    correctAnswer: "32-bit",
    explanation: "The 80386 was the first 32-bit processor in the x86 family, introducing the 32-bit programming model (IA-32) that dominated computing for nearly two decades."
  }],
  'acorn-arm1': [{
    question: "The Acorn ARM1 was the first processor in a now-ubiquitous family. What design philosophy did it follow?",
    options: ["CISC (Complex Instruction Set Computer)", "VLIW (Very Long Instruction Word)", "RISC (Reduced Instruction Set Computer)", "MISC (Minimal Instruction Set Computer)"],
    correctAnswer: "RISC (Reduced Instruction Set Computer)",
    explanation: "ARM processors were designed from the ground up using the RISC philosophy, which favors a smaller, simpler set of instructions that can be executed very quickly."
  }],
  'mips-r2000': [{
    question: "MIPS architecture is known for its clean, five-stage instruction pipeline. What does MIPS stand for?",
    options: ["Multiple Instructions Per Second", "Microprocessor with Integrated Processing System", "Microprocessor without Interlocked Pipeline Stages", "Massively Integrated Processor System"],
    correctAnswer: "Microprocessor without Interlocked Pipeline Stages",
    explanation: "The name refers to a key design feature where the hardware does not handle pipeline hazards, relying on the compiler to schedule instructions to avoid conflicts, simplifying the hardware."
  }],
  'motorola-68020': [{
    question: "The Motorola 68020 was a full 32-bit enhancement of the 68000. What was a key addition to its instruction set?",
    options: ["A floating-point unit", "Bit-field instructions", "SIMD instructions", "A memory management unit"],
    correctAnswer: "Bit-field instructions",
    explanation: "The 68020 introduced powerful instructions for manipulating variable-length bit-fields in memory, which was useful for graphics and communications."
  }],
  'sparc': [{
    question: "SPARC architecture, developed by Sun Microsystems, is known for what unique feature in its register design?",
    options: ["Register renaming", "Register windows", "Shadow registers", "Vector registers"],
    correctAnswer: "Register windows",
    explanation: "SPARC uses register windows, a large bank of registers where a small, sliding 'window' is visible to a function at any time. This makes function calls very fast by avoiding the need to save and restore registers to the stack."
  }],
  'intel-80486': [{
    question: "The Intel 80486 integrated several components that were previously separate chips. Which of these was included on-die for the first time in the x86 line?",
    options: ["A memory controller", "A floating-point unit (FPU)", "A graphics processor", "A sound card"],
    correctAnswer: "A floating-point unit (FPU)",
    explanation: "The 80486 (specifically the DX models) was the first x86 processor to integrate the math coprocessor (FPU) onto the main CPU die, significantly boosting floating-point performance."
  }],
  'dec-alpha-21064': [{
    question: "The DEC Alpha was a high-performance RISC processor. What was its data width?",
    options: ["16-bit", "32-bit", "64-bit", "128-bit"],
    correctAnswer: "64-bit",
    explanation: "The DEC Alpha was one of the first commercially successful 64-bit microprocessors, designed for high-end servers and workstations."
  }],
  'intel-pentium': [{
    question: "The Intel Pentium introduced a 'superscalar' architecture. What does this mean?",
    options: ["It could run at very high clock speeds", "It had a larger on-chip cache", "It could execute more than one instruction per clock cycle", "It supported 64-bit instructions"],
    correctAnswer: "It could execute more than one instruction per clock cycle",
    explanation: "A superscalar processor has multiple execution pipelines, allowing it to fetch, decode, and execute more than one instruction simultaneously, improving performance."
  }],
  'powerpc-601': [{
    question: "The PowerPC architecture was the result of an alliance between which three companies?",
    options: ["Intel, IBM, and Microsoft", "Apple, Intel, and Motorola", "Acorn, IBM, and Motorola", "Apple, IBM, and Motorola"],
    correctAnswer: "Apple, IBM, and Motorola",
    explanation: "In 1991, Apple, IBM, and Motorola formed the AIM alliance to create the PowerPC architecture, designed to challenge the dominance of the x86 architecture."
  }],
  'arm7tdmi': [{
    question: "The 'T' in ARM7TDMI signifies support for what 16-bit instruction set extension?",
    options: ["Turbo", "Thumb", "Triton", "Vector"],
    correctAnswer: "Thumb",
    explanation: "The 'T' stands for the Thumb instruction set, which is a 16-bit compressed version of the standard 32-bit ARM instruction set. It improves code density, which is crucial for embedded systems with limited memory."
  }],
  'amd-athlon': [{
    question: "The original AMD Athlon was the first x86 processor to officially achieve what clock speed milestone?",
    options: ["500 MHz", "1 GHz", "2 GHz", "5 GHz"],
    correctAnswer: "1 GHz",
    explanation: "In March 2000, AMD released the first 1-gigahertz Athlon processor, beating Intel to this significant marketing and performance milestone."
  }],
  'pic16f84a': [{
    question: "The PIC16F84A is a popular microcontroller for hobbyists. What type of non-volatile memory does it use for program storage?",
    options: ["ROM", "EPROM", "Flash memory", "SRAM"],
    correctAnswer: "Flash memory",
    explanation: "The PIC16F84A uses flash memory, which allows its program to be erased and rewritten electrically thousands of times, making development and iteration easy."
  }],
  'intel-pentium-4': [{
    question: "The Intel Pentium 4's NetBurst architecture was designed to achieve very high clock speeds. What was a major drawback of this design?",
    options: ["Low floating-point performance", "Small cache size", "High power consumption and heat generation", "Incompatibility with older software"],
    correctAnswer: "High power consumption and heat generation",
    explanation: "NetBurst's very deep pipeline, while enabling high clock speeds, was inefficient and produced a large amount of heat, ultimately leading Intel to abandon the architecture."
  }],
  'arm11': [{
    question: "The ARM11 core was used in many early smartphones, including the original iPhone. What key feature did its pipeline introduce over previous ARM cores?",
    options: ["A simple 3-stage pipeline", "An 8-stage pipeline with some out-of-order features", "Superscalar execution", "Vector processing units (NEON)"],
    correctAnswer: "An 8-stage pipeline with some out-of-order features",
    explanation: "The ARM11 pipeline was significantly longer than its predecessors (like the ARM9's 5 stages), allowing for higher clock speeds. It also introduced features like out-of-order completion for some instructions."
  }],
  'amd-athlon-64': [{
    question: "What was the most significant 'first' for the AMD Athlon 64 processor in the consumer market?",
    options: ["First dual-core processor", "First processor with an integrated memory controller", "First 64-bit (x86-64) consumer processor", "First processor to reach 3 GHz"],
    correctAnswer: "First 64-bit (x86-64) consumer processor",
    explanation: "The Athlon 64 introduced the AMD64 instruction set (now known as x86-64), bringing 64-bit computing to the mainstream desktop market."
  }],
  'intel-core-2-duo': [{
    question: "The Intel Core 2 Duo marked a major shift away from the Pentium 4's NetBurst. What was the primary focus of the Core microarchitecture?",
    options: ["Achieving the highest possible clock speed", "Efficiency and performance-per-watt", "Increasing the on-chip cache size above all else", "Backward compatibility with the 8086"],
    correctAnswer: "Efficiency and performance-per-watt",
    explanation: "The Core architecture abandoned the 'clock speed race' and focused on a wider, more efficient design that delivered significantly better performance at lower power consumption than NetBurst."
  }],
  'cell-be': [{
    question: "The Cell processor, used in the PlayStation 3, had a unique heterogeneous architecture. What were its main processing components called?",
    options: ["One master core and eight slave cores", "One Power Processor Element (PPE) and multiple Synergistic Processing Elements (SPEs)", "One CPU and multiple GPUs", "One x86 core and multiple RISC cores"],
    correctAnswer: "One Power Processor Element (PPE) and multiple Synergistic Processing Elements (SPEs)",
    explanation: "The Cell featured one general-purpose PPE to run the OS and coordinate tasks, and several specialized SPEs, which were powerful vector processors for handling game physics and media processing."
  }],
  'arm-cortex-a': [{
    question: "The ARM Cortex-A series is designed for high-performance applications like smartphones. Which ARM architecture profile does it belong to?",
    options: ["Real-time profile (R-profile)", "Microcontroller profile (M-profile)", "Application profile (A-profile)", "Secure profile (S-profile)"],
    correctAnswer: "Application profile (A-profile)",
    explanation: "The A-profile is designed for processors that run rich operating systems like Linux, Android, and iOS, featuring high performance and a Memory Management Unit (MMU)."
  }],
  'intel-i5-2500k': [{
    question: "The 'K' in Intel Core i5-2500K signifies what feature that made it popular with enthusiasts?",
    options: ["It has a lower power consumption", "It has an unlocked multiplier for overclocking", "It includes integrated graphics", "It supports ECC memory"],
    correctAnswer: "It has an unlocked multiplier for overclocking",
    explanation: "Intel uses the 'K' suffix to denote processors with an unlocked multiplier, which allows users to easily increase the clock speed beyond the factory setting (overclocking)."
  }],
  'google-tpu': [{
    question: "Google's Tensor Processing Unit (TPU) is an Application-Specific Integrated Circuit (ASIC) designed for what primary task?",
    options: ["General-purpose computing", "Real-time graphics rendering", "Accelerating neural network machine learning", "High-performance database queries"],
    correctAnswer: "Accelerating neural network machine learning",
    explanation: "TPUs are custom-built to accelerate the matrix multiplication operations that are fundamental to training and running machine learning models, especially deep neural networks."
  }],
  'amd-ryzen-7-1800x': [{
    question: "AMD's Ryzen processors, starting with the 1800X, are based on what microarchitecture which marked their return to high-end CPU competition?",
    options: ["Bulldozer", "Piledriver", "Jaguar", "Zen"],
    correctAnswer: "Zen",
    explanation: "The Zen microarchitecture was a complete redesign that delivered a massive Instructions Per Clock (IPC) improvement over previous AMD architectures, making them competitive with Intel again."
  }],
  'apple-m1': [{
    question: "The Apple M1 is a System on a Chip (SoC). What is a key characteristic of an SoC design?",
    options: ["It is designed to be user-replaceable and upgradable", "It separates the CPU and RAM onto different boards", "It integrates multiple components like CPU, GPU, and RAM onto a single chip", "It exclusively uses the x86 architecture"],
    correctAnswer: "It integrates multiple components like CPU, GPU, and RAM onto a single chip",
    explanation: "An SoC integrates most or all components of a computer system onto a single integrated circuit, improving performance, power efficiency, and saving space."
  }],
  'rp2040': [{
    question: "The Raspberry Pi Pico's RP2040 microcontroller has a unique subsystem for creating custom hardware interfaces. What is it called?",
    options: ["Direct Memory Access (DMA)", "Programmable I/O (PIO)", "Analog-to-Digital Converter (ADC)", "Universal Asynchronous Receiver-Transmitter (UART)"],
    correctAnswer: "Programmable I/O (PIO)",
    explanation: "The PIO subsystem consists of small, programmable state machines that can be used to create custom I/O peripherals, offloading timing-critical tasks from the main CPU cores."
  }],
  'risc-v': [{
    question: "What is the most defining characteristic of the RISC-V instruction set architecture (ISA)?",
    options: ["It is exclusively for 64-bit processors", "It is a proprietary standard owned by a consortium", "It is an open standard, free to use for any purpose", "It is a CISC architecture"],
    correctAnswer: "It is an open standard, free to use for any purpose",
    explanation: "Unlike most ISAs, RISC-V is an open standard, meaning anyone can design, manufacture, and sell RISC-V chips and software without paying royalties."
  }],
  'esp32': [{
    question: "The ESP32 is a popular microcontroller for IoT projects primarily because it has built-in support for what?",
    options: ["USB 3.0 and Ethernet", "Wi-Fi and Bluetooth", "SATA and PCI Express", "An integrated GPU"],
    correctAnswer: "Wi-Fi and Bluetooth",
    explanation: "The ESP32's integrated Wi-Fi and Bluetooth connectivity on a low-cost chip makes it an extremely popular choice for Internet of Things (IoT) and smart home projects."
  }],
  'avr': [{
    question: "The AVR microcontrollers (like the ATmega328P in Arduinos) use what kind of memory architecture?",
    options: ["Von Neumann architecture", "Modified Harvard architecture", "Princeton architecture", "Cell architecture"],
    correctAnswer: "Modified Harvard architecture",
    explanation: "AVR uses a Modified Harvard architecture where program and data are stored in separate physical memory systems, but which allows program memory to be read as data under certain conditions."
  }],
  'default': [{
    question: "What does ALU stand for?",
    options: ["Arithmetic Logic Unit", "Advanced Logic Unit", "Algorithmic Local Unit", "Address Load Unit"],
    correctAnswer: "Arithmetic Logic Unit",
    explanation: "The ALU is a digital circuit inside the processor that performs arithmetic and bitwise logic operations on integer binary numbers."
  }]
};

export const ARCHITECTURE_DATA: { [key: string]: ArchitectureData } = {
  '8085': {
    overview: "The Intel 8085 is an 8-bit microprocessor with a Von Neumann architecture. It features a single bus for both data and instructions. Key components include an 8-bit Arithmetic Logic Unit (ALU), a set of general-purpose and special-function registers, and a control unit to manage operations.",
    components: [
      { id: "regs", name: "Registers", description: "General Purpose (B,C,D,E,H,L) and Accumulator (A)", position: { x: 50, y: 50 } },
      { id: "alu", name: "ALU (8-bit)", description: "Performs arithmetic and logical operations.", position: { x: 225, y: 150 } },
      { id: "cu", name: "Control Unit", description: "Decodes instructions and generates control signals.", position: { x: 50, y: 250 } },
      { id: "mem", name: "Memory/IO", description: "Interface to external memory and I/O devices via Address/Data Bus.", position: { x: 400, y: 150 } }
    ],
    connections: [
      { source: "regs", target: "alu", label: "Data Bus" },
      { source: "alu", target: "regs", label: "" },
      { source: "alu", target: "mem", label: "Data/Address Bus" },
      { source: "mem", target: "alu", label: "" },
      { source: "cu", target: "regs", label: "Control" },
      { source: "cu", target: "alu", label: "Control" },
      { source: "cu", target: "mem", label: "Control" }
    ]
  },
  'intel-8086': {
    overview: "The Intel 8086 is a 16-bit microprocessor that introduced the x86 architecture. It features a segmented memory model and a two-stage pipelined design, split into the Bus Interface Unit (BIU) and the Execution Unit (EU).",
    components: [
      { id: "eu_regs", name: "EU Registers", description: "General Registers (AX, BX, CX, DX) and Pointers/Indexes.", position: { x: 50, y: 50 } },
      { id: "alu", name: "ALU (16-bit)", description: "Performs 16-bit arithmetic and logic operations.", position: { x: 50, y: 150 } },
      { id: "biu_regs", name: "BIU Registers", description: "Segment Registers (CS, DS, SS, ES) and Instruction Pointer (IP).", position: { x: 250, y: 50 } },
      { id: "queue", name: "Instruction Queue", description: "6-byte prefetch queue for instructions.", position: { x: 250, y: 150 } },
      { id: "mem", name: "Memory Interface", description: "Connects to the system bus.", position: { x: 400, y: 100 } }
    ],
    connections: [
      { source: "eu_regs", target: "alu", label: "" },
      { source: "alu", target: "eu_regs", label: "" },
      { source: "queue", target: "alu", label: "Instructions" },
      { source: "biu_regs", target: "mem", label: "Address Bus" },
      { source: "queue", target: "mem", label: "Data Bus" }
    ]
  },
  'risc-v': {
    overview: "RISC-V is an open-standard Reduced Instruction Set Computer (RISC) ISA. This diagram shows a classic 5-stage pipeline structure, including Fetch, Decode, Execute (ALU), Memory Access, and Writeback stages.",
    components: [
      { id: "pc", name: "PC", description: "Program Counter", position: { x: 25, y: 150 } },
      { id: "imem", name: "Instruction Memory", description: "Fetches the instruction.", position: { x: 125, y: 50 } },
      { id: "decode", name: "Decode / Regs", description: "Decodes instruction and reads from the 32-register file.", position: { x: 125, y: 250 } },
      { id: "alu", name: "ALU", description: "Executes the operation.", position: { x: 275, y: 150 } },
      { id: "dmem", name: "Data Memory", description: "Accesses data memory for loads/stores.", position: { x: 425, y: 50 } },
      { id: "wb", name: "Writeback", description: "Writes result back to register file.", position: { x: 425, y: 250 } }
    ],
    connections: [
      { source: "pc", target: "imem", label: "Addr" },
      { source: "imem", target: "decode", label: "Instr" },
      { source: "decode", target: "alu", label: "Operands" },
      { source: "alu", target: "dmem", label: "Addr/Data" },
      { source: "dmem", target: "wb", label: "Data" },
      { source: "alu", target: "wb", label: "" }
    ]
  },
  'intel-4004': {
    overview: "The Intel 4004 is a 4-bit microprocessor. It required several support chips to make a functional system, including a ROM for programs and a RAM for data.",
    components: [
        { id: "cpu", name: "4004 CPU", description: "Central Processing Unit", position: { x: 200, y: 150 } },
        { id: "rom", name: "4001 ROM", description: "Program Memory", position: { x: 50, y: 50 } },
        { id: "ram", name: "4002 RAM", description: "Data Memory", position: { x: 350, y: 50 } },
        { id: "io", name: "I/O", description: "Shift Registers for I/O", position: { x: 200, y: 250 } }
    ],
    connections: [
        { source: "rom", target: "cpu", label: "Instructions" },
        { source: "ram", target: "cpu", label: "Data" },
        { source: "cpu", target: "io", label: "I/O Control" }
    ]
  },
  'intel-8008': {
    overview: "The Intel 8008 is an 8-bit microprocessor that multiplexed the address and data bus to save on pins. It was the predecessor to the highly successful 8080.",
    components: [
        { id: "regs", name: "Registers (8-bit)", description: "A, B, C, D, E, H, L", position: { x: 50, y: 150 } },
        { id: "alu", name: "ALU", description: "8-bit Arithmetic Logic Unit", position: { x: 200, y: 150 } },
        { id: "cu", name: "Control Unit", description: "Instruction Decoding and Control", position: { x: 200, y: 50 } },
        { id: "bus", name: "Bus Interface", description: "Multiplexed Address/Data Bus", position: { x: 350, y: 150 } }
    ],
    connections: [
        { source: "regs", target: "alu", label: "" },
        { source: "alu", target: "regs", label: "" },
        { source: "cu", target: "alu", label: "Control" },
        { source: "cu", target: "regs", label: "Control" },
        { source: "alu", target: "bus", label: "" },
        { source: "bus", target: "cu", label: "Instructions" }
    ]
  },
  'intel-8080': {
    overview: "The Intel 8080 is an 8-bit microprocessor that was a major improvement over the 8008, with a 16-bit address bus and a richer instruction set.",
    components: [
        { id: "regs", name: "Register File", description: "A, B, C, D, E, H, L, SP, PC", position: { x: 50, y: 150 } },
        { id: "alu", name: "ALU (8-bit)", description: "Arithmetic & Logic Unit", position: { x: 200, y: 150 } },
        { id: "cu", name: "Control & Timing", description: "Decodes instructions, manages bus", position: { x: 200, y: 50 } },
        { id: "bus", name: "Bus Controller", description: "16-bit Address, 8-bit Data", position: { x: 350, y: 150 } }
    ],
    connections: [
        { source: "regs", target: "alu", label: "Internal Bus" },
        { source: "alu", target: "regs", label: "" },
        { source: "regs", target: "bus", label: "Address" },
        { source: "alu", target: "bus", label: "Data" },
        { source: "cu", target: "bus", label: "Control" }
    ]
  },
    'mos-6502': {
    overview: "The MOS 6502 is an 8-bit microprocessor known for its simple design and powerful addressing modes. It has a minimal register set (A, X, Y) and was used in many popular home computers.",
    components: [
        { id: "regs", name: "Registers (A,X,Y)", description: "Accumulator, Index X, Index Y", position: { x: 50, y: 150 } },
        { id: "alu", name: "ALU (8-bit)", description: "Arithmetic Logic Unit", position: { x: 200, y: 150 } },
        { id: "cu", name: "Control Unit", description: "Instruction Decoder and Control Logic", position: { x: 200, y: 50 } },
        { id: "bus", name: "Bus Interface", description: "Connects to external memory/IO", position: { x: 350, y: 150 } }
    ],
    connections: [
        { source: "regs", target: "alu", label: "" },
        { source: "alu", target: "regs", label: "" },
        { source: "cu", target: "alu", label: "Control" },
        { source: "alu", target: "bus", label: "Data" },
        { source: "regs", target: "bus", label: "Address" }
    ]
  },
    'zilog-z80': {
    overview: "The Zilog Z80 is an 8-bit microprocessor that is a superset of the Intel 8080. It features a duplicate register set (AF', BC', DE', HL') and additional instructions.",
    components: [
        { id: "regs", name: "Register File", description: "Main (AF,BC,DE,HL) and Alt (AF',BC',DE',HL')", position: { x: 50, y: 100 } },
        { id: "ixy", name: "Index Regs (IX,IY)", description: "16-bit Index Registers", position: { x: 50, y: 200 } },
        { id: "alu", name: "ALU (8-bit)", description: "Arithmetic Logic Unit", position: { x: 225, y: 150 } },
        { id: "cu", name: "Control Unit", description: "Instruction decoding and control", position: { x: 225, y: 50 } },
        { id: "bus", name: "Bus Interface", description: "Connects to memory and I/O", position: { x: 400, y: 150 } }
    ],
    connections: [
        { source: "regs", target: "alu", label: "" },
        { source: "ixy", target: "alu", label: "" },
        { source: "alu", target: "regs", label: "" },
        { source: "alu", target: "bus", label: "Data" },
        { source: "cu", target: "alu", label: "Control" }
    ]
  },
   'intel-8088': {
    overview: "The Intel 8088 is a variant of the 8086 with an 8-bit external data bus, making it cheaper to implement. It maintains the 16-bit internal architecture and segmented memory model.",
    components: [
      { id: "eu", name: "Execution Unit (EU)", description: "ALU, General Registers", position: { x: 50, y: 150 } },
      { id: "biu", name: "Bus Interface Unit (BIU)", description: "Segment Regs, IP, 8-bit Data Bus", position: { x: 250, y: 150 } },
      { id: "queue", name: "Instruction Queue", description: "4-byte prefetch queue", position: { x: 150, y: 50 } },
      { id: "mem", name: "Memory/IO", description: "External System Bus", position: { x: 400, y: 150 } }
    ],
    connections: [
      { source: "biu", target: "queue", label: "Prefetch" },
      { source: "queue", target: "eu", label: "Instruction" },
      { source: "eu", target: "biu", label: "Memory Access Req" },
      { source: "biu", target: "mem", label: "Bus" }
    ]
  },
  'motorola-6800': {
    overview: "The Motorola 6800 is an 8-bit microprocessor featuring two accumulators (A and B), an index register, and a simple, powerful instruction set.",
    components: [
        { id: "regs", name: "Registers", description: "Accumulators (A, B), Index (IX), SP, PC", position: { x: 50, y: 150 } },
        { id: "alu", name: "ALU (8-bit)", description: "Arithmetic Logic Unit", position: { x: 225, y: 150 } },
        { id: "cu", name: "Control Logic", description: "Instruction Decoder", position: { x: 225, y: 50 } },
        { id: "bus", name: "Bus Interface", description: "Address and Data Bus", position: { x: 400, y: 150 } }
    ],
    connections: [
        { source: "regs", target: "alu", label: "" },
        { source: "alu", target: "regs", label: "" },
        { source: "cu", target: "alu", label: "Control" },
        { source: "alu", target: "bus", label: "Data" },
        { source: "regs", target: "bus", label: "Address" }
    ]
  },
  'motorola-68000': {
    overview: "The Motorola 68000 is a 16/32-bit processor with a clean, orthogonal instruction set, 32-bit data and address registers, but a 16-bit external data bus.",
    components: [
        { id: "d_regs", name: "Data Registers", description: "8x 32-bit (D0-D7)", position: { x: 50, y: 50 } },
        { id: "a_regs", name: "Address Registers", description: "8x 32-bit (A0-A7)", position: { x: 50, y: 250 } },
        { id: "alu", name: "ALU (16-bit)", description: "Arithmetic Logic Unit", position: { x: 225, y: 150 } },
        { id: "cu", name: "Microcode Control", description: "Instruction Decoder", position: { x: 225, y: 50 } },
        { id: "bus", name: "Bus Interface", description: "16-bit Data, 24-bit Address", position: { x: 400, y: 150 } }
    ],
    connections: [
        { source: "d_regs", target: "alu", label: "" },
        { source: "a_regs", target: "alu", label: "" },
        { source: "alu", target: "d_regs", label: "" },
        { source: "a_regs", target: "bus", label: "Address" },
        { source: "alu", target: "bus", label: "Data" }
    ]
  },
  'intel-80286': {
    overview: "The Intel 80286 introduced Protected Mode, enabling multitasking and memory protection. It featured an on-chip Memory Management Unit (MMU).",
    components: [
        { id: "eu", name: "Execution Unit", description: "ALU, Registers", position: { x: 250, y: 200 } },
        { id: "au", name: "Address Unit", description: "Calculates physical addresses, MMU", position: { x: 250, y: 100 } },
        { id: "bu", name: "Bus Unit", description: "Prefetches instructions", position: { x: 50, y: 150 } },
        { id: "iu", name: "Instruction Unit", description: "Decodes instructions", position: { x: 400, y: 150 } }
    ],
    connections: [
        { source: "bu", target: "iu", label: "Instruction Queue" },
        { source: "iu", target: "eu", label: "Decoded Instr" },
        { source: "eu", target: "au", label: "Address Req" },
        { source: "au", target: "bu", label: "Physical Addr" }
    ]
  },
    'intel-80386': {
    overview: "The Intel 80386 is a 32-bit microprocessor that introduced the IA-32 architecture. It features a 32-bit data and address bus and a more advanced MMU with paging.",
    components: [
        { id: "core", name: "Execution Core", description: "32-bit ALU, Registers", position: { x: 225, y: 200 } },
        { id: "mmu", name: "MMU & Paging Unit", description: "Memory Management and Paging", position: { x: 225, y: 100 } },
        { id: "prefetch", name: "Prefetch & Decode", description: "Instruction Fetch and Decode", position: { x: 50, y: 150 } },
        { id: "bus", name: "Bus Interface", description: "32-bit Address/Data Bus", position: { x: 400, y: 150 } }
    ],
    connections: [
        { source: "bus", target: "prefetch", label: "" },
        { source: "prefetch", target: "core", label: "Instruction" },
        { source: "core", target: "mmu", label: "Logical Addr" },
        { source: "mmu", target: "bus", label: "Physical Addr" }
    ]
  },
  'acorn-arm1': {
    overview: "The first ARM processor, the ARM1, was a simple 32-bit RISC design with a 3-stage pipeline, known for its low power consumption and elegant design.",
    components: [
        { id: "regs", name: "Register File", description: "32-bit Registers", position: { x: 125, y: 250 } },
        { id: "fetch", name: "Fetch", description: "Instruction Fetch", position: { x: 50, y: 100 } },
        { id: "decode", name: "Decode", description: "Instruction Decode", position: { x: 200, y: 100 } },
        { id: "execute", name: "Execute", description: "ALU & Shifter", position: { x: 350, y: 100 } }
    ],
    connections: [
        { source: "fetch", target: "decode", label: "" },
        { source: "decode", target: "execute", label: "" },
        { source: "decode", target: "regs", label: "Read" },
        { source: "execute", target: "regs", label: "Writeback" }
    ]
  },
    'mips-r2000': {
    overview: "The MIPS R2000 is a classic 32-bit RISC processor known for its clean 5-stage pipeline, which became a model for many subsequent RISC designs.",
    components: [
        { id: "if", name: "IF", description: "Instruction Fetch", position: { x: 25, y: 150 } },
        { id: "id", name: "ID", description: "Decode/Reg Read", position: { x: 125, y: 150 } },
        { id: "ex", name: "EX", description: "Execute (ALU)", position: { x: 225, y: 150 } },
        { id: "mem", name: "MEM", description: "Memory Access", position: { x: 325, y: 150 } },
        { id: "wb", name: "WB", description: "Writeback", position: { x: 425, y: 150 } }
    ],
    connections: [
        { source: "if", target: "id", label: "" },
        { source: "id", target: "ex", label: "" },
        { source: "ex", target: "mem", label: "" },
        { source: "mem", target: "wb", label: "" }
    ]
  },
  'motorola-68020': {
    overview: "The Motorola 68020 is a full 32-bit version of the 68000. It features a 32-bit data and address bus, a small on-chip instruction cache, and a three-stage pipeline.",
    components: [
        { id: "regs", name: "Registers (32-bit)", description: "Data and Address Registers", position: { x: 225, y: 250 } },
        { id: "cache", name: "Instruction Cache", description: "256-byte on-chip cache", position: { x: 50, y: 50 } },
        { id: "pipe", name: "3-Stage Pipeline", description: "Fetch, Decode, Execute", position: { x: 225, y: 150 } },
        { id: "bus", name: "Bus Controller", description: "32-bit Address/Data Bus", position: { x: 400, y: 150 } }
    ],
    connections: [
        { source: "bus", target: "cache", label: "" },
        { source: "cache", target: "pipe", label: "Instruction" },
        { source: "pipe", target: "regs", label: "Read" },
        { source: "pipe", target: "bus", label: "Memory Access" },
        { source: "pipe", target: "regs", label: "Write" }
    ]
  },
  'sparc': {
    overview: "The SPARC architecture is a RISC ISA known for its use of register windows. A large physical register file is managed to provide fast context switching for function calls.",
    components: [
        { id: "iunit", name: "Integer Unit", description: "ALU and Control", position: { x: 50, y: 150 } },
        { id: "fpu", name: "FPU", description: "Floating-Point Unit", position: { x: 225, y: 50 } },
        { id: "regwin", name: "Register Windows", description: "Large Register File", position: { x: 225, y: 250 } },
        { id: "bus", name: "Bus Interface", description: "Memory and I/O", position: { x: 400, y: 150 } }
    ],
    connections: [
        { source: "iunit", target: "regwin", label: "Read/Write" },
        { source: "iunit", target: "bus", label: "" },
        { source: "fpu", target: "bus", label: "" }
    ]
  },
  'intel-80486': {
    overview: "The Intel 80486 integrated a floating-point unit (FPU) and an 8KB L1 cache on-chip for the first time in the x86 line, significantly improving performance.",
    components: [
        { id: "core", name: "Integer Core", description: "Pipelined x86 Execution", position: { x: 50, y: 150 } },
        { id: "fpu", name: "FPU", description: "On-chip Floating Point Unit", position: { x: 225, y: 50 } },
        { id: "cache", name: "L1 Cache (8KB)", description: "Unified Instruction/Data Cache", position: { x: 225, y: 250 } },
        { id: "bus", name: "Bus Interface", description: "32-bit Bus", position: { x: 400, y: 150 } }
    ],
    connections: [
        { source: "core", target: "cache", label: "" },
        { source: "fpu", target: "cache", label: "" },
        { source: "cache", target: "bus", label: "" }
    ]
  },
    'dec-alpha-21064': {
    overview: "The DEC Alpha 21064 was a high-performance 64-bit RISC microprocessor. It was superscalar, capable of issuing two instructions per clock cycle.",
    components: [
        { id: "fetch", name: "Fetch/Decode", description: "Instruction Fetch & Decode", position: { x: 50, y: 150 } },
        { id: "int_pipe", name: "Integer Pipeline", description: "Integer Execution Unit", position: { x: 225, y: 50 } },
        { id: "fp_pipe", name: "FP Pipeline", description: "Floating-Point Unit", position: { x: 225, y: 250 } },
        { id: "mem", name: "Memory Interface", description: "Load/Store Unit & Caches", position: { x: 400, y: 150 } }
    ],
    connections: [
        { source: "fetch", target: "int_pipe", label: "" },
        { source: "fetch", target: "fp_pipe", label: "" },
        { source: "int_pipe", target: "mem", label: "" },
        { source: "fp_pipe", target: "mem", label: "" }
    ]
  },
  'intel-pentium': {
    overview: "The Intel Pentium was a superscalar x86 processor, featuring two integer pipelines (U and V pipes) allowing it to execute up to two instructions per clock cycle.",
    components: [
        { id: "fetch", name: "Fetch/Decode", description: "Instruction Fetch, Branch Prediction", position: { x: 50, y: 150 } },
        { id: "u_pipe", name: "U Pipe", description: "Primary Integer Pipeline", position: { x: 225, y: 50 } },
        { id: "v_pipe", name: "V Pipe", description: "Secondary (Simple) Integer Pipeline", position: { x: 225, y: 250 } },
        { id: "cache", name: "L1 Caches", description: "Split 8KB I-Cache & D-Cache", position: { x: 400, y: 150 } }
    ],
    connections: [
        { source: "fetch", target: "u_pipe", label: "Instruction" },
        { source: "fetch", target: "v_pipe", label: "Instruction" },
        { source: "u_pipe", target: "cache", label: "" },
        { source: "v_pipe", target: "cache", label: "" }
    ]
  },
  'powerpc-601': {
    overview: "The PowerPC 601 was a superscalar RISC processor, capable of issuing up to three instructions per cycle to its Integer, Floating-Point, and Branch Processing units.",
    components: [
        { id: "dispatch", name: "Dispatch Unit", description: "Fetches and dispatches instructions", position: { x: 50, y: 150 } },
        { id: "iu", name: "Integer Unit", description: "Integer ALU", position: { x: 225, y: 50 } },
        { id: "fpu", name: "FPU", description: "Floating-Point Unit", position: { x: 225, y: 150 } },
        { id: "bpu", name: "Branch Unit", description: "Branch Processing", position: { x: 225, y: 250 } },
        { id: "bus", name: "Bus Interface", description: "Memory and Cache Controller", position: { x: 400, y: 150 } }
    ],
    connections: [
        { source: "dispatch", target: "iu", label: "" },
        { source: "dispatch", target: "fpu", label: "" },
        { source: "dispatch", target: "bpu", label: "" },
        { source: "iu", target: "bus", label: "" }
    ]
  },
   'arm7tdmi': {
    overview: "The ARM7TDMI core features a classic 3-stage RISC pipeline (Fetch, Decode, Execute) and a decoder for the 16-bit Thumb instruction set for improved code density.",
    components: [
        { id: "fetch", name: "Fetch", description: "Instruction Fetch", position: { x: 50, y: 150 } },
        { id: "decode", name: "Decode", description: "ARM & Thumb Instruction Decode", position: { x: 225, y: 150 } },
        { id: "execute", name: "Execute", description: "Register Bank, Shifter, ALU", position: { x: 400, y: 150 } }
    ],
    connections: [
        { source: "fetch", target: "decode", label: "" },
        { source: "decode", target: "execute", label: "" },
        { source: "execute", target: "fetch", label: "PC update" }
    ]
  },
   'amd-athlon': {
    overview: "The AMD Athlon was a high-performance x86 processor that decoded complex x86 instructions into simpler, RISC-like micro-operations. It was the first processor to break the 1 GHz clock speed barrier.",
    components: [
        { id: "decode", name: "x86 Decode", description: "Decodes x86 to micro-ops", position: { x: 50, y: 150 } },
        { id: "scheduler", name: "Scheduler", description: "Schedules micro-ops", position: { x: 200, y: 150 } },
        { id: "integer", name: "Integer Units", description: "3 integer execution pipelines", position: { x: 350, y: 50 } },
        { id: "fpu", name: "FPU", description: "3 floating-point pipelines", position: { x: 350, y: 250 } },
        { id: "cache", name: "L1/L2 Cache", description: "Cache Subsystem", position: { x: 500, y: 150 } }
    ],
    connections: [
        { source: "decode", target: "scheduler", label: "uOps" },
        { source: "scheduler", target: "integer", label: "" },
        { source: "scheduler", target: "fpu", label: "" },
        { source: "integer", target: "cache", label: "" },
        { source: "fpu", target: "cache", label: "" }
    ]
  },
    'pic16f84a': {
    overview: "The PIC16F84A is an 8-bit microcontroller with a Harvard architecture, meaning it has separate memory spaces for program and data.",
    components: [
        { id: "prog_mem", name: "Flash Program Memory", description: "Stores the code", position: { x: 50, y: 50 } },
        { id: "data_mem", name: "SRAM Data Memory", description: "Stores variables", position: { x: 50, y: 250 } },
        { id: "cpu", name: "8-bit CPU Core", description: "ALU and W Register", position: { x: 250, y: 150 } },
        { id: "io", name: "I/O Ports", description: "PORTA, PORTB", position: { x: 450, y: 150 } }
    ],
    connections: [
        { source: "prog_mem", target: "cpu", label: "Instructions" },
        { source: "data_mem", target: "cpu", label: "Data" },
        { source: "cpu", target: "io", label: "Control" }
    ]
  },
  'intel-pentium-4': {
    overview: "The Pentium 4's NetBurst architecture featured a very deep instruction pipeline (20+ stages) designed to achieve very high clock speeds.",
    components: [
        { id: "frontend", name: "Front End", description: "Trace Cache, Branch Prediction", position: { x: 50, y: 150 } },
        { id: "scheduler", name: "Out-of-Order Scheduler", description: "Schedules micro-ops", position: { x: 200, y: 150 } },
        { id: "exec", name: "Execution Units", description: "Rapid ALUs, Slow ALUs", position: { x: 350, y: 150 } },
        { id: "mem", name: "Memory Subsystem", description: "L2 Cache, Bus Interface", position: { x: 500, y: 150 } }
    ],
    connections: [
        { source: "frontend", target: "scheduler", label: "" },
        { source: "scheduler", target: "exec", label: "" },
        { source: "exec", target: "mem", label: "" }
    ]
  },
  'arm11': {
    overview: "The ARM11 architecture features an 8-stage pipeline, allowing for higher clock speeds. It introduced features like out-of-order completion for some instructions.",
    components: [
        { id: "pipe_fetch", name: "Fetch", description: "Stages 1-2", position: { x: 25, y: 150 } },
        { id: "pipe_decode", name: "Decode", description: "Stages 3-4", position: { x: 125, y: 150 } },
        { id: "pipe_exec", name: "Execute", description: "Stages 5-6", position: { x: 225, y: 150 } },
        { id: "pipe_mem", name: "Memory", description: "Stage 7", position: { x: 325, y: 150 } },
        { id: "pipe_wb", name: "Writeback", description: "Stage 8", position: { x: 425, y: 150 } }
    ],
    connections: [
        { source: "pipe_fetch", target: "pipe_decode", label: "" },
        { source: "pipe_decode", target: "pipe_exec", label: "" },
        { source: "pipe_exec", target: "pipe_mem", label: "" },
        { source: "pipe_mem", target: "pipe_wb", label: "" }
    ]
  },
  'amd-athlon-64': {
    overview: "The Athlon 64 was the first consumer 64-bit processor. A key feature was its integrated on-die memory controller, which reduced memory latency.",
    components: [
        { id: "core", name: "x86-64 Core", description: "Execution Units", position: { x: 50, y: 150 } },
        { id: "cache", name: "L1/L2 Caches", description: "Cache hierarchy", position: { x: 225, y: 150 } },
        { id: "mem_ctrl", name: "Integrated Memory Controller", description: "Direct connection to DRAM", position: { x: 400, y: 50 } },
        { id: "ht", name: "HyperTransport", description: "I/O Link", position: { x: 400, y: 250 } }
    ],
    connections: [
        { source: "core", target: "cache", label: "" },
        { source: "cache", target: "mem_ctrl", label: "" },
        { source: "core", target: "ht", label: "" }
    ]
  },
    'intel-core-2-duo': {
    overview: "The Core 2 Duo is a dual-core processor based on the efficient Core microarchitecture. It features a shared L2 cache between the two cores.",
    components: [
        { id: "core0", name: "Core 0", description: "Execution Engine, L1 Cache", position: { x: 50, y: 50 } },
        { id: "core1", name: "Core 1", description: "Execution Engine, L1 Cache", position: { x: 50, y: 250 } },
        { id: "l2cache", name: "Shared L2 Cache", description: "Unified cache for both cores", position: { x: 250, y: 150 } },
        { id: "bus", name: "Front Side Bus Interface", description: "Connects to system memory", position: { x: 450, y: 150 } }
    ],
    connections: [
        { source: "core0", target: "l2cache", label: "" },
        { source: "core1", target: "l2cache", label: "" },
        { source: "l2cache", target: "bus", label: "" }
    ]
  },
  'cell-be': {
    overview: "The Cell processor is a heterogeneous multi-core architecture, featuring one general-purpose core (PPE) and eight specialized vector cores (SPEs).",
    components: [
        { id: "ppe", name: "PPE", description: "Power Processor Element (General Purpose)", position: { x: 50, y: 150 } },
        { id: "spe0", name: "SPE", description: "Synergistic Processing Element", position: { x: 250, y: 50 } },
        { id: "spe1", name: "SPE", description: "Synergistic Processing Element", position: { x: 250, y: 150 } },
        { id: "spe2", name: "SPE", description: "(...and 5 more)", position: { x: 250, y: 250 } },
        { id: "eib", name: "Element Interconnect Bus", description: "High-speed internal ring bus", position: { x: 450, y: 150 } }
    ],
    connections: [
        { source: "ppe", target: "eib", label: "" },
        { source: "spe0", target: "eib", label: "" },
        { source: "spe1", target: "eib", label: "" },
        { source: "spe2", target: "eib", label: "" }
    ]
  },
    'arm-cortex-a': {
    overview: "A modern ARM Cortex-A series processor is a superscalar, out-of-order design. It often features multiple cores and advanced vector processing units (NEON).",
    components: [
        { id: "frontend", name: "Frontend", description: "Fetch, Decode, Branch Prediction", position: { x: 50, y: 150 } },
        { id: "backend", name: "Out-of-Order Backend", description: "Scheduler, Execution Units", position: { x: 225, y: 150 } },
        { id: "neon", name: "NEON", description: "SIMD/Vector Processing Unit", position: { x: 225, y: 250 } },
        { id: "mem", name: "Memory System", description: "L1/L2 Caches, MMU", position: { x: 400, y: 150 } }
    ],
    connections: [
        { source: "frontend", target: "backend", label: "uOps" },
        { source: "backend", target: "mem", label: "" },
        { source: "backend", target: "neon", label: "" }
    ]
  },
  'intel-i5-2500k': {
    overview: "The Intel Sandy Bridge architecture, used in the i5-2500K, features four cores, a shared L3 cache, and an integrated graphics processor, all connected by a ring bus.",
    components: [
        { id: "core0", name: "Core 0", description: "CPU Core + L1/L2", position: { x: 50, y: 50 } },
        { id: "core1", name: "Core 1", description: "CPU Core + L1/L2", position: { x: 50, y: 250 } },
        { id: "gfx", name: "Processor Graphics", description: "Integrated GPU", position: { x: 250, y: 50 } },
        { id: "l3cache", name: "Shared L3 Cache", description: "Last Level Cache", position: { x: 250, y: 250 } },
        { id: "bus", name: "Ring Bus", description: "High-speed interconnect", position: { x: 450, y: 150 } }
    ],
    connections: [
        { source: "core0", target: "bus", label: "" },
        { source: "core1", target: "bus", label: "" },
        { source: "gfx", target: "bus", label: "" },
        { source: "l3cache", target: "bus", label: "" }
    ]
  },
  'google-tpu': {
    overview: "Google's TPU is an ASIC designed for machine learning. Its core is a large systolic array for performing matrix multiplications efficiently.",
    components: [
        { id: "host", name: "Host Interface", description: "Connects to host CPU", position: { x: 50, y: 150 } },
        { id: "systolic", name: "Systolic Array", description: "Matrix Multiply Unit (e.g., 256x256)", position: { x: 250, y: 150 } },
        { id: "mem", name: "On-Chip Memory", description: "High-bandwidth memory for weights/activations", position: { x: 450, y: 150 } }
    ],
    connections: [
        { source: "host", target: "systolic", label: "Instructions/Data" },
        { source: "mem", target: "systolic", label: "Weights/Activations" }
    ]
  },
    'amd-ryzen-7-1800x': {
    overview: "The AMD Zen architecture uses a modular design based on Core Complexes (CCX). An 1800X has two CCX modules, each with four cores, connected via Infinity Fabric.",
    components: [
        { id: "ccx0", name: "Core Complex 0", description: "4 Cores + Shared L3 Cache", position: { x: 50, y: 50 } },
        { id: "ccx1", name: "Core Complex 1", description: "4 Cores + Shared L3 Cache", position: { x: 50, y: 250 } },
        { id: "fabric", name: "Infinity Fabric", description: "High-speed interconnect", position: { x: 250, y: 150 } },
        { id: "io", name: "I/O and Memory Controller", description: "Connects to DRAM and PCIe", position: { x: 450, y: 150 } }
    ],
    connections: [
        { source: "ccx0", target: "fabric", label: "" },
        { source: "ccx1", target: "fabric", label: "" },
        { source: "fabric", target: "io", label: "" }
    ]
  },
  'apple-m1': {
    overview: "The Apple M1 is a complex System on a Chip (SoC) featuring high-performance 'Firestorm' cores and high-efficiency 'Icestorm' cores, along with a GPU and Neural Engine, all sharing a unified memory architecture.",
    components: [
        { id: "perf_cores", name: "Performance Cores", description: "High-power cores", position: { x: 50, y: 50 } },
        { id: "eff_cores", name: "Efficiency Cores", description: "Low-power cores", position: { x: 50, y: 250 } },
        { id: "gpu", name: "GPU", description: "Integrated Graphics", position: { x: 250, y: 50 } },
        { id: "npu", name: "Neural Engine", description: "AI/ML Accelerator", position: { x: 250, y: 250 } },
        { id: "mem", name: "Unified Memory", description: "Shared DRAM", position: { x: 450, y: 150 } }
    ],
    connections: [
        { source: "perf_cores", target: "mem", label: "" },
        { source: "eff_cores", target: "mem", label: "" },
        { source: "gpu", target: "mem", label: "" },
        { source: "npu", target: "mem", label: "" }
    ]
  },
    'rp2040': {
    overview: "The RP2040 microcontroller features two ARM Cortex-M0+ cores, a multi-bank SRAM, and a unique Programmable I/O (PIO) subsystem, all connected via a high-bandwidth bus fabric.",
    components: [
        { id: "core0", name: "Core 0", description: "ARM Cortex-M0+", position: { x: 50, y: 50 } },
        { id: "core1", name: "Core 1", description: "ARM Cortex-M0+", position: { x: 50, y: 250 } },
        { id: "sram", name: "SRAM", description: "On-chip memory", position: { x: 250, y: 50 } },
        { id: "pio", name: "PIO", description: "Programmable I/O", position: { x: 250, y: 250 } },
        { id: "bus", name: "Bus Fabric", description: "AHB-Lite Crossbar", position: { x: 450, y: 150 } }
    ],
    connections: [
        { source: "core0", target: "bus", label: "" },
        { source: "core1", target: "bus", label: "" },
        { source: "sram", target: "bus", label: "" },
        { source: "pio", target: "bus", label: "" }
    ]
  },
  'esp32': {
    overview: "The ESP32 is a powerful SoC with one or two Xtensa LX6 CPU cores, built-in Wi-Fi and Bluetooth, and a wide range of peripherals.",
    components: [
        { id: "cpu", name: "Xtensa LX6 CPU(s)", description: "Single or Dual Core", position: { x: 50, y: 150 } },
        { id: "radio", name: "Wi-Fi / BT Radio", description: "Wireless connectivity", position: { x: 250, y: 50 } },
        { id: "periph", name: "Peripherals", description: "GPIO, ADC, SPI, I2C, etc.", position: { x: 250, y: 250 } },
        { id: "mem", name: "Memory", description: "SRAM, ROM", position: { x: 450, y: 150 } }
    ],
    connections: [
        { source: "cpu", target: "mem", label: "" },
        { source: "cpu", target: "radio", label: "Control" },
        { source: "cpu", target: "periph", label: "Control" }
    ]
  },
  'avr': {
    overview: "AVR microcontrollers, like the ATmega328P, use a Modified Harvard architecture with an 8-bit RISC core. Program and data memory are separate, but it has instructions to access program memory.",
    components: [
        { id: "prog_mem", name: "Flash Program Memory", description: "Stores code", position: { x: 50, y: 50 } },
        { id: "data_mem", name: "SRAM/EEPROM Data", description: "Stores variables", position: { x: 50, y: 250 } },
        { id: "core", name: "AVR CPU Core", description: "ALU, 32 GPRs", position: { x: 250, y: 150 } },
        { id: "io", name: "Peripherals", description: "I/O Ports, Timers, ADC", position: { x: 450, y: 150 } }
    ],
    connections: [
        { source: "prog_mem", target: "core", label: "Instructions" },
        { source: "data_mem", target: "core", label: "Data" },
        { source: "core", target: "io", label: "" }
    ]
  }
};