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
} from "react-icons/fi";
import { FaBars, FaChevronDown } from "react-icons/fa";
import { TestTube2, Eye } from "lucide-react";
import "./Navbar.css";
import { useAuth } from "../contexts/AuthContext";
import { useDemoMode } from "../contexts/DemoModeContext";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { currentUser, signInWithGoogle, logout } = useAuth();
  const { isDemoMode, toggleDemoMode } = useDemoMode();
  const menuRef = useRef(null);
  const userMenuRef = useRef(null);
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
      document.body.classList.add("collapsed");
    } else {
      document.body.classList.remove("collapsed");
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
    { to: "/", label: "Home", icon: <FiHome /> },
    {
      to: "/PensionBuilderNEW",
      label: "Income Tax Modeller",
      icon: <FiPieChart />,
    },
    { to: "/PensionPots", label: "Pension Dashboard", icon: <FiBriefcase /> },
    {
      to: "/MortgageCalcNEW",
      label: "Mortgage Calculator",
      icon: <FiTrendingUp />,
    },
    { to: "/SavingsTracker", label: "Savings Tracker", icon: <FiDatabase /> },
    { to: "/debt-manager", label: "Debt Manager", icon: <FiCreditCard /> },
  ];

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

  return (
    <nav className="sidebar">
      <div className="sidebar-top-wrapper">
        <Link to="/" className="logo__wrapper">
          <img
            src="/moneymoves-logo-only.png"
            alt="Logo"
            className="logo-small"
          />
          <span className={`company-name ${collapsed ? "hide" : ""}`}>
            MoneyMoves
          </span>
        </Link>
        <button
          className="expand-btn"
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M9.99021 13.28L5.64354 8.93333C5.13021 8.42 5.13021 7.58 5.64354 7.06667L9.99021 2.72"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="sidebar-links">
        <ul>
          {navLinks.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={location.pathname === link.to ? "active" : ""}
                data-tooltip={collapsed ? link.label : ""}
              >
                <span className="icon">{link.icon}</span>
                <span className={`link ${collapsed ? "hide" : ""}`}>
                  {link.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="separator separator--top"></div>

      <div className="sidebar__profile">
        {currentUser ? (
          <>
            <img
              className="avatar"
              src={currentUser.photoURL || 'https://via.placeholder.com/40'}
              alt={currentUser.displayName || 'User'}
            />
            <div className={`avatar__name ${collapsed ? "hide" : ""}`}>
              <div className="user-name">{currentUser.displayName?.split(" ")[0] || 'User'}</div>
              <div className="email">{currentUser.email}</div>
            </div>
            <div className="user-menu-wrapper" ref={userMenuRef}>
              <button
                className={`user-menu-btn ${collapsed ? "hide" : ""}`}
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-label="User menu"
              >
                <FiMenu size={20} />
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
          </>
        ) : (
          <button
            className="auth-button login-button"
            onClick={handleAuthClick}
            style={{ color: "#e5e7eb", background: "none", border: "none" }}
          >
            <FiLogIn size={16} style={{ marginRight: "6px" }} />
            <span className={collapsed ? "hide" : ""}>Login</span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
