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

  .section  .debug_abbrev,"",@
  .int8 1                                 # Abbreviation Code
  .int8 17                                # DW_TAG_compile_unit
  .int8 1                                 # DW_CHILDREN_yes
  .int8 17                                # DW_AT_low_pc
  .int8 1                                 # DW_FORM_addr
  .int8 18                                # DW_AT_high_pc
  .int8 6                                 # DW_FORM_data4
  .int8 27                                # DW_AT_comp_dir
  .int8 14                                # DW_FORM_strp
  .int8 0                                 # EOM(1)
  .int8 0                                 # EOM(2)

  .int8 2                                 # Abbreviation Code
  .int8 4                                 # DW_TAG_enumeration_type
  .int8 1                                 # DW_CHILDREN_yes
  .int8 73                                # DW_AT_type
  .int8 19                                # DW_FORM_ref4
  .int8 3                                 # DW_AT_name
  .int8 14                                # DW_FORM_strp
  .int8 11                                # DW_AT_byte_size
  .int8 11                                # DW_FORM_data1
  .int8 0                                 # EOM(1)
  .int8 0                                 # EOM(2)

  .int8 3                                 # Abbreviation Code
  .int8 40                                # DW_TAG_enumerator
  .int8 0                                 # DW_CHILDREN_no
  .int8 3                                 # DW_AT_name
  .int8 14                                # DW_FORM_strp
  .int8 28                                # DW_AT_const_value
  .int8 15                                # DW_FORM_udata
  .int8 0                                 # EOM(1)
  .int8 0                                 # EOM(2)

  .int8 4                                 # Abbreviation Code
  .int8 36                                # DW_TAG_base_type
  .int8 0                                 # DW_CHILDREN_no
  .int8 3                                 # DW_AT_name
  .int8 14                                # DW_FORM_strp
  .int8 62                                # DW_AT_encoding
  .int8 11                                # DW_FORM_data1
  .int8 11                                # DW_AT_byte_size
  .int8 11                                # DW_FORM_data1
  .int8 0                                 # EOM(1)
  .int8 0                                 # EOM(2)

  .int8 5                                 # Abbreviation Code
  .int8 4                                 # DW_TAG_enumeration_type
  .int8 1                                 # DW_CHILDREN_yes
  .int8 73                                # DW_AT_type
  .int8 19                                # DW_FORM_ref4
  .int8 109                               # DW_AT_enum_class
  .int8 25                                # DW_FORM_flag_present
  .int8 3                                 # DW_AT_name
  .int8 14                                # DW_FORM_strp
  .int8 11                                # DW_AT_byte_size
  .int8 11                                # DW_FORM_data1
  .int8 0                                 # EOM(1)
  .int8 0                                 # EOM(2)

  .int8 6                                 # Abbreviation Code
  .int8 40                                # DW_TAG_enumerator
  .int8 0                                 # DW_CHILDREN_no
  .int8 3                                 # DW_AT_name
  .int8 14                                # DW_FORM_strp
  .int8 28                                # DW_AT_const_value
  .int8 13                                # DW_FORM_sdata
  .int8 0                                 # EOM(1)
  .int8 0                                 # EOM(2)

  .int8 7                                 # Abbreviation Code
  .int8 52                                # DW_TAG_variable
  .int8 0                                 # DW_CHILDREN_no
  .int8 3                                 # DW_AT_name
  .int8 14                                # DW_FORM_strp
  .int8 0x49                              # DW_AT_type
  .int8 0x10                              # DW_FORM_ref_addr
  .int8 2                                 # DW_AT_location
  .int8 24                                # DW_FORM_exprloc
  .int8 0                                 # EOM(1)
  .int8 0                                 # EOM(2)
  .int8 0                                 # EOM(3)

  .section  .debug_info,"",@
  .int32  .Ldebug_info_end0-.Ldebug_info_start0 # Length of Unit
.Ldebug_info_start0:
  .int16  5                               # DWARF version number
  .int8 1                                 # DWARF Unit Type
  .int8 4                                 # Address Size (in bytes)
  .int32  .debug_abbrev                   # Offset Into Abbrev. Section
  .int8 1                                 # Abbrev [1] DW_TAG_compile_unit
  # Hard coded value here to address the CU in the test
  .int32  0x8                             # DW_AT_low_pc
  .int32  0x32                            # DW_AT_high_pc
  .int32  .Lstring_comp_dir               # DW_AT_comp_dir

