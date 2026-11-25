import { buildFlatRateMasterReferralUrl } from '../../lib/analytics';
import { withSpriteVersion } from '../../utils/spriteVersion';
import {
  SYMPTOM_OPTIONS,
  type DecodedVehicle,
  type DiagnosticSymptomCategory,
  type DiagnosticTriageResult,
} from './types';

type VehicleArchetype =
  | 'four_wheel_cage'
  | 'v_twin'
  | 'metric_sport'
  | 'euro'
  | 'dirt_adv'
  | 'generic_moto';

const PORTRAIT = (name: string) =>
  withSpriteVersion(`/sprites/portraits/${name}.png`);

const SAFETY_DISCLAIMER =
  'Shop banter & general bench checklist only — not an official repair procedure. Verify factory torque specs, safety stands, and OEM manuals before wrenching.';

function detectVehicleArchetype(vehicle: DecodedVehicle): VehicleArchetype {
  const typeLower = (vehicle.vehicleType ?? '').toLowerCase();
  const makeLower = vehicle.make.toLowerCase();
  const combined = `${vehicle.make} ${vehicle.model} ${vehicle.trim ?? ''} ${vehicle.engineConfig ?? ''}`.toLowerCase();

  // Explicit four-wheel / cage vehicle types (safe for dual car+moto makes like Honda/BMW/Suzuki)
  if (
    /passenger car|truck|multipurpose|mpv|suv|van|bus|trailer/.test(typeLower) ||
    /\b(ford|chevrolet|chevy|gmc|toyota|dodge|ram|jeep|chrysler|nissan|hyundai|kia|subaru|volkswagen|lexus|acura|mazda|buick|cadillac|lincoln|tesla|rivian)\b/.test(
      makeLower,
    )
  ) {
    return 'four_wheel_cage';
  }

  if (
    /\b(harley|harley-davidson|indian|victory|buell|big dog|s&s)\b/.test(combined) ||
    /\b(dyna|sportster|softail|street glide|road glide|road king|electra|fat boy|low rider|breakout|scout|chief|challenger|fxr|flh|flhx|flhxs|fltr|fltrxs|xl883|xl1200|v-twin)\b/.test(
      combined,
    )
  ) {
    return 'v_twin';
  }

  if (
    /\b(crf|yzf?|kx|rmz?|klr|drz|exc|tenere|africa twin|multistrada|enduro|scrambler|motocross|dual sport)\b/.test(
      combined,
    ) ||
    /\b(gs|r12\d\dgs|f8\d\dgs)\b/.test(combined)
  ) {
    return 'dirt_adv';
  }

  if (
    /\b(ducati|bmw|triumph|ktm|aprilia|moto guzzi|mv agusta|husqvarna|royal enfield|benelli|vespa|piaggio)\b/.test(
      makeLower,
    )
  ) {
    return 'euro';
  }

  if (
    /\b(honda|yamaha|kawasaki|suzuki|hyosung)\b/.test(makeLower) ||
    /\b(cbr|gsx|gsxr|zx|ninja|hayabusa|sv650|mt-0|rebel|shadow|vulcan|goldwing|vtx|boulevard)\b/.test(
      combined,
    )
  ) {
    return 'metric_sport';
  }

  return 'generic_moto';
}

function inferSymptomCategory(
  requested: DiagnosticSymptomCategory,
  symptomText: string,
): DiagnosticSymptomCategory {
  if (requested !== 'other') return requested;
  const q = symptomText.toLowerCase();
  if (!q) return 'other';

  if (/no start|won't start|wont start|crank|click|starter|turn over|solenoid/.test(q)) {
    return 'no_start';
  }
  if (/oil|leak|drip|puddle|primary|gasket|seep|weeping/.test(q)) {
    return 'oil_leak';
  }
  if (/battery|charge|charging|stator|regulator|rectifier|volt|dies/.test(q)) {
    return 'charging_battery';
  }
  if (/misfire|pop|backfire|carb|idle|stall|sputter|bog|fouled|plug|fuel|inject/.test(q)) {
    return 'misfire_carb';
  }
  if (/brake|caliper|rotor|pad|squeak|spongy|fork|shock|seal|wobble|bearing/.test(q)) {
    return 'brakes_suspension';
  }
  if (/exhaust|pipe|baffle|stud|tick|knock|rattle|clunk|whine|chain|belt|noise/.test(q)) {
    return 'exhaust_noise';
  }
  if (/wire|wiring|fuse|headlight|blinker|turn signal|relay|short|dash|speedo|sensor|code/.test(q)) {
    return 'electrical';
  }
  return 'other';
}

