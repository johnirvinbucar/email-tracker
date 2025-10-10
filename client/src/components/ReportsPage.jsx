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
      setStatusHistory(response.data.data);
    } catch (error) {
      console.error('Error loading status history:', error);
    }
  };

  const handleViewDetails = async (report) => {
    setSelectedReport(report);
    setShowDetailsModal(true);
    await loadStatusHistory(report.id, report.recordType);
    
    // Get saved user name from localStorage if available
    const savedUser = localStorage.getItem('statusUpdateUser') || '';
    
    setStatusUpdate({
      status: report.current_status || 'Pending',
      direction: report.current_direction || report.direction || '',
      remarks: report.current_status_remarks || '',
      updatedBy: savedUser
    });
  };

  const handleStatusUpdate = async () => {
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

      const response = await statusService.updateStatus(updateData);
      
      setSelectedReport(prev => ({
        ...prev,
        current_status: statusUpdate.status,
        current_direction: statusUpdate.direction,
        current_status_remarks: statusUpdate.remarks,
        status_updated_at: new Date().toISOString(),
        status_updated_by: statusUpdate.updatedBy
      }));

      await loadStatusHistory(selectedReport.id, selectedReport.recordType);
      await loadReports();
      
      setStatusUpdate({
        status: statusUpdate.status,
        direction: statusUpdate.direction,
        remarks: '',
        updatedBy: statusUpdate.updatedBy // Keep user name
      });

      alert('Status updated successfully!');
      
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const quickUpdateStatus = async (status) => {
    if (!selectedReport) return;

    if (!statusUpdate.updatedBy.trim()) {
      alert('Please enter your name first');
      return;
    }

    try {
      // Save user name to localStorage for future use
      localStorage.setItem('statusUpdateUser', statusUpdate.updatedBy);
      
      const updateData = {
        recordId: selectedReport.id,
        recordType: selectedReport.recordType,
        status: status,
        direction: selectedReport.current_direction || selectedReport.direction || '',
        remarks: `Status changed to ${status}`,
        updatedBy: statusUpdate.updatedBy
      };

      await statusService.updateStatus(updateData);
      
      setSelectedReport(prev => ({
        ...prev,
        current_status: status,
        status_updated_at: new Date().toISOString(),
        status_updated_by: statusUpdate.updatedBy
      }));

      await loadStatusHistory(selectedReport.id, selectedReport.recordType);
      await loadReports();
      
      alert(`Status updated to ${status}!`);
      
    } catch (error) {
      console.error('Error in quick status update:', error);
      alert('Failed to update status');
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
                    {new Date(report.timestamp).toLocaleDateString()}
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

      {/* Details Modal */}
      {showDetailsModal && selectedReport && (
        <div className="modal-overlay">
          <div className="details-modal">
            <div className="modal-header">
              <div className="modal-title">
                <h3>
                  {selectedReport.recordType === 'email' ? 'Email Details' : 'Document Details'}
                </h3>
                <span className="tracking-number-modal">{selectedReport.tracking_number}</span>
              </div>
              <button 
                className="close-modal"
                onClick={() => setShowDetailsModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              {/* Record Details */}
              <div className="details-section">
                <h4>Record Information</h4>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Tracking Number</label>
                    <span>{selectedReport.tracking_number}</span>
                  </div>
                  <div className="detail-item">
                    <label>Record Type</label>
                    <span className={`record-type ${selectedReport.recordType}`}>
                      {selectedReport.recordType === 'email' ? 'Email' : 'Document'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Document Type</label>
                    <span className="type-badge">{selectedReport.documentType || selectedReport.displayType}</span>
                  </div>
                  <div className="detail-item">
                    <label>Sender</label>
                    <span>{selectedReport.sender_name}</span>
                  </div>
                  <div className="detail-item">
                    <label>Current Status</label>
                    <span className={`status-badge status-${selectedReport.current_status?.toLowerCase() || 'pending'}`}>
                      {selectedReport.current_status || 'Pending'}
                    </span>
                  </div>
                  {selectedReport.recordType === 'email' ? (
                    <div className="detail-item">
                      <label>Recipient</label>
                      <span className="email-address">{selectedReport.recipient}</span>
                    </div>
                  ) : (
                    <div className="detail-item">
                      <label>Direction</label>
                      <span className={`direction-badge direction-${selectedReport.recipient?.toLowerCase()}`}>
                        {selectedReport.recipient}
                      </span>
                    </div>
                  )}
                  <div className="detail-item full-width">
                    <label>Subject</label>
                    <span className="subject">{selectedReport.subject}</span>
                  </div>
                  <div className="detail-item">
                    <label>Date</label>
                    <span>{new Date(selectedReport.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-item">
                    <label>Time</label>
                    <span>{formatTime(selectedReport.timestamp)}</span>
                  </div>
                  {selectedReport.status_updated_at && (
                    <div className="detail-item">
                      <label>Status Updated</label>
                      <span>{new Date(selectedReport.status_updated_at).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedReport.status_updated_by && (
                    <div className="detail-item">
                      <label>Updated By</label>
                      <span>{selectedReport.status_updated_by}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Update Section with User Input */}
              <div className="status-section">
                <h4>Update Status</h4>
                <div className="status-form">
                  {/* User Name Input */}
                  <div className="form-group full-width required">
                    <label>Your Name</label>
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
                      <label>Status</label>
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
                      <label>Direction</label>
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
                    <label>Remarks</label>
                    <textarea 
                      value={statusUpdate.remarks}
                      onChange={(e) => setStatusUpdate({...statusUpdate, remarks: e.target.value})}
                      placeholder="Enter status remarks..."
                      rows="2"
                    />
                  </div>

                  <div className="form-actions">
                    <div className="quick-actions">
                      <span className="quick-label">Quick Actions:</span>
                      <button 
                        className="quick-btn pending"
                        onClick={() => quickUpdateStatus('Pending')}
                        disabled={!statusUpdate.updatedBy.trim()}
                      >
                        Mark Pending
                      </button>
                      <button 
                        className="quick-btn completed"
                        onClick={() => quickUpdateStatus('Completed')}
                        disabled={!statusUpdate.updatedBy.trim()}
                      >
                        Mark Completed
                      </button>
                    </div>
                    <button 
                      className="update-btn"
                      onClick={handleStatusUpdate}
                      disabled={updatingStatus || !statusUpdate.status || !statusUpdate.updatedBy.trim()}
                    >
                      {updatingStatus ? 'Updating...' : 'Update Status'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Status History */}
              <div className="history-section">
                <h4>Status History</h4>
                {statusHistory.length > 0 ? (
                  <div className="history-list">
                    {statusHistory.map((history) => (
                      <div key={history.id} className="history-item">
                        <div className="history-main">
                          <span className={`history-status status-${history.status?.toLowerCase()}`}>
                            {history.status}
                          </span>
                          <span className="history-time">
                            {new Date(history.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="history-details">
                          {history.direction && <span>Direction: {history.direction}</span>}
                          {history.remarks && <span>Remarks: {history.remarks}</span>}
                          <span className="history-by">By: {history.created_by}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-history">No status history available</div>
                )}
              </div>

              {/* Content */}
              <div className="content-section">
                <h4>{selectedReport.recordType === 'email' ? 'Email Content' : 'Document Remarks'}</h4>
                <div className="content-preview">
                  {selectedReport.recordType === 'email' ? selectedReport.body : selectedReport.remarks}
                </div>
              </div>

              {/* Attachments */}
              {selectedReport.attachment_count > 0 && (
                <div className="attachments-section">
                  <h4>Attachments ({selectedReport.attachment_count})</h4>
                  {selectedReport.attachment_names && selectedReport.attachment_names.length > 0 ? (
                    <div className="attachment-list">
                      {selectedReport.attachment_names.map((fileName, index) => {
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
                      })}
                    </div>
                  ) : (
                    <div className="no-attachments">No attachment information available</div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                className="close-btn"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;