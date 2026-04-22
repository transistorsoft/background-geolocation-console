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
let timelineHasExplicitDateFilters = false;
let timelineQueryParams = null;

function dashboardRouteBase() {
	const panel = document.querySelector('.panel-main');
	const base = panel?.dataset?.routeBase;
	return base && base.trim() ? base.trim() : '/dashboard';
}

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
		const rows = Array.from(event.target.querySelectorAll('tbody tr.location-row'));
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
			const selectedRow = highlightLocationRow(selectedLocationUUID);
			if (!selectedRow) {
				clearSelectionState();
			}
		}
	}
});

document.addEventListener('htmx:afterSettle', (event) => {
	if (event.target && event.target.id === 'locations-panel') {
		updateMapData();
		if (selectedLocationUUID) {
			expandLocationRow(selectedLocationUUID, { scroll: false });
		}
	}
});

function initAdminKeyNav() {
	const input = document.getElementById('company_query');
	const resultsContainer = document.getElementById('admin-company-search-results');
	if (!input || !resultsContainer) return;

	const getLinks = () =>
		Array.from(resultsContainer.querySelectorAll('.admin-search-link'));

	input.addEventListener('keydown', (e) => {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			const links = getLinks();
			if (links.length) links[0].focus();
		} else if (e.key === 'Escape') {
			input.value = '';
			resultsContainer.innerHTML = '';
		}
	});

	resultsContainer.addEventListener('keydown', (e) => {
		const link = e.target.closest('.admin-search-link');
		if (!link) return;

		const links = getLinks();
		const idx = links.indexOf(link);

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (idx < links.length - 1) links[idx + 1].focus();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (idx > 0) links[idx - 1].focus();
			else input.focus();
		} else if (e.key === 'Escape') {
			input.focus();
		}
	});
}

