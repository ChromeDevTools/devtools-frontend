// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../../ui/components/icon_button/icon_button.js';

import type {LongCriticalNetworkTreeInsightModel} from '../../../../models/trace/insights/LongCriticalNetworkTree.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';

const {UIStrings, i18nString} = Trace.Insights.Models.LongCriticalNetworkTree;

const {html} = Lit;

export class LongCriticalNetworkTree extends BaseInsightComponent<LongCriticalNetworkTreeInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-long-critical-network-tree`;
  override internalName: string = 'long-critical-network-tree';

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    if (!this.model) {
      return [];
    }

    return this.model.longChains.flat().map(entry => ({
                                              type: 'ENTRY_OUTLINE',
                                              entry,
                                              outlineReason: 'ERROR',
                                            }));
  }

  override renderContent(): Lit.LitTemplate {
    if (!this.model) {
      return Lit.nothing;
    }

    if (!this.model.longChains.length) {
      return html`<div class="insight-section">${i18nString(UIStrings.noLongCriticalNetworkTree)}</div>`;
    }

    return Lit.nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-long-critical-network-tree': LongCriticalNetworkTree;
  }
}

customElements.define('devtools-performance-long-critical-network-tree', LongCriticalNetworkTree);
