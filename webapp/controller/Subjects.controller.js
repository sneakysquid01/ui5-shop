sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
	"use strict";

	return Controller.extend("ui5.shop.controller.Subjects", {

		onInit: function () {
			const oData = {
				subjects: [
					{ name: "Mathematics", code: "MA101", credits: 4 },
					{ name: "Physics", code: "PH101", credits: 3 },
					{ name: "Chemistry", code: "CH101", credits: 3 },
					{ name: "Computer Science", code: "CS101", credits: 4 },
					{ name: "English", code: "EN101", credits: 2 },
					{ name: "Electronics", code: "EC101", credits: 3 }
				]
			};

			oData.totalCredits = this._calculateTotal(oData.subjects);

			const oModel = new JSONModel(oData);
			this.getView().setModel(oModel, "subjects");
		},

		_calculateTotal: function (aSubjects) {
			let iTotal = 0;
			for (let i = 0; i < aSubjects.length; i++) {
				iTotal = iTotal + aSubjects[i].credits;
			}
			return iTotal;
		},

		onSubjectPress: function (oEvent) {
			const oItem = oEvent.getSource();
			const oContext = oItem.getBindingContext("subjects");
			const sName = oContext.getProperty("name");
			const iCredits = oContext.getProperty("credits");

			MessageToast.show(sName + " has " + iCredits + " credits");
		},

		onNavBack: function () {
			this.getOwnerComponent().getRouter().navTo("shop");
		}
	});
});