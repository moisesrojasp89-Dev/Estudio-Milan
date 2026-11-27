import { CATALOG_ITEMS } from '../data.js';
import { SITE_CONFIG } from '../config.js';

let activeItems = [...CATALOG_ITEMS];
let activeFilter = CATALOG_ITEMS[0] ? CATALOG_ITEMS[0].category : '';
let selectedId = CATALOG_ITEMS[0] ? CATALOG_ITEMS[0].id : '';

function formatUsd(amount) {
  const rounded = Math.round(Number(amount) || 0);
  return '$' + rounded.toLocaleString('en-US');
}

function buildWaLink(message, origin) {
  const phone = String(SITE_CONFIG.WA_NUMBER || '').replace(/[^0-9]/g, '');
  const full = origin ? message + '\n[Ref: ' + origin + ']' : message;
  return 'https://wa.me/' + encodeURIComponent(phone) + '?text=' + encodeURIComponent(full);
}

function isMobileViewport() {
  return Boolean(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
}

function selectStageWork(item) {
  if (!item) return;
  selectedId = item.id;
  const stage = document.querySelector('.atelier-stage');
  const stageImg = document.getElementById('atelier-stage-img');
  const stageNum = document.getElementById('atelier-stage-num');
  const stageTitle = document.getElementById('atelier-stage-title');
  const stageMeta = document.getElementById('atelier-stage-meta');
  const stageHit = document.getElementById('atelier-stage-hit');
  const stageOpen = document.getElementById('atelier-stage-open');
  const grid = document.getElementById('catalog-grid');

  if (grid) {
    grid.querySelectorAll('.atelier-folio-item').forEach((row) => {
      row.classList.toggle('is-selected', row.getAttribute('data-id') === item.id);
    });
  }

  const visibleList = activeItems.filter((entry) => !activeFilter || entry.category === activeFilter);
  const pos = Math.max(0, visibleList.findIndex((entry) => entry.id === item.id));
  const numText = String(pos + 1).padStart(2, '0') + ' / ' + String(Math.max(1, visibleList.length)).padStart(2, '0');
  const zone = item.brand || item.category;
  const specs = item.badge || item.category;

  const updateStageDom = () => {
    if (stageImg) {
      stageImg.setAttribute('src', item.imageUrl || 'assets/hero-showcase.svg');
      stageImg.setAttribute('alt', item.name + ' — ' + SITE_CONFIG.BUSINESS_NAME);
    }
    if (stageNum) stageNum.textContent = numText;
    if (stageTitle) stageTitle.textContent = item.name || '';
    if (stageMeta) stageMeta.textContent = zone + ' · ' + specs + ' · ' + formatUsd(item.priceUsd) + ' USD';
    if (stageHit) {
      stageHit.setAttribute('data-open-dossier', item.id);
      stageHit.setAttribute('aria-label', 'Abrir expediente de ' + item.name);
    }
    if (stageOpen) stageOpen.setAttribute('data-open-dossier', item.id);
  };

  const reduced = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (stage && !reduced) {
    stage.classList.add('is-fading');
    setTimeout(() => {
      updateStageDom();
      stage.classList.remove('is-fading');
    }, 110);
  } else {
    updateStageDom();
  }
}

function resolveDefaultCategory() {
  const filtersRoot = document.getElementById('atelier-filters');
  const activeBtn = filtersRoot
    ? filtersRoot.querySelector('[data-atelier-filter].is-active') || filtersRoot.querySelector('[data-atelier-filter]')
    : null;
  if (activeBtn) {
    const val = activeBtn.getAttribute('data-atelier-filter');
    if (val) return val;
  }
  return activeItems[0] ? activeItems[0].category : '';
}

function applyPortfolioFilter(category) {
  const fallbackCat = resolveDefaultCategory();
  const nextCat = category || fallbackCat;
  const hasMatch = activeItems.some((entry) => entry.category === nextCat);
  activeFilter = hasMatch ? nextCat : fallbackCat;
  const filtersRoot = document.getElementById('atelier-filters');
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;

  const update = () => {
    if (filtersRoot) {
      filtersRoot.querySelectorAll('[data-atelier-filter]').forEach((btn) => {
        const isMatch = (btn.getAttribute('data-atelier-filter') || '') === activeFilter;
        btn.classList.toggle('is-active', isMatch);
        btn.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
      });
    }
    let visibleCount = 0;
    let firstVisibleId = '';
    grid.querySelectorAll('.atelier-folio-item').forEach((row) => {
      const rowCat = row.getAttribute('data-category') || '';
      const hide = Boolean(activeFilter) && rowCat !== activeFilter;
      row.hidden = hide;
      if (!hide) {
        visibleCount += 1;
        const numNode = row.querySelector('.atelier-index-num');
        if (numNode) numNode.textContent = String(visibleCount).padStart(2, '0');
        if (!firstVisibleId) firstVisibleId = row.getAttribute('data-id') || '';
      }
    });
    grid.classList.toggle('is-single', visibleCount <= 1);
    const railArrows = document.getElementById('atelier-rail-arrows');
    if (railArrows) railArrows.hidden = visibleCount <= 1;
    const railCount = document.getElementById('atelier-rail-count');
    if (railCount) {
      railCount.textContent = visibleCount <= 1 ? visibleCount + ' obra' : visibleCount + ' obras · Desliza →';
    }
    if (firstVisibleId) {
      const nextItem = activeItems.find((entry) => entry.id === firstVisibleId);
      if (nextItem) selectStageWork(nextItem);
    }
    if (typeof grid.scrollTo === 'function') {
      grid.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  const reduced = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (!reduced && typeof document.startViewTransition === 'function') {
    document.startViewTransition(update);
  } else {
    update();
  }
}

function openProjectDossier(item) {
  const dialog = document.getElementById('atelier-dossier-dialog');
  if (!dialog || !item) return;

  const img = document.getElementById('dossier-img');
  const zone = document.getElementById('dossier-zone');
  const title = document.getElementById('dossier-title');
  const desc = document.getElementById('dossier-desc');
  const specs = document.getElementById('dossier-specs-val');
  const price = document.getElementById('dossier-price-val');
  const chips = document.getElementById('dossier-materials');
  const waCta = document.getElementById('dossier-wa-cta');

  if (img) {
    img.setAttribute('src', item.imageUrl || 'assets/hero-showcase.svg');
    img.setAttribute('alt', item.name + ' — ' + SITE_CONFIG.BUSINESS_NAME);
  }
  if (zone) {
    zone.textContent = item.brand ? item.category + ' · ' + item.brand : item.category;
  }
  if (title) title.textContent = item.name || '';
  if (desc) desc.textContent = item.description || '';
  if (specs) specs.textContent = item.badge || 'Proyecto a medida';
  if (price) price.textContent = formatUsd(item.priceUsd) + ' USD';

  if (chips) {
    chips.textContent = '';
    const materials = Array.isArray(item.variants) && item.variants.length > 0
      ? item.variants
      : ['Travertino Romano', 'Nogal Aceitado', 'Iluminación 2700 K'];
    materials.forEach((mat) => {
      const chip = document.createElement('span');
      chip.className = 'atelier-dossier-chip';
      chip.textContent = String(mat);
      chips.appendChild(chip);
    });
  }

  if (waCta) {
    const msg =
      'Hola ' +
      SITE_CONFIG.BUSINESS_NAME +
      ', me interesa un proyecto similar a "' +
      item.name +
      '" (Ref. ' +
      formatUsd(item.priceUsd) +
      ' USD). ¿Podemos agendar una visita técnica?';
    waCta.setAttribute('href', buildWaLink(msg, 'expediente-' + item.id));
  }

  if (!dialog.open && typeof dialog.showModal === 'function') {
    dialog.showModal();
  }
}

function bindDossierDialog() {
  const dialog = document.getElementById('atelier-dossier-dialog');
  if (!dialog || dialog.dataset.bound === 'true') return;
  dialog.dataset.bound = 'true';

  const closeDialog = () => {
    if (dialog.open) dialog.close();
  };

  const closeBtn = document.getElementById('dossier-close-btn');
  const dismissBtn = document.getElementById('dossier-dismiss-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeDialog);
  if (dismissBtn) dismissBtn.addEventListener('click', closeDialog);

  if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const inside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!inside) closeDialog();
    });
  }
}

