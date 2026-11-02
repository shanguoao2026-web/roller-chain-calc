# roller-chain-calc

A TypeScript Node CLI and library for roller chain drive geometry using standard
ISO 606 / ANSI-style equations. Zero runtime dependencies. Requires Node.js 20 or newer.

## Install and run

```sh
npm install
npm run build
node dist/bin.js --pitch 12.7 --z1 17 --z2 51 --center 508 --rpm 1000 --power 2
```

Use `npm link` to make the `roller-chain-calc` command available locally, or use
`npm start --` followed by the options. Run `npm test` to build and execute the
Node test suite.

## Options

| Option | Meaning |
| --- | --- |
| `--pitch` | Chain pitch, mm; required, positive |
| `--z1` | Driver teeth; required, integer at least 3 |
| `--z2` | Driven teeth; required, integer at least 3 |
| `--center` | Approximate center distance, mm; required, positive |
| `--rpm` | Driver speed, rpm; optional, positive |
| `--power` | Transmitted power, kW; optional, positive, requires RPM |
| `--json` | Output JSON with full numeric precision and warnings |
| `--help`, `-h` | Display usage |

Use space-separated option values. Decimal and scientific notation are supported.
Invalid, unknown, repeated, missing, and out-of-range inputs produce an error on
stderr and exit code 1. No arguments displays help. Successful calculations exit 0.
Table values show three decimal places; JSON retains full numeric precision.
Warnings appear on stderr in table mode and in the `warnings` array in JSON mode.

```sh
node dist/bin.js --pitch 12.7 --z1 17 --z2 51 --center 508 --rpm 1000 --power 2 --json
```

The example gives about 114.732 theoretical pitches, rounded up to 116 links
(1473.2 mm), a driver pitch diameter of 69.116 mm, a 3:1 reduction, a chain speed
of 3.598 m/s, and tension of 555.8 N. The adjusted center distance is slightly
larger than the supplied 508 mm.

## Equations and interpretation

With pitch `p` and center distance `C` in mm:

```text
Lp = 2C/p + (z1+z2)/2 + p(z2-z1)^2/(4π²C)
L = 2 ceil(Lp/2)
Chain length = L × p
A = L - (z1+z2)/2
Adjusted C = p/4 × [A + sqrt(A² - 8((z2-z1)/(2π))²)]
D1 = p/sin(π/z1), D2 = p/sin(π/z2)
Speed ratio = z2/z1 = driver RPM / driven RPM
v = z1 × p × RPM / 60000                         [m/s]
F = power × 1000 / v                            [N]
```

The adjusted center is the larger root of the standard chain-length equation for
the rounded even link count. The requested center must lie on that branch:
`C/p >= |z2-z1|/(2π√2)`. This center is exact for the stated equation; the equation
itself is a geometric approximation. These calculations do not select a chain
size or check sprocket clearance, load rating, fatigue, lubrication, or service
factors. Tension is the nominal transmitted tangential force. Warnings flag a
driver with fewer than 17 teeth and a speed ratio greater than 7.

## Library

```js
import { calculateDrive } from 'roller-chain-calc';

const result = calculateDrive({
  pitch: 12.7, z1: 17, z2: 51, center: 508, rpm: 1000, power: 2,
});
console.log(result.links, result.exactCenterMm);
```

The module exports TypeScript types `DriveInput` and `DriveResult`. Output fields
are `theoreticalLinks`, `links`, `chainLengthMm`, `exactCenterMm`,
`driverPitchDiameterMm`, `drivenPitchDiameterMm`, `speedRatio`, `warnings`, and,
when the corresponding inputs are supplied, `chainSpeedMps` and `chainTensionN`.
Invalid inputs throw an `Error`.

## License

MIT; see [LICENSE](LICENSE).
