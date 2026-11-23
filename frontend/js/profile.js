/**
 * SkillBridge - Student Profile JavaScript Controller
 * Comprehensive controller for candidate personal, academic, technical information,
 * categorized skills (verified vs self-declared), resume management, photo upload/removal,
 * URL & contact validation, live bio counter, and dynamic profile completion tracking.
 */

// ==========================================================================
// 1. Profile Store & Initial Defaults
// ==========================================================================
const ProfileStore = {
  defaultProfile: {
    fullName: "Yazh S",
    headline: "Aspiring Full Stack Java & Cloud Developer",
    email: "yazh.s@example.com",
    mobile: "9876543210",
    location: "Chennai, Tamil Nadu, India",
    workMode: "Hybrid / Remote",
    bio: "Passionate final-year computer science student specializing in backend systems with Java and Spring Boot, relational database design with MySQL, and data processing with Python. Seeking an internship opportunity to apply hands-on project experience in enterprise software.",
    college: "Anna University / College of Engineering",
    degree: "B.E. Computer Science & Engineering",
    department: "Computer Science & Engineering",
    graduationYear: "2026",
    semester: "7th Semester (Final Year)",
    cgpa: "8.8",
    studentRollNo: "BE-CSE-2022-048",
    skills: [
      { name: "Java", category: "Programming", verified: true, score: "92%" },
      { name: "Python", category: "Programming", verified: true, score: "80%" },
      { name: "JavaScript", category: "Programming", verified: true, score: "90%" },
      { name: "Spring Boot", category: "Backend", verified: true, score: "88%" },
      { name: "REST APIs", category: "Backend", verified: false, score: null },
      { name: "HTML5", category: "Frontend", verified: true, score: "90%" },
      { name: "CSS3", category: "Frontend", verified: true, score: "90%" },
      { name: "Bootstrap 5", category: "Frontend", verified: false, score: null },
      { name: "MySQL", category: "Database", verified: true, score: "85%" },
      { name: "Git", category: "Tools", verified: false, score: null },
      { name: "Docker", category: "Tools", verified: false, score: null },
      { name: "Postman", category: "Tools", verified: false, score: null },
      { name: "Maven", category: "Tools", verified: false, score: null }
    ],
    githubUrl: "https://github.com/yazh-demo",
    linkedinUrl: "https://linkedin.com/in/yazh-demo",
    portfolioUrl: "https://yazhdev.portfolio.demo",
    codingProfileUrl: "https://leetcode.com/yazh-demo",
    resumeFileName: "Yazh_S_Resume_2026.pdf",
    resumeUploadDate: "15 Nov 2026",
    resumeSize: "420 KB",
    avatarUrl: "",
    avatarInitials: "YS"
  },

  // Load from localStorage or return default demo profile
  getProfile() {
    try {
      const stored = localStorage.getItem('skillbridge_registered_student');
      if (stored) {
        const parsed = JSON.parse(stored);
        const name = parsed.fullName || this.defaultProfile.fullName;
        const initials = name
          .split(' ')
          .map(w => w[0])
          .slice(0, 2)
          .join('')
          .toUpperCase() || 'YS';

        // Normalize skills: migrate string array if needed
        let normalizedSkills = [];
        if (Array.isArray(parsed.skills)) {
          if (parsed.skills.length > 0 && typeof parsed.skills[0] === 'string') {
            normalizedSkills = this.migrateStringSkills(parsed.skills);
          } else {
            normalizedSkills = parsed.skills;
          }
        } else {
          normalizedSkills = [...this.defaultProfile.skills];
        }

        return {
          ...this.defaultProfile,
          ...parsed,
          fullName: name,
          avatarInitials: initials,
          skills: normalizedSkills,
          resumeFileName: parsed.resumeFileName || this.defaultProfile.resumeFileName
        };
      }
    } catch (e) {
      console.warn('Could not read profile from localStorage', e);
    }
    return JSON.parse(JSON.stringify(this.defaultProfile));
  },

  // Helper to migrate flat string array into categorized objects
  migrateStringSkills(strList) {
    const defaultMap = {
      'java': { category: 'Programming', verified: true, score: '92%' },
      'python': { category: 'Programming', verified: true, score: '80%' },
      'javascript': { category: 'Programming', verified: true, score: '90%' },
      'html5': { category: 'Frontend', verified: true, score: '90%' },
      'css3': { category: 'Frontend', verified: true, score: '90%' },
      'spring boot': { category: 'Backend', verified: true, score: '88%' },
      'mysql': { category: 'Database', verified: true, score: '85%' },
      'git': { category: 'Tools', verified: false, score: null },
      'docker': { category: 'Tools', verified: false, score: null },
      'postman': { category: 'Tools', verified: false, score: null }
    };

    return strList.map(s => {
      const key = s.trim().toLowerCase();
      if (defaultMap[key]) {
        return { name: s, ...defaultMap[key] };
      }
      return { name: s, category: 'Programming', verified: false, score: null };
    });
  },

  saveProfile(profileData) {
    try {
      localStorage.setItem('skillbridge_registered_student', JSON.stringify(profileData));
      return true;
    } catch (e) {
      console.warn('Could not save profile to localStorage', e);
      return false;
    }
  },

  resetToDefault() {
    try {
      localStorage.removeItem('skillbridge_registered_student');
      return true;
    } catch (e) {
      console.warn('Could not clear profile', e);
      return false;
    }
  }
};

