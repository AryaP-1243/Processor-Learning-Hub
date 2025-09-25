import React, { useState, useEffect } from 'react';
import { Processor, ProjectIdea } from '../types';
import * as geminiService from '../services/geminiService';
import { LightBulbIcon } from './Icons';

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center space-x-2 py-8">
        <div className="w-4 h-4 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-4 h-4 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-4 h-4 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        <span className="text-gray-300">AI is brainstorming projects...</span>
    </div>
);

const ProjectCard: React.FC<{ project: ProjectIdea }> = ({ project }) => {
    const difficultyColor = {
        'Beginner': 'text-green-400 bg-green-900/50',
        'Intermediate': 'text-yellow-400 bg-yellow-900/50',
        'Advanced': 'text-red-400 bg-red-900/50',
    }[project.difficulty] || 'text-gray-400 bg-gray-700';
    
    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col h-full">
            <h3 className="text-xl font-bold text-white mb-2">{project.title}</h3>
            <p className="text-gray-400 text-sm mb-4 flex-grow">{project.description}</p>
            <div className="mt-auto">
                <p className="mb-3">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${difficultyColor}`}>
                        {project.difficulty}
                    </span>
                </p>
                <h4 className="font-semibold text-gray-300 mb-2">Components:</h4>
                <div className="flex flex-wrap gap-2">
                    {project.components.map((comp, i) => (
                        <span key={i} className="px-2 py-1 text-xs bg-gray-700 rounded font-mono">{comp}</span>
                    ))}
                </div>
            </div>
        </div>
    );
};


const ProjectsView: React.FC<{ processor: Processor }> = ({ processor }) => {
    const [projects, setProjects] = useState<ProjectIdea[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProjects = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const responseString = await geminiService.getProjectIdeas(processor);
                const data = JSON.parse(responseString);
                if (data.error) {
                    setError(data.error);
                } else if (data.projects && Array.isArray(data.projects)) {
                    setProjects(data.projects);
                } else {
                     setError("AI returned an unexpected data format.");
                }
            } catch (e) {
                setError("Failed to fetch or parse project ideas.");
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjects();
    }, [processor]);

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return <p className="text-center text-red-400">Error: {error}</p>;
    }
    
    if (projects.length === 0) {
        return <p className="text-center text-gray-500">No project ideas could be generated for this processor.</p>;
    }

    return (
        <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-6">
            {projects.map((project, i) => (
                <ProjectCard key={i} project={project} />
            ))}
        </div>
    );
};

export default ProjectsView;
