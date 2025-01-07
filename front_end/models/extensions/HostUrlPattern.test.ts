// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as Extensions from '../extensions/extensions.js';

const {urlString} = Platform.DevToolsPath;

// The test expectations are from //extensions/common/url_pattern_unittest.cc but leave out tests for the unsupported
// schemes and paths. Also left out are tests for whitespace and unicode urls since that doesn't go through the url
// constructor anyways.

describe('HostUrlPattern', () => {
  it('ParseInvalid', () => {
    const invalidPatterns = [
      'http',                 // Missing Scheme Separator
      'http:',                // Wrong Scheme Separator
      'http:/',               // Wrong Scheme Separator
      'about://',             // Wrong Scheme Separator
      'http://',              // Empty Host
      'http:///',             // Empty Host
      'http://:1234/',        // Empty Host
      'http://*./',           // Empty Host
      'http://\0www/',        // Invalid host
      'http://*foo/',         // Invalid Host Wildcard
      'http://foo.*.bar/',    // Invalid Host Wildcard
      'http://fo.*.ba:123/',  // Invalid Host Wildcard
      'http:/bar',            // Wrong Scheme Separator
      'http://foo.*/',        // Invalid Host Wildcard
    ];

    for (const pattern of invalidPatterns) {
      const parsedPattern = Extensions.HostUrlPattern.HostUrlPattern.parse(pattern);
      assert.isUndefined(parsedPattern);
    }
  });

  it('Ports', () => {
    const testPatterns = [
      {pattern: 'http://foo:1234', success: true, port: '1234'},
      {pattern: 'http://foo:1234/', success: true, port: '1234'},
      {pattern: 'http://foo:1234/*', success: true, port: '1234'},
      {pattern: 'http://*.foo:1234/', success: true, port: '1234'},
      {pattern: 'http://foo:/', success: false /* Invalid Port*/, port: '*'},
      {pattern: 'http://*:1234/', success: true, port: '1234'},
      {pattern: 'http://*:*/', success: true, port: '*'},
      {pattern: 'http://foo:*/', success: true, port: '*'},
      {pattern: 'http://*.foo:/', success: false /* Invalid Port*/, port: '*'},
      {pattern: 'http://foo:com/', success: false /* Invalid Port*/, port: '*'},
      {pattern: 'http://foo:123456/', success: false /* Invalid Port*/, port: '*'},
      {pattern: 'http://foo:80:80/', success: false /* Invalid Port*/, port: '*'},
      {pattern: 'chrome://foo:1234/', success: false /* Invalid Port*/, port: '*'},
    ];

    for (const {pattern, success, port} of testPatterns) {
      const parsedPattern = Extensions.HostUrlPattern.HostUrlPattern.parse(pattern);
      if (success) {
        assert.exists(parsedPattern);
        assert.strictEqual(parsedPattern.port, port);
      } else {
        assert.isUndefined(parsedPattern);
      }
    }
  });

  it('IPv6Patterns', () => {
    const successTestPatterns = [
      {pattern: 'http://[2607:f8b0:4005:805::200e]/', host: '[2607:f8b0:4005:805::200e]', port: '*'},
      {pattern: 'http://[2607:f8b0:4005:805::200e]/*', host: '[2607:f8b0:4005:805::200e]', port: '*'},
      {pattern: 'http://[2607:f8b0:4005:805::200e]:8888/*', host: '[2607:f8b0:4005:805::200e]', port: '8888'},
    ];

    for (const {pattern, host, port} of successTestPatterns) {
      const parsedPattern = Extensions.HostUrlPattern.HostUrlPattern.parse(pattern);
      assert.exists(parsedPattern);
      assert.strictEqual(parsedPattern.host, host);
      assert.strictEqual(parsedPattern.port, port);
    }

    const failureTestPatterns = [
      'http://[2607:f8b0:4005:805::200e]:/*',         // Invalid Port
      'http://[]:8888/*',                             // Empty Host
      'http://[2607:f8b0:4005:805::200e/*',           // Invalid Host
      'http://[2607:f8b0:4005:805::200e]]/*',         // Invalid Host
      'http://[[2607:f8b0:4005:805::200e]/*',         // Invalid Host
      'http://[2607:f8b0:4005:805:200e]/*',           // Invalid Host
      'http://[2607:f8b0:4005:805:200e:12:bogus]/*',  // Invalid Host
      'http://[[2607:f8b0:4005:805::200e]:abc/*',     // Invalid Port
    ];

    for (const pattern of failureTestPatterns) {
      const parsedPattern = Extensions.HostUrlPattern.HostUrlPattern.parse(pattern);
      assert.isUndefined(parsedPattern);
    }
  });

  it('Matches all pages for a given scheme', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('http://*/*');
    assert.exists(pattern);
    assert.strictEqual('http', pattern.scheme);
    assert.strictEqual('*', pattern.host);
    assert.isFalse(pattern.matchesAllUrls());
    assert.isTrue(pattern.matchesUrl(urlString`http://google.com`));
    assert.isTrue(pattern.matchesUrl(urlString`http://yahoo.com`));
    assert.isTrue(pattern.matchesUrl(urlString`http://google.com/foo`));
    assert.isFalse(pattern.matchesUrl(urlString`https://google.com`));
    assert.isTrue(pattern.matchesUrl(urlString`http://74.125.127.100/search`));
  });

  it('Matches all domains', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('https://*/*');
    assert.exists(pattern);
    assert.strictEqual('https', pattern.scheme);
    assert.strictEqual('*', pattern.host);
    assert.isFalse(pattern.matchesAllUrls());
    assert.isTrue(pattern.matchesUrl(urlString`https://www.google.com/foo`));
    assert.isTrue(pattern.matchesUrl(urlString`https://www.google.com/foobar`));
    assert.isFalse(pattern.matchesUrl(urlString`http://www.google.com/foo`));
    assert.isTrue(pattern.matchesUrl(urlString`https://www.google.com/`));
  });

  it('Matches subdomains', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('http://*.google.com/');
    assert.exists(pattern);
    assert.strictEqual('http', pattern.scheme);
    assert.strictEqual('*.google.com', pattern.host);
    assert.isFalse(pattern.matchesAllUrls());
    assert.isTrue(pattern.matchesUrl(urlString`http://google.com/foobar`));
    assert.isTrue(pattern.matchesUrl(urlString`http://www.google.com/foobar`));
    assert.isTrue(pattern.matchesUrl(urlString`http://www.google.com/foo?bar`));
    assert.isFalse(pattern.matchesUrl(urlString`http://wwwgoogle.com/foobar`));
    assert.isTrue(pattern.matchesUrl(urlString`http://monkey.images.google.com/foooobar`));
    assert.isFalse(pattern.matchesUrl(urlString`http://yahoo.com/foobar`));
  });

  it('Matches ip addresses', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('http://127.0.0.1/');
    assert.exists(pattern);
    assert.strictEqual('http', pattern.scheme);
    assert.strictEqual('127.0.0.1', pattern.host);
    assert.isFalse(pattern.matchesAllUrls());
    assert.isTrue(pattern.matchesUrl(urlString`http://127.0.0.1`));
  });

  it('Matches subdomain matching with ip addresses', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('http://*.0.0.1/');
    assert.exists(pattern);
    assert.strictEqual('http', pattern.scheme);
    assert.strictEqual('*.0.0.0.1', pattern.host);
    assert.isFalse(pattern.matchesAllUrls());
    assert.isFalse(pattern.matchesUrl(urlString`http://127.0.0.1`));
  });

  it('Matches chrome://', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('chrome://favicon/*');
    assert.exists(pattern);
    assert.strictEqual('chrome', pattern.scheme);
    assert.strictEqual('favicon', pattern.host);
    assert.isFalse(pattern.matchesAllUrls());
    assert.isTrue(pattern.matchesUrl(urlString`chrome://favicon/http://google.com`));
    assert.isTrue(pattern.matchesUrl(urlString`chrome://favicon/https://google.com`));
    assert.isFalse(pattern.matchesUrl(urlString`chrome://history`));
  });

  it('Matches *://', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('*://*/*');
    assert.exists(pattern);
    assert.isTrue(pattern.matchesScheme('http'));
    assert.isTrue(pattern.matchesScheme('https'));
    assert.isFalse(pattern.matchesScheme('chrome'));
    assert.isFalse(pattern.matchesScheme('file'));
    assert.isFalse(pattern.matchesScheme('ftp'));
    assert.isFalse(pattern.matchesAllUrls());
    assert.isTrue(pattern.matchesUrl(urlString`http://127.0.0.1`));
    assert.isFalse(pattern.matchesUrl(urlString`chrome://favicon/http://google.com`));
    assert.isFalse(pattern.matchesUrl(urlString`file:///foo/bar`));
    assert.isFalse(pattern.matchesUrl(urlString`file://localhost/foo/bar`));
  });

  it('Matches <all_urls>', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('<all_urls>');
    assert.exists(pattern);
    assert.isTrue(pattern.matchesScheme('chrome'));
    assert.isTrue(pattern.matchesScheme('http'));
    assert.isTrue(pattern.matchesScheme('https'));
    assert.isTrue(pattern.matchesScheme('file'));
    assert.isTrue(pattern.matchesScheme('chrome-extension'));
    assert.isTrue(pattern.matchesAllUrls());
    assert.isTrue(pattern.matchesUrl(urlString`chrome://favicon/http://google.com`));
    assert.isTrue(pattern.matchesUrl(urlString`http://127.0.0.1`));
    assert.isTrue(pattern.matchesUrl(urlString`file:///foo/bar`));
    assert.isTrue(pattern.matchesUrl(urlString`file://localhost/foo/bar`));
  });

  it('Matches SCHEME_ALL matches all schemes.', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('<all_urls>');
    assert.exists(pattern);
    assert.isTrue(pattern.matchesScheme('chrome'));
    assert.isTrue(pattern.matchesScheme('http'));
    assert.isTrue(pattern.matchesScheme('https'));
    assert.isTrue(pattern.matchesScheme('file'));
    assert.isTrue(pattern.matchesScheme('javascript'));
    assert.isTrue(pattern.matchesScheme('data'));
    assert.isTrue(pattern.matchesScheme('about'));
    assert.isTrue(pattern.matchesScheme('chrome-extension'));
    assert.isTrue(pattern.matchesAllUrls());
    assert.isTrue(pattern.matchesUrl(urlString`chrome://favicon/http://google.com`));
    assert.isTrue(pattern.matchesUrl(urlString`http://127.0.0.1`));
    assert.isTrue(pattern.matchesUrl(urlString`file:///foo/bar`));
    assert.isTrue(pattern.matchesUrl(urlString`file://localhost/foo/bar`));
    assert.isTrue(pattern.matchesUrl(urlString`chrome://newtab`));
    assert.isTrue(pattern.matchesUrl(urlString`about:blank`));
    assert.isTrue(pattern.matchesUrl(urlString`about:version`));
    assert.isTrue(pattern.matchesUrl(urlString`data:text/html;charset=utf-8,<html>asdf</html>`));
  });

  it('Doesn\'t Match Invalid', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('<all_urls>');
    assert.exists(pattern);
    assert.isFalse(pattern.matchesUrl(urlString`http:`));
  });

  it('Matches SCHEME_ALL and specific schemes.', () => {
    const urlPatternTestCases = [
      {pattern: 'chrome-extension://*/*', matches: 'chrome-extension://FTW'},
    ];

    for (const {pattern, matches} of urlPatternTestCases) {
      const parsedPattern = Extensions.HostUrlPattern.HostUrlPattern.parse(pattern);
      assert.exists(parsedPattern);
      assert.isTrue(parsedPattern.matchesUrl(urlString`${matches}`));
    }
  });

  it('Matches Specific port', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('http://www.example.com:80/');
    assert.exists(pattern);
    assert.strictEqual('http', pattern.scheme);
    assert.strictEqual('www.example.com', pattern.host);
    assert.isFalse(pattern.matchesAllUrls());
    assert.strictEqual('80', pattern.port);
    assert.isTrue(pattern.matchesUrl(urlString`http://www.example.com:80/foo`));
    assert.isTrue(pattern.matchesUrl(urlString`http://www.example.com/foo`));
    assert.isFalse(pattern.matchesUrl(urlString`http://www.example.com:8080/foo`));
  });

  it('Matches Explicit port wildcard', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('http://www.example.com:*/*');
    assert.exists(pattern);
    assert.strictEqual('http', pattern.scheme);
    assert.strictEqual('www.example.com', pattern.host);
    assert.isFalse(pattern.matchesAllUrls());
    assert.strictEqual('*', pattern.port);
    assert.isTrue(pattern.matchesUrl(urlString`http://www.example.com:80/foo`));
    assert.isTrue(pattern.matchesUrl(urlString`http://www.example.com/foo`));
    assert.isTrue(pattern.matchesUrl(urlString`http://www.example.com:8080/foo`));
  });

  it('Matches chrome-extension://', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('chrome-extension://ftw/*');
    assert.exists(pattern);
    assert.strictEqual('chrome-extension', pattern.scheme);
    assert.strictEqual('ftw', pattern.host);
    assert.isFalse(pattern.matchesAllUrls());
    assert.isTrue(pattern.matchesUrl(urlString`chrome-extension://ftw`));
    assert.isTrue(pattern.matchesUrl(urlString`chrome-extension://ftw/http://google.com`));
    assert.isTrue(pattern.matchesUrl(urlString`chrome-extension://ftw/https://google.com`));
    assert.isFalse(pattern.matchesUrl(urlString`chrome-extension://foobar`));
  });

  it('Ignore Ports', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('http://www.example.com:8080/');
    assert.exists(pattern);

    assert.isFalse(pattern.matchesUrl(urlString`http://www.example.com:1234/foo`));
  });

  it('Trailing Dot Domain', () => {
    const normalDomain = urlString`http://example.com/`;
    const trailingDotDomain = urlString`http://example.com./`;

    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('*://example.com/*');
    assert.exists(pattern);
    assert.isTrue(pattern.matchesUrl(normalDomain));
    assert.isTrue(pattern.matchesUrl(trailingDotDomain));

    const trailingPattern = Extensions.HostUrlPattern.HostUrlPattern.parse('*://example.com./*');
    assert.exists(trailingPattern);
    assert.isTrue(trailingPattern.matchesUrl(normalDomain));
    assert.isTrue(trailingPattern.matchesUrl(trailingDotDomain));
  });

  it('URLPattern properly canonicalizes uncanonicalized hosts', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('*://*.gOoGle.com/*');
    assert.exists(pattern);
    assert.isTrue(pattern.matchesUrl(urlString`https://google.com`));
    assert.isTrue(pattern.matchesUrl(urlString`https://maps.google.com`));
    assert.isFalse(pattern.matchesUrl(urlString`https://example.com`));

    const pattern2 = Extensions.HostUrlPattern.HostUrlPattern.parse('https://*.ɡoogle.com/*');
    assert.exists(pattern2);
    const canonicalizedHost = 'xn--oogle-qmc.com';
    assert.strictEqual(`*.${canonicalizedHost}`, pattern2.host);
    assert.isFalse(pattern2.matchesUrl(urlString`https://google.com`));
    assert.isTrue(pattern2.matchesUrl(urlString`${`https://${canonicalizedHost}/`}`));
    assert.isTrue(pattern2.matchesHost('ɡoogle.com'));

    const pattern3 = Extensions.HostUrlPattern.HostUrlPattern.parse('https://\xef\xb7\x90zyx.com/*');
    assert.isUndefined(pattern3);  // Invalid Host
  });
});