function pickQuickChecks(
  archetype: VehicleArchetype,
  category: DiagnosticSymptomCategory,
): { checks: string[]; complexity: string } {
  if (archetype === 'four_wheel_cage') {
    return {
      checks: [
        'Count the wheels in your driveway before booking a motorcycle lift.',
        'Pull OBD-II fault codes with an automotive scanner and inspect battery terminals.',
        'Save the VIN and open Flat Rate Master if you are auditing automotive shop flat-rate time.',
      ],
      complexity: 'Wrong Door (~$300/hr Cage Tax)',
    };
  }

  switch (category) {
    case 'no_start':
      return {
        checks: [
          'Load-test the battery (resting >= 12.6V, shouldn’t crater below 10.0V under starter load).',
          archetype === 'v_twin'
            ? 'Check kill switch, clutch/neutral safety interlock, and starter relay click near the fuse block.'
            : 'Verify kill switch, sidestand safety switch, clutch switch, and main starter relay fuse.',
          'Clean both battery terminals and trace the heavy ground strap directly to frame/case.',
          'Check for spark and fuel pump prime pulse before throwing a new starter at it.',
        ],
        complexity: 'Quick Bench Triage (~0.5–1.5 hrs)',
      };

    case 'oil_leak':
      return {
        checks: [
          'Degrease the bottom case and dust with talc/chalk so you trace the highest wet seam, not the lowest drip.',
          archetype === 'v_twin'
            ? 'Separate transmission vs. primary vs. engine sump oil smells before splitting the outer primary cover.'
            : 'Check drain-plug crush washer, shift-shaft seal, and countershaft sprocket seal behind the front cover.',
          'Confirm crankcase breather hose isn’t kinked or pinched (excess pressure forces healthy seals to weep).',
        ],
        complexity: 'Lift Inspection & Reseal (~1.0–3.0 hrs)',
      };

    case 'charging_battery':
      return {
        checks: [
          'Read DC voltage across battery posts at 2,500–3,000 RPM (healthy charging reads ~13.8V–14.6V DC).',
          'Unplug the stator-to-regulator connector and inspect for melted plastic, green corrosion, or burnt ATF smell.',
          archetype === 'v_twin'
            ? 'Test stator AC output across pins (expect ~18–22V AC per 1,000 RPM) and verify zero continuity to chassis ground.'
            : 'Check regulator/rectifier diode drop and stator phase resistance with a multimeter before replacing parts.',
          'Test for parasitic key-off drain if a fresh AGM battery dies after sitting two days.',
        ],
        complexity: 'Charging System Diag (~1.0–2.5 hrs)',
      };

    case 'misfire_carb':
      return {
        checks: [
          'Read spark plug insulators (sooty wet black = rich/ignition weak; chalky white = intake leak or lean fuel).',
          archetype === 'v_twin'
            ? 'Mist carb cleaner lightly around intake manifold seals at idle — an RPM jump exposes dried rubber intake seals.'
            : 'Check inline fuel strainer, tank vent line, and throttle-body/carburetor vacuum boot cracks.',
          'Drain old ethanol-gelled gas if the bike sat over winter and verify fresh fuel flow and coil boot resistance.',
        ],
        complexity: 'Fuel & Ignition Bench (~1.0–2.5 hrs)',
      };

    case 'brakes_suspension':
      return {
        checks: [
          'Check brake fluid age/color (dark tea-colored DOT4 boils fast) and inspect caliper pistons for sticky road grit.',
          archetype === 'v_twin'
            ? 'Lift the front wheel off the floor to check steering-head fall-away, wheel bearings, and motor-mount alignment.'
            : 'Spin front wheel to check warped rotor drag, steering-head notchiness, and upper fork stanchion oil rings.',
          'Inspect tire tread cupping, sidewall date codes, and cold PSI before blaming suspension.',
        ],
        complexity: 'Chassis & Safety Check (~1.0–2.0 hrs)',
      };

    case 'exhaust_noise':
      return {
        checks: [
          'Cold-engine check: wiggle header flange studs/nuts and feel for cold exhaust pulses on start-up.',
          archetype === 'v_twin'
            ? 'Verify compensator nut, primary chain tensioner shoe, and belt tracking before tearing down the cam chest.'
            : 'Measure drive chain slack at the tightest spot and check rear sprocket teeth for shark-fin hooking.',
          'Use a long screwdriver or mechanic’s stethoscope to isolate top-end valvetrain noise vs primary/clutch basket.',
        ],
        complexity: 'Drivetrain / Top-End Diag (~1.0–2.5 hrs)',
      };

    case 'electrical':
      return {
        checks: [
          'Pull the seat and inspect for aftermarket scotch-locks, twisted tape splices, and pinched neck-stem harness wires.',
          'Use a test light and multimeter on fuses, relay sockets, and handlebar control grounds.',
          'Verify battery voltage first — low voltage triggers phantom ECM/BCM sensor codes on modern bikes.',
        ],
        complexity: 'Harness Gremlin Hunt (~1.5–3.0 hrs)',
      };

    default:
      return {
        checks: [
          'Confirm oil level, fresh fuel, battery voltage (12.6V+), and tire pressures before buying mystery parts.',
          'Note whether the issue happens cold, hot, under load, or at a specific RPM so diagnosis isn’t guesswork.',
          'Check factory recall / service bulletins via VIN and log exact labor steps inside Flat Rate Master.',
        ],
        complexity: 'Full Bench Intake (~1.0–2.0 hrs)',
      };
  }
}

