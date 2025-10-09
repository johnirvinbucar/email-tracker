import React, { useState, useEffect } from 'react';
import { emailService } from '../services/api';
import './ReportsPage.css';

const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: 'all',
    startDate: '',
    endDate: '',
    sender: ''
  });

  useEffect(() => {
    loadReports();
    loadStats();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await emailService.getLogs(1, 1000); // Get all records
      setReports(response.data.data.logs);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await emailService.getStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const filteredReports = reports.filter(report => {
    if (filters.type !== 'all' && report.type !== filters.type) return false;
    if (filters.sender && !report.sender_name?.toLowerCase().includes(filters.sender.toLowerCase())) return false;
    if (filters.startDate && new Date(report.created_at) < new Date(filters.startDate)) return false;
    if (filters.endDate && new Date(report.created_at) > new Date(filters.endDate + 'T23:59:59')) return false;
    return true;
  });

  const exportToCSV = () => {
    const headers = ['ID', 'Type', 'Sender', 'To', 'Subject', 'Attachments', 'Date'];
    const csvData = filteredReports.map(report => [
      report.id,
      report.type,
      report.sender_name,
      report.to_email,
      report.subject,
      report.attachment_count,
      new Date(report.created_at).toLocaleDateString()
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
      typeCounts[report.type] = (typeCounts[report.type] || 0) + 1;
    });
    return typeCounts;
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
        <h1>Communication Reports</h1>
        <p>Generate and analyze communication data</p>
      </div>

      {/* Statistics Cards */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">📧</div>
          <div className="stat-info">
            <h3>{stats.total_emails || 0}</h3>
            <p>Total Emails</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>{stats.unique_recipients || 0}</h3>
            <p>Unique Recipients</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📎</div>
          <div className="stat-info">
            <h3>{Math.round(stats.avg_attachments || 0)}</h3>
            <p>Avg Attachments</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <h3>{filteredReports.length}</h3>
            <p>Filtered Results</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <h3>Filters</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Type:</label>
            <select 
              value={filters.type} 
              onChange={(e) => setFilters({...filters, type: e.target.value})}
            >
              <option value="all">All Types</option>
              <option value="Communication">Communication</option>
              <option value="Memo">Memo</option>
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
            <label>Sender:</label>
            <input 
              type="text" 
              placeholder="Search sender..."
              value={filters.sender}
              onChange={(e) => setFilters({...filters, sender: e.target.value})}
            />
          </div>
        </div>
        <button className="export-btn" onClick={exportToCSV}>
          <span>📥</span>
          Export to CSV
        </button>
      </div>

      {/* Type Distribution */}
      <div className="type-distribution">
        <h3>Distribution by Type</h3>
        <div className="type-bars">
          {Object.entries(getTypeStats()).map(([type, count]) => (
            <div key={type} className="type-bar">
              <div className="type-label">
                <span className={`type-badge type-${type.toLowerCase()}`}>
                  {type}
                </span>
                <span className="type-count">({count})</span>
              </div>
              <div className="bar-container">
                <div 
                  className="bar-fill"
                  style={{ 
                    width: `${(count / filteredReports.length) * 100}%`,
                    backgroundColor: type === 'Communication' ? '#22c55e' : '#f59e0b'
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reports Table */}
      <div className="reports-table-section">
        <h3>Communication Logs ({filteredReports.length} records)</h3>
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Sender</th>
                <th>To</th>
                <th>Subject</th>
                <th>Attachments</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr key={report.id}>
                  <td>{report.id}</td>
                  <td>
                    <span className={`type-badge type-${report.type.toLowerCase()}`}>
                      {report.type}
                    </span>
                  </td>
                  <td>{report.sender_name}</td>
                  <td className="email-cell">{report.to_email}</td>
                  <td className="subject-cell" title={report.subject}>
                    {report.subject.length > 50 ? report.subject.substring(0, 50) + '...' : report.subject}
                  </td>
                  <td>
                    {report.attachment_count > 0 ? (
                      <span className="attachment-indicator">
                        📎 {report.attachment_count}
                      </span>
                    ) : (
                      'None'
                    )}
                  </td>
                  <td>{new Date(report.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredReports.length === 0 && (
            <div className="no-data">
              No records found matching your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;