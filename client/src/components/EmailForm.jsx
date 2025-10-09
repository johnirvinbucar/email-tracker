import React, { useState } from 'react';
import { emailService } from '../services/api.js';
import './EmailForm.css';

const EmailForm = () => {
  const [formData, setFormData] = useState({
    senderName: '',
    to: '',
    subject: '',
    body: 'Hello,\n\nI hope this email finds you well.\n\nBest regards,\n[Your Name]',
    type: 'Communication'
  });
  
  const [attachments, setAttachments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [tempFormData, setTempFormData] = useState(null); // Store form data temporarily

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Show confirmation dialog FIRST
    setShowConfirmation(true);
  };

  const handleConfirmation = async (confirmed) => {
    setShowConfirmation(false);
    
    if (confirmed) {
      setIsSubmitting(true);
      setMessage('');

      try {
        // Log the email to our database
        await emailService.logEmail({
          ...formData,
          attachments
        });

        // Create mailto URL for Outlook
        let mailtoUrl = `mailto:${encodeURIComponent(formData.to)}`;
        mailtoUrl += `?subject=${encodeURIComponent(formData.subject)}`;
        
        // Add attachment note to body if there are attachments
        let finalBody = formData.body;
        if (attachments.length > 0) {
          finalBody += '\n\n---\nAttachments:\n';
          attachments.forEach(file => {
            finalBody += `- ${file.name}\n`;
          });
          finalBody += '\nPlease remember to manually attach these files in your email client.';
        }
        
        mailtoUrl += `&body=${encodeURIComponent(finalBody)}`;
        
        // Open Outlook
        window.location.href = mailtoUrl;
        
        setMessage('Email logged successfully! Opening Outlook...');
        
        // Reset form after successful submission
        setTimeout(() => {
          setFormData({
            senderName: '',
            to: '',
            subject: '',
            body: 'Hello,\n\nI hope this email finds you well.\n\nBest regards,\n[Your Name]',
            type: 'Communication'
          });
          setAttachments([]);
          setMessage('');
        }, 3000);
        
      } catch (error) {
        console.error('Error logging email:', error);
        setMessage('Failed to log email. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // User canceled - don't do anything
      setMessage('Email submission canceled.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const clearForm = () => {
    setFormData({
      senderName: '',
      to: '',
      subject: '',
      body: 'Hello,\n\nI hope this email finds you well.\n\nBest regards,\n[Your Name]',
      type: 'Communication'
    });
    setAttachments([]);
    setMessage('');
  };

  return (
    <div className="container">
      <div className="header">
        <div className="header-icon">✉️</div>
        <h1>Communication Tracking System</h1>
      </div>
      
      <div className="form-container">
        <div className="instructions">
          <p><strong>Note about attachments:</strong> Files are logged for tracking but cannot be automatically attached due to browser security restrictions. You'll need to manually attach them in your email client.</p>
        </div>
        
        {message && (
          <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Sender Name Field */}
          <div className="form-group">
            <label htmlFor="senderName">Your Name:</label>
            <input
              type="text"
              id="senderName"
              name="senderName"
              value={formData.senderName}
              onChange={handleInputChange}
              placeholder="Enter your name"
              required
            />
          </div>

          {/* Type Field */}
          <div className="form-group">
            <label htmlFor="type">Type:</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="type-select"
            >
              <option value="Communication">Communication</option>
              <option value="Memo">Memo</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="to">To:</label>
            <input
              type="email"
              id="to"
              name="to"
              value={formData.to}
              onChange={handleInputChange}
              placeholder="recipient@example.com"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="subject">Subject:</label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              placeholder="Email subject"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="body">Message:</label>
            <textarea
              id="body"
              name="body"
              value={formData.body}
              onChange={handleInputChange}
              placeholder="Type your message here..."
              required
            />
          </div>
          
          <div className="attachment-section">
            <div className="attachment-header">
              <div className="attachment-icon">📎</div>
              <h3>Attachments</h3>
            </div>
            
            <div className="file-input-wrapper">
              <button type="button" className="file-input-button">
                <span>➕</span> Add Attachment
              </button>
              <input
                type="file"
                id="fileInput"
                multiple
                onChange={handleFileChange}
              />
            </div>
            
            <div className="attachment-list">
              {attachments.length === 0 ? (
                <div className="no-attachments">No attachments selected</div>
              ) : (
                attachments.map((file, index) => (
                  <div key={index} className="attachment-item">
                    <div className="attachment-info">
                      <span className="attachment-name">{file.name}</span>
                      <span className="attachment-size">
                        {(file.size / 1024).toFixed(2)} KB
                      </span>
                    </div>
                    <button
                      type="button"
                      className="remove-attachment"
                      onClick={() => removeAttachment(index)}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="button-group">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={isSubmitting ? 'submitting' : ''}
            >
              <span>📧</span> 
              {isSubmitting ? 'Logging...' : 'Open in Email Client'}
            </button>
            <button 
              type="button" 
              className="secondary" 
              onClick={clearForm}
            >
              <span>🗑️</span> Clear Form
            </button>
          </div>
        </form>

        {/* Confirmation Dialog */}
        {showConfirmation && (
          <div className="confirmation-overlay">
            <div className="confirmation-dialog">
              <h3>Confirm Email</h3>
              <p>Are you ready to send this email?</p>
              <div className="email-preview">
                <p><strong>From:</strong> {formData.senderName}</p>
                <p><strong>To:</strong> {formData.to}</p>
                <p><strong>Subject:</strong> {formData.subject}</p>
                <p><strong>Type:</strong> {formData.type}</p>
                {attachments.length > 0 && (
                  <p><strong>Attachments:</strong> {attachments.length} file(s)</p>
                )}
              </div>
              <div className="confirmation-buttons">
                <button 
                  onClick={() => handleConfirmation(true)}
                  className="confirm-yes"
                >
                  Yes, Open Outlook
                </button>
                <button 
                  onClick={() => handleConfirmation(false)}
                  className="confirm-no"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailForm;