// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as PuppeteerReplay from '../../../third_party/puppeteer-replay/puppeteer-replay.js';
import * as Models from '../models/models.js';

import {type Converter} from './Converter.js';

export class PuppeteerReplayConverter implements Converter {
  #indent: string;

  constructor(indent: string) {
    this.#indent = indent;
  }

  getId(): string {
    return Models.ConverterIds.ConverterIds.REPLAY;
  }

  getFormatName(): string {
    return '@puppeteer/replay';
  }

  getFilename(flow: Models.Schema.UserFlow): string {
    return `${flow.title}.js`;
  }

  async stringify(
      flow: Models.Schema.UserFlow,
      ): Promise<[string, PuppeteerReplay.SourceMap|undefined]> {
    const text = await PuppeteerReplay.stringify(flow, {
      extension: new PuppeteerReplay.PuppeteerReplayStringifyExtension(),
      indentation: this.#indent,
    });
    const sourceMap = PuppeteerReplay.parseSourceMap(text);
    return [PuppeteerReplay.stripSourceMap(text), sourceMap];
  }

  async stringifyStep(step: Models.Schema.Step): Promise<string> {
    return await PuppeteerReplay.stringifyStep(step, {
      extension: new PuppeteerReplay.PuppeteerReplayStringifyExtension(),
    });
  }

  getMediaType(): string {
    return 'text/javascript';
  }
}
