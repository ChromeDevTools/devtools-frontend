// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertShadowRoot} from '../../../helpers/DOMHelpers.js';

export function assertNodeTextContent(component: HTMLElement, expectedContent: string) {
  assertShadowRoot(component.shadowRoot);
  const content = Array.from(component.shadowRoot.querySelectorAll('span')).map(span => span.textContent).join('');
  assert.strictEqual(content, expectedContent);
}
