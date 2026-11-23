/**
 * SkillBridge Backend - Internship Routes
 * Base path: /api/internships
 */

const express = require('express');
const router = express.Router();
const internshipController = require('../controllers/internshipController');

// 1. Collection routes: /api/internships
router.route('/')
  .get(internshipController.getAllInternships)
  .post(internshipController.createInternship);

// 2. Individual resource routes: /api/internships/:id
router.route('/:id')
  .get(internshipController.getInternshipById);

module.exports = router;
