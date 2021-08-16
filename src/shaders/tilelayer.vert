#version 300 es

precision highp float;

in vec2 aPosition;
in vec2 aTexture;

uniform float uInverseTileScale;

uniform vec2 uOffset;
uniform vec2 uViewportSize;
uniform vec2 uInverseLayerTileCount;
uniform vec2 uInverseLayerTileSize;

out vec2 vPixelCoord;
out vec2 vTextureCoord;

void main()
{
    // round offset to the nearest multiple of the inverse scale
    // this essentially clamps offset to whole "pixels"
    vec2 offset = uOffset + (uInverseTileScale / 2.0);
    offset -= mod(offset, uInverseTileScale);

    vPixelCoord = (aTexture * uViewportSize) + offset;
    vTextureCoord = vPixelCoord * uInverseLayerTileCount * uInverseLayerTileSize;

    gl_Position = vec4(aPosition, 0.0, 1.0);
}