document.addEventListener('DOMContentLoaded', () => {
	updateMapData();
	resetTimelinePanel();
	initAdminKeyNav();

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
			const rows = Array.from(document.querySelectorAll('#locations-panel tbody tr.location-row'));
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
		const loadLastSessionButton = document.getElementById('load-last-session');
		const deviceSelect = document.getElementById('device');
		localizeUTCInputValue(startInput);
		localizeUTCInputValue(endInput);
		normalizeDateTimeInput(startInput);
		normalizeDateTimeInput(endInput);
		const searchParams = new URLSearchParams(window.location.search);
		const hasExplicitDateFilters = searchParams.has('start_date') || searchParams.has('end_date');
		timelineHasExplicitDateFilters = hasExplicitDateFilters;
		const hasSelectedDevice = !!(deviceSelect && (deviceSelect.value || '').trim());
		if (!hasExplicitDateFilters && hasSelectedDevice && startInput && endInput) {
			startInput.value = formatDateTimeLocal(startOfLocalDay(new Date()));
			endInput.value = formatDateTimeLocal(new Date());
			normalizeDateTimeInput(startInput);
			normalizeDateTimeInput(endInput);
			setTimeout(() => triggerRefresh(), 0);
		}
		const defaultDateForInput = (input) => {
			if (!input) {
				return null;
			}
			if (input.id === 'start_date') {
				const endValue = (endInput?.value || '').trim();
				if (endValue) {
					const endDate = new Date(endValue);
					if (!Number.isNaN(endDate.getTime())) {
						return startOfLocalDay(endDate);
					}
				}
				return startOfLocalDay(new Date());
			}
			if (input.id === 'end_date') {
				const startValue = (startInput?.value || '').trim();
				if (startValue) {
					const startDate = new Date(startValue);
					if (!Number.isNaN(startDate.getTime())) {
						return endOfLocalDay(startDate);
					}
				}
				return endOfLocalDay(new Date());
			}
			return null;
		};
		const registerDateInput = (input) => {
			if (!input) {
				return;
			}
			const normalize = () => normalizeDateTimeInput(input);
			const normalizeDelayed = () => setTimeout(normalize, 0);
			const normalizeLater = () => setTimeout(normalize, 50);
			const startPolling = () => {
				if (input._datetimePoll) {
					return;
				}
				input._datetimePoll = setInterval(() => {
					normalizeDateTimeInput(input);
					if (input.value && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(input.value)) {
						clearInterval(input._datetimePoll);
						input._datetimePoll = null;
					}
				}, 150);
			};
			const stopPolling = () => {
				if (input._datetimePoll) {
					clearInterval(input._datetimePoll);
					input._datetimePoll = null;
				}
			};
			input.addEventListener('input', normalizeDelayed);
			input.addEventListener('change', normalizeDelayed);
			input.addEventListener('blur', normalizeDelayed);
			input.addEventListener('focus', normalizeDelayed);
			input.addEventListener('change', normalizeLater);
			input.addEventListener('change', () => {
				timelineHasExplicitDateFilters = !!((startInput?.value || '').trim() || (endInput?.value || '').trim());
			});
			input.addEventListener('blur', normalizeLater);
			input.addEventListener('focus', () => {
				if (!(input.value || '').trim()) {
					const defaultDate = defaultDateForInput(input);
					if (defaultDate) {
						input.value = formatDateTimeLocal(defaultDate);
					}
				}
				startPolling();
			});
			input.addEventListener('blur', stopPolling);

			let _refreshTimer = null;
			const scheduleRefresh = () => {
				clearTimeout(_refreshTimer);
				_refreshTimer = setTimeout(triggerRefresh, 600);
			};
			input.addEventListener('change', scheduleRefresh);
			input.addEventListener('blur', () => {
				if (_refreshTimer !== null) {
					clearTimeout(_refreshTimer);
					_refreshTimer = null;
					triggerRefresh();
				}
			});
		};
		registerDateInput(startInput);
		registerDateInput(endInput);
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
				const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 0, 0, 0, 0);
				start = startOfLocalDay(startDate);
				end = now;
			}
			startInput.value = start ? formatDateTimeLocal(start) : '';
			endInput.value = end ? formatDateTimeLocal(end) : '';
			if (shouldRefresh) {
				triggerRefresh();
			}
		};
		quickRange.addEventListener('change', () => {
			timelineHasExplicitDateFilters = !!quickRange.value;
			applyQuickRange(true);
		});
		void applyQuickRange(false);
		if (loadLastSessionButton) {
			loadLastSessionButton.addEventListener('click', async () => {
				const panel = document.getElementById('locations-panel');
				if (panel) {
					htmx.trigger(panel, 'htmx:abort');
				}
				loadLastSessionButton.disabled = true;
				loadLastSessionButton.textContent = 'Loading...';
				try {
					const session = await fetchLatestSessionRange();
					startInput.value = session?.start ? formatDateTimeLocal(session.start) : '';
					endInput.value = session?.end ? formatDateTimeLocal(session.end) : '';
					timelineHasExplicitDateFilters = !!(startInput.value || endInput.value);
					normalizeDateTimeInput(startInput);
					normalizeDateTimeInput(endInput);
					quickRange.value = '';
					triggerRefresh();
				} catch (err) {
					console.warn('latest session fetch failed', err);
				} finally {
					loadLastSessionButton.disabled = false;
					loadLastSessionButton.textContent = 'Load Last Session';
				}
			});
		}
	}

	document.addEventListener('htmx:configRequest', (event) => {
		const params = event.detail?.parameters;
		if (!params) {
			return;
		}
		const startRaw = typeof params.start_date === 'string' ? params.start_date.trim() : '';
		if (startRaw) {
			const parsed = new Date(startRaw);
			if (!Number.isNaN(parsed.getTime())) {
				params.start_date = formatDateTimeUTCInput(parsed);
			}
		}
		const endRaw = typeof params.end_date === 'string' ? params.end_date.trim() : '';
		if (endRaw) {
			const parsed = new Date(endRaw);
			if (!Number.isNaN(parsed.getTime())) {
				params.end_date = formatDateTimeUTCInput(parsed);
			}
		}
	});

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

	const timelineButton = document.getElementById('generate-timeline');
	if (timelineButton) {
		timelineButton.addEventListener('click', async () => {
			timelineButton.disabled = true;
			setTimelineStatus('Generating timeline...');
			try {
				timelineQueryParams = new URLSearchParams(buildDashboardQueryParams());
				const data = await fetchTimelineData();
				renderTimelinePanel(data);
			} catch (err) {
				console.warn('timeline fetch failed', err);
				setTimelineStatus('Unable to generate the timeline for the current selection.');
			} finally {
				timelineButton.disabled = false;
			}
		});
	}

	const timelineClose = document.getElementById('timeline-close');
	if (timelineClose) {
		timelineClose.addEventListener('click', () => {
			resetTimelinePanel();
		});
	}

	const timelineChart = document.getElementById('timeline-chart-wrap');
	if (timelineChart) {
		timelineChart.addEventListener('click', (event) => {
			const bar = event.target.closest('.timeline-bar[data-start][data-end]');
			if (!bar) {
				return;
			}
			applyTimelineSessionSelection(bar.dataset.start, bar.dataset.end);
		});
		timelineChart.addEventListener('keydown', (event) => {
			if (event.key !== 'Enter' && event.key !== ' ') {
				return;
			}
			const bar = event.target.closest('.timeline-bar[data-start][data-end]');
			if (!bar) {
				return;
			}
			event.preventDefault();
			applyTimelineSessionSelection(bar.dataset.start, bar.dataset.end);
		});
	}

	document.addEventListener('click', (evt) => {
		const closeButton = evt.target.closest('#locations-panel .inline-detail-close');
		if (closeButton) {
			const detailRow = closeButton.closest('.location-detail-row');
			if (!detailRow) {
				return;
			}
			collapseLocationRow(detailRow.getAttribute('data-detail-for'));
			clearSelectionState();
			return;
		}
		const uuidButton = evt.target.closest('#locations-panel .uuid-link');
		const row = evt.target.closest('#locations-panel tr.location-row[data-uuid], #locations-panel tr.location-row[data-id]');
		if (!row) {
			return;
		}
		const uuid = (uuidButton?.getAttribute('data-uuid') || row.getAttribute('data-uuid') || '').trim();
		const id = (uuidButton?.getAttribute('data-id') || row.getAttribute('data-id') || '').trim();
		const key = uuid || id;
		if (key) {
			handleLocationSelection(key, { scroll: false });
			if (mapElement) {
				mapElement.selected = key;
			}
		}
	});
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

