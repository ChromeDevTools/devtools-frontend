# Copyright 2023 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

  .text
  .file "embedded.c"
  .globl  __original_main
  .type __original_main,@function
__original_main:                        # @__original_main
  .functype __original_main () -> (i32)
  i32.const 0
  return
  end_function
.Lfunc_end0:

  .section  .debug_info,"",@
  .int32  .Ldebug_info_end0-.Ldebug_info_start0 # Length of Unit
.Ldebug_info_start0:
  .int16 4                                      # DWARF version number
  .int32 0                                      # Offset Into Abbrev. Section
  .int8 4                                       # Address Size (in bytes)

  ${ABBR} 1                                     # DW_TAG_compile_unit
  .int32 0x8                                    # DW_AT_low_pc
  .int32 0x10                                   # DW_AT_high_pc
  .int32 .Lstring0                              # DW_AT_comp_dir

  ${ABBR} 2                                     # DW_TAG_variable
  .int32 0xDEADBEEF                             # DW_AT_const_value
  .int32 .Lstring1                              # DW_AT_name
  .int32 .Ldebug_info_type0                     # DW_AT_type

  ${ABBR} 5                                     # DW_TAG_variable
  .int32 0xDEADBEEF
  .int32 .Lstring3                              # DW_AT_name
  .int32 .Ldebug_info_type1                     # DW_AT_type

.Ldebug_info_type0:
  ${ABBR} 3                                     # DW_TAG_type
  .int32 .Lstring2                              # DW_AT_name
  .int8 0x07                                    # DW_AT_encoding
  .int8 4                                       # DW_AT_byte_size

.Ldebug_info_type1:
  ${ABBR} 4                                     # DW_TAG_pointer_type
  .int32 .Lstring4                              # DW_AT_name
  .int8 4                                       # DW_AT_byte_size
  .int32 .Ldebug_info_type0                     # DW_AT_type
  ${EOM}                                        # End DW_TAG_compile_unit
.Ldebug_info_end0:

  .section  .debug_addr,"",@
.Laddr_table_base0:
  .int32 0xbeef

  .section  .debug_str,"S",@
.Lstring0:
  .asciz  "tests/inputs"
.Lstring1:
  .asciz  "constant_var"
.Lstring2:
  .asciz  "uint32_t"
.Lstring3:
  .asciz  "constant_var_ptr"
.Lstring4:
  .asciz  "uint32_t *"

  .section  .debug_abbrev,"",@
  .int8 1                               # Abbreviation Code
  .int8 17                              # DW_TAG_compile_unit
  .int8 1                               # DW_CHILDREN_yes
  .int8 17                              # DW_AT_low_pc
  .int8 1                               # DW_FORM_addr
  .int8 18                              # DW_AT_high_pc
  .int8 6                               # DW_FORM_data4
  .int8 27                              # DW_AT_comp_dir
  .int8 14                              # DW_FORM_strp
  .int8 0                               # EOM(1)
  .int8 0                               # EOM(2)
  .int8 2                               # Abbreviation Code
  .int8 52                              # DW_TAG_variable
  .int8 0                               # DW_CHILDREN_no
  .int8 0x1c                            # DW_AT_const_value
  .int8 6                               # DW_FORM_data4
  .int8 3                               # DW_AT_name
  .int8 14                              # DW_FORM_strp
  .int8 0x49                            # DW_AT_type
  .int8 0x10                            # DW_FORM_ref_addr
  .int8 0                               # EOM(1)
  .int8 0                               # EOM(2)
  .int8 3                               # Abbreviation Code
  .int8 0x24                            # DW_TAG_base_type
  .int8 0                               # DW_CHILDREN_no
  .int8 3                               # DW_AT_name
  .int8 14                              # DW_FORM_strp
  .int8 0x3e                            # DW_AT_encoding
  .int8 0x0b                            # DW_FORM_data1
  .int8 0x0b                            # DW_AT_byte_size
  .int8 0x0b                            # DW_FORM_data1
  .int8 0                               # EOM(1)
  .int8 0                               # EOM(2)
  .int8 4                               # Abbreviateion code
  .int8 0x0f                            # DW_TAG_pointer_type
  .int8 0                               # DW_CHILDREN_no
  .int8 3                               # DW_AT_name
  .int8 14                              # DW_FORM_strp
  .int8 0x0b                            # DW_AT_byte_size
  .int8 0x0b                            # DW_FORM_data1
  .int8 0x49                            # DW_AT_type
  .int8 0x10                            # DW_FORM_ref_addr
  .int8 0                               # EOM(1)
  .int8 0                               # EOM(2)
  .int8 5                               # Abbreviation Code
  .int8 52                              # DW_TAG_variable
  .int8 0                               # DW_CHILDREN_no
  .int8 0x1c                            # DW_AT_const_value
  .int8 6                               # DW_FORM_data4
  .int8 3                               # DW_AT_name
  .int8 14                              # DW_FORM_strp
  .int8 0x49                            # DW_AT_type
  .int8 0x10                            # DW_FORM_ref_addr
  .int8 0                               # EOM(1)
  .int8 0                               # EOM(2)
  .int8 0                               # EOM(3)
