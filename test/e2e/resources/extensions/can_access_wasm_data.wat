(module
  (global $global i32 (i32.const 0xdad))
  (memory $mem 2)
  (export "memory" (memory $mem))
  (export "global" (global $global))
  (func $i (import "imports" "imported_func") (param i32))
  (func (export "exported_func") (param i32)
    (local $local i32)
    (local.set $local
;;@ BREAK(can_access_wasm_data):1:1
      (local.get $0)
    )
;;@ BREAK(can_access_wasm_data):2:1
    (call $i
      (i32.const 42)
    )
  )
)
