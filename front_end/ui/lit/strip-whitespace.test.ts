// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {Directives, html} from './lit.js';

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

  it('escapes bidi and formatting characters in interpolated string values', () => {
    const value = 'Hello \u202E World';
    const result = html`<div>${value}</div>`;
    assert.deepEqual(result.values, ['Hello \\u202E World']);
  });

  it('leaves non-string interpolated values untouched', () => {
    const obj = {name: 'World'};
    const num = 42;
    const result = html`<div>${obj} ${num}</div>`;
    assert.deepEqual(result.values, [obj, num]);
  });

  it('escapes bidi and formatting characters in interpolated array of string values', () => {
    const values = ['Hello \u202E World', 42, ['Nested \u202E Value']];
    const result = html`<div>${values}</div>`;
    assert.deepEqual(result.values, [['Hello \\u202E World', 42, ['Nested \\u202E Value']]]);
  });

  it('escapes bidi and formatting characters in strings inside Lit directives', () => {
    const value = 'Hello \u202E World';
    const result = html`<input .value=${Directives.live(value)} />`;
    const directiveResult = result.values[0] as {values: unknown[]};
    assert.strictEqual(directiveResult.values[0], 'Hello \\u202E World');
  });

  it('escapes bidi and formatting characters in strings wrapped with ifDefined', () => {
    const value = 'Hello \u202E World';
    const result = html`<div title=${Directives.ifDefined(value)}></div>`;
    assert.strictEqual(result.values[0], 'Hello \\u202E World');
  });

  it('does not escape safe zero-width characters in interpolated values', () => {
    const value = 'Hello \u200B \u200C \u200D World';
    const result = html`<div>${value}</div>`;
    assert.deepEqual(result.values, ['Hello \u200B \u200C \u200D World']);
  });
});
