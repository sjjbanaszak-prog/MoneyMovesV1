import React from 'react';
import { useNavigate } from 'react-router-dom';
import MobileNavDrawer from '../components/MobileNavDrawer';

const LAST_UPDATED = '26 June 2026';

const sectionHeadStyle = {
  fontFamily: 'Manrope, sans-serif',
  fontWeight: 800,
  fontSize: '16px',
  color: '#dae2fd',
  margin: '0 0 10px',
};

const bodyStyle = {
  fontSize: '14px',
  color: '#bbcabf',
  lineHeight: 1.75,
  margin: '0 0 12px',
};

const listStyle = {
  fontSize: '14px',
  color: '#bbcabf',
  lineHeight: 1.75,
  margin: '0 0 12px',
  paddingLeft: '20px',
};

function Section({ title, children }) {
  return (
    <div style={{
      background: '#171f33',
      borderRadius: '14px',
      padding: '20px',
      marginBottom: '12px',
    }}>
      <h3 style={sectionHeadStyle}>{title}</h3>
      {children}
    </div>
  );
}

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

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

        {/* Hero */}
        <section style={{ padding: '16px 0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#4edea3', fontVariationSettings: "'FILL' 1" }}>shield</span>
            <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '26px', color: '#dae2fd', margin: 0 }}>
              Privacy Policy
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Last updated: {LAST_UPDATED}</p>
        </section>

        <Section title="Who We Are">
          <p style={bodyStyle}>
            Money Moves ("we", "us", "our") is a UK-based personal finance application. We are committed to protecting
            your personal information in accordance with the UK General Data Protection Regulation (UK GDPR) and the
            Data Protection Act 2018.
          </p>
          <p style={{ ...bodyStyle, margin: 0 }}>
            For data protection enquiries, contact us at:{' '}
            <span style={{ color: '#4edea3', fontWeight: 600 }}>moneymovestest1@gmail.com</span>
          </p>
        </Section>

        <Section title="What Data We Collect">
          <p style={bodyStyle}>We collect only the data you provide directly to us:</p>
          <ul style={listStyle}>
            <li><strong style={{ color: '#dae2fd' }}>Account data:</strong> your name, email address, and date of birth when you register</li>
            <li><strong style={{ color: '#dae2fd' }}>Financial data:</strong> savings balances, pension contributions, mortgage details, and income figures you enter into the app</li>
            <li><strong style={{ color: '#dae2fd' }}>Usage data:</strong> how you interact with features (used solely to improve the service)</li>
            <li><strong style={{ color: '#dae2fd' }}>Technical data:</strong> browser type, operating system, and error logs when you submit a support report</li>
          </ul>
          <p style={{ ...bodyStyle, margin: 0 }}>
            We do not collect your bank login credentials, card numbers, or any payment instrument details.
          </p>
        </Section>

        <Section title="How We Use Your Data">
          <p style={bodyStyle}>Your data is used exclusively to:</p>
          <ul style={listStyle}>
            <li>Provide and personalise the Money Moves service</li>
            <li>Calculate financial projections and insights within the app</li>
            <li>Respond to support requests and problem reports</li>
            <li>Improve app features and fix bugs</li>
            <li>Send important service updates (not marketing) where you have consented</li>
          </ul>
          <p style={{ ...bodyStyle, margin: 0 }}>
            We do not sell, rent, or share your personal or financial data with any third party for commercial purposes.
          </p>
        </Section>

        <Section title="Legal Basis for Processing">
          <p style={bodyStyle}>We process your data on the following legal bases under UK GDPR:</p>
          <ul style={listStyle}>
            <li><strong style={{ color: '#dae2fd' }}>Contract:</strong> to deliver the service you signed up for</li>
            <li><strong style={{ color: '#dae2fd' }}>Legitimate interests:</strong> to improve app performance and prevent abuse</li>
            <li><strong style={{ color: '#dae2fd' }}>Consent:</strong> for any optional communications you opt into</li>
          </ul>
        </Section>

        <Section title="Data Storage & Security">
          <p style={bodyStyle}>
            Your data is stored securely using Google Firebase (Firestore), hosted in the European Economic Area.
            Firebase applies industry-standard encryption in transit (TLS) and at rest.
          </p>
          <p style={bodyStyle}>
            Access to your data is restricted to you alone via your authenticated account. Our Firestore security rules
            enforce strict user-level isolation — no other user or unauthorised party can access your records.
          </p>
          <p style={{ ...bodyStyle, margin: 0 }}>
            We retain your data for as long as your account is active. On account deletion, your data is permanently
            removed within 30 days.
          </p>
        </Section>

        <Section title="Your Rights Under UK GDPR">
          <p style={bodyStyle}>You have the right to:</p>
          <ul style={listStyle}>
            <li><strong style={{ color: '#dae2fd' }}>Access</strong> a copy of the personal data we hold about you</li>
            <li><strong style={{ color: '#dae2fd' }}>Rectify</strong> inaccurate data via your profile settings</li>
            <li><strong style={{ color: '#dae2fd' }}>Erase</strong> your account and all associated data</li>
            <li><strong style={{ color: '#dae2fd' }}>Restrict</strong> processing in certain circumstances</li>
            <li><strong style={{ color: '#dae2fd' }}>Port</strong> your data in a machine-readable format on request</li>
            <li><strong style={{ color: '#dae2fd' }}>Object</strong> to processing based on legitimate interests</li>
          </ul>
          <p style={{ ...bodyStyle, margin: 0 }}>
            To exercise any of these rights, email us at{' '}
            <span style={{ color: '#4edea3', fontWeight: 600 }}>moneymovestest1@gmail.com</span>.
            We will respond within 30 days.
          </p>
        </Section>

        <Section title="Cookies & Tracking">
          <p style={bodyStyle}>
            Money Moves uses Firebase Authentication tokens to keep you signed in securely. These are session tokens, not
            advertising or tracking cookies.
          </p>
          <p style={{ ...bodyStyle, margin: 0 }}>
            We do not use third-party advertising networks, social media trackers, or behavioural analytics platforms.
          </p>
        </Section>

        <Section title="Third-Party Services">
          <p style={bodyStyle}>We use the following third-party services to operate the app:</p>
          <ul style={listStyle}>
            <li><strong style={{ color: '#dae2fd' }}>Google Firebase</strong> — authentication and data storage (Google LLC, EEA-hosted)</li>
            <li><strong style={{ color: '#dae2fd' }}>Google Sign-In</strong> — optional OAuth login</li>
            <li><strong style={{ color: '#dae2fd' }}>HM Land Registry / ONS APIs</strong> — publicly available property and economic data (no personal data transmitted)</li>
          </ul>
          <p style={{ ...bodyStyle, margin: 0 }}>
            Each provider operates under their own privacy policies and relevant data processing agreements.
          </p>
        </Section>

        <Section title="Children's Privacy">
          <p style={{ ...bodyStyle, margin: 0 }}>
            Money Moves is intended for users aged 18 and over. We do not knowingly collect data from anyone under 18.
            If you believe a minor has registered, please contact us and we will delete the account promptly.
          </p>
        </Section>

        <Section title="Changes to This Policy">
          <p style={{ ...bodyStyle, margin: 0 }}>
            We may update this policy when we make significant changes to how we handle your data. We will notify you
            of material changes via email or an in-app notice. Continued use of Money Moves after changes take effect
            constitutes acceptance of the revised policy.
          </p>
        </Section>

        <Section title="Complaints">
          <p style={{ ...bodyStyle, margin: 0 }}>
            If you are unhappy with how we handle your data, you have the right to lodge a complaint with the
            Information Commissioner's Office (ICO) at{' '}
            <span style={{ color: '#4edea3', fontWeight: 600 }}>ico.org.uk</span> or by calling 0303 123 1113.
          </p>
        </Section>

        <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
          <p style={{ fontSize: '12px', color: '#3c4a42', margin: 0 }}>
            Money Moves · {LAST_UPDATED}
          </p>
        </div>

      </div>
    </div>
  );
}
