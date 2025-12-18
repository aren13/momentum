import React from 'react';

function Sidebar({ currentView, onNavigate }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'roadmap', label: 'Roadmap', icon: '🗺️' },
    { id: 'kanban', label: 'Kanban', icon: '📌' },
    { id: 'plans', label: 'Plans', icon: '📋' },
    { id: 'agents', label: 'Agents', icon: '🤖' },
    { id: 'terminal', label: 'Terminal', icon: '💻' },
    { id: 'context', label: 'Context', icon: '🔍' },
    { id: 'worktrees', label: 'Worktrees', icon: '🌳' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="app-title">Momentum</h1>
        <p className="app-subtitle">Project Management</p>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
