// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
function searchTestUniqueString() {
  var variable = 0;
  // searchTestUniqueString two occurences on the same line searchTestUniqueString
  // searchTestUniqueString on the next line.
  var variable2 = 0;
}

function doSomething() {
  searchTestUniqueString();
  // SEARCHTestUniqueString();
}

// searchTestUnique space String
// AAAAAAAAAAA 11xA here

// replaceMe1
// replaceMe2 replaceMe2

// REPLACEME1
// REPLACEME2 REPLACEME2


// replaceMe3
// replaceMe4 replaceMe4
// REPLACEME3
// REPLACEME4 REPLACEME4
