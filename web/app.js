const STORAGE_KEYS = {
	filters: "chon-quan-filters",
	selected: "chon-quan-selected",
	location: "chon-quan-location"
};

const DATA = [];
const STATE = {
	userLocation: null,
	lastFiltered: []
};

function getUniqueSorted(values) {
	return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "vi"));
}

function loadFiltersFromStorage() {
	try {
		const raw = localStorage.getItem(STORAGE_KEYS.filters);
		return raw ? JSON.parse(raw) : {};
	} catch { return {}; }
}
function saveFiltersToStorage(filters) {
	localStorage.setItem(STORAGE_KEYS.filters, JSON.stringify(filters));
}

function saveSelectedToStorage(item) {
	localStorage.setItem(STORAGE_KEYS.selected, JSON.stringify(item));
	showToast(`Đã chọn: ${item.name}`);
}

function showToast(message) {
	const t = document.createElement("div");
	t.className = "toast";
	t.textContent = message;
	document.body.appendChild(t);
	setTimeout(() => t.remove(), 2200);
}

function applyFiltersAndRender() {
	const district = document.getElementById("districtSelect").value;
	const category = document.getElementById("categorySelect").value;
	const keyword = document.getElementById("searchInput").value.trim().toLowerCase();
	const sort = document.getElementById("sortSelect")?.value || "default";

	const filters = { district, category, keyword, sort };
	saveFiltersToStorage(filters);

	let list = DATA.slice();
	if (district) list = list.filter(x => (x.district || "").toLowerCase() === district.toLowerCase());
	if (category) list = list.filter(x => (x.category || "").toLowerCase() === category.toLowerCase());
	if (keyword) list = list.filter(x =>
		(x.name || "").toLowerCase().includes(keyword) ||
		(x.address || "").toLowerCase().includes(keyword) ||
		(x.description || "").toLowerCase().includes(keyword)
	);

	augmentDistances(list);
	if (sort === "nearby" && STATE.userLocation) {
		list.sort((a, b) => (a._distanceKm ?? Infinity) - (b._distanceKm ?? Infinity));
	} else if (sort === "default") {
		list.sort((a, b) => a.name.localeCompare(b.name, "vi"));
	}

	STATE.lastFiltered = list;
	renderList(list);
}

function renderList(list) {
	const container = document.getElementById("restaurantList");
	container.innerHTML = "";

	if (!list.length) {
		const li = document.createElement("li");
		li.className = "card empty";
		li.textContent = "Không tìm thấy quán phù hợp.";
		container.appendChild(li);
		return;
	}

	const tpl = document.getElementById("restaurantItemTemplate");
	for (const item of list) {
		const node = tpl.content.cloneNode(true);
		const li = node.querySelector("li.card");
		node.querySelector(".card-title").textContent = item.name;
		node.querySelector(".badge").textContent = item.category || "Khác";
		node.querySelector(".card-meta").textContent = [item.district, item.address].filter(Boolean).join(" • ");
		node.querySelector(".card-desc").textContent = item.description || "";
		if (item.image) node.querySelector(".thumb").style.backgroundImage = `url("${item.image}")`;
		const priceText = formatPrice(item);
		if (priceText) node.querySelector(".chip.price").textContent = priceText; else node.querySelector(".chip.price").remove();
		if (typeof item._distanceKm === "number") node.querySelector(".chip.distance").textContent = `${item._distanceKm.toFixed(1)} km`; else node.querySelector(".chip.distance").remove();

		node.querySelector(".selectBtn").addEventListener("click", () => saveSelectedToStorage(item));
		node.querySelector(".detailsBtn").addEventListener("click", () => openModal(item));
		node.querySelector(".mapBtn").addEventListener("click", () => updateMap(item));
		node.querySelector(".directionsBtn").addEventListener("click", () => openDirections(item));

		container.appendChild(node);
	}
}

function populateFilterOptions() {
	const districts = getUniqueSorted(DATA.map(x => x.district));
	const categories = getUniqueSorted(DATA.map(x => x.category));

	const districtSelect = document.getElementById("districtSelect");
	const categorySelect = document.getElementById("categorySelect");

	for (const d of districts) {
		const opt = document.createElement("option");
		opt.value = d; opt.textContent = d; districtSelect.appendChild(opt);
	}
	for (const c of categories) {
		const opt = document.createElement("option");
		opt.value = c; opt.textContent = c; categorySelect.appendChild(opt);
	}
}

