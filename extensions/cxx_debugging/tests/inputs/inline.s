# Copyright 2023 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

  .text
  .globl  __original_main
  .type __original_main,@function
__original_main:
  .functype __original_main () -> (i32)
  .file 1 "inline.c"
	.loc	1 1 0
  i32.const 0
.L__inline_begin:
	.loc	1 10 0
  return
.L__inline_end:
	.loc	1 2 0
  end_function
.L__original_main_end:

  .section  .debug_info,"",@
  .int32  .Ldebug_info_end0-.Ldebug_info_start0 # Length of Unit
.Ldebug_info_start0:
  .int16 4                                      # DWARF version number
  .int32 0                                      # Offset Into Abbrev. Section
  .int8 4                                       # Address Size (in bytes)

  ${ABBR} 1                                     # DW_TAG_compile_unit
  .int32 .Lcomp_dir_str                         # DW_AT_comp_dir
  .int32 __original_main                        # DW_AT_low_pc
  .int32 .L__original_main_end                  # DW_AT_high_pc
  .int32 .Lline_table_start0                    # DW_AT_stmt_list

.Linline_fn_def:
  ${ABBR} 2                                     # DW_TAG_subprogram
  .int32 .Linlined_fn_name_str                  # DW_AT_name
  ${DW_INL_inlined}                             # DW_AT_inline

.Lvar_def:
  ${ABBR} 5 # DW_TAG_variable
  .int32 .Lvarname_str # DW_AT_name

.Lparam_def:
  ${ABBR} 6 # DW_TAG_formal_parameter
  .int32 .Lparamname_str # DW_AT_name
  ${EOM}                                        # End DW_TAG_subprogram

  ${ABBR} 3                                     # DW_TAG_subprogram
  .int32 .Lcalling_fn_name_str                  # DW_AT_name
  .int32 __original_main                        # DW_AT_low_pc
  .int32 .L__original_main_end                  # DW_AT_high_pc

  ${ABBR} 9                                     # DW_TAG_variable
  # DW_AT_location
  .int8 2
  ${DW_OP_fbreg}
  .int8 0
  .int32 .Louter_varvame_str                    # DW_AT_name

  ${ABBR} 4                                     # DW_TAG_inlined_subroutine
  .int32 .Linline_fn_def                        # DW_AT_abstract_origin
  .int32 .L__inline_begin                       # DW_AT_low_pc
  .int32 .L__inline_end                         # DW_AT_high_pc

  ${ABBR} 7                                     # DW_TAG_variable
  # DW_AT_location
  .int8 2
  ${DW_OP_fbreg}
  .int8 0
  .int32 .Lvar_def                              # DW_AT_abstract_origin

  ${ABBR} 8                                     # DW_TAG_formal_parameter
  # DW_AT_location
  .int8 2
  ${DW_OP_fbreg}
  .int8 0
  .int32 .Lparam_def                            # DW_AT_abstract_origin
  ${EOM}                                        #End DW_TAG_inlined subroutine

  ${EOM}                                        # End DW_TAG_subprogram
  ${EOM}                                        # End DW_TAG_compile_unit
.Ldebug_info_end0:

  .section  .debug_str,"S",@
.Lcomp_dir_str:
  .asciz ""
.Linlined_fn_name_str:
  .asciz "callee"
.Lcalling_fn_name_str:
  .asciz "caller"
.Louter_varvame_str:
  .asciz "outer_var"
.Lvarname_str:
  .asciz "inner_var"
.Lparamname_str:
  .asciz "inner_param"

  .section  .debug_abbrev,"",@
  ${ABBR} 1
  ${DW_TAG_compile_unit}
  ${DW_CHILDREN_yes}
  ${DW_AT_comp_dir}
  ${DW_FORM_strp}
  ${DW_AT_low_pc}
  ${DW_FORM_addr}
  ${DW_AT_high_pc}
  ${DW_FORM_addr}
  ${DW_AT_stmt_list}
  ${DW_FORM_sec_offset}
  ${EOM}
  ${EOM}

  ${ABBR} 2
  ${DW_TAG_subprogram}
  ${DW_CHILDREN_yes}
  ${DW_AT_name}
  ${DW_FORM_strp}
  ${DW_AT_inline}
  ${DW_FORM_data1}
  ${EOM}
  ${EOM}

  ${ABBR} 3
  ${DW_TAG_subprogram}
  ${DW_CHILDREN_yes}
  ${DW_AT_name}
  ${DW_FORM_strp}
  ${DW_AT_low_pc}
  ${DW_FORM_addr}
  ${DW_AT_high_pc}
  ${DW_FORM_addr}
  ${EOM}
  ${EOM}

  ${ABBR} 4
  ${DW_TAG_inlined_subroutine}
  ${DW_CHILDREN_yes}
  ${DW_AT_abstract_origin}
  ${DW_FORM_ref_addr}
  ${DW_AT_low_pc}
  ${DW_FORM_addr}
  ${DW_AT_high_pc}
  ${DW_FORM_addr}
  ${EOM}
  ${EOM}

  ${ABBR} 5
  ${DW_TAG_variable}
  ${DW_CHILDREN_no}
  ${DW_AT_name}
  ${DW_FORM_strp}
  ${EOM}
  ${EOM}

  ${ABBR} 6
  ${DW_TAG_formal_parameter}
  ${DW_CHILDREN_no}
  ${DW_AT_name}
  ${DW_FORM_strp}
  ${EOM}
  ${EOM}

  ${ABBR} 7
  ${DW_TAG_variable}
  ${DW_CHILDREN_no}
  ${DW_AT_location}
  ${DW_FORM_exprloc}
  ${DW_AT_abstract_origin}
  ${DW_FORM_ref_addr}
  ${EOM}
  ${EOM}

  ${ABBR} 8
  ${DW_TAG_formal_parameter}
  ${DW_CHILDREN_no}
  ${DW_AT_location}
  ${DW_FORM_exprloc}
  ${DW_AT_abstract_origin}
  ${DW_FORM_ref_addr}
  ${EOM}
  ${EOM}

  ${ABBR} 9
  ${DW_TAG_variable}
  ${DW_CHILDREN_no}
  ${DW_AT_location}
  ${DW_FORM_exprloc}
  ${DW_AT_name}
  ${DW_FORM_strp}
  ${EOM}
  ${EOM}

  ${EOM}

	.section	.debug_line,"",@
.Lline_table_start0:
