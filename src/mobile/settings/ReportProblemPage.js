import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import MobileNavDrawer from '../components/MobileNavDrawer';

const CATEGORIES = [
  { id: 'bug',     label: 'Bug Report',   icon: 'bug_report',   filled: true  },
  { id: 'feature', label: 'New Feature',  icon: 'lightbulb',    filled: false },
  { id: 'help',    label: 'Question',     icon: 'help',         filled: false },
  { id: 'other',   label: 'Other',        icon: 'chat_bubble',  filled: false },
];

const labelStyle = {
  fontSize: '12px',
  color: '#adc6ff',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: '8px',
};

function detectBrowser() {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua))      return `Edge ${(ua.match(/Edg\/([\d.]+)/) || [])[1] || ''}`.trim();
  if (/OPR\//.test(ua))      return `Opera ${(ua.match(/OPR\/([\d.]+)/) || [])[1] || ''}`.trim();
  if (/Chrome\//.test(ua))   return `Chrome ${(ua.match(/Chrome\/([\d.]+)/) || [])[1] || ''}`.trim();
  if (/Firefox\//.test(ua))  return `Firefox ${(ua.match(/Firefox\/([\d.]+)/) || [])[1] || ''}`.trim();
  if (/Safari\//.test(ua))   return `Safari ${(ua.match(/Version\/([\d.]+)/) || [])[1] || ''}`.trim();
  return navigator.userAgent.substring(0, 60);
}

function detectOS() {
  const ua = navigator.userAgent;
  if (/Windows NT 10/.test(ua))  return 'Windows 10/11';
  if (/Windows NT 6\.3/.test(ua)) return 'Windows 8.1';
  if (/Windows/.test(ua))         return 'Windows';
  if (/iPhone OS ([\d_]+)/.test(ua)) return `iOS ${ua.match(/iPhone OS ([\d_]+)/)[1].replace(/_/g, '.')}`;
  if (/iPad.*OS ([\d_]+)/.test(ua))  return `iPadOS ${ua.match(/OS ([\d_]+)/)[1].replace(/_/g, '.')}`;
  if (/Android ([\d.]+)/.test(ua))   return `Android ${ua.match(/Android ([\d.]+)/)[1]}`;
  if (/Mac OS X ([\d_]+)/.test(ua))  return `macOS ${ua.match(/Mac OS X ([\d_]+)/)[1].replace(/_/g, '.')}`;
  if (/Linux/.test(ua))              return 'Linux';
  return 'Unknown';
}

const MAX_FILES    = 3;
const MAX_FILE_MB  = 5;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const ALLOWED_TYPES  = ['image/png', 'image/jpeg', 'application/pdf'];

export default function ReportProblemPage() {
  const navigate  = useNavigate();
  const { currentUser } = useAuth();

  const [category,    setCategory]    = useState('bug');
  const [subject,     setSubject]     = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [error,       setError]       = useState(null);
  const fileInputRef = useRef(null);

  const canSubmit = category && subject.trim() && description.trim() && !submitting;

  function handleFiles(files) {
    const incoming = Array.from(files);
    const valid = [];
    for (const file of incoming) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`"${file.name}" is not a supported file type. Use PNG, JPG, or PDF.`);
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError(`"${file.name}" exceeds the ${MAX_FILE_MB}MB limit.`);
        return;
      }
      valid.push(file);
    }
    setError(null);
    setAttachments(prev => {
      const combined = [...prev, ...valid];
      return combined.slice(0, MAX_FILES);
    });
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  function removeAttachment(index) {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!canSubmit) return;

    if (subject.trim().length > 200) {
      setError('Subject must be 200 characters or fewer.');
      return;
    }
    if (description.trim().length > 5000) {
      setError('Description must be 5000 characters or fewer.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await addDoc(collection(db, 'problem_reports'), {
        userId:      currentUser?.uid   || 'anonymous',
        userEmail:   currentUser?.email || 'unknown',
        userName:    currentUser?.displayName || 'Unknown',
        type:        category,
        subject:     subject.trim(),
        description: description.trim(),
        timestamp:   new Date(),
        status:      'open',
        browser:     detectBrowser(),
        os:          detectOS(),
        attachments: attachments.map(f => ({ name: f.name, size: f.size, type: f.type })),
      });
      setSubmitted(true);
    } catch (e) {
      console.error('Error submitting report:', e);
      setError('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mobile-screen" style={{ paddingTop: '50px', paddingBottom: '40px', background: '#0b1326', minHeight: '100vh' }}>
      <MobileNavDrawer />

      {/* Sub-header */}
      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => navigate('/mobile/settings')}
          style={{
            background: 'rgba(173,198,255,0.08)',
            border: 'none', borderRadius: '50%',
            width: '36px', height: '36px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <span className="material-symbols-outlined" style={{ color: '#adc6ff', fontSize: '20px' }}>arrow_back</span>
        </button>
        <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0 }}>Settings</p>
      </div>

      <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>

        {submitted ? (
          <SuccessState onBack={() => navigate('/mobile/settings')} />
        ) : (
          <>
            {/* Hero */}
            <section style={{ padding: '16px 0 24px' }}>
              <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '28px', color: '#dae2fd', margin: '0 0 8px', lineHeight: 1.2 }}>
                How can we help?
              </h2>
              <p style={{ fontSize: '14px', color: '#bbcabf', lineHeight: 1.6, margin: 0 }}>
                Select a category and describe the issue you're encountering.
              </p>
            </section>

            {/* Category tiles */}
            <section style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '15px', color: '#dae2fd', margin: 0 }}>Select Category</h3>
                <span style={{ fontSize: '10px', color: '#bbcabf', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Required</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {CATEGORIES.map(cat => {
                  const active = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '20px 12px',
                        background: active ? 'rgba(78,222,163,0.08)' : '#222a3d',
                        border: `2px solid ${active ? '#4edea3' : 'transparent'}`,
                        borderRadius: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: '28px',
                          color: active ? '#4edea3' : '#bbcabf',
                          marginBottom: '8px',
                          fontVariationSettings: active && cat.filled ? "'FILL' 1" : "'FILL' 0",
                        }}
                      >
                        {cat.icon}
                      </span>
                      <span style={{
                        fontSize: '13px', fontWeight: active ? 700 : 500,
                        color: active ? '#4edea3' : '#dae2fd',
                      }}>
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Form card */}
            <div className="section-card" style={{ marginBottom: '16px', position: 'relative', overflow: 'hidden' }}>
              {/* Accent bar */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                background: 'linear-gradient(90deg, #4edea3, #10b981)',
              }} />

              <div style={{ paddingTop: '4px' }}>
                {/* Subject */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Subject</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Briefly describe the issue"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                  />
                </div>

                {/* Description */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Description</label>
                  <textarea
                    className="input-field"
                    placeholder="Provide as much detail as possible. Include steps to reproduce the error if applicable."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={6}
                    style={{ resize: 'vertical', minHeight: '120px', lineHeight: 1.6 }}
                  />
                </div>

                {/* Attachments */}
                <div>
                  <label style={labelStyle}>
                    Attachments (Optional)
                    {attachments.length > 0 && (
                      <span style={{ color: '#4edea3', marginLeft: '8px', textTransform: 'none', letterSpacing: 0, fontSize: '11px', fontWeight: 500 }}>
                        {attachments.length}/{MAX_FILES} added
                      </span>
                    )}
                  </label>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf"
                    multiple
                    style={{ display: 'none' }}
                    onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
                  />

                  {/* Drop zone */}
                  {attachments.length < MAX_FILES && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={e => e.preventDefault()}
                      style={{
                        border: '2px dashed rgba(78,222,163,0.3)',
                        borderRadius: '12px',
                        padding: '24px 16px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        background: 'rgba(78,222,163,0.03)',
                        cursor: 'pointer',
                        gap: '6px',
                        transition: 'border-color 0.2s',
                        marginBottom: attachments.length > 0 ? '10px' : 0,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#4edea3', marginBottom: '4px', opacity: 0.7 }}>cloud_upload</span>
                      <p style={{ fontSize: '13px', color: '#bbcabf', margin: 0, textAlign: 'center' }}>
                        Drop screenshots here or <span style={{ color: '#4edea3', fontWeight: 600 }}>browse files</span>
                      </p>
                      <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>PNG, JPG, PDF · Max {MAX_FILE_MB}MB each · Up to {MAX_FILES} files</p>
                    </div>
                  )}

                  {/* Selected files list */}
                  {attachments.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {attachments.map((file, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: 'rgba(78,222,163,0.06)',
                          border: '1px solid rgba(78,222,163,0.15)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#4edea3', flexShrink: 0 }}>
                              {file.type === 'application/pdf' ? 'picture_as_pdf' : 'image'}
                            </span>
                            <div style={{ overflow: 'hidden' }}>
                              <p style={{ fontSize: '12px', color: '#dae2fd', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {file.name}
                              </p>
                              <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                                {(file.size / 1024).toFixed(0)} KB
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeAttachment(i)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#64748b' }}>close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p style={{ fontSize: '13px', color: '#ffb4ab', margin: '0 0 12px', textAlign: 'center' }}>{error}</p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                width: '100%',
                background: canSubmit ? '#4edea3' : 'rgba(78,222,163,0.3)',
                color: '#003824',
                border: 'none', borderRadius: '14px',
                padding: '16px',
                fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                boxShadow: canSubmit ? '0 8px 20px rgba(78,222,163,0.25)' : 'none',
                transition: 'all 0.2s',
                marginBottom: '8px',
              }}
            >
              {submitting ? 'Submitting…' : 'Submit Report'}
              {!submitting && <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>send</span>}
            </button>
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#64748b', margin: '0 0 24px' }}>
              Our technical support team typically responds within 24 hours.
            </p>

            {/* Processing Time card */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '14px',
              background: 'rgba(78,222,163,0.05)',
              borderLeft: '4px solid #4edea3',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '12px',
            }}>
              <div style={{ background: 'rgba(78,222,163,0.1)', borderRadius: '8px', padding: '6px', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#4edea3', display: 'block' }}>schedule</span>
              </div>
              <div>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '13px', color: '#dae2fd', margin: '0 0 4px' }}>Processing Time</p>
                <p style={{ fontSize: '12px', color: '#bbcabf', lineHeight: 1.6, margin: 0 }}>
                  We typically respond within 24–48 hours. Our team is working hard to ensure your MoneyMoves experience is seamless.
                </p>
              </div>
            </div>

            {/* System Diagnostics card */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '14px',
              background: '#131b2e',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '32px',
            }}>
              <div style={{ background: 'rgba(255,185,95,0.1)', borderRadius: '8px', padding: '6px', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#ffb95f', display: 'block' }}>info</span>
              </div>
              <div>
                <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '13px', color: '#dae2fd', margin: '0 0 4px' }}>System Diagnostics</p>
                <p style={{ fontSize: '12px', color: '#bbcabf', lineHeight: 1.6, margin: 0 }}>
                  To help us resolve your issue faster, basic technical info (browser version, OS, and timestamp) will be automatically included in this report. No personal financial data is shared.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SuccessState({ onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '60px 16px' }}>
      <div style={{
        width: '72px', height: '72px', borderRadius: '50%',
        background: 'rgba(78,222,163,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '20px',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#4edea3', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
      </div>
      <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '22px', color: '#dae2fd', margin: '0 0 10px' }}>
        Report Submitted
      </h2>
      <p style={{ fontSize: '14px', color: '#bbcabf', lineHeight: 1.6, margin: '0 0 32px', maxWidth: '280px' }}>
        Thanks for letting us know. We'll review your report and get back to you within 24–48 hours.
      </p>
      <button
        onClick={onBack}
        style={{
          background: '#4edea3', color: '#003824',
          border: 'none', borderRadius: '14px',
          padding: '14px 32px',
          fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '15px',
          cursor: 'pointer',
        }}
      >
        Back to Settings
      </button>
    </div>
  );
}
