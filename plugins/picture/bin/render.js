#!/usr/bin/env node
// Renders an SVG file to PNG with a locally installed Chromium browser (headless).
// usage: render.js <in.svg> [out.png] [--scale N] [--transparent]
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { pathToFileURL } = require('url');

function fail(message) {
  console.error('picture: ' + message);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = { scale: 1, transparent: false, files: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--scale') opts.scale = Number(argv[++i]);
    else if (arg === '--transparent') opts.transparent = true;
    else opts.files.push(arg);
  }
  if (!(opts.scale >= 0.25 && opts.scale <= 8)) fail('--scale must be between 0.25 and 8');
  return opts;
}

function findBrowser() {
  if (process.env.PICTURE_BROWSER) {
    if (fs.existsSync(process.env.PICTURE_BROWSER)) return process.env.PICTURE_BROWSER;
    fail('PICTURE_BROWSER points to a missing file: ' + process.env.PICTURE_BROWSER);
  }
  const candidates = [];
  if (process.platform === 'win32') {
    const roots = [process.env['PROGRAMFILES'], process.env['PROGRAMFILES(X86)'], process.env['LOCALAPPDATA']];
    for (const root of roots.filter(Boolean)) {
      candidates.push(path.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'));
      candidates.push(path.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
      candidates.push(path.join(root, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'));
      candidates.push(path.join(root, 'Chromium', 'Application', 'chrome.exe'));
    }
  } else if (process.platform === 'darwin') {
    candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    candidates.push('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
    candidates.push('/Applications/Brave Browser.app/Contents/MacOS/Brave Browser');
    candidates.push('/Applications/Chromium.app/Contents/MacOS/Chromium');
  } else {
    const names = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'brave-browser'];
    for (const dir of (process.env.PATH || '').split(path.delimiter)) {
      for (const name of names) candidates.push(path.join(dir, name));
    }
  }
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

// Pixel size from width/height, falling back to viewBox, then 1024x1024.
function svgSize(svg) {
  const root = (svg.match(/<svg\b[^>]*>/i) || [''])[0];
  const attr = (name) => {
    const match = root.match(new RegExp('\\s' + name + '\\s*=\\s*["\']\\s*([0-9.]+)(px)?\\s*["\']', 'i'));
    return match ? Number(match[1]) : null;
  };
  let width = attr('width');
  let height = attr('height');
  const viewBox = root.match(/\sviewBox\s*=\s*["']\s*[-0-9.]+[\s,]+[-0-9.]+[\s,]+([0-9.]+)[\s,]+([0-9.]+)\s*["']/i);
  if (viewBox) {
    const ratio = Number(viewBox[1]) / Number(viewBox[2]);
    if (!width && !height) { width = Number(viewBox[1]); height = Number(viewBox[2]); }
    else if (!width) width = height * ratio;
    else if (!height) height = width / ratio;
  }
  return { width: Math.round(width || 1024), height: Math.round(height || 1024) };
}

function pngSize(file) {
  const header = Buffer.alloc(24);
  const fd = fs.openSync(file, 'r');
  fs.readSync(fd, header, 0, 24, 0);
  fs.closeSync(fd);
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

const opts = parseArgs(process.argv.slice(2));
if (!opts.files.length) fail('usage: render.js <in.svg> [out.png] [--scale N] [--transparent]');

const input = path.resolve(opts.files[0]);
if (!fs.existsSync(input)) fail('file not found: ' + input);
const output = path.resolve(opts.files[1] || input.replace(/\.svg$/i, '') + '.png');

const svg = fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, '').replace(/<\?xml[^>]*\?>/i, '').replace(/<!DOCTYPE[^>]*>/i, '');
if (!/<svg\b/i.test(svg)) fail('not an SVG file: ' + input);
const size = svgSize(svg);

const browser = findBrowser();
if (!browser) {
  fail('no Chrome, Edge, Brave or Chromium found. The SVG is still valid and opens in any browser. ' +
    'Set PICTURE_BROWSER to the browser executable to enable PNG output.');
}

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'picture-'));
try {
  const page = path.join(work, 'page.html');
  fs.writeFileSync(page,
    '<!doctype html><html><head><meta charset="utf-8"><style>' +
    'html,body{margin:0;padding:0;overflow:hidden;background:transparent}' +
    'svg{display:block;width:' + size.width + 'px;height:' + size.height + 'px}' +
    '</style></head><body>' + svg + '</body></html>');

  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(work, 'profile'),
    '--force-device-scale-factor=' + opts.scale,
    '--window-size=' + size.width + ',' + size.height,
    '--screenshot=' + output,
    pathToFileURL(page).href,
  ];
  if (opts.transparent) args.splice(-1, 0, '--default-background-color=00000000');

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.rmSync(output, { force: true });
  const run = spawnSync(browser, args, { encoding: 'utf8', timeout: 60000 });
  if (!fs.existsSync(output)) {
    const lines = (run.stderr || '').trim().split(/\r?\n/).filter(Boolean);
    fail('browser produced no PNG' + (run.error ? ' (' + run.error.message + ')' : '') +
      (lines.length ? ': ' + lines[lines.length - 1] : ''));
  }
  const png = pngSize(output);
  console.log(output + '  ' + png.width + 'x' + png.height + '  ' + Math.round(fs.statSync(output).size / 1024) + ' KB');
} finally {
  try { fs.rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch (_) { /* profile still locked */ }
}
