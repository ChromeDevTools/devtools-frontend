// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#[macro_use]
mod log;

mod location;
mod path;
mod wasm;

use fallible_iterator::FallibleIterator;
use gimli::{ColumnType, Dwarf, EndianSlice, LittleEndian, Reader, ReaderOffset};
use indexmap::IndexMap;
use js_sys::JsString;
use location::{LocationEntry, Pos, SourceMapEntry};
use path::Path;
use std::collections::HashMap;
use std::convert::TryInto;
use std::rc::Rc;
use wasm::{parse_sections, Error, SectionKind};
use wasm_bindgen::prelude::*;

pub struct FileEntries {
  pub filename: Rc<JsString>,
  pub entries: Vec<LocationEntry>,
}

enum FuncState {
  Start,
  Ignored,
  Normal,
}

#[wasm_bindgen]
#[derive(Default)]
pub struct Resolver {
  locations: Vec<LocationEntry>,
  reverse_locations: IndexMap<String, FileEntries>,
}

impl Resolver {
  pub fn new<R: Reader + Clone + Default>(src: R) -> Result<Resolver, Error> {
    #[cfg(feature = "log")]
    console_error_panic_hook::set_once();

    let mut code_section_offset = None;
    let mut sections = HashMap::new();

    for section in parse_sections(src.clone())?.iterator() {
      let section = section?;

      match section.kind {
        SectionKind::Custom { name } => {
          if name.starts_with(".debug_") {
            sections.insert(name, section.payload);
          }
        }
        SectionKind::Standard { id } if id.get() == 10 => {
          code_section_offset = Some(section.payload.offset_from(&src));
        }
        _ => {}
      }
    }

    let code_section_offset: u32 = code_section_offset
      .ok_or_else(|| Error::MissingCodeSection)?
      .into_u64()
      .try_into()
      .unwrap();

    let dwarf = Dwarf::load::<_, _, Error>(
      |id| Ok(sections.get(id.name()).cloned().unwrap_or_default()),
      |_| Ok(Default::default()),
    )?;

    let mut res = Self::default();

    let mut iter = dwarf.units();

    while let Some(unit) = iter.next()? {
      let mut unit = dwarf.unit(unit)?;

      let line_program = match unit.line_program.take() {
        Some(line_program) => line_program,
        None => continue,
      };

      let is_rust = {
        let mut entries = unit.entries();
        entries.next_entry()?;
        match entries
          .current()
          .unwrap()
          .attr_value(gimli::DW_AT_language)?
        {
          Some(gimli::AttributeValue::Language(gimli::constants::DW_LANG_Rust)) => true,
          _ => false,
        }
      };

      let unit_dir = Path::new(
        unit
          .comp_dir
          .as_ref()
          .map(|comp_dir| comp_dir.to_string())
          .transpose()?
          .unwrap_or_default(),
      );

      let mut rows = line_program.rows();

      let mut func_state = FuncState::Start;

      while let Some((header, row)) = rows.next_row()? {
        if let FuncState::Start = func_state {
          func_state = if row.address() == 0 {
            FuncState::Ignored
          } else {
            FuncState::Normal
          };
        }

        if let FuncState::Ignored = func_state {
          if row.end_sequence() {
            func_state = FuncState::Start;
          }
          continue;
        }

        let file = match row.file(header) {
          Some(file) => file,
          None => continue,
        };

        let pos = {
          let line = match row.line() {
            Some(line) => line.checked_sub(1).unwrap().try_into().unwrap(),
            None => continue, // couldn't attribute instruction to any line
          };

          let column = match row.column() {
            ColumnType::Column(mut column) => {
              // DWARF columns are 1-based, Source Map are 0-based.
              column -= 1;
              // ...but Rust doesn't implement DWARF columns correctly
              // (see https://github.com/rust-lang/rust/issues/65437)
              if is_rust {
                column += 1;
              }
              column.try_into().unwrap()
            }
            ColumnType::LeftEdge => 0,
          };

          Pos::new(line, column)
        };

        let addr: u32 = row.address().try_into().unwrap();

        let mut path = unit_dir.borrow();

        let dir_value;
        if let Some(dir) = file.directory(header) {
          dir_value = dwarf.attr_string(&unit, dir)?;
          path.push(dir_value.to_string()?);
        }

        let path_name_value = dwarf.attr_string(&unit, file.path_name())?;
        path.push(path_name_value.to_string()?);

        let dest = path.to_uri();

        let file_entries = match res.reverse_locations.entry(dest) {
          indexmap::map::Entry::Occupied(entry) => entry.into_mut(),
          indexmap::map::Entry::Vacant(entry) => {
            let filename = Rc::new(JsString::from(entry.key().as_str()));
            entry.insert(FileEntries {
              filename,
              entries: Vec::new(),
            })
          }
        };

        let loc = LocationEntry::new(code_section_offset + addr, &file_entries.filename, pos);

        res.locations.push(loc.clone());
        file_entries.entries.push(loc);

        if row.end_sequence() {
          func_state = FuncState::Start;
        }
      }
    }

    res.locations.sort_by_key(|loc| loc.addr());
    res.locations.dedup_by_key(|loc| loc.addr());

    for file_entries in res.reverse_locations.values_mut() {
      let entries = &mut file_entries.entries;
      entries.sort_by_key(|loc| loc.pos());
      entries.dedup_by_key(|loc| loc.pos());
    }

    Ok(res)
  }
}

#[wasm_bindgen]
impl Resolver {
  #[wasm_bindgen(constructor)]
  pub fn from_slice(src: &[u8]) -> Result<Resolver, JsValue> {
    Self::new(EndianSlice::new(src, LittleEndian))
      .map_err(|err| js_sys::Error::new(&err.to_string()).into())
  }

  #[wasm_bindgen(js_name = listFiles)]
  pub fn list_files(&self) -> js_sys::Array {
    let array = js_sys::Array::new();

    for file_entries in self.reverse_locations.values() {
      array.push(&file_entries.filename);
    }

    array
  }

  #[wasm_bindgen(js_name = listMappings)]
  pub fn list_mappings(&self) -> js_sys::Array {
    // This method will convert all mappings, which sort of
    // goes against the idea of doing that lazily as an optimisation,
    // but it's used only by blackboxing implementation in DevTools,
    // and so shouldn't be called in most common scenarios.
    let array = js_sys::Array::new();

    for loc in &self.locations {
      array.push(loc.as_js());
    }

    array
  }

  pub fn resolve(&self, addr: u32) -> Option<SourceMapEntry> {
    let idx = match self.locations.binary_search_by_key(&addr, |loc| loc.addr()) {
      Ok(idx) => idx,
      // Check that we're not going before the beginning.
      Err(idx) => idx.checked_sub(1)?,
    };

    Some(self.locations[idx].as_js().clone())
  }

  #[wasm_bindgen(js_name = resolveReverse)]
  pub fn resolve_reverse(&self, file: &str, line: u32, column: u32) -> Option<SourceMapEntry> {
    let entries = &self.reverse_locations.get(file)?.entries;

    // Find arbitrary position that is >= than requested.
    let idx = entries
      .binary_search_by_key(&Pos::new(line, column), |loc| loc.pos())
      .unwrap_or_else(|idx| idx);

    // Check that we're not past the end.
    let loc = entries.get(idx)?;

    // Make sure we found a position on the same line.
    if loc.pos().line() != line {
      return None;
    }

    Some(loc.as_js().clone())
  }
}
