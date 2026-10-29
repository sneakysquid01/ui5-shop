sap.ui.define([
	"sap/ui/test/opaQunit",
	"./pages/ShopPage",
	"./pages/ProductPage",
	"./pages/CartPage",
	"./pages/CheckoutPage"
], function (opaTest, ShopPage, ProductPage, CartPage, CheckoutPage) {
	"use strict";

	const onTheShopPage = new ShopPage();
	const onTheProductPage = new ProductPage();
	const onTheCartPage = new CartPage();
	const onTheCheckoutPage = new CheckoutPage();

	QUnit.module("Shopping journey", {
		before() {
			// start every test run with an empty cart
			try {
				window.localStorage.removeItem("ui5shop.cart");
			} catch (error) {
				// storage not available - ignore
			}
		}
	});

	opaTest("Should see the product grid", function () {
		onTheShopPage.iStartMyUIComponent({
			componentConfig: {
				name: "ui5.shop"
			},
			hash: ""
		});

		onTheShopPage.iShouldSeeTheProductGrid();
	});

	opaTest("Should open the product details and go back", function () {
		onTheShopPage.iPressTheFirstProductDetailsButton();
		onTheProductPage.iShouldSeeTheProductDetails();

		onTheProductPage.iPressTheBackButton();
		onTheShopPage.iShouldSeeTheProductGrid();
	});

	opaTest("Should add a product to the cart", function () {
		onTheShopPage.iAddTheFirstAvailableProductToCart();
		onTheShopPage.iPressTheCartButton();

		onTheCartPage.iShouldSeeItemsInTheCart(1);
	});

	opaTest("Should start the checkout", function () {
		onTheCartPage.iPressProceedToCheckout();
		onTheCheckoutPage.iShouldSeeTheCheckoutWizard();

		onTheCheckoutPage.iTeardownMyApp();
	});
});