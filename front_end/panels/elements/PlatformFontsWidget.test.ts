// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as Elements from './elements.js';

describeWithMockConnection('PlatformFontsWidget', () => {
  it('correctly displays font stats', async () => {
    const sharedModel = {} as Elements.ComputedStyleModel.ComputedStyleModel;
    sharedModel.addEventListener = sinon.stub();
    const cssModel = {} as SDK.CSSModel.CSSModel;
    cssModel.getPlatformFonts = async () => ([
      {
        familyName: 'Arial',
        postScriptName: 'ArialMT',
        isCustomFont: false,
        glyphCount: 5,
      },
      {
        familyName: 'Merriweather Black',
        postScriptName: 'Merriweather-Black',
        isCustomFont: false,
        glyphCount: 18,
      },
    ]);
    const node = {
      id: 1,
    } as SDK.DOMModel.DOMNode;
    sharedModel.cssModel = () => cssModel;
    sharedModel.node = () => node;
    const platformFontsWidget = new Elements.PlatformFontsWidget.PlatformFontsWidget(sharedModel);
    await platformFontsWidget.doUpdate();
    const fontStatsItems = platformFontsWidget.contentElement.querySelectorAll('.font-stats-item');
    const firstFontContent = fontStatsItems[0].textContent;
    const secontFontContent = fontStatsItems[1].textContent;
    assert.include(firstFontContent, 'Family name: Merriweather Black');
    assert.include(firstFontContent, 'PostScript name: Merriweather-Black');
    assert.include(firstFontContent, 'Font origin: Local file(18 glyphs)');
    assert.include(secontFontContent, 'Family name: Arial');
    assert.include(secontFontContent, 'PostScript name: ArialMT');
    assert.include(secontFontContent, 'Font origin: Local file(5 glyphs)');
  });
});