function bindInvestmentEstimator() {
  const areaInput = document.getElementById('est-area');
  const spaceGroup = document.getElementById('est-space-group');
  const tierGroup = document.getElementById('est-tier-group');
  if (!areaInput || !spaceGroup || !tierGroup || areaInput.dataset.bound === 'true') return;
  areaInput.dataset.bound = 'true';

  let spaceName = 'Departamento';
  let spaceMult = 1;
  let tierName = 'Interiorismo Arquitectónico';
  let tierRate = 340;
  let tierWeeks = '10 – 12 sem';

  const areaVal = document.getElementById('est-area-val');
  const rangeOutput = document.getElementById('est-range-output');
  const weeksOut = document.getElementById('est-weeks');
  const rateOut = document.getElementById('est-rate');
  const waCta = document.getElementById('est-wa-cta');

  const recalc = () => {
    const sqm = Math.max(40, Math.min(450, Number(areaInput.value) || 140));
    const low = Math.round((sqm * tierRate * spaceMult) / 100) * 100;
    const high = Math.round((low * 1.15) / 100) * 100;
    const rangeText = formatUsd(low) + ' – ' + formatUsd(high) + ' USD';

    if (areaVal) areaVal.textContent = sqm + ' m²';
    if (rangeOutput) rangeOutput.textContent = rangeText;
    if (weeksOut) weeksOut.textContent = tierWeeks;
    if (rateOut) rateOut.textContent = formatUsd(Math.round(tierRate * spaceMult)) + ' USD/m²';
    if (waCta) {
      const msg =
        'Hola ' +
        SITE_CONFIG.BUSINESS_NAME +
        ', calculé en su estimador un proyecto de ' +
        spaceName +
        ' (' +
        sqm +
        ' m²) en nivel ' +
        tierName +
        ' (' +
        rangeText +
        '). Quiero agendar una visita técnica.';
      waCta.setAttribute('href', buildWaLink(msg, 'estimador-usd'));
    }
  };

  areaInput.addEventListener('input', recalc);

  spaceGroup.addEventListener('click', (event) => {
    const btn = event.target instanceof Element ? event.target.closest('[data-est-space]') : null;
    if (!btn) return;
    spaceName = btn.getAttribute('data-est-space') || 'Departamento';
    spaceMult = Number(String(btn.getAttribute('data-est-mult') || '1').replace(',', '.')) || 1;
    spaceGroup.querySelectorAll('[data-est-space]').forEach((node) => {
      const active = node === btn;
      node.classList.toggle('is-active', active);
      node.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    recalc();
  });

  tierGroup.addEventListener('click', (event) => {
    const btn = event.target instanceof Element ? event.target.closest('[data-est-tier]') : null;
    if (!btn) return;
    tierName = btn.getAttribute('data-est-tier') || 'Interiorismo Arquitectónico';
    tierRate = Number(String(btn.getAttribute('data-est-rate') || '340').replace(',', '.')) || 340;
    tierWeeks = btn.getAttribute('data-est-weeks') || '10 – 12 sem';
    tierGroup.querySelectorAll('[data-est-tier]').forEach((node) => {
      const active = node === btn;
      node.classList.toggle('is-active', active);
      node.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    recalc();
  });

  recalc();
}

export function initAtelierExperience() {
  const filtersRoot = document.getElementById('atelier-filters');
  if (filtersRoot && filtersRoot.dataset.bound !== 'true') {
    filtersRoot.dataset.bound = 'true';
    filtersRoot.addEventListener('click', (event) => {
      const btn = event.target instanceof Element ? event.target.closest('[data-atelier-filter]') : null;
      if (!btn) return;
      applyPortfolioFilter(btn.getAttribute('data-atelier-filter') || resolveDefaultCategory());
    });
  }
  activeFilter = resolveDefaultCategory();

  const grid = document.getElementById('catalog-grid');
  if (grid && grid.dataset.atelierBound !== 'true') {
    grid.dataset.atelierBound = 'true';
    grid.addEventListener('click', (event) => {
      const hit = event.target instanceof Element ? event.target.closest('[data-select-work]') : null;
      if (!hit) return;
      const targetId = hit.getAttribute('data-select-work');
      const found = activeItems.find((entry) => entry.id === targetId);
      if (!found) return;
      if (isMobileViewport() || selectedId === found.id) {
        openProjectDossier(found);
      } else {
        selectStageWork(found);
      }
    });
    grid.addEventListener('mouseover', (event) => {
      if (isMobileViewport()) return;
      const hit = event.target instanceof Element ? event.target.closest('[data-select-work]') : null;
      if (!hit) return;
      const targetId = hit.getAttribute('data-select-work');
      if (!targetId || targetId === selectedId) return;
      const found = activeItems.find((entry) => entry.id === targetId);
      if (found) selectStageWork(found);
    });
  }

  document.querySelectorAll('[data-open-dossier]').forEach((btn) => {
    if (btn.dataset.dossierBound === 'true') return;
    btn.dataset.dossierBound = 'true';
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-open-dossier') || selectedId;
      const found = activeItems.find((entry) => entry.id === targetId) || activeItems[0];
      if (found) openProjectDossier(found);
    });
  });

  document.querySelectorAll('[data-atelier-scroll]').forEach((btn) => {
    if (btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', () => {
      if (!grid || typeof grid.scrollBy !== 'function') return;
      const dir = btn.getAttribute('data-atelier-scroll') === 'prev' ? -1 : 1;
      const step = Math.max(240, Math.round(grid.clientWidth * 0.88));
      grid.scrollBy({ left: dir * step, behavior: 'smooth' });
    });
  });

  bindDossierDialog();
  bindInvestmentEstimator();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initAtelierExperience();
  document.addEventListener('karamel:navigate', initAtelierExperience);
  document.addEventListener('karamel:catalog-updated', (event) => {
    if (event && event.detail && Array.isArray(event.detail.items)) {
      activeItems = event.detail.items;
      applyPortfolioFilter(activeFilter);
    }
  });
}
