source_filename = "unreachable.ll"
target triple = "wasm32-unknown-unknown-wasm"


define dso_local void @Main() {
  unreachable
}
