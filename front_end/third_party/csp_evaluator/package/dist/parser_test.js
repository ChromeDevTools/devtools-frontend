"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("jasmine");
const parser_1 = require("./parser");
describe('Test parser', () => {
    it('CspParser', () => {
        const validCsp = 'default-src \'none\';' +
            'script-src \'nonce-unsafefoobar\' \'unsafe-eval\'   \'unsafe-inline\' \n' +
            'https://example.com/foo.js foo.bar;      ' +
            'object-src \'none\';' +
            'img-src \'self\' https: data: blob:;' +
            'style-src \'self\' \'unsafe-inline\' \'sha256-1DCfk1NYWuHMfoobarfoobar=\';' +
            'font-src *;' +
            'child-src *.example.com:9090;' +
            'upgrade-insecure-requests;\n' +
            'report-uri /csp/test';
        const parser = new (parser_1.CspParser)(validCsp);
        const parsedCsp = parser.csp;
        const directives = Object.keys(parsedCsp.directives);
        const expectedDirectives = [
            'default-src', 'script-src', 'object-src', 'img-src', 'style-src',
            'font-src', 'child-src', 'upgrade-insecure-requests', 'report-uri'
        ];
        expect(expectedDirectives)
            .toEqual(jasmine.arrayWithExactContents(directives));
        expect(['\'none\''])
            .toEqual(jasmine.arrayWithExactContents(parsedCsp.directives['default-src']));
        expect([
            '\'nonce-unsafefoobar\'', '\'unsafe-eval\'', '\'unsafe-inline\'',
            'https://example.com/foo.js', 'foo.bar'
        ])
            .toEqual(jasmine.arrayWithExactContents(parsedCsp.directives['script-src']));
        expect(['\'none\''])
            .toEqual(jasmine.arrayWithExactContents(parsedCsp.directives['object-src']));
        expect(['\'self\'', 'https:', 'data:', 'blob:'])
            .toEqual(jasmine.arrayWithExactContents(parsedCsp.directives['img-src']));
        expect([
            '\'self\'', '\'unsafe-inline\'', '\'sha256-1DCfk1NYWuHMfoobarfoobar=\''
        ])
            .toEqual(jasmine.arrayWithExactContents(parsedCsp.directives['style-src']));
        expect(['*']).toEqual(jasmine.arrayWithExactContents(parsedCsp.directives['font-src']));
        expect(['*.example.com:9090'])
            .toEqual(jasmine.arrayWithExactContents(parsedCsp.directives['child-src']));
        expect([]).toEqual(jasmine.arrayWithExactContents(parsedCsp.directives['upgrade-insecure-requests']));
        expect(['/csp/test'])
            .toEqual(jasmine.arrayWithExactContents(parsedCsp.directives['report-uri']));
    });
    it('CspParserDuplicateDirectives', () => {
        const validCsp = 'default-src \'none\';' +
            'default-src foo.bar;' +
            'object-src \'none\';' +
            'OBJECT-src foo.bar;';
        const parser = new (parser_1.CspParser)(validCsp);
        const parsedCsp = parser.csp;
        const directives = Object.keys(parsedCsp.directives);
        const expectedDirectives = ['default-src', 'object-src'];
        expect(expectedDirectives)
            .toEqual(jasmine.arrayWithExactContents(directives));
        expect(['\'none\''])
            .toEqual(jasmine.arrayWithExactContents(parsedCsp.directives['default-src']));
        expect(['\'none\''])
            .toEqual(jasmine.arrayWithExactContents(parsedCsp.directives['object-src']));
    });
    it('CspParserMixedCaseKeywords', () => {
        const validCsp = 'DEFAULT-src \'NONE\';' +
            'img-src \'sElf\' HTTPS: Example.com/CaseSensitive;';
        const parser = new (parser_1.CspParser)(validCsp);
        const parsedCsp = parser.csp;
        const directives = Object.keys(parsedCsp.directives);
        const expectedDirectives = ['default-src', 'img-src'];
        expect(expectedDirectives)
            .toEqual(jasmine.arrayWithExactContents(directives));
        expect(['\'none\''])
            .toEqual(jasmine.arrayWithExactContents(parsedCsp.directives['default-src']));
        expect(['\'self\'', 'https:', 'Example.com/CaseSensitive'])
            .toEqual(jasmine.arrayWithExactContents(parsedCsp.directives['img-src']));
    });
    it('NormalizeDirectiveValue', () => {
        expect(parser_1.TEST_ONLY.normalizeDirectiveValue('\'nOnE\'')).toBe('\'none\'');
        expect(parser_1.TEST_ONLY.normalizeDirectiveValue('\'nonce-aBcD\''))
            .toBe('\'nonce-aBcD\'');
        expect(parser_1.TEST_ONLY.normalizeDirectiveValue('\'hash-XyZ==\''))
            .toBe('\'hash-XyZ==\'');
        expect(parser_1.TEST_ONLY.normalizeDirectiveValue('HTTPS:')).toBe('https:');
        expect(parser_1.TEST_ONLY.normalizeDirectiveValue('example.com/TEST'))
            .toBe('example.com/TEST');
    });
});
//# sourceMappingURL=parser_test.js.map