WASMC_FLAGS=--target=wasm32 -Wl,--no-entry,--allow-undefined,--export-all -nostdlib

%.wasm: %.cc Makefile
	clang++ ${WASMC_FLAGS} $(filter %.cc,$^) -o $@

%.wasm: %.c Makefile
	clang ${WASMC_FLAGS} $(filter %.c,$^) -o $@

%.wasm: %.ll Makefile
	clang ${WASMC_FLAGS} $(filter %.ll,$^) -o $@

wasm-with-sourcemap.wasm: with-sourcemap.ll Makefile
	clang ${WASM_CFLAGS} $(filter %.ll,$^) -o $@
