document.addEventListener('DOMContentLoaded', () => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
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
});
