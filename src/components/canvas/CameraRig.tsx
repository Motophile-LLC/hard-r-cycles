'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';

export function CameraRig() {
  const basePos = useRef(new THREE.Vector3(0, 2.1, 8.2));
  const lookTarget = useRef(new THREE.Vector3(0, 1.48, 0));

  useFrame((state) => {
    const aspect = state.size.width / Math.max(1, state.size.height);
    const persp = state.camera as THREE.PerspectiveCamera;

    let targetX = 0;
    let targetY = 2.1;
    let targetZ = 8.2;
    let targetFov = 38;

    if (aspect < 0.9) {
      // Portrait phones (e.g. 390x844): frame the lift, bike, chock, and adjacent floor cleanly
      const portraitPull = THREE.MathUtils.clamp((0.9 - aspect) / 0.48, 0, 1);
      targetX = THREE.MathUtils.lerp(0.05, 0.22, portraitPull);
      targetY = THREE.MathUtils.lerp(2.28, 2.38, portraitPull);
      targetZ = THREE.MathUtils.lerp(10.4, 11.1, portraitPull);
      targetFov = THREE.MathUtils.lerp(45, 55, portraitPull);
      lookTarget.current.set(targetX, 1.32, 0);
    } else {
      const clampedAspect = THREE.MathUtils.clamp(aspect, 0.9, 1.85);
      const pullFactor = THREE.MathUtils.clamp((1.65 - clampedAspect) / 0.65, 0, 1);
      targetZ = THREE.MathUtils.clamp(6.8 / clampedAspect + 4.4, 8.2, 10.4);
      targetY = THREE.MathUtils.lerp(2.1, 2.28, pullFactor);
      targetFov = THREE.MathUtils.clamp(38 + pullFactor * 5, 38, 44);
      lookTarget.current.set(0, 1.48, 0);
    }

    basePos.current.set(targetX, targetY, targetZ);

    if (Math.abs(persp.fov - targetFov) > 0.1) {
      persp.fov = THREE.MathUtils.lerp(persp.fov, targetFov, 0.12);
      persp.updateProjectionMatrix();
    }

    const shake = useGameStore.getState().cameraShake;
    let offsetX = 0;
    let offsetY = 0;

    if (shake.timeLeft > 0 && shake.intensity !== 'none') {
      const ratio = shake.timeLeft / Math.max(0.01, shake.maxTime);
      const amp = (shake.intensity === 'explosion-shake' ? 0.28 : 0.1) * ratio;
      const t = state.clock.elapsedTime * 58;
      offsetX = Math.sin(t * 1.7) * amp;
      offsetY = Math.cos(t * 2.3) * amp;
    }

    persp.position.set(
      basePos.current.x + offsetX,
      basePos.current.y + offsetY,
      basePos.current.z,
    );
    persp.lookAt(lookTarget.current);
  });

  return null;
}
