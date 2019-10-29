// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#![allow(unused)]

#[cfg(feature = "log")]
use wasm_bindgen::prelude::*;

#[cfg(feature = "log")]
#[wasm_bindgen]
extern "C" {
  #[wasm_bindgen(js_namespace = console)]
  pub(crate) fn log(x: String);
}

#[cfg(feature = "log")]
macro_rules! log {
    ($($args:tt)*) => {
        crate::log::log(format!($($args)*))
    };
}

#[cfg(not(feature = "log"))]
macro_rules! log {
  ($($args:tt)*) => {};
}
