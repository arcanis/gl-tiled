#version 300 es

precision highp float;

// TODO: There is a bit too much branching here, need to try and simplify a bit

#pragma define(NUM_TILESETS)
#pragma define(NUM_TILESET_IMAGES)

in vec2 vPixelCoord;
in vec2 vTextureCoord;

uniform sampler2D uLayer;
#pragma declare_tileset_uniforms

uniform vec2 uTilesetTileSize[NUM_TILESET_IMAGES];
uniform vec2 uTilesetTileOffset[NUM_TILESET_IMAGES];
uniform float uAlpha;
uniform int uRepeatTiles;

out vec4 outputColor;

const int Flag_FlippedAntiDiagonal = 2;
const int Flag_FlippedVertical = 4;
const int Flag_FlippedHorizontal = 8;
const vec4 c_one4 = vec4(1.0, 1.0, 1.0, 1.0);

vec2 getTilesetTileSize(int index)
{
    if (index >= 0 && index < NUM_TILESET_IMAGES)
        return uTilesetTileSize[index];

    return vec2(0.0, 0.0);
}

vec2 getTilesetTileOffset(int index)
{
    if (index >= 0 && index < NUM_TILESET_IMAGES)
        return uTilesetTileOffset[index];

    return vec2(0.0, 0.0);
}

vec4 getColor(int index, vec2 coord)
{
    #pragma get_texture_cases

    return vec4(0.0, 0.0, 0.0, 0.0);
}

void main()
{
    if (uRepeatTiles == 0 && (vTextureCoord.x < 0.0 || vTextureCoord.x > 1.0 || vTextureCoord.y < 0.0 || vTextureCoord.y > 1.0))
        discard;

    vec2 layerTileSize = vec2(1.0) / vec2(textureSize(uLayer, 0));
    vec2 layerTileStart = vTextureCoord - mod(vTextureCoord, layerTileSize);

    vec4 tile = texture(uLayer, layerTileStart + vec2(layerTileSize) / 2.0);
    if (tile == c_one4)
        discard;

    vec2 offsetInLayer = (vTextureCoord - layerTileStart) / layerTileSize;

    int flipFlags = int(floor(tile.w * 255.0));

    int isFlippedAD = (flipFlags & Flag_FlippedAntiDiagonal) >> 1;
    int isFlippedY = (flipFlags & Flag_FlippedVertical) >> 2;
    int isFlippedX = (flipFlags & Flag_FlippedHorizontal) >> 3;

    int imgIndex = int(floor(tile.z * 255.0));
    vec2 tileSize = getTilesetTileSize(imgIndex);
    vec2 tileOffset = getTilesetTileOffset(imgIndex);

    vec2 flipVec = vec2(isFlippedX, isFlippedY);

    vec2 tileCoord = floor(tile.xy * 255.0);

    // tileOffset.x is 'spacing', tileOffset.y is 'margin'
    tileCoord.x = (tileCoord.x * tileSize.x) + (tileCoord.x * tileOffset.x) + tileOffset.y;
    tileCoord.y = (tileCoord.y * tileSize.y) + (tileCoord.y * tileOffset.x) + tileOffset.y;

    vec2 offsetInTile = offsetInLayer * tileSize;
    vec2 offsetInTileFlipped = abs((tileSize * flipVec) - offsetInTile);

    // if isFlippedAD is set, this will flip the x/y coords
    if (isFlippedAD == 1) {
        float x = offsetInTileFlipped.x;
        offsetInTileFlipped.x = offsetInTileFlipped.y;
        offsetInTileFlipped.y = x;
    }

    vec4 color = getColor(imgIndex, tileCoord + offsetInTile);
    outputColor = vec4(color.rgb, color.a * uAlpha);
}
