/**
 * SkillBridge Backend - Application Routes
 * Base path: /api/applications
 */

const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');

// 1. Collection routes: /api/applications
router.route('/')
  .post(applicationController.createApplication)
  .get(applicationController.getAllApplications);

// 2. Individual resource routes: /api/applications/:id
router.route('/:id')
  .get(applicationController.getApplicationById);

// 3. Status update route: /api/applications/:id/status
router.route('/:id/status')
  .patch(applicationController.updateApplicationStatus)
  .put(applicationController.updateApplicationStatus);

module.exports = router;
