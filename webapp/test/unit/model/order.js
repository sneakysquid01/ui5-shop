sap.ui.define([
	"ui5/shop/model/order"
], function (order) {
	"use strict";

	function createFakeStorage(initialData) {
		const data = Object.assign({}, initialData);
		return {
			getItem: (key) => (key in data ? data[key] : null),
			setItem: (key, value) => { data[key] = String(value); }
		};
	}

	const fixedDate = new Date(1700000012345);
	const sampleCart = {
		items: [{ productId: "P1", name: "Headphones", price: 1000, quantity: 2, lineTotal: 2000 }],
		itemCount: 2,
		subtotal: 2000,
		tax: 360,
		total: 2360
	};
	const sampleDetails = {
		delivery: { fullName: "Test User", city: "Gurgaon" },
		paymentMethod: "cod"
	};

	QUnit.module("order");

	QUnit.test("Order ID uses the last 8 digits of the time", (assert) => {
		assert.strictEqual(order.generateOrderId(fixedDate), "ORD-00012345", "ID format is ORD-xxxxxxxx");
	});

	QUnit.test("Creates an order from the cart and checkout details", (assert) => {
		const newOrder = order.createOrder(sampleCart, sampleDetails, fixedDate);

		assert.strictEqual(newOrder.orderId, "ORD-00012345", "Has an order ID");
		assert.strictEqual(newOrder.date, fixedDate.toISOString(), "Has the order date");
		assert.strictEqual(newOrder.total, 2360, "Has the cart total");
		assert.strictEqual(newOrder.paymentMethod, "cod", "Has the payment method");
		assert.notStrictEqual(newOrder.delivery, sampleDetails.delivery, "Delivery details are a copy");
		assert.notStrictEqual(newOrder.items[0], sampleCart.items[0], "Items are copies");
	});

	QUnit.test("The last order can be saved and loaded", (assert) => {
		const storage = createFakeStorage();
		const newOrder = order.createOrder(sampleCart, sampleDetails, fixedDate);

		order.saveLastOrder(newOrder, storage);
		assert.strictEqual(order.loadLastOrder(storage).orderId, "ORD-00012345", "Saved order is loaded");
		assert.strictEqual(order.loadLastOrder(createFakeStorage()), null, "No saved order gives null");
	});
});