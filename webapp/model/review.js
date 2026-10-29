sap.ui.define([], function () {
	"use strict";

	const STORAGE_KEY = "ui5shop.userReviews";
	const NAME_KEY = "ui5shop.reviewerName";
	const NAME_MIN = 2;
	const COMMENT_MIN = 10;
	const COMMENT_MAX = 500;

	function clean(value) {
		return typeof value === "string" ? value.trim() : "";
	}

	/** checks a review draft; returns which fields are valid and whether all are */
	function validateReview(draft) {
		const rating = Number(draft.rating) || 0;
		const commentLength = clean(draft.comment).length;

		const fields = {
			rating: rating >= 1 && rating <= 5,
			author: clean(draft.author).length >= NAME_MIN,
			comment: commentLength >= COMMENT_MIN && commentLength <= COMMENT_MAX
		};

		return {
			fields: fields,
			valid: fields.rating && fields.author && fields.comment
		};
	}

	/** builds a new review written by the user */
	function createReview(productId, draft, now) {
		const date = now || new Date();
		return {
			reviewId: "U" + date.getTime(),
			productId: productId,
			author: clean(draft.author),
			rating: Math.round(Number(draft.rating)),
			comment: clean(draft.comment),
			date: date.toISOString(),
			isOwn: true
		};
	}

	/** how many reviews have 5, 4, 3, 2 and 1 stars (with percentages for the bars) */
	function getBreakdown(reviews) {
		const total = reviews.length;
		return [5, 4, 3, 2, 1].map((stars) => {
			const count = reviews.filter((review) => review.rating === stars).length;
			return {
				stars: stars,
				count: count,
				percent: total ? Math.round((count / total) * 100) : 0
			};
		});
	}

	/**
	 * Product rating including the user's own reviews (weighted average):
	 * the original rating counts as many times as the original review count.
	 */
	function calculateProductRating(baseRating, baseCount, userReviews) {
		if (!userReviews.length) {
			return { rating: baseRating, reviewCount: baseCount };
		}
		const total = baseRating * baseCount + userReviews.reduce((sum, review) => sum + review.rating, 0);
		const count = baseCount + userReviews.length;
		return {
			rating: Math.round((total / count) * 10) / 10,
			reviewCount: count
		};
	}

	/* ---------- browser storage ---------- */

	function loadUserReviews(storage) {
		try {
			const saved = JSON.parse((storage || window.localStorage).getItem(STORAGE_KEY));
			return Array.isArray(saved) ? saved : [];
		} catch (error) {
			return [];
		}
	}

	/** only the user's own reviews are saved (sample reviews come from reviews.json) */
	function saveUserReviews(reviews, storage) {
		try {
			const ownReviews = reviews.filter((review) => review.isOwn);
			(storage || window.localStorage).setItem(STORAGE_KEY, JSON.stringify(ownReviews));
		} catch (error) {
			// storage not available: reviews just are not kept after a refresh
		}
	}

	function loadReviewerName(storage) {
		try {
			return (storage || window.localStorage).getItem(NAME_KEY) || "";
		} catch (error) {
			return "";
		}
	}

	function saveReviewerName(name, storage) {
		try {
			(storage || window.localStorage).setItem(NAME_KEY, clean(name));
		} catch (error) {
			// ignore
		}
	}

	return {
		COMMENT_MIN: COMMENT_MIN,
		COMMENT_MAX: COMMENT_MAX,
		validateReview: validateReview,
		createReview: createReview,
		getBreakdown: getBreakdown,
		calculateProductRating: calculateProductRating,
		loadUserReviews: loadUserReviews,
		saveUserReviews: saveUserReviews,
		loadReviewerName: loadReviewerName,
		saveReviewerName: saveReviewerName
	};
});