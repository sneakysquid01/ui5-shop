sap.ui.define([], function () {
	"use strict";

	const STORAGE_KEY = "ui5shop.cart";
	const TAX_RATE = 0.18; // 18% GST

	/** work out item count, subtotal, tax and total from the cart items */
	function calculateTotals(items) {
		const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
		const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
		const tax = Math.round(subtotal * TAX_RATE);

		return {
			itemCount: itemCount,
			subtotal: subtotal,
			tax: tax,
			total: subtotal + tax
		};
	}

	/** build a full cart object (items + totals) from a list of items */
	function buildCart(items) {
		const itemsWithLineTotals = items.map((item) => Object.assign({}, item, {
			lineTotal: item.price * item.quantity
		}));
		return Object.assign({ items: itemsWithLineTotals }, calculateTotals(itemsWithLineTotals));
	}

	function createEmptyCart() {
		return buildCart([]);
	}

	/**
	 * Adds a product to the cart without going over the available stock.
	 * Returns the new cart and how many were actually added.
	 */
	function addItem(cart, product, quantity) {
		const existing = cart.items.find((item) => item.productId === product.productId);
		const alreadyInCart = existing ? existing.quantity : 0;
		const canStillAdd = Math.max(0, product.stock - alreadyInCart);
		const added = Math.min(quantity, canStillAdd);

		if (added <= 0) {
			return { cart: cart, added: 0 };
		}

		let items;
		if (existing) {
			items = cart.items.map((item) => item.productId === product.productId
				? Object.assign({}, item, { quantity: item.quantity + added })
				: item);
		} else {
			items = cart.items.concat([{
				productId: product.productId,
				name: product.name,
				price: product.price,
				image: product.images && product.images[0],
				stock: product.stock,
				quantity: added
			}]);
		}

		return { cart: buildCart(items), added: added };
	}

	/** change the quantity of one item (kept between 1 and the stock) */
	function updateQuantity(cart, productId, quantity) {
		const items = cart.items.map((item) => {
			if (item.productId !== productId) {
				return item;
			}
			const safeQuantity = Math.min(Math.max(1, quantity), item.stock);
			return Object.assign({}, item, { quantity: safeQuantity });
		});
		return buildCart(items);
	}

	function removeItem(cart, productId) {
		return buildCart(cart.items.filter((item) => item.productId !== productId));
	}

	/** read the saved cart from the browser (empty cart if nothing / broken data) */
	function load(storage) {
		try {
			const store = storage || window.localStorage;
			const saved = JSON.parse(store.getItem(STORAGE_KEY));
			if (saved && Array.isArray(saved.items)) {
				return buildCart(saved.items);
			}
		} catch (error) {
			// storage not available or data broken: start with an empty cart
		}
		return createEmptyCart();
	}

	/** save the cart items in the browser */
	function save(cart, storage) {
		try {
			const store = storage || window.localStorage;
			store.setItem(STORAGE_KEY, JSON.stringify({ items: cart.items }));
		} catch (error) {
			// storage not available (e.g. private mode): cart just isn't saved
		}
	}

	return {
		TAX_RATE: TAX_RATE,
		calculateTotals: calculateTotals,
		createEmptyCart: createEmptyCart,
		addItem: addItem,
		updateQuantity: updateQuantity,
		removeItem: removeItem,
		clear: createEmptyCart,
		load: load,
		save: save
	};
});