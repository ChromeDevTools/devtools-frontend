// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// export class instead of function to make sinon spying possible (it cannot mock ES modules)
export class DynamicTheming {
  static async refetchColors(document: Document|undefined): Promise<void> {
    if (!document) {
      return;
    }
    const COLORS_CSS_SELECTOR = 'link[href*=\'//theme/colors.css\']';
    const colorCssNode = document.querySelector(COLORS_CSS_SELECTOR);
    if (!colorCssNode) {
      return;
    }
    const href = colorCssNode.getAttribute('href');
    if (!href) {
      return;
    }
    const hrefUrl = new URL(href, location.href);
    hrefUrl.searchParams.set('version', (new Date()).getTime().toString());
    const newColorsCssLink = document.createElement('link');
    newColorsCssLink.setAttribute('href', hrefUrl.toString());
    newColorsCssLink.setAttribute('rel', 'stylesheet');
    newColorsCssLink.setAttribute('type', 'text/css');
    const newColorsLoaded = new Promise<boolean>(resolve => {
      newColorsCssLink.onload = resolve.bind(this, true);
      newColorsCssLink.onerror = resolve.bind(this, false);
    });
    document.body.appendChild(newColorsCssLink);
    if (await newColorsLoaded) {
      colorCssNode.remove();
    }
  }
}
