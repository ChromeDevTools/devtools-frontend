// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {html} from './lit.js';

describe('html', () => {
  it('should return the same string if there are no newlines', () => {
    assert.deepEqual(html`<div>Hello</div>`, html`<div>Hello</div>`);
  });

  it('should return the same instance for the same string', () => {
    const set = new Set<TemplateStringsArray>();
    for (let i = 0; i < 10; i++) {
      set.add(html`
        <div>
          Hello
        </div>`.strings);
    }
    assert.strictEqual(set.size, 1);
  });

  it('should remove newlines outside of tags', () => {
    const result = html`
      <div>
        Hello
      </div>
    `;
    assert.deepEqual(result, html`<div>Hello</div>`);
  });

  it('should not remove newlines inside tags', () => {
    const result = html`<div
        >Hello</div
      >`.strings as unknown as string[];
    assert.deepEqual(result, ['<div\n        >Hello</div\n      >']);
  });

  it('should handle mixed newlines and tags', () => {
    const result = html`
      <p>
        Hello,
        <span> World</span>
      </p>
    `.strings as unknown as string[];
    assert.deepEqual(result, ['<p>Hello,<span> World</span></p>']);
  });

  it('should handle multiple newlines', () => {
    const result = html`
            <div>


                Hello
            </div>
        `.strings as unknown as string[];
    assert.deepEqual(result, ['<div>Hello</div>']);
  });

  it('should handle a simple string interpolation', () => {
    const name = 'World';
    const result = html`<div>Hello, ${name}!</div>`;
    assert.deepEqual(result.strings as unknown as string[], ['<div>Hello, ', '!</div>']);
    assert.deepEqual(result.values, [name]);
  });

  it('should handle multiple string interpolations', () => {
    const firstName = 'Hello';
    const lastName = 'World';
    const result = html`<div>${firstName} ${lastName}!</div>`;
    assert.deepEqual(result.strings as unknown as string[], ['<div>', ' ', '!</div>']);
    assert.deepEqual(result.values, [firstName, lastName]);
  });

  it('should handle string interpolation at the beginning', () => {
    const greeting = 'Hello';
    const result = html`${greeting} World`;
    assert.deepEqual(result.strings as unknown as string[], ['', ' World']);
    assert.deepEqual(result.values, [greeting]);
  });

  it('should handle string interpolation at the end', () => {
    const punctuation = '!';
    const result = html`Hello${punctuation}`;
    assert.deepEqual(result.strings as unknown as string[], ['Hello', '']);
    assert.deepEqual(result.values, [punctuation]);
  });

  it('should handle string interpolation with newlines', () => {
    const name = 'World';
    const result = html`
      <div>
        Hello, ${name}
      </div>
    `;
    assert.deepEqual(result.strings as unknown as string[], ['<div>Hello, ', '</div>']);
    assert.deepEqual(result.values, [name]);
  });

  it('should remove whitespace around string interpolations outside of tags only', () => {
    const className = 'class-name';
    const name = 'World';
    const result = html`
      <div class=${className} id="foo">
        ${name}
      </div>
    `;
    assert.deepEqual(result.strings as unknown as string[], ['<div class=', ' id="foo">', '</div>']);
  });
});