function formatDateTimeUTCInput(date) {
	if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
		return '';
	}
	const pad = (value) => String(value).padStart(2, '0');
	return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

function parseUTCInputValue(value) {
	const raw = (value || '').trim();
	if (!raw) {
		return null;
	}
	const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
	if (!match) {
		return null;
	}
	const [, year, month, day, hour, minute] = match;
	return new Date(Date.UTC(
		Number(year),
		Number(month) - 1,
		Number(day),
		Number(hour),
		Number(minute),
		0,
		0,
	));
}

function localizeUTCInputValue(input) {
	if (!input) {
		return;
	}
	const parsed = parseUTCInputValue(input.value);
	if (!parsed) {
		return;
	}
	input.value = formatDateTimeLocal(parsed);
}

function normalizeDateBoundary(input, datePart) {
	if (!input || !datePart) {
		return;
	}
	if (input.id === 'end_date') {
		input.value = `${datePart}T23:59`;
		return;
	}
	input.value = `${datePart}T00:00`;
}

function normalizeDateTimeInput(input) {
	if (!input) {
		return;
	}
	const raw = (input.value || '').trim();
	if (!raw) {
		if (input.valueAsDate instanceof Date && !Number.isNaN(input.valueAsDate.getTime())) {
			input.value = formatDateTimeLocal(input.valueAsDate);
		}
		return;
	}
	if (raw.includes('--')) {
		const datePart = raw.split('T')[0];
		if (datePart) {
			normalizeDateBoundary(input, datePart);
		}
		return;
	}
	if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
		normalizeDateBoundary(input, raw);
		return;
	}
	if (/^\d{4}-\d{2}-\d{2}T\d{2}$/.test(raw)) {
		if (input.id === 'end_date') {
			input.value = `${raw}:59`;
			return;
		}
		input.value = `${raw}:00`;
		return;
	}
	if (/^\d{4}-\d{2}-\d{2}T$/.test(raw)) {
		if (input.id === 'end_date') {
			input.value = `${raw}23:59`;
			return;
		}
		input.value = `${raw}00:00`;
	}
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

