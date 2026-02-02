const VIEW_MODE_KEY = 'dashboard:view-mode';
const THEME_KEY = 'dashboard:theme';
let seenRows = new Set();
let initializedRows = false;
let useLocalTime = false;
let currentViewMode = 'both';
let mapLocations = [];
let mapElement = null;
let selectedLocationUUID = null;
let currentTheme = 'dark';

function updateMapData() {
	const script = document.getElementById('map-data');
	if (!script) {
		return;
	}
	try {
		const parsed = JSON.parse(script.textContent || '[]');
		hydrateMap(parsed);
	} catch (err) {
		console.warn('map data parse failed', err);
	}
}

function hydrateMap(locations) {
	mapLocations = Array.isArray(locations) ? locations : [];
	pushMapData();
}

function pushMapData() {
	if (!mapElement) {
		mapElement = document.getElementById('dashboard-map');
	}
	if (!mapElement) {
		return;
	}
	const assign = () => {
		if (typeof mapElement.locations === 'undefined') {
			return false;
		}
		mapElement.locations = mapLocations;
		mapElement.currentLocation = mapLocations.length ? mapLocations[0] : null;
		if (mapLocations.length > 0 && typeof mapElement.fitBounds === 'function') {
			mapElement.fitBounds(false);
		}
		return true;
	};
	if (!assign()) {
		customElements.whenDefined('transistorsoft-map').then(() => {
			if (!mapElement) {
				mapElement = document.getElementById('dashboard-map');
			}
			assign();
		});
	}
}

document.addEventListener('htmx:afterSwap', (event) => {
	if (event.target && event.target.id === 'locations-panel') {
		const rows = Array.from(event.target.querySelectorAll('tbody tr'));
		if (!initializedRows) {
			rows.forEach((row) => {
				const id = row.getAttribute('data-uuid') || row.getAttribute('data-id');
				if (id) seenRows.add(id);
			});
			initializedRows = true;
		} else {
			rows.forEach((row) => {
				const id = row.getAttribute('data-uuid') || row.getAttribute('data-id');
				if (id && !seenRows.has(id)) {
					row.classList.add('row-flash');
					setTimeout(() => row.classList.remove('row-flash'), 1200);
					seenRows.add(id);
				}
			});
		}

		const firstRow = rows[0];
		if (firstRow) {
			const scroll = event.target.querySelector('.locations-scroll') || event.target;
			const header = event.target.querySelector('thead');
			const headerHeight = header ? header.getBoundingClientRect().height : 0;
			if (scroll && scroll.getBoundingClientRect) {
				const rowRect = firstRow.getBoundingClientRect();
				const scrollRect = scroll.getBoundingClientRect();
				const above = rowRect.top < scrollRect.top + headerHeight;
				const below = rowRect.bottom > scrollRect.bottom;
				if (above || below) {
					const offset = rowRect.top - scrollRect.top - headerHeight;
					scroll.scrollTop += offset;
				}
			}
		}

		if (useLocalTime) {
			applyLocalTime(rows);
		}

		if (selectedLocationUUID) {
			highlightLocationRow(selectedLocationUUID);
		}
	}
});

document.addEventListener('htmx:afterSettle', (event) => {
	if (event.target && event.target.id === 'locations-panel') {
		updateMapData();
		if (selectedLocationUUID) {
			renderLocationDetails(selectedLocationUUID);
		}
	}
});

