	.text
	.file	"externref.c"
	.functype	f (externref, externref) -> (externref)
	.export_name	f, f
	.section	.text.f,"",@
	.hidden	f                               # -- Begin function f
	.globl	f
	.type	f,@function
f:                                      # @f
.Lfunc_begin0:
	.functype	f (externref, externref) -> (externref)
# %bb.0:
	#DEBUG_VALUE: f:x <- !target-index(0,0)
	#DEBUG_VALUE: f:y <- !target-index(0,1)
	.file	1 "/tmp" "externref.c"
	.loc	1 3 3 prologue_end              # externref.c:3:3
	local.get	0
	return
	end_function
.Ltmp0:
.Lfunc_end0:
                                        # -- End function
	.no_dead_strip	f
	.section	.debug_abbrev,"",@
	${ABBR} 1
	${DW_TAG_compile_unit}
	${DW_CHILDREN_yes}
	${DW_AT_producer}
	${DW_FORM_strp}
	${DW_AT_language}
	${DW_FORM_data2}
	${DW_AT_name}
	${DW_FORM_strp}
	${DW_AT_stmt_list}
	${DW_FORM_sec_offset}
	${DW_AT_comp_dir}
	${DW_FORM_strp}
	${DW_AT_low_pc}
	${DW_FORM_addr}
	${DW_AT_high_pc}
	${DW_FORM_data4}
	${EOM}
	${EOM}
	${ABBR} 2
	${DW_TAG_subprogram}
	${DW_CHILDREN_yes}
	${DW_AT_low_pc}
	${DW_FORM_addr}
	${DW_AT_high_pc}
	${DW_FORM_data4}
	${DW_AT_frame_base}
	${DW_FORM_exprloc}
	${DW_AT_name}
	${DW_FORM_strp}
	${DW_AT_decl_file}
	${DW_FORM_data1}
	${DW_AT_decl_line}
	${DW_FORM_data1}
	${DW_AT_prototyped}
	${DW_FORM_flag_present}
	${DW_AT_type}
	${DW_FORM_ref4}
	${DW_AT_external}
	${DW_FORM_flag_present}
	${EOM}
	${EOM}
	${ABBR} 3
	${DW_TAG_formal_parameter}
	${DW_CHILDREN_no}
	${DW_AT_location}
	${DW_FORM_exprloc}
	${DW_AT_name}
	${DW_FORM_strp}
	${DW_AT_decl_file}
	${DW_FORM_data1}
	${DW_AT_decl_line}
	${DW_FORM_data1}
	${DW_AT_type}
	${DW_FORM_ref4}
	${EOM}
	${EOM}
	${ABBR} 4
	${DW_TAG_typedef}
	${DW_CHILDREN_no}
	${DW_AT_type}
	${DW_FORM_ref4}
	${DW_AT_name}
	${DW_FORM_strp}
	${EOM}
	${EOM}
	${ABBR} 5
	${DW_TAG_structure_type}
	${DW_CHILDREN_no}
	${DW_AT_name}
	${DW_FORM_strp}
	${DW_AT_declaration}
	${DW_FORM_flag_present}
	${EOM}
	${EOM}
	${EOM}
	.section	.debug_info,"",@
.Lcu_begin0:
	.int32	.Ldebug_info_end0-.Ldebug_info_start0 # Length of Unit
