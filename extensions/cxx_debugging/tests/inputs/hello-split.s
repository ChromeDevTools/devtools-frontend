# Copyright 2024 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

	.text
	.file	"hello-split.c"
	.functype	hello2 () -> ()
	.section	.text.hello2,"",@
	.hidden	hello2
	.globl	hello2
	.type	hello2,@function
hello2:
.Lfunc_begin0:
	.file	0 "." "hello-split.c" md5 0xd7627bae6ae840ffc57a322e277e92fd
	.loc	0 1 0                           # hello-split.c:1:0
	.functype	hello2 () -> ()
# %bb.0:
	.loc	0 2 2 prologue_end              # hello-split.c:2:2
	return
	end_function
.Ltmp0:
.Lfunc_end0:

	.section	.debug_abbrev,"",@
	.int8	1                               # Abbreviation Code
	.int8	74                              # DW_TAG_skeleton_unit
	.int8	0                               # DW_CHILDREN_no
	.int8	16                              # DW_AT_stmt_list
	.int8	23                              # DW_FORM_sec_offset
	.int8	114                             # DW_AT_str_offsets_base
	.int8	23                              # DW_FORM_sec_offset
	.int8	27                              # DW_AT_comp_dir
	.int8	37                              # DW_FORM_strx1
	.ascii	"\264B"                       # DW_AT_GNU_pubnames
	.int8	25                              # DW_FORM_flag_present
	.int8	118                             # DW_AT_dwo_name
	.int8	37                              # DW_FORM_strx1
	.int8	17                              # DW_AT_low_pc
	.int8	27                              # DW_FORM_addrx
	.int8	18                              # DW_AT_high_pc
	.int8	6                               # DW_FORM_data4
	.int8	115                             # DW_AT_addr_base
	.int8	23                              # DW_FORM_sec_offset
	.int8	0                               # EOM(1)
	.int8	0                               # EOM(2)
	.int8	0                               # EOM(3)
	.section	.debug_info,"",@
.Lcu_begin0:
	.int32	.Ldebug_info_end0-.Ldebug_info_start0 # Length of Unit
.Ldebug_info_start0:
	.int16	5                             # DWARF version number
	.int8	4                               # DWARF Unit Type
	.int8	4                               # Address Size (in bytes)
	.int32	.debug_abbrev0                # Offset Into Abbrev. Section
	.int64	-4350062774228680187
	.int8	1                               # Abbrev [1] 0x14:0x14 DW_TAG_skeleton_unit
	.int32	.Lline_table_start0           # DW_AT_stmt_list
	.int32	.Lstr_offsets_base0           # DW_AT_str_offsets_base
	.int8	0                               # DW_AT_comp_dir
                                        # DW_AT_GNU_pubnames
	.int8	1                               # DW_AT_dwo_name
	.int8	0                               # DW_AT_low_pc
	.int32	.Lfunc_end0-.Lfunc_begin0     # DW_AT_high_pc
	.int32	.Laddr_table_base0            # DW_AT_addr_base
.Ldebug_info_end0:
	.section	.debug_str_offsets,"",@
	.int32	12
	.int16	5
	.int16	0
.Lstr_offsets_base0:
	.section	.debug_str,"S",@
.Lskel_string0:
	.asciz	"."
.Lskel_string1:
	.asciz	"hello-split.dwo"
	.section	.debug_str_offsets,"",@
	.int32	.Lskel_string0
	.int32	.Lskel_string1
	.section	.debug_str_offsets.dwo,"",@
	.int32	20
	.int16	5
	.int16	0
	.section	.debug_str.dwo,"S",@
.Ldwo_string0:
	.asciz	"Handwritten and clang"
.Ldwo_string1:
	.asciz	"hello-split.c"
.Ldwo_string2:
	.asciz	"hello-split.dwo"
	.section	.debug_str_offsets.dwo,"",@
	.int32	0
	.int32	.Ldwo_string1-.Ldwo_string0
	.int32	.Ldwo_string2-.Ldwo_string1
	.section	.debug_info.dwo,"",@
	.int32	.Ldebug_info_dwo_end0-.Ldebug_info_dwo_start0 # Length of Unit
.Ldebug_info_dwo_start0:
	.int16	5                             # DWARF version number
	.int8	5                               # DWARF Unit Type
	.int8	4                               # Address Size (in bytes)
	.int32	0                             # Offset Into Abbrev. Section
	.int64	-4350062774228680187
	.int8	1                               # Abbrev [1] 0x14:0x18 DW_TAG_compile_unit
	.int8	0                               # DW_AT_producer
	.int16	29                              # DW_AT_language
	.int8	1                               # DW_AT_name
	.int8	2                               # DW_AT_dwo_name
	.int8	0                               # End Of Children Mark
.Ldebug_info_dwo_end0:
	.section	.debug_abbrev.dwo,"",@
	.int8	1                               # Abbreviation Code
	.int8	17                              # DW_TAG_compile_unit
	.int8	0                               # DW_CHILDREN_no
	.int8	37                              # DW_AT_producer
	.int8	37                              # DW_FORM_strx1
	.int8	19                              # DW_AT_language
	.int8	5                               # DW_FORM_data2
	.int8	3                               # DW_AT_name
	.int8	37                              # DW_FORM_strx1
	.int8	118                             # DW_AT_dwo_name
	.int8	37                              # DW_FORM_strx1
	.int8	0                               # EOM(1)
	.int8	0                               # EOM(2)
	.int8	0                               # EOM(3)
	.section	.debug_addr,"",@
	.int32	.Ldebug_addr_end0-.Ldebug_addr_start0 # Length of contribution
.Ldebug_addr_start0:
	.int16	5                               # DWARF version number
	.int8	4                               # Address size
	.int8	0                               # Segment selector size
.Laddr_table_base0:
	.int32	.Lfunc_begin0
.Ldebug_addr_end0:
	.section	.debug_line,"",@
.Lline_table_start0:
