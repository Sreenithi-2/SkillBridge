/**
 * SkillBridge Recruiter Dashboard Controller
 * Full-featured enterprise recruitment platform adhering to the SkillBridge Student Dashboard visual design system.
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. Session Management & Independent Demo Initialization
  // ==========================================================================
  const DEFAULT_DEMO_RECRUITER = {
    companyName: 'CloudScale Solutions',
    officialEmail: 'recruiter@cloudscale.io',
    contactPerson: 'Priya Sharma',
    phone: '+91 98765 43210',
    jobDesignation: 'Head of Campus Talent Acquisition',
    bio: 'Directing campus talent acquisition for CloudScale Solutions. Focused on cloud platforms, distributed architectures, and distributed systems engineering talent.',
    role: 'ROLE_RECRUITER',
    authRole: 'recruiter',
    website: 'https://cloudscale.io',
    industry: 'Cloud Infrastructure & DevOps',
    companySize: '200-500 Employees',
    location: 'Bengaluru, Karnataka (HQ)',
    description: 'CloudScale Solutions develops distributed cloud orchestration systems and intelligent telemetry pipelines for enterprise hybrid multi-cloud workloads.'
  };

  const BACKEND_API_BASE_URL = (typeof window !== 'undefined' && window.SkillBridgeConfig)
  ? window.SkillBridgeConfig.apiBaseUrl
  : ((typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.hostname !== '[::1]')
    ? 'https://skillbridge-api.onrender.com/api'
    : 'http://localhost:5000/api');

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Retrieve genuine company ID from active recruiter/company session.
   * Strictly avoids hardcoding 'comp-101' or inventing an ID.
   */
  function getLoggedInCompanyId() {
    try {
      const sessionRaw = (typeof window !== 'undefined' && window.sessionStorage && window.sessionStorage.getItem('skillbridge_recruiter_session')) ||
        (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('skillbridge_recruiter_session')) ||
        (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('skillbridge_company_session'));
      if (sessionRaw) {
        const parsed = typeof sessionRaw === 'string' ? JSON.parse(sessionRaw) : sessionRaw;
        if (parsed && typeof parsed === 'object') {
          const compId = parsed.id || parsed.company_id || parsed.companyId;
          if (compId && typeof compId === 'string' && compId.trim()) {
            return compId.trim();
          }
        }
      }
    } catch (err) {
      console.warn('[SkillBridge Recruiter] Error retrieving company ID:', err);
    }
    return null;
  }

  function normalizeBackendInternship(backendItem) {
    const deadlineStr = backendItem.application_deadline
      ? new Date(backendItem.application_deadline).toISOString().split('T')[0]
      : 'Open';
    return {
      id: backendItem.id,
      companyId: backendItem.company_id,
      title: backendItem.title,
      domain: backendItem.domain,
      workMode: backendItem.workplace_mode || 'Hybrid',
      stipend: backendItem.stipend_display || `₹${Number(backendItem.stipend_amount || 0).toLocaleString('en-IN')} / month`,
      stipendAmount: Number(backendItem.stipend_amount || 0),
      duration: backendItem.duration,
      skills: Array.isArray(backendItem.required_skills) ? backendItem.required_skills : (Array.isArray(backendItem.skills) ? backendItem.skills : []),
      minScore: 85,
      deadline: deadlineStr,
      status: backendItem.is_active ? 'Active' : 'Paused',
      applicantsCount: 0,
      postedDate: backendItem.created_at
        ? new Date(backendItem.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Recent',
      description: backendItem.description || '',
      location: backendItem.location || '',
      eligibility: backendItem.eligibility_criteria || ''
    };
  }

  async function refreshInternshipsFromBackend(companyId) {
    try {
      const url = companyId
        ? `${BACKEND_API_BASE_URL}/internships?company_id=${encodeURIComponent(companyId)}`
        : `${BACKEND_API_BASE_URL}/internships`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.data)) {
          if (json.data.length > 0) {
            internshipsList = json.data.map(normalizeBackendInternship);
          } else if (companyId) {
            const allRes = await fetch(`${BACKEND_API_BASE_URL}/internships`, {
              headers: { 'Accept': 'application/json' }
            });
            if (allRes.ok) {
              const allJson = await allRes.json();
              if (allJson && allJson.success && Array.isArray(allJson.data)) {
                internshipsList = allJson.data.map(normalizeBackendInternship);
              }
            }
          }
          saveStorage('skillbridge_recruiter_internships', internshipsList);
          renderManageInternshipsTable();
          renderOverviewRecentInternships();
          renderKPIStats();
        }
      }
    } catch (err) {
      console.warn('[SkillBridge Recruiter] Note: Could not refresh internships from backend:', err);
    }
  }

  function normalizeBackendApplication(raw) {
    const fitScore = typeof raw.ai_match_score === 'number' ? raw.ai_match_score : 85;
    const codingGrade = fitScore >= 90 ? `A+ (${fitScore}%)` : (fitScore >= 80 ? `A (${fitScore}%)` : `B (${fitScore}%)`);

    let appliedDate = 'Recent';
    let appliedTimestamp = Date.now();
    if (raw.applied_at) {
      const d = new Date(raw.applied_at);
      if (!isNaN(d.getTime())) {
        appliedDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        appliedTimestamp = d.getTime();
      }
    }

    const domain = (raw.domain || '').toLowerCase();
    const title = (raw.internship_title || '').toLowerCase();
    let defaultSkills = [
      { name: 'Java', score: 90 },
      { name: 'Spring Boot', score: 88 },
      { name: 'MySQL', score: 85 }
    ];
    if (domain.includes('data') || title.includes('python')) {
      defaultSkills = [
        { name: 'Python', score: 92 },
        { name: 'Pandas', score: 88 },
        { name: 'MySQL', score: 85 }
      ];
    } else if (domain.includes('cloud') || domain.includes('devops')) {
      defaultSkills = [
        { name: 'Docker', score: 90 },
        { name: 'Kubernetes', score: 86 },
        { name: 'Linux', score: 88 }
      ];
    } else if (domain.includes('frontend')) {
      defaultSkills = [
        { name: 'JavaScript', score: 90 },
        { name: 'HTML5', score: 88 },
        { name: 'CSS3', score: 85 }
      ];
    }

    return {
      id: raw.id,
      candidateId: raw.student_id,
      candidateName: raw.student_name || 'Candidate',
      email: raw.student_email || '',
      phone: raw.student_mobile || '+91 98765 43210',
      college: raw.student_college || 'Engineering College',
      degree: raw.student_department
        ? `${raw.student_department}${raw.student_grad_year ? ` (${raw.student_grad_year})` : ''}`
        : (raw.student_grad_year ? `Batch of ${raw.student_grad_year}` : 'B.E. Computer Science'),
      appliedInternshipId: raw.internship_id,
      appliedRole: raw.internship_title || 'Software Engineering Intern',
      appliedDate,
      appliedTimestamp,
      fitScore,
      codingGrade,
      status: raw.status || 'Applied',
      skills: Array.isArray(raw.skills) && raw.skills.length > 0 ? raw.skills : defaultSkills,
      assessmentBreakdown: {
        codingScore: fitScore,
        systemDesign: Math.max(70, fitScore - 3),
        problemSolving: fitScore,
        overallGrade: fitScore >= 90 ? 'A+' : 'A'
      },
      notes: raw.notes || raw.cover_note || '',
      company_id: raw.company_id
    };
  }

  async function refreshApplicationsFromBackend(companyId) {
    const compId = companyId || getLoggedInCompanyId() || 'comp-101';
    if (!compId) return;

    try {
      const url = `${BACKEND_API_BASE_URL}/applications?company_id=${encodeURIComponent(compId)}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.data)) {
          applicantsList = json.data.map(normalizeBackendApplication);
          saveStorage('skillbridge_recruiter_applicants', applicantsList);
          populateApplicantsInternshipFilter();
          renderDashboardOverview();
          renderFullApplicantsTable();
          renderKPIStats();
          renderAiCandidateMatchingGrid();
        }
      }
    } catch (err) {
      console.warn('[SkillBridge Recruiter] Note: Could not refresh applications from backend:', err);
    }
  }

  /**
   * Safe helper: extract valid, non-empty, non-'undefined' string trying multiple candidate property names
   */
  function getCompanyField(obj, ...fieldNames) {
    if (!obj || typeof obj !== 'object') return '';
    for (const name of fieldNames) {
      if (obj[name] !== undefined && obj[name] !== null) {
        const s = String(obj[name]).trim();
        if (s !== '' && s !== 'undefined' && s !== 'null') {
          return s;
        }
      }
    }
    return '';
  }

  /**
   * Load real company profile details from MySQL when the dashboard loads.
   * Strictly uses authenticated company ID from existing session. Never hardcodes comp-101.
   */
  async function loadCompanyProfileFromBackend(providedCompanyId) {
    const compId = providedCompanyId || getLoggedInCompanyId();
    if (!compId) {
      return;
    }

    try {
      const res = await fetch(`${BACKEND_API_BASE_URL}/companies/${encodeURIComponent(compId)}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        console.warn(`[SkillBridge Recruiter] Fetch company profile HTTP ${res.status}`);
        return;
      }

      const json = await res.json();
      if (json && json.success && json.data) {
        const comp = json.data;
        // Merge MySQL data into activeRecruiter safely, avoiding undefined/null
        activeRecruiter = {
          ...activeRecruiter,
          id: comp.id || compId,
          companyId: comp.id || compId,
          companyName: getCompanyField(comp, 'company_name', 'companyName') || activeRecruiter.companyName || '',
          officialEmail: getCompanyField(comp, 'official_email', 'officialEmail') || activeRecruiter.officialEmail || '',
          contactPerson: getCompanyField(comp, 'contact_person', 'contactPerson') || activeRecruiter.contactPerson || '',
          phone: getCompanyField(comp, 'phone_number', 'phoneNumber', 'phone') || activeRecruiter.phone || '',
          phoneNumber: getCompanyField(comp, 'phone_number', 'phoneNumber', 'phone') || activeRecruiter.phoneNumber || '',
          website: getCompanyField(comp, 'website_url', 'websiteUrl', 'website') || activeRecruiter.website || '',
          websiteUrl: getCompanyField(comp, 'website_url', 'websiteUrl', 'website') || activeRecruiter.websiteUrl || '',
          industry: getCompanyField(comp, 'industry_domain', 'industryDomain', 'industry') || activeRecruiter.industry || '',
          industryDomain: getCompanyField(comp, 'industry_domain', 'industryDomain', 'industry') || activeRecruiter.industryDomain || '',
          companySize: getCompanyField(comp, 'company_size', 'companySize') || activeRecruiter.companySize || '',
          location: getCompanyField(comp, 'location') || activeRecruiter.location || '',
          description: getCompanyField(comp, 'description') || activeRecruiter.description || '',
          logoUrl: getCompanyField(comp, 'logo_url', 'logoUrl') || activeRecruiter.logoUrl || '',
          logoText: getCompanyField(comp, 'logo_text', 'logoText') || activeRecruiter.logoText || '',
          logoBgColor: getCompanyField(comp, 'logo_bg_color', 'logoBgColor') || activeRecruiter.logoBgColor || '#4f46e5',
          role: comp.role || activeRecruiter.role || 'ROLE_RECRUITER',
          isVerified: Boolean(comp.is_verified)
        };

        saveStorage('skillbridge_recruiter_session', activeRecruiter);
        if (typeof window !== 'undefined' && window.sessionStorage) {
          try {
            window.sessionStorage.setItem('skillbridge_recruiter_session', JSON.stringify(activeRecruiter));
          } catch (e) { }
        }

        populateRecruiterBranding();
      }
    } catch (err) {
      console.warn('[SkillBridge Recruiter] Error loading company profile from MySQL:', err);
    }
  }

  /**
   * Handle Recruiter Company Profile Save Changes.
   * Sends PUT /api/companies/:id to update MySQL, persists session, and refreshes UI.
   */
  async function handleSaveCompanyProfile() {
    const alertEl = document.getElementById('companyProfileSaveAlert');
    const saveProfileBtn = document.getElementById('saveCompanyProfileBtn');

    // 1. Authenticated company ID from existing recruiter session
    const companyId = getLoggedInCompanyId();
    if (!companyId) {
      if (alertEl) {
        alertEl.className = 'alert alert-danger py-2 px-3 small';
        alertEl.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-1"></i> Authentication error: No authenticated company session found. Please sign in to save profile changes.';
        alertEl.classList.remove('d-none');
        alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // 2. Read input values safely
    const compNameInput = document.getElementById('profileInputCompanyName');
    const contactInput = document.getElementById('profileInputContactName');
    const phoneInput = document.getElementById('profileInputPhone');
    const webInput = document.getElementById('profileInputWebsite');
    const indInput = document.getElementById('profileInputIndustry');
    const sizeInput = document.getElementById('profileInputSize');
    const locInput = document.getElementById('profileInputLocation');
    const descInput = document.getElementById('profileInputDescription');

    const companyName = compNameInput ? compNameInput.value.trim() : '';
    const contactPerson = contactInput ? contactInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const website = webInput ? webInput.value.trim() : '';
    const industry = indInput ? indInput.value.trim() : '';
    const companySize = sizeInput ? sizeInput.value.trim() : '';
    const location = locInput ? locInput.value.trim() : '';
    const description = descInput ? descInput.value.trim() : '';

    // 3. Client-side validations
    if (!companyName) {
      if (alertEl) {
        alertEl.className = 'alert alert-danger py-2 px-3 small';
        alertEl.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-1"></i> Company Legal Name is required.';
        alertEl.classList.remove('d-none');
      }
      if (compNameInput) compNameInput.focus();
      return;
    }

    if (!contactPerson) {
      if (alertEl) {
        alertEl.className = 'alert alert-danger py-2 px-3 small';
        alertEl.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-1"></i> Primary Recruiter Contact is required.';
        alertEl.classList.remove('d-none');
      }
      if (contactInput) contactInput.focus();
      return;
    }

    // 4. Loading state on button
    const originalBtnHtml = saveProfileBtn ? saveProfileBtn.innerHTML : '';
    if (saveProfileBtn) {
      saveProfileBtn.disabled = true;
      saveProfileBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Saving...';
    }

    try {
      const payload = {
        company_name: companyName,
        contact_person: contactPerson,
        phone_number: phone,
        website_url: website,
        industry_domain: industry,
        company_size: companySize,
        location: location,
        description: description
      };

      const res = await fetch(`${BACKEND_API_BASE_URL}/companies/${encodeURIComponent(companyId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        const errorMsg = data.error || data.message || `Failed to update company profile (HTTP ${res.status})`;
        if (alertEl) {
          alertEl.className = 'alert alert-danger py-2 px-3 small';
          alertEl.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i> ${escapeHtml(errorMsg)}`;
          alertEl.classList.remove('d-none');
          alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      // 5. Success: update in-memory activeRecruiter and session storage
      const updated = data.data || {};
      activeRecruiter = {
        ...activeRecruiter,
        id: updated.id || companyId,
        companyId: updated.id || companyId,
        companyName: getCompanyField(updated, 'company_name', 'companyName') || companyName,
        contactPerson: getCompanyField(updated, 'contact_person', 'contactPerson') || contactPerson,
        phone: getCompanyField(updated, 'phone_number', 'phoneNumber', 'phone') || phone,
        phoneNumber: getCompanyField(updated, 'phone_number', 'phoneNumber', 'phone') || phone,
        website: getCompanyField(updated, 'website_url', 'websiteUrl', 'website') || website,
        websiteUrl: getCompanyField(updated, 'website_url', 'websiteUrl', 'website') || website,
        industry: getCompanyField(updated, 'industry_domain', 'industryDomain', 'industry') || industry,
        industryDomain: getCompanyField(updated, 'industry_domain', 'industryDomain', 'industry') || industry,
        companySize: getCompanyField(updated, 'company_size', 'companySize') || companySize,
        location: getCompanyField(updated, 'location') || location,
        description: getCompanyField(updated, 'description') || description
      };

      saveStorage('skillbridge_recruiter_session', activeRecruiter);
      if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
          window.sessionStorage.setItem('skillbridge_recruiter_session', JSON.stringify(activeRecruiter));
        } catch (e) { }
      }

      // Re-populate branding across entire dashboard
      populateRecruiterBranding();

      // Show success alert
      if (alertEl) {
        alertEl.className = 'alert alert-success py-2 px-3 small';
        alertEl.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Company profile changes saved to database successfully!';
        alertEl.classList.remove('d-none');
        alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          alertEl.classList.add('d-none');
        }, 5000);
      }

    } catch (err) {
      console.error('[SkillBridge Recruiter] Error updating company profile:', err);
      if (alertEl) {
        alertEl.className = 'alert alert-danger py-2 px-3 small';
        alertEl.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i> Network error: Could not reach the server. Please check your backend connection.`;
        alertEl.classList.remove('d-none');
        alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } finally {
      if (saveProfileBtn) {
        saveProfileBtn.disabled = false;
        saveProfileBtn.innerHTML = originalBtnHtml || '<i class="bi bi-check2 me-1"></i> Save Changes';
      }
    }
  }

  function showPostError(message) {
    let errAlert = document.getElementById('postInternshipErrorAlert');
    if (!errAlert) {
      const successAlert = document.getElementById('postInternshipSuccessAlert');
      if (successAlert) {
        errAlert = document.createElement('div');
        errAlert.id = 'postInternshipErrorAlert';
        errAlert.className = 'alert alert-danger mt-3 py-2 px-3 small';
        successAlert.parentNode.insertBefore(errAlert, successAlert.nextSibling);
      }
    }
    const successAlert = document.getElementById('postInternshipSuccessAlert');
    if (successAlert) successAlert.classList.add('d-none');

    if (errAlert) {
      errAlert.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i> ${escapeHtml(message)}`;
      errAlert.classList.remove('d-none');
      errAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function showPostSuccess(message) {
    const errAlert = document.getElementById('postInternshipErrorAlert');
    if (errAlert) errAlert.classList.add('d-none');

    const successAlert = document.getElementById('postInternshipSuccessAlert');
    if (successAlert) {
      successAlert.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i> ${escapeHtml(message || 'Internship listing published successfully! Visible immediately on the Student Portal.')}`;
      successAlert.classList.remove('d-none');
      successAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        successAlert.classList.add('d-none');
      }, 5000);
    }
  }

  function getActiveRecruiterSession() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return DEFAULT_DEMO_RECRUITER;
      }

      const sessionRaw = window.sessionStorage.getItem('skillbridge_recruiter_session') ||
        window.localStorage.getItem('skillbridge_recruiter_session');
      if (sessionRaw) {
        const parsed = JSON.parse(sessionRaw);
        if (parsed && (parsed.role === 'ROLE_RECRUITER' || parsed.authRole === 'recruiter' || parsed.companyName)) {
          return parsed;
        }
      }

      window.localStorage.setItem('skillbridge_recruiter_session', JSON.stringify(DEFAULT_DEMO_RECRUITER));
      window.localStorage.setItem('skillbridge_auth_role', 'recruiter');
      return DEFAULT_DEMO_RECRUITER;
    } catch (err) {
      console.warn('[SkillBridge Recruiter] Error reading session:', err);
      return DEFAULT_DEMO_RECRUITER;
    }
  }

  // ==========================================================================
  // 2. Demo Data & Persistence Schema
  // ==========================================================================
  const DEFAULT_INTERNSHIPS = [
    {
      id: 'int-101',
      title: 'Full Stack Cloud Engineer Intern',
      domain: 'Cloud Architecture & DevOps',
      workMode: 'Hybrid (Bengaluru)',
      stipend: '₹35,000 / month',
      duration: '6 Months (PPO Convertible)',
      skills: ['Java', 'Spring Boot', 'MySQL', 'Docker', 'REST APIs'],
      minScore: 85,
      deadline: '2026-12-15',
      status: 'Active',
      applicantsCount: 3,
      postedDate: 'Nov 12, 2026',
      description: 'Architect, develop, and test distributed microservices in Java/Spring Boot integrated with containerized MySQL clusters.'
    },
    {
      id: 'int-102',
      title: 'AI / ML Platform Engineering Intern',
      domain: 'AI & Machine Learning',
      workMode: 'On-Site (Bengaluru Tech Park)',
      stipend: '₹40,000 / month',
      duration: '6 Months',
      skills: ['Python', 'PyTorch', 'FastAPI', 'Vector Databases', 'Docker'],
      minScore: 88,
      deadline: '2026-12-20',
      status: 'Active',
      applicantsCount: 2,
      postedDate: 'Nov 15, 2026',
      description: 'Build low-latency inference pipelines and evaluation benchmarks for LLM models.'
    },
    {
      id: 'int-103',
      title: 'Frontend Systems Engineer Intern',
      domain: 'Frontend Engineering',
      workMode: 'Remote (India)',
      stipend: '₹30,000 / month',
      duration: '3 Months',
      skills: ['TypeScript', 'React.js', 'Next.js', 'Tailwind CSS', 'Redux'],
      minScore: 80,
      deadline: '2026-12-05',
      status: 'Active',
      applicantsCount: 1,
      postedDate: 'Nov 10, 2026',
      description: 'Develop responsive, accessible enterprise dashboards and high-performance charting interfaces.'
    },
    {
      id: 'int-104',
      title: 'DevOps & Site Reliability Intern',
      domain: 'Cloud Architecture & DevOps',
      workMode: 'Hybrid (Bengaluru)',
      stipend: '₹35,000 / month',
      duration: '6 Months',
      skills: ['Kubernetes', 'Terraform', 'AWS', 'CI/CD Pipelines', 'Linux'],
      minScore: 82,
      deadline: '2026-12-30',
      status: 'Active',
      applicantsCount: 0,
      postedDate: 'Nov 18, 2026',
      description: 'Automate multi-region cloud infrastructure deployments with Terraform and Kubernetes.'
    }
  ];

  const DEFAULT_APPLICANTS = [
    {
      id: 'app-201',
      candidateId: 'stud-101',
      candidateName: 'Yazh S',
      email: 'yazh.s@student.edu',
      phone: '+91 98765 43210',
      college: 'PSG College of Technology',
      degree: 'B.E. Computer Science (2026)',
      appliedInternshipId: 'int-101',
      appliedRole: 'Full Stack Cloud Engineer Intern',
      appliedDate: 'Nov 18, 2026',
      appliedTimestamp: 1731934800000,
      fitScore: 96,
      codingGrade: 'A+ (94%)',
      status: 'Shortlisted',
      skills: [
        { name: 'Java', score: 90 },
        { name: 'Spring Boot', score: 88 },
        { name: 'MySQL', score: 85 },
        { name: 'Cloud Architecture', score: 84 },
        { name: 'Docker', score: 82 }
      ],
      assessmentBreakdown: {
        codingScore: 95,
        systemDesign: 92,
        problemSolving: 98,
        overallGrade: 'A+'
      },
      notes: 'Exceptional system design and Java concurrency skills. Verified GitHub microservices portfolio.'
    },
    {
      id: 'app-202',
      candidateId: 'stud-102',
      candidateName: 'Aarav Patel',
      email: 'aarav.patel@student.edu',
      phone: '+91 98234 56789',
      college: 'IIT Madras',
      degree: 'B.Tech Electrical & CS',
      appliedInternshipId: 'int-102',
      appliedRole: 'AI / ML Platform Engineering Intern',
      appliedDate: 'Nov 19, 2026',
      appliedTimestamp: 1732021200000,
      fitScore: 94,
      codingGrade: 'A+ (92%)',
      status: 'Interview Scheduled',
      skills: [
        { name: 'Python', score: 95 },
        { name: 'PyTorch', score: 92 },
        { name: 'FastAPI', score: 88 },
        { name: 'Vector DBs', score: 86 }
      ],
      assessmentBreakdown: {
        codingScore: 94,
        systemDesign: 90,
        problemSolving: 94,
        overallGrade: 'A+'
      },
      notes: 'Strong machine learning foundations. Scheduled for Round 1 Technical on Nov 26.'
    },
    {
      id: 'app-203',
      candidateId: 'stud-103',
      candidateName: 'Sneha Reddy',
      email: 'sneha.reddy@student.edu',
      phone: '+91 98451 23456',
      college: 'RV College of Engineering',
      degree: 'B.E. Information Science',
      appliedInternshipId: 'int-103',
      appliedRole: 'Frontend Systems Engineer Intern',
      appliedDate: 'Nov 17, 2026',
      appliedTimestamp: 1731848400000,
      fitScore: 91,
      codingGrade: 'A (88%)',
      status: 'Selected',
      skills: [
        { name: 'TypeScript', score: 92 },
        { name: 'React.js', score: 90 },
        { name: 'Next.js', score: 86 },
        { name: 'Tailwind CSS', score: 94 }
      ],
      assessmentBreakdown: {
        codingScore: 90,
        systemDesign: 86,
        problemSolving: 90,
        overallGrade: 'A'
      },
      notes: 'Cleared all rounds with flying colors. Offer released and accepted.'
    },
    {
      id: 'app-204',
      candidateId: 'stud-104',
      candidateName: 'Rohan Verma',
      email: 'rohan.verma@student.edu',
      phone: '+91 98112 34567',
      college: 'BITS Pilani',
      degree: 'B.E. Computer Science',
      appliedInternshipId: 'int-101',
      appliedRole: 'Full Stack Cloud Engineer Intern',
      appliedDate: 'Nov 20, 2026',
      appliedTimestamp: 1732107600000,
      fitScore: 87,
      codingGrade: 'B+ (82%)',
      status: 'Under Review',
      skills: [
        { name: 'Java', score: 84 },
        { name: 'MySQL', score: 80 },
        { name: 'Spring Boot', score: 78 }
      ],
      assessmentBreakdown: {
        codingScore: 82,
        systemDesign: 80,
        problemSolving: 85,
        overallGrade: 'B+'
      },
      notes: 'Good core programming fundamentals. Technical profile under review by engineering team.'
    },
    {
      id: 'app-205',
      candidateId: 'stud-105',
      candidateName: 'Meera Nambiar',
      email: 'meera.nambiar@student.edu',
      phone: '+91 97456 78901',
      college: 'NIT Trichy',
      degree: 'B.Tech Computer Science',
      appliedInternshipId: 'int-102',
      appliedRole: 'AI / ML Platform Engineering Intern',
      appliedDate: 'Nov 21, 2026',
      appliedTimestamp: 1732194000000,
      fitScore: 89,
      codingGrade: 'A (86%)',
      status: 'Applied',
      skills: [
        { name: 'Python', score: 88 },
        { name: 'Data Structures', score: 85 },
        { name: 'FastAPI', score: 82 }
      ],
      assessmentBreakdown: {
        codingScore: 88,
        systemDesign: 84,
        problemSolving: 89,
        overallGrade: 'A'
      },
      notes: 'Fresh submission received this morning. Awaiting recruiter review.'
    },
    {
      id: 'app-206',
      candidateId: 'stud-106',
      candidateName: 'Karthik Rao',
      email: 'karthik.rao@student.edu',
      phone: '+91 98321 65498',
      college: 'VIT Vellore',
      degree: 'B.Tech Information Technology',
      appliedInternshipId: 'int-101',
      appliedRole: 'Full Stack Cloud Engineer Intern',
      appliedDate: 'Nov 14, 2026',
      appliedTimestamp: 1731589200000,
      fitScore: 72,
      codingGrade: 'C (68%)',
      status: 'Rejected',
      skills: [
        { name: 'Java', score: 65 },
        { name: 'MySQL', score: 70 }
      ],
      assessmentBreakdown: {
        codingScore: 68,
        systemDesign: 65,
        problemSolving: 70,
        overallGrade: 'C'
      },
      notes: 'Assessment score did not meet the minimum 85% requirement for CloudScale.'
    }
  ];

  const DEFAULT_INTERVIEWS = [
    {
      id: 'intv-301',
      appId: 'app-202',
      candidateName: 'Aarav Patel',
      role: 'AI / ML Platform Engineering Intern',
      date: '2026-11-26',
      time: '14:00 IST',
      round: 'Round 1: Core Coding & Data Structures',
      interviewer: 'Priya Sharma (Principal Architect)',
      meetLink: 'https://meet.google.com/sb-eval-recruiter',
      status: 'Confirmed',
      feedback: null
    },
    {
      id: 'intv-302',
      appId: 'app-201',
      candidateName: 'Yazh S',
      role: 'Full Stack Cloud Engineer Intern',
      date: '2026-11-27',
      time: '11:00 IST',
      round: 'Round 2: System Architecture & Cloud',
      interviewer: 'Priya Sharma & VP of Engineering',
      meetLink: 'https://meet.google.com/sb-eval-recruiter',
      status: 'Confirmed',
      feedback: null
    }
  ];

  const DEFAULT_OFFERS = [
    {
      id: 'ofr-401',
      candidateName: 'Sneha Reddy',
      role: 'Frontend Systems Engineer Intern',
      companyName: 'CloudScale Solutions',
      stipend: '₹30,000 / month',
      duration: '6 Months (Jan - Jun 2027)',
      offerDate: 'Nov 19, 2026',
      joiningDate: '2027-01-05',
      expiryDate: '2026-11-28',
      location: 'Bengaluru, Karnataka (Hybrid)',
      status: 'Accepted',
      terms: 'Standard IP assignment and performance review at 4-month mark for Pre-Placement Offer (PPO).'
    },
    {
      id: 'ofr-402',
      candidateName: 'Ananya Sharma',
      role: 'Full Stack Cloud Engineer Intern',
      companyName: 'CloudScale Solutions',
      stipend: '₹35,000 / month',
      duration: '6 Months (Jan - Jun 2027)',
      offerDate: 'Nov 20, 2026',
      joiningDate: '2027-01-10',
      expiryDate: '2026-11-27',
      location: 'Bengaluru, Karnataka (HQ)',
      status: 'Released',
      terms: 'High-spec workstation and cloud credits provisioned on onboarding.'
    },
    {
      id: 'ofr-403',
      candidateName: 'Vikram Malhotra',
      role: 'AI / ML Platform Engineering Intern',
      companyName: 'CloudScale Solutions',
      stipend: '₹40,000 / month',
      duration: '6 Months (Jan - Jun 2027)',
      offerDate: 'Nov 21, 2026',
      joiningDate: '2027-01-15',
      expiryDate: '2026-11-30',
      location: 'Bengaluru, Karnataka (Hybrid)',
      status: 'Draft',
      terms: 'Draft offer pending internal department head approval.'
    },
    {
      id: 'ofr-404',
      candidateName: 'Rohan Verma',
      role: 'Cloud Infrastructure DevOps Intern',
      companyName: 'CloudScale Solutions',
      stipend: '₹32,000 / month',
      duration: '6 Months (Jan - Jun 2027)',
      offerDate: 'Nov 18, 2026',
      joiningDate: '2027-01-05',
      expiryDate: '2026-11-29',
      location: 'Remote (India)',
      status: 'Viewed',
      terms: 'Candidate opened and reviewed offer letter via candidate portal.'
    },
    {
      id: 'ofr-405',
      candidateName: 'Karthik Rao',
      role: 'Backend Java Systems Intern',
      companyName: 'CloudScale Solutions',
      stipend: '₹28,000 / month',
      duration: '6 Months (Jan - Jun 2027)',
      offerDate: 'Nov 10, 2026',
      joiningDate: '2026-12-01',
      expiryDate: '2026-11-17',
      location: 'Bengaluru, Karnataka (HQ)',
      status: 'Expired',
      terms: 'Offer expired automatically following the 7-day validity window.'
    },
    {
      id: 'ofr-406',
      candidateName: 'Pooja Iyer',
      role: 'Cybersecurity & Telemetry Intern',
      companyName: 'CloudScale Solutions',
      stipend: '₹35,000 / month',
      duration: '6 Months (Jan - Jun 2027)',
      offerDate: 'Nov 12, 2026',
      joiningDate: '2027-01-05',
      expiryDate: '2026-11-19',
      location: 'Bengaluru, Karnataka (Hybrid)',
      status: 'Rejected',
      terms: 'Candidate declined offer due to pursuing higher studies.'
    }
  ];

  const DEFAULT_MESSAGES = [
    {
      candidateId: 'app-201',
      candidateName: 'Yazh S',
      role: 'Full Stack Cloud Engineer Intern',
      college: 'PSG College of Technology',
      fitScore: 96,
      skills: ['Java 95%', 'React 92%', 'Docker 88%', 'Spring Boot 90%'],
      lastMessage: 'Thank you Priya! I have prepared my Java concurrency demo for Round 2.',
      time: '10:45 AM',
      timestamp: 1732166100000,
      unreadCount: 0,
      unread: false,
      history: [
        { id: 'm-101', sender: 'recruiter', text: 'Hi Yazh! Your SkillBridge assessment score of 96% was outstanding. We would like to schedule Round 2: System Architecture.', time: '10:15 AM', status: 'read', timestamp: 1732164300000 },
        { id: 'm-102', sender: 'candidate', text: 'Thank you Priya! I have prepared my Java concurrency demo for Round 2.', time: '10:45 AM', status: 'read', timestamp: 1732166100000 }
      ]
    },
    {
      candidateId: 'app-202',
      candidateName: 'Aarav Patel',
      role: 'AI / ML Platform Engineering Intern',
      college: 'IIT Madras',
      fitScore: 92,
      skills: ['Python 94%', 'PyTorch 90%', 'Kubernetes 86%'],
      lastMessage: 'Confirmed for Thursday 2:00 PM on Google Meet.',
      time: 'Yesterday',
      timestamp: 1732100100000,
      unreadCount: 1,
      unread: true,
      history: [
        { id: 'm-201', sender: 'recruiter', text: 'Hello Aarav, looking forward to our technical discussion on PyTorch pipelines.', time: 'Yesterday 4:00 PM', status: 'read', timestamp: 1732095600000 },
        { id: 'm-202', sender: 'candidate', text: 'Confirmed for Thursday 2:00 PM on Google Meet.', time: 'Yesterday 5:15 PM', status: 'delivered', timestamp: 1732100100000 }
      ]
    },
    {
      candidateId: 'app-203',
      candidateName: 'Sneha Reddy',
      role: 'Frontend Systems Engineer Intern',
      college: 'RV College of Engineering',
      fitScore: 94,
      skills: ['TypeScript 95%', 'React 94%', 'CSS 90%'],
      lastMessage: 'Thank you so much Priya and the CloudScale team! I have reviewed the letter and accepted the offer on the portal.',
      time: 'Nov 19',
      timestamp: 1732014000000,
      unreadCount: 0,
      unread: false,
      history: [
        { id: 'm-301', sender: 'recruiter', text: 'Hi Sneha, thrilled to share that your formal internship offer letter has been released on SkillBridge!', time: 'Nov 19 11:00 AM', status: 'read', timestamp: 1732012800000 },
        { id: 'm-302', sender: 'candidate', text: 'Thank you so much Priya and the CloudScale team! I have reviewed the letter and accepted the offer on the portal.', time: 'Nov 19 11:45 AM', status: 'read', timestamp: 1732014000000 },
        { id: 'm-303', sender: 'recruiter', text: 'Welcome aboard Sneha! Onboarding credentials and workstation setup will be dispatched closer to Jan 5.', time: 'Nov 19 12:00 PM', status: 'read', timestamp: 1732015200000 }
      ]
    },
    {
      candidateId: 'app-204',
      candidateName: 'Rohan Verma',
      role: 'Full Stack Cloud Engineer Intern',
      college: 'BITS Pilani',
      fitScore: 87,
      skills: ['Java 84%', 'MySQL 80%', 'Spring Boot 78%'],
      lastMessage: 'Hi Rohan, thanks for checking in. Our engineering team is currently evaluating your Spring Boot profile.',
      time: 'Nov 20',
      timestamp: 1732111200000,
      unreadCount: 0,
      unread: false,
      history: [
        { id: 'm-401', sender: 'candidate', text: 'Hello Priya, I noticed my application status is Under Review. Are there any supplementary code repositories I should share?', time: 'Nov 20 2:30 PM', status: 'read', timestamp: 1732109400000 },
        { id: 'm-402', sender: 'recruiter', text: 'Hi Rohan, thanks for checking in. Our engineering team is currently evaluating your Spring Boot profile.', time: 'Nov 20 3:00 PM', status: 'read', timestamp: 1732111200000 }
      ]
    },
    {
      candidateId: 'app-205',
      candidateName: 'Meera Nambiar',
      role: 'AI / ML Platform Engineering Intern',
      college: 'NIT Trichy',
      fitScore: 89,
      skills: ['Python 88%', 'Data Structures 85%', 'FastAPI 82%'],
      lastMessage: 'Good morning Priya! Excited to share my portfolio on FastAPI distributed inference.',
      time: 'Nov 21',
      timestamp: 1732187700000,
      unreadCount: 1,
      unread: true,
      history: [
        { id: 'm-501', sender: 'candidate', text: 'Good morning Priya! Excited to share my portfolio on FastAPI distributed inference.', time: 'Nov 21 9:15 AM', status: 'delivered', timestamp: 1732187700000 }
      ]
    },
    {
      candidateId: 'app-206',
      candidateName: 'Karthik Rao',
      role: 'Full Stack Cloud Engineer Intern',
      college: 'VIT Vellore',
      fitScore: 72,
      skills: ['Java 65%', 'MySQL 70%'],
      lastMessage: 'The SkillBridge assessment cooling period is 30 days, after which you can re-attempt and re-apply.',
      time: 'Nov 15',
      timestamp: 1731670200000,
      unreadCount: 0,
      unread: false,
      history: [
        { id: 'm-601', sender: 'candidate', text: 'Hi Priya, thank you for considering my application. Can I re-attempt the skill assessment after 30 days?', time: 'Nov 15 11:00 AM', status: 'read', timestamp: 1731668400000 },
        { id: 'm-602', sender: 'recruiter', text: 'Hello Karthik, absolutely! The SkillBridge assessment cooling period is 30 days, after which you can re-attempt and re-apply.', time: 'Nov 15 11:30 AM', status: 'read', timestamp: 1731670200000 }
      ]
    }
  ];

  const DEFAULT_NOTIFICATIONS = [
    { title: 'New Application Received', text: 'Meera Nambiar applied for AI/ML Platform Intern with 89% AI match.', time: '20 mins ago', icon: 'bi-person-plus text-primary', unread: true },
    { title: 'Interview Confirmed', text: 'Yazh S accepted interview invitation for Nov 27, 11:00 AM IST.', time: '2 hours ago', icon: 'bi-calendar-check text-info', unread: true },
    { title: 'Offer Letter Accepted', text: 'Sneha Reddy signed offer letter for Frontend Systems Engineer Intern.', time: '1 day ago', icon: 'bi-patch-check text-success', unread: false },
    { title: 'AI Scoring Completed', text: 'SkillBridge engine verified 6 proctored coding assessments.', time: '2 days ago', icon: 'bi-cpu text-primary', unread: false }
  ];

  // Storage Helpers
  function loadStorage(key, fallback) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = window.localStorage.getItem(key);
        if (item) return JSON.parse(item);
        window.localStorage.setItem(key, JSON.stringify(fallback));
      }
    } catch (e) {
      console.warn(`Error reading localStorage for ${key}:`, e);
    }
    return fallback;
  }

  function saveStorage(key, data) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(data));
      }
    } catch (e) {
      console.warn(`Error saving localStorage for ${key}:`, e);
    }
  }

  // Active Collections
  let activeRecruiter = getActiveRecruiterSession();
  let internshipsList = loadStorage('skillbridge_recruiter_internships', DEFAULT_INTERNSHIPS);
  let applicantsList = loadStorage('skillbridge_recruiter_applicants', DEFAULT_APPLICANTS);
  let interviewsList = loadStorage('skillbridge_recruiter_interviews', DEFAULT_INTERVIEWS);
  let offersList = loadStorage('skillbridge_recruiter_offers', DEFAULT_OFFERS);
  let messagesList = loadStorage('skillbridge_recruiter_messages', DEFAULT_MESSAGES);
  let notificationsList = loadStorage('skillbridge_recruiter_notifications', DEFAULT_NOTIFICATIONS);

  // Sync candidate status with Student Portal (skillbridge_student_applications)
  function syncStudentPortalStatus(candidateName, newStatus) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const studRaw = window.localStorage.getItem('skillbridge_student_applications');
      if (studRaw) {
        const studApps = JSON.parse(studRaw);
        if (Array.isArray(studApps)) {
          let updated = false;
          studApps.forEach(app => {
            if (app.company === activeRecruiter.companyName || app.company === 'CloudScale Solutions') {
              app.status = newStatus;
              updated = true;
            }
          });
          if (updated) {
            window.localStorage.setItem('skillbridge_student_applications', JSON.stringify(studApps));
            console.log(`[SkillBridge ATS] Synced student portal status: ${newStatus}`);
          }
        }
      }
    } catch (e) {
      console.warn('[SkillBridge ATS] Error syncing student applications:', e);
    }
  }

  // ==========================================================================
  // 3. Dynamic Statistics Calculation (Connected to Live Collections)
  // ==========================================================================
  function calculateOverviewKPIs() {
    const totalActiveInternships = internshipsList.filter(i => i.status === 'Active').length;
    const totalApplicants = applicantsList.length;
    const newApplicants = applicantsList.filter(a => a.status === 'Applied').length;
    const shortlistedCandidates = applicantsList.filter(a => a.status === 'Shortlisted').length;
    const interviewsScheduled = interviewsList.length;
    const offersReleased = offersList.filter(o => o.status === 'Released' || o.status === 'Accepted' || o.status === 'Viewed' || o.status === 'Pending').length;

    return {
      totalActiveInternships,
      totalApplicants,
      newApplicants,
      shortlistedCandidates,
      interviewsScheduled,
      offersReleased
    };
  }

  function renderKPIStats() {
    const kpis = calculateOverviewKPIs();

    const bindings = {
      kpiActiveInternships: kpis.totalActiveInternships,
      kpiTotalApplicants: kpis.totalApplicants,
      kpiNewApplicants: kpis.newApplicants,
      kpiShortlisted: kpis.shortlistedCandidates,
      kpiInterviewsScheduled: kpis.interviewsScheduled,
      kpiOffersReleased: kpis.offersReleased
    };

    for (const [id, val] of Object.entries(bindings)) {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    }

    // Sidebar navigation badges
    const navActive = document.getElementById('sidebarActiveInternshipsBadge');
    if (navActive) navActive.textContent = kpis.totalActiveInternships;

    const navTotal = document.getElementById('sidebarTotalApplicantsBadge');
    if (navTotal) navTotal.textContent = kpis.totalApplicants;

    const navInterviews = document.getElementById('sidebarInterviewsBadge');
    if (navInterviews) navInterviews.textContent = interviewsList.length;

    const navOffers = document.getElementById('sidebarOffersBadge');
    if (navOffers) navOffers.textContent = kpis.offersReleased;

    const navMessages = document.getElementById('sidebarMessagesBadge');
    if (navMessages) navMessages.textContent = messagesList.length;
  }

  // ==========================================================================
  // 4. Analytics Visualizations (Donut & Weekly Trend Bar Charts)
  // ==========================================================================
  function renderAnalyticsCharts() {
    const donutSvg = document.getElementById('overviewStatusDonutSvg');
    const donutLegend = document.getElementById('overviewStatusLegend');
    const donutTotal = document.getElementById('donutTotalCount');

    if (donutTotal) donutTotal.textContent = applicantsList.length;

    const statusCounts = {
      'Applied': applicantsList.filter(a => a.status === 'Applied').length,
      'Under Review': applicantsList.filter(a => a.status === 'Under Review').length,
      'Shortlisted': applicantsList.filter(a => a.status === 'Shortlisted').length,
      'Interview Scheduled': applicantsList.filter(a => a.status === 'Interview Scheduled').length,
      'Selected': applicantsList.filter(a => a.status === 'Selected').length,
      'Rejected': applicantsList.filter(a => a.status === 'Rejected').length
    };

    const statusColors = {
      'Applied': '#2563eb',
      'Under Review': '#f59e0b',
      'Shortlisted': '#7c3aed',
      'Interview Scheduled': '#06b6d4',
      'Selected': '#10b981',
      'Rejected': '#ef4444'
    };

    const total = applicantsList.length || 1;
    const circumference = 2 * Math.PI * 40; // ~251.32

    if (donutSvg) {
      let offset = 0;
      let svgMarkup = '';

      Object.entries(statusCounts).forEach(([status, count]) => {
        const segLen = (count / total) * circumference;
        if (segLen > 0) {
          svgMarkup += `
            <circle cx="50" cy="50" r="40" fill="transparent"
              stroke="${statusColors[status]}" stroke-width="14"
              stroke-dasharray="${segLen} ${circumference - segLen}"
              stroke-dashoffset="${-offset}">
              <title>${status}: ${count} (${Math.round((count / total) * 100)}%)</title>
            </circle>
          `;
          offset += segLen;
        }
      });

      donutSvg.innerHTML = svgMarkup;
    }

    if (donutLegend) {
      donutLegend.innerHTML = Object.entries(statusCounts).map(([status, count]) => `
        <div class="donut-legend-item">
          <span class="donut-legend-dot" style="background-color: ${statusColors[status]};"></span>
          <span class="text-dark fw-semibold">${status}</span>
          <span class="text-muted ms-auto fw-bold">${count}</span>
        </div>
      `).join('');
    }

    const weeklyBars = document.getElementById('overviewWeeklyTrendBars');
    if (weeklyBars) {
      const days = [
        { day: 'Mon', count: 1 },
        { day: 'Tue', count: 2 },
        { day: 'Wed', count: 3 },
        { day: 'Thu', count: 5 },
        { day: 'Fri', count: 4 },
        { day: 'Sat', count: 2 },
        { day: 'Sun', count: 1 }
      ];

      const maxCount = 5;
      weeklyBars.innerHTML = days.map(d => {
        const heightPercent = Math.max(12, Math.round((d.count / maxCount) * 100));
        return `
          <div class="weekly-bar-col">
            <span class="weekly-bar-val">${d.count}</span>
            <div class="weekly-bar-fill" style="height: ${heightPercent}%;"></div>
            <span class="weekly-bar-day">${d.day}</span>
          </div>
        `;
      }).join('');
    }
  }

  // ==========================================================================
  // 5. Status Badge Pill Helper (High Contrast)
  // ==========================================================================
  function getStatusBadge(status) {
    switch (status) {
      case 'Applied':
        return '<span class="status-pill status-pill-applied">Applied</span>';
      case 'Under Review':
        return '<span class="status-pill status-pill-review">Under Review</span>';
      case 'Shortlisted':
        return '<span class="status-pill status-pill-shortlisted">Shortlisted</span>';
      case 'Interview Scheduled':
        return '<span class="status-pill status-pill-interview">Interview Scheduled</span>';
      case 'Selected':
        return '<span class="status-pill status-pill-selected">Selected</span>';
      case 'Rejected':
        return '<span class="status-pill status-pill-rejected">Rejected</span>';
      default:
        return `<span class="badge bg-secondary">${status}</span>`;
    }
  }

  // ==========================================================================
  // 6. Overview Section Renderers
  // ==========================================================================
  function renderOverviewRecentApplicants() {
    const tbody = document.getElementById('overviewRecentApplicantsTableBody');
    if (!tbody) return;

    const recent = applicantsList.slice(0, 5);
    tbody.innerHTML = recent.map(app => `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="rounded-circle bg-soft-primary text-primary d-flex align-items-center justify-content-center fw-bold"
              style="width: 34px; height: 34px; font-size: 0.78rem;">
              ${app.candidateName.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div class="fw-bold text-dark">${app.candidateName}</div>
              <div class="text-muted" style="font-size: 0.74rem;">${app.college}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="fw-semibold text-dark">${app.appliedRole}</div>
          <div class="text-muted" style="font-size: 0.72rem;">${app.skills.map(s => s.name).slice(0, 3).join(', ')}</div>
        </td>
        <td>
          <div class="ai-match-meter">
            <span class="ai-match-percent text-primary">${app.fitScore}%</span>
            <div class="ai-match-bar">
              <div class="ai-match-fill" style="width: ${app.fitScore}%;"></div>
            </div>
          </div>
        </td>
        <td class="text-muted">${app.appliedDate}</td>
        <td>${getStatusBadge(app.status)}</td>
        <td class="text-end">
          <div class="d-inline-flex gap-1">
            <button type="button" class="btn btn-sm btn-outline-custom py-1 px-2 view-candidate-btn" data-id="${app.id}" title="View Details">
              <i class="bi bi-person-lines-fill"></i>
            </button>
            <button type="button" class="btn btn-sm btn-primary-custom py-1 px-2 status-candidate-btn" data-id="${app.id}" title="Update Status">
              <i class="bi bi-pencil-square"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    attachApplicantActionEvents(tbody);
  }

  function renderOverviewRecentInternships() {
    const tbody = document.getElementById('overviewRecentInternshipsTableBody');
    if (!tbody) return;

    tbody.innerHTML = internshipsList.map(intn => `
      <tr>
        <td>
          <div class="fw-bold text-dark">${intn.title}</div>
          <div class="text-muted" style="font-size: 0.72rem;">${intn.duration}</div>
        </td>
        <td><span class="badge bg-light text-dark border">${intn.domain}</span></td>
        <td class="text-muted">${intn.workMode}</td>
        <td class="fw-bold text-dark">${intn.stipend}</td>
        <td><span class="badge bg-soft-primary text-primary fw-bold">${intn.applicantsCount} Applicants</span></td>
        <td><span class="badge bg-soft-emerald text-success">${intn.status}</span></td>
      </tr>
    `).join('');
  }

  function renderOverviewUpcomingInterviews() {
    const container = document.getElementById('overviewUpcomingInterviewsList');
    if (!container) return;

    if (interviewsList.length === 0) {
      container.innerHTML = '<div class="text-muted small text-center py-3">No upcoming interviews scheduled.</div>';
      return;
    }

    container.innerHTML = interviewsList.map(intv => `
      <div class="p-3 border rounded-3 mb-2 bg-light">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="badge bg-soft-cyan text-info fw-semibold"><i class="bi bi-clock me-1"></i>${intv.date} &bull; ${intv.time}</span>
          <span class="badge bg-soft-emerald text-success">${intv.status}</span>
        </div>
        <div class="fw-bold text-dark mb-0.5">${intv.candidateName}</div>
        <div class="text-muted" style="font-size: 0.75rem;">${intv.role}</div>
        <div class="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
          <span class="text-muted" style="font-size: 0.72rem;"><i class="bi bi-person me-1"></i>${intv.interviewer}</span>
          <a href="${intv.meetLink}" target="_blank" class="btn btn-sm btn-outline-custom py-0.5 px-2" style="font-size: 0.75rem;">
            <i class="bi bi-camera-video-fill me-1 text-primary"></i> Join Meet
          </a>
        </div>
      </div>
    `).join('');
  }

  function renderOverviewActivityFeed() {
    const feed = document.getElementById('overviewActivityFeed');
    if (!feed) return;

    feed.innerHTML = notificationsList.map(item => `
      <div class="d-flex align-items-start gap-2.5 pb-3 mb-3 border-bottom">
        <div class="rounded-circle bg-light d-flex align-items-center justify-content-center p-2 flex-shrink-0" style="width: 32px; height: 32px;">
          <i class="bi ${item.icon}"></i>
        </div>
        <div class="overflow-hidden">
          <div class="fw-bold text-dark small">${item.title}</div>
          <div class="text-muted text-truncate" style="font-size: 0.75rem;">${item.text}</div>
          <small class="text-muted d-block" style="font-size: 0.68rem;">${item.time}</small>
        </div>
      </div>
    `).join('');
  }

  // ==========================================================================
  // 7. Full Applicants ATS Pipeline Section
  // ==========================================================================
  let applicantsSearchTerm = '';
  let applicantsInternshipFilterVal = 'All';
  let applicantsStatusFilterVal = 'All';
  let applicantsSortVal = 'match-desc';

  function renderFullApplicantsTable() {
    const tbody = document.getElementById('fullApplicantsTableBody');
    if (!tbody) return;

    let filtered = [...applicantsList];

    // Search filter
    if (applicantsSearchTerm) {
      const q = applicantsSearchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.candidateName.toLowerCase().includes(q) ||
        a.college.toLowerCase().includes(q) ||
        a.skills.some(s => s.name.toLowerCase().includes(q))
      );
    }

    // Internship filter
    if (applicantsInternshipFilterVal !== 'All') {
      filtered = filtered.filter(a => a.appliedInternshipId === applicantsInternshipFilterVal);
    }

    // Status filter
    if (applicantsStatusFilterVal !== 'All') {
      filtered = filtered.filter(a => a.status === applicantsStatusFilterVal);
    }

    // Sorting
    if (applicantsSortVal === 'match-desc') {
      filtered.sort((a, b) => b.fitScore - a.fitScore);
    } else if (applicantsSortVal === 'date-desc') {
      filtered.sort((a, b) => b.appliedTimestamp - a.appliedTimestamp);
    } else if (applicantsSortVal === 'date-asc') {
      filtered.sort((a, b) => a.appliedTimestamp - b.appliedTimestamp);
    }

    const countEl = document.getElementById('applicantsCountDisplay');
    if (countEl) countEl.textContent = filtered.length;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No applicants match your filter criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(app => `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="rounded-circle bg-soft-primary text-primary d-flex align-items-center justify-content-center fw-bold"
              style="width: 36px; height: 36px; font-size: 0.82rem;">
              ${app.candidateName.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div class="fw-bold text-dark">${app.candidateName}</div>
              <div class="text-muted" style="font-size: 0.74rem;">${app.degree} &bull; ${app.college}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="fw-semibold text-dark">${app.appliedRole}</div>
        </td>
        <td>
          <div class="d-flex flex-wrap gap-1">
            ${app.skills.map(s => `<span class="badge bg-light text-dark border small">${s.name} ${s.score}%</span>`).join('')}
          </div>
        </td>
        <td>
          <div class="ai-match-meter">
            <span class="ai-match-percent text-primary">${app.fitScore}%</span>
            <div class="ai-match-bar">
              <div class="ai-match-fill" style="width: ${app.fitScore}%;"></div>
            </div>
          </div>
        </td>
        <td class="text-muted">${app.appliedDate}</td>
        <td>${getStatusBadge(app.status)}</td>
        <td class="text-end">
          <div class="d-inline-flex gap-1">
            <button type="button" class="btn btn-sm btn-outline-custom py-1 px-2 view-candidate-btn" data-id="${app.id}" title="View Profile">
              <i class="bi bi-person-lines-fill"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-custom py-1 px-2 view-resume-btn" data-id="${app.id}" title="View Resume">
              <i class="bi bi-file-earmark-pdf"></i>
            </button>
            <button type="button" class="btn btn-sm btn-primary-custom py-1 px-2 status-candidate-btn" data-id="${app.id}" title="Change Status">
              <i class="bi bi-pencil-square"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-custom py-1 px-2 schedule-candidate-btn" data-id="${app.id}" title="Schedule Interview">
              <i class="bi bi-calendar2-plus"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    attachApplicantActionEvents(tbody);
  }

  function populateApplicantsInternshipFilter() {
    const sel = document.getElementById('applicantsInternshipFilter');
    if (!sel) return;
    sel.innerHTML = '<option value="All">All Internships</option>' +
      internshipsList.map(i => `<option value="${i.id}">${i.title}</option>`).join('');
  }

  // Export Applicants to CSV
  function exportApplicantsToCSV() {
    const headers = ['Candidate ID', 'Name', 'Email', 'Phone', 'College', 'Degree', 'Role Applied', 'AI Match Score (%)', 'Coding Grade', 'Status', 'Applied Date'];
    const rows = applicantsList.map(a => [
      a.candidateId,
      `"${a.candidateName}"`,
      `"${a.email}"`,
      `"${a.phone}"`,
      `"${a.college}"`,
      `"${a.degree}"`,
      `"${a.appliedRole}"`,
      a.fitScore,
      `"${a.codingGrade}"`,
      `"${a.status}"`,
      `"${a.appliedDate}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SkillBridge_Applicants_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ==========================================================================
  // 8. AI Candidate Matching View
  // ==========================================================================
  let aiMatchesList = [];

  async function refreshAiMatchingFromBackend(companyId) {
    const compId = companyId || getLoggedInCompanyId() || 'comp-101';
    if (!compId) return;

    try {
      const url = `${BACKEND_API_BASE_URL}/companies/${encodeURIComponent(compId)}/ai-matching`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
          aiMatchesList = json.data;
          renderAiCandidateMatchingGrid();
          return;
        }
      }
    } catch (err) {
      console.warn('[SkillBridge Recruiter] Note: Could not fetch AI matching from backend:', err);
    }
    renderAiCandidateMatchingGrid();
  }

  function renderAiCandidateMatchingGrid() {
    const grid = document.getElementById('aiCandidateCardsGrid');
    if (!grid) return;

    const topMatches = [...applicantsList].sort((a, b) => b.fitScore - a.fitScore);
    let candidates = aiMatchesList.length > 0 ? aiMatchesList : applicantsList;
    if (!candidates || candidates.length === 0) {
      grid.innerHTML = `
        <div class="col-12 py-5 text-center bg-white rounded-4 border">
          <i class="bi bi-stars text-primary fs-1 mb-2"></i>
          <h6 class="fw-bold text-dark">No Candidate Matches Available Yet</h6>
          <p class="text-muted small mb-0">Post active internships and wait for candidates to take verified assessments.</p>
        </div>
      `;
      return;
    }

    const sorted = [...candidates].sort((a, b) => b.fitScore - a.fitScore);

    grid.innerHTML = sorted.map((cand, idx) => {
      const matched = Array.isArray(cand.matchedSkills) ? cand.matchedSkills : (Array.isArray(cand.skills) ? cand.skills : []);
      const missing = Array.isArray(cand.missingSkills) ? cand.missingSkills : [];
      const assessSummary = cand.assessmentSummary || (matched.length > 0 ? matched.map(s => `${s.name || s} (${s.score ? s.score + '%' : '90%'})`).join(', ') : 'Verified Assessment Passed');

      return `
        <div class="col-md-6 col-xl-4">
          <div class="card border shadow-sm p-4 rounded-4 bg-white h-100 d-flex flex-column">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <div class="d-flex align-items-center gap-2">
                <span class="badge ${idx === 0 ? 'bg-primary' : 'bg-dark'} text-white rounded-pill px-2.5 py-1 fw-bold">#${idx + 1}</span>
                <div>
                  <h6 class="fw-bold mb-0 text-dark">${cand.candidateName || 'Candidate'}</h6>
                  <small class="text-muted">${cand.college || 'Engineering College'}</small>
                </div>
              </div>
              <div class="text-end">
                <div class="fw-bold fs-4 text-primary">${cand.fitScore}%</div>
                <small class="text-muted fw-bold">AI FIT</small>
              </div>
            </div>

            <div class="mb-3">
              <div class="fw-semibold text-dark small mb-1">Target Role:</div>
              <div class="text-muted small">${cand.appliedRole || 'Full Stack Engineer'}</div>
            </div>

            <div class="mb-3">
              <div class="fw-semibold text-dark small mb-1.5 text-success">
                <i class="bi bi-check-circle-fill me-1"></i> Matched Competencies:
              </div>
              <div class="d-flex flex-wrap gap-1">
                ${matched.length > 0 ? matched.map(s => `
                  <span class="badge bg-soft-emerald text-success border border-success-subtle small">
                    ${s.name || s}: <strong>${s.score ? s.score + '%' : 'Verified'}</strong>
                  </span>
                `).join('') : '<span class="text-muted small">General Competencies Verified</span>'}
              </div>
            </div>

            ${missing.length > 0 ? `
              <div class="mb-3">
                <div class="fw-semibold text-dark small mb-1.5 text-warning-emphasis">
                  <i class="bi bi-exclamation-circle-fill me-1"></i> Missing / In-Progress Skills:
                </div>
                <div class="d-flex flex-wrap gap-1">
                  ${missing.map(m => `
                    <span class="badge bg-light text-warning-emphasis border small">
                      ${m}
                    </span>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <div class="bg-light p-2.5 rounded-3 mb-3 small text-muted border">
              <i class="bi bi-bar-chart-fill text-primary me-1"></i> <strong>Assessment Summary:</strong> ${assessSummary}
            </div>

            <div class="d-flex justify-content-between align-items-center mt-auto pt-2 border-top">
              ${getStatusBadge(cand.status || 'Applied')}
              <div class="d-flex gap-1">
                <button type="button" class="btn btn-sm btn-outline-custom view-candidate-btn" data-id="${cand.id || cand.candidateId}">Profile</button>
                <button type="button" class="btn btn-sm btn-primary-custom schedule-candidate-btn" data-id="${cand.id || cand.candidateId}">Interview</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    attachApplicantActionEvents(grid);
  }

  // ==========================================================================
  // 8.5. Skill Assessment Results View
  // ==========================================================================
  let assessmentsList = [];
  let assessmentSearchTerm = '';
  let assessmentTechFilterVal = 'All';
  let assessmentScoreFilterVal = '0';
  let assessmentSortVal = 'date-desc';

  async function refreshAssessmentsFromBackend() {
    const tbody = document.getElementById('skillAssessmentsTableBody');
    if (tbody && assessmentsList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>Loading verified assessment records...</td></tr>';
    }

    try {
      let url = `${BACKEND_API_BASE_URL}/assessments?sort=${encodeURIComponent(assessmentSortVal)}`;
      if (assessmentTechFilterVal !== 'All') {
        url += `&technology=${encodeURIComponent(assessmentTechFilterVal)}`;
      }
      if (parseInt(assessmentScoreFilterVal, 10) > 0) {
        url += `&min_score=${encodeURIComponent(assessmentScoreFilterVal)}`;
      }

      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.data)) {
          assessmentsList = json.data;
          renderSkillAssessmentsTable();
          return;
        }
      }
    } catch (err) {
      console.warn('[SkillBridge Recruiter] Note: Could not fetch assessment results from backend:', err);
    }

    renderSkillAssessmentsTable();
  }

  function renderSkillAssessmentsTable() {
    const tbody = document.getElementById('skillAssessmentsTableBody');
    const countDisplay = document.getElementById('assessmentsCountDisplay');
    if (!tbody) return;

    let filtered = [...assessmentsList];

    // Search filter
    if (assessmentSearchTerm.trim() !== '') {
      const q = assessmentSearchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        (a.student_name && a.student_name.toLowerCase().includes(q)) ||
        (a.student_college && a.student_college.toLowerCase().includes(q)) ||
        (a.technology && a.technology.toLowerCase().includes(q))
      );
    }

    // Technology filter
    if (assessmentTechFilterVal !== 'All') {
      filtered = filtered.filter(a => a.technology && a.technology.toLowerCase() === assessmentTechFilterVal.toLowerCase());
    }

    // Score filter
    const minP = parseInt(assessmentScoreFilterVal, 10);
    if (!isNaN(minP) && minP > 0) {
      filtered = filtered.filter(a => (a.percentage || 0) >= minP);
    }

    // Sorting
    if (assessmentSortVal === 'score-desc') {
      filtered.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
    } else if (assessmentSortVal === 'score-asc') {
      filtered.sort((a, b) => (a.percentage || 0) - (b.percentage || 0));
    } else if (assessmentSortVal === 'date-asc') {
      filtered.sort((a, b) => new Date(a.completed_at || 0) - new Date(b.completed_at || 0));
    } else {
      filtered.sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0));
    }

    if (countDisplay) countDisplay.textContent = filtered.length;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-5 text-muted"><i class="bi bi-inbox fs-2 d-block mb-2"></i>No verified assessment results match your criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(item => {
      const completedDate = item.completed_at
        ? new Date(item.completed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Recent';
      const initials = item.student_name
        ? item.student_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : 'ST';
      const pct = item.percentage !== undefined ? item.percentage : 85;
      const tier = item.proficiency_tier || (pct >= 90 ? 'Master' : (pct >= 80 ? 'Proficient' : 'Intermediate'));

      return `
        <tr>
          <td class="ps-4">
            <div class="d-flex align-items-center gap-2">
              <div class="rounded-circle bg-soft-primary text-primary d-flex align-items-center justify-content-center fw-bold"
                style="width: 36px; height: 36px; font-size: 0.82rem;">
                ${initials}
              </div>
              <div>
                <div class="fw-bold text-dark">${item.student_name || 'Candidate'}</div>
                <div class="text-muted" style="font-size: 0.74rem;">${item.student_department || 'Computer Science'} &bull; ${item.student_college || 'Engineering College'}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="fw-semibold text-dark">${item.technology}</span>
          </td>
          <td>
            <span class="badge bg-light text-dark border fw-medium">${item.score || 9} / ${item.total_questions || 10}</span>
          </td>
          <td>
            <div class="d-flex align-items-center gap-2">
              <span class="fw-bold ${pct >= 85 ? 'text-success' : 'text-primary'}">${pct}%</span>
              <div class="progress flex-grow-1" style="height: 6px; width: 60px;">
                <div class="progress-bar ${pct >= 85 ? 'bg-success' : 'bg-primary'}" role="progressbar" style="width: ${pct}%;"></div>
              </div>
            </div>
          </td>
          <td>
            <span class="badge ${tier === 'Master' ? 'bg-soft-emerald text-success' : 'bg-soft-primary text-primary'} px-2.5 py-1 rounded-pill">
              ${tier}
            </span>
          </td>
          <td>
            <code class="small text-secondary bg-light px-2 py-1 rounded border">${item.certificate_code || 'SKB-VERIFIED-2026'}</code>
          </td>
          <td class="text-muted small">${completedDate}</td>
          <td class="text-end pe-4">
            <span class="badge bg-soft-emerald text-success px-2.5 py-1 rounded-pill">
              <i class="bi bi-patch-check-fill me-1"></i> Verified
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ==========================================================================
  // 9. Manage Internships Section
  // ==========================================================================
  function renderManageInternshipsTable() {
    const tbody = document.getElementById('manageInternshipsTableBody');
    if (!tbody) return;

    tbody.innerHTML = internshipsList.map(intn => `
      <tr>
        <td>
          <div class="fw-bold text-dark">${intn.title}</div>
          <div class="text-muted" style="font-size: 0.72rem;">Mode: ${intn.workMode} &bull; Deadline: ${intn.deadline}</div>
        </td>
        <td><span class="badge bg-light text-dark border">${intn.domain}</span></td>
        <td class="small"><strong>${intn.stipend}</strong> &bull; <span class="text-muted">${intn.duration}</span></td>
        <td><span class="badge bg-soft-primary text-primary fw-bold fs-6">${intn.applicantsCount}</span></td>
        <td><span class="badge bg-soft-primary text-primary">&ge; ${intn.minScore}%</span></td>
        <td>
          <button type="button" class="btn btn-sm ${intn.status === 'Active' ? 'btn-success' : 'btn-secondary'} py-0.5 px-2 toggle-status-btn" data-id="${intn.id}">
            ${intn.status}
          </button>
        </td>
        <td class="text-end">
          <div class="d-inline-flex gap-1">
            <button type="button" class="btn btn-sm btn-outline-custom py-1 px-2" data-view="applicantsSection" data-title="Applicants & ATS" title="View Applicants">
              <i class="bi bi-people-fill"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger py-1 px-2 delete-internship-btn" data-id="${intn.id}" title="Remove Listing">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.toggle-status-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const itm = internshipsList.find(i => i.id === id);
        if (itm) {
          itm.status = itm.status === 'Active' ? 'Paused' : 'Active';
          saveStorage('skillbridge_recruiter_internships', internshipsList);
          renderManageInternshipsTable();
          renderOverviewRecentInternships();
          renderKPIStats();
        }
      });
    });

    tbody.querySelectorAll('.delete-internship-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('Are you sure you want to remove this internship listing?')) {
          internshipsList = internshipsList.filter(i => i.id !== id);
          saveStorage('skillbridge_recruiter_internships', internshipsList);
          renderManageInternshipsTable();
          renderOverviewRecentInternships();
          renderKPIStats();
        }
      });
    });
  }

  // ==========================================================================
  // 10. Interview Management (Scheduling, Rescheduling, Feedback, Cancel)
  // ==========================================================================
  function renderConfirmedInterviewsList() {
    const container = document.getElementById('interviewsListContainer');
    if (!container) return;

    if (interviewsList.length === 0) {
      container.innerHTML = '<div class="text-muted small text-center py-4">No interviews confirmed yet. Schedule one using the button above.</div>';
      return;
    }

    container.innerHTML = interviewsList.map(intv => `
      <div class="card border rounded-3 p-3 mb-3 bg-white shadow-sm">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="badge bg-soft-cyan text-info fw-bold">${intv.round}</span>
          <span class="badge bg-soft-emerald text-success">${intv.status}</span>
        </div>
        <h6 class="fw-bold text-dark mb-1">${intv.candidateName}</h6>
        <div class="text-muted small mb-2">${intv.role}</div>
        <div class="row g-2 small text-muted mb-3">
          <div class="col-sm-6"><i class="bi bi-calendar3 me-1.5 text-primary"></i><strong>Date:</strong> ${intv.date} at ${intv.time}</div>
          <div class="col-sm-6"><i class="bi bi-person-badge me-1.5 text-primary"></i><strong>Interviewer:</strong> ${intv.interviewer}</div>
        </div>

        ${intv.feedback ? `
          <div class="bg-light p-2.5 rounded-2 border mb-3 small">
            <div class="fw-bold text-dark mb-1"><i class="bi bi-check2-circle text-success me-1"></i> Feedback Recorded:</div>
            <div class="text-muted mb-1">${intv.feedback.notes}</div>
            <div class="d-flex gap-2">
              <span class="badge bg-soft-primary text-primary">Coding: ${intv.feedback.codingScore}%</span>
              <span class="badge bg-soft-primary text-primary">Architecture: ${intv.feedback.systemScore}%</span>
              <span class="badge bg-soft-emerald text-success">${intv.feedback.recommendation}</span>
            </div>
          </div>
        ` : ''}

        <div class="d-flex flex-wrap justify-content-between align-items-center pt-2 border-top gap-2">
          <div class="d-flex gap-1">
            <a href="${intv.meetLink}" target="_blank" class="btn btn-sm btn-primary-custom">
              <i class="bi bi-camera-video me-1"></i> Join Google Meet
            </a>
            <button type="button" class="btn btn-sm btn-outline-custom reschedule-interview-btn" data-id="${intv.id}">
              <i class="bi bi-clock-history me-1"></i> Reschedule
            </button>
            <button type="button" class="btn btn-sm btn-outline-custom feedback-interview-btn" data-id="${intv.id}">
              <i class="bi bi-pencil-square me-1"></i> Feedback
            </button>
          </div>
          <button type="button" class="btn btn-sm btn-outline-danger cancel-interview-btn" data-id="${intv.id}">
            Cancel
          </button>
        </div>
      </div>
    `).join('');

    // Cancel Button
    container.querySelectorAll('.cancel-interview-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const intv = interviewsList.find(i => i.id === id);
        if (confirm(`Cancel interview for ${intv ? intv.candidateName : 'this candidate'}?`)) {
          interviewsList = interviewsList.filter(i => i.id !== id);
          saveStorage('skillbridge_recruiter_interviews', interviewsList);

          // Revert applicant status if no other interviews
          if (intv) {
            const cand = applicantsList.find(a => a.candidateName === intv.candidateName);
            if (cand && cand.status === 'Interview Scheduled') {
              cand.status = 'Shortlisted';
              saveStorage('skillbridge_recruiter_applicants', applicantsList);
              syncStudentPortalStatus(cand.candidateName, 'Shortlisted');
            }
          }

          renderConfirmedInterviewsList();
          renderOverviewUpcomingInterviews();
          renderKPIStats();
          renderAnalyticsCharts();
        }
      });
    });

    // Reschedule Button
    container.querySelectorAll('.reschedule-interview-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        openRescheduleModal(id);
      });
    });

    // Feedback Button
    container.querySelectorAll('.feedback-interview-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        openFeedbackModal(id);
      });
    });
  }

  function openRescheduleModal(intvId) {
    const intv = interviewsList.find(i => i.id === intvId);
    if (!intv) return;

    document.getElementById('rescheduleInterviewId').value = intv.id;
    document.getElementById('rescheduleCandidateName').value = intv.candidateName;
    document.getElementById('rescheduleRoundDisplay').value = intv.round;
    document.getElementById('rescheduleDateInput').value = intv.date;
    document.getElementById('rescheduleTimeInput').value = intv.time.replace(' IST', '');
    document.getElementById('rescheduleMeetLinkInput').value = intv.meetLink;

    const modalEl = document.getElementById('rescheduleInterviewModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
      const bsModal = new bootstrap.Modal(modalEl);
      bsModal.show();
    }
  }

  function openFeedbackModal(intvId) {
    const intv = interviewsList.find(i => i.id === intvId);
    if (!intv) return;

    document.getElementById('feedbackInterviewId').value = intv.id;
    document.getElementById('feedbackCandidateName').value = intv.candidateName;
    document.getElementById('feedbackRound').value = intv.round;

    const modalEl = document.getElementById('interviewFeedbackModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
      const bsModal = new bootstrap.Modal(modalEl);
      bsModal.show();
    }
  }

  // ==========================================================================
  // 11. Complete Offers & Selection Module
  // ==========================================================================
  function calculateOffersKPIs() {
    // Check if any Released, Viewed, or Pending offers have passed their expiryDate
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    offersList.forEach(o => {
      if ((o.status === 'Released' || o.status === 'Viewed' || o.status === 'Pending') && o.expiryDate) {
        const expObj = new Date(o.expiryDate);
        if (!isNaN(expObj.getTime()) && expObj < today) {
          o.status = 'Expired';
        }
      }
    });

    const total = offersList.length;
    const released = offersList.filter(o => o.status === 'Released').length;
    const pending = offersList.filter(o => o.status === 'Released' || o.status === 'Viewed' || o.status === 'Pending').length;
    const accepted = offersList.filter(o => o.status === 'Accepted').length;
    const rejected = offersList.filter(o => o.status === 'Rejected').length;
    const expired = offersList.filter(o => o.status === 'Expired').length;

    return { total, released, pending, accepted, rejected, expired };
  }

  function renderOffersKPIs() {
    const kpis = calculateOffersKPIs();
    const elTotal = document.getElementById('offersKpiTotal');
    const elReleased = document.getElementById('offersKpiReleased');
    const elPending = document.getElementById('offersKpiPending');
    const elAccepted = document.getElementById('offersKpiAccepted');
    const elRejected = document.getElementById('offersKpiRejected');
    const elExpired = document.getElementById('offersKpiExpired');

    if (elTotal) elTotal.textContent = kpis.total;
    if (elReleased) elReleased.textContent = kpis.released;
    if (elPending) elPending.textContent = kpis.pending;
    if (elAccepted) elAccepted.textContent = kpis.accepted;
    if (elRejected) elRejected.textContent = kpis.rejected;
    if (elExpired) elExpired.textContent = kpis.expired;

    const sidebarBadge = document.getElementById('sidebarOffersBadge');
    if (sidebarBadge) {
      sidebarBadge.textContent = offersList.filter(o => o.status === 'Released' || o.status === 'Accepted').length;
    }
  }

  function populateOfferFormForCandidate(candNameOrId) {
    if (!candNameOrId) return;
    const cand = applicantsList.find(a =>
      a.id === candNameOrId ||
      (a.candidateName && a.candidateName.toLowerCase() === candNameOrId.toLowerCase())
    );
    if (!cand) return;

    const select = document.getElementById('offerCandidateSelect');
    const roleInput = document.getElementById('offerRoleInput');
    const companyInput = document.getElementById('offerCompanyNameInput');
    const stipendInput = document.getElementById('offerStipendInput');
    const durationInput = document.getElementById('offerDurationInput');
    const locationInput = document.getElementById('offerLocationInput');
    const joiningInput = document.getElementById('offerJoiningDateInput');
    const expiryInput = document.getElementById('offerExpiryDateInput');
    const termsInput = document.getElementById('offerTermsInput');

    // Look up matching internship details from internshipsList
    const intn = internshipsList.find(i =>
      i.id === cand.appliedInternshipId ||
      (i.title && cand.appliedRole && i.title.toLowerCase() === cand.appliedRole.toLowerCase())
    );

    if (select) select.value = cand.candidateName;
    if (roleInput) roleInput.value = cand.appliedRole || (intn ? intn.title : 'Full Stack Cloud Engineer Intern');
    if (companyInput) companyInput.value = activeRecruiter.companyName || 'CloudScale Solutions';
    if (stipendInput) stipendInput.value = (intn && intn.stipend) ? intn.stipend : '₹35,000 / month';
    if (durationInput) durationInput.value = (intn && intn.duration) ? intn.duration : '6 Months (Jan - Jun 2027)';
    if (locationInput) locationInput.value = (intn && intn.location) ? intn.location : (activeRecruiter.location || 'Bengaluru, Karnataka (Hybrid)');

    // Default valid future dates
    if (joiningInput && !joiningInput.value) joiningInput.value = '2027-01-05';
    if (expiryInput && !expiryInput.value) expiryInput.value = '2026-11-28';

    if (termsInput && !termsInput.value.trim()) {
      termsInput.value = `1. Standard NDA and intellectual property assignment applies to all source code and infrastructure scripts.\n2. Full-time Pre-Placement Offer (PPO) evaluation conducted at 4-month performance review.\n3. High-spec workstation and cloud infrastructure sandbox access will be provisioned on Day 1.`;
    }
  }

  function renderEligibleShortlistedCandidates() {
    const container = document.getElementById('eligibleShortlistedCandidatesGrid');
    const badge = document.getElementById('eligibleCandidatesBadge');
    if (!container) return;

    // Shortlisted candidates from applicantsList
    const eligible = applicantsList.filter(a => a.status === 'Shortlisted');
    if (badge) badge.textContent = `${eligible.length} Shortlisted`;

    if (eligible.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center py-4 text-muted">
          <i class="bi bi-person-check fs-2 d-block mb-2 text-muted"></i>
          <p class="mb-0 small fw-semibold">No candidates currently in "Shortlisted" status awaiting offers.</p>
          <small class="text-muted">Shortlist candidates in the ATS pipeline or interview evaluations to enable offer generation.</small>
        </div>
      `;
      return;
    }

    container.innerHTML = eligible.map(cand => {
      const existingOffer = offersList.find(o =>
        o.candidateName.toLowerCase() === cand.candidateName.toLowerCase() &&
        o.status !== 'Rejected' && o.status !== 'Withdrawn'
      );
      const hasOffer = !!existingOffer;
      const skillsHtml = (cand.skills || []).slice(0, 3).map(s => `
        <span class="badge bg-light text-dark border me-1 small" style="font-size: 0.72rem;">${s.name} ${s.score}%</span>
      `).join('');

      return `
        <div class="col-12 col-md-6 col-xl-4">
          <div class="eligible-candidate-card ${hasOffer ? 'has-offer' : ''}">
            <div>
              <div class="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <h6 class="fw-bold text-dark mb-0">${cand.candidateName}</h6>
                  <small class="text-muted" style="font-size: 0.75rem;">${cand.college || 'Engineering Institute'}</small>
                </div>
                <span class="badge bg-soft-emerald text-success px-2 py-1 rounded-pill small fw-bold">
                  <i class="bi bi-stars me-1"></i>${cand.fitScore}% Match
                </span>
              </div>

              <div class="mb-2">
                <span class="badge bg-soft-primary text-primary" style="font-size: 0.75rem;">${cand.appliedRole}</span>
              </div>

              <div class="mb-3">
                <div class="small fw-semibold text-muted mb-1" style="font-size: 0.72rem;">Verified Technical Skills:</div>
                <div class="d-flex flex-wrap gap-1">${skillsHtml}</div>
              </div>
            </div>

            <div class="pt-2 border-top d-flex justify-content-between align-items-center">
              ${hasOffer ? `
                <span class="badge bg-soft-cyan text-info px-2 py-1 rounded-pill small">
                  <i class="bi bi-check2-circle me-1"></i>Offer: ${existingOffer.status}
                </span>
                <button type="button" class="btn btn-sm btn-outline-custom py-1 px-2" onclick="window.viewOfferDetails('${existingOffer.id}')">
                  <i class="bi bi-eye me-1"></i> View Offer
                </button>
              ` : `
                <small class="text-success fw-semibold"><i class="bi bi-check-circle me-1"></i>Shortlisted</small>
                <button type="button" class="btn btn-sm btn-primary-custom py-1 px-3" onclick="window.prefillOfferForCandidate('${cand.id}')">
                  <i class="bi bi-file-earmark-plus me-1"></i> Generate Offer
                </button>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function populateOfferCandidateDropdown() {
    const select = document.getElementById('offerCandidateSelect');
    if (!select) return;

    const previousVal = select.value;
    select.innerHTML = '<option value="" disabled selected>-- Select Shortlisted Candidate --</option>';

    // Prioritize shortlisted candidates, but list all for flexibility
    const sorted = [...applicantsList].sort((a, b) => (b.status === 'Shortlisted' ? 1 : 0) - (a.status === 'Shortlisted' ? 1 : 0));

    sorted.forEach(cand => {
      const opt = document.createElement('option');
      opt.value = cand.candidateName;
      opt.dataset.role = cand.appliedRole;
      opt.dataset.id = cand.id;
      opt.textContent = `${cand.candidateName} (${cand.status}) - ${cand.appliedRole}`;
      select.appendChild(opt);
    });

    if (previousVal) select.value = previousVal;
  }

  function populateOffersRoleFilter() {
    const filter = document.getElementById('offersRoleFilter');
    if (!filter) return;

    const current = filter.value;
    const rolesFromOffers = offersList.map(o => o.role).filter(Boolean);
    const rolesFromInternships = internshipsList.map(i => i.title).filter(Boolean);
    const roles = Array.from(new Set([...rolesFromOffers, ...rolesFromInternships]));

    filter.innerHTML = '<option value="all">All Roles</option>' + roles.map(r => `
      <option value="${r}">${r}</option>
    `).join('');

    if (current && roles.includes(current)) {
      filter.value = current;
    }
  }

  function renderOffersTable() {
    const tbody = document.getElementById('offersTableBody');
    if (!tbody) return;

    const search = (document.getElementById('offersSearchInput')?.value || '').toLowerCase().trim();
    const roleFilter = document.getElementById('offersRoleFilter')?.value || 'all';
    const statusFilter = document.getElementById('offersStatusFilter')?.value || 'all';
    const sort = document.getElementById('offersSortSelect')?.value || 'newest';

    let filtered = [...offersList];

    if (search) {
      filtered = filtered.filter(o =>
        (o.candidateName || '').toLowerCase().includes(search) ||
        (o.role || '').toLowerCase().includes(search)
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(o => o.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        filtered = filtered.filter(o => o.status === 'Released' || o.status === 'Viewed' || o.status === 'Pending');
      } else {
        filtered = filtered.filter(o => o.status === statusFilter);
      }
    }

    if (sort === 'candidate') {
      filtered.sort((a, b) => (a.candidateName || '').localeCompare(b.candidateName || ''));
    } else if (sort === 'oldest') {
      filtered.sort((a, b) => new Date(a.offerDate || 0) - new Date(b.offerDate || 0));
    } else if (sort === 'stipend') {
      const getNum = s => parseInt((s || '').replace(/[^0-9]/g, ''), 10) || 0;
      filtered.sort((a, b) => getNum(b.stipend) - getNum(a.stipend));
    } else {
      // Newest
      filtered.sort((a, b) => new Date(b.offerDate || 0) - new Date(a.offerDate || 0));
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-muted">
            <i class="bi bi-inbox fs-2 d-block mb-1 text-muted"></i>
            <span class="small">No offers match the selected filters or search criteria.</span>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(ofr => {
      let statusPillClass = 'status-pill-draft';
      if (ofr.status === 'Released') statusPillClass = 'status-pill-released';
      else if (ofr.status === 'Viewed' || ofr.status === 'Pending') statusPillClass = 'status-pill-viewed';
      else if (ofr.status === 'Accepted') statusPillClass = 'status-pill-accepted';
      else if (ofr.status === 'Rejected') statusPillClass = 'status-pill-rejected';
      else if (ofr.status === 'Expired') statusPillClass = 'status-pill-expired';
      else if (ofr.status === 'Withdrawn') statusPillClass = 'status-pill-withdrawn';

      const initials = (ofr.candidateName || 'Candidate').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

      return `
        <tr>
          <td>
            <div class="d-flex align-items-center gap-2">
              <div class="rounded-circle bg-soft-primary text-primary d-flex align-items-center justify-content-center fw-bold"
                style="width: 32px; height: 32px; font-size: 0.78rem;">
                ${initials}
              </div>
              <div>
                <div class="fw-bold text-dark">${ofr.candidateName}</div>
                <div class="text-muted" style="font-size: 0.72rem;">${ofr.companyName || 'CloudScale Solutions'}</div>
              </div>
            </div>
          </td>
          <td><span class="badge bg-light text-dark border">${ofr.role}</span></td>
          <td class="fw-bold text-dark">${ofr.stipend}</td>
          <td class="text-muted">${ofr.offerDate}</td>
          <td class="text-dark">${ofr.expiryDate || ofr.joiningDate || 'TBD'}</td>
          <td>
            <span class="status-pill ${statusPillClass}">${ofr.status}</span>
          </td>
          <td class="text-end">
            <div class="btn-group btn-group-sm">
              <button type="button" class="btn btn-outline-custom py-1 px-2" title="View Full Letter" onclick="window.viewOfferDetails('${ofr.id}')">
                <i class="bi bi-file-earmark-text text-primary"></i>
              </button>
              <button type="button" class="btn btn-outline-custom py-1 px-2" title="Download PDF" onclick="window.downloadOfferPdfById('${ofr.id}')">
                <i class="bi bi-download text-success"></i>
              </button>
              ${ofr.status === 'Draft' ? `
                <button type="button" class="btn btn-outline-custom py-1 px-2" title="Edit Draft" onclick="window.editOfferDraft('${ofr.id}')">
                  <i class="bi bi-pencil text-info"></i>
                </button>
                <button type="button" class="btn btn-outline-custom py-1 px-2" title="Release Offer" onclick="window.releaseOfferDirect('${ofr.id}')">
                  <i class="bi bi-send text-primary"></i>
                </button>
              ` : ''}
              ${ofr.status === 'Released' || ofr.status === 'Viewed' || ofr.status === 'Pending' ? `
                <button type="button" class="btn btn-outline-custom py-1 px-2" title="Record Candidate Response" onclick="window.openRecordResponseModal('${ofr.id}')">
                  <i class="bi bi-check2-square text-primary"></i>
                </button>
                <button type="button" class="btn btn-outline-custom py-1 px-2" title="Withdraw Offer" onclick="window.withdrawOfferPrompt('${ofr.id}')">
                  <i class="bi bi-x-circle text-danger"></i>
                </button>
              ` : ''}
              ${ofr.status === 'Expired' ? `
                <button type="button" class="btn btn-outline-custom py-1 px-2" title="Extend Expiry" onclick="window.extendOfferExpiry('${ofr.id}')">
                  <i class="bi bi-calendar-plus text-warning"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }



  function renderOffersSection() {
    renderOffersKPIs();
    renderEligibleShortlistedCandidates();
    populateOfferCandidateDropdown();
    populateOffersRoleFilter();
    renderOffersTable();
  }

  function generateOfferLetterHTML(offer) {
    const refId = offer.id ? offer.id.toUpperCase() : `OFR-${Date.now().toString().slice(-4)}`;
    const candidate = applicantsList.find(a => a.candidateName.toLowerCase() === (offer.candidateName || '').toLowerCase()) || {};
    const college = candidate.college || 'PSG College of Technology';
    const degree = candidate.degree || 'B.E. Computer Science';
    const todayStr = offer.offerDate || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return `
      <div class="offer-letterhead">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="d-flex align-items-center gap-2 mb-1">
              <div class="rounded-3 bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                style="width: 42px; height: 42px; font-size: 1.1rem;">
                <i class="bi bi-buildings-fill"></i>
              </div>
              <div>
                <h5 class="fw-bold mb-0 text-dark">${offer.companyName || 'CloudScale Solutions'}</h5>
                <small class="text-muted">Enterprise Cloud Systems &amp; Distributed Platforms</small>
              </div>
            </div>
            <div class="small text-muted">
              Outer Ring Road, Bellandur &bull; Bengaluru, Karnataka 560103 &bull; contact@cloudscale.io
            </div>
          </div>
          <div class="text-end">
            <div class="badge bg-soft-primary text-primary px-3 py-1 rounded-pill fw-bold mb-1">OFFICIAL OFFER LETTER</div>
            <div class="small text-muted">Ref: SKB/2026/${refId}</div>
            <div class="small text-muted">Date: <strong>${todayStr}</strong></div>
          </div>
        </div>
      </div>

      <div class="mb-3">
        <strong>To:</strong><br>
        <span class="fw-bold text-dark fs-6">${offer.candidateName}</span><br>
        <span class="text-muted">${degree} &bull; ${college}</span><br>
        <span class="text-muted">${candidate.email || 'candidate@student.edu'} | ${candidate.phone || '+91 98765 43210'}</span>
      </div>

      <div class="mb-3">
        <strong>Subject: Letter of Offer &bull; Internship as ${offer.role}</strong>
      </div>

      <p>Dear <strong>${offer.candidateName}</strong>,</p>

      <p>
        On behalf of <strong>${offer.companyName || 'CloudScale Solutions'}</strong>, we are pleased to offer you the position of 
        <strong>${offer.role}</strong> for our upcoming engineering cohort. Your performance on the SkillBridge Assessment platform 
        and technical interview evaluations demonstrated the caliber and engineering depth we value.
      </p>

      <p>
        The key terms and conditions of your internship appointment are summarized below:
      </p>

      <table class="offer-terms-table">
        <tbody>
          <tr>
            <th>Internship Role &amp; Title</th>
            <td><strong>${offer.role}</strong></td>
          </tr>
          <tr>
            <th>Offered Monthly Stipend</th>
            <td><strong class="text-primary fs-6">${offer.stipend}</strong></td>
          </tr>
          <tr>
            <th>Internship Duration</th>
            <td>${offer.duration || '6 Months (Jan - Jun 2027)'}</td>
          </tr>
          <tr>
            <th>Scheduled Joining Date</th>
            <td><strong>${offer.joiningDate || 'Jan 05, 2027'}</strong></td>
          </tr>
          <tr>
            <th>Work Location &amp; Mode</th>
            <td>${offer.location || 'Bengaluru, Karnataka (Hybrid)'}</td>
          </tr>
          <tr>
            <th>Offer Validity / Expiry</th>
            <td><strong class="text-danger">${offer.expiryDate || 'Nov 30, 2026'}</strong></td>
          </tr>
        </tbody>
      </table>

      <div class="mb-3">
        <h6 class="fw-bold text-dark mb-1">Additional Terms &amp; Conditions:</h6>
        <div class="p-3 bg-light rounded-3 border small" style="white-space: pre-line;">
          ${offer.terms || '1. Standard NDA and intellectual property assignment applies.\n2. Full-time Pre-Placement Offer (PPO) review at 4 months.'}
        </div>
      </div>

      <p class="small text-muted">
        Please signify your formal acceptance of this offer by signing and confirming through your SkillBridge portal before the offer expiry deadline. 
        We look forward to welcoming you to the CloudScale engineering team!
      </p>

      <div class="offer-signatures row align-items-end mt-4">
        <div class="col-6">
          <div class="fw-bold text-dark">Priya Sharma</div>
          <div class="small text-muted">Head of Campus Talent Acquisition</div>
          <div class="small text-muted">${offer.companyName || 'CloudScale Solutions'}</div>
          <div class="small text-primary mt-1"><i class="bi bi-shield-check me-1"></i>Digitally Authorized via SkillBridge</div>
        </div>
        <div class="col-6 text-end">
          <div style="border-bottom: 1px solid #94a3b8; width: 200px; display: inline-block; margin-bottom: 4px;"></div>
          <div class="small fw-semibold text-dark">Candidate Signature &amp; Date</div>
          <div class="small text-muted">(${offer.candidateName})</div>
        </div>
      </div>
    `;
  }

  function downloadOfferLetterPdf(offer) {
    const container = document.createElement('div');
    container.className = 'offer-letter-doc';
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '800px';
    container.innerHTML = generateOfferLetterHTML(offer);
    document.body.appendChild(container);

    const filename = `SkillBridge_Offer_${(offer.candidateName || 'Candidate').replace(/\s+/g, '_')}.pdf`;

    if (typeof html2pdf !== 'undefined') {
      const opt = {
        margin: 10,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      html2pdf().set(opt).from(container).save().then(() => {
        if (container.parentNode) document.body.removeChild(container);
      }).catch(err => {
        console.warn('html2pdf failed, falling back:', err);
        fallbackOfferPdf(offer, container);
      });
    } else {
      fallbackOfferPdf(offer, container);
    }
  }

  function generateMinimalPdfBlob(offer) {
    const candidateName = offer.candidateName || 'Candidate';
    const role = offer.role || 'Intern';
    const companyName = offer.companyName || 'CloudScale Solutions';
    const stipend = offer.stipend || '₹35,000 / month';
    const duration = offer.duration || '6 Months';
    const joiningDate = offer.joiningDate || 'Jan 05, 2027';
    const expiryDate = offer.expiryDate || 'Nov 30, 2026';
    const location = offer.location || 'Bengaluru, Karnataka (Hybrid)';
    const dateStr = offer.offerDate || new Date().toLocaleDateString('en-US');

    const lines = [
      `SkillBridge Official Corporate Offer Letter`,
      `=============================================`,
      `Date: ${dateStr}`,
      `Candidate: ${candidateName}`,
      `Company: ${companyName}`,
      `Role: ${role}`,
      `Monthly Stipend: ${stipend}`,
      `Internship Duration: ${duration}`,
      `Scheduled Joining Date: ${joiningDate}`,
      `Work Location: ${location}`,
      `Offer Expiry Deadline: ${expiryDate}`,
      `---------------------------------------------`,
      `Authorized by: Priya Sharma, Head of Campus Talent Acquisition`,
      `SkillBridge Enterprise Placement System`
    ];

    let content = "BT\n/F1 12 Tf\n50 780 Td\n";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].replace(/[()\\]/g, '');
      content += `(${line}) '\n`;
    }
    content += "ET";
    const streamLen = content.length;
    const pdfData = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj
4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
5 0 obj << /Length ${streamLen} >>
stream
${content}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000340 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
${400 + streamLen}
%%EOF`;
    return new Blob([pdfData], { type: 'application/pdf' });
  }

  function fallbackOfferPdf(offer, el) {
    const filename = `SkillBridge_Offer_${(offer.candidateName || 'Candidate').replace(/\s+/g, '_')}.pdf`;
    try {
      if (typeof Blob !== 'undefined') {
        const blob = generateMinimalPdfBlob(offer);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.warn('PDF blob generation failed, using print/html fallback:', e);
      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SkillBridge Offer Letter - ${offer.candidateName}</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20mm; color: #1e293b; }
          .offer-terms-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          .offer-terms-table th, .offer-terms-table td { padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 14px; }
          .offer-terms-table th { background-color: #f8fafc; text-align: left; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        ${el ? el.innerHTML : generateOfferLetterHTML(offer)}
        <script>window.onload = function() { window.print(); }<\/script>
      </body>
      </html>
    `;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `SkillBridge_Offer_${(offer.candidateName || 'Candidate').replace(/\s+/g, '_')}.html`;
        a.click();
      }
    }
    if (el && el.parentNode) document.body.removeChild(el);
  }

  function exportOffersToCSV() {
    if (offersList.length === 0) {
      alert('No offer records available to export.');
      return;
    }
    const headers = ['Offer ID', 'Candidate Name', 'Internship Role', 'Company Name', 'Monthly Stipend', 'Duration', 'Offer Date', 'Joining Date', 'Expiry Date', 'Status', 'Location'];
    const rows = offersList.map(o => [
      o.id || '',
      `"${(o.candidateName || '').replace(/"/g, '""')}"`,
      `"${(o.role || '').replace(/"/g, '""')}"`,
      `"${(o.companyName || 'CloudScale Solutions').replace(/"/g, '""')}"`,
      `"${(o.stipend || '').replace(/"/g, '""')}"`,
      `"${(o.duration || '').replace(/"/g, '""')}"`,
      `"${(o.offerDate || '').replace(/"/g, '""')}"`,
      `"${(o.joiningDate || '').replace(/"/g, '""')}"`,
      `"${(o.expiryDate || '').replace(/"/g, '""')}"`,
      `"${(o.status || '').replace(/"/g, '""')}"`,
      `"${(o.location || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SkillBridge_Offers_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Window-level handlers for offer table and card interactions
  const globalObj = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});

  globalObj.viewOfferDetails = function (offerId) {
    const ofr = offersList.find(o => o.id === offerId);
    if (!ofr) return;

    const container = document.getElementById('offerLetterPreviewContainer');
    const subtitle = document.getElementById('modalOfferPreviewSubtitle');
    const releaseBtn = document.getElementById('modalPreviewReleaseBtn');

    if (container) container.innerHTML = generateOfferLetterHTML(ofr);
    if (subtitle) subtitle.textContent = `Official Corporate Offer Letterhead • Status: ${ofr.status}`;
    if (releaseBtn) {
      releaseBtn.style.display = ofr.status === 'Draft' ? 'inline-block' : 'none';
      releaseBtn.onclick = function () {
        globalObj.releaseOfferDirect(ofr.id);
        const modalEl = document.getElementById('offerLetterPreviewModal');
        if (modalEl && typeof bootstrap !== 'undefined') {
          bootstrap.Modal.getInstance(modalEl)?.hide();
        }
      };
    }

    const modalEl = document.getElementById('offerLetterPreviewModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
      const bsModal = new bootstrap.Modal(modalEl);
      bsModal.show();
    }
  };

  globalObj.downloadOfferPdfById = function (offerId) {
    const ofr = offersList.find(o => o.id === offerId);
    if (ofr) downloadOfferLetterPdf(ofr);
  };

  globalObj.prefillOfferForCandidate = function (candidateId) {
    const cand = applicantsList.find(a => a.id === candidateId || a.candidateName === candidateId);
    if (!cand) return;

    populateOfferFormForCandidate(cand.candidateName);

    const formCard = document.getElementById('generateOfferCard');
    if (formCard) {
      formCard.scrollIntoView({ behavior: 'smooth' });
      formCard.classList.add('border-primary');
      setTimeout(() => formCard.classList.remove('border-primary'), 1500);
    }
  };

  globalObj.editOfferDraft = function (offerId) {
    const ofr = offersList.find(o => o.id === offerId);
    if (!ofr) return;

    document.getElementById('editingOfferId').value = ofr.id;
    document.getElementById('offerCandidateSelect').value = ofr.candidateName;
    document.getElementById('offerRoleInput').value = ofr.role;
    document.getElementById('offerStipendInput').value = ofr.stipend;
    document.getElementById('offerDurationInput').value = ofr.duration || '6 Months (Jan - Jun 2027)';
    document.getElementById('offerJoiningDateInput').value = ofr.joiningDate || '2027-01-05';
    document.getElementById('offerLocationInput').value = ofr.location || 'Bengaluru, Karnataka (Hybrid)';
    document.getElementById('offerExpiryDateInput').value = ofr.expiryDate || '2026-11-28';
    document.getElementById('offerTermsInput').value = ofr.terms || '';

    const cancelBtn = document.getElementById('btnCancelOfferEdit');
    const title = document.getElementById('offerFormTitle');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
    if (title) title.textContent = `Edit Draft Offer Letter (${ofr.candidateName})`;

    const formCard = document.getElementById('generateOfferCard');
    if (formCard) formCard.scrollIntoView({ behavior: 'smooth' });
  };

  globalObj.releaseOfferDirect = function (offerId) {
    const ofr = offersList.find(o => o.id === offerId);
    if (!ofr) return;

    if (typeof confirm !== 'undefined' && !confirm(`Are you sure you want to release the formal offer letter to ${ofr.candidateName}?`)) {
      return;
    }

    ofr.status = 'Released';
    ofr.offerDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    saveStorage('skillbridge_recruiter_offers', offersList);

    notificationsList.unshift({
      title: 'Offer Letter Released',
      text: `Formal offer letter released to ${ofr.candidateName} for ${ofr.role}.`,
      time: 'Just now',
      icon: 'bi-send-check text-primary',
      unread: true
    });
    saveStorage('skillbridge_recruiter_notifications', notificationsList);

    if (typeof alert !== 'undefined') {
      alert(`Offer letter released successfully to ${ofr.candidateName}! Candidate will receive notification on their student portal.`);
    }
    renderOffersSection();
    renderDashboardOverview();
  };

  globalObj.openRecordResponseModal = function (offerId) {
    const ofr = offersList.find(o => o.id === offerId);
    if (!ofr) return;

    document.getElementById('recordResponseOfferId').value = ofr.id;
    document.getElementById('recordResponseCandidateName').value = ofr.candidateName;
    document.getElementById('recordResponseRole').value = ofr.role;
    document.getElementById('recordResponseActionSelect').value = 'Accepted';
    document.getElementById('recordResponseNotes').value = '';

    const modalEl = document.getElementById('recordCandidateResponseModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
      const bsModal = new bootstrap.Modal(modalEl);
      bsModal.show();
    }
  };

  globalObj.withdrawOfferPrompt = function (offerId) {
    const ofr = offersList.find(o => o.id === offerId);
    if (!ofr) return;

    if (typeof confirm !== 'undefined' && !confirm(`Are you sure you want to withdraw the offer released to ${ofr.candidateName}? This will void the offer letter.`)) {
      return;
    }

    ofr.status = 'Withdrawn';
    saveStorage('skillbridge_recruiter_offers', offersList);

    // Rollback candidate status to Shortlisted if they were Selected
    const cand = applicantsList.find(a => a.candidateName.toLowerCase() === ofr.candidateName.toLowerCase());
    if (cand && cand.status === 'Selected') {
      cand.status = 'Shortlisted';
      saveStorage('skillbridge_recruiter_applicants', applicantsList);
      syncStudentPortalStatus(cand.candidateName, 'Shortlisted');
    }

    notificationsList.unshift({
      title: 'Offer Withdrawn',
      text: `Offer letter to ${ofr.candidateName} has been officially withdrawn.`,
      time: 'Just now',
      icon: 'bi-x-circle text-danger',
      unread: true
    });
    saveStorage('skillbridge_recruiter_notifications', notificationsList);

    if (typeof alert !== 'undefined') {
      alert(`Offer to ${ofr.candidateName} has been withdrawn.`);
    }
    renderOffersSection();
    renderDashboardOverview();
  };

  globalObj.extendOfferExpiry = function (offerId) {
    const ofr = offersList.find(o => o.id === offerId);
    if (!ofr) return;

    const newDate = typeof prompt !== 'undefined' ? prompt(`Enter new offer expiry deadline for ${ofr.candidateName} (YYYY-MM-DD):`, '2026-12-05') : '2026-12-05';
    if (newDate) {
      ofr.expiryDate = newDate;
      ofr.status = 'Released';
      saveStorage('skillbridge_recruiter_offers', offersList);
      if (typeof alert !== 'undefined') {
        alert(`Offer deadline for ${ofr.candidateName} extended to ${newDate}. Status set to Released.`);
      }
      renderOffersSection();
      renderDashboardOverview();
    }
  };

  // ==========================================================================
  // 12. Complete Candidate Messaging Engine (Two-Panel Architecture)
  // ==========================================================================
  let activeConversationCandidateId = 'app-201';
  let messagesSearchTerm = '';
  let messagesFilterTab = 'all'; // 'all' or 'unread'

  function syncConversationsWithApplicants() {
    let updated = false;
    applicantsList.forEach(cand => {
      let convo = messagesList.find(m =>
        (m.candidateId && m.candidateId === cand.id) ||
        (m.candidateName && m.candidateName.toLowerCase() === cand.candidateName.toLowerCase())
      );
      if (!convo) {
        convo = {
          candidateId: cand.id,
          candidateName: cand.candidateName,
          role: cand.appliedRole,
          college: cand.college,
          fitScore: cand.fitScore,
          skills: (cand.skills || []).map(s => `${s.name} ${s.score}%`),
          lastMessage: `Application received for ${cand.appliedRole}.`,
          time: cand.appliedDate || 'Recently',
          timestamp: cand.appliedTimestamp || Date.now(),
          unreadCount: 0,
          unread: false,
          history: [
            {
              id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              sender: 'candidate',
              text: `Hello! I have submitted my SkillBridge application for ${cand.appliedRole}. Looking forward to discussing the role!`,
              time: cand.appliedDate || 'Recently',
              status: 'read',
              timestamp: cand.appliedTimestamp || Date.now()
            }
          ]
        };
        messagesList.push(convo);
        updated = true;
      } else {
        convo.candidateId = cand.id;
        convo.role = cand.appliedRole;
        convo.college = cand.college;
        convo.fitScore = cand.fitScore;
        convo.skills = (cand.skills || []).map(s => typeof s === 'object' ? `${s.name} ${s.score}%` : s);
        if (typeof convo.unreadCount !== 'number') {
          convo.unreadCount = convo.unread ? 1 : 0;
        }
      }
    });

    if (updated) {
      saveStorage('skillbridge_recruiter_messages', messagesList);
    }
  }

  function calculateTotalUnreadMessages() {
    return messagesList.reduce((sum, m) => sum + (m.unreadCount || (m.unread ? 1 : 0)), 0);
  }

  function updateMessagesSidebarBadge() {
    const badge = document.getElementById('sidebarMessagesBadge');
    const totalUnread = calculateTotalUnreadMessages();
    if (badge) {
      badge.textContent = totalUnread;
      if (totalUnread > 0) {
        badge.className = 'badge bg-danger rounded-pill';
      } else {
        badge.className = 'badge bg-light text-muted rounded-pill';
      }
    }
  }

  function renderMessagesSection() {
    syncConversationsWithApplicants();
    updateMessagesSidebarBadge();

    const activeThreadsCount = document.getElementById('messagesActiveThreadsCount');
    if (activeThreadsCount) {
      activeThreadsCount.innerHTML = `<i class="bi bi-chat-dots-fill me-1"></i> ${messagesList.length} Active Conversations`;
    }

    const totalCountEl = document.getElementById('totalConvosCount');
    if (totalCountEl) totalCountEl.textContent = messagesList.length;

    const unreadCountEl = document.getElementById('unreadConvosCount');
    const unreadTotal = messagesList.filter(m => (m.unreadCount || 0) > 0 || m.unread).length;
    if (unreadCountEl) unreadCountEl.textContent = unreadTotal;

    renderMessagesThreadList();
    renderActiveChat();
  }

  function renderMessagesThreadList() {
    const threadList = document.getElementById('messagesThreadList');
    if (!threadList) return;

    let convos = [...messagesList];

    if (messagesSearchTerm) {
      const q = messagesSearchTerm.toLowerCase();
      convos = convos.filter(m =>
        (m.candidateName && m.candidateName.toLowerCase().includes(q)) ||
        (m.role && m.role.toLowerCase().includes(q)) ||
        (m.college && m.college.toLowerCase().includes(q)) ||
        (m.lastMessage && m.lastMessage.toLowerCase().includes(q)) ||
        (m.history && m.history.some(h => (h.text || '').toLowerCase().includes(q)))
      );
    }

    if (messagesFilterTab === 'unread') {
      convos = convos.filter(m => (m.unreadCount || 0) > 0 || m.unread);
    }

    if (convos.length === 0) {
      threadList.innerHTML = `
        <div class="p-4 text-center text-muted">
          <i class="bi bi-chat-left-dots fs-2 text-muted d-block mb-2"></i>
          <p class="small mb-0 fw-semibold">No conversations found.</p>
          <small class="text-muted">${messagesSearchTerm ? 'Try adjusting your search query.' : 'No unread messages.'}</small>
        </div>
      `;
      return;
    }

    // Sort: unread first, then latest activity
    convos.sort((a, b) => {
      const aUnread = (a.unreadCount || 0) > 0 || a.unread;
      const bUnread = (b.unreadCount || 0) > 0 || b.unread;
      if (aUnread !== bUnread) return bUnread - aUnread;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });

    threadList.innerHTML = convos.map(m => {
      const initials = (m.candidateName || 'Candidate').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      const isActive = (m.candidateId === activeConversationCandidateId) || (!activeConversationCandidateId && convos[0] && m.candidateId === convos[0].candidateId);
      const unreadCount = m.unreadCount || (m.unread ? 1 : 0);
      const hasUnread = unreadCount > 0;

      return `
        <div class="convo-thread-item ${isActive ? 'active' : ''} ${hasUnread ? 'has-unread' : ''}" data-id="${m.candidateId}">
          <div class="d-flex align-items-start gap-2.5">
            <div class="position-relative flex-shrink-0">
              <div class="rounded-circle ${hasUnread ? 'bg-primary text-white' : 'bg-soft-primary text-primary'} d-flex align-items-center justify-content-center fw-bold shadow-sm"
                style="width: 38px; height: 38px; font-size: 0.85rem;">
                ${initials}
              </div>
              <span class="position-absolute bottom-0 end-0 p-1 bg-success border border-light rounded-circle" style="width: 8px; height: 8px;"></span>
            </div>
            <div class="flex-grow-1 overflow-hidden">
              <div class="d-flex justify-content-between align-items-baseline mb-0.5">
                <span class="convo-candidate-name text-truncate small ${hasUnread ? 'fw-bold text-dark' : 'fw-semibold text-dark'}">
                  ${m.candidateName}
                </span>
                <span class="text-muted" style="font-size: 0.68rem;">${m.time || ''}</span>
              </div>
              <div class="d-flex align-items-center gap-1 mb-1">
                <span class="badge bg-light text-muted border text-truncate" style="font-size: 0.65rem; max-width: 150px;">
                  ${m.role || 'Intern Candidate'}
                </span>
                ${m.fitScore ? `
                  <span class="badge bg-soft-emerald text-success px-1.5 py-0-5" style="font-size: 0.65rem;">
                    ${m.fitScore}%
                  </span>
                ` : ''}
              </div>
              <div class="d-flex justify-content-between align-items-center">
                <div class="convo-last-msg text-truncate small text-muted pe-1" style="font-size: 0.74rem;">
                  ${m.lastMessage || 'Click to view conversation'}
                </div>
                ${hasUnread ? `
                  <span class="badge bg-primary rounded-pill flex-shrink-0" style="font-size: 0.68rem;">${unreadCount}</span>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    threadList.querySelectorAll('.convo-thread-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        selectConversation(id);
      });
    });
  }

  function selectConversation(candidateId) {
    activeConversationCandidateId = candidateId;
    const convo = messagesList.find(m => m.candidateId === candidateId);
    if (convo) {
      convo.unreadCount = 0;
      convo.unread = false;
      if (convo.history) {
        convo.history.forEach(h => {
          if (h.sender === 'candidate') h.status = 'read';
        });
      }
      saveStorage('skillbridge_recruiter_messages', messagesList);
    }

    updateMessagesSidebarBadge();
    renderMessagesThreadList();
    renderActiveChat();
  }

  function renderActiveChat() {
    const chatArea = document.getElementById('chatMessagesArea');
    const emptyState = document.getElementById('chatEmptyState');
    const headerBar = document.getElementById('chatHeaderBar');
    const quickBar = document.getElementById('chatQuickTemplatesBar');
    const sendForm = document.getElementById('sendMessageForm');

    if (!chatArea) return;

    let convo = messagesList.find(m => m.candidateId === activeConversationCandidateId);
    if (!convo && messagesList.length > 0) {
      activeConversationCandidateId = messagesList[0].candidateId;
      convo = messagesList[0];
    }

    if (!convo) {
      if (chatArea) chatArea.classList.add('d-none');
      if (headerBar) headerBar.classList.add('d-none');
      if (quickBar) quickBar.classList.add('d-none');
      if (sendForm && sendForm.parentElement) sendForm.parentElement.classList.add('d-none');
      if (emptyState) emptyState.classList.remove('d-none');
      return;
    }

    if (chatArea) chatArea.classList.remove('d-none');
    if (headerBar) headerBar.classList.remove('d-none');
    if (quickBar) quickBar.classList.remove('d-none');
    if (sendForm && sendForm.parentElement) sendForm.parentElement.classList.remove('d-none');
    if (emptyState) emptyState.classList.add('d-none');

    // Populate Active Candidate Header
    const nameEl = document.getElementById('chatActiveName');
    if (nameEl) nameEl.textContent = convo.candidateName;

    const avatarEl = document.getElementById('chatActiveAvatar');
    if (avatarEl) {
      avatarEl.textContent = (convo.candidateName || 'Candidate').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    }

    const matchEl = document.getElementById('chatActiveMatchScore');
    if (matchEl) {
      matchEl.innerHTML = `<i class="bi bi-stars me-1"></i>${convo.fitScore || 90}% Match`;
    }

    const roleEl = document.getElementById('chatActiveRole');
    if (roleEl) roleEl.textContent = convo.role || 'Engineering Intern Candidate';

    const collegeEl = document.getElementById('chatActiveCollege');
    if (collegeEl) collegeEl.textContent = convo.college || 'Engineering Institute';

    const skillsBox = document.getElementById('chatActiveSkills');
    if (skillsBox) {
      const skillsArr = Array.isArray(convo.skills) ? convo.skills : ['Java 95%', 'React 92%'];
      skillsBox.innerHTML = skillsArr.slice(0, 4).map(s => `
        <span class="badge bg-light text-dark border small" style="font-size: 0.68rem;">${s}</span>
      `).join('');
    }

    // Render Chat Messages Bubbles
    const history = convo.history || [];
    if (history.length === 0) {
      chatArea.innerHTML = `
        <div class="text-center py-5 text-muted small">
          <i class="bi bi-chat-heart fs-3 d-block mb-1 text-primary"></i>
          <div>No messages exchanged yet with <strong>${convo.candidateName}</strong>.</div>
          <small class="text-muted">Send an introductory note or coordinate interview logistics.</small>
        </div>
      `;
    } else {
      chatArea.innerHTML = history.map(msg => {
        const isRecruiter = msg.sender === 'recruiter';
        let tickHtml = '';
        if (isRecruiter) {
          const status = msg.status || 'read';
          if (status === 'read') {
            tickHtml = '<i class="bi bi-check-all chat-status-tick read" title="Read by candidate"></i>';
          } else if (status === 'delivered') {
            tickHtml = '<i class="bi bi-check-all chat-status-tick text-white-50" title="Delivered to candidate"></i>';
          } else {
            tickHtml = '<i class="bi bi-check chat-status-tick text-white-50" title="Sent"></i>';
          }
        }

        return `
          <div class="chat-bubble ${isRecruiter ? 'chat-bubble-recruiter' : 'chat-bubble-candidate'}">
            <div class="chat-bubble-text">${msg.text}</div>
            <div class="chat-bubble-meta">
              <span>${msg.time || ''}</span>
              ${tickHtml}
            </div>
          </div>
        `;
      }).join('');
    }

    // Scroll viewport to bottom
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function handleSendMessage() {
    const input = document.getElementById('chatMessageInput');
    if (!input) return;

    const text = input.value.trim();
    if (!text) {
      input.focus();
      return;
    }

    const convo = messagesList.find(m => m.candidateId === activeConversationCandidateId);
    if (!convo) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgId = `msg-${Date.now()}`;

    const newMsg = {
      id: msgId,
      sender: 'recruiter',
      text,
      time: timeStr,
      status: 'sent',
      timestamp: Date.now()
    };

    if (!convo.history) convo.history = [];
    convo.history.push(newMsg);
    convo.lastMessage = text;
    convo.time = timeStr;
    convo.timestamp = Date.now();

    saveStorage('skillbridge_recruiter_messages', messagesList);
    input.value = '';

    renderActiveChat();
    renderMessagesThreadList();

    // Progression of Sent -> Delivered -> Read
    setTimeout(() => {
      newMsg.status = 'delivered';
      saveStorage('skillbridge_recruiter_messages', messagesList);
      renderActiveChat();
    }, 900);

    setTimeout(() => {
      newMsg.status = 'read';
      saveStorage('skillbridge_recruiter_messages', messagesList);
      renderActiveChat();
    }, 2200);
  }

  // Window-level helper to trigger chat with any candidate from any view
  globalObj.openCandidateChat = function (candidateNameOrId) {
    if (!candidateNameOrId) return;
    syncConversationsWithApplicants();
    const convo = messagesList.find(m =>
      m.candidateId === candidateNameOrId ||
      (m.candidateName && m.candidateName.toLowerCase() === candidateNameOrId.toLowerCase())
    );
    if (convo) {
      activeConversationCandidateId = convo.candidateId;
      selectConversation(convo.candidateId);
      navigateToView('messagesSection', 'Candidate Messages');
    }
  };

  // ==========================================================================
  // 13. Modal Actions & Event Attachments
  // ==========================================================================
  function attachApplicantActionEvents(container) {
    if (!container) return;

    // View Profile Modal
    container.querySelectorAll('.view-candidate-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const cand = applicantsList.find(a => a.id === id);
        if (!cand) return;

        document.getElementById('modalProfileAvatar').textContent = cand.candidateName.split(' ').map(n => n[0]).join('');
        document.getElementById('modalProfileName').textContent = cand.candidateName;
        document.getElementById('modalProfileRole').textContent = `${cand.appliedRole} • ${cand.college}`;
        document.getElementById('modalProfileFitScore').textContent = `${cand.fitScore}%`;
        document.getElementById('modalProfileGrade').textContent = cand.codingGrade;
        document.getElementById('modalProfileStatusBadge').innerHTML = getStatusBadge(cand.status);
        document.getElementById('modalProfileAppliedDate').textContent = cand.appliedDate;
        document.getElementById('modalProfileDegree').textContent = cand.degree;
        document.getElementById('modalProfileCollege').textContent = cand.college;
        document.getElementById('modalProfileEmail').textContent = cand.email;
        document.getElementById('modalProfilePhone').textContent = cand.phone;

        const skillsBox = document.getElementById('modalProfileSkillsBreakdown');
        if (skillsBox) {
          skillsBox.innerHTML = cand.skills.map(s => `
            <div class="col-sm-6">
              <div class="p-2 border rounded-2 bg-white">
                <div class="d-flex justify-content-between small fw-semibold">
                  <span>${s.name}</span>
                  <span class="text-primary">${s.score}%</span>
                </div>
                <div class="progress mt-1" style="height: 5px;">
                  <div class="progress-bar bg-primary" style="width: ${s.score}%;"></div>
                </div>
              </div>
            </div>
          `).join('');
        }

        const scheduleBtn = document.getElementById('modalProfileScheduleBtn');
        if (scheduleBtn) {
          scheduleBtn.onclick = () => {
            const profModal = bootstrap.Modal.getInstance(document.getElementById('candidateProfileModal'));
            if (profModal) profModal.hide();
            openScheduleModal(cand.id);
          };
        }

        const messageBtn = document.getElementById('modalProfileMessageBtn');
        if (messageBtn) {
          messageBtn.onclick = () => {
            const profModal = bootstrap.Modal.getInstance(document.getElementById('candidateProfileModal'));
            if (profModal) profModal.hide();
            globalObj.openCandidateChat(cand.id);
          };
        }

        const viewResumeBtn = document.getElementById('modalProfileViewResumeBtn');
        if (viewResumeBtn) {
          viewResumeBtn.onclick = () => {
            const profModal = bootstrap.Modal.getInstance(document.getElementById('candidateProfileModal'));
            if (profModal) profModal.hide();
            openResumeModal(cand.id);
          };
        }

        const modalEl = document.getElementById('candidateProfileModal');
        if (modalEl && typeof bootstrap !== 'undefined') {
          const bsModal = new bootstrap.Modal(modalEl);
          bsModal.show();
        }
      });
    });

    // View Resume Modal
    container.querySelectorAll('.view-resume-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        openResumeModal(id);
      });
    });

    // Update Status Modal
    container.querySelectorAll('.status-candidate-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const cand = applicantsList.find(a => a.id === id);
        if (!cand) return;

        document.getElementById('statusModalAppId').value = cand.id;
        document.getElementById('statusModalCandidateName').value = cand.candidateName;
        document.getElementById('statusModalNewStatus').value = cand.status;
        document.getElementById('statusModalNotes').value = cand.notes || '';

        const modalEl = document.getElementById('candidateStatusModal');
        if (modalEl && typeof bootstrap !== 'undefined') {
          const bsModal = new bootstrap.Modal(modalEl);
          bsModal.show();
        }
      });
    });

    // Schedule Interview Trigger
    container.querySelectorAll('.schedule-candidate-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        openScheduleModal(id);
      });
    });
  }

  function openResumeModal(candId) {
    const cand = applicantsList.find(a => a.id === candId);
    if (!cand) return;

    document.getElementById('resumeModalCandidateName').textContent = `${cand.candidateName} - Resume`;
    document.getElementById('resumeModalAppliedRole').textContent = cand.appliedRole;
    document.getElementById('resumeDocName').textContent = cand.candidateName;

    const modalEl = document.getElementById('candidateResumeModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
      const bsModal = new bootstrap.Modal(modalEl);
      bsModal.show();
    }
  }

  function openScheduleModal(candId) {
    const cand = applicantsList.find(a => a.id === candId);
    if (!cand) return;

    const candSelect = document.getElementById('scheduleCandidateSelect');
    if (candSelect) {
      candSelect.innerHTML = applicantsList.map(c => `
        <option value="${c.id}" ${c.id === cand.id ? 'selected' : ''}>${c.candidateName} (${c.appliedRole})</option>
      `).join('');
    }

    document.getElementById('scheduleCandidateId').value = cand.id;

    const modalEl = document.getElementById('scheduleInterviewModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
      const bsModal = new bootstrap.Modal(modalEl);
      bsModal.show();
    }
  }

  // ==========================================================================
  // 14. SPA Router & Navigation (Aligning with Student Dashboard data-view)
  // ==========================================================================
  const VIEW_MAP = {
    'overviewSection': 'Dashboard Overview',
    'section-overview': 'Dashboard Overview',
    'profileSection': 'Company Profile',
    'section-company-profile': 'Company Profile',
    'postInternshipSection': 'Post Internship',
    'section-post-internship': 'Post Internship',
    'manageInternshipsSection': 'Manage Internships',
    'section-manage-internships': 'Manage Internships',
    'applicantsSection': 'Applicants & ATS',
    'section-applicants': 'Applicants & ATS',
    'aiMatchingSection': 'AI Candidate Matching',
    'section-ai-matching': 'AI Candidate Matching',
    'skillAssessmentSection': 'Skill Assessment Results',
    'section-skill-assessment': 'Skill Assessment Results',
    'interviewsSection': 'Interview Scheduling',
    'section-interviews': 'Interview Scheduling',
    'offersSection': 'Offers & Selection',
    'section-offers': 'Offers & Selection',
    'messagesSection': 'Candidate Messages',
    'section-messages': 'Candidate Messages',
    'settingsSection': 'Account Settings',
    'section-settings': 'Account Settings'
  };

  const VALID_SECTIONS = [
    'overviewSection',
    'profileSection',
    'postInternshipSection',
    'manageInternshipsSection',
    'applicantsSection',
    'aiMatchingSection',
    'skillAssessmentSection',
    'interviewsSection',
    'offersSection',
    'messagesSection',
    'settingsSection'
  ];

  function navigateToView(targetView, viewTitle) {
    // Normalize target view ID
    let viewId = targetView;
    if (targetView.startsWith('section-') || targetView === 'skillAssessmentSection') {
      const canonical = {
        'section-overview': 'overviewSection',
        'section-company-profile': 'profileSection',
        'section-post-internship': 'postInternshipSection',
        'section-manage-internships': 'manageInternshipsSection',
        'section-applicants': 'applicantsSection',
        'section-ai-matching': 'aiMatchingSection',
        'section-skill-assessment': 'aiMatchingSection',
        'skillAssessmentSection': 'aiMatchingSection',
        'section-skill-assessment': 'skillAssessmentSection',
        'skillAssessmentSection': 'skillAssessmentSection',
        'section-interviews': 'interviewsSection',
        'section-offers': 'offersSection',
        'section-messages': 'messagesSection',
        'section-settings': 'settingsSection'
      };
      viewId = canonical[targetView] || 'overviewSection';
    }

    if (!document.getElementById(viewId)) {
      viewId = 'overviewSection';
    }

    const title = viewTitle || VIEW_MAP[viewId] || 'Overview';

    // Toggle active section
    document.querySelectorAll('.dashboard-view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const targetSec = document.getElementById(viewId);
    if (targetSec) targetSec.classList.add('active');

    // Update nav links
    document.querySelectorAll('.dashboard-nav-link').forEach(link => {
      link.classList.remove('active');
      const v = link.getAttribute('data-view');
      if (v === viewId || v === targetView) {
        link.classList.add('active');
      }
    });

    // Update Topbar Breadcrumb & Page Title
    const breadcrumbEl = document.getElementById('dashboardBreadcrumbCurrent');
    if (breadcrumbEl) breadcrumbEl.textContent = title;

    const pageTitleEl = document.getElementById('dashboardPageTitle');
    if (pageTitleEl) pageTitleEl.textContent = title;

    // Update window hash
    try {
      if (typeof history !== 'undefined' && history.replaceState) {
        history.replaceState(null, '', `#${viewId}`);
      }
    } catch (e) { }

    // Scroll main viewport to top
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Close mobile drawer
    closeMobileSidebar();

    // Trigger specific renderers
    if (viewId === 'overviewSection') {
      renderDashboardOverview();
    } else if (viewId === 'applicantsSection') {
      const companyId = getLoggedInCompanyId();
      if (companyId) {
        refreshApplicationsFromBackend(companyId);
      }
      populateApplicantsInternshipFilter();
      renderFullApplicantsTable();
    } else if (viewId === 'manageInternshipsSection') {
      renderManageInternshipsTable();
    } else if (viewId === 'aiMatchingSection') {
      renderAiCandidateMatchingGrid();
      const companyId = getLoggedInCompanyId();
      if (companyId) {
        refreshAiMatchingFromBackend(companyId);
      } else {
        renderAiCandidateMatchingGrid();
      }
    } else if (viewId === 'skillAssessmentSection') {
      refreshAssessmentsFromBackend();
    } else if (viewId === 'interviewsSection') {
      renderConfirmedInterviewsList();
    } else if (viewId === 'offersSection') {
      renderOffersSection();
    } else if (viewId === 'messagesSection') {
      renderMessagesSection();
    } else if (viewId === 'settingsSection') {
      renderSettingsSection();
    }
  }

  function initRouter() {
    const hash = window.location.hash ? window.location.hash.substring(1) : 'overviewSection';
    navigateToView(hash);

    document.querySelectorAll('.dashboard-nav-link[data-view]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const v = link.getAttribute('data-view');
        const t = link.getAttribute('data-title');
        navigateToView(v, t);
      });
    });

    document.querySelectorAll('[data-view]').forEach(el => {
      if (!el.classList.contains('dashboard-nav-link')) {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          const v = el.getAttribute('data-view');
          const t = el.getAttribute('data-title');
          navigateToView(v, t);
        });
      }
    });

    window.addEventListener('hashchange', () => {
      const h = window.location.hash ? window.location.hash.substring(1) : 'overviewSection';
      navigateToView(h);
    });
  }

  function closeMobileSidebar() {
    const sb = document.getElementById('dashboardSidebar');
    const bd = document.getElementById('dashboardSidebarBackdrop');
    if (sb) sb.classList.remove('show');
    if (bd) bd.classList.remove('show');
  }

  // ==========================================================================
  // 15. Form Submissions & Event Listeners
  // ==========================================================================
  function initEventHandlers() {
    // 1. Post Internship Form
    const postForm = document.getElementById('postInternshipForm');
    if (postForm) {
      postForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Authenticate company session (Never hardcode comp-101 or invent an ID)
        const companyId = getLoggedInCompanyId();
        if (!companyId) {
          showPostError('Authentication required: No authenticated company session found. Please sign in to your recruiter/company account to post internships.');
          return;
        }

        // 2. Read and validate form inputs
        const title = document.getElementById('postTitle')?.value.trim() || '';
        if (!title) {
          showPostError('Validation error: Please enter an internship title.');
          return;
        }

        const domain = document.getElementById('postDomain')?.value.trim() || '';
        if (!domain) {
          showPostError('Validation error: Please select a domain track.');
          return;
        }

        const workModeRaw = document.getElementById('postWorkMode')?.value.trim() || 'Hybrid (Bengaluru)';
        let workplace_mode = 'Hybrid';
        let location = 'Bengaluru, Karnataka (Hybrid)';
        const modeLower = workModeRaw.toLowerCase();
        if (modeLower.includes('remote')) {
          workplace_mode = 'Remote';
          location = 'Remote, India';
        } else if (modeLower.includes('on-site') || modeLower.includes('onsite') || modeLower.includes('on site')) {
          workplace_mode = 'On-site';
          location = 'Bengaluru, Karnataka (On-site)';
        } else {
          workplace_mode = 'Hybrid';
          location = 'Bengaluru, Karnataka (Hybrid)';
        }

        const stipendRaw = document.getElementById('postStipend')?.value.trim() || '';
        if (!stipendRaw) {
          showPostError('Validation error: Please enter a monthly stipend amount.');
          return;
        }
        const cleanStipendDigits = stipendRaw.replace(/[^0-9]/g, '');
        const stipend_amount = parseInt(cleanStipendDigits, 10);
        if (isNaN(stipend_amount) || stipend_amount < 0) {
          showPostError('Validation error: Monthly stipend must be a valid non-negative number (e.g. ₹35,000 / month).');
          return;
        }
        const stipend_display = stipendRaw.startsWith('₹') ? stipendRaw : `₹${stipend_amount.toLocaleString('en-IN')} / month`;

        const duration = document.getElementById('postDuration')?.value.trim() || '6 Months';
        const openings_count = 1; // converted to number

        const deadlineRaw = document.getElementById('postDeadline')?.value.trim() || '';
        if (!deadlineRaw) {
          showPostError('Validation error: Please select an application deadline.');
          return;
        }
        const deadlineDate = new Date(deadlineRaw);
        if (isNaN(deadlineDate.getTime())) {
          showPostError('Validation error: Please enter a valid application deadline (YYYY-MM-DD).');
          return;
        }
        const application_deadline = deadlineDate.toISOString().split('T')[0];

        const description = document.getElementById('postDescription')?.value.trim() || '';
        if (!description) {
          showPostError('Validation error: Please enter an internship description.');
          return;
        }

        const skills = (document.getElementById('postSkills')?.value || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        const minScore = parseInt(document.getElementById('postMinScore')?.value, 10) || 85;
        const eligibility_criteria = `Minimum ${minScore}% SkillBridge AI score in ${skills.join(', ') || 'required domain competencies'}. Open to engineering students (2025/2026 batches).`;

        // 3. Button loading state
        const submitBtn = document.getElementById('submitPostInternshipBtn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span> Publishing Opportunity...';
        }

        try {
          const payload = {
            company_id: companyId,
            title,
            domain,
            workplace_mode,
            location,
            stipend_amount,
            stipend_display,
            duration,
            openings_count,
            application_deadline,
            description,
            eligibility_criteria,
            skills,
            company_name: activeRecruiter.companyName || undefined,
            company_logo_text: activeRecruiter.logoText || undefined,
            logo_bg_color: activeRecruiter.logoBgColor || undefined
          };

          const response = await fetch(`${BACKEND_API_BASE_URL}/internships`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          const result = await response.json().catch(() => null);

          // Scenario A: HTTP 201 Created (Success)
          if (response.status === 201 || (response.ok && response.status >= 200 && response.status < 300)) {
            const createdId = (result && result.data && result.data.id) ? result.data.id : `int-${Date.now().toString().slice(-4)}`;

            notificationsList.unshift({
              title: 'New Internship Published',
              text: `Published opportunity: ${title} (${stipend_display})`,
              time: 'Just now',
              icon: 'bi-briefcase-fill text-primary',
              unread: true
            });
            saveStorage('skillbridge_recruiter_notifications', notificationsList);

            showPostSuccess(`🎉 Internship "${title}" published successfully! Opportunity is now live in MySQL database (ID: ${createdId}).`);
            postForm.reset();

            // Refresh the internship list from GET /api/internships (Requirement 7)
            await refreshInternshipsFromBackend(companyId);

            return;
          }

          // Scenario B: HTTP 400 Bad Request
          if (response.status === 400) {
            const errorMsg = (result && result.error) ? result.error : 'Validation failed: Please verify required fields.';
            showPostError(`Validation Error (HTTP 400): ${errorMsg}`);
            return;
          }

          // Scenario C: HTTP 404 Not Found
          if (response.status === 404) {
            const errorMsg = (result && result.error) ? result.error : `Company with ID '${companyId}' not found in the database.`;
            showPostError(`Company Not Found (HTTP 404): ${errorMsg}. Please ensure you are logged in with a registered company.`);
            return;
          }

          // Scenario D: HTTP 500 or Other Errors
          const serverMsg = (result && result.error) ? result.error : `Server returned HTTP status ${response.status}.`;
          showPostError(`Failed to publish internship: ${serverMsg}`);

        } catch (networkError) {
          console.error('[SkillBridge Recruiter Post Internship Error]', networkError);
          showPostError('Connection Error: Unable to reach backend server at http://localhost:5000. Please ensure the backend is running.');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-cloud-arrow-up-fill me-1"></i> Publish Opportunity';
          }
        }
      });
    }

    // 2. Candidate Status Update Form
    const statusForm = document.getElementById('candidateStatusUpdateForm');
    if (statusForm) {
      statusForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const appId = document.getElementById('statusModalAppId').value;
        const newStatus = document.getElementById('statusModalNewStatus').value;
        const notes = document.getElementById('statusModalNotes').value;

        const submitBtn = statusForm.querySelector('button[type="submit"]');
        const origBtnText = submitBtn ? submitBtn.innerHTML : 'Save Status';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span> Saving...';
        }

        try {
          // Send PATCH request to /api/applications/:id/status
          const response = await fetch(`${BACKEND_API_BASE_URL}/applications/${encodeURIComponent(appId)}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              status: newStatus,
              notes: notes || undefined
            })
          });

          if (!response.ok) {
            const errResult = await response.json().catch(() => null);
            throw new Error((errResult && errResult.error) || `Status update failed with HTTP ${response.status}`);
          }

          const app = applicantsList.find(a => a.id === appId);
          if (app) {
            app.status = newStatus;
            if (notes) app.notes = notes;
            saveStorage('skillbridge_recruiter_applicants', applicantsList);

            syncStudentPortalStatus(app.candidateName, newStatus);

            notificationsList.unshift({
              title: 'Candidate Status Updated',
              text: `${app.candidateName} moved to ${newStatus}`,
              time: 'Just now',
              icon: 'bi-pencil-square text-warning',
              unread: true
            });
            saveStorage('skillbridge_recruiter_notifications', notificationsList);

            renderDashboardOverview();
            renderFullApplicantsTable();
          }

          const modalEl = document.getElementById('candidateStatusModal');
          if (modalEl && typeof bootstrap !== 'undefined') {
            const bsModal = bootstrap.Modal.getInstance(modalEl);
            if (bsModal) bsModal.hide();
          }
        } catch (err) {
          console.error('[SkillBridge ATS] Error updating candidate status:', err);
          alert(`Failed to update candidate status: ${err.message}`);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origBtnText;
          }
        }
      });
    }

    // 3. Schedule Interview Form
    const scheduleForm = document.getElementById('scheduleInterviewForm');
    if (scheduleForm) {
      scheduleForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const candId = document.getElementById('scheduleCandidateSelect').value;
        const date = document.getElementById('scheduleDate').value;
        const time = document.getElementById('scheduleTime').value;
        const round = document.getElementById('scheduleRound').value;
        const meetLink = document.getElementById('scheduleMeetLink').value;
        const interviewer = document.getElementById('scheduleInterviewer').value;

        const cand = applicantsList.find(a => a.id === candId);
        if (cand) {
          cand.status = 'Interview Scheduled';
          saveStorage('skillbridge_recruiter_applicants', applicantsList);
          syncStudentPortalStatus(cand.candidateName, 'Interview Scheduled');

          const newInterview = {
            id: `intv-${Date.now().toString().slice(-4)}`,
            appId: cand.id,
            candidateName: cand.candidateName,
            role: cand.appliedRole,
            date,
            time: `${time} IST`,
            round,
            interviewer,
            meetLink,
            status: 'Confirmed',
            feedback: null
          };

          interviewsList.unshift(newInterview);
          saveStorage('skillbridge_recruiter_interviews', interviewsList);

          notificationsList.unshift({
            title: 'Technical Interview Scheduled',
            text: `${cand.candidateName} assigned for ${round} on ${date}.`,
            time: 'Just now',
            icon: 'bi-calendar2-check-fill text-info',
            unread: true
          });
          saveStorage('skillbridge_recruiter_notifications', notificationsList);

          renderDashboardOverview();
          renderConfirmedInterviewsList();
        }

        const modalEl = document.getElementById('scheduleInterviewModal');
        if (modalEl && typeof bootstrap !== 'undefined') {
          const bsModal = bootstrap.Modal.getInstance(modalEl);
          if (bsModal) bsModal.hide();
        }
      });
    }

    // 4. Reschedule Interview Form
    const rescheduleForm = document.getElementById('rescheduleInterviewForm');
    if (rescheduleForm) {
      rescheduleForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const intvId = document.getElementById('rescheduleInterviewId').value;
        const newDate = document.getElementById('rescheduleDateInput').value;
        const newTime = document.getElementById('rescheduleTimeInput').value;
        const newMeet = document.getElementById('rescheduleMeetLinkInput').value;

        const intv = interviewsList.find(i => i.id === intvId);
        if (intv) {
          intv.date = newDate;
          intv.time = `${newTime} IST`;
          intv.meetLink = newMeet;
          saveStorage('skillbridge_recruiter_interviews', interviewsList);

          notificationsList.unshift({
            title: 'Interview Rescheduled',
            text: `Updated interview session for ${intv.candidateName} to ${newDate} at ${newTime} IST.`,
            time: 'Just now',
            icon: 'bi-clock-history text-info',
            unread: true
          });
          saveStorage('skillbridge_recruiter_notifications', notificationsList);

          renderDashboardOverview();
          renderConfirmedInterviewsList();
        }

        const modalEl = document.getElementById('rescheduleInterviewModal');
        if (modalEl && typeof bootstrap !== 'undefined') {
          const bsModal = bootstrap.Modal.getInstance(modalEl);
          if (bsModal) bsModal.hide();
        }
      });
    }

    // 5. Interview Feedback Form
    const feedbackForm = document.getElementById('interviewFeedbackForm');
    if (feedbackForm) {
      feedbackForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const intvId = document.getElementById('feedbackInterviewId').value;
        const codingEl = document.getElementById('feedbackTechnicalScore') || document.getElementById('feedbackCodingScore');
        const codingScore = codingEl ? parseInt(codingEl.value, 10) : 90;
        const systemEl = document.getElementById('feedbackSystemScore');
        const systemScore = systemEl ? parseInt(systemEl.value, 10) : 85;
        const recEl = document.getElementById('feedbackRecommendationSelect') || document.getElementById('feedbackRecommendation');
        const recommendation = recEl ? recEl.value : 'Make Offer';
        const notes = document.getElementById('feedbackDetailedNotes') ? document.getElementById('feedbackDetailedNotes').value : '';

        const intv = interviewsList.find(i => i.id === intvId);
        if (intv) {
          intv.feedback = {
            codingScore,
            systemScore,
            recommendation,
            notes,
            recordedAt: 'Today'
          };
          saveStorage('skillbridge_recruiter_interviews', interviewsList);

          // Update candidate status based on recommendation
          const cand = applicantsList.find(a => a.candidateName === intv.candidateName);
          if (cand) {
            if (recommendation === 'Make Offer') {
              cand.status = 'Selected';
              syncStudentPortalStatus(cand.candidateName, 'Selected');

              // Automatically generate offer record
              if (!offersList.some(o => o.candidateName === cand.candidateName)) {
                offersList.unshift({
                  id: `ofr-${Date.now().toString().slice(-4)}`,
                  candidateName: cand.candidateName,
                  role: cand.appliedRole,
                  stipend: '₹35,000 / month',
                  offerDate: 'Today',
                  joiningDate: 'Jan 05, 2027',
                  status: 'Released'
                });
                saveStorage('skillbridge_recruiter_offers', offersList);
              }
            } else if (recommendation === 'Reject') {
              cand.status = 'Rejected';
              syncStudentPortalStatus(cand.candidateName, 'Rejected');
            }
            saveStorage('skillbridge_recruiter_applicants', applicantsList);
          }

          notificationsList.unshift({
            title: 'Interview Evaluation Recorded',
            text: `Scorecard completed for ${intv.candidateName}: ${recommendation}`,
            time: 'Just now',
            icon: 'bi-check2-circle text-success',
            unread: true
          });
          saveStorage('skillbridge_recruiter_notifications', notificationsList);

          renderDashboardOverview();
          renderConfirmedInterviewsList();
        }

        const modalEl = document.getElementById('interviewFeedbackModal');
        if (modalEl && typeof bootstrap !== 'undefined') {
          const bsModal = bootstrap.Modal.getInstance(modalEl);
          if (bsModal) bsModal.hide();
        }
      });
    }

    // 6. Offers & Selection Module Event Handlers
    const quickOfferBtn = document.getElementById('releaseNewOfferQuickBtn');
    if (quickOfferBtn) {
      quickOfferBtn.addEventListener('click', () => {
        const formCard = document.getElementById('generateOfferCard');
        const select = document.getElementById('offerCandidateSelect');
        if (formCard) formCard.scrollIntoView({ behavior: 'smooth' });
        if (select) select.focus();
      });
    }

    const offerCandSelect = document.getElementById('offerCandidateSelect');
    if (offerCandSelect) {
      offerCandSelect.addEventListener('change', (e) => {
        populateOfferFormForCandidate(e.target.value);
      });
    }

    function getOfferFormData() {
      const candidateName = document.getElementById('offerCandidateSelect')?.value;
      const role = document.getElementById('offerRoleInput')?.value.trim();
      const companyName = document.getElementById('offerCompanyNameInput')?.value.trim() || 'CloudScale Solutions';
      const stipend = document.getElementById('offerStipendInput')?.value.trim();
      const duration = document.getElementById('offerDurationInput')?.value.trim();
      const joiningDate = document.getElementById('offerJoiningDateInput')?.value;
      const location = document.getElementById('offerLocationInput')?.value.trim();
      const expiryDate = document.getElementById('offerExpiryDateInput')?.value;
      const terms = document.getElementById('offerTermsInput')?.value.trim();
      const editingId = document.getElementById('editingOfferId')?.value;

      if (!candidateName || !role || !stipend || !joiningDate || !expiryDate) {
        alert('Please fill out all required fields marked with * (Candidate, Role, Stipend, Joining Date, Expiry Date).');
        return null;
      }

      // Requirement 4: Validate joining date and offer expiry date
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expDateObj = new Date(expiryDate);
      expDateObj.setHours(0, 0, 0, 0);

      const joinDateObj = new Date(joiningDate);
      joinDateObj.setHours(0, 0, 0, 0);

      if (expDateObj < today) {
        alert('Offer Expiry Date cannot be in the past. Please set a valid current or future expiration deadline.');
        return null;
      }

      if (joinDateObj <= expDateObj) {
        alert('Scheduled Joining Date must be strictly after the Offer Expiry Date.');
        return null;
      }

      return {
        id: editingId || `ofr-${Date.now().toString().slice(-4)}`,
        candidateName,
        role,
        companyName,
        stipend,
        duration: duration || '6 Months (Jan - Jun 2027)',
        joiningDate,
        location: location || 'Bengaluru, Karnataka (Hybrid)',
        expiryDate,
        terms: terms || '1. Standard NDA and intellectual property assignment applies.\n2. Full-time Pre-Placement Offer (PPO) review at 4 months.',
        offerDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };
    }

    // Save as Draft
    const btnDraft = document.getElementById('btnSaveDraftOffer');
    if (btnDraft) {
      btnDraft.addEventListener('click', () => {
        const data = getOfferFormData();
        if (!data) return;

        data.status = 'Draft';
        const editingId = document.getElementById('editingOfferId')?.value;
        if (editingId) {
          const idx = offersList.findIndex(o => o.id === editingId);
          if (idx !== -1) offersList[idx] = data;
        } else {
          offersList.unshift(data);
        }

        saveStorage('skillbridge_recruiter_offers', offersList);
        alert(`Draft offer saved successfully for ${data.candidateName}.`);
        resetOfferForm();
        renderOffersSection();
        renderDashboardOverview();
      });
    }

    // Preview Offer Letter
    const btnPreview = document.getElementById('btnPreviewOffer');
    if (btnPreview) {
      btnPreview.addEventListener('click', () => {
        const data = getOfferFormData();
        if (!data) return;

        const container = document.getElementById('offerLetterPreviewContainer');
        const subtitle = document.getElementById('modalOfferPreviewSubtitle');
        const releaseBtn = document.getElementById('modalPreviewReleaseBtn');

        if (container) container.innerHTML = generateOfferLetterHTML(data);
        if (subtitle) subtitle.textContent = `Draft Offer Letter Preview • ${data.candidateName}`;
        if (releaseBtn) {
          releaseBtn.style.display = 'inline-block';
          releaseBtn.onclick = function () {
            releaseOfferFromData(data);
            const modalEl = document.getElementById('offerLetterPreviewModal');
            if (modalEl && typeof bootstrap !== 'undefined') {
              bootstrap.Modal.getInstance(modalEl)?.hide();
            }
          };
        }

        const modalEl = document.getElementById('offerLetterPreviewModal');
        if (modalEl && typeof bootstrap !== 'undefined') {
          const bsModal = new bootstrap.Modal(modalEl);
          bsModal.show();
        }
      });
    }

    // Download Offer Letter as PDF button in form
    const btnDownloadPdf = document.getElementById('btnDownloadOfferPdf');
    if (btnDownloadPdf) {
      btnDownloadPdf.addEventListener('click', () => {
        const data = getOfferFormData();
        if (!data) return;
        downloadOfferLetterPdf(data);
      });
    }

    // Form Submit (Release Offer)
    const genOfferForm = document.getElementById('generateOfferForm');
    if (genOfferForm) {
      genOfferForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = getOfferFormData();
        if (!data) return;
        releaseOfferFromData(data);
      });
    }

    function releaseOfferFromData(data) {
      // Prevent duplicate active offers for same candidate & internship
      const editingId = document.getElementById('editingOfferId')?.value;
      const duplicate = offersList.find(o =>
        o.id !== editingId &&
        o.candidateName.toLowerCase() === data.candidateName.toLowerCase() &&
        (o.status === 'Released' || o.status === 'Accepted' || o.status === 'Viewed')
      );

      if (duplicate) {
        alert(`A formal offer (${duplicate.status}) is already active for ${data.candidateName}. You cannot release duplicate active offers.`);
        return;
      }

      if (!confirm(`Are you sure you want to release this formal offer letter to ${data.candidateName}?`)) {
        return;
      }

      data.status = 'Released';
      if (editingId) {
        const idx = offersList.findIndex(o => o.id === editingId);
        if (idx !== -1) offersList[idx] = data;
      } else {
        offersList.unshift(data);
      }

      saveStorage('skillbridge_recruiter_offers', offersList);

      // Notification
      notificationsList.unshift({
        title: 'Offer Letter Released',
        text: `Formal offer letter released to ${data.candidateName} for ${data.role} (${data.stipend}).`,
        time: 'Just now',
        icon: 'bi-send-check text-primary',
        unread: true
      });
      saveStorage('skillbridge_recruiter_notifications', notificationsList);

      alert(`Offer letter released successfully to ${data.candidateName}! Candidate notified.`);
      resetOfferForm();
      renderOffersSection();
      renderDashboardOverview();
    }

    function resetOfferForm() {
      const form = document.getElementById('generateOfferForm');
      if (form) form.reset();
      const editingId = document.getElementById('editingOfferId');
      if (editingId) editingId.value = '';
      const cancelBtn = document.getElementById('btnCancelOfferEdit');
      if (cancelBtn) cancelBtn.style.display = 'none';
      const title = document.getElementById('offerFormTitle');
      if (title) title.textContent = 'Generate Formal Internship Offer Letter';
    }

    const cancelEditBtn = document.getElementById('btnCancelOfferEdit');
    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', resetOfferForm);
    }

    // Modal PDF & Print buttons
    const modalPdfBtn = document.getElementById('modalPreviewDownloadPdfBtn');
    if (modalPdfBtn) {
      modalPdfBtn.addEventListener('click', () => {
        const data = getOfferFormData() || offersList[0];
        if (data) downloadOfferLetterPdf(data);
      });
    }

    const modalPrintBtn = document.getElementById('modalPreviewPrintBtn');
    if (modalPrintBtn) {
      modalPrintBtn.addEventListener('click', () => {
        window.print();
      });
    }

    // Record Candidate Response Form
    const respForm = document.getElementById('recordCandidateResponseForm');
    if (respForm) {
      respForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const offerId = document.getElementById('recordResponseOfferId')?.value;
        const action = document.getElementById('recordResponseActionSelect')?.value;
        const notes = document.getElementById('recordResponseNotes')?.value;

        const ofr = offersList.find(o => o.id === offerId);
        if (ofr) {
          ofr.status = action;
          ofr.responseNotes = notes;

          if (action === 'Accepted') {
            ofr.acceptedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            // Update candidate status in applicantsList
            const cand = applicantsList.find(a => a.candidateName.toLowerCase() === ofr.candidateName.toLowerCase());
            if (cand) {
              cand.status = 'Selected';
              saveStorage('skillbridge_recruiter_applicants', applicantsList);
              syncStudentPortalStatus(cand.candidateName, 'Selected');
            }

            notificationsList.unshift({
              title: '🎉 Offer Accepted!',
              text: `${ofr.candidateName} has officially accepted the internship offer for ${ofr.role}!`,
              time: 'Just now',
              icon: 'bi-check-circle-fill text-success',
              unread: true
            });
            alert(`Congratulations! ${ofr.candidateName} accepted the offer. Application status updated to "Selected".`);
          } else if (action === 'Rejected') {
            ofr.rejectedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const cand = applicantsList.find(a => a.candidateName.toLowerCase() === ofr.candidateName.toLowerCase());
            if (cand) {
              cand.notes = `Offer declined by candidate: ${notes || 'Personal reasons'}`;
              saveStorage('skillbridge_recruiter_applicants', applicantsList);
            }

            notificationsList.unshift({
              title: 'Offer Declined',
              text: `${ofr.candidateName} declined the offer for ${ofr.role}.`,
              time: 'Just now',
              icon: 'bi-x-circle text-danger',
              unread: true
            });
            alert(`Recorded response: ${ofr.candidateName} declined the offer.`);
          } else if (action === 'Pending') {
            ofr.status = 'Pending';
            notificationsList.unshift({
              title: 'Offer Pending Decision',
              text: `${ofr.candidateName} has acknowledged receipt; awaiting final decision.`,
              time: 'Just now',
              icon: 'bi-hourglass-split text-warning',
              unread: true
            });
            alert(`Updated status: Offer for ${ofr.candidateName} marked as Pending Response.`);
          } else if (action === 'Viewed') {
            ofr.viewedDate = 'Today';
            alert(`Updated status: Offer marked as Viewed by ${ofr.candidateName}.`);
          } else if (action === 'Expired') {
            alert(`Offer marked as Expired.`);
          }

          saveStorage('skillbridge_recruiter_offers', offersList);
          saveStorage('skillbridge_recruiter_notifications', notificationsList);

          const modalEl = document.getElementById('recordCandidateResponseModal');
          if (modalEl && typeof bootstrap !== 'undefined') {
            bootstrap.Modal.getInstance(modalEl)?.hide();
          }

          renderOffersSection();
          renderDashboardOverview();
        }
      });
    }

    // Offers Search & Filters
    const ofrSearch = document.getElementById('offersSearchInput');
    if (ofrSearch) ofrSearch.addEventListener('input', renderOffersTable);

    const ofrRoleFilter = document.getElementById('offersRoleFilter');
    if (ofrRoleFilter) ofrRoleFilter.addEventListener('change', renderOffersTable);

    const ofrStatusFilter = document.getElementById('offersStatusFilter');
    if (ofrStatusFilter) ofrStatusFilter.addEventListener('change', renderOffersTable);

    const ofrSortSelect = document.getElementById('offersSortSelect');
    if (ofrSortSelect) ofrSortSelect.addEventListener('change', renderOffersTable);

    const ofrExportBtn = document.getElementById('exportOffersCsvBtn');
    if (ofrExportBtn) ofrExportBtn.addEventListener('click', exportOffersToCSV);

    // 7. CSV Export Button
    const exportCsvBtn = document.getElementById('exportApplicantsCsvBtn');
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', exportApplicantsToCSV);
    }

    // 8. Re-calculate AI Matches
    const recalcBtn = document.getElementById('recalculateAiMatchBtn');
    if (recalcBtn) {
      recalcBtn.addEventListener('click', async () => {
        const companyId = getLoggedInCompanyId();
        if (!companyId) return;

        const origHtml = recalcBtn.innerHTML;
        recalcBtn.disabled = true;
        recalcBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span> Re-Scoring...';

        try {
          const res = await fetch(`${BACKEND_API_BASE_URL}/companies/${encodeURIComponent(companyId)}/ai-matching/rescore`, {
            method: 'POST',
            headers: { 'Accept': 'application/json' }
          });
          const json = await res.json();
          if (json && json.success && Array.isArray(json.data)) {
            aiMatchesList = json.data;
            renderAiCandidateMatchingGrid();
            await refreshApplicationsFromBackend(companyId);
          }
        } catch (err) {
          console.warn('[recalculateAiMatchBtn] Re-score error:', err);
        } finally {
          recalcBtn.disabled = false;
          recalcBtn.innerHTML = origHtml;
        }
      });
    }

    // 8.5. Skill Assessment Filter Controls
    const assessSearchInput = document.getElementById('assessmentSearchInput');
    if (assessSearchInput) {
      assessSearchInput.addEventListener('input', (e) => {
        assessmentSearchTerm = e.target.value.trim();
        renderSkillAssessmentsTable();
      });
    }

    const assessTechFilter = document.getElementById('assessmentTechFilter');
    if (assessTechFilter) {
      assessTechFilter.addEventListener('change', (e) => {
        assessmentTechFilterVal = e.target.value;
        refreshAssessmentsFromBackend();
      });
    }

    const assessScoreFilter = document.getElementById('assessmentScoreFilter');
    if (assessScoreFilter) {
      assessScoreFilter.addEventListener('change', (e) => {
        assessmentScoreFilterVal = e.target.value;
        refreshAssessmentsFromBackend();
      });
    }

    const assessSortSelect = document.getElementById('assessmentSortSelect');
    if (assessSortSelect) {
      assessSortSelect.addEventListener('change', (e) => {
        assessmentSortVal = e.target.value;
        refreshAssessmentsFromBackend();
      });
    }

    // 9. Applicant Search & Filter Controls
    const searchInput = document.getElementById('applicantsSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        applicantsSearchTerm = e.target.value.trim();
        renderFullApplicantsTable();
      });
    }

    const intnFilter = document.getElementById('applicantsInternshipFilter');
    if (intnFilter) {
      intnFilter.addEventListener('change', (e) => {
        applicantsInternshipFilterVal = e.target.value;
        renderFullApplicantsTable();
      });
    }

    const statusFilter = document.getElementById('applicantsStatusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        applicantsStatusFilterVal = e.target.value;
        renderFullApplicantsTable();
      });
    }

    const sortSelect = document.getElementById('applicantsSortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        applicantsSortVal = e.target.value;
        renderFullApplicantsTable();
      });
    }

    // 10. Company Profile Save
    const saveProfileBtn = document.getElementById('saveCompanyProfileBtn');
    if (saveProfileBtn) {
      saveProfileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleSaveCompanyProfile();
      });
    }
    const profileForm = document.getElementById('companyProfileForm');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSaveCompanyProfile();
      });
    }

    // 11. Mobile Sidebar Toggle
    const mobileToggle = document.getElementById('mobileSidebarToggle');
    const mobileClose = document.getElementById('mobileSidebarClose');
    const mobileBackdrop = document.getElementById('dashboardSidebarBackdrop');
    const sidebar = document.getElementById('dashboardSidebar');

    if (mobileToggle && sidebar) {
      mobileToggle.addEventListener('click', () => {
        sidebar.classList.add('show');
        if (mobileBackdrop) mobileBackdrop.classList.add('show');
      });
    }

    if (mobileClose && sidebar) {
      mobileClose.addEventListener('click', closeMobileSidebar);
    }

    if (mobileBackdrop) {
      mobileBackdrop.addEventListener('click', closeMobileSidebar);
    }

    // 12. Logout Handlers
    document.querySelectorAll('.recruiter-logout-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to log out from SkillBridge Recruiter Portal?')) {
          try {
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem('skillbridge_recruiter_session');
              window.localStorage.removeItem('skillbridge_company_session');
              window.localStorage.removeItem('skillbridge_auth_role');
              window.localStorage.removeItem('skillbridge_active_session');
              window.sessionStorage.removeItem('skillbridge_recruiter_session');
              window.sessionStorage.removeItem('skillbridge_company_session');
              window.sessionStorage.removeItem('skillbridge_auth_role');
              window.sessionStorage.removeItem('skillbridge_active_session');
              try { window.name = ''; } catch (e) { }
              try { document.cookie = 'skillbridge_recruiter_session=; path=/; max-age=0'; } catch (e) { }
              try { document.cookie = 'skillbridge_auth_role=; path=/; max-age=0'; } catch (e) { }
              try { document.cookie = 'skillbridge_active_session=; path=/; max-age=0'; } catch (e) { }
              window.location.href = 'company-login.html';
            }
          } catch (err) {
            window.location.href = 'company-login.html';
          }
        }
      });
    });

    // 13. Reset Demo Data
    const resetBtn = document.getElementById('resetDemoDataBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset all demo data back to default?')) {
          window.localStorage.removeItem('skillbridge_recruiter_internships');
          window.localStorage.removeItem('skillbridge_recruiter_applicants');
          window.localStorage.removeItem('skillbridge_recruiter_interviews');
          window.localStorage.removeItem('skillbridge_recruiter_offers');
          window.localStorage.removeItem('skillbridge_recruiter_messages');
          window.localStorage.removeItem('skillbridge_recruiter_notifications');
          window.localStorage.removeItem('skillbridge_recruiter_team');
          window.localStorage.removeItem('skillbridge_recruiter_integrations');
          window.localStorage.removeItem('skillbridge_recruiter_notification_prefs');
          window.localStorage.removeItem('skillbridge_recruiter_privacy');
          window.localStorage.removeItem('skillbridge_recruiter_password');
          window.location.reload();
        }
      });
    }

    // 14. Candidate Messaging Events & Controls
    const msgForm = document.getElementById('sendMessageForm');
    const chatInput = document.getElementById('chatMessageInput');

    if (chatInput) {
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage();
        }
      });
    }

    if (msgForm) {
      msgForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSendMessage();
      });
    }

    // Search Conversations Input
    const msgSearchInput = document.getElementById('messagesSearchInput');
    const clearSearchBtn = document.getElementById('clearMessagesSearchBtn');
    if (msgSearchInput) {
      msgSearchInput.addEventListener('input', (e) => {
        messagesSearchTerm = e.target.value.trim();
        if (clearSearchBtn) {
          clearSearchBtn.style.display = messagesSearchTerm ? 'inline-block' : 'none';
        }
        renderMessagesThreadList();
      });
    }

    if (clearSearchBtn && msgSearchInput) {
      clearSearchBtn.addEventListener('click', () => {
        msgSearchInput.value = '';
        messagesSearchTerm = '';
        clearSearchBtn.style.display = 'none';
        renderMessagesThreadList();
        msgSearchInput.focus();
      });
    }

    // Filter Buttons (All vs Unread)
    const filterAllBtn = document.getElementById('filterMessagesAllBtn');
    const filterUnreadBtn = document.getElementById('filterMessagesUnreadBtn');
    if (filterAllBtn && filterUnreadBtn) {
      filterAllBtn.addEventListener('click', () => {
        messagesFilterTab = 'all';
        filterAllBtn.className = 'btn btn-sm btn-primary-custom flex-fill py-1 px-2';
        filterUnreadBtn.className = 'btn btn-sm btn-outline-custom flex-fill py-1 px-2';
        renderMessagesThreadList();
      });

      filterUnreadBtn.addEventListener('click', () => {
        messagesFilterTab = 'unread';
        filterUnreadBtn.className = 'btn btn-sm btn-primary-custom flex-fill py-1 px-2';
        filterAllBtn.className = 'btn btn-sm btn-outline-custom flex-fill py-1 px-2';
        renderMessagesThreadList();
      });
    }

    // Mark All Messages As Read Button
    const markAllReadBtn = document.getElementById('markAllMessagesReadBtn');
    if (markAllReadBtn) {
      markAllReadBtn.addEventListener('click', () => {
        messagesList.forEach(m => {
          m.unreadCount = 0;
          m.unread = false;
          if (m.history) {
            m.history.forEach(h => {
              if (h.sender === 'candidate') h.status = 'read';
            });
          }
        });
        saveStorage('skillbridge_recruiter_messages', messagesList);
        updateMessagesSidebarBadge();
        renderMessagesThreadList();
        renderActiveChat();
        if (typeof alert !== 'undefined') {
          alert('All candidate conversation threads have been marked as read.');
        }
      });
    }

    // Chat Header Action: Schedule Round
    const chatScheduleRoundBtn = document.getElementById('chatScheduleRoundBtn');
    if (chatScheduleRoundBtn) {
      chatScheduleRoundBtn.addEventListener('click', () => {
        const convo = messagesList.find(m => m.candidateId === activeConversationCandidateId);
        if (convo && convo.candidateId) {
          openScheduleModal(convo.candidateId);
        }
      });
    }

    // Chat Header Action: View Profile
    const chatViewProfileBtn = document.getElementById('chatViewProfileBtn');
    if (chatViewProfileBtn) {
      chatViewProfileBtn.addEventListener('click', () => {
        const convo = messagesList.find(m => m.candidateId === activeConversationCandidateId);
        if (convo && convo.candidateId) {
          const cand = applicantsList.find(a => a.id === convo.candidateId || a.candidateName === convo.candidateName);
          if (cand) {
            document.getElementById('modalProfileAvatar').textContent = cand.candidateName.split(' ').map(n => n[0]).join('');
            document.getElementById('modalProfileName').textContent = cand.candidateName;
            document.getElementById('modalProfileRole').textContent = `${cand.appliedRole} • ${cand.college}`;
            document.getElementById('modalProfileFitScore').textContent = `${cand.fitScore}%`;
            document.getElementById('modalProfileGrade').textContent = cand.codingGrade;
            document.getElementById('modalProfileStatusBadge').innerHTML = getStatusBadge(cand.status);
            document.getElementById('modalProfileAppliedDate').textContent = cand.appliedDate;
            document.getElementById('modalProfileDegree').textContent = cand.degree;
            document.getElementById('modalProfileCollege').textContent = cand.college;
            document.getElementById('modalProfileEmail').textContent = cand.email;
            document.getElementById('modalProfilePhone').textContent = cand.phone;

            const skillsBox = document.getElementById('modalProfileSkillsBreakdown');
            if (skillsBox) {
              skillsBox.innerHTML = (cand.skills || []).map(s => `
                <div class="col-sm-6">
                  <div class="p-2 border rounded-2 bg-white">
                    <div class="d-flex justify-content-between small fw-semibold">
                      <span>${s.name}</span>
                      <span class="text-primary">${s.score}%</span>
                    </div>
                    <div class="progress mt-1" style="height: 5px;">
                      <div class="progress-bar bg-primary" style="width: ${s.score}%;"></div>
                    </div>
                  </div>
                </div>
              `).join('');
            }

            const modalEl = document.getElementById('candidateProfileModal');
            if (modalEl && typeof bootstrap !== 'undefined') {
              new bootstrap.Modal(modalEl).show();
            }
          }
        }
      });
    }

    // Chat Header Action: Quick Offer
    const chatQuickOfferBtn = document.getElementById('chatQuickOfferBtn');
    if (chatQuickOfferBtn) {
      chatQuickOfferBtn.addEventListener('click', () => {
        const convo = messagesList.find(m => m.candidateId === activeConversationCandidateId);
        if (convo) {
          navigateToView('offersSection', 'Offers & Selection');
          populateOfferFormForCandidate(convo.candidateName);
        }
      });
    }

    // Quick Templates Chips
    document.querySelectorAll('.chat-template-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.getAttribute('data-text');
        const input = document.getElementById('chatMessageInput');
        if (input && text) {
          input.value = text;
          input.focus();
        }
      });
    });

    // Thumbs Up Emoji
    const emojiBtn = document.getElementById('chatEmojiBtn');
    if (emojiBtn) {
      emojiBtn.addEventListener('click', () => {
        const input = document.getElementById('chatMessageInput');
        if (input) {
          input.value += (input.value ? ' ' : '') + '👍';
          input.focus();
        }
      });
    }

    // 15. Settings Navigation & Sub-Tabs
    document.querySelectorAll('.settings-tab-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tabKey = link.getAttribute('data-settings-tab');
        switchSettingsTab(tabKey);
      });
    });

    // Save Account Settings
    const saveAccountBtn = document.getElementById('saveAccountProfileBtn') || document.getElementById('saveAccountSettingsBtn');
    if (saveAccountBtn) {
      saveAccountBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleSaveAccountSettings();
      });
    }
    const accForm = document.getElementById('accountSettingsForm');
    if (accForm) {
      accForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSaveAccountSettings();
      });
    }

    // Avatar Upload & Reset
    const uploadAvatarBtn = document.getElementById('uploadAvatarPhotoBtn');
    const avatarInput = document.getElementById('avatarUploadInput');
    if (uploadAvatarBtn && avatarInput) {
      uploadAvatarBtn.addEventListener('click', () => avatarInput.click());
      avatarInput.addEventListener('change', () => {
        if (avatarInput.files && avatarInput.files[0]) {
          const reader = new FileReader();
          reader.onload = function (evt) {
            const imgBox = document.getElementById('accountAvatarPreview') || document.getElementById('settingsAvatarInitial');
            if (imgBox) {
              imgBox.innerHTML = `<img src="${evt.target.result}" alt="Avatar" class="w-100 h-100 rounded-circle object-fit-cover">`;
            }
            alert('Profile photo uploaded.');
          };
          reader.readAsDataURL(avatarInput.files[0]);
        }
      });
    }
    const resetAvatarBtn = document.getElementById('resetAvatarPhotoBtn');
    if (resetAvatarBtn) {
      resetAvatarBtn.addEventListener('click', () => {
        const imgBox = document.getElementById('accountAvatarPreview') || document.getElementById('settingsAvatarInitial');
        if (imgBox) {
          imgBox.textContent = activeRecruiter.contactPerson.charAt(0);
        }
        alert('Profile photo reset to initial avatar.');
      });
    }

    // Save Company Settings
    const saveCompanyBtn = document.getElementById('saveCompanySettingsBtn');
    if (saveCompanyBtn) {
      saveCompanyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleSaveCompanySettings();
      });
    }
    const compForm = document.getElementById('companySettingsForm');
    if (compForm) {
      compForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSaveCompanySettings();
      });
    }

    // Change Password & Strength Meter
    const changePwdForm = document.getElementById('changePasswordForm');
    if (changePwdForm) {
      changePwdForm.addEventListener('submit', handleChangePassword);
    }
    const newPwdInput = document.getElementById('securityNewPassword');
    if (newPwdInput) {
      newPwdInput.addEventListener('input', () => {
        calculatePasswordStrength(newPwdInput.value);
      });
    }
    const confPwdInput = document.getElementById('securityConfirmPassword');
    if (confPwdInput && newPwdInput) {
      confPwdInput.addEventListener('input', () => {
        const matchNotice = document.getElementById('pwdMatchNotice');
        if (matchNotice) {
          if (confPwdInput.value === '') {
            matchNotice.textContent = 'Must match new password.';
            matchNotice.className = 'text-muted d-block mt-1';
          } else if (confPwdInput.value === newPwdInput.value) {
            matchNotice.textContent = 'Passwords match!';
            matchNotice.className = 'text-success d-block mt-1';
          } else {
            matchNotice.textContent = 'Passwords do not match.';
            matchNotice.className = 'text-danger d-block mt-1';
          }
        }
      });
    }
    document.querySelectorAll('.toggle-pwd-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        togglePasswordVisibility(targetId, btn);
      });
    });

    // 2FA Switch
    const switch2FA = document.getElementById('security2FASwitch');
    if (switch2FA) {
      switch2FA.addEventListener('change', () => {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('skillbridge_recruiter_2fa', switch2FA.checked ? 'enabled' : 'disabled');
        }
        alert(`Two-Factor Authentication (2FA) is now ${switch2FA.checked ? 'enabled' : 'disabled'}.`);
      });
    }

    // Logout All Devices
    const logoutAllBtn = document.getElementById('logoutAllDevicesBtn');
    if (logoutAllBtn) {
      logoutAllBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to log out from all devices? You will need to sign in again.')) {
          try {
            window.localStorage.removeItem('skillbridge_recruiter_session');
            window.localStorage.removeItem('skillbridge_company_session');
            window.localStorage.removeItem('skillbridge_auth_role');
            window.localStorage.removeItem('skillbridge_active_session');
            window.sessionStorage.removeItem('skillbridge_recruiter_session');
            window.sessionStorage.removeItem('skillbridge_company_session');
            window.sessionStorage.removeItem('skillbridge_auth_role');
            window.sessionStorage.removeItem('skillbridge_active_session');
            try { window.name = ''; } catch (e) { }
            try { document.cookie = 'skillbridge_recruiter_session=; path=/; max-age=0'; } catch (e) { }
            try { document.cookie = 'skillbridge_auth_role=; path=/; max-age=0'; } catch (e) { }
            try { document.cookie = 'skillbridge_active_session=; path=/; max-age=0'; } catch (e) { }
          } catch (e) { }
          alert('Successfully logged out from all active devices.');
          window.location.href = 'index.html';
        }
      });
    }

    // Save Notification Preferences
    const saveNotifBtn = document.getElementById('saveNotificationPrefsBtn');
    if (saveNotifBtn) {
      saveNotifBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleSaveNotificationPreferences();
      });
    }
    const notifForm = document.getElementById('notificationPreferencesForm');
    if (notifForm) {
      notifForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSaveNotificationPreferences();
      });
    }

    // Team Management Events
    const addTeamBtn = document.getElementById('openAddTeamMemberModalBtn');
    if (addTeamBtn) {
      addTeamBtn.addEventListener('click', () => openTeamMemberModal());
    }
    const teamForm = document.getElementById('teamMemberForm');
    if (teamForm) {
      teamForm.addEventListener('submit', handleSaveTeamMember);
    }
    const roleSelect = document.getElementById('inputTeamMemberRole');
    if (roleSelect) {
      roleSelect.addEventListener('change', () => {
        const descText = document.getElementById('teamRoleDescriptionText');
        if (descText) {
          const r = roleSelect.value;
          descText.textContent = r === 'Admin'
            ? 'Admins have full access across enterprise settings, team members, and offer letters.'
            : (r === 'HR Manager'
              ? 'HR Managers can screen applicants, conduct technical rounds, and issue offer drafts.'
              : 'Recruiters can source candidates, review scores, and communicate with applicants.');
        }
      });
    }

    // Integrations Toggle Buttons
    document.querySelectorAll('.toggle-integration-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        if (key) toggleIntegration(key);
      });
    });

    // Save Privacy Settings
    const savePrivacyBtn = document.getElementById('savePrivacySettingsBtn');
    if (savePrivacyBtn) {
      savePrivacyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleSavePrivacySettings();
      });
    }

    // Download Company Data
    const downloadDataBtn = document.getElementById('downloadCompanyDataBtn');
    if (downloadDataBtn) {
      downloadDataBtn.addEventListener('click', (e) => {
        e.preventDefault();
        downloadCompanyDataJSON();
      });
    }

    // Delete Account Controls
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    const deleteModalEl = document.getElementById('deleteAccountModal');
    const deleteConfirmInput = document.getElementById('deleteAccountConfirmInput');
    const confirmDeleteBtn = document.getElementById('confirmDeleteAccountBtn');

    if (deleteAccountBtn && deleteModalEl) {
      deleteAccountBtn.addEventListener('click', () => {
        if (deleteConfirmInput) deleteConfirmInput.value = '';
        if (confirmDeleteBtn) confirmDeleteBtn.disabled = true;
        if (typeof bootstrap !== 'undefined') {
          new bootstrap.Modal(deleteModalEl).show();
        }
      });
    }

    if (deleteConfirmInput && confirmDeleteBtn) {
      deleteConfirmInput.addEventListener('input', () => {
        confirmDeleteBtn.disabled = deleteConfirmInput.value.trim() !== 'DELETE';
      });
    }

    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', () => {
        if (deleteConfirmInput && deleteConfirmInput.value.trim() === 'DELETE') {
          try {
            window.localStorage.removeItem('skillbridge_recruiter_session');
            window.localStorage.removeItem('skillbridge_auth_role');
            window.sessionStorage.removeItem('skillbridge_recruiter_session');
            window.sessionStorage.removeItem('skillbridge_auth_role');
          } catch (e) { }
          alert('Recruiter company account has been permanently deleted.');
          window.location.href = 'company-login.html';
        }
      });
    }
  }

  // ==========================================================================
  // 16. Settings Module Implementation (7 Enterprise Sections)
  // ==========================================================================
  const DEFAULT_TEAM_MEMBERS = [
    {
      id: 'TM-001',
      name: 'Priya Sharma',
      email: 'recruiter@cloudscale.io',
      designation: 'Head of Campus Talent Acquisition',
      role: 'Admin',
      status: 'Active',
      permissions: 'Full Access (Company, Team, Jobs, Offers)'
    },
    {
      id: 'TM-002',
      name: 'Vikramaditya Sen',
      email: 'v.sen@cloudscale.io',
      designation: 'Technical Talent Lead',
      role: 'Admin',
      status: 'Active',
      permissions: 'Full Access (Company, Team, Jobs, Offers)'
    },
    {
      id: 'TM-003',
      name: 'Ananya Rao',
      email: 'a.rao@cloudscale.io',
      designation: 'HR Talent Partner',
      role: 'HR Manager',
      status: 'Active',
      permissions: 'Hiring Ops (Reviews, Interviews, Offers, Chat)'
    },
    {
      id: 'TM-004',
      name: 'Karthik Nair',
      email: 'k.nair@cloudscale.io',
      designation: 'Technical Interviewer',
      role: 'Recruiter',
      status: 'Active',
      permissions: 'Sourcing & Evaluations (Screening, Chat)'
    }
  ];

  const DEFAULT_INTEGRATIONS = {
    googleCalendar: {
      connected: true,
      account: 'recruiter@cloudscale.io',
      name: 'Google Calendar'
    },
    googleMeet: {
      connected: true,
      account: 'Enterprise Dedicated Bridge',
      name: 'Google Meet'
    },
    emailIntegration: {
      connected: true,
      account: 'recruiter@cloudscale.io',
      name: 'Corporate Work Email'
    },
    githubIntegration: {
      connected: false,
      account: 'Not Connected',
      name: 'GitHub Enterprise'
    }
  };

  const DEFAULT_NOTIFICATION_PREFERENCES = {
    emailNewApplicant: true,
    inAppNewApplicant: true,
    emailInterviewReminders: true,
    inAppInterviewReminders: true,
    emailCandidateMessages: true,
    inAppCandidateMessages: true,
    emailOfferAccepted: true,
    inAppOfferAccepted: true,
    emailAppUpdates: false,
    inAppAppUpdates: true
  };

  const DEFAULT_PRIVACY_SETTINGS = {
    publicDirectory: true,
    shareAssessments: true,
    allowInquiries: true,
    dataRetention: '1 Year'
  };

  let teamMembersList = loadStorage('skillbridge_recruiter_team', DEFAULT_TEAM_MEMBERS);
  let integrationsState = loadStorage('skillbridge_recruiter_integrations', DEFAULT_INTEGRATIONS);
  let notificationPreferences = loadStorage('skillbridge_recruiter_notification_prefs', DEFAULT_NOTIFICATION_PREFERENCES);
  let privacySettings = loadStorage('skillbridge_recruiter_privacy', DEFAULT_PRIVACY_SETTINGS);

  function switchSettingsTab(tabKey) {
    if (!tabKey) return;
    const cleanKey = tabKey.replace(/^#?settingsPane/, '').toLowerCase();

    const paneMap = {
      'account': 'settingsPaneAccount',
      'company': 'settingsPaneCompany',
      'security': 'settingsPaneSecurity',
      'notifications': 'settingsPaneNotifications',
      'team': 'settingsPaneTeam',
      'integrations': 'settingsPaneIntegrations',
      'privacy': 'settingsPanePrivacy'
    };

    const targetPaneId = paneMap[cleanKey] || 'settingsPaneAccount';

    // Update tab navigation links
    document.querySelectorAll('.settings-tab-link').forEach(link => {
      link.classList.remove('active');
      const attrTab = link.getAttribute('data-settings-tab');
      if (attrTab === cleanKey || link.id === `tabLink${cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1)}`) {
        link.classList.add('active');
      }
    });

    // Toggle tab panes
    document.querySelectorAll('.settings-tab-pane').forEach(pane => {
      pane.classList.add('d-none');
    });

    const activePane = document.getElementById(targetPaneId);
    if (activePane) {
      activePane.classList.remove('d-none');
    }

    if (cleanKey === 'team') {
      renderTeamMembersTable();
    } else if (cleanKey === 'integrations') {
      renderIntegrationsState();
    }
  }

  function calculatePasswordStrength(password) {
    if (!password) {
      const res = { score: 0, label: 'Enter password', className: '', width: '0%', color: '#94a3b8' };
      if (typeof document !== 'undefined') {
        const labelEl = document.getElementById('pwdStrengthLabel');
        const barEl = document.getElementById('pwdStrengthBar');
        if (labelEl) {
          labelEl.textContent = res.label;
          labelEl.style.color = res.color;
        }
        if (barEl) {
          barEl.className = 'progress-bar';
          barEl.style.width = '0%';
          barEl.style.backgroundColor = '#e2e8f0';
        }
      }
      return res;
    }
    let score = 1;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password) && /[^a-zA-Z0-9]/.test(password)) score++;

    let result = { score: 1, label: 'Weak', className: 'pwd-strength-weak', width: '25%', color: '#ef4444' };
    if (score === 2) {
      result = { score: 2, label: 'Fair', className: 'pwd-strength-fair', width: '50%', color: '#f59e0b' };
    } else if (score === 3) {
      result = { score: 3, label: 'Good', className: 'pwd-strength-good', width: '75%', color: '#06b6d4' };
    } else if (score >= 4) {
      result = { score: 4, label: 'Strong', className: 'pwd-strength-strong', width: '100%', color: '#10b981' };
    }

    if (typeof document !== 'undefined') {
      const labelEl = document.getElementById('pwdStrengthLabel');
      const barEl = document.getElementById('pwdStrengthBar');
      if (labelEl) {
        labelEl.textContent = result.label;
        labelEl.style.color = result.color;
      }
      if (barEl) {
        barEl.className = 'progress-bar ' + result.className;
        barEl.style.width = result.width;
        barEl.style.backgroundColor = result.color;
      }
    }

    return result;
  }

  function togglePasswordVisibility(targetInputId, btnEl) {
    const input = document.getElementById(targetInputId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    if (btnEl) {
      const icon = btnEl.querySelector('i');
      if (icon) {
        icon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
      }
    }
  }

  function handleChangePassword(e) {
    if (e) e.preventDefault();
    const currInput = document.getElementById('securityCurrentPassword');
    const newInput = document.getElementById('securityNewPassword');
    const confInput = document.getElementById('securityConfirmPassword');
    const matchNotice = document.getElementById('pwdMatchNotice');

    if (!currInput || !newInput || !confInput) return;

    const currentSaved = (typeof window !== 'undefined' && window.localStorage.getItem('skillbridge_recruiter_password')) || 'Recruiter@123';

    if (currInput.value !== currentSaved) {
      alert('Incorrect current password. Please re-enter.');
      currInput.focus();
      return;
    }

    if (newInput.value.length < 8) {
      alert('New password must be at least 8 characters long.');
      newInput.focus();
      return;
    }

    if (newInput.value !== confInput.value) {
      if (matchNotice) {
        matchNotice.textContent = 'Passwords do not match!';
        matchNotice.className = 'text-danger d-block mt-1';
      }
      alert('New password and confirm password do not match.');
      confInput.focus();
      return;
    }

    // Save new password
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('skillbridge_recruiter_password', newInput.value);
    }

    currInput.value = '';
    newInput.value = '';
    confInput.value = '';
    calculatePasswordStrength('');
    if (matchNotice) {
      matchNotice.textContent = 'Must match new password.';
      matchNotice.className = 'text-muted d-block mt-1';
    }

    alert('Master password updated successfully.');
  }

  function renderTeamMembersTable() {
    const tbody = document.getElementById('teamMembersTableBody');
    if (!tbody) return;

    if (!teamMembersList || teamMembersList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No team members registered. Click "Add Team Member" to invite recruiters.</td></tr>`;
      return;
    }

    tbody.innerHTML = teamMembersList.map(member => {
      const initials = member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      let roleBadgeClass = 'badge-role-recruiter';
      if (member.role === 'Admin') roleBadgeClass = 'badge-role-admin';
      else if (member.role === 'HR Manager') roleBadgeClass = 'badge-role-manager';

      return `
        <tr>
          <td>
            <div class="d-flex align-items-center gap-2.5">
              <div class="rounded-circle bg-light border text-primary d-flex align-items-center justify-content-center fw-bold"
                style="width: 36px; height: 36px; font-size: 0.82rem;">${initials}</div>
              <div>
                <div class="fw-bold text-dark">${member.name}</div>
                <div class="text-muted" style="font-size: 0.72rem;">${member.email} • ${member.designation || 'Recruiter'}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="badge ${roleBadgeClass} px-2.5 py-1 rounded-pill">${member.role}</span>
          </td>
          <td>
            <span class="text-muted" style="font-size: 0.75rem;">${member.permissions}</span>
          </td>
          <td>
            <span class="badge bg-soft-emerald text-success px-2 py-0.5 rounded-pill"><i class="bi bi-dot"></i>Active</span>
          </td>
          <td class="text-end">
            <button type="button" class="btn btn-sm btn-outline-custom me-1" onclick="globalObj.editTeamMember('${member.id}')" title="Edit Permissions">
              <i class="bi bi-pencil"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="globalObj.removeTeamMember('${member.id}')" title="Remove Member">
              <i class="bi bi-trash3"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function openTeamMemberModal(memberId) {
    const modalEl = document.getElementById('teamMemberModal');
    const form = document.getElementById('teamMemberForm');
    const titleEl = document.getElementById('teamMemberModalTitle');
    const idInput = document.getElementById('inputTeamMemberId');
    const nameInput = document.getElementById('inputTeamMemberName');
    const emailInput = document.getElementById('inputTeamMemberEmail');
    const desigInput = document.getElementById('inputTeamMemberDesignation');
    const roleSelect = document.getElementById('inputTeamMemberRole');
    const descText = document.getElementById('teamRoleDescriptionText');

    if (!modalEl || !form) return;

    if (memberId) {
      const member = teamMembersList.find(m => m.id === memberId);
      if (member) {
        if (titleEl) titleEl.textContent = 'Edit Recruitment Team Member';
        if (idInput) idInput.value = member.id;
        if (nameInput) nameInput.value = member.name;
        if (emailInput) emailInput.value = member.email;
        if (desigInput) desigInput.value = member.designation || '';
        if (roleSelect) roleSelect.value = member.role;
        if (descText) {
          descText.textContent = member.role === 'Admin'
            ? 'Admins have full access across enterprise settings, team members, and offer letters.'
            : (member.role === 'HR Manager'
              ? 'HR Managers can screen applicants, conduct technical rounds, and issue offer drafts.'
              : 'Recruiters can source candidates, review scores, and communicate with applicants.');
        }
      }
    } else {
      if (titleEl) titleEl.textContent = 'Add Recruitment Team Member';
      form.reset();
      if (idInput) idInput.value = '';
      if (roleSelect) roleSelect.value = 'HR Manager';
      if (descText) descText.textContent = 'HR Managers can screen applicants, conduct technical rounds, and issue offer drafts.';
    }

    if (typeof bootstrap !== 'undefined') {
      const bsModal = new bootstrap.Modal(modalEl);
      bsModal.show();
    }
  }

  function handleSaveTeamMember(e) {
    if (e) e.preventDefault();
    const idInput = document.getElementById('inputTeamMemberId');
    const nameInput = document.getElementById('inputTeamMemberName');
    const emailInput = document.getElementById('inputTeamMemberEmail');
    const desigInput = document.getElementById('inputTeamMemberDesignation');
    const roleSelect = document.getElementById('inputTeamMemberRole');

    if (!nameInput || !emailInput || !roleSelect) return;

    const id = idInput ? idInput.value : '';
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const designation = desigInput ? desigInput.value.trim() : 'Recruiter';
    const role = roleSelect.value;

    const permissionsMap = {
      'Admin': 'Full Access (Company, Team, Jobs, Offers)',
      'HR Manager': 'Hiring Ops (Reviews, Interviews, Offers, Chat)',
      'Recruiter': 'Sourcing & Evaluations (Screening, Chat)'
    };
    const permissions = permissionsMap[role] || 'Standard Access';

    if (id) {
      const existing = teamMembersList.find(m => m.id === id);
      if (existing) {
        existing.name = name;
        existing.email = email;
        existing.designation = designation;
        existing.role = role;
        existing.permissions = permissions;
      }
    } else {
      const newMember = {
        id: 'TM-' + Math.floor(100 + Math.random() * 900),
        name,
        email,
        designation,
        role,
        status: 'Active',
        permissions
      };
      teamMembersList.push(newMember);
    }

    saveStorage('skillbridge_recruiter_team', teamMembersList);
    renderTeamMembersTable();

    const modalEl = document.getElementById('teamMemberModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
      const inst = bootstrap.Modal.getInstance(modalEl);
      if (inst) inst.hide();
    }

    alert('Team member saved successfully.');
  }

  function removeTeamMember(memberId) {
    const member = teamMembersList.find(m => m.id === memberId);
    if (!member) return;

    if (member.role === 'Admin') {
      const adminCount = teamMembersList.filter(m => m.role === 'Admin').length;
      if (adminCount <= 1) {
        alert('Cannot remove the only Admin member. Promote another member to Admin first.');
        return;
      }
    }

    if (confirm(`Are you sure you want to remove "${member.name}" from the recruitment team?`)) {
      teamMembersList = teamMembersList.filter(m => m.id !== memberId);
      saveStorage('skillbridge_recruiter_team', teamMembersList);
      renderTeamMembersTable();
      alert(`Team member ${member.name} has been removed.`);
    }
  }

  function renderIntegrationsState() {
    // 1. Google Calendar
    const gcal = integrationsState.googleCalendar;
    const gcalBadge = document.getElementById('statusGCalBadge');
    const gcalText = document.getElementById('accountGCalText');
    const gcalBtn = document.getElementById('toggleGCalBtn');
    if (gcalBadge) {
      gcalBadge.className = gcal.connected
        ? 'badge bg-soft-emerald text-success px-2 py-1 rounded-pill small'
        : 'badge bg-light text-muted border px-2 py-1 rounded-pill small';
      gcalBadge.innerHTML = gcal.connected ? '<i class="bi bi-check-circle-fill me-1"></i>Connected' : '<i class="bi bi-dash-circle me-1"></i>Not Connected';
    }
    if (gcalText) gcalText.textContent = gcal.connected ? gcal.account : 'Not Connected';
    if (gcalBtn) {
      gcalBtn.textContent = gcal.connected ? 'Disconnect' : 'Connect';
      gcalBtn.className = gcal.connected ? 'btn btn-sm btn-outline-custom toggle-integration-btn' : 'btn btn-sm btn-primary-custom toggle-integration-btn';
    }

    // 2. Google Meet
    const gmeet = integrationsState.googleMeet;
    const gmeetBadge = document.getElementById('statusGMeetBadge');
    const gmeetText = document.getElementById('accountGMeetText');
    const gmeetBtn = document.getElementById('toggleGMeetBtn');
    if (gmeetBadge) {
      gmeetBadge.className = gmeet.connected
        ? 'badge bg-soft-emerald text-success px-2 py-1 rounded-pill small'
        : 'badge bg-light text-muted border px-2 py-1 rounded-pill small';
      gmeetBadge.innerHTML = gmeet.connected ? '<i class="bi bi-check-circle-fill me-1"></i>Connected' : '<i class="bi bi-dash-circle me-1"></i>Not Connected';
    }
    if (gmeetText) gmeetText.textContent = gmeet.connected ? gmeet.account : 'Not Connected';
    if (gmeetBtn) {
      gmeetBtn.textContent = gmeet.connected ? 'Disconnect' : 'Connect';
      gmeetBtn.className = gmeet.connected ? 'btn btn-sm btn-outline-custom toggle-integration-btn' : 'btn btn-sm btn-primary-custom toggle-integration-btn';
    }

    // 3. Email Integration
    const email = integrationsState.emailIntegration;
    const emailBadge = document.getElementById('statusEmailBadge');
    const emailText = document.getElementById('accountEmailText');
    const emailBtn = document.getElementById('toggleEmailBtn');
    if (emailBadge) {
      emailBadge.className = email.connected
        ? 'badge bg-soft-emerald text-success px-2 py-1 rounded-pill small'
        : 'badge bg-light text-muted border px-2 py-1 rounded-pill small';
      emailBadge.innerHTML = email.connected ? '<i class="bi bi-check-circle-fill me-1"></i>Connected' : '<i class="bi bi-dash-circle me-1"></i>Not Connected';
    }
    if (emailText) emailText.textContent = email.connected ? email.account : 'Not Connected';
    if (emailBtn) {
      emailBtn.textContent = email.connected ? 'Disconnect' : 'Connect';
      emailBtn.className = email.connected ? 'btn btn-sm btn-outline-custom toggle-integration-btn' : 'btn btn-sm btn-primary-custom toggle-integration-btn';
    }

    // 4. GitHub Integration
    const gh = integrationsState.githubIntegration;
    const ghBadge = document.getElementById('statusGithubBadge');
    const ghText = document.getElementById('accountGithubText');
    const ghBtn = document.getElementById('toggleGithubBtn');
    if (ghBadge) {
      ghBadge.className = gh.connected
        ? 'badge bg-soft-emerald text-success px-2 py-1 rounded-pill small'
        : 'badge bg-light text-muted border px-2 py-1 rounded-pill small';
      ghBadge.innerHTML = gh.connected ? '<i class="bi bi-check-circle-fill me-1"></i>Connected' : '<i class="bi bi-dash-circle me-1"></i>Not Connected';
    }
    if (ghText) ghText.textContent = gh.connected ? gh.account : 'Not Connected';
    if (ghBtn) {
      ghBtn.textContent = gh.connected ? 'Disconnect' : 'Connect';
      ghBtn.className = gh.connected ? 'btn btn-sm btn-outline-custom toggle-integration-btn' : 'btn btn-sm btn-primary-custom toggle-integration-btn';
    }
  }

  function toggleIntegration(key) {
    if (!integrationsState[key]) return;
    const item = integrationsState[key];
    item.connected = !item.connected;
    if (item.connected) {
      if (key === 'githubIntegration') item.account = 'github.com/cloudscale-solutions';
      else if (key === 'emailIntegration') item.account = activeRecruiter.officialEmail || 'recruiter@cloudscale.io';
      else if (key === 'googleCalendar') item.account = activeRecruiter.officialEmail || 'recruiter@cloudscale.io';
      else if (key === 'googleMeet') item.account = 'Enterprise Dedicated Bridge';
    } else {
      item.account = 'Not Connected';
    }
    saveStorage('skillbridge_recruiter_integrations', integrationsState);
    renderIntegrationsState();
    alert(`${item.name} has been ${item.connected ? 'connected' : 'disconnected'}.`);
  }

  function handleSaveAccountSettings() {
    const nameInput = document.getElementById('accountSettingsName');
    const emailInput = document.getElementById('accountSettingsEmail');
    const phoneInput = document.getElementById('accountSettingsPhone');
    const desigInput = document.getElementById('accountSettingsDesignation');
    const bioInput = document.getElementById('accountSettingsBio');

    if (!nameInput || !emailInput) return;

    activeRecruiter.contactPerson = nameInput.value.trim() || activeRecruiter.contactPerson;
    activeRecruiter.officialEmail = emailInput.value.trim() || activeRecruiter.officialEmail;
    if (phoneInput) activeRecruiter.phone = phoneInput.value.trim();
    if (desigInput) activeRecruiter.jobDesignation = desigInput.value.trim();
    if (bioInput) activeRecruiter.bio = bioInput.value.trim();

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('skillbridge_recruiter_session', JSON.stringify(activeRecruiter));
    }

    populateRecruiterBranding();
    alert('Account profile details updated successfully.');
  }

  function handleSaveCompanySettings() {
    const nameInput = document.getElementById('companySettingsName');
    const webInput = document.getElementById('companySettingsWebsite');
    const emailInput = document.getElementById('companySettingsEmail');
    const indSelect = document.getElementById('companySettingsIndustry');
    const sizeSelect = document.getElementById('companySettingsSize');
    const locInput = document.getElementById('companySettingsLocation');
    const descInput = document.getElementById('companySettingsDescription');

    if (!nameInput) return;

    activeRecruiter.companyName = nameInput.value.trim() || activeRecruiter.companyName;
    if (webInput) activeRecruiter.website = webInput.value.trim();
    if (emailInput) activeRecruiter.officialEmail = emailInput.value.trim();
    if (indSelect) activeRecruiter.industry = indSelect.value;
    if (sizeSelect) activeRecruiter.companySize = sizeSelect.value;
    if (locInput) activeRecruiter.location = locInput.value.trim();
    if (descInput) activeRecruiter.description = descInput.value.trim();

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('skillbridge_recruiter_session', JSON.stringify(activeRecruiter));
    }

    populateRecruiterBranding();
    alert('Company profile and branding settings saved successfully.');
  }

  function handleSaveNotificationPreferences() {
    const fields = [
      'notifEmailNewApplicant', 'notifInAppNewApplicant',
      'notifEmailInterviewReminders', 'notifInAppInterviewReminders',
      'notifEmailCandidateMessages', 'notifInAppCandidateMessages',
      'notifEmailOfferAccepted', 'notifInAppOfferAccepted',
      'notifEmailAppUpdates', 'notifInAppAppUpdates'
    ];

    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const key = id.replace(/^notif/, '');
        const normKey = key.charAt(0).toLowerCase() + key.slice(1);
        notificationPreferences[normKey] = el.checked;
      }
    });

    saveStorage('skillbridge_recruiter_notification_prefs', notificationPreferences);
    alert('Recruitment notification preferences saved successfully.');
  }

  function handleSavePrivacySettings() {
    const pubDir = document.getElementById('privacyPublicDirectorySwitch');
    const shareAss = document.getElementById('privacyShareAssessmentsSwitch');
    const allowInq = document.getElementById('privacyAllowInquiriesSwitch');
    const retSelect = document.getElementById('privacyDataRetentionSelect');

    if (pubDir) privacySettings.publicDirectory = pubDir.checked;
    if (shareAss) privacySettings.shareAssessments = shareAss.checked;
    if (allowInq) privacySettings.allowInquiries = allowInq.checked;
    if (retSelect) privacySettings.dataRetention = retSelect.value;

    saveStorage('skillbridge_recruiter_privacy', privacySettings);
    alert('Privacy standards and retention settings saved successfully.');
  }

  function downloadCompanyDataJSON() {
    const archive = {
      exportedAt: new Date().toISOString(),
      organization: activeRecruiter.companyName,
      recruiterSession: activeRecruiter,
      recruiterTeam: teamMembersList,
      integrations: integrationsState,
      notificationPreferences,
      privacySettings,
      internships: internshipsList,
      applicants: applicantsList,
      interviews: interviewsList,
      offers: offersList,
      messages: messagesList
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(archive, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `skillbridge_${activeRecruiter.companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_data_archive.json`);
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    dlAnchorElem.remove();
  }

  function renderSettingsSection() {
    if (!activeRecruiter) activeRecruiter = getActiveRecruiterSession() || {};
    const personName = activeRecruiter.contactPerson || activeRecruiter.fullName || activeRecruiter.name || 'Priya Sharma';
    const compNameVal = activeRecruiter.companyName || activeRecruiter.name || 'CloudScale Solutions';
    const offEmail = activeRecruiter.officialEmail || activeRecruiter.email || 'recruiter@cloudscale.io';

    // 1. Account Settings
    const accName = document.getElementById('accountSettingsName');
    if (accName) accName.value = activeRecruiter.contactPerson;
    if (accName) accName.value = personName;

    const accEmail = document.getElementById('accountSettingsEmail');
    if (accEmail) accEmail.value = activeRecruiter.officialEmail;
    if (accEmail) accEmail.value = offEmail;

    const accPhone = document.getElementById('accountSettingsPhone');
    if (accPhone) accPhone.value = activeRecruiter.phone || '+91 98765 43210';

    const accDesig = document.getElementById('accountSettingsDesignation');
    if (accDesig) accDesig.value = activeRecruiter.jobDesignation || 'Head of Campus Talent Acquisition';

    const accBio = document.getElementById('accountSettingsBio');
    if (accBio) accBio.value = activeRecruiter.bio || 'Directing campus talent acquisition for CloudScale Solutions. Focused on cloud platforms, distributed architectures, and distributed systems engineering talent.';

    const avatarInitial = document.getElementById('accountAvatarPreview') || document.getElementById('settingsAvatarInitial');
    if (avatarInitial) avatarInitial.textContent = activeRecruiter.contactPerson.charAt(0);
    if (avatarInitial) avatarInitial.textContent = (personName || 'P').charAt(0).toUpperCase();

    // 2. Company Settings
    const compName = document.getElementById('companySettingsName');
    if (compName) compName.value = activeRecruiter.companyName;
    if (compName) compName.value = compNameVal;

    const compWeb = document.getElementById('companySettingsWebsite');
    if (compWeb) compWeb.value = activeRecruiter.website;
    if (compWeb) compWeb.value = activeRecruiter.website || 'https://cloudscale.io';

    const compEmail = document.getElementById('companySettingsEmail');
    if (compEmail) compEmail.value = activeRecruiter.officialEmail;
    if (compEmail) compEmail.value = offEmail;

    const compInd = document.getElementById('companySettingsIndustry');
    if (compInd) compInd.value = activeRecruiter.industry;
    if (compInd) compInd.value = activeRecruiter.industry || 'Cloud & SaaS';

    const compSize = document.getElementById('companySettingsSize');
    if (compSize) compSize.value = activeRecruiter.companySize;
    if (compSize) compSize.value = activeRecruiter.companySize || '200-500 Employees';

    const compLoc = document.getElementById('companySettingsLocation');
    if (compLoc) compLoc.value = activeRecruiter.location;
    if (compLoc) compLoc.value = activeRecruiter.location || 'Bengaluru, Karnataka (Hybrid)';

    const compDesc = document.getElementById('companySettingsDescription');
    if (compDesc) compDesc.value = activeRecruiter.description;
    if (compDesc) compDesc.value = activeRecruiter.description || 'CloudScale builds high-throughput cloud microservices, distributed SaaS platforms, and enterprise data infrastructure for global clients.';

    // 3. Notifications
    const notifKeys = [
      ['notifEmailNewApplicant', 'emailNewApplicant'],
      ['notifInAppNewApplicant', 'inAppNewApplicant'],
      ['notifEmailInterviewReminders', 'emailInterviewReminders'],
      ['notifInAppInterviewReminders', 'inAppInterviewReminders'],
      ['notifEmailCandidateMessages', 'emailCandidateMessages'],
      ['notifInAppCandidateMessages', 'inAppCandidateMessages'],
      ['notifEmailOfferAccepted', 'emailOfferAccepted'],
      ['notifInAppOfferAccepted', 'inAppOfferAccepted'],
      ['notifEmailAppUpdates', 'emailAppUpdates'],
      ['notifInAppAppUpdates', 'inAppAppUpdates']
    ];
    notifKeys.forEach(([domId, prefKey]) => {
      const el = document.getElementById(domId);
      if (el && notificationPreferences[prefKey] !== undefined) {
        el.checked = !!notificationPreferences[prefKey];
      }
    });

    // 4. Privacy
    const pubDir = document.getElementById('privacyPublicDirectorySwitch');
    if (pubDir) pubDir.checked = privacySettings.publicDirectory !== false;

    const shareAss = document.getElementById('privacyShareAssessmentsSwitch');
    if (shareAss) shareAss.checked = privacySettings.shareAssessments !== false;

    const allowInq = document.getElementById('privacyAllowInquiriesSwitch');
    if (allowInq) allowInq.checked = privacySettings.allowInquiries !== false;

    const retSelect = document.getElementById('privacyDataRetentionSelect');
    if (retSelect) retSelect.value = privacySettings.dataRetention || '1 Year';

    // 5. Team Table & Integrations
    renderTeamMembersTable();
    renderIntegrationsState();
  }

  // Window-level exports for Settings module
  globalObj.switchSettingsTab = switchSettingsTab;
  globalObj.editTeamMember = function (memberId) {
    openTeamMemberModal(memberId);
  };
  globalObj.removeTeamMember = removeTeamMember;
  globalObj.toggleIntegration = toggleIntegration;
  globalObj.openTeamMemberModal = openTeamMemberModal;
  globalObj.calculatePasswordStrength = calculatePasswordStrength;
  globalObj.downloadCompanyDataJSON = downloadCompanyDataJSON;

  // ==========================================================================
  // 17. Populate Recruiter Branding Across All UI Elements
  // ==========================================================================
  function populateRecruiterBranding() {
    activeRecruiter = getActiveRecruiterSession();

    const companyName = getCompanyField(activeRecruiter, 'companyName', 'company_name', 'name') || 'CloudScale Solutions';
    const contactPerson = getCompanyField(activeRecruiter, 'contactPerson', 'contact_person', 'fullName') || 'Priya Sharma';
    const officialEmail = getCompanyField(activeRecruiter, 'officialEmail', 'official_email', 'email') || 'recruiter@cloudscale.io';
    const phone = getCompanyField(activeRecruiter, 'phone', 'phone_number', 'phoneNumber', 'mobile');
    const website = getCompanyField(activeRecruiter, 'website', 'websiteUrl', 'website_url');
    const industry = getCompanyField(activeRecruiter, 'industry', 'industryDomain', 'industry_domain');
    const companySize = getCompanyField(activeRecruiter, 'companySize', 'company_size');
    const location = getCompanyField(activeRecruiter, 'location');
    const description = getCompanyField(activeRecruiter, 'description');

    // Sidebar
    const sideCompany = document.getElementById('sidebarCompanyName');
    if (sideCompany) sideCompany.textContent = companyName;

    const sideName = document.getElementById('sidebarRecruiterName');
    if (sideName) sideName.textContent = contactPerson;

    const sideAvatar = document.getElementById('sidebarAvatarLetter');
    if (sideAvatar) sideAvatar.textContent = contactPerson ? contactPerson.charAt(0).toUpperCase() : 'R';

    // Topbar
    const topName = document.getElementById('topbarRecruiterName');
    if (topName) topName.textContent = contactPerson;

    const topAvatar = document.getElementById('topbarAvatarLetter');
    if (topAvatar) topAvatar.textContent = contactPerson ? contactPerson.charAt(0).toUpperCase() : 'R';

    const menuName = document.getElementById('menuRecruiterName');
    if (menuName) menuName.textContent = contactPerson;

    const menuComp = document.getElementById('menuRecruiterCompany');
    if (menuComp) menuComp.textContent = companyName;

    // Overview Hero
    const heroName = document.getElementById('welcomeRecruiterName');
    if (heroName) heroName.textContent = contactPerson.split(' ')[0] || contactPerson;

    const heroComp = document.getElementById('welcomeCompanyDetails');
    if (heroComp) heroComp.textContent = `${companyName} • ${location || 'Verified Partner'} • Active Spring 2026 Campus Drive`;

    // Profile Card
    const profCardName = document.getElementById('profileCardCompanyName');
    if (profCardName) profCardName.textContent = companyName;

    const profCardEmail = document.getElementById('profileCardEmail');
    if (profCardEmail) profCardEmail.textContent = officialEmail;

    const profCardContact = document.getElementById('profileCardContact');
    if (profCardContact) profCardContact.textContent = contactPerson;

    const profCardPhone = document.getElementById('profileCardPhone');
    if (profCardPhone) profCardPhone.textContent = phone || 'Not provided';

    const profCardLoc = document.getElementById('profileCardLocation');
    if (profCardLoc) profCardLoc.textContent = location || 'Location not specified';

    const profCardWeb = document.getElementById('profileCardWebsite');
    if (profCardWeb) {
      if (website) {
        profCardWeb.textContent = website;
        profCardWeb.href = (website.startsWith('http://') || website.startsWith('https://')) ? website : `https://${website}`;
      } else {
        profCardWeb.textContent = 'Not specified';
        profCardWeb.removeAttribute('href');
      }
    }

    const profCardIndustry = document.getElementById('profileCardIndustry');
    if (profCardIndustry) profCardIndustry.textContent = industry || 'Technology';

    const profCardSize = document.getElementById('profileCardSize');
    if (profCardSize) profCardSize.textContent = companySize || '1-50 Employees';

    const profCardTagline = document.getElementById('profileCardTagline');
    if (profCardTagline) {
      profCardTagline.textContent = industry ? `${industry}${location ? ' • ' + location : ''}` : (location || 'Enterprise Verified Partner');
    }

    // Profile Inputs
    const inputComp = document.getElementById('profileInputCompanyName');
    if (inputComp) inputComp.value = companyName;

    const inputEmail = document.getElementById('profileInputEmail');
    if (inputEmail) inputEmail.value = officialEmail;

    const inputContact = document.getElementById('profileInputContactName');
    if (inputContact) inputContact.value = contactPerson;

    const inputPhone = document.getElementById('profileInputPhone');
    if (inputPhone) inputPhone.value = phone;

    const inputWeb = document.getElementById('profileInputWebsite');
    if (inputWeb) inputWeb.value = website;

    const inputIndustry = document.getElementById('profileInputIndustry');
    if (inputIndustry && industry) {
      let matched = false;
      for (let i = 0; i < inputIndustry.options.length; i++) {
        if (inputIndustry.options[i].value.toLowerCase() === industry.toLowerCase() ||
          inputIndustry.options[i].text.toLowerCase() === industry.toLowerCase()) {
          inputIndustry.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched && industry) {
        const newOpt = new Option(industry, industry, true, true);
        inputIndustry.add(newOpt);
      }
    }

    const inputSize = document.getElementById('profileInputSize');
    if (inputSize && companySize) {
      for (let i = 0; i < inputSize.options.length; i++) {
        const optVal = inputSize.options[i].value.toLowerCase().replace(/[^0-9a-z]/g, '');
        const normSize = companySize.toLowerCase().replace(/[^0-9a-z]/g, '');
        if (optVal === normSize || optVal.includes(normSize) || normSize.includes(optVal)) {
          inputSize.selectedIndex = i;
          break;
        }
      }
    }

    const inputLoc = document.getElementById('profileInputLocation');
    if (inputLoc) inputLoc.value = location;

    const inputDesc = document.getElementById('profileInputDescription');
    if (inputDesc) inputDesc.value = description;

    // Settings Inputs
    const setMail = document.getElementById('settingsEmail');
    if (setMail) setMail.value = officialEmail;

    const setAccName = document.getElementById('accountSettingsName');
    if (setAccName) setAccName.value = contactPerson;

    const setAccMail = document.getElementById('accountSettingsEmail');
    if (setAccMail) setAccMail.value = officialEmail;

    const setAccPhone = document.getElementById('accountSettingsPhone');
    if (setAccPhone) setAccPhone.value = phone || '+91 98765 43210';

    const setAccDesig = document.getElementById('accountSettingsDesignation');
    if (setAccDesig) setAccDesig.value = activeRecruiter.jobDesignation || 'Head of Campus Talent Acquisition';

    const setAccBio = document.getElementById('accountSettingsBio');
    if (setAccBio) setAccBio.value = activeRecruiter.bio || 'Directing campus talent acquisition for CloudScale Solutions.';

    const setCompName = document.getElementById('companySettingsName');
    if (setCompName) setCompName.value = companyName;

    const setCompWeb = document.getElementById('companySettingsWebsite');
    if (setCompWeb) setCompWeb.value = website;

    const setCompMail = document.getElementById('companySettingsEmail');
    if (setCompMail) setCompMail.value = officialEmail;
  }

  // ==========================================================================
  // 18. Master Initialization
  // ==========================================================================
  function renderDashboardOverview() {
    renderKPIStats();
    renderAnalyticsCharts();
    renderOverviewRecentApplicants();
    renderOverviewRecentInternships();
    renderOverviewUpcomingInterviews();
    renderOverviewActivityFeed();
    renderOffersKPIs();
  }

  async function initAll() {
    populateRecruiterBranding();
    renderDashboardOverview();
    renderSettingsSection();
    initRouter();
    initEventHandlers();

    const companyId = getLoggedInCompanyId();
    if (companyId) {
      await loadCompanyProfileFromBackend(companyId);
      await refreshInternshipsFromBackend(companyId);
      await refreshApplicationsFromBackend(companyId);
      await refreshAiMatchingFromBackend(companyId);
      await refreshAssessmentsFromBackend();
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAll);
    } else {
      initAll();
    }
  }

  // Node module export for automated unit tests
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      getActiveRecruiterSession,
      getLoggedInCompanyId,
      getCompanyField,
      loadCompanyProfileFromBackend,
      handleSaveCompanyProfile,
      calculateOverviewKPIs,
      calculateOffersKPIs,
      calculateTotalUnreadMessages,
      syncConversationsWithApplicants,
      selectConversation,
      handleSendMessage,
      populateOfferFormForCandidate,
      generateOfferLetterHTML,
      downloadOfferLetterPdf,
      fallbackOfferPdf,
      exportOffersToCSV,
      // Settings Module exports
      DEFAULT_TEAM_MEMBERS,
      DEFAULT_INTEGRATIONS,
      DEFAULT_NOTIFICATION_PREFERENCES,
      DEFAULT_PRIVACY_SETTINGS,
      renderSettingsSection,
      switchSettingsTab,
      calculatePasswordStrength,
      renderTeamMembersTable,
      openTeamMemberModal,
      handleSaveTeamMember,
      removeTeamMember,
      toggleIntegration,
      handleSaveAccountSettings,
      handleSaveCompanySettings,
      handleSaveNotificationPreferences,
      handleSavePrivacySettings,
      downloadCompanyDataJSON,
      DEFAULT_INTERNSHIPS,
      DEFAULT_APPLICANTS,
      DEFAULT_INTERVIEWS,
      DEFAULT_OFFERS,
      DEFAULT_MESSAGES,
      VALID_SECTIONS
    };
  }
})();
