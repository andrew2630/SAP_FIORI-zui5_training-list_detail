sap.ui.define(
  ['./BaseController', 'sap/ui/model/json/JSONModel', '../model/formatter', 'sap/m/library'],
  (BaseController, JSONModel, formatter, mobileLibrary) => {
    'use strict';

    // shortcut for sap.m.URLHelper
    let URLHelper = mobileLibrary.URLHelper;

    return BaseController.extend('zui5traininglistdetail.controller.Detail', {
      formatter,

      /* =========================================================== */
      /* lifecycle methods                                           */
      /* =========================================================== */

      onInit() {
        // Model used to manipulate control states. The chosen values make sure,
        // detail page is busy indication immediately so there is no break in
        // between the busy indication for loading the view's meta data
        let viewModel = new JSONModel({
          busy: false,
          delay: 0,
          lineItemListTitle: this.getResourceBundle().getText('detailLineItemTableHeading'),
        });

        this.getRouter().getRoute('object').attachPatternMatched(this._onObjectMatched, this);

        this.setModel(viewModel, 'detailView');

        this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
      },

      /* =========================================================== */
      /* event handlers                                              */
      /* =========================================================== */

      /**
       * Event handler when the share by E-Mail button has been clicked
       * @public
       */
      onSendEmailPress() {
        let viewModel = this.getModel('detailView');

        URLHelper.triggerEmail(
          null,
          viewModel.getProperty('/shareSendEmailSubject'),
          viewModel.getProperty('/shareSendEmailMessage')
        );
      },

      /**
       * Updates the item count within the line item table's header
       * @param {object} event an event containing the total number of items in the list
       * @private
       */
      onListUpdateFinished(event) {
        let title;
        let totalItems = event.getParameter('total');
        let viewModel = this.getModel('detailView');

        // only update the counter if the length is final
        if (this.byId('lineItemsList').getBinding('items').isLengthFinal()) {
          if (totalItems) {
            title = this.getResourceBundle().getText('detailLineItemTableHeadingCount', [totalItems]);
          } else {
            //Display 'Line Items' instead of 'Line items (0)'
            title = this.getResourceBundle().getText('detailLineItemTableHeading');
          }

          viewModel.setProperty('/lineItemListTitle', title);
        }
      },

      /* =========================================================== */
      /* begin: internal methods                                     */
      /* =========================================================== */

      /**
       * Binds the view to the object path and expands the aggregated line items.
       * @function
       * @param {sap.ui.base.Event} event pattern match event in route 'object'
       * @private
       */
      _onObjectMatched(event) {
        let objectId = event.getParameter('arguments').objectId;
        this.getModel('appView').setProperty('/layout', 'TwoColumnsMidExpanded');
        this.getModel().metadataLoaded().then(() => {
          let objectPath = this.getModel().createKey('Categories', {
            CategoryID: objectId,
          });

          this._bindView('/' + objectPath);
        });
      },

      /**
       * Binds the view to the object path. Makes sure that detail view displays
       * a busy indicator while data for the corresponding element binding is loaded.
       * @function
       * @param {string} objectPath path to the object to be bound to the view.
       * @private
       */
      _bindView(objectPath) {
        // Set busy indicator during view binding
        let viewModel = this.getModel('detailView');

        // If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
        viewModel.setProperty('/busy', false);

        this.getView().bindElement({
          path: objectPath,
          events: {
            change: this._onBindingChange.bind(this),
            dataRequested: () => viewModel.setProperty('/busy', true),
            dataReceived: () => viewModel.setProperty('/busy', false),
          },
        });
      },

      _onBindingChange() {
        let view = this.getView();
        let elementBinding = view.getElementBinding();

        // No data for the binding
        if (!elementBinding.getBoundContext()) {
          this.getRouter().getTargets().display('detailObjectNotFound');
          // if object could not be found, the selection in the list
          // does not make sense anymore.
          this.getOwnerComponent().oListSelector.clearListListSelection();
          return;
        }

        let path = elementBinding.getPath();
        let resourceBundle = this.getResourceBundle();
        let object = view.getModel().getObject(path);
        let objectId = object.CategoryID;
        let objectName = object.CategoryName;
        let viewModel = this.getModel('detailView');

        this.getOwnerComponent().oListSelector.selectAListItem(path);

        viewModel.setProperty(
          '/shareSendEmailSubject',
          resourceBundle.getText('shareSendEmailObjectSubject', [objectId])
        );
        viewModel.setProperty(
          '/shareSendEmailMessage',
          resourceBundle.getText('shareSendEmailObjectMessage', [objectName, objectId, location.href])
        );
      },

      _onMetadataLoaded() {
        // Store original busy indicator delay for the detail view
        let originalViewBusyDelay = this.getView().getBusyIndicatorDelay();
        let viewModel = this.getModel('detailView');
        let lineItemTable = this.byId('lineItemsList');
        let originalLineItemTableBusyDelay = lineItemTable.getBusyIndicatorDelay();

        // Make sure busy indicator is displayed immediately when
        // detail view is displayed for the first time
        viewModel.setProperty('/delay', 0);
        viewModel.setProperty('/lineItemTableDelay', 0);

        lineItemTable.attachEventOnce('updateFinished', function() {
          // Restore original busy indicator delay for line item table
          viewModel.setProperty('/lineItemTableDelay', originalLineItemTableBusyDelay);
        });

        // Binding the view will set it to not busy - so the view is always busy if it is not bound
        viewModel.setProperty('/busy', true);
        // Restore original busy indicator delay for the detail view
        viewModel.setProperty('/delay', originalViewBusyDelay);
      },

      /**
       * Set the full screen mode to false and navigate to list page
       */
      onCloseDetailPress() {
        this.getModel('appView').setProperty('/actionButtonsInfo/midColumn/fullScreen', false);
        // No item should be selected on list after detail page is closed
        this.getOwnerComponent().oListSelector.clearListListSelection();
        this.getRouter().navTo('list');
      },

      /**
       * Toggle between full and non full screen mode.
       */
      toggleFullScreen() {
        let fullScreen = this.getModel('appView').getProperty('/actionButtonsInfo/midColumn/fullScreen');
        this.getModel('appView').setProperty('/actionButtonsInfo/midColumn/fullScreen', !fullScreen);
        if (!fullScreen) {
          // store current layout and go full screen
          this.getModel('appView').setProperty('/previousLayout', this.getModel('appView').getProperty('/layout'));
          this.getModel('appView').setProperty('/layout', 'MidColumnFullScreen');
        } else {
          // reset to previous layout
          this.getModel('appView').setProperty('/layout', this.getModel('appView').getProperty('/previousLayout'));
        }
      },

      onItemPress(e) {
        const item = e.getSource();
        const matchResults = [...item.getBindingContext().getDeepPath().matchAll(/\d+/g)];
        this.getRouter().navTo('product', {
          objectId: matchResults[0][0],
          productId: matchResults[1][0],
        });
      },
    });
  }
);