.Ltype_int32:
  .int8 4                                 # Abbrev [4] DW_TAG_base_type
  .int32  .Lstring_int32                  # DW_AT_name
  .int8 5                                 # DW_AT_encoding
  .int8 4                                 # DW_AT_byte_size

.Ltype_uint32:
  .int8 4                                 # Abbrev [4] DW_TAG_base_type
  .int32  .Lstring_int64                  # DW_AT_name
  .int8 5                                 # DW_AT_encoding
  .int8 4                                 # DW_AT_byte_size

.Ltype_int64:
  .int8 4                                 # Abbrev [4] DW_TAG_base_type
  .int32  .Lstring_uint32                 # DW_AT_name
  .int8 7                                 # DW_AT_encoding
  .int8 8                                 # DW_AT_byte_size

.Ltype_uint64:
  .int8 4                                 # Abbrev [4] DW_TAG_base_type
  .int32  .Lstring_uint64                 # DW_AT_name
  .int8 7                                 # DW_AT_encoding
  .int8 8                                 # DW_AT_byte_size

.Ltype_enum_int32:
  .int8 2                                 # Abbrev [2] DW_TAG_enumeration_type
  .int32  .Ltype_int32                    # DW_AT_type
  .int32  .Lstring_enum_i32               # DW_AT_name
  .int8 4                                 # DW_AT_byte_size
  .int8 3                                 # Abbrev [3] DW_TAG_enumerator
  .int32  .Lstring_enum_i32_enum0         # DW_AT_name
  .int8 0                                 # DW_AT_const_value
  .int8 3                                 # Abbrev [3] DW_TAG_enumerator
  .int32  .Lstring_enum_i32_enum1         # DW_AT_name
  .int8 0x01                              # DW_AT_const_value
  .int8 0                                 # End Of Children Mark

.Ltype_enum_uint32:
  .int8 2                                 # Abbrev [2] DW_TAG_enumeration_type
  .int32  .Ltype_uint32                   # DW_AT_type
  .int32  .Lstring_enum_u32               # DW_AT_name
  .int8 4                                 # DW_AT_byte_size
  .int8 3                                 # Abbrev [3] DW_TAG_enumerator
  .int32  .Lstring_enum_u32_enum0         # DW_AT_name
  .int8 0                                 # DW_AT_const_value
  .int8 3                                 # Abbrev [3] DW_TAG_enumerator
  .int32  .Lstring_enum_u32_enum1         # DW_AT_name
  .int8 0x04                              # DW_AT_const_value
  .int8 0                                 # End Of Children Mark

.Ltype_enum_int64:
  .int8 2                                 # Abbrev [2] DW_TAG_enumeration_type
  .int32  .Ltype_int64                    # DW_AT_type
  .int32  .Lstring_enum_i64               # DW_AT_name
  .int8 8                                 # DW_AT_byte_size
  .int8 3                                 # Abbrev [3] DW_TAG_enumerator
  .int32  .Lstring_enum_i64_enum0         # DW_AT_name
  .int8 0                                 # DW_AT_const_value
  .int8 3                                 # Abbrev [3] DW_TAG_enumerator
  .int32  .Lstring_enum_i64_enum1         # DW_AT_name
  .int8 0x08                              # DW_AT_const_value
  .int8 0                                 # End Of Children Mark

.Ltype_enum_uint64:
  .int8 2                                 # Abbrev [2] DW_TAG_enumeration_type
  .int32  .Ltype_uint64                   # DW_AT_type
  .int32  .Lstring_enum_u64               # DW_AT_name
  .int8 8                                 # DW_AT_byte_size
  .int8 3                                 # Abbrev [3] DW_TAG_enumerator
  .int32  .Lstring_enum_u64_enum0         # DW_AT_name
  .int8 0                                 # DW_AT_const_value
  .int8 3                                 # Abbrev [3] DW_TAG_enumerator
  .int32  .Lstring_enum_u64_enum1         # DW_AT_name
  .int8 0x10                              # DW_AT_const_value
  .int8 0                                 # End Of Children Mark

