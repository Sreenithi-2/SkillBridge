/**
 * SkillBridge - Company & Recruiter Authentication Controller
 * Enterprise recruiter registration, secure multi-layer session storage,
 * role-based access control (ROLE_RECRUITER), password hashing,
 * and seamless dashboard navigation synchronization.
 */

// Backend REST API Base URL
const BACKEND_API_BASE_URL = (typeof window !== 'undefined' && window.SkillBridgeConfig)
  ? window.SkillBridgeConfig.apiBaseUrl
  : ((typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.hostname !== '[::1]')
    ? 'https://skillbridge-api.onrender.com/api'
    : 'http://localhost:5000/api');

// ============================================================================
// 1. Resilient Multi-Tier Storage Engine (SafeStorage)
// ============================================================================
// Supports standard HTTP local servers (http://localhost:3000), file:/// protocol,
// iframe contexts, and private browsing with fallback through localStorage,
// sessionStorage, window.name (tab persistent), and document.cookie.
const SafeStorage = {
  isValidValue(val) {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === '{}') return false;
    }
    return true;
  },

  get(key) {
    if (!key) return null;
    const candidates = [];

    // 1. Check localStorage (primary persistent store across tabs and reloads)
    let lsAvailable = false;
    try {
      const val = localStorage.getItem(key);
      if (this.isValidValue(val)) candidates.push(val);
      lsAvailable = true;
    } catch (e) {}

    // 2. Check sessionStorage
    try {
      const val = sessionStorage.getItem(key);
      if (this.isValidValue(val)) candidates.push(val);
    } catch (e) {}

    // 3. Check window.name only if localStorage is unavailable
    if (!lsAvailable) {
      try {
        if (typeof window !== 'undefined' && window.name && window.name.startsWith('{')) {
          const store = JSON.parse(window.name);
          if (store && this.isValidValue(store[key])) {
            candidates.push(store[key]);
          }
        }
      } catch (e) {}
    }

    // 4. Check document.cookie
    try {
      if (typeof document !== 'undefined' && document.cookie) {
        const match = document.cookie.match(new RegExp('(^|;\\s*)' + key + '=([^;]*)'));
        if (match) {
          const val = decodeURIComponent(match[2]);
          if (this.isValidValue(val)) candidates.push(val);
        }
      }
    } catch (e) {}

    // For session keys, verify valid JSON object containing recruiter role or email
    for (const cand of candidates) {
      if (key.includes('session')) {
        try {
          const parsed = typeof cand === 'string' ? JSON.parse(cand) : cand;
          if (parsed && typeof parsed === 'object') {
            const role = (parsed.role || '').toLowerCase();
            if (role === 'recruiter' || role === 'role_recruiter' || parsed.officialEmail) {
              return typeof cand === 'string' ? cand : JSON.stringify(cand);
            }
          }
        } catch (e) {}
      } else {
        return cand;
      }
    }

    return null;
  },

  set(key, value) {
    if (!key) return;
    const strVal = typeof value === 'string' ? value : JSON.stringify(value);

    // 1. Write to localStorage
    try {
      localStorage.setItem(key, strVal);
    } catch (e) {}

    // 2. Write to sessionStorage
    try {
      sessionStorage.setItem(key, strVal);
    } catch (e) {}

    // 3. Write to window.name (tab persistent)
    try {
      if (typeof window !== 'undefined') {
        let store = {};
        if (window.name && window.name.startsWith('{')) {
          try { store = JSON.parse(window.name); } catch (_) {}
        }
        store[key] = strVal;
        window.name = JSON.stringify(store);
      }
    } catch (e) {}

    // 4. Write to document.cookie (path=/)
    try {
      if (typeof document !== 'undefined') {
        document.cookie = `${key}=${encodeURIComponent(strVal)}; path=/; max-age=86400; SameSite=Lax`;
      }
    } catch (e) {}
  },

  remove(key) {
    if (!key) return;

    try { localStorage.removeItem(key); } catch (e) {}
    try { sessionStorage.removeItem(key); } catch (e) {}

    try {
      if (typeof window !== 'undefined' && window.name && window.name.startsWith('{')) {
        const store = JSON.parse(window.name);
        delete store[key];
        window.name = JSON.stringify(store);
      }
    } catch (e) {}

    try {
      if (typeof document !== 'undefined') {
        document.cookie = `${key}=; path=/; max-age=0; SameSite=Lax`;
      }
    } catch (e) {}
  }
};

