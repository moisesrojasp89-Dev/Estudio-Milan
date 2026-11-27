import { CATALOG_ITEMS } from './data.js';
import * as siteConfigMod from './config.js';
import { loadCatalogData, loadSiteSettings } from './data-fetch.js';
import { initSiteShell } from './components/site-shell.js';
import { initThemeToggle } from './components/catalog-ui.js';
import { initCtaTracking } from './components/cta.js';

const SITE_CONFIG = siteConfigMod.SITE_CONFIG;
const V = siteConfigMod.VERTICAL_COPY || { unitPlural: 'servicios' };

export function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function parsePrice(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? raw : 0;
  const cleaned = String(raw ?? '0').replace(/[^0-9,.-]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

export function safeGetStorage(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

let currentCatalog = [...CATALOG_ITEMS];

export function buildWhatsAppUrl(message, origin) {
  const phone = SITE_CONFIG.WA_NUMBER || '';
  const text = origin ? message + '\n[Ref: ' + origin + ']' : message;
  return `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(text)}`;
}

function renderEmptyCatalogState(grid, countNode) {
  if (countNode) countNode.textContent = `0 de 0 ${V.unitPlural}`;
  const emptyWaHref = buildWhatsAppUrl(
    'Hola ' + SITE_CONFIG.BUSINESS_NAME + ', quiero confirmar disponibilidad al instante.',
    'catalogo-vacio'
  );
  grid.innerHTML = `<div class="empty-state">
      <h3 class="shelf-title">Estamos actualizando nuestra oferta</h3>
      <p class="mcard-desc">Estamos actualizando nuestra oferta. Escríbenos directo por WhatsApp para confirmar disponibilidad al instante.</p>
      <a href="${escHtml(emptyWaHref)}" target="_blank" rel="noopener noreferrer" class="btn-primary" data-cta="empty-catalog-whatsapp">Consultar por WhatsApp</a>
    </div>`;
}

export function renderAtelierPortfolio(items, grid) {
  if (!grid) return;
  if (items.length === 0) {
    renderEmptyCatalogState(grid, null);
    return;
  }
  const catCounters = new Map();
  const defaultCat = items[0] ? items[0].category : '';
  grid.innerHTML = items
    .map((item, idx) => {
      const catPos = (catCounters.get(item.category) || 0) + 1;
      catCounters.set(item.category, catPos);
      const num = String(catPos).padStart(2, '0');
      const img = item.imageUrl || 'assets/hero-showcase.svg';
      const zone = item.brand || item.category;
      const specs = item.badge || item.category;
      const price = '$' + Math.round(parsePrice(item.priceUsd)).toLocaleString('en-US') + ' USD';
      const hideAttr = defaultCat && item.category !== defaultCat ? ' hidden' : '';
      return `<article class="atelier-folio-item${idx === 0 ? ' is-selected' : ''}" data-id="${escHtml(item.id)}" data-category="${escHtml(item.category)}" data-index="${idx}"${hideAttr}>
        <button type="button" class="atelier-folio-hit" data-select-work="${escHtml(item.id)}" aria-label="${escHtml(item.name)} — ${escHtml(zone)}"></button>
        <div class="atelier-slide-media">
          <img src="${escHtml(img)}" alt="${escHtml(item.name)}" class="atelier-slide-img" loading="lazy" width="800" height="500">
        </div>
        <div class="atelier-index-line">
          <span class="atelier-index-num">${num}</span>
          <div class="atelier-index-copy">
            <h3 class="atelier-index-title">${escHtml(item.name)}</h3>
            <span class="atelier-index-meta">${escHtml(zone)} · ${escHtml(specs)}</span>
          </div>
          <strong class="atelier-index-price">${escHtml(price)}</strong>
          <span class="atelier-index-arrow" aria-hidden="true">→</span>
        </div>
      </article>`;
    })
    .join('');
}

export function renderCatalog(items) {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;
  renderAtelierPortfolio(items, grid);
  if (typeof document !== 'undefined' && typeof CustomEvent === 'function') {
    document.dispatchEvent(new CustomEvent('karamel:catalog-updated', { detail: { items } }));
  }
}

let activeSiteSettings = null;

export function applySiteSettings(rawSettings) {
  const settings = rawSettings && rawSettings.settings && typeof rawSettings.settings === 'object' ? rawSettings.settings : rawSettings;
  if (!settings || typeof settings !== 'object') return;
  activeSiteSettings = settings;
  const phones = Array.isArray(settings.contactPhones) ? settings.contactPhones : [];
  if (phones.length > 0) {
    const primary = String(phones[0] || '').trim();
    const digits = primary.replace(/[^0-9]/g, '');
    if (digits) {
      SITE_CONFIG.WA_NUMBER = digits;
      document.querySelectorAll('a[href^="https://wa.me/"]').forEach((a) => {
        const href = a.getAttribute('href') || '';
        const q = href.indexOf('?');
        a.setAttribute('href', 'https://wa.me/' + encodeURIComponent(digits) + (q >= 0 ? href.slice(q) : ''));
      });
    }
    const safeTel = primary.replace(/[^+\d\s()-]/g, '').trim();
    if (/\d/.test(safeTel)) {
      document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
        a.setAttribute('href', 'tel:' + safeTel);
        a.textContent = safeTel;
      });
    }
  }
  const textBindings = [
    ['[data-setting="business-hours"]', settings.businessHours],
    ['[data-setting="promo-headline"]', settings.promoHeadline],
    ['[data-setting="delivery-eta"]', settings.deliveryEta],
    ['[data-setting="contact-phones"]', phones.length > 0 ? phones.join(' · ') : ''],
    ['[data-setting="payment-methods"]', Array.isArray(settings.paymentMethods) ? settings.paymentMethods.join(' · ') : ''],
  ];
  for (const [sel, val] of textBindings) {
    if (val) document.querySelectorAll(sel).forEach((el) => { el.textContent = val; });
  }
  if (settings.businessHours) {
    document.querySelectorAll('.status-bar .status-item').forEach((el) => {
      if ((el.textContent || '').trim().startsWith('Horario:')) el.textContent = 'Horario: ' + settings.businessHours;
    });
  }
  if (settings.announcementText !== undefined) {
    document.querySelectorAll('[data-setting="announcement"], .top-announcement').forEach((el) => {
      el.textContent = settings.announcementText;
      el.hidden = !settings.announcementText;
    });
  }
}

let imageFallbackBound = false;
export function bindImageFallback() {
  if (imageFallbackBound) return;
  imageFallbackBound = true;
  document.addEventListener('error', (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || img.dataset.fallbackApplied) return;
    img.dataset.fallbackApplied = 'true';
    img.src = 'assets/hero-showcase.svg';
  }, true);
}

