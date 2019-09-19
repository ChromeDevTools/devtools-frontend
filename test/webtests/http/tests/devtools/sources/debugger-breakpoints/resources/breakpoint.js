define(['dart_sdk'], function(dart_sdk) {
  'use strict';
  const core = dart_sdk.core;
  const dart = dart_sdk.dart;
  const dartx = dart_sdk.dartx;
  const _root = Object.create(null);
  const breakpoint = Object.create(_root);
  const $length = dartx.length;
  const $codeUnits = dartx.codeUnits;
  const $runes = dartx.runes;
  const $isNotEmpty = dartx.isNotEmpty;
  let StringAndListTovoid = () => (StringAndListTovoid = dart.constFn(dart.fnType(dart.void, [core.String, core.List])))();
  let VoidTovoid = () => (VoidTovoid = dart.constFn(dart.fnType(dart.void, [])))();
  breakpoint._foo = function(a, b) {
    let val1 = a[$codeUnits][$length];
    let val2 = a[$runes].last;
    let val3 = dart.test(b[$isNotEmpty]) ? 42 : null;
    core.print(val3);
  };
  dart.fn(breakpoint._foo, StringAndListTovoid());
  breakpoint.main = function() {
    breakpoint._foo("hello", []);
  };
  dart.fn(breakpoint.main, VoidTovoid());
  dart.trackLibraries("breakpoint", {
    "breakpoint.dart": breakpoint
  }, null);
  // Exports:
  return {
    breakpoint: breakpoint
  };
});

//# sourceMappingURL=breakpoint.js.map
