// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../tooltip/Tooltip.js';

import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as Lit from '../../../lit/lit.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

const {html} = Lit;

await FrontendHelpers.initializeGlobalVars();
await ComponentHelpers.ComponentServerSetup.setup();
const container = document.getElementById('container');
if (!container) {
  throw new Error('No component container found.');
}

Lit.render(
    html`
    <div style="position: relative; z-index: 0;">
      <button aria-describedby="simple-tooltip" style="position: absolute; left: 16px; top: 16px;">
        Simple
      </button>
      <devtools-tooltip id="simple-tooltip">Simple content</devtools-tooltip>
    </div>
    <div style="position: relative; z-index: 0;">
      <button aria-describedby="rich-tooltip" style="position: absolute; left: 16px; top: 116px;">
        Rich
      </button>
      <devtools-tooltip id="rich-tooltip" variant="rich">
        <p>Rich tooltip</p>
        <button>Action</button>
      </devtools-tooltip>
    </div>
  `,
    container);

// Make the buttons draggable, so that we can experiment with the position of the tooltip.
container.querySelectorAll('button').forEach(draggable);
function draggable(element: HTMLElement|null) {
  if (!element) {
    return;
  }
  element.addEventListener('mousedown', event => {
    const target = event.target as HTMLElement;
    const offsetX = event.clientX - target.getBoundingClientRect().left;
    const offsetY = event.clientY - target.getBoundingClientRect().top;

    function onMouseMove(event: MouseEvent) {
      target.style.left = `${event.clientX - offsetX}px`;
      target.style.top = `${event.clientY - offsetY}px`;
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}
