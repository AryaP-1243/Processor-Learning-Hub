
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CpuIcon, SpinnerIcon, AlertCircleIcon } from './Icons';

const Login: React.FC = () => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { login, register } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            if (isLoginView) {
                await login(username, password);
            } else {
                await register(username, password);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const toggleView = () => {
        setIsLoginView(!isLoginView);
        setError(null);
        setUsername('');
        setPassword('');
    }

    return (
        <div className="min-h-full flex flex-col items-center justify-center animate-fade-in pt-12">
            <div className="max-w-md w-full mx-auto">
                <div className="flex justify-center items-center gap-3 mb-6">
                    <CpuIcon className="h-10 w-10 text-blue-400" />
                    <h2 className="text-3xl font-bold text-center text-white">Processor Learning Hub</h2>
                </div>
                <div className="bg-gray-800 border border-gray-700 shadow-xl rounded-lg p-8 space-y-6">
                    <h3 className="text-2xl font-semibold text-center text-gray-200">{isLoginView ? "Sign In" : "Create Account"}</h3>
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="username" className="text-sm font-medium text-gray-400 block mb-2">Username</label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter your username"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="text-sm font-medium text-gray-400 block mb-2">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete={isLoginView ? "current-password" : "new-password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="••••••••"
                            />
                        </div>
                        
                        {error && (
                            <div className="flex items-center text-red-400 bg-red-900/50 p-3 rounded-md text-sm border border-red-800">
                                <AlertCircleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-500 disabled:cursor-wait"
                            >
                                {isLoading ? <SpinnerIcon className="animate-spin w-5 h-5"/> : (isLoginView ? "Sign In" : "Sign Up")}
                            </button>
                        </div>
                    </form>
                     <div className="text-center text-sm">
                        <button onClick={toggleView} className="font-medium text-blue-400 hover:text-blue-300">
                           {isLoginView ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;