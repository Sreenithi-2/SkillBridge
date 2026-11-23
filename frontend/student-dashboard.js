/**
 * SkillBridge - Student Dashboard JavaScript
 * Modern SaaS Dashboard Controller with modular architecture prepared for MySQL/Spring Boot backend integration.
 * Manages profile data, statistics, skill assessments, internship discovery, application tracking, skill gap analysis, and activity feeds.
 */

// Backend REST API Base URL
const BACKEND_API_BASE_URL = (typeof window !== 'undefined' && window.SkillBridgeConfig)
  ? window.SkillBridgeConfig.apiBaseUrl
  : ((typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.hostname !== '[::1]')
    ? 'https://skillbridge-api.onrender.com/api'
    : 'http://localhost:5000/api');

/**
 * Retrieve authenticated student session ID from browser storage
 */
function getLoggedInStudentId() {
  try {
    const sessionStr = localStorage.getItem('skillbridge_student_session');
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr);
      if (parsed && parsed.id) return parsed.id;
    }
    const regStr = localStorage.getItem('skillbridge_registered_student');
    if (regStr) {
      const parsed = JSON.parse(regStr);
      if (parsed && parsed.id) return parsed.id;
    }
    const actStr = localStorage.getItem('skillbridge_active_session');
    if (actStr) {
      const parsed = JSON.parse(actStr);
      if (parsed && parsed.id) return parsed.id;
    }
  } catch (e) {
    console.warn('Error reading student session:', e);
  }
  return null;
}

/**
 * Normalize backend MySQL application record to student dashboard format
 */
