import React from 'react';
import './Header.css';

const Header = ({ currentPage, onHeaderButtonClick }) => {
  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          <div className="logo">
            <img src="/logo.png" alt="Communication Tracking System" className="logo-image" />
          </div>
          <div className="title">
            <h1>Communication Tracking System</h1>
            <p>Track and manage all your communications</p>
          </div>
        </div>
        <div className="header-right">
          <button 
            className={`header-action-btn ${currentPage === 'reports' ? 'back-btn' : 'reports-btn'}`}
            onClick={onHeaderButtonClick}
          >
            {currentPage === 'reports' ? (
              <>
                <span className="btn-icon">←</span>
                Back to Form
              </>
            ) : (
              <>
                Generate Reports
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;