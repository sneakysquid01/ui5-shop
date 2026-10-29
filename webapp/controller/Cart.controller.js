sap.ui.define([
	"./BaseController",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"../model/cart"
], function (BaseController, MessageBox, MessageToast, cart) {
	"use strict";

	return BaseController.extend("ui5.shop.controller.Cart", {
		_getItemContext(event) {
			return event.getSource().getBindingContext("cart");
		},

		onQuantityChange(event) {
			const productId = this._getItemContext(event).getProperty("productId");
			const quantity = event.getParameter("value");

			// cart.js keeps the quantity between 1 and the stock, then totals are recalculated
			this.setCart(cart.updateQuantity(this.getCart(), productId, quantity));
		},

		onRemoveItem(event) {
			const context = this._getItemContext(event);
			const name = context.getProperty("name");

			this.setCart(cart.removeItem(this.getCart(), context.getProperty("productId")));
			MessageToast.show(this.getResourceBundle().getText("cartItemRemoved", [name]));
		},

		onClearCart() {
			const resourceBundle = this.getResourceBundle();

			MessageBox.confirm(resourceBundle.getText("cartClearConfirm"), {
				title: resourceBundle.getText("cartClearTitle"),
				emphasizedAction: MessageBox.Action.OK,
				onClose: (action) => {
					if (action === MessageBox.Action.OK) {
						this.setCart(cart.clear());
						MessageToast.show(resourceBundle.getText("cartCleared"));
					}
				}
			});
		},

		onProductPress(event) {
			const productId = this._getItemContext(event).getProperty("productId");
			this.getRouter().navTo("product", {
				productId: productId
			});
		},

		onContinueShopping() {
			this.getRouter().navTo("shop");
		},

		onCheckout() {
			this.getRouter().navTo("checkout");
		}
	});
});