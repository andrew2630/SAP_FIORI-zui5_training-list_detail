sap.ui.define([], () => {
  'use strict';

  return {
    /**
     * Rounds the currency value to 2 digits
     *
     * @public
     * @param {string} value value to be formatted
     * @returns {string} formatted currency value with 2 digits
     */
    currencyValue(value) {
      if (!value) {
        return '';
      }

      return parseFloat(value).toFixed(2);
    },
  };
});
