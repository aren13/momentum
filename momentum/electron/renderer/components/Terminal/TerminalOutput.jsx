import React from 'react';
import PropTypes from 'prop-types';

/**
 * TerminalOutput - Renders a single line of terminal output with ANSI color support
 *
 * This is a simple ANSI parser. For production use, consider using a library like:
 * - ansi-to-react
 * - ansi-to-html
 * - xterm.js (full terminal emulation)
 */
function TerminalOutput({ text, timestamp }) {

  // Simple ANSI color code parser
  const parseAnsiColors = (text) => {
    // ANSI color code regex: \x1b[XXm or \033[XXm
    const ansiRegex = /\x1b\[(\d+)m/g;

    const parts = [];
    let lastIndex = 0;
    let currentStyle = {};

    text.replace(ansiRegex, (match, code, index) => {
      // Add text before this code
      if (index > lastIndex) {
        parts.push({
          text: text.substring(lastIndex, index),
          style: { ...currentStyle }
        });
      }

      // Update style based on code
      const codeNum = parseInt(code, 10);
      currentStyle = updateStyle(currentStyle, codeNum);

      lastIndex = index + match.length;
      return match;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        text: text.substring(lastIndex),
        style: { ...currentStyle }
      });
    }

    return parts.length > 0 ? parts : [{ text, style: {} }];
  };

  const updateStyle = (currentStyle, code) => {
    const newStyle = { ...currentStyle };

    // Reset
    if (code === 0) {
      return {};
    }

    // Bold
    if (code === 1) {
      newStyle.fontWeight = 'bold';
    }

    // Foreground colors
    if (code === 30) newStyle.color = '#000000'; // Black
    if (code === 31) newStyle.color = '#e06c75'; // Red
    if (code === 32) newStyle.color = '#98c379'; // Green
    if (code === 33) newStyle.color = '#e5c07b'; // Yellow
    if (code === 34) newStyle.color = '#61afef'; // Blue
    if (code === 35) newStyle.color = '#c678dd'; // Magenta
    if (code === 36) newStyle.color = '#56b6c2'; // Cyan
    if (code === 37) newStyle.color = '#abb2bf'; // White

    // Bright foreground colors
    if (code === 90) newStyle.color = '#5c6370'; // Bright Black (Gray)
    if (code === 91) newStyle.color = '#e06c75'; // Bright Red
    if (code === 92) newStyle.color = '#98c379'; // Bright Green
    if (code === 93) newStyle.color = '#e5c07b'; // Bright Yellow
    if (code === 94) newStyle.color = '#61afef'; // Bright Blue
    if (code === 95) newStyle.color = '#c678dd'; // Bright Magenta
    if (code === 96) newStyle.color = '#56b6c2'; // Bright Cyan
    if (code === 97) newStyle.color = '#ffffff'; // Bright White

    return newStyle;
  };

  const makeLinksClickable = (text) => {
    // Simple URL regex
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = [];
    let lastIndex = 0;

    text.replace(urlRegex, (match, url, index) => {
      // Add text before URL
      if (index > lastIndex) {
        parts.push({ type: 'text', content: text.substring(lastIndex, index) });
      }

      // Add URL as link
      parts.push({ type: 'link', content: url });

      lastIndex = index + match.length;
      return match;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.substring(lastIndex) });
    }

    return parts.length > 0 ? parts : [{ type: 'text', content: text }];
  };

  const renderStyledText = (text, style) => {
    const linkParts = makeLinksClickable(text);

    return linkParts.map((part, index) => {
      if (part.type === 'link') {
        return (
          <a
            key={index}
            href={part.content}
            target="_blank"
            rel="noopener noreferrer"
            className="terminal-link"
            style={style}
          >
            {part.content}
          </a>
        );
      }
      return <span key={index} style={style}>{part.content}</span>;
    });
  };

  const parts = parseAnsiColors(text);

  return (
    <div className="terminal-line">
      {timestamp && (
        <span className="terminal-timestamp">
          {timestamp.toLocaleTimeString()}
        </span>
      )}
      <span className="terminal-text">
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {renderStyledText(part.text, part.style)}
          </React.Fragment>
        ))}
      </span>
    </div>
  );
}

TerminalOutput.propTypes = {
  text: PropTypes.string.isRequired,
  timestamp: PropTypes.instanceOf(Date)
};

export default TerminalOutput;
