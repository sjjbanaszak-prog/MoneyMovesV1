import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiLogIn,
  FiLogOut,
  FiHome,
  FiPieChart,
  FiBriefcase,
  FiTrendingUp,
  FiDatabase,
  FiBarChart2,
  FiMenu,
  FiUser,
  FiCreditCard,
  FiBell,
  FiSearch,
  FiMessageSquare,
} from "react-icons/fi";
import { FaBars, FaChevronDown } from "react-icons/fa";
import { TestTube2, Eye } from "lucide-react";
import "./Navbar.css";
import { useAuth } from "../contexts/AuthContext";
import { useDemoMode } from "../contexts/DemoModeContext";
import { useReportProblem } from "../contexts/ReportProblemContext";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { currentUser, signInWithGoogle, logout } = useAuth();
  const { isDemoMode, toggleDemoMode } = useDemoMode();
  const { openReportProblem } = useReportProblem();
  const menuRef = useRef(null);
  const userMenuRef = useRef(null);
  const searchInputRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleMenu = () => {
    if (menuOpen) {
      setClosing(true);
      setTimeout(() => {
        setMenuOpen(false);
        setClosing(false);
      }, 300);
    } else {
      setMenuOpen(true);
    }
  };

  const closeMenuImmediately = () => {
    setMenuOpen(false);
    setClosing(false);
  };

  const handleAuthClick = () => {
    if (currentUser) logout();
    else signInWithGoogle();
    closeMenuImmediately();
  };

  const handleAccountClick = () => {
    setUserMenuOpen(false);
    navigate("/account-settings");
    closeMenuImmediately();
  };

  const handleDemoModeClick = () => {
    setUserMenuOpen(false);
    closeMenuImmediately();
    toggleDemoMode();
  };

  const handleSignOut = () => {
    setUserMenuOpen(false);
    closeMenuImmediately();
    logout();
    navigate("/login");
  };

  const handleFeedbackClick = (e) => {
    e.preventDefault();
    openReportProblem();
  };

  const handleSearchClick = () => {
    if (collapsed) {
      setCollapsed(false);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 300);
    } else {
      searchInputRef.current?.focus();
    }
  };

  const handleSearchInputClick = (e) => {
    e.stopPropagation();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        if (menuOpen) {
          setClosing(true);
          setTimeout(() => {
            setMenuOpen(false);
            setClosing(false);
          }, 300);
        }
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (collapsed) {
      document.body.classList.add("sidebar-collapsed");
    } else {
      document.body.classList.remove("sidebar-collapsed");
    }
  }, [collapsed]);

  const iconState = menuOpen || closing ? "down" : "hamburger";
  const iconClass = closing ? "up" : iconState;

  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024;
    }
    return false;
  });

  useEffect(() => {
    const checkScreenSize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const navLinks = [
    {
      to: "/",
      label: "Dashboard",
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
        </svg>
      )
    },
    {
      to: "/PensionBuilderNEW",
      label: "Income",
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      to: "/PensionPots",
      label: "Pension",
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      to: "/MortgageCalcNEW",
      label: "Mortgage",
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      to: "/SavingsTracker",
      label: "Savings",
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      to: "/debt-manager",
      label: "Debt",
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    },
    {
      to: "/income-new",
      label: "Income NEW",
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  ];

  // Mobile navigation (unchanged)
  if (!isDesktop) {
    return (
      <nav className="navbar dark-mode" ref={menuRef}>
        <div className="navbar-left">
          <button
            className={`hamburger ${iconClass}`}
            onClick={toggleMenu}
            aria-label="Menu"
          >
            <span className="icon-wrapper">
              {iconState === "hamburger" ? <FaBars /> : <FaChevronDown />}
            </span>
          </button>
        </div>

        <div className={`navbar-links ${menuOpen ? "active" : ""}`}>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="nav-link"
              onClick={closeMenuImmediately}
            >
              {link.label}
            </Link>
          ))}

          <div className="menu-separator"></div>

          {currentUser ? (
            <div className="user-profile">
              <img
                src={currentUser.photoURL || 'https://via.placeholder.com/40'}
                alt={currentUser.displayName || 'User'}
                className="user-avatar"
              />
              <div className="user-info">
                <div className="user-name">
                  <strong>{currentUser.displayName?.split(" ")[0] || 'User'}</strong>
                </div>
                <div className="user-email">{currentUser.email}</div>
              </div>
              <div className="user-menu-wrapper-mobile" ref={userMenuRef}>
                <button
                  className="logout-icon"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-label="User menu"
                >
                  <FiMenu size={18} />
                </button>

                {userMenuOpen && (
                  <div className="user-dropdown-menu">
                    <button
                      onClick={handleAccountClick}
                      className="user-dropdown-item"
                    >
                      <FiUser size={18} />
                      <span>Account</span>
                    </button>

                    <button
                      onClick={handleDemoModeClick}
                      className="user-dropdown-item"
                    >
                      {isDemoMode ? <Eye size={18} /> : <TestTube2 size={18} />}
                      <span>{isDemoMode ? 'Live Mode' : 'Demo Mode'}</span>
                    </button>

                    <div className="user-dropdown-separator" />

                    <button
                      onClick={handleSignOut}
                      className="user-dropdown-item user-dropdown-item-danger"
                    >
                      <FiLogOut size={18} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              className="auth-button login-button"
              onClick={handleAuthClick}
            >
              <FiLogIn size={16} style={{ marginRight: "6px" }} />
              Login
            </button>
          )}
        </div>

        <img
          src="/moneymoves-logo-inverted.png"
          alt="MoneyMoves Logo"
          className="navbar-logo"
        />
      </nav>
    );
  }

  // Desktop navigation with new topbar + sidebar design
  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-logo-section">
          <Link to="/" className="topbar-logo-link">
            <img
              src="/moneymoves-logo-only.png"
              alt="MoneyMoves Logo"
              className="topbar-logo-img"
            />
          </Link>
          <div className="topbar-logo-text">MoneyMoves</div>
        </div>

        <div className="topbar-right">
          <div className="notification-icon">
            <FiBell size={18} />
            <div className="notification-badge">3</div>
          </div>

          {currentUser ? (
            <div className="topbar-profile-wrapper" ref={userMenuRef}>
              <button
                className="topbar-profile-button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-label="User menu"
              >
                <img
                  src={currentUser.photoURL || 'https://via.placeholder.com/40'}
                  alt={currentUser.displayName || 'User'}
                />
              </button>

              {userMenuOpen && (
                <div className="user-dropdown-menu topbar-dropdown">
                  <button
                    onClick={handleAccountClick}
                    className="user-dropdown-item"
                  >
                    <FiUser size={18} />
                    <span>Account</span>
                  </button>

                  <button
                    onClick={handleDemoModeClick}
                    className="user-dropdown-item"
                  >
                    {isDemoMode ? <Eye size={18} /> : <TestTube2 size={18} />}
                    <span>{isDemoMode ? 'Live Mode' : 'Demo Mode'}</span>
                  </button>

                  <div className="user-dropdown-separator" />

                  <button
                    onClick={handleSignOut}
                    className="user-dropdown-item user-dropdown-item-danger"
                  >
                    <FiLogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="topbar-login-button"
              onClick={handleAuthClick}
            >
              <FiLogIn size={16} />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <nav className={`new-sidebar ${collapsed ? "collapsed" : ""}`}>
        <button
          className="collapse-toggle"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>

        <div className="search-box" onClick={handleSearchClick}>
          <FiSearch className="search-icon" size={16} />
          <input
            ref={searchInputRef}
            type="text"
            className="search-text"
            placeholder="Search"
            onClick={handleSearchInputClick}
          />
          <span className="shortcut">⌘ K</span>
        </div>

        <div className="nav-section">
          <ul>
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`nav-item ${location.pathname === link.to ? "active" : ""}`}
                  data-tooltip={link.label}
                >
                  <span className="nav-icon">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="feedback-section">
          <a
            href="#"
            className="nav-item"
            data-tooltip="Feedback"
            onClick={handleFeedbackClick}
          >
            <span className="nav-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </span>
            <span>Feedback</span>
          </a>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
