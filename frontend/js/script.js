/**
 * SkillBridge - Core Interactive JavaScript
 * Handles dynamic interactions, search filtering, modals, counter animations, and demo toasts.
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbarScroll();
  initAudienceTabs();
  initCategoryFilter();
  initStatsCounter();
  initInternshipModal();
  initHeroSearch();
  initPopularSearchTags();
  initNewsletterForm();
});

/* --------------------------------------------------------------------------
   1. Navbar Scroll Effect
   -------------------------------------------------------------------------- */
function initNavbarScroll() {
  const navbar = document.querySelector('.custom-navbar');
  if (!navbar) return;

  const handleScroll = () => {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/* --------------------------------------------------------------------------
   2. Audience Tabs ("For Students" vs "For Recruiters")
   -------------------------------------------------------------------------- */
function initAudienceTabs() {
  const tabButtons = document.querySelectorAll('.audience-tab-btn');
  const panes = document.querySelectorAll('.audience-pane');

  if (!tabButtons.length || !panes.length) return;

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetAudience = btn.getAttribute('data-audience');

      // Update button state
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update panes
      panes.forEach(pane => {
        if (pane.id === `pane-${targetAudience}`) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });
    });
  });
}

/* --------------------------------------------------------------------------
   3. Featured Internship Category Filtering
   -------------------------------------------------------------------------- */
function initCategoryFilter() {
  const filterBtns = document.querySelectorAll('.category-filter-btn');
  const internshipCards = document.querySelectorAll('.internship-grid-item');
  const emptyState = document.getElementById('no-internships-found');

  if (!filterBtns.length || !internshipCards.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const selectedCategory = btn.getAttribute('data-category');
      let visibleCount = 0;

      internshipCards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        if (selectedCategory === 'all' || cardCategory === selectedCategory) {
          card.style.display = 'block';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });

      if (emptyState) {
        emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
      }
    });
  });
}

/* --------------------------------------------------------------------------
   4. Hero Search Interaction (Sample Data Filtering)
   -------------------------------------------------------------------------- */
function initHeroSearch() {
  const heroSearchBtn = document.getElementById('hero-search-btn');
  const keywordInput = document.getElementById('hero-search-keyword');
  const categorySelect = document.getElementById('hero-search-category');
  const emptyState = document.getElementById('no-internships-found');
  const filterBtns = document.querySelectorAll('.category-filter-btn');

  if (!heroSearchBtn) return;

  const performSearch = () => {
    const keyword = (keywordInput?.value || '').trim().toLowerCase();
    const category = categorySelect?.value || 'all';

    const targetSection = document.getElementById('explore-internships');
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth' });

      // Match category button
      filterBtns.forEach(b => {
        if (b.getAttribute('data-category') === category) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      // Filter cards
      const cards = document.querySelectorAll('.internship-grid-item');
      let matchedCount = 0;

      cards.forEach(card => {
        const cardCategory = card.getAttribute('data-category') || '';
        const title = (card.querySelector('.internship-card')?.getAttribute('data-title') || '').toLowerCase();
        const skills = (card.querySelector('.internship-card')?.getAttribute('data-skills') || '').toLowerCase();
        const cardText = card.textContent.toLowerCase();

        const matchesCategory = (category === 'all' || cardCategory === category);
        const matchesKeyword = !keyword || title.includes(keyword) || skills.includes(keyword) || cardText.includes(keyword);

        if (matchesCategory && matchesKeyword) {
          card.style.display = 'block';
          matchedCount++;
        } else {
          card.style.display = 'none';
        }
      });

      if (emptyState) {
        emptyState.style.display = matchedCount === 0 ? 'block' : 'none';
      }

      if (keyword) {
        showToast(`Found ${matchedCount} demo internship(s) matching "${keyword}"`, 'bi-search', 'info');
      } else {
        showToast(`Showing ${matchedCount} demo internship(s)`, 'bi-check-circle', 'info');
      }
    }
  };

  heroSearchBtn.addEventListener('click', (e) => {
    e.preventDefault();
    performSearch();
  });

  // Allow pressing Enter inside keyword input
  keywordInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch();
    }
  });

  // Reset filters handler
  const resetBtn = document.getElementById('reset-filters-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (keywordInput) keywordInput.value = '';
      if (categorySelect) categorySelect.value = 'all';
      const allBtn = document.querySelector('.category-filter-btn[data-category="all"]');
      if (allBtn) allBtn.click();
    });
  }
}

/* --------------------------------------------------------------------------
   5. Popular Search Tags Click Handler
   -------------------------------------------------------------------------- */
function initPopularSearchTags() {
  const popularTags = document.querySelectorAll('.popular-tag-item');
  const keywordInput = document.getElementById('hero-search-keyword');
  const heroSearchBtn = document.getElementById('hero-search-btn');

  if (!popularTags.length || !keywordInput || !heroSearchBtn) return;

  popularTags.forEach(tag => {
    tag.addEventListener('click', (e) => {
      e.preventDefault();
      const tagText = tag.getAttribute('data-query') || tag.textContent.replace('#', '').trim();
      keywordInput.value = tagText;
      heroSearchBtn.click();
    });
  });
}

