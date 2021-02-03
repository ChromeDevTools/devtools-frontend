// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Step} from './Steps';

export class RecordingScriptWriter {
  private indentation: string;
  private steps: Step[] = [];

  constructor(indentation: string) {
    this.indentation = indentation;
  }

  async appendStep(step: Step): Promise<void> {
    this.steps.push(step);
  }

  getScript(): string {
    const indentation = this.indentation;
    const script: string[] = [];
    let currentIndentation = 0;

    function appendLineToScript(line: string): void {
      script.push(line ? indentation.repeat(currentIndentation) + line.trimRight() : '');
    }

    appendLineToScript('const puppeteer = require(\'puppeteer\');');
    appendLineToScript('');
    appendLineToScript('(async () => {');
    currentIndentation += 1;
    appendLineToScript('const browser = await puppeteer.launch();');
    appendLineToScript('const page = await browser.newPage();');
    appendLineToScript('');

    for (const step of this.steps) {
      const lines = step.toScript().filter(l => l !== null).map(l => (l as string).trim());
      if (lines.length > 1) {
        appendLineToScript('{');
        currentIndentation += 1;
      }
      for (const line of lines) {
        if (line === '}') {
          currentIndentation -= 1;
        }
        appendLineToScript(line);
        if (line === '{') {
          currentIndentation += 1;
        }
      }
      if (lines.length > 1) {
        currentIndentation -= 1;
        appendLineToScript('}');
      }
    }

    appendLineToScript('await browser.close();');
    currentIndentation -= 1;
    appendLineToScript('})();');
    // Scripts should end with a final blank line.
    return script.join('\n') + '\n';
  }
}
