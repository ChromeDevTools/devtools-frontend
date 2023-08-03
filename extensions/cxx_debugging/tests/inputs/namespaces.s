# Copyright 2023 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

  .text
  .globl  __original_main
  .type __original_main,@function
__original_main:
  .functype __original_main () -> (i32)
  i32.const 0
  return
  end_function
.L__original_main_end:

  .section  .debug_info,"",@
  .int32  .Ldebug_info_end0-.Ldebug_info_start0 # Length of Unit
.Ldebug_info_start0:
  .int16 4                                      # DWARF version number
  .int32 0                                      # Offset Into Abbrev. Section
  .int8 4                                       # Address Size (in bytes)
  ${ABBR} 1                                     # DW_TAG_compile_unit
  .int32 __original_main                        # DW_AT_low_pc
  .int32 .L__original_main_end                  # DW_AT_high_pc
  .int32 .Lcomp_dir_str                         # DW_AT_comp_dir
.Lint_type:
  ${ABBR} 8                                     # DW_TAG_base_type
  .int32 .Lint_str                              # DW_AT_name
  ${ABBR} 2                                     # DW_TAG_namespace
  .int32 .Ln1_str                               # DW_AT_name
  ${ABBR} 2                                     # DW_TAG_namespace
  .int32 .Ln2_str                               # DW_AT_name
  ${ABBR} 4                                     # DW_TAG_variable
  .int32 .Lvarname_str                          # DW_AT_name
  .int32 .Lint_type                             # DW_AT_type
  .int8 1                                       # DW_AT_external
  .int8 5                                       # DW_AT_location
  ${DW_OP_addr}
  .int32 0x00
  .int32 .Llinkagename1_str                     # DW_AT_linkage_name
  ${EOM}                                        # End DW_TAG_namespace
  ${ABBR} 4                                     # DW_TAG_variable
  .int32 .Lvarname_str                          # DW_AT_name
  .int32 .Lint_type                             # DW_AT_type
  .int8 0                                       # DW_AT_external
  .int8 5                                       # DW_AT_location
  ${DW_OP_addr}
  .int32 0x00
  .int32 .Llinkagename2_str                     # DW_AT_linkage_name
  ${ABBR} 5                                     # DW_TAG_variable
  .int32 .Lstatic_var_addr                      # DW_AT_specification
  .int8 5                                       # DW_AT_location
  ${DW_OP_addr}
  .int32 0x00
  .int32 .Llinkagename3_str                     # DW_AT_linkage_name
  ${ABBR} 6                                     # DW_TAG_class_type
  .int32 .Lclassname_str                        # DW_AT_name
.Lstatic_var_addr:
  ${ABBR} 7                                     # DW_TAG_member
  .int32 .Lvarname_str                          # DW_AT_name
  .int32 .Lint_type                             # DW_AT_type
  .int8 1                                       # DW_AT_external
  .int8 1                                       # DW_AT_declaration
  ${EOM}                                        # End DW_TAG_class_type
  ${EOM}                                        # End DW_TAG_namespace
  ${ABBR} 9                                     # DW_TAG_namespace
  ${ABBR} 4                                     # DW_TAG_variable
  .int32 .Lvarname_str                          # DW_AT_name
  .int32 .Lint_type                             # DW_AT_type
  .int8 1                                       # DW_AT_external
  .int8 5                                       # DW_AT_location
  ${DW_OP_addr}
  .int32 0x00
  .int32 .Llinkagename4_str                     # DW_AT_linkage_name
  ${EOM}                                        # End DW_TAG_namespace
  ${ABBR} 10                                    # DW_TAG_subprogram
  .int32 __original_main                        # DW_AT_low_pc
  .int32 .L__original_main_end                  # DW_AT_high_pc
  ${ABBR} 4                                     # DW_TAG_variable
  .int32 .Lvarname3_str                         # DW_AT_name
  .int32 .Lint_type                             # DW_AT_type
  .int8 1                                       # DW_AT_external
  # DW_AT_location
  .int8 4
  ${DW_OP_WASM_location}
  .int8 0x0
  .int8 0x1
  ${DW_OP_stack_value}
  .int32 .Llinkagename5_str                     # DW_AT_linkage_name
  ${EOM}                                        # End DW_TAG_subprogram
  ${EOM}                                        # End DW_TAG_compile_unit
