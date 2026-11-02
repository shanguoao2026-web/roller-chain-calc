# roller-chain-calc
TypeScript Node CLI (zero runtime deps, MIT, README in English) for roller chain drive geometry (ISO 606 / ANSI style).
- Inputs: --pitch mm, --z1 driver teeth, --z2 driven teeth, --center approximate center distance (mm), --rpm driver speed (optional), --power kW (optional).
- Output: chain length in pitches Lp = 2C/p + (z1+z2)/2 + p(z2-z1)^2/(4*pi^2*C); rounded up to even number of links; chain length in mm; exact center distance for the rounded links (standard formula C = p/4*[L-(z1+z2)/2 + sqrt((L-(z1+z2)/2)^2 - 8((z2-z1)/(2pi))^2)]); sprocket pitch diameters D = p/sin(180°/z); speed ratio; if rpm given chain speed v = z1*p*n/60000 m/s; if power also given, chain tension F = P*1000/v N. Warn if z1 < 17 or ratio > 7. Table and --json. Validate inputs.
- Tests (node:test): p 12.7 z1 17 z2 51 C 508 -> Lp ≈ 114.73, rounded 116 links; D1 ≈ 69.12 mm; rpm 1000 -> v ≈ 3.598 m/s; power 2 kW -> F ≈ 555.8 N; exact center for 116 links slightly > 508; invalid inputs error.
- npm test must build and pass. .gitignore node_modules/ dist/ *.log. No secrets, no personal info.
