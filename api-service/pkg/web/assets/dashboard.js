const VIEW_MODE_KEY = 'dashboard:view-mode';
const THEME_KEY = 'dashboard:theme';
const AUTH_STORAGE_KEY = 'transistorsoft-settings#auth';
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

	const clearBtn = document.getElementById('clear-locations');
	if (clearBtn) {
		clearBtn.addEventListener('click', () => {
			panelMenu?.classList.remove('show');
			deleteAllLocations();
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
	initLoginPanel();

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
	if (controls.markers) controls.markers.checked = false;
	if (controls.polyline) controls.polyline.checked = false;
	if (controls.geofences) controls.geofences.checked = false;
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

function getSelectedCompanyId() {
	const panel = document.querySelector('.panel-main');
	if (!panel) {
		return '';
	}
	return panel.getAttribute('data-company-id') || '';
}

function getStoredAuth() {
	try {
		const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
		if (!raw) {
			return null;
		}
		return JSON.parse(raw);
	} catch (err) {
		return null;
	}
}

function getAuthToken() {
	const stored = getStoredAuth();
	return stored?.accessToken || '';
}

function resetMapView() {
	if (!mapElement) {
		mapElement = document.getElementById('dashboard-map');
	}
	if (mapElement && typeof mapElement.resetView === 'function') {
		mapElement.resetView();
	}
}

function initLoginPanel() {
	const form = document.getElementById('login-form');
	const logoutBtn = document.getElementById('logout-button');
	if (!form || !logoutBtn) {
		return;
	}
	updateLoginStatus();
	form.addEventListener('submit', async (evt) => {
		evt.preventDefault();
		const username = document.getElementById('login-username')?.value.trim();
		const passwordField = document.getElementById('login-password');
		const password = passwordField?.value || '';
		if (!username || !password) {
			updateLoginStatus('Username and password are required.');
			return;
		}
		setLoginBusy(true);
		try {
			const resp = await fetch('/api/site/auth', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ login: username, password }),
			});
			const data = await resp.json().catch(() => ({}));
			if (!resp.ok || !data.access_token) {
				throw new Error(data.error || 'Login failed');
			}
			setStoredAuth({
				accessToken: data.access_token,
				org: data.org || username,
				isAdmin: Boolean(data.isAdmin),
				obtainedAt: Date.now(),
			});
			updateLoginStatus();
		} catch (err) {
			updateLoginStatus(err.message || 'Login failed');
		} finally {
			if (passwordField) {
				passwordField.value = '';
			}
			setLoginBusy(false);
		}
	});
	logoutBtn.addEventListener('click', () => {
		window.localStorage.removeItem(AUTH_STORAGE_KEY);
		updateLoginStatus('Signed out');
	});
}

function setStoredAuth(payload) {
	try {
		window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
	} catch (err) {
		console.warn('Unable to store auth token', err);
	}
}

function setLoginBusy(isBusy) {
	const form = document.getElementById('login-form');
	const logoutBtn = document.getElementById('logout-button');
	const stored = getStoredAuth();
	if (form) {
		const button = form.querySelector('button[type="submit"]');
		if (button) {
			button.disabled = isBusy;
			button.textContent = isBusy ? 'Signing in…' : 'Sign in';
		}
		[...form.querySelectorAll('input')].forEach((input) => {
			input.disabled = isBusy || Boolean(stored?.accessToken);
		});
	}
	if (logoutBtn) {
		logoutBtn.disabled = isBusy;
	}
}

function updateLoginButtons() {
	const form = document.getElementById('login-form');
	const logoutBtn = document.getElementById('logout-button');
	const stored = getStoredAuth();
	const hasAuth = Boolean(stored?.accessToken);
	if (form) {
		form.style.display = hasAuth ? 'none' : 'flex';
	}
	if (logoutBtn) {
		logoutBtn.style.display = hasAuth ? '' : 'none';
		logoutBtn.disabled = !hasAuth;
	}
}

function updateLoginStatus(message) {
	const statusEl = document.getElementById('login-status');
	const logoutBtn = document.getElementById('logout-button');
	const stored = getStoredAuth();
	if (!statusEl) {
		return;
	}
	if (stored?.accessToken && !message) {
		const org = stored.org || 'dashboard';
		statusEl.textContent = `${org} logged in${stored.isAdmin ? ' (admin)' : ''}`;
	} else {
		statusEl.textContent = message || 'Not authenticated';
	}
	updateLoginButtons();
}

async function deleteAllLocations() {
	if (!window.confirm('Delete all locations for the selected company? This cannot be undone.')) {
		return;
	}
	const token = getAuthToken();
	if (!token) {
		window.alert('Missing auth token. Please re-authenticate.');
		return;
	}
	const companyId = getSelectedCompanyId();
	const params = companyId ? `?company_id=${companyId}` : '';
	const resp = await fetch(`/api/site/locations${params}`, {
		method: 'DELETE',
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
	if (!resp.ok) {
		window.alert('Failed to delete locations');
		return;
	}
	const panel = document.getElementById('locations-panel');
	if (panel) {
		htmx.trigger(panel, 'refresh');
	}
}
