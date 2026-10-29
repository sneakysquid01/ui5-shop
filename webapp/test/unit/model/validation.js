sap.ui.define([
	"ui5/shop/model/validation"
], function (validation) {
	"use strict";

	const validDelivery = {
		fullName: "Test User",
		phone: "9876543210",
		email: "",
		address: "221 Test Street",
		city: "Gurgaon",
		state: "Haryana",
		pinCode: "122018"
	};

	QUnit.module("validation - single fields");

	QUnit.test("Mobile number", (assert) => {
		assert.ok(validation.isValidPhone("9876543210"), "10 digits starting with 9 is valid");
		assert.ok(validation.isValidPhone(" 9876543210 "), "Spaces around it are ignored");
		assert.notOk(validation.isValidPhone("98765"), "Too short is invalid");
		assert.notOk(validation.isValidPhone("1234567890"), "Starting with 1 is invalid");
		assert.notOk(validation.isValidPhone("98765abcde"), "Letters are invalid");
	});

	QUnit.test("PIN code", (assert) => {
		assert.ok(validation.isValidPinCode("122018"), "6 digits is valid");
		assert.notOk(validation.isValidPinCode("012345"), "Starting with 0 is invalid");
		assert.notOk(validation.isValidPinCode("12345"), "5 digits is invalid");
	});

	QUnit.test("Email is optional", (assert) => {
		assert.ok(validation.isValidEmail(""), "Empty is allowed");
		assert.ok(validation.isValidEmail("name@example.com"), "Normal email is valid");
		assert.notOk(validation.isValidEmail("abc"), "Not an email is invalid");
	});

	QUnit.test("Required text fields", (assert) => {
		assert.notOk(validation.isFilled("   ", 1), "Only spaces is empty");
		assert.ok(validation.isFilled("Al", 2), "2 characters meets a minimum of 2");
	});

	QUnit.module("validation - whole delivery form");

	QUnit.test("A complete form is valid", (assert) => {
		assert.ok(validation.validateDelivery(validDelivery).valid, "Valid delivery details");
	});

	QUnit.test("A missing field makes the form invalid", (assert) => {
		const result = validation.validateDelivery(Object.assign({}, validDelivery, { city: "" }));
		assert.notOk(result.valid, "Form is invalid");
		assert.notOk(result.fields.city, "City is marked invalid");
		assert.ok(result.fields.fullName, "Other fields are still valid");
	});
});