.Ldebug_info_start0:
	.int16	4                               # DWARF version number
	.int32	.debug_abbrev0                  # Offset Into Abbrev. Section
	.int8	4                               # Address Size (in bytes)
	${ABBR} 1                               # Abbrev [1] 0xb:0x66 DW_TAG_compile_unit
	.int32	.Linfo_string0                  # DW_AT_producer
	.int16	29                              # DW_AT_language
	.int32	.Linfo_string1                  # DW_AT_name
	.int32	.Lline_table_start0             # DW_AT_stmt_list
	.int32	.Linfo_string2                  # DW_AT_comp_dir
	.int32	.Lfunc_begin0                   # DW_AT_low_pc
	.int32	.Lfunc_end0-.Lfunc_begin0       # DW_AT_high_pc
	${ABBR} 2                               # Abbrev [2] 0x26:0x3c DW_TAG_subprogram
	.int32	.Lfunc_begin0                   # DW_AT_low_pc
	.int32	.Lfunc_end0-.Lfunc_begin0       # DW_AT_high_pc
	.int8	7                               # DW_AT_frame_base
	.int8	237
	.int8	3
	.int32	__stack_pointer
	.int8	159
	.int32	.Linfo_string3                  # DW_AT_name
	.int8	1                               # DW_AT_decl_file
	.int8	2                               # DW_AT_decl_line
                                        # DW_AT_prototyped
	.int32	98                              # DW_AT_type
                                        # DW_AT_external
	${ABBR} 3                               # Abbrev [3] 0x41:0x10 DW_TAG_formal_parameter
	.int8	4                               # DW_AT_location
	.int8	237
	.int8	0
	.int8	0
	.int8	159
	.int32	.Linfo_string6                  # DW_AT_name
	.int8	1                               # DW_AT_decl_file
	.int8	2                               # DW_AT_decl_line
	.int32	98                              # DW_AT_type
	${ABBR} 3                               # Abbrev [3] 0x51:0x10 DW_TAG_formal_parameter
	.int8	4                               # DW_AT_location
	.int8	237
	.int8	0
	.int8	1
	.int8	159
	.int32	.Linfo_string7                  # DW_AT_name
	.int8	1                               # DW_AT_decl_file
	.int8	2                               # DW_AT_decl_line
	.int32	98                              # DW_AT_type
	${EOM}                                  # End Of Children Mark
	${ABBR} 4                               # Abbrev [4] 0x62:0x9 DW_TAG_typedef
	.int32	107                             # DW_AT_type
	.int32	.Linfo_string5                  # DW_AT_name
	${ABBR} 5                               # Abbrev [5] 0x6b:0x5 DW_TAG_structure_type
	.int32	.Linfo_string4                  # DW_AT_name
                                        # DW_AT_declaration
	${EOM}                                  # End Of Children Mark
.Ldebug_info_end0:
	.section	.debug_str,"S",@
.Linfo_string0:
	.asciz	"Ubuntu clang version 17.0.6 (++20240124120726+6009708b4367-1~exp1~20240124120743.47)" # string offset=0
.Linfo_string1:
	.asciz	"externref.c"                   # string offset=85
.Linfo_string2:
	.asciz	"/tmp"                          # string offset=97
.Linfo_string3:
	.asciz	"f"                             # string offset=102
.Linfo_string4:
	.asciz	"externref_t"                   # string offset=104
.Linfo_string5:
	.asciz	"__externref_t"                 # string offset=116
.Linfo_string6:
	.asciz	"x"                             # string offset=130
.Linfo_string7:
	.asciz	"y"                             # string offset=132
	.ident	"Ubuntu clang version 17.0.6 (++20240124120726+6009708b4367-1~exp1~20240124120743.47)"
	.no_dead_strip	__indirect_function_table
	.section	.custom_section.producers,"",@
	.int8	2
	.int8	8
	.ascii	"language"
	.int8	1
	.int8	3
	.ascii	"C11"
	.int8	0
	.int8	12
	.ascii	"processed-by"
	.int8	1
	.int8	12
	.ascii	"Ubuntu clang"
	.int8	63
	.ascii	"17.0.6 (++20240124120726+6009708b4367-1~exp1~20240124120743.47)"
	.section	.debug_str,"S",@
	.section	.custom_section.target_features,"",@
	.int8	3
	.int8	43
	.int8	15
	.ascii	"mutable-globals"
	.int8	43
	.int8	15
	.ascii	"reference-types"
	.int8	43
	.int8	8
	.ascii	"sign-ext"
	.section	.debug_str,"S",@
	.section	.debug_line,"",@
.Lline_table_start0:
