/**
 * SkillBridge Backend - Health Check Routes
 * Endpoint: GET /api/health
 * Verifies that the Express server is running and tests MySQL connectivity
 */

const express = require('express');
const router = express.Router();
const { testConnection } = require('../config/db');

router.get('/health', async (req, res) => {
  const serverUptimeSeconds = Math.floor(process.uptime());
  const dbHealth = await testConnection();

  const responsePayload = {
    status: dbHealth.connected ? 'healthy' : 'degraded',
    service: 'SkillBridge Backend REST API',
    timestamp: new Date().toISOString(),
    uptimeSeconds: serverUptimeSeconds,
    server: {
      status: 'running',
      port: process.env.PORT || 5000,
      environment: process.env.NODE_ENV || 'development'
    },
    database: {
      status: dbHealth.connected ? 'connected' : 'disconnected',
      details: dbHealth.connected
        ? {
            databaseName: dbHealth.database,
            serverTime: dbHealth.serverTime,
            latency: `${dbHealth.latencyMs}ms`
          }
        : {
            error: dbHealth.error,
            code: dbHealth.code,
            hint: 'Verify MySQL server is running on the specified host/port and check credentials in backend/.env'
          }
    }
  };

  const httpStatus = dbHealth.connected ? 200 : 503;
  return res.status(httpStatus).json(responsePayload);
});

module.exports = router;
