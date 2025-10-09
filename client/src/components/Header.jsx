import React from 'react';
import './Header.css';

const Header = ({ onLoginClick }) => {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo">
          <span className="logo-icon">📊</span>
        </div>
        <div className="title">
          <h1>Communication Tracking System</h1>
          <p>Track and manage all your communications</p>
        </div>
      </div>
      <div className="header-right">
        <button className="login-btn" onClick={onLoginClick}>
          Generate Reports 
        </button>
      </div>
    </header>
  );
};

export default Header;