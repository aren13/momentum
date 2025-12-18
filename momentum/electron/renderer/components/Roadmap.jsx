import React, { useState, useEffect } from 'react';

function Roadmap() {
  const [roadmapData, setRoadmapData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRoadmap();
  }, []);

  const loadRoadmap = async () => {
    setLoading(true);
    try {
      const result = await window.momentum.roadmap();
      if (result.success) {
        setRoadmapData(result.output);
      }
    } catch (error) {
      console.error('Failed to load roadmap:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="view roadmap-view">
      <header className="view-header">
        <h2>Roadmap</h2>
        <button className="btn btn-primary" onClick={loadRoadmap}>
          Refresh
        </button>
      </header>
      <div className="view-content">
        {loading ? (
          <p>Loading roadmap...</p>
        ) : roadmapData ? (
          <pre className="roadmap-output">{roadmapData}</pre>
        ) : (
          <div className="empty-state">
            <p>No roadmap available</p>
            <button className="btn btn-secondary">Create Roadmap</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Roadmap;
