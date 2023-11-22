// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as Extensions from '../../../../../front_end/models/extensions/extensions.js';

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
        Platform.assertNotNullOrUndefined(parsedPattern);
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
      Platform.assertNotNullOrUndefined(parsedPattern);
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
    Platform.assertNotNullOrUndefined(pattern);
    assert.strictEqual('http', pattern.scheme);
    assert.strictEqual('*', pattern.host);
    assert.isFalse(pattern.matchesAllUrls());
    assert.isTrue(pattern.matchesUrl('http://google.com' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('http://yahoo.com' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('http://google.com/foo' as Platform.DevToolsPath.UrlString));
    assert.isFalse(pattern.matchesUrl('https://google.com' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('http://74.125.127.100/search' as Platform.DevToolsPath.UrlString));
  });

  it('Matches all domains', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('https://*/*');
    Platform.assertNotNullOrUndefined(pattern);
    assert.strictEqual('https', pattern.scheme);
    assert.strictEqual('*', pattern.host);
    assert.isFalse(pattern.matchesAllUrls());
    assert.isTrue(pattern.matchesUrl('https://www.google.com/foo' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('https://www.google.com/foobar' as Platform.DevToolsPath.UrlString));
    assert.isFalse(pattern.matchesUrl('http://www.google.com/foo' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('https://www.google.com/' as Platform.DevToolsPath.UrlString));
  });

  it('Matches subdomains', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('http://*.google.com/');
    Platform.assertNotNullOrUndefined(pattern);
    assert.strictEqual('http', pattern.scheme);
    assert.strictEqual('*.google.com', pattern.host);
    assert.isFalse(pattern.matchesAllUrls());
    assert.isTrue(pattern.matchesUrl('http://google.com/foobar' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('http://www.google.com/foobar' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('http://www.google.com/foo?bar' as Platform.DevToolsPath.UrlString));
    assert.isFalse(pattern.matchesUrl('http://wwwgoogle.com/foobar' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('http://monkey.images.google.com/foooobar' as Platform.DevToolsPath.UrlString));
    assert.isFalse(pattern.matchesUrl('http://yahoo.com/foobar' as Platform.DevToolsPath.UrlString));
  });

  it('Matches ip addresses', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('http://127.0.0.1/');
    Platform.assertNotNullOrUndefined(pattern);
    assert.strictEqual('http', pattern.scheme);
    assert.strictEqual('127.0.0.1', pattern.host);
    assert.isFalse(pattern.matchesAllUrls());
    assert.isTrue(pattern.matchesUrl('http://127.0.0.1' as Platform.DevToolsPath.UrlString));
  });

  it('Matches subdomain matching with ip addresses', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('http://*.0.0.1/');
    Platform.assertNotNullOrUndefined(pattern);
    assert.strictEqual('http', pattern.scheme);
    assert.strictEqual('*.0.0.0.1', pattern.host);
    assert.isFalse(pattern.matchesAllUrls());
    assert.isFalse(pattern.matchesUrl('http://127.0.0.1' as Platform.DevToolsPath.UrlString));
  });

  it('Matches chrome://', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('chrome://favicon/*');
    Platform.assertNotNullOrUndefined(pattern);
    assert.strictEqual('chrome', pattern.scheme);
    assert.strictEqual('favicon', pattern.host);
    assert.isFalse(pattern.matchesAllUrls());
    assert.isTrue(pattern.matchesUrl('chrome://favicon/http://google.com' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('chrome://favicon/https://google.com' as Platform.DevToolsPath.UrlString));
    assert.isFalse(pattern.matchesUrl('chrome://history' as Platform.DevToolsPath.UrlString));
  });

  it('Matches *://', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('*://*/*');
    Platform.assertNotNullOrUndefined(pattern);
    assert.isTrue(pattern.matchesScheme('http'));
    assert.isTrue(pattern.matchesScheme('https'));
    assert.isFalse(pattern.matchesScheme('chrome'));
    assert.isFalse(pattern.matchesScheme('file'));
    assert.isFalse(pattern.matchesScheme('ftp'));
    assert.isFalse(pattern.matchesAllUrls());
    assert.isTrue(pattern.matchesUrl('http://127.0.0.1' as Platform.DevToolsPath.UrlString));
    assert.isFalse(pattern.matchesUrl('chrome://favicon/http://google.com' as Platform.DevToolsPath.UrlString));
    assert.isFalse(pattern.matchesUrl('file:///foo/bar' as Platform.DevToolsPath.UrlString));
    assert.isFalse(pattern.matchesUrl('file://localhost/foo/bar' as Platform.DevToolsPath.UrlString));
  });

  it('Matches <all_urls>', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('<all_urls>');
    Platform.assertNotNullOrUndefined(pattern);
    assert.isTrue(pattern.matchesScheme('chrome'));
    assert.isTrue(pattern.matchesScheme('http'));
    assert.isTrue(pattern.matchesScheme('https'));
    assert.isTrue(pattern.matchesScheme('file'));
    assert.isTrue(pattern.matchesScheme('chrome-extension'));
    assert.isTrue(pattern.matchesAllUrls());
    assert.isTrue(pattern.matchesUrl('chrome://favicon/http://google.com' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('http://127.0.0.1' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('file:///foo/bar' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('file://localhost/foo/bar' as Platform.DevToolsPath.UrlString));
  });

  it('Matches SCHEME_ALL matches all schemes.', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('<all_urls>');
    Platform.assertNotNullOrUndefined(pattern);
    assert.isTrue(pattern.matchesScheme('chrome'));
    assert.isTrue(pattern.matchesScheme('http'));
    assert.isTrue(pattern.matchesScheme('https'));
    assert.isTrue(pattern.matchesScheme('file'));
    assert.isTrue(pattern.matchesScheme('javascript'));
    assert.isTrue(pattern.matchesScheme('data'));
    assert.isTrue(pattern.matchesScheme('about'));
    assert.isTrue(pattern.matchesScheme('chrome-extension'));
    assert.isTrue(pattern.matchesAllUrls());
    assert.isTrue(pattern.matchesUrl('chrome://favicon/http://google.com' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('http://127.0.0.1' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('file:///foo/bar' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('file://localhost/foo/bar' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('chrome://newtab' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('about:blank' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('about:version' as Platform.DevToolsPath.UrlString));
    assert.isTrue(
        pattern.matchesUrl('data:text/html;charset=utf-8,<html>asdf</html>' as Platform.DevToolsPath.UrlString));
  });

  it('Doesn\'t Match Invalid', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('<all_urls>');
    Platform.assertNotNullOrUndefined(pattern);
    assert.isFalse(pattern.matchesUrl('http:' as Platform.DevToolsPath.UrlString));
  });

  it('Matches SCHEME_ALL and specific schemes.', () => {
    const urlPatternTestCases = [
      {pattern: 'chrome-extension://*/*', matches: 'chrome-extension://FTW'},
    ];

    for (const {pattern, matches} of urlPatternTestCases) {
      const parsedPattern = Extensions.HostUrlPattern.HostUrlPattern.parse(pattern);
      Platform.assertNotNullOrUndefined(parsedPattern);
      assert.isTrue(parsedPattern.matchesUrl(matches as Platform.DevToolsPath.UrlString));
    }
  });

  it('Matches Specific port', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('http://www.example.com:80/');
    Platform.assertNotNullOrUndefined(pattern);
    assert.strictEqual('http', pattern.scheme);
    assert.strictEqual('www.example.com', pattern.host);
    assert.isFalse(pattern.matchesAllUrls());
    assert.strictEqual('80', pattern.port);
    assert.isTrue(pattern.matchesUrl('http://www.example.com:80/foo' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('http://www.example.com/foo' as Platform.DevToolsPath.UrlString));
    assert.isFalse(pattern.matchesUrl('http://www.example.com:8080/foo' as Platform.DevToolsPath.UrlString));
  });

  it('Matches Explicit port wildcard', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('http://www.example.com:*/*');
    Platform.assertNotNullOrUndefined(pattern);
    assert.strictEqual('http', pattern.scheme);
    assert.strictEqual('www.example.com', pattern.host);
    assert.isFalse(pattern.matchesAllUrls());
    assert.strictEqual('*', pattern.port);
    assert.isTrue(pattern.matchesUrl('http://www.example.com:80/foo' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('http://www.example.com/foo' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('http://www.example.com:8080/foo' as Platform.DevToolsPath.UrlString));
  });

  it('Matches chrome-extension://', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('chrome-extension://ftw/*');
    Platform.assertNotNullOrUndefined(pattern);
    assert.strictEqual('chrome-extension', pattern.scheme);
    assert.strictEqual('ftw', pattern.host);
    assert.isFalse(pattern.matchesAllUrls());
    assert.isTrue(pattern.matchesUrl('chrome-extension://ftw' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('chrome-extension://ftw/http://google.com' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('chrome-extension://ftw/https://google.com' as Platform.DevToolsPath.UrlString));
    assert.isFalse(pattern.matchesUrl('chrome-extension://foobar' as Platform.DevToolsPath.UrlString));
  });

  it('Ignore Ports', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('http://www.example.com:8080/');
    Platform.assertNotNullOrUndefined(pattern);

    assert.isFalse(pattern.matchesUrl('http://www.example.com:1234/foo' as Platform.DevToolsPath.UrlString));
  });

  it('Trailing Dot Domain', () => {
    const normalDomain = 'http://example.com/' as Platform.DevToolsPath.UrlString;
    const trailingDotDomain = 'http://example.com./' as Platform.DevToolsPath.UrlString;

    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('*://example.com/*');
    Platform.assertNotNullOrUndefined(pattern);
    assert.isTrue(pattern.matchesUrl(normalDomain));
    assert.isTrue(pattern.matchesUrl(trailingDotDomain));

    const trailingPattern = Extensions.HostUrlPattern.HostUrlPattern.parse('*://example.com./*');
    Platform.assertNotNullOrUndefined(trailingPattern);
    assert.isTrue(trailingPattern.matchesUrl(normalDomain));
    assert.isTrue(trailingPattern.matchesUrl(trailingDotDomain));
  });

  it('URLPattern properly canonicalizes uncanonicalized hosts', () => {
    const pattern = Extensions.HostUrlPattern.HostUrlPattern.parse('*://*.gOoGle.com/*');
    Platform.assertNotNullOrUndefined(pattern);
    assert.isTrue(pattern.matchesUrl('https://google.com' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern.matchesUrl('https://maps.google.com' as Platform.DevToolsPath.UrlString));
    assert.isFalse(pattern.matchesUrl('https://example.com' as Platform.DevToolsPath.UrlString));

    const pattern2 = Extensions.HostUrlPattern.HostUrlPattern.parse('https://*.ɡoogle.com/*');
    Platform.assertNotNullOrUndefined(pattern2);
    const canonicalizedHost = 'xn--oogle-qmc.com';
    assert.strictEqual(`*.${canonicalizedHost}`, pattern2.host);
    assert.isFalse(pattern2.matchesUrl('https://google.com' as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern2.matchesUrl(`https://${canonicalizedHost}/` as Platform.DevToolsPath.UrlString));
    assert.isTrue(pattern2.matchesHost('ɡoogle.com'));

    const pattern3 = Extensions.HostUrlPattern.HostUrlPattern.parse('https://\xef\xb7\x90zyx.com/*');
    assert.isUndefined(pattern3);  // Invalid Host
  });
});
