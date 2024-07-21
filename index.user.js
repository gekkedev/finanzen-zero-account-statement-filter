// ==UserScript==
// @name        Finanzen.net Zero account statement filter
// @namespace   https://github.com/gekkedev/finanzen-zero-account-statement-filter
// @match       https://mein.finanzen-zero.net/meindepot/konto*
// @grant       none
// @version     1.0
// @author      gekkedev
// @description Adds a search filter and auto-expand button to the Finanzen.net Zero account statement page.
// @updateURL   https://raw.githubusercontent.com/gekkedev/finanzen-zero-account-statement-filter/main/index.user.js
// @downloadURL https://raw.githubusercontent.com/gekkedev/finanzen-zero-account-statement-filter/main/index.user.js
// ==/UserScript==

(function() {
  'use strict';

  function waitForElement(selector, elementId, callback) {
    const element = document.querySelector(selector);
    if (element) {
      callback(element);
    } else {
      const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector(selector);
        if (element && !document.querySelector(elementId)) {
          callback(element);
          obs.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  function initialize() {
    // Create the search input
    const searchInput = document.createElement('input');
    searchInput.id = "custom-search-input";
    searchInput.type = 'text';
    searchInput.placeholder = 'Filter...';
    searchInput.style.width = '15rem';

    // Find the reference element
    const referenceElement = document.querySelector("depot-money-transaction-overview h5");
    // Add the search input to the page
    referenceElement.parentElement.insertBefore(searchInput, referenceElement.nextSibling);

    // Event listener for input changes
    searchInput.addEventListener('input', function() {
      const filter = searchInput.value.toLowerCase();
      const rows = document.querySelectorAll('tr.ng-star-inserted');

      rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        if (text.includes(filter)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });

    // Function to click the expansion button multiple times
    function autoExpandList(clicks) {
      const expandButton = document.querySelector('.row.d-flex.justify-content-end .link-secondary.cursor-pointer');
      if (!expandButton) return;

      let previousRowCount = document.querySelectorAll('tr.ng-star-inserted').length;
      let clickCount = 0;

      const expandInterval = setInterval(() => {
        if (clickCount >= clicks) {
          clearInterval(expandInterval);
          return;
        }

        expandButton.click();
        clickCount++;

        setTimeout(() => {
          const currentRowCount = document.querySelectorAll('tr.ng-star-inserted').length;
          if (currentRowCount > previousRowCount) {
            previousRowCount = currentRowCount;
          }
        }, 500); // Adjust the timeout if necessary
      }, 1000); // Adjust the interval if necessary
    }

    const expandButton = document.createElement("button")
    expandButton.innerText = "Auto-expand"
    expandButton.onclick = () => {
      /** how often the expansion button gets clicked */
      const numberOfClicks = prompt("Expand how many times?", 5);
      //start auto-expanding the list
      autoExpandList(numberOfClicks);
    }
    //insert it after the search field
    referenceElement.parentElement.insertBefore(expandButton, searchInput.nextSibling)
  }

  //initialize the script once the reference element is available
  waitForElement('depot-money-transaction-overview h5', '#custom-search-input', initialize);
})();
