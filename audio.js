// GOODBYE — every sound is made here: modal synthesis written into buffers (knuckles on a board, a heel through a ceiling, a stick-slip
// creak), one voice from the site, and, once recordings exist in assets/sfx/<place>/ (manifest.json), those are played in their place.
// Every sound comes from something in that kitchen: the wall clock, the wind in the siding, crickets outside, a floorboard, a latch,
// a knock, a breath, the match, the planchette on wood. There is no score: no stinger, no heartbeat. The room itself changes across the
// night (A.heat, Pierce 2026-10-04: "we need it to feel more intense as we go"): the crickets thin, the wind and the siding grow, the house
// settles more often, a low pressure comes up under everything (the kitchen's own room tone, nothing above 140 Hz of it), the clock comes
// closer; twice a night everything outside stops dead for a few seconds (A.hush). One bus feeds the master and stays at 1.
// The synthesized takes are the fallback; if they do not read as real on headphones, the next step is recorded foley (A.samples).
(function () {
  'use strict';
  const A = { ready: false };
  // Test copies (?debug or ?quiet) stay silent, including any video or audio
  // element, so a game left running in a background browser never makes noise.
  const QUIET = /[?&](debug|quiet)\b/.test(location.search);
  if (QUIET && window.HTMLMediaElement) {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { this.muted = true; return play.apply(this, arguments); };
  }
  let ctx, master, bus, verb, noiseBuf, brownBuf;
  const amb = {};
  let scrapeGain, scrapeFilter, tickTimer = null, cricketTimer = null;
  let clockOn = true;   // the wall clock (A.clock): it ticks every second until the possession stops it
  // Each place sets its room: how much wind, whether a clock ticks, crickets after the block, one extra bed.
  let placeAmb = { wind: 0.2, clock: true, crickets: true, extra: '' };
  let extra = null;

  const now = () => ctx.currentTime;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function makeNoise(seconds, brown) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return b;
  }
  function impulse(seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }
  function noiseSrc(buf, loop) {
    const s = ctx.createBufferSource();
    s.buffer = buf || noiseBuf; s.loop = !!loop;
    if (loop) s.loopStart = 0;
    return s;
  }
  function panner(x, y, z) {
    const p = ctx.createPanner();
    p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 1;
    if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; }
    else p.setPosition(x, y, z);
    return p;
  }
  // Route a node to the bus, with an optional reverb send.
  function out(node, wet) {
    node.connect(bus);
    if (wet) { const g = ctx.createGain(); g.gain.value = wet; node.connect(g); g.connect(verb); }
  }
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  // iPhones on silent mute Web Audio unless the page asks to be played like media.
  // Safari 16.4+ has audioSession; older iOS needs a silent looping <audio> started from the tap.
  function silentWav() {
    const n = 800, b = new Uint8Array(44 + n), v = new DataView(b.buffer);
    const str = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true);
    v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); str(36, 'data'); v.setUint32(40, n, true);
    b.fill(128, 44);
    let bin = ''; for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
    return 'data:audio/wav;base64,' + btoa(bin);
  }
  function playThroughSilentSwitch() {
    try { if (navigator.audioSession) { navigator.audioSession.type = 'playback'; return; } } catch (e) { /* not supported */ }
    if (!/iPad|iPhone|iPod/.test(navigator.userAgent) && !(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return;
    try {
      const el = document.createElement('audio');
      el.src = silentWav(); el.loop = true; el.setAttribute('playsinline', ''); el.setAttribute('x-webkit-airplay', 'deny');
      const p = el.play(); if (p && p.catch) p.catch(() => {});
      A.keepAlive = el;
    } catch (e) { /* stays ambient */ }
  }
  // A.prime: the context only, made on the first touch (the card before the title), so the house's recordings are decoded while they read
  // the card and the title, not after the match is struck. Nothing plays until A.init.
  A.prime = function () {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    playThroughSilentSwitch();
    makeCtx(AC);
  };
  A.init = function () {
    if (ctx && A.ready) { if (ctx.state !== 'running') ctx.resume(); return; }
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      playThroughSilentSwitch();
      makeCtx(AC);
    } else if (ctx.state !== 'running') ctx.resume();
    A.ready = true;
    applySpeaker(0);
    try { if (window.speechSynthesis) speechSynthesis.getVoices(); } catch (e) { /* no speech */ }
    startAmbience();
    startScrape();
  };
  function makeCtx(AC) {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = QUIET ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.25;
    SPK.comp = comp;
    buildSpeaker(master, comp);
    comp.connect(ctx.destination);
    try { ctx.onstatechange = () => { A.ctxState = ctx.state; if (ctx.state !== 'running' && !document.hidden) A.wake(); }; } catch (e) { /* no statechange */ }
    bus = ctx.createGain(); bus.gain.value = 1; bus.connect(master);
    verb = ctx.createConvolver(); verb.buffer = impulse(3.4, 2.4);
    const vg = ctx.createGain(); vg.gain.value = 0.5; verb.connect(vg); vg.connect(bus);
    noiseBuf = makeNoise(2, false);
    brownBuf = makeNoise(5, true);
  }
  // ---------- the phone's own speaker (2026-10-05, Pierce: the sounds were lost on a phone speaker) ----------
  // A phone's speaker cannot play the low end the house is made of (a knock under the table, a heel through a ceiling, the floor taking
  // weight are mostly under 300 Hz) and it is near enough mono. On a phone with no headphones the mix goes through a gentle speaker stage:
  // the rumble a speaker cannot move is cut (it only pumps the limiter), the low sounds are given harmonics a speaker can play (the ear
  // hears the fundamental that is not there), the middle is brought forward (presence), the two sides are folded a quarter toward each
  // other (a hard-panned sound at one ear is not lost to one tiny speaker, and nothing cancels when the sides meet), and the whole is a
  // little louder. On headphones, and on a computer, nothing changes. Which it is: a touch phone whose output has no Bluetooth latency is
  // taken to be its speaker (A.speaker(true|false) or ?speaker=1|0, and goodbye.speaker in storage, say otherwise).
  const SPK = { on: false, forced: null, direct: null, wet: null, comp: null, why: '' };
  function buildSpeaker(src, dest) {
    SPK.direct = ctx.createGain(); SPK.direct.gain.value = 1;
    SPK.wet = ctx.createGain(); SPK.wet.gain.value = 0;
    src.connect(SPK.direct); SPK.direct.connect(dest);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 110; hp.Q.value = 0.7;
    const body = ctx.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 650; body.Q.value = 0.9; body.gain.value = 2.5;
    const presence = ctx.createBiquadFilter(); presence.type = 'peaking'; presence.frequency.value = 2600; presence.Q.value = 0.8; presence.gain.value = 4.5;
    src.connect(hp); hp.connect(body); body.connect(presence);
    // the harmonics of what is below a speaker: the low end alone, driven through a soft curve, kept to the band a speaker plays
    const low = ctx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 240; low.Q.value = 0.7;
    const drive = ctx.createGain(); drive.gain.value = 3.2;
    const shape = ctx.createWaveShaper(); const n = 1024, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.tanh(2.4 * x) / Math.tanh(2.4); }
    shape.curve = curve; shape.oversample = '2x';
    const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 420; band.Q.value = 0.75;
    const ex = ctx.createGain(); ex.gain.value = 0.42;
    src.connect(low); low.connect(drive); drive.connect(shape); shape.connect(band); band.connect(ex);
    // the sides folded a quarter toward each other
    const split = ctx.createChannelSplitter(2), merge = ctx.createChannelMerger(2), mix = ctx.createGain();
    presence.connect(mix); ex.connect(mix);
    mix.connect(split);
    const lr = (a, b, k) => { const g = ctx.createGain(); g.gain.value = k; split.connect(g, a); g.connect(merge, 0, b); };
    lr(0, 0, 0.76); lr(1, 1, 0.76); lr(0, 1, 0.24); lr(1, 0, 0.24);
    const loud = ctx.createGain(); loud.gain.value = 1.22;
    merge.connect(loud); loud.connect(SPK.wet); SPK.wet.connect(dest);
  }
  function speakerGuess() {
    let forced = SPK.forced;
    if (forced == null) { const m = /[?&]speaker=([01])\b/.exec(location.search); if (m) forced = m[1] === '1'; }
    if (forced == null) { try { const v = localStorage.getItem('goodbye.speaker'); if (v === 'on' || v === 'off') forced = v === 'on'; } catch (e) { /* none kept */ } }
    if (forced != null) { SPK.why = 'set'; return forced; }
    const touch = (navigator.maxTouchPoints || 0) > 0 && !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    const small = Math.min(screen.width || 9999, screen.height || 9999) <= 900;
    if (!touch || !small) { SPK.why = 'computer'; return false; }
    const ol = ctx && typeof ctx.outputLatency === 'number' ? ctx.outputLatency : NaN;
    if (ol > 0.06) { SPK.why = 'bluetooth'; return false; }
    SPK.why = 'phone';
    return true;
  }
  function applySpeaker(tau) {
    if (!ctx || !SPK.direct) return;
    const on = speakerGuess(), t = now();
    if (on === SPK.on && tau) return;
    SPK.on = on;
    SPK.direct.gain.setTargetAtTime(on ? 0 : 1, t, tau || 0.05);
    SPK.wet.gain.setTargetAtTime(on ? 1 : 0, t, tau || 0.05);
    if (SPK.comp) { SPK.comp.threshold.setTargetAtTime(on ? -22 : -16, t, 0.1); SPK.comp.knee.setTargetAtTime(on ? 10 : 30, t, 0.1); }
  }
  A.speaker = function (on) { SPK.forced = on == null ? null : !!on; try { if (on == null) localStorage.removeItem('goodbye.speaker'); else localStorage.setItem('goodbye.speaker', on ? 'on' : 'off'); } catch (e) { /* this visit only */ } applySpeaker(0); return SPK.on; };
  A.speakerState = () => ({ on: SPK.on, why: SPK.why, outputLatency: ctx && typeof ctx.outputLatency === 'number' ? +ctx.outputLatency.toFixed(3) : null });
  // headphones in or out mid-night: looked at again (a Bluetooth pair changes the output's latency)
  setInterval(() => { if (ctx && ctx.state === 'running') applySpeaker(0.3); }, 4000);
  try { if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) navigator.mediaDevices.addEventListener('devicechange', () => setTimeout(() => applySpeaker(0.3), 600)); } catch (e) { /* no such event */ }

  // iOS suspends or interrupts the context (the phone locked, a call, another app's sound) and does not bring it back by itself: it is
  // resumed the moment the page is shown or touched again.
  A.wake = function () {
    if (!ctx || ctx.state === 'running' || ctx.state === 'closed') return;
    try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* not now */ }
  };
  ['pointerdown', 'touchend', 'keydown'].forEach((t) => addEventListener(t, () => A.wake(), { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) A.wake(); });

  let mutedNow = false;
  A.setMuted = function (m) {
    mutedNow = !!m;
    if (mutedNow && window.speechSynthesis) { try { speechSynthesis.cancel(); } catch (e) { /* nothing to stop */ } }
    if (master) master.gain.setTargetAtTime(m || QUIET ? 0 : 0.9, now(), 0.05);
  };

  // ---------- room tone ----------
  function startAmbience() {
    // wind through old siding
    const w = noiseSrc(brownBuf, true);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 0.7;
    const g = ctx.createGain(); g.gain.value = 0.22;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain(); lfoG.gain.value = 160;
    lfo.connect(lfoG); lfoG.connect(lp.frequency);
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.045;
    const lfo2G = ctx.createGain(); lfo2G.gain.value = 0.08;
    lfo2.connect(lfo2G); lfo2G.connect(g.gain);
    w.connect(lp); lp.connect(g); out(g, 0.15);
    w.start(); lfo.start(); lfo2.start();
    amb.wind = g; amb.windSwell = lfo2G;

    // crickets outside (only when the house is at peace)
    amb.crickets = ctx.createGain(); amb.crickets.gain.value = 0.0;
    out(amb.crickets, 0.2);
    cricketTimer = setInterval(() => {
      if (!A.ready || !BED.inside || bedLevels().crickets < 0.01) return;
      if (now() < BED.hushUntil || Math.random() < BED.thin) return;   // fewer of them as the night goes on; none at all in a hush
      const t = now() + rnd(0, 0.3);
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = rnd(4200, 4700);
      const g2 = ctx.createGain(); g2.gain.value = 0;
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      o.connect(g2);
      if (pan) { pan.pan.value = rnd(-0.9, 0.9); g2.connect(pan); pan.connect(amb.crickets); } else g2.connect(amb.crickets);
      for (let i = 0; i < 4; i++) {
        const s = t + i * 0.055;
        g2.gain.setValueAtTime(0, s); g2.gain.linearRampToValueAtTime(0.05, s + 0.01); g2.gain.linearRampToValueAtTime(0, s + 0.04);
      }
      o.start(t); o.stop(t + 0.3);
    }, 420);

    // the clock behind you
    amb.clock = ctx.createGain(); amb.clock.gain.value = 0.5;
    const cp = panner(-1.2, 0.3, 1.4);
    amb.clock.connect(cp); cp.connect(bus);
    const cs = ctx.createGain(); cs.gain.value = 0.25; cp.connect(cs); cs.connect(verb);
    amb.clockPan = cp; amb.clockSend = cs;
    amb.windLp = lp;
    buildExtra(placeAmb.extra);
    let tock = false;
    // A tall clock ticks once a second. The Parlor's mantel clock is smaller and quicker: two light ticks.
    const tick = (t, f, v) => {
      const s = noiseSrc(noiseBuf); const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 6;
      const g3 = ctx.createGain(); env(g3, t, 0.002, v, 0.04);
      s.connect(bp); bp.connect(g3); g3.connect(amb.clock);
      s.start(t, rnd(0, 1.5), 0.06);
    };
    tickTimer = setInterval(() => {
      if (!A.ready || !clockOn) return;
      const t = now();
      if (placeAmb.clock === 'mantel') { tick(t, 3900, 0.14); tick(t + 0.5, 3300, 0.12); }
      else tick(t, tock ? 2100 : 2600, 0.25);
      tock = !tock;
    }, 1000);
  }
  // The wall clock behind you. A.clock(false) stops it (the pendulum is still: no more ticks, nothing else changes) and A.clock(true)
  // starts it again; A.clockState() says which. It is stopped once a night, by the possession, and nobody hears it happen.
  A.clock = function (on) { clockOn = !!on; };
  A.clockState = function () { return clockOn ? 'ticking' : 'stopped'; };
  // The master bus is never touched: this is how a test reads that it never dropped.
  A.busLevel = function () { return bus ? bus.gain.value : 1; };

  // ---------- the night's heat: the room changes as the night goes on (Pierce, 2026-10-04) ----------
  // "the sounds come...then go...and maybe this isnt good enough bc we need it to feel more intense as we go". game.js keeps the night's heat
  // (G.heat, 0 to 1: the turns, the time at the table, the sounds the demon calls for, a new face on the board, the possession) and hands it
  // here once a second (A.heat). Everything moves on slow time constants, so nothing pops in or out:
  //   early   crickets (the synthesized few, clean sines), a faint wind in the siding, the wall clock behind you
  //   rising  the crickets thin (fewer chirps, quieter); the wind grows and the siding's own recording comes up under it (wind-siding-shutter,
  //           nothing above 3.2 kHz of it); the house settles more often (house-settling-groan, floorboard-creak-single, wood-ticking-cold,
  //           anywhere in the room, through its reverb); a low pressure comes up under everything, barely there (room-tone-kitchen, nothing
  //           above 140 Hz: the hiss in that file never reaches the bed); the clock comes closer (louder, nearer, drier)
  //   A.hush  everything outside stops dead (the crickets at once, the wind in half a second) for a few seconds, the clock and the house
  //           going on, and it comes back slowly, thinner. game.js calls it as the heat crosses 0.35 and 0.7.
  // The two outdoor loops that are mostly codec hiss once they are turned up (night-kansas-ambience, wind-dry-grass) are not used. The whole
  // bed stays well under the planchette and the demon's sounds: at its hottest it is a few dB over the early night's.
  const BED = { h: 0, thin: 0, hushUntil: 0, hushes: 0, inside: true, buf: {}, sidingG: null, lowG: null, nextSettle: 0, lastRoom: -99, settles: 0, lastCall: -99, loading: '' };
  const smB = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const BED_FILES = { siding: ['wind-siding-shutter-1.mp3'], low: ['room-tone-kitchen-1.mp3'], groan: ['house-settling-groan-1.mp3', 'house-settling-groan-2.mp3'],
    creak: ['floorboard-creak-single-1.mp3', 'floorboard-creak-single-2.mp3'], tick: ['wood-ticking-cold-1.mp3', 'wood-ticking-cold-2.mp3'] };
  // the levels the bed wants at this heat (outside, the house's own layers are off; in a hush, everything outside is)
  function bedLevels() {
    const h = BED.h, pa = placeAmb, windK = pa.wind == null ? 1 : pa.wind / 0.2, hushed = !!ctx && now() < BED.hushUntil, out = hushed ? 0 : 1, inn = BED.inside ? 1 : 0;
    return {
      wind: out * Math.min(0.9, (0.2 + 0.09 * smB(0.05, 0.95, h)) * windK),   // (0.2: the room's wind as it always was, early)
      swell: out * (0.06 + 0.06 * h),
      crickets: pa.crickets === false ? 0 : out * 0.3 * (1 - 0.8 * smB(0.06, 0.85, h)) * Math.pow(0.72, BED.hushes),
      siding: out * inn * 0.3 * smB(0.1, 0.9, h),
      low: inn * 0.2 * smB(0.15, 1, h),
      clock: pa.clock === false ? 0 : 0.5 + 0.34 * h,
      near: h,
    };
  }
  function applyBed(tau) {
    if (!A.ready) return;
    const t = now(), L = bedLevels();
    const set = (node, v, k) => { if (node) { node.gain.cancelScheduledValues(t); node.gain.setTargetAtTime(Math.max(0, v), t, k ?? tau); } };
    const hushed = t < BED.hushUntil;   // (a hush has the outside layers: their dead stop is not slowed down here)
    if (BED.inside && !hushed) { set(amb.wind, Math.max(0.0001, L.wind)); set(amb.windSwell, L.swell); set(amb.crickets, L.crickets); set(BED.sidingG, L.siding); }
    if (!BED.inside) set(BED.sidingG, 0);
    set(amb.clock, BED.inside ? L.clock : 0);   // (outside, before the door, the wall clock is the house's: not heard)
    set(BED.lowG, L.low);
    if (amb.windLp) amb.windLp.frequency.setTargetAtTime(380 + 160 * BED.h, t, tau);
    // the clock comes closer: from behind you and off to the left, to just behind your shoulder, and drier
    const cp = amb.clockPan, k = L.near;
    if (cp) {
      const x = -1.2 + 0.6 * k, y = 0.3 - 0.15 * k, z = 1.4 - 0.8 * k;
      if (cp.positionX) { cp.positionX.setTargetAtTime(x, t, tau); cp.positionY.setTargetAtTime(y, t, tau); cp.positionZ.setTargetAtTime(z, t, tau); } else cp.setPosition(x, y, z);
    }
    if (amb.clockSend) amb.clockSend.gain.setTargetAtTime(0.25 - 0.13 * k, t, tau);
    BED.thin = 0.78 * smB(0.06, 0.9, BED.h) + 0.12 * Math.min(2, BED.hushes) / 2;
  }
  // the house's own recordings for the bed: fetched once, after the first tap (A.samples), never waited for
  A.bedLoad = async function (dir) {
    if (!ctx || BED.loading === dir) return;
    BED.loading = dir;
    for (const [k, list] of Object.entries(BED_FILES)) {
      for (const f of list) {
        try { const r = await fetch(dir + f); if (!r.ok) continue; const b = await A.decode(await r.arrayBuffer()); if (b) (BED.buf[k] = BED.buf[k] || []).push(b); } catch (e) { /* that one is left out */ }
      }
      if (k === 'siding' || k === 'low') bedLoop(k);
    }
  };
  // a looping layer of the bed: the siding's wind (off to the window side) or the kitchen's low pressure (everywhere, under everything)
  function bedLoop(k) {
    const b = BED.buf[k] && BED.buf[k][0]; if (!b || (k === 'siding' ? BED.sidingG : BED.lowG)) return;
    const src = ctx.createBufferSource(); src.buffer = b; src.loop = true;
    const g = ctx.createGain(); g.gain.value = 0;
    if (k === 'siding') {
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 110;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; lp.Q.value = 0.5;
      const p = panner(-2.6, 0.8, -1.2);
      src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(p); out(p, 0.12);
      BED.sidingG = g;
    } else {
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 28;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 140; lp.Q.value = 0.5;
      const lp2 = ctx.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 140; lp2.Q.value = 0.5;
      // it breathes, very slowly
      const sw = ctx.createGain(); sw.gain.value = 1;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.031; const lg = ctx.createGain(); lg.gain.value = 0.3; lfo.connect(lg); lg.connect(sw.gain); lfo.start();
      src.connect(hp); hp.connect(lp); lp.connect(lp2); lp2.connect(sw); sw.connect(g); g.connect(bus);
      BED.lowG = g;
    }
    src.start(0, Math.random() * b.duration);
    applyBed(3);
  }
  // h: the night's heat, 0 to 1 (game.js, about once a second while a night is on)
  A.heat = function (h) {
    if (!A.ready) return;
    const v = Math.max(0, Math.min(1, +h || 0)), was = BED.h;
    BED.h = v; BED.lastCall = now();
    if (v < was - 0.05) { BED.hushes = 0; BED.hushUntil = 0; BED.nextSettle = 0; }   // a new night
    applyBed(4);
  };
  // Everything outside stops dead: the crickets all at once, the wind within half a second; the clock and the house go on. sec later it comes
  // back, slowly, and thinner than it was.
  A.hush = function (sec) {
    if (!A.ready) return;
    const t = now(), d = Math.max(1, +sec || 4);
    BED.hushUntil = t + d;
    if (BED.inside) {
      // held where they are this instant, then taken down in a straight line (a ramp, not a time constant: WebKit kept the crickets' earlier
      // slow approach running under a fast one). Only the crickets stop dead, the way they do when something is near; the wind and the
      // siding drop back but keep blowing (Pierce, 2026-10-05: "all the wind stops blowing like theres an error sometimes")
      [[amb.crickets, 0.35, 0], [amb.wind, 1.4, 0.45], [amb.windSwell, 1.4, 0.45], [BED.sidingG, 1.4, 0.5]].forEach(([n, d, keep]) => {
        if (!n) return;
        const p = n.gain, from = p.value;
        if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t); else { p.cancelScheduledValues(t); p.setValueAtTime(from, t); }
        p.linearRampToValueAtTime(Math.max(keep ? 0.0001 : 0, from * keep), t + d);
      });
    }
    setTimeout(() => { BED.hushes++; if (now() >= BED.hushUntil - 0.05) applyBed(2.6); }, d * 1000);
  };
  A.bedState = function () {
    const L = bedLevels();
    return { h: BED.h, hushed: !!ctx && now() < BED.hushUntil, hushes: BED.hushes, thin: +BED.thin.toFixed(3), settles: BED.settles, loaded: Object.keys(BED.buf), levels: L,
      gains: { wind: amb.wind ? amb.wind.gain.value : 0, crickets: amb.crickets ? amb.crickets.gain.value : 0, clock: amb.clock ? amb.clock.gain.value : 0, siding: BED.sidingG ? BED.sidingG.gain.value : 0, low: BED.lowG ? BED.lowG.gain.value : 0 } };
  };
  // the house settling, on its own, more often as the night goes on: never on top of one of the demon's sounds, always in the room's reverb
  function settle() {
    const kinds = [['groan', 0.25 + 0.5 * BED.h], ['creak', 0.45], ['tick', 0.4]].filter(([k]) => BED.buf[k] && BED.buf[k].length);
    const t = now(), lv = (0.2 + 0.14 * BED.h);
    const p = panner(rnd(-4, 4), rnd(0, 2.6), rnd(-3, 3.5));
    if (kinds.length) {
      let r = Math.random() * kinds.reduce((a, [, w]) => a + w, 0), kind = kinds[0][0];
      for (const [k, w] of kinds) { if ((r -= w) <= 0) { kind = k; break; } }
      const list = BED.buf[kind];
      playTake(list[Math.floor(Math.random() * list.length)], p, t, lv * (kind === 'tick' ? 1.3 : 1), rnd(0.94, 1.04));
    } else playTake(take('creak', () => boardCreak(false)), p, t, lv * 0.8, rnd(0.9, 1.1));
    out(p, 0.5);
    BED.settles++;
  }
  setInterval(() => {
    if (!A.ready || !ctx || ctx.state !== 'running' || !BED.inside) return;
    const t = now();
    if (t - BED.lastCall > 3) return;   // only while a night is on (game.js is handing it the heat)
    if (!BED.nextSettle) { BED.nextSettle = t + rnd(25, 60); return; }
    if (t < BED.nextSettle) return;
    if (t - BED.lastRoom < 5) { BED.nextSettle = t + rnd(3, 6); return; }   // the demon's sound, or the house's, just played: let it ring out
    settle();
    BED.nextSettle = t + (70 - 56 * smB(0, 1, BED.h)) * rnd(0.7, 1.3);
  }, 500);

  // ---------- the planchette on wood ----------
  function startScrape() {
    const s = noiseSrc(noiseBuf, true);
    scrapeFilter = ctx.createBiquadFilter(); scrapeFilter.type = 'bandpass'; scrapeFilter.frequency.value = 700; scrapeFilter.Q.value = 1.4;
    scrapeGain = ctx.createGain(); scrapeGain.gain.value = 0;
    s.connect(scrapeFilter); scrapeFilter.connect(scrapeGain); out(scrapeGain, 0.05);
    s.start();
  }
  // speed: how fast the wood is travelling on the board (game.js measures where it actually goes, so a shake in place is silent).
  // A.scrapeLevel: the level it was last set to (0 to 1), for a test to read beside the planchette's position.
  // heavy (0 to 1): something is dragging it, slowly and against its will (the possession): a slow drag is heard as a heavy one, lower.
  A.scrapeLevel = 0;
  A.scrape = function (speed, heavy) {
    if (!A.ready) return;
    const h = Math.max(0, Math.min(1, heavy || 0));
    const raw = Math.min((speed * (1 + 2 * h)) / 1400, 1);
    // wood creeping slower than about 80 px a second on the board makes no sound (and neither does a shake that goes nowhere)
    const v = raw < 0.04 ? 0 : raw;
    A.scrapeLevel = v;
    scrapeGain.gain.setTargetAtTime(v * v * 0.32, now(), 0.04);
    scrapeFilter.frequency.setTargetAtTime((420 + v * 900) * (1 - 0.35 * h), now(), 0.06);
  };

  // The Cottage's glass on slate: a small bright clink instead of the wooden tock.
  A.clink = function (hard) {
    if (!A.ready) return;
    const t = now();
    [[2480, 0.09], [3910, 0.05], [5260, 0.025]].forEach(([f, v]) => {
      const o = ctx.createOscillator(); o.frequency.value = f * rnd(0.98, 1.02);
      const g = ctx.createGain(); env(g, t, 0.002, v * (hard ? 1.6 : 1), hard ? 0.18 : 0.28);
      o.connect(g); out(g, 0.25); o.start(t); o.stop(t + 0.4);
    });
    const s = noiseSrc(); const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
    const g2 = ctx.createGain(); env(g2, t, 0.001, hard ? 0.3 : 0.16, 0.02);
    s.connect(hp); hp.connect(g2); out(g2, 0.1); s.start(t, rnd(0, 1.5), 0.05);
  };
  // A knuckle on the slate: the player's own tap, close and dry.
  A.tap = function () {
    if (!A.ready) return;
    const t = now();
    const s = noiseSrc(); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    const g = ctx.createGain(); env(g, t, 0.001, 0.45, 0.05);
    s.connect(lp); lp.connect(g); out(g, 0.05); s.start(t, rnd(0, 1.5), 0.08);
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.06);
    const g2 = ctx.createGain(); env(g2, t, 0.002, 0.3, 0.07);
    o.connect(g2); out(g2, 0.05); o.start(t); o.stop(t + 0.12);
  };

  // A 1970s phone upstairs: two bells struck twenty times a second, two seconds on, four off.
  // Muffled by the floor, up and behind you. rings = how many; Infinity rings until phoneStop().
  let phoneT = null, phoneLeft = 0;
  function ringOnce() {
    const t = now(), dur = 2;
    const p = panner(rnd(0.4, 1.2), 2.4, 2.6);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    lp.connect(g); g.connect(p); out(p, 0.35);
    [1080, 1370, 2160, 2740].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = i < 2 ? 'triangle' : 'sine'; o.frequency.value = f;
      const og = ctx.createGain(); og.gain.value = [0.5, 0.42, 0.14, 0.1][i];
      o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + 0.3);
    });
    for (let k = 0; k < dur * 20; k++) {
      const s = t + k / 20;
      g.gain.setValueAtTime(0.16, s); g.gain.exponentialRampToValueAtTime(0.03, s + 0.045);
    }
    g.gain.setValueAtTime(0.03, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
  }
  A.phone = function (rings) {
    if (!A.ready) return;
    A.phoneStop();
    phoneLeft = rings || 1;
    const go = () => { if (phoneLeft-- <= 0) { A.phoneStop(); return; } ringOnce(); };
    go(); phoneT = setInterval(go, 6000);
  };
  A.phoneStop = function () { clearInterval(phoneT); phoneT = null; phoneLeft = 0; };

  // A pen line through the words.
  A.scratch = function () {
    if (!A.ready) return;
    const t = now();
    const s = noiseSrc(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.5;
    bp.frequency.setValueAtTime(2600, t); bp.frequency.linearRampToValueAtTime(4200, t + 0.16);
    const g = ctx.createGain(); env(g, t, 0.02, 0.18, 0.16);
    s.connect(bp); bp.connect(g); out(g, 0.3); s.start(t, rnd(0, 1.5), 0.3);
  };

  // A letter lands: a small wooden tock.
  A.tock = function (hard) {
    if (!A.ready) return;
    const t = now();
    const s = noiseSrc(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = hard ? 900 : 1500; bp.Q.value = 3;
    const g = ctx.createGain(); env(g, t, 0.002, hard ? 0.7 : 0.35, 0.07);
    s.connect(bp); bp.connect(g); out(g, 0.2); s.start(t, rnd(0, 1.5), 0.12);
    const o = ctx.createOscillator(); o.frequency.value = hard ? 120 : 210;
    const g2 = ctx.createGain(); env(g2, t, 0.003, hard ? 0.5 : 0.22, 0.09);
    o.connect(g2); out(g2, 0.1); o.start(t); o.stop(t + 0.2);
  };

  // ---------- takes: the room's sounds, written into buffers by modal synthesis ----------
  // A knuckle on a board is a click and a few damped resonances of the wood (a sine that falls in pitch is a kick drum). A footstep heard
  // through a ceiling is what is left of a heel: the joists ringing low, and a little dust coming down. A creak is a stick-slip: a train of
  // tiny pulses whose rate glides, each one ringing a resonance of the board. Each is rendered into a buffer (three variations of each, once,
  // the first time it is needed) and played through the room's panner. If there are recordings (assets/sfx/<place>/, named in its
  // manifest.json: A.samples) one of those is played instead; these are the fallback.
  const TAKES = {}, SAMPLES = {};
  const rn = () => Math.random() * 2 - 1;
  function render(sec, fn) {
    const sr = ctx.sampleRate, b = ctx.createBuffer(1, Math.max(1, Math.floor(sec * sr)), sr), d = b.getChannelData(0);
    fn(d, sr);
    let pk = 0; for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > pk) pk = a; }
    const g = pk > 0 ? 0.9 / pk : 1; for (let i = 0; i < d.length; i++) d[i] *= g;
    const f = Math.min(d.length, Math.floor(0.01 * sr)); for (let i = 0; i < f; i++) d[d.length - 1 - i] *= i / f;   // no click at the end
    return b;
  }
  // damped sines, [frequency, seconds to fall 60 dB, amplitude], from `at` seconds
  function modes(d, sr, at, list, gain) {
    const i0 = Math.floor(at * sr);
    for (const [f, t60, amp] of list) {
      const w = (2 * Math.PI * f) / sr, k = Math.exp(-6.9078 / (t60 * sr)), ph = Math.random() * 0.5, n = Math.min(d.length - i0, Math.floor(t60 * 1.2 * sr));
      let a = amp * gain;
      for (let i = 0; i < n; i++) { d[i0 + i] += a * Math.sin(w * i + ph); a *= k; }
    }
  }
  // a burst of noise that dies fast (a knuckle, a heel, a grain of dust): hp 0 is dull, near 1 is bright
  function click(d, sr, at, amp, ms, hp) {
    const i0 = Math.floor(at * sr), n = Math.floor((ms / 1000) * sr); let prev = 0;
    for (let i = 0; i < n && i0 + i < d.length; i++) { const x = rn(); const y = x - prev * hp; prev = x; d[i0 + i] += amp * y * Math.pow(1 - i / n, 3); }
  }
  // stick-slip: pulses at a gliding rate (r0 to r1 a second), each ringing a resonance near fc for t60 seconds; swelling and falling away
  function stick(d, sr, at, dur, r0, r1, fc, t60, amp, jitter) {
    let t = at;
    while (t < at + dur) {
      const u = (t - at) / dur, rate = r0 + (r1 - r0) * u, a = amp * Math.pow(Math.sin(Math.PI * u), 0.8) * (0.3 + 0.7 * Math.random());
      modes(d, sr, t, [[fc * (0.9 + 0.2 * Math.random()), t60, a], [fc * 2.07, t60 * 0.6, a * 0.4], [fc * 0.5, t60 * 1.4, a * 0.3]], 1);
      t += (1 / rate) * (1 + jitter * rn());
    }
  }
  A.recorded = 0;   // how many times a recorded take was played in place of a synthesized one (a test's look)
  const ALIAS = { 'knock-under': 'knock', 'creak-low': 'creak' };   // a recorded knock does for a knock under the table too
  const take = (kind, make) => {
    const rec = SAMPLES[kind] && SAMPLES[kind].length ? SAMPLES[kind] : SAMPLES[ALIAS[kind]];
    if (rec && rec.length) { A.recorded++; return rec[Math.floor(Math.random() * rec.length)]; }
    const l = TAKES[kind] || (TAKES[kind] = []);
    if (l.length < 3) l.push(make());
    return l[Math.floor(Math.random() * l.length)];
  };
  function playTake(buf, node, t, v, rate) {
    const src = ctx.createBufferSource(); src.buffer = buf; if (rate) src.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = v == null ? 1 : v;
    src.connect(g); g.connect(node); src.start(t);
    return buf.duration / (rate || 1);
  }
  const knuckle = (hard) => render(0.7, (d, sr) => {
    const f = rnd(hard ? 92 : 118, hard ? 140 : 178), s = rnd(0.95, 1.05);
    click(d, sr, 0.002, hard ? 0.7 : 0.5, 5, 0.85);
    modes(d, sr, 0.002, [[f * s, rnd(0.18, 0.3), 1], [f * 2.31 * s, 0.13, 0.55], [f * 3.74 * s, 0.09, 0.32], [f * 5.4 * s, 0.06, 0.18], [f * 0.63, 0.12, 0.5]], 0.7);
  });
  const heel = (heavy) => render(1.1, (d, sr) => {
    const k = heavy ? 1 : 0.8;
    click(d, sr, 0.002, 0.3 * k, 9, 0.2);
    modes(d, sr, 0.002, [[rnd(68, 94), 0.32, 1], [rnd(118, 158), 0.24, 0.7], [rnd(185, 255), 0.16, 0.4], [rnd(310, 420), 0.1, 0.2]], k);
    for (let i = 0, n = 5 + Math.floor(Math.random() * 5); i < n; i++) click(d, sr, 0.03 + Math.random() * 0.2, 0.012 + Math.random() * 0.03, 3, 0.5);   // dust off the plaster
    // the toe, a beat after the heel
    click(d, sr, 0.17, 0.12 * k, 7, 0.25);
    modes(d, sr, 0.17, [[rnd(80, 110), 0.2, 0.5], [rnd(150, 200), 0.14, 0.3]], k);
  });
  const boardCreak = (low) => render(low ? 1.5 : 1.1, (d, sr) => {
    const dur = low ? rnd(0.9, 1.3) : rnd(0.5, 0.9), r0 = low ? rnd(12, 20) : rnd(48, 80);
    stick(d, sr, 0.05, dur, r0, r0 * rnd(0.4, 0.7), low ? rnd(150, 240) : rnd(520, 900), low ? 0.05 : 0.012, 1, low ? 0.3 : 0.25);
  });
  const groan = () => render(3.2, (d, sr) => {
    stick(d, sr, 0.05, 2.7, 9, 6, rnd(150, 190), 0.06, 1, 0.35);
    stick(d, sr, 0.35, 2.2, 14, 8, rnd(230, 290), 0.04, 0.55, 0.4);
  });
  const joist = () => render(1.4, (d, sr) => {   // a board taking weight: the thud and the slip together
    click(d, sr, 0.01, 0.25, 12, 0.1);
    modes(d, sr, 0.01, [[rnd(60, 80), 0.35, 1], [rnd(100, 130), 0.25, 0.6]], 1);
    stick(d, sr, 0.06, rnd(0.6, 0.9), rnd(14, 22), rnd(6, 10), rnd(160, 230), 0.05, 0.6, 0.35);
  });
  const windowTick = () => render(0.12, (d, sr) => { modes(d, sr, 0.001, [[rnd(3800, 4600), 0.02, 1], [rnd(5400, 6200), 0.012, 0.4]], 1); click(d, sr, 0.001, 0.3, 2, 0.9); });

  // The synthesized takes the taking and the house lean on, rendered ahead (three of each, one every few frames) so none is made for the
  // first time in the middle of the taking (game.js warmTaking).
  A.warm = function () {
    if (!ctx) return;
    const jobs = [['knock-under', () => knuckle(true)], ['knock', () => knuckle(false)], ['creak', () => boardCreak(false)], ['floor', joist], ['house', groan], ['tick', windowTick]];
    const list = [];
    for (const [k, make] of jobs) for (let i = 0; i < 3; i++) list.push([k, make]);
    const step = () => {
      const job = list.shift(); if (!job) return;
      const l = TAKES[job[0]] || (TAKES[job[0]] = []);
      if (l.length < 3) { try { l.push(job[1]()); } catch (e) { /* made when it is needed */ } }
      setTimeout(step, 60);
    };
    step();
  };
  // (a test's look at what is rendered: GOODBYE's ?debug page only)
  A.debugTake = function (kind) {
    if (!ctx) return null;
    const f = { knock: () => knuckle(false), under: () => knuckle(true), heel: () => heel(true), creak: () => boardCreak(false), low: () => boardCreak(true), groan, joist, tick: windowTick }[kind];
    const b = f ? f() : null;
    return b ? { sr: b.sampleRate, data: Array.from(b.getChannelData(0)) } : null;
  };
  // Recorded takes, when there are any: assets/sfx/<place>/manifest.json is { steps: [file...], knock: [...], creak: [...], floor: [...],
  // house: [...], latch: [...], breath: [...], scratch: [...], and one list for each sound the demon may ask for (knocks, light, near, stairs, door,
  // shut, chair, thud, nails, drag, gasp, rattle, glass, chime) and for the match, the snuff and the slam }. One file is one whole sound (steps: a walk
  // across a ceiling heard from below, about six seconds; knock: one knock; floor: boards taking weight; house: one groan). The manifest is always
  // there, so nothing 404s while it is empty. They are fetched six at a time and never waited for: a take that has not arrived is a synthesized one.
  const RAW = {};   // bytes fetched before the first tap (A.prefetch), until A.samples decodes them
  A.prefetch = async function (dir, kinds) {
    try {
      const r = await fetch(dir + 'manifest.json', { cache: 'no-store' }); if (!r.ok) return;
      const m = await r.json();
      for (const k of kinds || []) {
        if (SAMPLES[k] && SAMPLES[k].length) continue;
        for (const f of (Array.isArray(m[k]) ? m[k] : []).slice(0, 6)) {
          if (typeof f !== 'string' || !/^[\w.\-]+$/.test(f) || RAW[dir + f]) continue;
          const rr = await fetch(dir + f); if (rr.ok) RAW[dir + f] = await rr.arrayBuffer();
        }
      }
    } catch (e) { /* none: nothing is ready early */ }
  };
  A.samples = async function (dir) {
    if (!ctx || A.samplesFrom === dir) return 0;
    A.bedLoad(dir);   // the bed's own recordings (the siding, the kitchen's low tone, the house settling): not counted as takes
    A.samplesFrom = dir; let n = 0;
    try {
      const r = await fetch(dir + 'manifest.json', { cache: 'no-store' }); if (!r.ok) return 0;
      const m = await r.json();
      const jobs = [];
      for (const k of Object.keys(m || {})) {
        if (!Array.isArray(m[k])) continue;
        for (const f of m[k].slice(0, 6)) if (typeof f === 'string' && /^[\w.\-]+$/.test(f)) jobs.push([k, f]);
      }
      // (2026-10-05, Pierce: "maybe finding sounds were taking too long") In the order they are needed: the match on the title; the
      // pondering (every move); the first take of each sound the house and the taking use early (a knock, a creak, the floor, the latch,
      // the frame, a breath, the slam, the snuff); then everything else. The early ones go six at a time; the rest two at a time, so the
      // films and the flames are never starved while the night begins. A kind's first take comes before any kind's second.
      const FIRST = ['match', 'ponder', 'knock', 'creak', 'floor', 'latch', 'house', 'breath', 'slam', 'snuff', 'knocks', 'steps', 'whisper', 'shh', 'near', 'gasp', 'hum', 'drag', 'rattle'];
      const rank = (k) => { const i = FIRST.indexOf(k); return i < 0 ? FIRST.length : i; };
      const nth = {};
      for (const j of jobs) { nth[j[0]] = (nth[j[0]] || 0) + 1; j.push(nth[j[0]]); }
      jobs.sort((x, y) => (x[0] === 'match' ? -1 : 0) - (y[0] === 'match' ? -1 : 0) || (x[2] > 1) - (y[2] > 1) || rank(x[0]) - rank(y[0]) || x[2] - y[2]);
      const early = jobs.filter((j) => j[0] === 'match' || (rank(j[0]) < FIRST.length && j[2] <= 2)), later = jobs.filter((j) => early.indexOf(j) < 0);
      const run = async (list, width) => {
        let next = 0;
        const worker = async () => {
          while (next < list.length) {
            const [k, f] = list[next++];
            try {
              let ab = RAW[dir + f];
              if (ab) delete RAW[dir + f]; else { const rr = await fetch(dir + f); if (!rr.ok) continue; ab = await rr.arrayBuffer(); }
              const b = await A.decode(ab); if (!b) continue;
              (SAMPLES[k] = SAMPLES[k] || []).push(b); n++;
            } catch (e) { /* that one take is skipped */ }
          }
        };
        await Promise.all(Array.from({ length: Math.min(width, list.length) }, worker));
      };
      await run(early, 6);
      A.samplesEarly = true;
      await run(later, 2);
      A.samplesAll = true;
    } catch (e) { /* none: the synthesized takes stand */ }
    return n;
  };
  // Resolves when there is a recording of this kind, or after ms (a take that has not arrived is a synthesized one).
  A.sampleReady = (kind, ms) => new Promise((res) => {
    const t0 = performance.now();
    const tick = () => { if ((SAMPLES[kind] && SAMPLES[kind].length) || performance.now() - t0 >= (ms || 500)) res(); else setTimeout(tick, 25); };
    tick();
  });
  A.sampleCount = () => Object.keys(SAMPLES).reduce((a, k) => a + SAMPLES[k].length, 0);
  // One recorded take of this kind, played through a panner placed where it should be heard: 'under' (under the table), 'above' (the ceiling),
  // 'behind' (close behind the listener), 'left' or 'right' (off to that side); anything else is on the table itself. The room bus and the
  // panner conventions are A.knock's and A.steps'. Returns how long it plays, or 0 when there is no recording of that kind (the caller then
  // plays a synthesized sound in its place).
  // where may also be a place close to them, { x, y, z } in metres from their head (the listener faces -z; +z is behind them), with
  // wet (how much of the room's tail) and cut (a lowpass, for a sound inside a wall): it is then heard through spot() (HRTF, true
  // distance, the first reflections). Every recorded sound of the demon's own goes through here: the one behind them (A.behind), at an
  // ear (A.ear), on the glass in their hand (A.glass), inside the wall (A.wall), the pondering (A.ponder).
  A.rec = function (kind, where, vol) {
    if (!A.ready) return 0;
    const list = SAMPLES[kind]; if (!list || !list.length) return 0;
    if (where && typeof where === 'object') {
      A.recorded++;
      const buf = where.take || list[Math.floor(Math.random() * list.length)];
      return playAt(buf, spot(where.x, where.y, where.z, { kind, vol: vol == null ? 0.8 : vol, wet: where.wet, cut: where.cut }), 1, where.rate || rnd(0.98, 1.02), where.keep);
    }
    const p = where === 'under' ? panner(rnd(-0.3, 0.3), -0.9, -0.7)
      : where === 'above' ? panner(rnd(-2.2, 2.2), 2.6, -0.8)
      : where === 'behind' ? panner(rnd(-0.5, 0.5), 0, 0.5)
      : where === 'left' ? panner(-3, 0.6, rnd(-1.5, 0.5))
      : where === 'right' ? panner(3, 0.6, rnd(-1.5, 0.5))
      : panner(0, -0.2, -0.3);
    const len = playTake(take(kind), p, now(), vol == null ? 0.8 : vol, rnd(0.97, 1.03));
    if (where === 'under') lout(p, 0.45); else out(p, where === 'above' ? 0.45 : 0.3);
    return len;
  };

  // ---------- close to them: the one behind them, their ears, the light in their hand, inside the wall ----------
  // The listener sits at the origin facing -z (Web Audio's own): +z is behind them, x is left (-) and right (+), y is up. A sound put
  // here is heard the way a sound in a real room is heard: through HRTF (the head's own filtering, so behind is behind and an ear is
  // an ear), as loud as its distance makes it (6 dB quieter for every doubling of distance, the panner's own rolloff off), with the
  // first reflections off the floor, the wall behind them and the nearer side wall arriving just after it (each delayed by the
  // extra path, quieter, darker, and from where its wall would send it), and with more of the room's tail the farther off it is.
  // At the ear it is dry, loud and full in the low end; across the room it is small and mostly room. A.spotLog: what was placed (a
  // test's look).
  const WALLS = { floor: -1.15, back: 6.2, side: 2.6 };   // metres from their head: the floor, the kitchen wall behind them, the side walls
  A.spotLog = [];
  function spot(x, y, z, o) {
    o = o || {};
    const d = Math.max(0.06, Math.hypot(x, y, z));
    const input = ctx.createGain();
    // the direct sound: the low end of something at the ear, the air's dulling of something far, the head, the distance
    const shelf = ctx.createBiquadFilter(); shelf.type = 'lowshelf'; shelf.frequency.value = 200; shelf.gain.value = Math.max(0, Math.min(6, (0.5 - d) * 14));
    const air = ctx.createBiquadFilter(); air.type = 'lowpass'; air.frequency.value = o.cut || Math.max(5000, 16000 - 1600 * d);
    const p = panner(x, y, z); p.rolloffFactor = 0;
    const g = ctx.createGain(); g.gain.value = (o.vol == null ? 0.8 : o.vol) * Math.min(2.2, 0.5 / d);
    input.connect(shelf); shelf.connect(air); air.connect(p); p.connect(g); g.connect(bus);
    // the first reflections: the floor, the wall behind them, the nearer side wall
    const images = [[x, 2 * WALLS.floor - y, z], [x, y, 2 * WALLS.back - z], [x >= 0 ? 2 * WALLS.side - x : -2 * WALLS.side - x, y, z]];
    const refl = [];
    for (const [ix, iy, iz] of images) {
      const di = Math.hypot(ix, iy, iz), dt = (di - d) / 343, k = 0.55 * d / di;
      if (k < 0.004) continue;
      const dl = ctx.createDelay(0.1); dl.delayTime.value = Math.min(0.099, dt);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
      const rp = panner(ix, iy, iz); rp.rolloffFactor = 0;
      const rg = ctx.createGain(); rg.gain.value = g.gain.value * k;
      input.connect(dl); dl.connect(lp); lp.connect(rp); rp.connect(rg); rg.connect(bus);
      refl.push({ ms: +(dt * 1000).toFixed(1), k: +k.toFixed(3) });
    }
    // the room's tail: more of it the farther away
    const wet = ctx.createGain(); wet.gain.value = o.wet != null ? o.wet : Math.max(0.01, Math.min(0.4, 0.06 * d));
    g.connect(wet); wet.connect(verb);
    A.spotLog.push({ kind: o.kind || '', x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2), d: +d.toFixed(2), gain: +g.gain.value.toFixed(3), wet: +wet.gain.value.toFixed(3), refl });
    if (A.spotLog.length > 200) A.spotLog.shift();
    return input;
  }
  function playAt(buf, node, vol, rate, keep) {
    const src = ctx.createBufferSource(); src.buffer = buf; if (rate) src.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = vol == null ? 1 : vol;
    src.connect(g); g.connect(node); src.start(now());
    if (keep) keep({ src, g });
    return buf.duration / (rate || 1);
  }
  // The one behind them (the night's arc, game.js NIGHT.behind): 0 across the room, 1 by the door, 2 an arm's length, 3 at their ear.
  // It only comes closer: each time it is heard at a level it is a little nearer the next (never all the way). side: -1 their left,
  // 1 their right (one side a night, so it stands somewhere). A recorded take of kind, or 0 (the caller then plays what it has).
  const BEHIND = [[1.8, 0.1, 5.2], [1.15, 0.05, 3.0], [0.35, 0, 0.75], [0.12, 0.02, 0.06]];
  A.behindAt = function (level, step, side) {
    const L = Math.max(0, Math.min(3, level | 0)), s = side < 0 ? -1 : 1;
    const a = BEHIND[L], b = L < 3 ? BEHIND[L + 1] : [0.08, 0.02, 0.03];
    const f = 0.35 * (1 - Math.pow(0.7, Math.max(0, step || 0)));
    return [s * (a[0] + (b[0] - a[0]) * f), a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  };
  A.behind = function (kind, level, step, side, vol) {
    const [x, y, z] = A.behindAt(level, step, side);
    return A.rec(kind, { x, y, z }, vol == null ? 0.8 : vol);
  };
  // Right at one ear (side 'left' or 'right'): a recorded take of kind, or 0.
  const EAR = (side) => [side === 'right' ? 0.1 : -0.1, 0.01, 0.025];
  A.ear = function (kind, side, vol) {
    const [x, y, z] = EAR(side);
    return A.rec(kind, { x, y, z, wet: 0.015 }, vol == null ? 0.55 : vol);
  };
  // The demon's own words at one ear (the site's whisper, decoded): dry with a touch of the room, a little low end cut (a whisper has
  // none, and the shelf at the ear would only bring up the noise). Returns how long it plays, or 0.
  A.earVoice = function (buf, side, vol) {
    if (!A.ready || !buf || mutedNow) return 0;
    if (ctx.state !== 'running') ctx.resume();
    const [x, y, z] = EAR(side);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 140;
    hp.connect(spot(x, y, z, { kind: 'voice', vol: (vol == null ? 0.7 : vol) * (SPK.on ? 1.35 : 1), wet: 0.03 }));
    A.voices++;
    return playAt(buf, hp, 1);
  };
  // The light in their hand: a fingernail on its glass, close, in front of them and a little below. A take of kind, or 0.
  A.glass = function (kind, vol) {
    return A.rec(kind, { x: 0, y: -0.32, z: -0.34, wet: 0.01, rate: 1 }, vol == null ? 0.5 : vol);
  };
  // Inside the wall beside them (side 'left' or 'right'): muffled by the plaster. A take of kind, or 0.
  A.wall = function (kind, side, vol) {
    return A.rec(kind, { x: side === 'right' ? 2.4 : -2.4, y: 0.3, z: -0.3, cut: 900, wet: 0.2, rate: 1 }, vol == null ? 0.9 : vol);
  };
  // The pondering (game.js, while a move is out at the site): one low take of the "ponder" recordings, close at one ear or behind them,
  // quiet, never the same take twice in a row. Returns how long it plays, or 0 (none recorded yet: silence). A.ponderHush lets any still
  // sounding go in a sixth of a second (the reply is here, and its own sounds land on their own beats).
  const PONDER = { last: -1, live: [] };
  A.ponder = function (where, vol) {
    if (!A.ready) return 0;
    const list = SAMPLES.ponder; if (!list || !list.length) return 0;
    let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === PONDER.last) i = (i + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
    PONDER.last = i;
    const s = Math.random() < 0.5 ? -1 : 1;
    const at = where === 'close' ? { x: s * 0.2, y: -0.02, z: 0.12, wet: 0.02 } : { x: s * 0.35, y: 0.05, z: 0.8, wet: 0.06 };
    const n = A.rec('ponder', Object.assign(at, { take: list[i], keep: (h) => { PONDER.live.push(h); if (PONDER.live.length > 6) PONDER.live.shift(); } }), vol == null ? 0.35 : vol);
    A.ponderLog.push({ where, i, n: +n.toFixed(2) }); if (A.ponderLog.length > 100) A.ponderLog.shift();
    return n;
  };
  A.ponderLog = [];
  A.ponderHush = function () {
    if (!ctx) return;
    const t = now();
    for (const h of PONDER.live.splice(0)) { try { h.g.gain.cancelScheduledValues(t); h.g.gain.setTargetAtTime(0, t, 0.05); h.src.stop(t + 0.25); } catch (e) { /* gone */ } }
  };
  // Whether there is a recording of this kind yet (a sound file that has not arrived is a sound that does not play).
  A.has = (kind) => !!(SAMPLES[kind] && SAMPLES[kind].length);

  // Something knocks inside the walls. z > 0 is behind you; y below zero is under the floor, under the table (the `under` event:
  // A.knock(2, 0, -0.9, -0.8), two hard knocks from right under the phone).
  A.knock = function (n, x, z, y) {
    if (!A.ready) return;
    const under = y != null && y < 0;
    const p = panner(x ?? rnd(-3, 3), y != null ? y : (z != null ? 0.3 : 1.5), z ?? rnd(-2, 3));
    out(p, 0.6);
    let t = now();
    for (let i = 0; i < (n || 2); i++) {
      playTake(take(under ? 'knock-under' : 'knock', () => knuckle(under)), p, t, rnd(0.8, 1), rnd(0.96, 1.04));
      t += i < (n || 2) - 1 ? rnd(0.24, 0.42) : 0;
    }
  };

  // The house settling. A long floorboard groan somewhere you can't see.
  A.creak = function () {
    if (!A.ready) return;
    const p = panner(rnd(-4, 4), rnd(0, 3), rnd(-3, 4));
    playTake(take('creak', () => boardCreak(false)), p, now(), rnd(0.14, 0.22), rnd(0.9, 1.1));
    out(p, 0.5);
  };

  // A whisper that moves behind your head. Best on headphones.
  A.whisper = function (side) {
    if (!A.ready) return;
    const t = now(); const d = rnd(1.1, 1.8);
    const s = noiseSrc(noiseBuf, true);
    const p = panner(side === 'right' ? 1.2 : -1.2, 0.1, 0.6);
    const g = ctx.createGain(); g.gain.value = 0;
    [[650, 6], [1150, 7], [2500, 8], [3400, 9]].forEach(([f, q], i) => {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * rnd(0.9, 1.15); bp.Q.value = q;
      const fg = ctx.createGain(); fg.gain.value = [0.9, 0.7, 0.45, 0.3][i];
      s.connect(bp); bp.connect(fg); fg.connect(g);
    });
    // syllables
    let tt = t;
    while (tt < t + d) {
      const syl = rnd(0.07, 0.16);
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.linearRampToValueAtTime(rnd(0.25, 0.6), tt + syl * 0.3);
      g.gain.linearRampToValueAtTime(0.0001, tt + syl);
      tt += syl + rnd(0.01, 0.08);
    }
    g.connect(p); out(p, 0.35);
    // drift around behind you
    if (p.positionX) {
      p.positionX.linearRampToValueAtTime(side === 'right' ? -0.6 : 0.6, t + d);
      p.positionZ.linearRampToValueAtTime(1.2, t + d);
    }
    s.start(t, rnd(0, 1)); s.stop(t + d + 0.1);
  };

  // Match strike: scratch, flare, settle.
  A.strike = function () {
    if (!A.ready) return;
    const t = now();
    if (SAMPLES.match && SAMPLES.match.length) { const g = ctx.createGain(); playTake(take('match'), g, t, 0.9, 1); out(g, 0.2); return; }   // a recorded strike and flare
    const s = noiseSrc(); const hp = ctx.createBiquadFilter(); hp.type = 'highpass';
    hp.frequency.setValueAtTime(1200, t); hp.frequency.linearRampToValueAtTime(5200, t + 0.18);
    const g = ctx.createGain(); env(g, t, 0.01, 0.7, 0.2);
    s.connect(hp); hp.connect(g); out(g, 0.2); s.start(t, 0, 0.3);
    const f = noiseSrc(brownBuf); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const g2 = ctx.createGain(); env(g2, t + 0.15, 0.08, 0.6, 0.9);
    f.connect(lp); lp.connect(g2); out(g2, 0.3); f.start(t + 0.15, 0, 1.2);
  };

  // Ember crackle while letters scorch.
  A.crackle = function (dur) {
    if (!A.ready) return;
    const t0 = now();
    for (let i = 0; i < dur * 22; i++) {
      const t = t0 + Math.random() * dur;
      const s = noiseSrc(); const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = rnd(2000, 6000);
      const g = ctx.createGain(); env(g, t, 0.001, rnd(0.05, 0.25), 0.015);
      s.connect(hp); hp.connect(g); out(g, 0.1); s.start(t, rnd(0, 1.8), 0.03);
    }
  };

  // Someone breathing close to your ear. 'under': slow and low, centred, from under the table (one long breath in, one out).
  A.breath = function (side) {
    if (!A.ready) return;
    const t = now(), under = side === 'under';
    const p = under ? panner(0, -0.9, -0.7) : panner(side === 'right' ? 0.5 : -0.5, 0, 0.25);
    if (SAMPLES.breath && SAMPLES.breath.length) { playTake(take('breath'), p, t, under ? 0.7 : 0.5, under ? 0.85 : 1); if (under) lout(p, 0.25); else out(p, 0.1); return; }
    (under ? [[0, 2.1, 0.3], [2.5, 2.6, 0.26]] : [[0, 1.1, 0.35], [1.3, 1.4, 0.28]]).forEach(([off, d, v]) => {
      const s = noiseSrc(noiseBuf, true); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = under ? (off ? 340 : 480) : (off ? 520 : 760); bp.Q.value = under ? 1.2 : 1.6;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t + off); g.gain.linearRampToValueAtTime(v, t + off + d * 0.45); g.gain.linearRampToValueAtTime(0.0001, t + off + d);
      s.connect(bp); bp.connect(g); g.connect(p); s.start(t + off, rnd(0, 1)); s.stop(t + off + d + 0.05);
    });
    if (under) lout(p, 0.25); else out(p, 0.1);
  };

  // ---------- the room: what the house itself does ----------
  // The possession is a room filling up with sound. Everything it does goes through one layer gain (a fresh one after each stop),
  // so the layers can fade out together over six seconds, nothing cut (A.fadeLayers), or stop at once when somebody holds a candle
  // (A.stopLayers). The wall clock and the standing bed are not in it: they are the room.
  let layer = null;
  function layerBus() {
    if (!layer) {
      const g = ctx.createGain(); g.gain.value = 1; g.connect(bus);
      const send = ctx.createGain(); send.gain.value = 1; send.connect(verb);
      layer = { g, send, flutter: null };
    }
    return layer;
  }
  function lout(node, wet) {
    const L = layerBus();
    node.connect(L.g);
    if (wet) { const w = ctx.createGain(); w.gain.value = wet; node.connect(w); w.connect(L.send); }
  }
  function dropLayer(L, sec) {
    const t = now();
    [L.g, L.send].forEach((g) => { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0.0001, t + sec); });
    if (L.flutter) { const f = L.flutter; L.flutter = null; setTimeout(() => f.stop.forEach((o) => { try { o.stop(); } catch (e) { /* stopped */ } }), sec * 1000 + 200); }
    setTimeout(() => { try { L.g.disconnect(); L.send.disconnect(); } catch (e) { /* gone */ } }, sec * 1000 + 600);
  }
  A.stopLayers = function () { if (!A.ready || !layer) return; const L = layer; layer = null; dropLayer(L, 0.08); };
  A.fadeLayers = function (sec) { if (!A.ready || !layer) return; const L = layer; layer = null; dropLayer(L, Math.max(0.1, sec || 6)); };

  // Both flames pulled hard in a draft: quick dry flutters of air, a little different on each side, nothing with a pitch. k is how
  // much (1 is the possession; 0 lets it go over a second and a half).
  A.flutter = function (k) {
    if (!A.ready) return;
    const t = now(), L = layerBus();
    if (!L.flutter) {
      const lvl = ctx.createGain(); lvl.gain.value = 0.0001; lout(lvl, 0.2);
      const stop = [];
      [-0.6, 0.6].forEach((pan, i) => {
        const src = noiseSrc(noiseBuf, true); src.start(0, rnd(0, 1.5)); stop.push(src);
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = i ? 1150 : 820; bp.Q.value = 0.9;
        const amp = ctx.createGain(); amp.gain.value = 0.5;
        [[9.3, 0.3], [13.7, 0.22], [4.1, 0.25], [21, 0.1]].forEach(([f, d]) => {
          const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f * (i ? 1.07 : 0.94);
          const og = ctx.createGain(); og.gain.value = d; o.connect(og); og.connect(amp.gain); o.start(); stop.push(o);
        });
        const sp = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        src.connect(bp); bp.connect(amp);
        if (sp) { sp.pan.value = pan; amp.connect(sp); sp.connect(lvl); } else amp.connect(lvl);
      });
      L.flutter = { lvl, stop };
    }
    const lv = L.flutter.lvl.gain;
    lv.cancelScheduledValues(t); lv.setValueAtTime(Math.max(0.0001, lv.value), t);
    if (k > 0) lv.linearRampToValueAtTime(0.2 * k, t + 0.6); else lv.linearRampToValueAtTime(0.0001, t + 1.5);
  };

  // The floor under the table taking weight, one board at a time, coming toward you: each is a low thud and a stick-slip groan under it, a
  // little nearer and a little louder than the one before. n boards (six by default), about a second apart.
  A.floorLoad = function (n) {
    if (!A.ready) return;
    const t0 = now(), count = Math.max(2, n || 6);
    for (let i = 0; i < count; i++) {
      const k = i / (count - 1), t = t0 + i * rnd(0.85, 1.15);
      const p = panner(rnd(-0.35, 0.35), -0.9, -1.8 + 2.7 * k);
      playTake(take('floor', joist), p, t, 0.32 + 0.5 * k, rnd(0.92, 1.08));
      lout(p, 0.35);
    }
  };

  // The cellar door's latch, under the table: the thumb piece lifts (a small iron scrape and click), and half a second later the
  // latch drops back onto its hasp (heavier: iron, then the wood behind it, and a small rebound).
  A.latch = function () {
    if (!A.ready) return;
    const t = now(), p = panner(-0.4, -1.0, -1.4);
    if (SAMPLES.latch && SAMPLES.latch.length) { playTake(take('latch'), p, t, 0.8, 1); lout(p, 0.5); return; }
    const burst = (at, f, q, v, d, off) => {
      const s = noiseSrc(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const g = ctx.createGain(); env(g, at, 0.001, v, d);
      s.connect(bp); bp.connect(g); g.connect(p); s.start(at, off ?? rnd(0, 1.5), d + 0.05);
    };
    const ring = (at, f, v, d) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain(); env(g, at, 0.001, v, d);
      o.connect(g); g.connect(p); o.start(at); o.stop(at + d + 0.05);
    };
    // lift: the scrape of the bar riding up its keeper, then the small click of the catch
    burst(t, 3200, 1.4, 0.16, 0.09); ring(t + 0.1, 1650, 0.05, 0.07); ring(t + 0.1, 2480, 0.03, 0.05); burst(t + 0.1, 2400, 4, 0.22, 0.02);
    // drop: iron on iron, the wood behind it, a rebound
    const d = t + 0.62;
    burst(d, 1500, 2.5, 0.5, 0.03); ring(d, 780, 0.12, 0.12); ring(d, 1190, 0.06, 0.08); ring(d, 130, 0.3, 0.1);
    burst(d + 0.09, 1800, 3, 0.16, 0.02); ring(d + 0.09, 940, 0.04, 0.05);
    lout(p, 0.5);
  };

  // The frame of the house working in the wind: a long low groan that crosses the room (old timber taking a gust, with the slip of
  // a joint) and, on the left, the window glass ticking in its frame, three or four small dry ticks.
  A.house = function () {
    if (!A.ready) return;
    const t = now(), d = 2.8;
    const p = panner(-3, 1.2, -2); if (p.positionX) { p.positionX.setValueAtTime(-3, t); p.positionX.linearRampToValueAtTime(3, t + d); }
    playTake(take('house', groan), p, t, 0.34, 1);
    lout(p, 0.4);
    const w = panner(-2.2, 0.8, -2);
    [0.35, 1.05, 1.3, 2.0].forEach((off) => playTake(take('tick', windowTick), w, t + off, rnd(0.12, 0.2), rnd(0.92, 1.1)));
    lout(w, 0.3);
  };

  // Something under the table drags its nails along the underside of the boards: three or four slow strokes, close, below the phone.
  // (A stick-slip of nails on dry pine: a fast train of tiny catches whose rate rises and falls through each stroke.) A recording named
  // "scratch" in the place's manifest plays in its place.
  const clawStroke = () => render(1.0, (d, sr) => {
    stick(d, sr, 0.02, rnd(0.45, 0.7), rnd(140, 190), rnd(80, 120), rnd(1700, 2500), 0.004, 0.8, 0.45);
    stick(d, sr, 0.04, rnd(0.4, 0.6), rnd(90, 130), rnd(50, 80), rnd(700, 950), 0.01, 0.35, 0.4);
  });
  A.claw = function () {
    if (!A.ready) return;
    const p = panner(rnd(-0.3, 0.3), -0.9, -0.6);
    let t = now();
    for (let i = 0, n = 3 + Math.floor(Math.random() * 2); i < n; i++) {
      t += playTake(take('scratch', clawStroke), p, t, rnd(0.35, 0.55), rnd(0.9, 1.1)) * rnd(0.85, 1.2) + rnd(0.05, 0.25);
    }
    lout(p, 0.45);
  };

  // Footsteps across the ceiling: someone walking slowly on the boards upstairs, coming from one side (dir -1 from the left, 1 from the
  // right) and stopping dead over the table. Heavy heels, a board that complains every other step. Returns how long it takes (seconds).
  A.steps = function (dir) {
    if (!A.ready) return 0;
    const t0 = now(), n = 7, stride = 0.78, d = dir < 0 ? -1 : 1;
    const p = panner(-4.2 * d, 2.6, -0.8);
    if (p.positionX) { p.positionX.setValueAtTime(-4.2 * d, t0); p.positionX.linearRampToValueAtTime(0, t0 + (n - 1) * stride); }
    if (SAMPLES.steps && SAMPLES.steps.length) {   // a recorded walk: one file, the same road
      const len = playTake(take('steps'), p, t0, 0.9, 1);
      out(p, 0.45);
      return Math.max(len, (n - 1) * stride + 0.4);
    }
    for (let i = 0; i < n; i++) {
      const t = t0 + i * stride * (i ? rnd(0.96, 1.05) : 1), v = 0.6 + 0.3 * (i / (n - 1));
      playTake(take('heel', () => heel(true)), p, t, v, rnd(0.96, 1.04));
      if (i % 2) playTake(take('creak-low', () => boardCreak(true)), p, t + 0.05, 0.12, rnd(0.9, 1.1));   // a board that complains
    }
    out(p, 0.45);
    return (n - 1) * stride + 0.4;
  };

  // Air moving as something large walks past.
  A.pass = function () {
    if (!A.ready) return;
    const t = now();
    const s = noiseSrc(brownBuf); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(120, t); lp.frequency.linearRampToValueAtTime(420, t + 0.9); lp.frequency.linearRampToValueAtTime(140, t + 1.9);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.7, t + 0.9); g.gain.linearRampToValueAtTime(0.0001, t + 1.9);
    const sp = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    s.connect(lp); lp.connect(g);
    if (sp) { sp.pan.setValueAtTime(-0.9, t); sp.pan.linearRampToValueAtTime(0.9, t + 1.9); g.connect(sp); out(sp, 0.3); } else out(g, 0.3);
    s.start(t, 0, 2);
  };

  // One room bed, all night: the wind in the siding, the wall clock, crickets outside. It follows the night's heat (A.heat), never the mood.
  A.mood = function () {
    if (!A.ready) return;
    applyBed(0.6);
    if (extra) extra.g.gain.setTargetAtTime(extra.level, now(), 0.6);
  };
  A.place = function (p) {
    placeAmb = Object.assign({ wind: 0.2, clock: true, crickets: true, extra: '' }, p || {});
    if (!A.ready) return;
    buildExtra(placeAmb.extra);
    A.mood();
  };

  // A horse and carriage passing on cobbles, heard through the parlor window: left to right, about six seconds.
  function carriage(dest) {
    const t = now(), dur = rnd(5.5, 7);
    const sp = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700;   // the window glass
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    lp.connect(g);
    if (sp) { sp.pan.setValueAtTime(-0.9, t); sp.pan.linearRampToValueAtTime(0.9, t + dur); g.connect(sp); sp.connect(dest); } else g.connect(dest);
    // wheels on stone
    const w = noiseSrc(brownBuf, true); const wl = ctx.createBiquadFilter(); wl.type = 'bandpass'; wl.frequency.value = 220; wl.Q.value = 0.8;
    const wg = ctx.createGain(); wg.gain.value = 0.35; w.connect(wl); wl.connect(wg); wg.connect(lp); w.start(t); w.stop(t + dur + 0.1);
    // hooves: a trotting four-beat, clip-clop
    for (let x = t + 0.1; x < t + dur; x += 0.62) {
      [0, 0.12, 0.31, 0.43].forEach((off, i) => {
        const s = noiseSrc(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = i % 2 ? 1300 : 950; bp.Q.value = 5;
        const hg = ctx.createGain(); env(hg, x + off + rnd(0, 0.02), 0.002, i % 2 ? 0.4 : 0.55, 0.05);
        s.connect(bp); bp.connect(hg); hg.connect(lp); s.start(x + off, rnd(0, 1.8), 0.08);
      });
    }
  }

  // ---------- the one extra bed per place ----------
  // rain on glass and the city below; a furnace that kicks on and off; gas lamps hissing; birds at dawn.
  function buildExtra(kind) {
    if (extra) { const old = extra; old.g.gain.setTargetAtTime(0, now(), 0.3); setTimeout(() => { old.stop.forEach((f) => { try { f(); } catch (e) { /* already stopped */ } }); old.g.disconnect(); }, 1500); extra = null; }
    if (!kind || !ctx) return;
    const g = ctx.createGain(); g.gain.value = 0; out(g, 0.12);
    const stop = [];
    const loopNoise = (buf, type, f, q, gain) => {
      const s = noiseSrc(buf, true); const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q || 0.7;
      const gg = ctx.createGain(); gg.gain.value = gain; s.connect(fl); fl.connect(gg); gg.connect(g); s.start(); stop.push(() => s.stop());
      return { s, fl, gg };
    };
    let level = 1, holy = 0.6;
    const every = (ms, fn) => { const iv = setInterval(() => { if (A.ready && ctx.state === 'running') fn(); }, ms); stop.push(() => clearInterval(iv)); };
    const panTo = (v) => { const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (p) { p.pan.value = v; p.connect(g); } return p || g; };
    if (kind === 'rain') {
      loopNoise(noiseBuf, 'highpass', 1400, 0.5, 0.045);
      loopNoise(noiseBuf, 'bandpass', 5200, 0.6, 0.02);
      loopNoise(brownBuf, 'lowpass', 90, 0.7, 0.35);   // the city, forty floors down
      // single drops hitting the window
      every(170, () => {
        if (Math.random() < 0.45) return;
        const t = now() + rnd(0, 0.15), s = noiseSrc(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = rnd(3000, 7000); bp.Q.value = 9;
        const dg = ctx.createGain(); env(dg, t, 0.001, rnd(0.02, 0.07), 0.03);
        s.connect(bp); bp.connect(dg); dg.connect(panTo(rnd(-0.9, 0.9))); s.start(t, rnd(0, 1.8), 0.05);
      });
      holy = 0.35;
    } else if (kind === 'furnace') {
      const f = loopNoise(brownBuf, 'lowpass', 150, 0.8, 0.5);
      const o = ctx.createOscillator(); o.frequency.value = 60; const og = ctx.createGain(); og.gain.value = 0.012;
      o.connect(og); og.connect(f.gg); o.start(); stop.push(() => o.stop());
      let on = true;
      every(26000, () => { on = !on; f.gg.gain.setTargetAtTime(on ? 0.5 : 0.04, now(), 1.2); });
      // the TV upstairs left on a dead channel, heard through the floor
      const tv = loopNoise(noiseBuf, 'bandpass', 2400, 0.6, 0.012);
      const fl = ctx.createOscillator(); fl.frequency.value = 0.17; const fg = ctx.createGain(); fg.gain.value = 0.005;
      fl.connect(fg); fg.connect(tv.gg.gain); fl.start(); stop.push(() => fl.stop());
    } else if (kind === 'gas') {
      const h = loopNoise(noiseBuf, 'bandpass', 4600, 0.8, 0.03);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.3; const lg = ctx.createGain(); lg.gain.value = 0.008;
      lfo.connect(lg); lg.connect(h.gg.gain); lfo.start(); stop.push(() => lfo.stop());
      // now and then a carriage goes by on the cobbles outside the window
      every(9000, () => { if (Math.random() < 0.22) carriage(g); });
    } else if (kind === 'birds') {
      // a few kinds of bird: a rising chirp, a quick trill, a two-note whistle
      every(1900, () => {
        if (Math.random() < 0.4) return;
        const kindB = Math.random(), t0 = now() + rnd(0, 0.4), base = rnd(2600, 4200), dest = panTo(rnd(-0.85, 0.85));
        const note = (t, f0, f1, len, v) => {
          const o = ctx.createOscillator(); o.type = 'sine';
          o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + len * 0.8);
          const og = ctx.createGain(); env(og, t, 0.01, v, len);
          o.connect(og); og.connect(dest); o.start(t); o.stop(t + len + 0.05);
        };
        if (kindB < 0.45) { const n = 1 + Math.floor(Math.random() * 4); for (let i = 0; i < n; i++) note(t0 + i * rnd(0.09, 0.16), base, base * rnd(1.2, 1.6), 0.08, 0.05); }
        else if (kindB < 0.75) { const n = 6 + Math.floor(Math.random() * 6); for (let i = 0; i < n; i++) note(t0 + i * 0.045, base * 1.1, base * 1.25, 0.035, 0.03); }
        else { const f = rnd(1800, 2600); note(t0, f * 1.25, f * 1.2, 0.22, 0.045); note(t0 + 0.3, f, f * 0.94, 0.3, 0.04); }
      });
      holy = 1;
    }
    extra = { g, stop, level, holy };
  }

  // A gust from nowhere: a rush of air that sweeps across the table.
  A.gust = function (dir) {
    if (!A.ready) return;
    const t = now(), d = dir || 1;
    const s = noiseSrc(brownBuf); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(160, t); bp.frequency.exponentialRampToValueAtTime(780, t + 0.4); bp.frequency.exponentialRampToValueAtTime(240, t + 1.2);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1.1, t + 0.32); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    const h = noiseSrc(); const hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 2400; hp.Q.value = 0.6;
    const hg = ctx.createGain(); hg.gain.setValueAtTime(0.0001, t); hg.gain.exponentialRampToValueAtTime(0.12, t + 0.25); hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    const sp = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    s.connect(bp); bp.connect(g); h.connect(hp); hp.connect(hg);
    if (sp) { sp.pan.setValueAtTime(-0.8 * d, t); sp.pan.linearRampToValueAtTime(0.8 * d, t + 1.1); g.connect(sp); hg.connect(sp); out(sp, 0.35); } else { out(g, 0.35); out(hg, 0.2); }
    s.start(t, 0, 1.4); h.start(t, rnd(0, 1), 1);
  };
  // A wick catching by itself: a soft whump and a small hiss.
  A.ignite = function () {
    if (!A.ready) return;
    const t = now();
    const s = noiseSrc(brownBuf); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const g = ctx.createGain(); env(g, t, 0.01, 0.55, 0.35);
    s.connect(lp); lp.connect(g); out(g, 0.3); s.start(t, rnd(0, 3), 0.5);
    const h = noiseSrc(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 1.2;
    const hg = ctx.createGain(); env(hg, t + 0.03, 0.04, 0.07, 0.4);
    h.connect(bp); bp.connect(hg); out(hg, 0.2); h.start(t, rnd(0, 1.5), 0.5);
  };
  // A real voice from the site (a whispered name, a girl's voice): decoded once, then played through the room,
  // muffled (low-pass), in a small hard room (a short impulse), hard to one side, a little slow, and quiet.
  A.voices = 0;
  A.decode = function (ab) {
    if (!ctx || !ab) return Promise.resolve(null);
    return new Promise((res) => {
      let done = false; const fin = (b) => { if (!done) { done = true; res(b || null); } };
      try { const p = ctx.decodeAudioData(ab, fin, () => fin(null)); if (p && p.then) p.then(fin, () => fin(null)); } catch (e) { fin(null); }
    });
  };
  let voiceRoom = null;
  // Where the words end, so a take's own junk is never played: its last 50 ms are not looked at (a model's end-of-file
  // pop lives there), and after the loudest moment the words end at the first 0.6 s of quiet (a thump or a hiss after
  // that is stray). Quiet: a 30 ms window 30 dB under the loudest one. Then a breath (0.2 s) and the fade.
  function voiceEnd(buf) {
    const d = buf.getChannelData(0), sr = buf.sampleRate, win = Math.max(1, Math.round(sr * 0.03)), rms = [];
    const scan = Math.max(win, d.length - Math.round(sr * 0.05));
    let peak = 0, pk = 0;
    for (let i = 0; i + win <= scan; i += win) {
      let e = 0; for (let j = i; j < i + win; j++) e += d[j] * d[j];
      const r = Math.sqrt(e / win); rms.push(r); if (r > peak) { peak = r; pk = rms.length - 1; }
    }
    let last = pk, quiet = 0;
    for (let k = pk + 1; k < rms.length; k++) {
      if (rms[k] >= peak * 0.0316) { last = k; quiet = 0; } else if (++quiet * win / sr >= 0.6) break;
    }
    return Math.max(0.1, Math.min(buf.duration - 0.05, (last + 1) * win / sr + 0.2));
  }
  A.voice = function (buf, o) {
    o = o || {};
    if (!ctx || !buf || mutedNow) return false;
    if (ctx.state !== 'running') ctx.resume();
    const t = now();
    const rate = o.rate || 0.92;
    const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
    // the words fade out over 40 ms where they end (the room keeps ringing after)
    const end = voiceEnd(buf) / rate;
    const fade = ctx.createGain(); fade.gain.setValueAtTime(1, t); fade.gain.setValueAtTime(1, t + Math.max(0, end - 0.04)); fade.gain.linearRampToValueAtTime(0, t + end);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 160;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.cut || 3500; lp.Q.value = 0.5;
    if (!voiceRoom) voiceRoom = impulse(0.8, 3.4);
    const room = ctx.createConvolver(); room.buffer = voiceRoom;
    const dry = ctx.createGain(); dry.gain.value = 0.85;
    const wet = ctx.createGain(); wet.gain.value = 0.5;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.gain || 0.3, t + 0.08);
    const side = o.side != null ? o.side : (Math.random() < 0.5 ? -0.95 : 0.95);
    let pan;
    if (ctx.createStereoPanner) { pan = ctx.createStereoPanner(); pan.pan.value = side; } else pan = panner(side * 3, 0, -0.5);
    src.connect(fade); fade.connect(hp); hp.connect(lp); lp.connect(dry); lp.connect(room); room.connect(wet);
    dry.connect(pan); wet.connect(pan); pan.connect(g); g.connect(bus);
    src.start(t); src.stop(t + end + 0.01);
    // let the room ring out before letting go (cutting a reverb tail mid-ring clicks)
    src.onended = () => { setTimeout(() => { try { g.disconnect(); } catch (e) { /* gone */ } }, 3600); };
    A.voices++;
    return true;
  };
  // A name, whispered, only if this computer has a real whisper voice. Never more than once a minute.
  let lastSay = -Infinity;
  A.say = function (text) {
    if (QUIET || mutedNow || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return false;
    if (Date.now() - lastSay < 60000) return false;
    let v = null;
    try { v = speechSynthesis.getVoices().find((x) => /whisper/i.test(x.name)); } catch (e) { return false; }
    if (!v) return false;
    const u = new SpeechSynthesisUtterance(String(text).toLowerCase());
    u.voice = v; u.volume = 0.35; u.rate = 0.65; u.pitch = 0.7;
    try { speechSynthesis.speak(u); } catch (e) { return false; }
    lastSay = Date.now();
    return true;
  };

  // ---------- the way up the drive (the exterior shot's own sound) ----------
  // A quiet country night and nothing else: three crickets far off in the grass, each at its own pitch and its own beat; now and then a breath
  // of air (a narrow band that swells and fades, never a bed); a slow walk on gravel, six steps, nearer each time; and a screen door tapping once
  // somewhere ahead. There is no noise bed and no hiss: the only noise in it is a step's grains and that breath. It sits well under the table's
  // own room tone (the house's bed is about -27 dBFS RMS; this walk is about -40, its loudest step about -25: tools/house/audio.mjs measures both).
  // Until the shot's own film (with its own audio) lands, this is its sound.
  let outG = null, nightG = null, breeze = null, nightTimer = null, nightOn = false;
  const NIGHT_VOICES = [
    { f: 4310, per: 1.37, amp: 0.026, pan: -0.7 }, { f: 4790, per: 1.09, amp: 0.021, pan: 0.55 }, { f: 3930, per: 1.83, amp: 0.019, pan: 0.15 },
  ];
  // everything outdoors goes through here: no room to speak of (a field has no reverb: 4% sent to the house's)
  const outdoors = () => { if (!outG) { outG = ctx.createGain(); outG.gain.value = 1; outG.connect(bus); const w = ctx.createGain(); w.gain.value = 0.04; outG.connect(w); w.connect(verb); } return outG; };
  // one footstep on gravel: a soft body (the weight, low and short), then a heel and a toe, each a handful of stones shifting (a few grains,
  // each its own pitch, 4 to 12 ms long, with gaps between), not a spray of noise. v: how loud; side: left or right foot.
  function gravelStep(t, v, side) {
    const p = panner(side, -1.0, -1.4);
    const th = ctx.createOscillator(); th.type = 'sine'; th.frequency.setValueAtTime(150, t); th.frequency.exponentialRampToValueAtTime(70, t + 0.1);
    const tg = ctx.createGain(); env(tg, t, 0.004, 0.16 * v, 0.1);
    th.connect(tg); tg.connect(p); th.start(t); th.stop(t + 0.3);
    const grains = (at, n, spread, vol) => {
      for (let j = 0; j < n; j++) {
        const tt = at + (j === 0 ? 0 : rnd(0.004, spread) * j * 0.7), len = rnd(0.005, 0.012);
        const s = noiseSrc(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = rnd(900, 2300); bp.Q.value = 1.3;
        const g = ctx.createGain(); env(g, tt, 0.0012, vol * rnd(0.25, 1), len);
        s.connect(bp); bp.connect(g); g.connect(p); s.start(tt, rnd(0, 1.6), len + 0.02);
      }
    };
    grains(t + 0.004, 6, 0.016, 0.9 * v);     // the heel: a little crunch
    grains(t + 0.092, 5, 0.014, 0.5 * v);     // the toe, softer
    p.connect(outdoors());
  }
  // Footsteps on gravel at a slow walk, getting closer. `dur` is the shot's length: six steps at most, about one and a quarter seconds apart.
  A.gravel = function (dur) {
    if (!A.ready) return;
    const t0 = now(), d = dur || 8, stride = 1.2, first = 0.9;
    const n = Math.max(1, Math.min(6, Math.floor((d - first - 0.5) / stride) + 1));
    for (let i = 0; i < n; i++) {
      const t = t0 + first + i * stride * rnd(0.98, 1.03), k = n > 1 ? i / (n - 1) : 1;   // k: 0 far, 1 near
      gravelStep(t, 0.16 + 0.34 * k * k, i % 2 ? 0.25 : -0.25);
    }
  };
  // A screen door on a slack spring, pushed by the wind against its frame once: a dry wooden tap, a thin twang, and a small
  // rebound. Far off and ahead, and quiet.
  A.screenDoor = function () {
    if (!A.ready) return;
    const t = now(), p = panner(1.4, 0.2, -3.2);
    const hit = (at, v) => {
      const s = noiseSrc(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 2.2;
      const g = ctx.createGain(); env(g, at, 0.001, v, 0.05);
      s.connect(bp); bp.connect(g); g.connect(p); s.start(at, rnd(0, 1.5), 0.08);
    };
    hit(t, 1.1); hit(t + 0.11, 0.44);
    [[410, 0.14], [868, 0.07], [1590, 0.028]].forEach(([f, v]) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f * 1.03, t + 0.01); o.frequency.exponentialRampToValueAtTime(f, t + 0.25);
      const g = ctx.createGain(); env(g, t + 0.005, 0.004, v, 0.55);
      o.connect(g); g.connect(p); o.start(t + 0.005); o.stop(t + 0.7);
    });
    p.connect(outdoors());
  };
  // The crickets' own output: it comes up slowly and goes away slowly.
  function night() {
    if (!nightG) { nightG = ctx.createGain(); nightG.gain.value = 0.0001; nightG.connect(bus); }
    return nightG;
  }
  // a breath of air: brown noise through a narrow band (about 480 Hz, a whisper), swelling and fading on two slow waves so that
  // between breaths there is nothing at all. k: how much (0 takes it away).
  function breath(k) {
    if (!breeze) {
      const s = noiseSrc(brownBuf, true), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 480; bp.Q.value = 2.2;
      const swell = ctx.createGain(); swell.gain.value = 0.3;
      [[0.047, 0.32], [0.113, 0.22]].forEach(([hz, a]) => { const o = ctx.createOscillator(); o.frequency.value = hz; const og = ctx.createGain(); og.gain.value = a; o.connect(og); og.connect(swell.gain); o.start(); });
      const lvl = ctx.createGain(); lvl.gain.value = 0.0001;
      s.connect(bp); bp.connect(swell); swell.connect(lvl); lvl.connect(bus); s.start();
      breeze = { lvl };
    }
    breeze.lvl.gain.setTargetAtTime(k > 0 ? 0.12 * k : 0.0001, now(), 1.2);
  }
  // one cricket's chirp: three short pips of a sine, soft at both ends, at that cricket's own pitch
  function chirp(v, t) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = v.f * (1 + rnd(-0.004, 0.004));
    const g = ctx.createGain(); g.gain.value = 0;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    o.connect(g); if (pan) { pan.pan.value = v.pan; g.connect(pan); pan.connect(night()); } else g.connect(night());
    const n = Math.random() < 0.7 ? 3 : 4;
    for (let i = 0; i < n; i++) { const s = t + i * 0.052, a = v.amp * rnd(0.75, 1); g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(a, s + 0.008); g.gain.linearRampToValueAtTime(0, s + 0.036); }
    o.start(t); o.stop(t + n * 0.052 + 0.05);
  }
  // each cricket keeps its own time (a chirp about every 1.1 to 1.8 s, now and then a rest), scheduled a little ahead
  function nightTick() {
    if (!A.ready || !nightOn) return;
    const lim = now() + 0.5;
    for (const v of NIGHT_VOICES) {
      if (v.next == null) v.next = now() + rnd(0.2, v.per);
      while (v.next < lim) { chirp(v, Math.max(v.next, now())); v.next += v.per * rnd(0.88, 1.14) + (Math.random() < 0.12 ? rnd(0.8, 2.4) : 0); }
    }
  }
  // Wind in the dry grass, as a breath of air, and nothing under it: the house's own wind in the siding (and its swell) goes away out here.
  // k: how much (0 is none).
  A.wind = function (k) {
    if (!A.ready) return;
    const lvl = Math.max(0, +k || 0), t = now();
    breath(lvl);
    // (the siding's wind has a slow swell laid on it: that goes too, or the rumble stays)
    const L = bedLevels();
    if (amb.wind) amb.wind.gain.setTargetAtTime(lvl > 0 ? 0.0001 : Math.max(0.0001, L.wind), t, 0.9);
    if (amb.windSwell) amb.windSwell.gain.setTargetAtTime(lvl > 0 ? 0 : L.swell, t, 0.9);
  };
  // Crickets, outside, in the grass either side of the drive. k: how much (0 is none). The house's own few crickets stand down while these are on.
  A.crickets = function (k) {
    if (!A.ready) return;
    const lvl = Math.max(0, +k || 0);
    if (lvl > 0 && !nightOn) { nightOn = true; NIGHT_VOICES.forEach((v) => { v.next = null; }); nightTick(); nightTimer = setInterval(nightTick, 200); }
    if (lvl <= 0 && nightOn) { nightOn = false; if (nightTimer) { clearInterval(nightTimer); nightTimer = null; } }
    night().gain.setTargetAtTime(lvl > 0 ? Math.min(1, lvl) : 0.0001, now(), lvl > 0 ? 1.4 : 0.4);
    if (amb.crickets) amb.crickets.gain.setTargetAtTime(lvl > 0 ? 0 : bedLevels().crickets, now(), 0.6);
  };
  // Outside, before the door: no wall clock yet (it is the house's), the wind and the crickets are the room. Back inside, the
  // table's own bed returns.
  // bed: false when the shot has its own film (and its own sound): only the house's clock stays off, nothing is laid over it.
  A.outside = function (on, bed) {
    if (!A.ready) return;
    BED.inside = !on;
    if (on) {
      const t = now();
      [BED.sidingG, BED.lowG].forEach((n) => { if (n) { n.gain.cancelScheduledValues(t); n.gain.setValueAtTime(0, t); } });   // the house's own layers are not out here
      if (outG) { outG.gain.cancelScheduledValues(t); outG.gain.setValueAtTime(1, t); }
      if (amb.clock) amb.clock.gain.setTargetAtTime(0, t, 0.3);
      if (bed !== false) {
        // the house is not here yet: its bed (the siding's wind and its swell, the few crickets inside) is off at once, not faded: the walk
        // starts at the strike, and a fade would be a rumble that dies away under the first seconds of the night outside
        [amb.wind, amb.windSwell, amb.crickets].forEach((n) => { if (n) { n.gain.cancelScheduledValues(t); n.gain.setValueAtTime(n === amb.windSwell ? 0 : 0.0001, t); } });
        A.wind(1); A.crickets(1);
      }
    } else {
      // a footstep still on its way is faded out, not cut
      if (outG) outG.gain.setTargetAtTime(0.0001, now(), 0.15);
      A.wind(0); A.crickets(0); A.mood();
    }
  };

  // the room's own sounds and the demon's: the house waits for each to ring out before it settles on its own (earVoice: its whisper from
  // the site, at their ear, which plays its own decoded buffer and not through A.rec)
  ['rec', 'knock', 'creak', 'steps', 'house', 'latch', 'floorLoad', 'breath', 'claw', 'earVoice'].forEach((k) => {
    const f = A[k]; if (typeof f !== 'function') return;
    A[k] = function () { if (ctx) BED.lastRoom = now(); return f.apply(this, arguments); };
  });

  // ?debug: every A.* call is written down (its name, the ms since the first, its plain arguments) for the tests: GOODBYE.audioLog().
  A.log = [];
  if (/[?&]debug\b/.test(location.search)) {
    const t0 = performance.now();
    const plainArg = (x) => (typeof x === 'number' || typeof x === 'string' || typeof x === 'boolean' || x == null ? x : typeof x);
    for (const k of Object.keys(A)) {
      if (typeof A[k] !== 'function' || k === 'scrape' || k === 'clockState' || k === 'busLevel') continue;   // (scrape runs every frame; the other two only read)
      const f = A[k];
      A[k] = function () {
        if (A.log.length < 20000) A.log.push({ n: k, t: Math.round(performance.now() - t0), a: Array.prototype.slice.call(arguments, 0, 4).map(plainArg) });
        return f.apply(this, arguments);
      };
    }
  }

  window.GA = A;
})();
