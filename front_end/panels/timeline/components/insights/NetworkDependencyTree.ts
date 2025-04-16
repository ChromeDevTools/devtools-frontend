// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../../ui/components/icon_button/icon_button.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import type {
  CriticalRequestNode, NetworkDependencyTreeInsightModel} from
  '../../../../models/trace/insights/NetworkDependencyTree.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';
import {eventRef} from './EventRef.js';
import networkDependencyTreeInsightStyles from './networkDependencyTreeInsight.css.js';

const {UIStrings, i18nString} = Trace.Insights.Models.NetworkDependencyTree;

const {html} = Lit;

export class NetworkDependencyTree extends BaseInsightComponent<NetworkDependencyTreeInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-long-critical-network-tree`;
  override internalName = 'long-critical-network-tree';

  #relatedRequests: Set<Trace.Types.Events.SyntheticNetworkRequest>|null = null;

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    if (!this.model) {
      return [];
    }

    const overlays: Overlays.Overlays.TimelineOverlay[] = [];
    getAllOverlays(this.model.rootNodes, overlays);

    return overlays;
  }

  #createOverlayForChain(requests: Set<Trace.Types.Events.SyntheticNetworkRequest>): Overlays.Overlays.EntryOutline[] {
    const overlays: Overlays.Overlays.EntryOutline[] = [];
    requests.forEach(entry => overlays.push({
      type: 'ENTRY_OUTLINE',
      entry,
      outlineReason: 'ERROR',
    }));
    return overlays;
  }

  #onMouseOver(relatedRequests: Set<Trace.Types.Events.SyntheticNetworkRequest>): void {
    this.#relatedRequests = relatedRequests;
    const overlays = this.#createOverlayForChain(this.#relatedRequests);
    this.toggleTemporaryOverlays(overlays, {
      // The trace window doesn't need to be updated because the request is being hovered.
      updateTraceWindow: false,
    });
    this.scheduleRender();
  }

  #onMouseOut(): void {
    this.#relatedRequests = null;
    this.toggleTemporaryOverlays(null, {
      updateTraceWindow: false,
    });
    this.scheduleRender();
  }

  renderTree(nodes: CriticalRequestNode[]): Lit.LitTemplate|null {
    if (nodes.length === 0) {
      return null;
    }
    // clang-format off
    return html`
      <ul>
        ${nodes.map(({request, timeFromInitialRequest, children, isLongest, relatedRequests}) => {
          const hasChildren = children.length > 0;

          const requestClasses = Lit.Directives.classMap({
            request: true,
            longest: Boolean(isLongest),
            highlighted: this.#relatedRequests?.has(request) ?? false,
          });

          return html`
            <li>
              <div class=${requestClasses}
                   @mouseover=${this.#onMouseOver.bind(this, relatedRequests)}
                   @mouseout=${this.#onMouseOut.bind(this)}>
                <span class="url">${eventRef(request)}</span>
                <span class="chain-time">
                  ${i18n.TimeUtilities.formatMicroSecondsTime(Trace.Types.Timing.Micro(timeFromInitialRequest))}
                </span>
              </div>
            </li>
            ${hasChildren ? html`${this.renderTree(children)}` : Lit.nothing}
          `;
        })}
      </ul>`;
    // clang-format on
  }

  override renderContent(): Lit.LitTemplate {
    if (!this.model) {
      return Lit.nothing;
    }

    if (!this.model.rootNodes.length) {
      // clang-format off
      return html`
        <style>${networkDependencyTreeInsightStyles.cssText}</style>
        <div class="insight-section">${i18nString(UIStrings.noNetworkDependencyTree)}</div>
      `;
      // clang-format on
    }

    // clang-format off
    return html`
      <style>${networkDependencyTreeInsightStyles.cssText}</style>
      <div class="insight-section">
        <div class="max-time">
          ${i18nString(UIStrings.maxCriticalPathLatency)}
          <br>
          <span class='longest'> ${i18n.TimeUtilities.formatMicroSecondsTime((this.model.maxTime))}</span>
        </div>

        <!-- a divider is added here, through |tree-view| element's border-top -->
        <div class="tree-view">${this.renderTree(this.model.rootNodes)} </div>
      </div>
    `;
    // clang-format on
  }
}

function getAllOverlays(nodes: CriticalRequestNode[], overlays: Overlays.Overlays.TimelineOverlay[]): void {
  nodes.forEach(node => {
    overlays.push({
      type: 'ENTRY_OUTLINE',
      entry: node.request,
      outlineReason: 'ERROR',
    });
    getAllOverlays(node.children, overlays);
  });
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-long-critical-network-tree': NetworkDependencyTree;
  }
}

customElements.define('devtools-performance-long-critical-network-tree', NetworkDependencyTree);
