const STORAGE_KEYS = {
	filters: "chon-quan-filters",
	selected: "chon-quan-selected"
};

const DATA = [];

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

	const filters = { district, category, keyword };
	saveFiltersToStorage(filters);

	let list = DATA.slice();
	if (district) list = list.filter(x => (x.district || "").toLowerCase() === district.toLowerCase());
	if (category) list = list.filter(x => (x.category || "").toLowerCase() === category.toLowerCase());
	if (keyword) list = list.filter(x =>
		(x.name || "").toLowerCase().includes(keyword) ||
		(x.address || "").toLowerCase().includes(keyword) ||
		(x.description || "").toLowerCase().includes(keyword)
	);

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
		node.querySelector(".card-title").textContent = item.name;
		node.querySelector(".badge").textContent = item.category || "Khác";
		node.querySelector(".card-meta").textContent = [item.district, item.address].filter(Boolean).join(" • ");
		node.querySelector(".card-desc").textContent = item.description || "";
		node.querySelector(".selectBtn").addEventListener("click", () => saveSelectedToStorage(item));
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
	const { district = "", category = "", keyword = "" } = loadFiltersFromStorage();
	document.getElementById("districtSelect").value = district;
	document.getElementById("categorySelect").value = category;
	document.getElementById("searchInput").value = keyword;
}

function attachEvents() {
	document.getElementById("districtSelect").addEventListener("change", applyFiltersAndRender);
	document.getElementById("categorySelect").addEventListener("change", applyFiltersAndRender);
	document.getElementById("searchInput").addEventListener("input", debounce(applyFiltersAndRender, 120));
	document.getElementById("clearBtn").addEventListener("click", () => {
		document.getElementById("districtSelect").value = "";
		document.getElementById("categorySelect").value = "";
		document.getElementById("searchInput").value = "";
		applyFiltersAndRender();
	});
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
	// For now use inline sample; could be fetched from /data.json later
	DATA.splice(0, DATA.length, ...[
		{ id: 1, name: "Bún Chả Hương Liên", district: "Hai Bà Trưng", category: "Đồ nước", address: "24 Lê Văn Hưu", description: "Bún chả nổi tiếng, nước chấm đậm đà." },
		{ id: 2, name: "Cơm Tấm Cali", district: "Quận 1", category: "Đồ khô", address: "123 Lê Lợi", description: "Cơm tấm sườn bì chả, phần ăn đầy đặn." },
		{ id: 3, name: "Gimbap House", district: "Quận 7", category: "Món Hàn", address: "45 Nguyễn Thị Thập", description: "Gimbap, tokbokki, kimbap chiên." },
		{ id: 4, name: "Phở Thìn", district: "Hoàn Kiếm", category: "Đồ nước", address: "13 Lò Đúc", description: "Phở bò tái lăn thơm béo, chuẩn vị Hà Nội." },
		{ id: 5, name: "Bingsu Snow", district: "Quận 3", category: "Tráng miệng", address: "78 Võ Văn Tần", description: "Bingsu trái cây mát lạnh." },
		{ id: 6, name: "Lẩu Thái Tomyum", district: "Quận 10", category: "Lẩu", address: "56 Sư Vạn Hạnh", description: "Nước lẩu đậm vị Tomyum, hải sản tươi." }
	]);
}

bootstrap();
