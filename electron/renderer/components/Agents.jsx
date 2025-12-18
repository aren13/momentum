import React, { useState } from 'react';

function Agents() {
  const [agents, setAgents] = useState([]);

  const resumeAgent = async (agentId) => {
    try {
      const result = await window.momentum.resume(agentId);
      if (result.success) {
        alert('Agent resumed successfully');
      } else {
        alert('Failed to resume agent: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to resume agent:', error);
      alert('Failed to resume agent: ' + error.message);
    }
  };

  return (
    <div className="view agents-view">
      <header className="view-header">
        <h2>Agents</h2>
        <button className="btn btn-primary">New Discussion</button>
      </header>
      <div className="view-content">
        <div className="empty-state">
          <p>No active agents</p>
          <p className="help-text">Agents will appear here when executing plans or discussions</p>
        </div>
      </div>
    </div>
  );
}

export default Agents;