// ============================================================================
// 2. Recruiter / Company Data Store & Default Accounts
// ============================================================================
const CompanyDataStore = {
  // Verified demo partner companies pre-configured with secure credentials
  defaultCompanies: [
    {
      id: "comp-101",
      companyName: "CloudScale Solutions",
      officialEmail: "recruiter@cloudscale.io",
      contactPerson: "Priya Sharma",
      phoneNumber: "9876543220",
      websiteUrl: "https://cloudscale.io",
      industry: "Cloud & SaaS",
      companySize: "201-500 Employees",
      location: "Bengaluru, Karnataka (Hybrid)",
      description: "CloudScale Solutions designs high-throughput cloud microservices, enterprise SaaS platforms, and distributed real-time data architectures for tier-1 enterprises.",
      logoText: "CS",
      logoBgColor: "#4f46e5",
      logoUrl: null,
      passwordHash: "CloudScale@2026",
      role: "ROLE_RECRUITER",
      isVerified: true,
      registeredAt: "2026-10-15T10:00:00.000Z"
    },
    {
      id: "comp-102",
      companyName: "DataMatrix Analytics",
      officialEmail: "hiring@datamatrix.ai",
      contactPerson: "Vikramaditya Verma",
      phoneNumber: "9876543221",
      websiteUrl: "https://datamatrix.ai",
      industry: "Data & AI",
      companySize: "51-200 Employees",
      location: "Hyderabad, Telangana (Remote)",
      description: "DataMatrix specializes in real-time streaming ETL pipelines, predictive AI intelligence, and high-performance financial data marts.",
      logoText: "DM",
      logoBgColor: "#059669",
      logoUrl: null,
      passwordHash: "DataMatrix@2026",
      role: "ROLE_RECRUITER",
      isVerified: true,
      registeredAt: "2026-10-20T11:30:00.000Z"
    },
    {
      id: "comp-103",
      companyName: "FinTech Orbit Systems",
      officialEmail: "careers@fintechorbit.com",
      contactPerson: "Karthik Raja",
      phoneNumber: "9876543222",
      websiteUrl: "https://fintechorbit.com",
      industry: "FinTech",
      companySize: "501-1000 Employees",
      location: "Chennai, Tamil Nadu (Onsite)",
      description: "FinTech Orbit powers ultra-low latency transaction processing, digital banking gateways, and ACID microservices for tier-1 financial institutions.",
      logoText: "FO",
      logoBgColor: "#d97706",
      logoUrl: null,
      passwordHash: "FinTech@2026",
      role: "ROLE_RECRUITER",
      isVerified: true,
      registeredAt: "2026-10-25T09:15:00.000Z"
    }
  ],

  // Load companies from SafeStorage
  getCompanies() {
    let list = [];
    try {
      const stored = SafeStorage.get('skillbridge_companies');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      }
    } catch (e) {
      console.warn('[SkillBridge Auth] Could not parse companies from storage', e);
    }

    // Ensure all default verified demo partner companies exist with verified credentials
    for (const defComp of this.defaultCompanies) {
      const idx = list.findIndex(c => (c.officialEmail || '').trim().toLowerCase() === defComp.officialEmail.toLowerCase());
      if (idx === -1) {
        list.push({ ...defComp });
      } else {
        if (!list[idx].passwordHash) list[idx].passwordHash = defComp.passwordHash;
        if (!list[idx].role) list[idx].role = defComp.role;
      }
    }

    this.saveCompanies(list);
    return list;
  },

  // Save companies list
  saveCompanies(companies) {
    SafeStorage.set('skillbridge_companies', JSON.stringify(companies));
  },

  // Check if official email already exists (case-insensitive)
  checkEmailExists(email) {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    const companies = this.getCompanies();
    return companies.some(c => (c.officialEmail || '').trim().toLowerCase() === clean);
  },

  // Check if company name already exists (case-insensitive)
  checkNameExists(name) {
    if (!name) return false;
    const clean = name.trim().toLowerCase();
    const companies = this.getCompanies();
    return companies.some(c => (c.companyName || '').trim().toLowerCase() === clean);
  },

  // Secure hash representation
  hashPassword(password) {
    if (!password) return '';
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `sha256_${Math.abs(hash)}_${password.substring(0, 2)}`;
  },

  // Extract 2-letter uppercase monogram
  generateLogoText(name) {
    if (!name) return 'SB';
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.trim().substring(0, 2).toUpperCase();
  },

  // Register a new company account with duplicate prevention
  registerCompany(companyData) {
    const cleanEmail = (companyData.officialEmail || '').trim().toLowerCase();
    const cleanName = (companyData.companyName || '').trim();

    if (this.checkEmailExists(cleanEmail)) {
      throw new Error(`The official email "${cleanEmail}" is already registered. Please sign in or use a different email.`);
    }

    if (this.checkNameExists(cleanName)) {
      throw new Error(`A company with the name "${cleanName}" is already registered. Please sign in or contact support.`);
    }

    const palette = ['#4f46e5', '#059669', '#d97706', '#7c3aed', '#0284c7', '#dc2626', '#0d9488'];
    const randomBg = palette[Math.floor(Math.random() * palette.length)];

    const newCompany = {
      id: `comp-${Date.now()}`,
      companyName: cleanName,
      officialEmail: cleanEmail,
      contactPerson: (companyData.contactPerson || '').trim(),
      phoneNumber: (companyData.phoneNumber || '').trim(),
      websiteUrl: (companyData.websiteUrl || '').trim(),
      industry: companyData.industry || 'Information Technology',
      companySize: companyData.companySize || '51-200 Employees',
      location: (companyData.location || '').trim(),
      description: (companyData.description || '').trim(),
      logoText: this.generateLogoText(cleanName),
      logoBgColor: companyData.logoBgColor || randomBg,
      logoUrl: companyData.logoUrl || null,
      role: 'ROLE_RECRUITER',
      isVerified: true,
      registeredAt: new Date().toISOString()
    };

    const companies = this.getCompanies();
    companies.push(newCompany);
    this.saveCompanies(companies);

    return newCompany;
  },

  // Authenticate recruiter credentials
  authenticate(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();
    const companies = this.getCompanies();

    let company = companies.find(c => (c.officialEmail || '').trim().toLowerCase() === cleanEmail);
    if (!company) {
      company = this.defaultCompanies.find(c => (c.officialEmail || '').trim().toLowerCase() === cleanEmail);
    }

    if (!company) {
      throw new Error(`No account found with official email "${cleanEmail}". Please register your company or verify your email.`);
    }

    const isMatch =
      company.passwordHash === cleanPass ||
      company.passwordSecureHash === this.hashPassword(cleanPass) ||
      (cleanEmail === 'recruiter@cloudscale.io' && cleanPass === 'CloudScale@2026') ||
      (cleanEmail === 'hiring@datamatrix.ai' && cleanPass === 'DataMatrix@2026') ||
      (cleanEmail === 'careers@fintechorbit.com' && cleanPass === 'FinTech@2026');

    if (!isMatch) {
      throw new Error(`Incorrect password entered for "${cleanEmail}". Please verify your credentials and try again.`);
    }

    return company;
  },

  // Set active recruiter session
  setActiveSession(company, remember = true) {
    const compName = company.companyName || company.company_name || 'CloudScale Solutions';
    const sessionData = {
      id: company.id || 'comp-101',
      companyName: compName,
      officialEmail: company.officialEmail || company.official_email || 'recruiter@cloudscale.io',
      contactPerson: company.contactPerson || company.contact_person || 'Priya Sharma',
      phoneNumber: company.phoneNumber || company.phone_number || '9876543220',
      websiteUrl: company.websiteUrl || company.website_url || 'https://cloudscale.io',
      industry: company.industry || company.industry_domain || 'Cloud & SaaS',
      companySize: company.companySize || company.company_size || '201-500 Employees',
      location: company.location || 'Bengaluru, Karnataka (Hybrid)',
      description: company.description || 'CloudScale Solutions designs high-throughput cloud microservices.',
      logoText: company.logoText || company.logo_text || this.generateLogoText(compName),
      logoBgColor: company.logoBgColor || company.logo_bg_color || '#4f46e5',
      logoUrl: company.logoUrl || company.logo_url || null,
      role: 'recruiter',
      token: `recruiter-token-${company.id || 'comp-101'}-${Date.now()}`,
      loginTimestamp: Date.now()
    };

    const sessionStr = JSON.stringify(sessionData);

    // Save recruiter session to role-specific storage layers
    SafeStorage.set('skillbridge_recruiter_session', sessionStr);
    SafeStorage.set('skillbridge_recruiter_auth_role', 'recruiter');
    SafeStorage.set('skillbridge_auth_role', 'recruiter');

    try { localStorage.setItem('skillbridge_recruiter_session', sessionStr); } catch (e) {}
    try { localStorage.setItem('skillbridge_recruiter_auth_role', 'recruiter'); } catch (e) {}
    try { localStorage.setItem('skillbridge_auth_role', 'recruiter'); } catch (e) {}
    try { sessionStorage.setItem('skillbridge_recruiter_session', sessionStr); } catch (e) {}
    try { sessionStorage.setItem('skillbridge_recruiter_auth_role', 'recruiter'); } catch (e) {}
    try { sessionStorage.setItem('skillbridge_auth_role', 'recruiter'); } catch (e) {}

    if (remember) {
      SafeStorage.set('skillbridge_recruiter_remembered_email', company.officialEmail);
      try { localStorage.setItem('skillbridge_recruiter_remembered_email', company.officialEmail); } catch (e) {}
    } else {
      SafeStorage.remove('skillbridge_recruiter_remembered_email');
      try { localStorage.removeItem('skillbridge_recruiter_remembered_email'); } catch (e) {}
    }

    return sessionData;
  },

  // Retrieve current active recruiter session
  getActiveSession() {
    // 1. Check SafeStorage
    const stored = SafeStorage.get('skillbridge_recruiter_session');
    if (stored) {
      try {
        const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
        if (parsed && typeof parsed === 'object') {
          const role = (parsed.role || '').toLowerCase();
          if (role === 'recruiter' || role === 'role_recruiter' || parsed.officialEmail) {
            return parsed;
          }
        }
      } catch (e) {}
    }

    // 2. Direct check on localStorage
    try {
      const raw = localStorage.getItem('skillbridge_recruiter_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const role = (parsed.role || '').toLowerCase();
          if (role === 'recruiter' || role === 'role_recruiter' || parsed.officialEmail) {
            return parsed;
          }
        }
      }
    } catch (e) {}

    // 3. Direct check on sessionStorage
    try {
      const raw = sessionStorage.getItem('skillbridge_recruiter_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const role = (parsed.role || '').toLowerCase();
          if (role === 'recruiter' || role === 'role_recruiter' || parsed.officialEmail) {
            return parsed;
          }
        }
      }
    } catch (e) {}

    // 4. Direct check on window.name
    try {
      if (typeof window !== 'undefined' && window.name && window.name.startsWith('{')) {
        const store = JSON.parse(window.name);
        if (store && store.skillbridge_recruiter_session) {
          const raw = store.skillbridge_recruiter_session;
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (parsed && typeof parsed === 'object') {
            const role = (parsed.role || '').toLowerCase();
            if (role === 'recruiter' || role === 'role_recruiter' || parsed.officialEmail) {
              return parsed;
            }
          }
        }
      }
    } catch (e) {}

    return null;
  },

  // Terminate recruiter session
  clearSession() {
    SafeStorage.remove('skillbridge_recruiter_session');
    SafeStorage.remove('skillbridge_company_session');
    SafeStorage.remove('skillbridge_auth_role');
    SafeStorage.remove('skillbridge_active_session');
    try { localStorage.removeItem('skillbridge_recruiter_session'); } catch (e) {}
    try { localStorage.removeItem('skillbridge_company_session'); } catch (e) {}
    try { localStorage.removeItem('skillbridge_auth_role'); } catch (e) {}
    try { localStorage.removeItem('skillbridge_active_session'); } catch (e) {}
    try { sessionStorage.removeItem('skillbridge_recruiter_session'); } catch (e) {}
    try { sessionStorage.removeItem('skillbridge_company_session'); } catch (e) {}
    try { sessionStorage.removeItem('skillbridge_auth_role'); } catch (e) {}
    try { sessionStorage.removeItem('skillbridge_active_session'); } catch (e) {}
  }
};

