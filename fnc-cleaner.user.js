// ==UserScript==
// @name         Fanatic Anime Store - Remove Out of Stock
// @namespace    https://github.com/xCymylx/userscripts/
// @version      1.1.1
// @license      MIT
// @description  Remove out-of-stock product cards and their parent containers to eliminate blank spaces
// @author       Cymyl
// @updateURL    https://raw.githubusercontent.com/xCymylx/userscripts/main/fnc-cleaner.user.js
// @downloadURL  https://raw.githubusercontent.com/xCymylx/userscripts/main/fnc-cleaner.user.js
// @icon         https://cdn11.bigcommerce.com/s-5s1ah0hhi7/product_images/favicon%20%281%29.ico?t=1599467786
// @match        https://www.fanaticanimestore.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    function removeOutOfStockCards(root = document) {
        const cards = root.querySelectorAll('article.card');
        cards.forEach(card => {
            const btn = card.querySelector('.card-btn');
            if (btn && btn.textContent.toLowerCase().includes('out of stock')) {
                const parent = card.parentElement;
                const toRemove =
                    parent && parent.children.length === 1 ? parent : card;
                console.log('Removing out-of-stock item:', card.dataset.name || card.querySelector('.card-title')?.innerText);
                toRemove.remove();
            }
        });
    }

    const observerReady = setInterval(() => {
        if (document.querySelector('article.card')) {
            clearInterval(observerReady);
            removeOutOfStockCards();
            const observer = new MutationObserver(mutations => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) {
                            if (node.matches('article.card')) {
                                removeOutOfStockCards(node.parentNode);
                            } else if (node.querySelectorAll) {
                                removeOutOfStockCards(node);
                            }
                        }
                    }
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }, 500);
})();
