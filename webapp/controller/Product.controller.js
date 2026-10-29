sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Sorter",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"../model/review"
], function (BaseController, JSONModel, Filter, FilterOperator, Sorter, MessageBox, MessageToast, review) {
	"use strict";

	// sort options for the reviews list
	const REVIEW_SORTERS = {
		newest: [new Sorter("date", true)],
		highest: [new Sorter("rating", true), new Sorter("date", true)],
		lowest: [new Sorter("rating", false), new Sorter("date", true)]
	};

	function createReviewDraft(author) {
		return {
			rating: 0,
			author: author || "",
			comment: "",
			touched: {},
			valueStates: { author: "None", comment: "None" },
			canSubmit: false
		};
	}

	return BaseController.extend("ui5.shop.controller.Product", {
		onInit() {
			// view model for page-only state (the quantity chosen on this page)
			this.getView().setModel(new JSONModel({ quantity: 1 }), "productView");

			// view models for the reviews section and the "write a review" dialog
			this.getView().setModel(new JSONModel({
				breakdown: [],
				breakdownText: "",
				listTitle: "",
				sortKey: "newest"
			}), "reviewView");
			this.getView().setModel(new JSONModel(createReviewDraft()), "reviewDraft");

			this.getRouter().getRoute("product").attachPatternMatched(this._onProductMatched, this);
		},

		_onProductMatched(event) {
			const productId = event.getParameter("arguments").productId;
			const productModel = this.getModel("product");

			productModel.dataLoaded().then(() => {
				const products = productModel.getProperty("/Products") || [];
				const index = products.findIndex((product) => product.productId === productId);

				if (index === -1) {
					this.getRouter().getTargets().display("notFound");
					return;
				}

				this.getView().bindElement({
					path: "/Products/" + index,
					model: "product"
				});

				this._resetPage();
				this._showReviewsFor(productId);
			});
		},

		/** every time a product opens: quantity back to 1, first image, scroll to top */
		_resetPage() {
			this.getModel("productView").setProperty("/quantity", 1);

			const carousel = this.byId("productCarousel");
			const pages = carousel.getPages();
			if (pages.length) {
				carousel.setActivePage(pages[0]);
			}

			const objectPage = this.byId("objectPage");
			objectPage.scrollToSection(this.byId("imagesSection").getId(), 0);
		},

		_getCurrentProduct() {
			return this.getView().getBindingContext("product").getObject();
		},

		/* ---------- cart ---------- */

		onAddToCart() {
			const quantity = this.getModel("productView").getProperty("/quantity");
			this.addToCartWithMessage(this._getCurrentProduct(), quantity);
			this.getModel("productView").setProperty("/quantity", 1);
		},

		onBuyNow() {
			// add the selected quantity (if possible) and go straight to the cart
			const quantity = this.getModel("productView").getProperty("/quantity");
			this.addToCartWithMessage(this._getCurrentProduct(), quantity);
			this.getRouter().navTo("cart");
		},

		/* ---------- reviews list and summary ---------- */

		_showReviewsFor(productId) {
			this.getModel("review").dataLoaded().then(() => {
				this.getModel("reviewView").setProperty("/sortKey", "newest");

				// only show the reviews of this product, newest first
				const binding = this.byId("reviewList").getBinding("items");
				binding.filter(new Filter("productId", FilterOperator.EQ, productId));
				binding.sort(REVIEW_SORTERS.newest);

				this._updateReviewSummary();
			});
		},

		_getReviewsOfCurrentProduct() {
			const productId = this._getCurrentProduct().productId;
			const reviews = this.getModel("review").getProperty("/Reviews") || [];
			return reviews.filter((item) => item.productId === productId);
		},

		/** star bars, "based on N recent reviews" text and list title */
		_updateReviewSummary() {
			const reviews = this._getReviewsOfCurrentProduct();
			const resourceBundle = this.getResourceBundle();
			const reviewViewModel = this.getModel("reviewView");

			reviewViewModel.setProperty("/breakdown", review.getBreakdown(reviews));
			reviewViewModel.setProperty("/breakdownText", resourceBundle.getText("breakdownText", [reviews.length]));
			reviewViewModel.setProperty("/listTitle", resourceBundle.getText("reviewListTitle", [reviews.length]));
		},

		/** product rating + review count = original numbers combined with the user's reviews */
		_updateProductRating() {
			const context = this.getView().getBindingContext("product");
			const product = context.getObject();
			const ownReviews = this._getReviewsOfCurrentProduct().filter((item) => item.isOwn);
			const baseRating = product.baseRating !== undefined ? product.baseRating : product.rating;
			const baseCount = product.baseReviewCount !== undefined ? product.baseReviewCount : product.reviewCount;
			const result = review.calculateProductRating(baseRating, baseCount, ownReviews);

			const productModel = this.getModel("product");
			productModel.setProperty(context.getPath() + "/rating", result.rating);
			productModel.setProperty(context.getPath() + "/reviewCount", result.reviewCount);
		},

		onReviewSortChange() {
			const sortKey = this.getModel("reviewView").getProperty("/sortKey");
			this.byId("reviewList").getBinding("items").sort(REVIEW_SORTERS[sortKey]);
		},

		/* ---------- write a review dialog ---------- */

		async onOpenReviewDialog() {
			// start with an empty draft, but remember the reviewer's name from last time
			this.getModel("reviewDraft").setData(createReviewDraft(review.loadReviewerName()));

			this.reviewDialog ??= await this.loadFragment({
				name: "ui5.shop.view.fragments.ReviewDialog"
			});
			this._validateReviewDraft();
			this.reviewDialog.open();
		},

		onReviewDraftChange(event) {
			const control = event.getSource();
			const path = control.getBinding("value").getPath(); // e.g. "/comment"
			const field = path.split("/").pop();                 // e.g. "comment"
			const draftModel = this.getModel("reviewDraft");

			draftModel.setProperty(path, event.getParameter("value"));
			draftModel.setProperty("/touched/" + field, true);

			this._validateReviewDraft();
		},

		_validateReviewDraft() {
			const draftModel = this.getModel("reviewDraft");
			const draft = draftModel.getData();
			const result = review.validateReview(draft);

			// red error only on text fields the user has already typed in
			["author", "comment"].forEach((field) => {
				const showError = draft.touched[field] && !result.fields[field];
				draftModel.setProperty("/valueStates/" + field, showError ? "Error" : "None");
			});

			draftModel.setProperty("/canSubmit", result.valid);
		},

		onSubmitReview() {
			const draft = this.getModel("reviewDraft").getData();
			if (!review.validateReview(draft).valid) {
				return;
			}

			// add the new review at the top and save the user's reviews in the browser
			const reviewModel = this.getModel("review");
			const newReview = review.createReview(this._getCurrentProduct().productId, draft);
			const allReviews = [newReview].concat(reviewModel.getProperty("/Reviews") || []);

			reviewModel.setProperty("/Reviews", allReviews);
			review.saveUserReviews(allReviews);
			review.saveReviewerName(draft.author);

			this._updateProductRating();
			this._updateReviewSummary();

			this.reviewDialog.close();
			MessageToast.show(this.getResourceBundle().getText("reviewThanks"));

			// show the reviews section with the new review on top
			this.byId("objectPage").scrollToSection(this.byId("reviewsSection").getId());
		},

		onCloseReviewDialog() {
			this.reviewDialog.close();
		},

		onDeleteReview(event) {
			const reviewId = event.getSource().getBindingContext("review").getProperty("reviewId");
			const resourceBundle = this.getResourceBundle();

			MessageBox.confirm(resourceBundle.getText("deleteReviewConfirm"), {
				title: resourceBundle.getText("deleteReviewTitle"),
				emphasizedAction: MessageBox.Action.OK,
				onClose: (action) => {
					if (action !== MessageBox.Action.OK) {
						return;
					}
					const reviewModel = this.getModel("review");
					const remaining = (reviewModel.getProperty("/Reviews") || [])
						.filter((item) => item.reviewId !== reviewId);

					reviewModel.setProperty("/Reviews", remaining);
					review.saveUserReviews(remaining);

					this._updateProductRating();
					this._updateReviewSummary();
					MessageToast.show(resourceBundle.getText("reviewDeleted"));
				}
			});
		}
	});
});