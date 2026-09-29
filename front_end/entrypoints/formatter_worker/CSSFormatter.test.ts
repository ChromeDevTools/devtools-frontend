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
});
