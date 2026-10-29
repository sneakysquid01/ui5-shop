sap.ui.define([
	"sap/ui/test/Opa5",
	"sap/ui/test/actions/Press",
	"sap/ui/test/matchers/AggregationFilled",
	"sap/ui/test/matchers/I18NText"
], function (Opa5, Press, AggregationFilled, I18NText) {
	"use strict";

	const viewName = "ui5.shop.view.Cart";

	return Opa5.extend("ui5.shop.test.integration.pages.CartPage", {
		// Actions
		iPressProceedToCheckout() {
			return this.waitFor({
				controlType: "sap.m.Button",
				viewName: viewName,
				matchers: new I18NText({ propertyName: "text", key: "proceedToCheckout" }),
				actions: new Press(),
				errorMessage: "Could not find the 'Proceed to checkout' button"
			});
		},

		// Assertions
		iShouldSeeItemsInTheCart(count) {
			return this.waitFor({
				id: "cartTable",
				viewName: viewName,
				matchers: new AggregationFilled({ name: "items" }),
				success(table) {
					Opa5.assert.strictEqual(table.getItems().length, count, "The cart shows " + count + " item(s)");
				},
				errorMessage: "The cart table is empty or not displayed"
			});
		}
	});
});