function normalizeBackendApplication(raw) {
  let appDate = 'Recent';
  if (raw.applied_at) {
    const d = new Date(raw.applied_at);
    if (!isNaN(d.getTime())) {
      appDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }

  const status = raw.status || 'Applied';
  let statusBadge = 'status-pill status-pill-applied';
  let statusIcon = 'bi-send-check';
  const s = status.toLowerCase();
  if (s.includes('shortlist')) {
    statusBadge = 'status-pill status-pill-shortlisted';
    statusIcon = 'bi-check2-circle';
  } else if (s.includes('interview')) {
    statusBadge = 'status-pill status-pill-interview';
    statusIcon = 'bi-calendar-check-fill';
  } else if (s.includes('review')) {
    statusBadge = 'status-pill status-pill-review';
    statusIcon = 'bi-hourglass-split';
  } else if (s.includes('select') || s.includes('offer')) {
    statusBadge = 'status-pill status-pill-selected';
    statusIcon = 'bi-trophy-fill';
  } else if (s.includes('reject')) {
    statusBadge = 'status-pill status-pill-rejected';
    statusIcon = 'bi-x-circle-fill';
  }

  return {
    id: raw.id,
    internshipId: raw.internship_id,
    studentId: raw.student_id,
    company: raw.company_name || 'Enterprise Partner',
    position: raw.internship_title || 'Software Engineering Intern',
    applicationDate: appDate,
    status: status,
    statusBadge: statusBadge,
    statusIcon: statusIcon,
    interviewDate: raw.interview_date || (status.includes('Interview') ? 'Scheduled Soon' : 'Pending Review'),
    interviewDetails: raw.notes || raw.interview_link || (status.includes('Interview') ? 'Technical Round' : 'Application under review.'),
    location: raw.internship_location || raw.workplace_mode || 'India (Remote)',
    stipend: raw.stipend_display || '₹35,000/mo'
  };
}

function updateApplicationHubKPIs(apps = []) {
  const total = apps.length;
  const underReview = apps.filter(a => a.status.toLowerCase().includes('review')).length;
  const interviews = apps.filter(a => a.status.toLowerCase().includes('interview')).length;
  const shortlisted = apps.filter(a => a.status.toLowerCase().includes('shortlist')).length;

  const totalEl = document.getElementById('hubKpiTotalApplied');
  if (totalEl) totalEl.textContent = total;
  const reviewEl = document.getElementById('hubKpiUnderReview');
  if (reviewEl) reviewEl.textContent = underReview;
  const intvEl = document.getElementById('hubKpiInterviews');
  if (intvEl) intvEl.textContent = interviews;
  const shortEl = document.getElementById('hubKpiShortlisted');
  if (shortEl) shortEl.textContent = shortlisted;
}

// ==========================================================================
// 1. Mock Data Store & Persistence Service (Local storage + In-memory)
// ==========================================================================
const DashboardStore = {
  // Default demo student profile
  defaultStudent: {
    id: "stud-101",
    role: "student",
    authRole: "student",
    fullName: "Yazh S",
    email: "yazh.s@example.com",
    mobile: "+91 98765 43210",
    college: "Anna University / College of Engineering",
    degree: "B.E. Computer Science & Engineering",
    department: "Computer Science & Engineering",
    graduationYear: "2026",
    cgpa: "8.8 / 10.0 (Demo)",
    profileCompletion: 85,
    bio: "Passionate final-year computer science student specializing in backend systems with Java and Spring Boot, relational database design with MySQL, and data processing with Python.",
    skills: ["Java", "Spring Boot", "MySQL", "Python", "JavaScript", "HTML5", "CSS3", "REST APIs", "Git"],
    githubUrl: "https://github.com/yazh-demo",
    linkedinUrl: "https://linkedin.com/in/yazh-demo",
    resumeFileName: "Yazh_S_Resume_2026.pdf",
    resumeUploadDate: "15 Nov 2026",
    avatarInitials: "YS"
  },

  // Skill assessments breakdown
  skillAssessments: [
    {
      id: "java",
      name: "Java",
      category: "Backend & OOP",
      score: 92,
      level: "Advanced",
      levelBadge: "bg-success",
      barColor: "bg-primary",
      icon: "bi-cup-hot-fill",
      iconColor: "#f59e0b",
      iconBg: "bg-soft-amber",
      questionsAttempted: 25,
      lastEvaluated: "18 Nov 2026",
      status: "Verified (Demo)"
    },
    {
      id: "spring",
      name: "Spring Boot",
      category: "Enterprise Framework",
      score: 88,
      level: "Proficient",
      levelBadge: "bg-info text-dark",
      barColor: "bg-success",
      icon: "bi-layers-fill",
      iconColor: "#10b981",
      iconBg: "bg-soft-emerald",
      questionsAttempted: 20,
      lastEvaluated: "15 Nov 2026",
      status: "Verified (Demo)"
    },
    {
      id: "mysql",
      name: "MySQL",
      category: "Relational Database",
      score: 85,
      level: "Proficient",
      levelBadge: "bg-info text-dark",
      barColor: "bg-info",
      icon: "bi-database-fill",
      iconColor: "#06b6d4",
      iconBg: "bg-soft-cyan",
      questionsAttempted: 20,
      lastEvaluated: "12 Nov 2026",
      status: "Verified (Demo)"
    },
    {
      id: "python",
      name: "Python",
      category: "Scripting & Data Analysis",
      score: 80,
      level: "Intermediate",
      levelBadge: "bg-primary",
      barColor: "bg-warning",
      icon: "bi-filetype-py",
      iconColor: "#4f46e5",
      iconBg: "bg-soft-primary",
      questionsAttempted: 25,
      lastEvaluated: "10 Nov 2026",
      status: "Verified (Demo)"
    },
    {
      id: "web",
      name: "HTML, CSS and JavaScript",
      category: "Frontend Development",
      score: 90,
      level: "Advanced",
      levelBadge: "bg-success",
      barColor: "bg-primary",
      icon: "bi-code-slash",
      iconColor: "#be185d",
      iconBg: "bg-soft-pink",
      questionsAttempted: 30,
      lastEvaluated: "17 Nov 2026",
      status: "Verified (Demo)"
    }
  ],

  // Recommended internships catalog
  recommendedInternships: [
    {
      id: "int-101",
      title: "Full Stack Java Developer Intern",
      company: "CloudScale Solutions (Demo)",
      logoText: "CS",
      badgeClass: "bg-soft-primary text-primary",
      category: "Java",
      workplace: "Hybrid",
      location: "Bengaluru, Karnataka",
      stipend: "₹35,000/mo",
      duration: "6 Months",
      matchPercentage: 97,
      requiredSkills: ["Java", "Spring Boot", "MySQL", "REST APIs"],
      description: "Build scalable microservices and REST endpoints using Spring Boot, design normalized MySQL database tables, and participate in code reviews.",
      openings: 3,
      deadline: "30 Nov 2026",
      isApplied: true
    },
    {
      id: "int-102",
      title: "Python & Data Engineering Intern",
      company: "DataMatrix Analytics (Demo)",
      logoText: "DM",
      badgeClass: "bg-soft-emerald text-success",
      category: "Python",
      workplace: "Remote",
      location: "Hyderabad, Telangana (Remote)",
      stipend: "₹38,000/mo",
      duration: "6 Months",
      matchPercentage: 92,
      requiredSkills: ["Python", "MySQL", "Pandas", "ETL Pipelines"],
      description: "Assist in architecting automated data pipelines, writing performant SQL queries, and cleaning unstructured datasets for analytical models.",
      openings: 2,
      deadline: "05 Dec 2026",
      isApplied: true
    },
    {
      id: "int-103",
      title: "Backend Engineering Intern (Spring Boot)",
      company: "FinTech Orbit Systems (Demo)",
      logoText: "FO",
      badgeClass: "bg-soft-amber text-warning",
      category: "Java",
      workplace: "Onsite",
      location: "Chennai, Tamil Nadu",
      stipend: "₹40,000/mo",
      duration: "6 Months",
      matchPercentage: 94,
      requiredSkills: ["Java", "Spring Boot", "MySQL", "Docker"],
      description: "Participate in core transactional engine development, optimize high-throughput MySQL queries, and write integration tests with JUnit and Mockito.",
      openings: 4,
      deadline: "02 Dec 2026",
      isApplied: false
    },
    {
      id: "int-104",
      title: "Frontend Web Developer Intern",
      company: "NextGen Digital Labs (Demo)",
      logoText: "ND",
      badgeClass: "bg-soft-pink text-danger",
      category: "Web",
      workplace: "Remote",
      location: "Bengaluru, Karnataka (Remote)",
      stipend: "₹30,000/mo",
      duration: "3 Months",
      matchPercentage: 89,
      requiredSkills: ["JavaScript", "HTML5", "CSS3", "Bootstrap"],
      description: "Develop responsive and accessible web layouts for student career portals, integrate backend APIs, and enhance interactive user interfaces.",
      openings: 2,
      deadline: "10 Dec 2026",
      isApplied: true
    },
    {
      id: "int-105",
      title: "Database Administrator & SQL Intern",
      company: "Apex Infotech Services (Demo)",
      logoText: "AI",
      badgeClass: "bg-soft-cyan text-info",
      category: "Database",
      workplace: "Hybrid",
      location: "Pune, Maharashtra",
      stipend: "₹32,000/mo",
      duration: "6 Months",
      matchPercentage: 86,
      requiredSkills: ["MySQL", "Database Design", "Performance Tuning"],
      description: "Analyze database execution plans, set up indexing strategies, monitor transaction deadlocks, and assist in automated backup routines.",
      openings: 1,
      deadline: "15 Dec 2026",
      isApplied: false
    },
    {
      id: "int-106",
      title: "Junior Python Backend Intern",
      company: "Synthetix AI Systems (Demo)",
      logoText: "SX",
      badgeClass: "bg-soft-purple text-purple",
      category: "Python",
      workplace: "Remote",
      location: "Remote",
      stipend: "₹36,000/mo",
      duration: "4 Months",
      matchPercentage: 91,
      requiredSkills: ["Python", "FastAPI", "MySQL", "REST APIs"],
      description: "Design low-latency asynchronous API endpoints, write database integration tests, and collaborate on asynchronous task queuing with Celery.",
      openings: 2,
      deadline: "18 Dec 2026",
      isApplied: false
    }
  ],

  // Initial applications tracking list
  initialApplications: [
    {
      id: "app-201",
      internshipId: "int-101",
      company: "CloudScale Solutions (Demo)",
      position: "Full Stack Java Developer Intern",
      applicationDate: "16 Nov 2026",
      status: "Interview Scheduled",
      statusBadge: "bg-success",
      statusIcon: "bi-calendar-check-fill",
      interviewDate: "25 Nov 2026 • 11:00 AM IST",
      interviewDetails: "Technical Round (Live Coding & Spring Boot architecture on Google Meet)",
      location: "Bengaluru (Hybrid)",
      stipend: "₹35,000/mo"
    },
    {
      id: "app-202",
      internshipId: "int-102",
      company: "DataMatrix Analytics (Demo)",
      position: "Python & Data Engineering Intern",
      applicationDate: "14 Nov 2026",
      status: "Under Technical Review",
      statusBadge: "bg-primary",
      statusIcon: "bi-hourglass-split",
      interviewDate: "Expected by 22 Nov 2026",
      interviewDetails: "Take-home SQL & Python ETL assessment is currently under review by engineering lead.",
      location: "Hyderabad (Remote)",
      stipend: "₹38,000/mo"
    },
    {
      id: "app-203",
      internshipId: "int-104",
      company: "NextGen Digital Labs (Demo)",
      position: "Frontend Web Developer Intern",
      applicationDate: "10 Nov 2026",
      status: "Shortlisted for Round 2",
      statusBadge: "bg-info text-dark",
      statusIcon: "bi-check2-circle",
      interviewDate: "28 Nov 2026 • 03:30 PM IST",
      interviewDetails: "Pair programming UI challenge focused on modern JavaScript and CSS responsiveness.",
      location: "Bengaluru (Remote)",
      stipend: "₹30,000/mo"
    },
    {
      id: "app-204",
      internshipId: "custom-1",
      company: "FinTech Orbit Systems (Demo)",
      position: "Backend Engineering Intern",
      applicationDate: "05 Nov 2026",
      status: "Application Submitted",
      statusBadge: "bg-secondary",
      statusIcon: "bi-send-check",
      interviewDate: "Pending Initial Screening",
      interviewDetails: "HR team has received your application and resume. Screening in progress.",
      location: "Chennai (Onsite)",
      stipend: "₹40,000/mo"
    },
    {
      id: "app-205",
      internshipId: "custom-2",
      company: "Zenith Cloud Corp (Demo)",
      position: "DevOps & Cloud Associate Intern",
      applicationDate: "01 Nov 2026",
      status: "Application Submitted",
      statusBadge: "bg-secondary",
      statusIcon: "bi-send-check",
      interviewDate: "Pending Initial Screening",
      interviewDetails: "Profile matched against entry-level DevOps candidate pool.",
      location: "Remote",
      stipend: "₹32,000/mo"
    }
  ],

  // Skill Gap Analysis
  skillGaps: [
    {
      id: "gap-1",
      skill: "Microservices Architecture & Docker",
      currentProficiency: "Beginner (Demo)",
      targetProficiency: "Industry Ready",
      priority: "High Priority",
      priorityClass: "bg-danger",
      impactScore: "+12% Match Increase",
      explanation: "Appears in 75% of senior and high-stipend Java Spring Boot internship job descriptions.",
      suggestedTopics: [
        { title: "Containerizing Spring Boot 3 & MySQL with Docker Compose", duration: "2.5 Hours", type: "Hands-on Lab" },
        { title: "RESTful API Gateway & Service Discovery with Eureka", duration: "3.0 Hours", type: "Module" },
        { title: "Building Resilient Fault-Tolerant Endpoints using Resilience4j", duration: "1.5 Hours", type: "Practice" }
      ]
    },
    {
      id: "gap-2",
      skill: "Advanced MySQL Indexing & Query Tuning",
      currentProficiency: "Intermediate (Demo)",
      targetProficiency: "Advanced Optimization",
      priority: "Medium Priority",
      priorityClass: "bg-warning text-dark",
      impactScore: "+8% Match Increase",
      explanation: "Heavily tested in technical interview rounds for relational database schema efficiency.",
      suggestedTopics: [
        { title: "Using EXPLAIN and ANALYZE for B-Tree Index Evaluation", duration: "1.5 Hours", type: "Guide" },
        { title: "Connection Pooling & Transaction Isolation Levels in MySQL 8", duration: "2.0 Hours", type: "Deep Dive" },
        { title: "Database Normalization Tradeoffs in High-Throughput Apps", duration: "1.0 Hour", type: "Case Study" }
      ]
    },
    {
      id: "gap-3",
      skill: "CI/CD Pipelines & Automated Unit Testing",
      currentProficiency: "Intermediate (Demo)",
      targetProficiency: "Proficient",
      priority: "Recommended",
      priorityClass: "bg-info text-dark",
      impactScore: "+6% Match Increase",
      explanation: "Essential for modern engineering workflows and production-ready code delivery.",
      suggestedTopics: [
        { title: "Automating Java Builds with GitHub Actions & Maven", duration: "2.0 Hours", type: "Walkthrough" },
        { title: "Mocking Services with Mockito & AssertJ in JUnit 5", duration: "2.5 Hours", type: "Hands-on Lab" },
        { title: "Writing Integration Tests for Spring Boot REST Controllers", duration: "2.0 Hours", type: "Practice" }
      ]
    }
  ],

  // Recent Activity Feed
  recentActivities: [
    {
      id: "act-1",
      type: "application",
      icon: "bi-send-fill",
      iconClass: "text-primary",
      bgClass: "bg-soft-primary",
      title: "Submitted Internship Application",
      description: "Applied for Full Stack Java Developer Intern at CloudScale Solutions (Demo).",
      timestamp: "2 hours ago"
    },
    {
      id: "act-2",
      type: "assessment",
      icon: "bi-award-fill",
      iconClass: "text-success",
      bgClass: "bg-soft-emerald",
      title: "Completed Java Core AI Skill Assessment",
      description: "Scored 92% (Advanced proficiency badge awarded - Demo result).",
      timestamp: "Yesterday, 4:15 PM"
    },
    {
      id: "act-3",
      type: "interview",
      icon: "bi-calendar-check-fill",
      iconClass: "text-info",
      bgClass: "bg-soft-cyan",
      title: "Technical Interview Scheduled",
      description: "CloudScale Solutions confirmed a Google Meet Technical Round for Nov 25, 2026.",
      timestamp: "2 days ago"
    },
    {
      id: "act-4",
      type: "profile",
      icon: "bi-person-badge-fill",
      iconClass: "text-purple",
      bgClass: "bg-soft-purple",
      title: "Profile Skills & Resume Updated",
      description: "Added Spring Boot, MySQL, and Python to verified technical skills list.",
      timestamp: "3 days ago"
    },
    {
      id: "act-5",
      type: "assessment",
      icon: "bi-shield-check",
      iconClass: "text-warning",
      bgClass: "bg-soft-amber",
      title: "Spring Boot Competency Verified",
      description: "Achieved 88% proficiency rating in REST API development module.",
      timestamp: "5 days ago"
    }
  ],

  // Load active student profile
  getStudentProfile() {
    try {
      const stored = localStorage.getItem('skillbridge_registered_student');
      if (stored) {
        const parsed = JSON.parse(stored);
        const name = parsed.fullName || this.defaultStudent.fullName;
        const initials = name
          .split(' ')
          .map(w => w[0])
          .slice(0, 2)
          .join('')
          .toUpperCase() || 'YS';

        return {
          ...this.defaultStudent,
          ...parsed,
          fullName: name,
          avatarInitials: initials,
          college: parsed.college || this.defaultStudent.college,
          degree: parsed.degree || this.defaultStudent.degree,
          department: parsed.department || this.defaultStudent.department,
          graduationYear: parsed.graduationYear || this.defaultStudent.graduationYear,
          email: parsed.email || this.defaultStudent.email,
          mobile: parsed.mobile || this.defaultStudent.mobile,
          skills: parsed.skills && parsed.skills.length > 0 ? parsed.skills : this.defaultStudent.skills,
          resumeFileName: parsed.resumeFileName || this.defaultStudent.resumeFileName
        };
      }
    } catch (e) {
      console.warn('Could not read registered student from localStorage', e);
    }
    return { ...this.defaultStudent };
  },

  // Save updated student profile
  saveStudentProfile(updatedProfile) {
    try {
      if (updatedProfile) {
        if (!updatedProfile.role) updatedProfile.role = 'student';
        if (!updatedProfile.authRole) updatedProfile.authRole = 'student';
      }
      const str = JSON.stringify(updatedProfile);
      localStorage.setItem('skillbridge_registered_student', str);
      sessionStorage.setItem('skillbridge_registered_student', str);
    } catch (e) {
      console.warn('Could not persist updated profile', e);
    }
  },

  // Get active applications
  getApplications() {
    try {
      const stored = localStorage.getItem('skillbridge_student_applications');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read applications from localStorage', e);
    }
    return [...this.initialApplications];
  },

  // Save applications
  saveApplications(apps) {
    try {
      localStorage.setItem('skillbridge_student_applications', JSON.stringify(apps));
    } catch (e) {
      console.warn('Could not save applications', e);
    }
  },

  // Refresh student profile directly from backend MySQL API for authenticated student
  async refreshStudentProfileFromBackend(providedStudentId) {
    const studentId = providedStudentId || getLoggedInStudentId() || (this.getStudentProfile() && this.getStudentProfile().id) || 'stud-101';
    try {
      const res = await fetch(`${BACKEND_API_BASE_URL}/students/${encodeURIComponent(studentId)}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.data) {
          const raw = json.data;
          const current = this.getStudentProfile();
          const fullName = raw.full_name || current.fullName || 'Yazh S';
          const initials = fullName
            .split(' ')
            .map(w => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase() || 'YS';

          const mapped = {
            ...current,
            id: raw.id,
            role: 'student',
            authRole: 'student',
            fullName: fullName,
            avatarInitials: initials,
            email: raw.email || current.email || '',
            mobile: raw.mobile || current.mobile || '',
            college: raw.college || current.college || '',
            degree: raw.degree || current.degree || '',
            department: raw.department || current.department || '',
            graduationYear: raw.graduation_year !== undefined && raw.graduation_year !== null ? String(raw.graduation_year) : (current.graduationYear || '2026'),
            cgpa: raw.cgpa !== undefined && raw.cgpa !== null ? String(raw.cgpa) : (current.cgpa || '8.80'),
            bio: raw.profile_bio !== undefined && raw.profile_bio !== null ? raw.profile_bio : (current.bio || ''),
            githubUrl: raw.github_url !== undefined && raw.github_url !== null ? raw.github_url : (current.githubUrl || ''),
            linkedinUrl: raw.linkedin_url !== undefined && raw.linkedin_url !== null ? raw.linkedin_url : (current.linkedinUrl || ''),
            portfolioUrl: raw.portfolio_url !== undefined && raw.portfolio_url !== null ? raw.portfolio_url : (current.portfolioUrl || ''),
            avatarUrl: raw.avatar_url || current.avatarUrl || null
          };

          this.saveStudentProfile(mapped);
          renderTopNavAndSidebar(mapped);
          renderWelcomeSection(mapped);
          renderMyProfileSection(mapped);
          return mapped;
        }
      }
    } catch (err) {
      console.warn('[SkillBridge Dashboard] Could not fetch student profile from backend:', err);
    }
    return this.getStudentProfile();
  },

  // Refresh applications directly from backend MySQL API for authenticated student
  async refreshApplicationsFromBackend(providedStudentId) {
    const studentId = providedStudentId || getLoggedInStudentId() || 'stud-101';
    try {
      const res = await fetch(`${BACKEND_API_BASE_URL}/applications?student_id=${encodeURIComponent(studentId)}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.data)) {
          const mapped = json.data.map(normalizeBackendApplication);
          this.saveApplications(mapped);
          renderApplicationsList('all');
          renderStatisticsKPIs();
          updateApplicationHubKPIs(mapped);
          return mapped;
        }
      }
    } catch (err) {
      console.warn('[SkillBridge Dashboard] Could not fetch applications from backend:', err);
    }
    return this.getApplications();
  },

  // Refresh real statistics directly from backend MySQL API for authenticated student
  async refreshStatisticsFromBackend(providedStudentId) {
    const studentId = providedStudentId || getLoggedInStudentId() || 'stud-101';
    try {
      const res = await fetch(`${BACKEND_API_BASE_URL}/students/${encodeURIComponent(studentId)}/statistics`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.data) {
          const stats = json.data;

          const verifiedSkillsCount = document.getElementById('kpiVerifiedSkills');
          const avgMatchScore = document.getElementById('kpiMatchScore');
          const recommendedCount = document.getElementById('kpiRecommendedCount');
          const applicationsCount = document.getElementById('kpiApplicationsCount');
          const sidebarAppsBadge = document.getElementById('sidebarAppsBadge');
          const applicationsFilterCount = document.getElementById('applicationsFilterCount');

          if (verifiedSkillsCount && stats.verifiedSkills !== undefined) {
            verifiedSkillsCount.textContent = stats.verifiedSkills;
          }
          if (avgMatchScore && stats.assessmentScores) {
            avgMatchScore.innerHTML = `${stats.assessmentScores.average}% <span class="badge bg-soft-primary fs-6 fw-semibold align-middle">Verified</span>`;
          }
          if (applicationsCount && stats.totalApplications !== undefined) {
            applicationsCount.textContent = stats.totalApplications;
          }
          if (sidebarAppsBadge && stats.totalApplications !== undefined) {
            sidebarAppsBadge.textContent = stats.totalApplications;
          }
          if (applicationsFilterCount && stats.totalApplications !== undefined) {
            applicationsFilterCount.textContent = `${stats.totalApplications} Applications`;
          }

          // KPI sub-badge on Applications Card: e.g. "1 Interview"
          const interviewBadge = document.querySelector('#kpiApplicationsCount + span');
          if (interviewBadge) {
            const intCnt = stats.interviewScheduled || 0;
            interviewBadge.textContent = `${intCnt} Interview${intCnt === 1 ? '' : 's'}`;
          }

          // Update Hub KPIs
          const totalEl = document.getElementById('hubKpiTotalApplied');
          if (totalEl) totalEl.textContent = stats.totalApplications;
          const reviewEl = document.getElementById('hubKpiUnderReview');
          if (reviewEl) reviewEl.textContent = stats.underReview;
          const intvEl = document.getElementById('hubKpiInterviews');
          if (intvEl) intvEl.textContent = stats.interviewScheduled;
          const shortEl = document.getElementById('hubKpiShortlisted');
          if (shortEl) shortEl.textContent = stats.shortlisted;

          return stats;
        }
      }
    } catch (err) {
      console.warn('[SkillBridge Dashboard] Could not fetch statistics from backend:', err);
    }
    return null;
  },

  // Refresh live internships from MySQL backend
  async refreshInternshipsFromBackend() {
    try {
      const res = await fetch(`${BACKEND_API_BASE_URL}/internships`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
          const badgeColors = [
            'bg-soft-primary text-primary',
            'bg-soft-emerald text-success',
            'bg-soft-amber text-warning',
            'bg-soft-pink text-danger',
            'bg-soft-cyan text-info',
            'bg-soft-purple text-purple'
          ];

          this.recommendedInternships = json.data.map((raw, idx) => {
            const rawSkills = Array.isArray(raw.skills) && raw.skills.length > 0
              ? raw.skills
              : (Array.isArray(raw.required_skills) && raw.required_skills.length > 0 ? raw.required_skills : ['Java', 'MySQL']);
            
            const domain = (raw.domain || 'Backend').trim();
            let cat = 'Backend';
            const domLower = domain.toLowerCase();
            if (domLower.includes('data') || domLower.includes('ai')) cat = 'Data';
            else if (domLower.includes('front') || domLower.includes('web') || domLower.includes('react')) cat = 'Frontend';
            else if (domLower.includes('full')) cat = 'Full Stack';
            else if (domLower.includes('cloud') || domLower.includes('devops')) cat = 'Cloud';

            return {
              id: raw.id,
              title: raw.title,
              company: raw.company_name,
              logoText: raw.company_logo_text || (raw.company_name ? raw.company_name.slice(0, 2).toUpperCase() : 'SB'),
              badgeClass: badgeColors[idx % badgeColors.length],
              category: cat,
              workplace: raw.workplace_mode || 'Remote',
              location: raw.location || 'Remote',
              stipend: raw.stipend_display || (raw.stipend_amount ? `₹${raw.stipend_amount.toLocaleString('en-IN')}/mo` : '₹25,000/mo'),
              duration: raw.duration || '6 Months',
              matchPercentage: 88 + (idx % 10),
              requiredSkills: rawSkills,
              description: raw.description || 'Exciting engineering internship opportunity with verified mentor guidance and technical growth.',
              openings: raw.openings_count || 2,
              deadline: raw.application_deadline
                ? new Date(raw.application_deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : '30 Nov 2026',
              isApplied: false
            };
          });

          this.saveRecommendedInternships(this.recommendedInternships);
          renderRecommendedInternships();
          return this.recommendedInternships;
        }
      }
    } catch (err) {
      console.warn('[SkillBridge Dashboard] Could not fetch internships from backend:', err);
    }
    return this.recommendedInternships;
  },

  // Add new application
  applyForInternship(internshipId) {
    const internship = this.recommendedInternships.find(i => i.id === internshipId);
    if (!internship) return { success: false, message: "Internship not found." };

    const apps = this.getApplications();
    const alreadyApplied = apps.some(a => a.internshipId === internshipId || a.company.toLowerCase().includes(internship.company.toLowerCase()));

    if (alreadyApplied) {
      return { success: false, message: "You have already applied for this position." };
    }

    const newApp = {
      id: `app-${Date.now()}`,
      internshipId: internship.id,
      company: internship.company,
      position: internship.title,
      applicationDate: "Just now",
      status: "Application Submitted",
      statusBadge: "bg-secondary",
      statusIcon: "bi-send-check",
      interviewDate: "Pending Review",
      interviewDetails: "Your application and resume have been submitted to the recruitment team.",
      location: internship.location,
      stipend: internship.stipend
    };

    apps.unshift(newApp);
    this.saveApplications(apps);

    // Update internship isApplied state
    internship.isApplied = true;

    // Add activity
    this.addActivity({
      type: "application",
      icon: "bi-send-fill",
      iconClass: "text-primary",
      bgClass: "bg-soft-primary",
      title: "Submitted Internship Application",
      description: `Applied for ${internship.title} at ${internship.company}.`,
      timestamp: "Just now"
    });

    return { success: true, message: `Application submitted successfully to ${internship.company}!` };
  },

  // Add activity log
  addActivity(activity) {
    const newAct = {
      id: `act-${Date.now()}`,
      ...activity
    };
    this.recentActivities.unshift(newAct);
  }
};

