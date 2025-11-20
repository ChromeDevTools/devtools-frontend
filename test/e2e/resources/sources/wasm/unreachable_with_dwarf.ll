source_filename = "global_variable_with_dwarf.c"
target triple = "wasm32"

@global = hidden global i32 7, align 4, !dbg !0

define hidden i32 @Main() !dbg !11 {
entry:
  %0 = load i32, i32* @global, align 4, !dbg !14
  unreachable, !dbg !15
}

!llvm.dbg.cu = !{!2}
!llvm.module.flags = !{!7, !8, !9}
!llvm.ident = !{!10}

!0 = !DIGlobalVariableExpression(var: !1, expr: !DIExpression())
!1 = distinct !DIGlobalVariable(name: "global", scope: !2, file: !3, line: 1, type: !6, isLocal: false, isDefinition: true)
!2 = distinct !DICompileUnit(language: DW_LANG_C99, file: !3, producer: "clang version 9.0.0 (https://github.com/llvm/llvm-project 5c5365a639589cad0cfd5dcf92f374aecda7d7c0)", isOptimized: false, runtimeVersion: 0, emissionKind: FullDebug, enums: !4, globals: !5, nameTableKind: None)
!3 = !DIFile(filename: "unreachable_with_dwarf.ll", directory: "test/e2e/resources/sources/wasm/")
!4 = !{}
!5 = !{!0}
!6 = !DIBasicType(name: "int", size: 32, encoding: DW_ATE_signed)
!7 = !{i32 2, !"Dwarf Version", i32 4}
!8 = !{i32 2, !"Debug Info Version", i32 3}
!9 = !{i32 1, !"wchar_size", i32 4}
!10 = !{!"clang version 9.0.0 (https://github.com/llvm/llvm-project 5c5365a639589cad0cfd5dcf92f374aecda7d7c0)"}
!11 = distinct !DISubprogram(name: "Main", scope: !3, file: !3, line: 3, type: !12, scopeLine: 3, spFlags: DISPFlagDefinition, unit: !2, retainedNodes: !4)
!12 = !DISubroutineType(types: !13)
!13 = !{!6}
!14 = !DILocation(line: 8, column: 3, scope: !11)
!15 = !DILocation(line: 9, column: 3, scope: !11)
