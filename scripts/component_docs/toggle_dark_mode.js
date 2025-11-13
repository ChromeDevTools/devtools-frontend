// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const DARK_THEME_CLASS = 'theme-with-dark-background';
function toggleDarkMode(force) {
    // Only use the second arg if its not undefined. The spec treats `undefined` as falsy. :/
    document.documentElement.classList.toggle(...[DARK_THEME_CLASS, ...force !== undefined ? [force] : []]);
}
export function init() {
    window.addEventListener('load', () => {
        const button = document.createElement('button');
        button.innerText = 'Toggle light/dark mode';
        button.className = 'component-docs-ui';
        button.style.position = 'fixed';
        button.style.bottom = '10px';
        button.style.right = '30px';
        button.style.width = '200px';
        button.style.fontSize = '16px';
        button.style.padding = '5px';
        button.style.cursor = 'pointer';
        button.addEventListener('click', event => {
            event.preventDefault();
            toggleDarkMode();
        });
        document.body.appendChild(button);
    });
}
//# sourceMappingURL=toggle_dark_mode.js.map