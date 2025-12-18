import React, { useState } from 'react';

function Worktrees() {
  const [worktrees, setWorktrees] = useState([]);
  const [newWorktreeName, setNewWorktreeName] = useState('');

  const createWorktree = async () => {
    if (!newWorktreeName.trim()) {
      alert('Please enter a worktree name');
      return;
    }

    try {
      const result = await window.momentum.worktree('create', newWorktreeName);
      if (result.success) {
        alert('Worktree created successfully');
        setNewWorktreeName('');
      } else {
        alert('Failed to create worktree: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to create worktree:', error);
      alert('Failed to create worktree: ' + error.message);
    }
  };

  return (
    <div className="view worktrees-view">
      <header className="view-header">
        <h2>Worktrees</h2>
        <div className="header-actions">
          <input
            type="text"
            placeholder="Worktree name..."
            value={newWorktreeName}
            onChange={(e) => setNewWorktreeName(e.target.value)}
            className="input"
          />
          <button className="btn btn-primary" onClick={createWorktree}>
            Create Worktree
          </button>
        </div>
      </header>
      <div className="view-content">
        <div className="empty-state">
          <p>No worktrees available</p>
          <p className="help-text">Worktrees allow parallel development in isolated environments</p>
        </div>
      </div>
    </div>
  );
}

export default Worktrees;
