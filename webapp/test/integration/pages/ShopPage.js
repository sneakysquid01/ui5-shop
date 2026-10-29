sap.ui.define([
	"sap/ui/test/Opa5",
	"sap/ui/test/actions/Press",
	"sap/ui/test/matchers/AggregationFilled",
	"sap/ui/test/matchers/I18NText"
], function (Opa5, Press, AggregationFilled, I18NText) {
	"use strict";

	const viewName = "ui5.shop.view.Shop";

	return Opa5.extend("ui5.shop.test.integration.pages.ShopPage", {
		// Actions
		iPressTheFirstProductDetailsButton() {
			return this.waitFor({
				controlType: "sap.m.Button",
				viewName: viewName,
				matchers: (button) => button.getIcon() === "sap-icon://navigation-right-arrow",
				success(buttons) {
					new Press().executeOn(buttons[0]);
				},
				errorMessage: "Could not find a product details (›) button"
			});
		},

		iAddTheFirstAvailableProductToCart() {
			return this.waitFor({
				controlType: "sap.m.Button",
				viewName: viewName,
				matchers: [
					new I18NText({ propertyName: "text", key: "addToCart" }),
					(button) => button.getEnabled()
				],
				success(buttons) {
					new Press().executeOn(buttons[0]);
				},
				errorMessage: "Could not find an enabled 'Add to cart' button"
			});
		},

		iPressTheCartButton() {
			return this.waitFor({
				controlType: "sap.m.Button",
				viewName: viewName,
				// the header cart button is the transparent one with the cart icon
				matchers: (button) => button.getIcon() === "sap-icon://cart" && button.getType() === "Transparent",
				success(buttons) {
					new Press().executeOn(buttons[0]);
				},
				errorMessage: "Could not find the cart button"
			});
		},

		// Assertions
		iShouldSeeTheProductGrid() {
			return this.waitFor({
				id: "productGrid",
				viewName: viewName,
				matchers: new AggregationFilled({ name: "items" }),
				success() {
					Opa5.assert.ok(true, "The product grid shows products");
				},
				errorMessage: "The product grid is empty or not displayed"
			});
		}
	});
});