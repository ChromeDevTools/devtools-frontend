// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const PLATFORM_MAC_CLASS = 'platform-mac';
const PLATFORM_LINUX_CLASS = 'platform-linux';
const PLATFORM_WINDOWS_CLASS = 'platform-windows';
export function init() {
    document.documentElement.classList.add(PLATFORM_LINUX_CLASS);
    const button = document.createElement('button');
    button.className = 'component-docs-ui';
    const loop = [
        PLATFORM_LINUX_CLASS,
        PLATFORM_MAC_CLASS,
        PLATFORM_WINDOWS_CLASS,
    ];
    function toggleFonts() {
        for (const className of loop) {
            document.documentElement.classList.toggle(className, className === loop[0]);
        }
        loop.push(loop.shift());
        button.innerText = 'Turn on ' + loop[0] + ' fonts';
    }
    window.addEventListener('load', () => {
        toggleFonts();
        button.style.position = 'fixed';
        button.style.bottom = '10px';
        button.style.right = '250px';
        button.style.width = '250px';
        button.style.fontSize = '16px';
        button.style.padding = '5px';
        button.style.cursor = 'pointer';
        button.addEventListener('click', event => {
            event.preventDefault();
            toggleFonts();
        });
        document.body.appendChild(button);
    });
}
//# sourceMappingURL=toggle_fonts.js.map