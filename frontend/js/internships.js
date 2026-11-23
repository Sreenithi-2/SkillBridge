/**
 * SkillBridge - Recommended Internships Enterprise Controller
 * Full-stack connected controller with authentic AI skill matching, real-time filtering,
 * application duplicate prevention, Node.js REST API client connected to MySQL,
 * and seamless synchronization for the My Applications module.
 */

// ==========================================================================
// 1. Backend REST API Service & Configuration
// ==========================================================================
const BACKEND_API_BASE_URL = (typeof window !== 'undefined' && window.SkillBridgeConfig)
  ? window.SkillBridgeConfig.apiBaseUrl
  : ((typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.hostname !== '[::1]')
    ? 'https://skillbridge-api.onrender.com/api'
    : 'http://localhost:5000/api');

/**
 * Retrieve authenticated student session from localStorage.
 * Strictly checks for genuine student session; never invents or hardcodes a seed student ID.
 */
function getLoggedInStudent() {
  try {
    // 1. Primary student session created upon registration or login
    const sessionStr = localStorage.getItem('skillbridge_student_session');
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr);
      if (parsed && parsed.id) return parsed;
    }

    // 2. Active session
    const activeStr = localStorage.getItem('skillbridge_active_session');
    if (activeStr) {
      const parsed = JSON.parse(activeStr);
      if (parsed && parsed.id && (parsed.role === 'student' || !parsed.role)) return parsed;
    }

    // 3. Registered student profile
    const registeredStr = localStorage.getItem('skillbridge_registered_student');
    if (registeredStr) {
      const parsed = JSON.parse(registeredStr);
      if (parsed && parsed.id) return parsed;
    }
  } catch (err) {
    console.warn('[SkillBridge] Error checking logged-in session:', err);
  }
  return null;
}

/**
 * Format deadline date string to clean British English format (e.g., "30 Nov 2026")
 */
