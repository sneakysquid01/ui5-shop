sap.ui.define([
	"sap/ui/core/format/NumberFormat",
	"sap/ui/core/format/DateFormat"
], function (NumberFormat, DateFormat) {
	"use strict";

	// "₹4,999" — currency symbol, no decimals
	const currencyFormat = NumberFormat.getCurrencyInstance({
		currencyCode: false,
		decimals: 0
	});

	// e.g. "13 Oct 2026, 4:35:12 PM" (follows the user's locale)
	const dateTimeFormat = DateFormat.getDateTimeInstance({
		style: "medium"
	});

	// e.g. "13 Oct 2026"
	const dateFormat = DateFormat.getDateInstance({
		style: "medium"
	});

	// e.g. "Wed, 29 Oct"
	const weekdayFormat = DateFormat.getDateInstance({
		pattern: "EEE, d MMM"
	});

	const LOW_STOCK_LIMIT = 5;

	const PAYMENT_TEXT_KEYS = {
		cod: "paymentCod",
		upi: "paymentUpi",
		card: "paymentCard"
	};

	function getResourceBundle(controller) {
		return controller.getOwnerComponent().getModel("i18n").getResourceBundle();
	}

	/** "2026-10-26" style key for a date in the user's local time */
	function localDayKey(date) {
		return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
	}

	return {
		/**
		 * Turns an app-relative image path into a full URL that works
		 * wherever the app runs (local server, launchpad, built app)
		 */
		imageUrl(path) {
			return path ? sap.ui.require.toUrl("ui5/shop/" + path) : "";
		},

		price(value) {
			if (value === undefined || value === null) {
				return "";
			}
			return currencyFormat.format(value, "INR");
		},

		/** "In stock" / "Only 3 left" / "Out of stock" — needs .bind($controller) for i18n */
		stockText(stock) {
			const resourceBundle = getResourceBundle(this);
			if (stock <= 0) {
				return resourceBundle.getText("outOfStock");
			}
			if (stock <= LOW_STOCK_LIMIT) {
				return resourceBundle.getText("lowStock", [stock]);
			}
			return resourceBundle.getText("inStock");
		},

		/** green / orange / red colour for the stock status */
		stockState(stock) {
			if (stock <= 0) {
				return "Error";
			}
			if (stock <= LOW_STOCK_LIMIT) {
				return "Warning";
			}
			return "Success";
		},

		/** "cod" -> "Cash on Delivery" etc. — needs .bind($controller) for i18n */
		paymentMethodText(method) {
			const key = PAYMENT_TEXT_KEYS[method];
			if (!key) {
				return "";
			}
			return getResourceBundle(this).getText(key);
		},

		dateTime(isoString) {
			return isoString ? dateTimeFormat.format(new Date(isoString)) : "";
		},

		date(isoString) {
			return isoString ? dateFormat.format(new Date(isoString)) : "";
		},

		/** "Riya Sharma" -> "RS", "Kabir" -> "K" */
		initials(name) {
			return (name || "")
				.trim()
				.split(/\s+/)
				.filter(Boolean)
				.slice(0, 2)
				.map((part) => part.charAt(0).toUpperCase())
				.join("");
		},

		/** weather condition key (e.g. "weatherRain") -> translated text — needs .bind($controller) */
		weatherText(textKey) {
			return textKey ? getResourceBundle(this).getText(textKey) : "";
		},

		/** "Today" / "Tomorrow" / "Wed, 29 Oct" — needs .bind($controller) */
		dayLabel(isoString) {
			if (!isoString) {
				return "";
			}
			const date = new Date(isoString);
			const today = new Date();
			const tomorrow = new Date();
			tomorrow.setDate(today.getDate() + 1);

			if (localDayKey(date) === localDayKey(today)) {
				return getResourceBundle(this).getText("weatherToday");
			}
			if (localDayKey(date) === localDayKey(tomorrow)) {
				return getResourceBundle(this).getText("weatherTomorrow");
			}
			return weekdayFormat.format(date);
		}
	};
});