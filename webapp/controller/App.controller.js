sap.ui.define(['./BaseController', 'sap/ui/model/json/JSONModel'], (BaseController, JSONModel) => {
  'use strict';

  return BaseController.extend('zui5traininglistdetail.controller.App', {
    onInit() {
      let viewModel;
      let setAppNotBusy;
      let originalBusyDelay = this.getView().getBusyIndicatorDelay();

      viewModel = new JSONModel({
        busy: true,
        delay: 0,
        layout: 'OneColumn',
        previousLayout: '',
        actionButtonsInfo: { midColumn: { fullScreen: false } },
      });

      this.setModel(viewModel, 'appView');

      setAppNotBusy = () => {
        viewModel.setProperty('/busy', false);
        viewModel.setProperty('/delay', originalBusyDelay);
      };

      // since then() has no "reject"-path attach to the MetadataFailed-Event to disable the busy indicator in case of an error
      this.getOwnerComponent().getModel().metadataLoaded().then(setAppNotBusy);
      this.getOwnerComponent().getModel().attachMetadataFailed(setAppNotBusy);

      // apply content density mode to root view
      this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
    },
  });
});
