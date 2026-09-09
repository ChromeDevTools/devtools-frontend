// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Lit from '../../../../ui/lit/lit.js';
import * as UI from '../../legacy.js';
import * as InlineEditor from './inline_editor.js';
const { html } = Lit;
let text = 'top span-left';
export function render(container) {
    const area = InlineEditor.PositionAreaEditor.parsePositionArea(text) ?? undefined;
    function onPositionAreaChanged(event) {
        text = InlineEditor.PositionAreaEditor.stringifyPositionArea(event.detail);
        render(container);
    }
    function onInput(event) {
        const input = event.target;
        text = input.value;
        render(container);
    }
    Lit.render(html `
        <style>
          .wrapper {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: var(--sys-size-5);
            padding: var(--sys-size-8);
          }

          .input-container {
            display: flex;
            align-items: center;
            gap: var(--sys-size-3);
          }

          .input-label {
            font-family: var(--source-code-font-family);
            font-size: var(--sys-typescale-body4-size);
            color: var(--sys-color-token-property-special);
          }

          .property-input {
            font-family: var(--source-code-font-family);
            font-size: var(--sys-typescale-body4-size);
            padding: var(--sys-size-2) var(--sys-size-3);
            width: 200px;
          }

          .editor-container {
            border: 1px solid var(--sys-color-neutral-outline);
            border-radius: var(--sys-shape-corner-small);
            overflow: hidden;
            width: fit-content;
          }
        </style>
        <div class="wrapper">
          <div class="input-container">
            <label class="input-label" for="position-area-input">position-area:</label>
            <input
              id="position-area-input"
              class="property-input"
              type="text"
              .value=${text}
              @input=${onInput}
            />
          </div>
          <div class="editor-container">
            <devtools-widget
              ${UI.Widget.widget(InlineEditor.PositionAreaEditor.PositionAreaEditor, { area })}
              @positionAreaChanged=${onPositionAreaChanged}>
            </devtools-widget>
          </div>
        </div>
      `, container);
}
//# sourceMappingURL=PositionAreaEditor.docs.js.map