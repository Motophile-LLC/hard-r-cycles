'use client';

import { useFrame } from '@react-three/fiber';
import {
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from 'react';
import * as THREE from 'three';

interface SafeHtmlEntry {
  id: string;
  center: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

const entriesMap = new Map<string, SafeHtmlEntry>();
const domNodeMap = new Map<string, HTMLDivElement>();
const listeners = new Set<() => void>();
const EMPTY_ENTRIES: SafeHtmlEntry[] = [];
let cachedSnapshot: SafeHtmlEntry[] = EMPTY_ENTRIES;

function notifyListeners() {
  cachedSnapshot = entriesMap.size === 0 ? EMPTY_ENTRIES : Array.from(entriesMap.values());
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SafeHtmlEntry[] {
  return cachedSnapshot;
}

function getServerSnapshot(): SafeHtmlEntry[] {
  return EMPTY_ENTRIES;
}

function registerDomNode(id: string, node: HTMLDivElement | null) {
  if (node) {
    domNodeMap.set(id, node);
  } else {
    domNodeMap.delete(id);
  }
}

export function SafeHtmlHost() {
  const entries = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div
      aria-hidden={entries.length === 0 ? true : undefined}
      className="pointer-events-none absolute inset-0 isolate z-10 overflow-hidden"
    >
      {entries.map((entry) => {
        const forceNone = entry.style?.pointerEvents === 'none';
        return (
          <div
            key={entry.id}
            ref={(node) => registerDomNode(entry.id, node)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transform: 'translate3d(-9999px, -9999px, 0)',
              transformOrigin: '0 0',
              pointerEvents: 'none',
            }}
          >
            <div
              className={`${
                forceNone
                  ? 'pointer-events-none'
                  : 'pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto'
              } ${entry.className ?? ''}`}
              style={{
                position: 'absolute',
                transform: entry.center ? 'translate3d(-50%, -50%, 0)' : 'none',
                ...entry.style,
                pointerEvents: 'none',
              }}
            >
              {entry.children}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const tmpObjPos = new THREE.Vector3();
const tmpProj = new THREE.Vector3();
const tmpCamPos = new THREE.Vector3();
const tmpDelta = new THREE.Vector3();
const tmpCamDir = new THREE.Vector3();

export interface SafeHtmlProps {
  position?: [number, number, number];
  center?: boolean;
  distanceFactor?: number;
  zIndexRange?: [number, number];
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
}

export function SafeHtml({
  position = [0, 0, 0],
  center = false,
  distanceFactor,
  zIndexRange = [100, 0],
  style,
  className,
  children,
}: SafeHtmlProps) {
  const id = useId();
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    entriesMap.set(id, {
      id,
      center,
      className,
      style,
      children,
    });
    notifyListeners();
  });

  useEffect(() => {
    return () => {
      if (entriesMap.delete(id)) {
        domNodeMap.delete(id);
        notifyListeners();
      }
    };
  }, [id]);

  useFrame(({ camera, size }) => {
    const el = domNodeMap.get(id);
    const group = groupRef.current;
    if (!el || !group) return;

    camera.updateMatrixWorld();
    group.updateWorldMatrix(true, false);

    tmpObjPos.setFromMatrixPosition(group.matrixWorld);
    tmpCamPos.setFromMatrixPosition(camera.matrixWorld);
    tmpDelta.subVectors(tmpObjPos, tmpCamPos);
    camera.getWorldDirection(tmpCamDir);

    const isBehind = tmpDelta.angleTo(tmpCamDir) > Math.PI / 2;
    if (isBehind) {
      el.style.display = 'none';
      return;
    }

    el.style.display = 'block';
    tmpProj.copy(tmpObjPos).project(camera);
    const x = tmpProj.x * (size.width * 0.5) + size.width * 0.5;
    const y = -(tmpProj.y * (size.height * 0.5)) + size.height * 0.5;

    let scale = 1;
    if (distanceFactor !== undefined && camera instanceof THREE.PerspectiveCamera) {
      const vFOV = (camera.fov * Math.PI) / 180;
      const dist = Math.max(0.1, tmpObjPos.distanceTo(tmpCamPos));
      const scaleFOV = 2 * Math.tan(vFOV / 2) * dist;
      scale = THREE.MathUtils.clamp((1 / Math.max(0.001, scaleFOV)) * distanceFactor, 0.45, 2.2);
    }

    const dist = tmpObjPos.distanceTo(tmpCamPos);
    const span = Math.max(0.1, camera.far - camera.near);
    const zMin = Math.min(zIndexRange[0], zIndexRange[1]);
    const zMax = Math.max(zIndexRange[0], zIndexRange[1]);
    const t = THREE.MathUtils.clamp(1 - (dist - camera.near) / span, 0, 1);
    el.style.zIndex = String(Math.round(zMin + (zMax - zMin) * t));
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  });

  return <group ref={groupRef} position={position} />;
}
