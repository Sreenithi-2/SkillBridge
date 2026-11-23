/**
 * SkillBridge Backend - Application Controller
 * Handles student internship applications, listing, detail retrieval, and status management
 * Uses parameterized queries with mysql2 for SQL-injection protection
 */

const { pool } = require('../config/db');
const crypto = require('crypto');

// Allowed status ENUM values exactly as defined in schema.sql:
// status ENUM('Applied', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected')
const VALID_STATUSES = [
  'Applied',
  'Under Review',
  'Shortlisted',
  'Interview Scheduled',
  'Selected',
  'Rejected'
];

/**
 * Normalizes input status string case-insensitively to match ENUM
 * E.g., 'under review' -> 'Under Review'
 */
function normalizeStatus(statusInput) {
  if (!statusInput || typeof statusInput !== 'string') return null;
  const trimmed = statusInput.trim().toLowerCase();
  return VALID_STATUSES.find(s => s.toLowerCase() === trimmed) || null;
}

/**
 * 1. POST /api/applications
 * Student applies for an internship opportunity
 */
async function createApplication(req, res, next) {
  try {
    const body = req.body || {};

    const student_id = (body.student_id || body.studentId || '').trim();
    const internship_id = (body.internship_id || body.internshipId || '').trim();
    const cover_note = (body.cover_note || body.coverNote || '').trim() || null;
    const notes = (body.notes || '').trim() || null;
    let ai_match_score = body.ai_match_score !== undefined ? body.ai_match_score : body.aiMatchScore;

    // 1. Validate required fields
    const missingFields = [];
    if (!student_id) missingFields.push('student_id');
    if (!internship_id) missingFields.push('internship_id');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: Missing required fields [${missingFields.join(', ')}]`,
        missingFields
      });
    }

    // 2. Validate ai_match_score (default to 85, range 0-100)
    if (ai_match_score !== undefined && ai_match_score !== null && ai_match_score !== '') {
      ai_match_score = parseInt(ai_match_score, 10);
      if (isNaN(ai_match_score) || ai_match_score < 0 || ai_match_score > 100) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed: ai_match_score must be an integer between 0 and 100',
          field: 'ai_match_score'
        });
      }
    } else {
      ai_match_score = 85;
    }

    // 3. Verify student exists in students table
    const [studentRows] = await pool.execute(
      'SELECT id, full_name, email, college, department FROM students WHERE id = ?',
      [student_id]
    );

    if (!studentRows || studentRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Foreign key validation failed: Student with ID '${student_id}' does not exist`,
        field: 'student_id'
      });
    }

    // 4. Verify internship exists in internships table
    const [internshipRows] = await pool.execute(
      'SELECT id, title, company_name, is_active FROM internships WHERE id = ?',
      [internship_id]
    );

    if (!internshipRows || internshipRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Foreign key validation failed: Internship with ID '${internship_id}' does not exist`,
        field: 'internship_id'
      });
    }

    // 5. Check for duplicate application (uq_student_application: student_id + internship_id)
    const [existingRows] = await pool.execute(
      'SELECT id, status, applied_at FROM applications WHERE student_id = ? AND internship_id = ?',
      [student_id, internship_id]
    );

    if (existingRows && existingRows.length > 0) {
      return res.status(409).json({
        success: false,
        error: `Conflict: Student '${student_id}' has already applied for internship '${internship_id}'`,
        existingApplicationId: existingRows[0].id,
        currentStatus: existingRows[0].status,
        appliedAt: existingRows[0].applied_at
      });
    }

    // 6. Generate unique application ID (e.g. app-798616-00e1)
    const applicationId = `app-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex')}`;

    // 7. Insert application using parameterized SQL query
    const insertSql = `
      INSERT INTO applications (
        id, student_id, internship_id, status, ai_match_score, cover_note, notes, applied_at
      ) VALUES (?, ?, ?, 'Applied', ?, ?, ?, NOW())
    `;

    await pool.execute(insertSql, [
      applicationId,
      student_id,
      internship_id,
      ai_match_score,
      cover_note,
      notes
    ]);

    // 8. Return HTTP 201 Created
    const student = studentRows[0];
    const internship = internshipRows[0];

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        id: applicationId,
        student_id,
        student_name: student.full_name,
        internship_id,
        internship_title: internship.title,
        company_name: internship.company_name,
        status: 'Applied',
        ai_match_score,
        cover_note,
        applied_at: new Date().toISOString()
      }
    });

  } catch (error) {
    // Handle duplicate key error code 1062 / ER_DUP_ENTRY if concurrent insert happened
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return res.status(409).json({
        success: false,
        error: 'Conflict: An application for this student and internship combination already exists',
        detail: error.message
      });
    }
    // Handle foreign key constraint violation
    if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452) {
      return res.status(400).json({
        success: false,
        error: 'Foreign key constraint violation: Provided student_id or internship_id does not exist',
        detail: error.message
      });
    }
    next(error);
  }
}

