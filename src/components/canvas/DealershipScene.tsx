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
import { useCoarsePointer } from '@/utils/useCoarsePointer';
import { SafeHtml as Html } from './SafeHtml';
import {
  getComicSignPlaqueTexture,
  getGarageWallTexture,
  getHangingTeeTexture,
  getHatPegboardTexture,
  getPartsPegboardTexture,
  getRollupBayDoorTexture,
  getShopFloorTexture,
  getToolChestFrontTexture,
  getWeatheredCounterTexture,
} from '@/utils/dealershipTextures';
import { TOON_GRADIENT_MAP, useBikeSpriteTexture, useCharacterSpriteTexture, useShopBackgroundTexture } from './ToonMaterial';

const CAMERA_PRESETS: Record<
  CameraFocusZone,
  { pos: [number, number, number]; look: [number, number, number] }
> = {
  OVERVIEW: { pos: [7.4, 9.2, 10.6], look: [-0.2, 0.8, 0.1] },
  APPAREL: { pos: [-0.2, 5.2, 5.4], look: [-4.2, 1.3, -1.2] },
  PARTS: { pos: [1.6, 4.9, 6.8], look: [-2.2, 1.0, 1.4] },
  SERVICE: { pos: [3.2, 4.9, 3.8], look: [-0.6, 1.5, -3.1] },
  BAYS: { pos: [7.4, 6.2, 6.8], look: [2.8, 1.1, 0.4] },
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

    // Pull back gracefully on narrow portrait phones so the whole cutaway fits
    const portraitBoost = aspect < 0.9 ? THREE.MathUtils.clamp((0.95 - aspect) * 1.15, 0, 0.52) : 0;
    const targetFov = focus === 'OVERVIEW' ? (aspect < 0.9 ? 42 : 34) : 36;

    const baseX = preset.pos[0] * (1 + portraitBoost * 0.48);
    const baseY = preset.pos[1] * (1 + portraitBoost * 0.42);
    const baseZ = preset.pos[2] * (1 + portraitBoost * 0.56);

    const lx = preset.look[0];
    const ly = preset.look[1];
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
    const ty = Math.max(2.6, ly + dy);
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

      <Billboard follow>
        <group ref={groupRef}>
          <mesh position={[0, height / 2, 0]}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial
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
  character: 'v' | 'mechanic' | 'service-writer';
  pose: string;
  position: [number, number, number];
  height: number;
  label: string;
}) {
  const { texture, aspect } = useCharacterSpriteTexture(character, pose);
  const bark = useShopStore((s) => s.overheadBarks[staffId]);
  const [hovered, setHovered] = useState(false);
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

      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <group ref={groupRef}>
          <mesh position={[0, height / 2, 0]}>
            <planeGeometry args={[spriteWidth, height]} />
            <meshBasicMaterial
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
  rotationY = 0,
  label,
  shirtSpecs,
  onClick,
}: {
  position: [number, number, number];
  rotationY?: number;
  label: string;
  shirtSpecs: { color: string; motif: 'skull' | 'wrench' | 'stencil' | 'braap' }[];
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
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
      {/* Metal pipe base & posts */}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.1, 0.08, 0.65]} />
        <meshToonMaterial color={hovered ? '#fbbf24' : '#334155'} gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      <mesh position={[-0.95, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 1.6, 8]} />
        <meshToonMaterial color="#475569" gradientMap={TOON_GRADIENT_MAP} />
      </mesh>
      <mesh position={[0.95, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 1.6, 8]} />
        <meshToonMaterial color="#475569" gradientMap={TOON_GRADIENT_MAP} />
      </mesh>
      <mesh position={[0, 1.62, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 2.0, 8]} />
        <meshToonMaterial color="#64748b" gradientMap={TOON_GRADIENT_MAP} />
      </mesh>

      {/* Hanging hand-inked graphic tees */}
      {shirtSpecs.map((spec, idx) => {
        const x = -0.68 + idx * 0.27;
        const teeTex = getHangingTeeTexture(spec.color, spec.motif);
        return (
          <group key={`${spec.color}-${spec.motif}-${idx}`} position={[x, 1.15, 0]}>
            <mesh position={[0, 0.42, 0]}>
              <cylinderGeometry args={[0.014, 0.014, 0.14, 6]} />
              <meshBasicMaterial color="#111111" />
            </mesh>
            <mesh castShadow>
              <boxGeometry args={[0.1, 0.72, 0.5]} />
              {teeTex ? (
                <meshBasicMaterial map={teeTex} />
              ) : (
                <meshToonMaterial color={spec.color} gradientMap={TOON_GRADIENT_MAP} />
              )}
              <Edges color="#111111" />
            </mesh>
          </group>
        );
      })}

      {hovered ? (
        <Html center position={[0, 2.05, 0]} distanceFactor={14}>
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
  const bikeAsset = useBikeSpriteTexture(bay.bikeSprite);
  const techPose =
    bay.activity === 'JOB_DONE'
      ? 'celebrate'
      : bay.activity === 'BREAKER_BLOWN'
        ? 'electrocuted'
        : bay.activity === 'CHAOS_SMOKE'
          ? 'panicked'
          : bay.activity === 'IDLE'
            ? 'idle'
            : 'wrenching';

  const { texture: techTex, aspect: techAspect } = useCharacterSpriteTexture('mechanic', techPose);
  const [hovered, setHovered] = useState(false);
  const sparksRef = useRef<THREE.Group>(null);
  const smokeRef = useRef<THREE.Group>(null);
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
      sparksRef.current.rotation.z = t * 8;
      const pulse = 0.8 + Math.sin(t * 24) * 0.3;
      sparksRef.current.scale.setScalar(pulse);
    }
    if (smokeRef.current && bay.activity === 'CHAOS_SMOKE') {
      smokeRef.current.position.y = 2.0 + ((t * 0.8) % 0.8);
      const s = 0.85 + ((t * 0.8) % 0.8) * 0.5;
      smokeRef.current.scale.setScalar(s);
    }
  });

  const bikeH = 1.48;
  const bikeW = bikeAsset ? bikeH * bikeAsset.aspect : 2.35;
  const techH = 1.72;
  const techW = techH * techAspect;
  const techTint = bay.bayIndex === 2 ? '#e2e8f0' : bay.bayIndex === 3 ? '#fed7aa' : '#ffffff';

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
      {/* Yellow hazard bay outline on floor */}
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
          opacity={hovered ? 0.35 : 0.16}
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
          <Billboard follow={false} position={[0, 0.5 + bikeH / 2, 0]}>
            <mesh rotation={[0, -0.25, 0]}>
              <planeGeometry args={[bikeW, bikeH]} />
              <meshBasicMaterial
                map={bikeAsset.texture}
                alphaTest={0.5}
                depthWrite={true}
                side={THREE.DoubleSide}
              />
            </mesh>
          </Billboard>
        ) : null}
      </group>

      {/* Animated Bay Tech beside lift */}
      {bay.activity !== 'IDLE' ? (
        <group position={[0.45, 0, 0.86]}>
          <Billboard follow>
            <group ref={techGroupRef}>
              <mesh position={[0, techH / 2, 0]}>
                <planeGeometry args={[techW, techH]} />
                <meshBasicMaterial
                  map={techTex}
                  alphaTest={0.5}
                  depthWrite={true}
                  color={techTint}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          </Billboard>
        </group>
      ) : null}

      {/* Sparks VFX */}
      {bay.activity === 'SPARKS' ? (
        <group ref={sparksRef} position={[0.25, 1.25, 0.22]}>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} rotation={[0, 0, (i * Math.PI) / 4]}>
              <boxGeometry args={[0.46, 0.05, 0.05]} />
              <meshBasicMaterial color="#facc15" />
            </mesh>
          ))}
        </group>
      ) : null}

      {/* Chaos Smoke VFX */}
      {bay.activity === 'CHAOS_SMOKE' ? (
        <group ref={smokeRef} position={[-0.2, 2.0, 0.1]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.24, 10, 10]} />
            <meshBasicMaterial color="#cbd5e1" transparent opacity={0.85} />
          </mesh>
          <mesh position={[0.22, 0.18, 0.05]}>
            <sphereGeometry args={[0.19, 10, 10]} />
            <meshBasicMaterial color="#94a3b8" transparent opacity={0.8} />
          </mesh>
        </group>
      ) : null}

      {/* Floating Bay Status Badge */}
      <Html center position={[0, 2.55, 0]} distanceFactor={14}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            useShopStore.getState().enterGameBay(bay.bayIndex);
          }}
          className={`flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase shadow-[2px_2px_0px_#000] transition-transform hover:scale-105 ${
            bay.isRealPlayer
              ? 'bg-emerald-300 text-black'
              : bay.activity === 'IDLE'
                ? 'bg-amber-300 text-black'
                : 'bg-zinc-900 text-white'
          }`}
        >
          <span
            className={`inline-block h-2 w-2 rounded-full ${
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
              : bay.activity === 'IDLE'
                ? `BAY ${bay.bayIndex} • PLAY`
                : `BAY ${bay.bayIndex} • ${bay.playerName}`}
          </span>
        </button>
      </Html>
    </group>
  );
}

export function DealershipScene() {
  const isTouch = useCoarsePointer();
  const liveBays = useShopStore((s) => s.liveBays);
  const logoTex = useShopBackgroundTexture('/brand/hard-r-cycles-logo.png');
  const breakerTex = useShopBackgroundTexture('/sprites/props/breaker-box.png');

  const shopFloorTex = useMemo(() => getShopFloorTexture(), []);
  const wallLeftTex = useMemo(() => getGarageWallTexture('left'), []);
  const wallBackTex = useMemo(() => getGarageWallTexture('back'), []);
  const counterFrontTex = useMemo(() => getWeatheredCounterTexture(), []);
  const partsPegTex = useMemo(() => getPartsPegboardTexture(), []);
  const hatPegTex = useMemo(() => getHatPegboardTexture(), []);
  const rollupDoorTex = useMemo(() => getRollupBayDoorTexture(), []);
  const toolChestTex = useMemo(() => getToolChestFrontTexture(), []);

  const signNoRefunds = useMemo(
    () => getComicSignPlaqueTexture('no-refunds', ['NO REFUNDS', 'SERIOUSLY.']),
    [],
  );
  const signCashOnly = useMemo(
    () => getComicSignPlaqueTexture('cash-only', ['CASH ONLY', 'OR STRIPE']),
    [],
  );
  const signLaborRate = useMemo(
    () =>
      getComicSignPlaqueTexture(
        'labor-rate',
        ['LABOR RATE', '$100 / HR', '$200 WATCHING'],
        '#b91c1c',
      ),
    [],
  );
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

  return (
    <>
      <color attach="background" args={['#1a2026']} />
      <DealershipCameraRig />

      {/* Warm tungsten comic-garage lighting */}
      <ambientLight intensity={0.88} color="#fff7ed" />
      <directionalLight
        position={[7, 12, 8]}
        intensity={1.95}
        color="#fff7ed"
        castShadow
        shadow-mapSize={isTouch ? [1024, 1024] : [2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0005}
      />
      <pointLight position={[-4.2, 3.3, -1.2]} intensity={1.7} distance={9} color="#fde68a" />
      <pointLight position={[-0.5, 3.3, -2.5]} intensity={1.8} distance={9} color="#fde68a" />
      <pointLight position={[3.6, 3.4, 0.4]} intensity={1.9} distance={10} color="#fef3c7" />

      {/* Base Cutaway Slab + Split Wood-to-Cracked-Concrete Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          useShopStore.getState().setCameraFocus('OVERVIEW');
        }}
      >
        <boxGeometry args={[13.6, 9.6, 0.24]} />
        <meshToonMaterial color="#57534e" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      {shopFloorTex ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.126, 0]} raycast={() => null}>
          <planeGeometry args={[13.52, 9.52]} />
          <meshBasicMaterial
            map={shopFloorTex}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
      ) : null}

      {/* Cutaway Left Wall (x = -6.7) — Plaster + Olive Wainscoting */}
      <mesh position={[-6.7, 2.15, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.28, 4.3, 9.6]} />
        <meshToonMaterial color="#6e7463" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      <mesh position={[-6.7, 4.34, 0]} castShadow>
        <boxGeometry args={[0.38, 0.14, 9.72]} />
        <meshToonMaterial color="#262729" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      {wallLeftTex ? (
        <mesh position={[-6.54, 2.15, 0]} rotation={[0, Math.PI / 2, 0]} raycast={() => null}>
          <planeGeometry args={[9.5, 4.22]} />
          <meshBasicMaterial
            map={wallLeftTex}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
      ) : null}

      {/* Cutaway Back Wall (z = -4.7) — Plaster + Olive Wainscoting */}
      <mesh position={[0, 2.15, -4.7]} receiveShadow castShadow>
        <boxGeometry args={[13.6, 4.3, 0.28]} />
        <meshToonMaterial color="#6e7463" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      <mesh position={[0, 4.34, -4.7]} castShadow>
        <boxGeometry args={[13.72, 0.14, 0.38]} />
        <meshToonMaterial color="#262729" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      {wallBackTex ? (
        <mesh position={[0, 2.15, -4.54]} raycast={() => null}>
          <planeGeometry args={[13.5, 4.22]} />
          <meshBasicMaterial
            map={wallBackTex}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
      ) : null}

      {/* Corrugated Roll-Up Service Bay Door (Right Side of Back Wall) */}
      <group position={[4.02, 1.92, -4.5]}>
        <mesh receiveShadow>
          <boxGeometry args={[3.85, 3.45, 0.12]} />
          <meshToonMaterial color="#334155" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        {rollupDoorTex ? (
          <mesh position={[0, 0, 0.075]} raycast={() => null}>
            <planeGeometry args={[3.62, 3.22]} />
            <meshBasicMaterial
              map={rollupDoorTex}
              polygonOffset
              polygonOffsetFactor={-1}
            />
          </mesh>
        ) : null}
      </group>

      {/* Dark Timber Perimeter Beams & Service Bay Roof Rafters */}
      <mesh position={[0, 4.18, -4.46]} castShadow>
        <boxGeometry args={[13.4, 0.18, 0.2]} />
        <meshToonMaterial color="#4e3422" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      <mesh position={[-6.46, 4.18, 0]} castShadow>
        <boxGeometry args={[0.2, 0.18, 9.4]} />
        <meshToonMaterial color="#4e3422" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>
      {[-1.1, 0.85, 2.75, 4.65, 6.35].map((rx) => (
        <mesh key={rx} position={[rx, 4.18, -1.9]} castShadow>
          <boxGeometry args={[0.2, 0.22, 5.1]} />
          <meshToonMaterial color="#4e3422" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
      ))}
      <mesh position={[2.6, 4.18, 0.5]} castShadow>
        <boxGeometry args={[7.8, 0.18, 0.2]} />
        <meshToonMaterial color="#4e3422" gradientMap={TOON_GRADIENT_MAP} />
        <Edges color="#111111" />
      </mesh>

      {/* Warm Hanging Edison Bulbs Across Floor & Bays */}
      {(
        [
          [-4.4, 3.62, -1.3],
          [-0.45, 3.65, -2.5],
          [3.65, 3.7, -2.1],
          [3.65, 3.7, 0.55],
          [3.65, 3.7, 3.1],
        ] as [number, number, number][]
      ).map(([lx, ly, lz], i) => (
        <group key={`bulb-${i}`} position={[lx, ly, lz]}>
          <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.65, 6]} />
            <meshBasicMaterial color="#111111" />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 0.1, 8]} />
            <meshToonMaterial color="#27272a" gradientMap={TOON_GRADIENT_MAP} />
          </mesh>
          <mesh position={[0, -0.09, 0]}>
            <sphereGeometry args={[0.11, 10, 10]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
        </group>
      ))}

      {/* ================= ZONE 1: FRONT ENTRY DOOR (BOTTOM-LEFT CUTAWAY) ================= */}
      <group position={[-4.4, 0.14, 4.65]}>
        <mesh position={[-1.05, 1.0, 0]} castShadow>
          <boxGeometry args={[0.16, 2.0, 0.16]} />
          <meshToonMaterial color="#334155" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        <mesh position={[1.05, 1.0, 0]} castShadow>
          <boxGeometry args={[0.16, 2.0, 0.16]} />
          <meshToonMaterial color="#334155" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        <mesh position={[0, 1.98, 0]} castShadow>
          <boxGeometry args={[2.26, 0.16, 0.18]} />
          <meshToonMaterial color="#334155" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        <mesh position={[-0.95, 0.95, -0.5]} rotation={[0, 0.65, 0]}>
          <boxGeometry args={[0.06, 1.85, 0.95]} />
          <meshToonMaterial color="#38bdf8" transparent opacity={0.32} gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        <mesh position={[0.95, 0.95, -0.5]} rotation={[0, -0.65, 0]}>
          <boxGeometry args={[0.06, 1.85, 0.95]} />
          <meshToonMaterial color="#38bdf8" transparent opacity={0.32} gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        {welcomeMatTex ? (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -0.55]}>
            <planeGeometry args={[1.65, 0.85]} />
            <meshBasicMaterial map={welcomeMatTex} polygonOffset polygonOffsetFactor={-1} />
          </mesh>
        ) : null}
      </group>

      {/* ================= ZONE 2: APPAREL RACKS & V (LEFT / BACK-LEFT) ================= */}
      <ApparelRack3D
        position={[-5.25, 0.12, -2.35]}
        rotationY={Math.PI / 2}
        label="Shop Humor Rack (6)"
        shirtSpecs={[
          { color: '#18181b', motif: 'skull' },
          { color: '#7f1d1d', motif: 'wrench' },
          { color: '#1e293b', motif: 'stencil' },
          { color: '#27272a', motif: 'braap' },
          { color: '#334155', motif: 'skull' },
          { color: '#18181b', motif: 'wrench' },
        ]}
        onClick={() => openApparel('rack_1_humor')}
      />
      <ApparelRack3D
        position={[-5.25, 0.12, 0.65]}
        rotationY={Math.PI / 2}
        label="Definition Rack (10)"
        shirtSpecs={[
          { color: '#111827', motif: 'stencil' },
          { color: '#3f3f46', motif: 'braap' },
          { color: '#4d7c0f', motif: 'wrench' },
          { color: '#1e3a8a', motif: 'skull' },
          { color: '#7c2d12', motif: 'braap' },
          { color: '#18181b', motif: 'stencil' },
        ]}
        onClick={() => openApparel('rack_2_definition')}
      />

      {/* Hat Pegboard Wall + Talkin Braap Feature Table */}
      <group
        position={[-4.55, 0.12, -4.38]}
        onClick={(e) => {
          e.stopPropagation();
          openApparel('wall_braap');
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <mesh position={[0, 2.2, 0]} castShadow>
          <boxGeometry args={[2.22, 1.38, 0.08]} />
          <meshToonMaterial color="#6b4f32" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        {hatPegTex ? (
          <mesh position={[0, 2.2, 0.05]} raycast={() => null}>
            <planeGeometry args={[2.1, 1.26]} />
            <meshBasicMaterial map={hatPegTex} polygonOffset polygonOffsetFactor={-1} />
          </mesh>
        ) : null}
        <mesh position={[0, 0.45, 0.72]} castShadow receiveShadow>
          <boxGeometry args={[1.9, 0.85, 0.75]} />
          <meshToonMaterial color="#475569" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        <mesh position={[-0.45, 0.94, 0.72]} castShadow>
          <boxGeometry args={[0.58, 0.14, 0.48]} />
          <meshToonMaterial color="#dc2626" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        <mesh position={[0.45, 0.94, 0.72]} castShadow>
          <boxGeometry args={[0.58, 0.14, 0.48]} />
          <meshToonMaterial color="#f8fafc" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
      </group>

      {/* V (Locked Indo-Trinidadian Master Character) */}
      <StaffCharacterStandee
        staffId="v"
        character="v"
        pose="front"
        position={[-3.7, 0.12, -0.95]}
        height={2.12}
        label="V"
      />

      {/* ================= ZONE 3: PARTS SHELVING, TOOL CHEST & SCOOTER ================= */}
      <group
        position={[-2.25, 0.12, 1.95]}
        onClick={(e) => {
          e.stopPropagation();
          useShopStore.getState().setOpenDrawer('PARTS');
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        {/* 4-Post Open Industrial Parts Rack */}
        {[
          [-0.78, -0.28],
          [0.78, -0.28],
          [-0.78, 0.28],
          [0.78, 0.28],
        ].map(([px, pz], i) => (
          <mesh key={`post-${i}`} position={[px, 0.95, pz]} castShadow>
            <boxGeometry args={[0.07, 1.9, 0.07]} />
            <meshToonMaterial color="#334155" gradientMap={TOON_GRADIENT_MAP} />
          </mesh>
        ))}
        {[0.2, 0.78, 1.34, 1.85].map((sy, sIdx) => (
          <mesh key={`shelf-${sIdx}`} position={[0, sy, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.64, 0.06, 0.62]} />
            <meshToonMaterial color="#64748b" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
        ))}
        {/* Top shelf oil jugs */}
        {[-0.55, -0.22, 0.12, 0.45].map((ox, i) => (
          <mesh key={`jug-${ox}`} position={[ox, 2.04, 0]} castShadow>
            <boxGeometry args={[0.2, 0.34, 0.22]} />
            <meshToonMaterial
              color={i % 2 === 0 ? '#f59e0b' : '#dc2626'}
              gradientMap={TOON_GRADIENT_MAP}
            />
            <Edges color="#111111" />
          </mesh>
        ))}
        {/* Middle shelf taped cardboard parts boxes */}
        <mesh position={[-0.36, 1.54, 0]} castShadow>
          <boxGeometry args={[0.62, 0.34, 0.44]} />
          <meshToonMaterial color="#b48a5a" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        <mesh position={[0.38, 1.52, 0]} castShadow>
          <boxGeometry args={[0.56, 0.3, 0.42]} />
          <meshToonMaterial color="#9a7248" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        {/* Lower shelf metal parts crates */}
        <mesh position={[-0.32, 0.96, 0]} castShadow>
          <boxGeometry args={[0.64, 0.3, 0.44]} />
          <meshToonMaterial color="#475569" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        <mesh position={[0.38, 0.95, 0]} castShadow>
          <boxGeometry args={[0.56, 0.28, 0.42]} />
          <meshToonMaterial color="#a16207" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        {/* Stacked Tires */}
        {[0.16, 0.42, 0.68].map((ty) => (
          <mesh key={ty} position={[1.25, ty, 0.05]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.32, 0.13, 10, 20]} />
            <meshToonMaterial color="#18181b" gradientMap={TOON_GRADIENT_MAP} />
          </mesh>
        ))}
        {/* Classic 6-Drawer Red Tool Chest */}
        <group position={[-1.28, 0.56, 0.15]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.92, 1.1, 0.58]} />
            <meshToonMaterial color="#c82828" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
          {toolChestTex ? (
            <mesh position={[0, 0, 0.3]} raycast={() => null}>
              <planeGeometry args={[0.86, 1.04]} />
              <meshBasicMaterial map={toolChestTex} polygonOffset polygonOffsetFactor={-1} />
            </mesh>
          ) : null}
        </group>
      </group>

      {/* Scooter (Apprentice) */}
      <StaffCharacterStandee
        staffId="scooter"
        character="service-writer"
        pose="calm"
        position={[-1.4, 0.12, 0.45]}
        height={1.92}
        label="Scooter"
      />

      {/* ================= ZONE 4: BACK PARTS RACK, COUNTER & DICK ================= */}
      {/* Rear Gasket & Oil Parts Pegboard Rack Behind Counter Left */}
      <group position={[-2.15, 0.12, -4.22]}>
        <mesh position={[0, 1.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.72, 2.26, 0.45]} />
          <meshToonMaterial color="#475569" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        {partsPegTex ? (
          <mesh position={[0, 1.48, 0.24]} raycast={() => null}>
            <planeGeometry args={[1.6, 1.32]} />
            <meshBasicMaterial map={partsPegTex} polygonOffset polygonOffsetFactor={-1} />
          </mesh>
        ) : null}
      </group>

      <group
        position={[-0.45, 0.12, -2.95]}
        onClick={(e) => {
          e.stopPropagation();
          useShopStore.getState().setOpenDrawer('SERVICE_COUNTER');
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        {/* Weathered Steel Counter Base */}
        <mesh position={[0, 0.56, 0.45]} castShadow receiveShadow>
          <boxGeometry args={[3.1, 1.1, 0.88]} />
          <meshToonMaterial color="#7b8288" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        {counterFrontTex ? (
          <mesh position={[0, 0.56, 0.905]} raycast={() => null}>
            <planeGeometry args={[3.04, 1.04]} />
            <meshBasicMaterial map={counterFrontTex} polygonOffset polygonOffsetFactor={-1} />
          </mesh>
        ) : null}
        {/* Counter Top */}
        <mesh position={[0, 1.14, 0.45]} castShadow>
          <boxGeometry args={[3.24, 0.1, 0.96]} />
          <meshToonMaterial color="#cbd5e1" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        {/* Vintage Cash Register */}
        <mesh position={[0.85, 1.4, 0.42]} castShadow>
          <boxGeometry args={[0.54, 0.42, 0.44]} />
          <meshToonMaterial color="#d6d3d1" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        {/* Diagnostic Clipboard */}
        <mesh position={[-0.7, 1.22, 0.45]} rotation={[-Math.PI / 2, 0, 0.2]}>
          <boxGeometry args={[0.42, 0.54, 0.04]} />
          <meshToonMaterial color="#b45309" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
      </group>

      {/* HERO HARD R CYCLES HANGING SIGN (Suspended Forward From Ceiling Rafters — Zero Wall Overlap) */}
      <group position={[-0.25, 3.52, -3.72]}>
        {/* Steel Suspension Drop Rods Up To Rafters */}
        <mesh position={[-0.85, 0.72, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.45, 6]} />
          <meshBasicMaterial color="#111111" />
        </mesh>
        <mesh position={[0.85, 0.72, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.45, 6]} />
          <meshBasicMaterial color="#111111" />
        </mesh>
        {/* Framed 3D Sign Board */}
        <mesh castShadow>
          <boxGeometry args={[2.52, 1.28, 0.12]} />
          <meshToonMaterial color="#3b2516" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        {logoTex ? (
          <mesh position={[0, 0, 0.072]}>
            <planeGeometry args={[2.38, 1.16]} />
            <meshBasicMaterial
              map={logoTex}
              polygonOffset
              polygonOffsetFactor={-2}
            />
          </mesh>
        ) : null}
      </group>

      {/* Non-Overlapping Back Wall Tin Plaques on Solid 3D Backing Boards */}
      {signNoRefunds ? (
        <group position={[-2.15, 3.32, -4.49]}>
          <mesh castShadow>
            <boxGeometry args={[1.14, 0.58, 0.06]} />
            <meshToonMaterial color="#1c1917" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
          <mesh position={[0, 0, 0.036]}>
            <planeGeometry args={[1.1, 0.54]} />
            <meshBasicMaterial map={signNoRefunds} polygonOffset polygonOffsetFactor={-1} />
          </mesh>
        </group>
      ) : null}
      {signCashOnly ? (
        <group position={[0.35, 2.52, -4.49]}>
          <mesh castShadow>
            <boxGeometry args={[0.9, 0.54, 0.06]} />
            <meshToonMaterial color="#1c1917" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
          <mesh position={[0, 0, 0.036]}>
            <planeGeometry args={[0.86, 0.5]} />
            <meshBasicMaterial map={signCashOnly} polygonOffset polygonOffsetFactor={-1} />
          </mesh>
        </group>
      ) : null}
      {signLaborRate ? (
        <group position={[1.45, 2.52, -4.49]}>
          <mesh castShadow>
            <boxGeometry args={[1.06, 0.6, 0.06]} />
            <meshToonMaterial color="#1c1917" gradientMap={TOON_GRADIENT_MAP} />
            <Edges color="#111111" />
          </mesh>
          <mesh position={[0, 0, 0.036]}>
            <planeGeometry args={[1.02, 0.56]} />
            <meshBasicMaterial map={signLaborRate} polygonOffset polygonOffsetFactor={-1} />
          </mesh>
        </group>
      ) : null}

      {/* Dick behind Service Counter */}
      <StaffCharacterStandee
        staffId="dick"
        character="mechanic"
        pose="idle"
        position={[-0.45, 0.12, -3.55]}
        height={2.05}
        label="Dick"
      />

      {/* ================= ZONE 5: 3 LIVE SERVICE BAYS (RIGHT HALF) ================= */}
      <LiveServiceBay3D bay={liveBays[0]} position={[3.65, 0.12, -2.1]} />
      <LiveServiceBay3D bay={liveBays[1]} position={[3.65, 0.12, 0.55]} />
      <LiveServiceBay3D bay={liveBays[2]} position={[3.65, 0.12, 3.1]} />

      {/* Bay Wall Breaker Panel (Clear Right of Roll-Up Door) */}
      <group
        position={[6.28, 2.05, -4.45]}
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
        <mesh castShadow>
          <boxGeometry args={[0.72, 1.05, 0.18]} />
          <meshToonMaterial color="#475569" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        {breakerTex ? (
          <mesh position={[0, 0, 0.1]}>
            <planeGeometry args={[0.64, 0.96]} />
            <meshBasicMaterial
              map={breakerTex}
              transparent
              alphaTest={0.2}
              polygonOffset
              polygonOffsetFactor={-1}
            />
          </mesh>
        ) : null}
      </group>

      {/* Aisle Oil Drum & Safety Stanchion */}
      <group position={[0.45, 0.12, 3.55]}>
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.32, 0.32, 0.9, 14]} />
          <meshToonMaterial color="#b91c1c" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
        <mesh position={[0.55, 0.42, 0.2]} castShadow>
          <cylinderGeometry args={[0.07, 0.16, 0.84, 10]} />
          <meshToonMaterial color="#f59e0b" gradientMap={TOON_GRADIENT_MAP} />
          <Edges color="#111111" />
        </mesh>
      </group>

      {/* Visiting Ambient Customer Chaos Standee */}
      <AmbientCustomerStandee />
    </>
  );
}
