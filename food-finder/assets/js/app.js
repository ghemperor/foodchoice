const DATA_URL = './assets/data/restaurants.json';

/**
 * App state
 */
const state = {
  allRestaurants: [],
  filteredRestaurants: [],
  selectedDistrict: '',
  selectedCategories: new Set(),
  searchQuery: '',
  sortMode: 'recommended'
};

/**
 * Elements
 */
const elements = {
  districtSelect: document.getElementById('districtSelect'),
  categoriesContainer: document.getElementById('categoriesContainer'),
  results: document.getElementById('results'),
  stats: document.getElementById('stats'),
  searchInput: document.getElementById('searchInput'),
  sortSelect: document.getElementById('sortSelect'),
  clearBtn: document.getElementById('clearBtn'),
  cardTemplate: document.getElementById('cardTemplate')
};

/**
 * Utility helpers
 */
function uniqueSorted(values) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'vi')); 
}

function formatPriceLevel(level) {
  if (typeof level !== 'number' || Number.isNaN(level)) return '';
  const clamped = Math.max(1, Math.min(4, Math.round(level)));
  return '₫'.repeat(clamped);
}

function renderStats(total, filtered) {
  const parts = [];
  parts.push(`${filtered} kết quả`);
  if (state.selectedDistrict) parts.push(`• Quận: ${state.selectedDistrict}`);
  if (state.selectedCategories.size > 0) parts.push(`• Thể loại: ${Array.from(state.selectedCategories).join(', ')}`);
  if (state.searchQuery) parts.push(`• Tìm: "${state.searchQuery}"`);
  elements.stats.textContent = parts.join(' ');
}

function createCategoryChip(category) {
  const label = document.createElement('label');
  label.className = 'chip';
  label.dataset.checked = 'false';
  label.setAttribute('role', 'checkbox');
  label.setAttribute('aria-checked', 'false');

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.value = category;
  input.addEventListener('change', () => {
    const checked = input.checked;
    label.dataset.checked = String(checked);
    label.setAttribute('aria-checked', String(checked));
    if (checked) state.selectedCategories.add(category); else state.selectedCategories.delete(category);
    applyFilters();
  });

  const dot = document.createElement('span');
  dot.className = 'dot';
  const text = document.createElement('span');
  text.textContent = category;

  label.appendChild(input);
  label.appendChild(dot);
  label.appendChild(text);
  return label;
}

function renderResults(items) {
  elements.results.innerHTML = '';
  const fragment = document.createDocumentFragment();
  const template = elements.cardTemplate;
  for (const item of items) {
    const node = template.content.cloneNode(true);
    node.querySelector('.card-title').textContent = item.name;
    node.querySelector('.rating').textContent = item.rating ? `★ ${item.rating.toFixed(1)}` : 'Chưa có đánh giá';
    node.querySelector('.district').textContent = item.district;
    node.querySelector('.price').textContent = formatPriceLevel(item.priceLevel);
    node.querySelector('.address').textContent = item.address;

    const cats = node.querySelector('.card-categories');
    for (const cat of item.categories) {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = cat;
      cats.appendChild(span);
    }

    const mapUrl = item.mapUrl || (item.location && typeof item.location.lat === 'number' && typeof item.location.lng === 'number'
      ? `https://www.google.com/maps/search/?api=1&query=${item.location.lat},${item.location.lng}`
      : null);
    if (mapUrl) {
      const mapLink = node.querySelector('.map-link');
      mapLink.href = mapUrl;
    } else {
      node.querySelector('.map-link').style.display = 'none';
    }

    const phoneLink = node.querySelector('.phone-link');
    if (item.phone) {
      phoneLink.href = `tel:${item.phone}`;
    } else {
      phoneLink.style.display = 'none';
    }

    fragment.appendChild(node);
  }
  elements.results.appendChild(fragment);
}

function applyFilters() {
  const query = state.searchQuery.trim().toLowerCase();
  const categories = state.selectedCategories;
  const district = state.selectedDistrict;

  let items = state.allRestaurants.filter(r => {
    if (district && r.district !== district) return false;
    if (categories.size > 0) {
      const hasAll = Array.from(categories).every(c => r.categories.includes(c));
      if (!hasAll) return false;
    }
    if (query) {
      const hay = `${r.name} ${r.address} ${r.categories.join(' ')}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  switch (state.sortMode) {
    case 'rating_desc':
      items.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      break;
    case 'price_asc':
      items.sort((a, b) => (a.priceLevel ?? 0) - (b.priceLevel ?? 0));
      break;
    case 'price_desc':
      items.sort((a, b) => (b.priceLevel ?? 0) - (a.priceLevel ?? 0));
      break;
    case 'name_asc':
      items.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
      break;
    case 'recommended':
    default:
      items.sort((a, b) => {
        const scoreA = (a.rating ?? 0) * 2 + (a.featured ? 1 : 0) - (a.priceLevel ?? 2) * 0.05;
        const scoreB = (b.rating ?? 0) * 2 + (b.featured ? 1 : 0) - (b.priceLevel ?? 2) * 0.05;
        return scoreB - scoreA;
      });
  }

  state.filteredRestaurants = items;
  renderStats(state.allRestaurants.length, items.length);
  renderResults(items);
}

async function loadData() {
  elements.stats.textContent = 'Đang tải dữ liệu...';
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error('Không tải được dữ liệu');
  const data = await res.json();
  return data;
}

function initControlsFromData(data) {
  const districts = uniqueSorted(data.map(r => r.district).filter(Boolean));
  for (const d of districts) {
    const opt = document.createElement('option');
    opt.value = d; opt.textContent = d;
    elements.districtSelect.appendChild(opt);
  }

  const categorySet = new Set();
  for (const r of data) for (const c of r.categories) categorySet.add(c);
  const categories = uniqueSorted(Array.from(categorySet));
  const frag = document.createDocumentFragment();
  for (const c of categories) frag.appendChild(createCategoryChip(c));
  elements.categoriesContainer.appendChild(frag);
}

function attachEventListeners() {
  elements.districtSelect.addEventListener('change', () => {
    state.selectedDistrict = elements.districtSelect.value;
    applyFilters();
  });
  elements.searchInput.addEventListener('input', () => {
    state.searchQuery = elements.searchInput.value;
    applyFilters();
  });
  elements.sortSelect.addEventListener('change', () => {
    state.sortMode = elements.sortSelect.value;
    applyFilters();
  });
  elements.clearBtn.addEventListener('click', () => {
    state.selectedDistrict = '';
    state.selectedCategories.clear();
    state.searchQuery = '';
    state.sortMode = 'recommended';

    elements.districtSelect.value = '';
    elements.searchInput.value = '';
    elements.sortSelect.value = 'recommended';
    elements.categoriesContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
      cb.closest('.chip').dataset.checked = 'false';
      cb.closest('.chip').setAttribute('aria-checked', 'false');
    });
    applyFilters();
  });
}

async function main() {
  try {
    const data = await loadData();
    state.allRestaurants = data;
    initControlsFromData(data);
    attachEventListeners();
    applyFilters();
  } catch (err) {
    console.error(err);
    elements.stats.textContent = 'Có lỗi xảy ra khi tải dữ liệu';
  }
}

main();

