import React from 'react';

function Dashboard({ projectStatus, onRefresh }) {
  return (
    <div className="view dashboard-view">
      <header className="view-header">
        <h2>Dashboard</h2>
        <button className="btn btn-primary" onClick={onRefresh}>
          Refresh
        </button>
      </header>
      <div className="view-content">
        <div className="card">
          <h3>Project Status</h3>
          {projectStatus ? (
            <pre className="status-output">{projectStatus}</pre>
          ) : (
            <p>Loading project status...</p>
          )}
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Active Agents</div>
            <div className="stat-value">0</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending Plans</div>
            <div className="stat-value">0</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Worktrees</div>
            <div className="stat-value">0</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Completion</div>
            <div className="stat-value">0%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
