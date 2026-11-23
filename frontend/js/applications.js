/**
 * SkillBridge - My Applications Tracking Controller
 * Enterprise application tracking hub with dynamic KPI calculation, visual 5-stage timeline,
 * synchronized status lifecycle (Applied, Under Review, Shortlisted, Interview Scheduled, Selected, Rejected),
 * custom accessible status dropdown with colored indicators, multi-criteria search/filtering,
 * resume management, offer letter access, and Spring Boot REST API integration.
 */

// ==========================================================================
// 1. Status Color System Constants
// ==========================================================================
const STATUS_COLORS = {
  'Applied': { hex: '#2563EB', bg: '#EFF6FF', border: 'rgba(37, 99, 235, 0.35)', label: 'Applied' },
  'Under Review': { hex: '#F59E0B', bg: '#FFFBEB', border: 'rgba(245, 158, 11, 0.35)', label: 'Under Review' },
  'Under Technical Review': { hex: '#F59E0B', bg: '#FFFBEB', border: 'rgba(245, 158, 11, 0.35)', label: 'Under Review' },
  'Shortlisted': { hex: '#9333EA', bg: '#FAF5FF', border: 'rgba(147, 51, 234, 0.35)', label: 'Shortlisted' },
  'Interview Scheduled': { hex: '#06B6D4', bg: '#ECFEFF', border: 'rgba(6, 182, 212, 0.35)', label: 'Interview Scheduled' },
  'Selected': { hex: '#16A34A', bg: '#F0FDF4', border: 'rgba(22, 163, 74, 0.35)', label: 'Selected' },
  'Rejected': { hex: '#DC2626', bg: '#FEF2F2', border: 'rgba(220, 38, 38, 0.35)', label: 'Rejected' },
  'all': { hex: '#64748B', bg: '#F8FAFC', border: '#CBD5E1', label: 'All Application Statuses' }
};