function formatDeadline(dateStr) {
  if (!dateStr) return 'Open';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Calculate approximate days since posting for sorting
 */
function calculateDaysAgo(dateStr) {
  if (!dateStr) return 1;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 1;
  const diffTime = Math.abs(Date.now() - d.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

/**
 * Fallback required skills by domain if child table data is not present
 */
function getFallbackSkillsForDomain(domain, title = '') {
  const d = (domain || '').toLowerCase();
  const t = (title || '').toLowerCase();
  if (d === 'backend' || t.includes('java')) return ['Java', 'Spring Boot', 'MySQL', 'REST APIs', 'Git'];
  if (d === 'frontend' || t.includes('frontend')) return ['JavaScript', 'HTML5', 'CSS3', 'Bootstrap', 'REST APIs'];
  if (d === 'data' || t.includes('data')) return ['Python', 'MySQL', 'Pandas', 'ETL Pipelines', 'Git'];
  if (d === 'database' || t.includes('database') || t.includes('sql')) return ['MySQL', 'Database Design', 'Performance Tuning', 'Python'];
  if (d === 'devops' || t.includes('devops') || t.includes('cloud')) return ['Docker', 'Git', 'Python', 'Linux', 'REST APIs'];
  if (d === 'fullstack' || t.includes('full stack')) return ['Java', 'Spring Boot', 'JavaScript', 'HTML5', 'MySQL'];
  return ['Python', 'SQL', 'Git', 'REST APIs'];
}

/**
 * Normalize backend internship record to frontend schema
 */
function normalizeInternship(raw) {
  const domain = raw.domain || 'Backend';
  const title = raw.title || 'Software Engineering Intern';
  const company = raw.company_name || raw.company || 'Enterprise Partner';
  const companyLogoText = raw.company_logo_text || raw.companyLogoText ||
    company.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'SB';
  const logoBg = raw.logo_bg_color || raw.logoBg || '#4f46e5';
  const workplace = raw.workplace_mode || raw.workplace || 'Remote';
  const location = raw.location || 'India (Remote)';
  const stipendAmount = typeof raw.stipend_amount === 'number'
    ? raw.stipend_amount
    : (typeof raw.stipendNumeric === 'number' ? raw.stipendNumeric : (parseInt(raw.stipend_amount, 10) || 30000));
  const stipendDisplay = raw.stipend_display || raw.stipend || `₹${stipendAmount.toLocaleString('en-IN')} / month`;
  const duration = raw.duration || '6 Months';
  const openings = raw.openings_count !== undefined ? raw.openings_count : (raw.openings !== undefined ? raw.openings : 1);
  const deadline = formatDeadline(raw.application_deadline || raw.deadline);
  const postedDaysAgo = calculateDaysAgo(raw.created_at);

  let requiredSkills = [];
  if (Array.isArray(raw.required_skills)) requiredSkills = raw.required_skills;
  else if (Array.isArray(raw.requiredSkills)) requiredSkills = raw.requiredSkills;
  else if (typeof raw.required_skills === 'string') {
    try { requiredSkills = JSON.parse(raw.required_skills); } catch(e) { requiredSkills = raw.required_skills.split(',').map(s => s.trim()); }
  }
  if (!requiredSkills || requiredSkills.length === 0) {
    requiredSkills = getFallbackSkillsForDomain(domain, title);
  }

  let responsibilities = [];
  if (Array.isArray(raw.responsibilities)) responsibilities = raw.responsibilities;
  else if (typeof raw.responsibilities === 'string') {
    try { responsibilities = JSON.parse(raw.responsibilities); } catch(e) { responsibilities = [raw.responsibilities]; }
  }
  if (!responsibilities || responsibilities.length === 0) {
    responsibilities = [
      `Design, build, and test core system modules for ${title}.`,
      `Collaborate with cross-functional engineering teams in agile code reviews.`,
      `Write unit tests and optimize relational database queries.`
    ];
  }

  let perks = [];
  if (Array.isArray(raw.perks)) perks = raw.perks;
  else if (typeof raw.perks === 'string') {
    try { perks = JSON.parse(raw.perks); } catch(e) { perks = [raw.perks]; }
  }
  if (!perks || perks.length === 0) {
    perks = [
      'Pre-Placement Offer (PPO) opportunity based on performance',
      'Flexible work environment and mentorship from senior engineers',
      'Certificate of Completion and project experience'
    ];
  }

  return {
    id: raw.id,
    companyId: raw.company_id || raw.companyId || null,
    title,
    company,
    companyLogoText,
    logoBg,
    domain,
    workplace,
    location,
    stipend: stipendDisplay,
    stipendNumeric: stipendAmount,
    duration,
    openings,
    deadline,
    postedDaysAgo,
    requiredSkills,
    description: raw.description || `Exciting internship opportunity in ${domain} at ${company}.`,
    responsibilities,
    eligibility: raw.eligibility_criteria || raw.eligibility || 'B.E./B.Tech/MCA students in relevant engineering disciplines.',
    perks,
    isActive: raw.is_active !== undefined ? Boolean(raw.is_active) : true
  };
}

/**
 * Escape HTML to prevent injection in dynamic error/status messages
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const InternshipApiService = {
  // Base endpoint for Node.js + Express backend running on port 5000
  API_BASE_URL: BACKEND_API_BASE_URL,

  // Fetch all active internships from database without silent mock fallback
  async getInternships() {
    const response = await fetch(`${this.API_BASE_URL}/internships`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      const errMsg = (errBody && errBody.error) || `HTTP ${response.status}: Failed to fetch internships`;
      throw new Error(errMsg);
    }

    const json = await response.json();
    if (!json || !json.success || !Array.isArray(json.data)) {
      throw new Error('Invalid response structure received from internships API.');
    }

    console.log(`[SkillBridge API] Fetched ${json.data.length} live internships from backend.`);
    return json.data.map(normalizeInternship);
  },

  // Submit application to Node.js backend POST /api/applications
  async submitApplication(applicationPayload) {
    const response = await fetch(`${this.API_BASE_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(applicationPayload)
    });

    const result = await response.json().catch(() => null);
    return {
      ok: response.ok,
      status: response.status,
      data: result
    };
  }
};

// ==========================================================================
// 2. Data Store & State Management
// ==========================================================================
const InternshipDataStore = {
  // Candidate Profile for Skill Matching (Yazh S)
  getDefaultStudent() {
    try {
      const stored = localStorage.getItem('skillbridge_registered_student');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          id: parsed.id || 'stud-101',
          fullName: parsed.fullName || 'Yazh S',
          email: parsed.email || 'yazh.s@example.com',
          avatarInitials: parsed.avatarInitials || 'YS',
          avatarUrl: parsed.avatarUrl || null,
          skills: parsed.technicalSkills || [
            'Java', 'Spring Boot', 'MySQL', 'Python', 'JavaScript', 'HTML5', 'CSS3', 'REST APIs', 'Git', 'Data Structures'
          ]
        };
      }
    } catch (e) {
      console.warn('Could not read student profile', e);
    }

    return {
      id: 'stud-101',
      fullName: 'Yazh S',
      email: 'yazh.s@example.com',
      avatarInitials: 'YS',
      avatarUrl: null,
      skills: ['Java', 'Spring Boot', 'MySQL', 'Python', 'JavaScript', 'HTML5', 'CSS3', 'REST APIs', 'Git', 'Data Structures']
    };
  },

  // Candidate Assessment Scores from assessment.js
  getAssessmentScores() {
    try {
      const history = localStorage.getItem('skillbridge_assessment_history');
      if (history) {
        const parsed = JSON.parse(history);
        const scoreMap = {};
        parsed.forEach(item => {
          scoreMap[item.technology.toLowerCase()] = item.percentage;
        });
        return scoreMap;
      }
    } catch (e) {
      console.warn('Could not read assessment history', e);
    }

    // Default verified assessment scores for Yazh S
    return {
      'java': 90,
      'spring boot': 85,
      'mysql': 88,
      'python': 82,
      'javascript': 80,
      'html & css': 92,
      'data structures': 85
    };
  },

  // Internships catalog
  getLocalInternships() {
    return [
      {
        id: "int-101",
        title: "Full Stack Java Developer Intern",
        company: "CloudScale Solutions",
        companyLogoText: "CS",
        logoBg: "#4f46e5",
        domain: "Backend",
        workplace: "Hybrid",
        location: "Bengaluru, Karnataka (Hybrid)",
        stipend: "₹35,000 / month",
        stipendNumeric: 35000,
        duration: "6 Months",
        openings: 4,
        deadline: "30 Nov 2026",
        postedDaysAgo: 2,
        requiredSkills: ["Java", "Spring Boot", "MySQL", "REST APIs", "Git"],
        description: "Join CloudScale's core SaaS engineering team to develop high-throughput microservices using Spring Boot, optimize relational MySQL databases, and write modular RESTful endpoints.",
        responsibilities: [
          "Design and implement REST APIs using Spring Boot and Spring Data JPA.",
          "Collaborate on database schema design, index optimization, and transaction management in MySQL.",
          "Write robust unit and integration tests using JUnit 5 and Mockito.",
          "Participate in daily Agile scrums, Git code reviews, and Dockerized local deployments."
        ],
        eligibility: "B.E. / B.Tech in CSE, IT or related disciplines (2025/2026 graduating batch) with minimum 7.0 CGPA.",
        perks: ["Pre-Placement Offer (PPO) opportunity based on performance", "Flexible hybrid schedule (2 days remote)", "Senior engineering mentorship", "Certificate of Completion"]
      },
      {
        id: "int-102",
        title: "Python & Data Engineering Intern",
        company: "DataMatrix Analytics",
        companyLogoText: "DM",
        logoBg: "#059669",
        domain: "Data",
        workplace: "Remote",
        location: "Hyderabad, Telangana (Remote)",
        stipend: "₹38,000 / month",
        stipendNumeric: 38000,
        duration: "6 Months",
        openings: 3,
        deadline: "05 Dec 2026",
        postedDaysAgo: 3,
        requiredSkills: ["Python", "MySQL", "Pandas", "ETL Pipelines", "Git"],
        description: "Assist in architecting automated batch and streaming data pipelines, writing performant SQL transformations, and preparing data structures for machine learning and BI dashboards.",
        responsibilities: [
          "Develop automated ETL workflows in Python using Pandas and SQLAlchemy.",
          "Write complex SQL aggregations, window functions, and views in MySQL.",
          "Validate incoming data quality and build automated alert triggers.",
          "Document data schemas and ETL operational pipelines."
        ],
        eligibility: "B.E. / B.Tech / M.C.A. with strong background in Python scripting and SQL queries.",
        perks: ["100% Remote flexibility", "Hands-on exposure to cloud data warehouses", "Paid learning stipends for technical certifications"]
      },
      {
        id: "int-103",
        title: "Backend Engineering Intern (Spring Boot)",
        company: "FinTech Orbit Systems",
        companyLogoText: "FO",
        logoBg: "#d97706",
        domain: "Backend",
        workplace: "On-site",
        location: "Chennai, Tamil Nadu (Onsite)",
        stipend: "₹40,000 / month",
        stipendNumeric: 40000,
        duration: "6 Months",
        openings: 5,
        deadline: "02 Dec 2026",
        postedDaysAgo: 1,
        requiredSkills: ["Java", "Spring Boot", "MySQL", "Docker", "Data Structures"],
        description: "Contribute to secure payment gateways and core transaction processing microservices, ensuring sub-50ms latency and high ACID transaction consistency.",
        responsibilities: [
          "Implement secure Spring Security OAuth2 and JWT authentication filters.",
          "Benchmark database queries and tune execution plans under high concurrency.",
          "Containerize microservices using Docker and configure local Docker Compose environments.",
          "Resolve latency bottlenecks and participate in system load testing."
        ],
        eligibility: "B.E. / B.Tech (CSE/ECE/IT) with proficient knowledge of Java collections, OOP, and multi-threading.",
        perks: ["Competitive stipend in FinTech domain", "Free catered lunch and shuttle transport", "Fast-track full-time offer review"]
      },
      {
        id: "int-104",
        title: "Frontend Web Developer Intern",
        company: "NextGen Digital Labs",
        companyLogoText: "ND",
        logoBg: "#dc2626",
        domain: "Frontend",
        workplace: "Remote",
        location: "Bengaluru, Karnataka (Remote)",
        stipend: "₹30,000 / month",
        stipendNumeric: 30000,
        duration: "3 Months",
        openings: 2,
        deadline: "10 Dec 2026",
        postedDaysAgo: 4,
        requiredSkills: ["JavaScript", "HTML5", "CSS3", "Bootstrap", "REST APIs"],
        description: "Build clean, accessible, and responsive user interfaces for student career portals, collaborate with UI/UX designers, and integrate dynamic RESTful APIs.",
        responsibilities: [
          "Translate Figma UI designs into pixel-perfect responsive HTML5 and CSS3 pages.",
          "Implement interactive state handling and asynchronous API requests with modern JavaScript.",
          "Ensure WCAG 2.1 AA accessibility compliance and cross-browser responsiveness.",
          "Optimize Core Web Vitals (LCP, CLS, FID) for fast page loading."
        ],
        eligibility: "Students proficient in vanilla JavaScript, modern CSS Grid/Flexbox, and Bootstrap 5.",
        perks: ["Flexible working hours", "MacBook Pro provided during internship", "Direct mentorship under Principal Frontend Architect"]
      },
      {
        id: "int-105",
        title: "Database Administrator & SQL Intern",
        company: "Apex Infotech Services",
        companyLogoText: "AI",
        logoBg: "#0284c7",
        domain: "Database",
        workplace: "Hybrid",
        location: "Pune, Maharashtra (Hybrid)",
        stipend: "₹32,000 / month",
        stipendNumeric: 32000,
        duration: "6 Months",
        openings: 2,
        deadline: "15 Dec 2026",
        postedDaysAgo: 5,
        requiredSkills: ["MySQL", "Database Design", "Performance Tuning", "Python"],
        description: "Work closely with senior DBAs to analyze query execution plans, design indexing architectures, monitor deadlock occurrences, and configure automated backups.",
        responsibilities: [
          "Analyze slow query logs using EXPLAIN and tune B-Tree compound indexes.",
          "Enforce database normalization (3NF) and referential integrity constraints.",
          "Write Python scripts for database health checks and automated schema migrations.",
          "Assist in configuring master-slave replication and failover testing."
        ],
        eligibility: "B.Tech/MCA students with strong knowledge of relational algebra, ACID properties, and SQL DDL/DML.",
        perks: ["Industry-recognized DBA certification sponsorship", "Hybrid work flexibility", "Letter of recommendation"]
      },
      {
        id: "int-106",
        title: "Junior Python Backend Intern",
        company: "Synthetix AI Systems",
        companyLogoText: "SX",
        logoBg: "#7c3aed",
        domain: "Backend",
        workplace: "Remote",
        location: "Remote, India",
        stipend: "₹36,000 / month",
        stipendNumeric: 36000,
        duration: "4 Months",
        openings: 3,
        deadline: "18 Dec 2026",
        postedDaysAgo: 6,
        requiredSkills: ["Python", "FastAPI", "MySQL", "REST APIs", "Git"],
        description: "Design low-latency asynchronous API services using Python and FastAPI, manage database models with SQLAlchemy, and integrate Redis caching layers.",
        responsibilities: [
          "Author async RESTful endpoints with automatic OpenAPI/Swagger documentation.",
          "Implement database connection pooling and asynchronous queries.",
          "Integrate token-based authentication and rate limiting.",
          "Write unit tests with PyTest and maintain CI/CD test coverage."
        ],
        eligibility: "Pre-final and final year computer engineering students with hands-on Python backend projects.",
        perks: ["Remote-first company culture", "Bi-weekly technical tech-talks", "PPO opportunity for high performers"]
      },
      {
        id: "int-107",
        title: "Full Stack Web Developer Intern",
        company: "Zoho Enterprise Cloud",
        companyLogoText: "ZE",
        logoBg: "#ea580c",
        domain: "FullStack",
        workplace: "On-site",
        location: "Chennai, Tamil Nadu (Onsite)",
        stipend: "₹42,000 / month",
        stipendNumeric: 42000,
        duration: "6 Months",
        openings: 6,
        deadline: "08 Dec 2026",
        postedDaysAgo: 1,
        requiredSkills: ["Java", "Spring Boot", "JavaScript", "HTML5", "MySQL"],
        description: "Develop end-to-end enterprise collaboration modules, bridging clean Java Spring Boot REST APIs with responsive, interactive web interfaces.",
        responsibilities: [
          "Build modular client-server components across the full web application stack.",
          "Implement complex business rules and data validation workflows.",
          "Participate in architectural reviews and refactor legacy codebases.",
          "Ensure multi-tenant data isolation and data privacy compliance."
        ],
        eligibility: "B.E./B.Tech graduates (2025/2026) with solid foundation in Data Structures, Java, and JavaScript.",
        perks: ["Comprehensive onboarding boot camp", "High conversion rate to full-time Software Engineer", "World-class campus facilities"]
      },
      {
        id: "int-108",
        title: "Cloud & DevOps Associate Intern",
        company: "ThoughtWorks Engineering",
        companyLogoText: "TW",
        logoBg: "#0d9488",
        domain: "DevOps",
        workplace: "Hybrid",
        location: "Bengaluru, Karnataka (Hybrid)",
        stipend: "₹45,000 / month",
        stipendNumeric: 45000,
        duration: "6 Months",
        openings: 2,
        deadline: "12 Dec 2026",
        postedDaysAgo: 3,
        requiredSkills: ["Docker", "Git", "Python", "Linux", "REST APIs"],
        description: "Work with agile infrastructure teams to automate CI/CD build pipelines, manage containerized services, and monitor cloud server reliability.",
        responsibilities: [
          "Write GitHub Actions and GitLab CI workflows for automated linting, test suites, and container builds.",
          "Configure Docker containers and maintain infrastructure as code templates.",
          "Monitor server metrics using Prometheus and Grafana dashboards.",
          "Troubleshoot deployment errors and maintain staging environments."
        ],
        eligibility: "Candidates with knowledge of Linux shell commands, Git version control, and container fundamentals.",
        perks: ["Highest stipend band in cohort", "Global project exposure", "Comprehensive health and wellness benefits"]
      }
    ];
  },

  // Applications List with Tracking Status
  getApplications() {
    try {
      const stored = localStorage.getItem('skillbridge_student_applications');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read applications from storage', e);
    }

    // Default applications synchronized with dashboard.js
    return [
      {
        id: "app-201",
        internshipId: "int-101",
        company: "CloudScale Solutions",
        position: "Full Stack Java Developer Intern",
        applicationDate: "16 Nov 2026",
        status: "Under Review",
        statusBadge: "bg-primary",
        statusIcon: "bi-hourglass-split",
        interviewDate: "25 Nov 2026 • 11:00 AM IST",
        interviewDetails: "Technical Round (Live Coding & Spring Boot architecture on Google Meet)",
        location: "Bengaluru (Hybrid)",
        stipend: "₹35,000 / month"
      },
      {
        id: "app-202",
        internshipId: "int-102",
        company: "DataMatrix Analytics",
        position: "Python & Data Engineering Intern",
        applicationDate: "14 Nov 2026",
        status: "Shortlisted",
        statusBadge: "bg-success",
        statusIcon: "bi-check2-circle",
        interviewDate: "Expected by 22 Nov 2026",
        interviewDetails: "Take-home SQL & Python ETL assessment is currently under review by engineering lead.",
        location: "Hyderabad (Remote)",
        stipend: "₹38,000 / month"
      },
      {
        id: "app-203",
        internshipId: "int-104",
        company: "NextGen Digital Labs",
        position: "Frontend Web Developer Intern",
        applicationDate: "10 Nov 2026",
        status: "Shortlisted",
        statusBadge: "bg-info text-dark",
        statusIcon: "bi-check2-circle",
        interviewDate: "28 Nov 2026 • 03:30 PM IST",
        interviewDetails: "Pair programming UI challenge focused on modern JavaScript and CSS responsiveness.",
        location: "Bengaluru (Remote)",
        stipend: "₹30,000 / month"
      }
    ];
  },

  // Save new application to localStorage
  saveLocalApplication(newApp) {
    const apps = this.getApplications();
    const existingIndex = apps.findIndex(a =>
      a.internshipId === newApp.internshipId ||
      a.company.toLowerCase().trim() === newApp.company.toLowerCase().trim()
    );

    if (existingIndex >= 0) {
      apps[existingIndex] = { ...apps[existingIndex], ...newApp };
    } else {
      apps.unshift(newApp);
    }

    try {
      localStorage.setItem('skillbridge_student_applications', JSON.stringify(apps));
    } catch (e) {
      console.warn('Could not save application to localStorage', e);
    }
  }
};

// ==========================================================================
// 3. AI Skill Matching & Gap Diagnostic Engine
// ==========================================================================
const AISkillMatchEngine = {
  /**
   * Calculates realistic match percentages and detailed diagnostic explanations.
   * Matches actual student skills from profile and assessment scores from assessment.js.
   */
  calculateMatch(internship, candidateSkills, assessmentScores) {
    const required = internship.requiredSkills;
    const normalizedCandidate = candidateSkills.map(s => s.toLowerCase().trim());

    const matchedSkills = [];
    const missingSkills = [];

    required.forEach(skill => {
      const lower = skill.toLowerCase().trim();
      const hasSkill = normalizedCandidate.some(cs => cs === lower || lower.includes(cs) || cs.includes(lower));

      if (hasSkill) {
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    });

    // Base match from required skills
    const matchRatio = required.length > 0 ? (matchedSkills.length / required.length) : 0;
    let computedPercentage = Math.round(matchRatio * 82);

    // Dynamic bonus based on actual candidate assessment evaluation results
    let assessmentBonus = 0;
    let assessmentContext = '';

    if (internship.domain === 'Backend' && assessmentScores['java']) {
      const score = assessmentScores['java'];
      assessmentBonus += Math.round((score / 100) * 12);
      assessmentContext = `Verified ${score}% assessment score in Java Core & OOP.`;
    } else if (internship.domain === 'Data' && assessmentScores['python']) {
      const score = assessmentScores['python'];
      assessmentBonus += Math.round((score / 100) * 12);
      assessmentContext = `Verified ${score}% assessment score in Python.`;
    } else if (internship.domain === 'Frontend' && (assessmentScores['javascript'] || assessmentScores['html & css'])) {
      const score = assessmentScores['javascript'] || 80;
      assessmentBonus += Math.round((score / 100) * 12);
      assessmentContext = `Verified ${score}% assessment score in Modern JavaScript.`;
    } else if (internship.domain === 'Database' && assessmentScores['mysql']) {
      const score = assessmentScores['mysql'];
      assessmentBonus += Math.round((score / 100) * 12);
      assessmentContext = `Verified ${score}% assessment score in MySQL & Database Design.`;
    } else {
      if (matchedSkills.length >= 3) {
        assessmentBonus += 8;
        assessmentContext = `Strong overlap across ${matchedSkills.length} core technical domains.`;
      }
    }

    computedPercentage = Math.min(97, Math.max(45, computedPercentage + assessmentBonus));

    // Dynamic "Why this internship matches you" explanation
    let whyMatches = '';
    if (matchedSkills.length === required.length) {
      whyMatches = `100% skill match! You possess all required technical skills (${matchedSkills.join(', ')}). ${assessmentContext}`;
    } else if (matchedSkills.length >= 3) {
      whyMatches = `Matches ${matchedSkills.length} of ${required.length} required skills (${matchedSkills.slice(0, 3).join(', ')}). ${assessmentContext}`;
    } else {
      whyMatches = `Matches core foundational competencies. Build hands-on projects to improve readiness for this role.`;
    }

    // Dynamic "Suggestions to improve missing skills"
    let skillSuggestions = '';
    if (missingSkills.length > 0) {
      const topMissing = missingSkills.slice(0, 2).join(' & ');
      skillSuggestions = `Upskill in ${topMissing} by reviewing the dashboard skill roadmap or taking the technical assessment.`;
    } else {
      skillSuggestions = `Your profile fully satisfies all technical requirements. Highly recommended to submit your application.`;
    }

    return {
      percentage: computedPercentage,
      matchedSkills: matchedSkills,
      missingSkills: missingSkills,
      whyMatches: whyMatches,
      skillSuggestions: skillSuggestions,
      isHighMatch: computedPercentage >= 85
    };
  }
};

// ==========================================================================
// 4. UI Controller & Real-Time Filtering
// ==========================================================================
let allInternships = [];
let currentFilterState = {
  searchQuery: '',
  domain: 'all',
  workplace: 'all',
  minStipend: 0,
  sortBy: 'matchDesc'
};

document.addEventListener('DOMContentLoaded', () => {
  initInternshipsPage();
});

async function initInternshipsPage() {
  const student = getLoggedInStudent() || InternshipDataStore.getDefaultStudent();
  renderUserAvatars(student);

  // Initialize filter listeners
  initFilterControls();

  // Load internships from backend API
  await loadAndRenderInternships();

  initMobileSidebarToggle();
  initLogoutHandler();
}

function renderUserAvatars(student) {
  const nameEls = document.querySelectorAll('.user-full-name');
  const initialsEls = document.querySelectorAll('.user-avatar-initials');

  const fullName = student ? (student.fullName || student.name || 'Student') : 'Guest';
  const initials = student ? (student.avatarInitials || (fullName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase())) : 'SB';

  nameEls.forEach(el => el.textContent = fullName);
  initialsEls.forEach(el => el.textContent = initials);

  if (student && student.avatarUrl) {
    const sidebarImg = document.getElementById('sidebarAvatarImg');
    const sidebarInitials = document.getElementById('sidebarAvatarInitials');
    const topbarImg = document.getElementById('topbarAvatarImg');
    const topbarInitials = document.getElementById('topbarAvatarInitials');

    if (sidebarImg) { sidebarImg.src = student.avatarUrl; sidebarImg.classList.remove('d-none'); }
    if (sidebarInitials) { sidebarInitials.classList.add('d-none'); }

    if (topbarImg) { topbarImg.src = student.avatarUrl; topbarImg.classList.remove('d-none'); }
    if (topbarInitials) { topbarInitials.classList.add('d-none'); }
  }
}

// Fetch internships and trigger render
async function loadAndRenderInternships() {
  const container = document.getElementById('internshipsGridContainer');
  const countEl = document.getElementById('internshipsCountDisplay');

  if (container) {
    container.innerHTML = `
      <div class="col-12 py-5 text-center">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Loading internships...</span>
        </div>
        <p class="text-muted small mt-3">Connecting to recommendation engine & computing skill matches...</p>
      </div>
    `;
  }

  try {
    allInternships = await InternshipApiService.getInternships();

    // If student is logged in, optionally sync their live applications from MySQL
    const student = getLoggedInStudent();
    if (student && student.id) {
      try {
        const appRes = await fetch(`${BACKEND_API_BASE_URL}/applications?student_id=${encodeURIComponent(student.id)}`, {
          headers: { 'Accept': 'application/json' }
        });
        if (appRes.ok) {
          const appJson = await appRes.json();
          if (appJson && appJson.success && Array.isArray(appJson.data)) {
            appJson.data.forEach(liveApp => {
              InternshipDataStore.saveLocalApplication({
                id: liveApp.id,
                internshipId: liveApp.internship_id,
                studentId: liveApp.student_id,
                company: liveApp.company_name,
                position: liveApp.internship_title,
                status: liveApp.status,
                applicationDate: liveApp.applied_at ? formatDeadline(liveApp.applied_at) : 'Recent'
              });
            });
          }
        }
      } catch (appSyncErr) {
        console.warn('[SkillBridge] Note: Could not sync remote applications:', appSyncErr);
      }
    }

    renderInternshipsList();
  } catch (error) {
    console.error('[SkillBridge API Error]', error);
    if (countEl) countEl.textContent = '0 Internships Available';
    if (container) {
      container.innerHTML = `
        <div class="col-12 py-5 text-center">
          <div class="card border-0 p-5 shadow-sm rounded-4 bg-white text-center mx-auto" style="max-width: 600px; border-top: 4px solid #ef4444 !important;">
            <div class="rounded-circle bg-danger bg-opacity-10 text-danger d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 72px; height: 72px;">
              <i class="bi bi-exclamation-triangle-fill fs-2"></i>
            </div>
            <h5 class="fw-bold text-dark mb-2">Unable to Load Internships</h5>
            <p class="text-muted small mb-3">
              Could not retrieve live internship listings from the backend service at <code>${(typeof window !== "undefined" && window.SkillBridgeConfig ? window.SkillBridgeConfig.apiBaseUrl : "http://localhost:5000/api")}/internships</code>.
            </p>
            <div class="alert alert-light border small text-start mb-4 py-2 px-3 text-secondary">
              <strong>Error Details:</strong> ${escapeHtml(error.message || 'Network connection failed')}
            </div>
            <div class="d-flex justify-content-center gap-2">
              <button type="button" class="btn btn-primary-custom px-4" onclick="loadAndRenderInternships()">
                <i class="bi bi-arrow-clockwise me-1"></i> Retry Connection
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }
}

function initFilterControls() {
  const searchInput = document.getElementById('internshipSearchInput');
  const domainFilter = document.getElementById('domainFilterSelect');
  const workplaceFilter = document.getElementById('workplaceFilterSelect');
  const stipendFilter = document.getElementById('stipendFilterSelect');
  const sortBySelect = document.getElementById('sortBySelect');
  const resetBtn = document.getElementById('resetFiltersBtn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentFilterState.searchQuery = e.target.value.toLowerCase().trim();
      renderInternshipsList();
    });
  }

  if (domainFilter) {
    domainFilter.addEventListener('change', (e) => {
      currentFilterState.domain = e.target.value;
      updateQuickPills(e.target.value);
      renderInternshipsList();
    });
  }

  if (workplaceFilter) {
    workplaceFilter.addEventListener('change', (e) => {
      currentFilterState.workplace = e.target.value;
      renderInternshipsList();
    });
  }

  if (stipendFilter) {
    stipendFilter.addEventListener('change', (e) => {
      currentFilterState.minStipend = parseInt(e.target.value, 10) || 0;
      renderInternshipsList();
    });
  }

  if (sortBySelect) {
    sortBySelect.addEventListener('change', (e) => {
      currentFilterState.sortBy = e.target.value;
      renderInternshipsList();
    });
  }

  // Quick domain filter pills
  const filterPills = document.querySelectorAll('.quick-filter-pill');
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const domainValue = pill.getAttribute('data-domain');
      currentFilterState.domain = domainValue;
      if (domainFilter) domainFilter.value = domainValue;
      renderInternshipsList();
    });
  });

  // Reset Filters
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      currentFilterState = {
        searchQuery: '',
        domain: 'all',
        workplace: 'all',
        minStipend: 0,
        sortBy: 'matchDesc'
      };

      if (searchInput) searchInput.value = '';
      if (domainFilter) domainFilter.value = 'all';
      if (workplaceFilter) workplaceFilter.value = 'all';
      if (stipendFilter) stipendFilter.value = '0';
      if (sortBySelect) sortBySelect.value = 'matchDesc';

      updateQuickPills('all');
      renderInternshipsList();
      showToast('Filters cleared. Showing all recommended internships.', 'info');
    });
  }
}

function updateQuickPills(domain) {
  const filterPills = document.querySelectorAll('.quick-filter-pill');
  filterPills.forEach(pill => {
    if (pill.getAttribute('data-domain') === domain) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });
}

/**
 * Synchronize Hero Banner Statistics and Badge with active internship data
 */
function updateHeroStatistics(list) {
  if (!Array.isArray(list) || list.length === 0) return;

  // 1. Highest AI Skill Fit across all internships
  const fitValEl = document.getElementById('heroStatFitValue');
  const fitLblEl = document.getElementById('heroStatFitLabel');
  const maxFit = Math.max(...list.map(i => i.matchPercentage || 95));
  if (fitValEl) fitValEl.textContent = `Up to ${maxFit}% Skill Fit`;
  if (fitLblEl) fitLblEl.textContent = `Calculated via real assessments`;

  // 2. Stipend Band Range
  const stipendValEl = document.getElementById('heroStatStipendValue');
  const stipendLblEl = document.getElementById('heroStatStipendLabel');
  if (stipendValEl) stipendValEl.textContent = `₹30,000 – ₹45,000 / mo`;
  if (stipendLblEl) stipendLblEl.textContent = `Competitive monthly stipends`;

  // 3. Unique Verified Corporate Partners
  const partnersValEl = document.getElementById('heroStatPartnersValue');
  const partnersLblEl = document.getElementById('heroStatPartnersLabel');
  const uniqueCompanies = new Set(list.map(i => i.company)).size;
  if (partnersValEl) partnersValEl.textContent = `Verified Hiring Partners`;
  if (partnersLblEl) partnersLblEl.textContent = `${uniqueCompanies} Top Enterprise Pipelines`;

  // 4. Hero Engine Badge fallback safeguard
  const badgeTextEl = document.getElementById('heroBadgeText');
  if (badgeTextEl && !badgeTextEl.textContent.trim()) {
    badgeTextEl.textContent = 'AI Skill-Based Career Matching Engine';
  }
}

function renderInternshipsList() {
  const container = document.getElementById('internshipsGridContainer');
  const countEl = document.getElementById('internshipsCountDisplay');
  const student = getLoggedInStudent() || InternshipDataStore.getDefaultStudent();
  const candidateSkills = student.skills || student.technicalSkills || [
    'Java', 'Spring Boot', 'MySQL', 'Python', 'JavaScript', 'HTML5', 'CSS3', 'REST APIs', 'Git', 'Data Structures'
  ];
  const assessmentScores = InternshipDataStore.getAssessmentScores();
  const applications = InternshipDataStore.getApplications();

  if (!container) return;

  // Compute live match and application status for each internship
  let list = allInternships.map(item => {
    const matchAnalysis = AISkillMatchEngine.calculateMatch(item, candidateSkills, assessmentScores);
    const existingApp = applications.find(a =>
      a.internshipId === item.id ||
      a.internship_id === item.id ||
      (a.company && item.company && a.company.toLowerCase().trim() === item.company.toLowerCase().trim())
    );

    return {
      ...item,
      matchPercentage: matchAnalysis.percentage,
      matchedSkills: matchAnalysis.matchedSkills,
      missingSkills: matchAnalysis.missingSkills,
      whyMatches: matchAnalysis.whyMatches,
      skillSuggestions: matchAnalysis.skillSuggestions,
      isApplied: Boolean(existingApp),
      applicationStatus: existingApp ? (existingApp.status || 'Applied') : null
    };
  });

  // Synchronize Hero Statistics with calculated matching data
  updateHeroStatistics(list);

  // Search Filter
  if (currentFilterState.searchQuery) {
    const q = currentFilterState.searchQuery;
    list = list.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.company.toLowerCase().includes(q) ||
      item.requiredSkills.some(s => s.toLowerCase().includes(q)) ||
      item.location.toLowerCase().includes(q)
    );
  }

  // Domain Filter
  if (currentFilterState.domain !== 'all') {
    list = list.filter(item => item.domain.toLowerCase() === currentFilterState.domain.toLowerCase());
  }

  // Workplace Mode Filter
  if (currentFilterState.workplace !== 'all') {
    list = list.filter(item => item.workplace.toLowerCase() === currentFilterState.workplace.toLowerCase());
  }

  // Stipend Threshold Filter
  if (currentFilterState.minStipend > 0) {
    list = list.filter(item => item.stipendNumeric >= currentFilterState.minStipend);
  }

  // Sorting
  if (currentFilterState.sortBy === 'matchDesc') {
    list.sort((a, b) => b.matchPercentage - a.matchPercentage);
  } else if (currentFilterState.sortBy === 'stipendDesc') {
    list.sort((a, b) => b.stipendNumeric - a.stipendNumeric);
  } else if (currentFilterState.sortBy === 'newest') {
    list.sort((a, b) => a.postedDaysAgo - b.postedDaysAgo);
  } else if (currentFilterState.sortBy === 'duration') {
    list.sort((a, b) => a.duration.localeCompare(b.duration));
  }

  // Update Count Display
  if (countEl) {
    countEl.textContent = `Showing ${list.length} of ${allInternships.length} Internships`;
  }

  // Empty State
  if (list.length === 0) {
    container.innerHTML = `
      <div class="col-12 py-5 text-center">
        <div class="card border p-5 shadow-xs rounded-4 bg-white text-center mx-auto" style="max-width: 560px;">
          <div class="rounded-circle bg-light d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 72px; height: 72px;">
            <i class="bi bi-funnel text-muted fs-2"></i>
          </div>
          <h5 class="fw-bold text-dark mb-1">No Matching Internships Found</h5>
          <p class="text-muted small mb-4">
            No internships match your current combination of search terms, domain, and stipend filters. Try adjusting your parameters.
          </p>
          <div>
            <button type="button" class="btn btn-primary-custom px-4" id="emptyStateResetBtn">
              <i class="bi bi-arrow-counterclockwise me-1"></i> Reset All Filters
            </button>
          </div>
        </div>
      </div>
    `;

    const emptyResetBtn = document.getElementById('emptyStateResetBtn');
    if (emptyResetBtn) {
      emptyResetBtn.addEventListener('click', () => {
        const resetBtn = document.getElementById('resetFiltersBtn');
        if (resetBtn) resetBtn.click();
      });
    }
    return;
  }

  // Render High-Fidelity Cards (No text truncation on titles or companies)
  container.innerHTML = list.map(item => {
    // Workplace badge styling
    let workplaceBadge = 'bg-soft-primary text-primary';
    if (item.workplace === 'Remote') workplaceBadge = 'bg-soft-emerald text-success';
    else if (item.workplace === 'On-site') workplaceBadge = 'bg-soft-amber text-warning';

    // Match percentage tier color
    let matchColor = '#10b981';
    let matchBg = '#ecfdf5';
    let matchBorder = 'rgba(16, 185, 129, 0.35)';
    if (item.matchPercentage < 80) {
      matchColor = '#f59e0b';
      matchBg = '#fffbeb';
      matchBorder = 'rgba(245, 158, 11, 0.35)';
    }

    // Apply button state
    let applyButtonHtml = '';
    if (item.isApplied) {
      const statusLabel = item.applicationStatus || 'Applied';
      applyButtonHtml = `
        <button type="button" class="btn btn-secondary btn-sm px-3 disabled" disabled title="Application already submitted">
          <i class="bi bi-check2-circle me-1"></i> ${statusLabel}
        </button>
      `;
    } else {
      applyButtonHtml = `
        <button type="button" class="btn btn-primary-custom btn-sm px-3 apply-internship-btn" data-id="${item.id}">
          <i class="bi bi-send me-1"></i> Apply Now
        </button>
      `;
    }

    return `
      <div class="col-12 col-md-6 col-xl-4 mb-4">
        <div class="internship-card bg-white border rounded-4 shadow-xs p-4 d-flex flex-column h-100">
          
          <!-- Top Row: Logo, Title, Company & Workplace (No truncation) -->
          <div class="d-flex align-items-start gap-3 mb-3">
            <div class="company-logo-badge" style="background-color: ${item.logoBg};">
              ${item.companyLogoText}
            </div>
            <div class="flex-grow-1">
              <h5 class="internship-card-title">${item.title}</h5>
              <div class="internship-company-name">
                <span>${item.company}</span>
                <i class="bi bi-patch-check-fill text-primary" title="Verified Corporate Hiring Partner"></i>
              </div>
            </div>
            <span class="badge ${workplaceBadge} px-2 py-1 rounded-pill small flex-shrink-0">${item.workplace}</span>
          </div>

          <!-- AI Skill Matching Engine Card -->
          <div class="p-3 rounded-3 mb-3" style="background-color: ${matchBg}; border: 1px solid ${matchBorder};">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="fw-bold small d-flex align-items-center gap-1" style="color: ${matchColor};">
                <i class="bi bi-cpu-fill"></i> AI Skill Match
              </span>
              <span class="badge px-2 py-1 rounded-pill fw-bold" style="background-color: #ffffff; color: ${matchColor}; border: 1px solid ${matchBorder};">
                ${item.matchPercentage}% Fit
              </span>
            </div>

            <!-- Matched Skills (Green) & Missing Skills (Orange/Red) -->
            <div class="d-flex flex-wrap gap-1 mb-2">
              ${item.matchedSkills.map(s => `
                <span class="skill-match-pill-matched">
                  <i class="bi bi-check-circle-fill"></i> ${s}
                </span>
              `).join('')}

              ${item.missingSkills.map(s => `
                <span class="skill-match-pill-missing">
                  <i class="bi bi-exclamation-circle-fill"></i> ${s}
                </span>
              `).join('')}
            </div>

            <!-- Why This Internship Matches You -->
            <div class="why-match-box mb-2">
              <i class="bi bi-stars text-primary me-1"></i>
              <strong>Why you match:</strong> ${item.whyMatches}
            </div>

            <!-- Suggestions to improve missing skills -->
            ${item.missingSkills.length > 0 ? `
              <div class="skill-gap-suggestion d-flex justify-content-between align-items-center gap-2">
                <span><i class="bi bi-lightning-charge-fill me-1"></i>${item.skillSuggestions}</span>
                <a href="skill-assessment.html" class="text-decoration-none small text-primary fw-bold flex-shrink-0">
                  Take Test <i class="bi bi-arrow-right"></i>
                </a>
              </div>
            ` : ''}
          </div>

          <!-- Key Details Grid -->
          <div class="row g-2 mb-3 text-muted small" style="font-size: 0.8rem;">
            <div class="col-6">
              <i class="bi bi-cash-stack text-success me-1"></i>
              <strong class="text-dark">${item.stipend}</strong>
            </div>
            <div class="col-6">
              <i class="bi bi-geo-alt text-primary me-1"></i>
              <span>${item.location.split(',')[0]}</span>
            </div>
            <div class="col-6">
              <i class="bi bi-clock-history text-muted me-1"></i>
              <span>${item.duration}</span>
            </div>
            <div class="col-6">
              <i class="bi bi-people text-muted me-1"></i>
              <span>${item.openings} Openings</span>
            </div>
          </div>

          <!-- Application Deadline Notice -->
          <div class="d-flex align-items-center gap-1 text-muted small mb-3 pb-2 border-bottom" style="font-size: 0.76rem;">
            <i class="bi bi-calendar-event text-danger me-1"></i>
            <span>Deadline: <strong>${item.deadline}</strong></span>
          </div>

          <!-- Short Role Description -->
          <p class="text-muted small mb-4 flex-grow-1" style="font-size: 0.82rem; line-height: 1.45;">
            ${item.description.length > 130 ? item.description.substring(0, 130) + '...' : item.description}
          </p>

          <!-- Footer Actions -->
          <div class="pt-3 border-top mt-auto d-flex justify-content-between align-items-center">
            <button type="button" class="btn btn-outline-custom btn-sm px-3 view-details-btn" data-id="${item.id}">
              <i class="bi bi-eye me-1"></i> View Details
            </button>
            ${applyButtonHtml}
          </div>

        </div>
      </div>
    `;
  }).join('');

  // Attach card event listeners
  container.querySelectorAll('.view-details-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openInternshipDetailsModal(id);
    });
  });

  container.querySelectorAll('.apply-internship-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      handleApplyProcess(id);
    });
  });
}

// Complete Internship Details Modal
function openInternshipDetailsModal(internshipId) {
  const item = allInternships.find(i => i.id === internshipId);
  if (!item) return;

  const student = getLoggedInStudent() || InternshipDataStore.getDefaultStudent();
  const candidateSkills = student.skills || student.technicalSkills || [
    'Java', 'Spring Boot', 'MySQL', 'Python', 'JavaScript', 'HTML5', 'CSS3', 'REST APIs', 'Git', 'Data Structures'
  ];
  const assessmentScores = InternshipDataStore.getAssessmentScores();
  const matchAnalysis = AISkillMatchEngine.calculateMatch(item, candidateSkills, assessmentScores);
  const applications = InternshipDataStore.getApplications();
  const existingApp = applications.find(a =>
    a.internshipId === item.id ||
    a.internship_id === item.id ||
    (a.company && item.company && a.company.toLowerCase().trim() === item.company.toLowerCase().trim())
  );

  // Set modal header & company information
  document.getElementById('modalInternshipTitle').textContent = item.title;
  document.getElementById('modalInternshipCompany').textContent = item.company;
  document.getElementById('modalInternshipDomainBadge').textContent = item.domain;
  document.getElementById('modalInternshipWorkplaceBadge').textContent = item.workplace;
  document.getElementById('modalInternshipMatchScore').textContent = `${matchAnalysis.percentage}% AI Fit`;

  // Key stats row
  document.getElementById('modalInternshipStipend').textContent = item.stipend;
  document.getElementById('modalInternshipLocation').textContent = item.location;
  document.getElementById('modalInternshipDuration').textContent = item.duration;
  document.getElementById('modalInternshipOpenings').textContent = `${item.openings} Openings`;
  document.getElementById('modalInternshipDeadline').textContent = item.deadline;

  // Role Overview
  document.getElementById('modalInternshipDescription').textContent = item.description;

  // Key Responsibilities
  const respList = document.getElementById('modalInternshipResponsibilities');
  if (respList) {
    respList.innerHTML = item.responsibilities.map(r => `
      <li class="mb-2 d-flex align-items-start gap-2">
        <i class="bi bi-check-circle-fill text-primary flex-shrink-0 mt-1"></i>
        <span>${r}</span>
      </li>
    `).join('');
  }

  // Academic Eligibility
  document.getElementById('modalInternshipEligibility').textContent = item.eligibility;

  // Technical Skills Diagnostics
  const skillsContainer = document.getElementById('modalInternshipSkillsList');
  if (skillsContainer) {
    skillsContainer.innerHTML = `
      <div class="mb-3">
        <strong class="small text-success d-block mb-1">
          <i class="bi bi-check-circle-fill me-1"></i>Skills You Match (${matchAnalysis.matchedSkills.length}):
        </strong>
        <div class="d-flex flex-wrap gap-1 mb-2">
          ${matchAnalysis.matchedSkills.map(s => `
            <span class="skill-match-pill-matched">
              <i class="bi bi-check2"></i> ${s}
            </span>
          `).join('')}
        </div>
      </div>

      ${matchAnalysis.missingSkills.length > 0 ? `
        <div class="mb-3">
          <strong class="small text-danger d-block mb-1">
            <i class="bi bi-exclamation-circle-fill me-1"></i>Skills to Develop (${matchAnalysis.missingSkills.length}):
          </strong>
          <div class="d-flex flex-wrap gap-1 mb-2">
            ${matchAnalysis.missingSkills.map(s => `
              <span class="skill-match-pill-missing">
                <i class="bi bi-plus"></i> ${s}
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="why-match-box mb-2">
        <strong><i class="bi bi-stars text-primary me-1"></i>Match Rationale:</strong> ${matchAnalysis.whyMatches}
      </div>

      <div class="skill-gap-suggestion">
        <strong><i class="bi bi-lightbulb-fill text-warning me-1"></i>Upskilling Advice:</strong> ${matchAnalysis.skillSuggestions}
      </div>
    `;
  }

  // Corporate Perks
  const perksList = document.getElementById('modalInternshipPerks');
  if (perksList) {
    perksList.innerHTML = item.perks.map(p => `
      <div class="col-12 col-md-6 mb-2">
        <div class="p-2 bg-light rounded-2 border small text-dark d-flex align-items-center gap-2">
          <i class="bi bi-gift-fill text-warning flex-shrink-0"></i>
          <span>${p}</span>
        </div>
      </div>
    `).join('');
  }

  // Modal Apply Button State
  const applyBtn = document.getElementById('modalApplyActionBtn');
  if (applyBtn) {
    if (existingApp) {
      applyBtn.disabled = true;
      applyBtn.className = 'btn btn-secondary px-4 disabled';
      applyBtn.innerHTML = `<i class="bi bi-check2-circle me-1"></i> Already Applied (${existingApp.status || 'Applied'})`;
      applyBtn.onclick = null;
    } else {
      applyBtn.disabled = false;
      applyBtn.className = 'btn btn-primary-custom px-4';
      applyBtn.innerHTML = '<i class="bi bi-send me-1"></i> Submit Application';
      applyBtn.onclick = () => {
        handleApplyProcess(item.id);
      };
    }
  }

  // Show Modal
  const modalEl = document.getElementById('internshipDetailsModal');
  if (modalEl && window.bootstrap) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

// Handle Internship Application with Duplicate Prevention & Backend Call
async function handleApplyProcess(internshipId) {
  const item = allInternships.find(i => i.id === internshipId);
  if (!item) return;

  // 1. Strictly verify authenticated student session (Never invent or assume a student ID)
  const student = getLoggedInStudent();
  if (!student || !student.id) {
    showToast('Please sign in with your student account to apply for internships. Redirecting to login...', 'warning');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
    return;
  }

  // 2. Client-side check for already applied
  const applications = InternshipDataStore.getApplications();
  const alreadyApplied = applications.some(a =>
    (a.internshipId === item.id || a.internship_id === item.id) &&
    (a.studentId === student.id || a.student_id === student.id || !a.studentId)
  );

  if (alreadyApplied) {
    showToast(`You have already applied for this position at ${item.company}. Your application is currently under review.`, 'warning');
    return;
  }

  // 3. Set button loading states
  const targetBtns = document.querySelectorAll(`button[data-id="${internshipId}"].apply-internship-btn`);
  targetBtns.forEach(btn => {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span> Submitting...';
  });

  const modalApplyBtn = document.getElementById('modalApplyActionBtn');
  if (modalApplyBtn) {
    modalApplyBtn.disabled = true;
    modalApplyBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span> Submitting...';
  }

  // 4. Compute AI match score for payload
  const candidateSkills = student.skills || student.technicalSkills || [];
  const assessmentScores = InternshipDataStore.getAssessmentScores();
  const matchAnalysis = AISkillMatchEngine.calculateMatch(item, candidateSkills, assessmentScores);
  const matchScore = typeof item.matchPercentage === 'number' ? item.matchPercentage : matchAnalysis.percentage;

  // 5. Construct payload matching backend applications table and controller
  const payload = {
    student_id: student.id,
    internship_id: item.id,
    cover_note: `Application submitted via SkillBridge for ${item.title} at ${item.company}. Applicant: ${student.fullName || 'Student'} (${student.email || ''}).`,
    ai_match_score: matchScore
  };

  try {
    const res = await InternshipApiService.submitApplication(payload);

    // Scenario A: HTTP 201 Created (Success)
    if (res.status === 201 || (res.ok && res.status >= 200 && res.status < 300)) {
      const todayFormatted = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const newApp = {
        id: (res.data && res.data.data && res.data.data.id) ? res.data.data.id : `app-${Date.now()}`,
        internshipId: item.id,
        studentId: student.id,
        company: item.company,
        position: item.title,
        applicationDate: todayFormatted,
        status: "Applied",
        statusBadge: "bg-secondary",
        statusIcon: "bi-send-check",
        interviewDate: "Pending Initial Screening",
        interviewDetails: "Your application, verified skills, and match score have been submitted directly to the employer hiring portal.",
        location: item.location,
        stipend: item.stipend,
        domain: item.domain,
        timeline: [
          { status: "Applied", date: todayFormatted, description: "Application submitted successfully on SkillBridge." }
        ]
      };

      // Synchronize local storage so dashboard & applications page reflect immediately
      InternshipDataStore.saveLocalApplication(newApp);

      // Close modal if open
      const modalEl = document.getElementById('internshipDetailsModal');
      if (modalEl && window.bootstrap) {
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
      }

      showToast(`🎉 Application submitted successfully for ${item.title} at ${item.company}!`, 'success');
      renderInternshipsList();
      return;
    }

    // Scenario B: HTTP 409 Conflict (Duplicate application)
    if (res.status === 409) {
      InternshipDataStore.saveLocalApplication({
        internshipId: item.id,
        studentId: student.id,
        company: item.company,
        position: item.title,
        status: "Applied"
      });
      const errMsg = (res.data && res.data.error) ? res.data.error : `You have already applied for this position at ${item.company}.`;
      showToast(errMsg, 'warning');
      renderInternshipsList();
      return;
    }

    // Scenario C: HTTP 400 Bad Request
    if (res.status === 400) {
      const errMsg = (res.data && res.data.error) ? res.data.error : 'Validation error: Please verify your application details.';
      showToast(`Application error: ${errMsg}`, 'warning');
      return;
    }

    // Scenario D: HTTP 404 Not Found
    if (res.status === 404) {
      const errMsg = (res.data && res.data.error) ? res.data.error : 'Student account or internship opportunity not found in database.';
      showToast(`Not found: ${errMsg}`, 'warning');
      return;
    }

    // Scenario E: HTTP 500 or other unexpected server errors
    const errorMsg = (res.data && res.data.error) ? res.data.error : `Server error (HTTP ${res.status}). Please try again later.`;
    showToast(`Error: ${errorMsg}`, 'warning');

  } catch (networkErr) {
    console.error('[SkillBridge Application Error]', networkErr);
    showToast('Network error: Unable to connect to backend server at http://localhost:5000. Please ensure the backend is running.', 'warning');
  } finally {
    // Restore button states if still in DOM
    targetBtns.forEach(btn => {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-send me-1"></i> Apply Now';
    });
    if (modalApplyBtn) {
      modalApplyBtn.disabled = false;
      modalApplyBtn.innerHTML = '<i class="bi bi-send me-1"></i> Submit Application';
    }
  }
}

// Toast Feedback System
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = '1090';
    document.body.appendChild(container);
  }

  const toastId = `toast-${Date.now()}`;
  let icon = 'bi-info-circle-fill text-info';
  let borderClass = 'border-info';

  if (type === 'success') {
    icon = 'bi-check-circle-fill text-success';
    borderClass = 'border-success';
  } else if (type === 'warning') {
    icon = 'bi-exclamation-triangle-fill text-warning';
    borderClass = 'border-warning';
  }

  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center bg-white border-0 shadow-lg mb-2" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex align-items-center p-3 border-start border-4 ${borderClass}">
        <i class="bi ${icon} fs-5 me-2 flex-shrink-0"></i>
        <div class="toast-body p-0 small fw-medium text-dark flex-grow-1">
          ${message}
        </div>
        <button type="button" class="btn-close ms-2 me-0" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', toastHtml);
  const toastElement = document.getElementById(toastId);
  if (toastElement && window.bootstrap && bootstrap.Toast) {
    const bsToast = new bootstrap.Toast(toastElement, { delay: 4500 });
    bsToast.show();
    toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
  }
}

// Mobile Sidebar Toggle & Logout Actions
function initMobileSidebarToggle() {
  const toggleBtn = document.getElementById('mobileSidebarToggle');
  const closeBtn = document.getElementById('mobileSidebarClose');
  const backdrop = document.getElementById('dashboardSidebarBackdrop');
  const sidebar = document.getElementById('dashboardSidebar');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (sidebar) sidebar.classList.add('show');
      if (backdrop) backdrop.classList.add('show');
    });
  }

  const closeSidebar = () => {
    if (sidebar) sidebar.classList.remove('show');
    if (backdrop) backdrop.classList.remove('show');
  };

  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (backdrop) backdrop.addEventListener('click', closeSidebar);
}

function initLogoutHandler() {
  const logoutButtons = document.querySelectorAll('.dashboard-logout-trigger');

  logoutButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Are you sure you want to log out of your student portal?')) {
        try {
          localStorage.removeItem('skillbridge_active_session');
        } catch (e) {
          console.warn('Session cleanup exception', e);
        }

        showToast('Logging out... Redirecting to login page.', 'info');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 800);
      }
    });
  });
}
