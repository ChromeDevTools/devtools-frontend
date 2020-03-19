source_filename = "global_variable.c"
target triple = "wasm32-unknown-unknown-wasm"

@global = dso_local global i32 7

define dso_local i32 @Main() {
entry:
  %0 = load i32, i32* @global, align 4
  ret i32 %0
}
