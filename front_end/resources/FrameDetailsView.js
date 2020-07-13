// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

export class FrameDetailsView extends UI.Widget.VBox {
  /**
   * @param {!SDK.ResourceTreeModel.ResourceTreeFrame} frame
   */
  constructor(frame) {
    super();
    this._reportView = new UI.ReportView.ReportView(frame.displayName());
    this._reportView.show(this.contentElement);

    this._generalSection = this._reportView.appendSection(ls`General`);
    this._generalSection.appendField(ls`URL`, frame.url);
    this._generalSection.appendField(ls`Origin`, frame.securityOrigin);
  }
}
