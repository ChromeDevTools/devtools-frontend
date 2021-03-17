"use strict";
class MyError extends Error {
    get name() { return 'MyError'; }
}
function inner() {
    const e = new MyError();
    return e.stack;
}
function outer() {
    return inner();
}
console.log(outer());
//# sourceMappingURL=error-with-sourcemap.js.map
