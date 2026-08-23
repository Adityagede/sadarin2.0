document.addEventListener('DOMContentLoaded', () => {
  const siteHeader = document.querySelector('.site-header');
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  const mobilePanel = document.querySelector('.mobile-nav-panel');
  const mobileBackdrop = document.querySelector('.mobile-nav-backdrop');
  const mobileLinks = document.querySelectorAll('.mobile-nav a');
  const mobileGuide = document.querySelector('.mobile-guide');
  const mobileGuideTrigger = document.querySelector('.mobile-guide-trigger');
  const mobileGuidePanel = document.querySelector('.mobile-guide-panel');
  const desktopGuide = document.querySelector('[data-guide-desktop]');
  const desktopGuideTrigger = desktopGuide?.querySelector('.nav-guide-trigger');
  const desktopGuidePanel = desktopGuide?.querySelector('.guide-mega');
  const desktopMedia = window.matchMedia('(min-width: 1024px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* =========================================================
     HEADER SCROLL STATE
  ========================================================= */
  let scrollTicking = false;

  function updateHeaderState() {
    siteHeader?.classList.toggle('is-scrolled', window.scrollY > 12);
    scrollTicking = false;
  }

  function requestHeaderUpdate() {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(updateHeaderState);
  }

  window.addEventListener('scroll', requestHeaderUpdate, { passive: true });
  updateHeaderState();

  /* =========================================================
     PANDUAN SAMPAH — DESKTOP
  ========================================================= */
  let guideCloseTimer;

  function setDesktopGuide(open) {
    if (!desktopGuide || !desktopGuideTrigger || !desktopGuidePanel) return;
    desktopGuide.classList.toggle('is-open', open);
    desktopGuideTrigger.setAttribute('aria-expanded', String(open));
    desktopGuidePanel.setAttribute('aria-hidden', String(!open));
  }

  desktopGuideTrigger?.addEventListener('click', (event) => {
    event.stopPropagation();
    setDesktopGuide(!desktopGuide.classList.contains('is-open'));
  });

  desktopGuide?.addEventListener('mouseenter', () => {
    if (!desktopMedia.matches) return;
    window.clearTimeout(guideCloseTimer);
    setDesktopGuide(true);
  });

  desktopGuide?.addEventListener('mouseleave', () => {
    if (!desktopMedia.matches) return;
    window.clearTimeout(guideCloseTimer);
    guideCloseTimer = window.setTimeout(() => setDesktopGuide(false), 120);
  });

  desktopGuide?.addEventListener('focusout', (event) => {
    if (desktopGuide.contains(event.relatedTarget)) return;
    setDesktopGuide(false);
  });

  desktopGuidePanel?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setDesktopGuide(false));
  });

  document.addEventListener('click', (event) => {
    if (desktopGuide && !desktopGuide.contains(event.target)) setDesktopGuide(false);
  });

  /* =========================================================
     MOBILE NAVIGATION
  ========================================================= */
  function setMobileGuide(open) {
    if (!mobileGuide || !mobileGuideTrigger || !mobileGuidePanel) return;
    mobileGuide.classList.toggle('is-open', open);
    mobileGuideTrigger.setAttribute('aria-expanded', String(open));
    mobileGuidePanel.setAttribute('aria-hidden', String(!open));
  }

  function setScrollbarCompensation(active) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const compensation = active && scrollbarWidth > 0 ? `${scrollbarWidth}px` : '';
    document.body.style.paddingRight = compensation;
    if (siteHeader) siteHeader.style.paddingRight = compensation;
  }

  function getMobileFocusables() {
    if (!siteHeader) return [];
    return [...siteHeader.querySelectorAll(
      '.menu-toggle, .mobile-nav-panel a, .mobile-nav-panel button'
    )].filter((element) => !element.disabled && element.offsetParent !== null);
  }

  function openMobileMenu() {
    if (!siteHeader || !menuToggle || !mobileNav) return;
    setDesktopGuide(false);
    setScrollbarCompensation(true);
    mobileNav.classList.add('open');
    siteHeader.classList.add('is-menu-open');
    document.body.classList.add('menu-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Tutup menu');
    mobileNav.setAttribute('aria-hidden', 'false');
    window.requestAnimationFrame(() => {
      const firstLink = mobilePanel?.querySelector('a');
      firstLink?.focus();
    });
  }

  function closeMobileMenu({ returnFocus = false } = {}) {
    if (!siteHeader || !menuToggle || !mobileNav) return;
    mobileNav.classList.remove('open');
    siteHeader.classList.remove('is-menu-open');
    document.body.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Buka menu');
    mobileNav.setAttribute('aria-hidden', 'true');
    setMobileGuide(false);
    setScrollbarCompensation(false);
    if (returnFocus) menuToggle.focus();
  }

  menuToggle?.addEventListener('click', () => {
    if (mobileNav?.classList.contains('open')) {
      closeMobileMenu({ returnFocus: true });
    } else {
      openMobileMenu();
    }
  });

  mobileBackdrop?.addEventListener('click', () => closeMobileMenu({ returnFocus: true }));
  mobileGuideTrigger?.addEventListener('click', () => {
    setMobileGuide(!mobileGuide?.classList.contains('is-open'));
  });

  mobileLinks.forEach((link) => {
    link.addEventListener('click', () => closeMobileMenu());
  });

  document.addEventListener('keydown', (event) => {
    const mobileIsOpen = mobileNav?.classList.contains('open');

    if (event.key === 'Escape') {
      if (mobileIsOpen) {
        closeMobileMenu({ returnFocus: true });
      } else if (desktopGuide?.classList.contains('is-open')) {
        setDesktopGuide(false);
        desktopGuideTrigger?.focus();
      }
      return;
    }

    if (event.key !== 'Tab' || !mobileIsOpen) return;
    const focusable = getMobileFocusables();
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  function resetNavigationForViewport() {
    if (desktopMedia.matches) closeMobileMenu();
    setDesktopGuide(false);
  }

  desktopMedia.addEventListener('change', resetNavigationForViewport);

  /* =========================================================
     HERO SLIDER
  ========================================================= */
  const heroCurrent = document.querySelector('.hero-current');
  const heroProgress = document.querySelector('.hero-progress span');
  const heroTabs = document.querySelectorAll('.hero-tabs button');

  function updateHero(index) {
    if (heroCurrent) heroCurrent.textContent = String(index + 1).padStart(2, '0');
    if (heroProgress) heroProgress.style.transform = `translateX(${index * 100}%)`;

    heroTabs.forEach((tab, tabIndex) => {
      const isActive = tabIndex === index;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });
  }

  if (typeof Swiper !== 'undefined') {
    const heroSwiper = new Swiper('.hero-swiper', {
      slidesPerView: 1,
      speed: reducedMotion.matches ? 0 : 780,
      loop: true,
      grabCursor: true,
      watchOverflow: true,
      autoplay: reducedMotion.matches ? false : {
        delay: 6000,
        disableOnInteraction: false,
        pauseOnMouseEnter: true
      },
      navigation: {
        nextEl: '.hero-next',
        prevEl: '.hero-prev'
      },
      keyboard: {
        enabled: true,
        onlyInViewport: true
      },
      a11y: {
        enabled: true,
        prevSlideMessage: 'Tampilkan cerita sebelumnya',
        nextSlideMessage: 'Tampilkan cerita berikutnya'
      },
      on: {
        init(swiper) {
          updateHero(swiper.realIndex);
        },
        slideChange(swiper) {
          updateHero(swiper.realIndex);
        }
      }
    });

    heroTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        heroSwiper.slideToLoop(Number(tab.dataset.slide));
      });
    });
  } else {
    updateHero(0);
  }

  /* =========================================================
     FORUM SADARIN SLIDER
  ========================================================= */
  const forumSlider = document.querySelector('.forum-swiper');

  if (forumSlider && typeof Swiper !== 'undefined') {
    const forumPrev = document.querySelector('.forum-prev');
    const forumNext = document.querySelector('.forum-next');

    new Swiper(forumSlider, {
      slidesPerView: 1.11,
      spaceBetween: 16,
      speed: reducedMotion.matches ? 0 : 520,
      loop: false,
      grabCursor: true,
      watchOverflow: true,
      navigation: {
        prevEl: forumPrev,
        nextEl: forumNext
      },
      keyboard: {
        enabled: true,
        onlyInViewport: true
      },
      a11y: {
        enabled: true,
        prevSlideMessage: 'Tampilkan artikel sebelumnya',
        nextSlideMessage: 'Tampilkan artikel berikutnya'
      },
      breakpoints: {
        430: {
          slidesPerView: 1.14,
          spaceBetween: 18
        },
        768: {
          slidesPerView: 2,
          spaceBetween: 24
        },
        1024: {
          slidesPerView: 3,
          spaceBetween: 26
        },
        1280: {
          slidesPerView: 3,
          spaceBetween: 30
        }
      }
    });
  }

  /* =========================================================
     FAQ ACCORDION
  ========================================================= */
  const faqSection = document.querySelector('.faq');

  if (faqSection) {
    const faqItems = [...faqSection.querySelectorAll('.faq-item')];

    function setFaqItem(item, open) {
      const button = item.querySelector('.faq-item__button');
      const answer = item.querySelector('.faq-item__answer');

      item.classList.toggle('is-open', open);
      button?.setAttribute('aria-expanded', String(open));
      answer?.setAttribute('aria-hidden', String(!open));
    }

    faqItems.forEach((item) => {
      const button = item.querySelector('.faq-item__button');
      setFaqItem(item, item.classList.contains('is-open'));

      button?.addEventListener('click', () => {
        const shouldOpen = !item.classList.contains('is-open');
        faqItems.forEach((faqItem) => setFaqItem(faqItem, false));
        if (shouldOpen) setFaqItem(item, true);
      });
    });
  }

  /* =========================================================
     FINAL ACTION REVEAL
  ========================================================= */
  const finalAction = document.querySelector('[data-final-action]');

  if (finalAction && !reducedMotion.matches && 'IntersectionObserver' in window) {
    finalAction.classList.add('is-motion-ready');

    const finalActionObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, {
      threshold: .18,
      rootMargin: '0px 0px -24px 0px'
    });

    finalActionObserver.observe(finalAction);
  } else {
    finalAction?.classList.add('is-visible');
  }

  /* =========================================================
     SECTION REVEALS
  ========================================================= */
  const revealItems = document.querySelectorAll('.waste-reality [data-reveal]');

  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else if (revealItems.length) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, {
      threshold: .14,
      rootMargin: '0px 0px -36px 0px'
    });

    revealItems.forEach((item, index) => {
      item.style.transitionDelay = `${Math.min(index * 45, 180)}ms`;
      revealObserver.observe(item);
    });
  }
});
