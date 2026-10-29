sap.ui.define([
	"ui5/shop/model/formatter"
], function (formatter) {
	"use strict";

	// fake controller whose i18n just returns the key (and arguments), e.g. "lowStock:3"
	const controllerMock = {
		getOwnerComponent: () => ({
			getModel: () => ({
				getResourceBundle: () => ({
					getText: (key, args) => (args ? key + ":" + args.join(",") : key)
				})
			})
		})
	};

	QUnit.module("formatter");

	QUnit.test("price", (assert) => {
		assert.strictEqual(formatter.price(undefined), "", "No value gives an empty string");
		assert.strictEqual(formatter.price(null), "", "Null gives an empty string");
		assert.ok(formatter.price(4999).includes("₹"), "Price shows the rupee symbol");
	});

	QUnit.test("stockState colours", (assert) => {
		assert.strictEqual(formatter.stockState(0), "Error", "0 is red");
		assert.strictEqual(formatter.stockState(3), "Warning", "3 is orange");
		assert.strictEqual(formatter.stockState(5), "Warning", "5 is still low stock");
		assert.strictEqual(formatter.stockState(6), "Success", "6 is green");
	});

	QUnit.test("stockText uses the right text", (assert) => {
		assert.strictEqual(formatter.stockText.call(controllerMock, 0), "outOfStock", "Out of stock");
		assert.strictEqual(formatter.stockText.call(controllerMock, 3), "lowStock:3", "Only 3 left");
		assert.strictEqual(formatter.stockText.call(controllerMock, 20), "inStock", "In stock");
	});

	QUnit.test("paymentMethodText", (assert) => {
		assert.strictEqual(formatter.paymentMethodText.call(controllerMock, "cod"), "paymentCod", "Cash on Delivery");
		assert.strictEqual(formatter.paymentMethodText.call(controllerMock, "unknown"), "", "Unknown method gives empty text");
	});

	QUnit.test("imageUrl and dateTime", (assert) => {
		assert.strictEqual(formatter.imageUrl(""), "", "No path gives an empty string");
		assert.ok(formatter.imageUrl("images/x.svg").endsWith("images/x.svg"), "Path is turned into a URL");
		assert.strictEqual(formatter.dateTime(""), "", "No date gives an empty string");
	});
});