// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../core/platform/platform.js';
import * as ComponentHelpers from '../../helpers/helpers.js';
import * as Linkifier from '../../linkifier/linkifier.js';

await ComponentHelpers.ComponentServerSetup.setup();

const link = new Linkifier.Linkifier.Linkifier();

link.data = {
  url: 'example.com' as Platform.DevToolsPath.UrlString,
  lineNumber: 11,
  columnNumber: 1,
};

const container = document.getElementById('container');

container?.addEventListener('linkifieractivated', (event: Event) => {
  const data = JSON.stringify((event as unknown as {data: unknown}).data, null, 2);
  alert(`Linkifier click: ${data}`);
});
container?.appendChild(link);