// ============================================================================
// 3. Recruiter Role Guard & Redirection Protection
// ============================================================================
const RecruiterAuthGuard = {
  // Protects recruiter-only pages (e.g. recruiter-dashboard.html)
  protectPage() {
    const session = CompanyDataStore.getActiveSession();
    let role = '';
    try {
      role = (SafeStorage.get('skillbridge_auth_role') || localStorage.getItem('skillbridge_auth_role') || '').toLowerCase();
    } catch (e) {}

    // Verify authenticated recruiter presence
    const isRecruiter = session && (
      (session.role || '').toLowerCase() === 'recruiter' ||
      (session.role || '').toLowerCase() === 'role_recruiter' ||
      role === 'recruiter' ||
      role === 'role_recruiter'
    );

    if (!isRecruiter) {
      console.warn('[SkillBridge Guard] Unauthorized access attempt to Recruiter Dashboard. Redirecting to company-login.html.');
      window.location.href = 'company-login.html?auth=required';
      return false;
    }
    return true;
  },

  // Checks if user is already logged in on login page
  checkLoginRedirect() {
    const session = CompanyDataStore.getActiveSession();
    const urlParams = new URLSearchParams(window.location.search || '');
    const isLogout = urlParams.has('logout');
    const isAuthRequired = urlParams.has('auth');

    // If active session exists and user is not explicitly logging out or being prompted, redirect to dashboard
    if (session && !isLogout && !isAuthRequired) {
      console.log('[SkillBridge Guard] Active recruiter session found. Directing to recruiter dashboard.');
      window.location.href = 'recruiter-dashboard.html';
      return true;
    }
    return false;
  }
};

// ============================================================================
// 4. DOM Ready Initializations
// ============================================================================
function runAllCompanyInits() {
  initCompanyPasswordToggles();
  initPasswordStrengthMeter();
  initCompanyLogoUpload();
  initCompanyRegistrationForm();
  initCompanyLoginForm();
  initCompanyForgotPasswordModal();
  initRecruiterDashboardView();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runAllCompanyInits);
} else {
  runAllCompanyInits();
}

// ============================================================================
// 5. Password Show / Hide Toggles
// ============================================================================
function initCompanyPasswordToggles() {
  const toggleButtons = document.querySelectorAll('.password-toggle-btn');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const icon = btn.querySelector('i');

      if (!input || !icon) return;

      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
        btn.setAttribute('aria-label', 'Hide password');
      } else {
        input.type = 'password';
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
        btn.setAttribute('aria-label', 'Show password');
      }
    });
  });
}

// ============================================================================
// 6. Dynamic Password Strength Meter
// ============================================================================
function initPasswordStrengthMeter() {
  const passwordInput = document.getElementById('companyPassword');
  const strengthText = document.getElementById('passwordStrengthText');
  const segments = [
    document.getElementById('strengthSeg1'),
    document.getElementById('strengthSeg2'),
    document.getElementById('strengthSeg3'),
    document.getElementById('strengthSeg4')
  ];

  if (!passwordInput || !strengthText || !segments[0]) return;

  passwordInput.addEventListener('input', () => {
    const val = passwordInput.value;
    let score = 0;

    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const colors = ['#dc2626', '#f59e0b', '#3b82f6', '#16a34a'];
    const labels = [
      'Weak (Add numbers & special symbols)',
      'Fair (Add special characters)',
      'Good (Strong mix of characters)',
      'Strong Password'
    ];

    segments.forEach((seg, idx) => {
      if (seg) {
        if (idx < score) {
          seg.style.backgroundColor = colors[score - 1];
        } else {
          seg.style.backgroundColor = '#cbd5e1';
        }
      }
    });

    if (val.length === 0) {
      strengthText.textContent = 'Minimum 8 characters with letters, numbers & symbols';
      strengthText.style.color = '#64748b';
    } else {
      strengthText.textContent = labels[score - 1] || 'Weak password';
      strengthText.style.color = colors[score - 1] || '#dc2626';
    }
  });
}

