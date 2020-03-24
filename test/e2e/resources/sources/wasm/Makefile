WASMC_FLAGS=--target=wasm32 -Wl,--no-entry,--allow-undefined,--export-all -nostdlib
WASMC_DBGFLAGS=-gfull -fdebug-prefix-map=`pwd`=test/e2e/resources/sources/wasm/

%.wasm: %.cc Makefile
	clang++ ${WASMC_FLAGS} $(filter %.cc,$^) -o $@

%_with_dwarf.wasm: %_with_dwarf.ll Makefile
	clang ${WASMC_DBGFLAGS} ${WASMC_FLAGS} $(filter %.ll,$^) -o $@

%_with_dwarf.wasm: %_with_dwarf.c Makefile
	clang ${WASMC_DBGFLAGS} ${WASMC_FLAGS} $(filter %.c,$^) -o $@

%.wasm: %.c Makefile
	clang ${WASMC_FLAGS} $(filter %.c,$^) -o $@

%.wasm: %.ll Makefile
	clang ${WASMC_FLAGS} $(filter %.ll,$^) -o $@

wasm-with-sourcemap.wasm: with-sourcemap.ll Makefile
	clang ${WASM_CFLAGS} $(filter %.ll,$^) -o $@
