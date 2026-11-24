'use client';

import { Billboard, Edges } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { getStaffGreeting, resolveStaffReply } from '@/data/staffDialogue';
import { useShopStore } from '@/store/useShopStore';
import type {
  AmbientCustomerEvent,
  CameraFocusZone,
  LiveBayOccupant,
  StaffId,
} from '@/types/shop';
import type { CharacterId } from '@/utils/proceduralSprites';
import { useCoarsePointer } from '@/utils/useCoarsePointer';
import { FlatRateMasterPoster } from './FlatRateMasterPoster';
import { SafeHtml as Html } from './SafeHtml';
import {
  getComicSignPlaqueTexture,
  getGarageWallTexture,
  getShopFloorTexture,
} from '@/utils/dealershipTextures';
import {
  TOON_GRADIENT_MAP,
  useBikeSpriteTexture,
  useCharacterSpriteTexture,
  usePropSpriteTexture,
  useShopBackgroundTexture,
  useVfxSpriteTexture,
} from './ToonMaterial';

const CAMERA_PRESETS: Record<
  CameraFocusZone,
  { pos: [number, number, number]; look: [number, number, number] }
> = {
  OVERVIEW: { pos: [9.4, 11.2, 13.6], look: [-0.2, 0.65, 0.25] },
  APPAREL: { pos: [-1.1, 3.25, 3.8], look: [-5.4, 1.32, -0.8] },
  PARTS: { pos: [1.3, 3.15, 6.0], look: [-2.5, 1.1, 2.0] },
  SERVICE: { pos: [0.65, 3.05, 1.45], look: [-0.5, 1.38, -3.5] },
  BAYS: { pos: [9.2, 5.8, 6.8], look: [4.6, 1.1, 0.35] },
};

function DealershipCameraRig() {
  const currentPos = useRef(new THREE.Vector3(...CAMERA_PRESETS.OVERVIEW.pos));
  const currentLook = useRef(new THREE.Vector3(...CAMERA_PRESETS.OVERVIEW.look));
  const lookTargetVec = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const storeState = useShopStore.getState();
    const focus = storeState.cameraFocus;
    const preset = CAMERA_PRESETS[focus] ?? CAMERA_PRESETS.OVERVIEW;
    const aspect = state.size.width / Math.max(1, state.size.height);
    const persp = state.camera as THREE.PerspectiveCamera;
    const isPortrait = aspect < 0.9;

    // Pull back cleanly on narrow portrait phones; keep zoomed staff eye-level & unobstructed
    const overviewBoost =
      focus === 'OVERVIEW' && isPortrait
        ? THREE.MathUtils.clamp((0.95 - aspect) * 1.4, 0, 0.68)
        : 0;
    const focusHorizontalPull =
      focus !== 'OVERVIEW' && isPortrait
        ? THREE.MathUtils.clamp((0.95 - aspect) * 0.45, 0, 0.28)
        : 0;
    const targetFov =
      focus === 'OVERVIEW' ? (isPortrait ? 44 : 34) : isPortrait ? 40 : 35;

    const baseX =
      preset.pos[0] +
      (preset.pos[0] - preset.look[0]) * (overviewBoost * 0.48 + focusHorizontalPull);
    const baseY =
      preset.pos[1] + (preset.pos[1] - preset.look[1]) * (overviewBoost * 0.42);
    const baseZ =
      preset.pos[2] +
      (preset.pos[2] - preset.look[2]) * (overviewBoost * 0.56 + focusHorizontalPull);

    const lx = preset.look[0];
    const ly =
      preset.look[1] -
      (isPortrait && storeState.activeDialogue && focus !== 'OVERVIEW' ? 0.35 : 0);
    const lz = preset.look[2];

    // Clamped Sims-style orbit & zoom offsets around focus point
    const zoomScale = THREE.MathUtils.clamp(1 + storeState.cameraZoomDelta * 0.085, 0.72, 1.38);
    const yaw = storeState.cameraYawOffset;
    const dx = (baseX - lx) * zoomScale;
    const dy = (baseY - ly) * zoomScale;
    const dz = (baseZ - lz) * zoomScale;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);

    const tx = lx + dx * cosY - dz * sinY;
    const ty = Math.max(2.35, ly + dy);
    const tz = lz + dx * sinY + dz * cosY;

    const step = Math.min(1, delta * 5.2);
    currentPos.current.lerp(lookTargetVec.current.set(tx, ty, tz), step);
    currentLook.current.lerp(lookTargetVec.current.set(lx, ly, lz), step);

    if (Math.abs(persp.fov - targetFov) > 0.1) {
      persp.fov = THREE.MathUtils.lerp(persp.fov, targetFov, 0.12);
      persp.updateProjectionMatrix();
    }

    persp.position.copy(currentPos.current);
    persp.lookAt(currentLook.current);
  });

  return null;
}