// ==========================================================================
// 2. Global State & Initialization
// ==========================================================================
let currentProfile = {};
let activeSkills = [];

document.addEventListener('DOMContentLoaded', () => {
  initProfilePage();
});

function initProfilePage() {
  loadAndRenderProfile();
  initFormEventListeners();
  initBioCharacterCounter();
  initSkillManagement();
  initAvatarUploadAndRemoval();
  initResumeManagement();
  initMobileSidebarToggle();
  initLogoutHandler();
}

/* --------------------------------------------------------------------------
   Load & Render Profile Data
   -------------------------------------------------------------------------- */
function loadAndRenderProfile() {
  currentProfile = ProfileStore.getProfile();
  activeSkills = Array.isArray(currentProfile.skills) ? [...currentProfile.skills] : [];

  // 1. Header & Sidebar Avatars & Names
  renderUserAvatars(currentProfile.avatarUrl, currentProfile.avatarInitials);
  renderHeaderDetails(currentProfile);

  // 2. Fill Input Fields
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  // Personal
  setVal('inputFullName', currentProfile.fullName);
  setVal('inputHeadline', currentProfile.headline);
  setVal('inputEmail', currentProfile.email);
  setVal('inputMobile', currentProfile.mobile);
  setVal('inputLocation', currentProfile.location);
  setVal('selectWorkMode', currentProfile.workMode);
  setVal('inputBio', currentProfile.bio);

  // Academic
  setVal('inputCollege', currentProfile.college);
  setVal('selectDegree', currentProfile.degree);
  setVal('selectDepartment', currentProfile.department);
  setVal('selectGradYear', currentProfile.graduationYear);
  setVal('inputSemester', currentProfile.semester);
  setVal('inputCgpa', currentProfile.cgpa);
  setVal('inputRollNo', currentProfile.studentRollNo);

  // Professional Links
  setVal('inputGithub', currentProfile.githubUrl);
  setVal('inputLinkedin', currentProfile.linkedinUrl);
  setVal('inputPortfolio', currentProfile.portfolioUrl);
  setVal('inputCodingProfile', currentProfile.codingProfileUrl);

  // Update clickable link buttons
  updateExternalLinkButtons();

  // 3. Render Categorized Skills
  renderCategorizedSkills();

  // 4. Render Resume
  renderResumeDetails();

  // 5. Update Bio Counter
  updateBioCounter();

  // 6. Update Profile Completion Meter & Missing Info Checklist
  updateProfileCompletionMeter();
}

/* --------------------------------------------------------------------------
   Render Avatars across Header, Sidebar & Topbar
   -------------------------------------------------------------------------- */