// ==========================================================================
// 2. API Client Service & Local Storage Persistence
// ==========================================================================
const ApplicationsApiService = {
  API_BASE_URL: (typeof window !== 'undefined' && window.SkillBridgeConfig ? window.SkillBridgeConfig.apiBaseUrl : ((typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') ? 'https://skillbridge-api.onrender.com/api' : '${(typeof window !== "undefined" && window.SkillBridgeConfig ? window.SkillBridgeConfig.apiBaseUrl : "http://localhost:5000/api")}')),
  isBackendConnected: false,

  async getApplications(studentId = 'stud-101') {
    const studId = studentId || ApplicationsDataStore.getStudent().id || 'stud-101';
    try {
      const response = await fetch(`${this.API_BASE_URL}/applications?student_id=${encodeURIComponent(studId)}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        const json = await response.json();
        const data = (json && json.success && Array.isArray(json.data)) ? json.data : (Array.isArray(json) ? json : []);
        if (data.length > 0) {
          this.isBackendConnected = true;
          console.log('[SkillBridge API] Applications loaded from MySQL backend.');
          return data.map(raw => ({
            id: raw.id,
            studentId: raw.student_id,
            internshipId: raw.internship_id,
            company: raw.company_name || 'Enterprise Partner',
            companyLogoText: (raw.company_name || 'SB').substring(0, 2).toUpperCase(),
            logoBg: '#4f46e5',
            position: raw.internship_title || 'Software Engineering Intern',
            domain: raw.domain || 'Backend',
            applicationDate: raw.applied_at ? new Date(raw.applied_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
            appliedTimestamp: raw.applied_at ? new Date(raw.applied_at).getTime() : Date.now(),
            location: raw.internship_location || raw.workplace_mode || 'India (Remote)',
            stipend: raw.stipend_display || '₹35,000 / month',
            duration: '6 Months',
            status: raw.status || 'Applied',
            resumeFileName: 'Yazh_S_Resume_2026.pdf',
            interviewDate: raw.interview_date || (raw.status === 'Interview Scheduled' ? '25 Nov 2026 • 11:00 AM IST' : 'Pending Review'),
            interviewMode: 'Google Meet',
            interviewLink: raw.interview_link,
            interviewDetails: raw.notes || 'Application under review.',
            recruiterFeedback: raw.notes || null,
            offerDetails: raw.offer_details || null
          }));
        }
      }
    } catch (err) {
      this.isBackendConnected = false;
      console.info('[SkillBridge API] Backend offline. Using local persistent application store.');
    }
    this.isBackendConnected = false;
    return ApplicationsDataStore.getLocalApplications(studId);
  },

  async deleteApplication(applicationId) {
    try {
      await fetch(`${this.API_BASE_URL}/applications/${applicationId}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(2000)
      });
      console.log('[SkillBridge API] Application withdrawn from MySQL backend.');
    } catch (err) {
      console.info('[SkillBridge API] Backend offline. Withdrawing application locally.');
    }
    ApplicationsDataStore.deleteLocalApplication(applicationId);
    return { success: true };
  },

  async updateStatus(applicationId, newStatus, recruiterNotes) {
    try {
      await fetch(`${this.API_BASE_URL}/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, notes: recruiterNotes }),
        signal: AbortSignal.timeout(2000)
      });
    } catch (err) {
      console.info('[SkillBridge API] Updated status locally.');
    }
    ApplicationsDataStore.updateLocalStatus(applicationId, newStatus, recruiterNotes);
  }
};

// ==========================================================================
// 3. Data Store & Seed Lifecycle Data
// ==========================================================================
const ApplicationsDataStore = {
  // Canonical Status Normalizer
  normalizeStatus(status) {
    if (!status) return 'Applied';
    const s = String(status).trim().toLowerCase();
    if (s === 'applied' || s === 'application submitted' || s.includes('submi')) return 'Applied';
    if (s === 'under review' || s === 'under technical review' || s.includes('technical review') || s.includes('review') || s.includes('screening')) return 'Under Review';
    if (s === 'shortlisted' || s.includes('shortlist')) return 'Shortlisted';
    if (s === 'interview scheduled' || s.includes('interview')) return 'Interview Scheduled';
    if (s === 'selected' || s.includes('offer')) return 'Selected';
    if (s === 'rejected' || s.includes('closed') || s.includes('not selected')) return 'Rejected';
    return 'Applied';
  },

  // Student Profile
  getStudent() {
    try {
      const stored = localStorage.getItem('skillbridge_registered_student');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Could not read student profile', e);
    }
    return {
      id: 'stud-101',
      fullName: 'Yazh S',
      avatarInitials: 'YS',
      avatarUrl: null,
      degree: 'B.E. Final Year',
      department: 'Computer Science & Engineering'
    };
  },

  // 6 Distinct Seed Applications (One for each canonical status: Total 6, no overlap)
  defaultApplications: [
    {
      id: "app-201",
      studentId: "stud-101",
      internshipId: "int-101",
      company: "CloudScale Solutions",
      companyLogoText: "CS",
      logoBg: "#4f46e5",
      position: "Full Stack Java Developer Intern",
      domain: "Backend",
      applicationDate: "16 Nov 2026",
      appliedTimestamp: new Date('2026-11-16T10:30:00').getTime(),
      location: "Bengaluru, Karnataka (Hybrid)",
      stipend: "₹35,000 / month",
      duration: "6 Months",
      status: "Interview Scheduled",
      resumeFileName: "Yazh_S_Resume_2026.pdf",
      interviewDate: "25 Nov 2026 • 11:00 AM IST",
      interviewMode: "Google Meet (Technical Round 1)",
      interviewLink: "https://meet.google.com/cs-java-interview",
      interviewDetails: "Live pair-coding challenge focused on Spring Boot JPA, REST APIs, and MySQL transaction tuning.",
      recruiterFeedback: "Candidate scored 90% in Java Assessment. Interview round 1 confirmed with Senior Engineering Lead.",
      offerDetails: null
    },
    {
      id: "app-202",
      studentId: "stud-101",
      internshipId: "int-102",
      company: "DataMatrix Analytics",
      companyLogoText: "DM",
      logoBg: "#059669",
      position: "Python & Data Engineering Intern",
      domain: "Data",
      applicationDate: "14 Nov 2026",
      appliedTimestamp: new Date('2026-11-14T14:15:00').getTime(),
      location: "Hyderabad, Telangana (Remote)",
      stipend: "₹38,000 / month",
      duration: "6 Months",
      status: "Shortlisted",
      resumeFileName: "Yazh_S_Resume_2026.pdf",
      interviewDate: "Slot Scheduling in Progress",
      interviewMode: "Zoom Video Meeting",
      interviewLink: null,
      interviewDetails: "Technical panel assignment in progress. Calendar invitation will be dispatched via email shortly.",
      recruiterFeedback: "Profile shortlisted for technical evaluation based on 88% MySQL and 82% Python skill verification.",
      offerDetails: null
    },
    {
      id: "app-203",
      studentId: "stud-101",
      internshipId: "int-104",
      company: "NextGen Digital Labs",
      companyLogoText: "ND",
      logoBg: "#7c3aed",
      position: "Frontend Web Developer Intern",
      domain: "Frontend",
      applicationDate: "10 Nov 2026",
      appliedTimestamp: new Date('2026-11-10T09:45:00').getTime(),
      location: "Bengaluru, Karnataka (Remote)",
      stipend: "₹30,000 / month",
      duration: "3 Months",
      status: "Selected",
      resumeFileName: "Yazh_S_Resume_2026.pdf",
      interviewDate: "Completed on 18 Nov 2026",
      interviewMode: "Offer Released",
      interviewLink: null,
      interviewDetails: null,
      recruiterFeedback: "Congratulations! You have been selected for the Frontend Web Developer Internship. Official offer package released.",
      offerDetails: {
        stipend: "₹30,000 / month",
        duration: "3 Months (Extendable)",
        joiningDate: "15 Dec 2026",
        workMode: "Remote (Work from Home)",
        reportingManager: "Ananya Roy, Principal UI Architect",
        offerLetterName: "NextGen_Offer_Letter_Yazh_S.pdf"
      }
    },
    {
      id: "app-204",
      studentId: "stud-101",
      internshipId: "int-103",
      company: "FinTech Orbit Systems",
      companyLogoText: "FO",
      logoBg: "#d97706",
      position: "Backend Engineering Intern (Spring Boot)",
      domain: "Backend",
      applicationDate: "18 Nov 2026",
      appliedTimestamp: new Date('2026-11-18T11:00:00').getTime(),
      location: "Chennai, Tamil Nadu (Onsite)",
      stipend: "₹40,000 / month",
      duration: "6 Months",
      status: "Under Review",
      recruiterStatus: "Under Technical Review", // Preserves original recruiter phrase
      resumeFileName: "Yazh_S_Resume_2026.pdf",
      interviewDate: null,
      interviewMode: null,
      interviewLink: null,
      interviewDetails: null,
      recruiterFeedback: "Resume and verified SkillBridge credentials undergoing technical evaluation by the Platform Engineering team.",
      offerDetails: null
    },
    {
      id: "app-205",
      studentId: "stud-101",
      internshipId: "int-106",
      company: "Zoho Enterprise Cloud",
      companyLogoText: "ZC",
      logoBg: "#0284c7",
      position: "Cloud Platform & DevOps Intern",
      domain: "Cloud",
      applicationDate: "19 Nov 2026",
      appliedTimestamp: new Date('2026-11-19T08:30:00').getTime(),
      location: "Chennai, Tamil Nadu (Hybrid)",
      stipend: "₹36,000 / month",
      duration: "6 Months",
      status: "Applied",
      resumeFileName: "Yazh_S_Resume_2026.pdf",
      interviewDate: null,
      interviewMode: null,
      interviewLink: null,
      interviewDetails: null,
      recruiterFeedback: "Your application has been received and queued for HR screening. Applications are evaluated in submission order.",
      offerDetails: null
    },
    {
      id: "app-206",
      studentId: "stud-101",
      internshipId: "int-105",
      company: "Apex Infotech Services",
      companyLogoText: "AI",
      logoBg: "#dc2626",
      position: "Database Administrator & SQL Intern",
      domain: "Database",
      applicationDate: "02 Nov 2026",
      appliedTimestamp: new Date('2026-11-02T16:20:00').getTime(),
      location: "Pune, Maharashtra (Hybrid)",
      stipend: "₹32,000 / month",
      duration: "6 Months",
      status: "Rejected",
      resumeFileName: "Yazh_S_Resume_2026.pdf",
      interviewDate: null,
      interviewMode: null,
      interviewLink: null,
      interviewDetails: null,
      recruiterFeedback: "Thank you for applying. The team moved forward with candidates with prior production NoSQL experience. We invite you to apply for upcoming positions.",
      offerDetails: null
    }
  ],

  getLocalApplications(studentId = 'stud-101') {
    try {
      const stored = localStorage.getItem('skillbridge_student_applications');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter to ensure student isolation
          const studentApps = parsed.filter(a => !a.studentId || a.studentId === studentId);
          if (studentApps.length > 0) {
            // Deduplicate by application id and merge seed metadata
            const seen = new Set();
            const deduplicated = [];
            for (const app of studentApps) {
              if (!seen.has(app.id)) {
                seen.add(app.id);
                const seed = this.defaultApplications.find(d => d.id === app.id || d.internshipId === app.internshipId);
                deduplicated.push({
                  studentId: app.studentId || studentId,
                  companyLogoText: app.companyLogoText || (seed ? seed.companyLogoText : (app.company ? app.company.substring(0, 2).toUpperCase() : 'SB')),
                  logoBg: app.logoBg || (seed ? seed.logoBg : '#4f46e5'),
                  resumeFileName: app.resumeFileName || 'Yazh_S_Resume_2026.pdf',
                  interviewDate: app.interviewDate !== undefined ? app.interviewDate : (seed ? seed.interviewDate : null),
                  interviewMode: app.interviewMode || (seed ? seed.interviewMode : null),
                  interviewLink: app.interviewLink !== undefined ? app.interviewLink : (seed ? seed.interviewLink : null),
                  interviewDetails: app.interviewDetails || (seed ? seed.interviewDetails : null),
                  recruiterFeedback: app.recruiterFeedback || (seed ? seed.recruiterFeedback : 'Application submitted to company hiring pipeline.'),
                  recruiterStatus: app.recruiterStatus || (seed ? seed.recruiterStatus : null),
                  offerDetails: app.offerDetails !== undefined ? app.offerDetails : (seed ? seed.offerDetails : null),
                  appliedTimestamp: app.appliedTimestamp || (seed ? seed.appliedTimestamp : Date.now()),
                  ...app
                });
              }
            }
            return deduplicated;
          }
        }
      }
    } catch (e) {
      console.warn('Could not read local applications', e);
    }

    // Default initialization
    this.saveAll(this.defaultApplications);
    return [...this.defaultApplications];
  },

  saveAll(apps) {
    try {
      localStorage.setItem('skillbridge_student_applications', JSON.stringify(apps));
    } catch (e) {
      console.warn('Could not save applications', e);
    }
  },

  deleteLocalApplication(appId) {
    const apps = this.getLocalApplications().filter(a => a.id !== appId);
    this.saveAll(apps);
  },

  updateLocalStatus(appId, newStatus, recruiterNotes) {
    const apps = this.getLocalApplications().map(app => {
      if (app.id === appId) {
        const canonical = this.normalizeStatus(newStatus);
        const updated = {
          ...app,
          status: canonical,
          recruiterStatus: newStatus, // preserve exact recruiter label
          recruiterFeedback: recruiterNotes || app.recruiterFeedback
        };

        // Synchronize helper fields based on newly assigned status
        if (canonical === 'Interview Scheduled') {
          updated.interviewDate = updated.interviewDate || '28 Nov 2026 • 11:00 AM IST';
          updated.interviewMode = updated.interviewMode || 'Google Meet (Technical Round 1)';
          updated.interviewLink = updated.interviewLink || 'https://meet.google.com/cs-java-interview';
          updated.interviewDetails = updated.interviewDetails || 'Live pair-coding challenge focused on Spring Boot REST APIs.';
        } else if (canonical === 'Selected') {
          updated.offerDetails = updated.offerDetails || {
            stipend: app.stipend,
            duration: app.duration || '6 Months',
            joiningDate: '15 Dec 2026',
            workMode: (app.location && app.location.includes('Remote')) ? 'Remote (Work from Home)' : 'Hybrid',
            reportingManager: 'Engineering Team Lead',
            offerLetterName: `${app.company.replace(/\s+/g, '_')}_Offer_Letter_Yazh_S.pdf`
          };
        } else if (canonical === 'Rejected') {
          updated.interviewLink = null;
        }

        return updated;
      }
      return app;
    });
    this.saveAll(apps);
  }
};

// ==========================================================================
// 4. UI Controller & Real-Time Filtering
// ==========================================================================
let allApplications = [];
let currentFilterState = {
  searchQuery: '',
  status: 'all',
  dateRange: 'all',
  sortBy: 'newest'
};

document.addEventListener('DOMContentLoaded', () => {
  initApplicationsPage();
});

async function initApplicationsPage() {
  const student = ApplicationsDataStore.getStudent();
  renderUserAvatars(student);

  initFilterControls();
  initKpiCardClickHandlers();
  await loadAndRenderApplications();

  initMobileSidebarToggle();
  initLogoutHandler();
}

function renderUserAvatars(student) {
  const nameEls = document.querySelectorAll('.user-full-name');
  const initialsEls = document.querySelectorAll('.user-avatar-initials');

  nameEls.forEach(el => el.textContent = student.fullName || 'Yazh S');
  initialsEls.forEach(el => el.textContent = student.avatarInitials || 'YS');

  if (student.avatarUrl) {
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

// Fetch applications from API or local store and render
async function loadAndRenderApplications() {
  const container = document.getElementById('applicationsListContainer');
  if (container) {
    container.innerHTML = `
      <div class="col-12 py-5 text-center">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Loading applications...</span>
        </div>
        <p class="text-muted small mt-3">Connecting to tracking engine & retrieving application statuses...</p>
      </div>
    `;
  }

  const student = ApplicationsDataStore.getStudent();
  allApplications = await ApplicationsApiService.getApplications(student.id || 'stud-101');

  // Render 7 KPI summary cards + 3 Hero Metric cards
  renderSummaryKPIs();

  // Render interview callout banner if an interview is scheduled
  renderInterviewCallout();

  // Render list of application cards with current filters applied
  renderApplicationsList();
}

// 1. Calculate & Render Summary KPI Cards + 3 Hero Section Metrics
function renderSummaryKPIs() {
  const total = allApplications.length;
  const applied = allApplications.filter(a => ApplicationsDataStore.normalizeStatus(a.status) === 'Applied').length;
  const underReview = allApplications.filter(a => ApplicationsDataStore.normalizeStatus(a.status) === 'Under Review').length;
  const shortlisted = allApplications.filter(a => ApplicationsDataStore.normalizeStatus(a.status) === 'Shortlisted').length;
  const interviewScheduled = allApplications.filter(a => ApplicationsDataStore.normalizeStatus(a.status) === 'Interview Scheduled').length;
  const selected = allApplications.filter(a => ApplicationsDataStore.normalizeStatus(a.status) === 'Selected').length;
  const rejected = allApplications.filter(a => ApplicationsDataStore.normalizeStatus(a.status) === 'Rejected').length;

  // 1. 7 KPI Summary Cards
  const totalEl = document.getElementById('kpiTotalCount');
  const appliedEl = document.getElementById('kpiAppliedCount');
  const reviewEl = document.getElementById('kpiReviewCount');
  const shortlistedEl = document.getElementById('kpiShortlistedCount');
  const interviewEl = document.getElementById('kpiInterviewCount');
  const selectedEl = document.getElementById('kpiSelectedCount');
  const rejectedEl = document.getElementById('kpiRejectedCount');

  if (totalEl) totalEl.textContent = total;
  if (appliedEl) appliedEl.textContent = applied;
  if (reviewEl) reviewEl.textContent = underReview;
  if (shortlistedEl) shortlistedEl.textContent = shortlisted;
  if (interviewEl) interviewEl.textContent = interviewScheduled;
  if (selectedEl) selectedEl.textContent = selected;
  if (rejectedEl) rejectedEl.textContent = rejected;

  // 2. 3 Hero Section Metric Cards (Pending Applications, Upcoming Interviews, Offers Received)
  const heroPendingEl = document.getElementById('heroPendingCount');
  const heroPendingSub = document.getElementById('heroPendingSubtext');
  const heroInterviewsEl = document.getElementById('heroInterviewsCount');
  const heroInterviewsSub = document.getElementById('heroInterviewsSubtext');
  const heroOffersEl = document.getElementById('heroOffersCount');
  const heroOffersSub = document.getElementById('heroOffersSubtext');

  // Pending Applications includes Applied, Under Review, Shortlisted, and Interview Scheduled (all active applications not Selected or Rejected)
  const pendingCount = applied + underReview + shortlisted + interviewScheduled;
  if (heroPendingEl) {
    heroPendingEl.textContent = pendingCount;
    if (heroPendingSub) {
      heroPendingSub.textContent = pendingCount > 0 ? `${pendingCount} In Active Hiring Pipeline` : 'No pending applications';
    }
  }

  if (heroInterviewsEl) {
    heroInterviewsEl.textContent = interviewScheduled;
    if (heroInterviewsSub) {
      const scheduledApp = allApplications.find(a => ApplicationsDataStore.normalizeStatus(a.status) === 'Interview Scheduled' && a.interviewDate);
      if (scheduledApp) {
        heroInterviewsSub.textContent = `Next: ${scheduledApp.interviewDate.split('•')[0].trim()}`;
      } else {
        heroInterviewsSub.textContent = interviewScheduled > 0 ? `${interviewScheduled} Active Round` : 'No interviews scheduled';
      }
    }
  }

  if (heroOffersEl) {
    heroOffersEl.textContent = selected;
    if (heroOffersSub) {
      heroOffersSub.textContent = selected > 0 ? `${selected} Corporate Offer Package` : 'No offers received yet';
    }
  }

  // 3. Database Connection Badge
  const syncBadge = document.getElementById('backendSyncBadge');
  if (syncBadge) {
    if (ApplicationsApiService.isBackendConnected) {
      syncBadge.innerHTML = '<span class="text-success"><i class="bi bi-cloud-check-fill me-1"></i>Connected to MySQL Backend</span>';
    } else {
      syncBadge.innerHTML = '<span class="text-muted"><i class="bi bi-hdd-fill me-1"></i>Offline Persistence Store (Local Data)</span>';
    }
  }
}

// Render Upcoming Interview Callout Banner if an interview is scheduled
function renderInterviewCallout() {
  const container = document.getElementById('interviewCalloutContainer');
  if (!container) return;

  const upcomingInterview = allApplications.find(a => 
    ApplicationsDataStore.normalizeStatus(a.status) === 'Interview Scheduled' && a.interviewDate && !a.interviewDate.includes('Completed')
  );

  if (upcomingInterview) {
    const meetUrl = upcomingInterview.interviewLink || 'https://meet.google.com';
    container.innerHTML = `
      <div class="interview-callout-card mb-4 d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
        <div class="d-flex align-items-start gap-3">
          <div class="rounded-circle bg-white text-info shadow-sm p-3 d-flex align-items-center justify-content-center flex-shrink-0" style="width: 52px; height: 52px; color: #06B6D4 !important;">
            <i class="bi bi-calendar-check-fill fs-4"></i>
          </div>
          <div>
            <span class="badge px-2 py-0-5 rounded-pill small mb-1 fw-bold" style="background-color: #06B6D4; color: #fff;">
              <i class="bi bi-broadcast me-1"></i> Interview Round Confirmed
            </span>
            <h5 class="fw-bold text-dark mb-1">${upcomingInterview.position} at ${upcomingInterview.company}</h5>
            <div class="text-muted small d-flex flex-wrap align-items-center gap-2">
              <span><i class="bi bi-clock me-1 text-primary"></i><strong>${upcomingInterview.interviewDate}</strong></span>
              <span>&bull;</span>
              <span><i class="bi bi-camera-video me-1"></i>${upcomingInterview.interviewMode || 'Google Meet'}</span>
              <span>&bull;</span>
              <span><i class="bi bi-geo-alt me-1"></i>${upcomingInterview.location}</span>
            </div>
          </div>
        </div>
        <div class="d-flex gap-2 align-self-end align-self-md-center flex-shrink-0">
          <button type="button" class="btn btn-outline-custom btn-sm px-3 view-app-details-btn" data-id="${upcomingInterview.id}">
            <i class="bi bi-info-circle me-1"></i> View Interview Prep
          </button>
          <a href="${meetUrl}" target="_blank" rel="noopener" class="btn btn-primary-custom btn-sm px-3">
            <i class="bi bi-box-arrow-up-right me-1"></i> Join Meeting
          </a>
        </div>
      </div>
    `;

    container.classList.remove('d-none');
    container.querySelectorAll('.view-app-details-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openApplicationDetailsModal(id);
      });
    });
  } else {
    container.classList.add('d-none');
    container.innerHTML = '';
  }
}

// 2. Filter Controls Initialization
function initFilterControls() {
  const searchInput = document.getElementById('appSearchInput');
  const statusFilter = document.getElementById('statusFilterSelect');
  const dateFilter = document.getElementById('dateFilterSelect');
  const sortBySelect = document.getElementById('sortBySelect');
  const resetBtn = document.getElementById('resetFiltersBtn');

  // Search input handler
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentFilterState.searchQuery = e.target.value.toLowerCase().trim();
      renderApplicationsList();
    });
  }

  // Native status select change handler (if present or triggered programmatically)
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      applyStatusFilter(e.target.value);
    });
  }

  // Custom Accessible Dropdown item click handlers
  const customItems = document.querySelectorAll('#statusFilterDropdownMenu [data-status-val]');
  customItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const val = item.getAttribute('data-status-val');
      applyStatusFilter(val);
    });
  });

  // Date range filter handler
  if (dateFilter) {
    dateFilter.addEventListener('change', (e) => {
      currentFilterState.dateRange = e.target.value;
      renderApplicationsList();
    });
  }

  // Sort dropdown handler
  if (sortBySelect) {
    sortBySelect.addEventListener('change', (e) => {
      currentFilterState.sortBy = e.target.value;
      renderApplicationsList();
    });
  }

  // Quick Status Filter Pills handler
  const statusPills = document.querySelectorAll('.status-filter-pill');
  statusPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const statusVal = pill.getAttribute('data-status');
      applyStatusFilter(statusVal);
    });
  });

  // Reset Filters button handler
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetAllFilters();
    });
  }
}

// Apply Status Filter uniformly to custom dropdown, select input, pills, and view
function applyStatusFilter(statusVal) {
  currentFilterState.status = statusVal;

  // 1. Sync Native / Test Select element
  const statusFilter = document.getElementById('statusFilterSelect');
  if (statusFilter) {
    statusFilter.value = statusVal;
  }

  // 2. Sync Custom Accessible Dropdown UI (circular dot, text, and active item)
  const meta = STATUS_COLORS[statusVal] || STATUS_COLORS['all'];
  const customDot = document.getElementById('statusSelectedDot');
  const customText = document.getElementById('statusSelectedText');
  const customBtn = document.getElementById('statusDropdownToggleBtn');

  if (customDot) {
    customDot.style.backgroundColor = meta.hex;
  }
  if (customText) {
    customText.textContent = meta.label;
  }
  if (customBtn) {
    if (statusVal === 'all') {
      customBtn.style.borderColor = 'var(--border-color)';
    } else {
      customBtn.style.borderColor = meta.hex;
    }
  }

  // Active checkmark in custom dropdown menu
  const customItems = document.querySelectorAll('#statusFilterDropdownMenu [data-status-val]');
  customItems.forEach(item => {
    const itemVal = item.getAttribute('data-status-val');
    const checkIcon = item.querySelector('.status-item-check');
    if (itemVal.toLowerCase() === statusVal.toLowerCase()) {
      item.classList.add('active');
      if (checkIcon) checkIcon.classList.remove('d-none');
    } else {
      item.classList.remove('active');
      if (checkIcon) checkIcon.classList.add('d-none');
    }
  });

  // 3. Sync Quick Filter Pills
  const statusPills = document.querySelectorAll('.status-filter-pill');
  statusPills.forEach(p => {
    const pVal = p.getAttribute('data-status');
    if (pVal.toLowerCase() === statusVal.toLowerCase()) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });

  renderApplicationsList();
}

// Reset All Filters to default state
function resetAllFilters() {
  currentFilterState = {
    searchQuery: '',
    status: 'all',
    dateRange: 'all',
    sortBy: 'newest'
  };

  const searchInput = document.getElementById('appSearchInput');
  const dateFilter = document.getElementById('dateFilterSelect');
  const sortBySelect = document.getElementById('sortBySelect');

  if (searchInput) searchInput.value = '';
  if (dateFilter) dateFilter.value = 'all';
  if (sortBySelect) sortBySelect.value = 'newest';

  applyStatusFilter('all');
  showToast('Filters reset to default view. Showing all applications.', 'info');
}

// Clicking on KPI Cards sets the corresponding status filter
function initKpiCardClickHandlers() {
  const kpiMappings = [
    { id: 'kpiTotalCount', status: 'all' },
    { id: 'kpiAppliedCount', status: 'Applied' },
    { id: 'kpiReviewCount', status: 'Under Review' },
    { id: 'kpiShortlistedCount', status: 'Shortlisted' },
    { id: 'kpiInterviewCount', status: 'Interview Scheduled' },
    { id: 'kpiSelectedCount', status: 'Selected' },
    { id: 'kpiRejectedCount', status: 'Rejected' }
  ];

  kpiMappings.forEach(m => {
    const countEl = document.getElementById(m.id);
    if (countEl) {
      const card = countEl.closest('.card');
      if (card) {
        card.style.cursor = 'pointer';
        card.setAttribute('title', `Filter by ${m.status === 'all' ? 'All Applications' : m.status}`);
        card.addEventListener('click', () => {
          applyStatusFilter(m.status);
        });
      }
    }
  });
}

// 3. Render Applications Tracking Cards with Combined Multi-Criteria Filtering
function renderApplicationsList() {
  const container = document.getElementById('applicationsListContainer');
  const countDisplay = document.getElementById('applicationsCountDisplay');
  if (!container) return;

  let list = [...allApplications];

  // 1. Search Filter (Company, Job Role / Position, Location)
  if (currentFilterState.searchQuery) {
    const q = currentFilterState.searchQuery;
    list = list.filter(item => {
      const company = (item.company || '').toLowerCase();
      const position = (item.position || '').toLowerCase();
      const location = (item.location || '').toLowerCase();
      return company.includes(q) || position.includes(q) || location.includes(q);
    });
  }

  // 2. Status Filter
  if (currentFilterState.status && currentFilterState.status !== 'all') {
    list = list.filter(item => {
      const canonical = ApplicationsDataStore.normalizeStatus(item.status);
      return canonical.toLowerCase() === currentFilterState.status.toLowerCase();
    });
  }

  // 3. Date Range Filter
  if (currentFilterState.dateRange && currentFilterState.dateRange !== 'all') {
    const refTime = Math.max(Date.now(), ...allApplications.map(a => a.appliedTimestamp || 0));
    if (currentFilterState.dateRange === '7days') {
      const sevenDaysAgo = refTime - (7 * 24 * 60 * 60 * 1000);
      list = list.filter(item => (item.appliedTimestamp || 0) >= sevenDaysAgo);
    } else if (currentFilterState.dateRange === '30days') {
      const thirtyDaysAgo = refTime - (30 * 24 * 60 * 60 * 1000);
      list = list.filter(item => (item.appliedTimestamp || 0) >= thirtyDaysAgo);
    }
  }

  // 4. Sorting Filter
  if (currentFilterState.sortBy === 'newest') {
    list.sort((a, b) => (b.appliedTimestamp || 0) - (a.appliedTimestamp || 0));
  } else if (currentFilterState.sortBy === 'oldest') {
    list.sort((a, b) => (a.appliedTimestamp || 0) - (b.appliedTimestamp || 0));
  }

  // Update Count Display
  if (countDisplay) {
    countDisplay.textContent = `Showing ${list.length} of ${allApplications.length} Applications`;
  }

  // Empty State Handling
  if (list.length === 0) {
    const hasActiveFilters = currentFilterState.searchQuery || currentFilterState.status !== 'all' || currentFilterState.dateRange !== 'all';
    container.innerHTML = `
      <div class="col-12 py-5 text-center">
        <div class="card border p-5 shadow-xs rounded-4 bg-white text-center mx-auto" style="max-width: 540px;">
          <div class="rounded-circle bg-light d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 70px; height: 70px;">
            <i class="bi bi-inbox text-muted fs-2"></i>
          </div>
          <h5 class="fw-bold text-dark mb-1">${hasActiveFilters ? 'No Applications Match Your Filter' : 'No Applications Submitted Yet'}</h5>
          <p class="text-muted small mb-4">
            ${hasActiveFilters 
              ? 'No submissions matched your search query or status criteria. Clear your filters to view all active applications.'
              : 'You have not submitted any internship applications yet. Explore our curated recommended internships to apply!'}
          </p>
          <div class="d-flex justify-content-center gap-2">
            ${hasActiveFilters ? `
              <button type="button" class="btn btn-outline-custom px-3" id="emptyResetFilterBtn">
                <i class="bi bi-arrow-counterclockwise me-1"></i> Clear Filters
              </button>
            ` : ''}
            <a href="internships.html" class="btn btn-primary-custom px-4">
              <i class="bi bi-search me-1"></i> Explore Internships
            </a>
          </div>
        </div>
      </div>
    `;

    const emptyResetBtn = document.getElementById('emptyResetFilterBtn');
    if (emptyResetBtn) {
      emptyResetBtn.addEventListener('click', () => {
        resetAllFilters();
      });
    }
    return;
  }

  // Render Application Cards
  container.innerHTML = list.map(app => {
    const canonicalStatus = ApplicationsDataStore.normalizeStatus(app.status || app.recruiterStatus);
    const displayStatusText = canonicalStatus;
    const meta = STATUS_COLORS[canonicalStatus] || STATUS_COLORS['Applied'];

    // Determine status badge class
    let statusPillClass = 'status-pill-applied';
    if (canonicalStatus === 'Under Review') {
      statusPillClass = 'status-pill-review';
    } else if (canonicalStatus === 'Shortlisted') {
      statusPillClass = 'status-pill-shortlisted';
    } else if (canonicalStatus === 'Interview Scheduled') {
      statusPillClass = 'status-pill-interview';
    } else if (canonicalStatus === 'Selected') {
      statusPillClass = 'status-pill-selected';
    } else if (canonicalStatus === 'Rejected') {
      statusPillClass = 'status-pill-rejected';
    }

    // Generate 5-step visual progress timeline
    const timelineHtml = generateTimelineHtml(app.status, app.recruiterStatus);

    return `
      <div class="col-12 mb-4">
        <div class="card border rounded-4 shadow-xs p-4 bg-white hover-shadow transition-all">
          
          <!-- Card Top Bar: Logo, Role, Company, Location, Status -->
          <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 pb-3 border-bottom">
            <div class="d-flex align-items-start gap-3">
              <div class="company-logo-badge" style="background-color: ${app.logoBg || '#4f46e5'};">
                ${app.companyLogoText || (app.company ? app.company.substring(0, 2).toUpperCase() : 'SB')}
              </div>
              <div>
                <h5 class="fw-bold text-dark mb-1 lh-sm">${app.position}</h5>
                <div class="d-flex flex-wrap align-items-center gap-2 text-muted small">
                  <span class="fw-semibold text-dark">${app.company}</span>
                  <i class="bi bi-patch-check-fill text-primary" title="Verified Corporate Partner"></i>
                  <span>&bull;</span>
                  <span><i class="bi bi-geo-alt me-1"></i>${app.location}</span>
                  <span>&bull;</span>
                  <span><i class="bi bi-cash-stack text-success me-1"></i><strong>${app.stipend}</strong></span>
                </div>
              </div>
            </div>

            <!-- Status Badge with Coloured Circular Dot & Applied Date -->
            <div class="d-flex flex-column align-items-md-end gap-1 flex-shrink-0">
              <span class="${statusPillClass}">
                <span class="status-indicator-circle" style="background-color: ${meta.hex};"></span>
                ${displayStatusText}
              </span>
              <small class="text-muted" style="font-size: 0.76rem;">Applied on ${app.applicationDate}</small>
            </div>
          </div>

          <!-- Application Progress Timeline -->
          <div class="py-3">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="text-muted small fw-semibold" style="font-size: 0.78rem;">Application Lifecycle Tracker:</span>
              ${canonicalStatus === 'Interview Scheduled' && app.interviewDate ? `
                <span class="badge px-2 py-0-5 rounded-pill small" style="background-color: #ecfeff; color: #06B6D4; border: 1px solid rgba(6, 182, 212, 0.3);">
                  <i class="bi bi-calendar-check-fill me-1"></i>Interview: ${app.interviewDate}
                </span>
              ` : ''}
              ${canonicalStatus === 'Shortlisted' ? `
                <span class="badge px-2 py-0-5 rounded-pill small" style="background-color: #faf5ff; color: #9333EA; border: 1px solid rgba(147, 51, 234, 0.3);">
                  <i class="bi bi-person-check-fill me-1"></i>Shortlisted for Round
                </span>
              ` : ''}
              ${canonicalStatus === 'Selected' ? `
                <span class="badge px-2 py-0-5 rounded-pill small" style="background-color: #f0fdf4; color: #16A34A; border: 1px solid rgba(22, 163, 74, 0.3);">
                  <i class="bi bi-award-fill me-1"></i>Selected & Offer Released
                </span>
              ` : ''}
            </div>
            ${timelineHtml}
          </div>

          <!-- Recruiter Feedback Quote with Consistent Color Mapping -->
          ${app.recruiterFeedback ? `
            <div class="p-3 bg-light rounded-3 border mb-3 small text-dark d-flex align-items-start gap-2">
              <span class="status-indicator-circle mt-1" style="background-color: ${meta.hex};"></span>
              <div>
                <strong>Recruiter Feedback:</strong> ${app.recruiterFeedback}
              </div>
            </div>
          ` : ''}

          <!-- Footer Actions -->
          <div class="pt-3 border-top d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div class="d-flex align-items-center gap-2 text-muted small" style="font-size: 0.78rem;">
              <i class="bi bi-file-earmark-pdf text-danger fs-6"></i>
              <span>Submitted Resume: <strong>${app.resumeFileName || 'Yazh_S_Resume_2026.pdf'}</strong></span>
              <button type="button" class="btn btn-sm btn-link p-0 text-decoration-none download-resume-btn" title="Download submitted resume">
                <i class="bi bi-download ms-1"></i>
              </button>
            </div>

            <div class="d-flex gap-2">
              ${(canonicalStatus === 'Applied' || canonicalStatus === 'Under Review') ? `
                <button type="button" class="btn btn-outline-danger btn-sm px-3 withdraw-app-btn" data-id="${app.id}" data-role="${app.position}" data-company="${app.company}">
                  <i class="bi bi-x-circle me-1"></i> Withdraw
                </button>
              ` : ''}
              ${(canonicalStatus === 'Interview Scheduled' && app.interviewLink) ? `
                <a href="${app.interviewLink}" target="_blank" rel="noopener" class="btn btn-sm btn-primary-custom px-3">
                  <i class="bi bi-camera-video me-1"></i> Join Interview
                </a>
              ` : ''}
              <button type="button" class="btn btn-outline-custom btn-sm px-3 view-details-modal-btn" data-id="${app.id}">
                <i class="bi bi-eye me-1"></i> View Details
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  }).join('');

  // Attach event listeners
  container.querySelectorAll('.view-details-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openApplicationDetailsModal(id);
    });
  });

  container.querySelectorAll('.withdraw-app-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const role = btn.getAttribute('data-role');
      const company = btn.getAttribute('data-company');
      confirmWithdrawApplication(id, role, company);
    });
  });

  container.querySelectorAll('.download-resume-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      triggerResumeDownload('Yazh_S_Resume_2026.pdf');
    });
  });
}

