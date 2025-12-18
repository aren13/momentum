import React from 'react';
import PropTypes from 'prop-types';

function TokenCounter({ totalTokens, tokenLimit, files }) {

  const usagePercentage = (totalTokens / tokenLimit) * 100;
  const remainingTokens = tokenLimit - totalTokens;

  const getUsageClass = () => {
    if (usagePercentage >= 90) return 'usage-critical';
    if (usagePercentage >= 75) return 'usage-warning';
    if (usagePercentage >= 50) return 'usage-moderate';
    return 'usage-low';
  };

  const getUsageColor = () => {
    if (usagePercentage >= 90) return '#f48771';
    if (usagePercentage >= 75) return '#dcdcaa';
    if (usagePercentage >= 50) return '#4ec9b0';
    return '#6a9955';
  };

  // Get top 5 files by token count
  const flattenFiles = (fileList) => {
    const result = [];
    fileList.forEach(file => {
      if (file.type === 'file') {
        result.push(file);
      }
      if (file.children) {
        result.push(...flattenFiles(file.children));
      }
    });
    return result;
  };

  const allFiles = flattenFiles(files);
  const topFiles = allFiles
    .filter(f => f.tokens > 0)
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 5);

  return (
    <div className="token-counter">
      <div className="counter-header">
        <h3>Token Usage</h3>
      </div>

      <div className="counter-content">
        <div className="usage-summary">
          <div className="usage-stats">
            <div className="stat-large">
              <div className="stat-value">
                {totalTokens.toLocaleString()}
              </div>
              <div className="stat-label">Tokens Used</div>
            </div>
            <div className="stat-large">
              <div className="stat-value">
                {remainingTokens.toLocaleString()}
              </div>
              <div className="stat-label">Remaining</div>
            </div>
          </div>

          <div className="usage-bar-container">
            <div className="usage-bar">
              <div
                className={`usage-fill ${getUsageClass()}`}
                style={{
                  width: `${Math.min(usagePercentage, 100)}%`,
                  backgroundColor: getUsageColor()
                }}
              />
            </div>
            <div className="usage-percentage">
              {usagePercentage.toFixed(1)}% of {tokenLimit.toLocaleString()} token limit
            </div>
          </div>

          {usagePercentage >= 75 && (
            <div className="usage-warning-box">
              ⚠️ Context usage is high. Consider removing unnecessary files.
            </div>
          )}
        </div>

        <div className="top-files-section">
          <h4 className="section-title">Top Files by Tokens</h4>
          {topFiles.length === 0 ? (
            <div className="empty-message">No files with token counts</div>
          ) : (
            <div className="top-files-list">
              {topFiles.map((file, index) => {
                const filePercentage = (file.tokens / totalTokens) * 100;
                return (
                  <div key={file.path} className="top-file-item">
                    <div className="top-file-rank">#{index + 1}</div>
                    <div className="top-file-info">
                      <div className="top-file-name">{file.name}</div>
                      <div className="top-file-bar">
                        <div
                          className="top-file-fill"
                          style={{ width: `${filePercentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="top-file-tokens">
                      {file.tokens.toLocaleString()}
                      <span className="top-file-percentage">
                        {filePercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="context-health">
          <h4 className="section-title">Context Health</h4>
          <div className="health-indicators">
            <div className={`health-indicator ${usagePercentage < 75 ? 'health-good' : 'health-bad'}`}>
              <span className="health-icon">{usagePercentage < 75 ? '✓' : '✕'}</span>
              <span className="health-text">Token usage under 75%</span>
            </div>
            <div className={`health-indicator ${allFiles.length < 100 ? 'health-good' : 'health-bad'}`}>
              <span className="health-icon">{allFiles.length < 100 ? '✓' : '✕'}</span>
              <span className="health-text">File count under 100</span>
            </div>
            <div className="health-indicator health-good">
              <span className="health-icon">✓</span>
              <span className="health-text">Context data loaded</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

TokenCounter.propTypes = {
  totalTokens: PropTypes.number.isRequired,
  tokenLimit: PropTypes.number.isRequired,
  files: PropTypes.arrayOf(
    PropTypes.shape({
      path: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['file', 'directory']).isRequired,
      tokens: PropTypes.number,
      children: PropTypes.array
    })
  ).isRequired
};

export default TokenCounter;
