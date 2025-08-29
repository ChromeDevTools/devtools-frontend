// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Asserts two strings are equal, and logs the first differing line if not equal.
 */
function assertSnapshotContent(actual: string, expected: string): void {
  if (actual !== expected) {
    const actualLines = actual.split('\n');
    const expectedLines = expected.split('\n');
    for (let i = 0; i < Math.max(actualLines.length, expectedLines.length); i++) {
      const actualLine = actualLines.at(i);
      const expectedLine = expectedLines.at(i);
      if (actualLine !== expectedLine) {
        const firstDifference = `First differing line:\nexpected: ${expectedLine}\nactual:   ${actualLine}`;
        throw new Error(
            `snapshot assertion failed! to update snapshot, run \`npm run test -- --on-diff=update ...\`\n\n${
                firstDifference}`);
      }
    }
  }
}

/**
 * Provides snapshot testing for karma unit tests.
 * See README.md for more.
 *
 * Note: karma.conf.ts implements the server logic (see snapshotTesterFactory).
 */
export class SnapshotTester {
  static #updateMode: boolean|null = null;

  #snapshotUrl: string;
  #expected = new Map<string, string>();
  #actual = new Map<string, string>();
  #anyFailures = false;
  #newTests = false;

  constructor(meta: ImportMeta) {
    this.#snapshotUrl = meta.url.replace('.test.js', '.snapshot.txt').split('?')[0];
  }

  async load() {
    if (SnapshotTester.#updateMode === null) {
      SnapshotTester.#updateMode = await this.#checkIfUpdateMode();
    }

    const url = new URL(this.#snapshotUrl, import.meta.url);
    const response = await fetch(url);
    if (response.status === 404) {
      console.warn(`Snapshot file not found: ${url.href}. Will create it for you.`);
      return;
    }
    if (response.status !== 200) {
      throw new Error('failed to load snapshot');
    }

    this.#parseSnapshotFileContent(await response.text());
  }

  assert(context: Mocha.Context, actual: string) {
    const title = context.test?.fullTitle() ?? '';

    if (this.#actual.has(title)) {
      throw new Error('sorry, currently only support 1 snapshot assertion per test');
    }

    if (actual.includes('=== end content')) {
      throw new Error('invalid content');
    }

    actual = actual.trim();
    this.#actual.set(title, actual);

    const expected = this.#expected.get(title);
    if (!expected) {
      // New tests always pass on the first run.
      this.#newTests = true;
      return;
    }

    if (!SnapshotTester.#updateMode && actual !== expected) {
      this.#anyFailures = true;
      assertSnapshotContent(actual, expected);
    }
  }

  async finish() {
    let didAnyTestNotRun = false;
    for (const title of this.#expected.keys()) {
      if (!this.#actual.has(title)) {
        didAnyTestNotRun = true;
        break;
      }
    }

    let shouldPostUpdate = SnapshotTester.#updateMode;
    if (!this.#anyFailures && (didAnyTestNotRun || this.#newTests)) {
      shouldPostUpdate = true;
    }

    if (!shouldPostUpdate) {
      return;
    }

    const url = new URL('/update-snapshot', import.meta.url);
    url.searchParams.set('snapshotUrl', this.#snapshotUrl);
    const content = this.#serializeSnapshotFileContent();
    const response = await fetch(url, {method: 'POST', body: content});
    if (response.status !== 200) {
      throw new Error(`Unable to update snapshot ${url}`);
    }
  }

  #serializeSnapshotFileContent(): string {
    if (!this.#actual.size) {
      return '';
    }

    const lines = [];
    for (const [title, result] of this.#actual) {
      lines.push(`Title: ${title}`);
      lines.push(`Content:\n${result}`);
      lines.push('=== end content\n');
    }
    lines.push('');

    return lines.join('\n').trim() + '\n';
  }

  #parseSnapshotFileContent(content: string): void {
    const sections = content.split('=== end content').map(s => s.trim()).filter(Boolean);
    for (const section of sections) {
      const [titleField, contentField, ...contentLines] = section.split('\n');
      const title = titleField.replace('Title:', '').trim();
      if (contentField !== 'Content:') {
        throw new Error('unexpected snapshot file');
      }
      const content = contentLines.join('\n').trim();
      this.#expected.set(title, content);
    }
  }

  async #checkIfUpdateMode(): Promise<boolean> {
    const response = await fetch('/snapshot-update-mode');
    const data = await response.json();
    return data.updateMode === true;
  }
}