function AmbientCustomerMesh({ event }: { event: AmbientCustomerEvent }) {
  const spriteChar = event.sprite === 'shop-buddy' ? 'shop-buddy' : 'customers';
  const spritePose = event.sprite === 'shop-buddy' ? 'talking' : event.sprite;
  const { texture, aspect } = useCharacterSpriteTexture(spriteChar, spritePose);
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const height = 1.98;
  const width = height * aspect;

  useFrame((state) => {
    if (!groupRef.current) return;
    const bob = Math.sin(state.clock.elapsedTime * 3.8) * 0.025;
    groupRef.current.scale.set(1 - bob * 0.35, 1 + bob, 1);
  });

  const handleInteract = () => {
    const store = useShopStore.getState();
    const reply = resolveStaffReply(
      event.staffResponder,
      event.suggestedQuery,
      store.products,
    );
    store.setActiveDialogue({
      ...reply,
      message: event.staffReply,
    });
    store.dismissAmbientCustomer();
  };

  return (
    <group
      position={event.position}
      onClick={(e) => {
        e.stopPropagation();
        handleInteract();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} raycast={() => null}>
        <circleGeometry args={[hovered ? 0.64 : 0.48, 20]} />
        <meshBasicMaterial
          color={hovered ? '#fb7185' : '#09090b'}
          transparent
          opacity={hovered ? 0.72 : 0.35}
          depthWrite={false}
        />
      </mesh>

      <Billboard follow lockX lockZ>
        <group ref={groupRef}>
          <mesh position={[0, height / 2, 0]}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial
              key={texture.uuid}
              map={texture}
              alphaTest={0.5}
              depthWrite={true}
              color={hovered ? '#fef08a' : '#ffffff'}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      </Billboard>

      <Html center position={[0, height + 0.44, 0]} distanceFactor={14}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleInteract();
          }}
          className="max-w-[215px] cursor-pointer rounded-xl border-2 border-black bg-rose-100 px-2.5 py-1.5 text-left text-[10px] font-black leading-tight text-black shadow-[3px_3px_0px_#000] transition-transform hover:scale-105"
        >
          <span className="block text-[9px] uppercase text-red-700">
            {event.characterName} • Click to Roast
          </span>
          <span className="mt-0.5 block">&ldquo;{event.bubbleText}&rdquo;</span>
        </button>
      </Html>
    </group>
  );
}

function AmbientCustomerStandee() {
  const activeCustomer = useShopStore((s) => s.activeCustomer);

  useEffect(() => {
    if (!activeCustomer) return;
    const ms = Math.max(50, activeCustomer.expiresAt - Date.now());
    const timer = window.setTimeout(() => {
      useShopStore.getState().dismissAmbientCustomer();
    }, ms);
    return () => window.clearTimeout(timer);
  }, [activeCustomer]);

  if (!activeCustomer) return null;
  return <AmbientCustomerMesh key={activeCustomer.event.id} event={activeCustomer.event} />;
}

function StaffCharacterStandee({
  staffId,
  character,
  pose,
  position,
  height,
  label,
}: {
  staffId: StaffId;
  character: CharacterId;
  pose: string;
  position: [number, number, number];
  height: number;
  label: string;
}) {
  const bark = useShopStore((s) => s.overheadBarks[staffId]);
  const activeDialogue = useShopStore((s) => s.activeDialogue);
  const openDrawer = useShopStore((s) => s.openDrawer);
  const [hovered, setHovered] = useState(false);

  const reactivePose = (() => {
    const talkingToThisStaff = activeDialogue?.staffId === staffId;
    if (staffId === 'dick') {
      if (
        bark ||
        (talkingToThisStaff &&
          (activeDialogue.moodLabel === 'WTF?!' || activeDialogue.moodLabel === 'READ THE SIGN!'))
      ) {
        return 'get-out';
      }
      if (hovered || openDrawer === 'SERVICE_COUNTER' || talkingToThisStaff) {
        return 'clipboard';
      }
      return 'leaning';
    }
    if (staffId === 'scooter') {
      if (bark || (talkingToThisStaff && activeDialogue.moodLabel === 'OOPS...')) {
        return 'dropped-it';
      }
      if (hovered || openDrawer === 'PARTS' || talkingToThisStaff) {
        return 'parts-pitch';
      }
      return 'sweeping';
    }
    if (staffId === 'v') {
      if (hovered || talkingToThisStaff) return 'action';
      if (openDrawer === 'APPAREL') return 'three-quarter';
      return 'front';
    }
    return pose;
  })();

  const { texture, aspect } = useCharacterSpriteTexture(character, reactivePose);
  const groupRef = useRef<THREE.Group>(null);
  const spriteWidth = height * aspect;

  useFrame((state) => {
    if (!groupRef.current) return;
    const breathe = Math.sin(state.clock.elapsedTime * 3.1 + position[0]) * 0.02;
    groupRef.current.scale.set(1 - breathe * 0.4, 1 + breathe, 1);
  });

  useEffect(() => {
    if (!bark) return;
    const ms = Math.max(50, bark.expiresAt - Date.now());
    const timer = window.setTimeout(() => {
      useShopStore.getState().clearOverheadBark(staffId);
    }, ms);
    return () => window.clearTimeout(timer);
  }, [bark, staffId]);

  const handleChat = () => {
    const products = useShopStore.getState().products;
    useShopStore.getState().setActiveDialogue(getStaffGreeting(staffId, products));
  };

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        handleChat();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Floor shadow & hover ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} raycast={() => null}>
        <circleGeometry args={[hovered ? 0.68 : 0.52, 24]} />
        <meshBasicMaterial
          color={hovered ? '#fbbf24' : '#09090b'}
          transparent
          opacity={hovered ? 0.78 : 0.35}
          depthWrite={false}
        />
      </mesh>

      <Billboard follow lockX lockZ>
        <group ref={groupRef}>
          <mesh position={[0, height / 2, 0]}>
            <planeGeometry args={[spriteWidth, height]} />
            <meshBasicMaterial
              key={texture.uuid}
              map={texture}
              alphaTest={0.5}
              depthWrite={true}
              color={hovered ? '#fef08a' : '#ffffff'}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      </Billboard>

      {/* Overhead comic bark or hover nameplate */}
      {bark ? (
        <Html center position={[0, height + 0.42, 0]} distanceFactor={14}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleChat();
            }}
            className="max-w-[190px] cursor-pointer rounded-xl border-2 border-black bg-amber-50 px-2.5 py-1 text-center text-[11px] font-black leading-tight text-black shadow-[3px_3px_0px_#000]"
          >
            {bark.text}
          </button>
        </Html>
      ) : hovered ? (
        <Html center position={[0, height + 0.3, 0]} distanceFactor={14}>
          <span className="pointer-events-none whitespace-nowrap rounded-lg border-2 border-black bg-amber-300 px-2 py-0.5 text-[11px] font-black uppercase text-black shadow-[2px_2px_0px_#000]">
            Talk to {label}
          </span>
        </Html>
      ) : null}
    </group>
  );
}

