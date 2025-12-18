import React, { useState } from 'react';
import PropTypes from 'prop-types';

function ContextTree({ files, selectedFile, onFileSelect }) {
  const [expandedDirs, setExpandedDirs] = useState(new Set());

  const toggleDirectory = (path) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return '🟢';
      case 'in-context': return '🔵';
      case 'excluded': return '⚪';
      default: return '⚫';
    }
  };

  const getStatusClass = (status) => {
    return `status-${status}`;
  };

  const getFileIcon = (type, name) => {
    if (type === 'directory') return '📁';
    if (name.endsWith('.js') || name.endsWith('.jsx')) return '📄';
    if (name.endsWith('.json')) return '📋';
    if (name.endsWith('.md')) return '📝';
    if (name.endsWith('.css')) return '🎨';
    return '📄';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderFile = (file, depth = 0) => {
    const isDirectory = file.type === 'directory';
    const isExpanded = expandedDirs.has(file.path);
    const isSelected = selectedFile && selectedFile.path === file.path;

    return (
      <div key={file.path} className="tree-item-container">
        <div
          className={`tree-item ${isSelected ? 'selected' : ''} ${getStatusClass(file.status)}`}
          style={{ paddingLeft: `${depth * 20 + 10}px` }}
          onClick={() => {
            if (isDirectory) {
              toggleDirectory(file.path);
            }
            onFileSelect(file);
          }}
        >
          <span className="tree-item-icon">
            {isDirectory && (
              <span className="tree-expand-icon">
                {isExpanded ? '▼' : '▶'}
              </span>
            )}
            {getFileIcon(file.type, file.name)}
          </span>

          <span className="tree-item-name">{file.name}</span>

          <span className="tree-item-status">
            {getStatusIcon(file.status)}
          </span>

          {file.type === 'file' && (
            <span className="tree-item-meta">
              {formatFileSize(file.size)}
            </span>
          )}
        </div>

        {isDirectory && isExpanded && file.children && (
          <div className="tree-item-children">
            {file.children.map(child => renderFile(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="context-tree">
      <div className="tree-header">
        <h3>File Tree</h3>
        <div className="tree-legend">
          <span className="legend-item">
            🟢 Active
          </span>
          <span className="legend-item">
            🔵 In Context
          </span>
          <span className="legend-item">
            ⚪ Excluded
          </span>
        </div>
      </div>
      <div className="tree-content">
        {files.length === 0 ? (
          <div className="tree-empty">No files in context</div>
        ) : (
          files.map(file => renderFile(file))
        )}
      </div>
    </div>
  );
}

ContextTree.propTypes = {
  files: PropTypes.arrayOf(
    PropTypes.shape({
      path: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['file', 'directory']).isRequired,
      status: PropTypes.oneOf(['active', 'in-context', 'excluded']).isRequired,
      tokens: PropTypes.number,
      size: PropTypes.number,
      children: PropTypes.array
    })
  ).isRequired,
  selectedFile: PropTypes.object,
  onFileSelect: PropTypes.func.isRequired
};

export default ContextTree;
