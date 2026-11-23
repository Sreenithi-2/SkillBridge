/**
 * SkillBridge Backend - Assessment Controller
 * Handles retrieval of verified student skill assessment results for recruiters and students
 */

const { pool } = require('../config/db');

/**
 * 1. GET /api/assessments
 * List verified student assessment results with optional filters (technology, min_score, sort)
 */
async function getAllAssessments(req, res, next) {
  try {
    const {
      technology,
      min_score,
      minScore,
      student_id,
      studentId,
      sort = 'date-desc',
      limit = 50,
      offset = 0
    } = req.query;

    const queryParams = [];
    let sql = `
      SELECT 
        ar.id, ar.student_id, ar.assessment_id, ar.technology, ar.score, ar.total_questions,
        ar.percentage, ar.proficiency_tier, ar.time_taken_seconds, ar.certificate_code, ar.completed_at,
        s.full_name AS student_name, s.email AS student_email, s.mobile AS student_mobile,
        s.college AS student_college, s.department AS student_department, s.graduation_year AS student_grad_year,
        COALESCE(ss.is_verified, 1) AS is_verified
      FROM assessment_results ar
      JOIN students s ON ar.student_id = s.id
      LEFT JOIN student_skills ss ON (ar.student_id = ss.student_id AND ar.technology = ss.skill_name)
      WHERE 1=1
    `;

    // Filter by technology/skill
    if (technology && technology.trim() && technology !== 'All') {
      sql += ' AND ar.technology = ?';
      queryParams.push(technology.trim());
    }

    // Filter by min score / percentage
    const minP = parseInt(min_score || minScore, 10);
    if (!isNaN(minP) && minP > 0) {
      sql += ' AND ar.percentage >= ?';
      queryParams.push(minP);
    }

    // Filter by student ID
    const targetStudentId = (student_id || studentId || '').trim();
    if (targetStudentId) {
      sql += ' AND ar.student_id = ?';
      queryParams.push(targetStudentId);
    }

    // Sorting
    if (sort === 'score-desc') {
      sql += ' ORDER BY ar.percentage DESC, ar.completed_at DESC';
    } else if (sort === 'score-asc') {
      sql += ' ORDER BY ar.percentage ASC, ar.completed_at DESC';
    } else if (sort === 'date-asc') {
      sql += ' ORDER BY ar.completed_at ASC';
    } else {
      sql += ' ORDER BY ar.completed_at DESC';
    }

    sql += ' LIMIT ? OFFSET ?';
    queryParams.push(Math.min(parseInt(limit, 10) || 50, 100), Math.max(parseInt(offset, 10) || 0, 0));

    const [rows] = await pool.query(sql, queryParams);

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });

  } catch (error) {
    next(error);
  }
}

/**
 * 2. GET /api/assessments/:id
 * Retrieve single assessment result detail
 */
async function getAssessmentById(req, res, next) {
  try {
    const { id } = req.params;
    if (!id || !id.trim()) {
      return res.status(400).json({ success: false, error: 'Assessment result ID is required' });
    }

    const sql = `
      SELECT 
        ar.id, ar.student_id, ar.assessment_id, ar.technology, ar.score, ar.total_questions,
        ar.percentage, ar.proficiency_tier, ar.time_taken_seconds, ar.certificate_code, ar.completed_at,
        s.full_name AS student_name, s.email AS student_email, s.mobile AS student_mobile,
        s.college AS student_college, s.department AS student_department, s.graduation_year AS student_grad_year,
        COALESCE(ss.is_verified, 1) AS is_verified
      FROM assessment_results ar
      JOIN students s ON ar.student_id = s.id
      LEFT JOIN student_skills ss ON (ar.student_id = ss.student_id AND ar.technology = ss.skill_name)
      WHERE ar.id = ?
    `;

    const [rows] = await pool.execute(sql, [id.trim()]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Assessment result not found' });
    }

    return res.status(200).json({
      success: true,
      data: rows[0]
    });

  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllAssessments,
  getAssessmentById
};