function ApparelRack3D({
  position,
  label,
  onClick,
}: {
  position: [number, number, number];
  label: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const rackAsset = usePropSpriteTexture('prop-apparel-rack');
  const rackHeight = 2.18;
  const rackWidth = rackAsset ? rackHeight * rackAsset.aspect : 1.9;

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} raycast={() => null}>
        <circleGeometry args={[hovered ? 0.96 : 0.78, 24]} />
        <meshBasicMaterial
          color={hovered ? '#fbbf24' : '#09090b'}
          transparent
          opacity={hovered ? 0.55 : 0.28}
          depthWrite={false}
        />
      </mesh>

      {rackAsset ? (
        <mesh position={[0, rackHeight / 2, 0]} rotation={[0, 0.56, 0]}>
          <planeGeometry args={[rackWidth, rackHeight]} />
          <meshBasicMaterial
            key={rackAsset.texture.uuid}
            map={rackAsset.texture}
            alphaTest={0.5}
            depthWrite={true}
            color={hovered ? '#fef08a' : '#ffffff'}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : (
        <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 1.8, 0.5]} />
          <meshToonMaterial color={hovered ? '#fbbf24' : '#334155'} gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
      )}

      {hovered ? (
        <Html center position={[0, rackHeight + 0.18, 0]} distanceFactor={14}>
          <span className="pointer-events-none whitespace-nowrap rounded-lg border-2 border-black bg-amber-300 px-2 py-0.5 text-[11px] font-black uppercase text-black shadow-[2px_2px_0px_#000]">
            {label}
          </span>
        </Html>
      ) : null}
    </group>
  );
}

