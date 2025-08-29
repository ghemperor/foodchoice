const { useEffect, useMemo, useState, useCallback } = React;

const STORAGE_KEYS = {
	filters: "chon-quan-filters",
	selected: "chon-quan-selected",
	location: "chon-quan-location"
};

function getUniqueSorted(values) {
	return Array.from(new Set((values || []).filter(Boolean))).sort((a, b) => a.localeCompare(b, "vi"));
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

function useLocalStorage(key, initialValue) {
	const [value, setValue] = useState(() => {
		try {
			const raw = localStorage.getItem(key);
			return raw ? JSON.parse(raw) : initialValue;
		} catch { return initialValue; }
	});
	useEffect(() => {
		try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
	}, [key, value]);
	return [value, setValue];
}

function App() {
	const [data, setData] = useState([]);
	const [filters, setFilters] = useLocalStorage(STORAGE_KEYS.filters, { district: "", category: "", keyword: "", sort: "default" });
	const [selected, setSelected] = useLocalStorage(STORAGE_KEYS.selected, null);
	const [userLocation, setUserLocation] = useLocalStorage(STORAGE_KEYS.location, null);
	const [modalItem, setModalItem] = useState(null);
	const [toast, setToast] = useState("");
	const [mapItem, setMapItem] = useState(null);
	const [highlightId, setHighlightId] = useState(null);

	useEffect(() => {
		(async () => {
			try {
				const res = await fetch("./data.json", { cache: "no-store" });
				if (!res.ok) throw new Error("Load data failed");
				const json = await res.json();
				setData(json);
			} catch {
				setData([
					{ id: 1, name: "Bún Chả Hương Liên", district: "Hai Bà Trưng", category: "Đồ nước", address: "24 Lê Văn Hưu, Hà Nội", description: "Bún chả nổi tiếng, nước chấm đậm đà.", price: "60k-90k", image: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop", lat: 21.013847, lng: 105.849499 },
					{ id: 2, name: "Cơm Tấm Cali", district: "Quận 1", category: "Đồ khô", address: "123 Lê Lợi, Quận 1", description: "Cơm tấm sườn bì chả, phần ăn đầy đặn.", price: "50k-85k", image: "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?q=80&w=800&auto=format&fit=crop", lat: 10.77221, lng: 106.698281 },
					{ id: 3, name: "Gimbap House", district: "Quận 7", category: "Món Hàn", address: "45 Nguyễn Thị Thập, Quận 7", description: "Gimbap, tokbokki, kimbap chiên.", price: "40k-100k", image: "https://images.unsplash.com/photo-1544025162-8fb383f65804?q=80&w=800&auto=format&fit=crop", lat: 10.736067, lng: 106.721662 },
				]);
			}
		})();
	}, []);

	const districts = useMemo(() => getUniqueSorted(data.map(x => x.district)), [data]);
	const categories = useMemo(() => getUniqueSorted(data.map(x => x.category)), [data]);

	const augmented = useMemo(() => {
		return data.map(item => {
			const clone = { ...item };
			if (userLocation && typeof item.lat === "number" && typeof item.lng === "number") {
				clone._distanceKm = haversineKm(userLocation.lat, userLocation.lng, item.lat, item.lng);
			}
			return clone;
		});
	}, [data, userLocation]);

	const filtered = useMemo(() => {
		let list = augmented;
		if (filters.district) list = list.filter(x => (x.district || "").toLowerCase() === filters.district.toLowerCase());
		if (filters.category) list = list.filter(x => (x.category || "").toLowerCase() === filters.category.toLowerCase());
		if (filters.keyword) {
			const kw = filters.keyword.trim().toLowerCase();
			list = list.filter(x => (x.name||"").toLowerCase().includes(kw) || (x.address||"").toLowerCase().includes(kw) || (x.description||"").toLowerCase().includes(kw));
		}
		if (filters.sort === "nearby" && userLocation) list = [...list].sort((a,b) => (a._distanceKm ?? Infinity) - (b._distanceKm ?? Infinity));
		else list = [...list].sort((a,b) => a.name.localeCompare(b.name, "vi"));
		return list;
	}, [augmented, filters, userLocation]);

	const setFilter = useCallback((name, value) => {
		setFilters(prev => ({ ...prev, [name]: value }));
	}, [setFilters]);

	const clearFilters = useCallback(() => {
		setFilters({ district: "", category: "", keyword: "", sort: "default" });
	}, [setFilters]);

	const getLocation = useCallback(() => {
		if (!navigator.geolocation) { setToast("Trình duyệt không hỗ trợ định vị"); return; }
		navigator.geolocation.getCurrentPosition((pos) => {
			const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
			setUserLocation(loc);
			setToast("Đã cập nhật vị trí của bạn");
		}, () => setToast("Không lấy được vị trí"));
	}, [setUserLocation]);

	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(""), 2200);
		return () => clearTimeout(t);
	}, [toast]);

	const pickRandom = useCallback(() => {
		if (!filtered.length) return;
		const item = filtered[Math.floor(Math.random() * filtered.length)];
		setModalItem(item);
		setHighlightId(item.id);
		setTimeout(() => setHighlightId(null), 1500);
	}, [filtered]);

	const selectItem = useCallback((item) => {
		try { localStorage.setItem(STORAGE_KEYS.selected, JSON.stringify(item)); } catch {}
		setSelected(item);
		setToast(`Đã chọn: ${item.name}`);
	}, [setSelected]);

	const openDirections = useCallback((item) => {
		let url = "https://www.google.com/maps/dir/?api=1&destination=";
		if (typeof item.lat === "number" && typeof item.lng === "number") url += `${item.lat},${item.lng}`; else url += encodeURIComponent(`${item.name} ${item.address||""}`);
		window.open(url, "_blank");
	}, []);

	return (
		<>
			<header className="site-header">
				<h1>Chọn Quán Ăn</h1>
			</header>
			<main className="container">
				<section className="hero">
					<div className="hero-left">
						<h2>Hôm nay ăn gì?</h2>
						<p>Trang chọn quán trẻ trung dành cho hai bạn khi chưa biết ăn gì. Lọc theo quận, thể loại, xem khoảng cách và chỉ đường nhanh.</p>
						<div className="hero-actions">
							<button onClick={pickRandom}>Gợi ý ngẫu nhiên</button>
							<button className="secondary" onClick={getLocation}>Lấy vị trí của tôi</button>
						</div>
					</div>
					<div className="hero-right">
						<div className="hero-card">
							<p>Thêm ảnh, giá, địa chỉ… vào dữ liệu của bạn để xem đẹp nhất.</p>
						</div>
					</div>
				</section>

				<section className="controls" aria-label="Bộ lọc">
					<div className="control">
						<label htmlFor="districtSelect">Quận/Huyện</label>
						<select id="districtSelect" value={filters.district} onChange={e => setFilter("district", e.target.value)}>
							<option value="">Tất cả</option>
							{districts.map(d => <option key={d} value={d}>{d}</option>)}
						</select>
					</div>
					<div className="control">
						<label htmlFor="categorySelect">Thể loại</label>
						<select id="categorySelect" value={filters.category} onChange={e => setFilter("category", e.target.value)}>
							<option value="">Tất cả</option>
							{categories.map(c => <option key={c} value={c}>{c}</option>)}
						</select>
					</div>
					<div className="control search">
						<label htmlFor="searchInput">Tìm kiếm</label>
						<input id="searchInput" type="search" placeholder="Tên quán, món, địa chỉ..." value={filters.keyword} onChange={e => setFilter("keyword", e.target.value)} />
					</div>
					<div className="control actions">
						<label htmlFor="sortSelect">Sắp xếp</label>
						<div className="action-row" style={{ display: 'flex', gap: 8 }}>
							<select id="sortSelect" value={filters.sort} onChange={e => setFilter("sort", e.target.value)}>
								<option value="default">Mặc định</option>
								<option value="nearby">Gần tôi</option>
							</select>
							<button className="secondary" onClick={clearFilters}>Xóa lọc</button>
						</div>
					</div>
				</section>

				<section className="results" aria-live="polite">
					<ul id="restaurantList" className="cards">
						{filtered.length === 0 && (
							<li className="card empty">Không tìm thấy quán phù hợp.</li>
						)}
						{filtered.map(item => (
							<Card key={item.id} item={item} highlight={highlightId === item.id}
								onSelect={() => selectItem(item)}
								onDetails={() => setModalItem(item)}
								onMap={() => setMapItem(item)}
								onDirections={() => openDirections(item)} />
						))}
					</ul>
				</section>

				<section className="map-panel">
					<h3>Bản đồ</h3>
					<iframe id="mapFrame" title="Google Maps" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
						src={mapItem ? (typeof mapItem.lat === 'number' && typeof mapItem.lng === 'number' ? `https://www.google.com/maps?q=${mapItem.lat},${mapItem.lng}&z=16&output=embed` : `https://www.google.com/maps?q=${encodeURIComponent(`${mapItem.name} ${mapItem.address||''}`)}&z=16&output=embed`) : 'https://www.google.com/maps?q=Vietnam&z=5&output=embed'} />
				</section>
			</main>

			<footer className="site-footer">
				<p>Made with ❤️ for chọn quán ăn nhanh chóng.</p>
			</footer>

			{modalItem && (
				<Modal item={modalItem} onClose={() => setModalItem(null)} onSelect={() => selectItem(modalItem)} />
			)}

			{toast && (<div className="toast">{toast}</div>)}
		</>
	);
}

