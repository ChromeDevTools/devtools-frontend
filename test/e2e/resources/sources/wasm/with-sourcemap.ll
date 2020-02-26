source_filename = "test.ll"
target triple = "wasm32-unknown-unknown-wasm"

define dso_local i32 @Main(i32) {
  %2 = add nsw i32 %0, 1
  %3 = mul nsw i32 %2, 2
  ret i32 %3
}

!0 = !{ !"sourceMappingURL", !" wasm-with-sourcemap..........map"}
!wasm.custom_sections = !{!0}
