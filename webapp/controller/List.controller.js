sap.ui.define(
  [
    './BaseController',
    'sap/ui/model/json/JSONModel',
    'sap/ui/model/Filter',
    'sap/ui/model/Sorter',
    'sap/ui/model/FilterOperator',
    'sap/m/GroupHeaderListItem',
    'sap/ui/Device',
    'sap/ui/core/Fragment',
    '../model/formatter',
  ],
  (BaseController, JSONModel, Filter, Sorter, FilterOperator, GroupHeaderListItem, Device, Fragment, formatter) => {
    'use strict';

    return BaseController.extend('zui5traininglistdetail.controller.List', {
      formatter,

      /* =========================================================== */
      /* lifecycle methods                                           */
      /* =========================================================== */

      /**
       * Called when the list controller is instantiated. It sets up the event handling for the list/detail communication and other lifecycle tasks.
       * @public
       */
      onInit() {
        // Control state model
        let list = this.byId('list');
        let viewModel = this._createViewModel();
        // Put down list's original value for busy indicator delay,
        // so it can be restored later on. Busy handling on the list is
        // taken care of by the list itself.
        let originalBusyDelay = list.getBusyIndicatorDelay();

        this._groupFunctions = {
          CategoryID: context => {
            let id = context.getProperty('CategoryID');
            let key;
            let text;

            if (id <= 20) {
              key = 'LE20';
              text = this.getResourceBundle().getText('listGroup1Header1');
            } else {
              key = 'GT20';
              text = this.getResourceBundle().getText('listGroup1Header2');
            }

            return {
              key: key,
              text: text,
            };
          },
        };

        this._list = list;
        // keeps the filter and search state
        this._listFilterState = {
          aFilter: [],
          aSearch: [],
        };

        this.setModel(viewModel, 'listView');
        // Make sure, busy indication is showing immediately so there is no
        // break after the busy indication for loading the view's meta data is
        // ended (see promise 'oWhenMetadataIsLoaded' in AppController)
        list.attachEventOnce('updateFinished', function() {
          // Restore original busy indicator delay for the list
          viewModel.setProperty('/delay', originalBusyDelay);
        });

        this.getView().addEventDelegate({
          onBeforeFirstShow: () => {
            this.getOwnerComponent().listSelector.setBoundMasterList(list);
          },
        });

        this.getRouter().getRoute('list').attachPatternMatched(this._onMasterMatched, this);
        this.getRouter().attachBypassed(this.onBypassed, this);
      },

      /* =========================================================== */
      /* event handlers                                              */
      /* =========================================================== */

      /**
       * After list data is available, this handler method updates the
       * list counter
       * @param {sap.ui.base.Event} event the update finished event
       * @public
       */
      onUpdateFinished(event) {
        // update the list object counter after new data is loaded
        this._updateListItemCount(event.getParameter('total'));
      },

      /**
       * Event handler for the list search field. Applies current
       * filter value and triggers a new search. If the search field's
       * 'refresh' button has been pressed, no new search is triggered
       * and the list binding is refresh instead.
       * @param {sap.ui.base.Event} event the search event
       * @public
       */
      onSearch(event) {
        if (event.getParameters().refreshButtonPressed) {
          // Search field's 'refresh' button has been pressed.
          // This is visible if you select any list item.
          // In this case no new search is triggered, we only
          // refresh the list binding.
          this.onRefresh();
          return;
        }

        let query = event.getParameter('query');

        if (query) {
          this._listFilterState.aSearch = [new Filter('CategoryName', FilterOperator.Contains, query)];
        } else {
          this._listFilterState.aSearch = [];
        }
        this._applyFilterSearch();
      },

      /**
       * Event handler for refresh event. Keeps filter, sort
       * and group settings and refreshes the list binding.
       * @public
       */
      onRefresh() {
        this._list.getBinding('items').refresh();
      },

      /**
       * Event handler for the filter, sort and group buttons to open the ViewSettingsDialog.
       * @param {sap.ui.base.Event} event the button press event
       * @public
       */
      onOpenViewSettings(event) {
        let dialogTab = 'filter';
        if (event.getSource() instanceof sap.m.Button) {
          let sButtonId = event.getSource().getId();
          if (sButtonId.match('sort')) {
            dialogTab = 'sort';
          } else if (sButtonId.match('group')) {
            dialogTab = 'group';
          }
        }
        // load asynchronous XML fragment
        if (!this.byId('viewSettingsDialog')) {
          Fragment.load({
            id: this.getView().getId(),
            name: 'zui5traininglistdetail.view.ViewSettingsDialog',
            controller: this,
          }).then(oDialog => {
            // connect dialog to the root view of this component (models, lifecycle)
            this.getView().addDependent(oDialog);
            oDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
            oDialog.open(dialogTab);
          });
        } else {
          this.byId('viewSettingsDialog').open(dialogTab);
        }
      },

      /**
       * Event handler called when ViewSettingsDialog has been confirmed, i.e.
       * has been closed with 'OK'. In the case, the currently chosen filters, sorters or groupers
       * are applied to the list, which can also mean that they
       * are removed from the list, in case they are
       * removed in the ViewSettingsDialog.
       * @param {sap.ui.base.Event} event the confirm event
       * @public
       */
      onConfirmViewSettingsDialog(event) {
        let filterItems = event.getParameters().filterItems;
        let filters = [];
        let captions = [];

        // update filter state:
        // combine the filter array and the filter string
        filterItems.forEach(item => {
          switch (item.getKey()) {
            case 'Filter1':
              filters.push(new Filter('CategoryID', FilterOperator.LE, 100));
              break;
            case 'Filter2':
              filters.push(new Filter('CategoryID', FilterOperator.GT, 100));
              break;
            default:
              break;
          }

          captions.push(item.getText());
        });

        this._listFilterState.aFilter = filters;
        this._updateFilterBar(captions.join(', '));
        this._applyFilterSearch();
        this._applySortGroup(event);
      },

      /**
       * Apply the chosen sorter and grouper to the list
       * @param {sap.ui.base.Event} event the confirm event
       * @private
       */
      _applySortGroup(event) {
        let params = event.getParameters();
        let path;
        let descending;
        let sorters = [];

        // apply sorter to binding
        // (grouping comes before sorting)
        if (params.groupItem) {
          path = params.groupItem.getKey();
          descending = params.groupDescending;
          let group = this._groupFunctions[path];
          sorters.push(new Sorter(path, descending, group));
        }

        path = params.sortItem.getKey();
        descending = params.sortDescending;
        sorters.push(new Sorter(path, descending));
        this._list.getBinding('items').sort(sorters);
      },

      /**
       * Event handler for the list selection event
       * @param {sap.ui.base.Event} event the list selectionChange event
       * @public
       */
      onSelectionChange(event) {
        let list = event.getSource();
        let selected = event.getParameter('selected');

        // skip navigation when deselecting an item in multi selection mode
        if (!(list.getMode() === 'MultiSelect' && !selected)) {
          // get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
          this._showDetail(event.getParameter('listItem') || event.getSource());
        }
      },

      /**
       * Event handler for the bypassed event, which is fired when no routing pattern matched.
       * If there was an object selected in the list, that selection is removed.
       * @public
       */
      onBypassed() {
        this._list.removeSelections(true);
      },

      /**
       * Used to create GroupHeaders with non-capitalized caption.
       * These headers are inserted into the list to
       * group the list's items.
       * @param {Object} group group whose text is to be displayed
       * @public
       * @returns {sap.m.GroupHeaderListItem} group header with non-capitalized caption.
       */
      createGroupHeader(group) {
        return new GroupHeaderListItem({
          title: group.text,
          upperCase: false,
        });
      },

      /**
       * Event handler for navigating back.
       * We navigate back in the browser history
       * @public
       */
      onNavBack() {
        // eslint-disable-next-line sap-no-history-manipulation
        history.go(-1);
      },

      /* =========================================================== */
      /* begin: internal methods                                     */
      /* =========================================================== */

      _createViewModel() {
        return new JSONModel({
          isFilterBarVisible: false,
          filterBarLabel: '',
          delay: 0,
          title: this.getResourceBundle().getText('listTitleCount', [0]),
          noDataText: this.getResourceBundle().getText('listListNoDataText'),
          sortBy: 'CategoryName',
          groupBy: 'None',
        });
      },

      _onMasterMatched() {
        //Set the layout property of the FCL control to 'OneColumn'
        this.getModel('appView').setProperty('/layout', 'OneColumn');
      },

      /**
       * Shows the selected item on the detail page
       * On phones a additional history entry is created
       * @param {sap.m.ObjectListItem} oItem selected Item
       * @private
       */
      _showDetail(item) {
        let replace = !Device.system.phone;
        // set the layout property of FCL control to show two columns
        this.getModel('appView').setProperty('/layout', 'TwoColumnsMidExpanded');
        this.getRouter().navTo('object', { objectId: item.getBindingContext().getProperty('CategoryID') }, replace);
      },

      /**
       * Sets the item count on the list header
       * @param {integer} totalItems the total number of items in the list
       * @private
       */
      _updateListItemCount(totalItems) {
        let title;
        // only update the counter if the length is final
        if (this._list.getBinding('items').isLengthFinal()) {
          title = this.getResourceBundle().getText('listTitleCount', [totalItems]);
          this.getModel('listView').setProperty('/title', title);
        }
      },

      /**
       * Internal helper method to apply both filter and search state together on the list binding
       * @private
       */
      _applyFilterSearch() {
        let filters = this._listFilterState.aSearch.concat(this._listFilterState.aFilter);
        let viewModel = this.getModel('listView');
        this._list.getBinding('items').filter(filters, 'Application');
        // changes the noDataText of the list in case there are no filter results
        if (filters.length !== 0) {
          viewModel.setProperty(
            '/noDataText',
            this.getResourceBundle().getText('listListNoDataWithFilterOrSearchText')
          );
        } else if (this._listFilterState.aSearch.length > 0) {
          // only reset the no data text to default when no new search was triggered
          viewModel.setProperty('/noDataText', this.getResourceBundle().getText('listListNoDataText'));
        }
      },

      /**
       * Internal helper method that sets the filter bar visibility property and the label's caption to be shown
       * @param {string} filterBarText the selected filter value
       * @private
       */
      _updateFilterBar(filterBarText) {
        let viewModel = this.getModel('listView');
        viewModel.setProperty('/isFilterBarVisible', this._listFilterState.aFilter.length > 0);
        viewModel.setProperty(
          '/filterBarLabel',
          this.getResourceBundle().getText('listFilterBarText', [filterBarText])
        );
      },
    });
  }
);
