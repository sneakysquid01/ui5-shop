sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"../model/cart",
	"../model/order",
	"../model/validation",
	"../model/formatter"
], function (BaseController, JSONModel, MessageBox, cart, order, validation, formatter) {
	"use strict";

	const PAYMENT_METHODS = ["cod", "upi", "card"];

	/** fresh, empty checkout data */
	function createCheckoutData() {
		return {
			delivery: {
				fullName: "",
				phone: "",
				email: "",
				address: "",
				city: "",
				state: "",
				pinCode: ""
			},
			valueStates: {
				fullName: "None",
				phone: "None",
				email: "None",
				address: "None",
				city: "None",
				state: "None",
				pinCode: "None"
			},
			touched: {},
			paymentIndex: 0,
			paymentMethod: "cod"
		};
	}

	return BaseController.extend("ui5.shop.controller.Checkout", {
		onInit() {
			this.getView().setModel(new JSONModel(createCheckoutData()), "checkout");
			this.getRouter().getRoute("checkout").attachPatternMatched(this._onCheckoutMatched, this);
		},

		_onCheckoutMatched() {
			// nothing to buy (e.g. checkout link opened directly): go to the cart instead
			if (this.getCart().itemCount === 0) {
				this.getRouter().navTo("cart", {}, true);
				return;
			}

			// start every checkout fresh at step 1
			this.getModel("checkout").setData(createCheckoutData());
			const wizard = this.byId("checkoutWizard");
			wizard.discardProgress(this.byId("reviewStep"));
			wizard.invalidateStep(this.byId("deliveryStep"));
		},

		onDeliveryChange(event) {
			const input = event.getSource();
			const path = input.getBinding("value").getPath(); // e.g. "/delivery/phone"
			const field = path.split("/").pop();               // e.g. "phone"
			const checkoutModel = this.getModel("checkout");

			checkoutModel.setProperty(path, event.getParameter("value"));
			checkoutModel.setProperty("/touched/" + field, true);

			this._validateDelivery();
		},

		_validateDelivery() {
			const checkoutModel = this.getModel("checkout");
			const result = validation.validateDelivery(checkoutModel.getProperty("/delivery"));
			const touched = checkoutModel.getProperty("/touched");

			// only show red errors on fields the user has already typed in
			Object.keys(result.fields).forEach((field) => {
				const showError = touched[field] && !result.fields[field];
				checkoutModel.setProperty("/valueStates/" + field, showError ? "Error" : "None");
			});

			// allow "Next" only when the whole form is valid
			const wizard = this.byId("checkoutWizard");
			const deliveryStep = this.byId("deliveryStep");
			if (result.valid) {
				wizard.validateStep(deliveryStep);
			} else {
				wizard.invalidateStep(deliveryStep);
			}
		},

		onPaymentSelect(event) {
			const method = PAYMENT_METHODS[event.getParameter("selectedIndex")];
			this.getModel("checkout").setProperty("/paymentMethod", method);
		},

		onPlaceOrder() {
			const resourceBundle = this.getResourceBundle();
			const total = formatter.price(this.getCart().total);

			MessageBox.confirm(resourceBundle.getText("placeOrderConfirm", [total]), {
				title: resourceBundle.getText("placeOrderTitle"),
				emphasizedAction: MessageBox.Action.OK,
				onClose: (action) => {
					if (action === MessageBox.Action.OK) {
						this._submitOrder();
					}
				}
			});
		},

		_submitOrder() {
			const checkout = this.getModel("checkout").getData();
			const newOrder = order.createOrder(this.getCart(), {
				delivery: checkout.delivery,
				paymentMethod: checkout.paymentMethod
			});

			this._reduceStock(newOrder.items);

			this.getOwnerComponent().getModel("order").setData(newOrder);
			order.saveLastOrder(newOrder);

			this.setCart(cart.clear());

			// replace history so "back" does not return to the finished checkout
			this.getRouter().navTo("orderConfirmation", {
				orderId: newOrder.orderId
			}, true);
		},

		/** lower the stock of each purchased product (in memory, mock data) */
		_reduceStock(items) {
			const productModel = this.getModel("product");
			const products = productModel.getProperty("/Products") || [];

			items.forEach((item) => {
				const index = products.findIndex((product) => product.productId === item.productId);
				if (index !== -1) {
					const newStock = Math.max(0, products[index].stock - item.quantity);
					productModel.setProperty("/Products/" + index + "/stock", newStock);
				}
			});
		},

		onCancel() {
			this.getRouter().navTo("cart", {}, true);
		}
	});
});