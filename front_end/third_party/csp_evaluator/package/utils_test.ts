/**
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
 *
 * @author lwe@google.com (Lukas Weichselbaum)
 */

import 'jasmine';

import {getHostname, getSchemeFreeUrl, matchWildcardUrls} from './utils';

const TEST_BYPASSES = [
  'https://googletagmanager.com/gtm/js', 'https://www.google.com/jsapi',
  'https://ajax.googleapis.com/ajax/services/feed/load'
];

describe('Test Utils', () => {
  it('GetSchemeFreeUrl', () => {
    expect(getSchemeFreeUrl('https://*')).toBe('*');
    expect(getSchemeFreeUrl('//*')).toBe('*');
    expect(getSchemeFreeUrl('*')).toBe('*');
    expect(getSchemeFreeUrl('test//*')).toBe('test//*');
  });

  it('MatchWildcardUrlsMatchWildcardFreeHost', () => {
    const wildcardFreeHost = '//www.google.com';
    const match = matchWildcardUrls(wildcardFreeHost, TEST_BYPASSES);
    expect(match!.hostname).toBe('www.google.com');
  });

  it('MatchWildcardUrlsNoMatch', () => {
    const wildcardFreeHost = '//www.foo.bar';
    const match = matchWildcardUrls(wildcardFreeHost, TEST_BYPASSES);
    expect(match).toBeNull();
  });

  it('MatchWildcardUrlsMatchWildcardHost', () => {
    const wildcardHost = '//*.google.com';
    const match = matchWildcardUrls(wildcardHost, TEST_BYPASSES);
    expect(match!.hostname).toBe('www.google.com');
  });

  it('MatchWildcardUrlsNoMatchWildcardHost', () => {
    const wildcardHost = '//*.www.google.com';
    const match = matchWildcardUrls(wildcardHost, TEST_BYPASSES);
    expect(match).toBeNull();
  });

  it('MatchWildcardUrlsMatchWildcardHostWithPath', () => {
    const wildcardHostWithPath = '//*.google.com/jsapi';
    const match = matchWildcardUrls(wildcardHostWithPath, TEST_BYPASSES);
    expect(match!.hostname).toBe('www.google.com');
  });

  it('MatchWildcardUrlsNoMatchWildcardHostWithPath', () => {
    const wildcardHostWithPath = '//*.google.com/wrongPath';
    const match = matchWildcardUrls(wildcardHostWithPath, TEST_BYPASSES);
    expect(match).toBeNull();
  });

  it('MatchWildcardUrlsMatchHostWithPathWildcard', () => {
    const hostWithPath = '//ajax.googleapis.com/ajax/';
    const match = matchWildcardUrls(hostWithPath, TEST_BYPASSES);
    expect(match!.hostname).toBe('ajax.googleapis.com');
  });

  it('MatchWildcardUrlsNoMatchHostWithoutPathWildcard', () => {
    const hostWithPath = '//ajax.googleapis.com/ajax';
    const match = matchWildcardUrls(hostWithPath, TEST_BYPASSES);
    expect(match).toBeNull();
  });

  it('GetHostname', () => {
    expect(getHostname('https://www.google.com')).toBe('www.google.com');
  });

  it('GetHostnamePort', () => {
    expect(getHostname('https://www.google.com:8080')).toBe('www.google.com');
  });

  it('GetHostnameWildcardPort', () => {
    expect(getHostname('https://www.google.com:*')).toBe('www.google.com');
  });

  it('GetHostnameNoProtocol', () => {
    expect(getHostname('www.google.com')).toBe('www.google.com');
  });

  it('GetHostnameDoubleSlashProtocol', () => {
    expect(getHostname('//www.google.com')).toBe('www.google.com');
  });

  it('GetHostnameWildcard', () => {
    expect(getHostname('//*.google.com')).toBe('*.google.com');
  });

  it('GetHostnameWithPath', () => {
    expect(getHostname('//*.google.com/any/path')).toBe('*.google.com');
  });

  it('GetHostnameJustWildcard', () => {
    expect(getHostname('*')).toBe('*');
  });

  it('GetHostnameWildcardWithProtocol', () => {
    expect(getHostname('https://*')).toBe('*');
  });

  it('GetHostnameNonsense', () => {
    expect(getHostname('unsafe-inline')).toBe('unsafe-inline');
  });

  it('GetHostnameIPv4', () => {
    expect(getHostname('1.2.3.4')).toBe('1.2.3.4');
  });

  it('GetHostnameIPv6', () => {
    expect(getHostname('[::1]')).toBe('[::1]');
  });

  it('GetHostnameIPv4WithFullProtocol', () => {
    expect(getHostname('https://1.2.3.4')).toBe('1.2.3.4');
  });

  it('GetHostnameIPv6WithFullProtocol', () => {
    expect(getHostname('http://[::1]')).toBe('[::1]');
  });

  it('GetHostnameIPv4WithPartialProtocol', () => {
    expect(getHostname('//1.2.3.4')).toBe('1.2.3.4');
  });

  it('GetHostnameIPv6WithPartialProtocol', () => {
    expect(getHostname('//[::1]')).toBe('[::1]');
  });
});
