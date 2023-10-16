/**
 * @fileoverview Tests for CSP Parser.
 * @author lwe@google.com (Lukas Weichselbaum)
 *
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import 'jasmine';

import {CspParser, TEST_ONLY} from './parser';


describe('Test parser', () => {
  it('CspParser', () => {
    const validCsp =  // Test policy with different features from CSP2.
        'default-src \'none\';' +
        'script-src \'nonce-unsafefoobar\' \'unsafe-eval\'   \'unsafe-inline\' \n' +
        'https://example.com/foo.js foo.bar;      ' +
        'object-src \'none\';' +
        'img-src \'self\' https: data: blob:;' +
        'style-src \'self\' \'unsafe-inline\' \'sha256-1DCfk1NYWuHMfoobarfoobar=\';' +
        'font-src *;' +
        'child-src *.example.com:9090;' +
        'upgrade-insecure-requests;\n' +
        'report-uri /csp/test';

    const parser = new (CspParser)(validCsp);
    const parsedCsp = parser.csp;

    // check directives
    const directives = Object.keys(parsedCsp.directives);
    const expectedDirectives = [
      'default-src', 'script-src', 'object-src', 'img-src', 'style-src',
      'font-src', 'child-src', 'upgrade-insecure-requests', 'report-uri'
    ];
    expect(expectedDirectives)
        .toEqual(jasmine.arrayWithExactContents(directives));

    // check directive values
    expect(['\'none\''])
        .toEqual(jasmine.arrayWithExactContents(
            parsedCsp.directives['default-src'] as string[]));

    expect([
      '\'nonce-unsafefoobar\'', '\'unsafe-eval\'', '\'unsafe-inline\'',
      'https://example.com/foo.js', 'foo.bar'
    ])
        .toEqual(jasmine.arrayWithExactContents(
            parsedCsp.directives['script-src'] as string[]));

    expect(['\'none\''])
        .toEqual(jasmine.arrayWithExactContents(
            parsedCsp.directives['object-src'] as string[]));

    expect(['\'self\'', 'https:', 'data:', 'blob:'])
        .toEqual(jasmine.arrayWithExactContents(
            parsedCsp.directives['img-src'] as string[]));
    expect([
      '\'self\'', '\'unsafe-inline\'', '\'sha256-1DCfk1NYWuHMfoobarfoobar=\''
    ])
        .toEqual(jasmine.arrayWithExactContents(
            parsedCsp.directives['style-src'] as string[]));
    expect(['*']).toEqual(jasmine.arrayWithExactContents(
        parsedCsp.directives['font-src'] as string[]));
    expect(['*.example.com:9090'])
        .toEqual(jasmine.arrayWithExactContents(
            parsedCsp.directives['child-src'] as string[]));
    expect([]).toEqual(jasmine.arrayWithExactContents(
        parsedCsp.directives['upgrade-insecure-requests'] as string[]));
    expect(['/csp/test'])
        .toEqual(jasmine.arrayWithExactContents(
            parsedCsp.directives['report-uri'] as string[]));
  });

  it('CspParserDuplicateDirectives', () => {
    const validCsp = 'default-src \'none\';' +
        'default-src foo.bar;' +
        'object-src \'none\';' +
        'OBJECT-src foo.bar;';

    const parser = new (CspParser)(validCsp);
    const parsedCsp = parser.csp;

    // check directives
    const directives = Object.keys(parsedCsp.directives);
    const expectedDirectives = ['default-src', 'object-src'];
    expect(expectedDirectives)
        .toEqual(jasmine.arrayWithExactContents(directives));

    // check directive values
    expect(['\'none\''])
        .toEqual(jasmine.arrayWithExactContents(
            parsedCsp.directives['default-src'] as string[]));
    expect(['\'none\''])
        .toEqual(jasmine.arrayWithExactContents(
            parsedCsp.directives['object-src'] as string[]));
  });

  it('CspParserMixedCaseKeywords', () => {
    const validCsp = 'DEFAULT-src \'NONE\';' +  // Keywords should be
                                                // case insensetive.
        'img-src \'sElf\' HTTPS: Example.com/CaseSensitive;';

    const parser = new (CspParser)(validCsp);
    const parsedCsp = parser.csp;

    // check directives
    const directives = Object.keys(parsedCsp.directives);
    const expectedDirectives = ['default-src', 'img-src'];
    expect(expectedDirectives)
        .toEqual(jasmine.arrayWithExactContents(directives));

    // check directive values
    expect(['\'none\''])
        .toEqual(jasmine.arrayWithExactContents(
            parsedCsp.directives['default-src'] as string[]));
    expect(['\'self\'', 'https:', 'Example.com/CaseSensitive'])
        .toEqual(jasmine.arrayWithExactContents(
            parsedCsp.directives['img-src'] as string[]));
  });

  it('NormalizeDirectiveValue', () => {
    expect(TEST_ONLY.normalizeDirectiveValue('\'nOnE\'')).toBe('\'none\'');
    expect(TEST_ONLY.normalizeDirectiveValue('\'nonce-aBcD\''))
        .toBe('\'nonce-aBcD\'');
    expect(TEST_ONLY.normalizeDirectiveValue('\'hash-XyZ==\''))
        .toBe('\'hash-XyZ==\'');
    expect(TEST_ONLY.normalizeDirectiveValue('HTTPS:')).toBe('https:');
    expect(TEST_ONLY.normalizeDirectiveValue('example.com/TEST'))
        .toBe('example.com/TEST');
  });
});
