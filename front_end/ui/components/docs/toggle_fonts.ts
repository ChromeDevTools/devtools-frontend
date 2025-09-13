// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const PLATFROM_SCREENSHOT_TESTS = 'platform-screenshot-test';
const PLATFORM_MAC_CLASS = 'platform-mac';
const PLATFORM_LINUX_CLASS = 'platform-linux';
const PLATFORM_WINDOWS_CLASS = 'platform-windows';

const urlParams = new URLSearchParams(window.location.search);

export function init(): void {
  // fontFamily is provided by the interaction tests.
  // While platform-specific class names define multiple font-families,
  // we want a single font-family to be used by the tests.
  if (urlParams.has('fontFamily')) {
    const div = document.createElement('div');
    div.className = 'component-docs-ui';
    div.style.position = 'fixed';
    div.style.bottom = '10px';
    div.style.right = '230px';
    div.style.width = '250px';
    div.style.fontSize = '16px';
    div.style.padding = '5px';
    div.innerText = `font-family: ${urlParams.get('fontFamily')}`;
    window.addEventListener('load', () => {
      document.body.appendChild(div);
    });
    document.body.style.fontFamily = `${urlParams.get('fontFamily')}`;
    return;
  }

  document.documentElement.classList.add(PLATFORM_LINUX_CLASS);
  const button = document.createElement('button');
  button.className = 'component-docs-ui';

  const loop = [
    PLATFROM_SCREENSHOT_TESTS,
    PLATFORM_LINUX_CLASS,
    PLATFORM_MAC_CLASS,
    PLATFORM_WINDOWS_CLASS,
  ];

  function toggleFonts(): void {
    for (const className of loop) {
      if (className === loop[0]) {
        document.documentElement.classList.add(className);
      } else {
        document.documentElement.classList.remove(className);
      }
    }
    loop.push(loop.shift() as string);
    button.innerText = 'Turn on ' + loop[0] + ' fonts';
  }

  window.addEventListener('load', () => {
    toggleFonts();

    button.style.position = 'fixed';
    button.style.bottom = '10px';
    button.style.right = '230px';
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
