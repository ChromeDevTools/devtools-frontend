import {callfunc} from './multi-files-thirdparty.js';

function inner() {
  console.log('Hello');
}

export function outer() {
  callfunc(inner);
}

export function userTimeout() {
  setTimeout(() => {}, 0);
}