.Ltype_enum_class_int32:
  .int8 5                                 # Abbrev [5] DW_TAG_enumeration_type
  .int32  .Ltype_int32                    # DW_AT_type
  .int32  .Lstring_enum_class_i32         # DW_AT_name
  .int8 4                                 # DW_AT_byte_size
  .int8 6                                 # Abbrev [6] DW_TAG_enumerator
  .int32  .Lstring_enum_class_i32_enum0   # DW_AT_name
  .int8 0                                 # DW_AT_const_value
  .int8 6                                 # Abbrev [6] DW_TAG_enumerator
  .int32  .Lstring_enum_class_i32_enum1   # DW_AT_name
  .int8 0x18                              # DW_AT_const_value
  .int8 0                                 # End Of Children Mark

.Ltype_enum_class_uint32:
  .int8 5                                 # Abbrev [5] DW_TAG_enumeration_type
  .int32  .Ltype_uint32                   # DW_AT_type
  .int32  .Lstring_enum_class_u32         # DW_AT_name
  .int8 4                                 # DW_AT_byte_size
  .int8 6                                 # Abbrev [6] DW_TAG_enumerator
  .int32  .Lstring_enum_class_u32_enum0   # DW_AT_name
  .int8 0                                 # DW_AT_const_value
  .int8 6                                 # Abbrev [6] DW_TAG_enumerator
  .int32  .Lstring_enum_class_u32_enum1   # DW_AT_name
  .int8 0x1C                              # DW_AT_const_value
  .int8 0                                 # End Of Children Mark

.Ltype_enum_class_int64:
  .int8 5                                 # Abbrev [5] DW_TAG_enumeration_type
  .int32  .Ltype_int64                    # DW_AT_type
  .int32  .Lstring_enum_class_i64         # DW_AT_name
  .int8 8                                 # DW_AT_byte_size
  .int8 6                                 # Abbrev [6] DW_TAG_enumerator
  .int32  .Lstring_enum_class_i64_enum0   # DW_AT_name
  .int8 0                                 # DW_AT_const_value
  .int8 6                                 # Abbrev [6] DW_TAG_enumerator
  .int32  .Lstring_enum_class_i64_enum1   # DW_AT_name
  .int8 0x20                              # DW_AT_const_value
  .int8 0                                 # End Of Children Mark

.Ltype_enum_class_uint64:
  .int8 5                                 # Abbrev [5] DW_TAG_enumeration_type
  .int32  .Ltype_uint64                   # DW_AT_type
  .int32  .Lstring_enum_class_u64         # DW_AT_name
  .int8 8                                 # DW_AT_byte_size
  .int8 6                                 # Abbrev [6] DW_TAG_enumerator
  .int32  .Lstring_enum_class_u64_enum0   # DW_AT_name
  .int8 0                                 # DW_AT_const_value
  .int8 6                                 # Abbrev [6] DW_TAG_enumerator
  .int32  .Lstring_enum_class_u64_enum1   # DW_AT_name
  .int8 0x28                              # DW_AT_const_value
  .int8 0                                 # End Of Children Mark

  .int8 7                                 # Abbrev [7] DW_TAG_variable:
  .int32 .Lstring_var_enum_int32          # DW_AT_name
  .int32 .Ltype_enum_int32                # DW_AT_type
  .int8 5                                 # DW_AT_location
  .int8 0x3                               # DW_OP_addr
  .int32 0x00

  .int8 7                                 # Abbrev [7] DW_TAG_variable
  .int32 .Lstring_var_enum_uint32         # DW_AT_name
  .int32 .Ltype_enum_uint32               # DW_AT_type
  .int8 5                                 # DW_AT_location
  .int8 0x3                               # DW_OP_addr
  .int32 0x04

  .int8 7                                 # Abbrev [7] DW_TAG_variable
  .int32 .Lstring_var_enum_int64          # DW_AT_name
  .int32 .Ltype_enum_int64                # DW_AT_type
  .int8 5                                 # DW_AT_location
  .int8 0x3                               # DW_OP_addr
  .int32 0x08

  .int8 7                                 # Abbrev [7] DW_TAG_variable
  .int32 .Lstring_var_enum_uint64         # DW_AT_name
  .int32 .Ltype_enum_uint64               # DW_AT_type
  .int8 5                                 # DW_AT_location
  .int8 0x3                               # DW_OP_addr
  .int32 0x10

  .int8 7                                 # Abbrev [7] DW_TAG_variable
  .int32 .Lstring_var_enum_class_int32    # DW_AT_name
  .int32 .Ltype_enum_class_int32          # DW_AT_type
  .int8 5                                 # DW_AT_location
  .int8 0x3                               # DW_OP_addr
  .int32 0x18

  .int8 7                                 # Abbrev [7] DW_TAG_variable
  .int32 .Lstring_var_enum_class_uint32   # DW_AT_name
  .int32 .Ltype_enum_class_uint32         # DW_AT_type
  .int8 5                                 # DW_AT_location
  .int8 0x3                               # DW_OP_addr
  .int32 0x1C

  .int8 7                                 # Abbrev [7] DW_TAG_variable
  .int32 .Lstring_var_enum_class_int64    # DW_AT_name
  .int32 .Ltype_enum_class_int64          # DW_AT_type
  .int8 5                                 # DW_AT_location
  .int8 0x3                               # DW_OP_addr
  .int32 0x20

  .int8 7                                 # Abbrev [7] DW_TAG_variable
  .int32 .Lstring_var_enum_class_uint64   # DW_AT_name
  .int32 .Ltype_enum_class_uint64         # DW_AT_type
  .int8 5                                 # DW_AT_location
  .int8 0x3                               # DW_OP_addr
  .int32 0x28

  ${EOM}                                  # End DW_AT_compile_unit
