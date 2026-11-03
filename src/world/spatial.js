import * as THREE from '../../vendor/three.module.js';
import { raft } from '../render/stage.js';
import { P } from './entities.js';

export const worldPos = (x, y, z) => raft.group.localToWorld(new THREE.Vector3(x, y, z));
export const playerWorld = () => P.root.getWorldPosition(new THREE.Vector3());
