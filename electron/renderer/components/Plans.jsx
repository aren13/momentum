import React, { useState } from 'react';

function Plans() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [executing, setExecuting] = useState(false);

  const executePlan = async (planPath) => {
    setExecuting(true);
    try {
      const result = await window.momentum.execute(planPath, { autonomous: true });
      if (result.success) {
        alert('Plan execution started successfully');
      } else {
        alert('Plan execution failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to execute plan:', error);
      alert('Failed to execute plan: ' + error.message);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="view plans-view">
      <header className="view-header">
        <h2>Plans</h2>
        <button className="btn btn-primary">New Plan</button>
      </header>
      <div className="view-content">
        <div className="empty-state">
          <p>No plans available</p>
          <p className="help-text">Plans will appear here when created</p>
        </div>
      </div>
    </div>
  );
}

export default Plans;
