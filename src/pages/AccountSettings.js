import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Link2,
  Zap,
  RotateCcw,
  Bell,
  Shield,
  FileText,
  Globe,
  MessageSquare,
  Mail,
  Star,
  LogOut,
  X,
  Check,
  TrendingUp,
  Sparkles,
  AlertCircle,
  Lightbulb,
  HelpCircle,
  Info,
  ChevronDown,
} from "lucide-react";
import "./AccountSettingsStyles.css";
import { useAuth } from "../context/AuthProvider";
import { doc, getDoc, setDoc, collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function AccountSettings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [upgradePremiumOpen, setUpgradePremiumOpen] = useState(false);
  const [reportProblemOpen, setReportProblemOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("annual");
  const [reportData, setReportData] = useState({
    type: "bug",
    subject: "",
    description: "",
  });
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: "",
    dateOfBirth: "",
    industry: "",
  });
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false);
  const [isCustomIndustry, setIsCustomIndustry] = useState(false);
  const [customIndustryInput, setCustomIndustryInput] = useState("");
  const [industrySearchTerm, setIndustrySearchTerm] = useState("");
  const dropdownRef = useRef(null);

  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const industriesGrouped = [
    {
      label: "Technology & Software",
      options: [
        "Information Technology & Services",
        "Software Development",
        "Internet / Web Services",
        "Computer Hardware",
        "Telecommunications",
        "Artificial Intelligence / Machine Learning",
        "Cybersecurity",
        "Tech Startups",
      ],
    },
    {
      label: "Finance & Professional Services",
      options: [
        "Financial Services",
        "Banking",
        "Investment Management",
        "Accounting",
        "Insurance",
        "Venture Capital / Private Equity",
        "Consulting",
      ],
    },
    {
      label: "Healthcare & Life Sciences",
      options: [
        "Healthcare",
        "Pharmaceuticals",
        "Biotechnology",
        "Medical Devices",
        "Health & Wellness",
      ],
    },
    {
      label: "Education & Research",
      options: [
        "Education Management",
        "Higher Education",
        "eLearning",
        "Research / Think Tanks",
      ],
    },
    {
      label: "Manufacturing & Engineering",
      options: [
        "Manufacturing",
        "Mechanical or Industrial Engineering",
        "Electrical / Electronic Manufacturing",
        "Automotive",
        "Aerospace & Defense",
      ],
    },
    {
      label: "Construction & Real Estate",
      options: [
        "Construction",
        "Civil Engineering",
        "Architecture & Planning",
        "Real Estate",
      ],
    },
    {
      label: "Retail & Consumer",
      options: [
        "Retail",
        "Consumer Goods",
        "E-commerce",
        "Wholesale",
        "Fashion / Apparel",
      ],
    },
    {
      label: "Energy & Environment",
      options: [
        "Oil & Energy",
        "Utilities",
        "Renewable Energy",
        "Environmental Services",
      ],
    },
    {
      label: "Media & Communications",
      options: [
        "Marketing & Advertising",
        "Media Production",
        "Public Relations",
        "Publishing",
        "Entertainment",
        "Gaming",
      ],
    },
    {
      label: "Government & Nonprofit",
      options: [
        "Government Administration",
        "Public Policy",
        "Nonprofit Organization Management",
        "International Affairs",
        "Defense & Space",
      ],
    },
    {
      label: "Transportation & Logistics",
      options: [
        "Transportation / Trucking / Railroad",
        "Logistics & Supply Chain",
        "Airlines / Aviation",
        "Maritime",
      ],
    },
    {
      label: "Agriculture & Food",
      options: [
        "Agriculture",
        "Food & Beverages",
        "Hospitality",
        "Restaurants",
      ],
    },
    { label: "Legal", options: ["Legal Services", "Law Practice"] },
    {
      label: "Human Resources & Staffing",
      options: ["Human Resources", "Staffing & Recruiting"],
    },
    {
      label: "Arts, Sports & Leisure",
      options: ["Arts & Design", "Sports & Recreation", "Travel & Tourism"],
    },
    { label: "Other", options: ["Other / Not Listed"] },
  ];

  // Load user profile data from Firebase
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setProfileData({
              fullName: data.fullName || user.displayName || "",
              dateOfBirth: data.dateOfBirth || "",
              industry: data.industry || "",
            });
          } else {
            // Initialize with Google auth data
            setProfileData({
              fullName: user.displayName || "",
              dateOfBirth: "",
              industry: "",
            });
          }
        } catch (error) {
          console.error("Error loading profile:", error);
        }
      }
    };

    loadUserProfile();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowIndustryDropdown(false);
        setIsCustomIndustry(false);
        setIndustrySearchTerm("");
      }
    };

    if (showIndustryDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showIndustryDropdown]);

  const handleSignOut = () => {
    signOut();
    navigate("/");
  };

  const handleEditProfile = () => {
    setEditProfileOpen(true);
  };

  const handleUpgradePremium = () => {
    setUpgradePremiumOpen(true);
    setSelectedPlan("annual");
  };

  const handleReportProblem = () => {
    setReportProblemOpen(true);
    setReportData({
      type: "bug",
      subject: "",
      description: "",
    });
  };

  const handleContactSupport = () => {
    window.location.href = "mailto:moneymovestest1@visiblealpha.com";
  };

  const handleSendReport = async () => {
    if (
      !user ||
      !reportData.type ||
      !reportData.subject ||
      !reportData.description
    ) {
      return;
    }

    setIsSubmittingReport(true);

    try {
      // Add the report to the 'problem_reports' collection
      await addDoc(collection(db, "problem_reports"), {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || "Unknown",
        type: reportData.type,
        subject: reportData.subject,
        description: reportData.description,
        status: "new", // Can be: new, in_progress, resolved, closed
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      console.log("Report submitted successfully");
      alert(
        "Thank you! Your report has been submitted successfully. We'll get back to you soon."
      );

      // Reset the form and close modal
      setReportData({
        type: "bug",
        subject: "",
        description: "",
      });
      setReportProblemOpen(false);
    } catch (error) {
      console.error("Error submitting report:", error);
      alert(
        "Failed to submit report. Please try again or contact support directly."
      );
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleSaveProfile = async () => {
    if (user) {
      try {
        await setDoc(
          doc(db, "users", user.uid),
          {
            fullName: profileData.fullName,
            dateOfBirth: profileData.dateOfBirth,
            industry: profileData.industry,
            email: user.email,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        console.log("Profile saved successfully");
        setEditProfileOpen(false);
      } catch (error) {
        console.error("Error saving profile:", error);
        alert("Failed to save profile. Please try again.");
      }
    }
  };

  const handleInputChange = (field, value) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleIndustrySelect = (industry) => {
    if (industry === "Other / Not Listed") {
      setIsCustomIndustry(true);
      setCustomIndustryInput("");
    } else {
      handleInputChange("industry", industry);
      setShowIndustryDropdown(false);
      setIsCustomIndustry(false);
      setIndustrySearchTerm("");
    }
  };

  const handleCustomIndustrySubmit = () => {
    if (customIndustryInput.trim()) {
      handleInputChange("industry", customIndustryInput.trim());
      setShowIndustryDropdown(false);
      setIsCustomIndustry(false);
      setCustomIndustryInput("");
      setIndustrySearchTerm("");
    }
  };

  const handleCustomIndustryKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCustomIndustrySubmit();
    } else if (e.key === "Escape") {
      setIsCustomIndustry(false);
      setShowIndustryDropdown(false);
      setIndustrySearchTerm("");
    }
  };

  const filteredIndustries = industriesGrouped
    .map((group) => ({
      ...group,
      options: group.options.filter((option) =>
        option.toLowerCase().includes(industrySearchTerm.toLowerCase())
      ),
    }))
    .filter((group) => group.options.length > 0);

  return (
    <div className="account-settings-container">
      {/* Edit Profile Modal */}
      {editProfileOpen && (
        <EditProfileModal
          setEditProfileOpen={setEditProfileOpen}
          profileData={profileData}
          setProfileData={setProfileData}
          handleSaveProfile={handleSaveProfile}
          user={user}
          showIndustryDropdown={showIndustryDropdown}
          setShowIndustryDropdown={setShowIndustryDropdown}
          dropdownRef={dropdownRef}
          industrySearchTerm={industrySearchTerm}
          setIndustrySearchTerm={setIndustrySearchTerm}
          isCustomIndustry={isCustomIndustry}
          setIsCustomIndustry={setIsCustomIndustry}
          customIndustryInput={customIndustryInput}
          setCustomIndustryInput={setCustomIndustryInput}
          handleIndustrySelect={handleIndustrySelect}
          handleCustomIndustrySubmit={handleCustomIndustrySubmit}
          handleCustomIndustryKeyDown={handleCustomIndustryKeyDown}
          filteredIndustries={filteredIndustries}
          handleInputChange={handleInputChange}
        />
      )}

      {/* Upgrade Premium Modal */}
      {upgradePremiumOpen && (
        <UpgradePremiumModal
          setUpgradePremiumOpen={setUpgradePremiumOpen}
          selectedPlan={selectedPlan}
          setSelectedPlan={setSelectedPlan}
        />
      )}

      {/* Report Problem Modal */}
      {reportProblemOpen && (
        <ReportProblemModal
          setReportProblemOpen={setReportProblemOpen}
          reportData={reportData}
          setReportData={setReportData}
          handleSendReport={handleSendReport}
          isSubmittingReport={isSubmittingReport}
        />
      )}

      {/* Main Content */}
      <div className="account-settings-content">
        <div className="content-wrapper">
          <h1 className="tracker-title">Account Settings</h1>

          {/* Profile Card */}
          <div className="profile-card">
            <div className="profile-card-content">
              <div className="profile-avatar">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                    }}
                  />
                ) : (
                  <span>{user?.displayName?.charAt(0) || "U"}</span>
                )}
              </div>
              <h2 className="profile-name">{user?.displayName || "User"}</h2>
              <p className="profile-email">{user?.email || ""}</p>
            </div>
          </div>

          {/* Settings Grid */}
          <div className="settings-grid">
            {/* Left Column */}
            <div className="settings-column">
              {/* Account & Finance */}
              <SettingsCard title="Account & Finance">
                <MenuItem
                  icon={<User size={20} />}
                  text="Edit Profile"
                  onClick={handleEditProfile}
                />
                <MenuItem icon={<Link2 size={20} />} text="Linked Accounts" />
                <MenuItem
                  icon={<Zap size={20} />}
                  text="Upgrade to Premium"
                  highlight
                  onClick={handleUpgradePremium}
                />
                <MenuItem
                  icon={<RotateCcw size={20} />}
                  text="Restore Purchases"
                  showBorder={false}
                />
              </SettingsCard>

              {/* Data & Legal */}
              <SettingsCard title="Data & Legal">
                <MenuItem icon={<Shield size={20} />} text="Data & Privacy" />
                <MenuItem icon={<FileText size={20} />} text="Terms of Use" />
                <MenuItem
                  icon={<Globe size={20} />}
                  text="Website"
                  showBorder={false}
                />
              </SettingsCard>
            </div>

            {/* Right Column */}
            <div className="settings-column">
              {/* Preferences */}
              <SettingsCard title="Preferences">
                <div className="preference-item">
                  <div className="preference-content">
                    <div className="preference-icon-wrapper">
                      <Bell size={20} />
                    </div>
                    <span className="preference-label">Notifications</span>
                  </div>
                  <button
                    onClick={() =>
                      setNotificationsEnabled(!notificationsEnabled)
                    }
                    className={`toggle-switch ${
                      notificationsEnabled ? "active" : ""
                    }`}
                  >
                    <div className="toggle-slider" />
                  </button>
                </div>
              </SettingsCard>

              {/* Support */}
              <SettingsCard title="Support">
                <MenuItem
                  icon={<MessageSquare size={20} />}
                  text="Report a problem"
                  onClick={handleReportProblem}
                />
                <MenuItem
                  icon={<Mail size={20} />}
                  text="Contact Support"
                  onClick={handleContactSupport}
                />
                <MenuItem
                  icon={<Star size={20} />}
                  text="Rate on App Store"
                  showBorder={false}
                />
              </SettingsCard>

              {/* Separation Line - Desktop */}
              <div className="desktop-separator" />

              {/* Account Section - Desktop only */}
              <div className="account-section account-section-desktop">
                <div className="account-section-label">ACCOUNT</div>
                <button onClick={handleSignOut} className="sign-out-btn">
                  <LogOut size={20} />
                  <span>Sign Out</span>
                </button>

                <div className="demo-mode-info">
                  <div className="demo-mode-icon">
                    <span>i</span>
                  </div>
                  <p>Demo Mode — account deletion is disabled</p>
                </div>
              </div>
            </div>
          </div>

          {/* Separation Line - Mobile Only */}
          <div className="mobile-separator" />

          {/* Account Section - Mobile Only */}
          <div className="account-section account-section-mobile">
            <div className="account-section-label">ACCOUNT</div>
            <button onClick={handleSignOut} className="sign-out-btn">
              <LogOut size={20} />
              <span>Sign Out</span>
            </button>

            <div className="demo-mode-info">
              <div className="demo-mode-icon">
                <span>i</span>
              </div>
              <p>Demo Mode — account deletion is disabled</p>
            </div>
          </div>

          {/* Version */}
          <div className="version-text">MoneyMoves v1.0.1</div>
        </div>
      </div>
    </div>
  );
}

