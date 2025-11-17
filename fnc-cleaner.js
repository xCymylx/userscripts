// ==UserScript==
// @name         Fanatic Anime Store - Remove Out of Stock
// @namespace    https://www.cymyl.org
// @version      1.0
// @description  Remove out-of-stock product cards and their parent containers to eliminate blank spaces
// @author       Cymyl
// @match        *://www.fanaticanimestore.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function removeOutOfStockCards(root = document) {
        const cards = root.querySelectorAll('article.card');
        cards.forEach(card => {
            const btn = card.querySelector('.card-btn');
            if (btn && btn.textContent.toLowerCase().includes('out of stock')) {

                // Try to remove parent container (e.g., <li> or <div> that wraps the card)
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