// ==========================================================================
// 2. Dashboard UI Controller
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initDashboardController();
});

function initDashboardController() {
  // Initialize state
  const student = DashboardStore.getStudentProfile();

  // Render components
  renderTopNavAndSidebar(student);
  renderWelcomeSection(student);
  renderStatisticsKPIs();
  renderSkillAssessments();
  renderRecommendedInternships('all', 'all', '');
  renderApplicationsList('all');
  renderSkillGapAnalysis();
  renderRecentActivityFeed();
  renderMyProfileSection(student);
  renderResumeManagement(student);

  // Fetch live profile and applications from MySQL backend for authenticated student
  const studentId = getLoggedInStudentId() || (student && student.id);
  if (studentId) {
    DashboardStore.refreshStudentProfileFromBackend(studentId);
    DashboardStore.refreshApplicationsFromBackend(studentId);
    DashboardStore.refreshStatisticsFromBackend(studentId);
  }
  DashboardStore.refreshInternshipsFromBackend();

  // Bind interactive handlers
  initSidebarNavigation();
  initMobileSidebarToggle();
  initInternshipFilters();
  initApplicationFilters();
  initLogoutHandler();
  initProfileEditForm();
  initResumeUploadForm();
  initReassessmentModal();
}

/* --------------------------------------------------------------------------
   Top Navbar & Sidebar Header Elements
   -------------------------------------------------------------------------- */
