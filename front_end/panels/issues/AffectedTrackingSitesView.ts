// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import {html, render} from '../../ui/lit/lit.js';

import {AffectedResourcesView} from './AffectedResourcesView.js';

const UIStrings = {
  /**
   * @description Label in the Issues panel for the number of affected potentially tracking websites. See https://github.com/privacycg/nav-tracking-mitigations/blob/main/bounce-tracking-explainer.md and https://developer.mozilla.org/en-US/docs/Glossary/eTLD.
   */
  nTrackingSites: '{n, plural, =1 {1 potentially tracking website} other {# potentially tracking websites}}',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedTrackingSitesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  trackingSites: readonly string[];
}
export type ViewOutput = object;
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export function defaultView(input: ViewInput, output: ViewOutput, target: HTMLElement): void {
  render(html`
      <tbody>
        ${input.trackingSites.map(site => html`
          <tr class="affected-resource-directive">
            <td class="affected-resource-cell" title=${site}>${site}</td>
          </tr>
        `)}
      </tbody>
    `,
         target);
}

export class AffectedTrackingSitesView extends AffectedResourcesView {
  #view: View = defaultView;

  protected override getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nTrackingSites, {n: count});
  }

  override update(): void {
    const trackingSites = Array.from(this.issue.getBounceTrackingSites());
    this.#view({trackingSites}, {}, this.affectedResources);
    this.updateAffectedResourceCount(trackingSites.length);
  }
}
