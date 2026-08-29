(() => {
  'use strict';

  const STORAGE_KEY = 'sadarin_records_v1';
  const CATEGORIES = ['organic', 'plastic', 'paper', 'residual'];
  const CATEGORY_LABELS = {
    organic: 'Organik',
    plastic: 'Plastik',
    paper: 'Kertas',
    residual: 'Residu'
  };
  const AMOUNT_LABELS = {
    small: 'Sedikit',
    medium: 'Sedang',
    large: 'Banyak'
  };
  const AMOUNT_VOLUME_LITERS = {
    small: 0.5,
    medium: 1.5,
    large: 3
  };
  const WASTE_DENSITY_KG_PER_LITER = {
    organic: 0.45,
    plastic: 0.02,
    paper: 0.19,
    residual: 0.16
  };
  const CARBON_FACTORS_KG_CO2E_PER_KG = {
    organic: 0.55,
    plastic: 0.02,
    paper: 0.08,
    residual: 0.34
  };
  const SADAR_LEVELS = [
    { min: 0, name: 'Langkah Awal' },
    { min: 50, name: 'Mulai Sadar' },
    { min: 100, name: 'Peka Lingkungan' },
    { min: 200, name: 'Penjaga Jejak' },
    { min: 350, name: 'Penggerak Hijau' },
    { min: 500, name: 'Sadar Lestari' }
  ];

  let fallbackIdSequence = 0;
  let toastTimer;

  function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function isFinitePositiveNumber(value) {
    return Number.isFinite(Number(value)) && Number(value) > 0;
  }

  function roundCalculation(value) {
    return Number(Number(value).toFixed(12));
  }

  function isValidRecord(record) {
    if (!record || typeof record !== 'object') return false;
    if (typeof record.id !== 'string' || !record.id) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.dateKey)) return false;
    if (!CATEGORIES.includes(record.category)) return false;
    if (!['estimate', 'exact'].includes(record.measurementMethod)) return false;
    if (record.measurementMethod === 'estimate' && !Object.hasOwn(AMOUNT_VOLUME_LITERS, record.amount)) return false;
    if (!isFinitePositiveNumber(record.weightKg)) return false;
    return true;
  }

  function loadRecords() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isValidRecord) : [];
    } catch (error) {
      return [];
    }
  }

  function saveRecords(records) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      return false;
    }
  }

  function calculateEstimatedWeight(category, amount) {
    if (!Object.hasOwn(WASTE_DENSITY_KG_PER_LITER, category)) return NaN;
    if (!Object.hasOwn(AMOUNT_VOLUME_LITERS, amount)) return NaN;
    return roundCalculation(AMOUNT_VOLUME_LITERS[amount] * WASTE_DENSITY_KG_PER_LITER[category]);
  }

  function calculateCO2e(category, weightKg) {
    if (!Object.hasOwn(CARBON_FACTORS_KG_CO2E_PER_KG, category)) return NaN;
    if (!isFinitePositiveNumber(weightKg)) return NaN;
    return roundCalculation(Number(weightKg) * CARBON_FACTORS_KG_CO2E_PER_KG[category]);
  }

  function getRecordCO2e(record) {
    const calculated = calculateCO2e(record.category, record.weightKg);
    return Number.isFinite(calculated) ? calculated : 0;
  }

  function calculateDailyPoints(uniqueCategoryCount) {
    if (uniqueCategoryCount === 0) return 0;
    return 10 + ((uniqueCategoryCount - 1) * 5);
  }

  function calculateSadarPoints(records) {
    const categoriesByDate = new Map();

    records.forEach((record) => {
      if (!CATEGORIES.includes(record.category) || !record.dateKey) return;
      if (!categoriesByDate.has(record.dateKey)) categoriesByDate.set(record.dateKey, new Set());
      categoriesByDate.get(record.dateKey).add(record.category);
    });

    const dailyPoints = new Map();
    let totalPoints = 0;

    categoriesByDate.forEach((categories, dateKey) => {
      const points = calculateDailyPoints(categories.size);
      dailyPoints.set(dateKey, points);
      totalPoints += points;
    });

    return { totalPoints, dailyPoints, categoriesByDate };
  }

  function getSadarLevel(totalPoints) {
    const safePoints = Math.max(0, Number(totalPoints) || 0);
    let levelIndex = 0;

    SADAR_LEVELS.forEach((level, index) => {
      if (safePoints >= level.min) levelIndex = index;
    });

    return {
      ...SADAR_LEVELS[levelIndex],
      next: SADAR_LEVELS[levelIndex + 1] || null
    };
  }

  function getAchievements(records, totalPoints = calculateSadarPoints(records).totalPoints) {
    const activeDates = new Set(records.map((record) => record.dateKey));
    const historicalCategories = new Set(records.map((record) => record.category));

    return [
      {
        id: 'first-record',
        name: 'Jejak Pertama',
        description: 'Simpan catatan sampah pertamamu.',
        unlocked: records.length >= 1,
        progress: `${Math.min(records.length, 1)} / 1`
      },
      {
        id: 'three-days',
        name: 'Tiga Hari Sadar',
        description: 'Catat jejak pada tiga tanggal yang berbeda.',
        unlocked: activeDates.size >= 3,
        progress: `${Math.min(activeDates.size, 3)} / 3 hari`
      },
      {
        id: 'seven-days',
        name: 'Seminggu Berjejak',
        description: 'Catat jejak pada tujuh tanggal aktif.',
        unlocked: activeDates.size >= 7,
        progress: `${Math.min(activeDates.size, 7)} / 7 hari`
      },
      {
        id: 'four-categories',
        name: 'Kenali Empat Jenis',
        description: 'Kenali Organik, Plastik, Kertas, dan Residu.',
        unlocked: CATEGORIES.every((category) => historicalCategories.has(category)),
        progress: `${CATEGORIES.filter((category) => historicalCategories.has(category)).length} / 4 jenis`
      },
      {
        id: 'hundred-points',
        name: '100 SadarPoint',
        description: 'Kumpulkan 100 SadarPoint dari kategori unik.',
        unlocked: totalPoints >= 100,
        progress: `${Math.min(totalPoints, 100)} / 100 pts`
      }
    ];
  }

  function createRecordId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();

    if (window.crypto?.getRandomValues) {
      const values = window.crypto.getRandomValues(new Uint32Array(4));
      return [...values].map((value) => value.toString(16).padStart(8, '0')).join('-');
    }

    fallbackIdSequence += 1;
    return `sadarin-${Date.now()}-${fallbackIdSequence}`;
  }

  function normalizeRecordInput(input) {
    const category = input.category;
    const measurementMethod = input.measurementMethod;
    const amount = measurementMethod === 'estimate' ? input.amount : null;
    const weightKg = measurementMethod === 'exact'
      ? Number(input.exactWeight)
      : calculateEstimatedWeight(category, amount);

    return {
      category,
      itemName: String(input.itemName || '').trim(),
      amount,
      measurementMethod,
      weightKg,
      co2eKg: calculateCO2e(category, weightKg),
      note: String(input.note || '').trim()
    };
  }

  function createRecord(input, date = new Date()) {
    return {
      id: createRecordId(),
      dateKey: getLocalDateKey(date),
      ...normalizeRecordInput(input),
      createdAt: date.toISOString()
    };
  }

  function updateRecord(records, recordId, input) {
    return records.map((record) => {
      if (record.id !== recordId) return record;
      return {
        ...record,
        ...normalizeRecordInput(input),
        id: record.id,
        dateKey: record.dateKey,
        createdAt: record.createdAt
      };
    });
  }

  function deleteRecord(records, recordId) {
    return records.filter((record) => record.id !== recordId);
  }

  function formatNumber(value, maximumFractionDigits = 3) {
    const safeValue = Number(value) || 0;
    if (safeValue > 0 && safeValue < 0.001) return '<0,001';
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits
    }).format(safeValue);
  }

  function formatDateKey(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: year === new Date().getFullYear() ? undefined : 'numeric'
    }).format(date);
  }

  function setText(selector, value, scope = document) {
    scope.querySelectorAll(selector).forEach((element) => {
      element.textContent = value;
    });
  }

  function setFormFeedback(message, state = '') {
    const feedback = document.querySelector('[data-form-feedback]');
    if (!feedback) return;
    feedback.textContent = message;
    if (state) feedback.dataset.state = state;
    else delete feedback.dataset.state;
  }

  function getFormInput(form) {
    const formData = new FormData(form);
    return {
      recordId: String(formData.get('recordId') || ''),
      category: String(formData.get('category') || ''),
      itemName: String(formData.get('itemName') || ''),
      measurementMethod: String(formData.get('measurementMethod') || 'estimate'),
      amount: String(formData.get('amount') || ''),
      exactWeight: formData.get('exactWeight'),
      note: String(formData.get('note') || '')
    };
  }

  function validateRecordInput(input, form) {
    if (!CATEGORIES.includes(input.category)) {
      setFormFeedback('Pilih satu kategori sampah.', 'error');
      form.querySelector('input[name="category"]')?.focus();
      return false;
    }

    if (input.measurementMethod === 'estimate' && !Object.hasOwn(AMOUNT_VOLUME_LITERS, input.amount)) {
      setFormFeedback('Pilih perkiraan jumlah sampah.', 'error');
      form.querySelector('input[name="amount"]')?.focus();
      return false;
    }

    if (input.measurementMethod === 'exact' && !isFinitePositiveNumber(input.exactWeight)) {
      setFormFeedback('Masukkan berat yang lebih besar dari 0 kg.', 'error');
      form.querySelector('input[name="exactWeight"]')?.focus();
      return false;
    }

    return true;
  }

  function updateMeasurementFields(form) {
    if (!form) return;
    const method = form.querySelector('input[name="measurementMethod"]:checked')?.value || 'estimate';
    const estimateFields = form.querySelector('[data-estimate-fields]');
    const exactFields = form.querySelector('[data-exact-fields]');
    const exactInput = form.querySelector('input[name="exactWeight"]');
    const exactMode = method === 'exact';

    if (estimateFields) estimateFields.hidden = exactMode;
    if (exactFields) exactFields.hidden = !exactMode;
    if (exactInput) exactInput.required = exactMode;
    updateWeightPreview(form);
    updateRecordPreview(form);
  }

  function updateWeightPreview(form) {
    const preview = form?.querySelector('[data-weight-preview]');
    if (!form || !preview) return;

    const input = getFormInput(form);
    if (!CATEGORIES.includes(input.category)) {
      preview.textContent = 'Pilih kategori untuk melihat perkiraan berat.';
      return;
    }

    if (input.measurementMethod === 'exact') {
      preview.textContent = isFinitePositiveNumber(input.exactWeight)
        ? `Berat yang digunakan: ${formatNumber(input.exactWeight)} kg.`
        : 'Masukkan berat sebenarnya dalam kilogram.';
      return;
    }

    const weight = calculateEstimatedWeight(input.category, input.amount);
    preview.textContent = Number.isFinite(weight)
      ? `Perkiraan berat: ±${formatNumber(weight)} kg.`
      : 'Pilih perkiraan jumlah sampah.';
  }

  function updateRecordPreview(form) {
    if (!form || !document.querySelector('[data-preview-category]')) return;

    const input = getFormInput(form);
    const validCategory = CATEGORIES.includes(input.category);
    const exactMode = input.measurementMethod === 'exact';
    const weight = exactMode
      ? Number(input.exactWeight)
      : calculateEstimatedWeight(input.category, input.amount);
    const validWeight = isFinitePositiveNumber(weight);
    const impact = validCategory && validWeight ? calculateCO2e(input.category, weight) : NaN;
    const iconNames = { organic: 'organic', plastic: 'plastic', paper: 'paper', residual: 'residue' };

    setText('[data-preview-category]', validCategory ? CATEGORY_LABELS[input.category] : 'Kategori belum dipilih');
    setText('[data-preview-name]', input.itemName.trim() || (validCategory ? CATEGORY_LABELS[input.category] : 'Catatan barumu'));
    setText('[data-preview-method]', exactMode ? 'Berat pasti' : 'Perkiraan');
    setText('[data-preview-weight]', validWeight ? `${exactMode ? '' : '±'}${formatNumber(weight)} kg` : '—');
    setText('[data-preview-impact]', Number.isFinite(impact) ? `${formatNumber(impact)} kg CO₂e` : '—');
    setText('[data-preview-note]', input.note.trim() || 'Catatan opsionalmu akan tampil di sini.');

    const iconUse = document.querySelector('[data-preview-icon] use');
    if (iconUse) iconUse.setAttribute('href', `#icon-${iconNames[input.category] || 'organic'}`);

    const status = document.querySelector('[data-preview-status]');
    if (status) {
      const ready = validCategory && validWeight;
      status.textContent = ready ? 'Siap disimpan' : 'Belum lengkap';
      status.classList.toggle('is-ready', ready);
    }
  }

  function resetRecordForm(form) {
    if (!form) return;
    form.reset();
    form.elements.recordId.value = '';
    const submitButton = form.querySelector('[data-submit-record]');
    const cancelButton = form.querySelector('[data-cancel-edit]');
    if (submitButton) submitButton.textContent = 'Simpan jejak';
    if (cancelButton) cancelButton.hidden = true;
    updateMeasurementFields(form);
  }

  function populateRecordForm(record) {
    const form = document.querySelector('[data-sadarin-form]');
    if (!form) return;

    form.elements.recordId.value = record.id;
    form.elements.itemName.value = record.itemName || '';
    form.elements.note.value = record.note || '';
    const categoryInput = form.querySelector(`input[name="category"][value="${record.category}"]`);
    const methodInput = form.querySelector(`input[name="measurementMethod"][value="${record.measurementMethod}"]`);
    if (categoryInput) categoryInput.checked = true;
    if (methodInput) methodInput.checked = true;

    if (record.measurementMethod === 'estimate') {
      const amountInput = form.querySelector(`input[name="amount"][value="${record.amount}"]`);
      if (amountInput) amountInput.checked = true;
      form.elements.exactWeight.value = '';
    } else {
      form.elements.exactWeight.value = record.weightKg;
    }

    form.querySelector('[data-submit-record]').textContent = 'Simpan perubahan';
    form.querySelector('[data-cancel-edit]').hidden = false;
    setFormFeedback('Kamu sedang memperbaiki catatan yang sudah tersimpan.');
    updateMeasurementFields(form);
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function makeRecordElement(record) {
    const row = document.createElement('tr');
    row.className = 'sadarin-record';

    const item = document.createElement('td');
    item.className = 'sadarin-record__item';
    item.dataset.label = 'Sampah';
    const title = document.createElement('strong');
    title.textContent = record.itemName || CATEGORY_LABELS[record.category];
    const note = document.createElement('small');
    note.textContent = record.note || 'Tanpa catatan tambahan';
    item.append(title, note);

    const categoryCell = document.createElement('td');
    categoryCell.dataset.label = 'Kategori';
    const category = document.createElement('span');
    category.className = `sadarin-record__category sadarin-record__category--${record.category}`;
    category.textContent = CATEGORY_LABELS[record.category];
    categoryCell.append(category);

    const amount = document.createElement('td');
    amount.dataset.label = 'Jumlah';
    const weightPrefix = record.measurementMethod === 'estimate' ? '±' : '';
    const amountCopy = record.measurementMethod === 'estimate' ? AMOUNT_LABELS[record.amount] : 'Berat pasti';
    amount.textContent = `${weightPrefix}${formatNumber(record.weightKg)} kg · ${amountCopy}`;

    const impact = document.createElement('td');
    impact.dataset.label = 'Dampak';
    impact.textContent = `${formatNumber(getRecordCO2e(record))} kg CO₂e`;

    const dateCell = document.createElement('td');
    dateCell.dataset.label = 'Tanggal';
    const date = document.createElement('time');
    date.dateTime = record.dateKey;
    date.textContent = formatDateKey(record.dateKey);
    dateCell.append(date);

    const actions = document.createElement('td');
    actions.className = 'sadarin-record__actions';
    actions.dataset.label = 'Aksi';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.dataset.editRecord = record.id;
    editButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16-.7 4.7L8 20l10.5-10.5-4-4zM12.8 7.2l4 4"/></svg><span>Edit</span>';
    editButton.setAttribute('aria-label', `Edit catatan ${title.textContent}`);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.dataset.deleteRecord = record.id;
    deleteButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/></svg><span>Hapus</span>';
    deleteButton.setAttribute('aria-label', `Hapus catatan ${title.textContent}`);

    actions.append(editButton, deleteButton);
    row.append(item, categoryCell, amount, impact, dateCell, actions);
    return row;
  }

  function renderJejak(records) {
    const list = document.querySelector('[data-record-list]');
    const empty = document.querySelector('[data-record-empty]');
    if (!list || !empty) return;

    const todayKey = getLocalDateKey();
    const searchValue = document.querySelector('[data-record-search]')?.value.trim().toLocaleLowerCase('id-ID') || '';
    const categoryFilter = document.querySelector('[data-record-filter]')?.value || 'all';
    const filteredRecords = records.filter((record) => {
      const matchesCategory = categoryFilter === 'all' || record.category === categoryFilter;
      const searchableText = `${record.itemName || ''} ${record.note || ''} ${CATEGORY_LABELS[record.category]}`.toLocaleLowerCase('id-ID');
      return matchesCategory && (!searchValue || searchableText.includes(searchValue));
    });
    const sortedRecords = [...filteredRecords].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const noResults = document.querySelector('[data-record-no-results]');

    list.replaceChildren(...sortedRecords.map(makeRecordElement));
    list.hidden = sortedRecords.length === 0;
    empty.hidden = records.length > 0;
    if (noResults) noResults.hidden = records.length === 0 || sortedRecords.length > 0;

    const todayCount = records.filter((record) => record.dateKey === todayKey).length;
    const totalWeight = records.reduce((total, record) => total + Number(record.weightKg || 0), 0);
    setText('[data-record-count]', `${records.length} jejak · ${todayCount} hari ini`);
    setText('[data-history-summary]', todayCount ? `${todayCount} catatan dibuat hari ini` : 'Belum ada catatan hari ini');
    setText('[data-overview-today]', todayCount);
    setText('[data-overview-total]', records.length);
    setText('[data-overview-weight]', formatNumber(totalWeight));
    setText('[data-today-label]', new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date()));
  }

  function renderBumiMeter(records) {
    const todayKey = getLocalDateKey();
    const todayRecords = records.filter((record) => record.dateKey === todayKey);
    const todayCO2e = todayRecords.reduce((total, record) => total + getRecordCO2e(record), 0);
    const lifetimeCO2e = records.reduce((total, record) => total + getRecordCO2e(record), 0);

    setText('[data-co2-today]', formatNumber(todayCO2e));
    setText('[data-co2-lifetime]', formatNumber(lifetimeCO2e));
    setText('[data-bumi-state]', todayRecords.length
      ? `Perkiraan dari ${todayRecords.length} jejak hari ini.`
      : 'Belum ada jejak hari ini. Catat melalui Jejak Hijau.');

    const emptyLink = document.querySelector('[data-bumi-empty-link]');
    if (emptyLink) emptyLink.hidden = todayRecords.length > 0;

    const breakdown = document.querySelector('[data-co2-breakdown]');
    if (!breakdown) return;

    const items = CATEGORIES.map((categoryName) => {
      const total = records
        .filter((record) => record.category === categoryName)
        .reduce((sum, record) => sum + getRecordCO2e(record), 0);
      const item = document.createElement('li');
      const label = document.createElement('span');
      const value = document.createElement('strong');
      label.textContent = CATEGORY_LABELS[categoryName];
      value.textContent = `${formatNumber(total)} kg CO₂e`;
      item.append(label, value);
      return item;
    });

    breakdown.replaceChildren(...items);
  }

  function makeAchievementElement(achievement) {
    const item = document.createElement('li');
    item.className = 'sadarin-achievement';
    item.classList.toggle('is-complete', achievement.unlocked);

    const mark = document.createElement('span');
    mark.className = 'sadarin-achievement__mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = achievement.unlocked ? '✓' : '○';

    const copy = document.createElement('div');
    const name = document.createElement('strong');
    const description = document.createElement('p');
    name.textContent = achievement.name;
    description.textContent = achievement.description;
    copy.append(name, description);

    const progress = document.createElement('span');
    progress.className = 'sadarin-achievement__progress';
    progress.textContent = achievement.progress;

    item.append(mark, copy, progress);
    return item;
  }

  function renderSadarPoint(records) {
    const scoring = calculateSadarPoints(records);
    const todayPoints = scoring.dailyPoints.get(getLocalDateKey()) || 0;
    const level = getSadarLevel(scoring.totalPoints);
    const achievements = getAchievements(records, scoring.totalPoints);

    setText('[data-total-points]', scoring.totalPoints);
    setText('[data-today-points]', todayPoints);
    setText('[data-level-name]', level.name);
    setText('[data-level-next]', level.next
      ? `${level.next.min - scoring.totalPoints} point menuju ${level.next.name}`
      : 'Level tertinggi telah tercapai.');
    setText('[data-achievement-count]', `${achievements.filter((item) => item.unlocked).length} / ${achievements.length} tercapai`);

    const progress = document.querySelector('[data-level-progress]');
    const progressBar = document.querySelector('[data-level-progress-bar]');
    const progressMaximum = level.next?.min || 500;
    const progressPercentage = level.next
      ? Math.min((scoring.totalPoints / level.next.min) * 100, 100)
      : 100;

    if (progress) {
      progress.setAttribute('aria-valuenow', String(Math.min(scoring.totalPoints, progressMaximum)));
      progress.setAttribute('aria-valuemax', String(progressMaximum));
    }
    if (progressBar) progressBar.style.width = `${progressPercentage}%`;

    const achievementList = document.querySelector('[data-achievement-list]');
    if (achievementList) achievementList.replaceChildren(...achievements.map(makeAchievementElement));
  }

  function ensureFloatingScore() {
    let floatingActions = document.querySelector('.floating-actions');
    let score = document.querySelector('.floating-score');

    if (!floatingActions) {
      floatingActions = document.createElement('div');
      floatingActions.className = 'floating-actions floating-actions--score-only';
      document.body.append(floatingActions);
    }

    if (!score) {
      score = document.createElement('div');
      score.className = 'floating-score';
      score.innerHTML = '<span class="floating-score__mark" aria-hidden="true"></span><span class="floating-score__name">SadarPoint</span><strong class="floating-score__value" data-sadarpoint-value>0</strong><span class="floating-score__unit">pts</span>';
      floatingActions.prepend(score);
    }

    score.setAttribute('role', 'button');
    score.setAttribute('tabindex', '0');
    score.setAttribute('aria-expanded', 'false');
    score.setAttribute('aria-label', 'Buka ringkasan SadarPoint');

    let detail = score.querySelector('.floating-score__detail');
    if (!detail) {
      detail = document.createElement('div');
      detail.className = 'floating-score__detail';
      detail.hidden = true;
      detail.innerHTML = '<span>Level saat ini</span><strong data-floating-level>Langkah Awal</strong><b><span data-floating-total>0</span> SadarPoint</b><div class="floating-score__progress"><span data-floating-progress></span></div><p data-floating-next>50 point menuju Mulai Sadar</p><small data-floating-achievement>Belum ada pencapaian.</small>';
      score.append(detail);
    }

    function setExpanded(expanded) {
      score.setAttribute('aria-expanded', String(expanded));
      score.setAttribute('aria-label', expanded ? 'Tutup ringkasan SadarPoint' : 'Buka ringkasan SadarPoint');
      detail.hidden = !expanded;
    }

    score.addEventListener('click', (event) => {
      if (event.target.closest('.floating-score__detail')) return;
      setExpanded(score.getAttribute('aria-expanded') !== 'true');
    });

    score.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setExpanded(score.getAttribute('aria-expanded') !== 'true');
      } else if (event.key === 'Escape') {
        setExpanded(false);
      }
    });

    document.addEventListener('click', (event) => {
      if (!score.contains(event.target)) setExpanded(false);
    });
  }

  function updateFloatingScore(records) {
    const scoring = calculateSadarPoints(records);
    const level = getSadarLevel(scoring.totalPoints);
    const achievements = getAchievements(records, scoring.totalPoints);
    const latestAchievement = [...achievements].reverse().find((item) => item.unlocked);
    const progressPercentage = level.next
      ? Math.min((scoring.totalPoints / level.next.min) * 100, 100)
      : 100;

    setText('[data-sadarpoint-value]', scoring.totalPoints);
    setText('[data-floating-level]', level.name);
    setText('[data-floating-total]', scoring.totalPoints);
    setText('[data-floating-next]', level.next
      ? `${level.next.min - scoring.totalPoints} point menuju ${level.next.name}`
      : 'Level tertinggi telah tercapai.');
    setText('[data-floating-achievement]', latestAchievement
      ? `Pencapaian: ${latestAchievement.name}`
      : 'Belum ada pencapaian.');

    document.querySelectorAll('[data-floating-progress]').forEach((bar) => {
      bar.style.width = `${progressPercentage}%`;
    });
  }

  function refreshSadarinUI() {
    const records = loadRecords();
    renderJejak(records);
    renderBumiMeter(records);
    renderSadarPoint(records);
    updateFloatingScore(records);
    return records;
  }

  function showToast(message) {
    const toast = document.querySelector('[data-sadarin-toast]');
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    window.requestAnimationFrame(() => toast.classList.add('is-visible'));
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
      window.setTimeout(() => { toast.hidden = true; }, 220);
    }, 3800);
  }

  function bindRecordForm() {
    const form = document.querySelector('[data-sadarin-form]');
    if (!form) return;
    let isSubmitting = false;

    form.addEventListener('change', () => {
      setFormFeedback('');
      updateMeasurementFields(form);
    });
    form.addEventListener('input', () => {
      updateWeightPreview(form);
      updateRecordPreview(form);
    });

    form.querySelector('[data-cancel-edit]')?.addEventListener('click', () => {
      resetRecordForm(form);
      setFormFeedback('Perubahan dibatalkan.');
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (isSubmitting) return;

      const input = getFormInput(form);
      if (!validateRecordInput(input, form)) return;

      isSubmitting = true;
      const submitButton = form.querySelector('[data-submit-record]');
      if (submitButton) submitButton.disabled = true;

      const previousRecords = loadRecords();
      const previousScoring = calculateSadarPoints(previousRecords);
      const previousUnlocked = new Set(
        getAchievements(previousRecords, previousScoring.totalPoints)
          .filter((achievement) => achievement.unlocked)
          .map((achievement) => achievement.id)
      );
      const isEditing = Boolean(input.recordId);
      const nextRecords = isEditing
        ? updateRecord(previousRecords, input.recordId, input)
        : [...previousRecords, createRecord(input)];

      if (!saveRecords(nextRecords)) {
        setFormFeedback('Jejak belum dapat disimpan. Periksa penyimpanan browser lalu coba lagi.', 'error');
        isSubmitting = false;
        if (submitButton) submitButton.disabled = false;
        return;
      }

      const nextScoring = calculateSadarPoints(nextRecords);
      const newlyUnlocked = getAchievements(nextRecords, nextScoring.totalPoints)
        .filter((achievement) => achievement.unlocked && !previousUnlocked.has(achievement.id));

      refreshSadarinUI();
      resetRecordForm(form);

      if (isEditing) {
        setFormFeedback('Perubahan tersimpan. Semua ringkasan sudah dihitung ulang.', 'success');
      } else {
        setFormFeedback('Jejak tersimpan. Riwayatmu sudah diperbarui.', 'success');
      }

      if (newlyUnlocked.length && !document.body.classList.contains('feature-page--journal')) {
        showToast(`Pencapaian baru — ${newlyUnlocked.map((achievement) => achievement.name).join(', ')}`);
      }

      window.setTimeout(() => {
        isSubmitting = false;
        if (submitButton) submitButton.disabled = false;
      }, 350);
    });

    updateMeasurementFields(form);
  }

  function bindRecordActions() {
    const list = document.querySelector('[data-record-list]');
    if (!list) return;
    const dialog = document.querySelector('[data-delete-dialog]');
    let pendingDeleteId = '';

    function removeRecord(recordId) {
      const records = loadRecords();
      const record = records.find((item) => item.id === recordId);
      if (!record) return;

      const nextRecords = deleteRecord(records, record.id);
      if (!saveRecords(nextRecords)) {
        showToast('Jejak belum dapat dihapus. Coba lagi.');
        return;
      }

      const form = document.querySelector('[data-sadarin-form]');
      if (form?.elements.recordId.value === record.id) resetRecordForm(form);
      refreshSadarinUI();
      showToast('Jejak dihapus. Ringkasan sudah diperbarui.');
    }

    dialog?.addEventListener('close', () => {
      if (dialog.returnValue === 'confirm' && pendingDeleteId) removeRecord(pendingDeleteId);
      pendingDeleteId = '';
    });

    list.addEventListener('click', (event) => {
      const editButton = event.target.closest('[data-edit-record]');
      const deleteButton = event.target.closest('[data-delete-record]');

      if (editButton) {
        const record = loadRecords().find((item) => item.id === editButton.dataset.editRecord);
        if (record) populateRecordForm(record);
        return;
      }

      if (!deleteButton) return;
      const records = loadRecords();
      const record = records.find((item) => item.id === deleteButton.dataset.deleteRecord);
      if (!record) return;

      pendingDeleteId = record.id;
      setText('[data-delete-dialog-copy]', `${record.itemName || CATEGORY_LABELS[record.category]} akan dihapus dan ringkasan dihitung ulang.`);
      if (dialog?.showModal) dialog.showModal();
      else if (window.confirm(`Hapus jejak ${record.itemName || CATEGORY_LABELS[record.category]}?`)) removeRecord(record.id);
    });
  }

  function bindRecordFilters() {
    const search = document.querySelector('[data-record-search]');
    const filter = document.querySelector('[data-record-filter]');
    const refresh = () => renderJejak(loadRecords());
    search?.addEventListener('input', refresh);
    filter?.addEventListener('change', refresh);
  }

  function init() {
    ensureFloatingScore();
    bindRecordForm();
    bindRecordActions();
    bindRecordFilters();
    refreshSadarinUI();
  }

  window.Sadarin = Object.freeze({
    STORAGE_KEY,
    AMOUNT_VOLUME_LITERS,
    WASTE_DENSITY_KG_PER_LITER,
    CARBON_FACTORS_KG_CO2E_PER_KG,
    getLocalDateKey,
    loadRecords,
    saveRecords,
    calculateEstimatedWeight,
    calculateCO2e,
    calculateSadarPoints,
    getSadarLevel,
    getAchievements,
    createRecord,
    updateRecord,
    deleteRecord,
    refreshSadarinUI
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
