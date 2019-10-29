// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

use std::borrow::Cow;

fn is_absolute(p: &str) -> bool {
  let mut bytes = p.bytes();
  let b = match bytes.next() {
    Some(b) => b,
    None => return false,
  };
  match b {
    // Unix paths
    b'/' => true,
    // Windows paths starting with drive letter like `C:`
    b'A'..=b'Z' | b'a'..=b'z' => bytes.next() == Some(b':'),
    // Windows paths starting with `\\` (UNC)
    b'\\' => bytes.next() == Some(b'\\'),
    _ => false,
  }
}

fn strip_prefix<'a>(p: &'a str, prefix: &'static str) -> Option<&'a str> {
  if p.starts_with(prefix) {
    Some(unsafe { p.get_unchecked(prefix.len()..) })
  } else {
    None
  }
}

pub struct Path<'a>(Cow<'a, str>);

impl<'a> Path<'a> {
  pub fn new(s: Cow<'a, str>) -> Self {
    assert!(is_absolute(&s));
    Path(s)
  }

  pub fn push(&mut self, p2: Cow<'a, str>) {
    if is_absolute(&p2) {
      self.0 = p2;
    } else {
      let p1 = self.0.to_mut();
      if p1.starts_with('/') {
        // Assume Unix absolute path, add slash if it's not there yet.
        if !p1.ends_with('/') {
          p1.push('/');
        }
      } else {
        // Assume Windows absolute path, add backslash if not there yet.
        if !p1.ends_with('\\') {
          p1.push('\\');
        }
      }
      p1.push_str(&p2);
    }
  }

  pub fn borrow(&self) -> Path {
    Path(Cow::Borrowed(&self.0))
  }

  pub fn to_uri(&self) -> String {
    let path = &self.0;

    if let Some(path) = strip_prefix(&path, "/rustc/") {
      // TODO: avoid hardcoding this, and instead let users configure
      // path replacements in DevTools UI.
      format!("https://raw.githubusercontent.com/rust-lang/rust/{}", path)
    } else if path.starts_with('/') {
      // Unix-style path
      format!("file://{}", path)
    } else {
      // Windows-style path
      format!("file:///{}", path)
    }
  }
}
