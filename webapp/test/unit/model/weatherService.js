sap.ui.define([
	"ui5/shop/model/weatherService"
], function (weatherService) {
	"use strict";

	/* ---------- helpers: fake fetch + fake storage (no real network / browser data) ---------- */

	/**
	 * A fake fetch: "respond" decides what each URL returns.
	 * It records every URL called, so tests can check what was requested.
	 */
	function createFakeFetch(respond) {
		const fakeFetch = async (url) => {
			fakeFetch.calls.push(url);
			const result = respond(url);
			if (result instanceof Error) {
				throw result;             // simulate "no internet" / timeout
			}
			return {
				ok: result.status >= 200 && result.status < 300,
				status: result.status,
				json: async () => result.body
			};
		};
		fakeFetch.calls = [];
		return fakeFetch;
	}

	function createFakeStorage(initialData) {
		const data = Object.assign({}, initialData);
		return {
			getItem: (key) => (key in data ? data[key] : null),
			setItem: (key, value) => { data[key] = String(value); }
		};
	}

	/**
	 * Checks that an async call FAILS with the expected error code (and optional HTTP status).
	 * Works with every QUnit version (the bundled one has no assert.rejects).
	 */
	async function expectError(assert, promise, expectedCode, expectedStatus) {
		try {
			await promise;
			assert.ok(false, "Expected a " + expectedCode + " error, but the call succeeded");
		} catch (error) {
			assert.strictEqual(error.code, expectedCode, "Error code is " + expectedCode);
			if (expectedStatus !== undefined) {
				assert.strictEqual(error.status, expectedStatus, "HTTP status is " + expectedStatus);
			}
		}
	}

	/* ---------- sample API responses ---------- */

	const geocodingResponse = {
		results: [
			{ id: 1, name: "Gurugram", admin1: "Haryana", country_code: "IN", latitude: 28.46, longitude: 77.03 },
			{ id: 2, name: "Gurgaon Town", country_code: "IN", latitude: 28.47, longitude: 77.02 },
			{ id: 3, name: "Gurnee", admin1: "Illinois", country_code: "US", latitude: 42.37, longitude: -87.9 }
		]
	};

	function createDay(time, icon) {
		return { time: time, icon: icon, temperatureMax: 29.6, temperatureMin: 19.4, precipProbability: 0.46, summary: "Hazy." };
	}

	const forecastResponse = {
		timezone: "Asia/Kolkata",
		currently: {
			time: 1761481800,
			icon: "clear-day",
			summary: "Clear",
			temperature: 26.4,
			apparentTemperature: 25.2,
			humidity: 0.47,
			windSpeed: 11.3
		},
		daily: {
			// 8 days, like the real API, the service should keep only 7
			data: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => createDay(1761417000 + i * 86400, i === 4 ? "rain" : "fog"))
		}
	};

	/* ---------- city search ---------- */

	QUnit.module("weatherService - city search");

	QUnit.test("Search URL asks for Indian cities only", (assert) => {
		const url = weatherService.buildCitySearchUrl("New Delhi");
		assert.ok(url.startsWith("https://geocoding-api.open-meteo.com/v1/search?"), "Uses Open-Meteo geocoding");
		assert.ok(url.includes("countryCode=IN"), "Limited to India");
		assert.ok(url.includes("name=New+Delhi"), "City name is URL-encoded");
	});

	QUnit.test("Very short searches do not call the API", async (assert) => {
		const fakeFetch = createFakeFetch(() => ({ status: 200, body: geocodingResponse }));
		const result = await weatherService.searchIndianCities(" g ", fakeFetch);
		assert.deepEqual(result, [], "Empty result");
		assert.strictEqual(fakeFetch.calls.length, 0, "No request was made");
	});

	QUnit.test("Returns only Indian cities in a simple shape", async (assert) => {
		const fakeFetch = createFakeFetch(() => ({ status: 200, body: geocodingResponse }));
		const cities = await weatherService.searchIndianCities("gur", fakeFetch);

		assert.strictEqual(cities.length, 2, "The US city was filtered out");
		assert.deepEqual(cities[0], {
			id: 1, name: "Gurugram", state: "Haryana", latitude: 28.46, longitude: 77.03, label: "Gurugram, Haryana"
		}, "Mapped to id, name, state, coordinates and label");
		assert.strictEqual(cities[1].label, "Gurgaon Town", "Label without a state when the API has none");
	});

	QUnit.test("No results gives an empty list", async (assert) => {
		const fakeFetch = createFakeFetch(() => ({ status: 200, body: {} }));
		assert.deepEqual(await weatherService.searchIndianCities("zzzz", fakeFetch), [], "Empty list");
	});

	/* ---------- forecast ---------- */

	QUnit.module("weatherService - forecast");

	QUnit.test("Calls our proxy, never the real API or a key", async (assert) => {
		const fakeFetch = createFakeFetch(() => ({ status: 200, body: forecastResponse }));
		await weatherService.getForecast(28.4595, 77.0266, fakeFetch);

		const url = fakeFetch.calls[0];
		assert.ok(url.startsWith("/weather-api/28.4595,77.0266"), "Goes through the /weather-api proxy");
		assert.ok(url.includes("units=ca"), "Asks for °C and km/h");
		assert.notOk(url.includes("pirateweather.net"), "Browser never calls the real API host");
		assert.notOk(/key/i.test(url), "No API key in the URL");
	});

	QUnit.test("Maps the raw response into clean values", async (assert) => {
		const fakeFetch = createFakeFetch(() => ({ status: 200, body: forecastResponse }));
		const forecast = await weatherService.getForecast(28.46, 77.03, fakeFetch);

		assert.strictEqual(forecast.timezone, "Asia/Kolkata", "Timezone kept");
		assert.strictEqual(forecast.current.temperature, 26, "Temperature rounded");
		assert.strictEqual(forecast.current.feelsLike, 25, "Feels like rounded");
		assert.strictEqual(forecast.current.humidity, 47, "Humidity 0.47 -> 47%");
		assert.strictEqual(forecast.current.windSpeed, 11, "Wind rounded");
		assert.strictEqual(forecast.current.emoji, "☀️", "Clear day -> sun emoji");
		assert.strictEqual(forecast.current.textKey, "weatherClear", "Clear day -> i18n key");

		assert.strictEqual(forecast.daily.length, 7, "Only 7 days kept (API sends 8)");
		assert.strictEqual(forecast.daily[0].high, 30, "Daily high rounded");
		assert.strictEqual(forecast.daily[0].low, 19, "Daily low rounded");
		assert.strictEqual(forecast.daily[0].rainChance, 46, "Rain chance 0.46 -> 46%");
		assert.strictEqual(forecast.daily[4].emoji, "🌧️", "Rain day -> rain emoji");
	});

	QUnit.test("Falls back to temperatureHigh / temperatureLow", (assert) => {
		const mapped = weatherService.mapForecast({
			daily: { data: [{ time: 1761417000, icon: "cloudy", temperatureHigh: 31.2, temperatureLow: 21.7 }] }
		});
		assert.strictEqual(mapped.daily[0].high, 31, "High from temperatureHigh");
		assert.strictEqual(mapped.daily[0].low, 22, "Low from temperatureLow");
		assert.strictEqual(mapped.current.temperature, null, "Missing current data gives null, not a crash");
	});

	QUnit.test("Rejects invalid coordinates without calling the API", async (assert) => {
		const fakeFetch = createFakeFetch(() => ({ status: 200, body: forecastResponse }));
		await expectError(assert, weatherService.getForecast("abc", undefined, fakeFetch), "NOT_FOUND");
		assert.strictEqual(fakeFetch.calls.length, 0, "No request was made");
	});

	QUnit.test("Icon codes become emoji and text keys", (assert) => {
		assert.deepEqual(weatherService.describeIcon("rain"), { emoji: "🌧️", textKey: "weatherRain" }, "Rain");
		assert.deepEqual(weatherService.describeIcon("wind"), { emoji: "💨", textKey: "weatherWindy" }, "Wind uses weatherWindy");
		assert.deepEqual(weatherService.describeIcon("something-new"), { emoji: "🌡️", textKey: "weatherUnknown" }, "Unknown icon has a fallback");
	});

	/* ---------- errors ---------- */

	QUnit.module("weatherService - errors");

	const statusCases = [
		{ status: 401, code: "API_KEY" },
		{ status: 403, code: "API_KEY" },
		{ status: 404, code: "NOT_FOUND" },
		{ status: 429, code: "RATE_LIMIT" },
		{ status: 500, code: "SERVER" }
	];

	statusCases.forEach((testCase) => {
		QUnit.test("HTTP " + testCase.status + " becomes " + testCase.code, async (assert) => {
			const fakeFetch = createFakeFetch(() => ({ status: testCase.status, body: {} }));
			await expectError(assert, weatherService.getForecast(28.46, 77.03, fakeFetch), testCase.code, testCase.status);
		});
	});

	QUnit.test("No internet becomes NETWORK", async (assert) => {
		const fakeFetch = createFakeFetch(() => new TypeError("Failed to fetch"));
		await expectError(assert, weatherService.searchIndianCities("delhi", fakeFetch), "NETWORK");
	});

	QUnit.test("An aborted (too slow) request becomes TIMEOUT", async (assert) => {
		const abortError = new Error("aborted");
		abortError.name = "AbortError";
		const fakeFetch = createFakeFetch(() => abortError);
		await expectError(assert, weatherService.getForecast(28.46, 77.03, fakeFetch), "TIMEOUT");
	});

	/* ---------- recent cities ---------- */

	QUnit.module("weatherService - recent cities");

	function city(id, name) {
		return { id: id, name: name, state: "", latitude: 1, longitude: 2, label: name };
	}

	QUnit.test("Newest first, no duplicates, max 5", (assert) => {
		const storage = createFakeStorage();
		["Delhi", "Mumbai", "Pune", "Goa", "Agra", "Kochi"].forEach((name, index) => {
			weatherService.saveRecentCity(city(index + 1, name), storage);
		});
		let recent = weatherService.loadRecentCities(storage);
		assert.strictEqual(recent.length, 5, "Only 5 kept");
		assert.strictEqual(recent[0].name, "Kochi", "Newest first");
		assert.notOk(recent.some((item) => item.name === "Delhi"), "Oldest one dropped");

		weatherService.saveRecentCity(city(3, "Pune"), storage);
		recent = weatherService.loadRecentCities(storage);
		assert.strictEqual(recent[0].name, "Pune", "Searching again moves it to the front");
		assert.strictEqual(recent.filter((item) => item.name === "Pune").length, 1, "No duplicate");
	});

	QUnit.test("Broken or missing data gives an empty list", (assert) => {
		assert.deepEqual(weatherService.loadRecentCities(createFakeStorage()), [], "Nothing saved");
		assert.deepEqual(weatherService.loadRecentCities(createFakeStorage({ "ui5shop.recentCities": "oops" })), [], "Broken data");
	});
});