/**
 * 2. GET /api/applications
 * Retrieve applications with optional filters (student_id, internship_id, status, company_id)
 */
async function getAllApplications(req, res, next) {
  try {
    const {
      student_id,
      studentId,
      internship_id,
      internshipId,
      status,
      company_id,
      companyId,
      limit = 50,
      offset = 0
    } = req.query;

    const queryParams = [];
    let sql = `
      SELECT 
        a.id, a.student_id, a.internship_id, a.status, a.ai_match_score,
        a.cover_note, a.interview_date, a.interview_link, a.offer_details, a.notes,
        a.applied_at, a.updated_at,
        s.full_name AS student_name, s.email AS student_email, s.mobile AS student_mobile,
        s.college AS student_college, s.department AS student_department, s.cgpa AS student_cgpa,
        s.graduation_year AS student_grad_year,
        i.title AS internship_title, i.company_name, i.company_id, i.location AS internship_location,
        i.stipend_display, i.workplace_mode, i.domain
      FROM applications a
      LEFT JOIN students s ON a.student_id = s.id
      LEFT JOIN internships i ON a.internship_id = i.id
      WHERE 1=1
    `;

    // Filter by student ID
    const targetStudentId = (student_id || studentId || '').trim();
    if (targetStudentId) {
      sql += ' AND a.student_id = ?';
      queryParams.push(targetStudentId);
    }

    // Filter by internship ID
    const targetInternshipId = (internship_id || internshipId || '').trim();
    if (targetInternshipId) {
      sql += ' AND a.internship_id = ?';
      queryParams.push(targetInternshipId);
    }

    // Filter by status
    if (status && status.trim()) {
      const normalized = normalizeStatus(status.trim());
      if (normalized) {
        sql += ' AND a.status = ?';
        queryParams.push(normalized);
      } else {
        sql += ' AND a.status = ?';
        queryParams.push(status.trim());
      }
    }

    // Filter by company ID
    const targetCompanyId = (company_id || companyId || '').trim();
    if (targetCompanyId) {
      sql += ' AND i.company_id = ?';
      queryParams.push(targetCompanyId);
    }

    // Sorting and Pagination
    sql += ' ORDER BY a.applied_at DESC LIMIT ? OFFSET ?';
    queryParams.push(Math.min(parseInt(limit, 10) || 50, 100), Math.max(parseInt(offset, 10) || 0, 0));

    const [rows] = await pool.query(sql, queryParams);

    // Attach student verified skills
    if (rows && rows.length > 0) {
      try {
        const studentIds = [...new Set(rows.map(r => r.student_id).filter(Boolean))];
        if (studentIds.length > 0) {
          const [skillsRows] = await pool.query(
            'SELECT student_id, skill_name, proficiency_level, is_verified FROM student_skills WHERE student_id IN (?)',
            [studentIds]
          );
          const skillsByStudent = {};
          skillsRows.forEach(sr => {
            if (!skillsByStudent[sr.student_id]) skillsByStudent[sr.student_id] = [];
            skillsByStudent[sr.student_id].push({
              name: sr.skill_name,
              score: sr.is_verified ? 90 : 75,
              proficiency: sr.proficiency_level,
              verified: Boolean(sr.is_verified)
            });
          });
          rows.forEach(r => {
            r.skills = skillsByStudent[r.student_id] || [];
          });
        }
      } catch (skillErr) {
        console.warn('[getAllApplications] Note: could not fetch student skills:', skillErr.message);
      }
    }

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
 * 3. GET /api/applications/:id
 * Retrieve a single application by unique ID
 */
async function getApplicationById(req, res, next) {
  try {
    const { id } = req.params;

    if (!id || !id.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Application ID parameter is required'
      });
    }

    const sql = `
      SELECT 
        a.id, a.student_id, a.internship_id, a.status, a.ai_match_score,
        a.cover_note, a.interview_date, a.interview_link, a.offer_details, a.notes,
        a.applied_at, a.updated_at,
        s.full_name AS student_name, s.email AS student_email, s.mobile AS student_mobile,
        s.college AS student_college, s.department AS student_department, s.degree AS student_degree,
        s.graduation_year AS student_grad_year, s.cgpa AS student_cgpa, s.github_url, s.linkedin_url,
        i.title AS internship_title, i.company_name, i.company_id, i.location AS internship_location,
        i.stipend_display, i.duration AS internship_duration, i.workplace_mode, i.domain,
        i.application_deadline
      FROM applications a
      LEFT JOIN students s ON a.student_id = s.id
      LEFT JOIN internships i ON a.internship_id = i.id
      WHERE a.id = ?
    `;

    const [rows] = await pool.execute(sql, [id.trim()]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Application with ID '${id}' not found`
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 4. PATCH /api/applications/:id/status
 * Update application status (e.g. 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected')
 */
async function updateApplicationStatus(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    if (!id || !id.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Application ID parameter is required'
      });
    }

    const rawStatus = body.status;
    if (!rawStatus || typeof rawStatus !== 'string' || !rawStatus.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: Status is required in request body',
        allowedStatuses: VALID_STATUSES
      });
    }

    const normalized = normalizeStatus(rawStatus);
    if (!normalized) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: Invalid status '${rawStatus}'. Allowed values are: ${VALID_STATUSES.map(s => `'${s}'`).join(', ')}`,
        allowedStatuses: VALID_STATUSES
      });
    }

    // Check if application exists
    const [existingRows] = await pool.execute(
      'SELECT id, status, student_id, internship_id FROM applications WHERE id = ?',
      [id.trim()]
    );

    if (!existingRows || existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Application with ID '${id}' not found`
      });
    }

    const previousStatus = existingRows[0].status;

    // Optional fields when scheduling interviews or making offers
    const interview_date = body.interview_date !== undefined ? body.interview_date : body.interviewDate;
    const interview_link = body.interview_link !== undefined ? body.interview_link : body.interviewLink;
    const offer_details = body.offer_details !== undefined ? body.offer_details : body.offerDetails;
    const notes = body.notes;

    const updateFields = ['status = ?'];
    const updateParams = [normalized];

    if (interview_date !== undefined) {
      updateFields.push('interview_date = ?');
      updateParams.push(interview_date ? String(interview_date).trim() : null);
    }

    if (interview_link !== undefined) {
      updateFields.push('interview_link = ?');
      updateParams.push(interview_link ? String(interview_link).trim() : null);
    }

    if (offer_details !== undefined) {
      updateFields.push('offer_details = ?');
      updateParams.push(offer_details ? String(offer_details).trim() : null);
    }

    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateParams.push(notes ? String(notes).trim() : null);
    }

    updateParams.push(id.trim());

    const updateSql = `UPDATE applications SET ${updateFields.join(', ')} WHERE id = ?`;
    await pool.execute(updateSql, updateParams);

    return res.status(200).json({
      success: true,
      message: `Application status updated to '${normalized}' successfully`,
      data: {
        id: id.trim(),
        previous_status: previousStatus,
        status: normalized,
        interview_date: interview_date !== undefined ? interview_date : undefined,
        interview_link: interview_link !== undefined ? interview_link : undefined,
        offer_details: offer_details !== undefined ? offer_details : undefined,
        notes: notes !== undefined ? notes : undefined
      }
    });

  } catch (error) {
    next(error);
  }
}

module.exports = {
  createApplication,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
  VALID_STATUSES
};