function Card({ item, onSelect, onDetails, onMap, onDirections, highlight }) {
	return (
		<li className={"card" + (highlight ? " highlight" : "") }>
			<div className="thumb" style={{ backgroundImage: item.image ? `url("${item.image}")` : undefined }} />
			<div className="card-main">
				<div className="card-header">
					<h3 className="card-title">{item.name}</h3>
					<span className="badge">{item.category || 'Khác'}</span>
				</div>
				<p className="card-meta">{[item.district, item.address].filter(Boolean).join(' • ')}</p>
				<p className="card-desc">{item.description || ''}</p>
				<div className="chips">
					{formatPrice(item) && <span className="chip price">{formatPrice(item)}</span>}
					{typeof item._distanceKm === 'number' && <span className="chip distance">{item._distanceKm.toFixed(1)} km</span>}
				</div>
			</div>
			<div className="card-actions">
				<button className="detailsBtn" onClick={onDetails}>Chi tiết</button>
				<button className="mapBtn secondary" onClick={onMap}>Xem bản đồ</button>
				<button className="directionsBtn" onClick={onDirections}>Chỉ đường</button>
				<button className="selectBtn" onClick={onSelect}>Chọn quán này</button>
			</div>
		</li>
	);
}

function Modal({ item, onClose, onSelect }) {
	const mapHref = typeof item.lat === 'number' && typeof item.lng === 'number'
		? `https://www.google.com/maps?q=${item.lat},${item.lng}`
		: `https://www.google.com/maps?q=${encodeURIComponent(`${item.name} ${item.address||''}`)}`;
	const dirHref = typeof item.lat === 'number' && typeof item.lng === 'number'
		? `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`
		: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${item.name} ${item.address||''}`)}`;
	return (
		<div id="detailModal" className="modal" aria-hidden="false">
			<div className="modal-backdrop" onClick={onClose}></div>
			<div className="modal-dialog" role="dialog" aria-modal="true">
				<button className="modal-close" aria-label="Đóng" onClick={onClose}>✕</button>
				<div className="modal-body">
					<div className="modal-thumb" style={{ backgroundImage: item.image ? `url("${item.image}")` : undefined }}></div>
					<div>
						<h3 className="modal-title">{item.name}</h3>
						<p className="modal-meta">{[item.category, item.district, item.address].filter(Boolean).join(' • ')}</p>
						<p className="modal-desc">{item.description || ''}</p>
						<div className="modal-prices">
							{Array.isArray(item.prices) && item.prices.length ? item.prices.map((p, idx) => (
								<div className="price-row" key={idx}><span>{p.name || 'Món'}</span><strong>{String(p.price)}</strong></div>
							)) : (formatPrice(item) ? <div className="price-row"><span>Giá tham khảo</span><strong>{formatPrice(item)}</strong></div> : null)}
						</div>
						<div className="modal-actions">
							<a className="modal-map secondary" target="_blank" rel="noopener" href={mapHref}>Xem trên Google Maps</a>
							<a className="modal-dir" target="_blank" rel="noopener" href={dirHref}>Chỉ đường</a>
							<button className="modal-select" onClick={onSelect}>Chọn quán này</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

