import React, { createContext, useContext, useState } from 'react';

const ReportProblemContext = createContext();

export const useReportProblem = () => {
  const context = useContext(ReportProblemContext);
  if (!context) {
    throw new Error('useReportProblem must be used within ReportProblemProvider');
  }
  return context;
};

export const ReportProblemProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openReportProblem = () => setIsOpen(true);
  const closeReportProblem = () => setIsOpen(false);

  return (
    <ReportProblemContext.Provider value={{ isOpen, openReportProblem, closeReportProblem }}>
      {children}
    </ReportProblemContext.Provider>
  );
};
