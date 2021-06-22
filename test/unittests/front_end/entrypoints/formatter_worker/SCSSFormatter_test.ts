// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as FormatterWorker from '../../../../../front_end/entrypoints/formatter_worker/formatter_worker.js';

function formatSCSS(text: string): string {
  return FormatterWorker.FormatterWorker.format('text/x-scss', text, '  ').content;
}

describe('SCSSFormatter', () => {
  it('formats selector with quotes', () => {
    const formattedCode = formatSCSS('a[href=\'/\']');
    assert.strictEqual(formattedCode, 'a[href=\'/\']');
  });

  it('formats compound selector', () => {
    const formattedCode = formatSCSS('#content > a:hover');
    assert.strictEqual(formattedCode, '#content > a:hover');
  });

  it('formats import selector', () => {
    const formattedCode = formatSCSS('@import url(style.css);');
    assert.strictEqual(formattedCode, '@import url(style.css);');
  });

  it('formats import and compound selector', () => {
    const formattedCode = formatSCSS('@import url("style.css") projection, tv;');
    assert.strictEqual(formattedCode, '@import url("style.css") projection, tv;');
  });

  it('formats separate import and selector', () => {
    const formattedCode = formatSCSS('@import "/css/fireball_unicode.css"; html {}');
    assert.strictEqual(formattedCode, `@import "/css/fireball_unicode.css"; html {
}
`);
  });

  it('formats nested selectors in media query', () => {
    const formattedCode = formatSCSS('@media screen { body { color: red; } }');
    assert.strictEqual(formattedCode, `@media screen {
  body {
    color: red;
  }
}
`);
  });

  it('formats font-face selector', () => {
    const formattedCode = formatSCSS('@font-face { font-family: "MyHelvetica"; }');
    assert.strictEqual(formattedCode, `@font-face {
  font-family: "MyHelvetica";
}
`);
  });

  it('formats color values', () => {
    const formattedCode = formatSCSS(
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
    const formattedCode = formatSCSS('p { margin: -10px !important; }');
    assert.strictEqual(formattedCode, `p {
  margin: -10px !important;
}
`);
  });

  it('formats variable declaration and usage', () => {
    const formattedCode = formatSCSS('$margin-left: $offsetBefore + 12px + $offsetAfter;');
    assert.strictEqual(formattedCode, '$margin-left: $offsetBefore + 12px + $offsetAfter;');
  });

  it('formats nested selectors with correct indentation', () => {
    const formattedCode = formatSCSS(`$type: monster;
p {
@if $type == ocean {
color: blue;
} @else if $type == matador {
color: red;
} @else if $type == monster {
color: green;
} @else {
color: black;
}
}`);
    assert.strictEqual(formattedCode, `$type: monster; p {
  @if $type == ocean {
    color: blue;
  }

  @else if $type == matador {
    color: red;
  }

  @else if $type == monster {
    color: green;
  }

  @else {
    color: black;
  }
}
`);
  });

  it('formats for loop with variables', () => {
    const formattedCode = formatSCSS('@for $i from 1 through 3 { .item-#{$i} { width: 2em * $i; } }');
    assert.strictEqual(formattedCode, `@for $i from 1 through 3 {
  .item-# {
    $i}

  {
    width: 2em * $i;
  }
}
`);
  });

  it('formats nested mixin', () => {
    const formattedCode = formatSCSS(`@mixin adjust-location($x, $y) {
@if unitless($x) {
@warn "Assuming #{$x} to be in pixels";
$x: 1px * $x;
}
position: relative; left: $x; top: $y;
}`);
    assert.strictEqual(formattedCode, `@mixin adjust-location($x, $y) {
  @if unitless($x) {
    @warn "Assuming #{$x} to be in pixels"; $x: 1px * $x;
  }

  position: relative;
  left: $x;
  top: $y;
}
`);
  });

  it('formats for loop with variables', () => {
    const formattedCode = formatSCSS(`#navbar {
$navbar-width: 800px;
$items: 5;
$navbar-color: #ce4dd6;
width: $navbar-width;
border-bottom: 2px solid $navbar-color;
li {
@extend .notice !optional;
float: left;
width: $navbar-width/$items - 10px;
background-color: lighten($navbar-color, 20%);
&:hover {
background-color: lighten($navbar-color, 10%);
}
}
}`);
    assert.strictEqual(formattedCode, `#navbar {
  $navbar-width: 800px;
  $items: 5;
  $navbar-color: #ce4dd6;
  width: $navbar-width;
  border-bottom: 2px solid $navbar-color;
  li {
    @extend .notice !optional; float: left;
    width: $navbar-width/$items - 10px;
    background-color: lighten($navbar-color, 20%);
    &:hover {
      background-color: lighten($navbar-color, 10%);
    }
  }
}
`);
  });
});
