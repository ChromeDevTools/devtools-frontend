// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../component_helpers/component_helpers.js';
import * as Components from '../../ui/components/components.js';

await ComponentHelpers.ComponentServerSetup.setup();

const link = new Components.Linkifier.Linkifier();

link.data = {
  url: 'example.com',
  lineNumber: 11,
  columnNumber: 1,
};

const container = document.getElementById('container');

container?.addEventListener('linkifier-activated', (event: Event) => {
  const data = JSON.stringify((event as unknown as {data: unknown}).data, null, 2);
  alert(`Linkifier click: ${data}`);
});
container?.appendChild(link);
