sap.ui.define([
	"ui5/shop/model/review"
], function (review) {
	"use strict";

	function createFakeStorage(initialData) {
		const data = Object.assign({}, initialData);
		return {
			getItem: (key) => (key in data ? data[key] : null),
			setItem: (key, value) => { data[key] = String(value); }
		};
	}

	const validDraft = { rating: 4, author: "Test User", comment: "Really good product, works well." };

	QUnit.module("review - validation");

	QUnit.test("A complete review is valid", (assert) => {
		assert.ok(review.validateReview(validDraft).valid, "Valid draft");
	});

	QUnit.test("Missing or wrong fields make it invalid", (assert) => {
		assert.notOk(review.validateReview(Object.assign({}, validDraft, { rating: 0 })).fields.rating, "No stars is invalid");
		assert.notOk(review.validateReview(Object.assign({}, validDraft, { author: " A " })).fields.author, "1-letter name is invalid");
		assert.notOk(review.validateReview(Object.assign({}, validDraft, { comment: "Too short" })).fields.comment, "Under 10 characters is invalid");
		assert.notOk(review.validateReview(Object.assign({}, validDraft, { comment: "x".repeat(501) })).fields.comment, "Over 500 characters is invalid");
	});

	QUnit.module("review - create and summary");

	QUnit.test("Creates a review marked as the user's own", (assert) => {
		const date = new Date(1700000012345);
		const created = review.createReview("P1001", { rating: 4.6, author: "  Test User ", comment: " Nice! Works well. " }, date);
		assert.strictEqual(created.productId, "P1001", "Product ID set");
		assert.strictEqual(created.rating, 5, "Rating rounded to a whole star");
		assert.strictEqual(created.author, "Test User", "Name is trimmed");
		assert.strictEqual(created.date, date.toISOString(), "Date set");
		assert.ok(created.isOwn, "Marked as own review");
	});

	QUnit.test("Star breakdown counts and percentages", (assert) => {
		const breakdown = review.getBreakdown([{ rating: 5 }, { rating: 5 }, { rating: 4 }, { rating: 1 }]);
		assert.deepEqual(breakdown.map((row) => row.stars), [5, 4, 3, 2, 1], "Rows from 5 to 1 stars");
		assert.strictEqual(breakdown[0].count, 2, "Two 5-star reviews");
		assert.strictEqual(breakdown[0].percent, 50, "50% are 5 stars");
		assert.strictEqual(breakdown[2].count, 0, "No 3-star reviews");
	});

	QUnit.test("Product rating includes the user's reviews", (assert) => {
		assert.deepEqual(review.calculateProductRating(4.4, 10, []), { rating: 4.4, reviewCount: 10 }, "No own reviews: unchanged");
		const result = review.calculateProductRating(4, 4, [{ rating: 5 }]);
		assert.strictEqual(result.reviewCount, 5, "Count goes up by 1");
		assert.strictEqual(result.rating, 4.2, "(4 x 4 + 5) / 5 = 4.2");
	});

	QUnit.module("review - storage");

	QUnit.test("Only the user's own reviews are saved", (assert) => {
		const storage = createFakeStorage();
		review.saveUserReviews([{ reviewId: "S1" }, { reviewId: "U1", isOwn: true }], storage);
		const loaded = review.loadUserReviews(storage);
		assert.strictEqual(loaded.length, 1, "Only one review saved");
		assert.strictEqual(loaded[0].reviewId, "U1", "It is the user's review");
	});

	QUnit.test("Broken data and reviewer name", (assert) => {
		assert.deepEqual(review.loadUserReviews(createFakeStorage({ "ui5shop.userReviews": "oops" })), [], "Broken data gives an empty list");
		const storage = createFakeStorage();
		review.saveReviewerName("  Riya ", storage);
		assert.strictEqual(review.loadReviewerName(storage), "Riya", "Name saved and trimmed");
	});
});