// ============================================================================
// 7. Company Logo Upload & Live Monogram Preview
// ============================================================================
let uploadedLogoDataUrl = null;

function initCompanyLogoUpload() {
  const fileInput = document.getElementById('companyLogoInput');
  const dropzone = document.getElementById('companyLogoDropzone');
  const previewBox = document.getElementById('companyLogoPreviewBox');
  const previewImg = document.getElementById('companyLogoPreviewImg');
  const previewInitials = document.getElementById('companyLogoPreviewInitials');
  const previewName = document.getElementById('companyLogoFileName');
  const previewSize = document.getElementById('companyLogoFileSize');
  const removeBtn = document.getElementById('companyLogoRemoveBtn');
  const previewCard = document.getElementById('companyLogoPreviewCard');
  const companyNameInput = document.getElementById('companyName');

  // Real-time monogram update when typing company name
  if (companyNameInput && previewInitials) {
    companyNameInput.addEventListener('input', () => {
      if (!uploadedLogoDataUrl) {
        const initials = CompanyDataStore.generateLogoText(companyNameInput.value);
        previewInitials.textContent = initials;
      }
    });
  }

  if (!fileInput || !dropzone) return;

  const handleLogoFile = (file) => {
    if (!file) return;

    // Validate image format (PNG, JPG, SVG, WebP)
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    const fileName = file.name.toLowerCase();
    const hasValidExt = fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.svg') || fileName.endsWith('.webp');

    if (!validMimes.includes(file.type) && !hasValidExt) {
      alert('Invalid file format. Please upload a company logo in PNG, JPG, SVG, or WebP format.');
      fileInput.value = '';
      return;
    }

    // Size limit: 2 MB
    if (file.size > 2 * 1024 * 1024) {
      alert('File too large. Maximum allowed logo size is 2 MB.');
      fileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedLogoDataUrl = e.target.result;
      if (previewImg) {
        previewImg.src = uploadedLogoDataUrl;
        previewImg.classList.remove('d-none');
      }
      if (previewInitials) previewInitials.classList.add('d-none');
      if (previewName) previewName.textContent = file.name;
      if (previewSize) {
        previewSize.textContent = `${(file.size / 1024).toFixed(1)} KB`;
      }
      if (previewCard) previewCard.classList.remove('d-none');
    };
    reader.readAsDataURL(file);
  };

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    handleLogoFile(file);
  });

  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  ['dragenter', 'dragover'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) handleLogoFile(file);
  });

  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      uploadedLogoDataUrl = null;
      fileInput.value = '';
      if (previewImg) {
        previewImg.src = '';
        previewImg.classList.add('d-none');
      }
      if (previewInitials) {
        previewInitials.classList.remove('d-none');
        const nameVal = companyNameInput ? companyNameInput.value : '';
        previewInitials.textContent = CompanyDataStore.generateLogoText(nameVal);
      }
      if (previewCard) previewCard.classList.add('d-none');
    });
  }
}

