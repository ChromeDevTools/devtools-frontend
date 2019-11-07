// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../front_end/common/common.js';

describe('Parsed URL', () => {
  it('recognizes valid URLs', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('http://www.example.com/');
    assert.isTrue(parsedUrl.isValid, 'the URL should be valid');
  });

  it('recognizes the URL elements', () => {
    const parsedUrl =
        new Common.ParsedURL.ParsedURL('http://username@www.example.com:8080/testing/test?isTest=true#testFragment');
    assert.isTrue(parsedUrl.isValid, 'the URL should be valid');
    assert.equal(
        parsedUrl.url, 'http://username@www.example.com:8080/testing/test?isTest=true#testFragment',
        'URL value is incorrect');
    assert.equal(parsedUrl.scheme, 'http', 'URL scheme is incorrect');
    assert.equal(parsedUrl.user, 'username', 'URL user is incorrect');
    assert.equal(parsedUrl.host, 'www.example.com', 'URL host is incorrect');
    assert.equal(parsedUrl.port, '8080', 'URL port is incorrect');
    assert.equal(parsedUrl.path, '/testing/test', 'URL path is incorrect');
    assert.equal(parsedUrl.queryParams, 'isTest=true', 'URL query params are incorrect');
    assert.equal(parsedUrl.fragment, 'testFragment', 'URL fragment is incorrect');
    assert.equal(parsedUrl.folderPathComponents, '/testing', 'URL folder path components are incorrect');
    assert.equal(parsedUrl.lastPathComponent, 'test', 'URL last path component is incorrect');
  });

  it('recognizes a valid blob URL', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('blob:http://www.example.com/');
    assert.isTrue(parsedUrl.isValid, 'the URL should be valid');
    assert.equal(parsedUrl.scheme, 'blob', 'the URL scheme is not blob');
    assert.equal(parsedUrl._blobInnerScheme, 'http', 'the URL inner scheme is not http');
  });

  it('parses a URL with no path', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('http://www.example.com');
    assert.isTrue(parsedUrl.isValid, 'the URL should be valid');
    assert.equal(parsedUrl.path, '/', 'path is not a single slash ("/")');
  });

  it('parses a data URL', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('data:test');
    assert.isFalse(parsedUrl.isValid, 'the URL should not be valid');
    assert.equal(parsedUrl.scheme, 'data', 'the URL scheme is not data');
  });

  it('recognizes an invalid blob URL', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('blob:test');
    assert.isFalse(parsedUrl.isValid, 'the URL should not be valid');
    assert.equal(parsedUrl.scheme, 'blob', 'the URL scheme is not blob');
  });

  it('recognizes an invalid blank URL', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('about:blank');
    assert.isFalse(parsedUrl.isValid, 'the URL should not be valid');
    assert.equal(parsedUrl.scheme, 'about', 'the URL scheme is not blob');
  });

  it('recognizes an invalid URL', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('abc');
    assert.isFalse(parsedUrl.isValid, 'the URL should not be valid');
    assert.equal(parsedUrl.url, 'abc', 'URL value is incorrect');
  });

  it('converts platform path to a URL that does not start with "file://"', () => {
    const platformPathTest = 'usr/lib';
    const convertedUrl = Common.ParsedURL.ParsedURL.platformPathToURL(platformPathTest);
    assert.equal(convertedUrl, 'file:///usr/lib', 'URL was not converted correctly');
  });

  it('converts platform path to a URL that does not start with "file://" but starts with a slash ("/")', () => {
    const platformPathTest = '/usr/lib';
    const convertedUrl = Common.ParsedURL.ParsedURL.platformPathToURL(platformPathTest);
    assert.equal(convertedUrl, 'file:///usr/lib', 'URL was not converted correctly');
  });

  it('converts platform path to a URL that starts with "file://"', () => {
    const platformPathTest = 'file://usr/lib';
    const convertedUrl = Common.ParsedURL.ParsedURL.platformPathToURL(platformPathTest);
    assert.equal(convertedUrl, 'file://usr/lib', 'URL was not converted correctly');
  });

  it('converts URL to a platform path that starts with "file://"', () => {
    const urlTest = 'file://usr/lib';
    const convertedUrl = Common.ParsedURL.ParsedURL.urlToPlatformPath(urlTest);
    assert.equal(convertedUrl, 'usr/lib', 'URL was not converted successfully');
  });

  it('converts URL to a platform path that starts with "file:///" on Windows', () => {
    const urlTest = 'file:///usr/lib';
    const convertedUrl = Common.ParsedURL.ParsedURL.urlToPlatformPath(urlTest, true);
    assert.equal(convertedUrl, 'usr\\lib', 'URL was not converted successfully');
  });

  it('converts URL with a hash to a URL without a hash', () => {
    const urlTest = 'http://www.example.com#test';
    const convertedUrl = Common.ParsedURL.ParsedURL.urlWithoutHash(urlTest);
    assert.equal(convertedUrl, 'http://www.example.com', 'URL was not converted successfully');
  });

  it('returns URL without a hash as it is', () => {
    const urlTest = 'http://www.example.com';
    const convertedUrl = Common.ParsedURL.ParsedURL.urlWithoutHash(urlTest);
    assert.equal(convertedUrl, urlTest, 'URL was changed');
  });

  it('extracts the path from a valid URL', () => {
    const urlTest = 'http://www.example.com/test/path';
    const extractedPath = Common.ParsedURL.ParsedURL.extractPath(urlTest);
    assert.equal(extractedPath, '/test/path', 'path extracted incorrectly');
  });

  it('returns an empty string as a path if the URL is not valid', () => {
    const urlTest = 'www.example.com/test/path';
    const extractedPath = Common.ParsedURL.ParsedURL.extractPath(urlTest);
    assert.equal(extractedPath, '', 'did not return an empty path');
  });

  it('extracts the origin from a valid URL', () => {
    const urlTest = 'http://www.example.com/test/path';
    const extractedOrigin = Common.ParsedURL.ParsedURL.extractOrigin(urlTest);
    assert.equal(extractedOrigin, 'http://www.example.com', 'origin extracted incorrectly');
  });

  it('returns an empty string as a origin if the URL is not valid', () => {
    const urlTest = 'www.example.com/test/path';
    const extractedOrigin = Common.ParsedURL.ParsedURL.extractOrigin(urlTest);
    assert.equal(extractedOrigin, '', 'did not return an empty path');
  });

  it('extracts the extension from a valid URL with a hash', () => {
    const urlTest = 'http://www.example.com/test/testFile.html#testHash';
    const extractedExt = Common.ParsedURL.ParsedURL.extractExtension(urlTest);
    assert.equal(extractedExt, 'html', 'extension extracted incorrectly');
  });

  it('extracts the extension from a valid URL with a question mark', () => {
    const urlTest = 'http://www.example.com/test/testFile.html?testParam=t';
    const extractedExt = Common.ParsedURL.ParsedURL.extractExtension(urlTest);
    assert.equal(extractedExt, 'html', 'extension extracted incorrectly');
  });

  it('extracts the extension from a valid URL that does not have slashes', () => {
    const urlTest = 'testFile.html';
    const extractedExt = Common.ParsedURL.ParsedURL.extractExtension(urlTest);
    assert.equal(extractedExt, 'html', 'extension extracted incorrectly');
  });

  it('extracts the extension from a valid URL that has a percent sign', () => {
    const urlTest = 'http://www.example.com/test/path.html%20';
    const extractedExt = Common.ParsedURL.ParsedURL.extractExtension(urlTest);
    assert.equal(extractedExt, 'html', 'extension extracted incorrectly');
  });

  it('returns an empty string when trying to extract extension from an invalid URL', () => {
    const urlTest = 'http://html';
    const extractedExt = Common.ParsedURL.ParsedURL.extractExtension(urlTest);
    assert.equal(extractedExt, '', 'extension extracted incorrectly');
  });

  it('is able to extract name from a valid URL', () => {
    const urlTest = 'http://www.example.com/test/path.html';
    const extractedName = Common.ParsedURL.ParsedURL.extractName(urlTest);
    assert.equal(extractedName, 'path.html', 'name extracted incorrectly');
  });

  it('is able to extract name from a string without a slash', () => {
    const urlTest = 'path.html';
    const extractedName = Common.ParsedURL.ParsedURL.extractName(urlTest);
    assert.equal(extractedName, 'path.html', 'name extracted incorrectly');
  });

  it('is able to extract name from a valid URL with a query', () => {
    const urlTest = 'http://www.example.com/test/path.html?testParam=t';
    const extractedName = Common.ParsedURL.ParsedURL.extractName(urlTest);
    assert.equal(extractedName, 'path.html', 'name extracted incorrectly');
  });

  it('is able to extract name from a string without a slash and with a query', () => {
    const urlTest = 'path.html?testParam=t';
    const extractedName = Common.ParsedURL.ParsedURL.extractName(urlTest);
    assert.equal(extractedName, 'path.html', 'name extracted incorrectly');
  });

  it('uses the completeURL function to return a data URL as it is', () => {
    const hrefTest = 'data:http://www.example.com';
    const baseUrlTest = 'www.example.com';
    const completeUrl = Common.ParsedURL.ParsedURL.completeURL(baseUrlTest, hrefTest);
    assert.equal(completeUrl, hrefTest, 'complete URL is not returned correctly');
  });

  it('uses the completeURL function to return a blob URL as it is', () => {
    const hrefTest = 'blob:http://www.example.com';
    const baseUrlTest = 'www.example.com';
    const completeUrl = Common.ParsedURL.ParsedURL.completeURL(baseUrlTest, hrefTest);
    assert.equal(completeUrl, hrefTest, 'complete URL is not returned correctly');
  });

  it('uses the completeURL function to return a javascript URL as it is', () => {
    const hrefTest = 'javascript:http://www.example.com';
    const baseUrlTest = 'www.example.com';
    const completeUrl = Common.ParsedURL.ParsedURL.completeURL(baseUrlTest, hrefTest);
    assert.equal(completeUrl, hrefTest, 'complete URL is not returned correctly');
  });

  it('uses the completeURL function to return a mailto URL as it is', () => {
    const hrefTest = 'mailto:http://www.example.com';
    const baseUrlTest = 'www.example.com';
    const completeUrl = Common.ParsedURL.ParsedURL.completeURL(baseUrlTest, hrefTest);
    assert.equal(completeUrl, hrefTest, 'complete URL is not returned correctly');
  });

  it('uses the completeURL function to return absolute URLs as-is', () => {
    const hrefTest = 'http://www.example.com';
    const baseUrlTest = 'www.example.com';
    const completeUrl = Common.ParsedURL.ParsedURL.completeURL(baseUrlTest, hrefTest);
    assert.equal(completeUrl, hrefTest, 'complete URL is not returned correctly');
  });

  it('uses the completeURL function to return null for invalid href and invalid base URL', () => {
    const hrefTest = 'www.example.com';
    const baseUrlTest = 'www.example.com';
    const completeUrl = Common.ParsedURL.ParsedURL.completeURL(baseUrlTest, hrefTest);
    assert.equal(completeUrl, null, 'complete URL is not returned correctly');
  });

  it('uses the completeURL function to return the href if the base URL is a data URL', () => {
    const hrefTest = 'www.example.com';
    const baseUrlTest = 'data://www.example.com';
    const completeUrl = Common.ParsedURL.ParsedURL.completeURL(baseUrlTest, hrefTest);
    assert.equal(completeUrl, hrefTest, 'complete URL is not returned correctly');
  });

  it('uses the completeURL function to return the href with scheme if the base URL was valid and the href scheme was dropped',
     () => {
       const hrefTest = '//www.example.com';
       const baseUrlTest = 'http://www.example.com/';
       const completeUrl = Common.ParsedURL.ParsedURL.completeURL(baseUrlTest, hrefTest);
       assert.equal(completeUrl, 'http:' + hrefTest, 'complete URL is not returned correctly');
     });

  it('uses the completeURL function to resolve an empty href to a base URL without fragment', () => {
    const hrefTest = '';
    const baseUrlTest = 'http://www.example.com/?testParam=t';
    const completeUrl = Common.ParsedURL.ParsedURL.completeURL(baseUrlTest, hrefTest);
    assert.equal(completeUrl, baseUrlTest, 'complete URL is not returned correctly');
  });

  it('uses the completeURL function to resolve a fragment href to a base URL with fragment', () => {
    const hrefTest = '#testFragment';
    const baseUrlTest = 'http://www.example.com/?testParam=t';
    const completeUrl = Common.ParsedURL.ParsedURL.completeURL(baseUrlTest, hrefTest);
    assert.equal(completeUrl, baseUrlTest + hrefTest, 'complete URL is not returned correctly');
  });

  it('uses the completeURL function to resolve a parameters href to a base URL with the parameters from the href while the base URL has parameters',
     () => {
       const hrefTest = '?hrefParams=t';
       const baseUrlTest = 'http://www.example.com/?testParam=t';
       const completeUrl = Common.ParsedURL.ParsedURL.completeURL(baseUrlTest, hrefTest);
       assert.equal(completeUrl, 'http://www.example.com/' + hrefTest, 'complete URL is not returned correctly');
     });

  it('uses the completeURL function to resolve a parameters href to a base URL with the parameters from the href while the base URL does not have parameters',
     () => {
       const hrefTest = '?hrefParams=t';
       const baseUrlTest = 'http://www.example.com/';
       const completeUrl = Common.ParsedURL.ParsedURL.completeURL(baseUrlTest, hrefTest);
       assert.equal(completeUrl, baseUrlTest + hrefTest, 'complete URL is not returned correctly');
     });

  it('uses the splitLineAndColumn function to return undefined line and column numbers if the URL does not contain any',
     () => {
       const stringTest = 'http://www.example.com';
       const splitResult = Common.ParsedURL.ParsedURL.splitLineAndColumn(stringTest);
       assert.equal(splitResult.url, 'http://www.example.com', 'URL is not correct');
       assert.isUndefined(splitResult.lineNumber, 'line number is not undefined');
       assert.isUndefined(splitResult.columnNumber, 'column number is not undefined');
     });

  it('uses the splitLineAndColumn function to return the line and column numbers if the URL contains them', () => {
    const stringTest = 'http://www.example.com:15:20';
    const splitResult = Common.ParsedURL.ParsedURL.splitLineAndColumn(stringTest);
    assert.equal(splitResult.url, 'http://www.example.com', 'URL is not correct');
    assert.equal(splitResult.lineNumber, 14, 'line number is incorrect');
    assert.equal(splitResult.columnNumber, 19, 'column number is incorrect');
  });

  it('uses the splitLineAndColumn function to return the line and column numbers if the URL contains them and has a port number',
     () => {
       const stringTest = 'http://www.example.com:8080:15:20';
       const splitResult = Common.ParsedURL.ParsedURL.splitLineAndColumn(stringTest);
       assert.equal(splitResult.url, 'http://www.example.com:8080', 'URL is not correct');
       assert.equal(splitResult.lineNumber, 14, 'line number is incorrect');
       assert.equal(splitResult.columnNumber, 19, 'column number is incorrect');
     });

  it('uses the isRelativeURL function to return true if the URL is relative', () => {
    const urlTest = '/test/path';
    const isRelativeResult = Common.ParsedURL.ParsedURL.isRelativeURL(urlTest);
    assert.isTrue(isRelativeResult);
  });

  it('uses the isRelativeURL function to return false if the URL is not relative', () => {
    const urlTest = 'http://www.example.com/test/path';
    const isRelativeResult = Common.ParsedURL.ParsedURL.isRelativeURL(urlTest);
    assert.isFalse(isRelativeResult);
  });

  it('uses the displayName function to return the name if it exists for a URL', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('http://www.example.com');
    assert.equal(parsedUrl.displayName, 'www.example.com/', 'name returned is incorrect');
  });

  it('uses the displayName function to return the name for a data URL', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('data:www.example.com');
    assert.equal(parsedUrl.displayName, 'data:www.example.com', 'name returned is incorrect');
  });

  it('uses the displayName function to return the name for a blob URL', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('blob:www.example.com');
    assert.equal(parsedUrl.displayName, 'blob:www.example.com', 'name returned is incorrect');
  });

  it('uses the displayName function to return the name for an about:blank URL', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('about:blank');
    assert.equal(parsedUrl.displayName, 'about:blank', 'name returned is incorrect');
  });

  it('uses the displayName function to return the name for a URL with a last path component', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('http://www.example.com/test');
    assert.equal(parsedUrl.displayName, 'test', 'name returned is incorrect');
  });

  it('uses the displayName function to return the name for a a slash', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('/');
    assert.equal(parsedUrl.displayName, '/', 'name returned is incorrect');
  });

  it('uses the displayName function to return the name for a URL that already has a display name set', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('http://www.example.com');
    assert.equal(parsedUrl.displayName, 'www.example.com/', 'name returned is incorrect');
    assert.equal(parsedUrl.displayName, 'www.example.com/', 'name returned is incorrect');
  });

  it('uses the dataURLDisplayName function to return data URL display name if it is not already set', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('http://www.example.com');
    assert.equal(parsedUrl.dataURLDisplayName(), '', 'data URL display name is returned incorrectly');
  });

  it('uses the dataURLDisplayName function to return data URL display name if it is already set', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('data:http://www.example.com');
    assert.equal(
        parsedUrl.dataURLDisplayName(), 'data:http://www.exa…', 'data URL display name is returned incorrectly');
    assert.equal(
        parsedUrl.dataURLDisplayName(), 'data:http://www.exa…', 'data URL display name is returned incorrectly');
  });

  it('uses the lastPathComponentWithFragment function to return for a URL without a path', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('http://www.example.com');
    assert.equal(
        parsedUrl.lastPathComponentWithFragment(), '', 'last path component with fragmen returned is incorrect');
  });

  it('uses the lastPathComponentWithFragment function to return for a URL with a path', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('http://www.example.com/test/path');
    assert.equal(
        parsedUrl.lastPathComponentWithFragment(), 'path', 'last path component with fragmen returned is incorrect');
  });

  it('uses the lastPathComponentWithFragment function to return for a URL with a path and a fragment', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('http://www.example.com/test/path#testFragment');
    assert.equal(
        parsedUrl.lastPathComponentWithFragment(), 'path#testFragment',
        'last path component with fragmen returned is incorrect');
  });

  it('returns the domain for a data URL', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('data:http://www.example.com');
    assert.equal(parsedUrl.domain(), 'data:', 'domain returned was incorrect');
  });

  it('returns the domain for an http URL without a port', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('http://www.example.com');
    assert.equal(parsedUrl.domain(), 'www.example.com', 'domain returned was incorrect');
  });

  it('returns the domain for an http URL with a port', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('http://www.example.com:8080');
    assert.equal(parsedUrl.domain(), 'www.example.com:8080', 'domain returned was incorrect');
  });

  it('returns the security origin for a data URL', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('data:http://www.example.com');
    assert.equal(parsedUrl.securityOrigin(), 'data:', 'security origin returned was incorrect');
  });

  it('returns the security origin for a blob URL', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('blob:http://www.example.com');
    assert.equal(parsedUrl.securityOrigin(), 'http://www.example.com', 'security origin returned was incorrect');
  });

  it('returns the security origin for an http URL', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('http://www.example.com');
    assert.equal(parsedUrl.securityOrigin(), 'http://www.example.com', 'security origin returned was incorrect');
  });

  it('returns the url without scheme for a URL that has a scheme', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('http://www.example.com');
    assert.equal(parsedUrl.urlWithoutScheme(), 'www.example.com', 'URL without scheme returned was incorrect');
  });

  it('returns the url without scheme for a URL that does not have a scheme', () => {
    const parsedUrl = new Common.ParsedURL.ParsedURL('www.example.com');
    assert.equal(parsedUrl.urlWithoutScheme(), 'www.example.com', 'URL without scheme returned was incorrect');
  });
});