function renderTopNavAndSidebar(student) {
  // Update header and profile dropdown elements
  const avatarInitialsElements = document.querySelectorAll('.user-avatar-initials');
  const userFullNames = document.querySelectorAll('.user-full-name');
  const userRoles = document.querySelectorAll('.user-role-label');

  avatarInitialsElements.forEach(el => el.textContent = student.avatarInitials);
  userFullNames.forEach(el => el.textContent = student.fullName);
  userRoles.forEach(el => el.textContent = `${student.degree} (Final Year)`);
}

/* --------------------------------------------------------------------------
   Welcome Banner & Profile Completion
   -------------------------------------------------------------------------- */
function renderWelcomeSection(student) {
  const welcomeName = document.getElementById('welcomeStudentName');
  const academicDetails = document.getElementById('welcomeAcademicDetails');
  const completionPercentage = document.getElementById('profileCompletionPercentage');
  const completionBar = document.getElementById('profileCompletionBar');
  const completionNote = document.getElementById('profileCompletionNote');

  if (welcomeName) welcomeName.textContent = student.fullName;
  if (academicDetails) {
    academicDetails.innerHTML = `
      <span class="fw-semibold text-dark">${student.degree}</span> &bull; 
      <span>${student.department}</span> &bull; 
      <span>${student.college}</span> &bull; 
      <span class="badge bg-light text-dark border">Class of ${student.graduationYear}</span>
    `;
  }

  const completion = student.profileCompletion || 85;
  if (completionPercentage) completionPercentage.textContent = `${completion}%`;
  if (completionBar) {
    completionBar.style.width = `${completion}%`;
    completionBar.setAttribute('aria-valuenow', completion);
  }
  if (completionNote) {
    if (completion >= 100) {
      completionNote.textContent = 'All profile details verified. Your AI candidate score is at maximum visibility.';
    } else {
      completionNote.innerHTML = 'Add GitHub portfolio and project repository links to reach <strong>100%</strong>.';
    }
  }
}

/* --------------------------------------------------------------------------
   Statistics KPI Cards
   -------------------------------------------------------------------------- */
function renderStatisticsKPIs() {
  const verifiedSkillsCount = document.getElementById('kpiVerifiedSkills');
  const avgMatchScore = document.getElementById('kpiMatchScore');
  const recommendedCount = document.getElementById('kpiRecommendedCount');
  const applicationsCount = document.getElementById('kpiApplicationsCount');

  const apps = DashboardStore.getApplications();
  const internships = DashboardStore.recommendedInternships;

  // Calculate average match score
  const totalScore = DashboardStore.skillAssessments.reduce((acc, curr) => acc + curr.score, 0);
  const avgScore = Math.round(totalScore / DashboardStore.skillAssessments.length);

  if (verifiedSkillsCount) verifiedSkillsCount.textContent = DashboardStore.skillAssessments.length;
  if (avgMatchScore) avgMatchScore.innerHTML = `${avgScore}% <span class="badge bg-soft-primary fs-6 fw-semibold align-middle">(Demo)</span>`;
  if (recommendedCount) recommendedCount.textContent = internships.length;
  if (applicationsCount) applicationsCount.textContent = apps.length;

  // Also update badges in sidebar
  const sidebarAppsBadge = document.getElementById('sidebarAppsBadge');
  const sidebarRecBadge = document.getElementById('sidebarRecBadge');
  if (sidebarAppsBadge) sidebarAppsBadge.textContent = apps.length;
  if (sidebarRecBadge) sidebarRecBadge.textContent = internships.length;

  // Trigger real backend sync for accurate MySQL data
  const studentId = getLoggedInStudentId();
  if (studentId) {
    DashboardStore.refreshStatisticsFromBackend(studentId);
  }
}

/* --------------------------------------------------------------------------
   Skill Assessment Section (Progress Bars & Benchmark Badges)
   -------------------------------------------------------------------------- */
