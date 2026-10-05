// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import {
  type AiWidget,
  type ContextDetail,
  ConversationContext,
} from '../agents/AiAgent.js';
import {LighthouseFormatter} from '../data_formatters/LighthouseFormatter.js';

export class LighthouseContext extends ConversationContext<LHModel.ReporterTypes.ReportJSON> {
  // This context was previously named AccessibilityContext. The VE context
  // keeps its original value so that logged metrics stay comparable.
  override readonly jslogContext = 'ai-context-accessibility' as const;
  readonly #lh: LHModel.ReporterTypes.ReportJSON;
  #cachedPayload: string|null = null;

  constructor(report: LHModel.ReporterTypes.ReportJSON) {
    super();
    this.#lh = report;
  }

  #url(): string {
    return this.#lh.finalUrl ?? this.#lh.finalDisplayedUrl;
  }

  /**
   * Returns the security origin of the audited page from the Lighthouse report.
   *
   * Derives the origin from the report URL (`finalUrl` or `finalDisplayedUrl`).
   * If the report does not contain a valid URL, returns a unique opaque origin.
   *
   * @returns The security origin of the audited page.
   */
  override getOrigin(): SDK.SecurityOrigin.SecurityOrigin {
    return SDK.SecurityOrigin.SecurityOrigin.create(this.#url());
  }

  override getItem(): LHModel.ReporterTypes.ReportJSON {
    return this.#lh;
  }

  override getTitle(): string {
    return `Lighthouse report: ${this.#url()}`;
  }

  #getInitialPayload(): string {
    if (this.#cachedPayload !== null) {
      return this.#cachedPayload;
    }
    const allFailed = Object.values(this.#lh.categories).every(category => category.score === null);
    const formatter = new LighthouseFormatter();
    if (allFailed) {
      this.#cachedPayload =
          '**CRITICAL**: The Lighthouse report failed to record or all category scores are error/unavailable (n/a). This indicates a failed run or missing data.';
    } else if (Root.Runtime.hostConfig.devToolsAiV2Architecture?.enabled) {
      // AI V2 sends failing audit titles without their details to keep the prompt small. The agent
      // uses the category IDs in the list to fetch full details with `getLighthouseAudits`.
      this.#cachedPayload = `${formatter.summary(this.#lh)}\n\n${formatter.failingAuditsSummary(this.#lh)}`;
    } else {
      // The V1 `AccessibilityAgent` expects the accessibility audits up front. Remove this branch with V1.
      this.#cachedPayload =
          `# Lighthouse Report:\n${formatter.summary(this.#lh)}\n${formatter.audits(this.#lh, 'accessibility')}`;
    }
    return this.#cachedPayload;
  }

  override async getPromptDetails(): Promise<string|null> {
    return this.#getInitialPayload();
  }

  override async getUserFacingDetails(): Promise<[ContextDetail, ...ContextDetail[]]|null> {
    return [
      {
        title: 'Lighthouse report',
        text: this.#getInitialPayload(),
      },
    ];
  }

  override async getWidgets(): Promise<AiWidget[]> {
    if (!Root.Runtime.hostConfig.devToolsAiV2Architecture?.enabled) {
      // V1 widget data is kept unchanged. Remove this branch with V1.
      return [
        {
          name: 'LIGHTHOUSE_REPORT',
          data: {
            report: this.#lh,
          },
        },
      ];
    }
    // In AI V2 this is the only source of the report widget, so it derives the snapshot logging flag from the report.
    return [
      {
        name: 'LIGHTHOUSE_REPORT',
        data: {
          report: this.#lh,
          snapshotReport: this.#lh.gatherMode === 'snapshot',
        },
      },
    ];
  }
}
