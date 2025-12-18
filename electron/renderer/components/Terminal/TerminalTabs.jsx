import React from 'react';
import PropTypes from 'prop-types';

function TerminalTabs({ terminals, activeTerminalId, onTabSwitch, onTabClose }) {

  const getStatusClass = (status) => {
    switch (status) {
      case 'running': return 'tab-status-running';
      case 'completed': return 'tab-status-completed';
      case 'error': return 'tab-status-error';
      default: return 'tab-status-idle';
    }
  };

  const getStatusIndicator = (status) => {
    switch (status) {
      case 'running': return '●';
      case 'completed': return '✓';
      case 'error': return '✕';
      default: return '○';
    }
  };

  const handleTabClick = (terminalId, event) => {
    // Prevent click if clicking close button
    if (event.target.classList.contains('tab-close')) {
      return;
    }
    onTabSwitch(terminalId);
  };

  const handleCloseClick = (terminalId, event) => {
    event.stopPropagation();
    onTabClose(terminalId);
  };

  return (
    <div className="terminal-tabs">
      <div className="tabs-container">
        {terminals.map((terminal) => (
          <div
            key={terminal.id}
            className={`terminal-tab ${activeTerminalId === terminal.id ? 'active' : ''}`}
            onClick={(e) => handleTabClick(terminal.id, e)}
          >
            <span className={`tab-status-indicator ${getStatusClass(terminal.status)}`}>
              {getStatusIndicator(terminal.status)}
            </span>
            <span className="tab-name">{terminal.name}</span>
            <button
              className="tab-close"
              onClick={(e) => handleCloseClick(terminal.id, e)}
              title="Close terminal"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

TerminalTabs.propTypes = {
  terminals: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      status: PropTypes.oneOf(['running', 'idle', 'completed', 'error']).isRequired
    })
  ).isRequired,
  activeTerminalId: PropTypes.string,
  onTabSwitch: PropTypes.func.isRequired,
  onTabClose: PropTypes.func.isRequired
};

export default TerminalTabs;