function renderSkillAssessments() {
  const container = document.getElementById('skillAssessmentContainer');
  if (!container) return;

  const skills = DashboardStore.skillAssessments;
  container.innerHTML = skills.map(skill => {
    let skillQuery = 'java';
    const s = (skill.name || '').toLowerCase();
    if (s.includes('spring')) skillQuery = 'spring';
    else if (s.includes('sql') || s.includes('database')) skillQuery = 'mysql';
    else if (s.includes('python')) skillQuery = 'python';
    else if (s.includes('react')) skillQuery = 'react';
    else if (s.includes('data') || s.includes('struct') || s.includes('dsa')) skillQuery = 'dsa';

    return `
    <div class="col-12 col-md-6 mb-3">
      <div class="p-3 bg-white rounded-3 border h-100 shadow-xs">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div class="d-flex align-items-center gap-2">
            <div class="rounded p-2 d-flex align-items-center justify-content-center ${skill.iconBg}" style="width: 36px; height: 36px;">
              <i class="bi ${skill.icon}" style="color: ${skill.iconColor}; font-size: 1.1rem;"></i>
            </div>
            <div>
              <div class="fw-bold text-dark leading-tight">${skill.name}</div>
              <small class="text-muted" style="font-size: 0.75rem;">${skill.category}</small>
            </div>
          </div>
          <div class="text-end">
            <span class="badge ${skill.levelBadge} px-2 py-1 rounded-pill" style="font-size: 0.75rem;">${skill.level}</span>
            <div class="fw-bold text-primary mt-1" style="font-size: 1rem;">${skill.score}%</div>
          </div>
        </div>

        <div class="progress progress-skill mb-2">
          <div class="progress-bar ${skill.barColor}" role="progressbar" style="width: ${skill.score}%;" aria-valuenow="${skill.score}" aria-valuemin="0" aria-valuemax="100"></div>
        </div>

        <div class="d-flex justify-content-between align-items-center text-muted" style="font-size: 0.75rem;">
          <span><i class="bi bi-clock-history me-1"></i> Tested: ${skill.lastEvaluated}</span>
          <a href="skill-assessment.html?skill=${encodeURIComponent(skillQuery)}" class="btn btn-link btn-sm p-0 text-decoration-none text-primary fw-semibold" style="font-size: 0.75rem;">
            <i class="bi bi-arrow-clockwise me-1"></i> Retake Test
          </a>
        </div>
      </div>
    </div>
  `;
  }).join('');
}

/* --------------------------------------------------------------------------
   Recommended Internships Section
   -------------------------------------------------------------------------- */
function renderRecommendedInternships(categoryFilter = 'all', workplaceFilter = 'all', searchKeyword = '') {
  const container = document.getElementById('recommendedInternshipsList');
  const dedicatedContainer = document.getElementById('dedicatedInternshipsList');
  const countBadge = document.getElementById('internshipsFilteredCount');
  const dedicatedCountBadge = document.getElementById('dedicatedInternshipsCount');
  const sidebarRecBadge = document.getElementById('sidebarRecBadge');

  if (!container && !dedicatedContainer) return;

  let list = DashboardStore.recommendedInternships;

  // Filter by category
  if (categoryFilter !== 'all') {
    list = list.filter(item => item.category.toLowerCase() === categoryFilter.toLowerCase());
  }

  // Filter by workplace
  if (workplaceFilter !== 'all') {
    list = list.filter(item => item.workplace.toLowerCase() === workplaceFilter.toLowerCase());
  }

  // Filter by search keyword
  if (searchKeyword.trim() !== '') {
    const q = searchKeyword.toLowerCase();
    list = list.filter(item => 
      item.title.toLowerCase().includes(q) ||
      item.company.toLowerCase().includes(q) ||
      item.requiredSkills.some(s => s.toLowerCase().includes(q)) ||
      item.location.toLowerCase().includes(q)
    );
  }

  const countText = `${list.length} Opening${list.length === 1 ? '' : 's'} Found`;
  if (countBadge) countBadge.textContent = countText;
  if (dedicatedCountBadge) dedicatedCountBadge.textContent = countText;
  if (sidebarRecBadge) sidebarRecBadge.textContent = list.length;

  if (list.length === 0) {
    const emptyHtml = `
      <div class="col-12 py-5 text-center bg-white rounded-4 border">
        <i class="bi bi-search text-muted fs-1 mb-2"></i>
        <h6 class="fw-bold text-dark">No matching internships found</h6>
        <p class="text-muted small mb-0">Try clearing your filters or selecting a different tech domain.</p>
      </div>
    `;
    if (container) container.innerHTML = emptyHtml;
    if (dedicatedContainer) dedicatedContainer.innerHTML = emptyHtml;
    return;
  }

  const apps = DashboardStore.getApplications();

  const cardsHtml = list.map(item => {
    const isApplied = apps.some(a => a.internshipId === item.id || (a.company && a.company.toLowerCase().includes(item.company.toLowerCase())));

    return `
      <div class="col-12 col-xl-6 mb-3">
        <div class="card h-100 border shadow-xs p-3 rounded-3 bg-white">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <div class="d-flex align-items-center gap-2">
              <div class="rounded-3 ${item.badgeClass} fw-bold d-flex align-items-center justify-content-center" style="width: 44px; height: 44px; font-size: 1rem;">
                ${item.logoText}
              </div>
              <div>
                <h6 class="fw-bold mb-0 text-dark leading-tight">${item.title}</h6>
                <small class="text-muted">${item.company}</small>
              </div>
            </div>
            <div class="text-end">
              <span class="badge bg-soft-primary text-primary px-2 py-1 rounded-pill fw-semibold" style="font-size: 0.78rem;">
                <i class="bi bi-stars me-1"></i> ${item.matchPercentage}% AI Fit
              </span>
            </div>
          </div>

          <div class="d-flex flex-wrap gap-2 my-2" style="font-size: 0.8rem;">
            <span class="text-muted"><i class="bi bi-geo-alt-fill text-danger me-1"></i> ${item.location}</span>
            <span class="text-muted">&bull;</span>
            <span class="text-dark fw-bold"><i class="bi bi-cash-stack text-success me-1"></i> ${item.stipend}</span>
            <span class="text-muted">&bull;</span>
            <span class="text-muted"><i class="bi bi-clock me-1"></i> ${item.duration}</span>
          </div>

          <p class="text-muted small mb-3 line-clamp-2" style="font-size: 0.82rem; min-height: 2.4rem;">
            ${item.description}
          </p>

          <div class="mb-3">
            <div class="d-flex flex-wrap gap-1">
              ${item.requiredSkills.map(sk => `<span class="badge bg-light text-dark border px-2 py-1" style="font-size: 0.75rem;">${sk}</span>`).join('')}
            </div>
          </div>

          <div class="d-flex justify-content-between align-items-center pt-2 border-top mt-auto">
            <small class="text-muted" style="font-size: 0.75rem;">
              <i class="bi bi-hourglass-split me-1"></i> Apply by ${item.deadline}
            </small>
            <div class="d-flex gap-2">
              <button class="btn btn-outline-custom btn-sm px-3 view-details-btn" data-id="${item.id}">
                View Details
              </button>
              ${
                isApplied
                  ? `<button class="btn btn-secondary btn-sm px-3 disabled" disabled><i class="bi bi-check2 me-1"></i> Applied</button>`
                  : `<button class="btn btn-primary-custom btn-sm px-3 apply-internship-btn" data-id="${item.id}"><i class="bi bi-send me-1"></i> Apply Now</button>`
              }
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (container) container.innerHTML = cardsHtml;
  if (dedicatedContainer) dedicatedContainer.innerHTML = cardsHtml;

  // Attach button listeners to all active containers
  document.querySelectorAll('.view-details-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      showInternshipDetailsModal(id);
    };
  });

  document.querySelectorAll('.apply-internship-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      handleApplyInternship(id);
    };
  });
}

/* --------------------------------------------------------------------------
   My Applications Tracking Section
   -------------------------------------------------------------------------- */
function renderApplicationsList(statusFilter = 'all') {
  const container = document.getElementById('applicationsTableBody');
  const sectionContainer = document.getElementById('applicationsSectionTableBody');
  const countBadge = document.getElementById('applicationsFilterCount');
  const sectionCountBadge = document.getElementById('applicationsSectionCount');
  if (!container && !sectionContainer) return;

  let apps = DashboardStore.getApplications();

  if (statusFilter !== 'all') {
    apps = apps.filter(a => a.status.toLowerCase().includes(statusFilter.toLowerCase()));
  }

  const countText = `${apps.length} Total Applications`;
  if (countBadge) countBadge.textContent = countText;
  if (sectionCountBadge) sectionCountBadge.textContent = countText;

  const targetContainers = [container, sectionContainer].filter(Boolean);

  if (apps.length === 0) {
    const emptyHtml = `
      <tr>
        <td colspan="6" class="text-center py-4 text-muted">
          <i class="bi bi-inbox fs-2 d-block mb-2"></i>
          No applications match the selected filter.
        </td>
      </tr>
    `;
    targetContainers.forEach(c => { c.innerHTML = emptyHtml; });
    return;
  }

  const rowsHtml = apps.map((app, index) => `
    <tr data-application-id="${app.id}">
      <td class="align-middle">
        <div class="fw-bold text-dark">${app.company}</div>
        <small class="text-muted">${app.location || 'India (Demo)'}</small>
      </td>
      <td class="align-middle">
        <div class="fw-semibold text-dark">${app.position}</div>
        <small class="text-primary fw-medium">${app.stipend || '₹35,000/mo'}</small>
      </td>
      <td class="align-middle text-muted small">
        <i class="bi bi-calendar3 me-1"></i> ${app.applicationDate}
      </td>
      <td class="align-middle">
        <span class="${app.statusBadge} px-2 py-1 rounded-pill" style="font-size: 0.76rem;">
          <i class="bi ${app.statusIcon || 'bi-circle-fill'} me-1"></i> ${app.status}
        </span>
      </td>
      <td class="align-middle small">
        ${
          app.status.includes('Interview')
            ? `<div class="fw-bold text-success"><i class="bi bi-camera-video me-1"></i> ${app.interviewDate}</div><small class="text-muted">${app.interviewDetails || 'Live Round'}</small>`
            : `<span class="text-muted">${app.interviewDate}</span>`
        }
      </td>
      <td class="align-middle text-end">
        <button class="btn btn-sm btn-outline-custom view-app-btn" data-id="${app.id}" title="View Application Tracking Status">
          <i class="bi bi-eye"></i> Track
        </button>
      </td>
    </tr>
  `).join('');

  targetContainers.forEach(c => {
    c.innerHTML = rowsHtml;
    // Attach view tracking modal
    c.querySelectorAll('.view-app-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        showApplicationTrackerModal(id);
      });
    });
  });
}

/* --------------------------------------------------------------------------
   Skill Gap Analysis & Recommendations
   -------------------------------------------------------------------------- */
function renderSkillGapAnalysis() {
  const container = document.getElementById('skillGapContainer');
  if (!container) return;

  const gaps = DashboardStore.skillGaps;

  container.innerHTML = gaps.map(gap => `
    <div class="col-12 col-lg-4 mb-3">
      <div class="card h-100 border shadow-xs p-3 rounded-3 bg-white">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <span class="badge ${gap.priorityClass} px-2 py-1 rounded-pill" style="font-size: 0.75rem;">
            ${gap.priority}
          </span>
          <span class="badge bg-soft-emerald text-success px-2 py-1 rounded-pill fw-semibold" style="font-size: 0.75rem;">
            <i class="bi bi-graph-up-arrow me-1"></i> ${gap.impactScore}
          </span>
        </div>

        <h6 class="fw-bold text-dark mb-1">${gap.skill}</h6>
        <div class="d-flex justify-content-between small text-muted mb-2" style="font-size: 0.78rem;">
          <span>Current: <strong class="text-dark">${gap.currentProficiency}</strong></span>
          <span>Target: <strong class="text-primary">${gap.targetProficiency}</strong></span>
        </div>

        <p class="text-muted small mb-3" style="font-size: 0.8rem;">
          ${gap.explanation}
        </p>

        <div class="border-top pt-2 mt-auto">
          <div class="small fw-bold text-dark mb-2"><i class="bi bi-lightbulb-fill text-warning me-1"></i> Recommended Learning Topics:</div>
          <ul class="list-unstyled mb-3 small" style="font-size: 0.78rem;">
            ${gap.suggestedTopics.map(topic => `
              <li class="mb-1 text-muted d-flex align-items-center justify-content-between">
                <span>&bull; ${topic.title}</span>
                <span class="badge bg-light text-dark border ms-2">${topic.duration}</span>
              </li>
            `).join('')}
          </ul>
          <button class="btn btn-outline-custom btn-sm w-100 start-learning-btn" data-skill="${gap.skill}">
            <i class="bi bi-book me-1"></i> Explore Learning Roadmap
          </button>
        </div>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.start-learning-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const skill = btn.getAttribute('data-skill');
      showDashboardToast(`Roadmap for "${skill}" added to your study plan (Demo).`, 'info');
    });
  });
}

