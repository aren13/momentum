import React, { useState } from 'react';
import PropTypes from 'prop-types';

function KanbanCard({ task }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('taskId', task.id);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    // Could open a modal or detail view
    console.log('Task clicked:', task);
  };

  return (
    <div
      className={`kanban-card ${isDragging ? 'dragging' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
    >
      <div className="card-header">
        <h4 className="card-title">{task.title}</h4>
      </div>

      <div className="card-body">
        {task.description && (
          <p className="card-description">{task.description}</p>
        )}
      </div>

      <div className="card-footer">
        {task.phase && (
          <span className="card-badge phase-badge">
            Phase {task.phase}
          </span>
        )}
        {task.phaseName && (
          <span className="card-meta">{task.phaseName}</span>
        )}
      </div>
    </div>
  );
}

KanbanCard.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    phase: PropTypes.string,
    phaseName: PropTypes.string,
    status: PropTypes.string.isRequired,
    description: PropTypes.string
  }).isRequired
};

export default KanbanCard;
