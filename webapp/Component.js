sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device",
	"./model/cart",
	"./model/order",
	"./model/review"
], function (UIComponent, JSONModel, Device, cart, order, review) {
	"use strict";

	return UIComponent.extend("ui5.shop.Component", {
		metadata: {
			interfaces: ["sap.ui.core.IAsyncContentCreation"],
			manifest: "json"
		},

		init() {
			// call the init function of the parent
			UIComponent.prototype.init.call(this);

			// device model (phone / tablet / desktop, touch)
			const deviceModel = new JSONModel(Device);
			deviceModel.setDefaultBindingMode("OneWay");
			this.setModel(deviceModel, "device");

			// cart model, restored from the browser so a page refresh keeps the cart
			this.setModel(new JSONModel(cart.load()), "cart");

			// last placed order (for the confirmation page)
			this.setModel(new JSONModel(order.loadLastOrder() || {}), "order");

			// reviews: sample reviews (reviews.json) + the user's own saved reviews
			this._prepareReviews();

			// create the views based on the url/hash
			this.getRouter().initialize();
		},

		_prepareReviews() {
			const reviewModel = this.getModel("review");
			const productModel = this.getModel("product");

			Promise.all([reviewModel.dataLoaded(), productModel.dataLoaded()]).then(() => {
				const userReviews = review.loadUserReviews();
				const sampleReviews = reviewModel.getProperty("/Reviews") || [];
				reviewModel.setProperty("/Reviews", userReviews.concat(sampleReviews));

				// remember each product's original rating, then add the user's reviews to it
				const products = productModel.getProperty("/Products") || [];
				products.forEach((product, index) => {
					const path = "/Products/" + index;
					const ownReviews = userReviews.filter((item) => item.productId === product.productId);
					const result = review.calculateProductRating(product.rating, product.reviewCount, ownReviews);

					productModel.setProperty(path + "/baseRating", product.rating);
					productModel.setProperty(path + "/baseReviewCount", product.reviewCount);
					productModel.setProperty(path + "/rating", result.rating);
					productModel.setProperty(path + "/reviewCount", result.reviewCount);
				});
			});
		},

		getContentDensityClass() {
			return Device.support.touch ? "sapUiSizeCozy" : "sapUiSizeCompact";
		}
	});
});