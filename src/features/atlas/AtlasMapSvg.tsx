'use client';

import { Globe2, Minus, Plus, RotateCcw } from 'lucide-react';
import { useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { projectLatLngToMapXY } from './geo';
import type { AtlasGeoFeature } from './types';

export const MAP_W = 1000;
export const MAP_H = 540;

const RAW_CONTINENTS: Array<{ id: string; coords: Array<[number, number]> }> = [
  {
    id: 'north-america',
    coords: [
      [-168, 66], [-152, 70], [-128, 70], [-95, 72], [-78, 63], [-56, 52],
      [-64, 44], [-75, 36], [-80, 26], [-83, 29], [-90, 29], [-97, 26],
      [-96, 19], [-88, 21], [-83, 10], [-78, 8], [-85, 11], [-94, 15],
      [-105, 20], [-112, 28], [-117, 32], [-124, 41], [-125, 49], [-138, 58],
      [-155, 58], [-164, 56],
    ],
  },
  {
    id: 'greenland',
    coords: [
      [-55, 62], [-44, 60], [-24, 70], [-22, 78], [-58, 77], [-66, 70],
    ],
  },
  {
    id: 'south-america',
    coords: [
      [-79, 10], [-72, 12], [-61, 10], [-50, 1], [-36, -6], [-39, -15],
      [-41, -23], [-52, -33], [-64, -42], [-68, -54], [-74, -52], [-73, -40],
      [-71, -18], [-81, -5],
    ],
  },
  {
    id: 'europe',
    coords: [
      [-9, 37], [-9, 43], [-2, 43], [-4, 48], [2, 51], [8, 55], [6, 61],
      [18, 69], [31, 70], [42, 66], [42, 50], [32, 46], [24, 38], [16, 38],
      [12, 44], [5, 43], [-2, 37],
    ],
  },
  {
    id: 'uk',
    coords: [
      [-6, 50], [1, 51], [1, 54], [-3, 58], [-7, 56],
    ],
  },
  {
    id: 'africa',
    coords: [
      [-17, 15], [-16, 28], [-6, 36], [10, 37], [24, 32], [33, 31],
      [43, 12], [51, 11], [41, -2], [40, -16], [33, -27], [20, -35],
      [14, -22], [11, -6], [8, 4], [-8, 5], [-15, 11],
    ],
  },
  {
    id: 'asia',
    coords: [
      [34, 42], [44, 42], [55, 67], [85, 73], [128, 72], [168, 65],
      [161, 56], [141, 53], [131, 42], [122, 38], [120, 25], [108, 16],
      [104, 2], [99, 8], [94, 18], [89, 22], [79, 9], [70, 22],
      [62, 25], [50, 29], [43, 14], [35, 31],
    ],
  },
  {
    id: 'japan',
    coords: [
      [130, 32], [137, 35], [141, 40], [145, 44], [140, 44], [136, 37],
    ],
  },
  {
    id: 'australia',
    coords: [
      [114, -22], [128, -14], [136, -12], [143, -11], [151, -24],
      [150, -36], [140, -38], [130, -32], [115, -34], [113, -27],
    ],
  },
];

interface AtlasMapSvgProps {
  features: AtlasGeoFeature[];
  zoom: number;
  selectedId: string | null;
  focusTarget?: { lat: number; lng: number; zoom: number; nonce: number } | null;
  onZoomChange: (nextZoom: number) => void;
  onSelectFeature: (feature: AtlasGeoFeature) => void;
}

function clampCenter(cx: number, cy: number, zoom: number): { x: number; y: number } {
  const viewW = MAP_W / zoom;
  const viewH = MAP_H / zoom;
  const minX = viewW / 2;
  const maxX = MAP_W - viewW / 2;
  const minY = viewH / 2;
  const maxY = MAP_H - viewH / 2;
  return {
    x: Math.max(minX, Math.min(maxX, cx)),
    y: Math.max(minY, Math.min(maxY, cy)),
  };
}

export function AtlasMapSvg({
  features,
  zoom,
  selectedId,
  focusTarget,
  onZoomChange,
  onSelectFeature,
}: AtlasMapSvgProps) {
  const [center, setCenter] = useState<{ x: number; y: number }>(() => {
    // Start slightly framed between North America & Europe
    const usCenter = projectLatLngToMapXY(38, -96, MAP_W, MAP_H);
    return clampCenter(usCenter.x, usCenter.y, zoom);
  });

  const [prevNonce, setPrevNonce] = useState<number>(-1);
  if (focusTarget && focusTarget.nonce !== prevNonce) {
    setPrevNonce(focusTarget.nonce);
    const pt = projectLatLngToMapXY(
      focusTarget.lat,
      focusTarget.lng,
      MAP_W,
      MAP_H,
    );
    const nextZoom = Math.max(1, Math.min(8, focusTarget.zoom));
    setCenter(clampCenter(pt.x, pt.y, nextZoom));
  }

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startCenterX: number;
    startCenterY: number;
    moved: boolean;
  } | null>(null);

  const continentPaths = useMemo(
    () =>
      RAW_CONTINENTS.map((cont) => ({
        id: cont.id,
        points: cont.coords
          .map(([lng, lat]) => {
            const p = projectLatLngToMapXY(lat, lng, MAP_W, MAP_H);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          })
          .join(' '),
      })),
    [],
  );

  const viewW = MAP_W / zoom;
  const viewH = MAP_H / zoom;
  const clampedCenter = clampCenter(center.x, center.y, zoom);
  const viewX = clampedCenter.x - viewW / 2;
  const viewY = clampedCenter.y - viewH / 2;

  const setBoundedZoom = (nextZoomRaw: number, targetX?: number, targetY?: number) => {
    const nextZoom = Math.max(1, Math.min(8, Math.round(nextZoomRaw * 10) / 10));
    onZoomChange(nextZoom);
    setCenter((prev) =>
      clampCenter(targetX ?? prev.x, targetY ?? prev.y, nextZoom),
    );
  };

  const handlePointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if ((e.target as HTMLElement).closest('[data-atlas-pin="true"]')) {
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startCenterX: clampedCenter.x,
      startCenterY: clampedCenter.y,
      moved: false,
    };
  };

  const handlePointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dxPx = e.clientX - drag.startClientX;
    const dyPx = e.clientY - drag.startClientY;
    if (Math.abs(dxPx) > 3 || Math.abs(dyPx) > 3) {
      drag.moved = true;
    }
    const worldDx = (dxPx / rect.width) * viewW;
    const worldDy = (dyPx / rect.height) * viewH;
    setCenter(clampCenter(drag.startCenterX - worldDx, drag.startCenterY - worldDy, zoom));
  };

  const handlePointerUp = (e: PointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      dragRef.current = null;
    }
  };

  const handleWheel = (e: WheelEvent<SVGSVGElement>) => {
    const delta = e.deltaY < 0 ? 0.75 : -0.75;
    setBoundedZoom(zoom + delta);
  };

  const focusUs = () => {
    const pt = projectLatLngToMapXY(39, -98, MAP_W, MAP_H);
    setBoundedZoom(2.6, pt.x, pt.y);
  };

  const focusWorld = () => {
    setBoundedZoom(1, MAP_W / 2, MAP_H / 2);
  };

  const markerScale = 1 / Math.pow(zoom, 0.72);

  return (
    <div className="relative overflow-hidden rounded-2xl border-3 border-black bg-slate-900 shadow-[4px_4px_0px_#000]">
      {/* Map Controls Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black bg-zinc-900 px-3 py-2 text-white">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={focusWorld}
            className="min-h-9 cursor-pointer rounded-lg border border-zinc-600 bg-zinc-800 px-2.5 text-[11px] font-black uppercase hover:bg-amber-300 hover:text-black"
          >
            <Globe2 className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
            World
          </button>
          <button
            type="button"
            onClick={focusUs}
            className="min-h-9 cursor-pointer rounded-lg border border-zinc-600 bg-zinc-800 px-2.5 text-[11px] font-black uppercase hover:bg-amber-300 hover:text-black"
          >
            US / NA
          </button>
        </div>

        <div className="flex items-center gap-1">
          <span className="mr-1 text-[10px] font-black uppercase text-amber-300">
            Zoom {zoom.toFixed(1)}x ({zoom < 5 ? 'Clusters' : 'Pins'})
          </span>
          <button
            type="button"
            aria-label="Zoom out map"
            onClick={() => setBoundedZoom(zoom - 1)}
            className="flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg border border-zinc-600 bg-zinc-800 hover:bg-zinc-700"
          >
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Zoom in map"
            onClick={() => setBoundedZoom(zoom + 1)}
            className="flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg border border-zinc-600 bg-zinc-800 hover:bg-zinc-700"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Reset map view"
            onClick={focusUs}
            className="flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg border border-zinc-600 bg-zinc-800 hover:bg-zinc-700"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Interactive Cel-Shaded Comic Map SVG */}
      <svg
        ref={svgRef}
        viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}
        role="img"
        aria-label="Interactive Hard R Cycles Rider Map"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        className="block h-[260px] w-full cursor-grab touch-none select-none bg-[#0f172a] active:cursor-grabbing sm:h-[330px]"
      >
        {/* Lat/Lng graticule grid */}
        {[-120, -60, 0, 60, 120].map((lng) => {
          const pt = projectLatLngToMapXY(0, lng, MAP_W, MAP_H);
          return (
            <line
              key={`lng-${lng}`}
              x1={pt.x}
              y1={0}
              x2={pt.x}
              y2={MAP_H}
              stroke="#1e293b"
              strokeWidth={1.5 * markerScale}
            />
          );
        })}
        {[-30, 0, 30, 60].map((lat) => {
          const pt = projectLatLngToMapXY(lat, 0, MAP_W, MAP_H);
          return (
            <line
              key={`lat-${lat}`}
              x1={0}
              y1={pt.y}
              x2={MAP_W}
              y2={pt.y}
              stroke="#1e293b"
              strokeWidth={1.5 * markerScale}
            />
          );
        })}

        {/* Cel-shaded landmass polygons */}
        {continentPaths.map((c) => (
          <polygon
            key={c.id}
            points={c.points}
            fill="#334155"
            stroke="#fbbf24"
            strokeWidth={2.2 * markerScale}
            strokeLinejoin="round"
          />
        ))}

        {/* Pin & Cluster Layer */}
        {features.map((feat) => {
          const [lng, lat] = feat.geometry.coordinates;
          const pt = projectLatLngToMapXY(lat, lng, MAP_W, MAP_H);

          if (feat.properties.isCluster) {
            const props = feat.properties;
            const isSelected = selectedId === props.clusterId;
            const radius = Math.min(24, 13 + props.pointCount * 0.9) * markerScale;
            return (
              <g
                key={props.clusterId}
                data-atlas-pin="true"
                transform={`translate(${pt.x}, ${pt.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectFeature(feat);
                  setBoundedZoom(Math.max(5.5, zoom + 2), pt.x, pt.y);
                }}
                className="cursor-pointer"
              >
                <circle
                  r={radius + 3 * markerScale}
                  fill={isSelected ? '#34d399' : '#000000'}
                />
                <circle
                  r={radius}
                  fill="#fbbf24"
                  stroke="#000000"
                  strokeWidth={2.5 * markerScale}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#000000"
                  fontSize={12 * markerScale}
                  fontWeight={900}
                >
                  {props.pointCount}
                </text>
              </g>
            );
          }

          const props = feat.properties;
          const isSelected = selectedId === props.id;
          const r = (isSelected ? 10 : 7.5) * markerScale;
          return (
            <g
              key={props.id}
              data-atlas-pin="true"
              transform={`translate(${pt.x}, ${pt.y})`}
              onClick={(e) => {
                e.stopPropagation();
                onSelectFeature(feat);
              }}
              className="cursor-pointer"
            >
              {isSelected ? (
                <circle
                  r={r * 1.65}
                  fill="rgba(251, 191, 36, 0.35)"
                  stroke="#fbbf24"
                  strokeWidth={2 * markerScale}
                />
              ) : null}
              <circle
                r={r}
                fill={props.isAnonymized ? '#38bdf8' : '#34d399'}
                stroke="#000000"
                strokeWidth={2.5 * markerScale}
              />
              <circle r={r * 0.36} fill="#000000" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
