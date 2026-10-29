sap.ui.define([], function () {
	"use strict";

	/* ---------- settings ---------- */

	// Open-Meteo geocoding: free, open source, NO API key, called directly from the browser
	const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

	// Pirate Weather: needs an API key. We call OUR proxy (ui5.yaml, mountPath /weather-api),
	// and the proxy adds the key from .env, so the key never reaches the browser.
	const WEATHER_URL = "/weather-api";

	const COUNTRY_CODE = "IN";       // India only
	const MIN_QUERY_LENGTH = 2;      // don't search for single letters
	const MAX_SUGGESTIONS = 8;
	const FORECAST_DAYS = 7;
	const REQUEST_TIMEOUT_MS = 10000;
	const RECENT_KEY = "ui5shop.recentCities";
	const MAX_RECENT = 5;

	// Pirate Weather icon code -> emoji + i18n key for the condition text
	const ICONS = {
		"clear-day": { emoji: "☀️", textKey: "weatherClear" },
		"clear-night": { emoji: "🌙", textKey: "weatherClear" },
		"partly-cloudy-day": { emoji: "⛅", textKey: "weatherPartlyCloudy" },
		"partly-cloudy-night": { emoji: "☁️", textKey: "weatherPartlyCloudy" },
		"cloudy": { emoji: "☁️", textKey: "weatherCloudy" },
		"rain": { emoji: "🌧️", textKey: "weatherRain" },
		"sleet": { emoji: "🌨️", textKey: "weatherSleet" },
		"snow": { emoji: "❄️", textKey: "weatherSnow" },
		"wind": { emoji: "💨", textKey: "weatherWindy" },
		"fog": { emoji: "🌫️", textKey: "weatherFog" }
	};
	const UNKNOWN_ICON = { emoji: "🌡️", textKey: "weatherUnknown" };

	/* ---------- errors ---------- */

	/** an Error with a simple code the UI can translate into a friendly message */
	function createError(code, status) {
		const error = new Error(code);
		error.code = code;
		error.status = status;
		return error;
	}

	/** turn an HTTP status into one of our error codes */
	function errorCodeForStatus(status) {
		if (status === 401 || status === 403) {
			return "API_KEY";      // key missing, wrong or not active
		}
		if (status === 404) {
			return "NOT_FOUND";
		}
		if (status === 429) {
			return "RATE_LIMIT";   // too many requests (free plan limit)
		}
		return "SERVER";
	}

	/**
	 * GET a URL and return the JSON body.
	 * Handles: no internet, timeout, and non-OK HTTP statuses.
	 */
	async function requestJson(url, fetchFn) {
		const doFetch = fetchFn || window.fetch.bind(window);
		const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
		const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;

		let response;
		try {
			response = await doFetch(url, controller ? { signal: controller.signal } : undefined);
		} catch (error) {
			throw createError(error && error.name === "AbortError" ? "TIMEOUT" : "NETWORK");
		} finally {
			if (timer) {
				clearTimeout(timer);
			}
		}

		if (!response.ok) {
			throw createError(errorCodeForStatus(response.status), response.status);
		}
		return response.json();
	}

	/* ---------- city search (Open-Meteo geocoding) ---------- */

	function buildCitySearchUrl(query) {
		const params = new URLSearchParams({
			name: query,
			count: String(MAX_SUGGESTIONS),
			language: "en",
			format: "json",
			countryCode: COUNTRY_CODE
		});
		return GEOCODING_URL + "?" + params.toString();
	}

	/** keep only Indian places and reduce each result to what the app needs */
	function mapCities(json) {
		const results = (json && json.results) || [];
		return results
			.filter((place) => place.country_code === COUNTRY_CODE)
			.map((place) => ({
				id: place.id,
				name: place.name,
				state: place.admin1 || "",
				latitude: place.latitude,
				longitude: place.longitude,
				label: place.admin1 ? place.name + ", " + place.admin1 : place.name
			}));
	}

	/** "gurg" -> [{ name: "Gurugram", state: "Haryana", latitude, longitude, label }, ...] */
	async function searchIndianCities(query, fetchFn) {
		const text = typeof query === "string" ? query.trim() : "";
		if (text.length < MIN_QUERY_LENGTH) {
			return [];
		}
		const json = await requestJson(buildCitySearchUrl(text), fetchFn);
		return mapCities(json);
	}

	/* ---------- forecast (Pirate Weather through the proxy) ---------- */

	function buildForecastUrl(latitude, longitude) {
		// units=ca -> °C and km/h; exclude what we don't show (smaller, faster response)
		return WEATHER_URL + "/" + latitude + "," + longitude + "?units=ca&exclude=minutely,hourly,alerts";
	}

	function describeIcon(icon) {
		return ICONS[icon] || UNKNOWN_ICON;
	}

	function round(value) {
		return typeof value === "number" ? Math.round(value) : null;
	}

	function toPercent(fraction) {
		return typeof fraction === "number" ? Math.round(fraction * 100) : null;
	}

	/** turn the raw Pirate Weather response into a small, clean object for the view */
	function mapForecast(json) {
		const current = json.currently || {};
		const days = (json.daily && json.daily.data) || [];
		const currentIcon = describeIcon(current.icon);

		return {
			timezone: json.timezone || "",
			current: {
				time: current.time ? new Date(current.time * 1000).toISOString() : "",
				temperature: round(current.temperature),
				feelsLike: round(current.apparentTemperature),
				humidity: toPercent(current.humidity),
				windSpeed: round(current.windSpeed),
				summary: current.summary || "",
				emoji: currentIcon.emoji,
				textKey: currentIcon.textKey
			},
			daily: days.slice(0, FORECAST_DAYS).map((day) => {
				const dayIcon = describeIcon(day.icon);
				return {
					date: new Date(day.time * 1000).toISOString(),
					high: round(day.temperatureMax !== undefined ? day.temperatureMax : day.temperatureHigh),
					low: round(day.temperatureMin !== undefined ? day.temperatureMin : day.temperatureLow),
					rainChance: toPercent(day.precipProbability),
					summary: day.summary || "",
					emoji: dayIcon.emoji,
					textKey: dayIcon.textKey
				};
			})
		};
	}

	/** current weather + next 7 days for the given coordinates */
	async function getForecast(latitude, longitude, fetchFn) {
		if (typeof latitude !== "number" || typeof longitude !== "number") {
			throw createError("NOT_FOUND");
		}
		const json = await requestJson(buildForecastUrl(latitude, longitude), fetchFn);
		return mapForecast(json);
	}

	/* ---------- recent searches (browser storage) ---------- */

	function loadRecentCities(storage) {
		try {
			const saved = JSON.parse((storage || window.localStorage).getItem(RECENT_KEY));
			return Array.isArray(saved) ? saved : [];
		} catch (error) {
			return [];
		}
	}

	/** add a city to the front of the recent list (no duplicates, max 5); returns the new list */
	function saveRecentCity(city, storage) {
		const others = loadRecentCities(storage).filter((item) => item.id !== city.id);
		const recent = [{
			id: city.id,
			name: city.name,
			state: city.state,
			latitude: city.latitude,
			longitude: city.longitude,
			label: city.label
		}].concat(others).slice(0, MAX_RECENT);

		try {
			(storage || window.localStorage).setItem(RECENT_KEY, JSON.stringify(recent));
		} catch (error) {
			// storage not available: recent list just isn't kept
		}
		return recent;
	}

	return {
		MIN_QUERY_LENGTH: MIN_QUERY_LENGTH,
		searchIndianCities: searchIndianCities,
		getForecast: getForecast,
		describeIcon: describeIcon,
		mapCities: mapCities,
		mapForecast: mapForecast,
		buildCitySearchUrl: buildCitySearchUrl,
		buildForecastUrl: buildForecastUrl,
		loadRecentCities: loadRecentCities,
		saveRecentCity: saveRecentCity
	};
});