function LiveServiceBay3D({
  bay,
  position,
}: {
  bay: LiveBayOccupant;
  position: [number, number, number];
}) {
  const isoBikeAsset = useBikeSpriteTexture(`${bay.bikeSprite}-iso`);
  const fallbackBikeAsset = useBikeSpriteTexture(bay.bikeSprite);
  const bikeAsset = isoBikeAsset ?? fallbackBikeAsset;

  const techChar: CharacterId =
    bay.bayIndex === 1 ? 'bay-tech-a' : bay.bayIndex === 2 ? 'bay-tech-b' : 'bay-tech-c';
  const techPose =
    bay.activity === 'WRENCHING' || bay.activity === 'SPARKS' ? 'at-lift' : 'wrenching';

  const { texture: techTex, aspect: techAspect } = useCharacterSpriteTexture(techChar, techPose);
  const sparksVfx = useVfxSpriteTexture('sparks');
  const smokeVfx = useVfxSpriteTexture('smoke');
  const zapVfx = useVfxSpriteTexture('zap');

  const [hovered, setHovered] = useState(false);
  const sparksRef = useRef<THREE.Group>(null);
  const smokeRef = useRef<THREE.Group>(null);
  const zapRef = useRef<THREE.Group>(null);
  const techGroupRef = useRef<THREE.Group>(null);
  const liftDeckRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (liftDeckRef.current) {
      const targetLiftY =
        bay.activity === 'JOB_DONE' ? 0.34 : bay.activity === 'IDLE' ? 0 : 0.1;
      liftDeckRef.current.position.y = THREE.MathUtils.lerp(
        liftDeckRef.current.position.y,
        targetLiftY,
        Math.min(1, delta * 5),
      );
    }
    if (techGroupRef.current && bay.activity !== 'IDLE') {
      const bob = Math.sin(t * (bay.activity === 'SPARKS' ? 14 : 6) + bay.bayIndex) * 0.04;
      techGroupRef.current.scale.set(1 - bob * 0.4, 1 + bob, 1);
    }
    if (sparksRef.current && bay.activity === 'SPARKS') {
      sparksRef.current.rotation.z = Math.sin(t * 16 + bay.bayIndex) * 0.14;
      const pulse = 0.85 + Math.sin(t * 24) * 0.28;
      sparksRef.current.scale.setScalar(pulse);
    }
    if (smokeRef.current && bay.activity === 'CHAOS_SMOKE') {
      smokeRef.current.position.y = 1.95 + ((t * 0.75) % 0.75);
      const s = 0.85 + ((t * 0.75) % 0.75) * 0.55;
      smokeRef.current.scale.setScalar(s);
    }
    if (zapRef.current && bay.activity === 'BREAKER_BLOWN') {
      const flash = 0.85 + Math.abs(Math.sin(t * 22)) * 0.35;
      zapRef.current.scale.setScalar(flash);
      zapRef.current.visible = Math.sin(t * 32) > -0.6;
    }
  });

  const bikeH = 1.68;
  const bikeW = bikeAsset ? bikeH * bikeAsset.aspect : 2.15;
  const techH = 1.56;
  const techW = techH * techAspect;

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        useShopStore.getState().enterGameBay(bay.bayIndex);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Floor hazard highlight (lets painted bay floor markings show cleanly when idle) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} receiveShadow>
        <planeGeometry args={[3.2, 1.9]} />
        <meshBasicMaterial
          color={
            hovered
              ? '#facc15'
              : bay.activity === 'BREAKER_BLOWN'
                ? '#ef4444'
                : '#1c1917'
          }
          transparent
          opacity={hovered ? 0.3 : bay.activity === 'BREAKER_BLOWN' ? 0.25 : 0}
          depthWrite={false}
        />
      </mesh>

      {/* Hydraulic Base & Crossed Orange X-Scissor Lift Struts */}
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.35, 0.1, 0.96]} />
        <meshToonMaterial color="#334155" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      <mesh position={[0, 0.34, 0.24]} rotation={[0, 0, 0.36]} castShadow>
        <boxGeometry args={[1.45, 0.08, 0.1]} />
        <meshToonMaterial color="#c2410c" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      <mesh position={[0, 0.34, 0.24]} rotation={[0, 0, -0.36]} castShadow>
        <boxGeometry args={[1.45, 0.08, 0.1]} />
        <meshToonMaterial color="#c2410c" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      <mesh position={[0, 0.34, -0.24]} rotation={[0, 0, 0.36]} castShadow>
        <boxGeometry args={[1.45, 0.08, 0.1]} />
        <meshToonMaterial color="#9a3412" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      <mesh position={[0, 0.34, -0.24]} rotation={[0, 0, -0.36]} castShadow>
        <boxGeometry args={[1.45, 0.08, 0.1]} />
        <meshToonMaterial color="#9a3412" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>

      {/* Raising Hydraulic Deck + Steel Loading Ramp + Motorcycle Billboard */}
      <group ref={liftDeckRef}>
        <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.55, 0.12, 1.02]} />
          <meshToonMaterial
            color={hovered ? '#fbbf24' : '#78716c'}
            gradientMap={TOON_GRADIENT_MAP}
          />
          <Edges color="#111111" />
        </mesh>
        {/* Angled steel bike loading ramp */}
        <mesh position={[-1.56, 0.26, 0]} rotation={[0, 0, 0.42]} castShadow receiveShadow>
          <boxGeometry args={[0.72, 0.08, 0.9]} />
          <meshToonMaterial color="#64748b" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>

        {bikeAsset ? (
          <mesh position={[0, 0.44 + bikeH / 2, 0]} rotation={[0, 0.34, 0]}>
            <planeGeometry args={[bikeW, bikeH]} />
            <meshBasicMaterial
              key={bikeAsset.texture.uuid}
              map={bikeAsset.texture}
              alphaTest={0.5}
              depthWrite={true}
              side={THREE.DoubleSide}
            />
          </mesh>
        ) : null}
      </group>

      {/* Animated Unique Bay Tech beside lift (Sheet 05) */}
      {bay.activity !== 'IDLE' ? (
        <group position={[0.45, 0, 0.86]}>
          <Billboard follow lockX lockZ>
            <group ref={techGroupRef}>
              <mesh position={[0, techH / 2, 0]}>
                <planeGeometry args={[techW, techH]} />
                <meshBasicMaterial
                  key={techTex.uuid}
                  map={techTex}
                  alphaTest={0.5}
                  depthWrite={true}
                  color="#ffffff"
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          </Billboard>
        </group>
      ) : null}

      {/* Hand-Inked Bay VFX Billboards (Sheet 07) */}
      {bay.activity === 'SPARKS' ? (
        <Billboard follow lockX lockZ position={[0.22, 1.35, 0.25]}>
          <group ref={sparksRef}>
            {sparksVfx ? (
              <mesh>
                <planeGeometry args={[0.82 * sparksVfx.aspect, 0.82]} />
                <meshBasicMaterial
                  key={sparksVfx.texture.uuid}
                  map={sparksVfx.texture}
                  transparent
                  alphaTest={0.3}
                  depthWrite={false}
                />
              </mesh>
            ) : (
              [0, 1, 2, 3].map((i) => (
                <mesh key={i} rotation={[0, 0, (i * Math.PI) / 4]}>
                  <boxGeometry args={[0.46, 0.05, 0.05]} />
                  <meshBasicMaterial color="#facc15" />
                </mesh>
              ))
            )}
          </group>
        </Billboard>
      ) : null}

      {bay.activity === 'CHAOS_SMOKE' ? (
        <Billboard follow lockX lockZ position={[-0.2, 2.0, 0.12]}>
          <group ref={smokeRef}>
            {smokeVfx ? (
              <mesh>
                <planeGeometry args={[0.96 * smokeVfx.aspect, 0.96]} />
                <meshBasicMaterial
                  key={smokeVfx.texture.uuid}
                  map={smokeVfx.texture}
                  transparent
                  alphaTest={0.25}
                  depthWrite={false}
                />
              </mesh>
            ) : (
              <>
                <mesh position={[0, 0, 0]}>
                  <sphereGeometry args={[0.24, 10, 10]} />
                  <meshBasicMaterial color="#cbd5e1" transparent opacity={0.85} />
                </mesh>
                <mesh position={[0.22, 0.18, 0.05]}>
                  <sphereGeometry args={[0.19, 10, 10]} />
                  <meshBasicMaterial color="#94a3b8" transparent opacity={0.8} />
                </mesh>
              </>
            )}
          </group>
        </Billboard>
      ) : null}

      {bay.activity === 'BREAKER_BLOWN' && zapVfx ? (
        <Billboard follow lockX lockZ position={[0.45, 2.08, 0.52]}>
          <group ref={zapRef}>
            <mesh>
              <planeGeometry args={[0.9 * zapVfx.aspect, 0.9]} />
              <meshBasicMaterial
                key={zapVfx.texture.uuid}
                map={zapVfx.texture}
                transparent
                alphaTest={0.3}
                depthWrite={false}
              />
            </mesh>
          </group>
        </Billboard>
      ) : null}

      {/* Floating Bay Status Badge */}
      <Html center position={[0, 2.32, 0]} distanceFactor={11.5}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            useShopStore.getState().enterGameBay(bay.bayIndex);
          }}
          className={`flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase shadow-[2px_2px_0px_#000] transition-transform hover:scale-105 ${
            bay.isRealPlayer
              ? 'bg-emerald-300 text-black'
              : bay.activity === 'IDLE' || bay.bayIndex === 3
                ? 'bg-amber-300 text-black'
                : 'bg-zinc-900 text-white'
          }`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              bay.activity === 'IDLE'
                ? 'bg-amber-600'
                : bay.activity === 'BREAKER_BLOWN'
                  ? 'animate-ping bg-red-500'
                  : 'bg-emerald-400'
            }`}
          />
          <span>
            {bay.isRealPlayer
              ? `LIVE: ${bay.playerName}`
              : bay.activity === 'IDLE' || bay.bayIndex === 3
                ? `BAY ${bay.bayIndex} • PLAY`
                : `BAY ${bay.bayIndex} • ${
                    bay.bayIndex === 1
                      ? 'DALE'
                      : bay.bayIndex === 2
                        ? 'JOHNNY'
                        : bay.playerName.replace('NPC: ', '')
                  }`}
          </span>
        </button>
      </Html>
    </group>
  );
}

function WallSignPlaque({
  texture,
  position,
  rotationY = 0,
  width,
  height,
}: {
  texture: THREE.Texture | null;
  position: [number, number, number];
  rotationY?: number;
  width: number;
  height: number;
}) {
  if (!texture) return null;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow>
        <boxGeometry args={[width + 0.04, height + 0.04, 0.06]} />
        <meshToonMaterial color="#1c1917" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      <mesh position={[0, 0, 0.036]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          map={texture}
          transparent
          alphaTest={0.35}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>
    </group>
  );
}

export function DealershipScene() {
  const isTouch = useCoarsePointer();
  const liveBays = useShopStore((s) => s.liveBays);
  const [hatZoneHovered, setHatZoneHovered] = useState(false);
  const [partsZoneHovered, setPartsZoneHovered] = useState(false);
  const [counterHovered, setCounterHovered] = useState(false);

  const hangingLogoAsset = usePropSpriteTexture('prop-hanging-logo');
  const hatPegAsset = usePropSpriteTexture('prop-hat-pegboard');
  const stickerTableAsset = usePropSpriteTexture('prop-sticker-table');
  const counterAsset = usePropSpriteTexture('prop-service-counter');
  const frontDoorAsset = usePropSpriteTexture('prop-front-door');
  const breakerBoxAsset = usePropSpriteTexture('prop-breaker-box');
  const rollupDoorAsset = usePropSpriteTexture('prop-rollup-door');
  const partsShelfAsset = usePropSpriteTexture('prop-parts-shelf');
  const backPartsRackAsset = usePropSpriteTexture('prop-back-parts-rack');
  const toolChestAsset = usePropSpriteTexture('prop-tool-chest');
  const tireStackAsset = usePropSpriteTexture('prop-tire-stack');
  const oilDrumAsset = usePropSpriteTexture('prop-oil-drum-cone');

  const signNoRefundsTex = useShopBackgroundTexture('/sprites/props/signs/sign-no-refunds.png');
  const signCashOnlyTex = useShopBackgroundTexture('/sprites/props/signs/sign-cash-only.png');
  const signLaborRateTex = useShopBackgroundTexture('/sprites/props/signs/sign-labor-rate.png');
  const signSafety3rdTex = useShopBackgroundTexture('/sprites/props/signs/sign-safety-3rd.png');
  const signOilLeaksTex = useShopBackgroundTexture('/sprites/props/signs/sign-oil-leaks.png');

  const shopFloorTex = useMemo(() => getShopFloorTexture(), []);
  const wallLeftTex = useMemo(() => getGarageWallTexture('left'), []);
  const wallBackTex = useMemo(() => getGarageWallTexture('back'), []);

  const welcomeMatTex = useMemo(
    () =>
      getComicSignPlaqueTexture(
        'welcome-mat',
        ['WIPE YER BOOTS', '18+ ONLY'],
        undefined,
        '#78350f',
        '#fef3c7',
      ),
    [],
  );

  const openApparel = (filter: 'ALL' | 'rack_1_humor' | 'rack_2_definition' | 'wall_braap') => {
    useShopStore.getState().setOpenDrawer('APPAREL', filter);
  };

  const resetFloorOverview = () => {
    const store = useShopStore.getState();
    if (store.activeDialogue) {
      store.setActiveDialogue(null);
    } else if (store.cameraFocus !== 'OVERVIEW') {
      store.setCameraFocus('OVERVIEW');
    }
  };

  return (
    <>
      <color attach="background" args={['#1a2026']} />
      <DealershipCameraRig />

      {/* Warm tungsten comic-garage lighting */}
      <ambientLight intensity={0.92} color="#fff7ed" />
      <directionalLight
        position={[7, 12, 8]}
        intensity={1.95}
        color="#fff7ed"
        castShadow
        shadow-mapSize={isTouch ? [1024, 1024] : [2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={32}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.0005}
      />
      <pointLight position={[-5.2, 3.3, -1.6]} intensity={1.7} distance={11} color="#fde68a" />
      <pointLight position={[-0.5, 3.3, -3.0]} intensity={1.8} distance={11} color="#fde68a" />
      <pointLight position={[4.95, 3.4, 0.35]} intensity={1.9} distance={12} color="#fef3c7" />

      {/* Base Cutaway Slab (16.8 x 11.6) + Hi-Res Split Wood-to-Concrete Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          resetFloorOverview();
        }}
      >
        <boxGeometry args={[16.8, 11.6, 0.24]} />
        <meshToonMaterial color="#57534e" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      {shopFloorTex ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.126, 0]} raycast={() => null}>
          <planeGeometry args={[16.72, 11.52]} />
          <meshBasicMaterial
            map={shopFloorTex}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
      ) : null}

      {/* Cutaway Left Wall (x = -8.3) — Plaster + Olive Wainscoting */}
      <mesh
        position={[-8.3, 2.15, 0]}
        receiveShadow
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          resetFloorOverview();
        }}
      >
        <boxGeometry args={[0.28, 4.3, 11.6]} />
        <meshToonMaterial color="#6e7463" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      <mesh position={[-8.3, 4.34, 0]} castShadow raycast={() => null}>
        <boxGeometry args={[0.38, 0.14, 11.72]} />
        <meshToonMaterial color="#262729" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      {wallLeftTex ? (
        <mesh position={[-8.14, 2.15, 0]} rotation={[0, Math.PI / 2, 0]} raycast={() => null}>
          <planeGeometry args={[11.5, 4.22]} />
          <meshBasicMaterial
            map={wallLeftTex}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
      ) : null}

      {/* Cutaway Back Wall (z = -5.7) — Plaster + Olive Wainscoting */}
      <mesh
        position={[0, 2.15, -5.7]}
        receiveShadow
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          resetFloorOverview();
        }}
      >
        <boxGeometry args={[16.8, 4.3, 0.28]} />
        <meshToonMaterial color="#6e7463" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      <mesh position={[0, 4.34, -5.7]} castShadow raycast={() => null}>
        <boxGeometry args={[16.92, 0.14, 0.38]} />
        <meshToonMaterial color="#262729" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      {wallBackTex ? (
        <mesh position={[0, 2.15, -5.54]} raycast={() => null}>
          <planeGeometry args={[16.7, 4.22]} />
          <meshBasicMaterial
            map={wallBackTex}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
      ) : null}

      {/* Hand-Inked Corrugated Roll-Up Service Bay Door (Sheet 08, Flush Stationary on Back Wall) */}
      <group position={[5.25, 1.92, -5.46]}>
        {rollupDoorAsset ? (
          <mesh>
            <planeGeometry args={[3.32 * rollupDoorAsset.aspect, 3.32]} />
            <meshBasicMaterial
              key={rollupDoorAsset.texture.uuid}
              map={rollupDoorAsset.texture}
              alphaTest={0.45}
              depthWrite={true}
              side={THREE.DoubleSide}
            />
          </mesh>
        ) : (
          <mesh receiveShadow>
            <boxGeometry args={[3.85, 3.45, 0.12]} />
            <meshToonMaterial color="#334155" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
        )}
      </group>

      {/* Flush Wall Perimeter Timber Beams (Unobstructed View — Zero Mid-Air Crossbeams) */}
      <mesh position={[0, 4.18, -5.46]} castShadow raycast={() => null}>
        <boxGeometry args={[16.6, 0.18, 0.2]} />
        <meshToonMaterial color="#4e3422" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      <mesh position={[-8.06, 4.18, 0]} castShadow raycast={() => null}>
        <boxGeometry args={[0.2, 0.18, 11.4]} />
        <meshToonMaterial color="#4e3422" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>

      {/* Wall-Mounted Warm Edison Bulbs (Clear of Staff Line-of-Sight) */}
      {(
        [
          [-7.92, 3.85, -1.75],
          [-7.92, 3.85, 1.65],
          [-0.5, 3.88, -5.32],
          [5.15, 3.88, -5.32],
        ] as [number, number, number][]
      ).map(([lx, ly, lz], i) => (
        <group key={`bulb-${i}`} position={[lx, ly, lz]} raycast={() => null}>
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.28, 6]} />
            <meshBasicMaterial color="#111111" />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.055, 0.075, 0.09, 8]} />
            <meshToonMaterial color="#27272a" gradientMap={TOON_GRADIENT_MAP} />
          </mesh>
          <mesh position={[0, -0.08, 0]}>
            <sphereGeometry args={[0.1, 10, 10]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
        </group>
      ))}

      {/* ================= ZONE 1: STATIONARY FRONT ENTRY DOOR (BOTTOM-LEFT) ================= */}
      <group
        position={[-5.6, 0.12, 5.25]}
        onClick={(e) => {
          e.stopPropagation();
          useShopStore
            .getState()
            .pushOverheadBark(
              'dick',
              "Door's open, boots wiped — go buy something!",
              4200,
            );
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        {frontDoorAsset ? (
          <mesh position={[0, 2.32 / 2, 0]} rotation={[0, 0.28, 0]}>
            <planeGeometry args={[2.32 * frontDoorAsset.aspect, 2.32]} />
            <meshBasicMaterial
              key={frontDoorAsset.texture.uuid}
              map={frontDoorAsset.texture}
              alphaTest={0.45}
              depthWrite={true}
              side={THREE.DoubleSide}
            />
          </mesh>
        ) : (
          <mesh position={[0, 1.0, 0]} castShadow>
            <boxGeometry args={[2.1, 2.0, 0.14]} />
            <meshToonMaterial color="#334155" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
        )}
        {welcomeMatTex ? (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, -0.58]}>
            <planeGeometry args={[1.65, 0.85]} />
            <meshBasicMaterial map={welcomeMatTex} polygonOffset polygonOffsetFactor={-1} />
          </mesh>
        ) : null}
      </group>

      {/* ================= ZONE 2: STATIONARY APPAREL RACKS & V (LEFT / BACK-LEFT) ================= */}
      <ApparelRack3D
        position={[-6.8, 0.12, -1.75]}
        label="Shop Humor Rack (6)"
        onClick={() => openApparel('rack_1_humor')}
      />
      <ApparelRack3D
        position={[-6.8, 0.12, 1.65]}
        label="Definition Rack (10)"
        onClick={() => openApparel('rack_2_definition')}
      />

      {/* Stationary Hand-Inked Hat Pegboard Wall + Talkin Braap Sticker Table (Sheet 06) */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          openApparel('wall_braap');
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHatZoneHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHatZoneHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <group position={[-7.15, 2.45, -4.45]}>
          {hatPegAsset ? (
            <mesh rotation={[0, 0.62, 0]}>
              <planeGeometry args={[1.68 * hatPegAsset.aspect, 1.68]} />
              <meshBasicMaterial
                key={hatPegAsset.texture.uuid}
                map={hatPegAsset.texture}
                alphaTest={0.5}
                depthWrite={true}
                color={hatZoneHovered ? '#fef08a' : '#ffffff'}
                side={THREE.DoubleSide}
              />
            </mesh>
          ) : (
            <mesh castShadow>
              <boxGeometry args={[1.6, 1.35, 0.08]} />
              <meshToonMaterial color="#6b4f32" gradientMap={TOON_GRADIENT_MAP} />
              <Edges color="#111111" />
            </mesh>
          )}
        </group>

        <group position={[-6.15, 0.12, -4.15]}>
          {stickerTableAsset ? (
            <mesh position={[0, 1.12 / 2, 0]} rotation={[0, 0.56, 0]}>
              <planeGeometry args={[1.12 * stickerTableAsset.aspect, 1.12]} />
              <meshBasicMaterial
                key={stickerTableAsset.texture.uuid}
                map={stickerTableAsset.texture}
                alphaTest={0.5}
                depthWrite={true}
                color={hatZoneHovered ? '#fef08a' : '#ffffff'}
                side={THREE.DoubleSide}
              />
            </mesh>
          ) : (
            <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.5, 0.85, 0.75]} />
              <meshToonMaterial color="#785a3c" gradientMap={TOON_GRADIENT_MAP} />
              <Edges color="#111111" />
            </mesh>
          )}
          {hatZoneHovered ? (
            <Html center position={[0, 1.48, 0]} distanceFactor={13}>
              <span className="pointer-events-none whitespace-nowrap rounded-lg border-2 border-black bg-amber-300 px-2 py-0.5 text-[11px] font-black uppercase text-black shadow-[2px_2px_0px_#000]">
                Hats &amp; Sticker Table
              </span>
            </Html>
          ) : null}
        </group>
      </group>

      {/* V (Locked Indo-Trinidadian Master Character) */}
      <StaffCharacterStandee
        staffId="v"
        character="v"
        pose="front"
        position={[-4.65, 0.12, -0.55]}
        height={2.02}
        label="V"
      />

      {/* ================= ZONE 3: STATIONARY PARTS SHELVING, TOOL CHEST, TIRES & SCOOTER ================= */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          useShopStore.getState().setOpenDrawer('PARTS');
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setPartsZoneHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setPartsZoneHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <group position={[-2.8, 0.12, 2.55]}>
          {partsShelfAsset ? (
            <mesh position={[0, 2.18 / 2, 0]} rotation={[0, 0.54, 0]}>
              <planeGeometry args={[2.18 * partsShelfAsset.aspect, 2.18]} />
              <meshBasicMaterial
                key={partsShelfAsset.texture.uuid}
                map={partsShelfAsset.texture}
                alphaTest={0.5}
                depthWrite={true}
                color={partsZoneHovered ? '#fef08a' : '#ffffff'}
                side={THREE.DoubleSide}
              />
            </mesh>
          ) : (
            <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.64, 1.9, 0.62]} />
              <meshToonMaterial color="#475569" gradientMap={TOON_GRADIENT_MAP} />
              <Edges color="#111111" />
            </mesh>
          )}
          {partsZoneHovered ? (
            <Html center position={[0, 2.42, 0]} distanceFactor={13}>
              <span className="pointer-events-none whitespace-nowrap rounded-lg border-2 border-black bg-amber-300 px-2 py-0.5 text-[11px] font-black uppercase text-black shadow-[2px_2px_0px_#000]">
                Parts &amp; Oil Rack
              </span>
            </Html>
          ) : null}
        </group>

        <group position={[-4.45, 0.12, 2.95]}>
          {toolChestAsset ? (
            <mesh position={[0, 1.38 / 2, 0]} rotation={[0, 0.52, 0]}>
              <planeGeometry args={[1.38 * toolChestAsset.aspect, 1.38]} />
              <meshBasicMaterial
                key={toolChestAsset.texture.uuid}
                map={toolChestAsset.texture}
                alphaTest={0.5}
                depthWrite={true}
                color={partsZoneHovered ? '#fef08a' : '#ffffff'}
                side={THREE.DoubleSide}
              />
            </mesh>
          ) : (
            <mesh position={[0, 0.56, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.92, 1.1, 0.58]} />
              <meshToonMaterial color="#c82828" gradientMap={TOON_GRADIENT_MAP} />
              <Edges color="#111111" />
            </mesh>
          )}
        </group>

        <group position={[-1.05, 0.12, 3.05]}>
          {tireStackAsset ? (
            <mesh position={[0, 1.12 / 2, 0]} rotation={[0, 0.45, 0]}>
              <planeGeometry args={[1.12 * tireStackAsset.aspect, 1.12]} />
              <meshBasicMaterial
                key={tireStackAsset.texture.uuid}
                map={tireStackAsset.texture}
                alphaTest={0.5}
                depthWrite={true}
                color={partsZoneHovered ? '#fef08a' : '#ffffff'}
                side={THREE.DoubleSide}
              />
            </mesh>
          ) : (
            <mesh position={[0, 0.45, 0]} castShadow>
              <cylinderGeometry args={[0.38, 0.38, 0.8, 12]} />
              <meshToonMaterial color="#18181b" gradientMap={TOON_GRADIENT_MAP} />
            </mesh>
          )}
        </group>
      </group>

      {/* Scooter (Apprentice — Reactive Sheet 04 Sprites) */}
      <StaffCharacterStandee
        staffId="scooter"
        character="scooter"
        pose="sweeping"
        position={[-1.7, 0.12, 0.65]}
        height={1.88}
        label="Scooter"
      />

      {/* ================= ZONE 4: BACK PARTS RACK, STATIONARY COUNTER, POSTER & DICK ================= */}
      {/* Hand-Inked Back Wall Parts Pegboard Cabinet Behind Counter Left (Sheet 08) */}
      <group
        position={[-3.15, 1.25, -5.46]}
        onClick={(e) => {
          e.stopPropagation();
          useShopStore.getState().setOpenDrawer('PARTS');
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setPartsZoneHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setPartsZoneHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        {backPartsRackAsset ? (
          <mesh>
            <planeGeometry args={[2.25 * backPartsRackAsset.aspect, 2.25]} />
            <meshBasicMaterial
              key={backPartsRackAsset.texture.uuid}
              map={backPartsRackAsset.texture}
              alphaTest={0.45}
              depthWrite={true}
              color={partsZoneHovered ? '#fef08a' : '#ffffff'}
              side={THREE.DoubleSide}
            />
          </mesh>
        ) : (
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.72, 2.26, 0.2]} />
            <meshToonMaterial color="#475569" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
        )}
      </group>

      {/* Stationary Hand-Inked Diamond-Plate Service Counter + Cash Register (Sheet 06) */}
      <group
        position={[-0.5, 0.12, -2.95]}
        onClick={(e) => {
          e.stopPropagation();
          useShopStore.getState().setOpenDrawer('SERVICE_COUNTER');
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setCounterHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setCounterHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        {counterAsset ? (
          <mesh position={[0, 2.05 / 2, 0]} rotation={[0, 0.22, 0]} scale={[-1, 1, 1]}>
            <planeGeometry args={[2.05 * counterAsset.aspect, 2.05]} />
            <meshBasicMaterial
              key={counterAsset.texture.uuid}
              map={counterAsset.texture}
              alphaTest={0.5}
              depthWrite={true}
              color={counterHovered ? '#fef08a' : '#ffffff'}
              side={THREE.DoubleSide}
            />
          </mesh>
        ) : (
          <mesh position={[0, 0.56, 0]} castShadow receiveShadow>
            <boxGeometry args={[3.1, 1.1, 0.88]} />
            <meshToonMaterial color="#7b8288" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
        )}
        {counterHovered ? (
          <Html center position={[0, 2.25, 0]} distanceFactor={13}>
            <span className="pointer-events-none whitespace-nowrap rounded-lg border-2 border-black bg-amber-300 px-2 py-0.5 text-[11px] font-black uppercase text-black shadow-[2px_2px_0px_#000]">
              Service Counter &amp; Policies
            </span>
          </Html>
        ) : null}
      </group>

      {/* HERO HARD R CYCLES HANGING CHAIN SIGN (Sheet 06 — High Clear Above Counter & Wall Signs) */}
      <group position={[-0.5, 3.68, -4.92]}>
        {hangingLogoAsset ? (
          <mesh>
            <planeGeometry args={[1.52 * hangingLogoAsset.aspect, 1.52]} />
            <meshBasicMaterial
              key={hangingLogoAsset.texture.uuid}
              map={hangingLogoAsset.texture}
              alphaTest={0.45}
              depthWrite={true}
              side={THREE.DoubleSide}
            />
          </mesh>
        ) : (
          <mesh castShadow>
            <boxGeometry args={[2.2, 1.1, 0.12]} />
            <meshToonMaterial color="#18181b" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
        )}
      </group>

      {/* Non-Overlapping Back & Left Wall Hand-Inked Signs (Sheet 06) */}
      <WallSignPlaque
        texture={signNoRefundsTex}
        position={[-3.15, 3.45, -5.48]}
        width={1.12}
        height={0.7}
      />
      <WallSignPlaque
        texture={signCashOnlyTex}
        position={[0.72, 2.98, -5.48]}
        width={0.84}
        height={0.54}
      />
      <WallSignPlaque
        texture={signLaborRateTex}
        position={[0.72, 2.25, -5.48]}
        width={1.24}
        height={0.56}
      />
      <WallSignPlaque
        texture={signSafety3rdTex}
        position={[-8.1, 3.15, -0.35]}
        rotationY={Math.PI / 2}
        width={0.92}
        height={0.8}
      />
      <WallSignPlaque
        texture={signOilLeaksTex}
        position={[-8.1, 3.15, 1.55]}
        rotationY={Math.PI / 2}
        width={1.04}
        height={0.8}
      />

      {/* Dynamic Flat Rate Master SaaS Wall Poster (www.flatratemaster.com) */}
      <FlatRateMasterPoster position={[2.45, 2.48, -5.46]} />

      {/* Dick behind Service Counter on Anti-Fatigue Mat (Reactive Sheet 03 Sprites) */}
      <StaffCharacterStandee
        staffId="dick"
        character="dick"
        pose="leaning"
        position={[-0.5, 0.12, -4.25]}
        height={2.05}
        label="Dick"
      />

      {/* ================= ZONE 5: 3 SPACIOUS SERVICE BAYS (RIGHT HALF) ================= */}
      <LiveServiceBay3D bay={liveBays[0]} position={[4.95, 0.12, -3.15]} />
      <LiveServiceBay3D bay={liveBays[1]} position={[4.95, 0.12, 0.35]} />
      <LiveServiceBay3D bay={liveBays[2]} position={[4.95, 0.12, 3.85]} />

      {/* Stationary Hand-Inked Breaker Panel (Sheet 06 — Clear Right of Roll-Up Door) */}
      <group
        position={[7.55, 2.05, -5.25]}
        onClick={(e) => {
          e.stopPropagation();
          useShopStore
            .getState()
            .pushOverheadBark(
              'dick',
              'Hands off the main 200A panel unless you clocked in!',
              4500,
            );
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        {breakerBoxAsset ? (
          <mesh rotation={[0, 0.24, 0]}>
            <planeGeometry args={[1.48 * breakerBoxAsset.aspect, 1.48]} />
            <meshBasicMaterial
              key={breakerBoxAsset.texture.uuid}
              map={breakerBoxAsset.texture}
              alphaTest={0.45}
              depthWrite={true}
              side={THREE.DoubleSide}
            />
          </mesh>
        ) : (
          <mesh castShadow>
            <boxGeometry args={[0.72, 1.05, 0.18]} />
            <meshToonMaterial color="#475569" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
        )}
      </group>

      {/* Stationary Hand-Inked Aisle Waste Oil Drum & Safety Cone (Sheet 08) */}
      <group position={[0.95, 0.12, 4.45]}>
        {oilDrumAsset ? (
          <mesh position={[0, 1.22 / 2, 0]} rotation={[0, 0.45, 0]}>
            <planeGeometry args={[1.22 * oilDrumAsset.aspect, 1.22]} />
            <meshBasicMaterial
              key={oilDrumAsset.texture.uuid}
              map={oilDrumAsset.texture}
              alphaTest={0.45}
              depthWrite={true}
              side={THREE.DoubleSide}
            />
          </mesh>
        ) : (
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.32, 0.32, 0.9, 14]} />
            <meshToonMaterial color="#b91c1c" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
        )}
      </group>

      {/* Visiting Ambient Customer Chaos Standee */}
      <AmbientCustomerStandee />
    </>
  );
}