.Ldebug_info_end0:

  .section  .debug_str,"S",@
.Lcomp_dir_str:
  .asciz  "/tmp"
.Ln1_str:
  .asciz "n1"
.Ln2_str:
  .asciz "n2"
.Lvarname_str:
  .asciz "I"
.Lclassname_str:
  .asciz "MyClass"
.Lvarname2_str:
  .asciz "K"
.Lvarname3_str:
  .asciz "L"
.Llinkagename1_str:
  .asciz "_ZN2n12n21IE"
.Llinkagename2_str:
  .asciz "_ZN2n11IE"
.Llinkagename3_str:
  .asciz "_ZN2n17MyClass1IE"
.Llinkagename4_str:
  .asciz "_ZN12_GLOBAL__N_11KE"
.Llinkagename5_str:
  .asciz "L"
.Lint_str:
  .asciz "int"

  .section  .debug_abbrev,"",@
  ${ABBR} 1
  ${DW_TAG_compile_unit}
  ${DW_CHILDREN_yes}
  ${DW_AT_low_pc}
  ${DW_FORM_addr}
  ${DW_AT_high_pc}
  ${DW_FORM_data4}
  ${DW_AT_comp_dir}
  ${DW_FORM_strp}
  ${EOM}
  ${EOM}
  ${ABBR} 2
  ${DW_TAG_namespace}
  ${DW_CHILDREN_yes}
  ${DW_AT_name}
  ${DW_FORM_strp}
  ${EOM}
  ${EOM}
  ${ABBR} 4
  ${DW_TAG_variable}
  ${DW_CHILDREN_no}
  ${DW_AT_name}
  ${DW_FORM_strp}
  ${DW_AT_type}
  ${DW_FORM_ref_addr}
  ${DW_AT_external}
  ${DW_FORM_flag}
  ${DW_AT_location}
  ${DW_FORM_exprloc}
  ${DW_AT_linkage_name}
  ${DW_FORM_strp}
  ${EOM}
  ${EOM}
  ${ABBR} 5
  ${DW_TAG_variable}
  ${DW_CHILDREN_no}
  ${DW_AT_specification}
  ${DW_FORM_ref_addr}
  ${DW_AT_location}
  ${DW_FORM_exprloc}
  ${DW_AT_linkage_name}
  ${DW_FORM_strp}
  ${EOM}
  ${EOM}
  ${ABBR} 6
  ${DW_TAG_class_type}
  ${DW_CHILDREN_yes}
  ${DW_AT_name}
  ${DW_FORM_strp}
  ${EOM}
  ${EOM}
  ${ABBR} 7
  ${DW_TAG_member}
  ${DW_CHILDREN_no}
  ${DW_AT_name}
  ${DW_FORM_strp}
  ${DW_AT_type}
  ${DW_FORM_ref_addr}
  ${DW_AT_external}
  ${DW_FORM_flag}
  ${DW_AT_declaration}
  ${DW_FORM_flag}
  ${EOM}
  ${EOM}
  ${ABBR} 8
  ${DW_TAG_base_type}
  ${DW_CHILDREN_no}
  ${DW_AT_name}
  ${DW_FORM_strp}
  ${EOM}
  ${EOM}
  ${ABBR} 9
  ${DW_TAG_namespace}
  ${DW_CHILDREN_yes}
  ${EOM}
  ${EOM}
  ${ABBR} 10
  ${DW_TAG_subprogram}
  ${DW_CHILDREN_yes}
  ${DW_AT_low_pc}
  ${DW_FORM_addr}
  ${DW_AT_high_pc}
  ${DW_FORM_addr}
  ${EOM}
  ${EOM}
  ${EOM}
