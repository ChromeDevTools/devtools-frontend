// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../../front_end/core/common/common.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';

const ParsedURL = Common.ParsedURL.ParsedURL;

function assertEqualUrlStringString(actual: Platform.DevToolsPath.UrlString|null, expected: string, message?: string) {
  assert.strictEqual(actual, expected as Platform.DevToolsPath.UrlString, message);
}

describe('Parsed URL', () => {
  describe('with path normalization', () => {
    const cases = [
      {path: '', expected: ''},
      {path: '.', expected: '/'},
      {path: './', expected: '/'},
      {path: '..', expected: '/'},
      {path: '../', expected: '/'},
      {path: 'a/../g', expected: 'g'},
      {path: '../..', expected: '/'},
      {path: '../../', expected: '/'},
      {path: 'a/b/c/../../g', expected: 'a/g'},
      {path: 'a/b/c/d/../../../g', expected: 'a/g'},
      {path: 'a/b/c/d/e/../../../../g', expected: 'a/g'},
      {path: '/./g', expected: '/g'},
      {path: '/.//g', expected: '//g'},
      {path: '/../g', expected: '/g'},
      {path: 'g.', expected: 'g.'},
      {path: '.g', expected: '.g'},
      {path: 'g..', expected: 'g..'},
      {path: '..g', expected: '..g'},
      {path: 'a/b/./../g', expected: 'a/g'},
      {path: './g/.', expected: 'g/'},
      {path: 'g/./h', expected: 'g/h'},
      {path: 'g/../h', expected: 'h'},
      {path: './h/g/', expected: 'h/g/'},
      {path: 'g///h.ts', expected: 'g///h.ts'},
      {path: '/b/c/./', expected: '/b/c/'},
      {path: '///', expected: '///'},
    ];

    for (const {path, expected} of cases) {
      it(`can normalize "${path}"`, () => {
        assert.strictEqual(Common.ParsedURL.normalizePath(path), expected);
      });
    }
  });

  it('recognizes valid URLs', () => {
    const parsedUrl = new ParsedURL('http://www.example.com/');
    assert.isTrue(parsedUrl.isValid, 'the URL should be valid');
  });

  it('recognizes the URL elements', () => {
    const parsedUrl = new ParsedURL('http://username@www.example.com:8080/testing/test?isTest=true#testFragment');
    assert.isTrue(parsedUrl.isValid, 'the URL should be valid');
    assert.strictEqual(
        parsedUrl.url, 'http://username@www.example.com:8080/testing/test?isTest=true#testFragment',
        'URL value is incorrect');
    assert.strictEqual(parsedUrl.scheme, 'http', 'URL scheme is incorrect');
    assert.strictEqual(parsedUrl.user, 'username', 'URL user is incorrect');
    assert.strictEqual(parsedUrl.host, 'www.example.com', 'URL host is incorrect');
    assert.strictEqual(parsedUrl.port, '8080', 'URL port is incorrect');
    assert.strictEqual(parsedUrl.path, '/testing/test', 'URL path is incorrect');
    assert.strictEqual(parsedUrl.queryParams, 'isTest=true', 'URL query params are incorrect');
    assert.strictEqual(parsedUrl.fragment, 'testFragment', 'URL fragment is incorrect');
    assert.strictEqual(parsedUrl.folderPathComponents, '/testing', 'URL folder path components are incorrect');
    assert.strictEqual(parsedUrl.lastPathComponent, 'test', 'URL last path component is incorrect');
  });

  it('recognizes a valid IPv6 localhost URL', () => {
    const parsedUrl = new ParsedURL('http://[::]/?queryParam1=value1&queryParam2=value2#fragmentWith/Many//Slashes');
    assert.isTrue(parsedUrl.isValid, 'the URL should be valid');
    assert.strictEqual(
        parsedUrl.url, 'http://[::]/?queryParam1=value1&queryParam2=value2#fragmentWith/Many//Slashes',
        'URL value is incorrect');
    assert.strictEqual(parsedUrl.scheme, 'http', 'URL scheme is incorrect');
    assert.strictEqual(parsedUrl.user, '', 'URL user is incorrect');
    assert.strictEqual(parsedUrl.host, '[::]', 'URL host is incorrect');
    assert.strictEqual(parsedUrl.port, '', 'URL port is incorrect');
    assert.strictEqual(parsedUrl.path, '/', 'URL path is incorrect');
    assert.strictEqual(
        parsedUrl.queryParams, 'queryParam1=value1&queryParam2=value2', 'URL query params are incorrect');
    assert.strictEqual(parsedUrl.fragment, 'fragmentWith/Many//Slashes', 'URL fragment is incorrect');
    assert.strictEqual(parsedUrl.folderPathComponents, '', 'URL folder path components are incorrect');
    assert.strictEqual(parsedUrl.lastPathComponent, '', 'URL last path component is incorrect');
  });

  it('recognizes a valid blob URL', () => {
    const parsedUrl = new ParsedURL('blob:http://www.example.com/');
    assert.isTrue(parsedUrl.isValid, 'the URL should be valid');
    assert.strictEqual(parsedUrl.scheme, 'blob', 'the URL scheme is not blob');
    assert.strictEqual(parsedUrl.blobInnerScheme, 'http', 'the URL inner scheme is not http');
  });

  it('parses a URL with no path', () => {
    const parsedUrl = new ParsedURL('http://www.example.com');
    assert.isTrue(parsedUrl.isValid, 'the URL should be valid');
    assert.strictEqual(parsedUrl.path, '/', 'path is not a single slash ("/")');
  });

  it('parses a data URL', () => {
    const parsedUrl = new ParsedURL('data:test');
    assert.isFalse(parsedUrl.isValid, 'the URL should not be valid');
    assert.strictEqual(parsedUrl.scheme, 'data', 'the URL scheme is not data');
  });

  it('recognizes an invalid blob URL', () => {
    const parsedUrl = new ParsedURL('blob:test');
    assert.isFalse(parsedUrl.isValid, 'the URL should not be valid');
    assert.strictEqual(parsedUrl.scheme, 'blob', 'the URL scheme is not blob');
  });

  it('recognizes an invalid blank URL', () => {
    const parsedUrl = new ParsedURL('about:blank');
    assert.isFalse(parsedUrl.isValid, 'the URL should not be valid');
    assert.strictEqual(parsedUrl.scheme, 'about', 'the URL scheme is not blob');
  });

  it('recognizes an invalid URL', () => {
    const parsedUrl = new ParsedURL('abc');
    assert.isFalse(parsedUrl.isValid, 'the URL should not be valid');
    assert.strictEqual(parsedUrl.url, 'abc', 'URL value is incorrect');
  });

  it('converts platform path to a URL that does not start with "file://"', () => {
    const platformPathTest = 'usr/lib' as Platform.DevToolsPath.RawPathString;
    const convertedUrl = ParsedURL.rawPathToUrlString(platformPathTest);
    assert.strictEqual(convertedUrl, 'file:///usr/lib', 'URL was not converted correctly');
  });

  it('converts platform path to a URL that does not start with "file://" but starts with a slash ("/")', () => {
    const platformPathTest = '/usr/lib' as Platform.DevToolsPath.RawPathString;
    const convertedUrl = ParsedURL.rawPathToUrlString(platformPathTest);
    assert.strictEqual(convertedUrl, 'file:///usr/lib', 'URL was not converted correctly');
  });

  it('converts platform path to a URL that starts with "file://"', () => {
    const platformPathTest = 'file://usr/lib' as Platform.DevToolsPath.RawPathString;
    const convertedUrl = ParsedURL.rawPathToUrlString(platformPathTest);
    assert.strictEqual(convertedUrl, 'file://usr/lib', 'URL was not converted correctly');
  });

  it('converts path that starts with "file://" to a platform path', () => {
    const pathTest = 'file://usr/lib' as Platform.DevToolsPath.UrlString;
    const convertedPath = ParsedURL.urlToRawPathString(pathTest);
    assert.strictEqual(convertedPath, 'usr/lib', 'URL was not converted successfully');
  });

  it('converts path that starts with "file:///" to a platform path on Windows', () => {
    const pathTest = 'file:///usr/lib' as Platform.DevToolsPath.UrlString;
    const convertedPath = ParsedURL.urlToRawPathString(pathTest, true);
    assert.strictEqual(convertedPath, 'usr\\lib', 'URL was not converted successfully');
  });

  it('checks that URL is valid', () => {
    const urlTest = 'http://www.example.com#?test';
    assert.strictEqual(ParsedURL.isValidUrlString(urlTest), true, 'URL validation was incorrect');
  });

  it('checks that file:// URL is valid', () => {
    const urlTest = 'file:///usr/lib';
    assert.strictEqual(ParsedURL.isValidUrlString(urlTest), true, 'URL validation was incorrect');
  });

  it('checks that "://" is not a valid URL', () => {
    const urlTest = '://';
    assert.strictEqual(ParsedURL.isValidUrlString(urlTest), false, 'URL validation was incorrect');
  });

  it('converts URL with a hash to a URL without a hash', () => {
    const urlTest = 'http://www.example.com#?test';
    const convertedUrl = ParsedURL.urlWithoutHash(urlTest);
    assert.strictEqual(convertedUrl, 'http://www.example.com', 'URL was not converted successfully');
  });

  it('returns URL without a hash as it is', () => {
    const urlTest = 'http://www.example.com';
    const convertedUrl = ParsedURL.urlWithoutHash(urlTest);
    assert.strictEqual(convertedUrl, urlTest, 'URL was changed');
  });

  it('returns URL with a question mark but without a hash as it is', () => {
    const urlTest = 'http://www.example.com?hello';
    const convertedUrl = ParsedURL.urlWithoutHash(urlTest);
    assert.strictEqual(convertedUrl, urlTest, 'URL was changed');
  });

  it('extracts the path from a valid URL', () => {
    const urlTest = 'http://www.example.com/test/path' as Platform.DevToolsPath.UrlString;
    const extractedPath = ParsedURL.extractPath(urlTest);
    assert.strictEqual(extractedPath, '/test/path', 'path extracted incorrectly');
  });

  it('returns an empty string as a path if the URL is not valid', () => {
    const urlTest = 'www.example.com/test/path' as Platform.DevToolsPath.UrlString;
    const extractedPath = ParsedURL.extractPath(urlTest);
    assert.strictEqual(extractedPath, '', 'did not return an empty path');
  });

  it('extracts the origin from a valid URL', () => {
    const urlTest = 'http://www.example.com/test/path' as Platform.DevToolsPath.UrlString;
    const extractedOrigin = ParsedURL.extractOrigin(urlTest);
    assert.strictEqual(extractedOrigin, 'http://www.example.com', 'origin extracted incorrectly');
  });

  it('returns an empty string as a origin if the URL is not valid', () => {
    const urlTest = 'www.example.com/test/path';
    const extractedOrigin = ParsedURL.extractOrigin(urlTest as Platform.DevToolsPath.UrlString);
    assert.strictEqual(extractedOrigin, '', 'did not return an empty path');
  });

  it('extracts the extension from a valid URL with a hash', () => {
    const urlTest = 'http://www.example.com/test/testFile.html#testHash';
    const extractedExt = ParsedURL.extractExtension(urlTest);
    assert.strictEqual(extractedExt, 'html', 'extension extracted incorrectly');
  });

  it('extracts the extension from a valid URL with a question mark', () => {
    const urlTest = 'http://www.example.com/test/testFile.html?testParam=t';
    const extractedExt = ParsedURL.extractExtension(urlTest);
    assert.strictEqual(extractedExt, 'html', 'extension extracted incorrectly');
  });

  it('extracts the extension from a valid URL that does not have slashes', () => {
    const urlTest = 'testFile.html';
    const extractedExt = ParsedURL.extractExtension(urlTest);
    assert.strictEqual(extractedExt, 'html', 'extension extracted incorrectly');
  });

  it('extracts the extension from a valid URL that has a percent sign', () => {
    const urlTest = 'http://www.example.com/test/path.html%20';
    const extractedExt = ParsedURL.extractExtension(urlTest);
    assert.strictEqual(extractedExt, 'html', 'extension extracted incorrectly');
  });

  it('returns an empty string when trying to extract extension from an invalid URL', () => {
    const urlTest = 'http://html';
    const extractedExt = ParsedURL.extractExtension(urlTest);
    assert.strictEqual(extractedExt, '', 'extension extracted incorrectly');
  });

  it('is able to extract name from a valid URL', () => {
    const urlTest = 'http://www.example.com/test/path.html';
    const extractedName = ParsedURL.extractName(urlTest);
    assert.strictEqual(extractedName, 'path.html', 'name extracted incorrectly');
  });

  it('is able to extract name from a string without a slash', () => {
    const urlTest = 'path.html';
    const extractedName = ParsedURL.extractName(urlTest);
    assert.strictEqual(extractedName, 'path.html', 'name extracted incorrectly');
  });

  it('is able to extract name from a valid URL with a query', () => {
    const urlTest = 'http://www.example.com/test/path.html?testParam=t';
    const extractedName = ParsedURL.extractName(urlTest);
    assert.strictEqual(extractedName, 'path.html', 'name extracted incorrectly');
  });

  it('is able to extract name from a string without a slash and with a query', () => {
    const urlTest = 'path.html?testParam=t';
    const extractedName = ParsedURL.extractName(urlTest);
    assert.strictEqual(extractedName, 'path.html', 'name extracted incorrectly');
  });

  it('uses the completeURL function to return a data URL as it is', () => {
    const hrefTest = 'data:http://www.example.com';
    const baseUrlTest = 'www.example.com' as Platform.DevToolsPath.UrlString;
    const completeUrl = ParsedURL.completeURL(baseUrlTest, hrefTest);
    assertEqualUrlStringString(completeUrl, hrefTest, 'complete URL is not returned correctly');
  });

  it('uses the completeURL function to return a blob URL as it is', () => {
    const hrefTest = 'blob:http://www.example.com';
    const baseUrlTest = 'www.example.com' as Platform.DevToolsPath.UrlString;
    const completeUrl = ParsedURL.completeURL(baseUrlTest, hrefTest);
    assertEqualUrlStringString(completeUrl, hrefTest, 'complete URL is not returned correctly');
  });

  it('uses the completeURL function to return a javascript URL as it is', () => {
    const hrefTest = 'javascript:http://www.example.com';
    const baseUrlTest = 'www.example.com' as Platform.DevToolsPath.UrlString;
    const completeUrl = ParsedURL.completeURL(baseUrlTest, hrefTest);
    assertEqualUrlStringString(completeUrl, hrefTest, 'complete URL is not returned correctly');
  });

  it('uses the completeURL function to return a mailto URL as it is', () => {
    const hrefTest = 'mailto:http://www.example.com';
    const baseUrlTest = 'www.example.com' as Platform.DevToolsPath.UrlString;
    const completeUrl = ParsedURL.completeURL(baseUrlTest, hrefTest);
    assertEqualUrlStringString(completeUrl, hrefTest, 'complete URL is not returned correctly');
  });

  describe('completeURL with absolute URLs', () => {
    const cases = [
      {href: 'http://www.example.com', expected: 'http://www.example.com/'},
      {href: 'http://a/b/c/g', expected: 'http://a/b/c/g'},
      {href: 'http://a/b/c/./g', expected: 'http://a/b/c/g'},
      {href: 'http://a/b/c/g/', expected: 'http://a/b/c/g/'},
      {href: 'http://a/b/c/d;p?y', expected: 'http://a/b/c/d;p?y'},
      {href: 'http://a/b/c/g?y', expected: 'http://a/b/c/g?y'},
      {href: 'http://a/b/c/d;p?q#s', expected: 'http://a/b/c/d;p?q#s'},
      {href: 'http://a/b/c/g#s', expected: 'http://a/b/c/g#s'},
      {href: 'http://a/b/c/g?y#s', expected: 'http://a/b/c/g?y#s'},
      {href: 'http://a/b/c/;x', expected: 'http://a/b/c/;x'},
      {href: 'http://a/b/c/g;x', expected: 'http://a/b/c/g;x'},
      {href: 'http://a/b/c/g;x?y#s', expected: 'http://a/b/c/g;x?y#s'},
      {href: 'http://a/b/c/d;p?q', expected: 'http://a/b/c/d;p?q'},
      {href: 'http://a/b/c/.', expected: 'http://a/b/c/'},
      {href: 'http://a/b/c/./', expected: 'http://a/b/c/'},
      {href: 'http://a/b/c/..', expected: 'http://a/b/'},
      {href: 'http://a/b/c/../', expected: 'http://a/b/'},
      {href: 'http://a/b/c/../g', expected: 'http://a/b/g'},
      {href: 'http://a/b/c/../..', expected: 'http://a/'},
      {href: 'http://a/b/c/../../', expected: 'http://a/'},
      {href: 'http://a/b/c/../../g', expected: 'http://a/g'},
      {href: 'http://a/b/c/../../../g', expected: 'http://a/g'},
      {href: 'http://a/b/c/../../../../g', expected: 'http://a/g'},
      {href: 'http://a/b/c/g.', expected: 'http://a/b/c/g.'},
      {href: 'http://a/b/c/.g', expected: 'http://a/b/c/.g'},
      {href: 'http://a/b/c/g..', expected: 'http://a/b/c/g..'},
      {href: 'http://a/b/c/..g', expected: 'http://a/b/c/..g'},
      {href: 'http://a/b/c/./../g', expected: 'http://a/b/g'},
      {href: 'http://a/b/c/./g/.', expected: 'http://a/b/c/g/'},
      {href: 'http://a/b/c/g/./h', expected: 'http://a/b/c/g/h'},
      {href: 'http://a/b/c/g/../h', expected: 'http://a/b/c/h'},
      {href: 'http://a/b/c/g;x=1/./y', expected: 'http://a/b/c/g;x=1/y'},
      {href: 'http://a/b/c/g;x=1/../y', expected: 'http://a/b/c/y'},
      {href: 'http://a/b/c/g?y/./x', expected: 'http://a/b/c/g?y/./x'},
      {href: 'http://a/b/c/g?y/../x', expected: 'http://a/b/c/g?y/../x'},
      {href: 'http://a/b/c/g#s/./x', expected: 'http://a/b/c/g#s/./x'},
      {href: 'http://a/b/c/g#s/../x', expected: 'http://a/b/c/g#s/../x'},
      {
        href: 'http://user:password@host:8080/dir/../file.ts?rev=100',
        expected: 'http://host:8080/file.ts?rev=100',
      },
      {
        href: 'webpack://@scope/chrome-devtool-sourcemap-issue/./main.ts',
        expected: 'webpack://scope/chrome-devtool-sourcemap-issue/main.ts',
      },
    ];

    for (const {href, expected} of cases) {
      it(`can use completeURL to normalize "${href}"`, () => {
        const baseUrlTest = 'www.example.com' as Platform.DevToolsPath.UrlString;
        const completeUrl = ParsedURL.completeURL(baseUrlTest, href);
        assertEqualUrlStringString(completeUrl, expected, 'complete URL is not returned correctly');
      });
    }
  });

  it('uses the completeURL function to return null for invalid href and invalid base URL', () => {
    const hrefTest = 'www.example.com';
    const baseUrlTest = 'www.example.com' as Platform.DevToolsPath.UrlString;
    const completeUrl = ParsedURL.completeURL(baseUrlTest, hrefTest);
    assert.strictEqual(completeUrl, null, 'complete URL is not returned correctly');
  });

  it('uses the completeURL function to return the href if the base URL is a data URL', () => {
    const hrefTest = 'www.example.com';
    const baseUrlTest = 'data://www.example.com' as Platform.DevToolsPath.UrlString;
    const completeUrl = ParsedURL.completeURL(baseUrlTest, hrefTest);
    assertEqualUrlStringString(completeUrl, hrefTest, 'complete URL is not returned correctly');
  });

  it('uses the completeURL function to return the href with scheme if the base URL was valid and the href scheme was dropped',
     () => {
       const hrefTest = '//www.example.com';
       const baseUrlTest = 'http://www.example.com/' as Platform.DevToolsPath.UrlString;
       const completeUrl = ParsedURL.completeURL(baseUrlTest, hrefTest);
       assertEqualUrlStringString(completeUrl, 'http:' + hrefTest, 'complete URL is not returned correctly');
     });

  it('uses the completeURL function to resolve an empty href to a base URL without fragment', () => {
    const hrefTest = '';
    const baseUrlTest = 'http://www.example.com/?testParam=t' as Platform.DevToolsPath.UrlString;
    const completeUrl = ParsedURL.completeURL(baseUrlTest, hrefTest);
    assertEqualUrlStringString(completeUrl, baseUrlTest, 'complete URL is not returned correctly');
  });

  it('uses the completeURL function to resolve a fragment href to a base URL with fragment', () => {
    const hrefTest = '#testFragment';
    const baseUrlTest = 'http://www.example.com/?testParam=t' as Platform.DevToolsPath.UrlString;
    const completeUrl = ParsedURL.completeURL(baseUrlTest, hrefTest);
    assertEqualUrlStringString(completeUrl, baseUrlTest + hrefTest, 'complete URL is not returned correctly');
  });

  it('uses the completeURL function to resolve a parameters href to a base URL with the parameters from the href while the base URL has parameters',
     () => {
       const hrefTest = '?hrefParams=t';
       const baseUrlTest = 'http://www.example.com/?testParam=t' as Platform.DevToolsPath.UrlString;
       const completeUrl = ParsedURL.completeURL(baseUrlTest, hrefTest);
       assertEqualUrlStringString(
           completeUrl, 'http://www.example.com/' + hrefTest, 'complete URL is not returned correctly');
     });

  it('uses the completeURL function to resolve a parameters href to a base URL with the parameters from the href while the base URL does not have parameters',
     () => {
       const hrefTest = '?hrefParams=t';
       const baseUrlTest = 'http://www.example.com/' as Platform.DevToolsPath.UrlString;
       const completeUrl = ParsedURL.completeURL(baseUrlTest, hrefTest);
       assertEqualUrlStringString(completeUrl, baseUrlTest + hrefTest, 'complete URL is not returned correctly');
     });

  it('uses the splitLineAndColumn function to return undefined line and column numbers if the URL does not contain any',
     () => {
       const stringTest = 'http://www.example.com';
       const splitResult = ParsedURL.splitLineAndColumn(stringTest);
       assert.strictEqual(splitResult.url, 'http://www.example.com', 'URL is not correct');
       assert.isUndefined(splitResult.lineNumber, 'line number is not undefined');
       assert.isUndefined(splitResult.columnNumber, 'column number is not undefined');
     });

  it('uses the splitLineAndColumn function to return the line number if the URL contains one', () => {
    const stringTest = 'http://www.example.com/foo.js:15';
    const splitResult = ParsedURL.splitLineAndColumn(stringTest);
    assert.strictEqual(splitResult.url, 'http://www.example.com/foo.js', 'URL is not correct');
    assert.strictEqual(splitResult.lineNumber, 14, 'line number is incorrect');
    assert.strictEqual(splitResult.columnNumber, undefined, 'column number is incorrect');
  });

  it('uses the splitLineAndColumn function to return the line and column numbers if the URL contains them', () => {
    const stringTest = 'http://www.example.com:15:20';
    const splitResult = ParsedURL.splitLineAndColumn(stringTest);
    assert.strictEqual(splitResult.url, 'http://www.example.com', 'URL is not correct');
    assert.strictEqual(splitResult.lineNumber, 14, 'line number is incorrect');
    assert.strictEqual(splitResult.columnNumber, 19, 'column number is incorrect');
  });

  it('uses the splitLineAndColumn function to return the line and column numbers if the URL contains them and has a port number',
     () => {
       const stringTest = 'http://www.example.com:8080:15:20';
       const splitResult = ParsedURL.splitLineAndColumn(stringTest);
       assert.strictEqual(splitResult.url, 'http://www.example.com:8080', 'URL is not correct');
       assert.strictEqual(splitResult.lineNumber, 14, 'line number is incorrect');
       assert.strictEqual(splitResult.columnNumber, 19, 'column number is incorrect');
     });

  it('uses the removeWasmFunctionInfoFromURL function to return unmodified URL if not pointing to a wasm source',
     () => {
       const stringTest = 'http://www.example.com:15:20';
       const url = ParsedURL.removeWasmFunctionInfoFromURL(stringTest);
       assert.strictEqual(url, 'http://www.example.com:15:20', 'URL is not correct');
     });

  it('uses the removeWasmFunctionInfoFromURL function to return the wasm unmodified URL if it points to a wasm source',
     () => {
       const stringTest = 'http://www.example.com/example.wasm:wasm-function[0]:0x3e';
       const url = ParsedURL.removeWasmFunctionInfoFromURL(stringTest);
       assert.strictEqual(url, 'http://www.example.com/example.wasm', 'URL is not correct');
     });

  it('uses the removeWasmFunctionInfoFromURL function to return the wasm unmodified URL if it points to a wasm source with port number',
     () => {
       const stringTest = 'http://www.example.com:8080/example.wasm:wasm-function[0]:0x3e';
       const url = ParsedURL.removeWasmFunctionInfoFromURL(stringTest);
       assert.strictEqual(url, 'http://www.example.com:8080/example.wasm', 'URL is not correct');
     });

  it('uses the isRelativeURL function to return true if the URL is relative', () => {
    assert.isTrue(ParsedURL.isRelativeURL('/test/path'));
    assert.isTrue(ParsedURL.isRelativeURL('C:/'));
    assert.isTrue(ParsedURL.isRelativeURL('C'));
  });

  it('uses the isRelativeURL function to return false if the URL is not relative', () => {
    assert.isFalse(ParsedURL.isRelativeURL('http://www.example.com/test/path'));
    assert.isFalse(ParsedURL.isRelativeURL('about:blank'));
    assert.isFalse(ParsedURL.isRelativeURL('file:///C:/'));
  });

  it('uses the displayName function to return the name if it exists for a URL', () => {
    const parsedUrl = new ParsedURL('http://www.example.com');
    assert.strictEqual(parsedUrl.displayName, 'www.example.com/', 'name returned is incorrect');
  });

  it('uses the displayName function to return the name for a data URL', () => {
    const parsedUrl = new ParsedURL('data:www.example.com');
    assert.strictEqual(parsedUrl.displayName, 'data:www.example.com', 'name returned is incorrect');
  });

  it('uses the displayName function to return the name for a blob URL', () => {
    const parsedUrl = new ParsedURL('blob:www.example.com');
    assert.strictEqual(parsedUrl.displayName, 'blob:www.example.com', 'name returned is incorrect');
  });

  it('uses the displayName function to return the name for an about:blank URL', () => {
    const parsedUrl = new ParsedURL('about:blank');
    assert.strictEqual(parsedUrl.displayName, 'about:blank', 'name returned is incorrect');
  });

  it('uses the displayName function to return the name for a URL with a last path component', () => {
    const parsedUrl = new ParsedURL('http://www.example.com/test');
    assert.strictEqual(parsedUrl.displayName, 'test', 'name returned is incorrect');
  });

  it('uses the displayName function to return the name for a a slash', () => {
    const parsedUrl = new ParsedURL('/');
    assert.strictEqual(parsedUrl.displayName, '/', 'name returned is incorrect');
  });

  it('uses the displayName function to return the name for a URL that already has a display name set', () => {
    const parsedUrl = new ParsedURL('http://www.example.com');
    assert.strictEqual(parsedUrl.displayName, 'www.example.com/', 'name returned is incorrect');
    assert.strictEqual(parsedUrl.displayName, 'www.example.com/', 'name returned is incorrect');
  });

  it('uses the dataURLDisplayName function to return data URL display name if it is not already set', () => {
    const parsedUrl = new ParsedURL('http://www.example.com');
    assert.strictEqual(parsedUrl.dataURLDisplayName(), '', 'data URL display name is returned incorrectly');
  });

  it('uses the dataURLDisplayName function to return data URL display name if it is already set', () => {
    const parsedUrl = new ParsedURL('data:http://www.example.com');
    assert.strictEqual(
        parsedUrl.dataURLDisplayName(), 'data:http://www.exa…', 'data URL display name is returned incorrectly');
    assert.strictEqual(
        parsedUrl.dataURLDisplayName(), 'data:http://www.exa…', 'data URL display name is returned incorrectly');
  });

  it('uses the lastPathComponentWithFragment function to return for a URL without a path', () => {
    const parsedUrl = new ParsedURL('http://www.example.com');
    assert.strictEqual(
        parsedUrl.lastPathComponentWithFragment(), '', 'last path component with fragmen returned is incorrect');
  });

  it('uses the lastPathComponentWithFragment function to return for a URL with a path', () => {
    const parsedUrl = new ParsedURL('http://www.example.com/test/path');
    assert.strictEqual(
        parsedUrl.lastPathComponentWithFragment(), 'path', 'last path component with fragmen returned is incorrect');
  });

  it('uses the lastPathComponentWithFragment function to return for a URL with a path and trailing slash', () => {
    const parsedUrl = new ParsedURL('http://www.example.com/test/path/');
    assert.strictEqual(
        parsedUrl.lastPathComponentWithFragment(), 'path/', 'last path component with fragmen returned is incorrect');
  });

  it('uses the lastPathComponentWithFragment function to return for a URL with a path and a fragment', () => {
    const parsedUrl = new ParsedURL('http://www.example.com/test/path#testFragment');
    assert.strictEqual(
        parsedUrl.lastPathComponentWithFragment(), 'path#testFragment',
        'last path component with fragmen returned is incorrect');
  });

  it('returns the domain for a data URL', () => {
    const parsedUrl = new ParsedURL('data:http://www.example.com');
    assert.strictEqual(parsedUrl.domain(), 'data:', 'domain returned was incorrect');
  });

  it('returns the domain for an http URL without a port', () => {
    const parsedUrl = new ParsedURL('http://www.example.com');
    assert.strictEqual(parsedUrl.domain(), 'www.example.com', 'domain returned was incorrect');
  });

  it('returns the domain for an http URL with a port', () => {
    const parsedUrl = new ParsedURL('http://www.example.com:8080');
    assert.strictEqual(parsedUrl.domain(), 'www.example.com:8080', 'domain returned was incorrect');
  });

  it('returns the security origin for a data URL', () => {
    const parsedUrl = new ParsedURL('data:http://www.example.com');
    assert.strictEqual(parsedUrl.securityOrigin(), 'data:', 'security origin returned was incorrect');
  });

  it('returns the security origin for a blob URL', () => {
    const parsedUrl = new ParsedURL('blob:http://www.example.com');
    assert.strictEqual(parsedUrl.securityOrigin(), 'http://www.example.com', 'security origin returned was incorrect');
  });

  it('returns the security origin for an http URL', () => {
    const parsedUrl = new ParsedURL('http://www.example.com');
    assert.strictEqual(parsedUrl.securityOrigin(), 'http://www.example.com', 'security origin returned was incorrect');
  });

  it('returns the url without scheme for a URL that has a scheme', () => {
    const parsedUrl = new ParsedURL('http://www.example.com');
    assert.strictEqual(parsedUrl.urlWithoutScheme(), 'www.example.com', 'URL without scheme returned was incorrect');
  });

  it('returns the url without scheme for a URL that does not have a scheme', () => {
    const parsedUrl = new ParsedURL('www.example.com');
    assert.strictEqual(parsedUrl.urlWithoutScheme(), 'www.example.com', 'URL without scheme returned was incorrect');
  });

  it('returns the correct results for all ported web_tests unit tests', () => {
    assertEqualUrlStringString(
        ParsedURL.completeURL(
            'http://example.com/script.js' as Platform.DevToolsPath.UrlString, 'http://example.com/map.json'),
        'http://example.com/map.json');
    assertEqualUrlStringString(
        ParsedURL.completeURL('http://example.com/script.js' as Platform.DevToolsPath.UrlString, '/map.json'),
        'http://example.com/map.json');
    assertEqualUrlStringString(
        ParsedURL.completeURL(
            'http://example.com/scripts/script.js' as Platform.DevToolsPath.UrlString, '../maps/map.json'),
        'http://example.com/maps/map.json');

    const baseURL = 'http://a/b/c/d;p?q' as Platform.DevToolsPath.UrlString;

    assertEqualUrlStringString(ParsedURL.completeURL(baseURL, 'http://h'),
                               'http://h/');  // modified from RFC3986
    assertEqualUrlStringString(ParsedURL.completeURL(baseURL, 'g'), 'http://a/b/c/g');
    assertEqualUrlStringString(ParsedURL.completeURL(baseURL, './g'), 'http://a/b/c/g');
    assertEqualUrlStringString(ParsedURL.completeURL(baseURL, 'g/'), 'http://a/b/c/g/');
    assertEqualUrlStringString(ParsedURL.completeURL(baseURL, '/g'), 'http://a/g');
    assertEqualUrlStringString(ParsedURL.completeURL(baseURL, '//g'), 'http://g');
    assertEqualUrlStringString(ParsedURL.completeURL(baseURL, '?y'), 'http://a/b/c/d;p?y');
    assertEqualUrlStringString(ParsedURL.completeURL(baseURL, 'g?y'), 'http://a/b/c/g?y');
    assertEqualUrlStringString(ParsedURL.completeURL(baseURL, '#s'), 'http://a/b/c/d;p?q#s');
    assertEqualUrlStringString(ParsedURL.completeURL(baseURL, 'g#s'), 'http://a/b/c/g#s');
    assertEqualUrlStringString(ParsedURL.completeURL(baseURL, 'g?y#s'), 'http://a/b/c/g?y#s');
    assertEqualUrlStringString(ParsedURL.completeURL(baseURL, ';x'), 'http://a/b/c/;x');
    assertEqualUrlStringString(ParsedURL.completeURL(baseURL, 'g;x'), 'http://a/b/c/g;x');
    assertEqualUrlStringString(ParsedURL.completeURL(baseURL, 'g;x?y#s'), 'http://a/b/c/g;x?y#s');
    assertEqualUrlStringString(ParsedURL.completeURL(baseURL, 'g;x=1/./y'), 'http://a/b/c/g;x=1/y');
    assertEqualUrlStringString(ParsedURL.completeURL(baseURL, 'g;x=1/../y'), 'http://a/b/c/y');
    assertEqualUrlStringString(ParsedURL.completeURL(baseURL, 'g?y/./x'), 'http://a/b/c/g?y/./x');
    assertEqualUrlStringString(ParsedURL.completeURL(baseURL, 'g?y/../x'), 'http://a/b/c/g?y/../x');
    assertEqualUrlStringString(ParsedURL.completeURL(baseURL, 'g#s/./x'), 'http://a/b/c/g#s/./x');
    assertEqualUrlStringString(ParsedURL.completeURL(baseURL, 'g#s/../x'), 'http://a/b/c/g#s/../x');

    assertEqualUrlStringString(
        ParsedURL.completeURL('http://a/b/c/d;p?q' as Platform.DevToolsPath.UrlString, '//secure.com/moo'),
        'http://secure.com/moo');
    assertEqualUrlStringString(
        ParsedURL.completeURL('http://a/b/c/d;p?q' as Platform.DevToolsPath.UrlString, 'cat.jpeg'),
        'http://a/b/c/cat.jpeg');
    assertEqualUrlStringString(
        ParsedURL.completeURL('http://example.com/path.css?query#fragment' as Platform.DevToolsPath.UrlString, ''),
        'http://example.com/path.css?query');
  });

  it('encodes partial path', () => {
    const pathTest = 'path/with%20escape/and spaces' as Platform.DevToolsPath.RawPathString;
    const encodedPath = 'path/with%2520escape/and%20spaces';
    const convertedPath = ParsedURL.rawPathToEncodedPathString(pathTest);
    assert.strictEqual(convertedPath, encodedPath, 'path was not converted successfully');
  });

  it('decodes partial path', () => {
    const pathTest = 'path/with%20escape/and spaces';
    const encodedPath = 'path/with%2520escape/and%20spaces' as Platform.DevToolsPath.EncodedPathString;
    const convertedPath = ParsedURL.encodedPathToRawPathString(encodedPath);
    assert.strictEqual(convertedPath, pathTest, 'path was not converted successfully');
  });

  it('encodes, decodes partial path with email address', () => {
    const pathTest = 'username:password@example.com' as Platform.DevToolsPath.RawPathString;  // valid filename on unix
    const encodedPath = ParsedURL.rawPathToEncodedPathString(pathTest);
    assert.strictEqual(pathTest, encodedPath as string, 'changed during escaping');
    const convertedPath = ParsedURL.encodedPathToRawPathString(encodedPath);
    assert.strictEqual(convertedPath, pathTest, 'path was not converted successfully');
  });

  it('encodes, decodes partial path', () => {
    const pathTest = 'C:/Program%20Files/Google' as Platform.DevToolsPath.RawPathString;
    const encodedPath = ParsedURL.rawPathToEncodedPathString(pathTest);
    const convertedPath = ParsedURL.encodedPathToRawPathString(encodedPath);
    assert.strictEqual(convertedPath, pathTest, 'path was not converted successfully');
  });

  it('encodes, decodes partial path with whitespace', () => {
    const pathTest = 'C:/Program Files/Google' as Platform.DevToolsPath.RawPathString;
    const encodedPath = ParsedURL.rawPathToEncodedPathString(pathTest);
    const convertedPath = ParsedURL.encodedPathToRawPathString(encodedPath);
    assert.strictEqual(convertedPath, pathTest, 'path was not converted successfully');
  });

  it('encodes, decodes absolute path', () => {
    const pathTest = '/C:/Program%20Files/Google' as Platform.DevToolsPath.RawPathString;
    const encodedPath = ParsedURL.rawPathToEncodedPathString(pathTest);
    const convertedPath = ParsedURL.encodedPathToRawPathString(encodedPath);
    assert.strictEqual(convertedPath, pathTest, 'path was not converted successfully');
  });

  it('encodes, decodes absolute path with whitespace', () => {
    const pathTest = '/C:/Program Files/Google' as Platform.DevToolsPath.RawPathString;
    const encodedPath = ParsedURL.rawPathToEncodedPathString(pathTest);
    const convertedPath = ParsedURL.encodedPathToRawPathString(encodedPath);
    assert.strictEqual(convertedPath, pathTest, 'path was not converted successfully');
  });

  it('converts relative platform path and base URL to URL', () => {
    const baseUrl = 'http://localhost:8080/my%20folder/old%20path' as Platform.DevToolsPath.UrlString;
    const relativePath = 'new spaced%20name' as Platform.DevToolsPath.RawPathString;
    const convertedUrl = ParsedURL.relativePathToUrlString(relativePath, baseUrl);
    assert.strictEqual(convertedUrl, 'http://localhost:8080/my%20folder/new%20spaced%2520name');
  });

  it('converts URL to a platform path that includes drive letter and spaces on Windows', () => {
    const urlTest = 'file:///C:/Program%20Files/Google' as Platform.DevToolsPath.UrlString;
    const convertedUrl = ParsedURL.urlToRawPathString(urlTest, true);
    assert.strictEqual(convertedUrl, 'C:\\Program Files\\Google', 'URL was not converted successfully');
  });

  it('converts URL to a platform path that includes spaces and percents', () => {
    const urlTest = 'file:///home/user/with%20space/with%2520escape' as Platform.DevToolsPath.UrlString;
    const convertedUrl = ParsedURL.urlToRawPathString(urlTest, false);
    assert.strictEqual(convertedUrl, '/home/user/with space/with%20escape', 'URL was not converted successfully');
  });

  it('converts Windows platform path with spaces and percents to file url', () => {
    const urlTest = 'C:\\Program Files\\with%20escape' as Platform.DevToolsPath.RawPathString;
    const convertedUrl = ParsedURL.rawPathToUrlString(urlTest);
    assert.strictEqual(
        convertedUrl, 'file:///C:/Program%20Files/with%2520escape', 'URL was not converted successfully');
  });

  it('converts platform path with variety of special characters to URL and back consistently with Chrome', () => {
    const platformPathTest =
        '/home/a:b@c(d, e+f)=&g;#h$' as Platform.DevToolsPath.RawPathString;  // Valid filename on unix
    const urlTest = 'file:///home/a:b@c(d,%20e+f)=&g%3B%23h$' as
        Platform.DevToolsPath.UrlString;  // URL in Chrome address bar if you open that file
    assert.strictEqual(ParsedURL.rawPathToUrlString(platformPathTest), urlTest);
    assert.strictEqual(ParsedURL.urlToRawPathString(urlTest), platformPathTest);
  });
});
