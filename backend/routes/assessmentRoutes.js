/**
 * SkillBridge Backend - Assessment Routes
 * Base path: /api/assessments
 */

const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessmentController');

router.route('/')
  .get(assessmentController.getAllAssessments);

router.route('/:id')
  .get(assessmentController.getAssessmentById);

module.exports = router;
