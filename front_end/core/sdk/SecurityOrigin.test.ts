// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as SDK from './sdk.js';

describe('SecurityOrigin', () => {
  describe('create', () => {
    it('creates standard origin matching scheme, host, and port', () => {
      const origin1 = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com/path1');
      const origin2 = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com/path2');
      const originDifferent = SDK.SecurityOrigin.SecurityOrigin.create('https://other.com/path1');

      assert.isFalse(origin1.isOpaque());
      assert.isTrue(origin1.isSameOriginWith(origin2));
      assert.isFalse(origin1.isSameOriginWith(originDifferent));
      assert.isFalse(origin1.isSameOriginWith(null));
    });

    it('isolates file:// URLs by full path', () => {
      const file1 = SDK.SecurityOrigin.SecurityOrigin.create('file:///tmp/attacker.html');
      const file1Duplicate = SDK.SecurityOrigin.SecurityOrigin.create('file:///tmp/attacker.html');
      const file2 = SDK.SecurityOrigin.SecurityOrigin.create('file:///tmp/victim.html');

      assert.isFalse(file1.isOpaque());
      assert.isTrue(file1.isSameOriginWith(file1Duplicate));
      assert.isFalse(file1.isSameOriginWith(file2));
    });

    it('isolates file:// URLs on different UNC hosts', () => {
      const unc1 = SDK.SecurityOrigin.SecurityOrigin.create('file://server1/share/file.html');
      const unc2 = SDK.SecurityOrigin.SecurityOrigin.create('file://server2/share/file.html');

      assert.isFalse(unc1.isOpaque());
      assert.isFalse(unc1.isSameOriginWith(unc2));
    });

    it('treats opaque URLs as unique opaque origins that do not match each other', () => {
      const data1 = SDK.SecurityOrigin.SecurityOrigin.create('data:text/html,hello');
      const data2 = SDK.SecurityOrigin.SecurityOrigin.create('data:text/html,hello');
      const aboutBlank = SDK.SecurityOrigin.SecurityOrigin.create('about:blank');
      const nullOrigin = SDK.SecurityOrigin.SecurityOrigin.create('null');
      const emptyOrigin = SDK.SecurityOrigin.SecurityOrigin.create('');
      const detachedOrigin = SDK.SecurityOrigin.SecurityOrigin.create('detached');

      assert.isTrue(data1.isOpaque());
      assert.isTrue(data2.isOpaque());
      assert.isTrue(aboutBlank.isOpaque());
      assert.isTrue(nullOrigin.isOpaque());
      assert.isTrue(emptyOrigin.isOpaque());
      assert.isTrue(detachedOrigin.isOpaque());

      assert.isFalse(data1.isSameOriginWith(data2));
      assert.isFalse(data1.isSameOriginWith(aboutBlank));
      assert.isFalse(nullOrigin.isSameOriginWith(emptyOrigin));
      assert.isFalse(detachedOrigin.isSameOriginWith(emptyOrigin));
    });

    it('normalizes imported artifact schemes and hostnames to lowercase', () => {
      const harLower = SDK.SecurityOrigin.SecurityOrigin.create('imported-har://example.com');
      const harUpper = SDK.SecurityOrigin.SecurityOrigin.create('IMPORTED-HAR://EXAMPLE.COM/other');
      const traceLower = SDK.SecurityOrigin.SecurityOrigin.create('imported-trace://example.com');
      const traceUpper = SDK.SecurityOrigin.SecurityOrigin.create('IMPORTED-TRACE://EXAMPLE.COM/other');

      assert.isFalse(harUpper.isOpaque());
      assert.isTrue(harLower.isSameOriginWith(harUpper));
      assert.isTrue(harUpper.isSameOriginWith(harLower));
      assert.strictEqual(harUpper.siteId(), 'imported-har://example.com');

      assert.isFalse(traceUpper.isOpaque());
      assert.isTrue(traceLower.isSameOriginWith(traceUpper));
      assert.isTrue(traceUpper.isSameOriginWith(traceLower));
      assert.strictEqual(traceUpper.siteId(), 'imported-trace://example.com');
    });

    it('ignores paths, query strings, and fragments for imported artifact origins', () => {
      const harBase = SDK.SecurityOrigin.SecurityOrigin.create('imported-har://example.com');
      const harWithPath = SDK.SecurityOrigin.SecurityOrigin.create('imported-har://example.com/api/data?filter=1#hash');
      const traceBase = SDK.SecurityOrigin.SecurityOrigin.create('imported-trace://example.com');
      const traceWithPath =
          SDK.SecurityOrigin.SecurityOrigin.create('imported-trace://example.com/trace.json?token=123#sec');
      const traceQueryOnly = SDK.SecurityOrigin.SecurityOrigin.create('imported-trace://example.com?token=123');
      const traceHashOnly = SDK.SecurityOrigin.SecurityOrigin.create('imported-trace://example.com#sec');

      assert.isTrue(harBase.isSameOriginWith(harWithPath));
      assert.strictEqual(harWithPath.siteId(), 'imported-har://example.com');

      assert.isTrue(traceBase.isSameOriginWith(traceWithPath));
      assert.isTrue(traceBase.isSameOriginWith(traceQueryOnly));
      assert.isTrue(traceBase.isSameOriginWith(traceHashOnly));
      assert.strictEqual(traceWithPath.siteId(), 'imported-trace://example.com');
      assert.strictEqual(traceQueryOnly.siteId(), 'imported-trace://example.com');
      assert.strictEqual(traceHashOnly.siteId(), 'imported-trace://example.com');
    });

    it('isolates imported artifact schemes from live web origins and other artifact schemes', () => {
      const har = SDK.SecurityOrigin.SecurityOrigin.create('imported-har://example.com/api/data');
      const harOtherDomain = SDK.SecurityOrigin.SecurityOrigin.create('imported-har://other.com/api/data');
      const trace = SDK.SecurityOrigin.SecurityOrigin.create('imported-trace://example.com/trace.json');
      const traceOtherDomain = SDK.SecurityOrigin.SecurityOrigin.create('imported-trace://other.com');
      const livePage = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com/api/data');

      // Live page isolation
      assert.isFalse(har.isSameOriginWith(livePage));
      assert.isFalse(livePage.isSameOriginWith(har));
      assert.isFalse(trace.isSameOriginWith(livePage));
      assert.isFalse(livePage.isSameOriginWith(trace));

      // Cross-artifact scheme isolation
      assert.isFalse(trace.isSameOriginWith(har));
      assert.isFalse(har.isSameOriginWith(trace));

      // Different domain isolation
      assert.isFalse(har.isSameOriginWith(harOtherDomain));
      assert.isFalse(trace.isSameOriginWith(traceOtherDomain));
    });

    it('treats imported artifact schemes with empty host or missing authority as opaque', () => {
      const emptyHar1 = SDK.SecurityOrigin.SecurityOrigin.create('imported-har://');
      const emptyHar2 = SDK.SecurityOrigin.SecurityOrigin.create('imported-har://');
      const emptyTrace1 = SDK.SecurityOrigin.SecurityOrigin.create('imported-trace://');
      const emptyTrace2 = SDK.SecurityOrigin.SecurityOrigin.create('imported-trace://');
      const pathOnlyHar = SDK.SecurityOrigin.SecurityOrigin.create('imported-har:///path/to/data.har');
      const pathOnlyTrace = SDK.SecurityOrigin.SecurityOrigin.create('imported-trace:///path/to/trace.json');
      const noAuthorityHar = SDK.SecurityOrigin.SecurityOrigin.create('imported-har:example.com');
      const noAuthorityTrace = SDK.SecurityOrigin.SecurityOrigin.create('imported-trace:example.com');

      assert.isTrue(emptyHar1.isOpaque());
      assert.isTrue(emptyHar2.isOpaque());
      assert.isFalse(emptyHar1.isSameOriginWith(emptyHar2));

      assert.isTrue(emptyTrace1.isOpaque());
      assert.isTrue(emptyTrace2.isOpaque());
      assert.isFalse(emptyTrace1.isSameOriginWith(emptyTrace2));

      assert.isTrue(pathOnlyHar.isOpaque());
      assert.isTrue(pathOnlyTrace.isOpaque());
      assert.isTrue(noAuthorityHar.isOpaque());
      assert.isTrue(noAuthorityTrace.isOpaque());
    });

    it('does not treat URLs with hostnames containing detached as opaque', () => {
      const origin1 = SDK.SecurityOrigin.SecurityOrigin.create('https://detached.example.com/page.html');
      const origin2 = SDK.SecurityOrigin.SecurityOrigin.create('https://detached.example.com/other.html');

      assert.isFalse(origin1.isOpaque());
      assert.isTrue(origin1.isSameOriginWith(origin2));
    });
  });

  describe('createUniqueOpaque', () => {
    it('creates unique instances that only match themselves', () => {
      const opaque1 = SDK.SecurityOrigin.SecurityOrigin.createUniqueOpaque();
      const opaque2 = SDK.SecurityOrigin.SecurityOrigin.createUniqueOpaque();

      assert.isTrue(opaque1.isOpaque());
      assert.isTrue(opaque2.isOpaque());
      assert.isTrue(opaque1.isSameOriginWith(opaque1));
      assert.isFalse(opaque1.isSameOriginWith(opaque2));
    });
  });

  describe('siteId', () => {
    it('returns the URL origin string for standard origins', () => {
      const origin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com:8080/path');
      assert.strictEqual(origin.siteId(), 'https://example.com:8080');
    });

    it('returns the full file URL for file origins', () => {
      const origin = SDK.SecurityOrigin.SecurityOrigin.create('file:///tmp/index.html');
      assert.strictEqual(origin.siteId(), 'file:///tmp/index.html');
    });

    it('returns the UUID for opaque origins', () => {
      const origin = SDK.SecurityOrigin.SecurityOrigin.create('data:text/html,test');
      assert.isNotEmpty(origin.siteId());
      assert.isFalse(origin.siteId().startsWith('data:'));
    });
  });

  describe('isFile', () => {
    it('returns true for file URLs and false for other origins', () => {
      const fileOrigin = SDK.SecurityOrigin.SecurityOrigin.create('file:///tmp/index.html');
      const webOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      const opaqueOrigin = SDK.SecurityOrigin.SecurityOrigin.create('data:text/html,test');

      assert.isTrue(fileOrigin.isFile());
      assert.isFalse(webOrigin.isFile());
      assert.isFalse(opaqueOrigin.isFile());
    });
  });

  describe('createForImportedTrace', () => {
    it('creates an imported-trace origin for a standard web URL', () => {
      const origin = SDK.SecurityOrigin.SecurityOrigin.createForImportedTrace('https://example.com/trace/path');
      const expectedOrigin = SDK.SecurityOrigin.SecurityOrigin.create('imported-trace://example.com');
      assert.isTrue(origin.isSameOriginWith(expectedOrigin));
      assert.isFalse(origin.isOpaque());
    });

    it('creates an imported-trace origin preserving port for URLs with port', () => {
      const origin = SDK.SecurityOrigin.SecurityOrigin.createForImportedTrace('http://localhost:8080/app');
      const expectedOrigin = SDK.SecurityOrigin.SecurityOrigin.create('imported-trace://localhost:8080');
      assert.isTrue(origin.isSameOriginWith(expectedOrigin));
      assert.isFalse(origin.isOpaque());
    });

    it('isolates imported trace origin from live web origins', () => {
      const traceOrigin = SDK.SecurityOrigin.SecurityOrigin.createForImportedTrace('https://example.com');
      const webOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      assert.isFalse(traceOrigin.isSameOriginWith(webOrigin));
    });

    it('returns an opaque origin when URL is null or undefined', () => {
      const nullOrigin = SDK.SecurityOrigin.SecurityOrigin.createForImportedTrace(null);
      const undefinedOrigin = SDK.SecurityOrigin.SecurityOrigin.createForImportedTrace(undefined);
      assert.isTrue(nullOrigin.isOpaque());
      assert.isTrue(undefinedOrigin.isOpaque());
      assert.isFalse(nullOrigin.isSameOriginWith(undefinedOrigin));
    });

    it('returns an opaque origin when URL is empty or invalid', () => {
      const emptyOrigin = SDK.SecurityOrigin.SecurityOrigin.createForImportedTrace('');
      const invalidOrigin = SDK.SecurityOrigin.SecurityOrigin.createForImportedTrace('invalid:url');
      assert.isTrue(emptyOrigin.isOpaque());
      assert.isTrue(invalidOrigin.isOpaque());
      assert.isFalse(emptyOrigin.isSameOriginWith(invalidOrigin));
    });

    it('returns an opaque origin for local files without host', () => {
      const origin = SDK.SecurityOrigin.SecurityOrigin.createForImportedTrace('file:///tmp/trace.json');
      assert.isTrue(origin.isOpaque());
    });

    it('returns an opaque origin for data or about URLs', () => {
      const dataOrigin = SDK.SecurityOrigin.SecurityOrigin.createForImportedTrace('data:text/html,<html></html>');
      const aboutOrigin = SDK.SecurityOrigin.SecurityOrigin.createForImportedTrace('about:blank');
      assert.isTrue(dataOrigin.isOpaque());
      assert.isTrue(aboutOrigin.isOpaque());
      assert.isFalse(dataOrigin.isSameOriginWith(aboutOrigin));
    });
  });
});
