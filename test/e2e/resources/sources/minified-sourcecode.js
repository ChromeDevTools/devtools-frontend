// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// clang-format off
const notFormatted = {something: 'not-formatted'};console.log('Test for correct line number'); function notFormattedFunction() {
console.log('second log'); return {field: 2+4}};
notFormattedFunction();
