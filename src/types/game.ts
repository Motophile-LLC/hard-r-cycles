export type GamePhase =
  | 'clock_in'
  | 'intro'
  | 'playing'
  | 'job_complete'
  | 'extra_bolt'
  | 'shift_complete';

export type TutorialStep =
  | 'inactive'
  | 'pick_brake_cleaner'
  | 'open_oil_pan_hold'
  | 'complete_hold_bar'
  | 'pick_torque_wrench'
  | 'open_torque_bar'
  | 'complete_torque_bar'
  | 'rescue_snapped_bolt'
  | 'shoo_shop_buddy'
  | 'graduated';

export type ToolId =
  | 'torque_wrench'
  | 'impact_gun'
  | 'propane_torch'
  | 'ez_out'
  | 'multimeter'
  | 'brake_cleaner';

export type BikeHotspot =
  | 'engine'
  | 'handlebars'
  | 'exhaust'
  | 'oil_pan'
  | 'rear_wheel';

export type HazardType =
  | 'NONE'
  | 'BOLT_STRIPPED'
  | 'WIRING_SHORT'
  | 'MISSING_SOCKET'
  | 'BREAKER_BLOWN';

export type MechanicPose =
  | 'idle'
  | 'wrenching'
  | 'panicked'
  | 'electrocuted'
  | 'facepalm'
  | 'celebrate';

export type BuddyPose = 'idle' | 'talking' | 'borrowing' | 'dismissed';

export type ServiceWriterPose = 'calm' | 'pacing';

export type TorquePhase = 'normal' | 'extract_heat' | 'extract_turn';

export type ParticleKind = 'spark' | 'electric' | 'smoke' | 'oil';

export type ShakeIntensity = 'none' | 'small-bump' | 'explosion-shake';

export interface ToolDefinition {
  id: ToolId;
  name: string;
  shortName: string;
  hotkey: string;
  color: string;
  description: string;
  wrongToolPenalty: number;
  wrongToolQuip: string;
}

export interface TaskStep {
  id: string;
  label: string;
  instruction: string;
  hotspot: BikeHotspot;
  requiredTool: ToolId;
  interactionType: 'torque' | 'hold' | 'wiring';
  targetWidth?: number;
  holdDuration?: number;
  scrambleWires?: boolean;
}

export type BikeSpriteId = 'club-dyna' | 'bigwheel-bagger' | 'track-bagger';

export interface JobDefinition {
  id: string;
  dayLabel: string;
  title: string;
  bikeName: string;
  bikeSprite: BikeSpriteId;
  bikeColor: string;
  customerName: string;
  customerPortrait: string;
  customerNote: string;
  billedHours: number;
  parSeconds: number;
  buddyIntervalMin: number;
  buddyIntervalMax: number;
  socketDropChance: number;
  steps: TaskStep[];
}

export interface ParticleBurst {
  id: number;
  kind: ParticleKind;
  x: number;
  y: number;
  z: number;
  count: number;
}

export interface ShopToast {
  id: number;
  text: string;
  tone: 'good' | 'bad' | 'warn' | 'comedy';
  ttl?: number;
}

export interface OilSpill {
  id: number;
  x: number;
  z: number;
}

export interface RankBadgeInfo {
  title: string;
  subtitle: string;
  stamp: string;
  accentColor: string;
}

export interface RepairOrderRecord {
  id?: string;
  mechanic_name: string;
  billed_hours: number;
  actual_hours: number;
  efficiency_rating: number;
  shop_damage_cost: number;
  rank_badge: string;
  jobs_completed: number;
  created_at?: string;
}
