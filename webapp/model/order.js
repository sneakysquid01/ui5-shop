sap.ui.define([], function () {
	"use strict";

	const STORAGE_KEY = "ui5shop.lastOrder";

	/** e.g. "ORD-48213907" (last 8 digits of the current time) */
	function generateOrderId(date) {
		return "ORD-" + date.getTime().toString().slice(-8);
	}

	/** build an order from the current cart and the checkout details */
	function createOrder(cart, details, now) {
		const date = now || new Date();

		return {
			orderId: generateOrderId(date),
			date: date.toISOString(),
			items: cart.items.map((item) => Object.assign({}, item)),
			itemCount: cart.itemCount,
			subtotal: cart.subtotal,
			tax: cart.tax,
			total: cart.total,
			delivery: Object.assign({}, details.delivery),
			paymentMethod: details.paymentMethod
		};
	}

	function saveLastOrder(order, storage) {
		try {
			(storage || window.localStorage).setItem(STORAGE_KEY, JSON.stringify(order));
		} catch (error) {
			// storage not available: confirmation still works until the page is refreshed
		}
	}

	function loadLastOrder(storage) {
		try {
			return JSON.parse((storage || window.localStorage).getItem(STORAGE_KEY));
		} catch (error) {
			return null;
		}
	}

	return {
		generateOrderId: generateOrderId,
		createOrder: createOrder,
		saveLastOrder: saveLastOrder,
		loadLastOrder: loadLastOrder
	};
});