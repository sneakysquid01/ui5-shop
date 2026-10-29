sap.ui.define([
	"sap/ui/test/Opa5"
], function (Opa5) {
	"use strict";

	const viewName = "ui5.shop.view.Checkout";

	return Opa5.extend("ui5.shop.test.integration.pages.CheckoutPage", {
		// Assertions
		iShouldSeeTheCheckoutWizard() {
			return this.waitFor({
				id: "checkoutWizard",
				viewName: viewName,
				success() {
					Opa5.assert.ok(true, "The checkout wizard is displayed");
				},
				errorMessage: "The checkout wizard was not displayed"
			});
		}
	});
});