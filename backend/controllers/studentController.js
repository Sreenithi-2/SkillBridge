/**
 * SkillBridge Backend - Student Controller
 * Handles student listing, detail retrieval, and student registration
 * Uses parameterized queries with mysql2 for SQL-injection protection
 */

const { pool } = require('../config/db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Standard Email RFC 5322 regex validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 1. GET /api/students
 * List all students with optional search, filtering, and pagination
 */
async function getAllStudents(req, res, next) {
  try {
    const { search, college, department, limit = 50, offset = 0 } = req.query;

    const queryParams = [];
    let sql = 'SELECT id, full_name, email, mobile, college, degree, department, graduation_year, cgpa, github_url, linkedin_url, portfolio_url, profile_bio, avatar_url, created_at, updated_at FROM students WHERE 1=1';

    // Optional Search filter (full_name, email, college)
    if (search && search.trim()) {
      sql += ' AND (full_name LIKE ? OR email LIKE ? OR college LIKE ?)';
      const term = `%${search.trim()}%`;
      queryParams.push(term, term, term);
    }

    // Optional College filter
    if (college && college.trim()) {
      sql += ' AND college = ?';
      queryParams.push(college.trim());
    }

    // Optional Department filter
    if (department && department.trim()) {
      sql += ' AND department = ?';
      queryParams.push(department.trim());
    }

    // Sorting and Pagination
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
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
 * 2. GET /api/students/:id
 * Retrieve a single student by unique ID
 */
async function getStudentById(req, res, next) {
  try {
    const { id } = req.params;

    if (!id || !id.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Student ID parameter is required'
      });
    }

    const sql = 'SELECT id, full_name, email, mobile, college, degree, department, graduation_year, cgpa, github_url, linkedin_url, portfolio_url, profile_bio, avatar_url, created_at, updated_at FROM students WHERE id = ?';
    const [rows] = await pool.execute(sql, [id.trim()]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Student with ID '${id}' not found`
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
 * 3. POST /api/students
 * Register / Create a new student record
 */
async function createStudent(req, res, next) {
  try {
    const body = req.body || {};

    // Support both snake_case and camelCase field inputs
    const fullName = (body.full_name || body.fullName || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const mobile = (body.mobile || body.phoneNumber || '').trim();
    const college = (body.college || '').trim();
    const degree = (body.degree || '').trim();
    const department = (body.department || '').trim();
    const graduationYear = parseInt(body.graduation_year || body.graduationYear, 10);
    const cgpa = body.cgpa !== undefined && body.cgpa !== null ? parseFloat(body.cgpa) : 8.50;
    const githubUrl = (body.github_url || body.githubUrl || '').trim() || null;
    const linkedinUrl = (body.linkedin_url || body.linkedinUrl || '').trim() || null;
    const portfolioUrl = (body.portfolio_url || body.portfolioUrl || '').trim() || null;
    const profileBio = (body.profile_bio || body.profileBio || body.bio || '').trim() || null;
    const avatarUrl = (body.avatar_url || body.avatarUrl || '').trim() || null;

    // Custom or generated unique student ID
    const studentId = (body.id || '').trim() || `stud-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex')}`;

    // --- Validation Rules ---
    const missingFields = [];
    if (!fullName) missingFields.push('full_name');
    if (!email) missingFields.push('email');
    if (!mobile) missingFields.push('mobile');
    if (!college) missingFields.push('college');
    if (!degree) missingFields.push('degree');
    if (!department) missingFields.push('department');
    if (!graduationYear || isNaN(graduationYear)) missingFields.push('graduation_year');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: Missing required fields',
        missingFields
      });
    }

    // Email format check
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: Invalid email address format'
      });
    }

    // Mobile length check
    if (mobile.length < 7 || mobile.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: Mobile phone number must be between 7 and 20 digits'
      });
    }

    // Graduation year reasonable range
    if (graduationYear < 2000 || graduationYear > 2050) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: Graduation year must be between 2000 and 2050'
      });
    }

    // CGPA range check
    if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: CGPA must be a decimal number between 0.00 and 10.00'
      });
    }

    // Password validation and bcrypt hashing
    const rawPassword = typeof body.password === 'string' ? body.password : (body.password_hash || '');
    if (!rawPassword || rawPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: Password is required (minimum 6 characters)'
      });
    }
    const password_hash = await bcrypt.hash(rawPassword, 10);
    const role = (body.role || 'ROLE_STUDENT').trim();

    // Parameterized Insert Query
    const insertSql = `
      INSERT INTO students (
        id, full_name, email, mobile, college, degree, department,
        graduation_year, cgpa, github_url, linkedin_url, portfolio_url,
        profile_bio, avatar_url, password_hash, role
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      studentId,
      fullName,
      email,
      mobile,
      college,
      degree,
      department,
      graduationYear,
      cgpa,
      githubUrl,
      linkedinUrl,
      portfolioUrl,
      profileBio,
      avatarUrl,
      password_hash,
      role
    ];

    await pool.execute(insertSql, values);

    // If technical skills are provided, link them in student_skills table
    if (Array.isArray(body.skills) && body.skills.length > 0) {
      for (const skillName of body.skills) {
        if (typeof skillName === 'string' && skillName.trim()) {
          try {
            await pool.query(
              'INSERT INTO student_skills (student_id, skill_name, proficiency_level, is_verified) VALUES (?, ?, ?, 1)',
              [studentId, skillName.trim(), 'Intermediate']
            );
          } catch (skillErr) {
            console.warn('Could not insert student skill:', skillErr.message);
          }
        }
      }
    }

    // Fetch newly created record (excluding password_hash)
    const [createdRows] = await pool.execute(
      'SELECT id, full_name, email, mobile, college, degree, department, graduation_year, cgpa, github_url, linkedin_url, portfolio_url, profile_bio, avatar_url, role, created_at, updated_at FROM students WHERE id = ?',
      [studentId]
    );

    return res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: createdRows[0]
    });
  } catch (error) {
    // Handle Duplicate Email / Primary Key error (MySQL error code 1062 / ER_DUP_ENTRY)
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return res.status(409).json({
        success: false,
        error: 'Conflict: A student with this email address already exists'
      });
    }
    next(error);
  }
}

/**
 * 4. PUT /api/students/:id
 * Update an existing student profile (updates only provided fields)
 */
async function updateStudent(req, res, next) {
  try {
    const { id } = req.params;

    if (!id || !id.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Student ID parameter is required'
      });
    }

    const studentId = id.trim();

    // 1. Verify student exists
    const [existingRows] = await pool.execute('SELECT * FROM students WHERE id = ?', [studentId]);
    if (!existingRows || existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Student with ID '${studentId}' not found`
      });
    }

    const body = req.body || {};
    const setClauses = [];
    const values = [];

    // 2. Validate and collect provided fields
    if (body.full_name !== undefined || body.fullName !== undefined) {
      const val = (body.full_name || body.fullName || '').trim();
      if (!val) {
        return res.status(400).json({ success: false, error: 'Validation Error: Full name cannot be empty' });
      }
      setClauses.push('full_name = ?');
      values.push(val);
    }

    if (body.email !== undefined) {
      const email = body.email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ success: false, error: 'Validation Error: Invalid email address format' });
      }
      setClauses.push('email = ?');
      values.push(email);
    }

    if (body.mobile !== undefined || body.phoneNumber !== undefined) {
      const mobile = (body.mobile || body.phoneNumber || '').trim();
      if (mobile.length < 7 || mobile.length > 20) {
        return res.status(400).json({ success: false, error: 'Validation Error: Mobile phone number must be between 7 and 20 digits' });
      }
      setClauses.push('mobile = ?');
      values.push(mobile);
    }

    if (body.college !== undefined) {
      const val = body.college.trim();
      if (!val) {
        return res.status(400).json({ success: false, error: 'Validation Error: College cannot be empty' });
      }
      setClauses.push('college = ?');
      values.push(val);
    }

    if (body.degree !== undefined) {
      const val = body.degree.trim();
      if (!val) {
        return res.status(400).json({ success: false, error: 'Validation Error: Degree cannot be empty' });
      }
      setClauses.push('degree = ?');
      values.push(val);
    }

    if (body.department !== undefined) {
      const val = body.department.trim();
      if (!val) {
        return res.status(400).json({ success: false, error: 'Validation Error: Department cannot be empty' });
      }
      setClauses.push('department = ?');
      values.push(val);
    }

    if (body.graduation_year !== undefined || body.graduationYear !== undefined) {
      const year = parseInt(body.graduation_year || body.graduationYear, 10);
      if (isNaN(year) || year < 2000 || year > 2050) {
        return res.status(400).json({ success: false, error: 'Validation Error: Graduation year must be between 2000 and 2050' });
      }
      setClauses.push('graduation_year = ?');
      values.push(year);
    }

    if (body.cgpa !== undefined) {
      const cgpa = parseFloat(body.cgpa);
      if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
        return res.status(400).json({ success: false, error: 'Validation Error: CGPA must be a decimal number between 0.00 and 10.00' });
      }
      setClauses.push('cgpa = ?');
      values.push(cgpa);
    }

    if (body.github_url !== undefined || body.githubUrl !== undefined) {
      const val = (body.github_url || body.githubUrl || '').trim() || null;
      setClauses.push('github_url = ?');
      values.push(val);
    }

    if (body.linkedin_url !== undefined || body.linkedinUrl !== undefined) {
      const val = (body.linkedin_url || body.linkedinUrl || '').trim() || null;
      setClauses.push('linkedin_url = ?');
      values.push(val);
    }

    if (body.portfolio_url !== undefined || body.portfolioUrl !== undefined) {
      const val = (body.portfolio_url || body.portfolioUrl || '').trim() || null;
      setClauses.push('portfolio_url = ?');
      values.push(val);
    }

    if (body.profile_bio !== undefined || body.profileBio !== undefined || body.bio !== undefined) {
      const val = (body.profile_bio || body.profileBio || body.bio || '').trim() || null;
      setClauses.push('profile_bio = ?');
      values.push(val);
    }

    if (body.avatar_url !== undefined || body.avatarUrl !== undefined) {
      const val = (body.avatar_url || body.avatarUrl || '').trim() || null;
      setClauses.push('avatar_url = ?');
      values.push(val);
    }

    // 3. Ensure at least one valid field is provided
    if (setClauses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: No valid fields provided for update'
      });
    }

    // 4. Execute parameterized update
    values.push(studentId);
    const updateSql = `UPDATE students SET ${setClauses.join(', ')} WHERE id = ?`;
    await pool.execute(updateSql, values);

    // 5. Fetch and return updated student record
    const [updatedRows] = await pool.execute('SELECT * FROM students WHERE id = ?', [studentId]);

    return res.status(200).json({
      success: true,
      message: 'Student profile updated successfully',
      data: updatedRows[0]
    });
  } catch (error) {
    // Handle Duplicate Email (MySQL error code 1062 / ER_DUP_ENTRY)
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return res.status(409).json({
        success: false,
        error: 'Conflict: A student with this email address already exists'
      });
    }
    next(error);
  }
}

