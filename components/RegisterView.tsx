import React from 'react';
import { SimulationRegister } from '../types';

interface RegisterViewProps {
    registers: SimulationRegister[];
    readRegs?: string[];
    writeRegs?: string[];
}

const RegisterView: React.FC<RegisterViewProps> = ({ registers, readRegs = [], writeRegs = [] }) => {
    if (registers.length === 0) return <p className="text-gray-500">No register data.</p>;

    const readSet = new Set(readRegs);
    const writeSet = new Set(writeRegs);

    // Sort registers numerically for RISC-V, otherwise alphabetically.
    const sortedRegisters = [...registers].sort((a, b) => {
        const matchA = a.name.match(/\(X(\d+)\)/);
        const matchB = b.name.match(/\(X(\d+)\)/);
        if (matchA && matchB) {
            return parseInt(matchA[1], 10) - parseInt(matchB[1], 10);
        }
        return a.name.localeCompare(b.name);
    });

    // Create columns for a more stable and readable layout
    const numColumns = 2;
    const columns: SimulationRegister[][] = Array.from({ length: numColumns }, () => []);
    sortedRegisters.forEach((reg, index) => {
        columns[index % numColumns].push(reg);
    });

    return (
        <div>
            <h4 className="text-gray-400 font-semibold mb-2">Registers</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 text-xs">
                {columns.map((col, colIndex) => (
                    <div key={colIndex} className="space-y-1">
                        {col.map(({ name, value }) => {
                            const isWrite = writeSet.has(name);
                            const isRead = readSet.has(name);
                            
                            let highlightClass = '';
                            if (isWrite) {
                                highlightClass = 'bg-yellow-600/30'; // Write takes precedence
                            } else if (isRead) {
                                highlightClass = 'bg-blue-600/30';
                            }

                            const isRiscV = name.includes('(X');
                            const displayName = isRiscV ? name.replace(/\((.*)\)/, ' ($1)') : name;
                            
                            return (
                                <div key={name} className={`flex justify-between items-baseline p-1 rounded transition-colors duration-300 ${highlightClass}`}>
                                    <span className="font-bold text-gray-300 truncate" title={name}>{displayName}</span>
                                    <span className="font-mono text-yellow-400">{value}</span>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RegisterView;
