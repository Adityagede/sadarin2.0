document.addEventListener('DOMContentLoaded', () => {
  const siteHeader = document.querySelector('.site-header');
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  const mobilePanel = document.querySelector('.mobile-nav-panel');
  const mobileBackdrop = document.querySelector('.mobile-nav-backdrop');
  const mobileGuide = document.querySelector('.mobile-guide');
  const mobileGuideTrigger = document.querySelector('.mobile-guide-trigger');
  const mobileGuidePanel = document.querySelector('.mobile-guide-panel');
  const desktopGuide = document.querySelector('[data-guide-desktop]');
  const desktopGuideTrigger = desktopGuide?.querySelector('.nav-guide-trigger');
  const desktopGuidePanel = desktopGuide?.querySelector('.guide-mega');
  const desktopMedia = window.matchMedia('(min-width: 1024px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let scrollTicking = false;
  let guideCloseTimer;

  function updateScrollState() {
    siteHeader?.classList.toggle('is-scrolled', window.scrollY > 12);

    scrollTicking = false;
  }

  function requestScrollUpdate() {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(updateScrollState);
  }

  function setDesktopGuide(open) {
    if (!desktopGuide || !desktopGuideTrigger || !desktopGuidePanel) return;
    desktopGuide.classList.toggle('is-open', open);
    desktopGuideTrigger.setAttribute('aria-expanded', String(open));
    desktopGuidePanel.setAttribute('aria-hidden', String(!open));
  }

  function setMobileGuide(open) {
    if (!mobileGuide || !mobileGuideTrigger || !mobileGuidePanel) return;
    mobileGuide.classList.toggle('is-open', open);
    mobileGuideTrigger.setAttribute('aria-expanded', String(open));
    mobileGuidePanel.setAttribute('aria-hidden', String(!open));
  }

  function setScrollbarCompensation(active) {
    const width = window.innerWidth - document.documentElement.clientWidth;
    const value = active && width > 0 ? `${width}px` : '';
    document.body.style.paddingRight = value;
    if (siteHeader) siteHeader.style.paddingRight = value;
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
    window.requestAnimationFrame(() => mobilePanel?.querySelector('a')?.focus());
  }

  function getMobileFocusables() {
    if (!siteHeader) return [];
    return [...siteHeader.querySelectorAll('.menu-toggle, .mobile-nav-panel a, .mobile-nav-panel button')]
      .filter((element) => !element.disabled && element.offsetParent !== null);
  }

  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  updateScrollState();

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
    if (!desktopGuide.contains(event.relatedTarget)) setDesktopGuide(false);
  });

  document.addEventListener('click', (event) => {
    if (desktopGuide && !desktopGuide.contains(event.target)) setDesktopGuide(false);
  });

  menuToggle?.addEventListener('click', () => {
    if (mobileNav?.classList.contains('open')) closeMobileMenu({ returnFocus: true });
    else openMobileMenu();
  });

  mobileBackdrop?.addEventListener('click', () => closeMobileMenu({ returnFocus: true }));
  mobileGuideTrigger?.addEventListener('click', () => setMobileGuide(!mobileGuide?.classList.contains('is-open')));
  mobileNav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMobileMenu()));

  document.addEventListener('keydown', (event) => {
    const mobileIsOpen = mobileNav?.classList.contains('open');

    if (event.key === 'Escape') {
      if (mobileIsOpen) closeMobileMenu({ returnFocus: true });
      else if (desktopGuide?.classList.contains('is-open')) {
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

  desktopMedia.addEventListener('change', () => {
    if (desktopMedia.matches) closeMobileMenu();
    setDesktopGuide(false);
  });

  const revealItems = document.querySelectorAll('[data-guide-reveal]');

  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: .13, rootMargin: '0px 0px -44px' });

    revealItems.forEach((item, index) => {
      item.style.transitionDelay = `${Math.min((index % 4) * 70, 210)}ms`;
      observer.observe(item);
    });
  }
});
