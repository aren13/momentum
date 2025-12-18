import React, { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import TerminalOutput from './TerminalOutput';

function TerminalWindow({ terminal, onClear }) {
  const scrollContainerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [terminal.output, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    setAutoScroll(isAtBottom);
  };

  const handleCopy = () => {
    const text = terminal.output.map(o => o.text).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      console.log('Terminal output copied to clipboard');
    });
  };

  const getStatusClass = () => {
    switch (terminal.status) {
      case 'running': return 'status-running';
      case 'completed': return 'status-completed';
      case 'error': return 'status-error';
      default: return 'status-idle';
    }
  };

  const getStatusIcon = () => {
    switch (terminal.status) {
      case 'running': return '●';
      case 'completed': return '✓';
      case 'error': return '✕';
      default: return '○';
    }
  };

  const filteredOutput = searchTerm
    ? terminal.output.filter(o => o.text.toLowerCase().includes(searchTerm.toLowerCase()))
    : terminal.output;

  const lineCount = filteredOutput.length;
  const maxLines = 10000;
  const displayOutput = lineCount > maxLines
    ? filteredOutput.slice(-maxLines)
    : filteredOutput;

  return (
    <div className="terminal-window">
      <div className="terminal-header">
        <div className="terminal-info">
          <span className={`terminal-status ${getStatusClass()}`}>
            {getStatusIcon()} {terminal.status}
          </span>
          <span className="terminal-name">{terminal.name}</span>
          <span className="terminal-lines">{lineCount} lines</span>
        </div>

        <div className="terminal-actions">
          <input
            type="text"
            placeholder="Search output..."
            className="terminal-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            Copy
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={onClear}
            title="Clear terminal"
          >
            Clear
          </button>
          <button
            className={`btn btn-sm ${autoScroll ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setAutoScroll(!autoScroll)}
            title="Toggle auto-scroll"
          >
            {autoScroll ? '⬇ Auto' : '⬇ Manual'}
          </button>
        </div>
      </div>

      <div
        className="terminal-scroll-container"
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        <div className="terminal-output-container">
          {displayOutput.length === 0 ? (
            <div className="terminal-empty">
              {searchTerm ? 'No matching output' : 'No output yet...'}
            </div>
          ) : (
            displayOutput.map((outputLine, index) => (
              <TerminalOutput
                key={`${terminal.id}-${index}`}
                text={outputLine.text}
                timestamp={outputLine.timestamp}
              />
            ))
          )}
        </div>
      </div>

      {lineCount > maxLines && (
        <div className="terminal-footer">
          <span className="terminal-warning">
            ⚠ Showing last {maxLines} of {lineCount} lines
          </span>
        </div>
      )}
    </div>
  );
}

TerminalWindow.propTypes = {
  terminal: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    output: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string.isRequired,
        timestamp: PropTypes.instanceOf(Date)
      })
    ).isRequired,
    status: PropTypes.oneOf(['running', 'idle', 'completed', 'error']).isRequired,
    startTime: PropTypes.instanceOf(Date),
    endTime: PropTypes.instanceOf(Date)
  }).isRequired,
  onClear: PropTypes.func.isRequired
};

export default TerminalWindow;
