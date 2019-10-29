// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

use failure::Fail;
use fallible_iterator::FallibleIterator;
use gimli::{Reader, ReaderOffset};
use std::convert::TryInto;
use std::num::NonZeroU8;

#[derive(Debug, Fail)]
pub enum Error {
  #[fail(display = "WebAssembly magic mismatch.")]
  InvalidMagic,

  #[fail(display = "Unsupported WebAssembly version {}.", _0)]
  UnsupportedVersion(u32),

  #[fail(display = "Missing code section.")]
  MissingCodeSection,

  #[fail(display = "{}", _0)]
  Reader(#[fail(cause)] gimli::Error),
}

impl From<gimli::Error> for Error {
  fn from(err: gimli::Error) -> Self {
    Error::Reader(err)
  }
}

#[derive(Debug)]
pub enum SectionKind {
  Custom { name: String },
  Standard { id: NonZeroU8 },
}

#[derive(Debug)]
pub struct Section<R> {
  pub kind: SectionKind,
  pub payload: R,
}

pub fn parse_sections<R: Reader>(
  mut reader: R,
) -> Result<impl FallibleIterator<Item = Section<R>, Error = gimli::Error>, Error> {
  struct Iterator<R> {
    reader: R,
  }

  impl<R: Reader> FallibleIterator for Iterator<R> {
    type Item = Section<R>;
    type Error = gimli::Error;

    fn next(&mut self) -> Result<Option<Section<R>>, gimli::Error> {
      if self.reader.is_empty() {
        return Ok(None);
      }

      let id = self
        .reader
        .read_uleb128()?
        .try_into()
        .map_err(|_| gimli::Error::BadUnsignedLeb128)?;

      let payload_len = ReaderOffset::from_u64(self.reader.read_uleb128()?)?;
      let mut payload_reader = self.reader.split(payload_len)?;

      let kind = match NonZeroU8::new(id) {
        None => {
          let name_len = ReaderOffset::from_u64(payload_reader.read_uleb128()?)?;
          let name_reader = payload_reader.split(name_len)?;
          SectionKind::Custom {
            name: name_reader.to_string()?.into_owned(),
          }
        }
        Some(id) => SectionKind::Standard { id },
      };

      Ok(Some(Section {
        kind,
        payload: payload_reader,
      }))
    }
  }

  if reader.read_u8_array::<[u8; 4]>()? != *b"\0asm" {
    return Err(Error::InvalidMagic);
  }

  let version = reader.read_u32()?;
  if version != 1 {
    return Err(Error::UnsupportedVersion(version));
  }

  Ok(Iterator { reader })
}