document.addEventListener('DOMContentLoaded', () => {
	updateMapData();

	const menuToggle = document.getElementById('panel-menu-toggle');
	const panelMenu = document.getElementById('panel-menu');
	if (menuToggle && panelMenu) {
		menuToggle.addEventListener('click', () => panelMenu.classList.toggle('show'));
		document.addEventListener('click', (evt) => {
			const clickedToggle = menuToggle.contains(evt.target);
			if (!clickedToggle && !panelMenu.contains(evt.target)) {
				panelMenu.classList.remove('show');
			}
		});
	}

	const menuRefresh = document.getElementById('menu-refresh');
	if (menuRefresh) {
		menuRefresh.addEventListener('click', () => {
			panelMenu?.classList.remove('show');
			triggerRefresh();
		});
	}

	const resetBtn = document.getElementById('reset-zoom');
	if (resetBtn) {
		resetBtn.addEventListener('click', () => {
			panelMenu?.classList.remove('show');
			resetMapView();
		});
	}

	const toggle = document.getElementById('toggle-local');
	if (toggle) {
		toggle.addEventListener('change', (e) => {
			useLocalTime = e.target.checked;
			const rows = Array.from(document.querySelectorAll('#locations-panel tbody tr'));
			if (useLocalTime) {
				applyLocalTime(rows);
			} else {
				restoreUTCTimes(rows);
			}
		});
	}

	const quickRange = document.getElementById('date-range-select');
	if (quickRange) {
		const startInput = document.getElementById('start_date');
		const endInput = document.getElementById('end_date');
		const applyQuickRange = async (shouldRefresh = true) => {
			if (!startInput || !endInput) {
				return;
			}
			const selection = quickRange.value;
			if (!selection) {
				return;
			}
			const now = new Date();
			let start = null;
			let end = null;
			const resolveMostRecentRange = async () => {
				const fromLocations = getRecordedRange(mapLocations);
				if (fromLocations) {
					return fromLocations;
				}
				return fetchRecordedRange();
			};
			if (selection === 'today') {
				start = startOfLocalDay(now);
				end = now;
			} else if (selection === 'most-recent') {
				const range = await resolveMostRecentRange();
				if (range?.start) {
					start = range.start;
				}
				if (range?.end) {
					end = range.end;
				}
				if (!start && end) {
					start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
				}
			} else if (selection === 'yesterday') {
				const yesterday = new Date(now);
				yesterday.setDate(yesterday.getDate() - 1);
				start = startOfLocalDay(yesterday);
				end = endOfLocalDay(yesterday);
			} else if (selection === 'last-3-days') {
				const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
				start = startOfLocalDay(startDate);
				end = now;
			}
			startInput.value = start ? formatDateTimeLocal(start) : '';
			endInput.value = end ? formatDateTimeLocal(end) : '';
			if (shouldRefresh) {
				triggerRefresh();
			}
		};
		quickRange.addEventListener('change', () => applyQuickRange(true));
		void applyQuickRange(false);
	}

	const viewToggle = document.getElementById('view-toggle');
	if (viewToggle) {
		const savedView = localStorage.getItem(VIEW_MODE_KEY) || 'both';
		setViewMode(savedView);
		const viewButtons = viewToggle.querySelectorAll('button');
		viewButtons.forEach((btn) => {
			btn.addEventListener('click', () => setViewMode(btn.dataset.view));
		});
	}

	mapElement = document.getElementById('dashboard-map');
	if (mapElement) {
		mapElement.addEventListener('locationselect', (evt) => {
			handleLocationSelection(evt.detail?.uuid);
		});
	}
	initializeMapToggles();

	const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
	applyTheme(savedTheme);
	const themeBtn = document.getElementById('toggle-theme');
	if (themeBtn) {
		themeBtn.addEventListener('click', () => {
			const next = currentTheme === 'light' ? 'dark' : 'light';
			applyTheme(next);
		});
	}

	document.addEventListener('click', (evt) => {
		const row = evt.target.closest('#locations-panel tr[data-uuid]');
		if (!row) {
			return;
		}
		const uuid = row.getAttribute('data-uuid');
		if (uuid) {
			handleLocationSelection(uuid, { scroll: false });
			if (mapElement) {
				mapElement.selected = uuid;
			}
		}
	});

	const detailClose = document.getElementById('location-detail-close');
	if (detailClose) {
		detailClose.addEventListener('click', () => {
			hideDetailPanel();
			renderLocationDetails(null);
			clearSelectionState({ removePinned: true });
		});
	}
});

function setViewMode(mode) {
	currentViewMode = mode;
	const panel = document.querySelector('.panel-main');
	if (!panel) return;
	panel.setAttribute('data-view-mode', mode);
	localStorage.setItem(VIEW_MODE_KEY, mode);
	const buttons = document.querySelectorAll('#view-toggle button');
	buttons.forEach((btn) => {
		btn.classList.toggle('active', btn.dataset.view === mode);
	});
	if (mode !== 'list') {
		pushMapData();
	}
}

