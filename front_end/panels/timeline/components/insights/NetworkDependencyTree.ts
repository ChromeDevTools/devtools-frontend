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
import networkDependencyTreeInsightRaw from './networkDependencyTreeInsight.css.js';

const {UIStrings, i18nString} = Trace.Insights.Models.NetworkDependencyTree;

const {html} = Lit;

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const networkDependencyTreeInsightComponentStyles = new CSSStyleSheet();
networkDependencyTreeInsightComponentStyles.replaceSync(networkDependencyTreeInsightRaw.cssContent);

export class NetworkDependencyTree extends BaseInsightComponent<NetworkDependencyTreeInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-long-critical-network-tree`;
  override internalName = 'long-critical-network-tree';

  hoveredChain: Trace.Types.Events.SyntheticNetworkRequest[] = [];

  override connectedCallback(): void {
    super.connectedCallback();
    this.shadow.adoptedStyleSheets.push(networkDependencyTreeInsightComponentStyles);
  }

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    if (!this.model) {
      return [];
    }

    const overlays: Overlays.Overlays.TimelineOverlay[] = [];
    getAllOverlays(this.model.rootNodes, overlays);

    return overlays;
  }

  #createOverlayForChain(chain: Trace.Types.Events.SyntheticNetworkRequest[]): Overlays.Overlays.EntryOutline[] {
    return chain.map(entry => ({
                       type: 'ENTRY_OUTLINE',
                       entry,
                       outlineReason: 'ERROR',
                     }));
  }

  #onMouseOver(chain: Trace.Types.Events.SyntheticNetworkRequest[]|undefined): void {
    this.hoveredChain = chain ?? [];
    const overlays = this.#createOverlayForChain(this.hoveredChain);
    this.toggleTemporaryOverlays(overlays, {
      // The trace window doesn't need to be updated because the request is being hovered.
      updateTraceWindow: false,
    });
    this.scheduleRender();
  }

  #onMouseOut(): void {
    this.hoveredChain = [];
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
        ${nodes.map(({request, timeFromInitialRequest, children, isLongest, chain}) => {
          const hasChildren = children.length > 0;

          const requestClasses = Lit.Directives.classMap({
            request: true,
            longest: Boolean(isLongest),
            highlighted: this.hoveredChain.includes(request),
          });

          return html`
            <li>
              <div class=${requestClasses}
                   @mouseover=${hasChildren ? null : this.#onMouseOver.bind(this, chain)}
                   @mouseout=${hasChildren ? null : this.#onMouseOut.bind(this)}>
                <span class="url">${eventRef(request)}</span>
                ${
                  // If this is the last request, show the chain time
                  hasChildren ? Lit.nothing :html`
                    <span class="chain-time">
                      ${i18n.TimeUtilities.formatMicroSecondsTime(Trace.Types.Timing.Micro(timeFromInitialRequest))}
                    </span>
                `}
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
      return html`<div class="insight-section">${i18nString(UIStrings.noNetworkDependencyTree)}</div>`;
    }

    // clang-format off
    return html`
      <div class="insight-section">
        <div class="max-time">
          ${i18nString(UIStrings.maxCriticalPathLatency)}
          <br>
          ${i18n.TimeUtilities.formatMicroSecondsTime((this.model.maxTime))}
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