/* --------------------------------------------------------------------------
   Recent Activity Feed
   -------------------------------------------------------------------------- */
function renderRecentActivityFeed() {
  const container = document.getElementById('recentActivityFeed');
  if (!container) return;

  const activities = DashboardStore.recentActivities;

  container.innerHTML = activities.map(act => `
    <div class="activity-item">
      <div class="activity-badge ${act.bgClass} ${act.iconClass}">
        <i class="bi ${act.icon}"></i>
      </div>
      <div class="d-flex justify-content-between align-items-start">
        <h6 class="fw-bold text-dark mb-0" style="font-size: 0.9rem;">${act.title}</h6>
        <small class="text-muted" style="font-size: 0.75rem;">${act.timestamp}</small>
      </div>
      <p class="text-muted small mb-0 mt-1" style="font-size: 0.82rem;">
        ${act.description}
      </p>
    </div>
  `).join('');
}

/* --------------------------------------------------------------------------
   My Profile Dedicated View Section
   -------------------------------------------------------------------------- */
function renderMyProfileSection(student) {
  const profileForm = document.getElementById('studentProfileForm');
  if (!profileForm) return;

  // Set input values
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) {
      if (val === undefined || val === null || val === 'undefined' || val === 'null') {
        el.value = '';
      } else {
        el.value = val;
      }
    }
  };

  setVal('profileFullName', student.fullName);
  setVal('profileEmail', student.email);
  setVal('profileMobile', student.mobile);
  setVal('profileCollege', student.college);
  setVal('profileDegree', student.degree);
  setVal('profileDepartment', student.department);
  setVal('profileGradYear', student.graduationYear);
  setVal('profileCgpa', student.cgpa);
  setVal('profileBio', student.bio);
  setVal('profileGithub', student.githubUrl);
  setVal('profileLinkedin', student.linkedinUrl);

  // Verified skills badges
  const skillsContainer = document.getElementById('profileVerifiedSkillsPills');
  if (skillsContainer) {
    const skillsList = Array.isArray(student.skills) && student.skills.length > 0
      ? student.skills
      : ['Java', 'Spring Boot', 'MySQL', 'Python', 'JavaScript'];
    skillsContainer.innerHTML = skillsList.map(sk => `
      <span class="badge bg-soft-primary text-primary px-3 py-2 rounded-pill fs-7 fw-semibold border border-primary-subtle">
        <i class="bi bi-check2-circle me-1"></i> ${sk}
      </span>
    `).join('');
  }
}

/* --------------------------------------------------------------------------
   Resume Management Section
   -------------------------------------------------------------------------- */
function renderResumeManagement(student) {
  const resumeFileName = document.getElementById('resumeFileNameDisplay');
  const resumeDate = document.getElementById('resumeUploadDateDisplay');

  if (resumeFileName) resumeFileName.textContent = student.resumeFileName || 'Yazh_S_Resume_2026.pdf';
  if (resumeDate) resumeDate.textContent = student.resumeUploadDate || '15 Nov 2026';
}

/* --------------------------------------------------------------------------
   Sidebar Navigation Controller & SPA Router
   -------------------------------------------------------------------------- */
const STUDENT_VIEW_MAP = {
  'overviewSection': 'Dashboard Overview',
  'section-overview': 'Dashboard Overview',
  'profileSection': 'Candidate Profile',
  'section-profile': 'Candidate Profile',
  'assessmentSection': 'AI Skill Assessments',
  'section-assessment': 'AI Skill Assessments',
  'skillsSection': 'Technical Skill Inventory',
  'section-skills': 'Technical Skill Inventory',
  'internshipsSection': 'Recommended Internships',
  'section-internships': 'Recommended Internships',
  'applicationsSection': 'Application Tracking',
  'section-applications': 'Application Tracking',
  'resumeSection': 'Resume & Documents',
  'section-resume': 'Resume & Documents',
  'settingsSection': 'Account Settings',
  'section-settings': 'Account Settings'
};