/* --------------------------------------------------------------------------
   6. Interactive Quick View / Apply Modal (INR & Demo Labels)
   -------------------------------------------------------------------------- */
function initInternshipModal() {
  const modalElement = document.getElementById('internshipPreviewModal');
  if (!modalElement) return;

  const viewButtons = document.querySelectorAll('.btn-view-details');
  const modalTitle = document.getElementById('modalInternshipTitle');
  const modalCompany = document.getElementById('modalInternshipCompany');
  const modalLocation = document.getElementById('modalInternshipLocation');
  const modalStipend = document.getElementById('modalInternshipStipend');
  const modalMatch = document.getElementById('modalInternshipMatch');
  const modalDesc = document.getElementById('modalInternshipDesc');
  const modalSkillsContainer = document.getElementById('modalInternshipSkills');
  const quickApplyBtn = document.getElementById('modalQuickApplyBtn');

  let currentTitle = '';

  viewButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = btn.closest('.internship-card');
      if (!card) return;

      currentTitle = card.getAttribute('data-title') || 'Java Full Stack Intern';
      const company = card.getAttribute('data-company') || 'TechCorp';
      const location = card.getAttribute('data-location') || 'Remote';
      const stipend = card.getAttribute('data-stipend') || '₹35,000 / month';
      const match = card.getAttribute('data-match') || '95%';
      const desc = card.getAttribute('data-desc') || 'Develop modular applications and services with industry best practices.';
      const skills = (card.getAttribute('data-skills') || 'Java, Spring Boot, MySQL').split(',');

      if (modalTitle) modalTitle.textContent = currentTitle;
      if (modalCompany) modalCompany.textContent = company;
      if (modalLocation) modalLocation.textContent = location;
      if (modalStipend) modalStipend.textContent = stipend;
      if (modalMatch) modalMatch.textContent = `${match} Fit (Demo AI Match)`;
      if (modalDesc) modalDesc.textContent = desc;

      if (modalSkillsContainer) {
        modalSkillsContainer.innerHTML = '';
        skills.forEach(skill => {
          const span = document.createElement('span');
          span.className = 'skill-tag me-1 mb-1';
          span.textContent = skill.trim();
          modalSkillsContainer.appendChild(span);
        });
      }

      // Initialize Bootstrap modal instance
      const bsModal = bootstrap.Modal.getOrCreateInstance(modalElement);
      bsModal.show();
    });
  });

  if (quickApplyBtn) {
    quickApplyBtn.addEventListener('click', () => {
      const bsModal = bootstrap.Modal.getInstance(modalElement);
      if (bsModal) bsModal.hide();
      showToast(`Demo application submitted for ${currentTitle}! Register or sign in to track live updates.`, 'bi-check-circle-fill', 'success');
    });
  }
}

/* --------------------------------------------------------------------------
   7. Animated Numeric Counters (INR and Demo Support)
   -------------------------------------------------------------------------- */
function initStatsCounter() {
  const counterElements = document.querySelectorAll('.stat-number');
  if (!counterElements.length) return;

  let animated = false;

  const animateCounters = () => {
    counterElements.forEach(el => {
      const target = parseFloat(el.getAttribute('data-target')) || 0;
      const prefix = el.getAttribute('data-prefix') || '';
      const suffix = el.getAttribute('data-suffix') || '';
      const duration = 1800;
      const stepTime = 25;
      const steps = duration / stepTime;
      const increment = target / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          el.textContent = `${prefix}${target.toLocaleString()}${suffix}`;
          clearInterval(timer);
        } else {
          el.textContent = `${prefix}${Math.floor(current).toLocaleString()}${suffix}`;
        }
      }, stepTime);
    });
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        animateCounters();
      }
    });
  }, { threshold: 0.25 });

  const statsSection = document.querySelector('.stats-section');
  if (statsSection) observer.observe(statsSection);
}

/* --------------------------------------------------------------------------
   8. Newsletter Subscription Demo
   -------------------------------------------------------------------------- */
function initNewsletterForm() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = form.querySelector('input[type="email"]');
    if (emailInput && emailInput.value.trim()) {
      showToast('Thank you! Demo subscription confirmed for SkillBridge alerts.', 'bi-envelope-check-fill', 'success');
      emailInput.value = '';
    }
  });
}

/* --------------------------------------------------------------------------
   9. Universal Toast Notification Utility
   -------------------------------------------------------------------------- */
function showToast(message, icon = 'bi-info-circle-fill', type = 'info') {
  let toast = document.getElementById('skillbridge-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'skillbridge-toast';
    toast.className = 'custom-toast';
    document.body.appendChild(toast);
  }

  const iconColor = type === 'success' ? '#10b981' : (type === 'error' ? '#f43f5e' : '#6366f1');

  toast.innerHTML = `
    <i class="bi ${icon}" style="color: ${iconColor}; font-size: 1.25rem;"></i>
    <span style="font-size: 0.92rem; font-weight: 500;">${message}</span>
  `;

  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}