function renderUserAvatars(avatarUrl, initials) {
  const headerImg = document.getElementById('headerAvatarImg');
  const headerInitials = document.getElementById('headerAvatarInitials');
  const sidebarImg = document.getElementById('sidebarAvatarImg');
  const sidebarInitials = document.getElementById('sidebarAvatarInitials');
  const topbarImg = document.getElementById('topbarAvatarImg');
  const topbarInitials = document.getElementById('topbarAvatarInitials');
  const sectionImg = document.getElementById('sectionAvatarImg');
  const sectionInitials = document.getElementById('sectionAvatarInitials');
  const removePhotoBtn = document.getElementById('removeAvatarBtn');
  const sectionRemoveBtn = document.getElementById('sectionRemoveAvatarBtn');

  if (avatarUrl && avatarUrl.trim() !== '') {
    // Show image avatars
    if (headerImg) { headerImg.src = avatarUrl; headerImg.classList.remove('d-none'); }
    if (headerInitials) { headerInitials.classList.add('d-none'); }

    if (sidebarImg) { sidebarImg.src = avatarUrl; sidebarImg.classList.remove('d-none'); }
    if (sidebarInitials) { sidebarInitials.classList.add('d-none'); }

    if (topbarImg) { topbarImg.src = avatarUrl; topbarImg.classList.remove('d-none'); }
    if (topbarInitials) { topbarInitials.classList.add('d-none'); }

    if (sectionImg) { sectionImg.src = avatarUrl; sectionImg.classList.remove('d-none'); }
    if (sectionInitials) { sectionInitials.classList.add('d-none'); }

    if (removePhotoBtn) { removePhotoBtn.classList.remove('d-none'); }
    if (sectionRemoveBtn) { sectionRemoveBtn.classList.remove('d-none'); }
  } else {
    // Show initials avatars
    if (headerImg) { headerImg.classList.add('d-none'); }
    if (headerInitials) { headerInitials.textContent = initials; headerInitials.classList.remove('d-none'); }

    if (sidebarImg) { sidebarImg.classList.add('d-none'); }
    if (sidebarInitials) { sidebarInitials.textContent = initials; sidebarInitials.classList.remove('d-none'); }

    if (topbarImg) { topbarImg.classList.add('d-none'); }
    if (topbarInitials) { topbarInitials.textContent = initials; topbarInitials.classList.remove('d-none'); }

    if (sectionImg) { sectionImg.classList.add('d-none'); }
    if (sectionInitials) { sectionInitials.textContent = initials; sectionInitials.classList.remove('d-none'); }

    if (removePhotoBtn) { removePhotoBtn.classList.add('d-none'); }
    if (sectionRemoveBtn) { sectionRemoveBtn.classList.add('d-none'); }
  }
}

function renderHeaderDetails(profile) {
  const headerName = document.getElementById('headerFullName');
  const headerHeadline = document.getElementById('headerHeadline');
  const headerCollege = document.getElementById('headerCollege');
  const headerLocation = document.getElementById('headerLocation');
  const topNavUserNames = document.querySelectorAll('.user-full-name');

  if (headerName) headerName.textContent = profile.fullName;
  if (headerHeadline) headerHeadline.textContent = profile.headline || 'Student Candidate';
  if (headerCollege) headerCollege.innerHTML = `<i class="bi bi-mortarboard-fill me-1"></i> ${profile.degree} &bull; ${profile.college}`;
  if (headerLocation) headerLocation.innerHTML = `<i class="bi bi-geo-alt-fill text-danger me-1"></i> ${profile.location}`;

  topNavUserNames.forEach(el => el.textContent = profile.fullName);
}

/* --------------------------------------------------------------------------
   External Links Helper
   -------------------------------------------------------------------------- */
function updateExternalLinkButtons() {
  const ghBtn = document.getElementById('openGithubBtn');
  const liBtn = document.getElementById('openLinkedinBtn');
  const portBtn = document.getElementById('openPortfolioBtn');
  const codingBtn = document.getElementById('openCodingProfileBtn');

  const setLink = (btn, url) => {
    if (!btn) return;
    if (url && isValidUrl(url)) {
      btn.href = url;
      btn.classList.remove('disabled', 'opacity-50');
      btn.setAttribute('target', '_blank');
      btn.setAttribute('rel', 'noopener noreferrer');
    } else {
      btn.href = '#';
      btn.classList.add('disabled', 'opacity-50');
    }
  };

  setLink(ghBtn, currentProfile.githubUrl);
  setLink(liBtn, currentProfile.linkedinUrl);
  setLink(portBtn, currentProfile.portfolioUrl);
  setLink(codingBtn, currentProfile.codingProfileUrl);
}

/* --------------------------------------------------------------------------
   Bio Character Counter
   -------------------------------------------------------------------------- */
function initBioCharacterCounter() {
  const bioInput = document.getElementById('inputBio');
  if (!bioInput) return;

  bioInput.addEventListener('input', () => {
    updateBioCounter();
    updateProfileCompletionMeter();
  });
}