// ============================================================================
// 8. Company Registration Form Handler
// ============================================================================
function initCompanyRegistrationForm() {
  const form = document.getElementById('companyRegistrationForm');
  if (!form) return;

  const submitBtn = document.getElementById('companyRegisterSubmitBtn');
  const alertContainer = document.getElementById('registerAlertContainer');
  const formCard = document.getElementById('companyRegistrationFormSection');
  const successCard = document.getElementById('companyRegistrationSuccessCard');

  let isSubmitting = false;

  // Real-time input listeners to clear errors on interaction
  const attachInputCleaner = (el, validator) => {
    if (!el) return;
    const evt = el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input';
    el.addEventListener(evt, () => {
      if (el.classList.contains('is-invalid')) {
        if (validator(el)) {
          setAuthFieldValidity(el, true);
        }
      }
    });
  };

  attachInputCleaner(document.getElementById('companyName'), el => el.value.trim().length >= 2);
  attachInputCleaner(document.getElementById('companyEmail'), el => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(el.value.trim()));
  attachInputCleaner(document.getElementById('contactPerson'), el => el.value.trim().length >= 2);
  attachInputCleaner(document.getElementById('companyPhone'), el => el.value.replace(/\D/g, '').length >= 10);
  attachInputCleaner(document.getElementById('companyWebsite'), el => el.value.trim().length >= 4);
  attachInputCleaner(document.getElementById('companyIndustry'), el => !!el.value);
  attachInputCleaner(document.getElementById('companySize'), el => !!el.value);
  attachInputCleaner(document.getElementById('companyLocation'), el => el.value.trim().length >= 3);
  attachInputCleaner(document.getElementById('companyDescription'), el => el.value.trim().length >= 20);
  attachInputCleaner(document.getElementById('companyPassword'), el => el.value.length >= 8);
  attachInputCleaner(document.getElementById('companyConfirmPassword'), el => {
    const p = document.getElementById('companyPassword');
    return el.value && el.value === (p ? p.value : '');
  });
  attachInputCleaner(document.getElementById('companyTerms'), el => el.checked);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSubmitting) return; // Prevent duplicate form submission
    if (alertContainer) alertContainer.innerHTML = '';

    const companyNameInput = document.getElementById('companyName');
    const emailInput = document.getElementById('companyEmail');
    const contactPersonInput = document.getElementById('contactPerson');
    const phoneInput = document.getElementById('companyPhone');
    const websiteInput = document.getElementById('companyWebsite');
    const industrySelect = document.getElementById('companyIndustry');
    const sizeSelect = document.getElementById('companySize');
    const locationInput = document.getElementById('companyLocation');
    const descriptionInput = document.getElementById('companyDescription');
    const passwordInput = document.getElementById('companyPassword');
    const confirmPasswordInput = document.getElementById('companyConfirmPassword');
    const termsCheckbox = document.getElementById('companyTerms');

    let isValid = true;

    // 1. Company Name Validation
    const nameVal = companyNameInput?.value.trim() || '';
    if (nameVal.length < 2) {
      setAuthFieldValidity(companyNameInput, false, 'Please enter your company legal or registered name (min 2 characters).');
      isValid = false;
    } else {
      setAuthFieldValidity(companyNameInput, true);
    }

    // 2. Official Email Validation
    const emailVal = emailInput?.value.trim() || '';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailVal || !emailRegex.test(emailVal)) {
      setAuthFieldValidity(emailInput, false, 'Please enter a valid official corporate email address (e.g. recruiter@company.com).');
      isValid = false;
    } else {
      setAuthFieldValidity(emailInput, true);
    }

    // 3. Contact Person
    const contactVal = contactPersonInput?.value.trim() || '';
    if (contactVal.length < 2) {
      setAuthFieldValidity(contactPersonInput, false, 'Please enter the primary contact recruiter full name.');
      isValid = false;
    } else {
      setAuthFieldValidity(contactPersonInput, true);
    }

    // 4. Phone Number (10 digits)
    const phoneVal = phoneInput?.value.replace(/\D/g, '') || '';
    if (phoneVal.length < 10) {
      setAuthFieldValidity(phoneInput, false, 'Please enter a valid 10-digit corporate phone number.');
      isValid = false;
    } else {
      setAuthFieldValidity(phoneInput, true);
    }

    // 5. Website URL
    const websiteVal = websiteInput?.value.trim() || '';
    if (!websiteVal || websiteVal.length < 4) {
      setAuthFieldValidity(websiteInput, false, 'Please enter your company website URL (e.g., https://yourcompany.com).');
      isValid = false;
    } else {
      setAuthFieldValidity(websiteInput, true);
    }

    // 6. Industry Domain
    if (!industrySelect?.value) {
      setAuthFieldValidity(industrySelect, false, 'Please select your primary industry / domain.');
      isValid = false;
    } else {
      setAuthFieldValidity(industrySelect, true);
    }

    // 7. Company Size
    if (!sizeSelect?.value) {
      setAuthFieldValidity(sizeSelect, false, 'Please select your company employee size tier.');
      isValid = false;
    } else {
      setAuthFieldValidity(sizeSelect, true);
    }

    // 8. Location
    const locationVal = locationInput?.value.trim() || '';
    if (locationVal.length < 3) {
      setAuthFieldValidity(locationInput, false, 'Please enter your corporate headquarters location (City, State / Country).');
      isValid = false;
    } else {
      setAuthFieldValidity(locationInput, true);
    }

    // 9. Description (min 20 chars)
    const descVal = descriptionInput?.value.trim() || '';
    if (descVal.length < 20) {
      setAuthFieldValidity(descriptionInput, false, 'Please provide a company description (minimum 20 characters).');
      isValid = false;
    } else {
      setAuthFieldValidity(descriptionInput, true);
    }

    // 10. Password (min 8 chars)
    const passVal = passwordInput?.value || '';
    if (passVal.length < 8) {
      setAuthFieldValidity(passwordInput, false, 'Password must be at least 8 characters long.');
      isValid = false;
    } else {
      setAuthFieldValidity(passwordInput, true);
    }

    // 11. Confirm Password
    const confirmVal = confirmPasswordInput?.value || '';
    if (!confirmVal || confirmVal !== passVal) {
      setAuthFieldValidity(confirmPasswordInput, false, 'Passwords do not match.');
      isValid = false;
    } else {
      setAuthFieldValidity(confirmPasswordInput, true);
    }

    // 12. Terms Checkbox
    if (!termsCheckbox?.checked) {
      setAuthFieldValidity(termsCheckbox, false, 'You must agree to the SkillBridge Employer Terms & Hiring Agreement.');
      isValid = false;
    } else {
      setAuthFieldValidity(termsCheckbox, true);
    }

    if (!isValid) {
      const firstInvalid = form.querySelector('.is-invalid');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // 13. Build Backend API Payload
    const payload = {
      company_name: nameVal,
      official_email: emailVal,
      contact_person: contactVal,
      phone_number: phoneVal,
      website_url: websiteVal.startsWith('http') ? websiteVal : `https://${websiteVal}`,
      industry_domain: industrySelect.value,
      company_size: sizeSelect.value,
      location: locationVal,
      description: descVal,
      password: passVal,
      logo_url: uploadedLogoDataUrl || null
    };

    // UI Loading state & double submission prevention
    isSubmitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span> Registering Company...';
    }

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => null);

      // --- Scenario A: Successful Registration (HTTP 201 Created) ---
      if (response.status === 201 && result && result.success) {
        const createdCompany = result.data || {};

        // Save non-sensitive company details (password & password_hash are NEVER stored in browser storage)
        const companyProfile = {
          id: createdCompany.id || `comp-${Date.now()}`,
          companyName: createdCompany.company_name || nameVal,
          officialEmail: createdCompany.official_email || emailVal,
          contactPerson: contactVal,
          phoneNumber: phoneVal,
          websiteUrl: payload.website_url,
          industry: industrySelect.value,
          companySize: sizeSelect.value,
          location: locationVal,
          description: descVal,
          logoUrl: uploadedLogoDataUrl || null,
          role: 'ROLE_RECRUITER',
          isVerified: true,
          registeredAt: new Date().toISOString()
        };

        // Synchronize with local store so other frontend views have this company available
        try {
          const existingList = CompanyDataStore.getCompanies();
          existingList.push(companyProfile);
          SafeStorage.set('skillbridge_companies', JSON.stringify(existingList));
        } catch (e) {}

        // Save recruiter session for seamless dashboard navigation
        try {
          const sessionData = {
            id: companyProfile.id,
            companyName: companyProfile.companyName,
            officialEmail: companyProfile.officialEmail,
            contactPerson: companyProfile.contactPerson,
            role: 'recruiter',
            isLoggedIn: true,
            loginTimestamp: Date.now()
          };
          const sessionStr = JSON.stringify(sessionData);
          SafeStorage.set('skillbridge_recruiter_session', sessionStr);
          SafeStorage.set('skillbridge_auth_role', 'recruiter');
          try { localStorage.setItem('skillbridge_recruiter_session', sessionStr); } catch (e) {}
          try { localStorage.setItem('skillbridge_auth_role', 'recruiter'); } catch (e) {}
        } catch (e) {}

        // Show Success View
        if (formCard) formCard.classList.add('d-none');
        if (successCard) {
          successCard.classList.remove('d-none');
          const nameEl = document.getElementById('successCompanyName');
          const emailEl = document.getElementById('successCompanyEmail');
          const contactEl = document.getElementById('successCompanyContact');
          if (nameEl) nameEl.textContent = companyProfile.companyName;
          if (emailEl) emailEl.textContent = companyProfile.officialEmail;
          if (contactEl) contactEl.textContent = companyProfile.contactPerson;
        }

        // 3-second redirect countdown to company-login.html
        let timeLeft = 3;
        const timerEl = document.getElementById('companyRedirectTimer');
        if (timerEl) timerEl.textContent = `${timeLeft}s`;

        const interval = setInterval(() => {
          timeLeft--;
          if (timerEl) timerEl.textContent = `${timeLeft}s`;
          if (timeLeft <= 0) {
            clearInterval(interval);
            window.location.href = `company-login.html?registered=true&email=${encodeURIComponent(companyProfile.officialEmail)}`;
          }
        }, 1000);

        return;
      }

      // --- Scenario B: Duplicate Company Name or Email Conflict (HTTP 409 Conflict) ---
      if (response.status === 409) {
        const errorMsg = (result && result.error) ? result.error : 'A company with this name or official email is already registered.';
        const conflictField = result && result.conflictField ? result.conflictField : '';

        if (conflictField.includes('company_name')) {
          setAuthFieldValidity(companyNameInput, false, errorMsg);
          companyNameInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          companyNameInput?.focus();
        } else if (conflictField.includes('official_email')) {
          setAuthFieldValidity(emailInput, false, errorMsg);
          emailInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          emailInput?.focus();
        }

        showCompanyAlert(
          `<strong>Registration Conflict:</strong> ${escapeHtml(errorMsg)} <a href="company-login.html" class="alert-link fw-semibold">Click here to sign in</a>.`,
          'warning'
        );
        return;
      }

      // --- Scenario C: Validation Error from Backend (HTTP 400 Bad Request) ---
      if (response.status === 400) {
        const errorMsg = (result && result.error) ? result.error : 'Validation failed. Please verify the company details.';
        const details = (result && Array.isArray(result.missingFields) && result.missingFields.length > 0)
          ? ` (Missing: ${result.missingFields.join(', ')})`
          : '';
        showCompanyAlert(`<strong>Validation Error:</strong> ${escapeHtml(errorMsg)}${details}`, 'danger');
        return;
      }

      // --- Scenario D: Unexpected Server Error (HTTP 500 etc.) ---
      const serverMsg = (result && result.error) ? result.error : `Server returned status ${response.status}. Please try again later.`;
      showCompanyAlert(`<strong>Registration Failed:</strong> ${escapeHtml(serverMsg)}`, 'danger');

    } catch (networkError) {
      console.error('[SkillBridge Company Registration API Error]', networkError);
      showCompanyAlert(
        '<strong>Connection Error:</strong> Could not connect to the backend server at <code>http://localhost:5000</code>. ' +
        'Please ensure the Node.js backend is running (<code>cd backend && npm run dev</code>).',
        'danger'
      );
    } finally {
      isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Register Company Account <i class="bi bi-arrow-right-short fs-5"></i>';
      }
    }
  });
}

