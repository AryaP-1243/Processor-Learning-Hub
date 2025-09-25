
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { UserProgress } from '../types';
import * as userProgressService from '../services/userProgressService';
import { useAuth } from './AuthContext';

interface UserProgressContextType {
  progress: UserProgress;
  markModuleAsCompleted: (processorId: string, moduleId: string) => void;
  saveCodeForProcessor: (processorId: string, code: string) => void;
  getSavedCode: (processorId: string) => string | undefined;
  getCompletedModules: (processorId: string) => string[];
}

const UserProgressContext = createContext<UserProgressContextType | undefined>(undefined);

export const UserProgressProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [progress, setProgress] = useState<UserProgress>({});

    useEffect(() => {
        if (user) {
            const userProgress = userProgressService.getProgressForUser(user.username);
            setProgress(userProgress);
        } else {
            setProgress({}); // Clear progress on logout
        }
    }, [user]);

    const markModuleAsCompleted = useCallback((processorId: string, moduleId: string) => {
        if (!user) return;
        setProgress(currentProgress => {
            const processorProgress = currentProgress[processorId] || { completedModules: [], savedCode: '' };
            const completed = new Set(processorProgress.completedModules);
            completed.add(moduleId);
            const newProgress = {
                ...currentProgress,
                [processorId]: { ...processorProgress, completedModules: Array.from(completed) }
            };
            userProgressService.saveProgressForUser(user.username, newProgress);
            return newProgress;
        });
    }, [user]);

    const saveCodeForProcessor = useCallback((processorId: string, code: string) => {
        if (!user) return;
        // We don't need to update the react state for this, just persist it.
        userProgressService.updateSavedCode(user.username, processorId, code);
    }, [user]);

    const getSavedCode = useCallback((processorId: string): string | undefined => {
        return progress[processorId]?.savedCode;
    }, [progress]);
    
    const getCompletedModules = useCallback((processorId: string): string[] => {
        return progress[processorId]?.completedModules || [];
    }, [progress]);

    const value = { progress, markModuleAsCompleted, saveCodeForProcessor, getSavedCode, getCompletedModules };

    return (
        <UserProgressContext.Provider value={value}>
            {children}
        </UserProgressContext.Provider>
    );
};

export const useUserProgress = (): UserProgressContextType => {
    const context = useContext(UserProgressContext);
    if (context === undefined) {
        throw new Error('useUserProgress must be used within a UserProgressProvider');
    }
    return context;
};