export function buildDiagnosticTriage(params: {
  vehicle: DecodedVehicle;
  symptomCategory: DiagnosticSymptomCategory;
  symptomText?: string;
  riderName?: string;
  previousDiagnosticCount?: number;
  previousBike?: string | null;
  savedToGarage?: boolean;
  nextDiagnosticCount?: number | null;
}): DiagnosticTriageResult {
  const { vehicle, previousDiagnosticCount = 0, previousBike } = params;
  const archetype = detectVehicleArchetype(vehicle);
  const resolvedCategory = inferSymptomCategory(
    params.symptomCategory,
    params.symptomText ?? '',
  );

  const optionMeta =
    SYMPTOM_OPTIONS.find((opt) => opt.id === resolvedCategory) ?? SYMPTOM_OPTIONS[7];
  const cleanCustomSymptom = (params.symptomText ?? '').trim();
  const symptomSummary = cleanCustomSymptom || optionMeta.label;
  const bikeShort = [vehicle.year, vehicle.make, vehicle.model]
    .filter(Boolean)
    .join(' ')
    .trim() || vehicle.displayName;
  const rider = params.riderName?.trim() || 'pal';

  const repeatPrefix =
    previousDiagnosticCount >= 1
      ? previousBike && previousBike.toLowerCase() !== bikeShort.toLowerCase()
        ? `Back again after your ${previousBike}? `
        : `Trip #${previousDiagnosticCount + 1} to the counter, ${rider} — `
      : '';

  let dickMoodPortrait = PORTRAIT('dick-smartass');
  let dickMoodLabel = 'BENCH TRIAGE';
  let dickRoast = '';

  if (archetype === 'four_wheel_cage') {
    dickMoodPortrait = PORTRAIT('dick-wtf');
    dickMoodLabel = 'FOUR-WHEEL CAGE?!';
    dickRoast = `${repeatPrefix}A ${bikeShort}?! This is a motorcycle shop, ${rider} — unless you lost two wheels in a bar bet, park that cage across the street.`;
  } else if (resolvedCategory === 'no_start') {
    dickMoodPortrait = PORTRAIT('dick-eyeroll');
    dickMoodLabel = 'CHECK THE KILL SWITCH';
    dickRoast =
      archetype === 'v_twin'
        ? `${repeatPrefix}Ten bucks says your ${bikeShort} isn't cursed — your AGM battery is cooked or you bumped the thumb kill switch while posing in the driveway.`
        : `${repeatPrefix}Before you yank the motor out of that ${bikeShort}, test the battery load and sidestand switch. Half these "dead bikes" are user error.`;
  } else if (resolvedCategory === 'oil_leak') {
    dickMoodPortrait = PORTRAIT('dick-smartass');
    dickMoodLabel = 'MARKING ITS SPOT';
    dickRoast =
      archetype === 'v_twin'
        ? `${repeatPrefix}A ${bikeShort} marking territory? Look on the bright side, ${rider} — at least when it leaks you still know there's oil in the sump.`
        : `${repeatPrefix}Chasing a drip on a ${bikeShort} without degreasing it first is amateur hour. Spray it clean and stop guessing which gasket wept.`;
  } else if (resolvedCategory === 'charging_battery') {
    dickMoodPortrait = PORTRAIT('dick-furious');
    dickMoodLabel = 'BLACK FRIDAY BATTERY';
    dickRoast =
      archetype === 'v_twin'
        ? `${repeatPrefix}Put the multimeter on that ${bikeShort} stator plug before you fry a third cheap battery — and unplug the neon underglow, ${rider}.`
        : `${repeatPrefix}Every rider blames the battery on their ${bikeShort} until the regulator melts the plug in traffic. Test charging volts at 3,000 RPM.`;
  } else if (resolvedCategory === 'misfire_carb') {
    dickMoodPortrait = PORTRAIT('dick-glaring');
    dickMoodLabel = 'SKIPPED YOUTUBE TIPS';
    dickRoast =
      archetype === 'v_twin'
        ? `${repeatPrefix}Let me guess: you put loud drag pipes on your ${bikeShort}, skipped a tune, and now wonder why it pops like fireworks on decel.`
        : `${repeatPrefix}Stop dumping Amazon fuel additive into that ${bikeShort}. Check spark plugs and dried intake boots before twisting idle screws blind.`;
  } else if (resolvedCategory === 'brakes_suspension') {
    dickMoodPortrait = PORTRAIT('dick-furious');
    dickMoodLabel = 'DEATH TRAP LIFT';
    dickRoast = `${repeatPrefix}Fork oil on the rotor of your ${bikeShort} and you still rode it here, ${rider}? Fix the seals and bleed the calipers before worrying about horsepower.`;
  } else if (resolvedCategory === 'exhaust_noise') {
    dickMoodPortrait = PORTRAIT('dick-eyeroll');
    dickMoodLabel = 'NOISE DOESN’T FIX ITSELF';
    dickRoast =
      archetype === 'v_twin'
        ? `${repeatPrefix}Turning the radio up louder won't torque the exhaust studs or compensator nut on your ${bikeShort}. Put it on a lift before it bolts itself loose.`
        : `${repeatPrefix}Rattling drivetrain on a ${bikeShort}? Check chain slack and tensioners today unless you enjoy walking home behind a tow truck.`;
  } else if (resolvedCategory === 'electrical') {
    dickMoodPortrait = PORTRAIT('dick-wtf');
    dickMoodLabel = 'SCOTCH-LOCK CRIME';
    dickRoast = `${repeatPrefix}Wait — did you let Scooter or a buddy with wire nuts touch your ${bikeShort} harness? Cut out the butt-connectors and trace ground first.`;
  } else {
    dickMoodPortrait = PORTRAIT('dick-smartass');
    dickMoodLabel = '$100/HR READING';
    dickRoast = `${repeatPrefix}${bikeShort}, huh? Quit staring at the tank and tell me what broke before I charge you $200/hr just to look over my shoulder.`;
  }

  const { checks, complexity } = pickQuickChecks(archetype, resolvedCategory);

  return {
    vehicle,
    symptomCategory: resolvedCategory,
    symptomSummary,
    dickMoodPortrait,
    dickMoodLabel,
    dickRoast,
    quickChecks: checks,
    estimatedBayComplexity: complexity,
    safetyDisclaimer: SAFETY_DISCLAIMER,
    flatRateMasterUrl: buildFlatRateMasterReferralUrl(vehicle.vin || undefined),
    diagnosticCount: params.nextDiagnosticCount ?? null,
    savedToGarage: Boolean(params.savedToGarage),
  };
}
