sap.ui.define(['sap/ui/base/Object', 'sap/m/MessageBox'], (UI5Object, MessageBox) => {
  'use strict';

  return UI5Object.extend('zui5traininglistdetail.controller.ErrorHandler', {
    /**
     * Handles application errors by automatically attaching to the model events and displaying errors when needed.
     * @class
     * @param {sap.ui.core.UIComponent} component reference to the app's component
     * @public
     * @alias zui5traininglistdetail.controller.ErrorHandler
     */
    constructor: function(component) {
      this._resourceBundle = component.getModel('i18n').getResourceBundle();
      this._component = component;
      this._model = component.getModel();
      this._messageOpen = false;
      this._errorText = this._resourceBundle.getText('errorText');

      this._model.attachMetadataFailed(event => {
        let params = event.getParameters();
        this._showServiceError(params.response);
      }, this);

      this._model.attachRequestFailed(event => {
        let params = event.getParameters();
        // An entity that was not found in the service is also throwing a 404 error in oData.
        // We already cover this case with a notFound target so we skip it here.
        // A request that cannot be sent to the server is a technical error that we have to handle though
        if (
          params.response.statusCode !== '404' ||
          (params.response.statusCode === 404 && params.response.responseText.indexOf('Cannot POST') === 0)
        ) {
          this._showServiceError(params.response);
        }
      }, this);
    },

    /**
     * Shows a {@link sap.m.MessageBox} when a service call has failed.
     * Only the first error message will be display.
     * @param {string} details a technical error to be displayed on request
     * @private
     */
    _showServiceError(details) {
      if (this._messageOpen) {
        return;
      }
      this._messageOpen = true;
      MessageBox.error(this._errorText, {
        id: 'serviceErrorMessageBox',
        details: details,
        styleClass: this._component.getContentDensityClass(),
        actions: [MessageBox.Action.CLOSE],
        onClose: () => (this._messageOpen = false),
      });
    },
  });
});