async function fetchLatestSessionRange() {
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
	const url = `${dashboardRouteBase()}/${encodeURIComponent(org)}/session/latest${suffix ? `?${suffix}` : ''}`;
	const response = await fetch(url, { headers: { Accept: 'application/json' } });
	if (!response.ok) {
		throw new Error(`session request failed: ${response.status}`);
	}
	const data = await response.json();
	const start = data?.start ? new Date(data.start) : null;
	const end = data?.end ? new Date(data.end) : null;
	if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) {
		return null;
	}
	return { start, end, count: data?.count || 0 };
}

async function fetchTimelineData() {
	const panel = document.querySelector('.panel-main');
	const org = panel?.dataset?.org;
	if (!org) {
		return null;
	}
	const params = timelineQueryParams ? new URLSearchParams(timelineQueryParams) : buildDashboardQueryParams();
	const suffix = params.toString();
	const url = `${dashboardRouteBase()}/${encodeURIComponent(org)}/timeline${suffix ? `?${suffix}` : ''}`;
	const response = await fetch(url, { headers: { Accept: 'application/json' } });
	if (!response.ok) {
		throw new Error(`timeline request failed: ${response.status}`);
	}
	return response.json();
}

function buildDashboardQueryParams() {
	const params = new URLSearchParams();
	const companySelect = document.getElementById('company');
	const deviceSelect = document.getElementById('device');
	const startInput = document.getElementById('start_date');
	const endInput = document.getElementById('end_date');
	if (companySelect?.value) {
		params.set('company_id', companySelect.value);
	}
	if (deviceSelect?.value) {
		params.set('device_id', deviceSelect.value);
	}
	if (!timelineHasExplicitDateFilters) {
		return params;
	}
	const startRaw = (startInput?.value || '').trim();
	if (startRaw) {
		const parsed = new Date(startRaw);
		if (!Number.isNaN(parsed.getTime())) {
			params.set('start_date', formatDateTimeUTCInput(parsed));
		}
	}
	const endRaw = (endInput?.value || '').trim();
	if (endRaw) {
		const parsed = new Date(endRaw);
		if (!Number.isNaN(parsed.getTime())) {
			params.set('end_date', formatDateTimeUTCInput(parsed));
		}
	}
	return params;
}