// Generate Visual 5-Stage Lifecycle Timeline HTML based on current status
// Progression: Applied → Under Review → Shortlisted → Interview Scheduled → Selected
// Rules (Strictly complying with Requirement 5):
// - Applied: First stage completed.
// - Under Review: Applied and Under Review completed.
// - Shortlisted: Previous stages completed.
// - Interview Scheduled: Previous stages completed and Interview active (Cyan #06B6D4).
// - Selected: All previous stages completed and Selected active (Green #16A34A).
// - Rejected: Show a separate red Rejected state (Red #DC2626).
function generateTimelineHtml(status, recruiterStatus) {
  let raw = status;
  if (typeof status === 'object' && status !== null) {
    raw = status.status || status.recruiterStatus;
  }
  let canonical = ApplicationsDataStore.normalizeStatus(raw);
  if (canonical === 'Applied' && recruiterStatus) {
    const recCanonical = ApplicationsDataStore.normalizeStatus(recruiterStatus);
    if (recCanonical !== 'Applied') canonical = recCanonical;
  }

  if (canonical === 'Rejected') {
    return `
      <div class="app-timeline">
        <div class="app-timeline-step completed">
          <div class="app-timeline-dot">
            <i class="bi bi-check-lg"></i>
          </div>
          <span class="app-timeline-label">1. Applied</span>
        </div>
        <div class="app-timeline-step completed">
          <div class="app-timeline-dot">
            <i class="bi bi-check-lg"></i>
          </div>
          <span class="app-timeline-label">2. Under Review</span>
        </div>
        <div class="app-timeline-step rejected">
          <div class="app-timeline-dot">
            <i class="bi bi-x-lg"></i>
          </div>
          <span class="app-timeline-label" style="color: #DC2626 !important; font-weight: 700;">Rejected</span>
        </div>
      </div>
    `;
  }

  let step1Class = '';
  let step2Class = '';
  let step3Class = '';
  let step4Class = '';
  let step5Class = '';

  if (canonical === 'Applied') {
    step1Class = 'completed';
  } else if (canonical === 'Under Review') {
    step1Class = 'completed';
    step2Class = 'completed';
  } else if (canonical === 'Shortlisted') {
    step1Class = 'completed';
    step2Class = 'completed';
    step3Class = 'completed';
  } else if (canonical === 'Interview Scheduled') {
    step1Class = 'completed';
    step2Class = 'completed';
    step3Class = 'completed';
    step4Class = 'active stage-interview';
  } else if (canonical === 'Selected') {
    step1Class = 'completed';
    step2Class = 'completed';
    step3Class = 'completed';
    step4Class = 'completed';
    step5Class = 'active completed stage-selected';
  }

  return `
    <div class="app-timeline">
      <!-- 1. Applied (Blue: #2563EB) -->
      <div class="app-timeline-step ${step1Class}">
        <div class="app-timeline-dot">
          <i class="bi ${step1Class.includes('completed') ? 'bi-check-lg' : 'bi-1-circle'}"></i>
        </div>
        <span class="app-timeline-label">1. Applied</span>
      </div>

      <!-- 2. Under Review (Orange: #F59E0B) -->
      <div class="app-timeline-step ${step2Class}">
        <div class="app-timeline-dot">
          <i class="bi ${step2Class.includes('completed') ? 'bi-check-lg' : 'bi-2-circle'}"></i>
        </div>
        <span class="app-timeline-label">2. Under Review</span>
      </div>

      <!-- 3. Shortlisted (Purple: #9333EA) -->
      <div class="app-timeline-step ${step3Class}">
        <div class="app-timeline-dot">
          <i class="bi ${step3Class.includes('completed') ? 'bi-check-lg' : 'bi-3-circle'}"></i>
        </div>
        <span class="app-timeline-label">3. Shortlisted</span>
      </div>

      <!-- 4. Interview Scheduled (Cyan: #06B6D4) -->
      <div class="app-timeline-step ${step4Class}">
        <div class="app-timeline-dot">
          <i class="bi ${step4Class.includes('completed') ? 'bi-check-lg' : step4Class.includes('active') ? 'bi-calendar-check-fill' : 'bi-4-circle'}"></i>
        </div>
        <span class="app-timeline-label">4. Interview</span>
      </div>

      <!-- 5. Selected (Green: #16A34A) -->
      <div class="app-timeline-step ${step5Class}">
        <div class="app-timeline-dot">
          <i class="bi ${step5Class.includes('completed') ? 'bi-award-fill' : 'bi-5-circle'}"></i>
        </div>
        <span class="app-timeline-label">5. Selected</span>
      </div>
    </div>
  `;
}

