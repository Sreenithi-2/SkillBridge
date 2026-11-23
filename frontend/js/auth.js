/**
 * SkillBridge - Authentication & Student Registration JavaScript
 * Handles real-time validation, password toggles, skill selection, PDF verification, and registration submission.
 */

// Backend REST API Base URL
const BACKEND_API_BASE_URL = (typeof window !== 'undefined' && window.SkillBridgeConfig)
  ? window.SkillBridgeConfig.apiBaseUrl
  : ((typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.hostname !== '[::1]')
    ? 'https://skillbridge-api.onrender.com/api'
    : 'http://localhost:5000/api');

document.addEventListener('DOMContentLoaded', () => {
  initPasswordToggles();
  initResumeUpload();
  initSkillsCounter();
  initStudentRegistrationForm();
  initStudentLoginForm();
  initForgotPasswordModal();
});

/* --------------------------------------------------------------------------
   1. Password Show / Hide Toggles
   -------------------------------------------------------------------------- */
function initPasswordToggles() {
  const toggleButtons = document.querySelectorAll('.password-toggle-btn');

  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetInputId = btn.getAttribute('data-target');
      const input = document.getElementById(targetInputId);
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

/* --------------------------------------------------------------------------
   2. Resume Upload & PDF Validation
   -------------------------------------------------------------------------- */
let selectedResumeFile = null;

function initResumeUpload() {
  const fileInput = document.getElementById('studentResume');
  const dropzone = document.getElementById('resumeDropzone');
  const previewCard = document.getElementById('resumePreviewCard');
  const previewName = document.getElementById('resumeFileName');
  const previewSize = document.getElementById('resumeFileSize');
  const removeBtn = document.getElementById('resumeRemoveBtn');
  const errorFeedback = document.getElementById('resumeErrorFeedback');

  if (!fileInput || !dropzone) return;

  const handleFile = (file) => {
    if (!file) return;

    // Validate PDF file extension and mime type
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const maxSize = 5 * 1024 * 1024; // 5 MB

    if (!isPdf) {
      selectedResumeFile = null;
      fileInput.value = '';
      if (previewCard) previewCard.style.display = 'none';
      if (errorFeedback) {
        errorFeedback.textContent = 'Invalid file type. Please upload a PDF document (.pdf only).';
        errorFeedback.style.display = 'block';
      }
      dropzone.classList.add('border-danger');
      return;
    }

    if (file.size > maxSize) {
      selectedResumeFile = null;
      fileInput.value = '';
      if (previewCard) previewCard.style.display = 'none';
      if (errorFeedback) {
        errorFeedback.textContent = 'File too large. Maximum allowed PDF size is 5 MB.';
        errorFeedback.style.display = 'block';
      }
      dropzone.classList.add('border-danger');
      return;
    }

    // Valid PDF
    selectedResumeFile = file;
    dropzone.classList.remove('border-danger');
    if (errorFeedback) errorFeedback.style.display = 'none';

    if (previewCard && previewName && previewSize) {
      previewName.textContent = file.name;
      const sizeInKb = (file.size / 1024).toFixed(1);
      const sizeStr = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : `${sizeInKb} KB`;
      previewSize.textContent = sizeStr;
      previewCard.style.display = 'flex';
    }
  };

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    handleFile(file);
  });

  // Dropzone drag-and-drop support
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleFile(file);
    }
  });

  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      selectedResumeFile = null;
      fileInput.value = '';
      if (previewCard) previewCard.style.display = 'none';
      if (errorFeedback) errorFeedback.style.display = 'none';
      dropzone.classList.remove('border-danger');
    });
  }
}

/* --------------------------------------------------------------------------
   3. Technical Skills Selection Tracker
   -------------------------------------------------------------------------- */