function buildLocationsRequestParams(overrides = {}) {
	const params = new URLSearchParams();
	const companySelect = document.getElementById('company');
	const deviceSelect = document.getElementById('device');
	const startInput = document.getElementById('start_date');
	const endInput = document.getElementById('end_date');
	const watchModeInput = document.querySelector('#filters-form input[name="watch_mode"]');
	if (companySelect?.value) {
		params.set('company_id', companySelect.value);
	}
	if (deviceSelect?.value) {
		params.set('device_id', deviceSelect.value);
	}
	const startRaw = (startInput?.value || '').trim();
	if (startRaw) {
		const parsed = new Date(startRaw);
		if (!Number.isNaN(parsed.getTime())) {
			params.set('start_date', formatDateTimeUTCInput(parsed));
		}
	}
	const endRaw = (endInput?.value || '').trim();
	if (endRaw) {
		const parsed = new Date(endRaw);
		if (!Number.isNaN(parsed.getTime())) {
			params.set('end_date', formatDateTimeUTCInput(parsed));
		}
	}
	if (watchModeInput?.checked) {
		params.set('watch_mode', 'true');
	}
	Object.entries(overrides).forEach(([key, value]) => {
		if (value === null || value === undefined || value === '') {
			params.delete(key);
			return;
		}
		params.set(key, value);
	});
	return params;
}

function refreshLocationsPanel(overrides = {}, options = {}) {
	const panel = document.getElementById('locations-panel');
	if (!panel) {
		return;
	}
	if (options.resetTimeline !== false) {
		resetTimelinePanel();
	}
	const baseURL = (panel.getAttribute('hx-get') || '').split('?')[0];
	const params = buildLocationsRequestParams(overrides);
	const query = params.toString();
	const url = query ? `${baseURL}?${query}` : baseURL;
	htmx.ajax('GET', url, { target: '#locations-panel', swap: 'innerHTML' });
}

function setTimelineFormRange(start, end) {
	const startInput = document.getElementById('start_date');
	const endInput = document.getElementById('end_date');
	const quickRange = document.getElementById('date-range-select');
	if (!startInput || !endInput) {
		return false;
	}
	startInput.value = start ? formatDateTimeLocal(start) : '';
	endInput.value = end ? formatDateTimeLocal(end) : '';
	normalizeDateTimeInput(startInput);
	normalizeDateTimeInput(endInput);
	if (quickRange) {
		quickRange.value = '';
	}
	return true;
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
	const url = `${dashboardRouteBase()}/${encodeURIComponent(org)}/range${suffix ? `?${suffix}` : ''}`;
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
	expandLocationRow(uuid, options);
}

function highlightLocationRow(key) {
	const panel = document.getElementById('locations-panel');
	if (!panel) {
		return null;
	}
	panel.querySelectorAll('tr.location-row.selected').forEach((el) => el.classList.remove('selected'));
	if (!key) {
		return null;
	}
	const rows = panel.querySelectorAll('tr.location-row[data-uuid], tr.location-row[data-id]');
	for (const row of rows) {
		const rowKey = row.getAttribute('data-uuid') || row.getAttribute('data-id');
		if (rowKey === key) {
			row.classList.add('selected');
			return row;
		}
	}
	return null;
}

