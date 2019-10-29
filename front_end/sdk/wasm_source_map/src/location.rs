// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

use js_sys::JsString;
use once_cell::unsync::OnceCell;
use std::rc::Rc;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
  #[wasm_bindgen(js_namespace = SDK)]
  #[derive(Debug, Clone)]
  pub type SourceMapEntry;

  #[wasm_bindgen(js_namespace = SDK)]
  #[wasm_bindgen(constructor)]
  pub fn new(
    compiled_line: u32,
    compiled_column: u32,
    source_url: &JsString,
    source_line: u32,
    source_column: u32,
  ) -> SourceMapEntry;
}

#[derive(Debug, PartialOrd, Ord, PartialEq, Eq, Clone, Copy)]
pub struct Pos {
  line: u32,
  column: u32,
}

impl Pos {
  pub fn new(line: u32, column: u32) -> Self {
    Pos { line, column }
  }

  pub fn line(self) -> u32 {
    self.line
  }

  pub fn column(self) -> u32 {
    self.column
  }
}

#[derive(Debug)]
struct LocationEntryInner {
  addr: u32,
  dest: Rc<JsString>,
  pos: Pos,
  converted: OnceCell<SourceMapEntry>,
}

#[derive(Debug, Clone)]
pub struct LocationEntry(Rc<LocationEntryInner>);

impl LocationEntry {
  pub fn new(addr: u32, dest: &Rc<JsString>, pos: Pos) -> Self {
    LocationEntry(Rc::new(LocationEntryInner {
      addr,
      dest: dest.clone(),
      pos,
      converted: OnceCell::new(),
    }))
  }

  pub fn addr(&self) -> u32 {
    self.0.addr
  }

  pub fn dest(&self) -> &JsString {
    &self.0.dest
  }

  pub fn pos(&self) -> Pos {
    self.0.pos
  }

  pub fn as_js(&self) -> &SourceMapEntry {
    self.0.converted.get_or_init(|| {
      SourceMapEntry::new(
        0,
        self.addr(),
        self.dest(),
        self.pos().line(),
        self.pos().column(),
      )
    })
  }
}
