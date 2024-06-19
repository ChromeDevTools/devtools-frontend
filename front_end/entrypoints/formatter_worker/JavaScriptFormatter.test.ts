// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FormatterWorker from './formatter_worker.js';

function formatJavaScript(text: string): string {
  return FormatterWorker.FormatterWorker.format('text/javascript', text, '  ').content;
}

describe('JavaScriptFormatter', () => {
  it('formats await expressions correctly', () => {
    const formattedCode =
        formatJavaScript('(async () => { await someFunctionThatNeedsAwaiting(); callSomeOtherFunction(); })();');
    assert.strictEqual(
        formattedCode,
        '(async () => {\n  await someFunctionThatNeedsAwaiting();\n  callSomeOtherFunction();\n}\n)();\n');
  });

  it('formats async-function expressions correctly', () => {
    const formattedCode = formatJavaScript('async function foo() {return await Promise.resolve(1);}');
    assert.strictEqual(formattedCode, `async function foo() {
  return await Promise.resolve(1);
}
`);
  });

  it('formats top-level await correctly', () => {
    const formattedCode = formatJavaScript('const myFile=await import(\n"my-file.mjs");');
    assert.strictEqual(formattedCode, 'const myFile = await import("my-file.mjs");\n');
  });

  it('formats identifiers containing escaped characters correctly', () => {
    const formattedCode = formatJavaScript(String.raw`const x=42;let \u0275_escaped;`);
    assert.strictEqual(formattedCode, 'const x = 42;\nlet \\u0275_escaped;\n');
  });

  it('formats nullish coalescing expressions correctly', () => {
    const formattedCode = formatJavaScript('false??true');
    assert.strictEqual(formattedCode, 'false ?? true\n');
  });

  it('formats optional chaining expressions correctly', () => {
    const formattedCode = formatJavaScript('var x=a?.b;');
    assert.strictEqual(formattedCode, 'var x = a?.b;\n');
  });

  it('formats logical assignment expressions correctly', () => {
    const formattedCode = formatJavaScript('x||=1;');
    assert.strictEqual(formattedCode, 'x ||= 1;\n');
  });

  it('formats numeric separators correctly', () => {
    const formattedCode = formatJavaScript('x=1_000;');
    assert.strictEqual(formattedCode, 'x = 1_000;\n');
  });

  it('formats do-while loops correctly', () => {
    const formattedCode = formatJavaScript(`function demo() {
  do {} while (false);
  if (true) {}
}
function demo() {do {} while (false);if (true) {}}`);
    assert.strictEqual(formattedCode, `function demo() {
  do {} while (false);
  if (true) {}
}
function demo() {
  do {} while (false);
  if (true) {}
}
`);
  });

  it('formats while loops correctly', () => {
    const formattedCode = formatJavaScript('while(true){print(\'infinity\');}');
    assert.strictEqual(formattedCode, `while (true) {
  print(\'infinity\');
}
`);
  });

  it('formats function statements correctly', () => {
    const formattedCode = formatJavaScript('function test(a,b,c){a*=b;return c+a;}');
    assert.strictEqual(formattedCode, `function test(a, b, c) {
  a *= b;
  return c + a;
}
`);
  });

  it('formats variable statements correctly', () => {
    const formattedCode = formatJavaScript('var a=1,b={},c=2,d="hello world";var a,b,c,d=2,e,f=3;var a={};');
    assert.strictEqual(formattedCode, `var a = 1
  , b = {}
  , c = 2
  , d = "hello world";
var a, b, c, d = 2, e, f = 3;
var a = {};
`);
  });

  it('formats array-literals correctly', () => {
    const formattedCode = formatJavaScript('var arr=[3,2,1,0]');
    assert.strictEqual(formattedCode, `var arr = [3, 2, 1, 0]
`);
  });

  it('formats ternary expressions correctly', () => {
    const formattedCode = formatJavaScript('a>b?a:b');
    assert.strictEqual(formattedCode, `a > b ? a : b
`);
  });

  it('formats labeled statements correctly', () => {
    const formattedCode = formatJavaScript('firstLoop:while(true){break firstLoop;continue firstLoop;}');
    assert.strictEqual(formattedCode, `firstLoop: while (true) {
  break firstLoop;
  continue firstLoop;
}
`);
  });

  it('formats multiple statements on the same line correctly', () => {
    const formattedCode = formatJavaScript('rebuild(),show(),hasNew?refresh():noop();');
    assert.strictEqual(formattedCode, `rebuild(),
show(),
hasNew ? refresh() : noop();
`);
  });

  it('formats if-statements correctly', () => {
    const formattedCode = formatJavaScript(
        'if(a<b)log(a);else log(b);if(a<b){log(a)}else{log(b);}if(a===b)log(\'equals\');if(a!==b){log(\'non-eq\');}if(a>b&&b>c){print(a);print(b);}');
    assert.strictEqual(formattedCode, `if (a < b)
  log(a);
else
  log(b);
if (a < b) {
  log(a)
} else {
  log(b);
}
if (a === b)
  log('equals');
if (a !== b) {
  log('non-eq');
}
if (a > b && b > c) {
  print(a);
  print(b);
}
`);
  });

  it('formats break- and continue-statements in for-loops correctly', () => {
    const formattedCode = formatJavaScript(`for(var i in set)if(i%2===0)break;else continue;
function foo(){while(1){if (a)continue;test();}}`);
    assert.strictEqual(formattedCode, `for (var i in set)
  if (i % 2 === 0)
    break;
  else
    continue;
function foo() {
  while (1) {
    if (a)
      continue;
    test();
  }
}
`);
  });

  it('formats null-keyword correctly', () => {
    const formattedCode = formatJavaScript('1||null;');
    assert.strictEqual(formattedCode, `1 || null;
`);
  });

  it('formats exponential operator correctly', () => {
    const formattedCode = formatJavaScript('2**3');
    assert.strictEqual(formattedCode, `2 ** 3
`);
  });

  it('formats for-loops correctly', () => {
    const formattedCode = formatJavaScript(
        'for(var value of map)if (value.length%3===0)console.log(value);for(var key in myMap)print(key);for(var value of myMap)print(value);');
    assert.strictEqual(formattedCode, `for (var value of map)
  if (value.length % 3 === 0)
    console.log(value);
for (var key in myMap)
  print(key);
for (var value of myMap)
  print(value);
`);
  });

  it('formats chained and nested if-statements correctly', () => {
    const formattedCode = formatJavaScript(
        'if(a%7===0)b=1;else if(a%9===1) b =  2;else if(a%5===3){b=a/2;b++;} else b= 3;{if (a>b){a();pretty();}else if (a+b)e();reset();}');
    assert.strictEqual(formattedCode, `if (a % 7 === 0)
  b = 1;
else if (a % 9 === 1)
  b = 2;
else if (a % 5 === 3) {
  b = a / 2;
  b++;
} else
  b = 3;
{
  if (a > b) {
    a();
    pretty();
  } else if (a + b)
    e();
  reset();
}
`);
  });

  it('formats try-catch statements correctly', () => {
    const formattedCode = formatJavaScript('try{a(b());}catch(e){f()}finally{f();}');
    assert.strictEqual(formattedCode, `try {
  a(b());
} catch (e) {
  f()
} finally {
  f();
}
`);
  });

  it('formats object-spreads correctly', () => {
    const formattedCode = formatJavaScript('const a = {a:4,...{a: 5,b: 42}};');
    assert.strictEqual(formattedCode, `const a = {
  a: 4,
  ...{
    a: 5,
    b: 42
  }
};
`);
  });

  it('formats object destructuring correctly', () => {
    const formattedCode = formatJavaScript('let{x,y}=getXYFromTouchOrPointer(e);var test = function({x,y}){foo(x,y);}');
    assert.strictEqual(formattedCode, `let {x, y} = getXYFromTouchOrPointer(e);
var test = function({x, y}) {
  foo(x, y);
}
`);
  });

  it('formats let declaration for "$" correctly', () => {
    const formattedCode = formatJavaScript('let $=1;');
    assert.strictEqual(formattedCode, 'let $ = 1;\n');
  });

  it('formats let declaration for "_" correctly', () => {
    const formattedCode = formatJavaScript('let _=1;');
    assert.strictEqual(formattedCode, 'let _ = 1;\n');
  });

  it('formats let declaration for unicode name correctly', () => {
    const formattedCode = formatJavaScript('let \u00e1=1;');
    assert.strictEqual(formattedCode, 'let \u00e1 = 1;\n');
  });

  it('formats const declaration for unicode name correctly', () => {
    const formattedCode = formatJavaScript('const \u00e1=1;');
    assert.strictEqual(formattedCode, 'const \u00e1 = 1;\n');
  });

  it('formats yield <number> correctly', () => {
    const formattedCode = formatJavaScript('function *one() {yield 1;}');
    assert.strictEqual(formattedCode, `function *one() {
  yield 1;
}
`);
  });

  it('formats object-expressions correctly', () => {
    const formattedCode = formatJavaScript(
        'var mapping={original:[1,2,3],formatted:[],count:0};var obj={\'foo\':1,bar:"2",cat:{dog:\'1989\'}}');
    assert.strictEqual(formattedCode, `var mapping = {
  original: [1, 2, 3],
  formatted: [],
  count: 0
};
var obj = {
  'foo': 1,
  bar: "2",
  cat: {
    dog: '1989'
  }
}
`);
  });

  it('formats block-statements correctly', () => {
    const formattedCode = formatJavaScript('{ print(1); print(2); }');
    assert.strictEqual(formattedCode, `{
  print(1);
  print(2);
}
`);
  });

  it('formats assignment expressions correctly', () => {
    const formattedCode = formatJavaScript('var exp=\'a string\';c=+a+(0>a?b:0);c=(1);var a=(1);');
    assert.strictEqual(formattedCode, `var exp = 'a string';
c = +a + (0 > a ? b : 0);
c = (1);
var a = (1);
`);
  });

  it('formats with-statements correctly', () => {
    const formattedCode = formatJavaScript('with(obj)log(\'first\');with(nice){log(1);log(2);}done();');
    assert.strictEqual(formattedCode, `with (obj)
  log(\'first\');
with (nice) {
  log(1);
  log(2);
}
done();
`);
  });

  it('formats switch-statements correctly', () => {
    const formattedCode = formatJavaScript(
        'switch (a) { case 1, 3: log("odd");break;case 2:log("even");break;case 42:case 89: log(a);default:log("interesting");log(a);}log("done");');
    assert.strictEqual(formattedCode, `switch (a) {
case 1, 3:
  log("odd");
  break;
case 2:
  log("even");
  break;
case 42:
case 89:
  log(a);
default:
  log("interesting");
  log(a);
}
log("done");
`);
  });

  it('formats generator-expressions correctly', () => {
    const formattedCode =
        formatJavaScript('function *max(){var a=yield;var b=yield 10;if(a>b)return a;else return b;}');
    assert.strictEqual(formattedCode, `function *max() {
  var a = yield;
  var b = yield 10;
  if (a > b)
    return a;
  else
    return b;
}
`);
  });

  it('formats block-comments correctly', () => {
    const formattedCode = formatJavaScript(`/** this
 * is
 * block
 * comment
 */
var a = 10;`);
    assert.strictEqual(formattedCode, `/** this
 * is
 * block
 * comment
 */
var a = 10;
`);
  });

  it('formats let-assignments correctly', () => {
    const formattedCode = formatJavaScript('for(var i=0;i<names.length;++i){let name=names[i];let person=persons[i];}');
    assert.strictEqual(formattedCode, `for (var i = 0; i < names.length; ++i) {
  let name = names[i];
  let person = persons[i];
}
`);
  });

  it('formats anonymous functions correctly', () => {
    const formattedCode =
        formatJavaScript(`setTimeout(function(){alert(1);},2000); function test(arg){console.log(arg);}test(a=>a+2);
var onClick = function() { console.log(\'click!\'); };console.log(\'done\');var onStart = function() { a(); }, onFinish = function() { b(); };
var onStart = function() {}, delay=1000, belay=document.activeElement;`);
    assert.strictEqual(formattedCode, `setTimeout(function() {
  alert(1);
}, 2000);
function test(arg) {
  console.log(arg);
}
test(a => a + 2);
var onClick = function() {
  console.log('click!');
};
console.log('done');
var onStart = function() {
  a();
}
  , onFinish = function() {
  b();
};
var onStart = function() {}
  , delay = 1000
  , belay = document.activeElement;
`);
  });

  it('formats arrow functions correctly', () => {
    const formattedCode1 = formatJavaScript('const double=x=>x*2;');
    const formattedCode2 = formatJavaScript('const sum=(a,b)=>a+b;');
    const formattedCode3 = formatJavaScript('const double=x=>{return x*2;}');
    const formattedCode4 = formatJavaScript('const sum=(a,b,c)=>{const val=a+b+c;return val;}');
    assert.strictEqual(formattedCode1, `const double = x => x * 2;
`);
    assert.strictEqual(formattedCode2, `const sum = (a, b) => a + b;
`);
    assert.strictEqual(formattedCode3, `const double = x => {
  return x * 2;
}
`);
    assert.strictEqual(formattedCode4, `const sum = (a, b, c) => {
  const val = a + b + c;
  return val;
}
`);
  });

  describe('formats files with comments', () => {
    it('handles 1 leading comment correctly', () => {
      const formattedCode = formatJavaScript(`// This is a starting comment
console.log('5');`);
      assert.strictEqual(formattedCode, `// This is a starting comment
console.log('5');
`);
    });

    it('handles leading hashbang correctly', () => {
      const formattedCode = formatJavaScript(`#! hashbang
{{{console.log(1)}}}`);
      assert.strictEqual(formattedCode, `#! hashbang
{
  {
    {
      console.log(1)
    }
  }
}
`);
    });

    it('handles 1 trailing comment correctly', () => {
      const formattedCode = formatJavaScript('console.log(\'5\'); // This is a trailing comment');
      assert.strictEqual(formattedCode, `console.log('5');
// This is a trailing comment
`);
    });

    it('handles 1 trailing comment on a new line correctly', () => {
      const formattedCode = formatJavaScript(`console.log('5');
// This is a new line comment`);
      assert.strictEqual(formattedCode, `console.log('5');
// This is a new line comment
`);
    });

    it('handles 2 leading comments', () => {
      const formattedCode = formatJavaScript(`// This is a starting line comment
/* This is a starting block comment */
console.log('5');`);
      assert.strictEqual(formattedCode, `// This is a starting line comment
/* This is a starting block comment */
console.log('5');
`);
    });

    it('handles 2 trailing comments correctly', () => {
      const formattedCode = formatJavaScript(`console.log('5'); // This is a trailing comment same line
// This is a trailing new line comment`);
      assert.strictEqual(formattedCode, `console.log('5');
// This is a trailing comment same line
// This is a trailing new line comment
`);
    });

    it('handles leading and trailing comments correctly', () => {
      const formattedCode = formatJavaScript(`// This is a starting line comment
/* This is a starting block comment */
console.log('5'); // This is a trailing comment same line
// This is a trailing new line comment`);
      assert.strictEqual(formattedCode, `// This is a starting line comment
/* This is a starting block comment */
console.log('5');
// This is a trailing comment same line
// This is a trailing new line comment
`);
    });

    it('handles a hashbang, leading and trailing comments correctly', () => {
      const formattedCode = formatJavaScript(`#! hashbang
// This is a starting line comment
/* This is a starting block comment */
console.log('5'); // This is a trailing comment same line
// This is a trailing new line comment`);
      assert.strictEqual(formattedCode, `#! hashbang
// This is a starting line comment
/* This is a starting block comment */
console.log('5');
// This is a trailing comment same line
// This is a trailing new line comment
`);
    });
  });

  describe('formats files with classes', () => {
    it('handles an empty class correctly', () => {
      const formattedCode = formatJavaScript('class Test{}');
      assert.strictEqual(formattedCode, `class Test {
}
`);
    });

    it('handles an empty constructor correctly', () => {
      const formattedCode = formatJavaScript('class Test{constructor(){}}');
      assert.strictEqual(formattedCode, `class Test {
  constructor() {}
}
`);
    });

    it('handles a single method correctly', () => {
      const formattedCode = formatJavaScript('class Test{constructor(){this.bar=10;}givemebar(){return this.bar;}}');
      assert.strictEqual(formattedCode, `class Test {
  constructor() {
    this.bar = 10;
  }
  givemebar() {
    return this.bar;
  }
}
`);
    });

    it('handles extending a super class correctly', () => {
      const formattedCode =
          formatJavaScript('class Foo extends Bar{constructor(name){super(name);}getName(){return super.getName();}}');
      assert.strictEqual(formattedCode, `class Foo extends Bar {
  constructor(name) {
    super(name);
  }
  getName() {
    return super.getName();
  }
}
`);
    });

    it('handles consecutive class declarations correctly', () => {
      const formattedCode = formatJavaScript('class A{}class B extends A{constructor(){super();}}');
      assert.strictEqual(formattedCode, `class A {
}
class B extends A {
  constructor() {
    super();
  }
}
`);
    });

    it('handles static methods correctly', () => {
      const formattedCode = formatJavaScript(
          'class Employer{static count(){this._counter = (this._counter || 0) + 1; return this._counter;}}');
      assert.strictEqual(formattedCode, `class Employer {
  static count() {
    this._counter = (this._counter || 0) + 1;
    return this._counter;
  }
}
`);
    });

    it('handles class expressions correctly', () => {
      const formattedCode = formatJavaScript('new(class{constructor(){debugger}})');
      assert.strictEqual(formattedCode, `new (class {
  constructor() {
    debugger
  }
}
)
`);
    });
  });

  describe('formats files with template literals', () => {
    it('handles simple template literal correctly', () => {
      const formattedCode = formatJavaScript('var foo = `bar`;');
      assert.strictEqual(formattedCode, `var foo = \`bar\`;
`);
    });

    it('handles multi-line template literals correctly', () => {
      const formattedCode = formatJavaScript(`var foo = \`this
bar\`;`);
      assert.strictEqual(formattedCode, `var foo = \`this
bar\`;
`);
    });

    it('handles string substitution in template literals correctly', () => {
      const formattedCode = formatJavaScript(`var a=\`I have \${credit+cash}$\`;
var a=\`\${name} has \${credit+cash}\${currency?currency:"$"}\`;`);
      assert.strictEqual(formattedCode, `var a = \`I have \${credit + cash}$\`;
var a = \`\${name} has \${credit + cash}\${currency ? currency : "$"}\`;
`);
    });

    it('handles tagged template literals correctly', () => {
      const formattedCode = formatJavaScript('escapeHtml`<div class=${classnName} width=${a+b}/>`;');
      assert.strictEqual(formattedCode, `escapeHtml\`<div class=\${classnName} width=\${a + b}/>\`;
`);
    });
  });

  it('removes consecutive new lines', () => {
    const formattedCode = formatJavaScript(`a();








b();`);
    assert.strictEqual(formattedCode, `a();

b();
`);
  });

  it('formats expressions in parentheses correctly', () => {
    const formattedCode = formatJavaScript('if((a))((b));else (c);');
    assert.strictEqual(formattedCode, `if ((a))
  ((b));
else
  (c);
`);
  });

  it('formats obfuscated code', () => {
    const formattedCode = formatJavaScript(`function formatted1()
    {
        var variable1 = 0;
    }

    function withComments()
    {
    // comment
        return "functionWithComments";
    }

    try{onmessage=function(event){var source=event.data;var formattedSource=beautify(source);var mapping=buildMapping(source,formattedSource);postMessage({formattedSource:formattedSource,mapping:mapping})};function beautify(source){var ast=parse.parse(source);var beautifyOptions=
    {indent_level:4,indent_start:0,quote_keys:false,space_colon:false};return process.gen_code(ast,beautifyOptions)}function buildMapping(source,formattedSource){var mapping={original:[],formatted:[]};var lastPosition=0;var regexp=/(^|[^\\])\b((?=\D)[\$\.\w]+)\b/g;while(true)
    {var match=regexp.exec(formattedSource);if(!match)break;var position=source.indexOf(match[2],lastPosition);if(position===-1)throw"No match found in original source for "+match[2];mapping.original.push(position);mapping.formatted.push(match.index+match[1].length);
    lastPosition=position+match[2].length}return mapping}function require(){return parse}var exports={};importScripts("UglifyJS/parse-js.js");var parse=exports;var exports={};importScripts("UglifyJS/process.js");var process=exports;}catch(e){}

    function formatted2()
    {
        var variable2 = 0;
    }`);
    assert.strictEqual(formattedCode, `function formatted1() {
  var variable1 = 0;
}

function withComments() {
  // comment
  return "functionWithComments";
}

try {
  onmessage = function(event) {
    var source = event.data;
    var formattedSource = beautify(source);
    var mapping = buildMapping(source, formattedSource);
    postMessage({
      formattedSource: formattedSource,
      mapping: mapping
    })
  }
  ;
  function beautify(source) {
    var ast = parse.parse(source);
    var beautifyOptions = {
      indent_level: 4,
      indent_start: 0,
      quote_keys: false,
      space_colon: false
    };
    return process.gen_code(ast, beautifyOptions)
  }
  function buildMapping(source, formattedSource) {
    var mapping = {
      original: [],
      formatted: []
    };
    var lastPosition = 0;
    var regexp = /(^|[^\\])\b((?=D)[$.w]+)\b/g;
    while (true) {
      var match = regexp.exec(formattedSource);
      if (!match)
        break;
      var position = source.indexOf(match[2], lastPosition);
      if (position === -1)
        throw "No match found in original source for " + match[2];
      mapping.original.push(position);
      mapping.formatted.push(match.index + match[1].length);
      lastPosition = position + match[2].length
    }
    return mapping
  }
  function require() {
    return parse
  }
  var exports = {};
  importScripts("UglifyJS/parse-js.js");
  var parse = exports;
  var exports = {};
  importScripts("UglifyJS/process.js");
  var process = exports;
} catch (e) {}

function formatted2() {
  var variable2 = 0;
}
`);
  });

  it('formats functions using `import.meta.url` correctly', () => {
    const formattedCode = formatJavaScript('function foo(){console.log(import.meta.url);}');
    assert.strictEqual(formattedCode, `function foo() {
  console.log(import.meta.url);
}
`);
  });

  it('formats class fields correctly', () => {
    const formattedCode = formatJavaScript('class Clazz {map=new Map();someMethod(){console.log(42);}map2=new Map();}');
    assert.strictEqual(formattedCode, `class Clazz {
  map = new Map();
  someMethod() {
    console.log(42);
  }
  map2 = new Map();
}
`);
  });

  it('formats template literals correctly', () => {
    const formattedCode = formatJavaScript('`foo${bar}`');
    assert.strictEqual(formattedCode, '`foo${bar}`\n');
  });
});
