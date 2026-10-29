// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import {html, render} from '../../ui/lit/lit.js';

import {AffectedResourcesView} from './AffectedResourcesView.js';
import type {IssueView} from './IssueView.js';

export interface ViewInput {
  sources: Protocol.Audits.SourceCodeLocation[];
}

export type View = (input: ViewInput, _output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    ${input.sources.map(source => html`
      <tr class="affected-resource-source">
        <td>
          ${Components.Linkifier.Linkifier.renderLinkifiedUrl(
              source.url as Platform.DevToolsPath.UrlString,
              {
                columnNumber: source.columnNumber,
                lineNumber: source.lineNumber,
                tabStop: true,
                showColumnNumber: false,
                jslogContext: 'source-location',
              })}
        </td>
      </tr>
    `)}
  `, target);
  // clang-format on
};

const UIStrings = {
  /**
   * @description Label in the Issues panel for the number of affected source
   * code locations.
   */
  nSources: '{n, plural, =1 {# source} other {# sources}}',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedSourcesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class AffectedSourcesView extends AffectedResourcesView {
  readonly #view: View;

  constructor(parent: IssueView, issue: IssuesManager.IssueAggregator.AggregatedIssue, jslogContext: string,
              view: View = DEFAULT_VIEW) {
    super(parent, issue, jslogContext);
    this.#view = view;
  }

  #appendAffectedSources(affectedSources: Iterable<Protocol.Audits.SourceCodeLocation>): void {
    const sources = Array.from(affectedSources);
    this.#view({sources}, undefined, this.affectedResources);
    this.updateAffectedResourceCount(sources.length);
  }

  protected getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nSources, {n: count});
  }

  override clear(): void {
    this.requestResolver.clear();
    this.#view({sources: []}, undefined, this.affectedResources);
  }

  override update(): void {
    this.requestResolver.clear();
    this.#appendAffectedSources(this.issue.sources());
  }
}
