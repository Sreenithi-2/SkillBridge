/**
 * SkillBridge Backend - Company Controller
 * Handles company registration and retrieval
 * Uses bcryptjs for password hashing and parameterized queries with mysql2
 */

const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Standard Email RFC 5322 regex validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Helper to generate a default logo_text from company name
 * E.g., "Tech Solutions" -> "TS", "Infosys" -> "IN"
 */
function generateLogoText(companyName) {
  if (!companyName || typeof companyName !== 'string') return 'SB';
  const words = companyName.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase().slice(0, 10);
  }
  return companyName.trim().slice(0, 2).toUpperCase().slice(0, 10);
}

/**
 * 1. POST /api/companies
 * Register a new company / recruiter account
 */
async function registerCompany(req, res, next) {
  try {
    const body = req.body || {};

    // Extract fields (supporting both snake_case and camelCase)
    const company_name = (body.company_name || body.companyName || '').trim();
    const official_email = (body.official_email || body.officialEmail || '').trim().toLowerCase();
    const contact_person = (body.contact_person || body.contactPerson || '').trim();
    const phone_number = (body.phone_number || body.phoneNumber || body.phone || '').trim();
    const website_url = (body.website_url || body.websiteUrl || body.website || '').trim();
    const industry_domain = (body.industry_domain || body.industryDomain || body.industry || '').trim();
    const company_size = (body.company_size || body.companySize || '').trim();
    const location = (body.location || '').trim();
    const description = (body.description || '').trim();
    const password = typeof body.password === 'string' ? body.password : '';

    // 1. Validate required fields
    const missingFields = [];
    if (!company_name) missingFields.push('company_name');
    if (!official_email) missingFields.push('official_email');
    if (!contact_person) missingFields.push('contact_person');
    if (!phone_number) missingFields.push('phone_number');
    if (!website_url) missingFields.push('website_url');
    if (!industry_domain) missingFields.push('industry_domain');
    if (!company_size) missingFields.push('company_size');
    if (!location) missingFields.push('location');
    if (!description) missingFields.push('description');
    if (!password) missingFields.push('password');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: Missing required fields [${missingFields.join(', ')}]`,
        missingFields
      });
    }

    // 2. Validate official email format
    if (!EMAIL_REGEX.test(official_email)) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: Invalid official email format',
        field: 'official_email'
      });
    }

    // 3. Validate password length (minimum 8 characters)
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: Password must be at least 8 characters long',
        field: 'password'
      });
    }

    // 4. Check for duplicate company name or official email
    const checkSql = 'SELECT id, company_name, official_email FROM companies WHERE company_name = ? OR official_email = ? LIMIT 1';
    const [existing] = await pool.execute(checkSql, [company_name, official_email]);

    if (existing && existing.length > 0) {
      const match = existing[0];
      const isEmailDup = match.official_email.toLowerCase() === official_email;
      const isNameDup = match.company_name.toLowerCase() === company_name.toLowerCase();

      let errorMessage = 'A company with this company name or official email already exists';
      let conflictField = 'official_email';

      if (isNameDup && isEmailDup) {
        errorMessage = `Both company name '${company_name}' and email '${official_email}' are already registered`;
        conflictField = 'company_name, official_email';
      } else if (isNameDup) {
        errorMessage = `Company name '${company_name}' is already registered`;
        conflictField = 'company_name';
      } else if (isEmailDup) {
        errorMessage = `Official email '${official_email}' is already registered`;
        conflictField = 'official_email';
      }

      return res.status(409).json({
        success: false,
        error: errorMessage,
        conflictField
      });
    }

    // 5. Hash password securely with bcryptjs (salt rounds = 10)
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // 6. Generate unique company ID and default attributes
    const companyId = `comp-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex')}`;
    const logo_text = (body.logo_text || body.logoText || generateLogoText(company_name)).trim().slice(0, 10);
    const logo_bg_color = (body.logo_bg_color || body.logoBgColor || '#4f46e5').trim();
    const logo_url = (body.logo_url || body.logoUrl || '').trim() || null;
    const role = 'ROLE_RECRUITER';
    const is_verified = body.is_verified !== undefined ? Boolean(body.is_verified) : true;

    // 7. Insert company using parameterized SQL query
    const insertSql = `
      INSERT INTO companies (
        id, company_name, official_email, contact_person, phone_number,
        website_url, industry_domain, company_size, location, description,
        logo_url, logo_text, logo_bg_color, password_hash, role, is_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(insertSql, [
      companyId,
      company_name,
      official_email,
      contact_person,
      phone_number,
      website_url,
      industry_domain,
      company_size,
      location,
      description,
      logo_url,
      logo_text,
      logo_bg_color,
      password_hash,
      role,
      is_verified
    ]);

    // 8. Return HTTP 201 Created (strictly omitting password and password_hash)
    return res.status(201).json({
      success: true,
      message: 'Company registered successfully',
      data: {
        id: companyId,
        company_name,
        official_email
      }
    });

  } catch (error) {
    // Handle MySQL duplicate entry race condition (Error 1062 / ER_DUP_ENTRY)
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return res.status(409).json({
        success: false,
        error: 'Conflict: Company name or official email already exists',
        detail: error.message
      });
    }
    next(error);
  }
}

/**
 * 2. GET /api/companies
 * List registered companies (public profile fields only, omitting password_hash)
 */
async function getAllCompanies(req, res, next) {
  try {
    const { search, domain, limit = 50, offset = 0 } = req.query;
    const queryParams = [];
    let sql = `
      SELECT id, company_name, official_email, contact_person, phone_number,
             website_url, industry_domain, company_size, location, description,
             logo_url, logo_text, logo_bg_color, role, is_verified, created_at, updated_at
      FROM companies
      WHERE 1=1
    `;

    if (search && search.trim()) {
      sql += ' AND (company_name LIKE ? OR official_email LIKE ? OR location LIKE ?)';
      const term = `%${search.trim()}%`;
      queryParams.push(term, term, term);
    }

    if (domain && domain.trim()) {
      sql += ' AND industry_domain = ?';
      queryParams.push(domain.trim());
    }

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
 * 3. GET /api/companies/:id
 * Retrieve a single company profile by ID (omitting password_hash)
 */
async function getCompanyById(req, res, next) {
  try {
    const { id } = req.params;
    if (!id || !id.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Company ID parameter is required'
      });
    }

    const sql = `
      SELECT id, company_name, official_email, contact_person, phone_number,
             website_url, industry_domain, company_size, location, description,
             logo_url, logo_text, logo_bg_color, role, is_verified, created_at, updated_at
      FROM companies
      WHERE id = ?
    `;

    const [rows] = await pool.execute(sql, [id.trim()]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Company with ID '${id}' not found`
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
 * 4. POST /api/companies/login
 * Authenticate company / recruiter account
 * Accepts official_email and password
 */
async function loginCompany(req, res, next) {
  try {
    const body = req.body || {};

    const official_email = (body.official_email || body.officialEmail || body.email || '').trim().toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';

    // Validate required fields
    if (!official_email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: official_email and password are required'
      });
    }

    // Find the company using official_email in MySQL using parameterized SQL query
    const sql = `
      SELECT id, company_name, official_email, contact_person, phone_number,
             website_url, industry_domain, company_size, location, description,
             logo_url, logo_text, logo_bg_color, password_hash, role, is_verified
      FROM companies
      WHERE official_email = ?
      LIMIT 1
    `;

    const [rows] = await pool.execute(sql, [official_email]);

    // Return HTTP 401 for invalid email
    if (!rows || rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid official email or password'
      });
    }

    const company = rows[0];

    // Compare the entered password with the stored password_hash using bcryptjs.compare()
    // Never compare plain-text passwords or expose password_hash
    const isMatch = await bcrypt.compare(password, company.password_hash);

    // Return HTTP 401 for invalid password
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid official email or password'
      });
    }

    // Return HTTP 200 for successful login with only safe company details
    return res.status(200).json({
      success: true,
      message: 'Company logged in successfully',
      data: {
        id: company.id,
        company_name: company.company_name,
        official_email: company.official_email,
        role: company.role || 'ROLE_RECRUITER',
        contact_person: company.contact_person,
        phone_number: company.phone_number,
        website_url: company.website_url,
        industry_domain: company.industry_domain,
        company_size: company.company_size,
        location: company.location,
        description: company.description,
        logo_url: company.logo_url,
        logo_text: company.logo_text,
        logo_bg_color: company.logo_bg_color,
        is_verified: Boolean(company.is_verified)
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * 5. PUT /api/companies/:id
 * Update an existing company profile in MySQL
 * Accepts company_name, contact_person, phone_number, website_url,
 * industry_domain, company_size, location, description, logo_url, logo_text, logo_bg_color
 */
async function updateCompany(req, res, next) {
  try {
    const { id } = req.params;
    if (!id || !id.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: Company ID parameter is required'
      });
    }

    const companyId = id.trim();

    // 1. Verify company exists in MySQL using parameterized query
    const [existingRows] = await pool.execute(
      `SELECT id, company_name, official_email, contact_person, phone_number,
              website_url, industry_domain, company_size, location, description,
              logo_url, logo_text, logo_bg_color, role, is_verified
       FROM companies
       WHERE id = ?`,
      [companyId]
    );

    if (!existingRows || existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Company with ID '${companyId}' not found`
      });
    }

    const existing = existingRows[0];
    const body = req.body || {};

    // 2. Extract and sanitize fields (supporting snake_case and camelCase)
    const company_name = body.company_name !== undefined ? String(body.company_name).trim() :
                         body.companyName !== undefined ? String(body.companyName).trim() : existing.company_name;

    const contact_person = body.contact_person !== undefined ? String(body.contact_person).trim() :
                           body.contactPerson !== undefined ? String(body.contactPerson).trim() : existing.contact_person;

    const phone_number = body.phone_number !== undefined ? String(body.phone_number).trim() :
                         body.phoneNumber !== undefined ? String(body.phoneNumber).trim() :
                         body.phone !== undefined ? String(body.phone).trim() : (existing.phone_number || '');

    const website_url = body.website_url !== undefined ? String(body.website_url).trim() :
                        body.websiteUrl !== undefined ? String(body.websiteUrl).trim() :
                        body.website !== undefined ? String(body.website).trim() : (existing.website_url || '');

    const industry_domain = body.industry_domain !== undefined ? String(body.industry_domain).trim() :
                            body.industryDomain !== undefined ? String(body.industryDomain).trim() :
                            body.industry !== undefined ? String(body.industry).trim() : (existing.industry_domain || '');

    const company_size = body.company_size !== undefined ? String(body.company_size).trim() :
                         body.companySize !== undefined ? String(body.companySize).trim() : (existing.company_size || '');

    const location = body.location !== undefined ? String(body.location).trim() : (existing.location || '');

    const description = body.description !== undefined ? String(body.description).trim() : (existing.description || '');

    const logo_url = body.logo_url !== undefined ? String(body.logo_url).trim() :
                     body.logoUrl !== undefined ? String(body.logoUrl).trim() : existing.logo_url;

    const logo_text = body.logo_text !== undefined ? String(body.logo_text).trim() :
                      body.logoText !== undefined ? String(body.logoText).trim() : existing.logo_text;

    const logo_bg_color = body.logo_bg_color !== undefined ? String(body.logo_bg_color).trim() :
                          body.logoBgColor !== undefined ? String(body.logoBgColor).trim() : existing.logo_bg_color;

    // 3. Validation: company_name and contact_person cannot be empty
    if (!company_name) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: company_name cannot be empty'
      });
    }

    if (!contact_person) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: contact_person cannot be empty'
      });
    }

    // 4. Duplicate company name check (if name has changed)
    if (company_name.toLowerCase() !== existing.company_name.toLowerCase()) {
      const [nameConflict] = await pool.execute(
        'SELECT id FROM companies WHERE LOWER(company_name) = LOWER(?) AND id != ? LIMIT 1',
        [company_name, companyId]
      );
      if (nameConflict && nameConflict.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Conflict: Company name is already registered by another organization'
        });
      }
    }

    // 5. Parameterized SQL UPDATE
    const updateSql = `
      UPDATE companies
      SET company_name = ?,
          contact_person = ?,
          phone_number = ?,
          website_url = ?,
          industry_domain = ?,
          company_size = ?,
          location = ?,
          description = ?,
          logo_url = ?,
          logo_text = ?,
          logo_bg_color = ?,
          updated_at = NOW()
      WHERE id = ?
    `;

    await pool.execute(updateSql, [
      company_name,
      contact_person,
      phone_number,
      website_url,
      industry_domain,
      company_size,
      location,
      description,
      logo_url,
      logo_text,
      logo_bg_color,
      companyId
    ]);

    // 6. Cascade update company_name and logo in internships table if any exist
    try {
      await pool.execute(
        `UPDATE internships 
         SET company_name = ?,
             company_logo_text = COALESCE(?, company_logo_text),
             logo_bg_color = COALESCE(?, logo_bg_color)
         WHERE company_id = ?`,
        [company_name, logo_text, logo_bg_color, companyId]
      );
    } catch (cascadeErr) {
      console.warn('[CompanyController] Warning updating internships cascade:', cascadeErr.message);
    }

    // 7. Retrieve updated company profile from MySQL (excluding password_hash)
    const [updatedRows] = await pool.execute(
      `SELECT id, company_name, official_email, contact_person, phone_number,
              website_url, industry_domain, company_size, location, description,
              logo_url, logo_text, logo_bg_color, role, is_verified, created_at, updated_at
       FROM companies
       WHERE id = ?`,
      [companyId]
    );

    return res.status(200).json({
      success: true,
      message: 'Company profile updated successfully',
      data: updatedRows[0]
    });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'Conflict: Company name or official email already exists',
        detail: error.message
      });
    }
    next(error);
  }
}

/**
 * 6. GET /api/companies/:id/ai-matching
 * Algorithmic candidate matching comparing company's active internships against
 * registered students, verified assessment results, and skill competencies.
 */
async function getAiCandidateMatching(req, res, next) {
  try {
    const companyId = (req.params.id || '').trim();
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }

    // 1. Fetch company's active internships
    const [internships] = await pool.query(
      'SELECT id, title, domain, workplace_mode FROM internships WHERE company_id = ? AND is_active = 1',
      [companyId]
    );

    if (!internships || internships.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    const internshipIds = internships.map(i => i.id);

    // 2. Fetch required skills for each internship
    const [requiredSkillRows] = await pool.query(
      'SELECT internship_id, skill_name, is_mandatory FROM internship_required_skills WHERE internship_id IN (?)',
      [internshipIds]
    );
    const reqSkillsMap = {};
    requiredSkillRows.forEach(rs => {
      if (!reqSkillsMap[rs.internship_id]) reqSkillsMap[rs.internship_id] = [];
      reqSkillsMap[rs.internship_id].push(rs.skill_name);
    });

    // 3. Fetch applications for these internships
    const [applications] = await pool.query(
      `SELECT a.id, a.student_id, a.internship_id, a.status, a.ai_match_score, a.notes, a.applied_at
       FROM applications a
       WHERE a.internship_id IN (?)`,
      [internshipIds]
    );

    // 4. Fetch students, student_skills, and assessment_results
    const [students] = await pool.query(
      'SELECT id, full_name, email, mobile, college, department, graduation_year, cgpa FROM students'
    );
    const [skillsRows] = await pool.query(
      'SELECT student_id, skill_name, proficiency_level, is_verified FROM student_skills'
    );
    const [assessRows] = await pool.query(
      'SELECT student_id, technology, score, total_questions, percentage, proficiency_tier FROM assessment_results'
    );

    const skillsByStudent = {};
    skillsRows.forEach(sr => {
      if (!skillsByStudent[sr.student_id]) skillsByStudent[sr.student_id] = [];
      skillsByStudent[sr.student_id].push(sr);
    });

    const assessByStudent = {};
    assessRows.forEach(ar => {
      if (!assessByStudent[ar.student_id]) assessByStudent[ar.student_id] = [];
      assessByStudent[ar.student_id].push(ar);
    });

    // 5. Build candidate matches
    const matches = [];

    internships.forEach(internship => {
      const reqSkills = reqSkillsMap[internship.id] || ['Java', 'Spring Boot', 'MySQL'];

      students.forEach(student => {
        const studentSkills = skillsByStudent[student.id] || [];
        const studentAssess = assessByStudent[student.id] || [];
        const app = applications.find(a => a.student_id === student.id && a.internship_id === internship.id);

        const matchedSkills = [];
        const missingSkills = [];

        reqSkills.forEach(reqSkill => {
          const matched = studentSkills.find(ss => ss.skill_name.toLowerCase() === reqSkill.toLowerCase());
          const assessment = studentAssess.find(sa => sa.technology.toLowerCase() === reqSkill.toLowerCase());
          if (matched || assessment) {
            const score = assessment ? assessment.percentage : (matched && matched.is_verified ? 90 : 75);
            matchedSkills.push({
              name: reqSkill,
              score,
              isVerified: true
            });
          } else {
            missingSkills.push(reqSkill);
          }
        });

        // Calculate fit score
        let matchScore = 0;
        if (reqSkills.length > 0) {
          const skillRatio = matchedSkills.length / reqSkills.length;
          const avgScore = matchedSkills.length > 0
            ? matchedSkills.reduce((acc, m) => acc + m.score, 0) / matchedSkills.length
            : 60;
          matchScore = Math.round(skillRatio * avgScore);
          if (app && typeof app.ai_match_score === 'number' && app.ai_match_score > 0) {
            matchScore = Math.max(matchScore, app.ai_match_score);
          }
        }
        matchScore = Math.min(Math.max(matchScore, 45), 98);

        // Include candidate if they applied or have at least 50% match
        if (app || matchScore >= 50) {
          const assessSummary = studentAssess.length > 0
            ? studentAssess.map(sa => `${sa.technology} (${sa.percentage}%)`).join(', ')
            : (matchedSkills.length > 0 ? matchedSkills.map(m => `${m.name} (${m.score}%)`).join(', ') : 'Pending Assessment');

          matches.push({
            id: app ? app.id : `cand-${student.id}-${internship.id}`,
            candidateId: student.id,
            candidateName: student.full_name,
            email: student.email,
            phone: student.mobile || '+91 98765 43210',
            college: student.college || 'Engineering College',
            degree: student.department || 'B.E. Computer Science',
            appliedRole: internship.title,
            internshipId: internship.id,
            fitScore: matchScore,
            matchedSkills,
            missingSkills,
            assessmentSummary: assessSummary,
            status: app ? app.status : 'Recommended',
            isApplied: Boolean(app),
            applicationId: app ? app.id : null,
            notes: app && app.notes ? app.notes : `Strong technical match with verified competencies in ${matchedSkills.map(m=>m.name).join(', ') || 'core tech'}.`
          });
        }
      });
    });

    matches.sort((a, b) => b.fitScore - a.fitScore);

    return res.status(200).json({
      success: true,
      count: matches.length,
      data: matches
    });

  } catch (error) {
    next(error);
  }
}

/**
 * 7. POST /api/companies/:id/ai-matching/rescore
 * Re-scores candidate matches and persists updated ai_match_score into applications table
 */
async function rescoreAiCandidates(req, res, next) {
  try {
    const companyId = (req.params.id || '').trim();
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }

    // Call candidate matching logic
    const reqSimulated = { params: { id: companyId }, query: {} };
    let matchingData = [];
    const resSimulated = {
      status: () => ({
        json: (payload) => {
          if (payload && payload.data) matchingData = payload.data;
        }
      })
    };

    await getAiCandidateMatching(reqSimulated, resSimulated, next);

    // Update MySQL applications table with recalculated scores
    for (const match of matchingData) {
      if (match.applicationId) {
        await pool.execute(
          'UPDATE applications SET ai_match_score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [match.fitScore, match.applicationId]
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Candidate AI match scores successfully recalculated and persisted to database',
      count: matchingData.length,
      data: matchingData
    });

  } catch (error) {
    next(error);
  }
}

module.exports = {
  registerCompany,
  getAllCompanies,
  getCompanyById,
  loginCompany,
  updateCompany,
  getAiCandidateMatching,
  rescoreAiCandidates
};
