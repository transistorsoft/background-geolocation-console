const VIEW_MODE_KEY = 'dashboard:view-mode';
const THEME_KEY = 'dashboard:theme';
let seenRows = new Set();
let initializedRows = false;
let currentViewMode = 'both';
let mapLocations = [];
let mapElement = null;
let selectedLocationUUID = null;
let currentTheme = 'dark';
let timelineHasExplicitDateFilters = false;
let timelineQueryParams = null;

// Called by the HTMX poll condition in hx-trigger="every Xs [isWatchMode()]".
// Returning false suppresses the automatic poll so the list and map are never
// cleared while the user is reviewing a static selection.
window.isWatchMode = () => !!document.querySelector('#filters-form input[name="watch_mode"]')?.checked;

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

		applyLocalTime(rows);

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

	applyLocalTime(Array.from(document.querySelectorAll('#locations-panel tbody tr.location-row')));

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
			input.addEventListener('focus', startPolling);
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
				// Mirror the :59Z suffix used in buildLocationsRequestParams so HTMX-native
				// requests (hx-include form, watch-mode poll) also include the full last minute.
				params.end_date = `${formatDateTimeUTCInput(parsed)}:59Z`;
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
	setupScopeForm();
	setupDownloadButton();
	setupUUIDSearch();
	focusUUIDFromQuery();

	// Show/hide the watch-mode badge whenever the checkbox changes.
	const watchModeBadge = document.getElementById('watch-mode-badge');
	const watchModeCheckbox = document.querySelector('#filters-form input[name="watch_mode"]');
	if (watchModeBadge && watchModeCheckbox) {
		const syncBadge = () => {
			watchModeBadge.style.display = watchModeCheckbox.checked ? 'inline-flex' : 'none';
		};
		syncBadge();
		watchModeCheckbox.addEventListener('change', syncBadge);
	}

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
		const markTimelineSelection = (session) => {
			const svg = session.closest('svg');
			const scope = svg || timelineChart;
			scope.querySelectorAll('.timeline-session.is-selected').forEach((el) => {
				if (el !== session) el.classList.remove('is-selected');
			});
			session.classList.add('is-selected');
		};
		timelineChart.addEventListener('click', (event) => {
			const session = event.target.closest('.timeline-session[data-start][data-end]');
			if (!session) {
				return;
			}
			markTimelineSelection(session);
			applyTimelineSessionSelection(session.dataset.start, session.dataset.end);
		});
		timelineChart.addEventListener('keydown', (event) => {
			if (event.key !== 'Enter' && event.key !== ' ') {
				return;
			}
			const session = event.target.closest('.timeline-session[data-start][data-end]');
			if (!session) {
				return;
			}
			event.preventDefault();
			markTimelineSelection(session);
			applyTimelineSessionSelection(session.dataset.start, session.dataset.end);
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
			// Append :59Z so the server receives a full RFC3339 timestamp capped at the
			// end of the chosen minute. Without this, the server parses "HH:MM" as HH:MM:00
			// exactly, which excludes any location recorded at HH:MM:01–HH:MM:59.
			params.set('end_date', `${formatDateTimeUTCInput(parsed)}:59Z`);
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
	// The map and its toggle checkboxes only exist when an org has been
	// selected. Bail before touching mapElement so the empty initial page
	// (where setupUUIDSearch now also lives) does not throw.
	if (!mapElement) {
		return;
	}
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
	chart.innerHTML = buildTimelineChartMarkup(sessions);
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

function buildTimelineChartMarkup(sessions) {
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

	// Layout constants
	const chartWidth = 960;
	const chartHeight = 380;
	const margin = { top: 28, right: 28, bottom: 48, left: 64 };
	const plotWidth = chartWidth - margin.left - margin.right;
	const plotHeight = chartHeight - margin.top - margin.bottom;
	const minBarH = 8;

	// Group sessions by calendar date (local time) using session start
	const dateKey = (d) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	const dateLabel = (d) =>
		d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

	const dateMap = new Map();
	parsedSessions.forEach((s) => {
		const key = dateKey(s.start);
		if (!dateMap.has(key)) dateMap.set(key, s.start);
	});
	const sortedDates = Array.from(dateMap.entries()).sort(([a], [b]) => a.localeCompare(b));
	const colCount = sortedDates.length;
	const colIndexMap = new Map(sortedDates.map(([key], i) => [key, i]));
	const colWidth = plotWidth / Math.max(colCount, 1);

	// Assign each session a lane within its column so sessions on the same day fan out horizontally
	const colLaneMap = new Map(); // dateKey → sessions sorted by start time
	parsedSessions.forEach((s) => {
		const key = dateKey(s.start);
		if (!colLaneMap.has(key)) colLaneMap.set(key, []);
		colLaneMap.get(key).push(s);
	});
	// Sort each column's sessions by start time and stamp laneIdx / laneCount
	colLaneMap.forEach((group) => {
		group.sort((a, b) => a.start - b.start);
		group.forEach((s, i) => {
			s.laneIdx = i;
			s.laneCount = group.length;
		});
	});

	// Y-axis: time of day — 00:00 at top, 24:00 at bottom
	const minuteOfDay = (d) => d.getHours() * 60 + d.getMinutes();
	const yForMinute = (min) => margin.top + (min / 1440) * plotHeight;

	// Abbreviate large counts
	const pillH = 18;
	const countLabel = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

	const gridLines = [];
	const yLabels = [];
	const xLabels = [];
	const bars = [];

	// Y-axis grid lines and labels every 4 hours
	for (let h = 0; h <= 24; h += 4) {
		const y = yForMinute(h * 60);
		gridLines.push(
			`<line class="timeline-grid" x1="${margin.left}" y1="${y}" x2="${chartWidth - margin.right}" y2="${y}"></line>`,
		);
		const label = h === 24 ? '00:00' : `${String(h).padStart(2, '0')}:00`;
		yLabels.push(
			`<text class="timeline-value-label" x="${margin.left - 10}" y="${y + 4}" text-anchor="end">${label}</text>`,
		);
	}

	// X-axis: one column per unique calendar date
	sortedDates.forEach(([, date], i) => {
		const x = margin.left + (i + 0.5) * colWidth;
		xLabels.push(
			`<text class="timeline-axis-label" x="${x}" y="${chartHeight - 12}" text-anchor="middle">${dateLabel(date)}</text>`,
		);
		if (i > 0) {
			const xSep = margin.left + i * colWidth;
			gridLines.push(
				`<line class="timeline-col-separator" x1="${xSep}" y1="${margin.top}" x2="${xSep}" y2="${margin.top + plotHeight}"></line>`,
			);
		}
	});

	// Vertical bar spanning session start → end time on the Y-axis.
	// Each session is placed in its own lane within the day column so no two sessions share the same x.
	parsedSessions.forEach((session) => {
		const colIdx = colIndexMap.get(dateKey(session.start));
		if (colIdx === undefined) return;

		const laneCount = session.laneCount || 1;
		const laneIdx = session.laneIdx || 0;
		// Each lane is an equal slice of the column width
		const laneWidth = colWidth / laneCount;
		// Centre of this lane
		const cx = margin.left + colIdx * colWidth + (laneIdx + 0.5) * laneWidth;

		// Element widths scaled to lane width, with sensible min/max
		const barW = Math.max(4, Math.min(10, laneWidth * 0.25));
		const hitW = Math.max(20, Math.min(48, laneWidth * 0.85));
		const pillW = Math.max(28, Math.min(52, laneWidth * 0.70));

		const yTop = clampNumber(yForMinute(minuteOfDay(session.start)), margin.top, margin.top + plotHeight - minBarH);
		const yRaw = yForMinute(minuteOfDay(session.end));
		const barH = Math.max(minBarH, yRaw - yTop);
		const midY = yTop + barH / 2;

		// Hit rect must always cover the pill (pillH + 8px padding) even when the bar is tiny
		const hitH = Math.max(barH, pillH + 8);
		const hitY = clampNumber(midY - hitH / 2, margin.top, margin.top + plotHeight - hitH);

		const label = countLabel(session.count);
		const title = `${formatTimelineDate(session.start)} – ${formatTimelineDate(session.end)} | ${session.count} points | ${session.durationMinutes} min`;

		bars.push(
			`<g class="timeline-session" tabindex="0" role="button" data-start="${session.start.toISOString()}" data-end="${session.end.toISOString()}" data-count="${session.count}" aria-label="Load ${session.count} points from ${formatTimelineDate(session.start)} to ${formatTimelineDate(session.end)}">
				<title>${title}</title>
				<rect class="timeline-session-hit" x="${cx - hitW / 2}" y="${hitY}" width="${hitW}" height="${hitH}"></rect>
				<rect class="timeline-session-bar" x="${cx - barW / 2}" y="${yTop}" width="${barW}" height="${barH}" rx="3" ry="3"></rect>
				<rect class="timeline-session-pill" x="${cx - pillW / 2}" y="${midY - pillH / 2}" width="${pillW}" height="${pillH}" rx="${pillH / 2}" ry="${pillH / 2}"></rect>
				<text class="timeline-session-count" x="${cx}" y="${midY + 4}" text-anchor="middle">${label}</text>
			</g>`,
		);
	});

	return `
		<svg class="timeline-svg" viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="Session timeline chart">
			${gridLines.join('')}
			<line class="timeline-axis" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotHeight}"></line>
			<line class="timeline-axis" x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${chartWidth - margin.right}" y2="${margin.top + plotHeight}"></line>
			${bars.join('')}
			${yLabels.join('')}
			${xLabels.join('')}
		</svg>
		<p class="timeline-caption">Each bar spans the start to end of a session; the Y-axis is time of day, columns are calendar days. Click or press Enter to load that session. Sessions are split when the gap between points exceeds 30 minutes.</p>
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

function triggerRefresh() {
	timelineQueryParams = null;
	refreshLocationsPanel();
}

// setupUUIDSearch wires the left-panel UUID lookup form. On submit it asks
// the admin API to locate a single record, then navigates to the dashboard
// URL for that record's device + a UTC day-bracket containing recorded_at,
// with focus_uuid set so the matching row auto-expands once the page loads.
function setupUUIDSearch() {
	const form = document.getElementById('uuid-search-form');
	if (!form) return;
	const input = document.getElementById('uuid-search-input');
	const button = document.getElementById('uuid-search-button');
	const status = document.getElementById('uuid-search-status');
	const setStatus = (msg, kind) => {
		if (!status) return;
		status.textContent = msg || '';
		status.classList.remove('is-error', 'is-success');
		if (kind) status.classList.add(`is-${kind}`);
	};
	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		const uuid = (input?.value || '').trim();
		if (!uuid) {
			setStatus('Paste a UUID first.', 'error');
			input?.focus();
			return;
		}
		const routeBase = dashboardRouteBase();
		button.disabled = true;
		setStatus('Searching…');
		try {
			const params = new URLSearchParams({ uuid });
			const res = await fetch(`${routeBase}/api/locations/find?${params}`, {
				headers: { Accept: 'application/json' },
				credentials: 'same-origin',
			});
			if (res.status === 404) {
				setStatus('No location with that UUID in this org.', 'error');
				return;
			}
			if (!res.ok) {
				setStatus('Search failed.', 'error');
				return;
			}
			const data = await res.json();
			const recordedAtRaw = data?.recorded_at || '';
			const deviceID = data?.device_id;
			const companyToken = (data?.company_token || '').trim();
			if (!deviceID || !recordedAtRaw || !companyToken) {
				setStatus('Match found but missing device, company, or timestamp.', 'error');
				return;
			}
			const recorded = new Date(recordedAtRaw);
			if (Number.isNaN(recorded.getTime())) {
				setStatus('Match found but timestamp could not be parsed.', 'error');
				return;
			}
			// Prefer the session (cluster) bracket the server computed around
			// the record so the user lands on its neighbouring points. Fall
			// back to a UTC day bracket if the server didn't return one.
			let rangeStart = null;
			let rangeEnd = null;
			if (data?.session_start && data?.session_end) {
				const s = new Date(data.session_start);
				const e = new Date(data.session_end);
				if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
					rangeStart = s;
					rangeEnd = e;
				}
			}
			if (!rangeStart || !rangeEnd) {
				rangeStart = new Date(Date.UTC(recorded.getUTCFullYear(), recorded.getUTCMonth(), recorded.getUTCDate(), 0, 0, 0));
				rangeEnd = new Date(Date.UTC(recorded.getUTCFullYear(), recorded.getUTCMonth(), recorded.getUTCDate(), 23, 59, 0));
			}
			// URL params are minute-precision; pad the upper bound by a minute
			// so the server's initial filter (recorded_at <= end) still
			// includes records whose seconds fall inside the session end.
			const paddedEnd = new Date(rangeEnd.getTime() + 60 * 1000);
			const navParams = new URLSearchParams();
			navParams.set('org', companyToken);
			navParams.set('device_id', String(deviceID));
			navParams.set('start_date', formatDateTimeUTCInput(rangeStart));
			navParams.set('end_date', formatDateTimeUTCInput(paddedEnd));
			navParams.set('focus_uuid', uuid);
			const count = Number(data?.session_count) || 0;
			setStatus(count > 1 ? `Match found in cluster of ${count} — loading…` : 'Match found — loading…', 'success');
			window.location.assign(`${routeBase}/${encodeURIComponent(companyToken)}?${navParams}`);
		} catch (err) {
			console.error('uuid search failed', err);
			setStatus('Search failed.', 'error');
		} finally {
			button.disabled = false;
		}
	});
}

// focusUUIDFromQuery auto-expands a row matching ?focus_uuid=... after the
// dashboard loads. Used by setupUUIDSearch to land directly on the located
// record. Silently no-ops if the row is not in the rendered list.
function focusUUIDFromQuery() {
	const params = new URLSearchParams(window.location.search);
	const uuid = (params.get('focus_uuid') || '').trim();
	if (!uuid) return;
	const escapedUUID = (typeof CSS !== 'undefined' && typeof CSS.escape === 'function')
		? CSS.escape(uuid)
		: uuid.replace(/(["\\])/g, '\\$1');
	const tryFocus = () => {
		const row = document.querySelector(`#locations-panel tr.location-row[data-uuid="${escapedUUID}"]`);
		if (!row) return false;
		handleLocationSelection(uuid);
		// Tell the map to apply the red selection icon and pan to the point.
		// Setting the property here is safe: updateMapData() ran first in this
		// DOMContentLoaded handler, so mapElement.locations is already
		// populated with the cluster.
		const map = document.getElementById('dashboard-map');
		if (map) {
			map.selected = uuid;
		}
		return true;
	};
	if (tryFocus()) return;
	// In case the row arrives through a later HTMX swap (watch-mode poll, etc.).
	const onSwap = () => {
		if (tryFocus()) {
			document.removeEventListener('htmx:afterSwap', onSwap);
		}
	};
	document.addEventListener('htmx:afterSwap', onSwap);
}

// setupScopeForm preserves the current date range across device/company
// switches. The scope form (org/company/device) lives separately from the
// filters form (dates), so without this the form submission would drop
// start_date and end_date, allowing the URL/server defaults to take over.
// Hidden inputs are synced from the visible date pickers and converted to
// UTC ISO immediately before submission so the values round-trip cleanly:
// localizeUTCInputValue() on the next page load assumes URL values are UTC
// and converts them back to local for display.
function setupScopeForm() {
	const scopeForm = document.getElementById('scope-form');
	if (!scopeForm) return;
	const company = document.getElementById('company');
	const device = document.getElementById('device');
	const localToUTCParam = (raw) => {
		const trimmed = (raw || '').trim();
		if (!trimmed) return '';
		const parsed = new Date(trimmed);
		if (Number.isNaN(parsed.getTime())) return trimmed;
		return formatDateTimeUTCInput(parsed);
	};
	const submitWithDates = () => {
		const startInput = document.getElementById('start_date');
		const endInput = document.getElementById('end_date');
		const hiddenStart = document.getElementById('scope-start-date');
		const hiddenEnd = document.getElementById('scope-end-date');
		if (hiddenStart) hiddenStart.value = localToUTCParam(startInput?.value);
		if (hiddenEnd) hiddenEnd.value = localToUTCParam(endInput?.value);
		scopeForm.submit();
	};
	company?.addEventListener('change', submitWithDates);
	device?.addEventListener('change', submitWithDates);
}

let _downloadCountReqId = 0;

function downloadLocationParams() {
	const panel = document.querySelector('.panel-main');
	const org = (panel?.dataset?.org || '').trim();
	const companyID = (panel?.dataset?.companyId || '').trim();
	const deviceSelect = document.getElementById('device');
	const deviceID = (deviceSelect?.value || '').trim();
	const startInput = document.getElementById('start_date');
	const endInput = document.getElementById('end_date');
	const params = new URLSearchParams();
	if (org) params.set('org', org);
	if (companyID && companyID !== '0') params.set('company_id', companyID);
	if (deviceID) params.set('device_id', deviceID);
	const startRaw = (startInput?.value || '').trim();
	const endRaw = (endInput?.value || '').trim();
	if (startRaw) {
		const parsed = new Date(startRaw);
		if (!Number.isNaN(parsed.getTime())) {
			params.set('start_date', formatDateTimeUTCInput(parsed));
		}
	}
	if (endRaw) {
		const parsed = new Date(endRaw);
		if (!Number.isNaN(parsed.getTime())) {
			params.set('end_date', `${formatDateTimeUTCInput(parsed)}:59Z`);
		}
	}
	return { params, hasDevice: !!deviceID, hasRange: !!(startRaw && endRaw) };
}

async function refreshDownloadButton() {
	const button = document.getElementById('download-locations');
	if (!button) return;
	const { params, hasDevice, hasRange } = downloadLocationParams();
	if (!hasDevice || !hasRange) {
		button.hidden = true;
		button.title = 'Select a device and date range to enable download';
		return;
	}
	const reqId = ++_downloadCountReqId;
	try {
		const res = await fetch(`${dashboardRouteBase()}/api/locations/count?${params}`, {
			headers: { Accept: 'application/json' },
			credentials: 'same-origin',
		});
		if (!res.ok) {
			if (reqId === _downloadCountReqId) button.hidden = true;
			return;
		}
		const { count = 0 } = await res.json();
		if (reqId !== _downloadCountReqId) return;
		if (count > 0) {
			button.hidden = false;
			button.title = `Download ${count} location${count === 1 ? '' : 's'} in this date range`;
		} else {
			button.hidden = true;
		}
	} catch (err) {
		if (reqId === _downloadCountReqId) button.hidden = true;
	}
}

async function downloadLocations() {
	const button = document.getElementById('download-locations');
	if (!button) return;
	const { params, hasDevice, hasRange } = downloadLocationParams();
	if (!hasDevice || !hasRange) return;
	button.disabled = true;
	try {
		const res = await fetch(`${dashboardRouteBase()}/api/locations/export?${params}`, {
			headers: { Accept: 'application/json' },
			credentials: 'same-origin',
		});
		if (!res.ok) {
			console.error('locations export failed', res.status);
			return;
		}
		const disposition = res.headers.get('Content-Disposition') || '';
		const match = disposition.match(/filename="?([^"]+)"?/);
		const filename = match ? match[1] : `locations-${Date.now()}.json`;
		const blob = await res.blob();
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	} finally {
		button.disabled = false;
	}
}

function setupDownloadButton() {
	const button = document.getElementById('download-locations');
	if (!button) return;
	button.addEventListener('click', downloadLocations);
	let debounce = null;
	const schedule = () => {
		if (debounce) clearTimeout(debounce);
		debounce = setTimeout(() => {
			debounce = null;
			refreshDownloadButton();
		}, 250);
	};
	document.getElementById('start_date')?.addEventListener('change', schedule);
	document.getElementById('end_date')?.addEventListener('change', schedule);
	document.getElementById('device')?.addEventListener('change', schedule);
	refreshDownloadButton();
}

function resetMapView() {
	if (!mapElement) {
		mapElement = document.getElementById('dashboard-map');
	}
	if (mapElement && typeof mapElement.resetView === 'function') {
		mapElement.resetView();
	}
}
