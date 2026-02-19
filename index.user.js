// ==UserScript==
// @name        Finanzen.net Zero account statement filter
// @namespace   https://github.com/gekkedev/finanzen-zero-account-statement-filter
// @match       https://mein.finanzen-zero.net/meindepot/konto*
// @grant       none
// @version     1.1
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

    function isElementVisible(element) {
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
      return element.getClientRects().length > 0;
    }

    function hasStrikethrough(element) {
      if (!element) {
        return false;
      }
      if (element.querySelector('s, strike')) {
        return true;
      }
      const elements = element.querySelectorAll('*');
      for (const child of elements) {
        const style = window.getComputedStyle(child);
        if (style.textDecorationLine && style.textDecorationLine.includes('line-through')) {
          return true;
        }
      }
      return false;
    }

    function normalizeWhitespace(value) {
      return value.replace(/\s+/g, ' ').trim();
    }

    function extractValueByLabel(row, label) {
      const containers = row.querySelectorAll('td div.d-flex');
      for (const container of containers) {
        const children = Array.from(container.children);
        if (children.length < 2) {
          continue;
        }
        const labelText = normalizeWhitespace(children[0].textContent || '');
        if (labelText.toLowerCase() === label.toLowerCase()) {
          return normalizeWhitespace(children[1].textContent || '');
        }
      }
      return '';
    }

    function parseDateValue(value) {
      const match = value.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
      if (!match) {
        return null;
      }
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      let year = parseInt(match[3], 10);
      if (year < 100) {
        year += 2000;
      }
      if (!day || !month || !year) {
        return null;
      }
      return { day, month, year, raw: match[0] };
    }

    function getExDividendDate(row) {
      const valutaValue = extractValueByLabel(row, 'Valuta');
      if (valutaValue) {
        const parsed = parseDateValue(valutaValue);
        if (parsed) {
          return parsed;
        }
      }
      const dates = (row.innerText.match(/\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g) || []).map(parseDateValue).filter(Boolean);
      return dates.length > 1 ? dates[1] : (dates[0] || null);
    }

    function csvEscape(value) {
      const safeValue = value == null ? '' : String(value);
      if (safeValue.includes('"') || safeValue.includes(',') || safeValue.includes('\n')) {
        return `"${safeValue.replace(/"/g, '""')}"`;
      }
      return safeValue;
    }

    function buildCsvForVisibleRows() {
      const rows = Array.from(document.querySelectorAll('tr.ng-star-inserted'))
        .filter(row => isElementVisible(row))
        .filter(row => !hasStrikethrough(row));

      const header = ['Month', 'ExDividendDate', 'Amount', 'Status', 'Purpose'];
      const lines = [header.join(',')];

      rows.forEach(row => {
        const exDividend = getExDividendDate(row);
        const monthValue = exDividend ? `${exDividend.year}-${String(exDividend.month).padStart(2, '0')}` : '';
        const exDividendValue = exDividend ? exDividend.raw : '';
        const amount = extractValueByLabel(row, 'Betrag');
        const status = extractValueByLabel(row, 'Status');
        const purpose = extractValueByLabel(row, 'Verwendungszweck');

        const values = [monthValue, exDividendValue, amount, status, purpose].map(csvEscape);
        lines.push(values.join(','));
      });

      return lines.join('\n');
    }

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

    const expandButton = document.createElement("button");
    expandButton.innerText = "Auto-expand";
    expandButton.onclick = () => {
      /** how often the expansion button gets clicked */
      const numberOfClicks = prompt("Expand how many times?", 5);
      //start auto-expanding the list
      autoExpandList(numberOfClicks);
    };

    const copyCsvButton = document.createElement("button");
    copyCsvButton.innerText = "Copy CSV";
    copyCsvButton.onclick = async () => {
      const csvText = buildCsvForVisibleRows();
      if (!csvText.trim()) {
        alert("No visible transactions found.");
        return;
      }
      try {
        await navigator.clipboard.writeText(csvText);
        alert("CSV copied to clipboard.");
      } catch (error) {
        console.error("Failed to copy CSV:", error);
        alert("Failed to copy CSV. Please allow clipboard access.");
      }
    };
    //insert it after the search field
    referenceElement.parentElement.insertBefore(expandButton, searchInput.nextSibling);
    referenceElement.parentElement.insertBefore(copyCsvButton, expandButton.nextSibling);
  }

  //initialize the script once the reference element is available
  waitForElement('depot-money-transaction-overview h5', '#custom-search-input', initialize);
})();
