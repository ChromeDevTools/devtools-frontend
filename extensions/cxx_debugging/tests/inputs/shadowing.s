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
  .int32  .Ldebug_info_end-.Ldebug_info_start # Length of Unit
.Ldebug_info_start:
  .int16 4                                      # DWARF version number
  .int32 0                                      # Offset Into Abbrev. Section
  .int8 4                                       # Address Size (in bytes)
  ${ABBR} 1 # DW_TAG_compile_unit
  .int32 __original_main # DW_AT_low_pc
  .int32 .L__original_main_end # DW_AT_high_pc
  .int32 .Lcomp_dir_str # DW_AT_comp_dir
.Ltype_int:
  ${ABBR} 2 # DW_TAG_base_type
  .int32 .Ltype_int_str # DW_AT_name
  ${ABBR} 3 # DW_TAG_subprogram
  .int32 __original_main # DW_AT_low_pc
  .int32 .L__original_main_end # DW_AT_high_pc
  .int32 .Lfn_name_str # DW_AT_name
  ${ABBR} 4 # DW_TAG_formal_parameter
  .int32 .Lvar_name_str # DW_AT_name
  .int32 .Ltype_int # DW_AT_type
  ${ABBR} 5 # DW_TAG_lexical_block
  .int32 __original_main+1 # DW_AT_low_pc
  .int32 .L__original_main_end # DW_AT_high_pc
  ${ABBR} 6 # DW_TAG_variable
  .int32 .Lvar_name_str # DW_AT_name
  .int32 .Ltype_int # DW_AT_type
  # DW_AT_location
  .int8 2
  ${DW_OP_fbreg}
  .int8 0x0
  ${EOM} # End DW_TAG_lexical_block
  ${EOM} # End DW_TAG_subprogram
  ${EOM} # End DW_TAG_compile_unit
.Ldebug_info_end:

  .section  .debug_str,"S",@
.Lcomp_dir_str:
  .asciz "/tmp"
.Ltype_int_str:
  .asciz "int"
.Ltype_float_str:
  .asciz "float"
.Lfn_name_str:
  .asciz "fn"
.Lvar_name_str:
  .asciz "a"

  .section  .debug_abbrev,"",@
  ${ABBR} 1
  ${DW_TAG_compile_unit}
  ${DW_CHILDREN_yes}
  ${DW_AT_low_pc}
  ${DW_FORM_addr}
  ${DW_AT_high_pc}
  ${DW_FORM_addr}
  ${DW_AT_comp_dir}
  ${DW_FORM_strp}
  ${EOM}
  ${EOM}
  ${ABBR} 2
  ${DW_TAG_base_type}
  ${DW_CHILDREN_no}
  ${DW_AT_name}
  ${DW_FORM_strp}
  ${EOM}
  ${EOM}
  ${ABBR} 3
  ${DW_TAG_subprogram}
  ${DW_CHILDREN_yes}
  ${DW_AT_low_pc}
  ${DW_FORM_addr}
  ${DW_AT_high_pc}
  ${DW_FORM_addr}
  ${DW_AT_name}
  ${DW_FORM_strp}
  ${EOM}
  ${EOM}
  ${ABBR} 4
  ${DW_TAG_formal_parameter}
  ${DW_CHILDREN_no}
  ${DW_AT_name}
  ${DW_FORM_strp}
  ${DW_AT_type}
  ${DW_FORM_ref_addr}
  ${EOM}
  ${EOM}
  ${ABBR} 5
  ${DW_TAG_lexical_block}
  ${DW_CHILDREN_yes}
  ${DW_AT_low_pc}
  ${DW_FORM_addr}
  ${DW_AT_high_pc}
  ${DW_FORM_addr}
  ${EOM}
  ${EOM}
  ${ABBR} 6
  ${DW_TAG_variable}
  ${DW_CHILDREN_no}
  ${DW_AT_name}
  ${DW_FORM_strp}
  ${DW_AT_type}
  ${DW_FORM_ref_addr}
  ${DW_AT_location}
  ${DW_FORM_exprloc}
  ${EOM}
  ${EOM}
  ${EOM}
