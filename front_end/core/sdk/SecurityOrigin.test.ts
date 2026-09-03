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

    it('isolates imported artifact schemes to their own domain', () => {
      const har1 = SDK.SecurityOrigin.SecurityOrigin.create('imported-har://example.com/api/data');
      const har2 = SDK.SecurityOrigin.SecurityOrigin.create('imported-har://example.com/index.html');
      const harNoPath = SDK.SecurityOrigin.SecurityOrigin.create('imported-har://example.com');
      const harUpperCase = SDK.SecurityOrigin.SecurityOrigin.create('IMPORTED-HAR://EXAMPLE.COM/other');
      const harOtherDomain = SDK.SecurityOrigin.SecurityOrigin.create('imported-har://other.com/api/data');
      const livePage = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com/api/data');

      assert.isFalse(har1.isOpaque());
      assert.isTrue(har1.isSameOriginWith(har2));
      assert.isTrue(har1.isSameOriginWith(harNoPath));
      assert.isTrue(har1.isSameOriginWith(harUpperCase));
      assert.isFalse(har1.isSameOriginWith(harOtherDomain));
      assert.isFalse(har1.isSameOriginWith(livePage));
    });

    it('treats imported artifact schemes with empty host as opaque', () => {
      const emptyHost1 = SDK.SecurityOrigin.SecurityOrigin.create('imported-har://');
      const emptyHost2 = SDK.SecurityOrigin.SecurityOrigin.create('imported-har://');

      assert.isTrue(emptyHost1.isOpaque());
      assert.isTrue(emptyHost2.isOpaque());
      assert.isFalse(emptyHost1.isSameOriginWith(emptyHost2));
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
});
