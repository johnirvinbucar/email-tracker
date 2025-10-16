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
    documentSubject: '',
    forwardedTo: '', 
    cof: '' 
  });
  
  const [attachments, setAttachments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [savedLogId, setSavedLogId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState(null);
  const [showTrackingPopup, setShowTrackingPopup] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState('Copy');

  const getMainHeader = () => {
    return communicationMode === 'Email' 
      ? 'Compose Email' 
      : 'Create Document';
  };

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
    if (mode === 'Email') {
      setFormData(prev => ({
        ...prev,
        docType: 'IAR',
        direction: 'OUT',
        remarks: '',
        documentSubject: '',
        forwardedTo: '', 
        cof: '' 
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

  // Copy tracking number to clipboard
  const copyTrackingNumber = async () => {
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setCopyButtonText('Copied!');
      setTimeout(() => {
        setCopyButtonText('Copy');
      }, 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = trackingNumber;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopyButtonText('Copied!');
      setTimeout(() => {
        setCopyButtonText('Copy');
      }, 2000);
    }
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

      const trackingNumber = response.data.data.tracking_number || 
                            response.data.data.trackingNumber ||
                            response.data.tracking_number;
      
      setSavedLogId(response.data.data.id);
      setTrackingNumber(trackingNumber);

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
        forwardedTo: formData.forwardedTo, 
        cof: formData.cof, 
        attachments
      };

      const response = await documentService.logDocument(documentData);
      const trackingNumber = response.data.data.tracking_number;

      setTrackingNumber(trackingNumber);
      setShowTrackingPopup(true);
      // setMessage(`Document record saved successfully!`);
      
      // Reset form after success but keep tracking number visible
      setTimeout(() => {
        setFormData(prev => ({
          ...prev,
          senderName: '',
          documentSubject: '',
          remarks: '',
          forwardedTo: '',
          cof: '' 
        }));
        setAttachments([]);
      }, 5000);
      
    } catch (error) {
      console.error('Error saving document record:', error);
      setMessage('Failed to save document record. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  const handleConfirmation = (confirmed) => {
    setShowConfirmation(false);
    
    if (confirmed) {
      // setMessage(`Thank you for confirming! Email was sent successfully.`);
      setShowTrackingPopup(true);
      
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
          documentSubject: '',
          forwardedTo: '', 
          cof: '' 
        });
        setAttachments([]);
        setMessage('');
        setSavedLogId(null);
      }, 5000);
    } else {
      setMessage(`Email was logged but marked as not sent.`);
      setShowTrackingPopup(true);
      setTimeout(() => {
        setMessage('');
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
      documentSubject: '',
      forwardedTo: '', // Reset new fields
      cof: '' // Reset new fields
    });
    setAttachments([]);
    setMessage('');
    setSavedLogId(null);
    setTrackingNumber(null);
    setShowTrackingPopup(false);
  };

  const closeTrackingPopup = () => {
    setShowTrackingPopup(false);
  };

  const mainHeader = getMainHeader();

  return (
    <div className="container">
      <div className="layout-container">
        {/* Left Sidebar */}
        <div className="sidebar">
          {/* Email-specific instructions */}
          {communicationMode === 'Email' && (
            <div className="instruction-panel">
              <div className="instruction-header">
                <h3>Attachment Instructions</h3>
              </div>
              <ul className="instruction-list">
                <li className="instruction-item">
                  <span className="checkmark">✓</span>
                  <span>Files are saved to our tracking system</span>
                </li>
                <li className="instruction-item">
                  <span className="checkmark">✓</span>
                  <span>Outlook will open with your email content</span>
                </li>
                <li className="instruction-item">
                  <span className="checkmark">✓</span>
                  <span><strong>You must manually reattach the files in Outlook</strong></span>
                </li>
                <li className="instruction-item">
                  <span className="checkmark">✓</span>
                  <span>Then send your email as usual</span>
                </li>
              </ul>
            </div>
          )}

          {/* Document-specific content */}
          {communicationMode === 'Document' && (
            <div className="document-info-panel">
              <div className="info-header">
                <span>ℹ️</span>
                <h3>Document Details</h3>
              </div>
              <div className="info-content">
                <p>Track and manage your documents efficiently. All uploaded files will be securely stored in our system with unique tracking numbers.</p>
                <div className="feature-list">
                  <div className="feature-item">
                    <span className="feature-icon">🔒</span>
                    <span>Secure storage</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">📊</span>
                    <span>Tracking numbers</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">⚡</span>
                    <span>Quick processing</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Form Area */}
        <div className="main-content-form">
          <div className="form-container">
            <div className="form-header">
              <h2>{mainHeader}</h2>
              <div className="form-subtitle">
                {communicationMode === 'Email' 
                  ? 'Create and send professional emails' 
                  : 'Record and track important documents'
                }
              </div>
            </div>
            
            {message && (
              <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}
            
            <form onSubmit={communicationMode === 'Email' ? handleEmailSubmit : handleNonEmailSubmit}>
              <div className="form-grid">
                {/* Communication Type Field */}
                <div className="form-group modern-form-group">
                  <label htmlFor="communicationMode" className="modern-label">
                    Communication Type
                  </label>
                  <select
                    id="communicationMode"
                    name="communicationMode"
                    value={communicationMode}
                    onChange={handleCommunicationModeChange}
                    className="modern-select"
                  >
                    <option value="Email">Email</option>
                    <option value="Document">Document</option>
                  </select>
                </div>

                {/* Sender Name Field */}
                <div className="form-group modern-form-group">
                  <label htmlFor="senderName" className="modern-label">
                    Name
                  </label>
                  <input
                    type="text"
                    id="senderName"
                    name="senderName"
                    value={formData.senderName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className="modern-input"
                    required
                  />
                </div>

                {/* Email Mode Fields */}
                {communicationMode === 'Email' && (
                  <>
                    {/* Type Field */}
                    <div className="form-group modern-form-group">
                      <label htmlFor="type" className="modern-label">
                        Email Type
                      </label>
                      <select
                        id="type"
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        className="modern-select"
                      >
                        <option value="Communication">Communication</option>
                        <option value="Memo">Memo</option>
                      </select>
                    </div>

                    <div className="form-group modern-form-group">
                      <label htmlFor="to" className="modern-label">
                        Recipient Email
                      </label>
                      <input
                        type="email"
                        id="to"
                        name="to"
                        value={formData.to}
                        onChange={handleInputChange}
                        placeholder="recipient@example.com"
                        className="modern-input"
                        required
                      />
                    </div>
                    
                    <div className="form-group modern-form-group full-width">
                      <label htmlFor="subject" className="modern-label">
                        Subject
                      </label>
                      <input
                        type="text"
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        placeholder="Enter email subject line"
                        className="modern-input"
                        required
                      />
                    </div>
                    
                    <div className="form-group modern-form-group full-width">
                      <label htmlFor="body" className="modern-label">
                        Message
                      </label>
                      <textarea
                        id="body"
                        name="body"
                        value={formData.body}
                        onChange={handleInputChange}
                        placeholder="Type your message here..."
                        className="modern-textarea"
                        required
                      />
                    </div>
                  </>
                )}

                {communicationMode === 'Document' && (
                  <>
                    <div className="form-group modern-form-group">
                      <label htmlFor="docType" className="modern-label">
                        Document Type
                      </label>
                      <select
                        id="docType"
                        name="docType"
                        value={formData.docType}
                        onChange={handleInputChange}
                        className="modern-select"
                      >
                        <option value="ARE">ARE</option>
                        <option value="BILLS">BILLS</option>
                        <option value="COMMU">COMMU</option>
                        <option value="IAR">IAR</option>
                        <option value="LEAVE">LEAVE</option>
                        <option value="NTP/CA">NTP/CA</option>
                        <option value="VOUCHER">VOUCHER</option>
                        <option value="TRAINING">TRAINING</option>
                      </select>
                    </div>

                    <div className="form-group modern-form-group">
                      <label htmlFor="direction" className="modern-label">
                        Direction
                      </label>
                      <select
                        id="direction"
                        name="direction"
                        value={formData.direction}
                        onChange={handleInputChange}
                        className="modern-select"
                      >
                        <option value="IN">IN</option>
                        <option value="OUT">OUT</option>
                      </select>
                    </div>

                    <div className="form-group modern-form-group full-width">
                      <label htmlFor="documentSubject" className="modern-label">
                        Document Subject
                      </label>
                      <input
                        type="text"
                        id="documentSubject"
                        name="documentSubject"
                        value={formData.documentSubject}
                        onChange={handleInputChange}
                        placeholder="Enter document subject or title"
                        className="modern-input"
                        required
                      />
                    </div>

                    {/* NEW: Forwarded to and C/of fields */}
                    <div className="form-group modern-form-group">
                      <label htmlFor="forwardedTo" className="modern-label">
                        Forwarded to
                      </label>
                      <input
                        type="text"
                        id="forwardedTo"
                        name="forwardedTo"
                        value={formData.forwardedTo}
                        onChange={handleInputChange}
                        placeholder="Enter forwarded to details"
                        className="modern-input"
                      />
                    </div>

                    <div className="form-group modern-form-group">
                      <label htmlFor="cof" className="modern-label">
                        C/of
                      </label>
                      <input
                        type="text"
                        id="cof"
                        name="cof"
                        value={formData.cof}
                        onChange={handleInputChange}
                        placeholder="Enter C/of details"
                        className="modern-input"
                      />
                    </div>

                    <div className="form-group modern-form-group full-width">
                      <label htmlFor="remarks" className="modern-label">
                        Remarks
                      </label>
                      <textarea
                        id="remarks"
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleInputChange}
                        placeholder="Additional notes, comments, or description..."
                        rows="4"
                        className="modern-textarea"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Attachment Section */}
              <div className="modern-attachment-section">
                <div className="attachment-header-modern">
                  <label>Attachments</label>
                  <span className="attachment-count">
                    {attachments.length} file{attachments.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div
                  className={`attachment-zone ${isDragging ? 'dragging' : ''} ${attachments.length > 0 ? 'has-files' : ''}`}
                  onClick={() => document.getElementById('fileInput').click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >  
                  <input
                    type="file"
                    id="fileInput"
                    multiple
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  
                  {attachments.length === 0 ? (
                    <div className="empty-attachment-state">
                      <div className="upload-text">
                        <div className="upload-title">Drop files here or click to upload</div>
                        <div className="upload-subtitle">Supports all file types</div>
                      </div>
                    </div>
                  ) : (
                    <div className="attachment-grid">
                      {attachments.map((file, index) => (
                        <div key={index} className="attachment-card">
                          <div className="file-info">
                            <div className="file-name">{file.name}</div>
                            <div className="file-size">{(file.size / 1024).toFixed(2)} KB</div>
                          </div>
                          <button
                            type="button"
                            className="remove-file"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAttachment(index);
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="modern-button-group">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={`modern-primary-btn ${isSubmitting ? 'submitting' : ''}`}
                >
                  <span className="btn-icon">
                    {communicationMode === 'Email'}
                  </span> 
                  <span className="btn-text">
                    {isSubmitting 
                      ? (communicationMode === 'Email' ? 'Opening...' : 'Saving...')
                      : (communicationMode === 'Email' ? 'Save Record' : 'Save Record')
                    }
                  </span>
                </button>
                <button 
                  type="button" 
                  className="modern-secondary-btn" 
                  onClick={clearForm}
                >
                  <span className="btn-text">Clear Form</span>
                </button>
              </div>
            </form>

            {/* Tracking Number Popup */}
            {showTrackingPopup && trackingNumber && (
              <div className="tracking-popup-overlay">
                <div className="tracking-popup">
                  <div className="tracking-popup-header">
                    <div className="tracking-icon">📋</div>
                    <h3>Tracking Number Generated</h3>
                    <button 
                      className="tracking-close-btn"
                      onClick={closeTrackingPopup}
                    >
                      ×
                    </button>
                  </div>
                  <div className="tracking-content">
                    <p className="tracking-label">Your tracking number has been generated successfully:</p>
                    <div className="tracking-number-container">
                      <span className="tracking-number">{trackingNumber}</span>
                      <button 
                        className="copy-tracking-btn"
                        onClick={copyTrackingNumber}
                      >
                        <span className="copy-icon">📄</span>
                        {copyButtonText}
                      </button>
                    </div>
                    <p className="tracking-note">
                      Please save this tracking number for future reference. 
                      You can use it to track the status of your {communicationMode.toLowerCase()}.
                    </p>
                  </div>
                  <div className="tracking-popup-actions">
                    <button 
                      className="tracking-ok-btn"
                      onClick={closeTrackingPopup}
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Confirmation Dialog (Email mode only) */}
            {showConfirmation && communicationMode === 'Email' && (
              <div className="confirmation-overlay">
                <div className="modern-confirmation-dialog">
                  <div className="confirmation-header">
                    <div className="confirmation-icon">✉️</div>
                    <h3>Email Sent Confirmation</h3>
                  </div>
                  <p>Did you successfully send this email in Outlook?</p>
                  <div className="email-details">
                    <div className="detail-row">
                      <span className="detail-label">Tracking Number:</span>
                      <span className="detail-value">{trackingNumber}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">From:</span>
                      <span className="detail-value">{formData.senderName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">To:</span>
                      <span className="detail-value">{formData.to}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Subject:</span>
                      <span className="detail-value">{formData.subject}</span>
                    </div>
                    {attachments.length > 0 && (
                      <div className="detail-row">
                        <span className="detail-label">Attachments:</span>
                        <span className="detail-value">{attachments.length} file(s) saved</span>
                      </div>
                    )}
                  </div>
                  <div className="modern-confirmation-buttons">
                    <button 
                      onClick={() => handleConfirmation(true)}
                      className="confirm-success"
                    >
                      <span>✓</span> Yes, I sent it
                    </button>
                    <button 
                      onClick={() => handleConfirmation(false)}
                      className="confirm-cancel"
                    >
                      <span>✕</span> No, I didn't send it
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailForm;