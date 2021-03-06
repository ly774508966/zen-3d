import {KeyframeTrack} from './KeyframeTrack.js';

var range = {key1: 0, value1: 0, key2: 0, value2: 0};

/**
 * VectorKeyframeTrack
 * used for vector property track
 */
function VectorKeyframeTrack(target, propertyPath) {
    KeyframeTrack.call(this, target, propertyPath);
}

VectorKeyframeTrack.prototype = Object.assign(Object.create(KeyframeTrack.prototype), {

    constructor: VectorKeyframeTrack,

    _updateValue: function(t) {
        this.data.getRange(t, range);

        var key1 = range.key1;
        var key2 = range.key2;
        var value1 = range.value1;
        var value2 = range.value2;

        if(this.interpolant) {
            if(value1 !== undefined && value2 !== undefined) {
                var ratio = (t - key1) / (key2 - key1);
                this.target[this.path].lerpVectors(value1, value2, ratio);
            } else {
                this.target[this.path].copy(value1);
            }
        } else {
            this.target[this.path].copy(value1);
        }
    }

});

export {VectorKeyframeTrack};