function applyLocalTime(rows) {
	rows.forEach((row) => {
		const cell = row.querySelector('[data-recorded]');
		if (!cell) return;
		const ts = cell.getAttribute('data-recorded');
		if (!ts) return;
		const date = new Date(ts);
		if (cell.dataset.original === undefined) {
			cell.dataset.original = cell.innerHTML;
		}
		if (!isNaN(date.getTime())) {
			const datePart = date.toLocaleDateString(undefined, {
				weekday: 'short',
				year: 'numeric',
				month: 'short',
				day: 'numeric',
			});
			const timePart = date.toLocaleTimeString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
			const tz = date
				.toLocaleTimeString(undefined, { timeZoneName: 'short' })
				.replace(/.*\s/, '') || 'local';
			cell.innerHTML = `<div class="meta-date">${datePart}</div><div class="meta-time">${timePart} ${tz}</div>`;
		}
	});
}

function formatDateTimeLocal(date) {
	if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
		return '';
	}
	const pad = (value) => String(value).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getRecordedRange(locations) {
	if (!Array.isArray(locations) || locations.length === 0) {
		return null;
	}
	let start = null;
	let end = null;
	locations.forEach((loc) => {
		const raw = loc?.recorded_at || loc?.recordedAt || loc?.timestamp || loc?.location?.recorded_at || loc?.location?.timestamp;
		if (!raw) {
			return;
		}
		const parsed = new Date(raw);
		if (Number.isNaN(parsed.getTime())) {
			return;
		}
		if (!start || parsed < start) {
			start = parsed;
		}
		if (!end || parsed > end) {
			end = parsed;
		}
	});
	if (!start && !end) {
		return null;
	}
	return { start, end };
}

async function fetchRecordedRange() {
	const panel = document.querySelector('.panel-main');
	const org = panel?.dataset?.org;
	if (!org) {
		return null;
	}
	const params = new URLSearchParams();
	const companySelect = document.getElementById('company');
	const deviceSelect = document.getElementById('device');
	if (companySelect?.value) {
		params.set('company_id', companySelect.value);
	}
	if (deviceSelect?.value) {
		params.set('device_id', deviceSelect.value);
	}
	const suffix = params.toString();
	const url = `/dashboard/${encodeURIComponent(org)}/range${suffix ? `?${suffix}` : ''}`;
	try {
		const response = await fetch(url, { headers: { Accept: 'application/json' } });
		if (!response.ok) {
			return null;
		}
		const data = await response.json();
		const startRaw = data?.start || '';
		const endRaw = data?.end || '';
		const start = startRaw ? new Date(startRaw) : null;
		const end = endRaw ? new Date(endRaw) : null;
		const range = {};
		if (start && !Number.isNaN(start.getTime())) {
			range.start = start;
		}
		if (end && !Number.isNaN(end.getTime())) {
			range.end = end;
		}
		return Object.keys(range).length ? range : null;
	} catch (err) {
		console.warn('range date fetch failed', err);
		return null;
	}
}

function startOfLocalDay(date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 0, 0);
}

function handleLocationSelection(uuid, options = {}) {
	if (!uuid) {
		return;
	}
	selectedLocationUUID = uuid;
	const row = highlightLocationRow(uuid);
	if (row && options.scroll !== false) {
		scrollRowIntoView(row);
	}
	renderLocationDetails(uuid);
}

function highlightLocationRow(uuid) {
	const panel = document.getElementById('locations-panel');
	if (!panel) {
		return null;
	}
	panel.querySelectorAll('tr.selected').forEach((el) => el.classList.remove('selected'));
	if (!uuid) {
		clearPinnedRow(panel);
		return null;
	}
	const rows = panel.querySelectorAll('tr[data-uuid]');
	for (const row of rows) {
		if (row.getAttribute('data-uuid') === uuid) {
			row.classList.add('selected');
			pinRow(row);
			return row;
		}
	}
	clearPinnedRow(panel);
	return null;
}

