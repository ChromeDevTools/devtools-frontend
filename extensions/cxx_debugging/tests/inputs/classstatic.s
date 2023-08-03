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
  .int8 1                                       # Abbrev [1] DW_TAG_compile_unit
  .int32 __original_main                        # DW_AT_low_pc
  .int32 .L__original_main_end                  # DW_AT_high_pc
  .int32 .Lcomp_dir                             # DW_AT_comp_dir

.Ltype:
  ${ABBR} 2                                     # DW_TAG_type
  .int32 .Ltype_name                            # DW_AT_name
  .int8 0x07                                    # DW_AT_encoding
  .int8 4                                       # DW_AT_byte_size

  ${ABBR} 3                                     # DW_TAG_variable
  .int32 .Llinkage_name                         # DW_AT_linkage_name
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int32 .Ldeclaration                          # DW_AT_specification

  ${ABBR} 4                                     # DW_TAG_class_type
  .int32 .Lclass_name                           # DW_AT_name

.Ldeclaration:
  ${ABBR} 5                                     # DW_TAG_member
  .int32 .Lmember_name                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 1                                       # DW_AT_external
  .int8 1                                       # DW_AT_declaration
  ${EOM}                                        # End DW_TAG_class_type
  ${EOM}                                        # End DW_TAG_compile_unit
.Ldebug_info_end0:

  .section  .debug_str,"S",@
.Lcomp_dir:
  .asciz "/tmp/"
.Ltype_name:
  .asciz "int"
.Llinkage_name:
  .asciz "_ZN7MyClass1IE"
.Lclass_name:
  .asciz "MyClass"
.Lmember_name:
  .asciz "I"

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
  .int8 3                               # Abbreviation Code
  .int8 52                              # DW_TAG_variable
  .int8 0                               # DW_CHILDREN_no
  .int8 0x6e                            # DW_AT_linkage_name
  .int8 14                              # DW_FORM_strp
  .int8 2                               # DW_AT_location
  .int8 24                              # DW_FORM_exprloc
  .int8 0x47                            # DW_AT_specification
  .int8 0x10                            # DW_FORM_ref_addr
  .int8 0                               # EOM(1)
  .int8 0                               # EOM(2)
  .int8 4                               # Abbreviation Code
  .int8 2                               # DW_TAG_class_type
  .int8 1                               # DW_CHILDREN_yes
  .int8 3                               # DW_AT_name
  .int8 14                              # DW_FORM_strp
  .int8 0                               # EOM(1)
  .int8 0                               # EOM(2)
  .int8 5                               # Abbreviation Code
  .int8 0x0d                            # DW_TAG_member
  .int8 0                               # DW_CHILDREN_no
  .int8 3                               # DW_AT_name
  .int8 14                              # DW_FORM_strp
  .int8 0x49                            # DW_AT_type
  .int8 0x10                            # DW_FORM_ref_addr
  .int8 0x3f                            # DW_AT_external
  .int8 0x0c                            # DW_FORM_flag
  .int8 0x3c                            # DW_AT_declaration
  .int8 0x0c                            # DW_FORM_flag
  .int8 0                               # EOM(1)
  .int8 0                               # EOM(2)
  .int8 0                               # EOM(3)
