import { calculateDrive, type DriveInput, type DriveResult } from './index.js';

const help = `Usage: roller-chain-calc --pitch mm --z1 teeth --z2 teeth --center mm [--rpm n] [--power kW] [--json]

Calculate roller chain drive geometry using standard ISO 606 / ANSI-style formulas.

  --pitch    Chain pitch in millimeters (positive)
  --z1       Driver sprocket teeth (integer, at least 3)
  --z2       Driven sprocket teeth (integer, at least 3)
  --center   Approximate center distance in millimeters (positive)
  --rpm      Driver speed in revolutions per minute (positive, optional)
  --power    Transmitted power in kilowatts (positive, requires --rpm)
  --json     Print machine-readable JSON, including warnings
  --help     Show this help
`;

export function runCli(args: string[], io: { stdout: (text: string) => void; stderr: (text: string) => void }): void {
  if (args.length === 0 || (args.length === 1 && ['--help', '-h'].includes(args[0]))) {
    io.stdout(help);
    return;
  }
  const input: Partial<DriveInput> = {};
  const seen = new Set<string>();
  let json = false;
  const keys = ['pitch', 'z1', 'z2', 'center', 'rpm', 'power'];
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (seen.has(flag)) throw new Error(`duplicate option: ${flag}`);
    seen.add(flag);
    if (flag === '--json') { json = true; continue; }
    const key = flag.startsWith('--') ? flag.slice(2) : '';
    if (!keys.includes(key)) throw new Error(`unknown option: ${flag}`);
    const raw = args[++i];
    if (raw === undefined || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw)) {
      throw new Error(`${flag} requires a numeric value`);
    }
    input[key as keyof DriveInput] = Number(raw);
  }
  for (const key of ['pitch', 'z1', 'z2', 'center'] as const) {
    if (input[key] === undefined) throw new Error(`missing required option: --${key}`);
  }
  const result = calculateDrive(input as DriveInput);
  if (json) {
    io.stdout(JSON.stringify(result, null, 2) + '\n');
    return;
  }
  const rows: [string, keyof DriveResult, string][] = [
    ['Theoretical chain length', 'theoreticalLinks', 'pitches'],
    ['Rounded chain links', 'links', 'links'],
    ['Chain length', 'chainLengthMm', 'mm'],
    ['Exact center distance', 'exactCenterMm', 'mm'],
    ['Driver pitch diameter', 'driverPitchDiameterMm', 'mm'],
    ['Driven pitch diameter', 'drivenPitchDiameterMm', 'mm'],
    ['Speed ratio (z2/z1)', 'speedRatio', ''],
    ['Chain speed', 'chainSpeedMps', 'm/s'],
    ['Chain tension', 'chainTensionN', 'N'],
  ];
  io.stdout('Quantity                    Value          Unit\n' + '-'.repeat(53) + '\n');
  for (const [label, key, unit] of rows) {
    const value = result[key];
    if (typeof value === 'number') io.stdout(`${label.padEnd(28)}${(key === 'links' ? String(value) : value.toFixed(3)).padStart(13)}  ${unit}\n`);
  }
  for (const warning of result.warnings) io.stderr(`Warning: ${warning}\n`);
}

