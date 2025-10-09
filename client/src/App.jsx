import React, { useState } from 'react';
import EmailForm from './components/EmailForm.jsx';
import Header from './components/Header.jsx';
import ReportsPage from './components/ReportsPage.jsx';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('form');

  const handleLoginClick = () => {
    setCurrentPage('reports');
  };

  const handleBackToForm = () => {
    setCurrentPage('form');
  };

  return (
    <div className="App">
      <Header onLoginClick={handleLoginClick} />
      
      {currentPage === 'form' ? (
        <EmailForm />
      ) : (
        <div className="admin-container">
          <div className="admin-header">
            <button className="back-btn" onClick={handleBackToForm}>
              <span>←</span>  
              Back to Form
            </button>
          </div>
          <ReportsPage />
        </div>
      )}
    </div>
  );
}

export default App;