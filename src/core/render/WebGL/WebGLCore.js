import {CULL_FACE_TYPE, BLEND_TYPE, DRAW_SIDE, WEBGL_UNIFORM_TYPE, OBJECT_TYPE, FOG_TYPE} from '../../const.js';
import {nextPowerOfTwo} from '../../base.js';
import {Vector3} from '../../math/Vector3.js';
import {Vector4} from '../../math/Vector4.js';
import {Plane} from '../../math/Plane.js';
import {Quaternion} from '../../math/Quaternion.js';
import {TextureData} from '../../texture/TextureData.js';
import {getProgram} from '../shader/Program.js';
import {WebGLProperties} from './WebGLProperties.js';
import {WebGLCapabilities} from './WebGLCapabilities.js';
import {WebGLState} from './WebGLState.js';
import {WebGLTexture} from './WebGLTexture.js';
import {WebGLGeometry} from './WebGLGeometry.js';

var helpVector3 = new Vector3();
var helpVector4 = new Vector4();

var defaultGetMaterial = function(renderable) {
    return renderable.material;
};

var getClippingPlanesData = function() {
    var planesData;
    var plane = new Plane();
    return function getClippingPlanesData(planes, camera) {
        if(!planesData || planesData.length < planes.length * 4) {
            planesData = new Float32Array(planes.length * 4);
        }

        for(var i = 0; i < planes.length; i++) {
            plane.copy(planes[i]);//.applyMatrix4(camera.viewMatrix);
            planesData[i * 4 + 0] = plane.normal.x;
            planesData[i * 4 + 1] = plane.normal.y;
            planesData[i * 4 + 2] = plane.normal.z;
            planesData[i * 4 + 3] = plane.constant;
        }
        return planesData;
    }
}();

/**
 * render method by WebGL.
 * just for render pass once in one render target
 */
function WebGLCore(gl) {
    this.gl = gl;
    
    var properties = new WebGLProperties();
    this.properties = properties;

    var capabilities = new WebGLCapabilities(gl);
    this.capabilities = capabilities;

    var state = new WebGLState(gl, capabilities);
    state.enable(gl.STENCIL_TEST);
    state.enable(gl.DEPTH_TEST);
    gl.depthFunc( gl.LEQUAL );
    state.setCullFace(CULL_FACE_TYPE.BACK);
    state.setFlipSided(false);
    state.clearColor(0, 0, 0, 0);
    this.state = state;

    this.texture = new WebGLTexture(gl, state, properties, capabilities);

    this.geometry = new WebGLGeometry(gl, state, properties, capabilities);

    this._usedTextureUnits = 0;

    this._currentGeometryProgram = "";
}

var directShadowMaps = [];
var pointShadowMaps = [];
var spotShadowMaps = [];

var scale = []; // for sprite scale upload
var spritePosition = new Vector3();
var spriteRotation = new Quaternion();
var spriteScale = new Vector3();