function scrollRowIntoView(row) {
	if (!row) {
		return;
	}
	const scroll = document.querySelector('#locations-panel .locations-scroll');
	if (scroll) {
		scroll.scrollTo({ top: 0, behavior: 'smooth' });
		return;
	}
	row.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function renderLocationDetails(uuid) {
	const detailPanel = document.getElementById('location-detail-panel');
	const detailHint = document.getElementById('location-detail-hint');
	const detailJson = document.getElementById('location-detail-json');
	if (!detailPanel || !detailHint || !detailJson) {
		return;
	}
	if (!uuid) {
		detailHint.textContent = 'Select a location on the map or list to inspect the raw payload.';
		detailJson.textContent = '{}';
		return;
	}
	showDetailPanel();
	const location = getLocationByUUID(uuid);
	if (!location) {
		detailHint.textContent = 'Details unavailable for the selected location.';
		detailJson.textContent = '{}';
		return;
	}
	detailHint.textContent = `UUID: ${uuid}`;
	detailJson.textContent = JSON.stringify(location, null, 2);
}

function getLocationByUUID(uuid) {
	if (!uuid || !Array.isArray(mapLocations)) {
		return null;
	}
	return mapLocations.find((loc) => typeof loc?.uuid === 'string' && loc.uuid === uuid) || null;
}

function initializeMapToggles() {
	const controls = {
		markers: document.getElementById('toggle-show-markers'),
		polyline: document.getElementById('toggle-show-polyline'),
		geofences: document.getElementById('toggle-show-geofences'),
		clustering: document.getElementById('toggle-use-clustering'),
	};
	if (controls.markers) controls.markers.checked = true;
	if (controls.polyline) controls.polyline.checked = true;
	if (controls.geofences) controls.geofences.checked = true;
	if (controls.clustering) controls.clustering.checked = false;
	const apply = () => {
		const assign = () => {
			if (!mapElement) {
				return;
			}
			if (controls.markers) {
				mapElement.showMarkers = controls.markers.checked;
			}
			if (controls.polyline) {
				mapElement.showPolyline = controls.polyline.checked;
			}
			if (controls.geofences) {
				mapElement.showGeofenceHits = controls.geofences.checked;
			}
			if (controls.clustering) {
				mapElement.useClustering = controls.clustering.checked;
			}
		};
		if (typeof mapElement.showMarkers === 'undefined') {
			customElements.whenDefined('transistorsoft-map').then(assign);
		} else {
			assign();
		}
	};
	Object.values(controls).forEach((input) => input?.addEventListener('change', apply));
	apply();
}

function pinRow(row) {
	if (!row) {
		return;
	}
	const tbody = row.closest('tbody');
	if (!tbody) {
		return;
	}
	const currentPinned = tbody.querySelector('tr.pinned');
	if (currentPinned && currentPinned !== row) {
		currentPinned.classList.remove('pinned');
	}
	row.classList.add('pinned');
	const firstRow = tbody.querySelector('tr');
	if (firstRow && firstRow !== row) {
		tbody.insertBefore(row, firstRow);
	}
}

function clearPinnedRow(panel) {
	if (!panel) {
		panel = document.getElementById('locations-panel');
	}
	if (!panel) {
		return;
	}
	const pinned = panel.querySelector('tr.pinned');
	if (pinned) {
		pinned.classList.remove('pinned');
		if (panel.dataset.removePinned === 'true') {
			pinned.remove();
		}
	}
	panel.removeAttribute('data-remove-pinned');
}

function clearSelectionState(options = {}) {
	const panel = document.getElementById('locations-panel');
	if (panel) {
		panel.querySelectorAll('tr.selected').forEach((el) => el.classList.remove('selected'));
		if (options.removePinned) {
			panel.setAttribute('data-remove-pinned', 'true');
			clearPinnedRow(panel);
		} else {
			clearPinnedRow(panel);
		}
	}
	selectedLocationUUID = null;
	if (mapElement) {
		mapElement.selected = null;
	}
}

function hideDetailPanel() {
	const detailPanel = document.getElementById('location-detail-panel');
	if (detailPanel) {
		detailPanel.classList.add('hidden');
	}
}

function showDetailPanel() {
	const detailPanel = document.getElementById('location-detail-panel');
	if (detailPanel) {
		detailPanel.classList.remove('hidden');
	}
}

function applyTheme(theme) {
	const body = document.body;
	body.classList.toggle('theme-light', theme === 'light');
	currentTheme = theme;
	localStorage.setItem(THEME_KEY, theme);
	const button = document.getElementById('toggle-theme');
	if (button) {
		button.textContent = theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode';
	}
}

function restoreUTCTimes(rows) {
	rows.forEach((row) => {
		const cell = row.querySelector('[data-recorded]');
		if (!cell || cell.dataset.original === undefined) {
			return;
		}
		cell.innerHTML = cell.dataset.original;
	});
}

function triggerRefresh() {
	const panel = document.getElementById('locations-panel');
	if (panel) {
		htmx.trigger(panel, 'refresh');
	}
}

function resetMapView() {
	if (!mapElement) {
		mapElement = document.getElementById('dashboard-map');
	}
	if (mapElement && typeof mapElement.resetView === 'function') {
		mapElement.resetView();
	}
}