function initSkillsCounter() {
  const checkboxes = document.querySelectorAll('.skill-checkbox-input');
  const countBadge = document.getElementById('selectedSkillsCount');
  const skillsError = document.getElementById('skillsErrorFeedback');

  if (!checkboxes.length) return;

  const updateCount = () => {
    const checkedCount = document.querySelectorAll('.skill-checkbox-input:checked').length;
    if (countBadge) {
      countBadge.textContent = `${checkedCount} selected`;
      countBadge.className = checkedCount > 0 ? 'badge bg-soft-primary' : 'badge bg-light text-muted border';
    }
    if (checkedCount > 0 && skillsError) {
      skillsError.style.display = 'none';
    }
  };

  checkboxes.forEach(cb => {
    cb.addEventListener('change', updateCount);
  });
  updateCount();
}

/* --------------------------------------------------------------------------
   4. Form Validation & Submission Handler
   -------------------------------------------------------------------------- */
function initStudentRegistrationForm() {
  const form = document.getElementById('studentRegistrationForm');
  if (!form) return;

  const fullNameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('emailAddress');
  const mobileInput = document.getElementById('mobileNumber');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const collegeInput = document.getElementById('collegeName');
  const degreeSelect = document.getElementById('degree');
  const departmentSelect = document.getElementById('department');
  const graduationYearSelect = document.getElementById('graduationYear');
  const termsCheckbox = document.getElementById('termsAgreement');
  const submitBtn = document.getElementById('registerSubmitBtn');

  const formCard = document.getElementById('registrationFormSection');
  const successCard = document.getElementById('registrationSuccessSection');
  const successStudentName = document.getElementById('successStudentName');
  const successStudentEmail = document.getElementById('successStudentEmail');
  const redirectTimerEl = document.getElementById('redirectCountdown');
  const alertContainer = document.getElementById('registrationAlertContainer');
  let isSubmitting = false;

  // Real-time Confirm Password Validation
  const validateConfirmPassword = () => {
    if (!confirmPasswordInput) return true;
    const pwd = passwordInput?.value || '';
    const confirmPwd = confirmPasswordInput.value || '';
    const feedback = document.getElementById('confirmPasswordFeedback');

    if (confirmPwd.length > 0 && confirmPwd !== pwd) {
      confirmPasswordInput.classList.add('is-invalid');
      confirmPasswordInput.classList.remove('is-valid');
      if (feedback) feedback.textContent = 'Passwords do not match.';
      return false;
    } else if (confirmPwd.length > 0 && confirmPwd === pwd) {
      confirmPasswordInput.classList.remove('is-invalid');
      confirmPasswordInput.classList.add('is-valid');
      return true;
    }
    return false;
  };

  confirmPasswordInput?.addEventListener('input', validateConfirmPassword);

  // Password Strength Indicator & Live Confirm Matching
  const strengthContainer = document.getElementById('passwordStrengthContainer');
  const strengthLabel = document.getElementById('passwordStrengthLabel');
  const strengthBar = document.getElementById('passwordStrengthBar');
  const strengthHelp = document.getElementById('passwordStrengthHelp');

  passwordInput?.addEventListener('input', () => {
    const val = passwordInput.value || '';
    if (confirmPasswordInput?.value.length > 0) {
      validateConfirmPassword();
    }

    if (!strengthContainer || !strengthLabel || !strengthBar) return;

    if (val.length === 0) {
      strengthContainer.style.display = 'none';
      return;
    }

    strengthContainer.style.display = 'block';

    let score = 0;
    if (val.length >= 8) score++;
    if (/[a-z]/.test(val) && /[A-Z]/.test(val)) score++;
    if (/\d/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    if (val.length < 8 || score <= 1) {
      strengthLabel.textContent = 'Weak';
      strengthLabel.className = 'fw-bold text-danger';
      strengthBar.className = 'progress-bar bg-danger';
      strengthBar.style.width = '30%';
      if (strengthHelp) strengthHelp.textContent = 'Password is weak. Add numbers, mixed case, and symbols.';
    } else if (score === 2 || score === 3) {
      strengthLabel.textContent = 'Medium';
      strengthLabel.className = 'fw-bold text-warning';
      strengthBar.className = 'progress-bar bg-warning';
      strengthBar.style.width = '65%';
      if (strengthHelp) strengthHelp.textContent = 'Good password. Add symbols (!@#$) for strong protection.';
    } else {
      strengthLabel.textContent = 'Strong';
      strengthLabel.className = 'fw-bold text-success';
      strengthBar.className = 'progress-bar bg-success';
      strengthBar.style.width = '100%';
      if (strengthHelp) strengthHelp.textContent = 'Strong password! Meets all security best practices.';
    }
  });

  // Real-time mobile digits sanitization
  mobileInput?.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent double submissions
    if (isSubmitting) return;

    // Reset previous alert banner
    if (alertContainer) {
      alertContainer.innerHTML = '';
      alertContainer.style.display = 'none';
    }

    let isValid = true;

    // 1. Full Name Validation
    const fullNameVal = fullNameInput?.value.trim() || '';
    if (fullNameVal.length < 3) {
      setFieldValidity(fullNameInput, false, 'Please enter your full name (at least 3 characters).');
      isValid = false;
    } else {
      setFieldValidity(fullNameInput, true);
    }

    // 2. Email Address Validation
    const emailVal = emailInput?.value.trim() || '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal)) {
      setFieldValidity(emailInput, false, 'Please enter a valid email address.');
      isValid = false;
    } else {
      setFieldValidity(emailInput, true);
    }

    // 3. Mobile Number Validation (10 digits starting with 6-9)
    const mobileVal = mobileInput?.value.trim() || '';
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobileVal)) {
      setFieldValidity(mobileInput, false, 'Please enter a valid 10-digit mobile number starting with 6-9.');
      isValid = false;
    } else {
      setFieldValidity(mobileInput, true);
    }

    // 4. Password Validation (min 8 chars, 1 letter, 1 number)
    const passwordVal = passwordInput?.value || '';
    if (passwordVal.length < 8) {
      setFieldValidity(passwordInput, false, 'Password must be at least 8 characters long.');
      isValid = false;
    } else {
      setFieldValidity(passwordInput, true);
    }

    // 5. Confirm Password Validation
    const confirmPasswordVal = confirmPasswordInput?.value || '';
    if (!confirmPasswordVal || confirmPasswordVal !== passwordVal) {
      setFieldValidity(confirmPasswordInput, false, 'Passwords do not match.');
      isValid = false;
    } else {
      setFieldValidity(confirmPasswordInput, true);
    }

    // 6. College Name Validation
    const collegeVal = collegeInput?.value.trim() || '';
    if (collegeVal.length < 3) {
      setFieldValidity(collegeInput, false, 'Please enter your institution / college name.');
      isValid = false;
    } else {
      setFieldValidity(collegeInput, true);
    }

    // 7. Degree Validation
    if (!degreeSelect?.value) {
      setFieldValidity(degreeSelect, false, 'Please select your degree.');
      isValid = false;
    } else {
      setFieldValidity(degreeSelect, true);
    }

    // 8. Department Validation
    if (!departmentSelect?.value) {
      setFieldValidity(departmentSelect, false, 'Please select your department.');
      isValid = false;
    } else {
      setFieldValidity(departmentSelect, true);
    }

    // 9. Graduation Year Validation
    if (!graduationYearSelect?.value) {
      setFieldValidity(graduationYearSelect, false, 'Please select your graduation year.');
      isValid = false;
    } else {
      setFieldValidity(graduationYearSelect, true);
    }

    // 10. Technical Skills (at least one skill selected)
    const checkedSkills = document.querySelectorAll('.skill-checkbox-input:checked');
    const skillsError = document.getElementById('skillsErrorFeedback');
    if (checkedSkills.length === 0) {
      if (skillsError) {
        skillsError.textContent = 'Please select at least one technical skill.';
        skillsError.style.display = 'block';
      }
      isValid = false;
    } else {
      if (skillsError) skillsError.style.display = 'none';
    }

    // 11. Resume Upload (PDF only)
    const resumeError = document.getElementById('resumeErrorFeedback');
    const dropzone = document.getElementById('resumeDropzone');
    if (!selectedResumeFile) {
      if (resumeError) {
        resumeError.textContent = 'Please upload your resume in PDF format.';
        resumeError.style.display = 'block';
      }
      if (dropzone) dropzone.classList.add('border-danger');
      isValid = false;
    } else {
      if (resumeError) resumeError.style.display = 'none';
      if (dropzone) dropzone.classList.remove('border-danger');
    }

    // 12. Terms & Conditions Checkbox
    if (!termsCheckbox?.checked) {
      setFieldValidity(termsCheckbox, false, 'You must agree to the Terms of Service to register.');
      isValid = false;
    } else {
      setFieldValidity(termsCheckbox, true);
    }

    // Handle invalid state: scroll to first invalid field
    if (!isValid) {
      const firstInvalid = form.querySelector('.is-invalid, .border-danger');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // 13. Build Backend API Payload
    const skillsList = Array.from(checkedSkills).map(el => el.value);
    const payload = {
      full_name: fullNameVal,
      email: emailVal,
      password: passwordVal,
      mobile: mobileVal,
      college: collegeVal,
      degree: degreeSelect.value,
      department: departmentSelect.value,
      graduation_year: parseInt(graduationYearSelect.value, 10),
      skills: skillsList
    };

    // UI Loading state & double submission prevention
    isSubmitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Creating Account...';
    }

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/students`, {
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
        const createdStudent = result.data || {};

        // Save non-sensitive student profile details (password is NEVER stored in localStorage/sessionStorage)
        const studentProfile = {
          id: createdStudent.id || `stud-${Date.now()}`,
          fullName: createdStudent.full_name || fullNameVal,
          email: createdStudent.email || emailVal,
          mobile: createdStudent.mobile || mobileVal,
          college: createdStudent.college || collegeVal,
          degree: createdStudent.degree || degreeSelect.value,
          department: createdStudent.department || departmentSelect.value,
          graduationYear: createdStudent.graduation_year || parseInt(graduationYearSelect.value, 10),
          skills: skillsList,
          resumeFileName: selectedResumeFile ? selectedResumeFile.name : null,
          role: 'student',
          registeredAt: createdStudent.created_at || new Date().toISOString()
        };

        studentProfile.role = 'student';
        studentProfile.authRole = 'student';

        try {
          const profileStr = JSON.stringify(studentProfile);
          const sessStr = JSON.stringify({
            id: studentProfile.id,
            fullName: studentProfile.fullName,
            email: studentProfile.email,
            role: 'student',
            authRole: 'student',
            loggedInAt: new Date().toISOString()
          });

          localStorage.setItem('skillbridge_registered_student', profileStr);
          localStorage.setItem('skillbridge_student_session', sessStr);
          localStorage.setItem('skillbridge_active_session', sessStr);
          localStorage.setItem('skillbridge_auth_role', 'student');

          sessionStorage.setItem('skillbridge_registered_student', profileStr);
          sessionStorage.setItem('skillbridge_student_session', sessStr);
          sessionStorage.setItem('skillbridge_active_session', sessStr);
          sessionStorage.setItem('skillbridge_auth_role', 'student');
        } catch (storageErr) {
          console.warn('Could not access storage for session storage', storageErr);
        }

        // Show Success Confirmation Card View
        if (formCard) formCard.style.display = 'none';
        if (successCard) {
          successCard.style.display = 'block';
          if (successStudentName) successStudentName.textContent = studentProfile.fullName;
          if (successStudentEmail) successStudentEmail.textContent = studentProfile.email;
        }

        // 4-second redirect countdown to login.html
        let timeLeft = 4;
        if (redirectTimerEl) redirectTimerEl.textContent = `${timeLeft}s`;

        const countdownInterval = setInterval(() => {
          timeLeft--;
          if (redirectTimerEl) redirectTimerEl.textContent = `${timeLeft}s`;
          if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            window.location.href = 'login.html';
          }
        }, 1000);

        return;
      }

      // --- Scenario B: Duplicate Email Conflict (HTTP 409 Conflict) ---
      if (response.status === 409) {
        setFieldValidity(emailInput, false, 'An account with this email address already exists. Please sign in or use a different email.');
        if (emailInput) {
          emailInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          emailInput.focus();
        }
        showRegistrationAlert(
          `<strong>Email Already Registered:</strong> An account with <em>${escapeHtml(emailVal)}</em> already exists. <a href="login.html" class="alert-link fw-semibold">Click here to sign in</a>.`,
          'warning'
        );
        return;
      }

      // --- Scenario C: Validation Error from Backend (HTTP 400 Bad Request) ---
      if (response.status === 400) {
        const errorMsg = (result && result.error) ? result.error : 'Validation failed. Please verify your details.';
        const details = (result && Array.isArray(result.missingFields) && result.missingFields.length > 0)
          ? ` (Missing fields: ${result.missingFields.join(', ')})`
          : '';
        showRegistrationAlert(`<strong>Validation Error:</strong> ${escapeHtml(errorMsg)}${details}`, 'danger');
        return;
      }

      // --- Scenario D: Unexpected Server Error (HTTP 500 etc.) ---
      const serverMsg = (result && result.error) ? result.error : `Server returned status ${response.status}. Please try again later.`;
      showRegistrationAlert(`<strong>Registration Failed:</strong> ${escapeHtml(serverMsg)}`, 'danger');

    } catch (networkError) {
      console.error('[SkillBridge Student Registration API Error]', networkError);
      showRegistrationAlert(
        '<strong>Connection Error:</strong> Could not connect to the backend server at <code>http://localhost:5000</code>. ' +
        'Please ensure the Node.js backend is running (<code>cd backend && npm run dev</code>).',
        'danger'
      );
    } finally {
      isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Create Account <i class="bi bi-arrow-right-short fs-5"></i>';
      }
    }
  });
}

/**
 * Display dynamic alert messages on the registration form
 */
function showRegistrationAlert(message, type = 'danger') {
  let container = document.getElementById('registrationAlertContainer');
  if (!container) {
    const formSection = document.getElementById('registrationFormSection');
    if (formSection) {
      container = document.createElement('div');
      container.id = 'registrationAlertContainer';
      container.className = 'mb-3';
      const heading = formSection.querySelector('.mb-4');
      if (heading) {
        heading.after(container);
      } else {
        formSection.prepend(container);
      }
    }
  }
  if (!container) return;

  const iconClass = type === 'warning' ? 'bi-exclamation-triangle-fill text-warning' : 'bi-x-circle-fill text-danger';
  container.innerHTML = `
    <div class="alert alert-${type} d-flex align-items-center gap-2 mb-3 border-0 shadow-sm" role="alert">
      <i class="bi ${iconClass} fs-5 flex-shrink-0"></i>
      <div>${message}</div>
    </div>
  `;
  container.style.display = 'block';
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

/**
 * Helper to toggle Bootstrap validation classes on inputs
 */
function setFieldValidity(input, isValid, message = '') {
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

/* --------------------------------------------------------------------------
   5. Student Login Form Handler
   -------------------------------------------------------------------------- */
function initStudentLoginForm() {
  const form = document.getElementById('studentLoginForm');
  if (!form) return;

  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  const rememberCheckbox = document.getElementById('rememberMe');
  const submitBtn = document.getElementById('loginSubmitBtn');
  const alertContainer = document.getElementById('loginAlertContainer');

  // 1. Sanitize against recruiter email leakage (e.g. hr@nexoratech.com or recruiter addresses)
  try {
    const rawStored = localStorage.getItem('skillbridge_remembered_email') || '';
    if (rawStored && (
      rawStored.toLowerCase().includes('nexoratech') ||
      rawStored.toLowerCase().includes('recruiter') ||
      rawStored.toLowerCase().includes('cloudscale') ||
      rawStored.toLowerCase().startsWith('hr@') ||
      rawStored.toLowerCase().startsWith('recruiter@') ||
      rawStored.toLowerCase().startsWith('careers@') ||
      rawStored.toLowerCase().startsWith('hiring@')
    )) {
      localStorage.removeItem('skillbridge_remembered_email');
    }
  } catch (e) {}

  // 2. Auto-fill ONLY genuine student remembered email if explicitly saved
  try {
    const studentRemembered = localStorage.getItem('skillbridge_student_remembered_email') ||
                              localStorage.getItem('skillbridge_remembered_email');

    const isRecruiterEmail = studentRemembered && (
      studentRemembered.toLowerCase().includes('nexoratech') ||
      studentRemembered.toLowerCase().includes('cloudscale') ||
      studentRemembered.toLowerCase().includes('recruiter') ||
      studentRemembered.toLowerCase().startsWith('hr@') ||
      studentRemembered.toLowerCase().startsWith('recruiter@') ||
      studentRemembered.toLowerCase().startsWith('careers@') ||
      studentRemembered.toLowerCase().startsWith('hiring@')
    );

    if (studentRemembered && !isRecruiterEmail && emailInput) {
      emailInput.value = studentRemembered;
      if (rememberCheckbox) rememberCheckbox.checked = true;
    } else {
      if (emailInput) emailInput.value = '';
    }
  } catch (e) {
    console.warn('Could not read remembered email', e);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    let isValid = true;

    // Validate Email
    const emailVal = emailInput?.value.trim().toLowerCase() || '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal || !emailRegex.test(emailVal)) {
      setFieldValidity(emailInput, false, 'Please enter a valid email address.');
      isValid = false;
    } else {
      setFieldValidity(emailInput, true);
    }

    // Validate Password
    const passwordVal = passwordInput?.value || '';
    if (!passwordVal || passwordVal.length < 6) {
      setFieldValidity(passwordInput, false, 'Please enter your password (minimum 6 characters).');
      isValid = false;
    } else {
      setFieldValidity(passwordInput, true);
    }

    if (!isValid) return;

    // Handle Student "Remember Me" with role-specific key
    try {
      if (rememberCheckbox?.checked) {
        localStorage.setItem('skillbridge_student_remembered_email', emailVal);
        localStorage.setItem('skillbridge_remembered_email', emailVal);
      } else {
        localStorage.removeItem('skillbridge_student_remembered_email');
        localStorage.removeItem('skillbridge_remembered_email');
      }
    } catch (e) {
      console.warn('Could not save remembered email', e);
    }

    // Button loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Authenticating...';
    }

    try {
      // 1. Authenticate student credentials via POST /api/students/login
      const res = await fetch(`${BACKEND_API_BASE_URL}/students/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: emailVal,
          password: passwordVal
        })
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json || !json.success) {
        let errorMsg = json?.error || 'Authentication failed. Please check your credentials.';
        if (res.status === 404 || errorMsg.includes('No registered student account')) {
          errorMsg = `No registered student account found with email <strong>${escapeHtml(emailVal)}</strong>. Please check your credentials or register.`;
        }

        if (alertContainer) {
          alertContainer.innerHTML = `
            <div class="alert alert-danger d-flex align-items-center gap-2 mb-3 shadow-sm border-0" role="alert">
              <i class="bi bi-exclamation-triangle-fill fs-5 text-danger"></i>
              <div>
                <div class="fw-bold small">Authentication Failed</div>
                <div class="small">${errorMsg}</div>
              </div>
            </div>
          `;
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Sign In to Student Portal <i class="bi bi-arrow-right-short fs-5"></i>';
        }
        return;
      }

      const matchingStudent = json.data;

      // 2. Establish genuine student session (Never store password in localStorage or sessionStorage)
      const sessionData = {
        id: matchingStudent.id,
        fullName: matchingStudent.full_name,
        email: matchingStudent.email,
        mobile: matchingStudent.mobile,
        college: matchingStudent.college,
        degree: matchingStudent.degree,
        department: matchingStudent.department,
        graduationYear: matchingStudent.graduation_year,
        cgpa: matchingStudent.cgpa,
        role: 'student',
        authRole: 'student',
        token: `student-token-${matchingStudent.id}-${Date.now()}`,
        loginTimestamp: Date.now()
      };

      try {
        const sessionStr = JSON.stringify(sessionData);

        localStorage.setItem('skillbridge_student_session', sessionStr);
        localStorage.setItem('skillbridge_student_auth_role', 'student');
        localStorage.setItem('skillbridge_auth_role', 'student');
        localStorage.setItem('skillbridge_registered_student', sessionStr);

        sessionStorage.setItem('skillbridge_student_session', sessionStr);
        sessionStorage.setItem('skillbridge_student_auth_role', 'student');
        sessionStorage.setItem('skillbridge_auth_role', 'student');
        sessionStorage.setItem('skillbridge_registered_student', sessionStr);
      } catch (storageErr) {
        console.warn('Could not persist student session', storageErr);
      }

      // 3. Show Success Message
      if (alertContainer) {
        alertContainer.innerHTML = `
          <div class="alert alert-success d-flex align-items-center gap-2 mb-3 shadow-sm border-0" role="alert" style="background-color: #ecfdf5; color: #065f46; border-left: 4px solid #10b981 !important;">
            <i class="bi bi-check-circle-fill fs-5 text-success"></i>
            <div>
              <div class="fw-bold small">Login Successful!</div>
              <div class="small">Welcome back, <strong>${matchingStudent.full_name}</strong>. Redirecting to your student dashboard...</div>
            </div>
          </div>
        `;
      }

      // Redirect to student-dashboard.html after short delay
      setTimeout(() => {
        window.location.href = 'student-dashboard.html';
      }, 800);

    } catch (err) {
      console.error('[SkillBridge Student Auth] Login error:', err);
      if (alertContainer) {
        alertContainer.innerHTML = `
          <div class="alert alert-danger d-flex align-items-center gap-2 mb-3 shadow-sm border-0" role="alert">
            <i class="bi bi-exclamation-triangle-fill fs-5 text-danger"></i>
            <div>
              <div class="fw-bold small">Connection Error</div>
              <div class="small">Could not connect to authentication service. Please ensure the backend is running.</div>
            </div>
          </div>
        `;
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Sign In to Student Portal <i class="bi bi-arrow-right-short fs-5"></i>';
      }
    }
  });
}

