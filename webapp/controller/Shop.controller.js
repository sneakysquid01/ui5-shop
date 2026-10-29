sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Sorter"
], function (BaseController, JSONModel, Filter, FilterOperator, Sorter) {
	"use strict";

	const SORTERS = {
		featured: [],
		priceAsc: [new Sorter("price", false)],
		priceDesc: [new Sorter("price", true)],
		rating: [new Sorter("rating", true)],
		name: [new Sorter("name", false)]
	};

	function createShopViewData(title) {
		return {
			title: title,
			searchQuery: "",
			category: "all",
			sortKey: "featured",
			categories: [],
			filtersActive: false,
			filterInfo: ""
		};
	}

	return BaseController.extend("ui5.shop.controller.Shop", {
		onInit() {
			const resourceBundle = this.getResourceBundle();
			const shopViewModel = new JSONModel(createShopViewData(resourceBundle.getText("productsTitle")));
			this.getView().setModel(shopViewModel, "shopView");

			const productModel = this.getOwnerComponent().getModel("product");
			productModel.dataLoaded().then(() => {
				const products = productModel.getProperty("/Products") || [];

				products.forEach((product, index) => {
					productModel.setProperty("/Products/" + index + "/selectedQuantity", 1);
				});

				const categories = [...new Set(products.map((product) => product.category))].sort();
				shopViewModel.setProperty("/categories", [{
					key: "all",
					text: resourceBundle.getText("allCategories")
				}].concat(categories.map((category) => ({
					key: category,
					text: category
				}))));
			});
		},

		onSearch(event) {
			this.getModel("shopView").setProperty("/searchQuery", event.getSource().getValue());
			this._applyFiltersAndSorting();
		},

		onFilterChange() {
			this._applyFiltersAndSorting();
		},

		onClearFilters() {
			const shopViewModel = this.getModel("shopView");
			shopViewModel.setProperty("/searchQuery", "");
			shopViewModel.setProperty("/category", "all");
			shopViewModel.setProperty("/sortKey", "featured");
			this._applyFiltersAndSorting();
		},

		_applyFiltersAndSorting() {
			const shopViewModel = this.getModel("shopView");
			const query = shopViewModel.getProperty("/searchQuery").trim();
			const category = shopViewModel.getProperty("/category");
			const sortKey = shopViewModel.getProperty("/sortKey");
			const filters = [];
			const infoParts = [];

			if (query) {
				filters.push(new Filter({
					filters: [
						new Filter("name", FilterOperator.Contains, query),
						new Filter("brand", FilterOperator.Contains, query),
						new Filter("category", FilterOperator.Contains, query),
						new Filter("shortDescription", FilterOperator.Contains, query)
					],
					and: false
				}));
				infoParts.push("\"" + query + "\"");
			}

			if (category !== "all") {
				filters.push(new Filter("category", FilterOperator.EQ, category));
				infoParts.unshift(category);
			}

			const binding = this.byId("productGrid").getBinding("items");
			binding.filter(filters.length ? new Filter({ filters: filters, and: true }) : []);
			binding.sort(SORTERS[sortKey] || []);

			shopViewModel.setProperty("/filtersActive", infoParts.length > 0);
			shopViewModel.setProperty("/filterInfo",
				this.getResourceBundle().getText("filterInfo", [infoParts.join(" · ")]));
		},

		onUpdateFinished(event) {
			// keep the product count in the title up to date
			const total = event.getParameter("total");
			this.getModel("shopView").setProperty("/title",
				this.getResourceBundle().getText("productsTitleCount", [total]));
		},

		onProductPress(event) {
			const productId = event.getSource().getBindingContext("product").getProperty("productId");
			this.getRouter().navTo("product", {
				productId: productId
			});
		},

		onAddToCart(event) {
			const context = event.getSource().getBindingContext("product");
			const product = context.getObject();

			this.addToCartWithMessage(product, product.selectedQuantity);

			this.getModel("product").setProperty(context.getPath() + "/selectedQuantity", 1);
		},

		onSubjectsPress() {
			this.getRouter().navTo("subjects");
		}
	});
});