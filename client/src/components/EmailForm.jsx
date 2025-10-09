import React, { useState } from 'react';
import { emailService } from '../services/api.js';
import './EmailForm.css';

const EmailForm = () => {
  const [formData, setFormData] = useState({
    senderName: '',
    to: '',
    subject: '',
    body: '',
    type: 'Communication'
  });
  
  const [attachments, setAttachments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [savedLogId, setSavedLogId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

const handleDragOver = (e) => {
  e.preventDefault();
  setIsDragging(true);
};

const handleDragLeave = (e) => {
  e.preventDefault();
  setIsDragging(false);
};

const handleDrop = (e) => {
  e.preventDefault();
  setIsDragging(false);
  const files = Array.from(e.dataTransfer.files);
  
  // Process dropped files
  const filePromises = files.map(file => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          name: file.name,
          size: file.size,
          type: file.type,
          fileData: e.target.result.split(',')[1]
        });
      };
      reader.readAsDataURL(file);
    });
  });

  Promise.all(filePromises).then(newFiles => {
    setAttachments(prev => [...prev, ...newFiles]);
  });
};

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Read files as base64 and store with file info
    const filePromises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            name: file.name,
            size: file.size,
            type: file.type,
            fileData: e.target.result.split(',')[1] // Remove data:application/...;base64, prefix
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(filePromises).then(newFiles => {
      setAttachments(prev => [...prev, ...newFiles]);
    });

    e.target.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      // Log the email to our database with file data
      const response = await emailService.logEmail({
        ...formData,
        attachments
      });

      // Store the saved log ID for potential updates
      setSavedLogId(response.data.data.id);

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
      
      // Open Outlook IMMEDIATELY
      window.location.href = mailtoUrl;
      
      // Show confirmation dialog AFTER opening Outlook
      setTimeout(() => {
        setShowConfirmation(true);
      }, 1000);
      
    } catch (error) {
      console.error('Error logging email:', error);
      setMessage('Failed to log email. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleConfirmation = (confirmed) => {
    setShowConfirmation(false);
    
    if (confirmed) {
      setMessage('Thank you for confirming! Email was sent successfully.');
      
      // Reset form after confirmation
      setTimeout(() => {
        setFormData({
          senderName: '',
          to: '',
          subject: '',
          body: '',
          type: 'Communication'
        });
        setAttachments([]);
        setMessage('');
        setSavedLogId(null);
      }, 3000);
    } else {
      setMessage('Email was logged but marked as not sent.');
      setTimeout(() => setMessage(''), 5000);
    }
    
    setIsSubmitting(false);
  };

  const clearForm = () => {
    setFormData({
      senderName: '',
      to: '',
      subject: '',
      body: '',
      type: 'Communication'
    });
    setAttachments([]);
    setMessage('');
    setSavedLogId(null);
  };

  return (
    <div className="container">
      {/* <div className="header">
        <div className="header-icon">✉️</div>
        <h1>Email Form</h1>
      </div> */}
      
      <div className="form-container">
<div className="instructions">
  <p><strong>Attachment Instructions:</strong></p>
  <ol>
    <li>Files are saved to our tracking system</li>
    <li>Outlook will open with your email content</li>
    <li><strong>You must manually reattach the files in Outlook</strong></li>
    <li>Then send your email as usual</li>
  </ol>
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

        <div className="attachment-header">
          <label>Attachment:</label>
        </div>
      {/* Attachment Section (outside the form-group) */}
      <div
        className={`attachment-section ${isDragging ? 'dragging' : ''}`}
        onClick={() => document.getElementById('fileInput').click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >  
          <div className="file-input-wrapper">
            <input
              type="file"
              id="fileInput"
              multiple
              onChange={handleFileChange}
              style={{ display: 'none' }} // Hide the actual file input
            />
          </div>
          
          <div className="attachment-list">
            {attachments.length === 0 ? (
              <div className="no-attachments">
                <div className="click-instruction">Click anywhere in this area to add attachments</div>
                <div className="drag-instruction">or drag and drop files here</div>
              </div>
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
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering the file input when removing
                      removeAttachment(index);
                    }}
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
              {isSubmitting ? 'Opening...' : 'Open in Email Client'}
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
              <h3>Email Confirmation</h3>
              <p>Did you send this email in Outlook?</p>
              <div className="email-preview">
                <p><strong>From:</strong> {formData.senderName}</p>
                <p><strong>To:</strong> {formData.to}</p>
                <p><strong>Subject:</strong> {formData.subject}</p>
                <p><strong>Type:</strong> {formData.type}</p>
                {attachments.length > 0 && (
                  <p><strong>Attachments saved:</strong> {attachments.length} file(s)</p>
                )}
              </div>
              <div className="confirmation-buttons">
                <button 
                  onClick={() => handleConfirmation(true)}
                  className="confirm-yes"
                >
                  Yes, I sent it
                </button>
                <button 
                  onClick={() => handleConfirmation(false)}
                  className="confirm-no"
                >
                  No, I didn't send it
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