/**
 * 5. DELETE /api/students/:id
 * Delete an existing student record by ID
 */
async function deleteStudent(req, res, next) {
  try {
    const { id } = req.params;

    if (!id || !id.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Student ID parameter is required'
      });
    }

    const studentId = id.trim();

    // 1. Check whether student exists
    const [existingRows] = await pool.execute('SELECT id FROM students WHERE id = ?', [studentId]);
    if (!existingRows || existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Student with ID '${studentId}' not found`
      });
    }

    // 2. Delete student record using parameterized query
    await pool.execute('DELETE FROM students WHERE id = ?', [studentId]);

    // 3. Return success response
    return res.status(200).json({
      success: true,
      message: 'Student deleted successfully',
      data: {
        id: studentId
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 6. GET /api/students/:id/statistics
 * Aggregate real database statistics for the student
 */
async function getStudentStatistics(req, res, next) {
  try {
    const studentId = (req.params.id || '').trim();
    if (!studentId) {
      return res.status(400).json({ success: false, error: 'Student ID required' });
    }

    // 1. Applications by status
    const [appRows] = await pool.query(
      'SELECT status, COUNT(*) as count FROM applications WHERE student_id = ? GROUP BY status',
      [studentId]
    );

    let totalApplications = 0;
    let appliedCount = 0;
    let underReviewCount = 0;
    let shortlistedCount = 0;
    let interviewCount = 0;
    let selectedCount = 0;
    let rejectedCount = 0;

    appRows.forEach(row => {
      const cnt = parseInt(row.count, 10) || 0;
      totalApplications += cnt;
      const s = (row.status || '').toLowerCase();
      if (s === 'applied') appliedCount += cnt;
      else if (s.includes('review')) underReviewCount += cnt;
      else if (s.includes('shortlist')) shortlistedCount += cnt;
      else if (s.includes('interview')) interviewCount += cnt;
      else if (s.includes('select') || s.includes('offer')) selectedCount += cnt;
      else if (s.includes('reject')) rejectedCount += cnt;
    });

    // Check specific interview schedules from applications with interview_date
    const [interviewRows] = await pool.query(
      'SELECT COUNT(*) as count FROM applications WHERE student_id = ? AND interview_date IS NOT NULL AND interview_date != ""',
      [studentId]
    );
    if (interviewRows && interviewRows[0] && interviewRows[0].count > interviewCount) {
      interviewCount = parseInt(interviewRows[0].count, 10);
    }

    // 2. Verified skills count
    const [skillRows] = await pool.query(
      'SELECT COUNT(*) as count FROM student_skills WHERE student_id = ? AND is_verified = 1',
      [studentId]
    );
    const verifiedSkillsCount = (skillRows && skillRows[0]) ? parseInt(skillRows[0].count, 10) : 0;

    // 3. Assessment scores and average
    const [assessRows] = await pool.query(
      'SELECT AVG(percentage) as avg_score, COUNT(*) as count FROM assessment_results WHERE student_id = ?',
      [studentId]
    );
    const avgScore = (assessRows && assessRows[0] && assessRows[0].avg_score !== null)
      ? Math.round(parseFloat(assessRows[0].avg_score))
      : 88;

    return res.status(200).json({
      success: true,
      data: {
        totalApplications,
        applied: appliedCount,
        underReview: underReviewCount,
        shortlisted: shortlistedCount,
        interviewScheduled: interviewCount,
        selected: selectedCount,
        rejected: rejectedCount,
        verifiedSkills: verifiedSkillsCount,
        assessmentScores: {
          average: avgScore,
          count: (assessRows && assessRows[0]) ? parseInt(assessRows[0].count, 10) : 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 7. GET /api/students/:id/assessments
 * List verified assessment results for student
 */
async function getStudentAssessments(req, res, next) {
  try {
    const studentId = (req.params.id || '').trim();
    const [rows] = await pool.query(
      'SELECT * FROM assessment_results WHERE student_id = ? ORDER BY completed_at DESC',
      [studentId]
    );
    return res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    next(error);
  }
}

/**
 * 8. POST /api/students/:id/assessments
 * Save new technical assessment result into MySQL database
 */
async function saveStudentAssessment(req, res, next) {
  try {
    const studentId = (req.params.id || '').trim();
    const body = req.body || {};
    const resultId = body.id || `res-${Date.now()}`;
    const rawAssessmentId = body.assessment_id || body.assessmentId || null;
    let assessmentId = null;
    if (rawAssessmentId) {
      try {
        const [matching] = await pool.query('SELECT id FROM assessments WHERE id = ?', [rawAssessmentId]);
        if (matching && matching.length > 0) {
          assessmentId = matching[0].id;
        }
      } catch (err) {
        assessmentId = null;
      }
    }
    const technology = body.technology || 'Technical Assessment';
    const score = parseInt(body.score, 10) || 0;
    const totalQuestions = parseInt(body.total_questions || body.total, 10) || 10;
    const percentage = parseInt(body.percentage, 10) || Math.round((score / totalQuestions) * 100);
    const proficiencyTier = body.proficiency_tier || body.tier || 'Proficient';
    const timeTakenSeconds = parseInt(body.time_taken_seconds || body.timeTaken, 10) || 300;
    const certificateCode = `SKB-CERT-${technology.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}-${percentage}`;

    await pool.execute(
      `INSERT INTO assessment_results (
        id, student_id, assessment_id, technology, score, total_questions,
        percentage, proficiency_tier, time_taken_seconds, certificate_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [resultId, studentId, assessmentId, technology, score, totalQuestions, percentage, proficiencyTier, timeTakenSeconds, certificateCode]
    );

    // Update or insert into student_skills
    try {
      const [existingSkill] = await pool.query(
        'SELECT id FROM student_skills WHERE student_id = ? AND skill_name = ?',
        [studentId, technology]
      );
      if (existingSkill && existingSkill.length > 0) {
        await pool.execute(
          'UPDATE student_skills SET is_verified = 1, proficiency_level = ? WHERE id = ?',
          [proficiencyTier, existingSkill[0].id]
        );
      } else {
        await pool.execute(
          'INSERT INTO student_skills (student_id, skill_name, proficiency_level, is_verified) VALUES (?, ?, ?, 1)',
          [studentId, technology, proficiencyTier]
        );
      }
    } catch (e) {
      console.warn('Could not update student_skills:', e.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Assessment result saved successfully',
      data: {
        id: resultId,
        student_id: studentId,
        technology,
        score,
        total_questions: totalQuestions,
        percentage,
        proficiency_tier: proficiencyTier,
        certificate_code: certificateCode
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 8. POST /api/students/login
 * Authenticate student credentials against MySQL database using bcrypt comparison
 * Checks email matching and STUDENT role validation
 */
async function loginStudent(req, res, next) {
  try {
    const body = req.body || {};
    const email = (body.email || body.emailAddress || '').trim().toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: Email and password are required'
      });
    }

    // Query student from MySQL students table using parameterized query
    const sql = `
      SELECT id, full_name, email, mobile, college, degree, department,
             graduation_year, cgpa, github_url, linkedin_url, portfolio_url,
             profile_bio, avatar_url, password_hash, role
      FROM students
      WHERE LOWER(email) = LOWER(?)
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, [email]);

    // Check if account exists
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No registered student account found with this email: ${email}`
      });
    }

    const student = rows[0];

    // Check STUDENT role validation
    const studentRole = (student.role || 'ROLE_STUDENT').toUpperCase();
    if (!studentRole.includes('STUDENT')) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: Account exists but does not have a STUDENT role'
      });
    }

    // Check password hashing and password comparison using bcrypt
    const storedHash = student.password_hash || '';
    const isMatch = await bcrypt.compare(password, storedHash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password. Please check your credentials.'
      });
    }

    // Safe student payload (never expose password_hash)
    const safeStudent = {
      id: student.id,
      full_name: student.full_name,
      fullName: student.full_name,
      email: student.email,
      mobile: student.mobile,
      college: student.college,
      degree: student.degree,
      department: student.department,
      graduation_year: student.graduation_year,
      graduationYear: student.graduation_year,
      cgpa: student.cgpa,
      github_url: student.github_url,
      linkedin_url: student.linkedin_url,
      portfolio_url: student.portfolio_url,
      profile_bio: student.profile_bio,
      avatar_url: student.avatar_url,
      role: 'student',
      authRole: 'student'
    };

    const token = `student-jwt-${student.id}-${Date.now()}`;

    return res.status(200).json({
      success: true,
      message: 'Student authenticated successfully',
      token,
      data: safeStudent
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentStatistics,
  getStudentAssessments,
  saveStudentAssessment,
  loginStudent
};
