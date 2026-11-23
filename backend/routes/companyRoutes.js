/**
 * SkillBridge Backend - Company Routes
 * Base path: /api/companies
 */

const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');

// 1. Collection routes: /api/companies
router.route('/')
  .post(companyController.registerCompany)
  .get(companyController.getAllCompanies);

// 2. Authentication routes: /api/companies/login (Registered before /:id to prevent route shadowing)
router.post('/login', companyController.loginCompany);

// 3. AI Candidate Matching routes
router.get('/:id/ai-matching', companyController.getAiCandidateMatching);
router.post('/:id/ai-matching/rescore', companyController.rescoreAiCandidates);

// 4. Individual resource routes: /api/companies/:id
router.route('/:id')
  .get(companyController.getCompanyById)
  .put(companyController.updateCompany);

module.exports = router;
