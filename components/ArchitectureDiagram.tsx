import React, { useState, useEffect } from 'react';
import { Processor, ArchitectureData, ArchitectureComponent, ArchitectureConnection } from '../types';
import { ARCHITECTURE_DATA } from '../constants';
import MarkdownRenderer from './MarkdownRenderer';

interface ArchitectureDiagramProps {
    processor: Processor;
    highlightedComponents?: string[];
    highlightedConnections?: { source: string, target: string }[];
}


const ArchitectureDiagram: React.FC<ArchitectureDiagramProps> = ({ processor, highlightedComponents = [], highlightedConnections = [] }) => {
    const [data, setData] = useState<ArchitectureData | null>(null);

    useEffect(() => {
        const hardcodedData = ARCHITECTURE_DATA[processor.id];
        if (hardcodedData) {
            setData(hardcodedData);
        } else {
            setData(null); // No data available
        }
    }, [processor]);

    if (!data) {
        return (
             <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
                <p className="text-gray-400">Architecture diagram for {processor.name} is not available.</p>
            </div>
        )
    }
    
    const components: ArchitectureComponent[] = Array.isArray(data.components) ? data.components : [];
    const connections: ArchitectureConnection[] = Array.isArray(data.connections) ? data.connections : [];
    const componentMap = new Map(components.filter(c => c && c.id).map(c => [c.id, c]));
    
    const isConnectionHighlighted = (conn: ArchitectureConnection) => {
        return highlightedConnections.some(hc => (hc.source === conn.source && hc.target === conn.target) || (hc.source === conn.target && hc.target === conn.source));
    }

    return (
        <div className={'animate-fade-in h-full'}>
             {data.overview && <MarkdownRenderer content={data.overview} />}
            
            {components.length > 0 && (
                 <div className="mt-4 p-1 bg-gray-900 rounded-lg border border-gray-700 not-prose h-full">
                    <svg width="100%" height="100%" viewBox="0 0 550 350">
                        <defs>
                            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto" fill="#60a5fa">
                                <polygon points="0 0, 10 3.5, 0 7" />
                            </marker>
                             <marker id="arrowhead-highlight" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto" fill="#f87171">
                                <polygon points="0 0, 10 3.5, 0 7" />
                            </marker>
                        </defs>
                        
                        {connections.map((conn, i) => {
                            const sourceComp = componentMap.get(conn.source);
                            const targetComp = componentMap.get(conn.target);
                            if (!sourceComp || !targetComp || !sourceComp.position || !targetComp.position) return null;
                            
                            const isHighlighted = isConnectionHighlighted(conn);

                            const x1 = sourceComp.position.x + 50, y1 = sourceComp.position.y + 25;
                            const x2 = targetComp.position.x + 50, y2 = targetComp.position.y + 25;
                            const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;

                            return (
                                <g key={i}>
                                    <line 
                                        x1={x1} y1={y1} x2={x2} y2={y2} 
                                        stroke={isHighlighted ? '#f87171' : '#60a5fa'}
                                        strokeWidth={isHighlighted ? 3 : 2} 
                                        markerEnd={isHighlighted ? "url(#arrowhead-highlight)" : "url(#arrowhead)"}
                                        className={isHighlighted ? 'animate-pulse' : ''}
                                        style={{ transition: 'stroke 0.3s ease' }}
                                    />
                                    {conn.label && <text x={midX} y={midY - 5} fill={isHighlighted ? '#fca5a5' : '#a5b4fc'} fontSize="10" textAnchor="middle">{conn.label}</text>}
                                </g>
                            );
                        })}

                        {components.map(comp => {
                            if (!comp || !comp.position) return null;
                            const isHighlighted = highlightedComponents.includes(comp.id);
                            return (
                                <g key={comp.id} transform={`translate(${comp.position.x}, ${comp.position.y})`}>
                                    <rect width="100" height="50" rx="5" 
                                          fill={isHighlighted ? '#991b1b' : '#1f2937'} 
                                          stroke={isHighlighted ? '#ef4444' : '#4b5563'} 
                                          strokeWidth="2" 
                                          className={isHighlighted ? 'animate-pulse' : ''}
                                          style={{ transition: 'fill 0.3s ease, stroke 0.3s ease' }}/>
                                    <text x="50" y="25" textAnchor="middle" dominantBaseline="middle" fill="#e5e7eb" fontWeight="bold" fontSize="12">{comp.name}</text>
                                    <title>{comp.description}</title>
                                </g>
                            );
                        })}
                    </svg>
                </div>
            )}
        </div>
    );
};

export default ArchitectureDiagram;
