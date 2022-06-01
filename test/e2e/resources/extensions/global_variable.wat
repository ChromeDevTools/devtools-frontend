(module
 (memory $0 2)
 (data (i32.const 1024) "\07\00\00\00")
 (export "Main" (func $Main))
 (func $Main (result i32)
  (local $0 i32)
  (local $1 i32)
  (local.set $0
   (i32.const 0)
  )
  (local.set $1
   (i32.load offset=1024
    (local.get $0)
   )
  )
  ;;@ BREAK(return):1:1
  (return
   (local.get $1)
  )
 )
)

