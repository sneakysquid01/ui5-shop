sap.ui.define([
	"./BaseController"
], function (BaseController) {
	"use strict";

	return BaseController.extend("ui5.shop.controller.NotFound", {
		onNavToShop() {
			this.getRouter().navTo("shop", {}, true);
		}
	});
});