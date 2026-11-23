/**
 * SkillBridge Backend - Student Routes
 * Base path: /api/students
 */

const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

// 1. Collection routes: /api/students
router.route('/')
  .get(studentController.getAllStudents)
  .post(studentController.createStudent)
  .put((req, res) => {
    return res.status(400).json({
      success: false,
      error: 'Bad Request: Student ID must be provided in the URL path (e.g. PUT /api/students/stud-101)'
    });
  })
  .delete((req, res) => {
    return res.status(400).json({
      success: false,
      error: 'Bad Request: Student ID must be provided in the URL path (e.g. DELETE /api/students/stud-101)'
    });
  });

// Student Authentication Routes
router.post('/login', studentController.loginStudent);
router.post('/register', studentController.createStudent);

// 2. Individual resource routes: /api/students/:id
router.route('/:id')
  .get(studentController.getStudentById)
  .put(studentController.updateStudent)
  .patch(studentController.updateStudent)
  .delete(studentController.deleteStudent);

// 3. Real Student Statistics: /api/students/:id/statistics
router.get('/:id/statistics', studentController.getStudentStatistics);

// 4. Student Assessment Results: /api/students/:id/assessments
router.route('/:id/assessments')
  .get(studentController.getStudentAssessments)
  .post(studentController.saveStudentAssessment);

module.exports = router;
