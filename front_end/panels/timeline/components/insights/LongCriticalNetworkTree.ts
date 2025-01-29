// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../../ui/components/icon_button/icon_button.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import type {LongCriticalNetworkTreeInsightModel} from '../../../../models/trace/insights/LongCriticalNetworkTree.js';
import * as Lit from '../../../../ui/lit/lit.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';

const UIStrings = {
  /**
   * @description Text status indicating that there isn't long chaining critical network requests.
   */
  noLongCriticalNetworkTree: 'No rendering tasks impacted by long critical network tree',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/LongCriticalNetworkTree.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

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