function scrollRowIntoView(row) {
	if (!row) {
		return;
	}
	row.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function expandLocationRow(key, options = {}) {
	const panel = document.getElementById('locations-panel');
	if (!panel) {
		return null;
	}
	const detailRows = panel.querySelectorAll('.location-detail-row');
	let target = null;
	detailRows.forEach((row) => {
		const isTarget = row.getAttribute('data-detail-for') === key;
		row.classList.toggle('hidden', !isTarget);
		if (isTarget) {
			target = row;
		}
	});
	if (!key) {
		return null;
	}
	if (target && options.scroll !== false) {
		target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}
	return target;
}

function collapseLocationRow(key) {
	if (!key) {
		return;
	}
	const panel = document.getElementById('locations-panel');
	panel?.querySelectorAll('.location-detail-row').forEach((row) => {
		if (row.getAttribute('data-detail-for') === key) {
			row.classList.add('hidden');
		}
	});
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

function resetTimelinePanel() {
	const panel = document.getElementById('timeline-panel');
	const content = document.getElementById('timeline-content');
	const close = document.getElementById('timeline-close');
	const summary = document.getElementById('timeline-summary');
	const chart = document.getElementById('timeline-chart-wrap');
	if (!panel || !content || !close || !summary || !chart) {
		return;
	}
	panel.classList.add('is-collapsed');
	content.classList.add('hidden');
	close.classList.add('hidden');
	summary.textContent = 'Generate a timeline to inspect grouped sessions across the current selection.';
	chart.innerHTML = '';
}

function setTimelineStatus(message) {
	const panel = document.getElementById('timeline-panel');
	const content = document.getElementById('timeline-content');
	const close = document.getElementById('timeline-close');
	const chart = document.getElementById('timeline-chart-wrap');
	if (!panel || !content || !close || !chart) {
		return;
	}
	panel.classList.remove('is-collapsed');
	content.classList.remove('hidden');
	close.classList.remove('hidden');
	chart.innerHTML = `<div class="timeline-status">${message}</div>`;
}

function renderTimelinePanel(data) {
	const panel = document.getElementById('timeline-panel');
	const content = document.getElementById('timeline-content');
	const close = document.getElementById('timeline-close');
	const summary = document.getElementById('timeline-summary');
	const chart = document.getElementById('timeline-chart-wrap');
	if (!panel || !content || !close || !summary || !chart) {
		return;
	}
	panel.classList.remove('is-collapsed');
	content.classList.remove('hidden');
	close.classList.remove('hidden');
	const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
	const totalPoints = Number(data?.total_points || 0);
	const sessionCount = Number(data?.session_count || sessions.length || 0);
	const start = parseTimelineDate(data?.start);
	const end = parseTimelineDate(data?.end);
	if (!sessions.length) {
		summary.textContent = totalPoints > 0
			? `No grouped sessions could be identified across ${totalPoints} selected points.`
			: 'No location data matches the current selection.';
		chart.innerHTML = '<div class="timeline-empty-state">No timeline data is available for the current company, device, and date range.</div>';
		return;
	}
	summary.textContent = `${sessionCount} ${sessionCount === 1 ? 'session' : 'sessions'} across ${totalPoints} points from ${formatTimelineDate(start)} to ${formatTimelineDate(end)}.`;
	chart.innerHTML = buildTimelineChartMarkup(sessions, start, end);
}

function applyTimelineSessionSelection(startValue, endValue) {
	const start = parseTimelineDate(startValue);
	const end = parseTimelineDate(endValue);
	if (!start || !end) {
		return;
	}
	if (!timelineQueryParams) {
		timelineQueryParams = new URLSearchParams(buildDashboardQueryParams());
	}
	if (!setTimelineFormRange(start, end)) {
		return;
	}
	refreshLocationsPanel({}, { resetTimeline: false });
}

function buildTimelineChartMarkup(sessions, start, end) {
	const parsedSessions = sessions.map((session) => {
		const sessionStart = parseTimelineDate(session.start);
		const sessionEnd = parseTimelineDate(session.end);
		const count = Number(session.count || 0);
		return {
			start: sessionStart,
			end: sessionEnd,
			count,
			durationMinutes: Number(session.duration_minutes || 0),
		};
	}).filter((session) => session.start && session.end && session.count >= 0);
	if (!parsedSessions.length) {
		return '<div class="timeline-empty-state">No session groups were produced for this selection.</div>';
	}
	const chartWidth = 960;
	const chartHeight = 280;
	const margin = { top: 20, right: 24, bottom: 54, left: 56 };
	const plotWidth = chartWidth - margin.left - margin.right;
	const plotHeight = chartHeight - margin.top - margin.bottom;
	const maxCount = Math.max(...parsedSessions.map((session) => session.count), 1);
	const minTime = start?.getTime() ?? parsedSessions[0].start.getTime();
	const maxTime = end?.getTime() ?? parsedSessions[parsedSessions.length - 1].end.getTime();
	const span = Math.max(maxTime - minTime, 60 * 60 * 1000);
	const barWidth = Math.max(12, Math.min(36, plotWidth / Math.max(parsedSessions.length, 1) * 0.55));
	const yTicks = 4;
	const xTicks = 5;
	const lines = [];
	const labels = [];
	const bars = [];

	for (let i = 0; i <= yTicks; i++) {
		const value = Math.round((maxCount / yTicks) * i);
		const y = margin.top + plotHeight - (plotHeight * i / yTicks);
		lines.push(`<line class="timeline-grid" x1="${margin.left}" y1="${y}" x2="${chartWidth - margin.right}" y2="${y}"></line>`);
		labels.push(`<text class="timeline-value-label" x="${margin.left - 10}" y="${y + 4}" text-anchor="end">${value}</text>`);
	}

	for (let i = 0; i <= xTicks; i++) {
		const ratio = i / xTicks;
		const x = margin.left + plotWidth * ratio;
		const tickTime = new Date(minTime + span * ratio);
		labels.push(`<text class="timeline-axis-label" x="${x}" y="${chartHeight - 18}" text-anchor="middle">${formatTimelineTick(tickTime, span)}</text>`);
	}

	parsedSessions.forEach((session) => {
		const ratio = span === 0 ? 0.5 : (session.start.getTime() - minTime) / span;
		const x = margin.left + plotWidth * ratio - barWidth / 2;
		const height = maxCount === 0 ? 0 : (session.count / maxCount) * plotHeight;
		const y = margin.top + plotHeight - height;
		const title = `${formatTimelineDate(session.start)} - ${formatTimelineDate(session.end)} | ${session.count} points | ${session.durationMinutes} min`;
		bars.push(
			`<rect class="timeline-bar" x="${clampNumber(x, margin.left, chartWidth - margin.right - barWidth)}" y="${y}" width="${barWidth}" height="${Math.max(height, 2)}" rx="4" ry="4" tabindex="0" role="button" data-start="${session.start.toISOString()}" data-end="${session.end.toISOString()}" data-count="${session.count}" aria-label="Load ${session.count} points from ${formatTimelineDate(session.start)} to ${formatTimelineDate(session.end)}"><title>${title}</title></rect>`,
		);
	});

	return `
		<svg class="timeline-svg" viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="Session timeline chart">
			${lines.join('')}
			<line class="timeline-axis" x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${chartWidth - margin.right}" y2="${margin.top + plotHeight}"></line>
			<line class="timeline-axis" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotHeight}"></line>
			${bars.join('')}
			${labels.join('')}
		</svg>
		<p class="timeline-caption">Each bar represents one grouped session. Click a bar to load that session into the current map and list view. Sessions are split when the gap between consecutive points exceeds 30 minutes.</p>
	`;
}

function parseTimelineDate(value) {
	if (!value) {
		return null;
	}
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTimelineDate(value) {
	if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
		return 'n/a';
	}
	return value.toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function formatTimelineTick(value, span) {
	if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
		return '';
	}
	if (span <= 2 * 24 * 60 * 60 * 1000) {
		return value.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
	}
	if (span <= 45 * 24 * 60 * 60 * 1000) {
		return value.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}
	return value.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
}

function clampNumber(value, min, max) {
	if (!Number.isFinite(value)) {
		return min;
	}
	return Math.min(Math.max(value, min), max);
}

function clearSelectionState() {
	const panel = document.getElementById('locations-panel');
	if (panel) {
		panel.querySelectorAll('tr.location-row.selected').forEach((el) => el.classList.remove('selected'));
		panel.querySelectorAll('.location-detail-row').forEach((el) => el.classList.add('hidden'));
	}
	selectedLocationUUID = null;
	if (mapElement) {
		mapElement.selected = null;
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
	timelineQueryParams = null;
	refreshLocationsPanel();
}

function resetMapView() {
	if (!mapElement) {
		mapElement = document.getElementById('dashboard-map');
	}
	if (mapElement && typeof mapElement.resetView === 'function') {
		mapElement.resetView();
	}
}
