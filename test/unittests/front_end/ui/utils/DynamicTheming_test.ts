// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import * as Host from '../../../../../front_end/core/host/host.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';

describe('DynamicTheming', () => {
  it('fetchColors updates color node url', () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(false);
    const originalColorHref = 'devtools://theme/colors.css?sets=ui,chrome';

    const COLORS_CSS_SELECTOR = 'link[href*=\'//theme/colors.css\']';
    const doc = document.implementation.createHTMLDocument();
    const colorsLink = doc.createElement('link');
    colorsLink.href = originalColorHref;
    colorsLink.rel = 'stylesheet';
    doc.head.appendChild(colorsLink);

    void UI.Utils.DynamicTheming.fetchColors(doc);

    const colorNode = doc.body.querySelector(COLORS_CSS_SELECTOR);
    assertNotNullOrUndefined(colorNode);
    const updatedHref = colorNode.getAttribute('href');
    assert.notEqual(updatedHref, originalColorHref);
  });
});