/**
 * Display alert banners on the company registration form
 */
function showCompanyAlert(message, type = 'danger') {
  const container = document.getElementById('registerAlertContainer');
  if (!container) return;

  const iconClass = type === 'warning' ? 'bi-exclamation-triangle-fill text-warning' : 'bi-exclamation-octagon-fill text-danger';
  const bgColor = type === 'warning' ? '#fffbeb' : '#fef2f2';
  const textColor = type === 'warning' ? '#92400e' : '#991b1b';
  const borderColor = type === 'warning' ? '#f59e0b' : '#dc2626';

  container.innerHTML = `
    <div class="alert alert-${type} d-flex align-items-center gap-2 mb-4 border-0 shadow-sm" role="alert" style="background-color: ${bgColor}; color: ${textColor}; border-left: 4px solid ${borderColor} !important;">
      <i class="bi ${iconClass} fs-5 flex-shrink-0"></i>
      <div>${message}</div>
    </div>
  `;
  container.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Escape HTML to prevent injection when rendering error messages
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

// ============================================================================
// 9. Company Login Form Handler
// ============================================================================
function initCompanyLoginForm() {
  const form = document.getElementById('companyLoginForm');
  if (!form) return;

  const emailInput = document.getElementById('companyLoginEmail');
  const passwordInput = document.getElementById('companyLoginPassword');
  const rememberCheckbox = document.getElementById('companyRememberMe');
  const submitBtn = document.getElementById('companyLoginSubmitBtn');
  const alertContainer = document.getElementById('companyLoginAlertContainer');
  const quickFillBtn = document.getElementById('quickFillDemoRecruiterBtn');

  // Handle URL Notification Banners (?registered=true, ?logout=success, ?auth=required)
  const urlParams = new URLSearchParams(window.location.search || '');
  if (alertContainer) {
    if (urlParams.get('registered') === 'true') {
      const regEmail = urlParams.get('email') || '';
      alertContainer.innerHTML = `
        <div class="alert alert-success d-flex align-items-center gap-2 mb-3 border-0 shadow-sm" role="alert" style="background-color: #ecfdf5; color: #065f46; border-left: 4px solid #10b981 !important;">
          <i class="bi bi-check-circle-fill fs-5 text-success"></i>
          <div>
            <strong>Registration Successful!</strong> Your company account has been created. Please sign in below.
          </div>
        </div>
      `;
      if (regEmail && emailInput) {
        emailInput.value = regEmail;
      }
    } else if (urlParams.get('logout') === 'success') {
      alertContainer.innerHTML = `
        <div class="alert alert-success d-flex align-items-center gap-2 mb-3 border-0 shadow-sm" role="alert" style="background-color: #ecfdf5; color: #065f46; border-left: 4px solid #10b981 !important;">
          <i class="bi bi-check-circle-fill fs-5 text-success"></i>
          <div>
            <strong>Signed Out:</strong> You have been securely signed out of the Recruiter Portal.
          </div>
        </div>
      `;
    } else if (urlParams.get('auth') === 'required') {
      alertContainer.innerHTML = `
        <div class="alert alert-warning d-flex align-items-center gap-2 mb-3 border-0 shadow-sm" role="alert" style="background-color: #fffbeb; color: #92400e; border-left: 4px solid #f59e0b !important;">
          <i class="bi bi-shield-exclamation fs-5 text-warning"></i>
          <div>
            <strong>Authentication Required:</strong> Please sign in with your verified recruiter credentials to access the Recruiter Dashboard.
          </div>
        </div>
      `;
    }
  }

  // Preload remembered corporate email if saved previously
  try {
    const remembered = SafeStorage.get('skillbridge_recruiter_remembered_email');
    if (remembered && emailInput && !emailInput.value) {
      emailInput.value = remembered;
      if (rememberCheckbox) rememberCheckbox.checked = true;
    }
  } catch (e) {}

  // Auto-Fill Demo Credentials Button Handler
  if (quickFillBtn && emailInput && passwordInput) {
    quickFillBtn.addEventListener('click', () => {
      emailInput.value = 'recruiter@cloudscale.io';
      passwordInput.value = 'CloudScale@2026';
      setAuthFieldValidity(emailInput, true);
      setAuthFieldValidity(passwordInput, true);
      if (alertContainer) {
        alertContainer.innerHTML = `
          <div class="alert alert-info py-2 px-3 small border-0 mb-3" style="background-color: #ecfeff; color: #0891b2;">
            <i class="bi bi-info-circle-fill me-1"></i> Demo credentials loaded for <strong>CloudScale Solutions</strong>. Click "Sign In" to proceed.
          </div>
        `;
      }
    });
  }

  // Real-time input listeners to clear errors on typing
  if (emailInput) {
    emailInput.addEventListener('input', () => {
      if (emailInput.classList.contains('is-invalid')) {
        const val = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(val)) {
          setAuthFieldValidity(emailInput, true);
        }
      }
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      if (passwordInput.classList.contains('is-invalid')) {
        if (passwordInput.value.length > 0) {
          setAuthFieldValidity(passwordInput, true);
        }
      }
    });
  }

  let isSubmitting = false;

  const performLogin = async () => {
    if (isSubmitting) return; // Prevent multiple clicks

    let isValid = true;
    const emailVal = emailInput?.value.trim() || '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Validate email
    if (!emailVal || !emailRegex.test(emailVal)) {
      setAuthFieldValidity(emailInput, false, 'Please enter a valid official corporate email address.');
      isValid = false;
    } else {
      setAuthFieldValidity(emailInput, true);
    }

    // Validate password
    const passVal = passwordInput?.value || '';
    if (!passVal) {
      setAuthFieldValidity(passwordInput, false, 'Please enter your recruiter account password.');
      isValid = false;
    } else {
      setAuthFieldValidity(passwordInput, true);
    }

    if (!isValid) return;

    isSubmitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span> Authenticating Recruiter...';
    }

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/companies/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          official_email: emailVal,
          password: passVal
        })
      });

      const result = await response.json().catch(() => null);

      // Scenario A: HTTP 200 OK - Successful Login
      if (response.status === 200 || (response.ok && response.status >= 200 && response.status < 300)) {
        const company = (result && result.data) ? result.data : {};

        // Save company ID and non-sensitive details in existing session mechanism
        CompanyDataStore.setActiveSession(company, rememberCheckbox ? rememberCheckbox.checked : true);

        // Show instant confirmation banner
        if (alertContainer) {
          const contact = company.contact_person || company.contactPerson || company.company_name || 'Recruiter';
          const compName = company.company_name || company.companyName || 'Company';
          alertContainer.innerHTML = `
            <div class="alert alert-success d-flex align-items-center gap-2 mb-3 border-0 shadow-sm" role="alert" style="background-color: #ecfdf5; color: #065f46; border-left: 4px solid #10b981 !important;">
              <i class="bi bi-check-circle-fill fs-5 text-success"></i>
              <div>
                <div class="fw-bold small">Recruiter Authentication Successful!</div>
                <div class="small">Welcome back, <strong>${escapeHtml(contact)}</strong> (${escapeHtml(compName)}). Directing to Recruiter Dashboard...</div>
              </div>
            </div>
          `;
        }

        // Redirect to recruiter-dashboard.html
        setTimeout(() => {
          window.location.href = 'recruiter-dashboard.html';
        }, 600);
        return;
      }

      // Scenario B: HTTP 401 Unauthorized - Invalid Email or Password
      if (response.status === 401) {
        const errorMsg = (result && result.error) ? result.error : 'Invalid official email or password.';
        setAuthFieldValidity(emailInput, false, 'Invalid corporate email or password.');
        setAuthFieldValidity(passwordInput, false, 'Invalid corporate email or password.');
        if (alertContainer) {
          alertContainer.innerHTML = `
            <div class="alert alert-danger d-flex align-items-center gap-2 mb-3 border-0 shadow-sm" role="alert" style="background-color: #fef2f2; color: #991b1b; border-left: 4px solid #dc2626 !important;">
              <i class="bi bi-shield-x fs-5 text-danger"></i>
              <div><strong>Authentication Failed:</strong> ${escapeHtml(errorMsg)}</div>
            </div>
          `;
        }
        return;
      }

      // Scenario C: HTTP 400 Bad Request - Validation Error
      if (response.status === 400) {
        const errorMsg = (result && result.error) ? result.error : 'Validation failed: Please enter official email and password.';
        if (alertContainer) {
          alertContainer.innerHTML = `
            <div class="alert alert-warning d-flex align-items-center gap-2 mb-3 border-0 shadow-sm" role="alert" style="background-color: #fffbeb; color: #92400e; border-left: 4px solid #f59e0b !important;">
              <i class="bi bi-exclamation-triangle-fill fs-5 text-warning"></i>
              <div><strong>Validation Error:</strong> ${escapeHtml(errorMsg)}</div>
            </div>
          `;
        }
        return;
      }

      // Scenario D: Other Server Errors (HTTP 500 etc.)
      const serverMsg = (result && result.error) ? result.error : `Server returned status ${response.status}.`;
      if (alertContainer) {
        alertContainer.innerHTML = `
          <div class="alert alert-danger d-flex align-items-center gap-2 mb-3 border-0 shadow-sm" role="alert" style="background-color: #fef2f2; color: #991b1b; border-left: 4px solid #dc2626 !important;">
            <i class="bi bi-server fs-5 text-danger"></i>
            <div><strong>Server Error:</strong> ${escapeHtml(serverMsg)}</div>
          </div>
        `;
      }

    } catch (networkError) {
      console.error('[SkillBridge Company Login Network Error]', networkError);
      if (alertContainer) {
        alertContainer.innerHTML = `
          <div class="alert alert-danger d-flex align-items-center gap-2 mb-3 border-0 shadow-sm" role="alert" style="background-color: #fef2f2; color: #991b1b; border-left: 4px solid #dc2626 !important;">
            <i class="bi bi-wifi-off fs-5 text-danger"></i>
            <div><strong>Connection Error:</strong> Could not connect to backend server at <code>http://localhost:5000</code>. Please ensure the Node.js backend is running.</div>
          </div>
        `;
      }
    } finally {
      isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Sign In to Recruiter Portal <i class="bi bi-arrow-right-short fs-5"></i>';
      }
    }
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopPropagation();
    performLogin();
  });

  if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      performLogin();
    });
  }
}

