

import React, { useState, useCallback } from 'react';
import { Processor } from './types';
import { PROCESSORS } from './constants';
import Header from './components/Header';
// FIX: ProcessorSelector is not a default export, so it should be imported using curly braces. This seems to be an error in the provided error message, as the component should be a default export. I will assume the user wants it to be a default export and will fix ProcessorSelector.tsx instead. The import here is correct under that assumption.
import ProcessorSelector from './components/ProcessorSelector';
import LearningHub from './components/LearningHub';
import ProcessorComparison from './components/ProcessorComparison';
import Timeline from './components/Timeline';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import { SpinnerIcon } from './components/Icons';
import Glossary from './components/Glossary';


type View = 'selector' | 'hub' | 'comparison' | 'timeline' | 'glossary';

const App: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const [currentView, setCurrentView] = useState<View>('selector');
  const [selectedProcessor, setSelectedProcessor] = useState<Processor | null>(null);

  const handleProcessorSelect = useCallback((processor: Processor) => {
    setSelectedProcessor(processor);
    setCurrentView('hub');
  }, []);

  const handleNavigate = useCallback((view: View) => {
    if (view === 'hub' && !selectedProcessor) {
        setCurrentView('selector');
    } else {
        setCurrentView(view);
    }
  }, [selectedProcessor]);

  const handleLogout = useCallback(() => {
    logout();
    setCurrentView('selector');
    setSelectedProcessor(null);
  }, [logout]);
  
  const renderContent = () => {
    switch (currentView) {
      case 'hub':
        return selectedProcessor && <LearningHub processor={selectedProcessor} onBack={() => setCurrentView('selector')} />;
      case 'comparison':
        return <ProcessorComparison allProcessors={PROCESSORS} />;
      case 'timeline':
        return <Timeline processors={PROCESSORS} onSelectProcessor={handleProcessorSelect} />;
      case 'glossary':
        return <Glossary />;
      case 'selector':
      default:
        return <ProcessorSelector processors={PROCESSORS} onSelect={handleProcessorSelect} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <SpinnerIcon className="w-12 h-12 text-blue-400 animate-spin" />
      </div>
    );
  }
  
  return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
        <Header 
          user={user}
          onLogout={handleLogout}
          currentView={currentView} 
          onNavigate={handleNavigate} 
          onHomeClick={() => handleNavigate('selector')}
        />
        <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
          {user ? renderContent() : <Login />}
        </main>
      </div>
  );
};

export default App;