Object.assign(WebGLCore.prototype, {

    /**
     * clear buffer
     */
    clear: function(color, depth, stencil) {
        var gl = this.gl;
    
        var bits = 0;
    
        if (color === undefined || color) bits |= gl.COLOR_BUFFER_BIT;
        if (depth === undefined || depth) bits |= gl.DEPTH_BUFFER_BIT;
        if (stencil === undefined || stencil) bits |= gl.STENCIL_BUFFER_BIT;
    
        gl.clear(bits);
    },

    /**
     * Render opaque and transparent objects
     * @param {zen3d.Scene} scene 
     * @param {zen3d.Camera} camera 
     * @param {boolean} renderUI? default is false.
     */
    render: function(scene, camera, renderUI, updateRenderList) {
        updateRenderList = (updateRenderList !== undefined ? updateRenderList : true);
        var renderList;
        if(updateRenderList) {
            renderList = scene.updateRenderList(camera);
        } else {
            renderList = scene.getRenderList(camera);
        }
    
        this.renderPass(renderList.opaque, camera, {
            scene: scene,
            getMaterial: function(renderable) {
                return scene.overrideMaterial || renderable.material;
            }
        });
    
        this.renderPass(renderList.transparent, camera, {
            scene: scene,
            getMaterial: function(renderable) {
                return scene.overrideMaterial || renderable.material;
            }
        });
    
        if(!!renderUI) {
            this.renderPass(renderList.ui, camera, {
                scene: scene,
                getMaterial: function(renderable) {
                    return scene.overrideMaterial || renderable.material;
                }
            });
        }
    },

    /**
     * Render a single renderable list in camera in sequence
     * @param {Array} list List of all renderables.
     * @param {zen3d.Camera} camera Camera provide view matrix and porjection matrix.
     * @param {Object} [config]?
     * @param {Function} [config.getMaterial]? Get renderable material.
     * @param {Function} [config.ifRender]? If render the renderable.
     * @param {zen3d.Scene} [config.scene]? Rendering scene, have some rendering context.
     */
    renderPass: function(renderList, camera, config) {
        config = config || {};
    
        var gl = this.gl;
        var state = this.state;
    
        var getMaterial = config.getMaterial || defaultGetMaterial;
        var scene = config.scene || {};
        
        var targetWidth = state.currentRenderTarget.width;
        var targetHeight = state.currentRenderTarget.height;
    
        for (var i = 0, l = renderList.length; i < l; i++) {
            var renderItem = renderList[i];
    
            if(config.ifRender && !config.ifRender(renderItem)) {
                continue;
            }
            
            var object = renderItem.object;
            var material = getMaterial.call(this, renderItem);
            var geometry = renderItem.geometry;
            var group = renderItem.group;
    
            var program = getProgram(this, camera, material, object, scene);
            state.setProgram(program);
    
            this.geometry.setGeometry(geometry);
    
            var geometryProgram = program.uuid + "_" + geometry.uuid;
            if(geometryProgram !== this._currentGeometryProgram) {
                this.setupVertexAttributes(program, geometry);
                this._currentGeometryProgram = geometryProgram;
            }
    
            // update uniforms
            // TODO need a better upload method
            var uniforms = program.uniforms;
            for (var key in uniforms) {
                var uniform = uniforms[key];
                switch (key) {
    
                    // pvm matrix
                    case "u_Projection":
                        if (object.type === OBJECT_TYPE.CANVAS2D && object.isScreenCanvas) {
                            var projectionMat = object.orthoCamera.projectionMatrix.elements;
                        } else {
                            var projectionMat = camera.projectionMatrix.elements;
                        }
    
                        uniform.setValue(projectionMat);
                        break;
                    case "u_View":
                        if (object.type === OBJECT_TYPE.CANVAS2D && object.isScreenCanvas) {
                            var viewMatrix = object.orthoCamera.viewMatrix.elements;
                        } else {
                            var viewMatrix = camera.viewMatrix.elements;
                        }
    
                        uniform.setValue(viewMatrix);
                        break;
                    case "u_Model":
                        var modelMatrix = object.worldMatrix.elements;
                        uniform.setValue(modelMatrix);
                        break;
    
                    case "u_Color":
                        var color = material.diffuse;
                        uniform.setValue(color.r, color.g, color.b);
                        break;
                    case "u_Opacity":
                        uniform.setValue(material.opacity);
                        break;
    
                    case "texture":
                        var slot = this.allocTexUnit();
                        this.texture.setTexture2D(material.diffuseMap, slot);
                        uniform.setValue(slot);
                        break;
                    case "normalMap":
                        var slot = this.allocTexUnit();
                        this.texture.setTexture2D(material.normalMap, slot);
                        uniform.setValue(slot);
                        break;
                    case "bumpMap":
                        var slot = this.allocTexUnit();
                        this.texture.setTexture2D(material.bumpMap, slot);
                        uniform.setValue(slot);
                        break;
                    case "bumpScale":
                        uniform.setValue(material.bumpScale);
                        break;
                    case "envMap":
                        var slot = this.allocTexUnit();
                        this.texture.setTextureCube(material.envMap, slot);
                        uniform.setValue(slot);
                        break;
                    case "cubeMap":
                        var slot = this.allocTexUnit();
                        this.texture.setTextureCube(material.cubeMap, slot);
                        uniform.setValue(slot);
                        break;
    
                    case "u_EnvMap_Intensity":
                        uniform.setValue(material.envMapIntensity);
                        break;
                    case "u_Specular":
                        uniform.setValue(material.shininess);
                        break;
                    case "u_SpecularColor":
                        var color = material.specular;
                        uniform.setValue(color.r, color.g, color.b, 1);
                        break;
                    case "specularMap":
                        var slot = this.allocTexUnit();
                        this.texture.setTexture2D(material.specularMap, slot);
                        uniform.setValue(slot);
                        break;
                    case "aoMap":
                        var slot = this.allocTexUnit();
                        this.texture.setTexture2D(material.aoMap, slot);
                        uniform.setValue(slot);
                        break;
                    case "aoMapIntensity":
                        uniform.setValue(material.aoMapIntensity);
                        break;
                    case "u_Roughness":
                        uniform.setValue(material.roughness);
                        break;
                    case "roughnessMap":
                        var slot = this.allocTexUnit();
                        this.texture.setTexture2D(material.roughnessMap, slot);
                        uniform.setValue(slot);
                        break;
                    case "u_Metalness":
                        uniform.setValue(material.metalness);
                        break;
                    case "metalnessMap":
                        var slot = this.allocTexUnit();
                        this.texture.setTexture2D(material.metalnessMap, slot);
                        uniform.setValue(slot);
                        break;
                    case "emissive":
                        var color = material.emissive;
                        var intensity = material.emissiveIntensity;
                        uniform.setValue(color.r * intensity, color.g * intensity, color.b * intensity);
                        break;
                    case "emissiveMap":
                        var slot = this.allocTexUnit();
                        this.texture.setTexture2D(material.emissiveMap, slot);
                        uniform.setValue(slot);
                        break;
                    case "u_CameraPosition":
                        helpVector3.setFromMatrixPosition(camera.worldMatrix);
                        uniform.setValue(helpVector3.x, helpVector3.y, helpVector3.z);
                        break;
                    case "u_FogColor":
                        var color = scene.fog.color;
                        uniform.setValue(color.r, color.g, color.b);
                        break;
                    case "u_FogDensity":
                        uniform.setValue(scene.fog.density);
                        break;
                    case "u_FogNear":
                        uniform.setValue(scene.fog.near);
                        break;
                    case "u_FogFar":
                        uniform.setValue(scene.fog.far);
                        break;
                    case "u_PointSize":
                        uniform.setValue(material.size);
                        break;
                    case "u_PointScale":
                        var scale = targetHeight * 0.5; // three.js do this
                        uniform.setValue(scale);
                        break;
                    case "dashSize":
                        uniform.setValue(material.dashSize);
                        break;
                    case "totalSize":
                        uniform.setValue(material.dashSize + material.gapSize);
                        break;
                    case "scale":
                        uniform.setValue(material.scale);
                        break;
                    case "clippingPlanes[0]":
                        var planesData = getClippingPlanesData(scene.clippingPlanes || [], camera);
                        gl.uniform4fv(uniform.location, planesData);
                        break;
                    case "uvTransform":
                        var uvScaleMap;
                        uvScaleMap = material.diffuseMap || 
                            material.specularMap || material.normalMap || material.bumpMap ||
                            material.roughnessMap || material.metalnessMap || material.emissiveMap;
                        if(uvScaleMap) {
                            if(uvScaleMap.matrixAutoUpdate) {
                                uvScaleMap.updateMatrix();
                            }
                            uniform.setValue(uvScaleMap.matrix.elements);
                        }
                        break;
                    default:
                        // upload custom uniforms
                        if(material.uniforms && material.uniforms[key] !== undefined) {
                            if(uniform.type === WEBGL_UNIFORM_TYPE.SAMPLER_2D) {
                                var slot = this.allocTexUnit();
                                this.texture.setTexture2D(material.uniforms[key], slot);
                                uniform.setValue(slot);
                            } else if(uniform.type === WEBGL_UNIFORM_TYPE.SAMPLER_CUBE) {
                                var slot = this.allocTexUnit();
                                this.texture.setTextureCube(material.uniforms[key], slot);
                                uniform.setValue(slot);
                            } else {
                                uniform.set(material.uniforms[key]);
                            }
                        }
                        break;
                }
            }
    
            // boneMatrices
            if(object.type === OBJECT_TYPE.SKINNED_MESH) {
                this.uploadSkeleton(uniforms, object, program.id);
            }
    
            if(object.type === OBJECT_TYPE.SPRITE) {
                this.uploadSpriteUniform(uniforms, object, camera, scene.fog);
            }
            
            if(object.type === OBJECT_TYPE.PARTICLE) {
                this.uploadParticlesUniform(uniforms, object, camera);
            }
    
            if (material.acceptLight && scene.lights) {
                this.uploadLights(uniforms, scene.lights, object.receiveShadow, camera);
            }
    
            var frontFaceCW = object.worldMatrix.determinant() < 0;
            this.setStates(material, frontFaceCW);
    
            var viewport = helpVector4.set(
                state.currentRenderTarget.width, 
                state.currentRenderTarget.height,
                state.currentRenderTarget.width, 
                state.currentRenderTarget.height
            ).multiply(camera.rect);
    
            viewport.z -= viewport.x;
            viewport.w -= viewport.y;
    
            viewport.x = Math.floor(viewport.x);
            viewport.y = Math.floor(viewport.y);
            viewport.z = Math.floor(viewport.z);
            viewport.w = Math.floor(viewport.w);
    
            if(object.type === OBJECT_TYPE.CANVAS2D) {
                if(object.isScreenCanvas) {
                    object.setRenderViewport(viewport.x, viewport.y, viewport.z, viewport.w);
                    state.viewport(object.viewport.x, object.viewport.y, object.viewport.z, object.viewport.w);
                }
    
                var _offset = 0;
                for (var j = 0; j < object.drawArray.length; j++) {
                    var drawData = object.drawArray[j];
    
                    var slot = this.allocTexUnit();
                    this.texture.setTexture2D(drawData.texture, slot);
                    uniforms.spriteTexture.setValue(slot);
    
                    gl.drawElements(gl.TRIANGLES, drawData.count * 6, gl.UNSIGNED_SHORT, _offset * 2);
                    _offset += drawData.count * 6;
                    this._usedTextureUnits = 0;
                }
            } else {
                state.viewport(viewport.x, viewport.y, viewport.z, viewport.w);
    
                this.draw(geometry, material, group);
            }
    
            // reset used tex Unit
            this._usedTextureUnits = 0;
        }
    },

    /**
     * @private
     * set states
     * @param {boolean} frontFaceCW
     */
    setStates: function(material, frontFaceCW) {
        var gl = this.gl;
        var state = this.state;
    
        // set blend
        if (material.transparent) {
            state.setBlend(material.blending, material.blendEquation, material.blendSrc, material.blendDst, material.blendEquationAlpha, material.blendSrcAlpha, material.blendDstAlpha, material.premultipliedAlpha);
        } else {
            state.setBlend(BLEND_TYPE.NONE);
        }
    
        // set depth test
        if (material.depthTest) {
            state.enable(gl.DEPTH_TEST);
            state.depthMask(material.depthWrite);
        } else {
            state.disable(gl.DEPTH_TEST);
        }
    
        // set draw side
        state.setCullFace(
            (material.side === DRAW_SIDE.DOUBLE) ? CULL_FACE_TYPE.NONE : CULL_FACE_TYPE.BACK
        );
    
        var flipSided = ( material.side === DRAW_SIDE.BACK );
        if ( frontFaceCW ) flipSided = ! flipSided;
    
        state.setFlipSided(flipSided);
    
        // set line width
        if(material.lineWidth !== undefined) {
            state.setLineWidth(material.lineWidth);
        }
    },

    /**
     * @private
     * gl draw
     */
    draw: function(geometry, material, group) {
        var gl = this.gl;
    
        var useIndexBuffer = geometry.index !== null;
    
        var drawStart = 0;
        var drawCount = useIndexBuffer ? geometry.index.count : geometry.getAttribute("a_Position").count;
        var groupStart = group ? group.start : 0;
        var groupCount = group ? group.count : Infinity;
        drawStart = Math.max(drawStart, groupStart);
        drawCount = Math.min(drawCount, groupCount);
    
        var angleInstancedArraysExt = this.capabilities.angleInstancedArraysExt;
    
        if(useIndexBuffer) {
            if(geometry.isInstancedGeometry) {
                if(geometry.maxInstancedCount > 0) {
                    angleInstancedArraysExt.drawElementsInstancedANGLE(material.drawMode, drawCount, gl.UNSIGNED_SHORT, drawStart * 2, geometry.maxInstancedCount);
                }
            } else {
                gl.drawElements(material.drawMode, drawCount, gl.UNSIGNED_SHORT, drawStart * 2);
            }
        } else {
            if(geometry.isInstancedGeometry) {
                if(geometry.maxInstancedCount > 0) {
                    angleInstancedArraysExt.drawArraysInstancedANGLE(material.drawMode, drawStart, drawCount, geometry.maxInstancedCount);
                }
            } else {
                gl.drawArrays(material.drawMode, drawStart, drawCount);
            }
        }
    },

    /**
     * @private
     * upload skeleton uniforms
     */
    uploadSkeleton: function(uniforms, object, programId) {
        if(object.skeleton && object.skeleton.bones.length > 0) {
            var skeleton = object.skeleton;
            var gl = this.gl;
    
            if(this.capabilities.maxVertexTextures > 0 && this.capabilities.floatTextures) {
                if(skeleton.boneTexture === undefined) {
                    var size = Math.sqrt(skeleton.bones.length * 4);
                    size = nextPowerOfTwo(Math.ceil(size));
                    size = Math.max(4, size);
    
                    var boneMatrices = new Float32Array(size * size * 4);
                    boneMatrices.set(skeleton.boneMatrices);
    
                    var boneTexture = new TextureData(boneMatrices, size, size);
    
                    skeleton.boneMatrices = boneMatrices;
                    skeleton.boneTexture = boneTexture;
                    skeleton.boneTextureSize = size;
                }
    
                var slot = this.allocTexUnit();
                this.texture.setTexture2D(skeleton.boneTexture, slot);
    
                if(uniforms["boneTexture"]) {
                    uniforms["boneTexture"].setValue(slot);
                }
    
                if(uniforms["boneTextureSize"]) {
                    uniforms["boneTextureSize"].setValue(skeleton.boneTextureSize);
                }
            } else {
                // TODO a cache for uniform location
                var location = gl.getUniformLocation(programId, "boneMatrices");
                gl.uniformMatrix4fv(location, false, skeleton.boneMatrices);
            }
        }
    },

    /**
     * @private
     * upload lights uniforms
     * TODO a better function for array & struct uniforms upload
     */
    uploadLights: function(uniforms, lights, receiveShadow, camera) {
        var gl = this.gl;
    
        if(lights.ambientsNum > 0) {
            uniforms.u_AmbientLightColor.set(lights.ambient);
        }
    
        for (var k = 0; k < lights.directsNum; k++) {
            var light = lights.directional[k];
    
            var u_Directional_direction = uniforms["u_Directional[" + k + "].direction"];
            u_Directional_direction.set(light.direction);
            var u_Directional_intensity = uniforms["u_Directional[" + k + "].intensity"];
            u_Directional_intensity.setValue(1);
            var u_Directional_color = uniforms["u_Directional[" + k + "].color"];
            u_Directional_color.set(light.color);
    
            var shadow = light.shadow && receiveShadow;
    
            var u_Directional_shadow = uniforms["u_Directional[" + k + "].shadow"];
            u_Directional_shadow.setValue(shadow ? 1 : 0);
    
            if(shadow) {
                var u_Directional_shadowBias = uniforms["u_Directional[" + k + "].shadowBias"];
                u_Directional_shadowBias.setValue(light.shadowBias);
                var u_Directional_shadowRadius = uniforms["u_Directional[" + k + "].shadowRadius"];
                u_Directional_shadowRadius.setValue(light.shadowRadius);
                var u_Directional_shadowMapSize = uniforms["u_Directional[" + k + "].shadowMapSize"];
                u_Directional_shadowMapSize.set(light.shadowMapSize);
    
                var slot = this.allocTexUnit();
                this.texture.setTexture2D(lights.directionalShadowMap[k], slot);
                directShadowMaps[k] = slot;
            }
        }
        if(directShadowMaps.length > 0) {
            var directionalShadowMap = uniforms["directionalShadowMap[0]"];
            gl.uniform1iv(directionalShadowMap.location, directShadowMaps);
    
            directShadowMaps.length = 0;
    
            var directionalShadowMatrix = uniforms["directionalShadowMatrix[0]"];
            gl.uniformMatrix4fv(directionalShadowMatrix.location, false, lights.directionalShadowMatrix);
        }
    
        for (var k = 0; k < lights.pointsNum; k++) {
            var light = lights.point[k];
    
            var u_Point_position = uniforms["u_Point[" + k + "].position"];
            u_Point_position.set(light.position);
            var u_Point_intensity = uniforms["u_Point[" + k + "].intensity"];
            u_Point_intensity.setValue(1);
            var u_Point_color = uniforms["u_Point[" + k + "].color"];
            u_Point_color.set(light.color);
            var u_Point_distance = uniforms["u_Point[" + k + "].distance"];
            u_Point_distance.setValue(light.distance);
            var u_Point_decay = uniforms["u_Point[" + k + "].decay"];
            u_Point_decay.setValue(light.decay);
    
            var shadow = light.shadow && receiveShadow;
    
            var u_Point_shadow = uniforms["u_Point[" + k + "].shadow"];
            u_Point_shadow.setValue(shadow ? 1 : 0);
    
            if (shadow) {
                var u_Point_shadowBias = uniforms["u_Point[" + k + "].shadowBias"];
                u_Point_shadowBias.setValue(light.shadowBias);
                var u_Point_shadowRadius = uniforms["u_Point[" + k + "].shadowRadius"];
                u_Point_shadowRadius.setValue(light.shadowRadius);
                var u_Point_shadowMapSize = uniforms["u_Point[" + k + "].shadowMapSize"];
                u_Point_shadowMapSize.set(light.shadowMapSize);
                var u_Point_shadowCameraNear = uniforms["u_Point[" + k + "].shadowCameraNear"];
                u_Point_shadowCameraNear.setValue(light.shadowCameraNear);
                var u_Point_shadowCameraFar = uniforms["u_Point[" + k + "].shadowCameraFar"];
                u_Point_shadowCameraFar.setValue(light.shadowCameraFar);
    
                var slot = this.allocTexUnit();
                this.texture.setTextureCube(lights.pointShadowMap[k], slot);
                pointShadowMaps[k] = slot;
            }
        }
        if(pointShadowMaps.length > 0) {
            var pointShadowMap = uniforms["pointShadowMap[0]"];
            gl.uniform1iv(pointShadowMap.location, pointShadowMaps);
    
            pointShadowMaps.length = 0;
        }
    
        for (var k = 0; k < lights.spotsNum; k++) {
            var light = lights.spot[k];
    
            var u_Spot_position = uniforms["u_Spot[" + k + "].position"];
            u_Spot_position.set(light.position);
            var u_Spot_direction = uniforms["u_Spot[" + k + "].direction"];
            u_Spot_direction.set(light.direction);
            var u_Spot_intensity = uniforms["u_Spot[" + k + "].intensity"];
            u_Spot_intensity.setValue(1);
            var u_Spot_color = uniforms["u_Spot[" + k + "].color"];
            u_Spot_color.set(light.color);
            var u_Spot_distance = uniforms["u_Spot[" + k + "].distance"];
            u_Spot_distance.setValue(light.distance);
            var u_Spot_decay = uniforms["u_Spot[" + k + "].decay"];
            u_Spot_decay.setValue(light.decay);
            var u_Spot_coneCos = uniforms["u_Spot[" + k + "].coneCos"];
            u_Spot_coneCos.setValue(light.coneCos);
            var u_Spot_penumbraCos = uniforms["u_Spot[" + k + "].penumbraCos"];
            u_Spot_penumbraCos.setValue(light.penumbraCos);
    
            var shadow = light.shadow && receiveShadow;
    
            var u_Spot_shadow = uniforms["u_Spot[" + k + "].shadow"];
            u_Spot_shadow.setValue(shadow ? 1 : 0);
    
            if (shadow) {
                var u_Spot_shadowBias = uniforms["u_Spot[" + k + "].shadowBias"];
                u_Spot_shadowBias.setValue(light.shadowBias);
                var u_Spot_shadowRadius = uniforms["u_Spot[" + k + "].shadowRadius"];
                u_Spot_shadowRadius.setValue(light.shadowRadius);
                var u_Spot_shadowMapSize = uniforms["u_Spot[" + k + "].shadowMapSize"];
                u_Spot_shadowMapSize.set(light.shadowMapSize);
    
                var slot = this.allocTexUnit();
                this.texture.setTexture2D(lights.spotShadowMap[k], slot);
                spotShadowMaps[k] = slot;
            }
        }
        if(spotShadowMaps.length > 0) {
            var spotShadowMap = uniforms["spotShadowMap[0]"];
            gl.uniform1iv(spotShadowMap.location, spotShadowMaps);
    
            spotShadowMaps.length = 0;
    
            var spotShadowMatrix = uniforms["spotShadowMatrix[0]"];
            gl.uniformMatrix4fv(spotShadowMatrix.location, false, lights.spotShadowMatrix);
        }
    },

    uploadSpriteUniform: function(uniforms, sprite, camera, fog) {
        var gl = this.gl;
        var state = this.state;
        var geometry = sprite.geometry;
        var material = sprite.material;
    
        uniforms.projectionMatrix.setValue(camera.projectionMatrix.elements);
    
        var sceneFogType = 0;
        if (fog) {
            uniforms.fogColor.setValue(fog.color.r, fog.color.g, fog.color.b);
    
            if (fog.fogType === FOG_TYPE.NORMAL) {
                uniforms.fogNear.setValue(fog.near);
                uniforms.fogFar.setValue(fog.far);
    
                uniforms.fogType.setValue(1);
                sceneFogType = 1;
            } else if (fog.fogType === FOG_TYPE.EXP2) {
                uniforms.fogDensity.setValue(fog.density);
                uniforms.fogType.setValue(2);
                sceneFogType = 2;
            }
        } else {
            uniforms.fogType.setValue(0);
            sceneFogType = 0;
        }
    
        uniforms.alphaTest.setValue(0);
        uniforms.viewMatrix.setValue(camera.viewMatrix.elements);
        uniforms.modelMatrix.setValue(sprite.worldMatrix.elements);
    
        sprite.worldMatrix.decompose(spritePosition, spriteRotation, spriteScale);
    
        scale[0] = spriteScale.x;
        scale[1] = spriteScale.y;
    
        var fogType = 0;
    
        if (fog && material.fog) {
            fogType = sceneFogType;
        }
    
        uniforms.fogType.setValue(fogType);
    
        if (material.diffuseMap !== null) {
            // TODO offset
            // uniforms.uvOffset.setValue(uniforms.uvOffset, material.diffuseMap.offset.x, material.diffuseMap.offset.y);
            // uniforms.uvScale.setValue(uniforms.uvScale, material.diffuseMap.repeat.x, material.diffuseMap.repeat.y);
            uniforms.uvOffset.setValue(0, 0);
            uniforms.uvScale.setValue(1, 1);
        } else {
            uniforms.uvOffset.setValue(0, 0);
            uniforms.uvScale.setValue(1, 1);
        }
    
        uniforms.opacity.setValue(material.opacity);
        uniforms.color.setValue(material.diffuse.r, material.diffuse.g, material.diffuse.b);
    
        uniforms.rotation.setValue(material.rotation);
        uniforms.scale.setValue(scale[0], scale[1]);
    
        var slot = this.allocTexUnit();
        this.texture.setTexture2D(material.diffuseMap, slot);
        uniforms.map.setValue(slot);
    },

    uploadParticlesUniform: function(uniforms, particle, camera) {
        var gl = this.gl;
        var state = this.state;
        var geometry = particle.geometry;
        var material = particle.material;
    
        uniforms.uTime.setValue(particle.time);
        uniforms.uScale.setValue(1);
    
        uniforms.u_Projection.setValue(camera.projectionMatrix.elements);
        uniforms.u_View.setValue(camera.viewMatrix.elements);
        uniforms.u_Model.setValue(particle.worldMatrix.elements);
    
        var slot = this.allocTexUnit();
        this.texture.setTexture2D(particle.particleNoiseTex, slot);
        uniforms.tNoise.setValue(slot);
    
        var slot = this.allocTexUnit();
        this.texture.setTexture2D(particle.particleSpriteTex, slot);
        uniforms.tSprite.setValue(slot);
    },

    /**
     * @private
     * alloc texture unit
     */
    allocTexUnit: function() {
        var textureUnit = this._usedTextureUnits;
    
        if (textureUnit >= this.capabilities.maxTextures) {
    
            console.warn('trying to use ' + textureUnit + ' texture units while this GPU supports only ' + this.capabilities.maxTextures);
    
        }
    
        this._usedTextureUnits += 1;
    
        return textureUnit;
    },

    /**
     * @private 
     */
    setupVertexAttributes: function(program, geometry) {
        var gl = this.gl;
        var attributes = program.attributes;
        var properties = this.properties;
        var angleInstancedArraysExt = this.capabilities.angleInstancedArraysExt;
        for (var key in attributes) {
            var programAttribute = attributes[key];
            var geometryAttribute = geometry.getAttribute(key);
            if(geometryAttribute) {
                var normalized = geometryAttribute.normalized;
                var size = geometryAttribute.size;
                if(programAttribute.count !== size) {
                    console.warn("WebGLCore: attribute " + key + " size not match! " + programAttribute.count + " : " + size);
                }
    
                var attribute;
                if(geometryAttribute.isInterleavedBufferAttribute) {
                    attribute = properties.get(geometryAttribute.data);
                } else {
                    attribute = properties.get(geometryAttribute);
                }
                var buffer = attribute.buffer;
                var type = attribute.type;
                if(programAttribute.format !== type) {
                    // console.warn("WebGLCore: attribute " + key + " type not match! " + programAttribute.format + " : " + type);
                }
                var bytesPerElement = attribute.bytesPerElement;
    
                if(geometryAttribute.isInterleavedBufferAttribute) {
                    var data = geometryAttribute.data;
                    var stride = data.stride;
                    var offset = geometryAttribute.offset;
    
                    gl.enableVertexAttribArray(programAttribute.location);
    
                    if(data && data.isInstancedInterleavedBuffer) {
                        if(!angleInstancedArraysExt) {
                            console.warn("ANGLE_instanced_arrays not supported");
                        }
                        angleInstancedArraysExt.vertexAttribDivisorANGLE(programAttribute.location, data.meshPerAttribute);
                        if ( geometry.maxInstancedCount === undefined ) {
                            geometry.maxInstancedCount = data.meshPerAttribute * data.count;
                        }
                    }
    
                    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                    gl.vertexAttribPointer(programAttribute.location, programAttribute.count, type, normalized, bytesPerElement * stride, bytesPerElement * offset);
                } else {
                    gl.enableVertexAttribArray(programAttribute.location);
    
                    if(geometryAttribute && geometryAttribute.isInstancedBufferAttribute) {
                        if(!angleInstancedArraysExt) {
                            console.warn("ANGLE_instanced_arrays not supported");
                        }
                        angleInstancedArraysExt.vertexAttribDivisorANGLE(programAttribute.location, geometryAttribute.meshPerAttribute);
                        if ( geometry.maxInstancedCount === undefined ) {
                            geometry.maxInstancedCount = geometryAttribute.meshPerAttribute * geometryAttribute.count;
                        }
                    }
    
                    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                    gl.vertexAttribPointer(programAttribute.location, programAttribute.count, type, normalized, 0, 0);
                }
            } else {
                console.warn("WebGLCore: geometry attribute " + key + " not found!");
            }
        }
    
        // bind index if could
        if(geometry.index) {
            var indexProperty = properties.get(geometry.index);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexProperty.buffer);
        }
    }

});

export {WebGLCore};