sap.ui.define(['./BaseController'], BaseController => {
  'use strict';

  return BaseController.extend('zui5traininglistdetail.controller.NotFound', {
    onInit() {
      this.getRouter().getTarget('notFound').attachDisplay(this._onNotFoundDisplayed, this);
    },

    _onNotFoundDisplayed() {
      this.getModel('appView').setProperty('/layout', 'OneColumn');
    },
  });
});
