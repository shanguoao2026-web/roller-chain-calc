import test from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from '../dist/cli.js';
import { calculateDrive } from '../dist/index.js';

const base = { pitch: 12.7, z1: 17, z2: 51, center: 508 };
const close = (actual, expected, tolerance) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`);
const cli = (...args) => {
  const result = { status: 0, stdout: '', stderr: '' };
  try {
    runCli(args, {
      stdout: text => { result.stdout += text; },
      stderr: text => { result.stderr += text; },
    });
  } catch (error) {
    result.status = 1;
    result.stderr += `Error: ${error.message}\n`;
  }
  return result;
};
const flags = ['--pitch', '12.7', '--z1', '17', '--z2', '51', '--center', '508'];

test('reference geometry, chain speed and tension', () => {
  const r = calculateDrive({ ...base, rpm: 1000, power: 2 });
  close(r.theoreticalLinks, 114.73, 0.01);
  assert.equal(r.links, 116);
  close(r.chainLengthMm, 1473.2, 1e-9);
  close(r.driverPitchDiameterMm, 69.12, 0.01);
  close(r.drivenPitchDiameterMm, base.pitch / Math.sin(Math.PI / 51), 1e-9);
  assert.equal(r.speedRatio, 3);
  close(r.chainSpeedMps, 3.598, 0.001);
  close(r.chainTensionN, 555.8, 0.1);
  assert.ok(r.exactCenterMm > 508 && r.exactCenterMm < 520);
  const atExactCenter = calculateDrive({ ...base, center: r.exactCenterMm });
  close(atExactCenter.theoreticalLinks, 116, 1e-10);
  assert.deepEqual(r.warnings, []);
});

test('equal sprockets and already even links', () => {
  const r = calculateDrive({ pitch: 10, z1: 20, z2: 20, center: 200 });
  assert.equal(r.theoreticalLinks, 60);
  assert.equal(r.links, 60);
  assert.equal(r.exactCenterMm, 200);
  assert.equal(r.speedRatio, 1);
  assert.equal(r.chainSpeedMps, undefined);
  assert.equal(r.chainTensionN, undefined);
});

test('optional speed and warning thresholds', () => {
  const r = calculateDrive({ ...base, z1: 16, z2: 128, rpm: 1000 });
  assert.equal(r.warnings.length, 2);
  assert.ok(r.chainSpeedMps > 0);
  assert.equal(r.chainTensionN, undefined);
  assert.equal(calculateDrive({ ...base, z2: 119 }).warnings.length, 0);
});

test('invalid numerical and missing inputs are rejected', () => {
  for (const key of ['pitch', 'z1', 'z2', 'center', 'rpm', 'power']) {
    for (const value of [0, -1, NaN, Infinity]) {
      assert.throws(() => calculateDrive({ ...base, rpm: 1000, [key]: value }));
    }
  }
  for (const key of ['z1', 'z2']) {
    for (const value of [1, 2, 17.5, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => calculateDrive({ ...base, [key]: value }));
    }
  }
  assert.throws(() => calculateDrive({ ...base, pitch: undefined }));
  assert.throws(() => calculateDrive({ ...base, power: 2 }), /requires rpm/);
  assert.throws(() => calculateDrive({ ...base, center: 1 }), /too small/);
  assert.throws(() => calculateDrive({ ...base, center: Number.MAX_VALUE }));
  assert.throws(() => calculateDrive({ ...base, rpm: Number.MAX_VALUE }));
});

test('CLI emits parseable JSON and human-readable table', () => {
  const json = cli(...flags, '--rpm', '1000', '--power', '2', '--json');
  assert.equal(json.status, 0, json.stderr);
  assert.equal(json.stderr, '');
  assert.deepEqual(JSON.parse(json.stdout), calculateDrive({ ...base, rpm: 1000, power: 2 }));
  const table = cli(...flags);
  assert.equal(table.status, 0);
  assert.match(table.stdout, /Rounded chain links\s+116/);
  assert.match(table.stdout, /mm/);
  assert.doesNotMatch(table.stdout, /Chain tension/);
});

test('CLI warnings are on stderr for table and in JSON for JSON mode', () => {
  const args = ['--pitch', '12.7', '--z1', '16', '--z2', '128', '--center', '508'];
  assert.match(cli(...args).stderr, /Warning:.*17 teeth/);
  const r = cli(...args, '--json');
  assert.equal(r.status, 0);
  assert.equal(r.stderr, '');
  assert.equal(JSON.parse(r.stdout).warnings.length, 2);
});

test('CLI help and invalid arguments', () => {
  assert.match(cli('--help').stdout, /Usage:/);
  assert.equal(cli().status, 0);
  for (const args of [
    ['--pitch', '12.7'], [...flags, '--wat'], [...flags, '--rpm'],
    [...flags, '--rpm', 'abc'], [...flags, '--rpm', 'Infinity'],
    [...flags, '--rpm', '0'], [...flags, '--power', '2'],
    [...flags, '--pitch', '10'], [...flags, '--json', '--json'],
    [...flags, 'extra'], [...flags, '--rpm', '0x10'],
  ]) {
    const r = cli(...args);
    assert.equal(r.status, 1, args.join(' '));
    assert.match(r.stderr, /Error:/);
    assert.equal(r.stdout, '');
  }
});