// 4. Application Details Modal
function openApplicationDetailsModal(applicationId) {
  const app = allApplications.find(a => a.id === applicationId);
  if (!app) return;

  const canonicalStatus = ApplicationsDataStore.normalizeStatus(app.status || app.recruiterStatus);
  const displayStatus = canonicalStatus;
  const meta = STATUS_COLORS[canonicalStatus] || STATUS_COLORS['Applied'];

  document.getElementById('modalAppRoleTitle').textContent = app.position;
  document.getElementById('modalAppCompany').textContent = app.company;
  document.getElementById('modalAppStatusPill').innerHTML = `
    <span class="badge px-3 py-1-5 rounded-pill fw-bold" style="background-color: ${meta.bg}; color: ${meta.hex}; border: 1px solid ${meta.border};">
      <span class="status-indicator-circle me-1" style="background-color: ${meta.hex};"></span>
      ${displayStatus}
    </span>
  `;

  document.getElementById('modalAppAppliedDate').textContent = app.applicationDate;
  document.getElementById('modalAppLocation').textContent = app.location;
  document.getElementById('modalAppStipend').textContent = app.stipend;
  document.getElementById('modalAppDuration').textContent = app.duration || '6 Months';
  document.getElementById('modalAppResumeName').textContent = app.resumeFileName || 'Yazh_S_Resume_2026.pdf';

  // Recruiter notes
  document.getElementById('modalAppFeedback').textContent = app.recruiterFeedback || 'Application is undergoing technical review.';

  // Interview Schedule Section (Active only when Interview Scheduled)
  const interviewSection = document.getElementById('modalAppInterviewSection');
  if (interviewSection) {
    if (canonicalStatus === 'Interview Scheduled' && app.interviewDate) {
      interviewSection.innerHTML = `
        <div class="p-3 rounded-3 border mb-3" style="background-color: #ecfeff; border-color: rgba(6, 182, 212, 0.35) !important;">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <span class="badge px-2 py-1 rounded-pill small fw-bold" style="background-color: #06B6D4; color: #fff;">
              <i class="bi bi-calendar-check-fill me-1"></i> Interview Round Confirmed
            </span>
            <span class="badge bg-white text-info border small" style="color: #06B6D4 !important; border-color: rgba(6, 182, 212, 0.35) !important;">Round 1: Technical</span>
          </div>
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-2">
            <div>
              <div class="fw-bold text-dark fs-6">${app.interviewDate}</div>
              <small class="text-muted d-block">${app.interviewMode || 'Google Meet'} &bull; ${app.interviewDetails || 'Technical Assessment'}</small>
            </div>
            ${app.interviewLink ? `
              <a href="${app.interviewLink}" target="_blank" rel="noopener" class="btn btn-sm btn-primary-custom px-3">
                <i class="bi bi-camera-video me-1"></i> Join Meeting
              </a>
            ` : ''}
          </div>
        </div>
      `;
      interviewSection.classList.remove('d-none');
    } else {
      interviewSection.classList.add('d-none');
      interviewSection.innerHTML = '';
    }
  }

  // Offer Details Section (Displayed ONLY for Selected Candidates)
  const offerSection = document.getElementById('modalAppOfferSection');
  if (offerSection) {
    if (canonicalStatus === 'Selected') {
      const offer = app.offerDetails || {
        stipend: app.stipend,
        duration: app.duration || '6 Months',
        joiningDate: '15 Dec 2026',
        workMode: (app.location && app.location.includes('Remote')) ? 'Remote (Work from Home)' : 'Hybrid',
        reportingManager: 'Engineering Team Lead',
        offerLetterName: `${app.company.replace(/\s+/g, '_')}_Offer_Letter_Yazh_S.pdf`
      };

      offerSection.innerHTML = `
        <div class="p-3 rounded-3 border mb-3" style="background-color: #f0fdf4; border-color: rgba(22, 163, 74, 0.35) !important;">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <span class="badge bg-success text-white px-2 py-1 rounded-pill small fw-bold">
              <i class="bi bi-award-fill me-1"></i> Official Internship Offer Released
            </span>
            <span class="badge bg-white text-success border border-success-subtle small fw-bold">Verified Candidate</span>
          </div>
          <div class="row g-2 text-dark small mb-3">
            <div class="col-6 col-sm-3">
              <span class="text-muted d-block" style="font-size: 0.72rem;">Offered Stipend</span>
              <strong class="text-success">${offer.stipend || app.stipend}</strong>
            </div>
            <div class="col-6 col-sm-3">
              <span class="text-muted d-block" style="font-size: 0.72rem;">Joining Date</span>
              <strong>${offer.joiningDate || '15 Dec 2026'}</strong>
            </div>
            <div class="col-6 col-sm-3">
              <span class="text-muted d-block" style="font-size: 0.72rem;">Internship Term</span>
              <strong>${offer.duration || app.duration}</strong>
            </div>
            <div class="col-6 col-sm-3">
              <span class="text-muted d-block" style="font-size: 0.72rem;">Work Mode</span>
              <strong>${offer.workMode || 'Remote'}</strong>
            </div>
          </div>
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-2 border-top border-success-subtle">
            <small class="text-muted">
              <i class="bi bi-person-badge me-1"></i> Reporting to: <strong>${offer.reportingManager || 'Engineering Lead'}</strong>
            </small>
            <button type="button" class="btn btn-sm btn-success px-3" onclick="triggerOfferDownload('${offer.offerLetterName || 'NextGen_Offer_Letter_Yazh_S.pdf'}')">
              <i class="bi bi-file-earmark-check-fill me-1"></i> Download Offer Letter
            </button>
          </div>
        </div>
      `;
      offerSection.classList.remove('d-none');
    } else {
      offerSection.classList.add('d-none');
      offerSection.innerHTML = '';
    }
  }

  // Visual Timeline inside modal
  const modalTimeline = document.getElementById('modalAppTimelineContainer');
  if (modalTimeline) {
    modalTimeline.innerHTML = generateTimelineHtml(app.status, app.recruiterStatus);
  }

  // Recruiter Status Simulation Dropdown
  const statusSelect = document.getElementById('modalRecruiterStatusSelect');
  if (statusSelect) {
    statusSelect.value = canonicalStatus;
    statusSelect.onchange = async () => {
      const newStatus = statusSelect.value;
      let notes = `Status updated to ${newStatus} by enterprise recruiter.`;
      if (newStatus === 'Selected') {
        notes = 'Congratulations! Candidate cleared all interview rounds and received the official internship offer package.';
      } else if (newStatus === 'Interview Scheduled') {
        notes = 'Technical interview scheduled with Senior Engineering Lead. Meeting link generated.';
      } else if (newStatus === 'Shortlisted') {
        notes = 'Candidate successfully shortlisted for interview. Technical scheduling in progress.';
      } else if (newStatus === 'Under Review') {
        notes = 'Resume and verified SkillBridge credentials undergoing technical evaluation.';
      } else if (newStatus === 'Applied') {
        notes = 'Application received and queued for HR screening.';
      } else if (newStatus === 'Rejected') {
        notes = 'Position closed after final candidate selection. Profile archived.';
      }

      await ApplicationsApiService.updateStatus(app.id, newStatus, notes);
      showToast(`Recruiter updated application status to "${newStatus}".`, 'success');
      await loadAndRenderApplications();
      openApplicationDetailsModal(app.id); // Refresh modal view synchronously
    };
  }

  // Modal withdraw button
  const withdrawBtn = document.getElementById('modalWithdrawBtn');
  if (withdrawBtn) {
    if (canonicalStatus === 'Applied' || canonicalStatus === 'Under Review') {
      withdrawBtn.classList.remove('d-none');
      withdrawBtn.onclick = () => {
        const modalEl = document.getElementById('applicationDetailsModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
        confirmWithdrawApplication(app.id, app.position, app.company);
      };
    } else {
      withdrawBtn.classList.add('d-none');
    }
  }

  // Download resume inside modal
  const downloadBtn = document.getElementById('modalDownloadResumeBtn');
  if (downloadBtn) {
    downloadBtn.onclick = () => triggerResumeDownload(app.resumeFileName || 'Yazh_S_Resume_2026.pdf');
  }

  const modalEl = document.getElementById('applicationDetailsModal');
  if (modalEl && window.bootstrap) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

// 5. Withdraw Application Action with Confirmation Dialog
function confirmWithdrawApplication(appId, role, company) {
  const modalEl = document.getElementById('withdrawConfirmModal');
  const roleDisplay = document.getElementById('withdrawModalRoleDisplay');
  const confirmBtn = document.getElementById('confirmWithdrawSubmitBtn');

  if (roleDisplay) {
    roleDisplay.innerHTML = `<strong>${role}</strong> at <strong>${company}</strong>`;
  }

  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      const bsModal = bootstrap.Modal.getInstance(modalEl);
      if (bsModal) bsModal.hide();

      await ApplicationsApiService.deleteApplication(appId);
      showToast(`Application for ${role} at ${company} was successfully withdrawn.`, 'info');
      await loadAndRenderApplications();
    };
  }

  if (modalEl && window.bootstrap) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

// 6. Resume & Offer Letter Downloads
function triggerResumeDownload(fileName) {
  showToast(`Preparing download for ${fileName}...`, 'info');
  setTimeout(() => {
    const content = `SkillBridge Verified Candidate Resume
Candidate Name: Yazh S
Registration ID: SKILL-2026-YS01
Degree: B.E. Final Year, Computer Science & Engineering
Batch: 2026
Verified Skills: Java, Spring Boot, MySQL, Python, JavaScript, HTML5, CSS3, REST APIs, Git
Verified Assessment Scores:
- Java Assessment: 90% (Distinction)
- MySQL Assessment: 88% (Advanced)
- Python Assessment: 82% (Proficient)
Contact: yazh.s@example.com | +91 98765 43210
GitHub: https://github.com/yazh-s
LinkedIn: https://linkedin.com/in/yazh-s
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloaded ${fileName} successfully.`, 'success');
  }, 400);
}

function triggerOfferDownload(fileName) {
  showToast(`Preparing official offer letter ${fileName}...`, 'info');
  setTimeout(() => {
    const content = `=====================================================
SKILLBRIDGE CORPORATE PARTNERSHIP - INTERNSHIP OFFER
=====================================================
Date: 20 November 2026
Candidate: Yazh S
Role: Frontend Web Developer Intern
Company: NextGen Digital Labs
Monthly Stipend: ₹30,000 / month
Duration: 3 Months (Extendable to Full-Time based on performance)
Orientation / Joining Date: 15 December 2026
Work Mode: Remote (Work from Home)
Reporting Manager: Ananya Roy, Principal UI Architect

Congratulations on clearing all technical and evaluation rounds with distinction.
Welcome to NextGen Digital Labs!
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Offer letter downloaded successfully.`, 'success');
  }, 400);
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
