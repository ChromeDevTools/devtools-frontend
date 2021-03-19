// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../component_helpers/component_helpers.js';
import * as LitHtml from '../../third_party/lit-html/lit-html.js';

await ComponentHelpers.ComponentServerSetup.setup();

const THEME_VARIABLES_LIGHT = new Map([
  ['--color-primary', '#1a73e8'],
  ['--color-primary-variant', '#4285f4'],
  ['--color-background', '#ffffff'],
  ['--color-background-elevation-1', '#f1f3f4'],
  ['--color-background-elevation-2', '#dee1e6'],
  ['--color-background-highlight', '#cacdd1'],
  ['--color-text-primary', '#202124'],
  ['--color-text-secondary', '#5f6368'],
  ['--color-text-disabled', '#80868b'],
  ['--color-details-hairline', '#cacdd1'],
  ['--color-link', '#1a73e8'],
  ['--color-accent-red', '#d93025'],
  ['--color-accent-green', '#188038'],
  ['--color-syntax-1', '#c80000'],
  ['--color-syntax-2', '#881280'],
  ['--color-syntax-3', '#1a1aa6'],
  ['--color-syntax-4', '#994500'],
  ['--color-syntax-5', '#84f0ff'],
  ['--color-syntax-6', '#236e25'],
  ['--color-syntax-7', '#303942'],
  ['--color-syntax-8', '#a894a6'],
]);

const THEME_VARIABLES_DARK = new Map([
  ['--color-primary', '#8ab4f8'],
  ['--color-primary-variant', '#669df6'],
  ['--color-background', '#202124'],
  ['--color-background-elevation-1', '#292a2d'],
  ['--color-background-elevation-2', '#35363a'],
  ['--color-background-highlight', '#4b4c4f'],
  ['--color-text-primary', '#e8eaed'],
  ['--color-text-secondary', '#9aa0a6'],
  ['--color-text-disabled', '#80868b'],
  ['--color-details-hairline', '#494c50'],
  ['--color-link', '#8ab4f8'],
  ['--color-accent-red', '#f28b82'],
  ['--color-accent-green', '#81c995'],
  ['--color-syntax-1', '#35d4c7'],
  ['--color-syntax-2', '#5db0d7'],
  ['--color-syntax-3', '#f29766'],
  ['--color-syntax-4', '#9bbbdc'],
  ['--color-syntax-5', '#84f0ff'],
  ['--color-syntax-6', '#898989'],
  ['--color-syntax-7', '#cfd0d0'],
  ['--color-syntax-8', '#5db0d7'],
]);

class ThemeColors extends HTMLElement {
  private shadow: ShadowRoot;
  constructor() {
    super();
    this.shadow = this.attachShadow({mode: 'open'});
    this.render();
  }

  render(): void {
    LitHtml.render(
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
      LitHtml.html`
          <style>
            ul {
              list-style: none;
              padding: 0;
              width: 48%;
            }

            li {
              line-height: 30px;
              font-size: 18px;
              border-bottom-width: 20px;
              border-bottom-style: solid;

              /* color is set in code */
              margin-bottom: 20px;
              text-align: center;
            }

            .themes {
              display: flex;
              justify-content: space-between;
            }

            .dark-mode {
              background: #000;
            }

            .dark-mode code {
              color: #fff;
            }
          </style>
          <div class="themes">
            <ul class="light-mode">
              ${Array.from(THEME_VARIABLES_LIGHT.entries()).map(([varName, color]) => {
                const liStyles = LitHtml.Directives.styleMap({
                  borderBottomColor: `${color}`,
                });
                return LitHtml.html`<li style=${liStyles}><code>${varName}: ${color}</code></li>`;
              })}
            </ul>
            <ul class="dark-mode">
              ${Array.from(THEME_VARIABLES_DARK.entries()).map(([varName, color]) => {
                const liStyles = LitHtml.Directives.styleMap({
                  borderBottomColor: `${color}`,
                });
                return LitHtml.html`<li style=${liStyles}><code>${varName}: ${color}</code></li>`;
              })}
            </ul>
          </div>
        `,
      this.shadow);
    // clang-format on
  }
}

customElements.define('devtools-theme-colors', ThemeColors);
