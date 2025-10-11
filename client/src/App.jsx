import React, { useState } from 'react';
import EmailForm from './components/EmailForm.jsx';
import Header from './components/Header.jsx';
import ReportsPage from './components/ReportsPage.jsx';
import Footer from './components/Footer.jsx'; 
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('form');

  const handleHeaderButtonClick = () => {
    if (currentPage === 'form') {
      setCurrentPage('reports');
    } else {
      setCurrentPage('form');
    }
  };

  return (
    <div className="App">
      <Header 
        currentPage={currentPage} 
        onHeaderButtonClick={handleHeaderButtonClick} 
      />
      
      <main className="main-content">
        {currentPage === 'form' ? (
          <div className="form-page-container">
            <EmailForm />
          </div>
        ) : (
          <div className="admin-container">
            <ReportsPage />
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}

export default App;