// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as PuppeteerReplay from '../../../third_party/puppeteer-replay/puppeteer-replay.js';
import * as Models from '../models/models.js';

import {PuppeteerConverter} from './PuppeteerConverter.js';

export class PuppeteerFirefoxConverter extends PuppeteerConverter {
  override getId(): string {
    return Models.ConverterIds.ConverterIds.PUPPETEER_FIREFOX;
  }

  override createExtension(): PuppeteerReplay.PuppeteerStringifyExtension {
    return new PuppeteerReplay.PuppeteerStringifyExtension('firefox');
  }

  override getFormatName(): string {
    return 'Puppeteer (for Firefox)';
  }
}
