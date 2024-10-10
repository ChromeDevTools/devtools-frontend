// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../../../lit-html/lit-html.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

const {html} = LitHtml;

await ComponentHelpers.ComponentServerSetup.setup();

const THEME_VARIABLES_NAMES = new Set([
  '--sys-color-base',
  '--sys-color-base-container',
  '--sys-color-base-container-elevated',
  '--sys-color-blue',
  '--sys-color-blue-bright',
  '--sys-color-cdt-base',
  '--sys-color-cdt-base-container',
  '--sys-color-cyan',
  '--sys-color-cyan-bright',
  '--sys-color-divider',
  '--sys-color-divider-on-tonal-container',
  '--sys-color-divider-prominent',
  '--sys-color-error',
  '--sys-color-error-bright',
  '--sys-color-error-container',
  '--sys-color-error-outline',
  '--sys-color-gradient-primary',
  '--sys-color-gradient-tertiary',
  '--sys-color-green',
  '--sys-color-green-bright',
  '--sys-color-inverse-on-surface',
  '--sys-color-inverse-primary',
  '--sys-color-inverse-surface',
  '--sys-color-neutral-bright',
  '--sys-color-neutral-container',
  '--sys-color-neutral-outline',
  '--sys-color-omnibox-container',
  '--sys-color-on-base',
  '--sys-color-on-base-divider',
  '--sys-color-on-blue',
  '--sys-color-on-cyan',
  '--sys-color-on-error',
  '--sys-color-on-error-container',
  '--sys-color-on-green',
  '--sys-color-on-orange',
  '--sys-color-on-pink',
  '--sys-color-on-primary',
  '--sys-color-on-purple',
  '--sys-color-on-secondary',
  '--sys-color-on-surface',
  '--sys-color-on-surface-error',
  '--sys-color-on-surface-green',
  '--sys-color-on-surface-primary',
  '--sys-color-on-surface-secondary',
  '--sys-color-on-surface-subtle',
  '--sys-color-on-surface-yellow',
  '--sys-color-on-tertiary',
  '--sys-color-on-tertiary-container',
  '--sys-color-on-tonal-container',
  '--sys-color-on-yellow',
  '--sys-color-on-yellow-container',
  '--sys-color-orange',
  '--sys-color-orange-bright',
  '--sys-color-outline',
  '--sys-color-pink',
  '--sys-color-pink-bright',
  '--sys-color-primary',
  '--sys-color-primary-bright',
  '--sys-color-purple',
  '--sys-color-purple-bright',
  '--sys-color-secondary',
  '--sys-color-state-disabled',
  '--sys-color-state-disabled-container',
  '--sys-color-state-focus-highlight',
  '--sys-color-state-focus-ring',
  '--sys-color-state-focus-select',
  '--sys-color-state-header-hover',
  '--sys-color-state-hover-bright-blend-protection',
  '--sys-color-state-hover-dim-blend-protection',
  '--sys-color-state-hover-on-prominent',
  '--sys-color-state-hover-on-subtle',
  '--sys-color-state-on-header-hover',
  '--sys-color-state-ripple-neutral-on-prominent',
  '--sys-color-state-ripple-neutral-on-subtle',
  '--sys-color-state-ripple-primary',
  '--sys-color-surface',
  '--sys-color-surface1',
  '--sys-color-surface2',
  '--sys-color-surface3',
  '--sys-color-surface4',
  '--sys-color-surface5',
  '--sys-color-surface-error',
  '--sys-color-surface-green',
  '--sys-color-surface-variant',
  '--sys-color-surface-yellow',
  '--sys-color-surface-yellow-high',
  '--sys-color-tertiary',
  '--sys-color-tertiary-container',
  '--sys-color-token-atom',
  '--sys-color-token-attribute',
  '--sys-color-token-attribute-value',
  '--sys-color-token-builtin',
  '--sys-color-token-comment',
  '--sys-color-token-definition',
  '--sys-color-token-deleted',
  '--sys-color-token-inserted',
  '--sys-color-token-keyword',
  '--sys-color-token-meta',
  '--sys-color-token-number',
  '--sys-color-token-property',
  '--sys-color-token-property-special',
  '--sys-color-token-pseudo-element',
  '--sys-color-token-string',
  '--sys-color-token-string-special',
  '--sys-color-token-subtle',
  '--sys-color-token-tag',
  '--sys-color-token-type',
  '--sys-color-token-variable',
  '--sys-color-token-variable-special',
  '--sys-color-tonal-container',
  '--sys-color-tonal-outline',
  '--sys-color-yellow',
  '--sys-color-yellow-bright',
  '--sys-color-yellow-container',
  '--sys-color-yellow-outline',
  '--sys-elevation-level1',
  '--sys-elevation-level2',
  '--sys-elevation-level3',
  '--sys-elevation-level4',
  '--sys-elevation-level5',
]);

function appendStyles() {
  const container = document.getElementById('container') as HTMLElement;
  const items = Array.from(THEME_VARIABLES_NAMES).map(varName => {
    const value = getComputedStyle(container).getPropertyValue(varName);
    if (!value) {
      throw new Error(`Could not find value for CSS variable ${varName}.`);
    }

    let styles = {};
    if (varName.includes('--sys-elevation')) {
      styles = {boxShadow: `var(${varName})`, borderBottomWidth: 0};
    } else {
      styles = {borderBottomColor: `var(${varName})`};
    }
    const style = LitHtml.Directives.styleMap(styles);
    return html`
      <div style=${style}><code>${varName}: ${value}</code></div>
      <div style=${style} class='theme-with-dark-background'><code>${varName}: ${value}</code></div>
    `;
  });
  LitHtml.render(html`${items}`, container);
}

appendStyles();
