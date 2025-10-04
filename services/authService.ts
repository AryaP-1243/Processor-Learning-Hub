
import { User } from '../types';

const USERS_KEY = 'processor-hub-users';
const CURRENT_USER_KEY = 'processor-hub-current-user';

// NOTE: In a real application, passwords should be securely hashed and salted.
// Storing passwords in plaintext is insecure. This is for demonstration purposes only.

const getUsers = (): { [username: string]: string } => {
    try {
        const users = localStorage.getItem(USERS_KEY);
        return users ? JSON.parse(users) : {};
    } catch (e) {
        console.error("Failed to parse users from localStorage", e);
        return {};
    }
};

const saveUsers = (users: { [username: string]: string }) => {
    try {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch(e) {
        console.error("Failed to save users to localStorage", e);
    }
};

export const register = (username: string, password: string): Promise<User> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => { // Simulate network delay
            const users = getUsers();
            if (users[username]) {
                return reject(new Error('Username already exists.'));
            }
            if (!username || username.length < 3) {
                return reject(new Error('Username must be at least 3 characters long.'));
            }
             if (!password || password.length < 6) {
                return reject(new Error('Password must be at least 6 characters long.'));
            }

            users[username] = password;
            saveUsers(users);
            const user: User = { username };
            sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
            resolve(user);
        }, 500);
    });
};


export const login = (username: string, password: string): Promise<User> => {
     return new Promise((resolve, reject) => {
        setTimeout(() => { // Simulate network delay
            const users = getUsers();
            if (users[username] && users[username] === password) {
                const user: User = { username };
                sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
                resolve(user);
            } else {
                reject(new Error('Invalid username or password.'));
            }
        }, 500);
    });
};

export const logout = (): void => {
    sessionStorage.removeItem(CURRENT_USER_KEY);
};


export const getCurrentUser = (): User | null => {
    try {
        const user = sessionStorage.getItem(CURRENT_USER_KEY);
        return user ? JSON.parse(user) : null;
    } catch (e) {
        console.error("Failed to parse current user from sessionStorage", e);
        return null;
    }
};

export const autoLoginDev = (): User => {
    const devUser: User = { username: 'dev-user' };
    sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(devUser));
    return devUser;
};