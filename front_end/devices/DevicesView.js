// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Devices.DevicesView = class extends UI.VBox {
  constructor() {
    super(true);

    const startDeprecationMessage = ls`This panel has been deprecated in favor of the `;
    const button = UI.Fragment.build`<a href="#">chrome://inspect/#devices</a>`;
    const endDeprecationmessage = ls` interface, which has equivalent functionality.`;

    const deprecationNotice = UI.Fragment.build`
      <div style="user-select: text; padding: 5px;">
        ${startDeprecationMessage}${button}${endDeprecationmessage}
      </div>
    `;

    this.contentElement.appendChild(deprecationNotice.element());

    this.contentElement.querySelector('a').addEventListener('click', () => {
      SDK.targetManager.mainTarget().pageAgent().navigate('chrome://inspect/#devices');
    });
  }
};
