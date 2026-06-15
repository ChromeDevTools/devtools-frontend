// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as AiAssistance from './ai_assistance.js';

describeWithEnvironment('AiOrigins', () => {
  describe('isOpaqueOrigin', () => {
    it('identifies opaque origins', () => {
      assert.isTrue(AiAssistance.AiOrigins.isOpaqueOrigin('null'));
      assert.isTrue(AiAssistance.AiOrigins.isOpaqueOrigin('data:'));
      assert.isTrue(AiAssistance.AiOrigins.isOpaqueOrigin('about://'));
      assert.isTrue(AiAssistance.AiOrigins.isOpaqueOrigin('about:srcdoc'));
      assert.isTrue(AiAssistance.AiOrigins.isOpaqueOrigin('detached'));
      assert.isTrue(AiAssistance.AiOrigins.isOpaqueOrigin('detached:123'));
      assert.isFalse(AiAssistance.AiOrigins.isOpaqueOrigin('https://google.com'));
    });
  });

  describe('extractContextOrigin', () => {
    it('extracts origin from URLs', () => {
      assert.strictEqual(AiAssistance.AiOrigins.extractContextOrigin('https://google.com/path'), 'https://google.com');
      assert.strictEqual(AiAssistance.AiOrigins.extractContextOrigin('null'), 'null');
      assert.strictEqual(AiAssistance.AiOrigins.extractContextOrigin('data:'), 'data:');
      assert.strictEqual(AiAssistance.AiOrigins.extractContextOrigin('about:blank'), 'about:blank');
      assert.strictEqual(AiAssistance.AiOrigins.extractContextOrigin('detached'), 'detached');
      assert.strictEqual(AiAssistance.AiOrigins.extractContextOrigin('trace-1-10'), 'trace-1-10');
      assert.strictEqual(AiAssistance.AiOrigins.extractContextOrigin('invalid-url'), '');
      assert.strictEqual(AiAssistance.AiOrigins.extractContextOrigin('blob:null/123'), 'null');
      assert.strictEqual(AiAssistance.AiOrigins.extractContextOrigin('blob:https://google.com/123'),
                         'https://google.com');
    });

    it('extracts origin from URLs with long paths, queries and hashes', () => {
      assert.strictEqual(
          AiAssistance.AiOrigins.extractContextOrigin(
              'https://google.com/some/long/path/to/file.html?query=1&other=2#hash'),
          'https://google.com');
    });

    it('extracts origin from URLs with subdomains', () => {
      assert.strictEqual(
          AiAssistance.AiOrigins.extractContextOrigin('https://subdomain.google.com/path'),
          'https://subdomain.google.com');
    });

    it('returns null (opaque) for malformed file:// URLs', () => {
      const malformedFile = AiAssistance.AiOrigins.extractContextOrigin('file://invalid path with spaces');
      assert.strictEqual(malformedFile, 'null');
      assert.isTrue(AiAssistance.AiOrigins.isOpaqueOrigin(malformedFile));
    });

    it('handles uppercase schemes for file and blob URLs', () => {
      assert.strictEqual(AiAssistance.AiOrigins.extractContextOrigin('FILE:///path/to/file.js'),
                         'file:///path/to/file.js');
      assert.strictEqual(AiAssistance.AiOrigins.extractContextOrigin('BLOB:null/123'), 'null');
    });

    it('preserves host in file:// URLs (UNC paths)', () => {
      assert.strictEqual(AiAssistance.AiOrigins.extractContextOrigin('file://servera/path/to/file.js'),
                         'file://servera/path/to/file.js');
      assert.strictEqual(AiAssistance.AiOrigins.extractContextOrigin('file:///path/to/file.js'),
                         'file:///path/to/file.js');
    });
  });

  describe('areOriginsEquivalent', () => {
    it('returns true for identical non-opaque origins', () => {
      assert.isTrue(AiAssistance.AiOrigins.areOriginsEquivalent('https://a.com', 'https://a.com'));
    });

    it('returns false for different non-opaque origins', () => {
      assert.isFalse(AiAssistance.AiOrigins.areOriginsEquivalent('https://a.com', 'https://b.com'));
    });

    it('never says opaque origins are equivalent even if they are the same string', () => {
      assert.isFalse(AiAssistance.AiOrigins.areOriginsEquivalent('data:', 'data:'));
      assert.isFalse(AiAssistance.AiOrigins.areOriginsEquivalent('null', 'null'));
      assert.isFalse(AiAssistance.AiOrigins.areOriginsEquivalent('about:blank', 'about:blank'));
      assert.isFalse(AiAssistance.AiOrigins.areOriginsEquivalent('detached', 'detached'));
    });

    it('returns false if one origin is opaque', () => {
      assert.isFalse(AiAssistance.AiOrigins.areOriginsEquivalent('https://a.com', 'null'));
      assert.isFalse(AiAssistance.AiOrigins.areOriginsEquivalent('null', 'https://a.com'));
    });

    it('handles blob:null URLs correctly', () => {
      const origin1 = AiAssistance.AiOrigins.extractContextOrigin('blob:null/1');
      const origin2 = AiAssistance.AiOrigins.extractContextOrigin('blob:null/2');
      assert.isFalse(AiAssistance.AiOrigins.areOriginsEquivalent(origin1, origin2));
      assert.isFalse(AiAssistance.AiOrigins.areOriginsEquivalent(origin1, origin1));
    });

    it('handles blob URLs with valid origins correctly', () => {
      const origin1 = AiAssistance.AiOrigins.extractContextOrigin('blob:https://google.com/1');
      const origin2 = AiAssistance.AiOrigins.extractContextOrigin('blob:https://google.com/2');
      const originDifferent = AiAssistance.AiOrigins.extractContextOrigin('blob:https://example.com/2');
      assert.isTrue(AiAssistance.AiOrigins.areOriginsEquivalent(origin1, origin2));
      assert.isFalse(AiAssistance.AiOrigins.areOriginsEquivalent(origin1, originDifferent));
    });

    it('asserts different file paths are not equivalent (fails on current vulnerability)', () => {
      const originA = AiAssistance.AiOrigins.extractContextOrigin('file:///path/to/a.txt');
      const originB = AiAssistance.AiOrigins.extractContextOrigin('file:///path/to/b.txt');
      assert.isFalse(AiAssistance.AiOrigins.areOriginsEquivalent(originA, originB),
                     'Different file paths should not be equivalent');
    });

    it('asserts opaque blob URLs are opaque and not equivalent (fails on current vulnerability)', () => {
      const blobNullOrigin1 = AiAssistance.AiOrigins.extractContextOrigin('blob:null/1');
      const blobNullOrigin2 = AiAssistance.AiOrigins.extractContextOrigin('blob:null/2');

      assert.isTrue(AiAssistance.AiOrigins.isOpaqueOrigin(blobNullOrigin1), 'blob:null should be opaque');
      assert.isFalse(AiAssistance.AiOrigins.areOriginsEquivalent(blobNullOrigin1, blobNullOrigin2),
                     'blob:null origins should not be equivalent');

      const blobAboutBlank = AiAssistance.AiOrigins.extractContextOrigin('blob:about:blank');
      assert.isTrue(AiAssistance.AiOrigins.isOpaqueOrigin(blobAboutBlank), 'blob:about:blank should be opaque');

      const blobData = AiAssistance.AiOrigins.extractContextOrigin('blob:data:text/html,test');
      assert.isTrue(AiAssistance.AiOrigins.isOpaqueOrigin(blobData), 'blob:data should be opaque');
    });

    it('asserts undefined:// and other invalid origins are opaque (fails on current vulnerability)', () => {
      const undefinedOrigin = AiAssistance.AiOrigins.extractContextOrigin('undefined://');
      assert.isTrue(AiAssistance.AiOrigins.isOpaqueOrigin(undefinedOrigin), 'undefined:// should be opaque');

      const emptyOrigin = AiAssistance.AiOrigins.extractContextOrigin('://');
      assert.isTrue(AiAssistance.AiOrigins.isOpaqueOrigin(emptyOrigin), 'empty scheme should be opaque');
    });

    it('asserts different FILE:// paths are not equivalent', () => {
      const originA = AiAssistance.AiOrigins.extractContextOrigin('FILE:///path/to/a.txt');
      const originB = AiAssistance.AiOrigins.extractContextOrigin('FILE:///path/to/b.txt');
      assert.isFalse(AiAssistance.AiOrigins.areOriginsEquivalent(originA, originB),
                     'Different FILE:// paths should not be equivalent');
    });

    it('asserts file:// URLs with different hosts are not equivalent', () => {
      const originA = AiAssistance.AiOrigins.extractContextOrigin('file://serverA/path/to/file.txt');
      const originB = AiAssistance.AiOrigins.extractContextOrigin('file://serverB/path/to/file.txt');
      assert.isFalse(AiAssistance.AiOrigins.areOriginsEquivalent(originA, originB),
                     'Different hosts should not be equivalent');
    });
  });

  describe('canResourceContentsBeReadForTrace', () => {
    it('returns true if origins are equivalent', () => {
      assert.isTrue(
          AiAssistance.AiOrigins.canResourceContentsBeReadForTrace('https://a.com/script.js', 'https://a.com'));
    });

    it('returns false if origins are different', () => {
      assert.isFalse(
          AiAssistance.AiOrigins.canResourceContentsBeReadForTrace('https://b.com/script.js', 'https://a.com'));
    });

    it('blocks opaque target origins even with matching allowedOrigin', () => {
      assert.isFalse(AiAssistance.AiOrigins.canResourceContentsBeReadForTrace('data:text/javascript,console.log()',
                                                                              'https://a.com'));
    });

    it('blocks opaque allowedOrigin', () => {
      assert.isFalse(AiAssistance.AiOrigins.canResourceContentsBeReadForTrace('https://a.com/script.js', 'data:'));
      assert.isFalse(AiAssistance.AiOrigins.canResourceContentsBeReadForTrace('https://a.com/script.js', 'null'));
    });

    it('blocks local files for fresh recordings even if same-origin', () => {
      assert.isFalse(AiAssistance.AiOrigins.canResourceContentsBeReadForTrace('file:///etc/passwd', 'file://'));
      assert.isFalse(AiAssistance.AiOrigins.canResourceContentsBeReadForTrace('file:///tmp/index.html', 'file://'));
    });
  });
});