function navigateToView(targetView, viewTitle) {
  let viewId = targetView;
  if (!viewId) viewId = 'overviewSection';

  const canonical = {
    'section-overview': 'overviewSection',
    'overview': 'overviewSection',
    'section-profile': 'profileSection',
    'profile': 'profileSection',
    'section-assessment': 'assessmentSection',
    'assessment': 'assessmentSection',
    'skill-assessment': 'assessmentSection',
    'skillAssessmentSection': 'assessmentSection',
    'section-skills': 'skillsSection',
    'skills': 'skillsSection',
    'section-internships': 'internshipsSection',
    'internships': 'internshipsSection',
    'section-applications': 'applicationsSection',
    'applications': 'applicationsSection',
    'section-resume': 'resumeSection',
    'resume': 'resumeSection',
    'section-settings': 'settingsSection',
    'settings': 'settingsSection'
  };

  if (canonical[viewId]) {
    viewId = canonical[viewId];
  }

  const targetSec = document.getElementById(viewId);
  if (!targetSec) {
    viewId = 'overviewSection';
  }

  const title = viewTitle || STUDENT_VIEW_MAP[viewId] || 'Dashboard Overview';

  // Toggle active view section
  document.querySelectorAll('.dashboard-view-section').forEach(section => {
    if (section.id === viewId) {
      section.classList.add('active');
    } else {
      section.classList.remove('active');
    }
  });

  // Toggle active nav links
  document.querySelectorAll('.dashboard-nav-link').forEach(link => {
    link.classList.remove('active');
    const v = link.getAttribute('data-view');
    const h = link.getAttribute('href');
    if (v === viewId || h === `#${viewId}` || (canonical[v] && canonical[v] === viewId)) {
      link.classList.add('active');
    }
  });

  // Update headers
  const pageTitle = document.getElementById('dashboardPageTitle');
  const breadcrumbCurrent = document.getElementById('dashboardBreadcrumbCurrent');
  if (pageTitle) pageTitle.textContent = title;
  if (breadcrumbCurrent) breadcrumbCurrent.textContent = title;

  // Refresh data if needed
  if (viewId === 'applicationsSection' || viewId === 'overviewSection') {
    const studentId = getLoggedInStudentId();
    if (studentId) {
      DashboardStore.refreshApplicationsFromBackend(studentId);
      DashboardStore.refreshStatisticsFromBackend(studentId);
    }
  }

  if (viewId === 'profileSection') {
    const studentId = getLoggedInStudentId();
    if (studentId) {
      DashboardStore.refreshStudentProfileFromBackend(studentId);
    }
  }

  // Update hash safely without full reload
  try {
    if (typeof history !== 'undefined' && history.replaceState) {
      history.replaceState(null, '', `#${viewId}`);
    }
  } catch (e) {}

  // Close mobile sidebar if open
  closeMobileSidebar();

  // Scroll to top of main area
  if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function initSidebarNavigation() {
  document.querySelectorAll('.dashboard-nav-link[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = link.getAttribute('data-view');
      const viewTitle = link.getAttribute('data-title');
      navigateToView(targetView, viewTitle);
    });
  });

  document.querySelectorAll('[data-view]').forEach(el => {
    if (!el.classList.contains('dashboard-nav-link')) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = el.getAttribute('data-view');
        const viewTitle = el.getAttribute('data-title');
        navigateToView(targetView, viewTitle);
      });
    }
  });

  // Handle URL hash on initial load
  const initialHash = window.location.hash ? window.location.hash.substring(1) : 'overviewSection';
  navigateToView(initialHash);

  // Listen on hashchange for browser back/forward and direct hash changes
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash ? window.location.hash.substring(1) : 'overviewSection';
    navigateToView(hash);
  });
}

/* --------------------------------------------------------------------------
   Mobile Sidebar Toggle
   -------------------------------------------------------------------------- */
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

  if (closeBtn) {
    closeBtn.addEventListener('click', closeMobileSidebar);
  }

  if (backdrop) {
    backdrop.addEventListener('click', closeMobileSidebar);
  }
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('dashboardSidebar');
  const backdrop = document.getElementById('dashboardSidebarBackdrop');
  if (sidebar) sidebar.classList.remove('show');
  if (backdrop) backdrop.classList.remove('show');
}

/* --------------------------------------------------------------------------
   Filter Controls
   -------------------------------------------------------------------------- */
function initInternshipFilters() {
  const categoryPills = document.querySelectorAll('.internship-category-pill, .dedicated-category-pill');
  const workplaceSelects = [
    document.getElementById('internshipWorkplaceSelect'),
    document.getElementById('dedicatedInternshipWorkplaceSelect')
  ].filter(Boolean);
  const searchInputs = [
    document.getElementById('internshipSearchInput'),
    document.getElementById('dedicatedInternshipSearchInput')
  ].filter(Boolean);

  let currentCategory = 'all';
  let currentWorkplace = 'all';
  let currentSearch = '';

  const triggerUpdate = () => {
    renderRecommendedInternships(currentCategory, currentWorkplace, currentSearch);
  };

  categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      categoryPills.forEach(p => {
        p.classList.remove('active', 'btn-primary');
        p.classList.add('btn-outline-custom');
      });

      pill.classList.remove('btn-outline-custom');
      pill.classList.add('active', 'btn-primary');

      currentCategory = pill.getAttribute('data-category');
      triggerUpdate();
    });
  });

  workplaceSelects.forEach(sel => {
    sel.addEventListener('change', () => {
      currentWorkplace = sel.value;
      // Sync other select
      workplaceSelects.forEach(other => { if (other !== sel) other.value = sel.value; });
      triggerUpdate();
    });
  });

  searchInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      // Sync other input
      searchInputs.forEach(other => { if (other !== input) other.value = e.target.value; });
      triggerUpdate();
    });
  });
}

function initApplicationFilters() {
  const statusSelect = document.getElementById('applicationStatusFilter');
  if (statusSelect) {
    statusSelect.addEventListener('change', () => {
      renderApplicationsList(statusSelect.value);
    });
  }
}

/* --------------------------------------------------------------------------
   Internship Details & Apply Actions
   -------------------------------------------------------------------------- */
function showInternshipDetailsModal(internshipId) {
  const item = DashboardStore.recommendedInternships.find(i => i.id === internshipId);
  if (!item) return;

  const modalTitle = document.getElementById('internshipModalTitle');
  const modalCompany = document.getElementById('internshipModalCompany');
  const modalStipend = document.getElementById('internshipModalStipend');
  const modalLocation = document.getElementById('internshipModalLocation');
  const modalDuration = document.getElementById('internshipModalDuration');
  const modalMatch = document.getElementById('internshipModalMatch');
  const modalDescription = document.getElementById('internshipModalDescription');
  const modalSkills = document.getElementById('internshipModalSkills');
  const modalApplyBtn = document.getElementById('internshipModalApplyBtn');

  if (modalTitle) modalTitle.textContent = item.title;
  if (modalCompany) modalCompany.textContent = item.company;
  if (modalStipend) modalStipend.textContent = item.stipend;
  if (modalLocation) modalLocation.textContent = item.location;
  if (modalDuration) modalDuration.textContent = item.duration;
  if (modalMatch) modalMatch.textContent = `${item.matchPercentage}% AI Fit`;
  if (modalDescription) modalDescription.textContent = item.description;

  if (modalSkills) {
    modalSkills.innerHTML = item.requiredSkills.map(sk => `
      <span class="badge bg-light text-dark border px-2 py-1">${sk}</span>
    `).join(' ');
  }

  const apps = DashboardStore.getApplications();
  const alreadyApplied = apps.some(a => a.internshipId === item.id || (a.company && a.company.toLowerCase().includes(item.company.toLowerCase())));

  if (modalApplyBtn) {
    if (alreadyApplied) {
      modalApplyBtn.disabled = true;
      modalApplyBtn.className = 'btn btn-secondary px-4 disabled';
      modalApplyBtn.innerHTML = '<i class="bi bi-check2 me-1"></i> Already Applied';
    } else {
      modalApplyBtn.disabled = false;
      modalApplyBtn.className = 'btn btn-primary-custom px-4';
      modalApplyBtn.innerHTML = '<i class="bi bi-send me-1"></i> Apply Now';
      modalApplyBtn.onclick = () => {
        const modalEl = document.getElementById('internshipDetailsModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
        handleApplyInternship(item.id);
      };
    }
  }

  const modalEl = document.getElementById('internshipDetailsModal');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

async function handleApplyInternship(internshipId) {
  const item = DashboardStore.recommendedInternships.find(i => i.id === internshipId);
  const studentId = getLoggedInStudentId() || 'stud-101';

  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        internship_id: internshipId,
        ai_match_score: item ? item.matchPercentage : 88,
        cover_note: `Application submitted via SkillBridge student portal for ${item ? item.title : 'Internship'}.`
      })
    });

    const resJson = await response.json();
    if (response.ok || response.status === 201) {
      showDashboardToast(`Application submitted successfully for ${item ? item.title : 'Internship'}!`, 'success');
      await DashboardStore.refreshApplicationsFromBackend(studentId);
      await DashboardStore.refreshStatisticsFromBackend(studentId);
      renderRecommendedInternships();
      renderApplicationsList();
      renderRecentActivityFeed();
    } else if (response.status === 409) {
      showDashboardToast('You have already applied for this internship position.', 'info');
      await DashboardStore.refreshApplicationsFromBackend(studentId);
      renderRecommendedInternships();
    } else {
      showDashboardToast(resJson.error || 'Failed to submit application', 'warning');
    }
  } catch (err) {
    console.warn('[handleApplyInternship] Network error fallback:', err);
    const result = DashboardStore.applyForInternship(internshipId);
    showDashboardToast(result.message, result.success ? 'success' : 'warning');
    renderRecommendedInternships();
    renderApplicationsList();
  }
}

/* --------------------------------------------------------------------------
   Application Tracking Modal
   -------------------------------------------------------------------------- */
