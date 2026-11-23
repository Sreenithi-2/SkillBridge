/**
 * SkillBridge Platform - Express.js REST API Backend Server
 * Technology Stack: Node.js + Express.js + MySQL 8
 * Port: 5000 (Default)
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// 1. Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

// 2. Import database connection pool & routes
const { testConnection } = require('./config/db');
const healthRoutes = require('./routes/healthRoutes');
const studentRoutes = require('./routes/studentRoutes');
const companyRoutes = require('./routes/companyRoutes');
const internshipRoutes = require('./routes/internshipRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');

// 3. Initialize Express application
const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// 4. Global Middlewares
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    if (CLIENT_URL && origin === CLIENT_URL) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. Mount API Routes
app.use('/api', healthRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/internships', internshipRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/assessments', assessmentRoutes);

// 6. Root Information Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    project: 'SkillBridge Platform REST API',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      healthCheck: '/api/health',
      students: '/api/students',
      companies: '/api/companies',
      internships: '/api/internships',
      applications: '/api/applications'
    },
    documentation: 'See backend/README.md for API documentation'
  });
});

// 7. 404 Not Found Handler for unknown API endpoints
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint Not Found',
    path: req.originalUrl,
    method: req.method
  });
});

// 8. Global Error Handler
app.use((err, req, res, next) => {
  console.error('[SkillBridge API Error]', err);
  const status = err.status || 500;
  const isDbError = err.code && (err.code.startsWith('ER_') || err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST');
  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error',
    code: err.code || undefined,
    hint: isDbError ? 'Ensure MySQL is running and database credentials in backend/.env are correct.' : undefined
  });
});

// 9. Start Server & Test Database Connection
if (require.main === module) {
  app.listen(PORT, async () => {
    console.log('================================================================');
    console.log(`  SKILLBRIDGE BACKEND SERVER STARTED`);
    console.log(`  Port:        ${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  API URL:     http://localhost:${PORT}/`);
    console.log(`  Health:      http://localhost:${PORT}/api/health`);
    console.log('================================================================');

    // Asynchronous non-blocking database connection probe
    console.log('[Database] Testing MySQL connection pool...');
    const dbStatus = await testConnection();
    if (dbStatus.connected) {
      console.log(`[Database] SUCCESS: Connected to MySQL database "${dbStatus.database}" (${dbStatus.latencyMs}ms)`);
    } else {
      console.warn(`[Database] NOTICE: Database connection not yet established.`);
      console.warn(`[Database] Reason: ${dbStatus.error} (${dbStatus.code})`);
      console.warn(`[Database] Tip: Ensure MySQL is running on port ${process.env.DB_PORT || 3306} and check credentials in backend/.env`);
    }
  });
}

module.exports = app;
