wasm-with-sourcemap.wasm: with-sourcemap.ll Makefile
	clang --target=wasm32 -Wl,--no-entry,--allow-undefined,--export-all -nostdlib $(filter %.ll,$^) -o $@
