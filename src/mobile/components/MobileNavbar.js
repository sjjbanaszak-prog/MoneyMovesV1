import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './MobileNavbar.module.css';

/**
 * MobileNavbar
 * Bottom tab navigation bar.
 * Add/remove/rename tabs to match your design.
 */

const tabs = [
  { label: 'Home',     path: '/mobile' },
  // Add more tabs here as you build out the mobile pages, e.g.:
  // { label: 'Pension',  path: '/mobile/pension' },
  // { label: 'Savings',  path: '/mobile/savings' },
  // { label: 'Debt',     path: '/mobile/debt' },
];

export default function MobileNavbar() {
  return (
    <nav className={styles.nav}>
      {tabs.map(({ label, path }) => (
        <NavLink
          key={path}
          to={path}
          end
          className={({ isActive }) =>
            `${styles.navItem}${isActive ? ` ${styles.active}` : ''}`
          }
        >
          {/* Replace with your icon set */}
          <span className={styles.navIcon}>◻</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
