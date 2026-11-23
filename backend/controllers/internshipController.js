/**
 * SkillBridge Backend - Internship Controller
 * Handles internship listing, single retrieval, and creation
 * Uses parameterized queries with mysql2 for SQL-injection protection
 */

const { pool } = require('../config/db');
const crypto = require('crypto');

/**
 * 1. GET /api/internships
 * Fetch all internships with optional filters (domain, workplace_mode, location, search, min_stipend)
 */
async function getAllInternships(req, res, next) {
  try {
    const {
      search,
      domain,
      workplace_mode,
      workplaceMode,
      location,
      min_stipend,
      minStipend,
      company_id,
      companyId,
      is_active,
      isActive,
      limit = 50,
      offset = 0
    } = req.query;

    const queryParams = [];
    let sql = `
      SELECT id, company_id, posted_by, title, company_name, company_logo_text,
             logo_bg_color, domain, workplace_mode, location, stipend_amount,
             stipend_display, duration, openings_count, application_deadline,
             description, eligibility_criteria, is_active, created_at, updated_at
      FROM internships
      WHERE 1=1
    `;

    // Filter by active status (default to active unless specified otherwise)
    const activeFilter = is_active !== undefined ? is_active : isActive;
    if (activeFilter !== 'all') {
      const activeBool = activeFilter === 'false' || activeFilter === '0' ? false : true;
      sql += ' AND is_active = ?';
      queryParams.push(activeBool);
    }

    // Filter by domain (e.g., 'Backend', 'Frontend', 'Data', etc.)
    if (domain && domain.trim()) {
      sql += ' AND domain = ?';
      queryParams.push(domain.trim());
    }

    // Filter by workplace mode (e.g., 'Remote', 'Hybrid', 'On-site')
    const mode = (workplace_mode || workplaceMode || '').trim();
    if (mode) {
      sql += ' AND workplace_mode = ?';
      queryParams.push(mode);
    }

    // Filter by location
    if (location && location.trim()) {
      sql += ' AND location LIKE ?';
      queryParams.push(`%${location.trim()}%`);
    }

    // Filter by minimum stipend
    const stipendVal = parseInt(min_stipend || minStipend, 10);
    if (!isNaN(stipendVal) && stipendVal > 0) {
      sql += ' AND stipend_amount >= ?';
      queryParams.push(stipendVal);
    }

    // Filter by company ID
    const targetCompId = (company_id || companyId || '').trim();
    if (targetCompId) {
      sql += ' AND company_id = ?';
      queryParams.push(targetCompId);
    }

    // Search filter across title, company_name, location, domain, and description
    if (search && search.trim()) {
      sql += ' AND (title LIKE ? OR company_name LIKE ? OR location LIKE ? OR domain LIKE ? OR description LIKE ?)';
      const term = `%${search.trim()}%`;
      queryParams.push(term, term, term, term, term);
    }

    // Sorting and Pagination
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(Math.min(parseInt(limit, 10) || 50, 100), Math.max(parseInt(offset, 10) || 0, 0));

    const [rows] = await pool.query(sql, queryParams);

    // Concurrently fetch and attach required skills for all returned internships
    if (rows && rows.length > 0) {
      try {
        const ids = rows.map(r => r.id);
        const [skillRows] = await pool.query(
          'SELECT internship_id, skill_name, is_mandatory FROM internship_required_skills WHERE internship_id IN (?) ORDER BY id ASC',
          [ids]
        );
        const skillsByInternship = {};
        skillRows.forEach(sr => {
          if (!skillsByInternship[sr.internship_id]) skillsByInternship[sr.internship_id] = [];
          skillsByInternship[sr.internship_id].push(sr.skill_name);
        });
        rows.forEach(r => {
          r.skills = skillsByInternship[r.id] || [];
          r.required_skills = skillsByInternship[r.id] || [];
        });
      } catch (skillErr) {
        console.warn('[getAllInternships] Warning: Could not fetch child skills:', skillErr.message);
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
 * 2. GET /api/internships/:id
 * Retrieve a single internship by its unique ID, including associated skills, responsibilities, and perks
 */
async function getInternshipById(req, res, next) {
  try {
    const { id } = req.params;

    if (!id || !id.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Internship ID parameter is required'
      });
    }

    const internshipSql = `
      SELECT id, company_id, posted_by, title, company_name, company_logo_text,
             logo_bg_color, domain, workplace_mode, location, stipend_amount,
             stipend_display, duration, openings_count, application_deadline,
             description, eligibility_criteria, is_active, created_at, updated_at
      FROM internships
      WHERE id = ?
    `;

    const [rows] = await pool.execute(internshipSql, [id.trim()]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Internship with ID '${id}' not found`
      });
    }

    const internship = rows[0];

    // Fetch related child data concurrently
    const [skillsRows] = await pool.execute(
      'SELECT skill_name, is_mandatory FROM internship_required_skills WHERE internship_id = ? ORDER BY id ASC',
      [id.trim()]
    ).catch(() => [[]]);

    const [respRows] = await pool.execute(
      'SELECT responsibility_text, display_order FROM internship_responsibilities WHERE internship_id = ? ORDER BY display_order ASC, id ASC',
      [id.trim()]
    ).catch(() => [[]]);

    const [perksRows] = await pool.execute(
      'SELECT perk_text FROM internship_perks WHERE internship_id = ? ORDER BY id ASC',
      [id.trim()]
    ).catch(() => [[]]);

    internship.required_skills = skillsRows.map(s => s.skill_name);
    internship.responsibilities = respRows.map(r => r.responsibility_text);
    internship.perks = perksRows.map(p => p.perk_text);

    return res.status(200).json({
      success: true,
      data: internship
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 3. POST /api/internships
 * Create / Post a new internship opportunity
 */
async function createInternship(req, res, next) {
  try {
    const body = req.body || {};

    // Extract fields (supporting both snake_case and camelCase)
    const company_id = (body.company_id || body.companyId || '').trim();
    const title = (body.title || '').trim();
    const domain = (body.domain || '').trim();
    let workplace_mode = (body.workplace_mode || body.workplaceMode || '').trim();
    const location = (body.location || '').trim();
    let stipend_amount = body.stipend_amount !== undefined ? body.stipend_amount : body.stipendAmount;
    let stipend_display = (body.stipend_display || body.stipendDisplay || '').trim();
    const duration = (body.duration || '').trim();
    let openings_count = body.openings_count !== undefined ? body.openings_count : body.openingsCount;
    let application_deadline = (body.application_deadline || body.applicationDeadline || '').trim();
    const description = (body.description || '').trim();
    const eligibility_criteria = (body.eligibility_criteria || body.eligibilityCriteria || '').trim();
    const posted_by = (body.posted_by || body.postedBy || '').trim() || null;
    let company_name = (body.company_name || body.companyName || '').trim();
    let company_logo_text = (body.company_logo_text || body.companyLogoText || '').trim();
    let logo_bg_color = (body.logo_bg_color || body.logoBgColor || '').trim();

    // 1. Validate required fields
    const missingFields = [];
    if (!title) missingFields.push('title');
    if (!company_id) missingFields.push('company_id');
    if (!domain) missingFields.push('domain');
    if (!workplace_mode) missingFields.push('workplace_mode');
    if (!location) missingFields.push('location');
    if (stipend_amount === undefined || stipend_amount === null || stipend_amount === '') missingFields.push('stipend_amount');
    if (!duration) missingFields.push('duration');
    if (!application_deadline) missingFields.push('application_deadline');
    if (!description) missingFields.push('description');
    if (!eligibility_criteria) missingFields.push('eligibility_criteria');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: Missing required fields [${missingFields.join(', ')}]`,
        missingFields
      });
    }

    // 2. Validate workplace_mode ENUM ('Remote', 'Hybrid', 'On-site')
    const modeLower = workplace_mode.toLowerCase();
    if (modeLower === 'remote') {
      workplace_mode = 'Remote';
    } else if (modeLower === 'hybrid') {
      workplace_mode = 'Hybrid';
    } else if (modeLower === 'on-site' || modeLower === 'onsite' || modeLower === 'on site') {
      workplace_mode = 'On-site';
    } else {
      return res.status(400).json({
        success: false,
        error: "Validation failed: workplace_mode must be one of 'Remote', 'Hybrid', 'On-site'",
        field: 'workplace_mode'
      });
    }

    // 3. Validate stipend_amount
    stipend_amount = parseInt(stipend_amount, 10);
    if (isNaN(stipend_amount) || stipend_amount < 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: stipend_amount must be a valid non-negative number',
        field: 'stipend_amount'
      });
    }

    // 4. Validate application_deadline format (YYYY-MM-DD)
    const deadlineDate = new Date(application_deadline);
    if (isNaN(deadlineDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: application_deadline must be a valid date format (e.g. YYYY-MM-DD)',
        field: 'application_deadline'
      });
    }
    // Format to YYYY-MM-DD
    application_deadline = deadlineDate.toISOString().split('T')[0];

    // 5. Verify that company_id exists in the companies table
    const [companyRows] = await pool.execute(
      'SELECT id, company_name, logo_text, logo_bg_color FROM companies WHERE id = ?',
      [company_id]
    );

    if (!companyRows || companyRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Foreign key validation failed: Company with ID '${company_id}' not found`,
        field: 'company_id'
      });
    }

    const companyData = companyRows[0];
    if (!company_name) company_name = companyData.company_name;
    if (!company_logo_text) company_logo_text = companyData.logo_text || companyData.company_name.slice(0, 2).toUpperCase();
    if (!logo_bg_color) logo_bg_color = companyData.logo_bg_color || '#4f46e5';

    // 6. Handle openings_count and stipend_display defaults
    openings_count = parseInt(openings_count, 10);
    if (isNaN(openings_count) || openings_count < 1) {
      openings_count = 1;
    }

    if (!stipend_display) {
      stipend_display = `₹${stipend_amount.toLocaleString('en-IN')} / month`;
    }

    // 7. Verify posted_by if provided (must reference recruiters table)
    let validatedPostedBy = null;
    if (posted_by) {
      const [recruiterRows] = await pool.execute(
        'SELECT id FROM recruiters WHERE id = ?',
        [posted_by]
      ).catch(() => [[]]);
      if (recruiterRows && recruiterRows.length > 0) {
        validatedPostedBy = posted_by;
      }
    }

    // 8. Generate unique internship ID
    const internshipId = `int-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex')}`;

    // 9. Insert into internships table using parameterized SQL query
    const insertSql = `
      INSERT INTO internships (
        id, company_id, posted_by, title, company_name, company_logo_text,
        logo_bg_color, domain, workplace_mode, location, stipend_amount,
        stipend_display, duration, openings_count, application_deadline,
        description, eligibility_criteria, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
    `;

    await pool.execute(insertSql, [
      internshipId,
      company_id,
      validatedPostedBy,
      title,
      company_name,
      company_logo_text,
      logo_bg_color,
      domain,
      workplace_mode,
      location,
      stipend_amount,
      stipend_display,
      duration,
      openings_count,
      application_deadline,
      description,
      eligibility_criteria
    ]);

    // 10. Insert optional child elements (skills, responsibilities, perks) if provided
    const skills = Array.isArray(body.skills) ? body.skills : (Array.isArray(body.required_skills) ? body.required_skills : []);
    if (skills.length > 0) {
      for (const skill of skills) {
        const skillName = typeof skill === 'string' ? skill.trim() : (skill && skill.skill_name ? String(skill.skill_name).trim() : '');
        if (skillName) {
          const isMandatory = skill && skill.is_mandatory !== undefined ? Boolean(skill.is_mandatory) : true;
          await pool.execute(
            'INSERT INTO internship_required_skills (internship_id, skill_name, is_mandatory) VALUES (?, ?, ?)',
            [internshipId, skillName, isMandatory]
          ).catch(err => console.warn('Warning: Could not insert skill:', err.message));
        }
      }
    }

    const responsibilities = Array.isArray(body.responsibilities) ? body.responsibilities : [];
    if (responsibilities.length > 0) {
      let order = 1;
      for (const resp of responsibilities) {
        const respText = typeof resp === 'string' ? resp.trim() : (resp && resp.responsibility_text ? String(resp.responsibility_text).trim() : '');
        if (respText) {
          await pool.execute(
            'INSERT INTO internship_responsibilities (internship_id, responsibility_text, display_order) VALUES (?, ?, ?)',
            [internshipId, respText, order++]
          ).catch(err => console.warn('Warning: Could not insert responsibility:', err.message));
        }
      }
    }

    const perks = Array.isArray(body.perks) ? body.perks : [];
    if (perks.length > 0) {
      for (const perk of perks) {
        const perkText = typeof perk === 'string' ? perk.trim() : (perk && perk.perk_text ? String(perk.perk_text).trim() : '');
        if (perkText) {
          await pool.execute(
            'INSERT INTO internship_perks (internship_id, perk_text) VALUES (?, ?)',
            [internshipId, perkText]
          ).catch(err => console.warn('Warning: Could not insert perk:', err.message));
        }
      }
    }

    // 11. Return HTTP 201 Created
    return res.status(201).json({
      success: true,
      message: 'Internship created successfully',
      data: {
        id: internshipId,
        company_id,
        company_name,
        title,
        domain,
        workplace_mode,
        location,
        stipend_amount,
        stipend_display,
        duration,
        openings_count,
        application_deadline,
        skills_count: skills.length
      }
    });

  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452) {
      return res.status(400).json({
        success: false,
        error: 'Foreign key constraint violation: Provided company_id or posted_by does not exist',
        detail: error.message
      });
    }
    next(error);
  }
}

module.exports = {
  getAllInternships,
  getInternshipById,
  createInternship
};
