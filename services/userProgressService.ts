
import { UserProgress } from '../types';

const getProgressKey = (username: string) => `processor-hub-progress-${username}`;

export const getProgressForUser = (username: string): UserProgress => {
    try {
        const progressJson = localStorage.getItem(getProgressKey(username));
        return progressJson ? JSON.parse(progressJson) : {};
    } catch (e) {
        console.error("Failed to parse user progress from localStorage", e);
        return {};
    }
};

export const saveProgressForUser = (username: string, progress: UserProgress): void => {
    try {
        localStorage.setItem(getProgressKey(username), JSON.stringify(progress));
    } catch (e) {
        console.error("Failed to save user progress to localStorage", e);
    }
};

export const updateModuleCompletion = (username: string, processorId: string, moduleId: string): void => {
    const progress = getProgressForUser(username);
    if (!progress[processorId]) {
        progress[processorId] = { completedModules: [], savedCode: '' };
    }
    const completed = new Set(progress[processorId].completedModules);
    completed.add(moduleId);
    progress[processorId].completedModules = Array.from(completed);
    saveProgressForUser(username, progress);
};

export const updateSavedCode = (username: string, processorId: string, code: string): void => {
    const progress = getProgressForUser(username);
    if (!progress[processorId]) {
        progress[processorId] = { completedModules: [], savedCode: code };
    } else {
        progress[processorId].savedCode = code;
    }
    saveProgressForUser(username, progress);
};
