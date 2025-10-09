import React, { useState } from 'react';
import { emailService, documentService  } from '../services/api.js';

import './EmailForm.css';
const EmailForm = () => {
  const [communicationMode, setCommunicationMode] = useState('Email');
  const [formData, setFormData] = useState({
    senderName: '',
    to: '',
    subject: '',
    body: '',
    type: 'Communication',
    docType: 'IAR',
    direction: 'OUT',
    remarks: '',
    documentSubject: ''
  });
  
  const [attachments, setAttachments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [savedLogId, setSavedLogId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState(null); // ADD THIS LINE

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
const handleCommunicationModeChange = (e) => {
  const mode = e.target.value;
  setCommunicationMode(mode);
  // Reset form data when switching modes
  if (mode === 'Email') {
    setFormData(prev => ({
      ...prev,
      docType: 'IAR',
      direction: 'OUT',
      remarks: '',
      documentSubject: '' // NEW: Clear document subject when switching to Email
    }));
  } else {
    setFormData(prev => ({
      ...prev,
      to: '',
      subject: '',
      body: ''
    }));
  }
};

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
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

    e.target.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

const handleEmailSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  setMessage('');

  try {
    const response = await emailService.logEmail({
      ...formData,
      category: 'Email',
      attachments
    });

        console.log('Full response:', response); // Debug log
    console.log('Response data:', response.data); // Debug log

        // Try different property names
    const trackingNumber = response.data.data.tracking_number || 
                          response.data.data.trackingNumber ||
                          response.data.tracking_number;
    
    console.log('Tracking number found:', trackingNumber); // Debug log

    setSavedLogId(response.data.data.id);
    setTrackingNumber(trackingNumber); // Now this will work

    let mailtoUrl = `mailto:${encodeURIComponent(formData.to)}`;
    mailtoUrl += `?subject=${encodeURIComponent(formData.subject)}`;
    
    let finalBody = formData.body;
    if (attachments.length > 0) {
      finalBody += '\n\n---\nAttachments:\n';
      attachments.forEach(file => {
        finalBody += `- ${file.name}\n`;
      });
      finalBody += '\nPlease remember to manually attach these files in your email client.';
    }
    
    mailtoUrl += `&body=${encodeURIComponent(finalBody)}`;
    
    window.location.href = mailtoUrl;
    
    setTimeout(() => {
      setShowConfirmation(true);
    }, 1000);
    
  } catch (error) {
    console.error('Error logging email:', error);
    setMessage('Failed to log email. Please try again.');
    setIsSubmitting(false);
  }
};

  // Update the handleNonEmailSubmit function:
  const handleNonEmailSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      const documentData = {
        senderName: formData.senderName,
        docType: formData.docType,
        documentSubject: formData.documentSubject,
        direction: formData.direction,
        remarks: formData.remarks,
        attachments
      };

      const response = await documentService.logDocument(documentData);
      const trackingNumber = response.data.data.tracking_number;

      setMessage(`Document record saved successfully! Tracking Number: ${trackingNumber}`);
      
      // Reset form after success
      setTimeout(() => {
        setFormData(prev => ({
          ...prev,
          senderName: '',
          documentSubject: '',
          remarks: ''
        }));
        setAttachments([]);
        setMessage('');
      }, 5000); // Increased timeout to show tracking number
      
    } catch (error) {
      console.error('Error saving document record:', error);
      setMessage('Failed to save document record. Please try again.');
    }
    
    setIsSubmitting(false);
  };
const handleConfirmation = (confirmed) => {
  setShowConfirmation(false);
  
  if (confirmed) {
    setMessage(`Thank you for confirming! Email was sent successfully. Tracking Number: ${trackingNumber}`);
    
    setTimeout(() => {
      setFormData({
        senderName: '',
        to: '',
        subject: '',
        body: '',
        type: 'Communication',
        docType: 'IAR',
        direction: 'OUT',
        remarks: '',
        documentSubject: ''
      });
      setAttachments([]);
      setMessage('');
      setSavedLogId(null);
      setTrackingNumber(null); // Reset tracking number
    }, 5000);
  } else {
    setMessage(`Email was logged but marked as not sent. Tracking Number: ${trackingNumber}`);
    setTimeout(() => {
      setMessage('');
      setTrackingNumber(null); // Reset tracking number
    }, 5000);
  }
  
  setIsSubmitting(false);
};