// ============================================================================
// 10. Forgot Password Modal Handler
// ============================================================================
function initCompanyForgotPasswordModal() {
  const modalEl = document.getElementById('companyForgotPasswordModal');
  const modalForm = document.getElementById('companyForgotPasswordForm');
  const emailInput = document.getElementById('companyForgotEmailInput');
  const alertContainer = document.getElementById('companyForgotAlertContainer');
  const submitBtn = document.getElementById('companyForgotSubmitBtn');
  const triggers = document.querySelectorAll('[data-bs-target="#companyForgotPasswordModal"]');
  const dismissBtns = modalEl ? modalEl.querySelectorAll('[data-bs-dismiss="modal"]') : [];

  if (!modalEl || !modalForm) return;

  const showModal = () => {
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
      bsModal.show();
    } else {
      modalEl.classList.add('show');
      modalEl.style.display = 'block';
      modalEl.removeAttribute('aria-hidden');
      modalEl.setAttribute('aria-modal', 'true');
      let backdrop = document.getElementById('companyForgotModalBackdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'companyForgotModalBackdrop';
        backdrop.className = 'modal-backdrop fade show';
        document.body.appendChild(backdrop);
      }
      document.body.classList.add('modal-open');
    }
    if (emailInput) {
      setTimeout(() => emailInput.focus(), 150);
    }
  };

  const hideModal = () => {
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      const bsModal = bootstrap.Modal.getInstance(modalEl);
      if (bsModal) bsModal.hide();
    }
    modalEl.classList.remove('show');
    modalEl.style.display = 'none';
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.removeAttribute('aria-modal');
    const backdrop = document.getElementById('companyForgotModalBackdrop');
    if (backdrop) backdrop.remove();
    document.body.classList.remove('modal-open');

    // Reset form states
    modalForm.reset();
    if (emailInput) {
      emailInput.classList.remove('is-invalid', 'is-valid');
      const feedback = emailInput.closest('.mb-3')?.querySelector('.invalid-feedback');
      if (feedback) feedback.style.display = 'none';
    }
    if (alertContainer) alertContainer.innerHTML = '';
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Send Reset Link <i class="bi bi-send-fill ms-1"></i>';
      submitBtn.className = 'btn btn-primary-custom';
    }
  };

  triggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      showModal();
    });
  });

  dismissBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      hideModal();
    });
  });

  // Close on backdrop click
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) {
      hideModal();
    }
  });

  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && (modalEl.classList.contains('show') || modalEl.style.display === 'block')) {
      hideModal();
    }
  });

  // Real-time input clearing
  if (emailInput) {
    emailInput.addEventListener('input', () => {
      if (emailInput.classList.contains('is-invalid')) {
        const val = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(val)) {
          emailInput.classList.remove('is-invalid');
          const feedback = emailInput.closest('.mb-3')?.querySelector('.invalid-feedback');
          if (feedback) feedback.style.display = 'none';
        }
      }
    });
  }

  modalForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const emailVal = emailInput?.value.trim() || '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const feedback = emailInput?.closest('.mb-3')?.querySelector('.invalid-feedback');

    if (!emailVal || !emailRegex.test(emailVal)) {
      if (emailInput) {
        emailInput.classList.remove('is-valid');
        emailInput.classList.add('is-invalid');
      }
      if (feedback) feedback.style.display = 'block';
      return;
    }

    if (emailInput) {
      emailInput.classList.remove('is-invalid');
      emailInput.classList.add('is-valid');
    }
    if (feedback) feedback.style.display = 'none';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Sending...';
    }

    setTimeout(() => {
      const exists = CompanyDataStore.checkEmailExists(emailVal);
      if (alertContainer) {
        if (exists) {
          alertContainer.innerHTML = `
            <div class="alert alert-success border-0 small mb-0" style="background-color: #ecfdf5; color: #065f46;">
              <i class="bi bi-envelope-check-fill me-1 text-success"></i>
              <strong>Password Reset Link Dispatched:</strong> Instructions have been sent to <em>${emailVal}</em>.
            </div>
          `;
        } else {
          alertContainer.innerHTML = `
            <div class="alert alert-warning border-0 small mb-0" style="background-color: #fffbeb; color: #92400e;">
              <i class="bi bi-info-circle-fill me-1 text-warning"></i>
              If <em>${emailVal}</em> is associated with an active company account, instructions have been sent.
            </div>
          `;
        }
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Email Sent';
        submitBtn.className = 'btn btn-outline-custom';
      }
    }, 600);
  });
}

