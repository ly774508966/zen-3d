import {BufferAttribute}  from './BufferAttribute.js';

function InstancedBufferAttribute(array, itemSize, meshPerAttribute) {

    BufferAttribute.call( this, array, itemSize );

    this.meshPerAttribute = meshPerAttribute || 1;

}

InstancedBufferAttribute.prototype = Object.assign( Object.create( BufferAttribute.prototype ), {

    constructor: InstancedBufferAttribute,

    isInstancedBufferAttribute: true

});

export {InstancedBufferAttribute};