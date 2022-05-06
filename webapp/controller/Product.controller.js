sap.ui.define(
  ['./BaseController', 'sap/ui/model/json/JSONModel', 'sap/ui/core/routing/History', '../model/formatter'],
  (BaseController, JSONModel, History, formatter) => {
    'use strict';

    return BaseController.extend('zui5traininglistdetail.controller.Product', {
      formatter,

      /* =========================================================== */
      /* lifecycle methods                                           */
      /* =========================================================== */

      /**
       * Called when the worklist controller is instantiated.
       * @public
       */
      onInit() {
        // Model used to manipulate control states. The chosen values make sure,
        // detail page shows busy indication immediately so there is no break in
        // between the busy indication for loading the view's meta data
        let viewModel = new JSONModel({
          busy: true,
          delay: 0,
        });

        this.getRouter().getRoute('product').attachPatternMatched(this._onObjectMatched, this);
        this.setModel(viewModel, 'objectView');
      },

      /* =========================================================== */
      /* event handlers                                              */
      /* =========================================================== */

      /**
       * Event handler  for navigating back.
       * It there is a history entry we go one step back in the browser history
       * If not, it will replace the current entry of the browser history with the worklist route.
       * @public
       */
      onNavBack() {
        let previousHash = History.getInstance().getPreviousHash();
        if (previousHash !== undefined) {
          // eslint-disable-next-line sap-no-history-manipulation
          history.go(-1);
        } else {
          this.getRouter().navTo('list', {}, true);
        }
      },

      /* =========================================================== */
      /* internal methods                                            */
      /* =========================================================== */

      /**
       * Binds the view to the object path.
       * @function
       * @param {sap.ui.base.Event} event pattern match event in route 'object'
       * @private
       */
      _onObjectMatched(event) {
        const productId = event.getParameter('arguments').productId;
        this._bindView(`/Products(${productId})`);
      },

      /**
       * Binds the view to the object path.
       * @function
       * @param {string} objectPath path to the object to be bound
       * @private
       */
      _bindView(objectPath) {
        let viewModel = this.getModel('objectView');

        this.getView().bindElement({
          path: objectPath,
          events: {
            change: this._onBindingChange.bind(this),
            dataRequested: function() {
              viewModel.setProperty('/busy', true);
            },
            dataReceived: function() {
              viewModel.setProperty('/busy', false);
            },
          },
        });
      },

      _onBindingChange() {
        let view = this.getView();
        let viewModel = this.getModel('objectView');
        let elementBinding = view.getElementBinding();

        // No data for the binding
        if (!elementBinding.getBoundContext()) {
          this.getRouter().getTargets().display('DetailObjectNotFound');
          return;
        }

        let resourceBundle = this.getResourceBundle();
        let object = view.getBindingContext().getObject();
        let objectId = object.ProductName;
        let objectName = object.Products;

        viewModel.setProperty('/busy', false);
        viewModel.setProperty(
          '/shareSendEmailSubject',
          resourceBundle.getText('shareSendEmailObjectSubject', [objectId])
        );

        viewModel.setProperty(
          '/shareSendEmailMessage',
          resourceBundle.getText('shareSendEmailObjectMessage', [objectName, objectId, location.href])
        );
      },
    });
  }
);
