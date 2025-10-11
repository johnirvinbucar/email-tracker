import React, { useState, useEffect } from 'react';
import { emailService, documentService, statusService } from '../services/api';
import './ReportsPage.css';

const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [emailStats, setEmailStats] = useState({});
  const [documentStats, setDocumentStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: 'all',
    startDate: '',
    endDate: '',
    sender: '',
    searchTerm: '',
    status: 'all'
  });
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [statusHistory, setStatusHistory] = useState([]);
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    direction: '',
    remarks: '',
    updatedBy: ''
  });
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadReports();
    loadStats();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const [emailResponse, documentResponse] = await Promise.all([
        emailService.getLogs(1, 1000),
        documentService.getLogs(1, 1000)
      ]);

      const emailLogs = emailResponse.data.data.logs.map(log => ({
        ...log,
        recordType: 'email',
        displayType: log.type,
        recipient: log.to_email,
        timestamp: log.created_at,
        documentType: 'Email',
        currentDirection: log.direction
      }));

      const documentLogs = documentResponse.data.data.logs.map(log => ({
        ...log,
        recordType: 'document',
        displayType: log.doc_type,
        documentType: log.doc_type,
        recipient: log.direction,
        timestamp: log.created_at,
        subject: log.document_subject,
        currentDirection: log.direction
      }));

      const allReports = [...emailLogs, ...documentLogs].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );

      setReports(allReports);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [emailResponse, documentResponse] = await Promise.all([
        emailService.getStats(),
        documentService.getStats()
      ]);
      setEmailStats(emailResponse.data.data);
      setDocumentStats(documentResponse.data.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadStatusHistory = async (recordId, recordType) => {
    try {
      const response = await statusService.getStatusHistory(recordId, recordType);
      return response.data.data;
    } catch (error) {
      console.error('Error loading status history:', error);
      return [];
    }
  };

  const handleViewDetails = async (report) => {
    setSelectedReport(report);
    setShowDetailsModal(true);
    
    // Load status history from API
    const apiStatusHistory = await loadStatusHistory(report.id, report.recordType);
    
    // Create combined status history with document remarks as first entry
    let combinedStatusHistory = [...apiStatusHistory];
    
    // For documents, add the remarks as the initial status history entry
    if (report.recordType === 'document' && report.remarks) {
      const initialRemarksEntry = {
        id: -1, // Special ID for initial remarks
        status: 'Created',
        direction: report.direction || '',
        remarks: report.remarks,
        created_at: report.timestamp,
        created_by: report.sender_name || 'System',
        is_initial_remarks: true
      };
      combinedStatusHistory = [initialRemarksEntry, ...apiStatusHistory];
    }
    
    // For emails, add the body as initial content if needed
    if (report.recordType === 'email' && report.body) {
      const initialEmailEntry = {
        id: -2, // Special ID for email body
        status: 'Sent',
        direction: 'OUT',
        remarks: report.body,
        created_at: report.timestamp,
        created_by: report.sender_name || 'System',
        is_initial_content: true
      };
      combinedStatusHistory = [initialEmailEntry, ...apiStatusHistory];
    }
    
    // Sort by date descending (newest first)
    combinedStatusHistory.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    setStatusHistory(combinedStatusHistory);
    
    // Get saved user name from localStorage if available
    const savedUser = localStorage.getItem('statusUpdateUser') || '';
    
    setStatusUpdate({
      status: report.current_status || 'Pending',
      direction: report.current_direction || report.direction || '',
      remarks: report.current_status_remarks || '',
      updatedBy: savedUser
    });
  };

  const handleOpenUpdateStatus = () => {
    setShowUpdateStatusModal(true);
    // Clear the form when opening
    const savedUser = localStorage.getItem('statusUpdateUser') || '';
    setStatusUpdate({
      status: '',
      direction: '',
      remarks: '',
      updatedBy: savedUser
    });
  };

  const handleCloseUpdateStatus = () => {
    setShowUpdateStatusModal(false);
  };

  const handleUpdateStatusSubmit = async () => {
    if (!statusUpdate.status) {
      alert('Please select a status');
      return;
    }

    if (!statusUpdate.updatedBy.trim()) {
      alert('Please enter your name');
      return;
    }

    try {
      setUpdatingStatus(true);
      
      // Save user name to localStorage for future use
      localStorage.setItem('statusUpdateUser', statusUpdate.updatedBy);
      
      const updateData = {
        recordId: selectedReport.id,
        recordType: selectedReport.recordType,
        status: statusUpdate.status,
        direction: statusUpdate.direction,
        remarks: statusUpdate.remarks,
        updatedBy: statusUpdate.updatedBy
      };

      await statusService.updateStatus(updateData);
      
      setSelectedReport(prev => ({
        ...prev,
        current_status: statusUpdate.status,
        current_direction: statusUpdate.direction,
        current_status_remarks: statusUpdate.remarks,
        status_updated_at: new Date().toISOString(),
        status_updated_by: statusUpdate.updatedBy
      }));

      // Reload status history after update
      const apiStatusHistory = await loadStatusHistory(selectedReport.id, selectedReport.recordType);
      let combinedStatusHistory = [...apiStatusHistory];
      
      // Re-add document remarks as first entry
      if (selectedReport.recordType === 'document' && selectedReport.remarks) {
        const initialRemarksEntry = {
          id: -1,
          status: 'Created',
          direction: selectedReport.direction || '',
          remarks: selectedReport.remarks,
          created_at: selectedReport.timestamp,
          created_by: selectedReport.sender_name || 'System',
          is_initial_remarks: true
        };
        combinedStatusHistory = [initialRemarksEntry, ...apiStatusHistory];
      }
      
      // Re-add email body as first entry
      if (selectedReport.recordType === 'email' && selectedReport.body) {
        const initialEmailEntry = {
          id: -2,
          status: 'Sent',
          direction: 'OUT',
          remarks: selectedReport.body,
          created_at: selectedReport.timestamp,
          created_by: selectedReport.sender_name || 'System',
          is_initial_content: true
        };
        combinedStatusHistory = [initialEmailEntry, ...apiStatusHistory];
      }
      
      // Sort by date descending (newest first)
      combinedStatusHistory.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setStatusHistory(combinedStatusHistory);
      
      await loadReports();
      
      setStatusUpdate({
        status: '',
        direction: '',
        remarks: '',
        updatedBy: statusUpdate.updatedBy
      });

      setShowUpdateStatusModal(false);
      alert('Status updated successfully!');
      
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const downloadAttachment = (filename, originalName) => {
    const serviceType = selectedReport.recordType;
    const downloadUrl = `http://localhost:5000/api/${serviceType === 'email' ? 'email' : 'documents'}/attachment/${filename}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToCSV = () => {
    const headers = ['Tracking Number', 'Record Type', 'Document Type', 'Sender', 'To/Direction', 'Subject', 'Status', 'Attachments', 'Date', 'Time', 'Remarks/Body'];
    const csvData = filteredReports.map(report => [
      report.tracking_number || 'N/A',
      report.recordType,
      report.documentType || report.displayType,
      report.sender_name,
      report.recipient,
      report.subject,
      report.current_status || 'Pending',
      report.attachment_count,
      new Date(report.timestamp).toLocaleDateString(),
      new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      report.recordType === 'document' ? report.remarks : report.body
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `communications-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalStats = {
    totalRecords: reports.length,
    totalEmails: reports.filter(r => r.recordType === 'email').length,
    totalDocuments: reports.filter(r => r.recordType === 'document').length,
    totalAttachments: reports.reduce((sum, report) => sum + (report.attachment_count || 0), 0)
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateToWords = (timestamp) => {
    const date = new Date(timestamp);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    const dateStr = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    return `${dateStr} - ${timeStr}`;
  };

  const filteredReports = reports.filter(report => {
    if (filters.type !== 'all' && report.recordType !== filters.type) return false;
    if (filters.sender && !report.sender_name?.toLowerCase().includes(filters.sender.toLowerCase())) return false;
    if (filters.startDate && new Date(report.timestamp) < new Date(filters.startDate)) return false;
    if (filters.endDate && new Date(report.timestamp) > new Date(filters.endDate + 'T23:59:59')) return false;
    if (filters.status !== 'all' && report.current_status !== filters.status) return false;
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const matches = 
        report.sender_name?.toLowerCase().includes(searchLower) ||
        report.subject?.toLowerCase().includes(searchLower) ||
        report.recipient?.toLowerCase().includes(searchLower) ||
        report.tracking_number?.toLowerCase().includes(searchLower) ||
        report.displayType?.toLowerCase().includes(searchLower) ||
        report.documentType?.toLowerCase().includes(searchLower);
      if (!matches) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="reports-container">
        <div className="loading">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      {/* Statistics Cards */}
      <div className="stats-cards">
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <h3>{totalStats.totalRecords}</h3>
            <p>Total Records</p>
          </div>
        </div>
        <div className="stat-card email">
          <div className="stat-icon">📧</div>
          <div className="stat-info">
            <h3>{totalStats.totalEmails}</h3>
            <p>Email Records</p>
          </div>
        </div>
        <div className="stat-card document">
          <div className="stat-icon">📄</div>
          <div className="stat-info">
            <h3>{totalStats.totalDocuments}</h3>
            <p>Document Records</p>
          </div>
        </div>
        <div className="stat-card attachment">
          <div className="stat-icon">📎</div>
          <div className="stat-info">
            <h3>{totalStats.totalAttachments}</h3>
            <p>Total Attachments</p>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="section-header">
          <h3>Filters & Search</h3>
        </div>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Record Type</label>
            <select 
              value={filters.type} 
              onChange={(e) => setFilters({...filters, type: e.target.value})}
            >
              <option value="all">All Records</option>
              <option value="email">Emails Only</option>
              <option value="document">Documents Only</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select 
              value={filters.status} 
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Start Date</label>
            <input 
              type="date" 
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
            />
          </div>
          <div className="filter-group">
            <label>End Date</label>
            <input 
              type="date" 
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
            />
          </div>
          <div className="filter-group">
            <label>Sender Name</label>
            <input 
              type="text" 
              placeholder="Filter by sender..."
              value={filters.sender}
              onChange={(e) => setFilters({...filters, sender: e.target.value})}
            />
          </div>
          <div className="filter-group full-width">
            <label>Global Search</label>
            <input 
              type="text" 
              placeholder="Search tracking numbers, subjects, senders..."
              value={filters.searchTerm}
              onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
              className="search-input"
            />
          </div>
        </div>
        <div className="filter-actions">
          <button className="export-btn" onClick={exportToCSV}>
            Export CSV
          </button>
          <button 
            className="clear-btn"
            onClick={() => setFilters({
              type: 'all',
              startDate: '',
              endDate: '',
              sender: '',
              searchTerm: '',
              status: 'all'
            })}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Reports Table */}
      <div className="reports-table-section">
        <div className="section-header">
          <h3>Communication Logs</h3>
          <div className="table-info">
            <span className="records-count">{filteredReports.length} records found</span>
            <span className="total-count">of {reports.length} total</span>
          </div>
        </div>
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Tracking #</th>
                <th>Type</th>
                <th>Category</th>
                <th>Sender</th>
                <th>Recipient</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Files</th>
                <th>Date</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report, index) => (
                <tr key={`${report.recordType}-${report.id}`} className={index % 2 === 0 ? 'even' : 'odd'}>
                  <td className="tracking-cell">
                    <span className="tracking-number">
                      {report.tracking_number || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span className={`record-type-badge ${report.recordType}`}>
                      {report.recordType === 'email' ? 'Email' : 'Doc'}
                    </span>
                  </td>
                  <td>
                    <span className="type-badge">
                      {report.documentType || report.displayType}
                    </span>
                  </td>
                  <td className="sender-cell">
                    <span className="sender-name">{report.sender_name}</span>
                  </td>
                  <td className="recipient-cell">
                    {report.recordType === 'email' ? (
                      <span className="email-recipient" title={report.recipient}>
                        {report.recipient}
                      </span>
                    ) : (
                      <span className={`direction-badge direction-${report.recipient?.toLowerCase()}`}>
                        {report.recipient}
                      </span>
                    )}
                  </td>
                  <td className="subject-cell" title={report.subject}>
                    {report.subject?.length > 50 ? report.subject.substring(0, 50) + '...' : report.subject}
                  </td>
                  <td>
                    <span className={`status-badge status-${report.current_status?.toLowerCase() || 'pending'}`}>
                      {report.current_status || 'Pending'}
                    </span>
                  </td>
                  <td>
                    {report.attachment_count > 0 ? (
                      <span className="attachment-indicator">
                        {report.attachment_count}
                      </span>
                    ) : (
                      <span className="no-attachments">-</span>
                    )}
                  </td>
                  <td className="date-cell">
                    {formatDateToWords(report.timestamp)}
                  </td>
                  <td className="time-cell">
                    {formatTime(report.timestamp)}
                  </td>
                  <td>
                    <button 
                      className="view-update-btn"
                      onClick={() => handleViewDetails(report)}
                      title="View and update record"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredReports.length === 0 && (
            <div className="no-data">
              <div className="no-data-icon">📭</div>
              <h4>No records found</h4>
              <p>Try adjusting your filters or search terms</p>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal - New Design */}
      {showDetailsModal && selectedReport && (
        <div className="modal-overlay">
          <div className="modal new-design-modal">
            <div className="header">
              <div>
                <h1>
                  {selectedReport.recordType === 'email' ? 'Email Details' : 'Document Details'}
                </h1>
                <div className="doc-id">{selectedReport.tracking_number}</div>
              </div>
              <button 
                className="close-btn"
                onClick={() => setShowDetailsModal(false)}
              >
                ×
              </button>
            </div>

            <div className="content">
              {/* Record Information Section */}
              <div className="section">
                <div className="section-header">
                  <h2>Record Information</h2>
                  <span className={`status-badge status-${selectedReport.current_status?.toLowerCase() || 'pending'}`}>
                    {selectedReport.current_status || 'Pending'}
                  </span>
                </div>
                <div className="info-grid">
                  <div className="info-item">
                    <div className="info-label">Sender</div>
                    <div className="info-value">{selectedReport.sender_name}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Document Type</div>
                    <div className="info-value">{selectedReport.documentType || selectedReport.displayType}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Subject</div>
                    <div className="info-value">{selectedReport.subject}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Date & Time</div>
                    <div className="info-value">{formatDateTime(selectedReport.timestamp)}</div>
                  </div>
                </div>
              </div>

              {/* Attachments Section */}
              {selectedReport.attachment_count > 0 && (
                <div className="section">
                  <div className="section-header">
                    <h2>Attachments ({selectedReport.attachment_count})</h2>
                  </div>
                  <div className="attachments-list">
                    {selectedReport.attachment_names && selectedReport.attachment_names.length > 0 ? (
                      selectedReport.attachment_names.map((fileName, index) => {
                        const savedFileName = selectedReport.attachment_paths?.[index] || fileName;
                        return (
                          <div key={index} className="attachment-item">
                            <span className="file-name">{fileName}</span>
                            <button 
                              className="download-btn"
                              onClick={() => downloadAttachment(savedFileName, fileName)}
                            >
                              Download
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="no-attachments">No attachment information available</div>
                    )}
                  </div>
                </div>
              )}

              {/* Status History Section */}
              <div className="section">
                <div className="section-header">
                  <h2>Status History</h2>
                  <button 
                    className="update-btn"
                    onClick={handleOpenUpdateStatus}
                  >
                    Update Status
                  </button>
                </div>

                {statusHistory.length > 0 ? (
                  <div className="timeline">
                    {statusHistory.map((history, index) => (
                      <div key={history.id} className="timeline-item">
                        <div className="timeline-header">
                          <div className="timeline-status">{history.status}</div>
                          <div className="timeline-date">
                            {formatDateToWords(history.created_at)} · {formatTime(history.created_at)}
                          </div>
                        </div>
                        {history.direction && history.direction !== '' && (
                          <div className="detail">
                            <strong>Direction:</strong> {history.direction}
                          </div>
                        )}
                        {history.remarks && (
                          <div className="detail">
                            <strong>
                              {history.is_initial_remarks ? 'Document Remarks:' : 
                               history.is_initial_content ? 'Email Content:' : 'Remarks:'}
                            </strong> {history.remarks}
                          </div>
                        )}
                        <div className="detail">
                          <strong>By:</strong> {history.created_by}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-history">
                    No status history available
                    {selectedReport.recordType === 'document' && selectedReport.remarks && (
                      <div className="no-history-remark">
                        Note: Document has remarks but no status history.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Status Modal - Without Cancel Button */}
      {showUpdateStatusModal && selectedReport && (
        <div className="modal-overlay">
          <div className="update-status-modal">
            <div className="modal-header">
              <div className="modal-title">
                <h3>Update Status</h3>
                <span className="tracking-number-modal">{selectedReport.tracking_number}</span>
              </div>
              <button 
                className="close-modal"
                onClick={handleCloseUpdateStatus}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <div className="status-form">
                {/* User Name Input */}
                <div className="form-group full-width required">
                  <label className="bold-label">Your Name</label>
                  <input 
                    type="text"
                    value={statusUpdate.updatedBy}
                    onChange={(e) => setStatusUpdate({...statusUpdate, updatedBy: e.target.value})}
                    placeholder="Enter your name"
                    className="user-input"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group required">
                    <label className="bold-label">Status</label>
                    <select 
                      value={statusUpdate.status}
                      onChange={(e) => setStatusUpdate({...statusUpdate, status: e.target.value})}
                      required
                    >
                      <option value="">Select Status</option>
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="bold-label">Direction</label>
                    <select 
                      value={statusUpdate.direction}
                      onChange={(e) => setStatusUpdate({...statusUpdate, direction: e.target.value})}
                    >
                      <option value="">Select Direction</option>
                      <option value="IN">IN</option>
                      <option value="OUT">OUT</option>
                    </select>
                  </div>
                </div>

                <div className="form-group full-width">
                  <label className="bold-label">Remarks</label>
                  <textarea 
                    value={statusUpdate.remarks}
                    onChange={(e) => setStatusUpdate({...statusUpdate, remarks: e.target.value})}
                    placeholder="Enter status remarks..."
                    rows="3"
                  />
                </div>

                <div className="form-actions-single">
                  <button 
                    className="update-btn primary-btn full-width-btn"
                    onClick={handleUpdateStatusSubmit}
                    disabled={updatingStatus || !statusUpdate.status || !statusUpdate.updatedBy.trim()}
                  >
                    {updatingStatus ? 'Updating...' : 'Update Status'}
                  </button>
                </div>
              </div>
            </div>

            {/* Removed Modal Footer with Cancel Button */}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;