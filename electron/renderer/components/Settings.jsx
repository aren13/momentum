import React, { useState } from 'react';

function Settings({ projectPath, onPathChange }) {
  const [newPath, setNewPath] = useState(projectPath);

  const updateProjectPath = async () => {
    try {
      const result = await window.momentum.setProjectPath(newPath);
      if (result.success) {
        onPathChange(newPath);
        alert('Project path updated successfully');
      } else {
        alert('Failed to update project path: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to update project path:', error);
      alert('Failed to update project path: ' + error.message);
    }
  };

  return (
    <div className="view settings-view">
      <header className="view-header">
        <h2>Settings</h2>
      </header>
      <div className="view-content">
        <div className="card">
          <h3>Project Configuration</h3>
          <div className="setting-item">
            <label className="setting-label">Project Path</label>
            <div className="setting-control">
              <input
                type="text"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                className="input"
                placeholder="/path/to/project"
              />
              <button className="btn btn-primary" onClick={updateProjectPath}>
                Update
              </button>
            </div>
            <p className="setting-help">Current project directory</p>
          </div>
        </div>

        <div className="card">
          <h3>Application</h3>
          <div className="setting-item">
            <label className="setting-label">Version</label>
            <p className="setting-value">1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
