export type DiagnosticSymptomCategory =
  | 'no_start'
  | 'oil_leak'
  | 'charging_battery'
  | 'misfire_carb'
  | 'brakes_suspension'
  | 'exhaust_noise'
  | 'electrical'
  | 'other';

export interface SymptomOption {
  id: DiagnosticSymptomCategory;
  label: string;
  example: string;
}

export const SYMPTOM_OPTIONS: SymptomOption[] = [
  {
    id: 'no_start',
    label: 'No Start / Cranks Slow',
    example: 'Just clicks or cranks slow at the bar switch',
  },
  {
    id: 'oil_leak',
    label: 'Oil Leak / Drips',
    example: 'Marking its spot under the primary or fork seal',
  },
  {
    id: 'charging_battery',
    label: 'Battery / Charging',
    example: 'Kills batteries, stator smells burnt, weak volts',
  },
  {
    id: 'misfire_carb',
    label: 'Misfire / Carb / Fuel',
    example: 'Popping on decel, hunting idle, bogging off-idle',
  },
  {
    id: 'brakes_suspension',
    label: 'Brakes / Forks / Wobble',
    example: 'Spongy lever, weeping fork seals, front-end shake',
  },
  {
    id: 'exhaust_noise',
    label: 'Knocks / Pipes / Drive',
    example: 'Top-end tick, exhaust stud leak, belt or chain slap',
  },
  {
    id: 'electrical',
    label: 'Wiring / Gremlins',
    example: 'Blown fuses, dead blinkers, mystery handlebar chop',
  },
  {
    id: 'other',
    label: 'Mystery Gremlin',
    example: 'Something feels off and I skipped the service manual',
  },
];

export interface DecodedVehicle {
  source: 'nhtsa' | 'manual';
  vin: string;
  year: string;
  make: string;
  model: string;
  trim?: string;
  displacementCc?: string;
  engineConfig?: string;
  vehicleType?: string;
  plantCountry?: string;
  displayName: string;
}

export interface DiagnosticTriageResult {
  vehicle: DecodedVehicle;
  symptomCategory: DiagnosticSymptomCategory;
  symptomSummary: string;
  dickMoodPortrait: string;
  dickMoodLabel: string;
  dickRoast: string;
  quickChecks: string[];
  estimatedBayComplexity: string;
  safetyDisclaimer: string;
  flatRateMasterUrl: string;
  diagnosticCount: number | null;
  savedToGarage: boolean;
}
