# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

INPUTS=$(wildcard *.cc) $(wildcard *.c)
CFLAGS=-gfull -O0 --target=wasm32 -nostdlib -fdebug-prefix-map=`pwd`=. \
	   -Wl,--no-entry,--allow-undefined,--export-all
CXXFLAGS=$(CFLAGS)

all: $(INPUTS:.c=.wasm) $(INPUTS:.cc=.wasm)

%.wasm: %.c Makefile
	$(CC) $(CFLAGS) -o $@ $(filter %.c,$^)
%.wasm: %.cc Makefile
	$(CXX) $(CXXFLAGS) -o $@ $(filter %.cc,$^)

%.dwo %stripped.wasm: %.wasm Makefile split-dwarf.py
	python split-dwarf.py \
	  --dwo $(patsubst %.wasm,%.dwo,$(filter %.wasm,$^)) \
	  --wasm $(patsubst %.wasm,%.stripped.wasm,$(filter %.wasm,$^)) \
	  --module_url $(patsubst %.wasm,%.stripped.wasm,$(filter %.wasm,$^)) \
	  --symbols_url wasm://./$(patsubst %.wasm,%.dwo,$(filter %.wasm,$^)) \
	  $(filter %.wasm,$^)
