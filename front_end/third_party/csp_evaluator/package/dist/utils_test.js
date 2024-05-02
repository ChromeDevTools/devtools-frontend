"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("jasmine");
const utils_1 = require("./utils");
const TEST_BYPASSES = [
    'https://googletagmanager.com/gtm/js', 'https://www.google.com/jsapi',
    'https://ajax.googleapis.com/ajax/services/feed/load'
];
describe('Test Utils', () => {
    it('GetSchemeFreeUrl', () => {
        expect(utils_1.getSchemeFreeUrl('https://*')).toBe('*');
        expect(utils_1.getSchemeFreeUrl('//*')).toBe('*');
        expect(utils_1.getSchemeFreeUrl('*')).toBe('*');
        expect(utils_1.getSchemeFreeUrl('test//*')).toBe('test//*');
    });
    it('MatchWildcardUrlsMatchWildcardFreeHost', () => {
        const wildcardFreeHost = '//www.google.com';
        const match = utils_1.matchWildcardUrls(wildcardFreeHost, TEST_BYPASSES);
        expect(match.hostname).toBe('www.google.com');
    });
    it('MatchWildcardUrlsNoMatch', () => {
        const wildcardFreeHost = '//www.foo.bar';
        const match = utils_1.matchWildcardUrls(wildcardFreeHost, TEST_BYPASSES);
        expect(match).toBeNull();
    });
    it('MatchWildcardUrlsMatchWildcardHost', () => {
        const wildcardHost = '//*.google.com';
        const match = utils_1.matchWildcardUrls(wildcardHost, TEST_BYPASSES);
        expect(match.hostname).toBe('www.google.com');
    });
    it('MatchWildcardUrlsNoMatchWildcardHost', () => {
        const wildcardHost = '//*.www.google.com';
        const match = utils_1.matchWildcardUrls(wildcardHost, TEST_BYPASSES);
        expect(match).toBeNull();
    });
    it('MatchWildcardUrlsMatchWildcardHostWithPath', () => {
        const wildcardHostWithPath = '//*.google.com/jsapi';
        const match = utils_1.matchWildcardUrls(wildcardHostWithPath, TEST_BYPASSES);
        expect(match.hostname).toBe('www.google.com');
    });
    it('MatchWildcardUrlsNoMatchWildcardHostWithPath', () => {
        const wildcardHostWithPath = '//*.google.com/wrongPath';
        const match = utils_1.matchWildcardUrls(wildcardHostWithPath, TEST_BYPASSES);
        expect(match).toBeNull();
    });
    it('MatchWildcardUrlsMatchHostWithPathWildcard', () => {
        const hostWithPath = '//ajax.googleapis.com/ajax/';
        const match = utils_1.matchWildcardUrls(hostWithPath, TEST_BYPASSES);
        expect(match.hostname).toBe('ajax.googleapis.com');
    });
    it('MatchWildcardUrlsNoMatchHostWithoutPathWildcard', () => {
        const hostWithPath = '//ajax.googleapis.com/ajax';
        const match = utils_1.matchWildcardUrls(hostWithPath, TEST_BYPASSES);
        expect(match).toBeNull();
    });
    it('GetHostname', () => {
        expect(utils_1.getHostname('https://www.google.com')).toBe('www.google.com');
    });
    it('GetHostnamePort', () => {
        expect(utils_1.getHostname('https://www.google.com:8080')).toBe('www.google.com');
    });
    it('GetHostnameWildcardPort', () => {
        expect(utils_1.getHostname('https://www.google.com:*')).toBe('www.google.com');
    });
    it('GetHostnameNoProtocol', () => {
        expect(utils_1.getHostname('www.google.com')).toBe('www.google.com');
    });
    it('GetHostnameDoubleSlashProtocol', () => {
        expect(utils_1.getHostname('//www.google.com')).toBe('www.google.com');
    });
    it('GetHostnameWildcard', () => {
        expect(utils_1.getHostname('//*.google.com')).toBe('*.google.com');
    });
    it('GetHostnameWithPath', () => {
        expect(utils_1.getHostname('//*.google.com/any/path')).toBe('*.google.com');
    });
    it('GetHostnameJustWildcard', () => {
        expect(utils_1.getHostname('*')).toBe('*');
    });
    it('GetHostnameWildcardWithProtocol', () => {
        expect(utils_1.getHostname('https://*')).toBe('*');
    });
    it('GetHostnameNonsense', () => {
        expect(utils_1.getHostname('unsafe-inline')).toBe('unsafe-inline');
    });
    it('GetHostnameIPv4', () => {
        expect(utils_1.getHostname('1.2.3.4')).toBe('1.2.3.4');
    });
    it('GetHostnameIPv6', () => {
        expect(utils_1.getHostname('[::1]')).toBe('[::1]');
    });
    it('GetHostnameIPv4WithFullProtocol', () => {
        expect(utils_1.getHostname('https://1.2.3.4')).toBe('1.2.3.4');
    });
    it('GetHostnameIPv6WithFullProtocol', () => {
        expect(utils_1.getHostname('http://[::1]')).toBe('[::1]');
    });
    it('GetHostnameIPv4WithPartialProtocol', () => {
        expect(utils_1.getHostname('//1.2.3.4')).toBe('1.2.3.4');
    });
    it('GetHostnameIPv6WithPartialProtocol', () => {
        expect(utils_1.getHostname('//[::1]')).toBe('[::1]');
    });
});
//# sourceMappingURL=utils_test.js.map