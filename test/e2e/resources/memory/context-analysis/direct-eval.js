// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function makeDirectEvalClosure() {
  const dynamicallyRead = {kind: 'dynamic'};
  const maybeDead = {data: new Array(128).fill(0)};
  eval('');

  function directEvalReader(name) {
    return eval(name);
  }

  function makeSiblingClosure() {
    const siblingCaptured = {kind: 'sibling'};
    const siblingDead = {data: new Array(128).fill(0)};

    (function discardedSiblingDeadReader() {
      return siblingDead;
    })();

    return function siblingReader() {
      return siblingCaptured;
    };
  }

  return {
    directEvalReader,
    siblingReader: makeSiblingClosure(),
  };
}

const directEvalResult = makeDirectEvalClosure();
globalThis.directEvalClosure = directEvalResult.directEvalReader;
globalThis.siblingClosure = directEvalResult.siblingReader;
globalThis.directEvalResult = globalThis.directEvalClosure('dynamicallyRead');
