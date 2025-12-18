import React, { useState, useEffect } from 'react';
import ContextTree from './ContextTree';
import ContextDetails from './ContextDetails';
import TokenCounter from './TokenCounter';
import './context.css';

function ContextInspector() {
  const [contextData, setContextData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadContext();

    // Subscribe to context change events
    const handleContextChange = () => {
      loadContext();
    };

    if (window.momentum && window.momentum.on) {
      window.momentum.on('context:changed', handleContextChange);
    }

    return () => {
      if (window.momentum && window.momentum.off) {
        window.momentum.off('context:changed', handleContextChange);
      }
    };
  }, []);

  const loadContext = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call IPC to get context data
      const result = await window.momentum.getContext();

      if (result.success) {
        const parsed = parseContextData(result.output);
        setContextData(parsed);
      } else {
        setError(result.error || 'Failed to load context');
      }
    } catch (err) {
      setError(err.message);
      console.error('Failed to load context:', err);
    } finally {
      setLoading(false);
    }
  };

  const parseContextData = (output) => {
    // Parse context output from CLI
    // This is a mock parser - adjust based on actual CLI output format
    return {
      files: [
        {
          path: '/Users/ae/Projects/pm/momentum/bin/cli.js',
          name: 'cli.js',
          type: 'file',
          status: 'active',
          tokens: 450,
          size: 12500,
          lastModified: new Date('2025-12-18'),
          reason: 'Main entry point'
        },
        {
          path: '/Users/ae/Projects/pm/momentum/lib',
          name: 'lib',
          type: 'directory',
          status: 'in-context',
          children: [
            {
              path: '/Users/ae/Projects/pm/momentum/lib/commands.js',
              name: 'commands.js',
              type: 'file',
              status: 'in-context',
              tokens: 680,
              size: 18200,
              lastModified: new Date('2025-12-17'),
              reason: 'Command definitions'
            }
          ]
        }
      ],
      totalTokens: 1130,
      tokenLimit: 200000,
      activeFiles: 1,
      totalFiles: 2
    };
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
  };

  const handleRefresh = () => {
    loadContext();
  };

  const handleAddToContext = async (filePath) => {
    try {
      const result = await window.momentum.addToContext({ filePath });
      if (result.success) {
        loadContext();
      }
    } catch (err) {
      console.error('Failed to add file to context:', err);
    }
  };

  const handleRemoveFromContext = async (filePath) => {
    try {
      const result = await window.momentum.removeFromContext({ filePath });
      if (result.success) {
        loadContext();
      }
    } catch (err) {
      console.error('Failed to remove file from context:', err);
    }
  };

  if (loading) {
    return (
      <div className="view context-view">
        <div className="view-content">
          <div className="loading-state">Loading context...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="view context-view">
        <div className="view-content">
          <div className="error-state">
            <p>Error: {error}</p>
            <button className="btn btn-primary" onClick={loadContext}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="view context-view">
      <header className="view-header">
        <h2>Context Inspector</h2>
        <div className="context-stats">
          <span className="stat-item">
            {contextData.activeFiles} active
          </span>
          <span className="stat-item">
            {contextData.totalFiles} total
          </span>
          <span className="stat-item">
            {contextData.totalTokens.toLocaleString()} tokens
          </span>
        </div>
        <button className="btn btn-secondary" onClick={handleRefresh}>
          Refresh
        </button>
      </header>

      <div className="view-content context-content">
        <div className="context-layout">
          <div className="context-panel context-tree-panel">
            <ContextTree
              files={contextData.files}
              selectedFile={selectedFile}
              onFileSelect={handleFileSelect}
            />
          </div>

          <div className="context-panel context-details-panel">
            <ContextDetails
              file={selectedFile}
              onAddToContext={handleAddToContext}
              onRemoveFromContext={handleRemoveFromContext}
            />
          </div>

          <div className="context-panel context-token-panel">
            <TokenCounter
              totalTokens={contextData.totalTokens}
              tokenLimit={contextData.tokenLimit}
              files={contextData.files}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContextInspector;