const clearForm = () => {
  setFormData({
    senderName: '',
    to: '',
    subject: '',
    body: '',
    type: 'Communication',
    docType: 'IAR',
    direction: 'OUT',
    remarks: '',
    documentSubject: ''
  });
  setAttachments([]);
  setMessage('');
  setSavedLogId(null);
  setTrackingNumber(null); // ADD THIS LINE
};

  return (
    <div className="container">
      <div className="form-container">
        {/* Communication Type Section */}
        <div className="mode-section">
          <div className="mode-header">
            <h2>{communicationMode === 'Email' ? '📧 Email Communication' : '📄 Document Record'}</h2>
          </div>
          
          {communicationMode === 'Email' && (
            <div className="instructions">
              <p><strong>Attachment Instructions:</strong></p>
              <ol>
                <li>Files are saved to our tracking system</li>
                <li>Outlook will open with your email content</li>
                <li><strong>You must manually reattach the files in Outlook</strong></li>
                <li>Then send your email as usual</li>
              </ol>
            </div>
          )}
        </div>
        
        {message && (
          <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
        
        <form onSubmit={communicationMode === 'Email' ? handleEmailSubmit : handleNonEmailSubmit}>
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

          {/* Communication Type Field */}
          <div className="form-group">
            <label htmlFor="communicationMode">Communication Type:</label>
            <select
              id="communicationMode"
              name="communicationMode"
              value={communicationMode}
              onChange={handleCommunicationModeChange}
              className="type-select"
            >
              <option value="Email">Email</option>
              <option value="Document">Document</option>
            </select>
          </div>

          {/* Email Mode Fields */}
          {communicationMode === 'Email' && (
            <>
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
            </>
          )}

          {communicationMode === 'Document' && (
            <>
              <div className="form-group">
                <label htmlFor="docType">Document Type:</label>
                <select
                  id="docType"
                  name="docType"
                  value={formData.docType}
                  onChange={handleInputChange}
                  className="type-select"
                >
                  <option value="IAR">IAR</option>
                  <option value="ARE">ARE</option>
                  <option value="PAAS">PAAS</option>
                  <option value="BILLS">BILLS</option>
                  <option value="LEAVE">LEAVE</option>
                  <option value="NTP">NTP</option>
                </select>
              </div>

              {/* NEW: Document Subject Field */}
              <div className="form-group">
                <label htmlFor="documentSubject">Subject:</label>
                <input
                  type="text"
                  id="documentSubject"
                  name="documentSubject"
                  value={formData.documentSubject}
                  onChange={handleInputChange}
                  placeholder="Enter document subject"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="direction">Direction:</label>
                <select
                  id="direction"
                  name="direction"
                  value={formData.direction}
                  onChange={handleInputChange}
                  className="type-select"
                >
                  <option value="IN">IN</option>
                  <option value="OUT">OUT</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="remarks">Remarks:</label>
                <textarea
                  id="remarks"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  placeholder="Additional notes or comments..."
                  rows="3"
                />
              </div>
            </>
          )}

          {/* Attachment Section (Common for both modes) */}
          <div className="attachment-header">
            <label>Attachment:</label>
          </div>
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
                style={{ display: 'none' }}
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
                        e.stopPropagation();
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
              <span>{communicationMode === 'Email' ? '📧' : '💾'}</span> 
              {isSubmitting 
                ? (communicationMode === 'Email' ? 'Opening...' : 'Saving...')
                : (communicationMode === 'Email' ? 'Open in Email Client' : 'Save Record')
              }
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

        {/* Confirmation Dialog (Email mode only) */}
          {showConfirmation && communicationMode === 'Email' && (
            <div className="confirmation-overlay">
              <div className="confirmation-dialog">
                <h3>Email Confirmation</h3>
                <p>Did you send this email in Outlook?</p>
                <div className="email-preview">
                  <p><strong>Tracking Number:</strong> {trackingNumber}</p> {/* Add this line */}
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