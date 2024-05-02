# Copyright 2023 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

  .text
  # Need a non-empty code section for variable lookups to be able to find the
  # comp unit by code offset.
  .file "embedded.c"
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
  .int16 4                                      # DWARF version number
  .int32 0                                      # Offset Into Abbrev. Section
  .int8 4                                       # Address Size (in bytes)
  .int8 1                                       # Abbrev [1] DW_TAG_compile_unit
  .int32 0x8                                    # DW_AT_low_pc
  .int32 0x10                                   # DW_AT_high_pc
  .int32 .Lstring0                              # DW_AT_comp_dir
  .int32 .debug_addr                            # DW_AT_GNU_addr_base

  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lstring1                              # DW_AT_name
  .int32 .Ldebug_info_type0                     # DW_AT_type
  .int8 2                                       # DW_AT_LOCATION
  .int8 0xfb                                    # DW_OP_GNU_addr_index
  .int8 0

.Ldebug_info_type0:
  .int8 3                                       # Abbrev [3] DW_TAG_type
  .int32 .Lstring2                              # DW_AT_name
  .int8 0x07                                    # DW_AT_encoding
  .int8 4                                       # DW_AT_byte_size
  ${EOM}
.Ldebug_info_end0:

  .section  .debug_addr,"",@
.Laddr_table_base0:
  .int32 0xffffffff

  .section  .debug_str,"S",@
.Lstring0:
  .asciz  "tests/inputs"
.Lstring1:
  .asciz  "optimized_out"
.Lstring2:
  .asciz  "uint32_t"

  .section  .debug_abbrev,"",@
  .int8 1                                       # Abbreviation Code
  .int8 17                                      # DW_TAG_compile_unit
  .int8 1                                       # DW_CHILDREN_yes
  .int8 17                                      # DW_AT_low_pc
  .int8 1                                       # DW_FORM_addr
  .int8 18                                      # DW_AT_high_pc
  .int8 6                                       # DW_FORM_data4
  .int8 27                                      # DW_AT_comp_dir
  .int8 14                                      # DW_FORM_strp
  .ascii "\263B"                                # DW_AT_GNU_addr_base
  .int8 23                                      # DW_FORM_sec_offset
  .int8 0                                       # EOM(1)
  .int8 0                                       # EOM(2)

  .int8 2                                       # Abbreviation Code
  .int8 52                                      # DW_TAG_variable
  .int8 0                                       # DW_CHILDREN_no
  .int8 3                                       # DW_AT_name
  .int8 14                                      # DW_FORM_strp
  .int8 0x49                                    # DW_AT_type
  .int8 0x10                                    # DW_FORM_ref_addr
  .int8 2                                       # DW_AT_location
  .int8 24                                      # DW_FORM_exprloc
  .int8 0                                       # EOM(1)
  .int8 0                                       # EOM(2)

  .int8 3                                       # Abbreviation Code
  .int8 0x24                                    # DW_TAG_base_type
  .int8 0                                       # DW_CHILDREN_no
  .int8 3                                       # DW_AT_name
  .int8 14                                      # DW_FORM_strp
  .int8 0x3e                                    # DW_AT_encoding
  .int8 0x0b                                    # DW_FORM_data1
  .int8 0x0b                                    # DW_AT_byte_size
  .int8 0x0b                                    # DW_FORM_data1
  .int8 0                                       # EOM(1)
  .int8 0                                       # EOM(2)

  .int8 0                                       # EOM(3)
