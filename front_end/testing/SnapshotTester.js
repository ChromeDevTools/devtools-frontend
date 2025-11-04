// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * Asserts two strings are equal, and logs the first differing line if not equal.
 */
function assertSnapshotContent(actual, expected) {
    if (actual !== expected) {
        const actualLines = actual.split('\n');
        const expectedLines = expected.split('\n');
        for (let i = 0; i < Math.max(actualLines.length, expectedLines.length); i++) {
            const actualLine = actualLines.at(i);
            const expectedLine = expectedLines.at(i);
            if (actualLine !== expectedLine) {
                const firstDifference = `First differing line:\nexpected: ${expectedLine}\nactual:   ${actualLine}`;
                throw new Error(`snapshot assertion failed! to update snapshot, run \`npm run test -- --on-diff=update ...\`\n\n${firstDifference}`);
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
class BaseSnapshotTester {
    static #updateMode = null;
    snapshotPath;
    #expected = new Map();
    #actual = new Map();
    #anyFailures = false;
    #newTests = false;
    constructor(context, meta) {
        if (context.timeout() > 0) {
            // The first usage of SnapshotTester in a test seems to take an extraordinary
            // amount of time, so let's bump the timeout for all snapshot tests.
            context.timeout(Math.max(context.timeout(), 45000));
        }
        context.beforeAll(async () => {
            await this.load();
        });
        context.afterAll(async () => {
            await this.finish();
        });
        // out/Default/gen/third_party/devtools-frontend/src/front_end/testing/SnapshotTester.test.js?8ee4f2b123e221040a4aa075a28d0e5b41d3d3ed
        // ->
        // front_end/testing/SnapshotTester.snapshot.txt
        this.snapshotPath =
            meta.url.substring(meta.url.lastIndexOf('front_end')).replace('.test.js', '.snapshot.txt').split('?')[0];
    }
    async load() {
        if (BaseSnapshotTester.#updateMode === null) {
            BaseSnapshotTester.#updateMode = await this.checkIfUpdateMode();
        }
        const content = await this.loadSnapshot(this.snapshotPath);
        if (content) {
            this.#parseSnapshotFileContent(content);
        }
    }
    assert(context, actual) {
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
        if (expected === undefined) {
            this.#newTests = true;
            if (BaseSnapshotTester.#updateMode) {
                return;
            }
            this.#anyFailures = true;
            throw new Error(`snapshot assertion failed! new snapshot found (${title}), must run \`npm run test -- --on-diff=update ...\` to accept it.`);
        }
        const isDifferent = actual !== expected;
        if (isDifferent) {
            this.#anyFailures = true;
            if (!BaseSnapshotTester.#updateMode) {
                assertSnapshotContent(actual, expected);
            }
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
        const hasChanges = this.#anyFailures || didAnyTestNotRun || this.#newTests;
        if (!hasChanges) {
            return;
        }
        // If the update flag is on, post any and all changes (failures, new tests, removals).
        if (BaseSnapshotTester.#updateMode) {
            await this.postUpdate();
            return;
        }
        // Note: this does not handle test filtering (.only, --grep). Need a reliable way
        // to distinguish a deleted test from a test that was filtered out.
        if (didAnyTestNotRun) {
            throw new Error('Snapshots are out of sync (a test was likely deleted or renamed). Run with `--on-diff=update` to fix.');
        }
    }
    #parseSnapshotFileContent(content) {
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
    serializeSnapshotFileContent() {
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
    async checkIfUpdateMode() {
        return false;
    }
    async postUpdate() {
        throw new Error(`Not implemented`);
    }
    async loadSnapshot(_snapshotPath) {
        throw new Error('not implemented');
    }
}
class WebSnapshotTester extends BaseSnapshotTester {
    async checkIfUpdateMode() {
        const response = await fetch('/snapshot-update-mode');
        const data = await response.json();
        return data.updateMode === true;
    }
    async postUpdate() {
        const url = new URL('/update-snapshot', import.meta.url);
        url.searchParams.set('snapshotPath', this.snapshotPath);
        const content = this.serializeSnapshotFileContent();
        const response = await fetch(url, { method: 'POST', body: content });
        if (response.status !== 200) {
            throw new Error(`Unable to update snapshot ${url}`);
        }
    }
    async loadSnapshot(snapshotPath) {
        const url = new URL('/snapshot', import.meta.url);
        url.searchParams.set('snapshotPath', snapshotPath);
        const response = await fetch(url);
        if (response.status === 404) {
            console.warn(`Snapshot file not found: ${snapshotPath}. Will create it for you.`);
            return;
        }
        if (response.status !== 200) {
            throw new Error('failed to load snapshot');
        }
        return await response.text();
    }
}
class NodeSnapshotTester extends BaseSnapshotTester {
    async checkIfUpdateMode() {
        // cannot update in node mode yet.
        return false;
    }
    async postUpdate() {
        const content = this.serializeSnapshotFileContent();
        // @ts-expect-error no node types here.
        const fs = await import('node:fs/promises');
        await fs.writeFile(await this.#getSnapshotPath(this.snapshotPath), content);
    }
    async loadSnapshot(snapshotPath) {
        // @ts-expect-error no node types here.
        const fs = await import('node:fs/promises');
        return await fs.readFile(await this.#getSnapshotPath(snapshotPath), 'utf-8');
    }
    async #getSnapshotPath(snapshotPath) {
        // @ts-expect-error no node types here.
        const path = await import('node:path');
        // @ts-expect-error no ESM types here.
        const SOURCE_ROOT = path.join(import.meta.dirname, '..', '..', '..', '..', '..');
        return path.join(SOURCE_ROOT, snapshotPath);
    }
}
const SnapshotTesterValue = (typeof window === 'undefined') ? NodeSnapshotTester : WebSnapshotTester;
export { SnapshotTesterValue as SnapshotTester };
//# sourceMappingURL=SnapshotTester.js.map