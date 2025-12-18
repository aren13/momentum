import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import TerminalTabs from './TerminalTabs';
import TerminalWindow from './TerminalWindow';
import './terminal.css';

function TerminalPanel() {
  const [terminals, setTerminals] = useState([]);
  const [activeTerminalId, setActiveTerminalId] = useState(null);
  const maxTerminals = 12;

  useEffect(() => {
    // Subscribe to agent:start events to create new terminals
    const handleAgentStart = (event, agentData) => {
      const { agentId, agentName } = agentData;

      if (terminals.length >= maxTerminals) {
        console.warn(`Maximum terminals (${maxTerminals}) reached`);
        return;
      }

      // Create new terminal for this agent
      setTerminals(prev => {
        // Check if terminal already exists
        if (prev.some(t => t.id === agentId)) {
          return prev;
        }

        const newTerminal = {
          id: agentId,
          name: agentName || `Agent ${agentId}`,
          output: [],
          status: 'running',
          startTime: new Date()
        };

        return [...prev, newTerminal];
      });

      // Set as active if it's the first terminal
      setActiveTerminalId(prev => prev === null ? agentId : prev);
    };

    // Subscribe to agent:end events to update terminal status
    const handleAgentEnd = (event, agentData) => {
      const { agentId, success } = agentData;

      setTerminals(prev => prev.map(t =>
        t.id === agentId
          ? { ...t, status: success ? 'completed' : 'error', endTime: new Date() }
          : t
      ));
    };

    // Subscribe to agent:output events to update terminal output
    const handleAgentOutput = (event, outputData) => {
      const { agentId, output } = outputData;

      setTerminals(prev => prev.map(t =>
        t.id === agentId
          ? { ...t, output: [...t.output, { text: output, timestamp: new Date() }] }
          : t
      ));
    };

    // Register event listeners if available
    if (window.momentum && window.momentum.on) {
      window.momentum.on('agent:start', handleAgentStart);
      window.momentum.on('agent:end', handleAgentEnd);
      window.momentum.on('agent:output', handleAgentOutput);
    }

    // Cleanup
    return () => {
      if (window.momentum && window.momentum.off) {
        window.momentum.off('agent:start', handleAgentStart);
        window.momentum.off('agent:end', handleAgentEnd);
        window.momentum.off('agent:output', handleAgentOutput);
      }
    };
  }, [terminals.length]);

  const handleTabSwitch = (terminalId) => {
    setActiveTerminalId(terminalId);
  };

  const handleTabClose = (terminalId) => {
    setTerminals(prev => {
      const filtered = prev.filter(t => t.id !== terminalId);

      // If closing active terminal, switch to another
      if (terminalId === activeTerminalId) {
        const newActive = filtered.length > 0 ? filtered[0].id : null;
        setActiveTerminalId(newActive);
      }

      return filtered;
    });
  };

  const handleClearTerminal = (terminalId) => {
    setTerminals(prev => prev.map(t =>
      t.id === terminalId ? { ...t, output: [] } : t
    ));
  };

  const activeTerminal = terminals.find(t => t.id === activeTerminalId);

  if (terminals.length === 0) {
    return (
      <div className="view terminal-view">
        <header className="view-header">
          <h2>Agent Terminals</h2>
        </header>
        <div className="view-content">
          <div className="terminal-empty-state">
            <p>No active agent terminals</p>
            <p className="terminal-empty-hint">
              Terminals will appear automatically when agents start executing
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="view terminal-view">
      <header className="view-header">
        <h2>Agent Terminals</h2>
        <span className="terminal-count">
          {terminals.length} / {maxTerminals}
        </span>
      </header>

      <TerminalTabs
        terminals={terminals}
        activeTerminalId={activeTerminalId}
        onTabSwitch={handleTabSwitch}
        onTabClose={handleTabClose}
      />

      <div className="view-content terminal-content">
        {activeTerminal && (
          <TerminalWindow
            terminal={activeTerminal}
            onClear={() => handleClearTerminal(activeTerminal.id)}
          />
        )}
      </div>
    </div>
  );
}

export default TerminalPanel;
