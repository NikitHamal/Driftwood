// Image-based lighting. The sky dome is captured into a small HDR cube map (sun disc excluded - the sun is a real
// directional light) and prefiltered with PMREM. The result lights every PBR material and feeds ocean reflections.
import * as THREE from '../../vendor/three.module.js';

export class Environment {
  constructor(renderer, scene, sky, size = 128) {
    this.renderer = renderer;
    this.scene = scene;
    this.sky = sky;
    this.cubeRT = new THREE.WebGLCubeRenderTarget(size, {
      type: THREE.HalfFloatType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });
    this.cam = new THREE.CubeCamera(1, 4000, this.cubeRT);
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileCubemapShader();
    this.rt = null;
    this.timer = 99;
    this.interval = 0.8;
  }
  get skyCube() {
    return this.cubeRT.texture;
  }
  /** Re-capture the sky if the capture interval elapsed (or force). */
  update(dt, force = false) {
    this.timer += dt;
    if (!force && this.timer < this.interval) return false;
    this.timer = 0;
    const r = this.renderer;
    const prevTM = r.toneMapping;
    const prevShadow = r.shadowMap.autoUpdate;
    r.toneMapping = THREE.NoToneMapping;
    r.shadowMap.autoUpdate = false;
    this.cam.position.set(0, 2, 0);
    this.cam.update(r, this.sky.envScene);
    const next = this.pmrem.fromCubemap(this.cubeRT.texture, this.rt);
    this.rt = next;
    this.scene.environment = next.texture;
    r.toneMapping = prevTM;
    r.shadowMap.autoUpdate = prevShadow;
    return true;
  }
  dispose() {
    this.cubeRT.dispose();
    if (this.rt) this.rt.dispose();
    this.pmrem.dispose();
  }
}
