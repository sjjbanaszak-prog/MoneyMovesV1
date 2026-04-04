import React from 'react';
import styles from './MobileLayout.module.css';
import MobileNavbar from './MobileNavbar';

/**
 * MobileLayout
 * Wraps every mobile page. Provides:
 *   - A scrollable content area
 *   - The persistent bottom navigation bar
 *
 * Usage:
 *   <MobileLayout>
 *     <YourPageContent />
 *   </MobileLayout>
 */
export default function MobileLayout({ children }) {
  return (
    <div className={styles.root}>
      <main className={styles.content}>
        {children}
      </main>
      <MobileNavbar />
    </div>
  );
}
