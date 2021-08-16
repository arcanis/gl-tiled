// @if DEBUG
import { ASSERT } from './debug';
// @endif

import { ITileset, ITile } from './tiled/Tileset';
import { loadImage } from './utils/loadImage';
import { IDictionary } from './IDictionary';
import { IAssetCache } from './IAssetCache';
import { IPoint } from './IPoint';
import { extrudeImage } from './utils/extrudeImage';

export interface ITileProps
{
    coords: IPoint;
    imgIndex: number;
    flippedX: boolean;
    flippedY: boolean;
    flippedAD: boolean;
    tile?: ITile;
}

/**
 * Tileset GID flags, these flags are set on a tile's ID to give it a special property
 *
 * @property FLAGS
 * @static
 */
export enum TilesetFlags {
    FlippedAntiDiagonal = 0x20000000,
    FlippedVertical     = 0x40000000,
    FlippedHorizontal   = 0x80000000,
    All = FlippedHorizontal | FlippedVertical | FlippedAntiDiagonal,

    FlippedAntiDiagonalFlag = FlippedAntiDiagonal >> 28,
    FlippedVerticalFlag     = FlippedVertical >> 28,
    FlippedHorizontalFlag   = FlippedHorizontal >> 28,
};

export class GLTileset
{
    gl: WebGLRenderingContext | null = null;

    /** The images in this tileset. */
    images: (TexImageSource | null)[] = [];

    /** The gl textures in this tileset */
    textures: (WebGLTexture | null)[] = [];

    private _lidToTileMap: IDictionary<ITile> = {};

    constructor(public readonly desc: ITileset, assetCache?: IAssetCache)
    {
        if (this.desc.image) {
            const rows = Math.ceil(desc.imageheight / desc.tileheight);

            desc.margin = 1;
            desc.spacing = 2;

            desc.imagewidth += (desc.columns - 1) * desc.spacing + desc.margin * 2;
            desc.imageheight += (rows - 1) * desc.spacing + desc.margin * 2;

            console.log(desc.imagewidth, desc.imageheight, this.desc.image)
        }

        // load the images
        if (this.desc.image)
        {
            this._addImage(this.desc.image, assetCache);
        }

        if (this.desc.tiles)
        {
            for (let i = 0; i < this.desc.tiles.length; ++i)
            {
                const tile = this.desc.tiles[i];

                this._lidToTileMap[tile.id] = tile;

                if (tile.image)
                {
                    this._addImage(tile.image, assetCache);
                }
            }
        }
    }

    /** The last gid in this tileset */
    get lastgid(): number
    {
        return this.desc.firstgid + this.desc.tilecount;
    }

    /**
     * Returns true if the given gid is contained in this tileset
     *
     * @param gid The global ID of the tile in a map.
     */
    containsGid(gid: number): boolean
    {
        return this.containsLocalId(this.getTileLocalId(gid));
    }

    /**
     * Returns true if the given index is contained in this tileset
     *
     * @param index The local index of a tile in this tileset.
     */
    containsLocalId(index: number): boolean
    {
        return index >= 0 && index < this.desc.tilecount;
    }

    /**
     * Returns the tile ID for a given gid. Assumes it is within range
     *
     * @param gid The global ID of the tile in a map.
     */
    getTileLocalId(gid: number): number
    {
        return (gid & ~TilesetFlags.All) - this.desc.firstgid;
    }

    /**
     * Gathers the properties of a tile
     *
     * @param gid The global ID of the tile in a map.
     */
    getTileProperties(gid: number): ITileProps | null
    {
        if (!gid)
            return null;

        const localId = this.getTileLocalId(gid);

        if (!this.containsLocalId(localId))
            return null;

        return {
            coords: {
                x: localId % this.desc.columns,
                y: Math.floor(localId / this.desc.columns),
            },
            imgIndex: this.images.length > 1 ? localId : 0,
            flippedX: (gid & TilesetFlags.FlippedHorizontal) != 0,
            flippedY: (gid & TilesetFlags.FlippedVertical) != 0,
            flippedAD: (gid & TilesetFlags.FlippedAntiDiagonal) != 0,
            tile: this._lidToTileMap[localId],
        };
    }

    bind(startSlot: number): void
    {
        // @if DEBUG
        ASSERT(!!(this.gl), 'Cannot call `bind` before `glInitialize`.');
        // @endif

        const gl = this.gl!;

        for (let i = 0; i < this.textures.length; ++i)
        {
            gl.activeTexture(startSlot + i);
            gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
        }
    }

    glInitialize(gl: WebGLRenderingContext): void
    {
        this.glTerminate();

        this.gl = gl;

        for (let i = 0; i < this.images.length; ++i)
        {
            // If there is already an image then that means the image finished
            // loading at some point, so we need to recreate the texture. If there
            // isn't an image here, then the loading callback will hit at some
            // point and create the texture for us there.
            if (this.images[i])
            {
                this._createTexture(i);
            }
        }
    }

    glTerminate(): void
    {
        if (!this.gl)
            return;

        const gl = this.gl;

        for (let i = 0; i < this.textures.length; ++i)
        {
            const tex = this.textures[i];

            if (tex)
            {
                gl.deleteTexture(tex);
            }
        }

        this.textures.length = 0;
        this.gl = null;
    }

    private _addImage(src: string, assets?: IAssetCache): void
    {
        const imgIndex = this.images.length;

        this.images.push(null);
        this.textures.push(null);

        loadImage(src, assets, (errEvent, img) =>
        {
            if (!errEvent)
            {
                this.images[imgIndex] = extrudeImage(img, {
                    tileWidth: this.desc.tilewidth,
                    tileHeight: this.desc.tileheight,
                    marginSize: 1,
                });

                this._createTexture(imgIndex);
            }
        });
    }

    private _createTexture(imgIndex: number): void
    {
        if (!this.gl)
            return;

        const gl = this.gl;
        const img = this.images[imgIndex];
        const tex = this.textures[imgIndex] = gl.createTexture();

        if (!tex || !img)
        {
            throw new Error('Failed to create WebGL texture for tileset.');
        }

        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

        // TODO: Allow user to set filtering, but also need a way to do linear
        // filtering without tile tearing when zooming in.
        // Possibility: Render at scale 1 to a framebuffer, scale the frambuffer linearly
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
}
