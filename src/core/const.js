/**
 * OBJECT_TYPE
 */
export var OBJECT_TYPE = {
    MESH: "mesh",
    SKINNED_MESH: "skinned_mesh",
    LIGHT: "light",
    CAMERA: "camera",
    SCENE: "scene",
    GROUP: "group",
    POINT: "point",
    LINE: "line",
    LINE_LOOP: "line_loop",
    LINE_SEGMENTS: "line_segments",
    CANVAS2D: "canvas2d",
    SPRITE: "sprite",
    PARTICLE: "particle"
};

/**
 * LIGHT_TYPE
 */
export var LIGHT_TYPE = {
    AMBIENT: "ambient",
    DIRECT: "direct",
    POINT: "point",
    SPOT: "spot"
};

/**
 * MATERIAL_TYPE
 */
export var MATERIAL_TYPE = {
    BASIC: "basic",
    LAMBERT: "lambert",
    PHONG: "phong",
    PBR: "pbr",
    CUBE: "cube",
    POINT: "point",
    LINE: "line",
    LINE_LOOP: "lineloop",
    LINE_DASHED: "linedashed",
    CANVAS2D: "canvas2d",
    SPRITE: "sprite",
    SHADER: "shader",
    DEPTH: "depth",
    DISTANCE: "distance",
    PARTICLE: "particle"
};

/**
 * FOG_TYPE
 */
export var FOG_TYPE = {
    NORMAL: "normal",
    EXP2: "exp2"
};

/**
 * BLEND_TYPE
 */
export var BLEND_TYPE = {
    NONE: "none",
    NORMAL: "normal",
    ADD: "add",
    CUSTOM: "custom"
};

/**
 * BLEND_EQUATION
 */
export var BLEND_EQUATION = {
    ADD: 0x8006,
    SUBTRACT: 0x800A,
    REVERSE_SUBTRACT: 0x800B
};

/**
 * BLEND_FACTOR
 */
export var BLEND_FACTOR = {
    ZERO: 0,
    ONE: 1,
    SRC_COLOR: 0x0300,
    ONE_MINUS_SRC_COLOR: 0x0301,
    SRC_ALPHA: 0x0302,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    DST_ALPHA: 0x0304,
    ONE_MINUS_DST_ALPHA: 0x0305,
    DST_COLOR: 0x0306,
    ONE_MINUS_DST_COLOR: 0x0307
};

/**
 * CULL_FACE_TYPE
 */
export var CULL_FACE_TYPE = {
    NONE: "none",
    FRONT: "front",
    BACK: "back",
    FRONT_AND_BACK: "front_and_back"
};

/**
 * DRAW_SIDE
 */
export var DRAW_SIDE = {
    FRONT: "front",
    BACK: "back",
    DOUBLE: "double"
};

/**
 * SHADING_TYPE
 */
export var SHADING_TYPE = {
    SMOOTH_SHADING: "smooth_shading",
    FLAT_SHADING: "flat_shading"
}

/**
 * WEBGL_TEXTURE_TYPE
 */
export var WEBGL_TEXTURE_TYPE = {
    TEXTURE_2D: 0x0DE1,
    TEXTURE_CUBE_MAP: 0x8513
};

/**
 * WEBGL_PIXEL_FORMAT
 */
export var WEBGL_PIXEL_FORMAT = {
    DEPTH_COMPONENT: 0x1902,
    ALPHA: 0x1906,
    RGB: 0x1907,
    RGBA: 0x1908,
    LUMINANCE: 0x1909,
    LUMINANCE_ALPHA: 0x190A
}

/**
 * WEBGL_PIXEL_TYPE
 */
export var WEBGL_PIXEL_TYPE = {
    BYTE: 0x1400,
    UNSIGNED_BYTE: 0x1401,
    SHORT: 0x1402,
    UNSIGNED_SHORT: 0x1403,
    INT: 0x1404,
    UNSIGNED_INT: 0x1405,
    FLOAT: 0x1406,
    HALF_FLOAT: 0x140B,
    UNSIGNED_INT_24_8: 0x84FA,
    UNSIGNED_SHORT_4_4_4_4:	0x8033,
    UNSIGNED_SHORT_5_5_5_1: 0x8034,
    UNSIGNED_SHORT_5_6_5: 0x8363
}

