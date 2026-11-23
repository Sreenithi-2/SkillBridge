/**
 * SkillBridge - Recruiter Login Module (company-login.js)
 * Completely standalone authentication script for Module 1.
 * Handles validation, demo credentials, forgot password modal, and secure session creation.
 */

(function () {
  'use strict';

  // Default Verified Employer Accounts
  const DEFAULT_RECRUITERS = [
    {
      id: 'comp-101',
      companyName: 'CloudScale Solutions',
      officialEmail: 'recruiter@cloudscale.io',
      contactPerson: 'Priya Sharma',
      phoneNumber: '9876543220',
      websiteUrl: 'https://cloudscale.io',
      industry: 'Cloud & SaaS',
      companySize: '201-500 Employees',
      location: 'Bengaluru, Karnataka (Hybrid)',
      description: 'CloudScale Solutions designs high-throughput cloud microservices, enterprise SaaS platforms, and distributed real-time data architectures.',
      logoText: 'CS',
      logoBgColor: '#4f46e5',
      logoUrl: null,
      password: 'CloudScale@2026',
      role: 'ROLE_RECRUITER',
      authRole: 'recruiter'
    },
    {
      id: 'comp-102',
      companyName: 'DataMatrix Analytics',
      officialEmail: 'hiring@datamatrix.ai',
      contactPerson: 'Vikramaditya Verma',
      phoneNumber: '9876543221',
      websiteUrl: 'https://datamatrix.ai',
      industry: 'Data & AI',
      companySize: '51-200 Employees',
      location: 'Hyderabad, Telangana (Remote)',
      description: 'DataMatrix specializes in real-time streaming ETL pipelines, predictive AI intelligence, and high-performance financial data marts.',
      logoText: 'DM',
      logoBgColor: '#059669',
      logoUrl: null,
      password: 'DataMatrix@2026',
      role: 'ROLE_RECRUITER',
      authRole: 'recruiter'
    },
    {
      id: 'comp-103',
      companyName: 'FinTech Orbit Systems',
      officialEmail: 'careers@fintechorbit.com',
      contactPerson: 'Karthik Raja',
      phoneNumber: '9876543222',
      websiteUrl: 'https://fintechorbit.com',
      industry: 'FinTech',
      companySize: '501-1000 Employees',
      location: 'Chennai, Tamil Nadu (Onsite)',
      description: 'FinTech Orbit powers ultra-low latency transaction processing, digital banking gateways, and ACID microservices for tier-1 financial institutions.',
      logoText: 'FO',
      logoBgColor: '#d97706',
      logoUrl: null,
      password: 'FinTech@2026',
      role: 'ROLE_RECRUITER',
      authRole: 'recruiter'
    }
  ];

  // Helper to read all registered companies from storage + defaults
  function getAllCompanies() {
    let list = [...DEFAULT_RECRUITERS];
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('skillbridge_companies');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach(c => {
              const idx = list.findIndex(d => (d.officialEmail || '').toLowerCase() === (c.officialEmail || '').toLowerCase());
              if (idx === -1) {
                list.push(c);
              } else {
                list[idx] = { ...list[idx], ...c };
              }
            });
          }
        }
      }
    } catch (e) {
      console.warn('[SkillBridge Login] Storage access error', e);
    }
    return list;
  }

  // Check if recruiter is already logged in and redirect if appropriate
  function checkExistingSession() {
    try {
      const urlParams = new URLSearchParams(window.location.search || '');
      const isLogout = urlParams.has('logout');
      const isAuthRequired = urlParams.has('auth');

      if (isLogout || isAuthRequired) {
        return; // Allow viewing login screen with banner
      }

      const rawSession = localStorage.getItem('skillbridge_recruiter_session') || sessionStorage.getItem('skillbridge_recruiter_session');
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        const role = (parsed.role || parsed.authRole || '').toLowerCase();
        if (role === 'recruiter' || role === 'role_recruiter' || parsed.officialEmail) {
          console.log('[SkillBridge Login] Active recruiter session found. Directing to recruiter-dashboard.html');
          window.location.href = 'recruiter-dashboard.html';
        }
      }
    } catch (e) {}
  }

  // Authenticate recruiter credentials
  function authenticateRecruiter(email, password) {
    if (!email || !password) {
      throw new Error('Please enter both your corporate email and password.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const companies = getAllCompanies();
    const company = companies.find(c => (c.officialEmail || '').trim().toLowerCase() === cleanEmail);

    if (!company) {
      throw new Error('No registered company account found with this email. Please check your spelling or register your company.');
    }

    // Match password (supports plain or hashed)
    const expectedPass = company.password || company.passwordHash;
    const isMatch = (expectedPass === password) ||
                    (expectedPass === `sha256_${password}`) ||
                    (company.passwordHash && company.passwordHash === password);

    if (!isMatch) {
      throw new Error('Incorrect password. Please verify your corporate credentials and try again.');
    }

    return company;
  }

  // Create recruiter session in storage
  function saveRecruiterSession(company, remember) {
    const sessionData = {
      id: company.id || `comp-${Date.now()}`,
      companyName: company.companyName,
      officialEmail: company.officialEmail,
      contactPerson: company.contactPerson || 'Recruiter',
      phoneNumber: company.phoneNumber || '',
      websiteUrl: company.websiteUrl || '',
      industry: company.industry || 'Technology',
      companySize: company.companySize || '50-200 Employees',
      location: company.location || 'Headquarters',
      description: company.description || '',
      logoText: company.logoText || (company.companyName ? company.companyName.substring(0, 2).toUpperCase() : 'CS'),
      logoBgColor: company.logoBgColor || '#4f46e5',
      logoUrl: company.logoUrl || null,
      role: 'ROLE_RECRUITER',
      authRole: 'recruiter',
      authenticatedAt: new Date().toISOString()
    };

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('skillbridge_recruiter_session', JSON.stringify(sessionData));
        localStorage.setItem('skillbridge_auth_role', 'recruiter');
        if (remember) {
          localStorage.setItem('skillbridge_recruiter_remembered_email', company.officialEmail);
        } else {
          localStorage.removeItem('skillbridge_recruiter_remembered_email');
        }
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('skillbridge_recruiter_session', JSON.stringify(sessionData));
        sessionStorage.setItem('skillbridge_auth_role', 'recruiter');
      }
    } catch (e) {
      console.warn('[SkillBridge Login] Session save warning', e);
    }

    return sessionData;
  }

  // DOM Initializations
  function init() {
    checkExistingSession();

    const form = document.getElementById('companyLoginForm');
    const emailInput = document.getElementById('companyLoginEmail');
    const passwordInput = document.getElementById('companyLoginPassword');
    const rememberCheckbox = document.getElementById('companyRememberMe');
    const submitBtn = document.getElementById('companyLoginSubmitBtn');
    const alertContainer = document.getElementById('companyLoginAlertContainer');
    const quickFillBtn = document.getElementById('quickFillDemoRecruiterBtn');
    const togglePasswordBtn = document.querySelector('.password-toggle-btn');

    // Handle URL notification query parameters
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

    // Preload remembered email if available
    try {
      const remembered = localStorage.getItem('skillbridge_recruiter_remembered_email');
      if (remembered && emailInput && !emailInput.value) {
        emailInput.value = remembered;
        if (rememberCheckbox) rememberCheckbox.checked = true;
      }
    } catch (e) {}

    // Password Show / Hide Toggle
    if (togglePasswordBtn && passwordInput) {
      togglePasswordBtn.addEventListener('click', () => {
        const icon = togglePasswordBtn.querySelector('i');
        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          if (icon) {
            icon.classList.remove('bi-eye');
            icon.classList.add('bi-eye-slash');
          }
          togglePasswordBtn.setAttribute('aria-label', 'Hide password');
        } else {
          passwordInput.type = 'password';
          if (icon) {
            icon.classList.remove('bi-eye-slash');
            icon.classList.add('bi-eye');
          }
          togglePasswordBtn.setAttribute('aria-label', 'Show password');
        }
      });
    }

    // Auto-Fill Demo Credentials Button
    if (quickFillBtn && emailInput && passwordInput) {
      quickFillBtn.addEventListener('click', () => {
        emailInput.value = 'recruiter@cloudscale.io';
        passwordInput.value = 'CloudScale@2026';

        // Clear invalid feedback
        clearFieldValidation(emailInput);
        clearFieldValidation(passwordInput);

        if (alertContainer) {
          alertContainer.innerHTML = `
            <div class="alert alert-info py-2 px-3 small border-0 mb-3" style="background-color: #ecfeff; color: #0891b2;">
              <i class="bi bi-info-circle-fill me-1"></i> Demo credentials loaded for <strong>CloudScale Solutions</strong>. Click "Sign In" to proceed.
            </div>
          `;
        }
      });
    }

    // Real-time input clearing
    if (emailInput) {
      emailInput.addEventListener('input', () => {
        if (emailInput.classList.contains('is-invalid')) {
          const val = emailInput.value.trim();
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (emailRegex.test(val)) {
            clearFieldValidation(emailInput);
          }
        }
      });
    }

    if (passwordInput) {
      passwordInput.addEventListener('input', () => {
        if (passwordInput.classList.contains('is-invalid')) {
          if (passwordInput.value.length > 0) {
            clearFieldValidation(passwordInput);
          }
        }
      });
    }

    // Form Submission & Authentication
    if (form) {
      let isSubmitting = false;

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isSubmitting) return;

        let isValid = true;
        const emailVal = emailInput?.value.trim() || '';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailVal || !emailRegex.test(emailVal)) {
          setFieldInvalid(emailInput, 'Please enter a valid corporate email address.');
          isValid = false;
        } else {
          clearFieldValidation(emailInput);
        }

        const passVal = passwordInput?.value || '';
        if (!passVal) {
          setFieldInvalid(passwordInput, 'Please enter your recruiter password.');
          isValid = false;
        } else {
          clearFieldValidation(passwordInput);
        }

        if (!isValid) return;

        isSubmitting = true;
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span> Authenticating Recruiter...';
        }

        try {
          // Authenticate
          const company = authenticateRecruiter(emailVal, passVal);

          // Save Session
          saveRecruiterSession(company, rememberCheckbox ? rememberCheckbox.checked : true);

          // Display success state
          if (alertContainer) {
            alertContainer.innerHTML = `
              <div class="alert alert-success d-flex align-items-center gap-2 mb-3 border-0 shadow-sm" role="alert" style="background-color: #ecfdf5; color: #065f46; border-left: 4px solid #10b981 !important;">
                <i class="bi bi-check-circle-fill fs-5 text-success"></i>
                <div>
                  <div class="fw-bold small">Recruiter Authentication Successful!</div>
                  <div class="small">Welcome back, <strong>${company.contactPerson}</strong> (${company.companyName}). Directing to Recruiter Dashboard...</div>
                </div>
              </div>
            `;
          }

          // Navigate to recruiter-dashboard.html
          setTimeout(() => {
            window.location.href = 'recruiter-dashboard.html';
          }, 350);

        } catch (err) {
          isSubmitting = false;
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Sign In to Recruiter Portal <i class="bi bi-arrow-right-short fs-5"></i>';
          }
          if (alertContainer) {
            alertContainer.innerHTML = `
              <div class="alert alert-danger d-flex align-items-center gap-2 mb-3 border-0 shadow-sm" role="alert" style="background-color: #fef2f2; color: #991b1b; border-left: 4px solid #dc2626 !important;">
                <i class="bi bi-shield-x fs-5 text-danger"></i>
                <div><strong>Authentication Failed:</strong> ${err.message}</div>
              </div>
            `;
          }
        }
      });
    }

    // Forgot Password Modal Setup
    initForgotPasswordModal();
  }

  // Field validation helpers
  function setFieldInvalid(input, message) {
    if (!input) return;
    input.classList.remove('is-valid');
    input.classList.add('is-invalid');
    const parent = input.closest('.mb-3') || input.parentElement;
    const feedback = parent ? parent.querySelector('.invalid-feedback') : null;
    if (feedback) {
      feedback.textContent = message;
      feedback.style.display = 'block';
    }
  }

  function clearFieldValidation(input) {
    if (!input) return;
    input.classList.remove('is-invalid');
    input.classList.add('is-valid');
    const parent = input.closest('.mb-3') || input.parentElement;
    const feedback = parent ? parent.querySelector('.invalid-feedback') : null;
    if (feedback) {
      feedback.style.display = 'none';
    }
  }

  // Forgot Password Modal Handler
  function initForgotPasswordModal() {
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
      if (emailInput) setTimeout(() => emailInput.focus(), 150);
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

    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) hideModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && (modalEl.classList.contains('show') || modalEl.style.display === 'block')) {
        hideModal();
      }
    });

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
        const companies = getAllCompanies();
        const exists = companies.some(c => (c.officialEmail || '').trim().toLowerCase() === emailVal.toLowerCase());

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
      }, 500);
    });
  }

  // Export for testing in Node / VM environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      DEFAULT_RECRUITERS,
      getAllCompanies,
      authenticateRecruiter,
      saveRecruiterSession
    };
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})();
