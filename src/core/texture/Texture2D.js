import {TextureBase} from './TextureBase.js';
import {Vector2} from '../math/Vector2.js';
import {Matrix3} from '../math/Matrix3.js';
import {WEBGL_TEXTURE_TYPE, WEBGL_PIXEL_FORMAT} from '../const.js';
import {ImageLoader} from '../loader/ImageLoader.js';
import {TGALoader} from '../loader/TGALoader.js';

/**
 * Texture2D
 * @class
 */
function Texture2D() {
    TextureBase.call(this);

    this.textureType = WEBGL_TEXTURE_TYPE.TEXTURE_2D;

    this.image = null;
    this.mipmaps = [];

    // uv transform
    this.offset = new Vector2();
    this.repeat = new Vector2(1, 1);
    this.center = new Vector2();
    this.rotation = 0;

    this.matrix = new Matrix3();

    this.matrixAutoUpdate = true;
}

Texture2D.prototype = Object.assign(Object.create(TextureBase.prototype), {

    constructor: Texture2D,

    updateMatrix: function() {
        this.matrix.setUvTransform( this.offset.x, this.offset.y, this.repeat.x, this.repeat.y, this.rotation, this.center.x, this.center.y );
    }

});

Texture2D.fromImage = function(image) {
    var texture = new Texture2D();

    texture.image = image;
    texture.version++;

    return texture;
}

Texture2D.fromSrc = function(src) {
    var texture = new Texture2D();

    // JPEGs can't have an alpha channel, so memory can be saved by storing them as RGB.
    var isJPEG = src.search( /\.(jpg|jpeg)$/ ) > 0 || src.search( /^data\:image\/jpeg/ ) === 0;

    var isTGA = src.search( /\.(tga)$/ ) > 0 || src.search( /^data\:image\/tga/ ) === 0;

    var loader = isTGA ? new TGALoader() : new ImageLoader();
    loader.load(src, function(image) {
        texture.pixelFormat = isJPEG ? WEBGL_PIXEL_FORMAT.RGB : WEBGL_PIXEL_FORMAT.RGBA;
        texture.image = image;
        texture.version++;

        texture.dispatchEvent({type: 'onload'});
    });

    return texture;
}

export {Texture2D};