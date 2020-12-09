// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
  /**
  *@description Deprecation notice for the Remote Devices tool
  *@example {chrome://inspect/#devices} PH1
  */
  thisPanelHasBeenDeprecatedIn:
      'This panel has been deprecated in favor of the {PH1} interface, which has equivalent functionality.',
};
const str_ = i18n.i18n.registerUIStrings('devices/DevicesView.js', UIStrings);

// @ts-ignore
self.Devices = self.Devices || {};

Devices.DevicesView = class extends UI.Widget.VBox {
  constructor() {
    super(true);

    const deprecationMessage = this.contentElement.createChild('span');
    const documentationLink = UI.Fragment.html
    `<a class="devtools-link" role="link" tabindex="0" href="#" style="display: inline; cursor: pointer;">chrome://inspect/#devices</a>`;

    self.onInvokeElement(documentationLink, event => {
      const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
      if (mainTarget) {
        mainTarget.pageAgent().invoke_navigate({url: 'chrome://inspect/#devices'});
      }
      event.consume(true);
    });

    deprecationMessage.style.padding = '5px';
    deprecationMessage.appendChild(
        i18n.i18n.getFormatLocalizedString(str_, UIStrings.thisPanelHasBeenDeprecatedIn, {PH1: documentationLink}));

    this.setDefaultFocusedElement(documentationLink);
  }
};