function hydrateFiltersUIFromStorage() {
	const { district = "", category = "", keyword = "", sort = "default" } = loadFiltersFromStorage();
	document.getElementById("districtSelect").value = district;
	document.getElementById("categorySelect").value = category;
	document.getElementById("searchInput").value = keyword;
	const sortSelect = document.getElementById("sortSelect");
	if (sortSelect) sortSelect.value = sort;
}

function attachEvents() {
	document.getElementById("districtSelect").addEventListener("change", applyFiltersAndRender);
	document.getElementById("categorySelect").addEventListener("change", applyFiltersAndRender);
	document.getElementById("searchInput").addEventListener("input", debounce(applyFiltersAndRender, 120));
	document.getElementById("sortSelect").addEventListener("change", applyFiltersAndRender);
	document.getElementById("clearBtn").addEventListener("click", () => {
		document.getElementById("districtSelect").value = "";
		document.getElementById("categorySelect").value = "";
		document.getElementById("searchInput").value = "";
		document.getElementById("sortSelect").value = "default";
		applyFiltersAndRender();
	});
	document.getElementById("randomBtn").addEventListener("click", pickRandom);
	document.getElementById("locateBtn").addEventListener("click", getUserLocation);

	const closeBtn = document.querySelector(".modal-close");
	const backdrop = document.querySelector("#detailModal .modal-backdrop");
	closeBtn.addEventListener("click", closeModal);
	backdrop.addEventListener("click", closeModal);
}

