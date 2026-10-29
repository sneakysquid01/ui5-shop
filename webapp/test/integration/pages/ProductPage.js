sap.ui.define([
	"sap/ui/test/Opa5",
	"sap/ui/test/actions/Press"
], function (Opa5, Press) {
	"use strict";

	const viewName = "ui5.shop.view.Product";

	return Opa5.extend("ui5.shop.test.integration.pages.ProductPage", {
		// Actions
		iPressTheBackButton() {
			return this.waitFor({
				id: "productPage",
				viewName: viewName,
				success(page) {
					new Press({ idSuffix: "navButton" }).executeOn(page);
				},
				errorMessage: "Could not press the back button on the product page"
			});
		},

		// Assertions
		iShouldSeeTheProductDetails() {
			return this.waitFor({
				id: "objectPage",
				viewName: viewName,
				success() {
					Opa5.assert.ok(true, "The product details (Object Page) are displayed");
				},
				errorMessage: "The product details page was not displayed"
			});
		}
	});
});