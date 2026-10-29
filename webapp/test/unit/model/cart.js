sap.ui.define([
	"ui5/shop/model/cart"
], function (cart) {
	"use strict";

	// small test products (independent of products.json)
	const headphones = { productId: "P1", name: "Headphones", price: 1000, stock: 5, images: ["images/p1.svg"] };
	const mouse = { productId: "P2", name: "Mouse", price: 500, stock: 2, images: [] };

	// fake browser storage, so tests never touch the real localStorage
	function createFakeStorage(initialData) {
		const data = Object.assign({}, initialData);
		return {
			getItem: (key) => (key in data ? data[key] : null),
			setItem: (key, value) => { data[key] = String(value); }
		};
	}

	QUnit.module("cart - totals");

	QUnit.test("An empty cart has zero totals", (assert) => {
		const emptyCart = cart.createEmptyCart();
		assert.deepEqual(emptyCart.items, [], "No items");
		assert.strictEqual(emptyCart.itemCount, 0, "Item count is 0");
		assert.strictEqual(emptyCart.total, 0, "Total is 0");
	});

	QUnit.test("Totals add 18% GST, rounded to the nearest rupee", (assert) => {
		const totals = cart.calculateTotals([
			{ price: 1000, quantity: 2 },
			{ price: 499, quantity: 1 }
		]);
		assert.strictEqual(totals.itemCount, 3, "3 items in total");
		assert.strictEqual(totals.subtotal, 2499, "Subtotal is 2499");
		assert.strictEqual(totals.tax, 450, "GST 449.82 is rounded to 450");
		assert.strictEqual(totals.total, 2949, "Total is subtotal + GST");
	});

	QUnit.module("cart - addItem");

	QUnit.test("Adds a new product to the cart", (assert) => {
		const result = cart.addItem(cart.createEmptyCart(), headphones, 2);
		assert.strictEqual(result.added, 2, "2 were added");
		assert.strictEqual(result.cart.items.length, 1, "1 cart line");
		assert.strictEqual(result.cart.items[0].quantity, 2, "Quantity is 2");
		assert.strictEqual(result.cart.items[0].lineTotal, 2000, "Line total is 2000");
		assert.strictEqual(result.cart.items[0].image, "images/p1.svg", "First image is used");
	});

	QUnit.test("Adding the same product again increases its quantity", (assert) => {
		const first = cart.addItem(cart.createEmptyCart(), headphones, 2).cart;
		const second = cart.addItem(first, headphones, 1).cart;
		assert.strictEqual(second.items.length, 1, "Still only 1 cart line");
		assert.strictEqual(second.items[0].quantity, 3, "Quantity is now 3");
	});

	QUnit.test("Only adds what is left in stock", (assert) => {
		const first = cart.addItem(cart.createEmptyCart(), headphones, 4).cart;
		const result = cart.addItem(first, headphones, 3);
		assert.strictEqual(result.added, 1, "Only 1 more could be added (stock 5)");
		assert.strictEqual(result.cart.items[0].quantity, 5, "Quantity stops at the stock");
	});

	QUnit.test("Adds nothing when the stock limit is already reached", (assert) => {
		const full = cart.addItem(cart.createEmptyCart(), headphones, 5).cart;
		const result = cart.addItem(full, headphones, 1);
		assert.strictEqual(result.added, 0, "Nothing added");
		assert.strictEqual(result.cart, full, "Cart is unchanged");
	});

	QUnit.test("Adds nothing for an out-of-stock product", (assert) => {
		const outOfStock = Object.assign({}, headphones, { stock: 0 });
		const result = cart.addItem(cart.createEmptyCart(), outOfStock, 1);
		assert.strictEqual(result.added, 0, "Nothing added");
		assert.strictEqual(result.cart.items.length, 0, "Cart is still empty");
	});

	QUnit.module("cart - update and remove");

	QUnit.test("Quantity is kept between 1 and the stock", (assert) => {
		const oneItem = cart.addItem(cart.createEmptyCart(), headphones, 1).cart;
		assert.strictEqual(cart.updateQuantity(oneItem, "P1", 10).items[0].quantity, 5, "Too high is limited to stock (5)");
		assert.strictEqual(cart.updateQuantity(oneItem, "P1", 0).items[0].quantity, 1, "Too low becomes 1");

		const updated = cart.updateQuantity(oneItem, "P1", 3);
		assert.strictEqual(updated.items[0].quantity, 3, "Normal value is used");
		assert.strictEqual(updated.subtotal, 3000, "Totals are recalculated");
	});

	QUnit.test("Removes one product and keeps the others", (assert) => {
		let twoItems = cart.addItem(cart.createEmptyCart(), headphones, 1).cart;
		twoItems = cart.addItem(twoItems, mouse, 1).cart;

		const result = cart.removeItem(twoItems, "P1");
		assert.strictEqual(result.items.length, 1, "1 line left");
		assert.strictEqual(result.items[0].productId, "P2", "The mouse is still there");
		assert.strictEqual(result.itemCount, 1, "Item count is updated");
	});

	QUnit.module("cart - save and load");

	QUnit.test("A saved cart can be loaded again", (assert) => {
		const storage = createFakeStorage();
		const original = cart.addItem(cart.createEmptyCart(), headphones, 2).cart;

		cart.save(original, storage);
		const loaded = cart.load(storage);

		assert.strictEqual(loaded.itemCount, 2, "Item count is restored");
		assert.strictEqual(loaded.total, original.total, "Total is restored");
	});

	QUnit.test("Broken or missing data gives an empty cart", (assert) => {
		assert.strictEqual(cart.load(createFakeStorage({ "ui5shop.cart": "not json" })).itemCount, 0, "Broken data -> empty cart");
		assert.strictEqual(cart.load(createFakeStorage()).itemCount, 0, "Nothing saved -> empty cart");
	});
});