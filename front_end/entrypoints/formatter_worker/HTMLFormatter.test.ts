// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FormatterWorker from './formatter_worker.js';

function formatHTML(text: string): string {
  return FormatterWorker.FormatterWorker.format('text/html', text, '  ').content;
}

describe('HTMLFormatter', () => {
  it('formats simple HTML correctly', () => {
    const formattedCode = formatHTML('<html><head><title>test</title></head></html>');
    assert.strictEqual(formattedCode, `<html>
  <head>
    <title>test</title>
  </head>
</html>
`);
  });

  it('formats self-closing tags correctly', () => {
    const formattedCode = formatHTML('<html><head><meta></head><img><hr/></html>');
    assert.strictEqual(formattedCode, `<html>
  <head>
    <meta>
  </head>
  <img>
  <hr/>
</html>
`);
  });

  it('formats incorrect self-closing tags', () => {
    const formattedCode = formatHTML('<head><meta><meta></meta><br/></br><link></link><title>test</title></head>');
    assert.strictEqual(formattedCode, `<head>
  <meta>
  <meta></meta>
  <br/></br>
  <link></link>
  <title>test</title>
</head>
`);
  });

  it('formats attributes correctly', () => {
    const formattedCode = formatHTML('<body><canvas width=100 height=100 data-bad-attr=\'</canvas>\'></canvas></body>');
    assert.strictEqual(formattedCode, `<body>
  <canvas width=100 height=100 data-bad-attr=\'</canvas>\'></canvas>
</body>
`);
  });

  it('formats custom elements correctly', () => {
    const formattedCode =
        formatHTML('<body><custom-time year=2016 day=1 month=1><div>minutes/seconds</div></custom-time></body>');
    assert.strictEqual(formattedCode, `<body>
  <custom-time year=2016 day=1 month=1>
    <div>minutes/seconds</div>
  </custom-time>
</body>
`);
  });

  it('formats doctype correctly', () => {
    const formattedCode = formatHTML('<!DOCTYPE HTML><body>hello, world</body>');
    assert.strictEqual(formattedCode, `<!DOCTYPE HTML>
<body>hello, world</body>
`);
  });

  it('formats comments correctly', () => {
    const formattedCode =
        formatHTML('<!-- comment 1 --><html><!-- comment 2--><meta/><body><!-- comment 3--><a>link</a></body></html>');
    assert.strictEqual(formattedCode, `<!-- comment 1 -->
<html>
  <!-- comment 2-->
  <meta/>
  <body>
    <!-- comment 3-->
    <a>link</a>
  </body>
</html>
`);
  });

  it('formats non-javascript script tag correctly', () => {
    const formattedCode = formatHTML('<div><script type=\'text/K\'>2_&{&/x!/:2_!x}\'!R<\/script></div>');
    assert.strictEqual(formattedCode, `<div>
  <script type=\'text/K\'>
    2_&{&/x!/:2_!x}\'!R
  <\/script>
</div>
`);
  });

  it('formats lists correctly', () => {
    const formattedCode = formatHTML(
        '<ul><li>foo<li> hello <b>world</b>!<li> hello <b>world</b> <b>i\'m here</b><li>bar<li>baz<li>hello <b>world</b><li>another</ul>');
    assert.strictEqual(formattedCode, `<ul>
  <li>foo
  <li>
    hello <b>world</b>
    !
  <li>
    hello <b>world</b>
    <b>i'm here</b>
  <li>bar
  <li>baz
  <li>
    hello <b>world</b>
  <li>another
</ul>
`);
  });

  it('formats automatically closing tags correctly', () => {
    const formattedCode = formatHTML('<a>aaaa<b>bbbb1<c>cccc<d>dddd</c>bbbb2</a>');
    assert.strictEqual(formattedCode, `<a>
  aaaa
  <b>
    bbbb1
    <c>
      cccc<d>dddd
    </c>
    bbbb2
</a>
`);
  });

  it('formats a comment after a link correctly', () => {
    const formattedCode = formatHTML('<link href=\'a/b/c.css\' rel=\'stylesheet\'><!-- some comment -->');
    assert.strictEqual(formattedCode, `<link href=\'a/b/c.css\' rel=\'stylesheet\'>
<!-- some comment -->
`);
  });

  it('formats inline JavaScript classic scripts correctly', () => {
    const formattedCode = formatHTML(
        '<html><script type="text/javascript">for(var i=0;i<10;++i)console.log(\'test \'+i);<\/script></html>');
    assert.strictEqual(formattedCode, `<html>
  <script type="text/javascript">
    for (var i = 0; i < 10; ++i)
      console.log('test ' + i);
  <\/script>
</html>
`);
  });

  it('formats inline JavaScript modules correctly', () => {
    const formattedCode = formatHTML(
        '<html><script type="module">import foo from"foo";foo();</script><script type=module>bar();foo();</script></html>');
    assert.strictEqual(formattedCode, `<html>
  <script type="module">
    import foo from "foo";
    foo();
  </script>
  <script type=module>
    bar();
    foo();
  </script>
</html>
`);
  });

  it('formats inline <script>s with characters whose lower case representation is longer correctly', () => {
    const formattedCode = formatHTML('<html><script>console.log(\'İ\');</script></html>');
    assert.strictEqual(formattedCode, `<html>
  <script>
    console.log('İ');
  </script>
</html>
`);
  });

  it('formats inline <script>s with speculation rules correctly', () => {
    const formattedCode = formatHTML(
        '<html><script type="speculationrules">{"prefetch": [{"source": "list","urls": ["prefetch.html?2"]}],"prerender": [{"source": "list","urls": ["prerender.html?2"]}]}</script></html>');
    assert.strictEqual(formattedCode, `<html>
  <script type="speculationrules">
    {
      "prefetch": [
        {
          "source": "list",
          "urls": [
            "prefetch.html?2"
          ]
        }
      ],
      "prerender": [
        {
          "source": "list",
          "urls": [
            "prerender.html?2"
          ]
        }
      ]
    }</script>
</html>
`);
  });

  it('formats inline <script>s with import maps correctly', () => {
    const formattedCode = formatHTML(
        '<html><script type=importmap>{"imports": {"moment": "/node_modules/moment/src/moment.js","lodash": "/node_modules/lodash-es/lodash.js"}}</script></html>');
    assert.strictEqual(formattedCode, `<html>
  <script type=importmap>
    {
      "imports": {
        "moment": "/node_modules/moment/src/moment.js",
        "lodash": "/node_modules/lodash-es/lodash.js"
      }
    }</script>
</html>
`);
  });

  it('formats inline css correctly', () => {
    const formattedCode = formatHTML('<html><style>div{color:red;border:1px solid black;}</style></html>');
    assert.strictEqual(formattedCode, `<html>
  <style>
    div {
      color: red;
      border: 1px solid black;
    }
  </style>
</html>
`);
  });

  it('formats multiple inline formats correctly', () => {
    const formattedCode = formatHTML(`<html>
    <head>
    <meta name=\"ROBOTS\" content=\"NOODP\">
    <meta name='viewport' content='text/html'>
    <title>foobar</title>
    <body>
    <script>if(1<2){if(2<3){if(3<4){if(4<5){console.log("magic")}}}}<\/script>
    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIA...">
    <style>div{display:flex;align-items:center;justify-content:center;}body{width:100%}*{border:1px solid black}</style>
    </body>
    </html>`);
    assert.strictEqual(formattedCode, `<html>
  <head>
    <meta name=\"ROBOTS\" content=\"NOODP\">
    <meta name='viewport' content='text/html'>
    <title>foobar</title>
  <body>
    <script>
      if (1 < 2) {
        if (2 < 3) {
          if (3 < 4) {
            if (4 < 5) {
              console.log("magic")
            }
          }
        }
      }
    <\/script>
    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIA...">
    <style>
      div {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      body {
        width: 100%
      }

      * {
        border: 1px solid black
      }
    </style>
  </body>
</html>
`);
  });

  it('formats unquoted attribute values with trailing slashes correctly', () => {
    const code = `<link href=https://web.dev/ rel=canonical>
<link rel=alternate hreflang=es href=https://web.dev/i18n/es/>
`;
    assert.strictEqual(formatHTML(code), code);
  });

  it('formats inline JSON script tag correctly', () => {
    const formattedCode = formatHTML(
        '<div><script type=\'application\/json\'>{"foo":"bar","data":{"hello":"world","meaning":42}}<\/script></div>');
    assert.strictEqual(formattedCode, `<div>
  <script type=\'application/json\'>
    {
      "foo": "bar",
      "data": {
        "hello": "world",
        "meaning": 42
      }
    }<\/script>
</div>
`);
  });

  it('formats inline JSON-LD script tag correctly', () => {
    const formattedCode = formatHTML(
        '<div><script type=\'application\/ld+json\'>{  "@context": "https://json-ld.org/contexts/person.jsonld","@id": "http://dbpedia.org/resource/John_Lennon","name": "John Lennon","born": "1940-10-09","spouse": "http://dbpedia.org/resource/Cynthia_Lennon"}<\/script></div>');
    assert.strictEqual(formattedCode, `<div>
  <script type=\'application/ld+json\'>
    {
      "@context": "https://json-ld.org/contexts/person.jsonld",
      "@id": "http://dbpedia.org/resource/John_Lennon",
      "name": "John Lennon",
      "born": "1940-10-09",
      "spouse": "http://dbpedia.org/resource/Cynthia_Lennon"
    }<\/script>
</div>
`);
  });

  it('formats ampersands in text correctly', () => {
    assert.strictEqual(formatHTML('This&'), `This&
`);
    assert.strictEqual(formatHTML('Me&You'), `Me&You
`);

    const url = 'http://www.example.com/index.html?a=1&b=2&c=3&d=1234567890abcdef1234567890abcdef1';
    assert.strictEqual(formatHTML(url).trimEnd(), url);
  });

  it('formats ampersands in attribute values correctly', () => {
    assert.strictEqual(
        formatHTML('<link href="http://www.example.com/index.html?a=1&b=2">'),
        `<link href="http://www.example.com/index.html?a=1&b=2">
`);
    assert.strictEqual(
        formatHTML('<link href=http://www.example.com/index.html?a&b/>'),
        `<link href=http://www.example.com/index.html?a&b/>
`);
    assert.strictEqual(
        formatHTML('<link href=http://www.example.com/index.html?a&b/ rel=canonical>'),
        `<link href=http://www.example.com/index.html?a&b/ rel=canonical>
`);
  });
});
