import React from 'react';
import './DemoModeBanner.css';

export default function DemoModeBanner() {
  return (
    <div className="demo-mode-banner">
      <div className="demo-mode-pill">
        <span className="demo-mode-icon">👁️</span>
        <span className="demo-mode-text">DEMO MODE</span>
      </div>
      <p className="demo-mode-description">
        You're viewing example data. Switch to Live Mode to see your actual financial information.
      </p>
    </div>
  );
}
