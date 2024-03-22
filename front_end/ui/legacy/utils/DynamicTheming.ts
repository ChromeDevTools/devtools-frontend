// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as ThemeSupport from '../theme_support/theme_support.js';

// export class instead of function to make sinon spying possible (it cannot mock ES modules)
export class DynamicTheming {
  static fetchColors(document?: Document): void {
    if (Host.InspectorFrontendHost.InspectorFrontendHostInstance.isHostedMode()) {
      return;
    }
    if (!document) {
      return;
    }

    const oldColorsCssLink = document.querySelector('link[href*=\'//theme/colors.css\']');
    const newColorsCssLink = document.createElement('link');
    newColorsCssLink.setAttribute(
        'href', `devtools://theme/colors.css?sets=ui,chrome&version=${(new Date()).getTime().toString()}`);
    newColorsCssLink.setAttribute('rel', 'stylesheet');
    newColorsCssLink.setAttribute('type', 'text/css');
    newColorsCssLink.onload = () => {
      if (oldColorsCssLink) {
        oldColorsCssLink.remove();
      }
      ThemeSupport.ThemeSupport.instance().applyTheme(document);
    };
    document.body.appendChild(newColorsCssLink);
  }
}
