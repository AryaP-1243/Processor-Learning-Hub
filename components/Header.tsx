
import React from 'react';
import { CpuIcon, LogOutIcon } from './Icons';
import { User } from '../types';


interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  currentView: 'selector' | 'hub' | 'comparison' | 'timeline' | 'glossary';
  onNavigate: (view: 'selector' | 'hub' | 'comparison' | 'timeline' | 'glossary') => void;
  onHomeClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, currentView, onNavigate, onHomeClick }) => {
  const NavLink: React.FC<{ view: 'selector' | 'hub' | 'comparison' | 'timeline' | 'glossary', text: string }> = ({ view, text }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => onNavigate(view)}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`}
      >
        {text}
      </button>
    );
  };

  return (
    <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button onClick={onHomeClick} className="flex-shrink-0 flex items-center gap-2 text-white">
              <CpuIcon className="h-8 w-8 text-blue-400" />
              <span className="font-bold text-xl">Processor Hub</span>
            </button>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <div className="hidden md:flex items-center space-x-2">
                <NavLink view="selector" text="Learn" />
                <NavLink view="timeline" text="Timeline" />
                <NavLink view="comparison" text="Compare" />
                <NavLink view="glossary" text="Glossary" />
              </div>
            )}
             <div className="flex items-center space-x-3">
              {user ? (
                <>
                  <span className="text-sm text-gray-300 hidden sm:block">Welcome, {user.username}</span>
                  <button onClick={onLogout} title="Logout" className="p-2 rounded-full hover:bg-gray-700">
                    <LogOutIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;