// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as FormatterWorker from './formatter_worker.js';

function formatCSS(text: string): string {
  return FormatterWorker.FormatterWorker.format('text/css', text, '  ').content;
}

describe('CSSFormatter', () => {
  it('formats simple selector correctly', () => {
    const formattedCode = formatCSS('a{color:red;}');
    assert.strictEqual(formattedCode, `a {
  color: red;
}
`);
  });

  it('formats selector with quotes', () => {
    const formattedCode = formatCSS('a[href=\'/\']');
    assert.strictEqual(formattedCode, 'a[href=\'/\']');
  });

  it('formats compound selector', () => {
    const formattedCode = formatCSS('#content > a:hover');
    assert.strictEqual(formattedCode, '#content > a:hover');
  });

  it('formats color values', () => {
    const formattedCode = formatCSS(
        'p { color: color; red: red; color: #000; color: #FFF; color: #123AbC; color: #faebfe; color:papayawhip; }');
    assert.strictEqual(formattedCode, `p {
  color: color;
  red: red;
  color: #000;
  color: #FFF;
  color: #123AbC;
  color: #faebfe;
  color: papayawhip;
}
`);
  });

  it('formats important declaration', () => {
    const formattedCode = formatCSS('p { margin: -10px !important; }');
    assert.strictEqual(formattedCode, `p {
  margin: -10px !important;
}
`);
  });

  it('formats with comments correctly', () => {
    const formattedCode =
        formatCSS('a { /* pre-comment */ color /* after name */ : /* before value */ red /* post-comment */ }');
    assert.strictEqual(formattedCode, `a {
  /* pre-comment */
  color /* after name */ : /* before value */ red /* post-comment */
}
`);
  });

  it('formats media queries correctly', () => {
    const formattedCode = formatCSS(
        '@media screen{  html{color:green;foo-property:bar-value}} body{background-color:black;} @media screen,print{body{line-height:1.2}}span{line-height:10px}');
    assert.strictEqual(formattedCode, `@media screen {
  html {
    color: green;
    foo-property: bar-value
  }
}

body {
  background-color: black;
}

@media screen,print {
  body {
    line-height: 1.2
  }
}

span {
  line-height: 10px
}
`);
  });

  it('formats styles with prepending new lines correctly', () => {
    const formattedCode = formatCSS(`

div { color: red; }`);
    assert.strictEqual(formattedCode, `div {
  color: red;
}
`);
  });

  it('formats complex selectors correctly', () => {
    const formattedCode = formatCSS('a.b.c:hover,.d.e.f.g::before,h.i{color:red;}');
    assert.strictEqual(formattedCode, `a.b.c:hover,.d.e.f.g::before,h.i {
  color: red;
}
`);
  });

  it('formats font-face selectors correctly', () => {
    const formattedCode = formatCSS(
        '@font-face{font-family:MyHelvetica;src:local(\'Helvetica Neue Bold\'),local(\'HelveticaNeue-Bold\'),url(MgOpenModernaBold.ttf);font-weight:bold;}div{color:red}');
    assert.strictEqual(formattedCode, `@font-face {
  font-family: MyHelvetica;
  src: local(\'Helvetica Neue Bold\'),local(\'HelveticaNeue-Bold\'),url(MgOpenModernaBold.ttf);
  font-weight: bold;
}

div {
  color: red
}
`);
  });

  it('formats charset rule correctly', () => {
    const formattedCode = formatCSS('@charset \'iso-8859-15\';p{margin:0}');
    assert.strictEqual(formattedCode, `@charset \'iso-8859-15\';p {
  margin: 0
}
`);
  });

  it('formats import rule correctly', () => {
    const formattedCode = formatCSS('@import url(\'bluish.css\') projection,tv;span{border:1px solid black}');
    assert.strictEqual(formattedCode, `@import url(\'bluish.css\') projection,tv;span {
  border: 1px solid black
}
`);
  });

  it('formats import rule with media query correctly', () => {
    const formattedCode =
        formatCSS('@import url(\'landscape.css\') screen and (orientation:landscape);article{background:yellow}');
    assert.strictEqual(formattedCode, `@import url(\'landscape.css\') screen and (orientation: landscape);
article {
  background: yellow
}
`);
  });

  it('formats keyframes rule correctly', () => {
    const formattedCode = formatCSS(
        'p{animation-duration:3s;}@keyframes slidein{from{margin-left:100%;width:300%;}to{margin-left:0%;width:100%;}}p{animation-name:slidein}');
    assert.strictEqual(formattedCode, `p {
  animation-duration: 3s;
}

@keyframes slidein {
  from {
    margin-left: 100%;
    width: 300%;
  }

  to {
    margin-left: 0%;
    width: 100%;
  }
}

p {
  animation-name: slidein
}
`);
  });

  it('formats namespace rule correctly', () => {
    const formattedCode = formatCSS('@namespace svg url(http://www.w3.org/2000/svg);g{color:red}');
    assert.strictEqual(formattedCode, `@namespace svg url(http://www.w3.org/2000/svg);g {
  color: red
}
`);
  });

  it('formats page rule correctly', () => {
    const formattedCode = formatCSS('@page :first{margin:2in 3in;}span{color:blue}');
    assert.strictEqual(formattedCode, `@page :first {
  margin: 2in 3in;
}

span {
  color: blue
}
`);
  });

  it('formats supports rule correctly', () => {
    const formattedCode = formatCSS('@supports(--foo:green){body{color:green;}}#content{font-size:14px}');
    assert.strictEqual(formattedCode, `@supports(--foo: green) {
  body {
    color:green;
  }
}

#content {
  font-size: 14px
}
`);
  });

  it('formats css-variable definitions and usages correctly', () => {
    const formattedCode = formatCSS('html { --foo: bar; --color: red; background-color: var(--foo); }');
    assert.strictEqual(formattedCode, `html {
  --foo: bar;
  --color: red;
  background-color: var(--foo);
}
`);
  });

  it('formats font shorthand with line-height slash and unquoted url path without inserting extra space after slash',
     () => {
       const formattedCode = formatCSS('p { font: 16px/1.5em sans-serif; background: url(images/bg.png); }');
       assert.strictEqual(formattedCode, `p {
  font: 16px/1.5em sans-serif;
  background: url(images/bg.png);
}
`);
     });

  it('parses CSS outline rules including @import, @media, @keyframes, @font-face, and style rules', () => {
    const cssText = [
      '@import url("theme.css") screen;',
      '@font-face { font-family: "OpenSans"; src: url("OpenSans.woff2"); }',
      'body, .main { color: red; /* display: none; */ }',
      '@media (min-width: 768px) {',
      '  .container { width: 750px; }',
      '}',
      '@keyframes fade {',
      '  from { opacity: 0; }',
      '  to { opacity: 1; }',
      '}',
    ].join('\n');

    const parsedRules: Array<Record<string, unknown>> = [];
    FormatterWorker.CSSRuleParser.parseCSS(cssText, chunk => {
      parsedRules.push(...(chunk.chunk as unknown as Array<Record<string, unknown>>));
    });

    assert.deepEqual(
        parsedRules.map(
            rule => ({
              selectorText: rule.selectorText,
              atRule: rule.atRule,
              properties: (rule.properties as Array<{name: string, value: string, disabled?: boolean}>| undefined)
                              ?.map(p => ({name: p.name, value: p.value.trim(), disabled: Boolean(p.disabled)})),
            })),
        [
          {
            selectorText: undefined,
            atRule: '@import url("theme.css") screen',
            properties: undefined,
          },
          {
            selectorText: undefined,
            atRule: '@font-face',
            properties: undefined,
          },
          {
            selectorText: 'body, .main',
            atRule: undefined,
            properties: [
              {name: 'color', value: 'red', disabled: false},
              {name: 'display', value: 'none', disabled: true},
            ],
          },
          {
            selectorText: undefined,
            atRule: '@media (min-width: 768px)',
            properties: undefined,
          },
          {
            selectorText: '.container',
            atRule: undefined,
            properties: [
              {name: 'width', value: '750px', disabled: false},
            ],
          },
          {
            selectorText: undefined,
            atRule: '@keyframes fade',
            properties: undefined,
          },
          {
            selectorText: 'from',
            atRule: undefined,
            properties: [
              {name: 'opacity', value: '0', disabled: false},
            ],
          },
          {
            selectorText: 'to',
            atRule: undefined,
            properties: [
              {name: 'opacity', value: '1', disabled: false},
            ],
          },
        ]);
  });

  it('reports rule positions and property ranges in the CSS outline', () => {
    const cssText = `
@import url("some-url-to-load-css.css") print;
@charset "ISO-8859-15";
@namespace svg url(http://www.w3.org/2000/svg);
@font-face {
    font-family: "Example Font";
    src: url("/fonts/example");
}

@page {
    margin: 1in 1.5in;
}
@page :right {
    margin-right: 5cm; /* right pages only */
}
@page :first {
    margin-top: 8cm; /* extra top margin on the first page */
}

div { color: red }
#fluffy {
    border: 1px solid black;
    z-index: 1;
    /* -webkit-disabled-property: rgb(1, 2, 3) */
}
input:-moz-placeholder { text-overflow: ellipsis; }
.class-name, p /* style all paragraphs as well */ {
    border-color: blue;
    -lol-cats: "dogs" /* unexisting property */
}

@keyframes identifier {
    0% { top: 0; left: 0; }
    30% { top: 50px; }
    68%, 72% { left: 50px; }
    100% { top: 100px; left: 100%; }
}

svg|a {
    text-decoration: underline;
}

@media (max-width:500px) {
    span {
/*      font-family: Times New Roman; */
        -webkit-border-radius: 10px;
        font-family: "Example Font"
    }
}
`;

    const range = (startLine: number, startColumn: number, endLine: number, endColumn: number) =>
        ({startLine, startColumn, endLine, endColumn});
    const property =
        (name: string, nameRange: ReturnType<typeof range>, value: string, valueRange: ReturnType<typeof range>,
         propertyRange: ReturnType<typeof range>, disabled?: boolean) => ({
          name,
          nameRange,
          value,
          valueRange,
          range: propertyRange,
          ...(disabled ? {disabled} : {}),
        });

    const parsedRules: unknown[] = [];
    let chunkCount = 0;
    let sawLastChunk = false;
    FormatterWorker.CSSRuleParser.parseCSS(cssText, ({chunk, isLastChunk}) => {
      parsedRules.push(...chunk);
      chunkCount++;
      sawLastChunk = isLastChunk;
    });
    assert.isAbove(chunkCount, 0);
    assert.isTrue(sawLastChunk);

    assert.deepEqual(parsedRules, [
      {atRule: '@import url("some-url-to-load-css.css") print', lineNumber: 1, columnNumber: 0},
      {atRule: '@charset "ISO-8859-15"', lineNumber: 2, columnNumber: 0},
      {atRule: '@namespace svg url(http://www.w3.org/2000/svg)', lineNumber: 3, columnNumber: 0},
      {atRule: '@font-face', lineNumber: 4, columnNumber: 0},
      {atRule: '@page', lineNumber: 9, columnNumber: 0},
      {atRule: '@page :right', lineNumber: 12, columnNumber: 0},
      {atRule: '@page :first', lineNumber: 15, columnNumber: 0},
      {
        selectorText: 'div',
        lineNumber: 19,
        columnNumber: 0,
        styleRange: range(19, 5, 19, 17),
        properties: [
          property('color', range(19, 6, 19, 11), ' red ', range(19, 12, 19, 17), range(19, 6, 19, 17)),
        ],
      },
      {
        selectorText: '#fluffy',
        lineNumber: 20,
        columnNumber: 0,
        styleRange: range(20, 9, 24, 0),
        properties: [
          property('border', range(21, 4, 21, 10), ' 1px solid black', range(21, 11, 21, 27), range(21, 4, 21, 28)),
          property('z-index', range(22, 4, 22, 11), ' 1', range(22, 12, 22, 14), range(22, 4, 22, 15)),
          property('-webkit-disabled-property', range(23, 7, 23, 32), ' rgb(1, 2, 3) ', range(23, 33, 23, 47),
                   range(23, 4, 23, 49), true),
        ],
      },
      {
        selectorText: 'input:-moz-placeholder',
        lineNumber: 25,
        columnNumber: 0,
        styleRange: range(25, 24, 25, 50),
        properties: [
          property('text-overflow', range(25, 25, 25, 38), ' ellipsis', range(25, 39, 25, 48), range(25, 25, 25, 49)),
        ],
      },
      {
        // The comment inside the selector list is kept as part of the selector text.
        selectorText: '.class-name, p /* style all paragraphs as well */',
        lineNumber: 26,
        columnNumber: 0,
        styleRange: range(26, 51, 29, 0),
        properties: [
          property('border-color', range(27, 4, 27, 16), ' blue', range(27, 17, 27, 22), range(27, 4, 27, 23)),
          property('-lol-cats', range(28, 4, 28, 13), ' "dogs" \n', range(28, 14, 29, 0), range(28, 4, 29, 0)),
        ],
      },
      // Keyframe selectors ('0%', '68%, 72%', ...) do not produce outline entries.
      {atRule: '@keyframes identifier', lineNumber: 31, columnNumber: 0},
      {
        selectorText: 'svg|a',
        lineNumber: 38,
        columnNumber: 0,
        styleRange: range(38, 7, 40, 0),
        properties: [
          property('text-decoration', range(39, 4, 39, 19), ' underline', range(39, 20, 39, 30), range(39, 4, 39, 31)),
        ],
      },
      {atRule: '@media (max-width:500px)', lineNumber: 42, columnNumber: 0},
      {
        selectorText: 'span',
        lineNumber: 43,
        columnNumber: 4,
        styleRange: range(43, 10, 47, 4),
        properties: [
          property('font-family', range(44, 8, 44, 19), ' Times New Roman', range(44, 20, 44, 36), range(44, 0, 44, 40),
                   true),
          property('-webkit-border-radius', range(45, 8, 45, 29), ' 10px', range(45, 30, 45, 35), range(45, 8, 45, 36)),
          property('font-family', range(46, 8, 46, 19), ' "Example Font"\n    ', range(46, 20, 47, 4),
                   range(46, 8, 47, 4)),
        ],
      },
    ]);
  });
});
