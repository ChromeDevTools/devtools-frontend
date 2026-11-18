// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import * as Models from '../models/models.js';
import {TestExtension} from '../testing/RecorderHelpers.js';

import * as Converters from './converters.js';

describe('ExtensionConverter', () => {
  it('builds a stable ID from extension origin and name', () => {
    const jsConverter = new Converters.ExtensionConverter.ExtensionConverter(
        new TestExtension('Export JS', 'chrome-extension://ext-a', 'text/javascript'),
    );
    const tsConverter = new Converters.ExtensionConverter.ExtensionConverter(
        new TestExtension('Export TS', 'chrome-extension://ext-a', 'text/typescript'),
    );
    const otherExtConverter = new Converters.ExtensionConverter.ExtensionConverter(
        new TestExtension('Export JS', 'chrome-extension://ext-b', 'text/javascript'),
    );

    assert.strictEqual(jsConverter.getId(), 'extension_chrome-extension://ext-a_Export JS');
    assert.strictEqual(tsConverter.getId(), 'extension_chrome-extension://ext-a_Export TS');
    assert.strictEqual(otherExtConverter.getId(), 'extension_chrome-extension://ext-b_Export JS');
  });

  it('delegates stringify, stringifyStep, and filename generation to the extension', async () => {
    const converter = new Converters.ExtensionConverter.ExtensionConverter(
        new TestExtension('Custom Exporter', 'chrome-extension://ext-a', 'text/typescript',
                          '\n//# recorderSourceMap=BDB'),
    );
    const step: Models.Schema.Step = {type: Models.Schema.StepType.Scroll};
    const flow: Models.Schema.UserFlow = {title: 'Checkout', steps: [step]};

    assert.strictEqual(converter.getFormatName(), 'Custom Exporter');
    assert.strictEqual(converter.getMediaType(), 'text/typescript');
    assert.strictEqual(converter.getFilename(flow), 'Checkout.ts');

    const [code, sourceMap] = await converter.stringify(flow);
    assert.strictEqual(code, 'Custom Exporter:{"title":"Checkout","steps":[{"type":"scroll"}]}');
    assert.deepEqual(sourceMap, [1, 3, 1]);

    const stepCode = await converter.stringifyStep(step);
    assert.strictEqual(stepCode, 'Custom Exporter:{"type":"scroll"}');
  });
});
