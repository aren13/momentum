import React, { useState } from 'react';
import PropTypes from 'prop-types';
import KanbanCard from './KanbanCard';

function KanbanColumn({ id, title, status, tasks, onDrop }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onDrop(taskId, status);
    }
  };

  const isEmpty = tasks.length === 0;

  return (
    <div
      className={`kanban-column ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="column-header">
        <h3 className="column-title">{title}</h3>
        <span className="column-count">{tasks.length}</span>
      </div>

      <div className="column-content">
        {isEmpty ? (
          <div className="empty-state">
            <p>No tasks</p>
          </div>
        ) : (
          tasks.map(task => (
            <KanbanCard
              key={task.id}
              task={task}
            />
          ))
        )}
      </div>
    </div>
  );
}

KanbanColumn.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired,
  tasks: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      phase: PropTypes.string,
      phaseName: PropTypes.string,
      status: PropTypes.string.isRequired,
      description: PropTypes.string
    })
  ).isRequired,
  onDrop: PropTypes.func.isRequired
};

export default KanbanColumn;