function updateBioCounter() {
  const bioInput = document.getElementById('inputBio');
  const counter = document.getElementById('bioCharCounter');
  if (!bioInput || !counter) return;

  const len = bioInput.value.length;
  counter.textContent = `${len} / 500 characters`;

  if (len > 450) {
    counter.className = 'small fw-bold text-danger';
  } else if (len > 350) {
    counter.className = 'small fw-bold text-warning';
  } else {
    counter.className = 'small text-muted';
  }
}

/* --------------------------------------------------------------------------
   Categorized Technical Skills (Verified vs Self-Declared)
   -------------------------------------------------------------------------- */
function renderCategorizedSkills() {
  const categories = ["Programming", "Backend", "Frontend", "Database", "Tools"];

  categories.forEach(cat => {
    const containerId = `skillsContainer_${cat}`;
    const container = document.getElementById(containerId);
    if (!container) return;

    const catSkills = activeSkills.filter(s => s.category.toLowerCase() === cat.toLowerCase());

    if (catSkills.length === 0) {
      container.innerHTML = `<span class="text-muted small fst-italic py-1 d-block">No ${cat} skills added yet.</span>`;
      return;
    }

    container.innerHTML = catSkills.map(skill => {
      const isVerified = skill.verified === true;
      const verifiedBadge = isVerified
        ? `<span class="badge bg-soft-primary text-primary px-2 py-0-5 rounded-pill" style="font-size: 0.7rem;" title="Demo assessment score from sample test"><i class="bi bi-award me-1"></i>Demo Score${skill.score ? ' (' + skill.score + ')' : ''}</span>`
        : `<span class="badge bg-light text-muted border px-2 py-0-5 rounded-pill" style="font-size: 0.7rem;" title="Student self-reported skill (pending verification)"><i class="bi bi-person me-1"></i>Self-Declared</span>`;

      return `
        <div class="skill-item-card shadow-xs">
          <span class="fw-semibold text-dark small">${skill.name}</span>
          ${verifiedBadge}
          <button type="button" class="btn btn-sm btn-link text-danger p-0 ms-1 skill-remove-btn" data-skill-name="${skill.name}" title="Remove ${skill.name}">
            <i class="bi bi-x-circle-fill"></i>
          </button>
        </div>
      `;
    }).join('');
  });

  // Attach delete handlers
  document.querySelectorAll('.skill-remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const skillName = btn.getAttribute('data-skill-name');
      removeSkill(skillName);
    });
  });

  // Update total counts summary badge
  const totalCountEl = document.getElementById('totalSkillsCountBadge');
  const demoCountEl = document.getElementById('demoScoresCountBadge');
  const declaredCountEl = document.getElementById('declaredSkillsCountBadge');

  if (totalCountEl) totalCountEl.textContent = `${activeSkills.length} Total`;
  if (demoCountEl) demoCountEl.textContent = `${activeSkills.filter(s => s.verified).length} Demo Assessed`;
  if (declaredCountEl) declaredCountEl.textContent = `${activeSkills.filter(s => !s.verified).length} Self-Declared`;
}

function initSkillManagement() {
  const addBtn = document.getElementById('addSkillBtn');
  const skillInput = document.getElementById('addSkillNameInput');
  const categorySelect = document.getElementById('addSkillCategorySelect');

  const handleAdd = () => {
    if (!skillInput || !categorySelect) return;
    const name = skillInput.value.trim();
    const category = categorySelect.value;

    if (!name) {
      showProfileToast('Please enter a skill name.', 'warning');
      skillInput.focus();
      return;
    }

    // Check duplicate (case-insensitive)
    const exists = activeSkills.some(s => s.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      showProfileToast(`The skill "${name}" is already in your skills inventory.`, 'warning');
      skillInput.focus();
      return;
    }

    // Add new self-declared skill
    activeSkills.push({
      name: name,
      category: category,
      verified: false,
      score: null
    });

    renderCategorizedSkills();
    skillInput.value = '';
    updateProfileCompletionMeter();
    showProfileToast(`Added "${name}" under ${category} (Self-Declared).`, 'success');
  };

  if (addBtn) addBtn.addEventListener('click', handleAdd);
  if (skillInput) {
    skillInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    });
  }
}

