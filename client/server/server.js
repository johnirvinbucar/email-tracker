const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const emailRoutes = require('./routes/emailRoutes');
const { emailLimiter } = require('./middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
// In your server.js file, update the CORS configuration:
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'], // Add Vite port
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting for email submissions
app.use('/api/email', emailLimiter);

// Routes
app.use('/api/email', emailRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Email Tracker API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler - FIXED: Use a proper catch-all route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found: ' + req.originalUrl
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error stack:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
});