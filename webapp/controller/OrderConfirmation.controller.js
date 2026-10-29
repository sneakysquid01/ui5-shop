sap.ui.define([
	"./BaseController",
	"../model/order"
], function (BaseController, order) {
	"use strict";

	return BaseController.extend("ui5.shop.controller.OrderConfirmation", {
		onInit() {
			this.getRouter().getRoute("orderConfirmation").attachPatternMatched(this._onOrderMatched, this);
		},

		_onOrderMatched(event) {
			const orderId = event.getParameter("arguments").orderId;
			const orderModel = this.getModel("order");

			if (orderModel.getProperty("/orderId") === orderId) {
				return; // the order we just placed is already in the model
			}

			// e.g. page refreshed: try the last saved order
			const savedOrder = order.loadLastOrder();
			if (savedOrder && savedOrder.orderId === orderId) {
				orderModel.setData(savedOrder);
			} else {
				this.getRouter().getTargets().display("notFound");
			}
		},

		onContinueShopping() {
			this.getRouter().navTo("shop", {}, true);
		}
	});
});