/**
 * WEBGL_TEXTURE_FILTER
 */
export var WEBGL_TEXTURE_FILTER = {
    NEAREST: 0x2600,
    LINEAR: 0x2601,
    NEAREST_MIPMAP_NEAREST: 0x2700,
    LINEAR_MIPMAP_NEAREST: 0x2701,
    NEAREST_MIPMAP_LINEAR: 0x2702,
    LINEAR_MIPMAP_LINEAR: 0x2703
}

/**
 * WEBGL_TEXTURE_WRAP
 */
export var WEBGL_TEXTURE_WRAP = {
    REPEAT:	0x2901,
    CLAMP_TO_EDGE: 0x812F,
    MIRRORED_REPEAT: 0x8370
}

// Taken from the WebGl spec:
// http://www.khronos.org/registry/webgl/specs/latest/1.0/#5.14
export var WEBGL_UNIFORM_TYPE = {
    FLOAT_VEC2: 0x8B50,
    FLOAT_VEC3: 0x8B51,
    FLOAT_VEC4: 0x8B52,
    INT_VEC2: 0x8B53,
    INT_VEC3: 0x8B54,
    INT_VEC4: 0x8B55,
    BOOL: 0x8B56,
    BOOL_VEC2: 0x8B57,
    BOOL_VEC3: 0x8B58,
    BOOL_VEC4: 0x8B59,
    FLOAT_MAT2: 0x8B5A,
    FLOAT_MAT3: 0x8B5B,
    FLOAT_MAT4: 0x8B5C,
    SAMPLER_2D: 0x8B5E,
    SAMPLER_CUBE: 0x8B60,
    BYTE: 0xffff,
    UNSIGNED_BYTE: 0x1401,
    SHORT: 0x1402,
    UNSIGNED_SHORT: 0x1403,
    INT: 0x1404,
    UNSIGNED_INT: 0x1405,
    FLOAT: 0x1406
}

export var WEBGL_ATTRIBUTE_TYPE = {
    FLOAT_VEC2: 0x8B50,
    FLOAT_VEC3: 0x8B51,
    FLOAT_VEC4: 0x8B52,
    FLOAT: 0x1406,
    BYTE: 0xffff,
    UNSIGNED_BYTE: 0x1401,
    UNSIGNED_SHORT: 0x1403
}

export var WEBGL_BUFFER_USAGE = {
    STREAM_DRAW: 0x88e0,
    STATIC_DRAW: 0x88E4,
    DYNAMIC_DRAW: 0x88E8
}

export var SHADOW_TYPE = {
    HARD: "hard",
    PCF_SOFT: "pcf_soft"
}

export var TEXEL_ENCODING_TYPE = {
    LINEAR: "linear",
    SRGB: "sRGB",
    RGBE: "RGBE",
    RGBM7: "RGBM7",
    RGBM16: "RGBM16",
    RGBD: "RGBD",
    GAMMA: "Gamma"
}

export var ENVMAP_COMBINE_TYPE = {
    MULTIPLY: "ENVMAP_BLENDING_MULTIPLY",
    MIX: "ENVMAP_BLENDING_MIX",
    ADD: "ENVMAP_BLENDING_ADD"
}

export var DRAW_MODE = {
    POINTS: 0,
    LINES: 1,
    LINE_LOOP: 2,
    LINE_STRIP: 3,
    TRIANGLES: 4,
    TRIANGLE_STRIP: 5,
    TRIANGLE_FAN: 6
}

export var RENDER_LAYER = {
    DEFAULT: "default",
    TRANSPARENT: "transparent",
    CANVAS2D: "canvas2d",
    SPRITE: "sprite",
    PARTICLE: "particle"
}

export var LAYER_RENDER_LIST = [
    RENDER_LAYER.DEFAULT,
    RENDER_LAYER.TRANSPARENT,
    RENDER_LAYER.CANVAS2D,
    RENDER_LAYER.SPRITE,
    RENDER_LAYER.PARTICLE
];