function showApplicationTrackerModal(appId) {
  const apps = DashboardStore.getApplications();
  const app = apps.find(a => a.id === appId);
  if (!app) return;

  const modalBody = document.getElementById('applicationTrackerModalBody');
  if (!modalBody) return;

  modalBody.innerHTML = `
    <div class="p-3 bg-light rounded-3 mb-3 border">
      <div class="d-flex justify-content-between align-items-center mb-1">
        <h6 class="fw-bold mb-0 text-dark">${app.position}</h6>
        <span class="badge ${app.statusBadge} px-2 py-1 rounded-pill">${app.status}</span>
      </div>
      <div class="text-muted small">${app.company} &bull; ${app.location || 'India'}</div>
      <div class="fw-bold text-primary mt-1">${app.stipend || '₹35,000/mo'}</div>
    </div>

    <h6 class="fw-bold text-dark small mb-3">Recruitment Milestone Pipeline</h6>
    <div class="timeline-stepper mb-4">
      <div class="d-flex align-items-center gap-3 mb-3">
        <div class="rounded-circle bg-success text-white d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; flex-shrink: 0;">
          <i class="bi bi-check-lg"></i>
        </div>
        <div>
          <div class="fw-bold text-dark small">Application Submitted</div>
          <div class="text-muted" style="font-size: 0.75rem;">Completed on ${app.applicationDate}</div>
        </div>
      </div>

      <div class="d-flex align-items-center gap-3 mb-3">
        <div class="rounded-circle ${app.status.includes('Submitted') ? 'bg-light border text-muted' : 'bg-success text-white'} d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; flex-shrink: 0;">
          <i class="bi ${app.status.includes('Submitted') ? 'bi-circle' : 'bi-check-lg'}"></i>
        </div>
        <div>
          <div class="fw-bold text-dark small">Resume & Skill Score Verification</div>
          <div class="text-muted" style="font-size: 0.75rem;">AI matched against technical criteria</div>
        </div>
      </div>

      <div class="d-flex align-items-center gap-3 mb-3">
        <div class="rounded-circle ${app.status.includes('Interview') ? 'bg-primary text-white' : 'bg-light border text-muted'} d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; flex-shrink: 0;">
          <i class="bi ${app.status.includes('Interview') ? 'bi-camera-video-fill' : 'bi-circle'}"></i>
        </div>
        <div>
          <div class="fw-bold text-dark small">Technical Interview</div>
          <div class="text-muted" style="font-size: 0.75rem;">${app.interviewDate}</div>
        </div>
      </div>

      <div class="d-flex align-items-center gap-3">
        <div class="rounded-circle bg-light border text-muted d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; flex-shrink: 0;">
          <i class="bi bi-award"></i>
        </div>
        <div>
          <div class="fw-bold text-dark small">Final Offer & Onboarding</div>
          <div class="text-muted" style="font-size: 0.75rem;">Pending completion of technical rounds</div>
        </div>
      </div>
    </div>

    <div class="alert alert-info py-2 px-3 small border-0 d-flex align-items-center gap-2 mb-0">
      <i class="bi bi-info-circle-fill"></i>
      <div><strong>Status Note:</strong> ${app.interviewDetails || 'Screening in active progression.'}</div>
    </div>
  `;

  const modalEl = document.getElementById('applicationTrackerModal');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

/* --------------------------------------------------------------------------
   Profile Editing & Persistence
   -------------------------------------------------------------------------- */
function initProfileEditForm() {
  const form = document.getElementById('studentProfileForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const studentId = getLoggedInStudentId() || (DashboardStore.getStudentProfile() && DashboardStore.getStudentProfile().id) || 'stud-101';
    const submitBtn = form.querySelector('button[type="submit"]');
    const origHtml = submitBtn ? submitBtn.innerHTML : 'Save Changes';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Saving...';
    }

    const fullName = document.getElementById('profileFullName')?.value?.trim();
    const mobile = document.getElementById('profileMobile')?.value?.trim();
    const college = document.getElementById('profileCollege')?.value?.trim();
    const degree = document.getElementById('profileDegree')?.value?.trim();
    const department = document.getElementById('profileDepartment')?.value?.trim();
    const gradYearRaw = document.getElementById('profileGradYear')?.value?.trim();
    const gradYear = parseInt(gradYearRaw, 10);
    const cgpaRaw = document.getElementById('profileCgpa')?.value?.trim();
    const cgpaNum = cgpaRaw ? parseFloat(cgpaRaw) : undefined;
    const githubUrl = document.getElementById('profileGithub')?.value?.trim() || null;
    const linkedinUrl = document.getElementById('profileLinkedin')?.value?.trim() || null;
    const bio = document.getElementById('profileBio')?.value?.trim() || null;

    const payload = {
      full_name: fullName,
      mobile: mobile,
      college: college,
      degree: degree,
      department: department,
      graduation_year: isNaN(gradYear) ? undefined : gradYear,
      cgpa: isNaN(cgpaNum) ? undefined : cgpaNum,
      github_url: githubUrl,
      linkedin_url: linkedinUrl,
      profile_bio: bio
    };

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/students/${encodeURIComponent(studentId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errMsg = (errorData && (errorData.error || errorData.message)) || `Server returned status ${response.status}`;
        throw new Error(errMsg);
      }

      const result = await response.json();
      await DashboardStore.refreshStudentProfileFromBackend(studentId);
      showDashboardToast('Profile updated and saved to database successfully!', 'success');
    } catch (err) {
      console.error('[SkillBridge Dashboard] Profile update error:', err);
      showDashboardToast(`Failed to update profile: ${err.message}`, 'warning');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origHtml;
      }
    }
  });
}

/* --------------------------------------------------------------------------
   Resume Upload Demo
   -------------------------------------------------------------------------- */
function initResumeUploadForm() {
  const resumeInput = document.getElementById('resumeFileInput');
  if (!resumeInput) return;

  resumeInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showDashboardToast('Please upload a PDF file only.', 'warning');
      resumeInput.value = '';
      return;
    }

    const current = DashboardStore.getStudentProfile();
    current.resumeFileName = file.name;
    current.resumeUploadDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    DashboardStore.saveStudentProfile(current);
    renderResumeManagement(current);

    DashboardStore.addActivity({
      type: "profile",
      icon: "bi-file-earmark-pdf-fill",
      iconClass: "text-danger",
      bgClass: "bg-soft-pink",
      title: "Uploaded New Resume (PDF)",
      description: `Updated active resume document to "${file.name}".`,
      timestamp: "Just now"
    });

    renderRecentActivityFeed();
    showDashboardToast(`Resume "${file.name}" uploaded and validated successfully!`, 'success');
  });
}

/* --------------------------------------------------------------------------
   Re-Assessment Modal & Navigation
   -------------------------------------------------------------------------- */
function initReassessmentModal() {
  const retakeButtons = document.querySelectorAll('.retake-skill-btn');
  retakeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const rawSkill = btn.getAttribute('data-skill') || 'java';
      let targetSkill = 'java';
      const s = rawSkill.toLowerCase();
      if (s.includes('spring')) targetSkill = 'spring';
      else if (s.includes('sql') || s.includes('database')) targetSkill = 'mysql';
      else if (s.includes('python')) targetSkill = 'python';
      else if (s.includes('react')) targetSkill = 'react';
      else if (s.includes('data') || s.includes('dsa') || s.includes('struct')) targetSkill = 'dsa';
      else if (s.includes('suite') || s.includes('all')) {
        window.location.href = 'skill-assessment.html';
        return;
      }
      window.location.href = `skill-assessment.html?skill=${encodeURIComponent(targetSkill)}`;
    });
  });
}

/* --------------------------------------------------------------------------
   Logout Action
   -------------------------------------------------------------------------- */
function initLogoutHandler() {
  const logoutButtons = document.querySelectorAll('.dashboard-logout-trigger');

  logoutButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();

      if (confirm('Are you sure you want to log out of your student portal?')) {
        try {
          // Clear student-specific session keys and active session keys
          localStorage.removeItem('skillbridge_student_session');
          localStorage.removeItem('skillbridge_registered_student');
          localStorage.removeItem('skillbridge_active_session');
          if (localStorage.getItem('skillbridge_auth_role') === 'student') {
            localStorage.removeItem('skillbridge_auth_role');
          }
          sessionStorage.removeItem('skillbridge_student_session');
          sessionStorage.removeItem('skillbridge_registered_student');
          sessionStorage.removeItem('skillbridge_active_session');
          if (sessionStorage.getItem('skillbridge_auth_role') === 'student') {
            sessionStorage.removeItem('skillbridge_auth_role');
          }
        } catch (e) {
          console.warn('Session cleanup exception', e);
        }

        showDashboardToast('Logging out... Redirecting to sign in page.', 'info');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 500);
      }
    });
  });
}

/* --------------------------------------------------------------------------
   Global Toast Notification Utility
   -------------------------------------------------------------------------- */
function showDashboardToast(message, type = 'info') {
  let toastContainer = document.getElementById('dashboardToastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'dashboardToastContainer';
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '1090';
    document.body.appendChild(toastContainer);
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

  toastContainer.insertAdjacentHTML('beforeend', toastHtml);
  const toastElement = document.getElementById(toastId);
  if (toastElement && window.bootstrap && bootstrap.Toast) {
    const bsToast = new bootstrap.Toast(toastElement, { delay: 4000 });
    bsToast.show();
    toastElement.addEventListener('hidden.bs.toast', () => {
      toastElement.remove();
    });
  }
}