.Ldebug_info_end0:

  .section  .debug_str,"S",@
.Lstring_comp_dir:
  .asciz "/tmp"
.Lstring_int32:
  .asciz "int32_t"
.Lstring_int64:
  .asciz "int64_t"
.Lstring_uint32:
  .asciz "uint32_t"
.Lstring_uint64:
  .asciz "uint64_t"
.Lstring_enum_i32:
  .asciz "enum_i32"
.Lstring_enum_i32_enum0:
  .asciz "enum_i32_enum0"
.Lstring_enum_i32_enum1:
  .asciz "enum_i32_enum1"
.Lstring_enum_u32:
  .asciz "enum_u32"
.Lstring_enum_u32_enum0:
  .asciz "enum_u32_enum0"
.Lstring_enum_u32_enum1:
  .asciz "enum_u32_enum1"
.Lstring_enum_i64:
  .asciz "enum_i64"
.Lstring_enum_i64_enum0:
  .asciz "enum_i64_enum0"
.Lstring_enum_i64_enum1:
  .asciz "enum_i64_enum1"
.Lstring_enum_u64:
  .asciz "enum_u64"
.Lstring_enum_u64_enum0:
  .asciz "enum_u64_enum0"
.Lstring_enum_u64_enum1:
  .asciz "enum_u64_enum1"
.Lstring_enum_class_i32:
  .asciz "enum_class_i32"
.Lstring_enum_class_i32_enum0:
  .asciz "enum_class_i32_enum0"
.Lstring_enum_class_i32_enum1:
  .asciz "enum_class_i32_enum1"
.Lstring_enum_class_u32:
  .asciz "enum_class_u32"
.Lstring_enum_class_u32_enum0:
  .asciz "enum_class_u32_enum0"
.Lstring_enum_class_u32_enum1:
  .asciz "enum_class_u32_enum1"
.Lstring_enum_class_i64:
  .asciz "enum_class_i64"
.Lstring_enum_class_i64_enum0:
  .asciz "enum_class_i64_enum0"
.Lstring_enum_class_i64_enum1:
  .asciz "enum_class_i64_enum1"
.Lstring_enum_class_u64:
  .asciz "enum_class_u64"
.Lstring_enum_class_u64_enum0:
  .asciz "enum_class_u64_enum0"
.Lstring_enum_class_u64_enum1:
  .asciz "enum_class_u64_enum1"
.Lstring_var_enum_int32:
  .asciz "var_enum_i32"
.Lstring_var_enum_uint32:
  .asciz "var_enum_u32"
.Lstring_var_enum_int64:
  .asciz "var_enum_i64"
.Lstring_var_enum_uint64:
  .asciz "var_enum_u64"
.Lstring_var_enum_class_int32:
  .asciz "var_enum_class_i32"
.Lstring_var_enum_class_uint32:
  .asciz "var_enum_class_u32"
.Lstring_var_enum_class_int64:
  .asciz "var_enum_class_i64"
.Lstring_var_enum_class_uint64:
  .asciz "var_enum_class_u64"
