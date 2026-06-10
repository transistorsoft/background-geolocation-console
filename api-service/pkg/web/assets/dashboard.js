const VIEW_MODE_KEY = 'dashboard:view-mode';
const THEME_KEY = 'dashboard:theme';
let seenRows = new Set();
let initializedRows = false;
let currentViewMode = 'both';
let mapLocations = [];
let mapElement = null;
let selectedLocationUUID = null;
let currentTheme = 'dark';
// Snapshot of the request params used when Generate Timeline was clicked, so
// session selections and pan/span re-fetches use the same scope. The timeline
// is intentionally NOT scoped by the form's date filters — its purpose is a
// bird's-eye view of the device's full recorded history; the form filters
// belong to the locations table and map.
let timelineQueryParams = null;

// Window state for the stock-app-style timeline browser. Sessions are fetched
// once per Generate click; pan/span buttons re-filter the cached array
// without going back to the server.
let timelineSessions = [];          // [{raw, start: Date, end: Date, count}]
let timelineFullStart = null;
let timelineFullEnd = null;
let timelineSpan = 'all';           // '1d'|'1w'|'1m'|'6m'|'1y'|'all'|'custom'
let timelineWindowEnd = null;       // right edge of current window (Date)
// When set (by brush-select / click-to-zoom on the density heatmap), this is an
// explicit {start, end} window that overrides the preset-span math above.
let timelineCustomRange = null;
// Clusters are computed each render, currently bucketed by calendar day:
// every session on the same day collapses into one entry. Days with a single
// session render as the regular session pill; multi-session days render as
// a merged pill that opens a popup. data-cluster-idx is the array index.
let timelineClusters = [];

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

	const quickRangePills = Array.from(document.querySelectorAll('.quick-range-pill'));
	if (quickRangePills.length) {
		const startInput = document.getElementById('start_date');
		const endInput = document.getElementById('end_date');
		const loadLastSessionButton = document.getElementById('load-last-session');
		localizeUTCInputValue(startInput);
		localizeUTCInputValue(endInput);
		normalizeDateTimeInput(startInput);
		normalizeDateTimeInput(endInput);
		const clearActivePill = () => {
			quickRangePills.forEach((pill) => pill.classList.remove('is-active'));
		};
		const setActivePill = (rangeKey) => {
			quickRangePills.forEach((pill) => {
				pill.classList.toggle('is-active', pill.dataset.range === rangeKey);
			});
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
			input.addEventListener('change', clearActivePill);
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

		const DAY_MS = 24 * 60 * 60 * 1000;
		const computeRange = async (rangeKey) => {
			const now = new Date();
			switch (rangeKey) {
				case 'most-recent': {
					const range = await fetchRecordedRange();
					if (!range?.end) {
						return null;
					}
					return { start: new Date(range.end.getTime() - DAY_MS), end: range.end };
				}
				case 'last-24h':
					return { start: new Date(now.getTime() - DAY_MS), end: now };
				case 'today':
					return { start: startOfLocalDay(now), end: now };
				case 'yesterday': {
					const y = new Date(now);
					y.setDate(y.getDate() - 1);
					return { start: startOfLocalDay(y), end: endOfLocalDay(y) };
				}
				case 'last-3-days':
					return { start: startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2)), end: now };
				case 'last-7-days':
					return { start: startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)), end: now };
				case 'last-30-days':
					return { start: startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)), end: now };
				default:
					return null;
			}
		};

		const applyQuickRange = async (rangeKey, shouldRefresh = true) => {
			if (!rangeKey || !startInput || !endInput) {
				return;
			}
			const range = await computeRange(rangeKey);
			if (!range) {
				return;
			}
			startInput.value = range.start ? formatDateTimeLocal(range.start) : '';
			endInput.value = range.end ? formatDateTimeLocal(range.end) : '';
			normalizeDateTimeInput(startInput);
			normalizeDateTimeInput(endInput);
			setActivePill(rangeKey);
			if (shouldRefresh) {
				triggerRefresh();
			}
		};

		quickRangePills.forEach((pill) => {
			pill.addEventListener('click', () => {
				const rangeKey = pill.dataset.range;
				if (!rangeKey) {
					return;
				}
				pill.disabled = true;
				applyQuickRange(rangeKey, true).finally(() => {
					pill.disabled = false;
				});
			});
		});

		if (loadLastSessionButton) {
			const deviceSelectEl = document.getElementById('device');
			const setSessionStatus = (msg, kind) => {
				const el = document.getElementById('session-status');
				if (!el) return;
				el.textContent = msg || '';
				el.classList.remove('is-error', 'is-success');
				if (kind) el.classList.add(`is-${kind}`);
			};
			if (deviceSelectEl?.value) {
				loadLastSessionButton.disabled = false;
				loadLastSessionButton.removeAttribute('title');
			}
			loadLastSessionButton.addEventListener('click', async () => {
				const panel = document.getElementById('locations-panel');
				if (panel) {
					htmx.trigger(panel, 'htmx:abort');
				}
				loadLastSessionButton.disabled = true;
				loadLastSessionButton.classList.add('is-loading');
				loadLastSessionButton.textContent = 'Loading...';
				setSessionStatus('');
				try {
					const session = await fetchLatestSessionRange();
					if (!session?.start || !session?.end) {
						setSessionStatus('No recent session found for this device.', 'error');
						return;
					}
					startInput.value = formatDateTimeLocal(session.start);
					endInput.value = formatDateTimeLocal(session.end);
					normalizeDateTimeInput(startInput);
					normalizeDateTimeInput(endInput);
					clearActivePill();
					const durationMs = session.end.getTime() - session.start.getTime();
					const points = session.count || 0;
					setSessionStatus(`Loaded ${points} point${points === 1 ? '' : 's'} over ${formatDuration(durationMs)}.`, 'success');
					triggerRefresh();
				} catch (err) {
					console.warn('latest session fetch failed', err);
					setSessionStatus('Could not load session. Please try again.', 'error');
				} finally {
					loadLastSessionButton.disabled = !deviceSelectEl?.value;
					loadLastSessionButton.classList.remove('is-loading');
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

	const timelineRollup = document.getElementById('timeline-rollup');
	if (timelineRollup) {
		timelineRollup.addEventListener('click', () => {
			setTimelineState('rolled-up');
		});
	}

	const timelineRolldown = document.getElementById('timeline-rolldown');
	if (timelineRolldown) {
		timelineRolldown.addEventListener('click', () => {
			setTimelineState('expanded');
		});
	}

	document.querySelectorAll('.timeline-span').forEach((btn) => {
		btn.addEventListener('click', () => {
			const span = btn.dataset.span;
			if (span) applyTimelineSpan(span);
		});
	});

	const timelinePrev = document.getElementById('timeline-prev');
	const timelineNext = document.getElementById('timeline-next');
	if (timelinePrev) {
		timelinePrev.addEventListener('click', () => panTimelineWindow(-1));
	}
	if (timelineNext) {
		timelineNext.addEventListener('click', () => panTimelineWindow(+1));
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
		const handleTimelineActivation = (event, isKeyboard) => {
			const clusterEl = event.target.closest('.timeline-cluster[data-cluster-idx]');
			if (clusterEl) {
				if (isKeyboard) event.preventDefault();
				const idx = Number(clusterEl.dataset.clusterIdx);
				const cluster = timelineClusters[idx];
				if (cluster) {
					openTimelineClusterDialog(cluster);
				}
				return;
			}
			const session = event.target.closest('.timeline-session[data-start][data-end]');
			if (session) {
				if (isKeyboard) event.preventDefault();
				markTimelineSelection(session);
				applyTimelineSessionSelection(session.dataset.start, session.dataset.end);
				return;
			}
		};
		// Set after a brush/zoom so the synthetic click that follows mouseup
		// doesn't also land on whatever pill/ring the re-render placed under the
		// cursor. Cleared on the next tick as a backstop if no click arrives.
		let suppressTimelineClick = false;
		timelineChart.addEventListener('click', (event) => {
			if (suppressTimelineClick) {
				suppressTimelineClick = false;
				return;
			}
			handleTimelineActivation(event, false);
		});
		timelineChart.addEventListener('keydown', (event) => {
			if (event.key !== 'Enter' && event.key !== ' ') return;
			handleTimelineActivation(event, true);
		});
		// Density-mode brush + click-to-zoom. mousedown on the transparent zoom
		// overlay starts a drag: a small drag (or a plain click) zooms 2× on that
		// point; a real drag zooms to exactly the selected calendar range. The
		// overlay sits below the notable rings, so ring/pill clicks are untouched.
		timelineChart.addEventListener('mousedown', (event) => {
			if (event.button !== 0) return;
			const zone = event.target.closest('.timeline-zoom-overlay');
			const svg = zone && zone.closest('svg');
			if (!zone || !svg) return;
			const tStart = Number(zone.dataset.t0);
			const tEnd = Number(zone.dataset.t1);
			if (!Number.isFinite(tStart) || !Number.isFinite(tEnd) || tEnd <= tStart) return;
			event.preventDefault();

			const ovX = parseFloat(zone.getAttribute('x'));
			const ovW = parseFloat(zone.getAttribute('width'));
			const ovY = zone.getAttribute('y');
			const ovH = zone.getAttribute('height');
			const vbW = (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width) || 960;
			const toVbX = (clientX) => {
				const r = svg.getBoundingClientRect();
				const raw = r.width ? (clientX - r.left) / r.width * vbW : ovX;
				return clampNumber(raw, ovX, ovX + ovW);
			};
			const timeForVbX = (vbX) => tStart + clampNumber((vbX - ovX) / ovW, 0, 1) * (tEnd - tStart);

			const startVbX = toVbX(event.clientX);
			const sel = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
			sel.setAttribute('class', 'timeline-brush-rect');
			sel.setAttribute('y', ovY);
			sel.setAttribute('height', ovH);
			sel.setAttribute('x', String(startVbX));
			sel.setAttribute('width', '0');
			svg.appendChild(sel);

			let endVbX = startVbX;
			const onMove = (ev) => {
				endVbX = toVbX(ev.clientX);
				sel.setAttribute('x', String(Math.min(startVbX, endVbX)));
				sel.setAttribute('width', String(Math.abs(endVbX - startVbX)));
			};
			const onUp = (ev) => {
				document.removeEventListener('mousemove', onMove);
				document.removeEventListener('mouseup', onUp);
				if (sel.parentNode) sel.parentNode.removeChild(sel);
				endVbX = toVbX(ev.clientX);
				suppressTimelineClick = true;
				window.setTimeout(() => { suppressTimelineClick = false; }, 0);
				if (Math.abs(endVbX - startVbX) > 3) {
					setTimelineCustomWindow(timeForVbX(startVbX), timeForVbX(endVbX));
				} else {
					zoomTimelineToTime(timeForVbX(startVbX));
				}
			};
			document.addEventListener('mousemove', onMove);
			document.addEventListener('mouseup', onUp);
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

// Convert the server-rendered UTC timestamp (data-recorded ISO 8601) into
// the browser's local time, formatted as YYYY-MM-DD on top and HH:MM:SS
// underneath. Runs on initial render and after every HTMX swap.
function applyLocalTime(rows) {
	const pad = (n) => String(n).padStart(2, '0');
	rows.forEach((row) => {
		const cell = row.querySelector('[data-recorded]');
		if (!cell) return;
		const ts = cell.getAttribute('data-recorded');
		if (!ts) return;
		const date = new Date(ts);
		if (isNaN(date.getTime())) return;
		const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
		const timePart = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
		cell.innerHTML = `<div class="meta-date">${datePart}</div><div class="meta-time">${timePart}</div>`;
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
	const gapInput = document.getElementById('session-gap');
	const gapMinutes = parseInt(gapInput?.value || '', 10);
	if (Number.isFinite(gapMinutes) && gapMinutes > 0 && gapMinutes <= 1440) {
		params.set('gap_minutes', String(gapMinutes));
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

function formatDuration(ms) {
	const totalSec = Math.max(0, Math.floor(ms / 1000));
	const days = Math.floor(totalSec / 86400);
	const hours = Math.floor((totalSec % 86400) / 3600);
	const minutes = Math.floor((totalSec % 3600) / 60);
	const seconds = totalSec % 60;
	if (days > 0) return `${days}d ${hours}h`;
	if (hours > 0) return `${hours}h ${minutes}m`;
	if (minutes > 0) return `${minutes} min`;
	return `${seconds} sec`;
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

// Builds the params for timeline requests. Deliberately omits start_date and
// end_date so the timeline always reflects the device's full recorded history;
// span/pan controls navigate the returned range client-side. The form's date
// filters scope the locations table and map only.
function buildDashboardQueryParams() {
	const params = new URLSearchParams();
	const companySelect = document.getElementById('company');
	const deviceSelect = document.getElementById('device');
	if (companySelect?.value) {
		params.set('company_id', companySelect.value);
	}
	if (deviceSelect?.value) {
		params.set('device_id', deviceSelect.value);
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
	if (!startInput || !endInput) {
		return false;
	}
	startInput.value = start ? formatDateTimeLocal(start) : '';
	endInput.value = end ? formatDateTimeLocal(end) : '';
	normalizeDateTimeInput(startInput);
	normalizeDateTimeInput(endInput);
	document.querySelectorAll('.quick-range-pill.is-active').forEach((pill) => pill.classList.remove('is-active'));
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
	const summary = document.getElementById('timeline-summary');
	const chart = document.getElementById('timeline-chart-wrap');
	if (!panel || !summary || !chart) {
		return;
	}
	setTimelineState('empty');
	const controls = document.getElementById('timeline-controls');
	if (controls) controls.classList.add('hidden');
	summary.textContent = 'Generate a timeline to inspect grouped sessions across the current selection.';
	chart.innerHTML = '';
	timelineSessions = [];
	timelineFullStart = null;
	timelineFullEnd = null;
	timelineSpan = 'all';
	timelineWindowEnd = null;
	timelineCustomRange = null;
}

function setTimelineStatus(message) {
	const chart = document.getElementById('timeline-chart-wrap');
	if (!chart) return;
	setTimelineState('expanded');
	chart.innerHTML = `<div class="timeline-status">${message}</div>`;
}

// setTimelineState toggles the panel between three explicit states.
// - "empty"      : initial; Generate button + helper text visible; no actions.
// - "expanded"   : data loaded and rendered; rollup arrow + discard X visible.
// - "rolled-up"  : data loaded but content hidden; rolldown arrow + label + X.
//
// Buttons (Generate, rollup, rolldown, label, content, close) all live in the
// toolbar/content; this helper centralises which ones are shown per state.
function setTimelineState(state) {
	const panel = document.getElementById('timeline-panel');
	if (!panel) return;
	const trigger = document.getElementById('generate-timeline');
	const helper = panel.querySelector('.timeline-helper');
	const rollup = document.getElementById('timeline-rollup');
	const rolldown = document.getElementById('timeline-rolldown');
	const rolledLabel = document.getElementById('timeline-rolled-label');
	const close = document.getElementById('timeline-close');
	const content = document.getElementById('timeline-content');
	const setHidden = (el, hide) => el && el.classList.toggle('hidden', hide);
	panel.dataset.state = state;
	if (state === 'empty') {
		panel.classList.add('is-collapsed');
		setHidden(trigger, false);
		setHidden(helper, false);
		setHidden(rollup, true);
		setHidden(rolldown, true);
		setHidden(rolledLabel, true);
		setHidden(close, true);
		setHidden(content, true);
	} else if (state === 'expanded') {
		panel.classList.remove('is-collapsed');
		setHidden(trigger, true);
		setHidden(helper, true);
		setHidden(rollup, false);
		setHidden(rolldown, true);
		setHidden(rolledLabel, true);
		setHidden(close, false);
		setHidden(content, false);
	} else if (state === 'rolled-up') {
		panel.classList.add('is-collapsed');
		setHidden(trigger, true);
		setHidden(helper, true);
		setHidden(rollup, true);
		setHidden(rolldown, false);
		setHidden(rolledLabel, false);
		setHidden(close, false);
		setHidden(content, true);
	}
}

function renderTimelinePanel(data) {
	const panel = document.getElementById('timeline-panel');
	const summary = document.getElementById('timeline-summary');
	const chart = document.getElementById('timeline-chart-wrap');
	const controls = document.getElementById('timeline-controls');
	if (!panel || !summary || !chart) {
		return;
	}
	setTimelineState('expanded');

	// Parse and cache sessions; both the original payload (for buildTimelineChartMarkup)
	// and parsed Dates (for filtering) are kept on each entry.
	const rawSessions = Array.isArray(data?.sessions) ? data.sessions : [];
	timelineSessions = rawSessions
		.map((raw) => {
			const start = parseTimelineDate(raw?.start);
			const end = parseTimelineDate(raw?.end);
			return start && end ? { raw, start, end, count: Number(raw?.count || 0) } : null;
		})
		.filter(Boolean);
	timelineFullStart = parseTimelineDate(data?.start) || (timelineSessions[0]?.start ?? null);
	timelineFullEnd = parseTimelineDate(data?.end) || (timelineSessions[timelineSessions.length - 1]?.end ?? null);

	// Reset the window to "show everything" for each fresh Generate.
	timelineSpan = 'all';
	timelineWindowEnd = timelineFullEnd ? new Date(timelineFullEnd.getTime()) : null;
	timelineCustomRange = null;

	const totalPoints = Number(data?.total_points || 0);
	if (!timelineSessions.length) {
		if (controls) controls.classList.add('hidden');
		summary.textContent = totalPoints > 0
			? `No grouped sessions could be identified across ${totalPoints} selected points.`
			: 'No location data matches the current selection.';
		chart.innerHTML = '<div class="timeline-empty-state">No recorded locations for this device.</div>';
		return;
	}
	if (controls) controls.classList.remove('hidden');
	renderTimelineWithWindow();
}

// Shift a Date by exactly one window-span unit. Uses calendar-aware setMonth /
// setFullYear so 1m means "one calendar month earlier", not "30 days".
function shiftDateBySpan(date, span, direction) {
	const d = new Date(date.getTime());
	switch (span) {
		case '1d': d.setDate(d.getDate() + direction); break;
		case '1w': d.setDate(d.getDate() + direction * 7); break;
		case '1m': d.setMonth(d.getMonth() + direction); break;
		case '6m': d.setMonth(d.getMonth() + direction * 6); break;
		case '1y': d.setFullYear(d.getFullYear() + direction); break;
		default: return d;
	}
	return d;
}

// Resolve the visible window from the current state, clamped to the data range
// so the window slides on a rail rather than escaping into emptiness.
function currentTimelineWindow() {
	if (timelineCustomRange) {
		return { start: timelineCustomRange.start, end: timelineCustomRange.end };
	}
	if (timelineSpan === 'all' || !timelineWindowEnd || !timelineFullStart || !timelineFullEnd) {
		return { start: timelineFullStart, end: timelineFullEnd };
	}
	let end = new Date(timelineWindowEnd.getTime());
	if (end > timelineFullEnd) end = new Date(timelineFullEnd.getTime());
	let start = shiftDateBySpan(end, timelineSpan, -1);
	if (start < timelineFullStart) {
		start = new Date(timelineFullStart.getTime());
		end = shiftDateBySpan(start, timelineSpan, +1);
		if (end > timelineFullEnd) end = new Date(timelineFullEnd.getTime());
	}
	return { start, end };
}

function panTimelineWindow(direction) {
	if (timelineSpan === 'all') return;
	if (timelineCustomRange) {
		const width = timelineCustomRange.end.getTime() - timelineCustomRange.start.getTime();
		setTimelineCustomWindow(
			timelineCustomRange.start.getTime() + direction * width,
			timelineCustomRange.end.getTime() + direction * width,
		);
		return;
	}
	if (!timelineWindowEnd) return;
	timelineWindowEnd = shiftDateBySpan(timelineWindowEnd, timelineSpan, direction);
	renderTimelineWithWindow();
}

function applyTimelineSpan(span) {
	// Picking a preset always exits any brushed custom window.
	timelineCustomRange = null;
	if (timelineSpan === span && span !== 'custom') return;
	timelineSpan = span;
	timelineWindowEnd = (span === 'all' || !timelineFullEnd)
		? null
		: new Date(timelineFullEnd.getTime());
	renderTimelineWithWindow();
}

// Apply an explicit [start, end] window (brush-select / click-to-zoom on the
// density heatmap), clamped to the data range with a 1-hour floor so a stray
// click can't collapse the window to nothing.
function setTimelineCustomWindow(startMs, endMs) {
	if (!timelineFullStart || !timelineFullEnd) return;
	const fullStart = timelineFullStart.getTime();
	const fullEnd = timelineFullEnd.getTime();
	let start = Math.max(fullStart, Math.min(startMs, endMs));
	let end = Math.min(fullEnd, Math.max(startMs, endMs));
	const MIN_WINDOW = 60 * 60 * 1000;
	if (end - start < MIN_WINDOW) {
		const center = (start + end) / 2;
		start = Math.max(fullStart, center - MIN_WINDOW / 2);
		end = Math.min(fullEnd, center + MIN_WINDOW / 2);
	}
	timelineCustomRange = { start: new Date(start), end: new Date(end) };
	timelineSpan = 'custom';
	renderTimelineWithWindow();
}

// Click-to-zoom: zoom in 2× centred on the clicked time. Produces a custom
// window so successive clicks keep narrowing until detail mode reveals pills.
function zoomTimelineToTime(centerMs) {
	const { start, end } = currentTimelineWindow();
	if (!start || !end) return;
	const quarter = (end.getTime() - start.getTime()) / 4;
	setTimelineCustomWindow(centerMs - quarter, centerMs + quarter);
}

function renderTimelineWithWindow() {
	const chart = document.getElementById('timeline-chart-wrap');
	const summary = document.getElementById('timeline-summary');
	const panLabel = document.getElementById('timeline-pan-label');
	const prevBtn = document.getElementById('timeline-prev');
	const nextBtn = document.getElementById('timeline-next');
	if (!chart || !summary) return;
	// Drop any open cluster popup before re-rendering — the cluster it
	// references is about to be replaced by a fresh one.
	closeTimelineClusterDialog();

	// Active span button highlight
	document.querySelectorAll('.timeline-span').forEach((btn) => {
		btn.classList.toggle('is-active', btn.dataset.span === timelineSpan);
	});

	const { start, end } = currentTimelineWindow();
	const filtered = (timelineSpan === 'all')
		? timelineSessions
		: timelineSessions.filter((s) => s.start >= start && s.start <= end);

	if (panLabel) {
		panLabel.textContent = (timelineSpan === 'all')
			? `Full history — ${formatTimelineDate(timelineFullStart)} → ${formatTimelineDate(timelineFullEnd)}`
			: `${formatTimelineDate(start)} → ${formatTimelineDate(end)}`;
	}
	const atRightEdge = (timelineSpan === 'all') || (end && timelineFullEnd && end >= timelineFullEnd);
	const atLeftEdge = (timelineSpan === 'all') || (start && timelineFullStart && start <= timelineFullStart);
	if (prevBtn) prevBtn.disabled = atLeftEdge;
	if (nextBtn) nextBtn.disabled = atRightEdge;

	const sessionCount = filtered.length;
	const totalPoints = filtered.reduce((sum, s) => sum + (s.count || 0), 0);
	if (sessionCount === 0) {
		summary.textContent = `No sessions in ${formatTimelineDate(start)} → ${formatTimelineDate(end)}.`;
		chart.innerHTML = '<div class="timeline-empty-state">No sessions in the selected window. Pan or pick a wider range.</div>';
		return;
	}
	summary.textContent = (timelineSpan === 'all')
		? `${sessionCount} ${sessionCount === 1 ? 'session' : 'sessions'} across ${totalPoints} points from ${formatTimelineDate(start)} to ${formatTimelineDate(end)}.`
		: `${sessionCount} ${sessionCount === 1 ? 'session' : 'sessions'} (${totalPoints} points) in ${formatTimelineDate(start)} → ${formatTimelineDate(end)}.`;
	chart.innerHTML = buildTimelineChartMarkup(filtered.map((s) => s.raw), {
		windowStart: start,
		windowEnd: end,
	});
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

// Pick the smallest span pill whose window covers the cluster's duration so
// that zooming into a cluster keeps it fully visible on the right edge.
function bestSpanForClusterDuration(durationMs) {
	const DAY = 24 * 60 * 60 * 1000;
	if (durationMs <= DAY) return '1d';
	if (durationMs <= 7 * DAY) return '1w';
	if (durationMs <= 31 * DAY) return '1m';
	if (durationMs <= 183 * DAY) return '6m';
	if (durationMs <= 366 * DAY) return '1y';
	return 'all';
}

function ensureTimelineClusterDialog() {
	let dialog = document.getElementById('timeline-cluster-dialog');
	if (dialog) return dialog;
	const host = document.getElementById('timeline-content') || document.getElementById('timeline-panel');
	if (!host) return null;
	dialog = document.createElement('div');
	dialog.id = 'timeline-cluster-dialog';
	dialog.className = 'timeline-cluster-dialog hidden';
	dialog.setAttribute('role', 'dialog');
	dialog.setAttribute('aria-modal', 'false');
	dialog.setAttribute('aria-labelledby', 'timeline-cluster-dialog-title');
	dialog.innerHTML = `
		<header class="timeline-cluster-dialog-header">
			<h4 id="timeline-cluster-dialog-title">Sessions</h4>
			<button type="button" class="timeline-cluster-dialog-close" aria-label="Close">&times;</button>
		</header>
		<ul class="timeline-cluster-dialog-list" id="timeline-cluster-dialog-list"></ul>
		<footer class="timeline-cluster-dialog-footer">
			<button type="button" class="timeline-cluster-dialog-zoom">Zoom into this range</button>
		</footer>
	`;
	host.appendChild(dialog);
	dialog.addEventListener('click', (event) => {
		if (event.target.closest('.timeline-cluster-dialog-close')) {
			closeTimelineClusterDialog();
			return;
		}
		const zoom = event.target.closest('.timeline-cluster-dialog-zoom');
		if (zoom) {
			zoomTimelineToOpenCluster();
			return;
		}
		const item = event.target.closest('.timeline-cluster-dialog-item');
		if (item) {
			applyTimelineSessionSelection(item.dataset.start, item.dataset.end);
			closeTimelineClusterDialog();
		}
	});
	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && !dialog.classList.contains('hidden')) {
			closeTimelineClusterDialog();
		}
	});
	return dialog;
}

let openClusterCache = null;

function openTimelineClusterDialog(cluster) {
	const dialog = ensureTimelineClusterDialog();
	if (!dialog) return;
	openClusterCache = cluster;
	const title = dialog.querySelector('#timeline-cluster-dialog-title');
	const list = dialog.querySelector('#timeline-cluster-dialog-list');
	if (title) {
		const dayLabel = cluster.start.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
		title.textContent = `${dayLabel} · ${cluster.sessions.length} sessions · ${cluster.totalCount} points`;
	}
	if (list) {
		const fmt = (d) => d.toLocaleString(undefined, {
			year: 'numeric', month: 'short', day: 'numeric',
			hour: '2-digit', minute: '2-digit', hour12: false,
		});
		const sorted = cluster.sessions.slice().sort((a, b) => a.start - b.start);
		list.innerHTML = sorted.map((session) => {
			const startISO = session.start.toISOString();
			const endISO = session.end.toISOString();
			const duration = session.durationMinutes || Math.round((session.end - session.start) / 60000);
			return `<li>
				<button type="button" class="timeline-cluster-dialog-item" data-start="${startISO}" data-end="${endISO}">
					<span class="cluster-item-when">${fmt(session.start)}</span>
					<span class="cluster-item-meta">${session.count} pts · ${duration} min</span>
				</button>
			</li>`;
		}).join('');
	}
	dialog.classList.remove('hidden');
}

function closeTimelineClusterDialog() {
	const dialog = document.getElementById('timeline-cluster-dialog');
	if (!dialog) return;
	dialog.classList.add('hidden');
	openClusterCache = null;
}

function zoomTimelineToOpenCluster() {
	if (!openClusterCache || !timelineFullEnd) return;
	const cluster = openClusterCache;
	const span = bestSpanForClusterDuration(cluster.end.getTime() - cluster.start.getTime());
	timelineCustomRange = null;
	timelineSpan = span;
	// Anchor the right edge just past cluster.end (clamped to the data range
	// inside currentTimelineWindow) so the cluster sits at the right side
	// of the new window — the same place pan-right would leave it.
	timelineWindowEnd = new Date(Math.min(cluster.end.getTime(), timelineFullEnd.getTime()));
	closeTimelineClusterDialog();
	renderTimelineWithWindow();
}

// Generate calendar-aligned x-axis ticks across a continuous time range,
// picking the finest cadence (hour → 6h → day → week → month → quarter → year)
// whose label count stays within maxLabels. Returns [{ ms, label }].
function timelineAxisTicks(d0, d1, maxLabels) {
	const start = d0.getTime();
	const end = d1.getTime();
	const HOUR = 3600000;
	const DAY = 24 * HOUR;
	const fmtHour = (d) => d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
	const fmtDay = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	const fmtMonth = (d) => d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
	const fmtYear = (d) => String(d.getFullYear());

	const fixed = (stepMs, align, fmt) => {
		const ticks = [];
		const first = align(new Date(start));
		for (let t = first.getTime(); t <= end && ticks.length <= 500; t += stepMs) {
			if (t >= start) ticks.push({ ms: t, label: fmt(new Date(t)) });
		}
		return ticks;
	};
	const alignHour = (d) => { d.setMinutes(0, 0, 0); return d; };
	const alignDay = (d) => { d.setHours(0, 0, 0, 0); return d; };
	const calendar = (monthStep, fmt) => {
		const ticks = [];
		const d = new Date(start);
		d.setDate(1);
		d.setHours(0, 0, 0, 0);
		while (d.getTime() <= end && ticks.length <= 500) {
			if (d.getTime() >= start) ticks.push({ ms: d.getTime(), label: fmt(new Date(d)) });
			d.setMonth(d.getMonth() + monthStep);
		}
		return ticks;
	};

	const candidates = [
		() => fixed(HOUR, alignHour, fmtHour),
		() => fixed(6 * HOUR, alignHour, fmtHour),
		() => fixed(DAY, alignDay, fmtDay),
		() => fixed(7 * DAY, alignDay, fmtDay),
		() => calendar(1, fmtMonth),
		() => calendar(3, fmtMonth),
		() => calendar(12, fmtYear),
	];
	for (const gen of candidates) {
		const ticks = gen();
		if (ticks.length && ticks.length <= maxLabels) return ticks;
	}
	return calendar(12, fmtYear);
}

// Render the session timeline. The chart adapts to how much calendar time the
// current window spans (level of detail):
//   • Detail mode (≥ ~12px per day, i.e. up to ~2 months): individual session
//     pills by time of day, multi-session days merged into a click-to-drill
//     cluster pill — the close-up "choose a session" view.
//   • Density mode (wider, e.g. 6m / 1y / All): an hour-by-time density heatmap
//     so two years stay legible, with the busiest few sessions ringed and
//     labelled (and clickable) instead of labelling every one.
// X is a *continuous* calendar scale (not one column per active date) so silent
// gaps in the data stay visible and pills sit at their true temporal position.
function buildTimelineChartMarkup(sessions, opts) {
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
		timelineClusters = [];
		return '<div class="timeline-empty-state">No session groups were produced for this selection.</div>';
	}

	// Layout constants (compact)
	const chartWidth = 960;
	const chartHeight = 260;
	const margin = { top: 16, right: 16, bottom: 28, left: 44 };
	const plotWidth = chartWidth - margin.left - margin.right;
	const plotHeight = chartHeight - margin.top - margin.bottom;
	const minBarH = 5;
	const pillH = 12;

	// Continuous calendar time on X. Window bounds come from the caller so the
	// axis reflects the real selected range (and its gaps); fall back to the
	// session extent when not supplied.
	const ordered = parsedSessions.slice().sort((a, b) => a.start - b.start);
	const winStart = (opts && opts.windowStart instanceof Date) ? opts.windowStart : ordered[0].start;
	const winEnd = (opts && opts.windowEnd instanceof Date) ? opts.windowEnd : ordered[ordered.length - 1].end;
	const t0 = winStart.getTime();
	let t1 = winEnd.getTime();
	if (!(t1 > t0)) t1 = t0 + 60000;
	const tSpan = t1 - t0;
	const DAY_MS = 24 * 60 * 60 * 1000;
	const pxPerDay = plotWidth / Math.max(tSpan / DAY_MS, 1 / 24);
	const xForTime = (ms) => margin.left + clampNumber((ms - t0) / tSpan, 0, 1) * plotWidth;

	// Y-axis: time of day — 00:00 at top, 24:00 at bottom
	const minuteOfDay = (d) => d.getHours() * 60 + d.getMinutes();
	const yForMinute = (min) => margin.top + (min / 1440) * plotHeight;
	const countLabel = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

	const gridLines = [];
	const yLabels = [];
	const xLabels = [];

	// Y-axis grid lines and labels every 6 hours to keep the compact chart readable.
	for (let h = 0; h <= 24; h += 6) {
		const y = yForMinute(h * 60);
		gridLines.push(
			`<line class="timeline-grid" x1="${margin.left}" y1="${y}" x2="${chartWidth - margin.right}" y2="${y}"></line>`,
		);
		const label = h === 24 ? '00:00' : `${String(h).padStart(2, '0')}:00`;
		yLabels.push(
			`<text class="timeline-value-label" x="${margin.left - 10}" y="${y + 4}" text-anchor="end">${label}</text>`,
		);
	}

	// X-axis ticks on the continuous time scale; one gridline + label per tick.
	const maxLabels = Math.max(2, Math.floor(plotWidth / 90));
	timelineAxisTicks(winStart, new Date(t1), maxLabels).forEach((tick) => {
		const x = xForTime(tick.ms);
		if (x < margin.left - 0.5 || x > chartWidth - margin.right + 0.5) return;
		xLabels.push(
			`<text class="timeline-axis-label" x="${x}" y="${chartHeight - 8}" text-anchor="middle">${tick.label}</text>`,
		);
		gridLines.push(
			`<line class="timeline-col-separator" x1="${x}" y1="${margin.top}" x2="${x}" y2="${margin.top + plotHeight}"></line>`,
		);
	});

	const DETAIL_PX_PER_DAY = 12;
	const detail = pxPerDay >= DETAIL_PX_PER_DAY;
	const body = detail ? renderDetailMode() : renderDensityMode();
	const caption = detail
		? 'Pills are sessions by time of day; a purple pill is a day with several sessions — click to drill in. Numbers are recorded points; sessions split after 30-minute gaps.'
		: 'Shaded cells show recorded points per hour (brighter = more). Click a ring to load that session; drag across the chart to zoom into a range, or click to zoom in 2× — keep going until individual sessions appear.';

	return `
		<svg class="timeline-svg" viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="Session timeline chart">
			${gridLines.join('')}
			<line class="timeline-axis" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotHeight}"></line>
			<line class="timeline-axis" x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${chartWidth - margin.right}" y2="${margin.top + plotHeight}"></line>
			${body}
			${yLabels.join('')}
			${xLabels.join('')}
		</svg>
		<p class="timeline-caption">${caption}</p>
	`;

	// ----- Detail mode: per-session pills, multi-session days clustered -----
	function renderDetailMode() {
		const dateKey = (d) =>
			`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
		const dayMap = new Map();
		parsedSessions.forEach((s) => {
			const key = dateKey(s.start);
			let group = dayMap.get(key);
			if (!group) { group = []; dayMap.set(key, group); }
			group.push(s);
		});

		const clusters = [];
		dayMap.forEach((group, key) => {
			group.sort((a, b) => a.start - b.start);
			const first = group[0].start;
			const dayMidnight = new Date(first.getFullYear(), first.getMonth(), first.getDate()).getTime();
			const leftX = xForTime(dayMidnight);
			const slice = Math.max(6, xForTime(dayMidnight + DAY_MS) - leftX);
			const cluster = {
				bucketKey: key,
				sessions: group,
				start: group[0].start,
				end: group[0].end,
				totalCount: 0,
				leftX,
				slice,
				colCx: leftX + slice / 2,
				colWidth: slice,
			};
			group.forEach((s) => {
				cluster.totalCount += s.count || 0;
				if (s.start < cluster.start) cluster.start = s.start;
				if (s.end > cluster.end) cluster.end = s.end;
			});
			clusters.push(cluster);
		});
		clusters.sort((a, b) => a.start - b.start);
		timelineClusters = clusters;

		return clusters.map((cluster, idx) => (
			cluster.sessions.length === 1
				? renderSingleSessionPill(cluster.sessions[0], cluster.colCx, cluster.slice)
				: renderClusterPill(cluster, idx)
		)).join('');
	}

	function renderSingleSessionPill(session, cx, laneWidth) {
		const barW = Math.max(3, Math.min(8, laneWidth * 0.22));
		const hitW = Math.max(18, Math.min(42, laneWidth * 0.8));
		const pillW = Math.max(24, Math.min(46, laneWidth * 0.65));

		const yTop = clampNumber(yForMinute(minuteOfDay(session.start)), margin.top, margin.top + plotHeight - minBarH);
		const yRaw = yForMinute(minuteOfDay(session.end));
		const barH = Math.max(minBarH, yRaw - yTop);
		const midY = yTop + barH / 2;

		const hitH = Math.max(barH, pillH + 8);
		const hitY = clampNumber(midY - hitH / 2, margin.top, margin.top + plotHeight - hitH);

		const label = countLabel(session.count);
		const title = `${formatTimelineDate(session.start)} – ${formatTimelineDate(session.end)} | ${session.count} points | ${session.durationMinutes} min`;

		return `<g class="timeline-session" tabindex="0" role="button" data-start="${session.start.toISOString()}" data-end="${session.end.toISOString()}" data-count="${session.count}" aria-label="Load ${session.count} points from ${formatTimelineDate(session.start)} to ${formatTimelineDate(session.end)}">
			<title>${title}</title>
			<rect class="timeline-session-hit" x="${cx - hitW / 2}" y="${hitY}" width="${hitW}" height="${hitH}"></rect>
			<rect class="timeline-session-bar" x="${cx - barW / 2}" y="${yTop}" width="${barW}" height="${barH}" rx="3" ry="3"></rect>
			<rect class="timeline-session-pill" x="${cx - pillW / 2}" y="${midY - pillH / 2}" width="${pillW}" height="${pillH}" rx="${pillH / 2}" ry="${pillH / 2}"></rect>
			<text class="timeline-session-count" x="${cx}" y="${midY + 3}" text-anchor="middle">${label}</text>
		</g>`;
	}

	function renderClusterPill(cluster, idx) {
		const cx = cluster.colCx;
		const sessionCount = cluster.sessions.length;
		const totalCount = cluster.totalCount;

		// Bigger pill = more sessions, capped by the day's width so adjacent
		// busy days don't overlap. Width scales with sqrt(N) which dampens
		// the growth for very busy days (a 100-session day is still legible
		// next to a 10-session day, not 10× wider).
		const sqrtN = Math.sqrt(sessionCount);
		const pillW = Math.min(Math.max(cluster.colWidth - 2, 24), Math.max(26, 18 + 6 * sqrtN));
		const barW = Math.min(12, Math.max(4, 3 + sqrtN));
		const hitW = pillW + 12;

		// Bar spans from earliest start-of-day to latest end-of-day across
		// the cluster. Approximate but signals "activity window" at a glance.
		const earliestStartMin = cluster.sessions.reduce((min, s) => Math.min(min, minuteOfDay(s.start)), 1440);
		const latestEndMin = cluster.sessions.reduce((max, s) => Math.max(max, minuteOfDay(s.end)), 0);

		const yTop = clampNumber(yForMinute(earliestStartMin), margin.top, margin.top + plotHeight - minBarH);
		const yRaw = yForMinute(latestEndMin);
		const barH = Math.max(minBarH, yRaw - yTop);
		const midY = yTop + barH / 2;

		const hitH = Math.max(barH, pillH + 8);
		const hitY = clampNumber(midY - hitH / 2, margin.top, margin.top + plotHeight - hitH);

		const dayLabel = cluster.start.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
		// Number is always recorded points (consistent with the single-session
		// pill); the purple colour and tooltip convey "several sessions".
		const title = `${sessionCount} sessions on ${dayLabel}\n${totalCount} points total`;
		const label = countLabel(totalCount);

		return `<g class="timeline-cluster" tabindex="0" role="button" data-cluster-idx="${idx}" aria-label="Open ${sessionCount} sessions on ${dayLabel}, ${totalCount} points">
			<title>${title}</title>
			<rect class="timeline-cluster-hit" x="${cx - hitW / 2}" y="${hitY}" width="${hitW}" height="${hitH}"></rect>
			<rect class="timeline-cluster-bar" x="${cx - barW / 2}" y="${yTop}" width="${barW}" height="${barH}" rx="3" ry="3"></rect>
			<rect class="timeline-cluster-pill" x="${cx - pillW / 2}" y="${midY - pillH / 2}" width="${pillW}" height="${pillH}" rx="${pillH / 2}" ry="${pillH / 2}"></rect>
			<text class="timeline-cluster-count" x="${cx}" y="${midY + 3}" text-anchor="middle">${label}</text>
		</g>`;
	}

	// ----- Density mode: hour-by-time heatmap + ringed notable sessions -----
	function renderDensityMode() {
		timelineClusters = [];
		const NX = Math.max(12, Math.min(220, Math.round(plotWidth / 4)));
		const NY = 24;
		const cellW = plotWidth / NX;
		const cellH = plotHeight / NY;

		// Accumulate point counts into (x time-bucket × hour-of-day) cells.
		const counts = new Map();
		let maxCell = 0;
		parsedSessions.forEach((s) => {
			const frac = (s.start.getTime() - t0) / tSpan;
			if (frac < 0 || frac > 1) return;
			const ix = Math.min(NX - 1, Math.floor(frac * NX));
			const iy = Math.min(NY - 1, s.start.getHours());
			const key = ix * NY + iy;
			const v = (counts.get(key) || 0) + (s.count || 1);
			counts.set(key, v);
			if (v > maxCell) maxCell = v;
		});

		// Log scale so a 2,000-point cell doesn't wash out the 20-point ones.
		const logMax = Math.log(1 + maxCell) || 1;
		const cells = [];
		counts.forEach((v, key) => {
			const ix = Math.floor(key / NY);
			const iy = key % NY;
			const a = 0.16 + 0.84 * (Math.log(1 + v) / logMax);
			const x = margin.left + ix * cellW;
			const y = margin.top + iy * cellH;
			cells.push(
				`<rect class="timeline-heat-cell" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(cellW + 0.7).toFixed(2)}" height="${(cellH + 0.7).toFixed(2)}" fill-opacity="${a.toFixed(3)}"></rect>`,
			);
		});

		// Surface one "champion" session per horizontal time-segment rather than
		// the global top-N — otherwise every ring piles into whichever period was
		// busiest. Segmenting spreads the highlights across the whole timeline so
		// each stretch has a navigable candidate. Reuse the .timeline-session
		// class so the existing click delegation loads them on the map.
		const SEGMENTS = 12;
		const segBest = new Array(SEGMENTS).fill(null);
		parsedSessions.forEach((s) => {
			const frac = (s.start.getTime() - t0) / tSpan;
			if (frac < 0 || frac > 1) return;
			const seg = Math.min(SEGMENTS - 1, Math.floor(frac * SEGMENTS));
			if (!segBest[seg] || s.count > segBest[seg].count) segBest[seg] = s;
		});
		const notable = segBest.filter(Boolean).sort((a, b) => a.start - b.start);
		const placed = [];
		const overlaps = (a, b) => !(a.x2 < b.x1 || b.x2 < a.x1 || a.y2 < b.y1 || b.y2 < a.y1);
		const marks = [];
		notable.forEach((s) => {
			if (s.count <= 0) return;
			const cx = xForTime(s.start.getTime());
			const cy = clampNumber(yForMinute(minuteOfDay(s.start)), margin.top + 6, margin.top + plotHeight - 6);
			const label = countLabel(s.count);
			const approxW = label.length * 6 + 6;
			let chosen = null;
			for (const dy of [0, -11, 11, -22, 22]) {
				for (const side of [1, -1]) {
					const lx = cx + side * 9;
					const ly = cy + dy;
					const box = {
						x1: side === 1 ? lx : lx - approxW,
						x2: side === 1 ? lx + approxW : lx,
						y1: ly - 6,
						y2: ly + 6,
					};
					if (box.x1 < margin.left || box.x2 > chartWidth - margin.right) continue;
					if (box.y1 < margin.top || box.y2 > margin.top + plotHeight) continue;
					if (placed.some((p) => overlaps(p, box))) continue;
					chosen = { lx, ly, anchor: side === 1 ? 'start' : 'end', box };
					break;
				}
				if (chosen) break;
			}
			let labelMarkup = '';
			if (chosen) {
				placed.push(chosen.box);
				labelMarkup = `<text class="timeline-notable-label" x="${chosen.lx.toFixed(1)}" y="${(chosen.ly + 3).toFixed(1)}" text-anchor="${chosen.anchor}">${label}</text>`;
			}
			const title = `${formatTimelineDate(s.start)} – ${formatTimelineDate(s.end)} | ${s.count} points | ${s.durationMinutes} min`;
			marks.push(`<g class="timeline-session timeline-notable" tabindex="0" role="button" data-start="${s.start.toISOString()}" data-end="${s.end.toISOString()}" data-count="${s.count}" aria-label="Load ${s.count} points from ${formatTimelineDate(s.start)} to ${formatTimelineDate(s.end)}">
				<title>${title}</title>
				<circle class="timeline-notable-hit" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="11"></circle>
				<circle class="timeline-notable-ring" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4.5"></circle>
				${labelMarkup}
			</g>`);
		});

		// Transparent click-to-zoom layer over the plot. Sits above the cells but
		// below the rings (which appear later in the DOM) so ring clicks still win.
		const zoomOverlay = `<rect class="timeline-zoom-overlay" data-t0="${t0}" data-t1="${t1}" x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}"></rect>`;

		return cells.join('') + zoomOverlay + marks.join('');
	}
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
