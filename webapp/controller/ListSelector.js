sap.ui.define(['sap/ui/base/Object', 'sap/base/Log'], (BaseObject, Log) => {
  'use strict';

  return BaseObject.extend('zui5traininglistdetail.controller.ListSelector', {
    /**
     * Provides a convenience API for selecting list items. All the functions will wait until the initial load of the a List passed to the instance by the setBoundMasterList
     * function.
     * @class
     * @public
     */

    constructor: function() {
      this._whenListHasBeenSet = new Promise(resolveListHasBeenSet => {
        this._resolveListHasBeenSet = resolveListHasBeenSet;
      });

      // This promise needs to be created in the constructor, since it is allowed to
      // invoke selectItem functions before calling setBoundMasterList
      this.whenListLoadingIsDone = new Promise((resolve, reject) => {
        this._whenListHasBeenSet.then(list =>
          list
            .getBinding('items')
            .attachEventOnce(
              'dataReceived',
              () => (this._list.getItems().length ? resolve({ list }) : reject({ list }))
            )
        );
      });
    },

    /**
     * A bound list should be passed in here. Should be done, before the list has received its initial data from the server.
     * May only be invoked once per ListSelector instance.
     * @param {sap.m.List} list The list all the select functions will be invoked on.
     * @public
     */
    setBoundMasterList(list) {
      this._list = list;
      this._resolveListHasBeenSet(list);
    },

    /**
     * Tries to select and scroll to a list item with a matching binding context. If there are no items matching the binding context or the ListMode is none,
     * no selection/scrolling will happen
     * @param {string} bindingPath the binding path matching the binding path of a list item
     * @public
     */
    selectAListItem(bindingPath) {
      this.whenListLoadingIsDone.then(
        () => {
          let list = this._list;
          let selectedItem;

          if (list.getMode() === 'None') {
            return;
          }

          selectedItem = list.getSelectedItem();

          // skip update if the current selection is already matching the object path
          if (selectedItem && selectedItem.getBindingContext().getPath() === bindingPath) {
            return;
          }

          list
            .getItems()
            .filter(item => item.getBindingContext() && item.getBindingContext().getPath() === bindingPath)
            .forEach(item => list.setSelectedItem(item));
        },
        () => {
          Log.warning(
            'Could not select the list item with the path' +
              bindingPath +
              ' because the list encountered an error or had no items'
          );
        }
      );
    },

    /**
     * Removes all selections from list.
     * Does not trigger 'selectionChange' event on list, though.
     * @public
     */
    clearMasterListSelection() {
      //use promise to make sure that 'this._list' is available
      this._whenListHasBeenSet.then(() => this._list.removeSelections(true));
    },
  });
});
