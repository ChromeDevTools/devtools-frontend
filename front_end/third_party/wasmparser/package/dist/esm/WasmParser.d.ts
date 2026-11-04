export declare const enum SectionCode {
    Unknown = -1,
    Custom = 0,
    Type = 1,
    Import = 2,
    Function = 3,
    Table = 4,
    Memory = 5,
    Global = 6,
    Export = 7,
    Start = 8,
    Element = 9,
    Code = 10,
    Data = 11,
    Event = 13
}
export declare const enum OperatorCode {
    unreachable = 0,
    nop = 1,
    block = 2,
    loop = 3,
    if = 4,
    else = 5,
    try = 6,
    catch = 7,
    throw = 8,
    rethrow = 9,
    unwind = 10,
    end = 11,
    br = 12,
    br_if = 13,
    br_table = 14,
    return = 15,
    call = 16,
    call_indirect = 17,
    return_call = 18,
    return_call_indirect = 19,
    call_ref = 20,
    return_call_ref = 21,
    let = 23,
    delegate = 24,
    catch_all = 25,
    drop = 26,
    select = 27,
    select_with_type = 28,
    local_get = 32,
    local_set = 33,
    local_tee = 34,
    global_get = 35,
    global_set = 36,
    i32_load = 40,
    i64_load = 41,
    f32_load = 42,
    f64_load = 43,
    i32_load8_s = 44,
    i32_load8_u = 45,
    i32_load16_s = 46,
    i32_load16_u = 47,
    i64_load8_s = 48,
    i64_load8_u = 49,
    i64_load16_s = 50,
    i64_load16_u = 51,
    i64_load32_s = 52,
    i64_load32_u = 53,
    i32_store = 54,
    i64_store = 55,
    f32_store = 56,
    f64_store = 57,
    i32_store8 = 58,
    i32_store16 = 59,
    i64_store8 = 60,
    i64_store16 = 61,
    i64_store32 = 62,
    current_memory = 63,
    grow_memory = 64,
    i32_const = 65,
    i64_const = 66,
    f32_const = 67,
    f64_const = 68,
    i32_eqz = 69,
    i32_eq = 70,
    i32_ne = 71,
    i32_lt_s = 72,
    i32_lt_u = 73,
    i32_gt_s = 74,
    i32_gt_u = 75,
    i32_le_s = 76,
    i32_le_u = 77,
    i32_ge_s = 78,
    i32_ge_u = 79,
    i64_eqz = 80,
    i64_eq = 81,
    i64_ne = 82,
    i64_lt_s = 83,
    i64_lt_u = 84,
    i64_gt_s = 85,
    i64_gt_u = 86,
    i64_le_s = 87,
    i64_le_u = 88,
    i64_ge_s = 89,
    i64_ge_u = 90,
    f32_eq = 91,
    f32_ne = 92,
    f32_lt = 93,
    f32_gt = 94,
    f32_le = 95,
    f32_ge = 96,
    f64_eq = 97,
    f64_ne = 98,
    f64_lt = 99,
    f64_gt = 100,
    f64_le = 101,
    f64_ge = 102,
    i32_clz = 103,
    i32_ctz = 104,
    i32_popcnt = 105,
    i32_add = 106,
    i32_sub = 107,
    i32_mul = 108,
    i32_div_s = 109,
    i32_div_u = 110,
    i32_rem_s = 111,
    i32_rem_u = 112,
    i32_and = 113,
    i32_or = 114,
    i32_xor = 115,
    i32_shl = 116,
    i32_shr_s = 117,
    i32_shr_u = 118,
    i32_rotl = 119,
    i32_rotr = 120,
    i64_clz = 121,
    i64_ctz = 122,
    i64_popcnt = 123,
    i64_add = 124,
    i64_sub = 125,
    i64_mul = 126,
    i64_div_s = 127,
    i64_div_u = 128,
    i64_rem_s = 129,
    i64_rem_u = 130,
    i64_and = 131,
    i64_or = 132,
    i64_xor = 133,
    i64_shl = 134,
    i64_shr_s = 135,
    i64_shr_u = 136,
    i64_rotl = 137,
    i64_rotr = 138,
    f32_abs = 139,
    f32_neg = 140,
    f32_ceil = 141,
    f32_floor = 142,
    f32_trunc = 143,
    f32_nearest = 144,
    f32_sqrt = 145,
    f32_add = 146,
    f32_sub = 147,
    f32_mul = 148,
    f32_div = 149,
    f32_min = 150,
    f32_max = 151,
    f32_copysign = 152,
    f64_abs = 153,
    f64_neg = 154,
    f64_ceil = 155,
    f64_floor = 156,
    f64_trunc = 157,
    f64_nearest = 158,
    f64_sqrt = 159,
    f64_add = 160,
    f64_sub = 161,
    f64_mul = 162,
    f64_div = 163,
    f64_min = 164,
    f64_max = 165,
    f64_copysign = 166,
    i32_wrap_i64 = 167,
    i32_trunc_f32_s = 168,
    i32_trunc_f32_u = 169,
    i32_trunc_f64_s = 170,
    i32_trunc_f64_u = 171,
    i64_extend_i32_s = 172,
    i64_extend_i32_u = 173,
    i64_trunc_f32_s = 174,
    i64_trunc_f32_u = 175,
    i64_trunc_f64_s = 176,
    i64_trunc_f64_u = 177,
    f32_convert_i32_s = 178,
    f32_convert_i32_u = 179,
    f32_convert_i64_s = 180,
    f32_convert_i64_u = 181,
    f32_demote_f64 = 182,
    f64_convert_i32_s = 183,
    f64_convert_i32_u = 184,
    f64_convert_i64_s = 185,
    f64_convert_i64_u = 186,
    f64_promote_f32 = 187,
    i32_reinterpret_f32 = 188,
    i64_reinterpret_f64 = 189,
    f32_reinterpret_i32 = 190,
    f64_reinterpret_i64 = 191,
    i32_extend8_s = 192,
    i32_extend16_s = 193,
    i64_extend8_s = 194,
    i64_extend16_s = 195,
    i64_extend32_s = 196,
    prefix_0xfb = 251,
    prefix_0xfc = 252,
    prefix_0xfd = 253,
    prefix_0xfe = 254,
    i32_trunc_sat_f32_s = 64512,
    i32_trunc_sat_f32_u = 64513,
    i32_trunc_sat_f64_s = 64514,
    i32_trunc_sat_f64_u = 64515,
    i64_trunc_sat_f32_s = 64516,
    i64_trunc_sat_f32_u = 64517,
    i64_trunc_sat_f64_s = 64518,
    i64_trunc_sat_f64_u = 64519,
    memory_init = 64520,
    data_drop = 64521,
    memory_copy = 64522,
    memory_fill = 64523,
    table_init = 64524,
    elem_drop = 64525,
    table_copy = 64526,
    table_grow = 64527,
    table_size = 64528,
    table_fill = 64529,
    table_get = 37,
    table_set = 38,
    ref_null = 208,
    ref_is_null = 209,
    ref_func = 210,
    ref_as_non_null = 211,
    br_on_null = 212,
    ref_eq = 213,
    br_on_non_null = 214,
    atomic_notify = 65024,
    i32_atomic_wait = 65025,
    i64_atomic_wait = 65026,
    atomic_fence = 65027,
    i32_atomic_load = 65040,
    i64_atomic_load = 65041,
    i32_atomic_load8_u = 65042,
    i32_atomic_load16_u = 65043,
    i64_atomic_load8_u = 65044,
    i64_atomic_load16_u = 65045,
    i64_atomic_load32_u = 65046,
    i32_atomic_store = 65047,
    i64_atomic_store = 65048,
    i32_atomic_store8 = 65049,
    i32_atomic_store16 = 65050,
    i64_atomic_store8 = 65051,
    i64_atomic_store16 = 65052,
    i64_atomic_store32 = 65053,
    i32_atomic_rmw_add = 65054,
    i64_atomic_rmw_add = 65055,
    i32_atomic_rmw8_add_u = 65056,
    i32_atomic_rmw16_add_u = 65057,
    i64_atomic_rmw8_add_u = 65058,
    i64_atomic_rmw16_add_u = 65059,
    i64_atomic_rmw32_add_u = 65060,
    i32_atomic_rmw_sub = 65061,
    i64_atomic_rmw_sub = 65062,
    i32_atomic_rmw8_sub_u = 65063,
    i32_atomic_rmw16_sub_u = 65064,
    i64_atomic_rmw8_sub_u = 65065,
    i64_atomic_rmw16_sub_u = 65066,
    i64_atomic_rmw32_sub_u = 65067,
    i32_atomic_rmw_and = 65068,
    i64_atomic_rmw_and = 65069,
    i32_atomic_rmw8_and_u = 65070,
    i32_atomic_rmw16_and_u = 65071,
    i64_atomic_rmw8_and_u = 65072,
    i64_atomic_rmw16_and_u = 65073,
    i64_atomic_rmw32_and_u = 65074,
    i32_atomic_rmw_or = 65075,
    i64_atomic_rmw_or = 65076,
    i32_atomic_rmw8_or_u = 65077,
    i32_atomic_rmw16_or_u = 65078,
    i64_atomic_rmw8_or_u = 65079,
    i64_atomic_rmw16_or_u = 65080,
    i64_atomic_rmw32_or_u = 65081,
    i32_atomic_rmw_xor = 65082,
    i64_atomic_rmw_xor = 65083,
    i32_atomic_rmw8_xor_u = 65084,
    i32_atomic_rmw16_xor_u = 65085,
    i64_atomic_rmw8_xor_u = 65086,
    i64_atomic_rmw16_xor_u = 65087,
    i64_atomic_rmw32_xor_u = 65088,
    i32_atomic_rmw_xchg = 65089,
    i64_atomic_rmw_xchg = 65090,
    i32_atomic_rmw8_xchg_u = 65091,
    i32_atomic_rmw16_xchg_u = 65092,
    i64_atomic_rmw8_xchg_u = 65093,
    i64_atomic_rmw16_xchg_u = 65094,
    i64_atomic_rmw32_xchg_u = 65095,
    i32_atomic_rmw_cmpxchg = 65096,
    i64_atomic_rmw_cmpxchg = 65097,
    i32_atomic_rmw8_cmpxchg_u = 65098,
    i32_atomic_rmw16_cmpxchg_u = 65099,
    i64_atomic_rmw8_cmpxchg_u = 65100,
    i64_atomic_rmw16_cmpxchg_u = 65101,
    i64_atomic_rmw32_cmpxchg_u = 65102,
    v128_load = 64768,
    i16x8_load8x8_s = 64769,
    i16x8_load8x8_u = 64770,
    i32x4_load16x4_s = 64771,
    i32x4_load16x4_u = 64772,
    i64x2_load32x2_s = 64773,
    i64x2_load32x2_u = 64774,
    v8x16_load_splat = 64775,
    v16x8_load_splat = 64776,
    v32x4_load_splat = 64777,
    v64x2_load_splat = 64778,
    v128_store = 64779,
    v128_const = 64780,
    i8x16_shuffle = 64781,
    i8x16_swizzle = 64782,
    i8x16_splat = 64783,
    i16x8_splat = 64784,
    i32x4_splat = 64785,
    i64x2_splat = 64786,
    f32x4_splat = 64787,
    f64x2_splat = 64788,
    i8x16_extract_lane_s = 64789,
    i8x16_extract_lane_u = 64790,
    i8x16_replace_lane = 64791,
    i16x8_extract_lane_s = 64792,
    i16x8_extract_lane_u = 64793,
    i16x8_replace_lane = 64794,
    i32x4_extract_lane = 64795,
    i32x4_replace_lane = 64796,
    i64x2_extract_lane = 64797,
    i64x2_replace_lane = 64798,
    f32x4_extract_lane = 64799,
    f32x4_replace_lane = 64800,
    f64x2_extract_lane = 64801,
    f64x2_replace_lane = 64802,
    i8x16_eq = 64803,
    i8x16_ne = 64804,
    i8x16_lt_s = 64805,
    i8x16_lt_u = 64806,
    i8x16_gt_s = 64807,
    i8x16_gt_u = 64808,
    i8x16_le_s = 64809,
    i8x16_le_u = 64810,
    i8x16_ge_s = 64811,
    i8x16_ge_u = 64812,
    i16x8_eq = 64813,
    i16x8_ne = 64814,
    i16x8_lt_s = 64815,
    i16x8_lt_u = 64816,
    i16x8_gt_s = 64817,
    i16x8_gt_u = 64818,
    i16x8_le_s = 64819,
    i16x8_le_u = 64820,
    i16x8_ge_s = 64821,
    i16x8_ge_u = 64822,
    i32x4_eq = 64823,
    i32x4_ne = 64824,
    i32x4_lt_s = 64825,
    i32x4_lt_u = 64826,
    i32x4_gt_s = 64827,
    i32x4_gt_u = 64828,
    i32x4_le_s = 64829,
    i32x4_le_u = 64830,
    i32x4_ge_s = 64831,
    i32x4_ge_u = 64832,
    f32x4_eq = 64833,
    f32x4_ne = 64834,
    f32x4_lt = 64835,
    f32x4_gt = 64836,
    f32x4_le = 64837,
    f32x4_ge = 64838,
    f64x2_eq = 64839,
    f64x2_ne = 64840,
    f64x2_lt = 64841,
    f64x2_gt = 64842,
    f64x2_le = 64843,
    f64x2_ge = 64844,
    v128_not = 64845,
    v128_and = 64846,
    v128_andnot = 64847,
    v128_or = 64848,
    v128_xor = 64849,
    v128_bitselect = 64850,
    v128_any_true = 64851,
    v128_load8_lane = 64852,
    v128_load16_lane = 64853,
    v128_load32_lane = 64854,
    v128_load64_lane = 64855,
    v128_store8_lane = 64856,
    v128_store16_lane = 64857,
    v128_store32_lane = 64858,
    v128_store64_lane = 64859,
    v128_load32_zero = 64860,
    v128_load64_zero = 64861,
    f32x4_demote_f64x2_zero = 64862,
    f64x2_promote_low_f32x4 = 64863,
    i8x16_abs = 64864,
    i8x16_neg = 64865,
    i8x16_popcnt = 64866,
    i8x16_all_true = 64867,
    i8x16_bitmask = 64868,
    i8x16_narrow_i16x8_s = 64869,
    i8x16_narrow_i16x8_u = 64870,
    f32x4_ceil = 64871,
    f32x4_floor = 64872,
    f32x4_trunc = 64873,
    f32x4_nearest = 64874,
    i8x16_shl = 64875,
    i8x16_shr_s = 64876,
    i8x16_shr_u = 64877,
    i8x16_add = 64878,
    i8x16_add_sat_s = 64879,
    i8x16_add_sat_u = 64880,
    i8x16_sub = 64881,
    i8x16_sub_sat_s = 64882,
    i8x16_sub_sat_u = 64883,
    f64x2_ceil = 64884,
    f64x2_floor = 64885,
    i8x16_min_s = 64886,
    i8x16_min_u = 64887,
    i8x16_max_s = 64888,
    i8x16_max_u = 64889,
    f64x2_trunc = 64890,
    i8x16_avgr_u = 64891,
    i16x8_extadd_pairwise_i8x16_s = 64892,
    i16x8_extadd_pairwise_i8x16_u = 64893,
    i32x4_extadd_pairwise_i16x8_s = 64894,
    i32x4_extadd_pairwise_i16x8_u = 64895,
    i16x8_abs = 64896,
    i16x8_neg = 64897,
    i16x8_q15mulr_sat_s = 64898,
    i16x8_all_true = 64899,
    i16x8_bitmask = 64900,
    i16x8_narrow_i32x4_s = 64901,
    i16x8_narrow_i32x4_u = 64902,
    i16x8_extend_low_i8x16_s = 64903,
    i16x8_extend_high_i8x16_s = 64904,
    i16x8_extend_low_i8x16_u = 64905,
    i16x8_extend_high_i8x16_u = 64906,
    i16x8_shl = 64907,
    i16x8_shr_s = 64908,
    i16x8_shr_u = 64909,
    i16x8_add = 64910,
    i16x8_add_sat_s = 64911,
    i16x8_add_sat_u = 64912,
    i16x8_sub = 64913,
    i16x8_sub_sat_s = 64914,
    i16x8_sub_sat_u = 64915,
    f64x2_nearest = 64916,
    i16x8_mul = 64917,
    i16x8_min_s = 64918,
    i16x8_min_u = 64919,
    i16x8_max_s = 64920,
    i16x8_max_u = 64921,
    i16x8_avgr_u = 64923,
    i16x8_extmul_low_i8x16_s = 64924,
    i16x8_extmul_high_i8x16_s = 64925,
    i16x8_extmul_low_i8x16_u = 64926,
    i16x8_extmul_high_i8x16_u = 64927,
    i32x4_abs = 64928,
    i32x4_neg = 64929,
    i32x4_all_true = 64931,
    i32x4_bitmask = 64932,
    i32x4_extend_low_i16x8_s = 64935,
    i32x4_extend_high_i16x8_s = 64936,
    i32x4_extend_low_i16x8_u = 64937,
    i32x4_extend_high_i16x8_u = 64938,
    i32x4_shl = 64939,
    i32x4_shr_s = 64940,
    i32x4_shr_u = 64941,
    i32x4_add = 64942,
    i32x4_sub = 64945,
    i32x4_mul = 64949,
    i32x4_min_s = 64950,
    i32x4_min_u = 64951,
    i32x4_max_s = 64952,
    i32x4_max_u = 64953,
    i32x4_dot_i16x8_s = 64954,
    i32x4_extmul_low_i16x8_s = 64956,
    i32x4_extmul_high_i16x8_s = 64957,
    i32x4_extmul_low_i16x8_u = 64958,
    i32x4_extmul_high_i16x8_u = 64959,
    i64x2_abs = 64960,
    i64x2_neg = 64961,
    i64x2_all_true = 64963,
    i64x2_bitmask = 64964,
    i64x2_extend_low_i32x4_s = 64967,
    i64x2_extend_high_i32x4_s = 64968,
    i64x2_extend_low_i32x4_u = 64969,
    i64x2_extend_high_i32x4_u = 64970,
    i64x2_shl = 64971,
    i64x2_shr_s = 64972,
    i64x2_shr_u = 64973,
    i64x2_add = 64974,
    i64x2_sub = 64977,
    i64x2_mul = 64981,
    i64x2_eq = 64982,
    i64x2_ne = 64983,
    i64x2_lt_s = 64984,
    i64x2_gt_s = 64985,
    i64x2_le_s = 64986,
    i64x2_ge_s = 64987,
    i64x2_extmul_low_i32x4_s = 64988,
    i64x2_extmul_high_i32x4_s = 64989,
    i64x2_extmul_low_i32x4_u = 64990,
    i64x2_extmul_high_i32x4_u = 64991,
    f32x4_abs = 64992,
    f32x4_neg = 64993,
    f32x4_sqrt = 64995,
    f32x4_add = 64996,
    f32x4_sub = 64997,
    f32x4_mul = 64998,
    f32x4_div = 64999,
    f32x4_min = 65000,
    f32x4_max = 65001,
    f32x4_pmin = 65002,
    f32x4_pmax = 65003,
    f64x2_abs = 65004,
    f64x2_neg = 65005,
    f64x2_sqrt = 65007,
    f64x2_add = 65008,
    f64x2_sub = 65009,
    f64x2_mul = 65010,
    f64x2_div = 65011,
    f64x2_min = 65012,
    f64x2_max = 65013,
    f64x2_pmin = 65014,
    f64x2_pmax = 65015,
    i32x4_trunc_sat_f32x4_s = 65016,
    i32x4_trunc_sat_f32x4_u = 65017,
    f32x4_convert_i32x4_s = 65018,
    f32x4_convert_i32x4_u = 65019,
    i32x4_trunc_sat_f64x2_s_zero = 65020,
    i32x4_trunc_sat_f64x2_u_zero = 65021,
    f64x2_convert_low_i32x4_s = 65022,
    f64x2_convert_low_i32x4_u = 65023,
    struct_new_with_rtt = 64257,
    struct_new_default_with_rtt = 64258,
    struct_get = 64259,
    struct_get_s = 64260,
    struct_get_u = 64261,
    struct_set = 64262,
    struct_new = 64263,
    struct_new_default = 64264,
    array_new_with_rtt = 64273,
    array_new_default_with_rtt = 64274,
    array_get = 64275,
    array_get_s = 64276,
    array_get_u = 64277,
    array_set = 64278,
    array_len = 64279,
    array_copy = 64280,
    array_init = 64281,
    array_init_static = 64282,
    array_new = 64283,
    array_new_default = 64284,
    i31_new = 64288,
    i31_get_s = 64289,
    i31_get_u = 64290,
    rtt_canon = 64304,
    rtt_sub = 64305,
    rtt_fresh_sub = 64306,
    ref_test = 64320,
    ref_test_static = 64324,
    ref_cast = 64321,
    ref_cast_static = 64325,
    br_on_cast = 64322,
    br_on_cast_static = 64326,
    br_on_cast_fail = 64323,
    br_on_cast_static_fail = 64327,
    ref_is_func = 64336,
    ref_is_data = 64337,
    ref_is_i31 = 64338,
    ref_as_func = 64344,
    ref_as_data = 64345,
    ref_as_i31 = 64346,
    br_on_func = 64352,
    br_on_data = 64353,
    br_on_i31 = 64354,
    br_on_non_func = 64355,
    br_on_non_data = 64356,
    br_on_non_i31 = 64357
}
export declare const OperatorCodeNames: string[];
export declare const enum ExternalKind {
    Function = 0,
    Table = 1,
    Memory = 2,
    Global = 3,
    Event = 4
}
export declare const enum TypeKind {
    unspecified = 0,
    i32 = -1,
    i64 = -2,
    f32 = -3,
    f64 = -4,
    v128 = -5,
    i8 = -6,
    i16 = -7,
    funcref = -16,
    externref = -17,
    anyref = -18,
    eqref = -19,
    optref = -20,
    ref = -21,
    i31ref = -22,
    rtt_d = -23,
    rtt = -24,
    dataref = -25,
    func = -32,
    struct = -33,
    array = -34,
    func_subtype = -35,
    struct_subtype = -36,
    array_subtype = -37,
    empty_block_type = -64
}
export declare class Type {
    kind: TypeKind;
    index: number;
    depth: number;
    constructor(kind: TypeKind, index?: number, depth?: number);
    static funcref: Type;
    static externref: Type;
}
export declare const enum RelocType {
    FunctionIndex_LEB = 0,
    TableIndex_SLEB = 1,
    TableIndex_I32 = 2,
    GlobalAddr_LEB = 3,
    GlobalAddr_SLEB = 4,
    GlobalAddr_I32 = 5,
    TypeIndex_LEB = 6,
    GlobalIndex_LEB = 7
}
export declare const enum LinkingType {
    StackPointer = 1
}
export declare const enum NameType {
    Module = 0,
    Function = 1,
    Local = 2,
    Event = 3,
    Type = 4,
    Table = 5,
    Memory = 6,
    Global = 7,
    Field = 10
}
export declare const enum BinaryReaderState {
    ERROR = -1,
    INITIAL = 0,
    BEGIN_WASM = 1,
    END_WASM = 2,
    BEGIN_SECTION = 3,
    END_SECTION = 4,
    SKIPPING_SECTION = 5,
    READING_SECTION_RAW_DATA = 6,
    SECTION_RAW_DATA = 7,
    TYPE_SECTION_ENTRY = 11,
    IMPORT_SECTION_ENTRY = 12,
    FUNCTION_SECTION_ENTRY = 13,
    TABLE_SECTION_ENTRY = 14,
    MEMORY_SECTION_ENTRY = 15,
    GLOBAL_SECTION_ENTRY = 16,
    EXPORT_SECTION_ENTRY = 17,
    DATA_SECTION_ENTRY = 18,
    NAME_SECTION_ENTRY = 19,
    ELEMENT_SECTION_ENTRY = 20,
    LINKING_SECTION_ENTRY = 21,
    START_SECTION_ENTRY = 22,
    EVENT_SECTION_ENTRY = 23,
    BEGIN_INIT_EXPRESSION_BODY = 25,
    INIT_EXPRESSION_OPERATOR = 26,
    END_INIT_EXPRESSION_BODY = 27,
    BEGIN_FUNCTION_BODY = 28,
    READING_FUNCTION_HEADER = 29,
    CODE_OPERATOR = 30,
    END_FUNCTION_BODY = 31,
    SKIPPING_FUNCTION_BODY = 32,
    BEGIN_ELEMENT_SECTION_ENTRY = 33,
    ELEMENT_SECTION_ENTRY_BODY = 34,
    END_ELEMENT_SECTION_ENTRY = 35,
    BEGIN_DATA_SECTION_ENTRY = 36,
    DATA_SECTION_ENTRY_BODY = 37,
    END_DATA_SECTION_ENTRY = 38,
    BEGIN_GLOBAL_SECTION_ENTRY = 39,
    END_GLOBAL_SECTION_ENTRY = 40,
    RELOC_SECTION_HEADER = 41,
    RELOC_SECTION_ENTRY = 42,
    SOURCE_MAPPING_URL = 43,
    BEGIN_OFFSET_EXPRESSION_BODY = 44,
    OFFSET_EXPRESSION_OPERATOR = 45,
    END_OFFSET_EXPRESSION_BODY = 46
}
export declare const enum DataMode {
    Active = 0,
    Passive = 1
}
export declare const enum ElementMode {
    Active = 0,
    Passive = 1,
    Declarative = 2
}
export interface IModuleHeader {
    magicNumber: number;
    version: number;
}
export interface IResizableLimits {
    initial: number;
    maximum?: number;
}
export interface ITableType {
    elementType: Type;
    limits: IResizableLimits;
}
export interface IMemoryType {
    limits: IResizableLimits;
    shared: boolean;
}
export interface IGlobalType {
    contentType: Type;
    mutability: number;
}
export interface IEventType {
    attribute: number;
    typeIndex: number;
}
export interface IGlobalVariable {
    type: IGlobalType;
}
export interface IElementSegment {
    mode: ElementMode;
    tableIndex?: number;
}
export interface IElementSegmentBody {
    elementType: Type;
}
export interface IDataSegment {
    mode: DataMode;
    memoryIndex?: number;
}
export interface IDataSegmentBody {
    data: Uint8Array;
}
export declare type ImportEntryType = ITableType | IMemoryType | IGlobalType | IEventType;
export interface IImportEntry {
    module: Uint8Array;
    field: Uint8Array;
    kind: ExternalKind;
    funcTypeIndex?: number;
    type?: ImportEntryType;
}
export interface IExportEntry {
    field: Uint8Array;
    kind: ExternalKind;
    index: number;
}
export interface INameEntry {
    type: NameType;
}
export interface INaming {
    index: number;
    name: Uint8Array;
}
export interface IModuleNameEntry extends INameEntry {
    moduleName: Uint8Array;
}
export interface IFunctionNameEntry extends INameEntry {
    names: INaming[];
}
export interface ILocalName {
    index: number;
    locals: INaming[];
}
export interface ILocalNameEntry extends INameEntry {
    funcs: ILocalName[];
}
export interface IEventNameEntry extends INameEntry {
    names: INaming[];
}
export interface ITypeNameEntry extends INameEntry {
    names: INaming[];
}
export interface ITableNameEntry extends INameEntry {
    names: INaming[];
}
export interface IMemoryNameEntry extends INameEntry {
    names: INaming[];
}
export interface IGlobalNameEntry extends INameEntry {
    names: INaming[];
}
export interface IFieldName {
    index: number;
    fields: INaming[];
}
export interface IFieldNameEntry extends INameEntry {
    types: IFieldName[];
}
export interface ILinkingEntry {
    type: LinkingType;
    index?: number;
}
export interface IRelocHeader {
    id: SectionCode;
    name: Uint8Array;
}
export interface IRelocEntry {
    type: RelocType;
    offset: number;
    index: number;
    addend?: number;
}
export interface ISourceMappingURL {
    url: Uint8Array;
}
export interface IStartEntry {
    index: number;
}
export interface IFunctionEntry {
    typeIndex: number;
}
export interface ITypeEntry {
    form: number;
    params?: Type[];
    returns?: Type[];
    fields?: Type[];
    mutabilities?: boolean[];
    elementType?: Type;
    mutability?: boolean;
    supertype?: number;
}
export interface ISectionInformation {
    id: SectionCode;
    name: Uint8Array;
}
export interface ILocals {
    count: number;
    type: Type;
}
export interface IFunctionInformation {
    locals: Array<ILocals>;
}
export interface IMemoryAddress {
    flags: number;
    offset: number;
}
export interface IOperatorInformation {
    code: OperatorCode;
    blockType?: Type;
    selectType?: Type;
    refType?: number;
    srcType?: number;
    brDepth?: number;
    brTable?: Array<number>;
    relativeDepth?: number;
    funcIndex?: number;
    typeIndex?: number;
    tableIndex?: number;
    localIndex?: number;
    fieldIndex?: number;
    globalIndex?: number;
    segmentIndex?: number;
    eventIndex?: number;
    destinationIndex?: number;
    memoryAddress?: IMemoryAddress;
    literal?: number | Int64 | Uint8Array;
    lines: Uint8Array;
    lineIndex: number;
}
export declare class Int64 {
    private _data;
    constructor(data: Uint8Array);
    toInt32(): number;
    toDouble(): number;
    toString(): string;
    get data(): Uint8Array;
}
export declare type BinaryReaderResult = IImportEntry | IExportEntry | IFunctionEntry | ITypeEntry | IModuleHeader | IOperatorInformation | IMemoryType | ITableType | IGlobalVariable | INameEntry | IElementSegment | IElementSegmentBody | IDataSegment | IDataSegmentBody | ISectionInformation | IFunctionInformation | ISectionInformation | IFunctionInformation | IRelocHeader | IRelocEntry | ILinkingEntry | ISourceMappingURL | IModuleNameEntry | IStartEntry | Uint8Array;
export declare class BinaryReader {
    private _data;
    private _pos;
    private _length;
    private _eof;
    state: BinaryReaderState;
    result: BinaryReaderResult;
    error: Error;
    private _sectionEntriesLeft;
    private _sectionId;
    private _sectionRange;
    private _functionRange;
    private _segmentType;
    private _segmentEntriesLeft;
    get data(): Uint8Array;
    get position(): number;
    get length(): number;
    setData(buffer: ArrayBuffer, pos: number, length: number, eof?: boolean): void;
    private hasBytes;
    hasMoreBytes(): boolean;
    private readUint8;
    private readInt32;
    private readUint32;
    private peekInt32;
    private hasVarIntBytes;
    private readVarUint1;
    private readVarInt7;
    private readVarUint7;
    private readVarInt32;
    private readVarUint32;
    private readVarInt64;
    private readHeapType;
    private readTypeInternal;
    private readType;
    private readBlockType;
    private readStringBytes;
    private readBytes;
    private skipBytes;
    private hasStringBytes;
    private hasSectionPayload;
    private readFuncType;
    private readFuncSubtype;
    private readStructType;
    private readStructSubtype;
    private readArrayType;
    private readArraySubtype;
    private readResizableLimits;
    private readTableType;
    private readMemoryType;
    private readGlobalType;
    private readEventType;
    private readTypeEntry;
    private readImportEntry;
    private readExportEntry;
    private readFunctionEntry;
    private readTableEntry;
    private readMemoryEntry;
    private readEventEntry;
    private readGlobalEntry;
    private readElementEntry;
    private readElementEntryBody;
    private readDataEntry;
    private readDataEntryBody;
    private readInitExpressionBody;
    private readOffsetExpressionBody;
    private readMemoryImmediate;
    private readNameMap;
    private readNameEntry;
    private readRelocHeader;
    private readLinkingEntry;
    private readSourceMappingURL;
    private readRelocEntry;
    private readCodeOperator_0xfb;
    private readCodeOperator_0xfc;
    private readCodeOperator_0xfd;
    private readCodeOperator_0xfe;
    private readCodeOperator;
    private readFunctionBody;
    private readSectionHeader;
    private readSectionRawData;
    private readSectionBody;
    read(): boolean;
    skipSection(): void;
    skipFunctionBody(): void;
    skipInitExpression(): void;
    fetchSectionRawData(): void;
}
export declare var bytesToString: (bytes: Uint8Array) => string;
export interface IBinaryReaderData {
    state: BinaryReaderState;
    result?: BinaryReaderResult;
}