function debounce(fn, ms) {
	let t;
	return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

async function bootstrap() {
	await loadData();
	populateFilterOptions();
	hydrateFiltersUIFromStorage();
	attachEvents();
	applyFiltersAndRender();
}

async function loadData() {
	try {
		const res = await fetch("./data.json", { cache: "no-store" });
		if (!res.ok) throw new Error("Failed to load data.json");
		const json = await res.json();
		DATA.splice(0, DATA.length, ...json);
	} catch (e) {
		// fallback sample with lat/lng + image + price
		DATA.splice(0, DATA.length, ...[
			{ id: 1, name: "Bún Chả Hương Liên", district: "Hai Bà Trưng", category: "Đồ nước", address: "24 Lê Văn Hưu, Hà Nội", description: "Bún chả nổi tiếng, nước chấm đậm đà.", price: "60k-90k", image: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop", lat: 21.013847, lng: 105.849499 },
			{ id: 2, name: "Cơm Tấm Cali", district: "Quận 1", category: "Đồ khô", address: "123 Lê Lợi, Quận 1, TP.HCM", description: "Cơm tấm sườn bì chả, phần ăn đầy đặn.", price: "50k-85k", image: "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?q=80&w=800&auto=format&fit=crop", lat: 10.77221, lng: 106.698281 },
			{ id: 3, name: "Gimbap House", district: "Quận 7", category: "Món Hàn", address: "45 Nguyễn Thị Thập, Quận 7", description: "Gimbap, tokbokki, kimbap chiên.", price: "40k-100k", image: "https://images.unsplash.com/photo-1544025162-8fb383f65804?q=80&w=800&auto=format&fit=crop", lat: 10.736067, lng: 106.721662 },
			{ id: 4, name: "Phở Thìn", district: "Hoàn Kiếm", category: "Đồ nước", address: "13 Lò Đúc, Hà Nội", description: "Phở bò tái lăn thơm béo, chuẩn vị Hà Nội.", price: "65k-120k", image: "https://images.unsplash.com/photo-1526318472351-c75fcf070305?q=80&w=800&auto=format&fit=crop", lat: 21.014572, lng: 105.855 },
			{ id: 5, name: "Bingsu Snow", district: "Quận 3", category: "Tráng miệng", address: "78 Võ Văn Tần, Quận 3", description: "Bingsu trái cây mát lạnh.", price: "55k-120k", image: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?q=80&w=800&auto=format&fit=crop", lat: 10.77927, lng: 106.6895 },
			{ id: 6, name: "Lẩu Thái Tomyum", district: "Quận 10", category: "Lẩu", address: "56 Sư Vạn Hạnh, Quận 10", description: "Nước lẩu đậm vị Tomyum, hải sản tươi.", price: "150k-300k/người", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop", lat: 10.77273, lng: 106.6673 }
		]);
	}

	try {
		const savedLoc = localStorage.getItem(STORAGE_KEYS.location);
		if (savedLoc) STATE.userLocation = JSON.parse(savedLoc);
	} catch {}
}

function formatPrice(item) {
	if (!item) return "";
	if (item.price) return String(item.price);
	if (Array.isArray(item.prices) && item.prices.length) {
		const values = item.prices.map(p => Number(String(p.price).replace(/[^\d.]/g, ""))).filter(n => !isNaN(n));
		if (values.length) {
			const min = Math.min(...values), max = Math.max(...values);
			return `${Math.round(min/1000)}k-${Math.round(max/1000)}k`;
		}
	}
	return "";
}

function augmentDistances(list) {
	if (!STATE.userLocation) return;
	for (const item of list) {
		if (typeof item.lat === "number" && typeof item.lng === "number") {
			item._distanceKm = haversineKm(STATE.userLocation.lat, STATE.userLocation.lng, item.lat, item.lng);
		} else {
			item._distanceKm = undefined;
		}
	}
}

function deg2rad(d) { return d * Math.PI / 180; }
function haversineKm(lat1, lon1, lat2, lon2) {
	const R = 6371;
	const dLat = deg2rad(lat2 - lat1);
	const dLon = deg2rad(lon2 - lon1);
	const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	return R * c;
}

function getUserLocation() {
	if (!navigator.geolocation) { showToast("Trình duyệt không hỗ trợ định vị"); return; }
	navigator.geolocation.getCurrentPosition((pos) => {
		STATE.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
		localStorage.setItem(STORAGE_KEYS.location, JSON.stringify(STATE.userLocation));
		showToast("Đã cập nhật vị trí của bạn");
		applyFiltersAndRender();
	}, (err) => {
		showToast("Không lấy được vị trí");
	});
}

function updateMap(item) {
	const frame = document.getElementById("mapFrame");
	let q = encodeURIComponent(`${item.name} ${item.address || ""}`);
	if (typeof item.lat === "number" && typeof item.lng === "number") {
		frame.src = `https://www.google.com/maps?q=${item.lat},${item.lng}&z=16&output=embed`;
	} else {
		frame.src = `https://www.google.com/maps?q=${q}&z=16&output=embed`;
	}
}

function openDirections(item) {
	let url = "https://www.google.com/maps/dir/?api=1&destination=";
	if (typeof item.lat === "number" && typeof item.lng === "number") url += `${item.lat},${item.lng}`; else url += encodeURIComponent(`${item.name} ${item.address||""}`);
	window.open(url, "_blank");
}

function pickRandom() {
	const list = STATE.lastFiltered.length ? STATE.lastFiltered : DATA;
	if (!list.length) return;
	const item = list[Math.floor(Math.random() * list.length)];
	openModal(item);
	// highlight in list if visible
	const cards = document.querySelectorAll("#restaurantList .card");
	for (const c of cards) c.classList.remove("highlight");
	const idx = list.indexOf(item);
	const el = cards[idx];
	if (el) { el.classList.add("highlight"); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
}

function openModal(item) {
	const modal = document.getElementById("detailModal");
	modal.setAttribute("aria-hidden", "false");
	const thumb = modal.querySelector(".modal-thumb");
	thumb.style.backgroundImage = item.image ? `url("${item.image}")` : "";
	modal.querySelector(".modal-title").textContent = item.name;
	modal.querySelector(".modal-meta").textContent = [item.category, item.district, item.address].filter(Boolean).join(" • ");
	modal.querySelector(".modal-desc").textContent = item.description || "";
	const prices = modal.querySelector(".modal-prices");
	prices.innerHTML = "";
	if (Array.isArray(item.prices) && item.prices.length) {
		for (const p of item.prices) {
			const row = document.createElement("div");
			row.className = "price-row";
			const name = document.createElement("span"); name.textContent = p.name || "Món";
			const val = document.createElement("strong"); val.textContent = String(p.price);
			row.appendChild(name); row.appendChild(val);
			prices.appendChild(row);
		}
	} else {
		const range = formatPrice(item);
		if (range) {
			const row = document.createElement("div"); row.className = "price-row";
			const name = document.createElement("span"); name.textContent = "Giá tham khảo";
			const val = document.createElement("strong"); val.textContent = range;
			row.appendChild(name); row.appendChild(val); prices.appendChild(row);
		}
	}

	const mapA = modal.querySelector(".modal-map");
	const dirA = modal.querySelector(".modal-dir");
	if (typeof item.lat === "number" && typeof item.lng === "number") {
		mapA.href = `https://www.google.com/maps?q=${item.lat},${item.lng}`;
		dirA.href = `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`;
	} else {
		const q = encodeURIComponent(`${item.name} ${item.address||""}`);
		mapA.href = `https://www.google.com/maps?q=${q}`;
		dirA.href = `https://www.google.com/maps/dir/?api=1&destination=${q}`;
	}

	modal.querySelector(".modal-select").onclick = () => saveSelectedToStorage(item);
}

function closeModal() {
	const modal = document.getElementById("detailModal");
	modal.setAttribute("aria-hidden", "true");
}

bootstrap();
