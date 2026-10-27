// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import {html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {AffectedResourcesView} from './AffectedResourcesView.js';
import type {IssueView} from './IssueView.js';

export interface ViewInput {
  anchors: Element[];
}

export type View = (input: ViewInput, _output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    ${input.anchors.map(anchor => html`
      <tr class="affected-resource-source">
        <td>${anchor}</td>
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
    let count = 0;
    const anchors: Element[] = [];
    for (const source of affectedSources) {
      anchors.push(this.#createSourceAnchor(source));
      count++;
    }
    this.#view({anchors}, undefined, this.affectedResources);
    this.updateAffectedResourceCount(count);
  }

  protected getResourceNameWithCount(count: number): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.nSources, {n: count});
  }

  #createSourceAnchor({url, lineNumber, columnNumber}: Protocol.Audits.SourceCodeLocation): Element {
    // TODO(chromium:1072331): Check feasibility of plumping through scriptId
    // for `linkifyScriptLocation`
    //                         to support source maps and formatted scripts.
    const linkifierURLOptions = {columnNumber, lineNumber, tabStop: true, showColumnNumber: false};
    // An element created with linkifyURL can subscribe to the events
    // 'click' neither 'keydown' if that key is the 'Enter' key.
    // Also, this element has a context menu, so we should be able to
    // track when the user use the context menu too.
    const anchorElement =
        Components.Linkifier.Linkifier.linkifyURL(url as Platform.DevToolsPath.UrlString, linkifierURLOptions);
    anchorElement.setAttribute('jslog', `${VisualLogging.link('source-location').track({click: true})}`);
    return anchorElement;
  }

  override clear(): void {
    this.requestResolver.clear();
    this.#view({anchors: []}, undefined, this.affectedResources);
  }

  override update(): void {
    this.requestResolver.clear();
    this.#appendAffectedSources(this.issue.sources());
  }
}
