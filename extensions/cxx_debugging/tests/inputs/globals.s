# Copyright 2023 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

  .text
  .globl  __original_main
  .type __original_main,@function
__original_main:
  .functype __original_main () -> (i32)
  i32.const 0
.Lsub_main:
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
  .int32 .Lsub_main                             # DW_AT_high_pc
  .int32 .Lcomp_dir                             # DW_AT_comp_dir
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_1                           # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_2                           # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_3                           # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_4                           # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_5                           # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_6                           # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_7                           # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_8                           # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_9                           # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_10                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_11                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_12                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_13                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_14                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_15                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_16                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_17                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_18                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_19                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_20                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_21                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_22                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_23                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_24                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_25                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_26                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_27                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_28                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_29                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_30                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_31                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_32                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_33                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_34                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_35                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_36                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_37                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_38                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_39                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_40                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_41                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_42                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
  .int8 2                                       # Abbrev [2] DW_TAG_variable
  .int32 .Lvar_name_43                          # DW_AT_name
  .int32 .Ltype                                 # DW_AT_type
  .int8 5                                       # DW_AT_location
  .int8 0x3                                     # DW_OP_addr
  .int32 0x00
.Ltype:
  .int8 3                                       # Abbrev [3] DW_TAG_type
  .int32 .Ltype_name                            # DW_AT_name
  .int8 0x07                                    # DW_AT_encoding
  .int8 4                                       # DW_AT_byte_size
  ${EOM}                                        # End DW_TAG_compile_unit
.Ldebug_info_end0:
  .int32  .Ldebug_info_end1-.Ldebug_info_start1 # Length of Unit
.Ldebug_info_start1:
  .int16 4                                      # DWARF version number
  .int32 0                                      # Offset Into Abbrev. Section
  .int8 4                                       # Address Size (in bytes)
  ${ABBR} 1                                     # DW_TAG_compile_unit
  .int32 .Lsub_main                             # DW_AT_low_pc
  .int32 .L__original_main_end                  # DW_AT_high_pc
  .int32 .Lcomp_dir                             # DW_AT_comp_dir
  ${ABBR} 2                                     # DW_TAG_variable
  .int32 .Lvar_name_separate_cu                 # DW_AT_name
  .int32 .Ltype2                                # DW_AT_type
  .int8 5                                       # DW_AT_location
  ${DW_OP_addr}
  .int32 0x00
.Ltype2:
  .int8 3                                       # Abbrev [3] DW_TAG_type
  .int32 .Ltype_name                            # DW_AT_name
  .int8 0x07                                    # DW_AT_encoding
  .int8 4                                       # DW_AT_byte_size
  ${EOM}                                        # End DW_TAG_compile_unit
.Ldebug_info_end1:

  .section  .debug_str,"S",@
.Lcomp_dir:
  .asciz  ""
.Ltype_name:
  .asciz  "int"
.Lvar_name_1:
  .asciz  "i"
.Lvar_name_2:
  .asciz "S<int>::buffer"
.Lvar_name_3:
  .asciz "::i_ptr"
.Lvar_name_4:
  .asciz "::v_ptr"
.Lvar_name_5:
  .asciz "::var_bool"
.Lvar_name_6:
  .asciz "::var_char"
.Lvar_name_7:
  .asciz "::var_double"
.Lvar_name_8:
  .asciz "::var_float"
.Lvar_name_9:
  .asciz "::var_int"
.Lvar_name_10:
  .asciz "::var_int16_t"
.Lvar_name_11:
  .asciz "::var_int32_t"
.Lvar_name_12:
  .asciz "::var_int64_t"
.Lvar_name_13:
  .asciz "::var_int8_t"
.Lvar_name_14:
  .asciz "::var_long"
.Lvar_name_15:
  .asciz "::var_long_int"
.Lvar_name_16:
  .asciz "::var_long_long"
.Lvar_name_17:
  .asciz "::var_long_long_int"
.Lvar_name_18:
  .asciz "::var_short"
.Lvar_name_19:
  .asciz "::var_short_int"
.Lvar_name_20:
  .asciz "::var_signed"
.Lvar_name_21:
  .asciz "::var_signed_char"
.Lvar_name_22:
  .asciz "::var_signed_int"
.Lvar_name_23:
  .asciz "::var_signed_long"
.Lvar_name_24:
  .asciz "::var_signed_long_int"
.Lvar_name_25:
  .asciz "::var_signed_long_long"
.Lvar_name_26:
  .asciz "::var_signed_long_long_int"
.Lvar_name_27:
  .asciz "::var_signed_short"
.Lvar_name_28:
  .asciz "::var_signed_short_int"
.Lvar_name_29:
  .asciz "::var_uint16_t"
.Lvar_name_30:
  .asciz "::var_uint32_t"
.Lvar_name_31:
  .asciz "::var_uint64_t"
.Lvar_name_32:
  .asciz "::var_uint8_t"
.Lvar_name_33:
  .asciz "::var_unsigned"
.Lvar_name_34:
  .asciz "::var_unsigned_char"
.Lvar_name_35:
  .asciz "::var_unsigned_int"
.Lvar_name_36:
  .asciz "::var_unsigned_long"
.Lvar_name_37:
  .asciz "::var_unsigned_long_int"
.Lvar_name_38:
  .asciz "::var_unsigned_long_long"
.Lvar_name_39:
  .asciz "::var_unsigned_long_long_int"
.Lvar_name_40:
  .asciz "::var_unsigned_short"
.Lvar_name_41:
  .asciz "::var_unsigned_short_int"
.Lvar_name_42:
  .asciz "::var_int128"
.Lvar_name_43:
  .asciz "::var_uint128"
.Lvar_name_separate_cu:
  .asciz "::var_separate_cu"

  .section  .debug_abbrev,"",@
  .int8 1                               # Abbreviation Code
  .int8 17                              # DW_TAG_compile_unit
  .int8 1                               # DW_CHILDREN_yes
  .int8 17                              # DW_AT_low_pc
  .int8 1                               # DW_FORM_addr
  .int8 18                              # DW_AT_high_pc
  ${DW_FORM_addr}
  .int8 27                              # DW_AT_comp_dir
  .int8 14                              # DW_FORM_strp
  .int8 0                               # EOM(1)
  .int8 0                               # EOM(2)
  .int8 2                               # Abbreviation Code
  .int8 52                              # DW_TAG_variable
  .int8 0                               # DW_CHILDREN_no
  .int8 3                               # DW_AT_name
  .int8 14                              # DW_FORM_strp
  .int8 0x49                            # DW_AT_type
  .int8 0x10                            # DW_FORM_ref_addr
  .int8 2                               # DW_AT_location
  .int8 24                              # DW_FORM_exprloc
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
  .int8 0                               # EOM(3)
