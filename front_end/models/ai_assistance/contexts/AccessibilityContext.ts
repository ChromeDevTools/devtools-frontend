// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as LHModel from '../../lighthouse/lighthouse.js';
import {type ContextDetail, ConversationContext} from '../agents/AiAgent.js';
import {LighthouseFormatter} from '../data_formatters/LighthouseFormatter.js';

export class AccessibilityContext extends ConversationContext<LHModel.ReporterTypes.ReportJSON> {
  readonly #lh: LHModel.ReporterTypes.ReportJSON;
  #cachedPayload: string|null = null;

  constructor(report: LHModel.ReporterTypes.ReportJSON) {
    super();
    this.#lh = report;
  }

  #url(): string {
    return this.#lh.finalUrl ?? this.#lh.finalDisplayedUrl;
  }

  override getURL(): string {
    return this.#url();
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
    const formatter = new LighthouseFormatter();
    const summary = formatter.summary(this.#lh);
    const audits = formatter.audits(this.#lh, 'accessibility');
    const allFailed = Object.values(this.#lh.categories).every(category => category.score === null);
    if (allFailed) {
      this.#cachedPayload =
          '**CRITICAL**: The Lighthouse report failed to record or all category scores are error/unavailable (n/a). This indicates a failed run or missing data.';
    } else {
      this.#cachedPayload = `# Lighthouse Report:\n${summary}\n${audits}`;
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
}