function removeSkill(skillName) {
  const index = activeSkills.findIndex(s => s.name.toLowerCase() === skillName.toLowerCase());
  if (index !== -1) {
    const removed = activeSkills.splice(index, 1)[0];
    renderCategorizedSkills();
    updateProfileCompletionMeter();
    showProfileToast(`Removed "${removed.name}" from your skills list.`, 'info');
  }
}

/* --------------------------------------------------------------------------
   Avatar Photo Upload & Removal
   -------------------------------------------------------------------------- */
function initAvatarUploadAndRemoval() {
  const avatarInput = document.getElementById('avatarFileInput');
  const triggerBtn = document.getElementById('editAvatarBtn');
  const triggerBadge = document.getElementById('editAvatarBadge');
  const removeBtn = document.getElementById('removeAvatarBtn');

  const triggerUpload = () => {
    if (avatarInput) avatarInput.click();
  };

  if (triggerBtn) triggerBtn.addEventListener('click', triggerUpload);
  if (triggerBadge) triggerBadge.addEventListener('click', triggerUpload);

  if (avatarInput) {
    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showProfileToast('Please upload a valid image file (JPG, PNG, WEBP).', 'warning');
        avatarInput.value = '';
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        showProfileToast('Image size exceeds 2 MB limit. Please select a smaller photo.', 'warning');
        avatarInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        currentProfile.avatarUrl = event.target.result;
        renderUserAvatars(currentProfile.avatarUrl, currentProfile.avatarInitials);
        updateProfileCompletionMeter();
        showProfileToast('Profile photo updated! Click "Save Changes" to persist.', 'success');
      };
      reader.readAsDataURL(file);
    });
  }

  // Remove photo
  const removePhoto = (e) => {
    e.preventDefault();
    if (confirm('Remove profile photo and restore initials avatar?')) {
      currentProfile.avatarUrl = '';
      if (avatarInput) avatarInput.value = '';
      renderUserAvatars('', currentProfile.avatarInitials);
      updateProfileCompletionMeter();
      showProfileToast('Profile photo removed. Restored initials avatar.', 'info');
    }
  };

  if (removeBtn) removeBtn.addEventListener('click', removePhoto);
  const sectionRemoveBtn = document.getElementById('sectionRemoveAvatarBtn');
  if (sectionRemoveBtn) sectionRemoveBtn.addEventListener('click', removePhoto);
}

/* --------------------------------------------------------------------------
   Resume Management (Preview, Download, Replace)
   -------------------------------------------------------------------------- */
function renderResumeDetails() {
  const fileNameEl = document.getElementById('resumeFileNameDisplay');
  const uploadDateEl = document.getElementById('resumeUploadDateDisplay');
  const fileSizeEl = document.getElementById('resumeFileSizeDisplay');

  if (fileNameEl) fileNameEl.textContent = currentProfile.resumeFileName || 'Yazh_S_Resume_2026.pdf';
  if (uploadDateEl) uploadDateEl.textContent = currentProfile.resumeUploadDate || '15 Nov 2026';
  if (fileSizeEl) fileSizeEl.textContent = currentProfile.resumeSize || '420 KB';
}

function initResumeManagement() {
  const fileInput = document.getElementById('resumeFileInput');
  const downloadBtn = document.getElementById('downloadResumeBtn');
  const previewBtn = document.getElementById('previewResumeBtn');

  // File Upload
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.name.toLowerCase().endsWith('.pdf') || file.type !== 'application/pdf') {
        showProfileToast('Invalid file format. Please upload a PDF document only.', 'warning');
        fileInput.value = '';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showProfileToast('File exceeds 5 MB limit. Please upload a smaller PDF.', 'warning');
        fileInput.value = '';
        return;
      }

      const sizeKb = Math.round(file.size / 1024);
      currentProfile.resumeFileName = file.name;
      currentProfile.resumeSize = `${sizeKb} KB`;
      currentProfile.resumeUploadDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      renderResumeDetails();
      updateProfileCompletionMeter();
      showProfileToast(`Resume "${file.name}" uploaded successfully!`, 'success');
    });
  }

  // Simulated Download
  if (downloadBtn) {
    downloadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const fileName = currentProfile.resumeFileName || 'Yazh_S_Resume_2026.pdf';
      showProfileToast(`Downloading "${fileName}"... (Demo)`, 'info');

      const demoBlob = new Blob([
        `%PDF-1.4\nSkillBridge Demo Resume for ${currentProfile.fullName}\nEmail: ${currentProfile.email}\nPhone: ${currentProfile.mobile}\nInstitution: ${currentProfile.college}\nDegree: ${currentProfile.degree}\nSkills: ${activeSkills.map(s => s.name).join(', ')}`
      ], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(demoBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    });
  }

  // Preview Modal
  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      const modalEl = document.getElementById('resumePreviewModal');
      if (modalEl && window.bootstrap) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }
    });
  }
}

