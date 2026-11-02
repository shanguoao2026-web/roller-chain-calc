/** Inputs use millimeters, revolutions per minute, and kilowatts. */
export interface DriveInput {
  pitch: number;
  z1: number;
  z2: number;
  center: number;
  rpm?: number;
  power?: number;
}

export interface DriveResult {
  theoreticalLinks: number;
  links: number;
  chainLengthMm: number;
  exactCenterMm: number;
  driverPitchDiameterMm: number;
  drivenPitchDiameterMm: number;
  speedRatio: number;
  chainSpeedMps?: number;
  chainTensionN?: number;
  warnings: string[];
}

export function calculateDrive(input: DriveInput): DriveResult {
  const { pitch, z1, z2, center, rpm, power } = input;
  for (const key of ['pitch', 'z1', 'z2', 'center'] as const) {
    if (!Number.isFinite(input[key]) || input[key] <= 0) {
      throw new Error(`${key} must be a finite positive number`);
    }
  }
  for (const key of ['z1', 'z2'] as const) {
    if (!Number.isSafeInteger(input[key]) || input[key] < 3) {
      throw new Error(`${key} must be a safe integer of at least 3 teeth`);
    }
  }
  for (const key of ['rpm', 'power'] as const) {
    if (input[key] !== undefined && (!Number.isFinite(input[key]) || input[key]! <= 0)) {
      throw new Error(`${key} must be a finite positive number`);
    }
  }
  if (power !== undefined && rpm === undefined) throw new Error('power requires rpm');

  const difference = (z2 - z1) / (2 * Math.PI);
  const sum = (z1 + z2) / 2;
  // On the physical (larger-center) branch, length increases with center distance.
  if (center / pitch < Math.abs(difference) / Math.SQRT2) {
    throw new Error('center is too small for the standard center-distance formula');
  }
  const theoreticalLinks = 2 * center / pitch + sum + difference ** 2 * pitch / center;
  const links = 2 * Math.ceil(theoreticalLinks / 2);
  if (!Number.isSafeInteger(links)) throw new Error('calculated link count exceeds the safe numeric range');
  const remaining = links - sum;
  const discriminant = remaining ** 2 - 8 * difference ** 2;
  if (discriminant < 0) throw new Error('no real center distance exists for these inputs');
  const result: DriveResult = {
    theoreticalLinks,
    links,
    chainLengthMm: links * pitch,
    exactCenterMm: pitch / 4 * (remaining + Math.sqrt(discriminant)),
    driverPitchDiameterMm: pitch / Math.sin(Math.PI / z1),
    drivenPitchDiameterMm: pitch / Math.sin(Math.PI / z2),
    speedRatio: z2 / z1,
    warnings: [],
  };
  if (rpm !== undefined) result.chainSpeedMps = z1 * pitch * rpm / 60000;
  if (power !== undefined) result.chainTensionN = power * 1000 / result.chainSpeedMps!;
  for (const value of Object.values(result)) {
    if (typeof value === 'number' && (!Number.isFinite(value) || value <= 0)) {
      throw new Error('calculation exceeds the supported numeric range');
    }
  }
  if (z1 < 17) result.warnings.push('Driver has fewer than 17 teeth; increased polygonal action and wear may occur.');
  if (result.speedRatio > 7) result.warnings.push('Speed ratio exceeds 7; consider a multi-stage drive.');
  return result;
}
