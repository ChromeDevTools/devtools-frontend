// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import {renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';

import * as SourceFrame from './source_frame.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('FontView', () => {
  it('is vulnerable to CSS injection via charset', async () => {
    const maliciousCharset = 'utf-8); } * { background-color: rgb(255, 0, 0) !important; } /*';
    const contentData = new TextUtils.ContentData.ContentData('YmFzZTY0', true, 'text/plain', maliciousCharset);
    const contentProvider = new TextUtils.StaticContentProvider.StaticContentProvider(
        urlString`http://example.com/font.woff2`, Common.ResourceType.resourceTypes.Font,
        () => Promise.resolve(contentData));

    const fontView = new SourceFrame.FontView.FontView('text/plain', contentProvider);
    renderElementIntoDOM(fontView);

    // Wait for the content to be loaded and update requested.
    await fontView.updateComplete;
    await document.fonts.ready;

    const styleElements = fontView.element.querySelectorAll('style');
    let effectiveInjectionFound = false;
    for (const style of styleElements) {
      const sheet = style.sheet as CSSStyleSheet;
      if (sheet) {
        // If there's an injection, we'd expect more than 1 rule in the font-face style tag.
        // The first style tag has the component styles (.font-view { ... }).
        // The second style tag should only have ONE rule (@font-face { ... }).
        if (style.textContent?.includes('@font-face') && sheet.cssRules.length > 1) {
          effectiveInjectionFound = true;
        }
      }
    }
    assert.isFalse(effectiveInjectionFound, 'Effective CSS injection found (multiple rules in style tag)');
  });
});