/* --------------------------------------------------------------------------
   Dynamic Profile Completion & Missing Info Checklist
   -------------------------------------------------------------------------- */
function updateProfileCompletionMeter() {
  let score = 0;
  const missingItems = [];

  // 1. Personal Details (20%)
  const nameVal = document.getElementById('inputFullName')?.value?.trim();
  const emailVal = document.getElementById('inputEmail')?.value?.trim();
  const mobileVal = document.getElementById('inputMobile')?.value?.trim();
  const bioVal = document.getElementById('inputBio')?.value?.trim();

  if (nameVal && emailVal && mobileVal && isValidEmail(emailVal) && isValidMobile(mobileVal)) {
    score += 15;
  } else {
    missingItems.push({ text: 'Valid Contact Info (Email & 10-digit mobile)', points: '+15%', targetId: 'inputMobile' });
  }

  if (bioVal && bioVal.length >= 30) {
    score += 10;
  } else {
    missingItems.push({ text: 'Professional Bio (at least 30 characters)', points: '+10%', targetId: 'inputBio' });
  }

  // 2. Academic Credentials (20%)
  const collegeVal = document.getElementById('inputCollege')?.value?.trim();
  const degreeVal = document.getElementById('selectDegree')?.value?.trim();
  const deptVal = document.getElementById('selectDepartment')?.value?.trim();
  const gradYearVal = document.getElementById('selectGradYear')?.value?.trim();
  const cgpaVal = document.getElementById('inputCgpa')?.value?.trim();

  if (collegeVal && degreeVal && deptVal && gradYearVal && cgpaVal) {
    score += 20;
  } else {
    missingItems.push({ text: 'Complete Academic Details & CGPA', points: '+20%', targetId: 'inputCollege' });
  }

  // 3. Technical Skills (20%)
  if (activeSkills.length >= 5) {
    score += 20;
  } else if (activeSkills.length >= 3) {
    score += 12;
    missingItems.push({ text: 'Add at least 5 Technical Skills (current: ' + activeSkills.length + ')', points: '+8%', targetId: 'addSkillNameInput' });
  } else {
    missingItems.push({ text: 'Add core technical skills (at least 5)', points: '+20%', targetId: 'addSkillNameInput' });
  }

  // 4. Professional Links (15%)
  const ghVal = document.getElementById('inputGithub')?.value?.trim();
  const liVal = document.getElementById('inputLinkedin')?.value?.trim();
  const portVal = document.getElementById('inputPortfolio')?.value?.trim();

  if (ghVal && isValidUrl(ghVal)) score += 5;
  else missingItems.push({ text: 'Valid GitHub Profile URL', points: '+5%', targetId: 'inputGithub' });

  if (liVal && isValidUrl(liVal)) score += 5;
  else missingItems.push({ text: 'Valid LinkedIn Profile URL', points: '+5%', targetId: 'inputLinkedin' });

  if (portVal && isValidUrl(portVal)) score += 5;
  else missingItems.push({ text: 'Portfolio Website URL', points: '+5%', targetId: 'inputPortfolio' });

  // 5. Resume (15%)
  if (currentProfile.resumeFileName) {
    score += 15;
  } else {
    missingItems.push({ text: 'Upload PDF Resume Document', points: '+15%', targetId: 'resumeFileInput' });
  }

  if (score > 100) score = 100;

  // Update UI Elements
  const bar = document.getElementById('profileProgressBar');
  const percentText = document.getElementById('profilePercentText');
  const tipText = document.getElementById('profileCompletionTip');
  const missingContainer = document.getElementById('missingInfoContainer');

  if (bar) {
    bar.style.width = `${score}%`;
    bar.setAttribute('aria-valuenow', score);
    if (score >= 90) {
      bar.className = 'progress-bar bg-success progress-bar-striped progress-bar-animated';
    } else {
      bar.className = 'progress-bar bg-primary progress-bar-striped progress-bar-animated';
    }
  }

  if (percentText) percentText.textContent = `${score}%`;

  if (tipText) {
    if (score >= 100) {
      tipText.innerHTML = '<span class="text-success fw-bold"><i class="bi bi-patch-check-fill me-1"></i> Outstanding! Your student profile is 100% complete and verified for hiring partners.</span>';
    } else {
      tipText.innerHTML = `Complete the missing items below to boost your candidate match rating to <strong>100%</strong>.`;
    }
  }

  // Render Missing Info List
  if (missingContainer) {
    if (missingItems.length === 0) {
      missingContainer.innerHTML = `
        <div class="alert alert-success border-0 py-2 px-3 small d-flex align-items-center gap-2 mb-0">
          <i class="bi bi-trophy-fill text-success fs-5"></i>
          <div><strong>All Milestones Completed!</strong> Recruiters can now see your full verified technical credentials.</div>
        </div>
      `;
    } else {
      missingContainer.innerHTML = `
        <div class="d-flex flex-wrap gap-2">
          ${missingItems.map(item => `
            <div class="missing-info-item" data-target="${item.targetId}" title="Click to navigate to this field">
              <span><i class="bi bi-exclamation-circle-fill me-1 text-warning"></i>${item.text}</span>
              <span class="badge bg-warning text-dark ms-2">${item.points}</span>
            </div>
          `).join('')}
        </div>
      `;

      // Attach click to focus target
      missingContainer.querySelectorAll('.missing-info-item').forEach(el => {
        el.addEventListener('click', () => {
          const targetId = el.getAttribute('data-target');
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetEl.focus();
            targetEl.classList.add('border-warning');
            setTimeout(() => targetEl.classList.remove('border-warning'), 2000);
          }
        });
      });
    }
  }
}

