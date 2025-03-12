// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as Lit from '../../../lit/lit.js';
import * as ComponentHelpers from '../../helpers/helpers.js';
import {Tooltip} from '../../tooltips/Tooltip.js';

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
      <span
        aria-details="rich-tooltip"
        style="position: absolute; left: 16px; top: 116px; border: 1px solid black;"
      >
        Non-button click trigger
      </span>
      <devtools-tooltip id="rich-tooltip" variant="rich" use-click>
        <p>Rich tooltip</p>
        <button>Action</button>
      </devtools-tooltip>
    </div>
    <div>
      <button
        id="removable"
        @click=${() => document.getElementById('removable')?.remove()}
        class="anchor"
        aria-details="programatic"
        style="position: absolute; left: 16px; top: 216px;"
      >
        Click to remove anchor
      </button>
    </div>
  `,
    container);

const anchor = container.querySelector('.anchor') as HTMLElement;
const programmaticTooltip = new Tooltip({id: 'programatic', variant: 'rich', anchor});
programmaticTooltip.append('Text content');
anchor.insertAdjacentElement('afterend', programmaticTooltip);

// Make the buttons draggable, so that we can experiment with the position of the tooltip.
container.querySelectorAll('button,span').forEach(anchor => draggable(anchor as HTMLElement));
function draggable(element: HTMLElement|null): void {
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
