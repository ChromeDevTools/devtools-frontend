(module
  (export "Main" (func $Main))
  (func $Callee (param i32) (result i32)
        (drop
          (i32.add
            ;;@ FIRST_PAUSE:1:1
            (local.get $0)
            (local.get $0)
            )
          )
        (drop
          (i32.add
            (local.get $0)
            (local.get $0)
            )
          )
        (drop
          (i32.add
            ;;@ SECOND_PAUSE:1:1
            (local.get $0)
            (local.get $0)
            )
          )
        (return
          (i32.add
            (local.get $0)
            (local.get $0)
            )
          )
        )

  (func $Main (param i32) (result i32)
        (return
          (i32.add
            (call $Callee
                  (i32.add
                    (local.get $0)
                    (local.get $0)
                    )
                  )
            (i32.add
              ;;@ THIRD_PAUSE:1:1
              (local.get $0)
              (local.get $0)
              )
            )
          )
        )
  )