/* --------------------------------------------------------------------------
   Form Submission, Validation, Cancel & Reset
   -------------------------------------------------------------------------- */
function initFormEventListeners() {
  const form = document.getElementById('studentProfileMasterForm');
  const cancelBtn = document.getElementById('cancelProfileChangesBtn');
  const resetBtn = document.getElementById('resetProfileDefaultsBtn');
  const topSaveBtn = document.getElementById('topSaveProfileBtn');

  // Cancel: discard unsaved edits and restore from localStorage
  if (cancelBtn) {
    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      loadAndRenderProfile();
      showProfileToast('Unsaved changes discarded. Restored last saved profile.', 'info');
    });
  }

  // Reset: restore default demo state
  const handleReset = (e) => {
    e.preventDefault();
    if (confirm('Reset your profile back to the initial SkillBridge demo template (Yazh S)?')) {
      ProfileStore.resetToDefault();
      loadAndRenderProfile();
      showProfileToast('Profile successfully reset to demo defaults (Yazh S).', 'info');
    }
  };

  if (resetBtn) resetBtn.addEventListener('click', handleReset);
  const topResetBtn = document.getElementById('topResetProfileBtn');
  if (topResetBtn) topResetBtn.addEventListener('click', handleReset);

  // Top save trigger
  if (topSaveBtn && form) {
    topSaveBtn.addEventListener('click', () => {
      form.requestSubmit();
    });
  }

  // Form Submit Handler
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Field extraction
      const getVal = (id) => document.getElementById(id)?.value?.trim() || '';

      const fullName = getVal('inputFullName');
      const email = getVal('inputEmail');
      const mobile = getVal('inputMobile');
      const college = getVal('inputCollege');
      const degree = document.getElementById('selectDegree')?.value || '';
      const department = document.getElementById('selectDepartment')?.value || '';
      const graduationYear = document.getElementById('selectGradYear')?.value || '';
      const cgpa = getVal('inputCgpa');
      const githubUrl = getVal('inputGithub');
      const linkedinUrl = getVal('inputLinkedin');
      const portfolioUrl = getVal('inputPortfolio');

      // Validation
      let isValid = true;
      let firstErrorField = null;

      const markField = (id, valid, msg) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (!valid) {
          el.classList.add('is-invalid');
          el.classList.remove('is-valid');
          isValid = false;
          if (!firstErrorField) firstErrorField = el;
        } else {
          el.classList.remove('is-invalid');
          el.classList.add('is-valid');
        }
      };

      // Full Name
      markField('inputFullName', fullName.length >= 3, 'Name must be at least 3 characters.');

      // Email
      markField('inputEmail', isValidEmail(email), 'Please enter a valid email address.');

      // Mobile
      markField('inputMobile', isValidMobile(mobile), 'Please enter a valid 10-digit mobile number.');

      // College
      markField('inputCollege', college.length >= 3, 'Please enter your institution name.');

      // CGPA
      markField('inputCgpa', isValidCgpa(cgpa), 'Please enter a valid CGPA (0.0 to 10.0) or percentage.');

      // URLs (optional if empty, but must be valid format if provided)
      if (githubUrl) markField('inputGithub', isValidUrl(githubUrl), 'Invalid GitHub URL.');
      if (linkedinUrl) markField('inputLinkedin', isValidUrl(linkedinUrl), 'Invalid LinkedIn URL.');
      if (portfolioUrl) markField('inputPortfolio', isValidUrl(portfolioUrl), 'Invalid Portfolio URL.');

      if (!isValid) {
        if (firstErrorField) {
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstErrorField.focus();
        }
        showProfileToast('Please fix the highlighted errors before saving.', 'warning');
        return;
      }

      // Generate updated initials
      const names = fullName.split(' ').filter(Boolean);
      const initials = names.map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'YS';

      const updatedProfile = {
        ...currentProfile,
        fullName: fullName,
        headline: getVal('inputHeadline') || 'Student Candidate',
        email: email,
        mobile: mobile,
        location: getVal('inputLocation'),
        workMode: document.getElementById('selectWorkMode')?.value || 'Hybrid / Remote',
        bio: getVal('inputBio'),
        college: college,
        degree: degree,
        department: department,
        graduationYear: graduationYear,
        semester: getVal('inputSemester'),
        cgpa: cgpa,
        studentRollNo: getVal('inputRollNo'),
        skills: [...activeSkills],
        githubUrl: githubUrl,
        linkedinUrl: linkedinUrl,
        portfolioUrl: portfolioUrl,
        codingProfileUrl: getVal('inputCodingProfile'),
        avatarInitials: initials
      };

      const saved = ProfileStore.saveProfile(updatedProfile);
      if (saved) {
        currentProfile = updatedProfile;
        renderUserAvatars(currentProfile.avatarUrl, currentProfile.avatarInitials);
        renderHeaderDetails(currentProfile);
        updateExternalLinkButtons();
        updateProfileCompletionMeter();

        // Clear is-valid classes after 3 seconds
        setTimeout(() => {
          form.querySelectorAll('.is-valid').forEach(el => el.classList.remove('is-valid'));
        }, 3000);

        showProfileToast('Profile changes saved successfully to your student portal!', 'success');
      } else {
        showProfileToast('Could not save profile to localStorage.', 'warning');
      }
    });
  }

  // Real-time validation clear on input
  form?.querySelectorAll('input, select, textarea').forEach(inp => {
    inp.addEventListener('input', () => {
      inp.classList.remove('is-invalid');
      updateExternalLinkButtons();
      updateProfileCompletionMeter();
    });
  });
}

