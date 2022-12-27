// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as CodeHighlighter from '../../../../../front_end/ui/components/code_highlighter/code_highlighter.js';

const {assert} = chai;

function parseTokens(code: string): [string, string][] {
  const token = /\[(\S+) ([^\]]+)\]/g, tokens: [string, string][] = [];
  for (let pos = 0;;) {
    const match = token.exec(code);
    const next = match ? match.index : code.length;
    if (next > pos) {
      tokens.push([code.slice(pos, next), '']);
    }
    if (!match) {
      break;
    }
    tokens.push([match[2], match[1]]);
    pos = match.index + match[0].length;
  }
  return tokens;
}

function testHighlight(code: string, mimeType: string) {
  return async () => {
    const tokens = parseTokens(code), rawCode = tokens.map(t => t[0]).join('');
    const highlighter = await CodeHighlighter.CodeHighlighter.create(rawCode, mimeType);
    let i = 0;
    highlighter.highlight((text, style): void => {
      assert.strictEqual(
          JSON.stringify([text, style.replace(/\btoken-/g, '').split(' ').sort().join('&')]),
          JSON.stringify(tokens[i++] || ['', '']));
    });
  };
}

describe('CodeHighlighter', () => {
  describe('languageFromMIMEType', () => {
    it('also supports common legacy MIME types for JavaScript', async () => {
      for (const mimeType of ['application/ecmascript', 'application/javascript', 'text/jscript']) {
        const language = await CodeHighlighter.CodeHighlighter.languageFromMIME(mimeType);
        assert.isNotNull(language, `legacy MIME type '${mimeType}' not recognized`);
      }
    });
  });

  // clang-format off
  it('can highlight JavaScript', testHighlight(`
[keyword function] [definition foo]([definition bar]) {
  [keyword return] [number 22];
}`, 'text/javascript'));

it('can highlight JavaScript compatible with CodeMirror 5', testHighlight(`
[keyword function] [definition name]([definition params]) {
  [keyword var] [definition x] = [number 1];
  [keyword const] [definition y] = [number 2];
  [keyword let] [definition z] = [number 3];
  [keyword return] [variable x] + [variable params];
}`, 'text/javascript')),

  it('can highlight TypeScript', testHighlight(`
[keyword type] [type X] = {
  [property x]: [type boolean]
}`, 'text/typescript'));

  it('can highlight JSX', testHighlight(`
[keyword function] [definition App]() {
  [keyword return] (
    <[tag div] [attribute className]=[attribute-value "App"]>
          Hello World!
    </[tag div]>);
 }`, 'text/jsx'));

  it('can highlight JSX within JavaScript files', testHighlight(`
[keyword const] [definition t] = <[tag div] [attribute disabled]>hello</[tag div]>
`, 'text/javascript'));

  it('can highlight HTML', testHighlight(`
[meta <!doctype html>]
<[tag html] [attribute lang]=[attribute-value ar]>
  ...
</[tag html]>`, 'text/html'));

  it('can highlight HTML with <script type="text/jsx"> blocks', testHighlight(`
[meta <!DOCTYPE html>]
<[tag script] [attribute type]=[attribute-value "text/jsx"]>
  [keyword const] [definition app] = [variable document].[property getElementById]([string 'app']);
  [variable ReactDOM].[property render](<[tag h1]>Develop. Preview. Ship. 🚀</[tag h1]>, [variable app]);
</[tag script]>`, 'text/html'));

  it('can highlight HTML with onclick inline JavaScript', testHighlight(`
[meta <!DOCTYPE html>]
<[tag button] [attribute onclick]=[variable handleClick]()>Click me</[tag button]>`, 'text/html'));

  it('can highlight HTML with element style', testHighlight(`
[meta <!DOCTYPE html>]
<[tag button] [attribute style]=[property color]:[atom green]]>Don't click me</[tag button]>`, 'text/html'));

it('can highlight Angular Templates', testHighlight(`
<[tag div] [attribute class]=[attribute-value "title"]>{{[variable obj].[property title]}}</[tag div]>
<[tag app-button] ([attribute clicked])=[variable onClick]()></[tag app-button]>
`, 'text/x.angular'));

  it('can highlight Svelte Templates', testHighlight(`
<[tag script]>
[keyword import] [definition Widget] [keyword from] [string './Widget.svelte'];
</[tag script]>

<[tag button] [attribute disabled]={[variable clickable]}>Click me!</[tag button]>

<[tag style]>
[tag button] {
  [property font-weight]: [atom bold];
  [property color]: [number #ff2];
}
</[tag style]>
`, 'text/x.svelte'));

  it('can highlight Vue Templates', testHighlight(`
<[tag template]>
  <[tag Header] [attribute v-show]=[attribute-value "view"] />
  <[tag Main] [attribute @hide]=[attribute-value "onHide"] />
  <[tag router-view] />
</[tag template]>`, 'text/html'));

  it('can highlight CSS', testHighlight(`
[tag span].[type cls]#[atom id] {
  [property font-weight]: [atom bold];
  [property color]: [number #ff2];
  [property width]: [number 4px];
}`, 'text/css'));

  it('can highlight GSS', testHighlight(`
[definition @component] {
  [tag foo] {
    [property color]: [keyword black];
  }
}
`, 'text/x-gss'));

  it('can highlight LESS', testHighlight(`
[definition @width]: [number 10px];
[definition @height]: [variable @width] + [number 10px];

[builtin #header] {
  [property width]: [variable @width];
  [property height]: [variable @height];
}
`, 'text/x-less'));

  it('can highlight SCSS', testHighlight(`
[definition $width]: [number 10px];
[definition $height]: [variable $width] + [number 10px];

[builtin #header] {
  [property width]: [variable $width];
  [property height]: [variable $height];
}
`, 'text/x-scss'));

  it('can highlight SASS', testHighlight(`
[variable $width]: [number 10][number px]
[variable $height]: [variable $width] + [number 10][number px]

[builtin #header]
  [property width]: [variable $width]
  [property height]: [variable $height]
`, 'text/x-sass'));

  it('can highlight WAST', testHighlight(`
([keyword module]
 ([keyword type] [variable $t] ([keyword func] ([keyword param] [type i32])))
 ([keyword func] [variable $max] [comment (; 1 ;)] ([keyword param] [variable $0] [type i32]) ([keyword result] [type i32])
   ([keyword get_local] [variable $0])))
`, 'application/wasm'));

  it('can highlight JSON', testHighlight(`
{
  [property "one"]: [number 2],
  [property "two"]: [atom true]
}`, 'application/json'));

  it('can highlight Markdown', testHighlight(`
[heading&meta #][heading  Head]

Paragraph with [emphasis&meta *][emphasis emphasized][emphasis&meta *] text.
`, 'text/markdown'));

  it('can highlight Python', testHighlight(`
[keyword def] [definition f]([variable x] = [atom True]):
  [keyword return] [variable x] [keyword *] [number 10];
`, 'text/x-python'));

it('can highlight PHP', testHighlight(`
[meta <?] [keyword echo] [string 'Hello World!']; [meta ?>]
`, 'application/x-httpd-php'));

  it('can highlight Shell code', testHighlight(`
[builtin cat] [string "a"]
`, 'text/x-sh'));

  it('can highlight Dart code', testHighlight(`
[builtin void] [variable main]() {
  [variable print]([string 'Hello, World!']);
}
`, 'application/vnd.dart'));

  it('can highlight Go code', testHighlight(`
[keyword package] [variable main]

[keyword import] [string "fmt"]

[keyword func] [variable main]() {
  [variable fmt][number .][variable Println]([string "hello world"])
}
`, 'text/x-go'));

  it('can highlight Kotlin code', testHighlight(`
[keyword fun] [definition main]([variable args] : [variable Array]<[type String]>) {
    [variable println]([string "Hello, World!"])
}
`, 'text/x-kotlin'));

  it('can highlight Scala code', testHighlight(`
[keyword object] [definition HelloWord] [keyword extends] [type App] {
  [keyword println]([string "Hello, world"])
}
`, 'text/x-scala'));

  it('can highlight Web app manifests', testHighlight(`
{
  [property "name"]: [string "Test"],
  [property "start_url"]: [string "."]
}
  `, 'application/manifest+json'));
  // clang_format on
});
