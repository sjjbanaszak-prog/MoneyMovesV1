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

export default function TermsOfUsePage() {
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
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#4edea3', fontVariationSettings: "'FILL' 1" }}>gavel</span>
            <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '26px', color: '#dae2fd', margin: 0 }}>
              Terms of Use
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Last updated: {LAST_UPDATED}</p>
        </section>

        {/* Important disclaimer banner */}
        <div style={{
          background: 'rgba(255,185,95,0.08)',
          borderLeft: '4px solid #ffb95f',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          display: 'flex', gap: '12px', alignItems: 'flex-start',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#ffb95f', flexShrink: 0, fontVariationSettings: "'FILL' 1" }}>warning</span>
          <div>
            <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: '13px', color: '#ffb95f', margin: '0 0 4px' }}>
              Not Financial Advice
            </p>
            <p style={{ fontSize: '13px', color: '#bbcabf', lineHeight: 1.6, margin: 0 }}>
              Money Moves is a financial planning tool, not a regulated financial adviser. Nothing in this app
              constitutes personalised financial, investment, tax, or legal advice. Always seek advice from a
              qualified professional before making financial decisions.
            </p>
          </div>
        </div>

        <Section title="Acceptance of Terms">
          <p style={{ ...bodyStyle, margin: 0 }}>
            By creating an account and using Money Moves, you agree to be bound by these Terms of Use. If you do not
            agree, please discontinue use of the app immediately. We may update these terms from time to time; continued
            use after changes are posted constitutes acceptance.
          </p>
        </Section>

        <Section title="Eligibility">
          <p style={bodyStyle}>To use Money Moves you must:</p>
          <ul style={listStyle}>
            <li>Be at least 18 years of age</li>
            <li>Be resident in the United Kingdom</li>
            <li>Have the legal capacity to enter into a binding agreement</li>
            <li>Provide accurate and truthful registration information</li>
          </ul>
          <p style={{ ...bodyStyle, margin: 0 }}>
            We reserve the right to refuse or terminate access where eligibility criteria are not met.
          </p>
        </Section>

        <Section title="The Service">
          <p style={bodyStyle}>Money Moves provides tools to help you:</p>
          <ul style={listStyle}>
            <li>Track savings, pension pots, and mortgage balances</li>
            <li>Model financial projections and scenarios</li>
            <li>Visualise income, tax, and allowance utilisation</li>
            <li>Monitor investment portfolios uploaded by you</li>
          </ul>
          <p style={{ ...bodyStyle, margin: 0 }}>
            All projections and calculations are estimates based on the data you provide and general financial
            assumptions. They do not account for your individual circumstances and should not be relied upon as
            a basis for financial decisions.
          </p>
        </Section>

        <Section title="Your Account">
          <p style={bodyStyle}>You are responsible for:</p>
          <ul style={listStyle}>
            <li>Keeping your login credentials confidential</li>
            <li>All activity that occurs under your account</li>
            <li>Notifying us immediately of any unauthorised access at moneymovestest1@gmail.com</li>
            <li>Ensuring the accuracy of information you enter</li>
          </ul>
          <p style={{ ...bodyStyle, margin: 0 }}>
            You must not share your account with others or use another person's account without their express permission.
          </p>
        </Section>

        <Section title="Acceptable Use">
          <p style={bodyStyle}>You agree not to:</p>
          <ul style={listStyle}>
            <li>Use Money Moves for any unlawful purpose</li>
            <li>Attempt to gain unauthorised access to any part of the service or another user's data</li>
            <li>Introduce malicious code, viruses, or disruptive content</li>
            <li>Scrape, copy, or redistribute the app's content or functionality without permission</li>
            <li>Misrepresent your identity or provide false information</li>
            <li>Use the service in a way that could damage, overburden, or impair it</li>
          </ul>
        </Section>

        <Section title="Financial Information Disclaimer">
          <p style={bodyStyle}>
            Money Moves uses HMRC tax rules, ONS data, and market data sources to power its calculations. These are
            updated periodically but may not always reflect the very latest regulatory changes.
          </p>
          <p style={bodyStyle}>
            Tax calculations (income tax, National Insurance, pension allowances, ISA limits) are provided for
            illustrative purposes only and are based on the 2025/26 tax year unless otherwise stated. Your actual
            tax position will depend on your full financial circumstances.
          </p>
          <p style={{ ...bodyStyle, margin: 0 }}>
            Money Moves is not authorised or regulated by the Financial Conduct Authority (FCA). We do not provide
            regulated financial advice, mortgage advice, or investment recommendations.
          </p>
        </Section>

        <Section title="Intellectual Property">
          <p style={bodyStyle}>
            All content, design, and code within Money Moves is owned by or licensed to us and is protected by
            copyright and other intellectual property laws.
          </p>
          <p style={{ ...bodyStyle, margin: 0 }}>
            You are granted a limited, non-exclusive, non-transferable licence to use the app for personal,
            non-commercial purposes. You must not copy, modify, distribute, sell, or reverse-engineer any part of the
            service.
          </p>
        </Section>

        <Section title="Availability & Changes">
          <p style={bodyStyle}>
            We aim to keep Money Moves available at all times but cannot guarantee uninterrupted access. We may
            suspend or modify the service at any time for maintenance, upgrades, or other operational reasons.
          </p>
          <p style={{ ...bodyStyle, margin: 0 }}>
            We may add, change, or remove features. Where changes materially affect the service, we will provide
            reasonable notice where possible.
          </p>
        </Section>

        <Section title="Limitation of Liability">
          <p style={bodyStyle}>
            To the fullest extent permitted by law, Money Moves and its developers shall not be liable for:
          </p>
          <ul style={listStyle}>
            <li>Any financial loss arising from your reliance on app calculations or projections</li>
            <li>Loss of data due to technical failure</li>
            <li>Indirect, incidental, or consequential loss of any kind</li>
            <li>Errors in third-party data sources used within the app</li>
          </ul>
          <p style={{ ...bodyStyle, margin: 0 }}>
            Nothing in these terms excludes liability for death or personal injury caused by our negligence, or for
            fraud or fraudulent misrepresentation.
          </p>
        </Section>

        <Section title="Termination">
          <p style={bodyStyle}>
            You may delete your account at any time by contacting us at moneymovestest1@gmail.com.
          </p>
          <p style={{ ...bodyStyle, margin: 0 }}>
            We may suspend or terminate your account if you breach these terms, engage in fraudulent activity, or
            if we cease to operate the service. On termination, your data will be deleted in accordance with our
            Privacy Policy.
          </p>
        </Section>

        <Section title="Governing Law">
          <p style={{ ...bodyStyle, margin: 0 }}>
            These Terms of Use are governed by the laws of England and Wales. Any disputes arising from your use of
            Money Moves shall be subject to the exclusive jurisdiction of the courts of England and Wales.
          </p>
        </Section>

        <Section title="Contact Us">
          <p style={{ ...bodyStyle, margin: 0 }}>
            For any questions about these terms, please contact us at:{' '}
            <span style={{ color: '#4edea3', fontWeight: 600 }}>moneymovestest1@gmail.com</span>
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
