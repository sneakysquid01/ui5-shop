sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/ui/core/UIComponent",
	"sap/m/MessageToast",
	"../model/cart"
], function (Controller, History, UIComponent, MessageToast, cart) {
	"use strict";

	return Controller.extend("ui5.shop.controller.BaseController", {
		getRouter() {
			return UIComponent.getRouterFor(this);
		},

		getModel(name) {
			return this.getView().getModel(name) || this.getOwnerComponent().getModel(name);
		},

		getResourceBundle() {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		onNavBack() {
			const previousHash = History.getInstance().getPreviousHash();

			if (previousHash !== undefined) {
				window.history.go(-1);
			} else {
				this.getRouter().navTo("shop", {}, true);
			}
		},

		/* ---------- cart helpers ---------- */

		getCart() {
			return this.getOwnerComponent().getModel("cart").getData();
		},

		/** put a new cart into the model (updates the UI) and save it in the browser */
		setCart(newCart) {
			this.getOwnerComponent().getModel("cart").setData(newCart);
			cart.save(newCart);
		},

		/** add a product, respecting stock; returns how many were actually added */
		addToCart(product, quantity) {
			const result = cart.addItem(this.getCart(), product, quantity);
			if (result.added > 0) {
				this.setCart(result.cart);
			}
			return result.added;
		},

		/** add a product and tell the user what happened */
		addToCartWithMessage(product, quantity) {
			const added = this.addToCart(product, quantity);
			const resourceBundle = this.getResourceBundle();

			if (added === 0) {
				MessageToast.show(resourceBundle.getText("cartStockLimit", [product.name]));
			} else if (added < quantity) {
				MessageToast.show(resourceBundle.getText("addedToCartLimited", [added, product.name]));
			} else {
				MessageToast.show(resourceBundle.getText("addedToCart", [added, product.name]));
			}
			return added;
		},

		onCartPress() {
			this.getRouter().navTo("cart");
		},

		onWeatherPress() {
			this.getRouter().navTo("weather");
		}
	});
});