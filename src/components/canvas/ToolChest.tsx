'use client';

import { useState } from 'react';
import * as THREE from 'three';
import { TOOLS } from '@/data/shiftJobs';
import { useGameStore } from '@/store/useGameStore';
import type { ToolDefinition } from '@/types/game';
import { SafeHtml as Html } from './SafeHtml';
import { usePropSpriteTexture, useToolSpriteTexture } from './ToonMaterial';

function ToolPickupSprite({
  tool,
  index,
  selected,
  hovered,
  onHoverChange,
}: {
  tool: ToolDefinition;
  index: number;
  selected: boolean;
  hovered: boolean;
  onHoverChange: (id: string | null) => void;
}) {
  const toolAsset = useToolSpriteTexture(tool.id);

  // Arrange tools neatly inside the wooden butcher-block tabletop
  const xOffset = -0.44 + index * 0.176;
  const baseY = index % 2 === 0 ? 1.38 : 1.44;
  const zPos = index % 2 === 0 ? 0.12 : 0.08;
  const yLift = selected ? 0.07 : hovered ? 0.04 : 0;

  const baseHeight = 0.24;
  const rawWidth = toolAsset ? baseHeight * toolAsset.aspect : 0.22;
  const clampScale = rawWidth > 0.25 ? 0.25 / rawWidth : 1;
  const width = rawWidth * clampScale;
  const height = baseHeight * clampScale;

  return (
    <group
      position={[xOffset, baseY + yLift, zPos]}
      onClick={(e) => {
        e.stopPropagation();
        useGameStore.getState().equipTool(tool.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHoverChange(tool.id);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        onHoverChange(null);
        document.body.style.cursor = 'auto';
      }}
    >
      {selected || hovered ? (
        <mesh position={[0, 0, -0.02]}>
          <circleGeometry args={[Math.max(width, height) * 0.65, 20]} />
          <meshBasicMaterial
            color={selected ? '#facc15' : '#fde047'}
            transparent
            opacity={selected ? 0.55 : 0.32}
            depthWrite={false}
          />
        </mesh>
      ) : null}

      {toolAsset ? (
        <mesh key="tool-sprite">
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial
            key="tool-sprite-mat"
            map={toolAsset.texture}
            color="#ffffff"
            alphaTest={0.5}
            depthWrite={true}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : (
        <mesh key="tool-fallback">
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshBasicMaterial key="tool-fallback-mat" color={tool.color} />
        </mesh>
      )}

      {hovered ? (
        <Html center position={[0, height / 2 + 0.22, 0]} style={{ pointerEvents: 'none' }}>
          <div className="whitespace-nowrap rounded border-2 border-black bg-amber-100 px-2 py-0.5 text-xs font-black text-black shadow-[2px_2px_0px_#000]">
            [{tool.hotkey}] {tool.shortName}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

export function ToolChest() {
  const equippedTool = useGameStore((s) => s.equippedTool);
  const chestAsset = usePropSpriteTexture('tool-chest');
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);

  const chestHeight = 1.4;
  const chestWidth = chestAsset ? chestHeight * chestAsset.aspect : 1.19;

  return (
    <group position={[-2.04, 0, -0.62]}>
      {/* Ground contact shadow under rolling casters */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.015, 0]}
        scale={[1.05, 0.55, 1]}
        raycast={() => null}
      >
        <circleGeometry args={[0.68, 22]} />
        <meshBasicMaterial color="#09090b" transparent opacity={0.34} depthWrite={false} />
      </mesh>

      {/* Hand-drawn sticker-bombed rolling red mechanic tool chest */}
      {chestAsset ? (
        <mesh key="chest-sprite" position={[0, chestHeight / 2, 0]} raycast={() => null}>
          <planeGeometry args={[chestWidth, chestHeight]} />
          <meshBasicMaterial
            key="chest-sprite-mat"
            map={chestAsset.texture}
            color="#ffffff"
            alphaTest={0.5}
            depthWrite={true}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : (
        <mesh key="chest-fallback" position={[0, 0.72, 0]} castShadow receiveShadow raycast={() => null}>
          <boxGeometry args={[1.4, 1.35, 0.72]} />
          <meshBasicMaterial key="chest-fallback-mat" color="#dc2626" />
        </mesh>
      )}

      {/* Interactive Hand-Drawn Tool Cutouts arranged across wooden tabletop */}
      {TOOLS.map((tool, index) => (
        <ToolPickupSprite
          key={tool.id}
          tool={tool}
          index={index}
          selected={equippedTool === tool.id}
          hovered={hoveredTool === tool.id}
          onHoverChange={setHoveredTool}
        />
      ))}
    </group>
  );
}