/* --------------------------------------------------------------------------
   Validation Helpers
   -------------------------------------------------------------------------- */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

function isValidMobile(mobile) {
  // Accepts 10 digits, optionally prefixed with +91 or 0
  const clean = String(mobile).replace(/[\s\-\(\)\+]/g, '');
  if (clean.length === 10 && /^[6-9]\d{9}$/.test(clean)) return true;
  if (clean.length === 12 && clean.startsWith('91') && /^[6-9]\d{9}$/.test(clean.substring(2))) return true;
  return false;
}

function isValidUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

function isValidCgpa(cgpa) {
  if (!cgpa) return true; // optional
  const num = parseFloat(cgpa);
  if (isNaN(num)) return false;
  return (num >= 0 && num <= 10) || (num > 10 && num <= 100);
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

  const closeSidebar = () => {
    if (sidebar) sidebar.classList.remove('show');
    if (backdrop) backdrop.classList.remove('show');
  };

  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (backdrop) backdrop.addEventListener('click', closeSidebar);
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
          localStorage.removeItem('skillbridge_active_session');
        } catch (e) {
          console.warn('Session cleanup exception', e);
        }

        showProfileToast('Logging out... Redirecting to login page.', 'info');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 800);
      }
    });
  });
}

/* --------------------------------------------------------------------------
   Toast Notification Utility
   -------------------------------------------------------------------------- */
function showProfileToast(message, type = 'info') {
  let toastContainer = document.getElementById('profileToastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'profileToastContainer';
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
