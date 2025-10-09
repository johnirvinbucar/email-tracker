import React, { useState, useEffect } from 'react';
import { emailService, documentService } from '../services/api';
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
    searchTerm: ''
  });
  const [selectedReport, setSelectedReport] = useState(null);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);

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
        documentType: 'Email'
      }));

      const documentLogs = documentResponse.data.data.logs.map(log => ({
        ...log,
        recordType: 'document',
        displayType: log.doc_type,
        documentType: log.doc_type,
        recipient: log.direction,
        timestamp: log.created_at,
        subject: log.document_subject
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

  const filteredReports = reports.filter(report => {
    if (filters.type !== 'all' && report.recordType !== filters.type) return false;
    if (filters.sender && !report.sender_name?.toLowerCase().includes(filters.sender.toLowerCase())) return false;
    if (filters.startDate && new Date(report.timestamp) < new Date(filters.startDate)) return false;
    if (filters.endDate && new Date(report.timestamp) > new Date(filters.endDate + 'T23:59:59')) return false;
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

  const handleViewDetails = (report) => {
    setSelectedReport(report);
    setShowAttachmentModal(true);
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
    const headers = ['Tracking Number', 'Record Type', 'Document Type', 'Sender', 'To/Direction', 'Subject', 'Attachments', 'Date', 'Time', 'Remarks/Body'];
    const csvData = filteredReports.map(report => [
      report.tracking_number || 'N/A',
      report.recordType,
      report.documentType || report.displayType,
      report.sender_name,
      report.recipient,
      report.subject,
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

  const getTypeStats = () => {
    const typeCounts = {};
    filteredReports.forEach(report => {
      const type = report.documentType || report.displayType;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    return typeCounts;
  };

  const getRecordTypeStats = () => {
    const recordCounts = {
      email: filteredReports.filter(r => r.recordType === 'email').length,
      document: filteredReports.filter(r => r.recordType === 'document').length
    };
    return recordCounts;
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

  if (loading) {
    return (
      <div className="reports-container">
        <div className="loading">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h1>Communication & Document Tracking System</h1>
        <p>Complete tracking and reporting for all communications and documents</p>
      </div>

      {/* Statistics Cards */}
      <div className="stats-cards">
        <div className="stat-card total">
          <div className="stat-info">
            <h3>{totalStats.totalRecords}</h3>
            <p>Total Records</p>
          </div>
        </div>
        <div className="stat-card email">
          <div className="stat-info">
            <h3>{totalStats.totalEmails}</h3>
            <p>Email Records</p>
          </div>
        </div>
        <div className="stat-card document">
          <div className="stat-info">
            <h3>{totalStats.totalDocuments}</h3>
            <p>Document Records</p>
          </div>
        </div>
        <div className="stat-card attachment">
          <div className="stat-info">
            <h3>{totalStats.totalAttachments}</h3>
            <p>Total Attachments</p>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <h3>Filters & Search</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Record Type:</label>
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
            <label>Start Date:</label>
            <input 
              type="date" 
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
            />
          </div>
          <div className="filter-group">
            <label>End Date:</label>
            <input 
              type="date" 
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
            />
          </div>
          <div className="filter-group">
            <label>Sender Name:</label>
            <input 
              type="text" 
              placeholder="Filter by sender..."
              value={filters.sender}
              onChange={(e) => setFilters({...filters, sender: e.target.value})}
            />
          </div>
          <div className="filter-group full-width">
            <label>Global Search:</label>
            <input 
              type="text" 
              placeholder="Search across tracking numbers, subjects, senders, recipients..."
              value={filters.searchTerm}
              onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
              className="search-input"
            />
          </div>
        </div>
        <div className="filter-actions">
          <button className="export-btn" onClick={exportToCSV}>
            Export to CSV
          </button>
          <button 
            className="clear-btn"
            onClick={() => setFilters({
              type: 'all',
              startDate: '',
              endDate: '',
              sender: '',
              searchTerm: ''
            })}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Record Type Distribution */}
      <div className="type-distribution">
        <h3>Record Type Distribution</h3>
        <div className="distribution-cards">
          <div className="dist-card email-dist">
            <span className="dist-label">Emails</span>
            <span className="dist-count">{getRecordTypeStats().email}</span>
            <span className="dist-percentage">
              {filteredReports.length > 0 ? 
                Math.round((getRecordTypeStats().email / filteredReports.length) * 100) : 0}%
            </span>
          </div>
          <div className="dist-card document-dist">
            <span className="dist-label">Documents</span>
            <span className="dist-count">{getRecordTypeStats().document}</span>
            <span className="dist-percentage">
              {filteredReports.length > 0 ? 
                Math.round((getRecordTypeStats().document / filteredReports.length) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Enhanced Reports Table */}
      <div className="reports-table-section">
        <div className="table-header">
          <h3>Communication Logs ({filteredReports.length} records found)</h3>
          <div className="table-actions">
            <span className="records-info">
              Showing {filteredReports.length} of {reports.length} total records
            </span>
          </div>
        </div>
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Tracking #</th>
                <th>Record Type</th>
                <th>Document Type</th>
                <th>Sender</th>
                <th>To/Direction</th>
                <th>Subject</th>
                <th>Attachments</th>
                <th>Date</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr key={`${report.recordType}-${report.id}`} className={report.recordType}>
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
                    <span className={`type-badge type-${report.documentType?.toLowerCase()}`}>
                      {report.documentType || report.displayType}
                    </span>
                  </td>
                  <td className="sender-cell">
                    <div className="sender-info">
                      <span className="sender-name">{report.sender_name}</span>
                    </div>
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
                    {report.subject?.length > 60 ? report.subject.substring(0, 60) + '...' : report.subject}
                  </td>
                  <td>
                    {report.attachment_count > 0 ? (
                      <span className="attachment-indicator" title={`${report.attachment_count} attachment(s)`}>
                        {report.attachment_count} file(s)
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
                    <div className="action-buttons">
                      <button 
                        className="view-btn"
                        onClick={() => handleViewDetails(report)}
                        title="View Details"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredReports.length === 0 && (
            <div className="no-data">
              <h4>No records found</h4>
              <p>Try adjusting your filters or search terms</p>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Details Modal */}
      {showAttachmentModal && selectedReport && (
        <div className="modal-overlay">
          <div className="attachment-modal">
            <div className="modal-header">
              <h3>
                {selectedReport.recordType === 'email' ? 'Email Details' : 'Document Details'}
                <span className="tracking-badge">{selectedReport.tracking_number}</span>
              </h3>
              <button 
                className="close-modal"
                onClick={() => setShowAttachmentModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <div className="record-details-grid">
                <div className="detail-group">
                  <label>Tracking Number:</label>
                  <span>{selectedReport.tracking_number}</span>
                </div>
                <div className="detail-group">
                  <label>Record Type:</label>
                  <span className={`record-type ${selectedReport.recordType}`}>
                    {selectedReport.recordType === 'email' ? 'Email' : 'Document'}
                  </span>
                </div>
                <div className="detail-group">
                  <label>Document Type:</label>
                  <span className="type-badge">{selectedReport.documentType || selectedReport.displayType}</span>
                </div>
                <div className="detail-group">
                  <label>Sender:</label>
                  <span>{selectedReport.sender_name}</span>
                </div>
                
                {selectedReport.recordType === 'email' ? (
                  <div className="detail-group">
                    <label>To:</label>
                    <span className="email-address">{selectedReport.recipient}</span>
                  </div>
                ) : (
                  <div className="detail-group">
                    <label>Direction:</label>
                    <span className={`direction-badge direction-${selectedReport.recipient?.toLowerCase()}`}>
                      {selectedReport.recipient}
                    </span>
                  </div>
                )}
                
                <div className="detail-group full-width">
                  <label>Subject:</label>
                  <span className="subject-full">{selectedReport.subject}</span>
                </div>
                
                <div className="detail-group">
                  <label>Date:</label>
                  <span>{new Date(selectedReport.timestamp).toLocaleDateString()}</span>
                </div>
                <div className="detail-group">
                  <label>Time:</label>
                  <span>{formatTime(selectedReport.timestamp)}</span>
                </div>
              </div>

              {/* Attachments Section */}
              {selectedReport.attachment_count > 0 && (
                <div className="attachments-section">
                  <h4>Attachments ({selectedReport.attachment_count})</h4>
                  {selectedReport.attachment_names && selectedReport.attachment_names.length > 0 ? (
                    <div className="attachment-items">
                      {selectedReport.attachment_names.map((fileName, index) => {
                        const savedFileName = selectedReport.attachment_paths?.[index] || fileName;
                        return (
                          <div key={index} className="attachment-item-modal">
                            <div className="file-info">
                              <span className="file-name">{fileName}</span>
                              <span className="file-size">
                                {selectedReport.attachment_sizes?.[index] ? 
                                  `(${Math.round(selectedReport.attachment_sizes[index] / 1024)} KB)` : ''
                                }
                              </span>
                            </div>
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
                    <div className="no-attachments">
                      No attachment information available.
                    </div>
                  )}
                </div>
              )}

              {/* Content Section */}
              <div className="content-section">
                <h4>{selectedReport.recordType === 'email' ? 'Email Body' : 'Remarks'}</h4>
                <div className="content-preview">
                  {selectedReport.recordType === 'email' ? selectedReport.body : selectedReport.remarks}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="close-btn"
                onClick={() => setShowAttachmentModal(false)}
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