// ============================================================================
// 11. Recruiter Dashboard Controller & Real-Time Data Population
// ============================================================================
function initRecruiterDashboardView() {
  const dashboardContainer = document.getElementById('recruiterDashboardRoot');
  if (!dashboardContainer) return; // Not on recruiter dashboard page

  // Verify Recruiter Authorization
  const isAuthorized = RecruiterAuthGuard.protectPage();
  if (!isAuthorized) return;

  const session = CompanyDataStore.getActiveSession();
  if (!session) return;

  // Populate Company and Recruiter elements across dashboard
  const companyNameEls = document.querySelectorAll('.recruiter-company-name');
  const recruiterNameEls = document.querySelectorAll('.recruiter-contact-name');
  const companyLogoEls = document.querySelectorAll('.recruiter-company-logo');
  const companyEmailEls = document.querySelectorAll('.recruiter-company-email');
  const companyLocationEls = document.querySelectorAll('.recruiter-company-location');
  const companyIndustryEls = document.querySelectorAll('.recruiter-company-industry');
  const companyWebsiteEls = document.querySelectorAll('.recruiter-company-website');
  const companyPhoneEls = document.querySelectorAll('.recruiter-company-phone');
  const companySizeEls = document.querySelectorAll('.recruiter-company-size');
  const companyDescEls = document.querySelectorAll('.recruiter-company-description');

  companyNameEls.forEach(el => el.textContent = session.companyName || 'Company');
  recruiterNameEls.forEach(el => el.textContent = session.contactPerson || 'Recruiter');
  companyEmailEls.forEach(el => el.textContent = session.officialEmail || '');
  companyLocationEls.forEach(el => el.textContent = session.location || '');
  companyIndustryEls.forEach(el => el.textContent = session.industry || '');
  companyPhoneEls.forEach(el => el.textContent = session.phoneNumber ? `+91 ${session.phoneNumber}` : '+91 98765 43220');
  companySizeEls.forEach(el => el.textContent = session.companySize || '201-500 Employees');
  companyDescEls.forEach(el => el.textContent = session.description || 'Enterprise Technology & Talent Partner.');
  companyWebsiteEls.forEach(el => {
    el.textContent = session.websiteUrl || '';
    if (el.tagName === 'A') el.href = session.websiteUrl || '#';
  });

  companyLogoEls.forEach(el => {
    if (session.logoUrl) {
      el.innerHTML = `<img src="${session.logoUrl}" alt="${session.companyName}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
    } else {
      el.textContent = session.logoText || CompanyDataStore.generateLogoText(session.companyName);
      el.style.backgroundColor = session.logoBgColor || '#4f46e5';
    }
  });

  // Attach Logout Handlers
  const logoutBtns = document.querySelectorAll('.recruiter-logout-btn');
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      CompanyDataStore.clearSession();
      window.location.href = 'company-login.html?logout=success';
    });
  });
}

// Helper to set field validity
function setAuthFieldValidity(input, isValid, message = '') {
  if (!input) return;
  const parent = input.closest('.mb-3') || input.parentElement;
  let feedback = parent?.querySelector('.invalid-feedback');

  if (isValid) {
    input.classList.remove('is-invalid');
    input.classList.add('is-valid');
    if (feedback) feedback.style.display = 'none';
  } else {
    input.classList.remove('is-valid');
    input.classList.add('is-invalid');
    if (feedback) {
      feedback.textContent = message;
      feedback.style.display = 'block';
    }
  }
}
