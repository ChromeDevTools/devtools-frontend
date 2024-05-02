# Copyright 2023 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

  .text
  # Need a non-empty code section for variable lookups to be able to find the
  # comp unit by code offset.
  .file "split-dwarf.c"
  .globl  __original_main
  .type __original_main,@function
__original_main:                        # @__original_main
  .functype __original_main () -> (i32)
  i32.const 0
  return
  end_function
.Lfunc_end0:
  .size __original_main, .Lfunc_end0-__original_main

  .section  .debug_info,"",@
  .int32  .Ldebug_info_end0-.Ldebug_info_start0 # Length of Unit
.Ldebug_info_start0:
  .int16  4                             # DWARF version number
  .int32  0                             # Offset Into Abbrev. Section
  .int8 4                               # Address Size (in bytes)
  .int8 1                               # Abbrev [1] DW_TAG_compile_unit
  .int32 0x8                            # DW_AT_low_pc
  .int32 0x10                           # DW_AT_high_pc
  .int32  .Lstring0                     # DW_AT_comp_dir
  .int32  .Lstring1                     # DW_AT_GNU_dwo_name
  .int64  0x12345                       # DW_AT_GNU_dwo_id
  .int32  .Laddr_table_base0            # DW_AT_GNU_addr_base
.Ldebug_info_end0:

  .section  .debug_addr,"",@
.Laddr_table_base0:
  .int32 0xbeef

  .section  .debug_str,"S",@
.Lstring0:
  .asciz  "."
.Lstring1:
  .asciz  "split-dwarf.s.dwo"

  .section  .debug_abbrev,"",@
  .int8 1                               # Abbreviation Code
  .int8 17                              # DW_TAG_compile_unit
  .int8 0                               # DW_CHILDREN_no
  .int8 17                              # DW_AT_low_pc
  .int8 1                               # DW_FORM_addr
  .int8 18                              # DW_AT_high_pc
  .int8 6                               # DW_FORM_data4
  .int8 27                              # DW_AT_comp_dir
  .int8 14                              # DW_FORM_strp
  .ascii  "\260B"                       # DW_AT_GNU_dwo_name
  .int8 14                              # DW_FORM_strp
  .ascii  "\261B"                       # DW_AT_GNU_dwo_id
  .int8 7                               # DW_FORM_data8
  .ascii  "\263B"                       # DW_AT_GNU_addr_base
  .int8 23                              # DW_FORM_sec_offset
  .int8 0                               # EOM(1)
  .int8 0                               # EOM(2)
  .int8 0                               # EOM(3)

  .section  .debug_info.dwo,"",@
  .int32  .Ldebug_info_dwo_end0-.Ldebug_info_dwo_start0 # Length of Unit
.Ldebug_info_dwo_start0:
  .int16  4                             # DWARF version number
  .int32  0                             # Offset Into Abbrev. Section
  .int8 4                               # Address Size (in bytes)
  .int8 1                               # Abbrev [1] DW_TAG_compile_unit
  .int8 3                               # DW_AT_producer
  .int16  12                            # DW_AT_language
  .int8 0                               # DW_AT_name
  .int8 1                               # DW_AT_GNU_dwo_name
  .int64  0x12345                       # DW_AT_GNU_dwo_id
  .int8 2                               # Abbrev [2] DW_TAG_variable
  .int8 2                               # DW_AT_location
  .int8 0xfb                            # DW_OP_GNU_addr_index
  .int8 0
  .int8 2                               # DW_AT_name
.Ldebug_info_dwo_end0:

  .section  .debug_str.dwo,"S",@
.Ldebug_str_dwo0:
  .asciz "string-split.c"
.Ldebug_str_dwo1:
  .asciz "string-split.s.dwo"
.Ldebug_str_dwo2:
  .asciz "global_var"
.Ldebug_str_dwo3:
  .asciz "Handwritten DWARF"
.Ldebug_str_dwo_end:

  .section  .debug_str_offsets.dwo,"",@
  .int32 .Ldebug_str_dwo0-.Ldebug_str_dwo0
  .int32 .Ldebug_str_dwo1-.Ldebug_str_dwo0
  .int32 .Ldebug_str_dwo2-.Ldebug_str_dwo0
  .int32 .Ldebug_str_dwo3-.Ldebug_str_dwo0

  .section  .debug_abbrev.dwo,"",@
.Ldebug_abbrev_dwo0:
  .int8 1                               # Abbreviation Code
  .int8 17                              # DW_TAG_compile_unit
  .int8 1                               # DW_CHILDREN_yes
  .int8 37                              # DW_AT_producer
  .ascii  "\202>"                       # DW_FORM_GNU_str_index
  .int8 19                              # DW_AT_language
  .int8 5                               # DW_FORM_data2
  .int8 3                               # DW_AT_name
  .ascii  "\202>"                       # DW_FORM_GNU_str_index
  .ascii  "\260B"                       # DW_AT_GNU_dwo_name
  .ascii  "\202>"                       # DW_FORM_GNU_str_index
  .ascii  "\261B"                       # DW_AT_GNU_dwo_id
  .int8 7                               # DW_FORM_data8
  .int8 0                               # EOM(1)
  .int8 0                               # EOM(2)
  .int8 2                               # Abbreviation Code
  .int8 52                              # DW_TAG_variable
  .int8 0                               # DW_CHILDREN_no
  .int8 2                               # DW_AT_location
  .int8 24                              # DW_FORM_exprloc
  .int8 3                               # DW_AT_name
  .ascii  "\202>"                       # DW_FORM_GNU_str_index
  .int8 0                               # EOM(1)
  .int8 0                               # EOM(2)
  .int8 0                               # EOM(3)
