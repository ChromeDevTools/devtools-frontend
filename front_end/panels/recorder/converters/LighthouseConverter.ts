// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as PuppeteerReplay from '../../../third_party/puppeteer-replay/puppeteer-replay.js';
import * as Models from '../models/models.js';

import {type Converter} from './Converter.js';

export class LighthouseConverter implements Converter {
  #indent: string;

  constructor(indent: string) {
    this.#indent = indent;
  }

  getId(): string {
    return Models.ConverterIds.ConverterIds.LIGHTHOUSE;
  }

  getFormatName(): string {
    return 'Puppeteer (including Lighthouse analysis)';
  }

  getFilename(flow: Models.Schema.UserFlow): string {
    return `${flow.title}.js`;
  }

  async stringify(
      flow: Models.Schema.UserFlow,
      ): Promise<[string, PuppeteerReplay.SourceMap|undefined]> {
    const text = await PuppeteerReplay.stringify(flow, {
      extension: new PuppeteerReplay.LighthouseStringifyExtension(),
      indentation: this.#indent,
    });
    const sourceMap = PuppeteerReplay.parseSourceMap(text);
    return [PuppeteerReplay.stripSourceMap(text), sourceMap];
  }

  async stringifyStep(step: Models.Schema.Step): Promise<string> {
    // LighthouseStringifyExtension maintains state between steps, it cannot create a Lighthouse flow from a single step.
    // If we need to stringify a single step, we should return just the Puppeteer code without Lighthouse analysis.
    return await PuppeteerReplay.stringifyStep(step, {
      indentation: this.#indent,
    });
  }

  getMediaType(): string {
    return 'text/javascript';
  }
}