function SettingsCard({ title, children }) {
  return (
    <div className="settings-card">
      <h3 className="settings-card-title">{title}</h3>
      {children}
    </div>
  );
}

function MenuItem({
  icon,
  text,
  subtitle,
  showBorder = true,
  highlight = false,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className={`menu-item ${!showBorder ? "no-border" : ""}`}
    >
      <div className="menu-item-content">
        <div className={`menu-item-icon ${highlight ? "highlight" : ""}`}>
          {icon}
        </div>
        <div className="menu-item-text">
          <div className="menu-item-title">{text}</div>
          {subtitle && <div className="menu-item-subtitle">{subtitle}</div>}
        </div>
      </div>
      <svg
        className="menu-item-chevron"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}

// =======================
// MODAL COMPONENTS
// =======================

// Edit Profile Modal Component
function EditProfileModal({
  setEditProfileOpen,
  profileData,
  handleSaveProfile,
  user,
  showIndustryDropdown,
  setShowIndustryDropdown,
  dropdownRef,
  industrySearchTerm,
  setIndustrySearchTerm,
  isCustomIndustry,
  setIsCustomIndustry,
  customIndustryInput,
  setCustomIndustryInput,
  handleIndustrySelect,
  handleCustomIndustrySubmit,
  handleCustomIndustryKeyDown,
  filteredIndustries,
  handleInputChange,
}) {
  return (
    <div className="modal-overlay" onClick={() => setEditProfileOpen(false)}>
      <div className="modal-content-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Profile</h2>
          <button
            onClick={() => setEditProfileOpen(false)}
            className="modal-close"
          >
            <X size={24} />
          </button>
        </div>

        <div className="modal-body modal-body-compact">
          <div className="form-group">
            <label className="form-label-1">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={user?.displayName || ""}
              readOnly
              style={{ cursor: "not-allowed", opacity: 0.7 }}
            />
            <p className="form-hint">
              Your name is linked to your Google account
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Date of Birth</label>
            <input
              type="date"
              className="form-input"
              value={profileData.dateOfBirth}
              onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={user?.email || ""}
              readOnly
              style={{ cursor: "not-allowed", opacity: 0.7 }}
            />
            <p className="form-hint">
              To change your email, please contact support
            </p>
          </div>

          <div className="form-group" style={{ position: "relative" }}>
            <label className="form-label">Industry</label>
            <div
              onClick={() =>
                !isCustomIndustry &&
                setShowIndustryDropdown(!showIndustryDropdown)
              }
              className={`industry-dropdown-trigger ${
                showIndustryDropdown ? "active" : ""
              }`}
            >
              <span
                style={{ color: profileData.industry ? "#f3f4f6" : "#94a3b8" }}
              >
                {profileData.industry || "Select your industry..."}
              </span>
              <ChevronDown
                size={20}
                style={{
                  color: "#94a3b8",
                  transform: showIndustryDropdown
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              />
            </div>

            {showIndustryDropdown && (
              <div ref={dropdownRef} className="industry-dropdown-container">
                <div className="industry-dropdown-header">
                  <h4 className="industry-dropdown-title">Select Industry</h4>
                  <button
                    onClick={() => {
                      setShowIndustryDropdown(false);
                      setIsCustomIndustry(false);
                      setIndustrySearchTerm("");
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      padding: "0.25rem",
                      display: "flex",
                      borderRadius: "4px",
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="industry-search">
                  <input
                    type="text"
                    placeholder="Search industries..."
                    value={industrySearchTerm}
                    onChange={(e) => setIndustrySearchTerm(e.target.value)}
                  />
                </div>

                {isCustomIndustry && (
                  <div className="industry-custom-input">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Enter your industry..."
                      value={customIndustryInput}
                      onChange={(e) => setCustomIndustryInput(e.target.value)}
                      onKeyDown={handleCustomIndustryKeyDown}
                    />
                    <button
                      onClick={handleCustomIndustrySubmit}
                      className="industry-custom-confirm"
                    >
                      Confirm
                    </button>
                  </div>
                )}

                <div className="industry-list">
                  {filteredIndustries.map((group, groupIndex) => (
                    <div key={groupIndex}>
                      <div className="industry-group-header">{group.label}</div>
                      {group.options.map((option, optIndex) => (
                        <div
                          key={optIndex}
                          onClick={() => handleIndustrySelect(option)}
                          className={`industry-option ${
                            profileData.industry === option ? "selected" : ""
                          }`}
                        >
                          <span>{option}</span>
                          {profileData.industry === option && (
                            <Check size={16} style={{ color: "#10b981" }} />
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="form-hint">
              This helps us provide personalized insights and comparisons
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button
            onClick={() => setEditProfileOpen(false)}
            className="modal-btn modal-btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveProfile}
            className="modal-btn modal-btn-primary"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// Upgrade to Premium Modal Component
function UpgradePremiumModal({
  setUpgradePremiumOpen,
  selectedPlan,
  setSelectedPlan,
}) {
  const plans = [
    {
      id: "monthly",
      name: "Monthly",
      price: "£4.99",
      period: "/month",
      billingNote: "Billed Monthly",
      features: [
        "Unlimited pension tracking",
        "Advanced analytics",
        "Priority support",
        "Export reports",
        "Cancel anytime",
      ],
    },
    {
      id: "annual",
      name: "Annual",
      price: "£49.99",
      period: "/year",
      savings: "Save 17%",
      trialNote: "Free 7-day trial",
      popular: true,
      features: [
        "Everything in Monthly",
        "2 months free",
        "Early access to features",
        "Dedicated support",
        "Annual summary report",
      ],
    },
  ];

  const getButtonText = () => {
    if (selectedPlan === "annual") {
      return "Start 7-day free trial";
    }
    return "Subscribe - £4.99/mo";
  };

  const getFooterText = () => {
    if (selectedPlan === "annual") {
      return "Free for 7 days, then £49.99/year. Cancel anytime.";
    }
    return "A cup of coffee every month. Cancel anytime.";
  };

  return (
    <div className="modal-overlay" onClick={() => setUpgradePremiumOpen(false)}>
      <div
        className="modal-content-box modal-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Upgrade to Premium</h2>
            <p className="modal-subtitle">
              Unlock all features and take control of your finances
            </p>
          </div>
          <button
            onClick={() => setUpgradePremiumOpen(false)}
            className="modal-close"
          >
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="plans-grid">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`plan-card ${
                  selectedPlan === plan.id ? "selected" : ""
                } ${plan.popular ? "popular" : ""}`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.popular && (
                  <div className="plan-badge plan-badge-popular">
                    Most Popular
                  </div>
                )}
                {plan.savings && (
                  <div className="plan-badge plan-badge-savings">
                    {plan.savings}
                  </div>
                )}

                <div className="plan-header">
                  <h3 className="plan-name">{plan.name}</h3>
                  <div className="plan-price">
                    <span className="price-amount">{plan.price}</span>
                    <span className="price-period">{plan.period}</span>
                  </div>
                </div>

                <ul className="plan-features">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="plan-feature">
                      <Check size={16} className="feature-check" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="plan-billing-note">
                  {plan.trialNote || plan.billingNote}
                </div>
              </div>
            ))}
          </div>

          <div className="premium-benefits">
            <h3 className="benefits-title">Why upgrade?</h3>
            <div className="benefits-grid">
              <div className="benefit-item">
                <TrendingUp className="benefit-icon" size={24} />
                <div>
                  <h4>Advanced Analytics</h4>
                  <p>Deep insights into your financial health</p>
                </div>
              </div>
              <div className="benefit-item">
                <Shield className="benefit-icon" size={24} />
                <div>
                  <h4>Priority Support</h4>
                  <p>Get help when you need it most</p>
                </div>
              </div>
              <div className="benefit-item">
                <Sparkles className="benefit-icon" size={24} />
                <div>
                  <h4>Early Access</h4>
                  <p>Be first to try new features</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer-premium">
          <div className="modal-footer">
            <button
              onClick={() => setUpgradePremiumOpen(false)}
              className="modal-btn modal-btn-secondary"
            >
              Maybe Later
            </button>
            <button
              onClick={() => {
                console.log("Upgrading to:", selectedPlan);
                setUpgradePremiumOpen(false);
              }}
              className="modal-btn modal-btn-primary"
            >
              {getButtonText()}
            </button>
          </div>
          <div className="modal-footer-info">
            <p className="modal-footer-text">{getFooterText()}</p>
            <div className="modal-footer-links">
              <a href="#">Terms</a>
              <span className="separator">•</span>
              <a href="#">Privacy</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Report Problem Modal Component
function ReportProblemModal({
  setReportProblemOpen,
  reportData,
  setReportData,
  handleSendReport,
  isSubmittingReport,
}) {
  const problemTypes = [
    { id: "bug", label: "Bug Report", icon: AlertCircle },
    { id: "feature", label: "New Feature", icon: Lightbulb },
    { id: "question", label: "Question", icon: HelpCircle },
    { id: "other", label: "Other", icon: MessageSquare },
  ];

  return (
    <div className="modal-overlay" onClick={() => setReportProblemOpen(false)}>
      <div className="modal-content-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Report a Problem</h2>
          </div>
          <button
            onClick={() => setReportProblemOpen(false)}
            className="modal-close"
          >
            <X size={24} />
          </button>
        </div>

        <div className="modal-body modal-body-compact">
          <div className="form-group">
            <label className="form-label-1">
              What issue are you experiencing?
            </label>
            <div className="problem-types">
              {problemTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    className={`problem-type ${
                      reportData.type === type.id ? "selected" : ""
                    }`}
                    onClick={() =>
                      setReportData({ ...reportData, type: type.id })
                    }
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
              onChange={(e) =>
                setReportData({ ...reportData, subject: e.target.value })
              }
              placeholder="Brief description of the issue"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={reportData.description}
              onChange={(e) =>
                setReportData({ ...reportData, description: e.target.value })
              }
              placeholder="Please provide as much detail as possible..."
            />
          </div>

          <div className="form-note">
            <Info size={16} />
            <p>
              We typically respond within 24-48 hours. For urgent issues, please
              use live chat.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button
            onClick={() => setReportProblemOpen(false)}
            className="modal-btn modal-btn-secondary"
            disabled={isSubmittingReport}
          >
            Cancel
          </button>
          <button
            onClick={handleSendReport}
            className="modal-btn modal-btn-primary"
            disabled={
              !reportData.type ||
              !reportData.subject ||
              !reportData.description ||
              isSubmittingReport
            }
          >
            {isSubmittingReport ? "Sending..." : "Send Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
