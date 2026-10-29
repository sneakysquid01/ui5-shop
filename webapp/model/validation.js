sap.ui.define([], function () {
	"use strict";

	const PATTERNS = {
		phone: /^[6-9]\d{9}$/,          // Indian mobile: 10 digits, starts with 6-9
		pinCode: /^[1-9]\d{5}$/,        // Indian PIN code: 6 digits, does not start with 0
		email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
	};

	function clean(value) {
		return typeof value === "string" ? value.trim() : "";
	}

	function isFilled(value, minLength) {
		return clean(value).length >= (minLength || 1);
	}

	function isValidPhone(value) {
		return PATTERNS.phone.test(clean(value));
	}

	function isValidPinCode(value) {
		return PATTERNS.pinCode.test(clean(value));
	}

	/** email is optional: empty is fine, but if filled it must look like an email */
	function isValidEmail(value) {
		const text = clean(value);
		return text === "" || PATTERNS.email.test(text);
	}

	/** checks every delivery field; returns which fields are valid and whether all are */
	function validateDelivery(delivery) {
		const fields = {
			fullName: isFilled(delivery.fullName, 2),
			phone: isValidPhone(delivery.phone),
			email: isValidEmail(delivery.email),
			address: isFilled(delivery.address, 5),
			city: isFilled(delivery.city, 2),
			state: isFilled(delivery.state, 2),
			pinCode: isValidPinCode(delivery.pinCode)
		};

		return {
			fields: fields,
			valid: Object.values(fields).every(Boolean)
		};
	}

	return {
		isFilled: isFilled,
		isValidPhone: isValidPhone,
		isValidPinCode: isValidPinCode,
		isValidEmail: isValidEmail,
		validateDelivery: validateDelivery
	};
});