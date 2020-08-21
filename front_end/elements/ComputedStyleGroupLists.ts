// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../component_helpers/component_helpers.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';

const {render, html} = LitHtml;
const getStyleSheets = ComponentHelpers.GetStylesheet.getStyleSheets;
const isInDarkMode = ComponentHelpers.GetStylesheet.isInDarkMode;

export interface PropertyGroup {
  group: string;
  properties: HTMLElement[];
}

export class ComputedStyleGroupLists extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private propertyGroups: ReadonlyArray<PropertyGroup> = [];
  private collapsedGroups: Set<string> = new Set();

  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [
      ...getStyleSheets('ui/inspectorCommon.css', {patchThemeSupport: true}),
      ...getStyleSheets(`ui/inspectorSyntaxHighlight${isInDarkMode() ? 'Dark' : ''}.css`),
    ];
  }

  set data(data: {propertyGroups: PropertyGroup[]}) {
    this.propertyGroups = data.propertyGroups;
    this.render();
  }

  private onSummaryClick(group: string, event: Event) {
    event.preventDefault();
    if (this.collapsedGroups.has(group)) {
      this.collapsedGroups.delete(group);
    } else {
      this.collapsedGroups.add(group);
    }
    this.render();
  }

  private render() {
    const groupTemplates = [];
    for (const {group, properties} of this.propertyGroups) {
      if (properties.length === 0) {
        continue;
      }
      const onSummaryClick = this.onSummaryClick.bind(this, group);

      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      groupTemplates.push(html`
      <details ?open=${!this.collapsedGroups.has(group)}>
        <summary @click=${onSummaryClick}>
          ${group}
        </summary>
        <ol>
          ${this.collapsedGroups.has(group) ? null :
              properties.map(property => html`<li>${property}</li>`)}
        </ol>
      </details>
      `);
    }

    render(html`
      <style>
        .group-lists {
          --side-distance: 16px;
        }

        ol {
          list-style-type: none;
          padding: 0;
          margin: 0;
        }

        details {
          position: relative;
        }

        summary {
          padding: 1em 0 1em var(--side-distance);
          cursor: pointer;
          color: var(--group-title-color, #5f6368);
          font-weight: 400;
        }

        summary::-webkit-details-marker {
          position: absolute;
          margin-top: 0.25em;
          left: 4px;
        }

        details[open] > ol {
          margin-bottom: 1em;
        }

        details:not(:last-child)::after {
          content: "";
          display: block;
          height: 1px;
          background-color: var(--divider-color);
          margin: 0 var(--side-distance);
        }
      </style>

      <div class="group-lists">
        ${groupTemplates}
      </div>
    `, this.shadow, {
      eventContext: this,
    });
    // clang-format on
  }
}

customElements.define('devtools-computed-style-group-lists', ComputedStyleGroupLists);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-computed-style-group-lists': ComputedStyleGroupLists;
  }
}
