import React, { useState } from 'react';
import { AlertCircle, Lightbulb, HelpCircle, MessageSquare, Info, X } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useReportProblem } from '../contexts/ReportProblemContext';
import '../archive/web-pages/AccountSettingsStyles.css';

export default function ReportProblemModal() {
  const { isOpen, closeReportProblem } = useReportProblem();
  const { user } = useAuth();

  const [reportData, setReportData] = useState({
    type: 'bug',
    subject: '',
    description: '',
  });
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const handleSendReport = async () => {
    if (!user || !reportData.type || !reportData.subject || !reportData.description) {
      return;
    }

    setIsSubmittingReport(true);

    try {
      await addDoc(collection(db, 'problem_reports'), {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || 'Unknown',
        type: reportData.type,
        subject: reportData.subject,
        description: reportData.description,
        timestamp: new Date(),
        status: 'open',
      });

      // Reset form and close modal
      setReportData({
        type: 'bug',
        subject: '',
        description: '',
      });
      closeReportProblem();
      alert('Report submitted successfully! We will respond within 24-48 hours.');
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const problemTypes = [
    { id: 'bug', label: 'Bug Report', icon: AlertCircle },
    { id: 'feature', label: 'New Feature', icon: Lightbulb },
    { id: 'help', label: 'Help/Question', icon: HelpCircle },
    { id: 'other', label: 'Other', icon: MessageSquare },
  ];

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={closeReportProblem}>
      <div className="modal-content-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Report a Problem</h2>
          </div>
          <button onClick={closeReportProblem} className="modal-close">
            <X size={24} />
          </button>
        </div>

        <div className="modal-body modal-body-compact">
          <div className="form-group">
            <label className="form-label-1">What issue are you experiencing?</label>
            <div className="problem-types">
              {problemTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    className={`problem-type ${reportData.type === type.id ? 'selected' : ''}`}
                    onClick={() => setReportData({ ...reportData, type: type.id })}
                  >
                    <Icon size={20} />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Subject</label>
            <input
              type="text"
              className="form-input"
              value={reportData.subject}
              onChange={(e) => setReportData({ ...reportData, subject: e.target.value })}
              placeholder="Brief description of the issue"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={reportData.description}
              onChange={(e) => setReportData({ ...reportData, description: e.target.value })}
              placeholder="Please provide as much detail as possible..."
            />
          </div>

          <div className="form-note">
            <Info size={16} />
            <p>We typically respond within 24-48 hours. For urgent issues, please use live chat.</p>
          </div>
        </div>

        <div className="modal-footer">
          <button
            onClick={closeReportProblem}
            className="modal-btn modal-btn-secondary"
            disabled={isSubmittingReport}
          >
            Cancel
          </button>
          <button
            onClick={handleSendReport}
            className="modal-btn modal-btn-primary"
            disabled={!reportData.type || !reportData.subject || !reportData.description || isSubmittingReport}
          >
            {isSubmittingReport ? 'Sending...' : 'Send Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
