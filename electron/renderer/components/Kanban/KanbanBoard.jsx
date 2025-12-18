import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import KanbanColumn from './KanbanColumn';
import KanbanFilters from './KanbanFilters';
import './kanban.css';

function KanbanBoard() {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    phase: 'all',
    search: ''
  });

  // Column definitions
  const columns = [
    { id: 'planning', title: 'Planning', status: 'pending' },
    { id: 'in-progress', title: 'In Progress', status: 'in_progress' },
    { id: 'done', title: 'Done', status: 'completed' }
  ];

  // Load tasks from roadmap on mount
  useEffect(() => {
    loadTasks();

    // Set up listener for roadmap changes (real-time sync)
    const handleRoadmapChange = () => {
      loadTasks();
    };

    // Subscribe to roadmap changes if available
    if (window.momentum && window.momentum.on) {
      window.momentum.on('roadmap:changed', handleRoadmapChange);
    }

    return () => {
      if (window.momentum && window.momentum.off) {
        window.momentum.off('roadmap:changed', handleRoadmapChange);
      }
    };
  }, []);

  // Apply filters when tasks or filters change
  useEffect(() => {
    applyFilters();
  }, [tasks, filters]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await window.momentum.roadmap();

      if (result.success) {
        // Parse roadmap output to extract tasks
        const parsedTasks = parseRoadmapData(result.output);
        setTasks(parsedTasks);
      } else {
        setError(result.error || 'Failed to load roadmap');
      }
    } catch (err) {
      setError(err.message);
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const parseRoadmapData = (roadmapOutput) => {
    // Parse roadmap text output to extract tasks
    // This is a simple parser - adjust based on actual roadmap format
    const tasks = [];
    const lines = roadmapOutput.split('\n');

    let currentPhase = null;
    let taskId = 0;

    lines.forEach((line) => {
      // Detect phase headers (e.g., "Phase 01: Project Setup")
      const phaseMatch = line.match(/Phase (\d+):\s*(.+)/i);
      if (phaseMatch) {
        currentPhase = {
          number: phaseMatch[1],
          name: phaseMatch[2].trim()
        };
        return;
      }

      // Detect tasks/plans (e.g., "- [x] Plan 01-01: Setup")
      const taskMatch = line.match(/[-*]\s*\[([x\s])\]\s*(.+)/i);
      if (taskMatch && currentPhase) {
        const isCompleted = taskMatch[1].toLowerCase() === 'x';
        const taskText = taskMatch[2].trim();

        tasks.push({
          id: `task-${taskId++}`,
          title: taskText,
          phase: currentPhase.number,
          phaseName: currentPhase.name,
          status: isCompleted ? 'completed' : 'pending',
          description: `Phase ${currentPhase.number}: ${currentPhase.name}`
        });
      }
    });

    return tasks;
  };

  const applyFilters = () => {
    let filtered = [...tasks];

    // Filter by phase
    if (filters.phase !== 'all') {
      filtered = filtered.filter(task => task.phase === filters.phase);
    }

    // Filter by search term
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower)
      );
    }

    setFilteredTasks(filtered);
  };

  const handleDrop = async (taskId, newStatus) => {
    try {
      // Optimistically update UI
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );

      // Update status via IPC
      const result = await window.momentum.updateTaskStatus({
        taskId,
        status: newStatus
      });

      if (!result.success) {
        // Revert on failure
        setError('Failed to update task status');
        loadTasks(); // Reload to get correct state
      }
    } catch (err) {
      console.error('Failed to update task:', err);
      setError(err.message);
      loadTasks(); // Reload to get correct state
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const getTasksForColumn = (columnStatus) => {
    return filteredTasks.filter(task => task.status === columnStatus);
  };

  if (loading) {
    return (
      <div className="view kanban-view">
        <div className="view-content">
          <div className="loading-state">Loading tasks...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="view kanban-view">
        <div className="view-content">
          <div className="error-state">
            <p>Error: {error}</p>
            <button className="btn btn-primary" onClick={loadTasks}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="view kanban-view">
      <header className="view-header">
        <h2>Kanban Board</h2>
        <button className="btn btn-secondary" onClick={loadTasks}>
          Refresh
        </button>
      </header>

      <KanbanFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        phases={[...new Set(tasks.map(t => t.phase))]}
      />

      <div className="view-content">
        <div className="kanban-board">
          {columns.map(column => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              status={column.status}
              tasks={getTasksForColumn(column.status)}
              onDrop={handleDrop}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default KanbanBoard;
