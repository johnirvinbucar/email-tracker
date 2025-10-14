import React, { useState, useEffect } from 'react';
import { emailService, documentService, statusService } from '../services/api';
import './ReportsPage.css';

// Helper function to get the correct status badge class
const getStatusBadgeClass = (status) => {
  if (!status) return 'status-pending';
  
  const statusMap = {
    'pending': 'status-pending',
    'for compliance': 'status-for-compliance',
    'in progress': 'status-in-progress',
    'completed': 'status-completed',
    'cancelled': 'status-cancelled'
  };
  
  return statusMap[status.toLowerCase()] || 'status-pending';
};

const ReportsPage = () => {
  const [reports, setReports] = useState([]);
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
    forwardedTo: '',
    cof: '',
    remarks: '',
    updatedBy: '',
    attachment: null
  });
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadReports();
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
      currentDirection: log.current_direction || log.direction,
      current_forwarded_to: log.current_forwarded_to || log.forwarded_to || '',
      current_cof: log.current_cof || log.cof || ''
    }));

    const documentLogs = documentResponse.data.data.logs.map(log => ({
      ...log,
      recordType: 'document',
      displayType: log.doc_type,
      documentType: log.doc_type,
      recipient: log.direction,
      timestamp: log.created_at,
      subject: log.document_subject,
      currentDirection: log.current_direction || log.direction,
      current_forwarded_to: log.current_forwarded_to || log.forwarded_to || '',
      current_cof: log.current_cof || log.cof || ''
    }));

    const allReports = [...emailLogs, ...documentLogs].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    // console.log('📊 Loaded reports with current fields:', allReports.map(r => ({
    //   id: r.id,
    //   current_forwarded_to: r.current_forwarded_to,
    //   current_cof: r.current_cof
    // })));

    setReports(allReports);
  } catch (error) {
    console.error('Error loading reports:', error);
  } finally {
    setLoading(false);
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
        forwardedTo: report.forwarded_to || '',
        cof: report.cof || '',
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
        forwardedTo: report.forwarded_to || '',
        cof: report.cof || '',
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
      forwardedTo: report.current_forwarded_to || '',
      cof: report.current_cof || '',
      remarks: report.current_status_remarks || '',
      updatedBy: savedUser,
      attachment: null
    });
  };

  const handleOpenUpdateStatus = () => {
    setShowUpdateStatusModal(true);
    // Clear the form when opening
    const savedUser = localStorage.getItem('statusUpdateUser') || '';
    setStatusUpdate({
      status: '',
      direction: '',
      forwardedTo: '',
      cof: '',
      remarks: '',
      updatedBy: savedUser,
      attachment: null
    });
  };

  const handleCloseUpdateStatus = () => {
    setShowUpdateStatusModal(false);
  };

  const handleAttachmentChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setStatusUpdate(prev => ({
        ...prev,
        attachment: file
      }));
    }
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
    
    localStorage.setItem('statusUpdateUser', statusUpdate.updatedBy);
    
    const updateData = {
      recordId: selectedReport.id,
      recordType: selectedReport.recordType,
      status: statusUpdate.status,
      direction: statusUpdate.direction,
      forwarded_to: statusUpdate.forwardedTo,
      cof: statusUpdate.cof,
      remarks: statusUpdate.remarks,
      updatedBy: statusUpdate.updatedBy,
      attachment: statusUpdate.attachment
    };

    console.log('📤 Sending update data:', updateData);

    let formData;
    if (statusUpdate.attachment) {
      formData = new FormData();
      Object.keys(updateData).forEach(key => {
        if (key === 'attachment') {
          formData.append('attachment', updateData[key]);
        } else {
          formData.append(key, updateData[key]);
        }
      });
    }

    // Make the API call
    const response = await statusService.updateStatus(formData || updateData);
    console.log('✅ Update response:', response.data);

    // Update local state
    setSelectedReport(prev => ({
      ...prev,
      current_status: statusUpdate.status,
      current_direction: statusUpdate.direction,
      current_forwarded_to: statusUpdate.forwardedTo,
      current_cof: statusUpdate.cof,
      current_status_remarks: statusUpdate.remarks,
      status_updated_at: new Date().toISOString(),
      status_updated_by: statusUpdate.updatedBy
    }));

    // DEBUG: Check what the API returns for status history
    console.log('🔄 Loading fresh status history...');
    const freshStatusHistory = await loadStatusHistory(selectedReport.id, selectedReport.recordType);
    console.log('📊 Fresh status history from API:', freshStatusHistory);

    // Check if the new entry is in the response
    if (freshStatusHistory && freshStatusHistory.length > 0) {
      const latestEntry = freshStatusHistory[0];
      console.log('🔍 Latest status history entry:', latestEntry);
      console.log('📝 Latest entry forwarded_to:', latestEntry.forwarded_to);
      console.log('📝 Latest entry cof:', latestEntry.cof);
    }

    let combinedStatusHistory = [...freshStatusHistory];
    
    // For documents, add the remarks as the initial status history entry
    if (selectedReport.recordType === 'document' && selectedReport.remarks) {
      const initialRemarksEntry = {
        id: -1,
        status: 'Created',
        direction: selectedReport.direction || '',
        forwarded_to: selectedReport.forwarded_to || '',
        cof: selectedReport.cof || '',
        remarks: selectedReport.remarks,
        created_at: selectedReport.timestamp,
        created_by: selectedReport.sender_name || 'System',
        is_initial_remarks: true
      };
      combinedStatusHistory = [initialRemarksEntry, ...freshStatusHistory];
    }
    
    // For emails, add the body as initial content if needed
    if (selectedReport.recordType === 'email' && selectedReport.body) {
      const initialEmailEntry = {
        id: -2,
        status: 'Sent',
        direction: 'OUT',
        forwarded_to: selectedReport.forwarded_to || '',
        cof: selectedReport.cof || '',
        remarks: selectedReport.body,
        created_at: selectedReport.timestamp,
        created_by: selectedReport.sender_name || 'System',
        is_initial_content: true
      };
      combinedStatusHistory = [initialEmailEntry, ...freshStatusHistory];
    }
    
    // Sort by date descending (newest first)
    combinedStatusHistory.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    console.log('🎯 Final combined status history to display:', combinedStatusHistory);
    setStatusHistory(combinedStatusHistory);
    
    await loadReports();
    
    setStatusUpdate({
      status: '',
      direction: '',
      forwardedTo: '',
      cof: '',
      remarks: '',
      updatedBy: statusUpdate.updatedBy,
      attachment: null
    });

    setShowUpdateStatusModal(false);
    alert('Status updated successfully!');
    
  } catch (error) {
    console.error('❌ Error updating status:', error);
    console.error('❌ Error details:', error.response?.data);
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

  const downloadStatusAttachment = (filename) => {
    const downloadUrl = `http://localhost:5000/api/status/attachment/${filename}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToCSV = () => {
    const headers = ['Tracking Number', 'Type', 'Category', 'Subject', 'Status', 'Forwarded To', 'C/OF', 'Date', 'Time'];
    const csvData = filteredReports.map(report => [
      report.tracking_number || 'N/A',
      report.recordType === 'email' ? 'Email' : 'Document',
      report.documentType || report.displayType,
      report.subject,
      report.current_status || 'Pending',
      report.current_forwarded_to || '',
      report.current_cof || '',
      new Date(report.timestamp).toLocaleDateString(),
      new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
        report.documentType?.toLowerCase().includes(searchLower) ||
        report.current_forwarded_to?.toLowerCase().includes(searchLower) ||
        report.current_cof?.toLowerCase().includes(searchLower);
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
        
        <div className="stat-card document">
          <div className="stat-icon">📄</div>
          <div className="stat-info">
            <h3>{totalStats.totalDocuments}</h3>
            <p>Document Records</p>
          </div>
        </div>

        <div className="stat-card email">
          <div className="stat-icon">📧</div>
          <div className="stat-info">
            <h3>{totalStats.totalEmails}</h3>
            <p>Email Records</p>
          </div>
        </div>

        {/* <div className="stat-card attachment">
          <div className="stat-icon">📎</div>
          <div className="stat-info">
            <h3>{totalStats.totalAttachments}</h3>
            <p>Total Attachments</p>
          </div>
        </div> */}
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
              <option value="For Compliance">For Compliance</option>
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
              placeholder="Search tracking numbers, subjects, forwarded to..."
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
                <th>TRACKING</th>
                <th>TYPE</th>
                <th>CATEGORY</th>
                <th>SUBJECT</th>
                <th>STATUS</th>
                <th>FORWARDED TO</th>
                <th>C/OF</th>
                <th>DATE CREATED</th>
                <th>TIME</th>
                <th>ACTION</th>
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
                      {report.recordType === 'email' ? 'Email' : 'Document'}
                    </span>
                  </td>
                  <td>
                    <span className="type-badge">
                      {report.documentType || report.displayType}
                    </span>
                  </td>
                  <td className="subject-cell" title={report.subject}>
                    {report.subject?.length > 50 ? report.subject.substring(0, 50) + '...' : report.subject}
                  </td>
<td>
  <span className={`status-badge ${getStatusBadgeClass(report.current_status)}`}>
    {report.current_status || 'Pending'}
  </span>
</td>
                  <td className="forwarded-to-cell">
                    {report.current_forwarded_to || '-'}
                  </td>
                  <td className="cof-cell">
                    {report.current_cof || '-'}
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
<span className={`status-badge ${getStatusBadgeClass(selectedReport.current_status)}`}>
  {selectedReport.current_status || 'Pending'}
</span>
  </div>
  <div className="info-grid">
    {/* 1st Row: Sender, Document Type */}
    <div className="info-item">
      <div className="info-label">Biller Maker</div>
      <div className="info-value">{selectedReport.sender_name}</div>
    </div>
    <div className="info-item">
      <div className="info-label">Document Type</div>
      <div className="info-value">
        <span className={`record-type-badge ${selectedReport.recordType}`}>
          {selectedReport.recordType === 'email' ? 'Email' : 'Document'}
        </span>
      </div>
    </div>
    
    {/* 2nd Row: Subject, Date & Time */}
    <div className="info-item">
      <div className="info-label">Subject</div>
      <div className="info-value">{selectedReport.subject}</div>
    </div>
    <div className="info-item">
      <div className="info-label">Date & Time</div>
      <div className="info-value">{formatDateTime(selectedReport.timestamp)}</div>
    </div>
    
    {/* 3rd Row: Remarks */}
    <div className="info-item full-width">
      <div className="info-label">Remarks</div>
      <div className="info-value">{selectedReport.remarks || selectedReport.body || 'N/A'}</div>
    </div>
    
    {/* 4th Row: Files */}
    <div className="info-item full-width">
      <div className="info-label">Files</div>
      <div className="info-value">
        {selectedReport.attachment_count > 0 ? (
          <div className="files-list">
            {selectedReport.attachment_names && selectedReport.attachment_names.map((fileName, index) => {
              const savedFileName = selectedReport.attachment_paths?.[index] || fileName;
              return (
                <div key={index} className="file-item">
                  <span className="file-name">{fileName}</span>
                  <button 
                    className="download-btn small"
                    onClick={() => downloadAttachment(savedFileName, fileName)}
                  >
                    Download
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <span className="no-files">No files attached</span>
        )}
      </div>
    </div>
  </div>
</div>

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
      {statusHistory.map((history, index) => {

        // console.log(`📋 Rendering history item ${index}:`, history); //Debug log

        return (
          <div key={history.id || index} className="timeline-item">
            <div className="timeline-header">
              <div className="timeline-status">{history.status}</div>
              <div className="timeline-date">
                {formatDateToWords(history.created_at)} · {formatTime(history.created_at)}
              </div>
            </div>
            <div className="timeline-details-grid">
              {/* 1st Row: Forwarded to and C/O */}
              <div className="detail-row">
                <div className="detail-item">
                  <div className="detail-label">Forwarded to</div>
                  <div className="detail-value">
                    {history.forwarded_to || 'Not specified'}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">C/O</div>
                  <div className="detail-value">
                    {history.cof || 'Not specified'}
                  </div>
                </div>
              </div>
              
              {/* 2nd Row: Remarks, Direction, By */}
              <div className="detail-row">
                <div className="detail-item">
                  <div className="detail-label">
                    {history.is_initial_remarks ? 'Document Remarks' : 
                     history.is_initial_content ? 'Email Content' : 'Remarks'}
                  </div>
                  <div className="detail-value">{history.remarks || 'No remarks'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Direction</div>
                  <div className="detail-value">{history.direction || 'Not specified'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">By</div>
                  <div className="detail-value">{history.created_by || 'System'}</div>
                </div>
              </div>
              
              {/* Attachment row */}
              {history.attachment_filename && (
                <div className="detail-row">
                  <div className="detail-item full-width">
                    <div className="detail-label">Attachment</div>
                    <div className="detail-value">
                      <button 
                        className="download-attachment-btn"
                        onClick={() => downloadStatusAttachment(history.attachment_filename)}
                      >
                        {history.attachment_filename}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    <div className="no-history">
      No status history available
    </div>
  )}
</div>
            </div>
          </div>
        </div>
      )}

      {/* Update Status Modal - With New Fields */}
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
                  <label className="bold-label">Update by</label>
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
                      <option value="For Compliance">For Compliance</option>
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

                {/* New Fields: Forwarded to and C/O */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="bold-label">Forwarded to</label>
                    <input 
                      type="text"
                      value={statusUpdate.forwardedTo}
                      onChange={(e) => setStatusUpdate({...statusUpdate, forwardedTo: e.target.value})}
                      placeholder="Enter forwarded to"
                    />
                  </div>
                  <div className="form-group">
                    <label className="bold-label">C/O</label>
                    <input 
                      type="text"
                      value={statusUpdate.cof}
                      onChange={(e) => setStatusUpdate({...statusUpdate, cof: e.target.value})}
                      placeholder="Enter c/o"
                    />
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

                {/* New Attachment Field */}
                <div className="form-group full-width">
                  <label className="bold-label">Attachment</label>
                  <input 
                    type="file"
                    onChange={handleAttachmentChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="file-input"
                  />
                  <div className="file-input-note">
                    Upload PDF, Word, or image files to update record information
                  </div>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;