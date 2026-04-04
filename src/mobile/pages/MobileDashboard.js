import React from 'react';
import styles from './MobileDashboard.module.css';

/**
 * MobileDashboard
 * Home screen for the mobile app.
 * Replace the placeholder content with your design.
 */
export default function MobileDashboard() {
  return (
    <div className={styles.page}>
      <div className={styles.placeholder}>
        <span>📱</span>
        <p>Mobile Dashboard</p>
        <p>Drop your designs in here.</p>
      </div>
    </div>
  );
}
