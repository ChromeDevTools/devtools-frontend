// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './Table.js';
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
import type {TableData, TableDataRow} from './Table.js';

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

  #renderNetworkTreeRow(node: CriticalRequestNode): Lit.LitTemplate {
    const requestStyles = Lit.Directives.styleMap({
      display: 'flex',
      '--override-timeline-link-text-color': node.isLongest ? 'var(--sys-color-error)' : '',
      color: node.isLongest ? 'var(--sys-color-error)' : '',
      backgroundColor: this.#relatedRequests?.has(node.request) ? 'var(--sys-color-state-hover-on-subtle)' : '',
    });
    const urlStyles = Lit.Directives.styleMap({
      flex: 'auto',
    });

    // clang-format off
    return html`
      <div style=${requestStyles}>
        <span style=${urlStyles}>${eventRef(node.request)}</span>
        <span>
          ${i18n.TimeUtilities.formatMicroSecondsTime(Trace.Types.Timing.Micro(node.timeFromInitialRequest))}
        </span>
      </div>
    `;
    // clang-format on
  }

  #mapNetworkDependencyToRow(node: CriticalRequestNode): TableDataRow {
    return {
      values: [this.#renderNetworkTreeRow(node)],
      overlays: this.#createOverlayForChain(node.relatedRequests),
      subRows: node.children.map(child => this.#mapNetworkDependencyToRow(child)),
    };
  }

  #renderNetworkDependencyTree(nodes: CriticalRequestNode[]): Lit.LitTemplate|null {
    if (nodes.length === 0) {
      return null;
    }

    const rows: TableDataRow[] = [{
      // Add one empty row so the main document request can also has a left border
      values: [Lit.nothing],
      subRows: nodes.map(node => this.#mapNetworkDependencyToRow(node))
    }];

    // clang-format off
    return html`
      <devtools-performance-table
          .data=${{
            insight: this,
            headers: [i18nString(UIStrings.columnRequest), i18nString(UIStrings.columnTime)],
            rows,
          } as TableData}>
      </devtools-performance-table>
    `;
    // clang-format on
  }

  #renderNetworkTreeSection(): Lit.LitTemplate {
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
      </div>
      <div class="insight-section">
        ${this.#renderNetworkDependencyTree(this.model.rootNodes)}
      </div>
    `;
    // clang-format on
  }

  override renderContent(): Lit.LitTemplate {
    return html`
      ${this.#renderNetworkTreeSection()}
    `;
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