export function bindDomainActionForm() {
  const form = document.getElementById('domain-action-form');
  if (!form || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';
  const today = new Date().toISOString().slice(0, 10);
  form.querySelectorAll('input[type="date"]').forEach((input) => {
    if (!input.getAttribute('min')) input.setAttribute('min', today);
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = form.getAttribute('aria-label') || 'Solicitud';
    const lines = [];
    form.querySelectorAll('input, select, textarea').forEach((field) => {
      const val = String(field.value || '').trim();
      if (!val) return;
      const labelEl = field.id ? form.querySelector(`label[for="${field.id}"]`) : null;
      const labelText = labelEl ? labelEl.textContent.trim() : field.name;
      lines.push(`• ${labelText}: ${val}`);
    });
    const msg = `Hola ${SITE_CONFIG.BUSINESS_NAME}, quiero confirmar mi ${title}:\n${lines.join('\n')}`;
    const waHref = buildWhatsAppUrl(msg, 'formulario-reservas');
    const email = SITE_CONFIG.CONTACT_EMAIL || '';
    const statusBox = document.getElementById('domain-form-status');
    if (email) {
      const mailHref = 'mailto:' + encodeURIComponent(email) + '?subject=' + encodeURIComponent(title + ' — ' + SITE_CONFIG.BUSINESS_NAME) + '&body=' + encodeURIComponent(msg);
      if (statusBox) {
        statusBox.hidden = false;
        statusBox.innerHTML = `<span>Solicitud lista para enviar a <strong>${escHtml(email)}</strong>.</span> <a href="${escHtml(mailHref)}" class="btn-outline">Abrir correo</a> <a href="${escHtml(waHref)}" target="_blank" rel="noopener noreferrer" class="btn-outline">O vía WhatsApp</a>`;
      }
      window.location.href = mailHref;
      return;
    }
    if (statusBox) {
      statusBox.hidden = false;
      statusBox.innerHTML = `<span>Solicitud lista para confirmar por WhatsApp.</span> <a href="${escHtml(waHref)}" target="_blank" rel="noopener noreferrer" class="btn-outline">Abrir WhatsApp</a>`;
    }
    window.open(waHref, '_blank', 'noopener,noreferrer');
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  bindImageFallback();
  initCtaTracking();
  initSiteShell();
  initThemeToggle();
  renderCatalog(currentCatalog);
  bindDomainActionForm();

  document.addEventListener('karamel:navigate', () => {
    bindImageFallback();
    bindDomainActionForm();
    if (document.getElementById('catalog-grid')) {
      renderCatalog(currentCatalog);
    }
    if (activeSiteSettings) applySiteSettings(activeSiteSettings);
  });
  loadSiteSettings().then((settings) => {
    if (settings) applySiteSettings(settings);
  });
  loadCatalogData().then(({ items, source }) => {
    if ((source === 'supabase' || source === 'local-preview') && Array.isArray(items)) {
      currentCatalog = items;
      renderCatalog(currentCatalog);
    }
  });
}
