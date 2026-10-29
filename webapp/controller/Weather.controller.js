sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/weatherService"
], function (BaseController, JSONModel, weatherService) {
	"use strict";

	// wait until the user pauses typing before calling the geocoding API (debounce)
	const SEARCH_DELAY_MS = 300;

	// weatherService error code -> i18n message key
	const ERROR_TEXT_KEYS = {
		NOT_FOUND: "weatherErrorNotFound",
		NETWORK: "weatherErrorNetwork",
		TIMEOUT: "weatherErrorTimeout",
		API_KEY: "weatherErrorApiKey",
		RATE_LIMIT: "weatherErrorRateLimit",
		SERVER: "weatherErrorServer"
	};

	return BaseController.extend("ui5.shop.controller.Weather", {
		onInit() {
			this.getView().setModel(new JSONModel({
				query: "",
				suggestions: [],
				recent: weatherService.loadRecentCities(),
				selectedCity: null,
				forecast: null,
				busy: false,
				errorText: ""
			}), "weatherView");

			this.getRouter().getRoute("weather").attachPatternMatched(this._onWeatherMatched, this);
		},

		_onWeatherMatched() {
			// refresh the recent list each time the page opens
			this.getModel("weatherView").setProperty("/recent", weatherService.loadRecentCities());
		},

		/* ---------- searching ---------- */

		onCityLiveChange(event) {
			const query = event.getParameter("value");

			// debounce: restart the timer on every keystroke, search only after a short pause
			clearTimeout(this._searchTimer);
			this._searchTimer = setTimeout(() => this._loadSuggestions(query), SEARCH_DELAY_MS);
		},

		async _loadSuggestions(query) {
			const weatherViewModel = this.getModel("weatherView");
			this._latestQuery = query;

			if (query.trim().length < weatherService.MIN_QUERY_LENGTH) {
				weatherViewModel.setProperty("/suggestions", []);
				return;
			}

			try {
				const cities = await weatherService.searchIndianCities(query);

				// ignore old answers if the user has typed something new meanwhile
				if (query !== this._latestQuery) {
					return;
				}
				weatherViewModel.setProperty("/suggestions", cities);
			} catch (error) {
				this._showError(error);
			}
		},

		onCitySuggestionSelected(event) {
			const item = event.getParameter("selectedItem");
			if (!item) {
				return;
			}
			this._showWeatherFor(item.getBindingContext("weatherView").getObject());
		},

		/** Enter pressed: use the first matching Indian city */
		async onCitySubmit(event) {
			const query = event.getParameter("value");
			const weatherViewModel = this.getModel("weatherView");

			if (!query || query.trim().length < weatherService.MIN_QUERY_LENGTH) {
				return;
			}

			clearTimeout(this._searchTimer);
			weatherViewModel.setProperty("/busy", true);
			weatherViewModel.setProperty("/errorText", "");

			try {
				const cities = await weatherService.searchIndianCities(query);
				if (!cities.length) {
					weatherViewModel.setProperty("/forecast", null);
					weatherViewModel.setProperty("/errorText",
						this.getResourceBundle().getText("weatherCityNotFound", [query]));
					return;
				}
				await this._showWeatherFor(cities[0]);
			} catch (error) {
				this._showError(error);
			} finally {
				weatherViewModel.setProperty("/busy", false);
			}
		},

		onRecentPress(event) {
			this._showWeatherFor(event.getSource().getBindingContext("weatherView").getObject());
		},

		onRetry() {
			const city = this.getModel("weatherView").getProperty("/selectedCity");
			if (city) {
				this._showWeatherFor(city);
			}
		},

		/* ---------- loading the weather ---------- */

		async _showWeatherFor(city) {
			const weatherViewModel = this.getModel("weatherView");

			weatherViewModel.setProperty("/selectedCity", city);
			weatherViewModel.setProperty("/query", city.label);
			weatherViewModel.setProperty("/suggestions", []);
			weatherViewModel.setProperty("/errorText", "");
			weatherViewModel.setProperty("/busy", true);

			try {
				const forecast = await weatherService.getForecast(city.latitude, city.longitude);

				// ignore the answer if the user picked another city meanwhile
				if (weatherViewModel.getProperty("/selectedCity") !== city) {
					return;
				}
				weatherViewModel.setProperty("/forecast", forecast);
				weatherViewModel.setProperty("/recent", weatherService.saveRecentCity(city));
			} catch (error) {
				weatherViewModel.setProperty("/forecast", null);
				this._showError(error);
			} finally {
				weatherViewModel.setProperty("/busy", false);
			}
		},

		/** turn a weatherService error code into a friendly, translated message */
		_showError(error) {
			const key = ERROR_TEXT_KEYS[error && error.code] || "weatherErrorServer";
			this.getModel("weatherView").setProperty("/errorText", this.getResourceBundle().getText(key));
		}
	});
});
