# Copyright 2023 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

  .text
  .globl  __original_main
  .type __original_main,@function
__original_main:
  .functype __original_main () -> (i32)
	.file	1 "hello.c"
	.loc	1 3 0
  i32.const 0
	.file	2 "printf.h"
	.loc	2 1 0
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
  .int32 .Lstring0                              # DW_AT_comp_dir
  .int32 .Lline_table_start0                    # DW_AT_stmt_list

  ${ABBR} 2                                     # DW_TAG_subprogram
  .int32 __original_main                        # DW_AT_low_pc
  .int32 .L__original_main_end                  # DW_AT_high_pc
  ${EOM}                                        # End DW_TAG_subprogram
.Ldebug_info_end0:

  .section  .debug_str,"S",@
.Lstring0:
  .asciz  ""

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
  ${DW_AT_stmt_list}
  ${DW_FORM_sec_offset}
  ${EOM}
  ${EOM}

  ${ABBR} 2
  ${DW_TAG_subprogram}
  ${DW_CHILDREN_no}
  ${DW_AT_low_pc}
  ${DW_FORM_addr}
  ${DW_AT_high_pc}
  ${DW_FORM_addr}
  ${EOM}
  ${EOM}
  ${EOM}

	.section	.debug_line,"",@
.Lline_table_start0:
