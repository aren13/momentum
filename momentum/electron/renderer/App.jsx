import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Roadmap from './components/Roadmap';
import Plans from './components/Plans';
import Agents from './components/Agents';
import Worktrees from './components/Worktrees';
import Settings from './components/Settings';
import KanbanBoard from './components/Kanban/KanbanBoard';
import TerminalPanel from './components/Terminal/TerminalPanel';
import ContextInspector from './components/Context/ContextInspector';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [projectPath, setProjectPath] = useState('');
  const [projectStatus, setProjectStatus] = useState(null);

  // Load project information on mount
  useEffect(() => {
    loadProjectInfo();
  }, []);

  const loadProjectInfo = async () => {
    try {
      const pathResult = await window.momentum.getProjectPath();
      if (pathResult.success) {
        setProjectPath(pathResult.output);
      }

      const statusResult = await window.momentum.status();
      if (statusResult.success) {
        setProjectStatus(statusResult.output);
      }
    } catch (error) {
      console.error('Failed to load project info:', error);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard projectStatus={projectStatus} onRefresh={loadProjectInfo} />;
      case 'roadmap':
        return <Roadmap />;
      case 'kanban':
        return <KanbanBoard />;
      case 'plans':
        return <Plans />;
      case 'agents':
        return <Agents />;
      case 'terminal':
        return <TerminalPanel />;
      case 'context':
        return <ContextInspector />;
      case 'worktrees':
        return <Worktrees />;
      case 'settings':
        return <Settings projectPath={projectPath} onPathChange={setProjectPath} />;
      default:
        return <Dashboard projectStatus={projectStatus} onRefresh={loadProjectInfo} />;
    }
  };

  return (
    <div className="app">
      <Sidebar currentView={currentView} onNavigate={setCurrentView} />
      <main className="main-content">
        {renderView()}
      </main>
    </div>
  );
}

export default App;
