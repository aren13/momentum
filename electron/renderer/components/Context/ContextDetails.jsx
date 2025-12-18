import React from 'react';
import PropTypes from 'prop-types';

function ContextDetails({ file, onAddToContext, onRemoveFromContext }) {

  if (!file) {
    return (
      <div className="context-details">
        <div className="details-empty">
          Select a file to view details
        </div>
      </div>
    );
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      'active': { label: 'Active', class: 'badge-active' },
      'in-context': { label: 'In Context', class: 'badge-in-context' },
      'excluded': { label: 'Excluded', class: 'badge-excluded' }
    };
    return badges[status] || { label: status, class: 'badge-default' };
  };

  const badge = getStatusBadge(file.status);
  const isInContext = file.status === 'active' || file.status === 'in-context';

  return (
    <div className="context-details">
      <div className="details-header">
        <h3>File Details</h3>
      </div>

      <div className="details-content">
        <div className="detail-section">
          <div className="detail-row">
            <span className="detail-label">Name:</span>
            <span className="detail-value">{file.name}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Path:</span>
            <span className="detail-value detail-path">{file.path}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Type:</span>
            <span className="detail-value">{file.type}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Status:</span>
            <span className={`detail-badge ${badge.class}`}>
              {badge.label}
            </span>
          </div>
        </div>

        {file.type === 'file' && (
          <>
            <div className="detail-section">
              <h4 className="section-title">Metrics</h4>

              <div className="detail-row">
                <span className="detail-label">Token Count:</span>
                <span className="detail-value detail-tokens">
                  {file.tokens ? file.tokens.toLocaleString() : 'N/A'}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">File Size:</span>
                <span className="detail-value">
                  {formatFileSize(file.size)}
                </span>
              </div>

              {file.lastModified && (
                <div className="detail-row">
                  <span className="detail-label">Last Modified:</span>
                  <span className="detail-value">
                    {formatDate(file.lastModified)}
                  </span>
                </div>
              )}
            </div>

            {file.reason && (
              <div className="detail-section">
                <h4 className="section-title">Why in Context?</h4>
                <p className="detail-reason">{file.reason}</p>
              </div>
            )}

            <div className="detail-section">
              <h4 className="section-title">Preview</h4>
              <div className="detail-preview">
                <code className="preview-code">
                  {file.preview || 'No preview available'}
                </code>
              </div>
            </div>
          </>
        )}

        <div className="detail-actions">
          {isInContext ? (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onRemoveFromContext(file.path)}
            >
              Remove from Context
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onAddToContext(file.path)}
            >
              Add to Context
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

ContextDetails.propTypes = {
  file: PropTypes.shape({
    path: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['file', 'directory']).isRequired,
    status: PropTypes.oneOf(['active', 'in-context', 'excluded']).isRequired,
    tokens: PropTypes.number,
    size: PropTypes.number,
    lastModified: PropTypes.instanceOf(Date),
    reason: PropTypes.string,
    preview: PropTypes.string
  }),
  onAddToContext: PropTypes.func.isRequired,
  onRemoveFromContext: PropTypes.func.isRequired
};

export default ContextDetails;
