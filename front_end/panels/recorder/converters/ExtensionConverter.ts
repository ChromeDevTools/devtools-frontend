// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Extension from '../extensions/extensions.js';
import type * as Models from '../models/models.js';
import * as PuppeteerReplay from '../../../third_party/puppeteer-replay/puppeteer-replay.js';

import {type Converter} from './Converter.js';

export const EXTENSION_PREFIX = 'extension_';

export class ExtensionConverter implements Converter {
  #idx: number;
  #extension: Extension.ExtensionManager.Extension;

  constructor(idx: number, extension: Extension.ExtensionManager.Extension) {
    this.#idx = idx;
    this.#extension = extension;
  }

  getId(): string {
    return EXTENSION_PREFIX + this.#idx;
  }

  getFormatName(): string {
    return this.#extension.getName();
  }

  getMediaType(): string|undefined {
    return this.#extension.getMediaType();
  }

  getFilename(flow: Models.Schema.UserFlow): string {
    const fileExtension = this.#mediaTypeToExtension(
        this.#extension.getMediaType(),
    );
    return `${flow.title}${fileExtension}`;
  }

  async stringify(
      flow: Models.Schema.UserFlow,
      ): Promise<[string, PuppeteerReplay.SourceMap|undefined]> {
    const text = await this.#extension.stringify(flow);
    const sourceMap = PuppeteerReplay.parseSourceMap(text);
    return [PuppeteerReplay.stripSourceMap(text), sourceMap];
  }

  async stringifyStep(step: Models.Schema.Step): Promise<string> {
    return await this.#extension.stringifyStep(step);
  }

  #mediaTypeToExtension(mediaType: string|undefined): string {
    // See https://www.iana.org/assignments/media-types/media-types.xhtml
    switch (mediaType) {
      case 'application/json':
        return '.json';
      case 'application/javascript':
      case 'text/javascript':
        return '.js';
      case 'application/typescript':
      case 'text/typescript':
        return '.ts';
      default:
        // TODO: think of exhaustive mapping once the feature gets traction.
        return '';
    }
  }
}
