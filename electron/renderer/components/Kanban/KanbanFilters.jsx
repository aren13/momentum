import React from 'react';
import PropTypes from 'prop-types';

function KanbanFilters({ filters, onFilterChange, phases }) {
  const handlePhaseChange = (e) => {
    onFilterChange({ phase: e.target.value });
  };

  const handleSearchChange = (e) => {
    onFilterChange({ search: e.target.value });
  };

  const handleClearFilters = () => {
    onFilterChange({ phase: 'all', search: '' });
  };

  const hasActiveFilters = filters.phase !== 'all' || filters.search !== '';

  return (
    <div className="kanban-filters">
      <div className="filter-group">
        <label htmlFor="phase-filter" className="filter-label">
          Phase:
        </label>
        <select
          id="phase-filter"
          className="filter-select"
          value={filters.phase}
          onChange={handlePhaseChange}
        >
          <option value="all">All Phases</option>
          {phases.sort().map(phase => (
            <option key={phase} value={phase}>
              Phase {phase}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="search-filter" className="filter-label">
          Search:
        </label>
        <input
          id="search-filter"
          type="text"
          className="filter-input"
          placeholder="Search tasks..."
          value={filters.search}
          onChange={handleSearchChange}
        />
      </div>

      {hasActiveFilters && (
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleClearFilters}
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}

KanbanFilters.propTypes = {
  filters: PropTypes.shape({
    phase: PropTypes.string.isRequired,
    search: PropTypes.string.isRequired
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  phases: PropTypes.arrayOf(PropTypes.string).isRequired
};

export default KanbanFilters;
