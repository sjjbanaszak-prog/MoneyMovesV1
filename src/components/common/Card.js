/**
 * Reusable Card Component
 * Provides consistent card layout across the application
 */

import React from 'react';
import PropTypes from 'prop-types';
import '../../styles/SharedStyles.css';

const Card = ({
  title,
  subtitle,
  children,
  headerAction,
  className = '',
  ...props
}) => {
  return (
    <div className={`card ${className}`} {...props}>
      {(title || subtitle || headerAction) && (
        <div className="card-header">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="text-muted text-sm">{subtitle}</p>}
          </div>
          {headerAction && <div className="card-header-action">{headerAction}</div>}
        </div>
      )}
      <div className="card-content">{children}</div>
    </div>
  );
};

Card.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  children: PropTypes.node.isRequired,
  headerAction: PropTypes.node,
  className: PropTypes.string,
};

export default Card;
