// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Devices.DevicesView = class extends UI.VBox {
  constructor() {
    super(true);

    const deprecationMessage = this.contentElement.createChild('span');
    const documentationLink = UI.html
    `<a class="devtools-link" role="link" tabindex="0" href="#" style="display: inline; cursor: pointer;">chrome://inspect/#devices</a>`;

    self.onInvokeElement(documentationLink, event => {
      SDK.SDKModel.TargetManager.instance().mainTarget().pageAgent().navigate('chrome://inspect/#devices');
      event.consume(true);
    });

    deprecationMessage.style.padding = '5px';
    deprecationMessage.appendChild(UI.formatLocalized(
        'This panel has been deprecated in favor of the %s interface, which has equivalent functionality.',
        [documentationLink]));

    this.setDefaultFocusedElement(documentationLink);
  }
};