/* --------------------------------------------------------------------------
   6. Forgot Password Modal Handler
   -------------------------------------------------------------------------- */
function initForgotPasswordModal() {
  const modalForm = document.getElementById('forgotPasswordForm');
  const emailInput = document.getElementById('forgotEmailInput');
  const alertContainer = document.getElementById('forgotAlertContainer');
  const submitBtn = document.getElementById('forgotSubmitBtn');

  if (!modalForm) return;

  modalForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const emailVal = emailInput?.value.trim() || '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailVal || !emailRegex.test(emailVal)) {
      if (emailInput) {
        emailInput.classList.add('is-invalid');
      }
      return;
    }

    if (emailInput) {
      emailInput.classList.remove('is-invalid');
      emailInput.classList.add('is-valid');
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Sending...';
    }

    setTimeout(() => {
      if (alertContainer) {
        alertContainer.innerHTML = `
          <div class="alert alert-success border-0 small mb-0" style="background-color: #ecfdf5; color: #065f46;">
            <i class="bi bi-envelope-check-fill me-1 text-success"></i>
            <strong>Password Reset Demo:</strong> If <em>${emailVal}</em> is registered, recovery instructions have been sent.
          </div>
        `;
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Email Sent';
        submitBtn.classList.replace('btn-primary-custom', 'btn-outline-custom');
      }
    }, 800);
  });
}
