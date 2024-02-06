function a(e){return{all:e=e||new Map,on:function(f,i){var t=e.get(f);t?t.push(i):e.set(f,[i])},off:function(f,i){var t=e.get(f);t&&(i?t.splice(t.indexOf(i)>>>0,1):e.set(f,[]))},emit:function(f,i){var t=e.get(f);t&&t.slice().map(function(o){o(i)}),(t=e.get("*"))&&t.slice().map(function(o){o(f,i)})}}}export{a as default};
/**
 * @license
 * Copyright 2022 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
