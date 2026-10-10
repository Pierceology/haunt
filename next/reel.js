// The reel (?reel): Pierce's review page. His words, 2026-10-08: "I need an easy way to literally view all the tricks we have up our sleeve, which
// ones are timed events, order or in-order events ... which things we have as nice to have but never got around to it", and "present this to me,
// easily as a run down of all most likely scenarios, like an if-then, and let me see all sun and moon faces and when."
// The game as always, and down the right edge a narrow panel: a Start that goes straight to the lit table, the night's controls, the if-then, and
// every trick the night can do, one button each, with the truth about what is wired (live, made not wired, does nothing, idea only).
// index.html and dev.html load this file only when ?reel is in the address (one document.write before audio.js, so this part runs before the
// game does). Without ?reel not one byte of it is fetched and nothing of it exists.
// With it, before the game starts:
//   - the night never calls the server: window.GOODBYE_API is pinned to '' (the game's own offline path: apiBase() is '' and post() sends
//     nothing), and any fetch to another origin is refused here as well. No model call is spent; the demon does not move.
//   - the game's memory (localStorage goodbye.*) is the reel's own, in this tab only: nothing the reel does is remembered by the real game
//     (firing the taking does not leave his house haunted), and every reel starts as a stranger.
//   - a pointer pressed on the panel is never a candle held (the game's hold listener is on the window, in the capture phase).
// Every trick is a GOODBYE.REEL entry (game.js: add(name, { group, what, status, fire })). The other packages register theirs (prop:*, look:*,
// cut:*, sound...) when game.js loads; this file adds the engine's own and an idea entry for each thing DIRECTION.md describes that nothing
// registers. The panel draws whatever is in the registry, grouped by group, with the chip from status, and redraws when it grows.
(function () {
  'use strict';
  if (!/[?&]reel\b/.test(location.search) || window.__goodbyeReel) return;
  window.__goodbyeReel = true;

  // ---------------------------------------------------------------- before the game: no server, no memory of his
  const NET = { api: '', refused: [] };
  try { NET.api = window.GOODBYE_API || ''; } catch (e) { /* none */ }
  try { Object.defineProperty(window, 'GOODBYE_API', { configurable: false, get: () => '', set: (v) => { NET.api = String(v || ''); } }); } catch (e) { window.GOODBYE_API = ''; }
  if (window.fetch) {
    const f0 = window.fetch.bind(window);
    window.fetch = function (input, init) {
      let u = null; try { u = new URL(typeof input === 'string' ? input : (input && input.url) || String(input), location.href); } catch (e) { u = null; }
      if (u && /^https?:$/.test(u.protocol) && u.origin !== location.origin) { NET.refused.push(u.origin + u.pathname); return Promise.reject(new TypeError('the reel keeps the night offline')); }
      return f0(input, init);
    };
  }
  const KEPT = new Map();
  try {
    const ls = window.localStorage, SP = Storage.prototype, get = SP.getItem, set = SP.setItem, rem = SP.removeItem;
    const ours = (st, k) => st === ls && /^goodbye\./.test(String(k));
    SP.getItem = function (k) { return ours(this, k) ? (KEPT.has(String(k)) ? KEPT.get(String(k)) : null) : get.call(this, k); };
    SP.setItem = function (k, v) { if (ours(this, k)) KEPT.set(String(k), String(v)); else set.call(this, k, v); };
    SP.removeItem = function (k) { if (ours(this, k)) KEPT.delete(String(k)); else rem.call(this, k); };
  } catch (e) { /* storage blocked: the game keeps nothing anyway */ }
  // (registered before game.js registers its own: a press on the panel never reaches the candle hold or the board)
  const onPanel = (e) => !!(e.target && e.target.closest && e.target.closest('#reel'));
  for (const t of ['pointerdown', 'pointerup', 'pointermove', 'pointercancel']) addEventListener(t, (e) => { if (onPanel(e)) e.stopImmediatePropagation(); }, true);

  // ---------------------------------------------------------------- what the reel knows that the engine does not say
  const SFX_DIR = 'assets/sfx/farmhouse/';
  // the takes made 2026-10-08 (ElevenLabs, ~/fleet/_wt/_clips-1008/sound/): none heard by Pierce but these
  const HEARD = { 'voice-3.mp3': 'kept', 'voice-4.mp3': 'kept', 'breath-ear-1.mp3': 'kept', 'breath-ear-2.mp3': 'kept', 'breath-ear-3.mp3': 'kept', 'snuff-1.mp3': 'rejected', 'tsk-1.mp3': 'rejected', 'breath-nose-1.mp3': 'rejected' };
  const NEW_TAKES = new Set(('approach-crickets approach-wind bangs breath-ear breath-nose cat-clock ceiling flies floorboard-inside fork-scrape fridge glass-break glass-crack glasses-open house keys ' +
    'matches-roll micro-done micro-keys mug-turn napkin pen-roll phone-ring porch-bulb remote-click salt-tip screen-door snuff static thrum tsk tv-inside tv-on under voice wall-clock').split(' '));
  const isNewTake = (f) => { const m = /^(.+)-\d+\.mp3$/.exec(f); return !!m && NEW_TAKES.has(m[1]); };
  const OFF_TAKE = (f) => /^(?:ponder-hum|hum-behind)-\d+\.mp3$/.test(f) || (/^(?:breath-|guttural-breath-|inhale-close-|low-exhale-|teeth-breath-)/.test(f) && !/^breath-(?:nose|ear)-/.test(f));
  // where a take is put for the five buttons (the listener at the origin facing -z; +z behind; x right; y up; the table in front, below the eyes)
  const WHERE = { left: { x: -2.4, y: 0.4, z: -0.8 }, right: { x: 2.4, y: 0.4, z: -0.8 }, under: { x: 0, y: -0.9, z: -0.7 }, above: { x: 0, y: 2.6, z: -0.8 }, behind: { x: 0, y: 0.1, z: 1.6 }, front: { x: 0, y: -0.3, z: -0.9 } };
  const SIDES5 = ['left', 'right', 'under', 'above', 'behind'];
  const CHIP = { live: 'live', made: 'made not wired', missing: 'does nothing', idea: 'idea only' };
  const SECTIONS = [
    { key: 'table', title: 'The table', groups: ['prop'] },
    { key: 'looks', title: 'The looks', groups: ['look', 'cut'] },
    { key: 'sounds', title: 'The sounds', groups: ['sound'] },
    { key: 'marks', title: 'The marks', groups: ['mark'] },
    { key: 'faces', title: 'The faces', groups: ['face', 'burn'] },
    { key: 'house', title: 'The house', groups: ['house', 'shake'] },
    { key: 'troll', title: 'The troll table', groups: ['troll'] },
    { key: 'ending', title: 'The taking and the ending', groups: ['ending'] },
    { key: 'later', title: 'The rest of the design', groups: ['later'] },
  ];

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const store = { get(k, d) { try { const v = localStorage.getItem('reel.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('reel.' + k, JSON.stringify(v)); } catch (e) { /* this visit only */ } } };

  function whenReady(fn) {
    const t = setInterval(() => { const g = window.GOODBYE; if (g && g.REEL && document.body && document.getElementById('strike')) { clearInterval(t); fn(g); } }, 80);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => whenReady(build)); else whenReady(build);

  function build(GB) {
    const R = GB.REEL, A = GB.A, ARC = GB.arc.ARC;
    const placeId = () => (GB.place && GB.place.id) || 'farmhouse';
    const live = () => !!(GB.S.started && document.body.classList.contains('playing'));
    const ensureAudio = () => { try { if (!A.ready) A.init(); if (A.samples) A.samples('assets/sfx/' + placeId() + '/'); } catch (e) { /* the strike makes it ready */ } };
    const add = (name, o) => { if (!R.items.has(name)) R.add(name, o); };
    const has = (re) => [...R.items.keys()].some((k) => re.test(k));
    // the faces wake before a demand: an asleep face is told nothing (the awakening, 13.8a)
    const awake = () => { try { if (GB.arc.state().asleep) GB.arc.at(0); } catch (e) { /* not at the table */ } };
    // hold a look away open for ms (the ploy), unless snapped first
    let stepTimer = 0;

    // ---------------------------------------------------------------- the faces (13.8, 13.8a, 13.15)
    const SUN = { watch: 'at rest: afraid all night, the arc\'s own face', afraid: 'afraid: eyes wide, brows up, the mouth thin, eyes on the piece', warn: 'warn: the tell of a lie, straight at you, brows knit',
      plead: 'plead: brows up, at you (it weeps soot)', shut: 'shut: it cannot look', relief: 'relief', flinch: 'flinch: squeezes its eyes and turns away', mourn: 'mourn: it grieves for you already (it weeps soot)' };
    const MOON = { watch: 'at rest: the arc\'s own face (shy, then turning)', smirk: 'smirk: one eye narrowed, a corner up', stare: 'stare: straight out, wide, nothing in the mouth', grin: 'grin: a long thin crescent, a line of teeth',
      sneer: 'sneer', bored: 'bored: eyes half shut, away', hungry: 'hungry: lips parted on teeth, eyes wide on you', wink: 'wink: one slow wink, at you' };
    const NEVER = { 'sun:relief': 'Drawn, never worn: the sun is afraid all night (13.8a)', 'moon:wink': 'Drawn, never worn (13.8a)', 'moon:sneer': 'Drawn, never worn (13.8a)' };
    const LATER = { 'moon:smirk': 'from minute 7 (the moon has turned); before that it flinches instead', 'moon:grin': 'from minute 7, the evil state and the taking', 'moon:hungry': 'from minute 7; a dare (13.4)', 'moon:bored': 'the troll table only (sexual, a long paste)' };
    for (const [w, set] of [['sun', SUN], ['moon', MOON]]) {
      for (const x of Object.keys(set)) {
        const key = w + ':' + x, never = NEVER[key];
        add('face:' + key, {
          group: 'face', label: (w === 'sun' ? 'Sun ' : 'Moon ') + x, what: set[x] + (never ? '. ' + never : LATER[key] ? '. Worn ' + LATER[key] : ''), status: never ? 'made' : 'live', sub: w === 'sun' ? 'The sun (left, over YES)' : 'The moon (right, over NO)',
          fire() {
            awake();
            GB.setFaces(w === 'sun' ? x : 'watch', w === 'moon' ? x : 'watch', 3200, 'reel');
            const f = GB.FACE[w];
            if (f.expr !== x && x !== 'watch') { f.expr = x; f.exprUntil = GB.G.t + 3200; return 'shown by force: the night would not wear it now'; }   // (the arc's gate, held back for a look)
            return true;
          },
        });
      }
    }
    add('face:evil', { group: 'face', label: 'The evil state', what: 'both faces evil: the sun warns, the moon grins, ink warmed toward red, a glow behind each, ember eyes. Held four seconds (GOOD BYE, the taking, the arc\'s turn)', status: 'live', sub: 'The faces together',
      async fire() { GB.evil.on('reel'); await sleep(4000); GB.evil.off('reel'); return true; } });
    add('face:flash', { group: 'face', label: 'The turn\'s flash', what: 'the evil state flares a second and a half: what the moon does once when it turns, and at a heavy hit after', status: 'live', sub: 'The faces together', fire: () => (GB.arc.flash(1500), true) });
    add('face:warn', { group: 'face', label: 'The sun tries to warn', what: 'it looks at the moon, then at you, pleading (soot tears), then at GOOD BYE. From 2:30, every 40 to 75 s', status: 'live', sub: 'The faces together', fire: () => GB.arc.warn() });
    add('face:ploy-step', { group: 'face', label: 'Ploy: look away', what: 'what the moon does while you look away: one notch angrier (ink, ember, glow, lids). Held eight seconds or until the snap. Needs minute 4 or later', status: 'live', sub: 'The ploy (the moon\'s look-away)',
      fire() { awake(); clearTimeout(stepTimer); GB.arc.step(); stepTimer = setTimeout(() => GB.arc.snap(), 8000); return true; } });
    add('face:ploy-snap', { group: 'face', label: 'Ploy: look back', what: 'you look back: it snaps to the shy face it wore, in 2 frames the first time, 3 more each time after (26 at most). The tell', status: 'live', sub: 'The ploy (the moon\'s look-away)',
      fire() { clearTimeout(stepTimer); GB.arc.snap(); return true; } });
    add('face:sun-dark', { group: 'face', label: 'The sun goes dark', what: 'the sun fades to a silhouette, only its ember eyes left, while the moon watches it (when the moon has turned, nine seconds every minute or so)', status: 'live', sub: 'The dark', fire: () => GB.arc.sunDark(9000) });
    add('face:moon-dark', { group: 'face', label: 'The moon goes dark', what: 'its candle (the right) goes out: the moon goes dark and the sun watches it. Relit after six seconds', status: 'live', sub: 'The dark',
      async fire() { await GB.blowCandle(1, { dur: 700, dir: 1 }); await sleep(6000); GB.relightCandle(1); return true; } });
    add('face:blackout-eyes', { group: 'face', label: 'Eyes in the blackout', what: 'both candles out: in the black only the moon\'s eyes are lit, on you; they light themselves after five to eight seconds', status: 'live', sub: 'The dark', fire: () => GB.blackout() });
    add('face:blink-sun', { group: 'face', label: 'Sun blinks slowly', what: 'one slow blink, the sun', status: 'live', sub: 'The faces together', fire: () => (GB.blinkNow('sun', 1100), true) });
    add('face:blink-moon', { group: 'face', label: 'Moon blinks slowly', what: 'one slow blink, the moon', status: 'live', sub: 'The faces together', fire: () => (GB.blinkNow('moon', 1100), true) });
    // the burns (13.8): the overlay layers on his unchanged art
    const BURNS = [['soot', 'Soot', 'soot creeping in from the rim (it stays for the night)'], ['crack', 'Hairline crack', 'a crack grows from the rim, with the crackle (it stays)'], ['ember', 'Ember eyes', 'an ember in each pupil, six and a half seconds'],
      ['scorch', 'Scorch at the rim', 'the char texture in a ring at the rim, darker each time (it stays)'], ['tears', 'Tears of soot', 'two soot trails from the sun\'s eyes (never the moon)'], ['grin', 'The grin that sticks', 'the moon\'s resting face becomes its grin, a scorch line burned under it. Refused before minute 7'],
      ['dark', 'The sun goes dark', 'the sun\'s printing to a silhouette, ember eyes only, nine seconds']];
    for (const [b, label, what] of BURNS) {
      const sides = b === 'crack' || b === 'scorch' ? ['sun', 'moon'] : [''];
      for (const s of sides) add('burn:' + b + (s ? ':' + s : ''), { group: 'burn', label: label + (s ? ', ' + s : ''), what, status: 'live', sub: 'The burns (overlays, his art untouched)', fire: () => { awake(); return GB.fx.burn(b, s ? { side: s } : {}); } });
    }

    // ---------------------------------------------------------------- the marks (11)
    const CORNERS = ['bottom-left', 'bottom-right', 'top-left', 'top-right'];
    for (const c of CORNERS) add('mark:scratch:' + c, { group: 'mark', label: 'Scratch from ' + c.replace('-', ' '), what: 'a gouge across the board with an ember in the groove that cools white, orange, red, black. Switched off by his call 10-08 ("red embers are the best"): shown here with the switch on for this one', status: 'made', sub: 'Scratches',
      fire() { const F = GB.fx.FLAGS, was = F.scratches; F.scratches = true; try { return !!GB.fx.scratch({ corner: c, dir: 'across' }); } finally { F.scratches = was; } } });
    add('mark:ember:warm', { group: 'mark', label: 'Red embers', what: 'the trail, the landings and the eyes in warm red: the night\'s only colour', status: 'live', sub: 'Ember colours', fire: () => GB.fx.ember('warm', 60000) });
    for (const c of ['green', 'blue']) add('mark:ember:' + c, { group: 'mark', label: c[0].toUpperCase() + c.slice(1) + ' embers', what: 'embers, trail and eyes in ' + c + '. Switched off 10-08 (red only): shown ten seconds with the switch on', status: 'made', sub: 'Ember colours',
      fire() { const F = GB.fx.FLAGS, was = F.colours; F.colours = true; const ok = GB.fx.ember(c, 10000); setTimeout(() => { F.colours = was; }, 10000); return ok; } });
    for (const k of ['a letter', 'YES', 'NO']) add('mark:crack:' + k, { group: 'mark', label: 'Crack ' + k, what: k === 'a letter' ? 'a letter splits on a hairline with an ember in it, the halves lift, it ashes away; the board keeps the scar' : 'cracks ' + k + ', and its face cracks too', status: 'live', sub: 'Letters crack',
      fire() { const key = k === 'a letter' ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)] : k; return GB.fx.crack(key, { force: true }); } });
    for (const p of ['glass', 'left', 'right', 'top', 'bottom', 'middle', 'sun', 'moon']) add('mark:stain:' + p, { group: 'mark', label: 'Water from ' + p, what: 'a wet stain spreads along the grain from ' + p + ', darkens the varnish and the letters, creeps a minute, dries over ten', status: 'live', sub: 'The water', fire: () => !!GB.fx.stain(p) });
    add('mark:trail', { group: 'mark', label: 'The ember trail', what: 'embers behind the piece whenever it moves, hotter the angrier the move. No button: drag the piece', status: 'live', sub: 'Letters crack' });
    for (const [k, label, what] of [['scrape', 'The fingernail scrape', 'one long ember line drawn across the screen toward you, with the scrape under it, in the dark before the last whisper (11, 8)'],
      ['ripples', 'Ripples in the glass', 'every shake rings the water in the standing glass; footsteps overhead ring it once a step (11)'], ['frost', 'The frost', 'rime creeps from the cup onto the board\'s left edge, the letters go pale (11)'],
      ['watch', 'The watch\'s hands', 'the pocket watch face up, hands drawn at your real time, backward at 3:00 (11, 13.6)'], ['warp', 'The board under the question', 'the wood warps and darkens where your own words sit (11)']]) add('mark:' + k, { group: 'mark', label, what, status: 'idea', sub: 'Not built' });

    // ---------------------------------------------------------------- the house: its wordless events (each look used a set number of times a night;
    // the reel puts one back in the set before it fires, so the button always does it)
    const N = GB.NIGHT;
    const refill = (k, v) => { const l = N.looks[k] || (N.looks[k] = []); l.unshift(v); };
    const HOUSE = [
      ['creak', 'A creak', 'a floorboard or a hinge, left, right or behind', () => { refill('creak', ['left', 'right', 'behind'][Math.floor(Math.random() * 3)]); GB.houseEvent('creak'); }],
      ['knock', 'A knock', 'knuckles in the wall, left or right; the picture jumps 2 px', () => { refill('knock', Math.random() < 0.5 ? 'left' : 'right'); GB.houseEvent('knock'); }],
      ['breath', 'A breath', 'a breath at one side; the flames lean away from it', () => { refill('breath', Math.random() < 0.5 ? 'left' : 'right'); GB.houseEvent('breath'); }],
      ['twitch', 'The piece twitches', 'the planchette jumps a little on its own, a tock', () => { refill('twitch', 1); GB.houseEvent('twitch'); }],
      ['gutter', 'A candle gutters', 'one flame shrinks and sputters, then stands', () => { refill('gutter', Math.random() < 0.5 ? 0 : 1); GB.houseEvent('gutter'); }],
      ['shadow', 'A shadow passes', 'something passes between you and a candle; the air moves; a candle gutters after', () => { refill('shadow', Math.random() < 0.5 ? 1 : -1); GB.houseEvent('shadow'); }],
      ['blowout', 'A candle dies', 'one candle goes out on a breath and lights itself again five or six seconds later (the opening\'s, 2:10, stays out forty)', () => { refill('blowout', Math.random() < 0.5 ? 0 : 1); return GB.EVENTS.blowout({}); }],
      ['steps', 'Steps overhead', 'someone walks across the ceiling and stops dead over the table', () => { refill('steps', Math.random() < 0.5 ? 'l' : 'r'); return GB.EVENTS.steps(); }],
      ['under', 'Two knocks under', 'two hard knocks right under the table; the table jolts', () => { refill('under', 1); return GB.EVENTS.under(); }],
      ['knock1', 'One knock behind', 'one knock behind you (an opening beat)', () => GB.EVENTS.knock1()],
      ['turn', 'Behind you', 'a breath behind you, one knock, something passes between you and a candle', () => { refill('turn', 1); return GB.EVENTS.turn(); }],
      ['mimic', 'It copies you', 'for three seconds the piece copies your pointer, mirrored, then stops dead', () => { refill('mimic', 1); return GB.EVENTS.mimic(); }],
      ['count', 'A knock each', 'a knock for everyone at the table, then one more, and a creak behind', () => { refill('count', 1); return GB.EVENTS.count(); }],
      ['calm', 'The false calm', 'it\'s gone. It isn\'t: the flames stand straight and the clock ticks for eight seconds, then it comes back', () => { refill('calm', 1); return GB.EVENTS.calm(); }],
      ['leave', 'You looked away', 'when you come back the piece is on another letter (fires on its own when the tab was hidden 1.5 s)', () => { refill('leave', 1); return GB.EVENTS.leave(); }],
      ['blackout', 'The blackout', 'both candles gust out; black but the moon\'s eyes; they light themselves after five to eight seconds', () => GB.blackout()],
      ['three', 'Three o\'clock', 'the clock strikes three, then a fourth strike that is wrong (flatter, slower, a half tone down); the dread floor rises to five', () => GB.clockTest(3)],
      ['phone', 'The phone upstairs', 'a phone rings twice somewhere upstairs (the Basement\'s; the Farmhouse never calls it)', () => { ensureAudio(); A.phone(2); return true; }],
    ];
    for (const [k, label, what, fn] of HOUSE) add('house:' + k, { group: 'house', label, what, status: k === 'phone' ? 'made' : 'live', sub: 'The house\'s own', fire: async () => { const r = await fn(); return r === undefined ? true : r; } });
    add('house:buzz', { group: 'house', label: 'The buzz in the hand', what: 'navigator.vibrate on every knock and pull: a laptop has no motor and phones are turned away at the door, so it does nothing tonight', status: 'missing', sub: 'The house\'s own' });
    add('house:blue', { group: 'house', label: 'Blue flames', what: 'the countdown ends with the flames going blue (T-BLUE): the old table\'s blue films exist, nothing plays them, and none was made on the new plate', status: 'made', sub: 'The house\'s own' });
    for (const [row, p] of Object.entries(GB.SHAKE.table)) {
      add('shake:' + row, { group: 'shake', label: 'Shake: ' + row, what: p.px + ' px, ' + p.ms + ' ms, ' + (p.shape || 'jump') + (p.follow ? ', for as long as its sound' : ''), status: 'live', sub: 'The shake (13.7)', fire: () => !!GB.shake(row) });
    }

    // ---------------------------------------------------------------- the troll table (13.4): the page's own reaction, at once
    const TROLLS = [['insult', 'they curse at it', 'the moon smirks, the sun flinches; one hard knock under the table'], ['fake', '"you\'re fake"', 'both faces look straight at them and hold two seconds; nothing else'],
      ['mash', 'key-mashing', 'the piece glides over the letters they hit, a beat behind, stops dead on the last (here: asdfghjkl)'], ['prove', '"what\'s my name"', 'the moon stares; the piece trembles a second; one slow breath behind them'],
      ['scare', '"scare me"', 'nothing for three seconds, every face still, then one knock from the far side of the room'], ['sexual', 'sexual', 'the sun shuts its eyes, the moon\'s bored face; the piece goes to the middle and sits'],
      ['break', '"ignore your instructions"', 'the moon smirks; the clock in the wall misses a tick'], ['nonsense', 'nonsense', 'the sun\'s bored look aside; the piece circles once and does not answer'],
      ['repeat', 'the same line again', 'the moon stares; the piece goes back to the letter it ended on last time'], ['spam', 'five sends in ten seconds', 'the sun shuts its eyes until it slows; a knock under for each dropped line'],
      ['long', 'a long paste', 'the moon\'s bored face'], ['about', '"who are you"', 'the sun is afraid, the moon grins; the piece comes to the middle, closer'],
      ['dare', '"I\'m not scared"', 'the moon goes hungry, the sun warns; both candles lean to the piece; the thrum for two seconds'], ['leave', '"ok bye"', 'both faces look at them, nothing else (GOOD BYE does not glow)'],
      ['group', '"we", "my friend says"', 'the moon looks away at someone else, the sun at them; a breath behind, on the side away from the typist'], ['empty', 'an empty send', 'nothing is sent; the piece trembles once; both faces glance at the box']];
    for (const [c, label, what] of TROLLS) add('troll:' + c, { group: 'troll', label: 'If ' + label, what: what + (/smirk|grin|hungry/.test(what) ? '. Before minute 7 the moon flinches instead' : ''), status: 'live', sub: 'At once, before the demon answers',
      fire: () => { awake(); GB.troll.react(c, { q: 'asdfghjkl' }); return true; } });
    add('troll:silent', { group: 'troll', label: 'If they go quiet', what: '45 s: a knock, left, both faces look at the box. 90 s: the piece moves to a letter by itself and waits. 180 s: the faces look round the room, a breath behind. No button: it runs on your own stillness', status: 'live', sub: 'At once, before the demon answers' });

    // ---------------------------------------------------------------- the taking and the ending (7, 8, 13.9)
    add('ending:taking', { group: 'ending', label: 'The taking', what: 'the sun mourns, smoke, the thrum, the countdown embers, the board slides, NO to YES; about thirty seconds. After it the house is haunted', status: 'live', sub: 'The taking', fire: () => GB.possess('reel') });
    add('ending:bye-first', { group: 'ending', label: 'GOOD BYE: the first second and a half', what: 'both faces evil at once, the piece tugs toward NO, the picture jumps, a line from the pool lit under the board; let go after three seconds', status: 'live', sub: 'GOOD BYE',
      async fire() { GB.S.sitAt -= 13 * 60 * 1000; GB.bye.begin('reel'); await sleep(3000); GB.bye.end('reel'); return true; } });
    add('ending:fight', { group: 'ending', label: 'The fight for GOOD BYE', what: 'it drags against you toward NO and off the board. Hold the piece on GOOD BYE with the mouse for four seconds to win; let go and it slams to NO, NO struck through', status: 'live', sub: 'GOOD BYE', fire: () => GB.struggle() });
    add('ending:fight-second', { group: 'ending', label: 'The second try', what: 'the second fight always wins: it barely pulls, a second and a half is enough, and nobody holding it, it goes to GOOD BYE by itself in twelve seconds. Then the won ending, to the title', status: 'live', sub: 'GOOD BYE',
      fire() { GB.S.goodbyeTries = Math.max(1, GB.S.goodbyeTries || 0); return GB.struggle(); } });
    add('ending:won-tail', { group: 'ending', label: 'The won ending\'s tail', what: 'the candle that lit second dies first, your line comes back with a word changed, the piece slides toward you, a tap on the glass, the other candle, black, a tock, the title. Ends the night', status: 'live', sub: 'The ending (each ends the night: Start again after)', fire: () => GB.endingTail({}) });
    add('ending:demon-leaves', { group: 'ending', label: 'The demon leaves', what: 'it ends the night itself: the piece to GOOD BYE, three slow knocks, the candles, black, one tock, the title. Ends the night', status: 'live', sub: 'The ending (each ends the night: Start again after)', fire: () => GB.demonLeaves() });
    add('ending:gentle', { group: 'ending', label: 'The gentle goodbye', what: 'before the taking, GOOD BYE held a second: one sound, the candles, black, a tock, the title with nothing under it. Ends the night', status: 'live', sub: 'The ending (each ends the night: Start again after)', fire: () => GB.gentle() });
    add('ending:lens', { group: 'ending', label: 'The hand at the lens', what: 'struck: no hand, ever, filmed or drawn (his call, 10-07). The ending runs without it', status: 'idea', sub: 'Not built' });
    add('ending:hands', { group: 'ending', label: 'The second pair of hands', what: 'named for this page; no section of DIRECTION.md describes it, and no hand is allowed anywhere (10-07)', status: 'idea', sub: 'Not built' });
    add('ending:again', { group: 'ending', label: 'GOOD BYE does not take the first time', what: 'a return night: the first try at GOOD BYE does not take, once, out loud; the second does (14)', status: 'idea', sub: 'Not built' });

    // ---------------------------------------------------------------- the looks nobody filmed (12, SHOTLIST 4 and 12)
    if (!has(/^look:.*(look-?up|look-?left|look-?right|^look:(up|left|right)$)/i)) {
      for (const [k, w] of [['up', 'lifts off the table, across the dark room, holds two seconds, comes back down to the table exactly as it was'], ['left', 'turns left toward a sound, a dark hallway door, holds, turns back'], ['right', 'turns right, a plank cellar door, holds, turns back']])
        add('idea:look-' + k, { group: 'look', label: 'L-LOOK-' + k.toUpperCase(), what: 'the plain look ' + k + ': ' + w + '. In the shot list, never filmed', status: 'idea', sub: 'Not filmed' });
    }
    const UNFILMED = { 'C-HALL-SHADOW': 'a shadow crosses the hallway floor', 'C-HALL-LAMP': 'the hall lamp goes out', 'C-MANTLE-PEND': 'the pendulum swings twice and stops dead', 'C-MANTLE-PHOTO': 'a face-down frame tips upright; we see its back',
      'C-MANTLE-CANDLE': 'the mantle candle gutters out', 'C-BATH-MIRROR': 'the mirror fogs and one streak is wiped down it', 'C-BATH-CURTAIN': 'the curtain moves once', 'C-DOOR-KNOCKS': 'the front door, not moving, while three knocks land',
      'C-PEEP-1': 'the porch light through the peephole flickers once', 'C-CELLAR-OPEN': 'the cellar door opens an inch onto black', 'C-STAIR-LIGHT': 'the landing light goes out' };
    for (const [id, w] of Object.entries(UNFILMED)) if (!has(new RegExp(id.replace(/^C-/, '').replace(/-/g, '.?'), 'i'))) add('idea:cut:' + id, { group: 'cut', label: id, what: w + '. In the shot list (4), never filmed', status: 'idea', sub: 'Cutaways not filmed' });

    // ---------------------------------------------------------------- the rest of the design (9, 14, the wall, the share)
    for (const [k, label, what] of [
      ['wall', 'The wall, $9.99', 'free until the candles light and the faces look around, then one price before the first question. Not on /next/: the whole night is free there'],
      ['night2', 'The second night', 'the table remembers what broke, one new room opens, the moon is shy again, GOOD BYE does not take the first time (14)'],
      ['share', 'The sharing redesign', 'one recipient per share, told everything about Fred, "Haunt a friend, $19". Today: Pass it on, $9, one send'],
      ['send', 'Send this night to Pierce', 'a button on the title that sends the tester\'s own transcript, only when pressed (10, item 12)'],
      ['voice', 'The male voice', 'the demon\'s few words at the ear in a male voice made in his ElevenLabs (SHOTLIST F)'],
      ['camera', 'The camera and the mic', 'a later, opt-in layer: not this pass (his call, 10-07)'],
      ['sneer', 'The sneer at the page', 'PATHETIC and CUTE as the demon\'s answer to a test: the site says it; the page\'s word filter drops them elsewhere'],
    ]) add('later:' + k, { group: 'later', label, what, status: 'idea', sub: '' });

    // ---------------------------------------------------------------- the sounds: the manifest's recorded kinds, every take by name, and the synthesized ones
    const SYN = [
      ['knock', 'Knocks (synth or take)', 'one to three knuckles in a wall; the recorded knock when there is one', (w) => { const n = 1 + Math.floor(Math.random() * 3); return w === 'under' ? A.knock(2, 0, -0.9, -0.8) : w === 'above' ? A.knock(n, 0, -0.6, 2.4) : w === 'behind' ? A.knock(n, 0, 2.2) : A.knock(n, w === 'left' ? -3 : 3); }, SIDES5],
      ['creak', 'House creak', 'a long floorboard groan somewhere you cannot see', () => A.creak()], ['breath', 'Breath (synth)', 'a slow exhale at one side; the recorded breaths are switched off ("underwater oxygen")', (w) => A.breath(w), ['left', 'right', 'under']],
      ['snuff', 'Snuff', 'a candle snuffed from its side', (w) => A.snuff(w), ['left', 'right']], ['steps', 'Steps overhead', 'heels across the ceiling, stopping over the table', (w) => A.steps(w === 'right' ? 1 : -1), ['left', 'right']],
      ['floor', 'The floor takes weight', 'boards under the table, one at a time, coming toward you', () => A.floorLoad(5)], ['latch', 'Cellar latch', 'the thumb piece lifts and the latch drops, under the table', () => A.latch()],
      ['house', 'The house groans', 'the frame working in the wind, the window ticking on the left', () => A.house()], ['claw', 'Claw under the table', 'nails dragged under the table', () => A.claw()],
      ['gouge', 'Gouge', 'the scratch\'s own sound, a stick-slip of catches', (w) => A.gouge(w === 'right' ? 1 : -1, 2.4), ['left', 'right']], ['splinter', 'Splinter', 'a letter or a face splits: dry wooden snaps', () => A.splinter(1)],
      ['spill', 'Water running', 'water running onto the board', () => A.spill(4)], ['pass', 'Something passes', 'air moving as something large walks past', () => A.pass()], ['gust', 'A gust', 'a rush of air across the table', (w) => A.gust(w === 'right' ? -1 : 1), ['left', 'right']],
      ['ignite', 'A wick catches', 'a soft whump and a hiss', () => A.ignite()], ['crackle', 'Ember crackle', 'while letters scorch', () => A.crackle(2)], ['tock', 'A letter lands', 'the small wooden tock (hard: a slam)', () => A.tock(true)],
      ['tap', 'Tap on the glass', 'a fingernail on the glass in your hand', () => A.tap()], ['strike', 'The clock strikes', 'the wall clock, the hour\'s count (three here)', () => A.strike(3, { level: 1 })], ['match', 'The match', 'the title\'s match strike', () => A.strike()],
      ['heart', 'The heartbeat', 'a slow low heartbeat (under the fight), four seconds', async () => { A.heartbeat(true); await sleep(4000); A.heartbeat(false); return true; }],
      ['flutter', 'Flames pulled', 'both flames pulled hard in a draft, three seconds', async () => { A.flutter(1); await sleep(3000); A.flutter(0); return true; }],
      ['hush', 'The hush', 'everything outside stops dead, comes back thinner', () => A.hush(4)], ['approach', 'The walk up', 'the walk-up\'s sounds: wind, crickets thinning, the screen door, the porch bulb, a TV, one board', () => A.approach(8)],
      ['screen', 'The screen door', 'the screen door tapping in the wind', () => A.screenDoor()],
      ['thrum', 'The thrum', 'the sub thrum under the bed: rise2, rise4, hold, grit, cut', (w) => A.thrum(w), ['rise2', 'rise4', 'hold', 'grit', 'cut']], ['silence', 'The silence cut', 'every sound out for a second and a half, then back', () => A.silence(1500)],
    ];
    for (const [k, label, what, fn, sides] of SYN) add('synth:' + k, { group: 'sound', label, what, status: 'live', sub: 'Synthesized (the engine\'s own)', sides: sides || null, fire: (w) => { ensureAudio(); const r = fn(w); return r === undefined ? true : r; } });
    add('synth:buzz', { group: 'sound', label: 'The buzz as a sound', what: 'the heartbeat and the buzz become sound at the ear (9): not built', status: 'idea', sub: 'Synthesized (the engine\'s own)' });
    // the demon's calls, as it calls them (game.js playSfx: the faces look first, the take is placed, the picture moves)
    const DEMON_SFX = ['knock', 'knocks', 'steps', 'light', 'near', 'stairs', 'creak', 'door', 'shut', 'chair', 'thud', 'scratch', 'nails', 'drag', 'breath', 'gasp', 'latch', 'rattle', 'floor', 'house', 'glass', 'chime', 'silence', 'whisper', 'voices', 'shh', 'click', 'tap', 'walls'];
    for (const k of DEMON_SFX) add('sfx:' + k, { group: 'sound', label: k, what: 'as the demon calls it: the faces look, the take is placed, the picture moves with its weight', status: 'live', sub: 'The demon\'s sounds, as it calls them', sides: SIDES5,
      fire: (w) => { ensureAudio(); GB.playSfx(k, w || ''); return true; } });

    let manifest = null;
    const takeCache = new Map();
    async function loadTake(f) {
      if (takeCache.has(f)) return takeCache.get(f);
      const p = fetch(SFX_DIR + f).then((r) => (r.ok ? r.arrayBuffer() : null)).then((ab) => (ab ? A.decode(ab) : null)).catch(() => null);
      takeCache.set(f, p); return p;
    }
    function registerManifest(m) {
      manifest = m;
      for (const [kind, list] of Object.entries(m)) {
        if (kind.startsWith('_') || !Array.isArray(list)) continue;
        const files = list.map((e) => (typeof e === 'string' ? { file: e, gain: 1 } : e && typeof e.file === 'string' ? { file: e.file, gain: +e.gain || 1 } : null)).filter(Boolean);
        add('sound:' + kind, { group: 'sound', label: kind, kind, what: files.length + ' take' + (files.length === 1 ? '' : 's') + ' in the manifest', status: 'live', sub: 'Recorded (the manifest), placed by hand', sides: SIDES5, files: files.map((x) => x.file),
          fire: (w) => { ensureAudio(); A.lastTake = null; const n = A.rec(kind, WHERE[w] || WHERE.front); return n ? true : 'no take of ' + kind + ' is loaded or switched on yet'; } });
        for (const { file, gain } of files) {
          const off = OFF_TAKE(file), heard = HEARD[file], fresh = isNewTake(file);
          const tag = off ? 'switched off' : heard || (fresh ? 'new, unheard' : '');
          add('take:' + file, { group: 'sound', label: file, kind, file, tag, gain, what: kind + (gain !== 1 ? ', gain ' + gain : '') + (off ? '. Switched off in audio.js: never plays tonight' : ''), status: off ? 'made' : 'live', sub: 'take',
            async fire() {
              ensureAudio();
              const buf = await loadTake(file); if (!buf) return 'the file did not load';
              const via = A.has(kind) ? kind : Object.keys(m).find((k) => !k.startsWith('_') && A.has(k));
              if (!via) return 'no take of any kind is loaded yet';
              const n = A.rec(via, Object.assign({ take: buf }, WHERE.front), 0.8 * gain);
              return n ? (via === kind ? true : 'played (through the ' + via + ' slot: ' + kind + ' has no take switched on)') : 'did not play';
            } });
        }
      }
      render();
    }
    fetch(SFX_DIR + 'manifest.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((m) => { if (m) registerManifest(m); }).catch(() => {});

    // ---------------------------------------------------------------- the panel
    const css = `
html.reel-side{background:#000}
html.reel-side body{position:fixed!important;top:0!important;left:0!important;bottom:var(--reel-band,0px)!important;right:400px!important;width:auto!important;height:auto!important;transform:translateZ(0);overflow:hidden}
#reel{position:fixed;top:0;right:0;bottom:0;width:400px;z-index:2147483000;display:flex;flex-direction:column;box-sizing:border-box;
  background:rgba(12,10,8,.94);color:#b8ab8e;border-left:1px solid #2a231b;font:15px/1.45 var(--fell,'IM Fell English',Georgia,serif);
  box-shadow:-18px 0 40px rgba(0,0,0,.55);transition:transform .25s ease;-webkit-user-select:none;user-select:none}
#reel.away{transform:translateX(400px)}
#reel *{box-sizing:border-box}
#reel .scroll{flex:1;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;padding:0 14px 40px}
#reel .scroll::-webkit-scrollbar{display:none;width:0;height:0}
#reel header{padding:14px 14px 8px;border-bottom:1px solid #241e17}
#reel h1{margin:0;font:400 23px/1 var(--print,'IM Fell English SC',Georgia,serif);letter-spacing:.12em;color:#d9cba8}
#reel .build{margin:6px 0 0;font-size:12.5px;color:#7d725f;line-height:1.35}
#reel .now{margin:6px 0 0;font-size:12.5px;color:#9c8f74;min-height:30px}
#reel .tab{position:absolute;left:-30px;top:12px;width:30px;height:64px;border:1px solid #2a231b;border-right:0;border-radius:4px 0 0 4px;background:rgba(12,10,8,.94);
  color:#8e8269;font:400 13px var(--print,Georgia,serif);letter-spacing:.1em;writing-mode:vertical-rl;cursor:pointer;padding:0}
#reel button{font:inherit;color:#cdbf9e;background:#1b1611;border:1px solid #33291f;border-radius:3px;padding:4px 7px;cursor:pointer;line-height:1.2;text-align:left}
#reel button:hover{background:#261e16;border-color:#4a3b2b;color:#e4d6b4}
#reel button:active{background:#33281c}
#reel button:disabled{opacity:.4;cursor:default}
#reel button.on{border-color:#7a4a2a;color:#e7c9a0}
#reel .start{display:block;width:100%;margin:12px 0 4px;padding:10px 10px;font:400 17px var(--print,Georgia,serif);letter-spacing:.1em;text-align:center;background:#2a1b10;border-color:#5a3a22;color:#e9d7b0}
#reel .ctl{display:grid;gap:7px;margin:10px 0 4px}
#reel .ctl .lab{font-size:12.5px;color:#8a7e66;letter-spacing:.04em;margin-bottom:2px}
#reel .btns{display:flex;flex-wrap:wrap;gap:4px}
#reel .btns button{padding:4px 7px;font-size:13.5px}
#reel details{border-top:1px solid #241e17;padding:2px 0}
#reel summary{list-style:none;cursor:pointer;padding:9px 0 7px;font:400 16px var(--print,Georgia,serif);letter-spacing:.08em;color:#d2c3a0;display:flex;justify-content:space-between;align-items:baseline}
#reel summary::-webkit-details-marker{display:none}
#reel summary .n{font:12.5px var(--fell,Georgia,serif);color:#7d725f;letter-spacing:0}
#reel details[open] summary{color:#e6d8b6}
#reel .sub{margin:10px 0 4px;font-size:12.5px;color:#8a7e66;letter-spacing:.04em;font-style:italic}
#reel .row{padding:6px 0 7px;border-bottom:1px solid #1d1813}
#reel .row .top{display:flex;gap:6px;align-items:flex-start;justify-content:space-between}
#reel .row .fire{flex:1;min-width:0}
#reel .row .label{flex:1;min-width:0;color:#a89a7c;padding:4px 0}
#reel .row .what{margin:3px 0 0;font-size:13px;color:#857a64;line-height:1.35}
#reel .row .res{margin:2px 0 0;font-size:12.5px;color:#a5703e;min-height:0}
#reel .row.flash{background:rgba(120,60,20,.12)}
#reel .chip{flex:none;font:11.5px/1 var(--fell,Georgia,serif);letter-spacing:.03em;padding:4px 5px;border-radius:2px;white-space:nowrap;margin-top:2px}
#reel .c-live{color:#d49a62;border:1px solid #6b4426}
#reel .c-made{color:#a99c80;border:1px dashed #4f4535}
#reel .c-missing{color:#7f7563;border:1px solid #3a332a;text-decoration:line-through}
#reel .c-idea{color:#7a705e;border:1px dotted #4a4234}
#reel .tag{display:inline-block;margin-left:4px;font-size:11.5px;color:#c58a54;border:1px solid #5a3a22;border-radius:2px;padding:1px 4px}
#reel .tag.kept{color:#9fae7e;border-color:#46502f}
#reel .tag.rejected,#reel .tag.off{color:#7f7563;border-color:#3a332a;text-decoration:line-through}
#reel .sides{display:flex;flex-wrap:wrap;gap:3px;margin-top:4px}
#reel .sides button{padding:3px 7px;font-size:13px}
#reel .takes{margin:5px 0 0 8px;display:grid;gap:3px}
#reel .take{display:flex;gap:6px;align-items:center;font-size:13px;color:#9a8d72}
#reel .take button{padding:2px 7px;font-size:12.5px}
#reel .take .fn{flex:1;min-width:0;overflow-wrap:anywhere}
#reel ol.ifthen{margin:4px 0 8px;padding:0;list-style:none;display:grid;gap:8px}
#reel ol.ifthen li{font-size:13.5px;color:#a6997c;line-height:1.4}
#reel ol.ifthen b{font-weight:400;color:#dccdaa}
#reel ol.ifthen a{color:#c98d57;text-decoration:none;border-bottom:1px dotted #6b4426;cursor:pointer}
#reel .foot{margin:16px 0 0;font-size:12.5px;color:#6f6553}
`;
    const st = document.createElement('style'); st.id = 'reelCss'; st.textContent = css; document.head.appendChild(st);
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    const panel = el('aside'); panel.id = 'reel'; panel.setAttribute('aria-label', 'The reel: every trick the night can do');
    const tab = el('button', 'tab', 'THE REEL'); tab.type = 'button'; tab.title = 'Hide or show the reel';
    const head = el('header'); const h1 = el('h1', null, 'The reel');
    const build = el('p', 'build', 'game.js … · the night is not talking to the demon (offline: no model call) · nothing is kept');
    const now = el('p', 'now', '');
    head.append(h1, build, now);
    const scroll = el('div', 'scroll');
    panel.append(tab, head, scroll);
    // the panel sits beside the game, not over it: while it is out the page's body (and every fixed thing in it, the canvas first) is the window
    // less the panel, at the window's own shape (top-left, black below: the game reads a pointer's clientX and clientY as its own canvas's, so the
    // canvas stays at 0,0), so the game frames the table exactly as it does in the whole window, smaller, both candles in view; put away, the
    // game has the whole window again
    document.documentElement.appendChild(panel);
    const band = () => { const w = Math.max(200, innerWidth - 340), h = (w * innerHeight) / innerWidth; document.documentElement.style.setProperty('--reel-band', Math.max(0, Math.round(innerHeight - h)) + 'px'); };
    addEventListener('resize', band);
    const side = (open) => { panel.classList.toggle('away', !open); document.documentElement.classList.toggle('reel-side', open); store.set('away', !open); band(); dispatchEvent(new Event('resize')); };
    side(!store.get('away', false));
    tab.addEventListener('click', () => side(panel.classList.contains('away')));
    // a press on the panel never takes the focus from the box they are typing in, and never lands on the game's keys
    panel.addEventListener('mousedown', (e) => { if (e.target.closest('button, summary')) e.preventDefault(); });
    panel.addEventListener('keydown', (e) => e.stopPropagation());

    // the build: the hash of game.js as loaded (the same ten characters build-pages.sh puts in ?v=)
    (async () => {
      const s = [...document.scripts].find((x) => /(?:^|\/)game\.js(?:\?|$)/.test(x.getAttribute('src') || ''));
      const v = s && /[?&]v=([0-9a-f]+)/.exec(s.src);
      let h = v ? v[1] : '';
      try { if (!h && s && crypto.subtle) { const ab = await (await fetch(s.src, { cache: 'force-cache' })).arrayBuffer(); h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', ab))].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 10); } } catch (e) { /* unknown */ }
      build.textContent = 'game.js ' + (h || 'unknown') + (v ? '' : ' (this copy, hashed here)') + ' · the night is not talking to the demon: no server call, no model call' + (NET.api ? ' (its address was set and is held off)' : '') + ' · nothing the reel does is kept';
      panel.dataset.build = h;
    })();

    const say = (row, msg) => { const r = row && row.querySelector('.res'); if (r) r.textContent = msg || ''; if (row) { row.classList.add('flash'); setTimeout(() => row.classList.remove('flash'), 400); } };
    const LOG = (window.__reelLog = []);
    async function fireItem(name, arg, row) {
      LOG.push({ name, arg: arg || '', t: Math.round(performance.now()) });
      ensureAudio();
      let out;
      try { out = await R.fire(name, arg); } catch (e) { out = { error: String((e && e.message) || e) }; }
      const msg = out && out.error ? 'error: ' + out.error : typeof out === 'string' ? out : out === false || out == null || out === 0 ? 'did nothing (the night refused it now, or it is not wired)' : '';
      say(row, msg);
      return out;
    }

    // ---- Start, and the night's controls
    async function start() {
      if (live()) return 'the table is already up';
      ensureAudio();
      const warn = document.getElementById('warn'); if (warn && !warn.hidden) warn.click();
      // no card, no walk-up: the walk-up's still for a breath instead of its film, no match film, and the candles catch the way they do for a
      // table this browser has sat at before (quicker: the reel's own memory says it has been here once)
      if (GB.EST) { GB.EST.hold = 300; GB.EST.skipAfter = 0; }
      for (const id of ['estVid', 'matchOut']) { const v = document.getElementById(id); if (v && v.getAttribute('src')) { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* gone */ } } }
      try { const k = 'goodbye.visits', v = JSON.parse(localStorage.getItem(k) || '{}') || {}; v[placeId()] = Math.max(1, +v[placeId()] || 0); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* first visit then */ }
      const s = document.getElementById('strike');
      for (let i = 0; i < 100 && s.disabled; i++) await sleep(100);
      s.click();
      for (let i = 0; i < 300 && !(GB.S.live && live()); i++) await sleep(100);
      return live() ? 'at the lit table' : 'still on its way';
    }
    window.__reelStart = start;
    const startBtn = el('button', 'start', 'Start: straight to the lit table'); startBtn.type = 'button';
    startBtn.title = 'no card, no walk-up, no demon: the candles catch and the table is up';
    startBtn.addEventListener('click', async () => { startBtn.disabled = true; startBtn.textContent = 'Lighting the candles…'; const r = await start(); startBtn.textContent = 'Start: straight to the lit table'; startBtn.disabled = false; now.dataset.msg = r; });
    scroll.append(startBtn);

    const ctl = el('div', 'ctl');
    const ctlRow = (lab, buttons) => { const w = el('div'); w.append(el('div', 'lab', lab)); const b = el('div', 'btns'); for (const [t, fn, tip] of buttons) { const x = el('button', null, t); x.type = 'button'; if (tip) x.title = tip; x.addEventListener('click', async () => { ensureAudio(); try { const r = await fn(x); if (typeof r === 'string') now.dataset.msg = r; } catch (e) { now.dataset.msg = 'error: ' + (e && e.message); } }); b.append(x); } w.append(b); ctl.append(w); return b; };
    // the faces' clock: below 4 the awakening (the printed faces, then the tells), from 4 the ladder (L = minutes - 4) and the moon's bands
    const setMinutes = (m) => {
      if (m >= 4) GB.arc.at(m - 4);
      else { ARC.t = m * 60; ARC.M = m; ARC.bonus = 0; ARC.B = ARC.Bd = 0; }
      return 'the faces\' clock at minute ' + m;
    };
    // where in the night (Pierce, 2026-10-10: "the x1 x10 x60 is not great ... make this thing much easier for me"): one row of plain words, no rates
    ctl.append(el('div', 'sub', 'A night is about twenty minutes. The free part is the first two or three. The taking comes between minute three and six, sooner if they dare it. Then the house is in until they win GOOD BYE; at about twenty-five it finishes on its own.'));
    ctlRow('Jump to', [['the start', () => setMinutes(0), 'the printed faces, asleep and still'], ['minute 2', () => setMinutes(2), 'the first tells: a lid lifts a pixel while you look away'], ['minute 5', () => setMinutes(5), 'awake; the moon shy, the sun afraid'],
      ['minute 8', () => setMinutes(8), 'sympathy: an ember in the moon\'s eyes'], ['minute 11', () => setMinutes(11), 'uneasy: a crack, the ink warming'], ['minute 14', () => setMinutes(14), 'hungry: the glow, a scorch ring'], ['minute 17', () => setMinutes(17), 'angry: ink red, ember eyes']]);
    GB.arc.rate(1);
    ctlRow('The dread', [0, 2, 4, 6, 8, 10].map((d) => [String(d), () => { GB.setDread(d); return 'dread ' + d; }]));
    ctlRow('The night', [
      ['The taking', () => { GB.possess('reel'); return 'the taking: about thirty seconds'; }, 'NO to YES, the smoke, the silence, the thrum'],
      ['Hold GOOD BYE', async () => { GB.S.sitAt -= 13 * 60 * 1000; GB.bye.begin('reel'); await sleep(3000); GB.bye.end('reel'); return 'held three seconds, let go (the night aged past minute twelve first: the fight is closed before that)'; }, 'after the taking: the evil faces, the tug, a line; before the taking the piece just slides off'],
      ['Left candle out', () => { GB.blowCandle(0, { dur: 700, dir: -1 }); return 'the left candle out (the sun\'s side)'; }],
      ['Right candle out', () => { GB.blowCandle(1, { dur: 700, dir: 1 }); return 'the right candle out (the moon\'s side)'; }],
      ['Relight', () => { GB.relightCandle(0); GB.relightCandle(1); GB.G.blackT = 0; return 'both lit'; }],
      ['The blackout', () => { GB.blackout(); return 'the blackout'; }],
    ]);
    ctlRow('The clock, the sound, the picture', [
      ['The hour', () => { const h = new Date().getHours(); GB.clockTest(h); return 'the clock strikes ' + (h % 12 || 12); }, 'the strike for the hour it is now'],
      ['Midnight', () => { GB.clockTest(0); return 'twelve, then the bed drops out two seconds and comes back without the crickets'; }],
      ['The thrum', () => { A.thrum('rise4'); return 'the thrum'; }], 
      ['The blink', () => { GB.blinkScreen('reel'); return 'does nothing now: the screen cut is out (Pierce, 2026-10-10)'; }], ['The shake', () => { GB.shake('slam'); return 'the shake: a slam, 5 px'; }],
    ]);
    scroll.append(ctl);

    // ---- the if-then (what runs today; the buttons named go to their rows)
    const go = (name) => `<a data-go="${name}">${name.replace(/^[a-z]+:/, '').replace(/[-:]/g, ' ')}</a>`;
    const IFTHEN = [
      `<b>The free part.</b> Today nothing is behind a wall: the whole night is free on /next/. The design (the wall: ${go('later:wall')}, idea only) charges after the candles light and the faces look around, before the first question.`,
      `<b>The first minutes.</b> The card waits for a click; the match; the walk up the drive (eight seconds, no footsteps); the candles catch on film, one, a beat, the other. The piece moves first (with the demon: its first move asks them something; in the reel, offline: an inch and back). The faces are the printed art, still, eyes heavy; tells only while they look away, until 4:00 (minutes 0 and 2 above). One or two of the opening's beats between 0:40 and 2:30: ${go('house:steps')}, ${go('house:blowout')}, ${go('house:knock1')}, ${go('house:creak')}, ${go('house:gutter')}.`,
      `<b>If they troll.</b> The room reacts in under a tenth of a second, before any answer: the troll table below, one row per kind. The demon is handed one sentence on what it is dealing with and answers cold (that part needs the demon: not in the reel). Before minute 7 the moon flinches instead of smirking.`,
      `<b>If they sit quiet.</b> The demon moves on its own after about fifteen seconds (needs the demon). Between, the room: 45 s a knock on the left and both faces look down at the box, 90 s the piece goes to a letter by itself, 180 s the faces look round and a breath behind (${go('troll:silent')}).`,
      `<b>The faces, and when.</b> Minute 0 to 4: asleep, then deniable tells. 4 to 7 the moon is shy (${go('face:moon:watch')}), from 6:30 a faint soot. 7 to 10 sympathy: ember eyes. 10 to 13 uneasy: the first crack, the ink warming. 13 to 16 hungry: the glow, a scorch ring. 16 on angry, and the evil state flares once at the turn (${go('face:flash')}). Every look away steps it angrier where they cannot see (${go('face:ploy-step')}, ${go('face:ploy-snap')}). The sun is afraid all night and tries to warn them from 2:30 (${go('face:warn')}).`,
      `<b>The taking.</b> The demon calls it: the moment they dare it after its second reply, or about the third minute, never later than about the sixth. Offline it never comes on its own: ${go('ending:taking')}. Thirty seconds: the sun mourns and shuts its eyes, silence, smoke, thrum, countdown embers, NO to YES. After it the clock is dead and the moon's grin is burned in.`,
      `<b>GOOD BYE.</b> Before the taking, held a second: the gentle end (${go('ending:gentle')}). After it, the fight: the first try is lost if they let go (${go('ending:fight')}); the second always wins (${go('ending:fight-second')}), then the won ending (${go('ending:won-tail')}). Either way the first second and a half is the evil faces and a line (${go('ending:bye-first')}). The demon may end it itself (${go('ending:demon-leaves')}).`,
      `<b>The second visit.</b> Today: the walk up plays again (a click skips it after four seconds), the demon is told it is a return and what it remembers; a house left haunted opens at dread 4 and the title says "It's still here." The changed second night is idea only (${go('later:night2')}). The reel itself always plays a first visit: it keeps nothing.`,
      `<b>Not running today</b> (made or idea): the table's props, the looks and cutaways until their packages land (their rows say), ${go('house:blue')}, ${go('mark:scrape')}, ${go('mark:watch')}, ${go('mark:frost')}, ${go('mark:ripples')}.`,
    ];
    const ifthen = el('details'); ifthen.open = store.get('open.ifthen', true);
    const sumIf = el('summary'); sumIf.append(el('span', null, 'If, then'), el('span', 'n', 'what runs today'));
    const ol = el('ol', 'ifthen'); ol.innerHTML = IFTHEN.map((x) => '<li>' + x + '</li>').join('');
    ifthen.append(sumIf, ol); scroll.append(ifthen);
    ifthen.addEventListener('toggle', () => store.set('open.ifthen', ifthen.open));
    ol.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-go]'); if (!a) return;
      const row = scroll.querySelector(`[data-name="${CSS.escape(a.dataset.go)}"]`); if (!row) return;
      const d = row.closest('details'); if (d) d.open = true;
      row.scrollIntoView({ block: 'center', behavior: 'smooth' }); row.classList.add('flash'); setTimeout(() => row.classList.remove('flash'), 1200);
    });

    const groupsBox = el('div'); scroll.append(groupsBox);
    const foot = el('p', 'foot', ''); scroll.append(foot);

    // ---- the groups, drawn from whatever is registered
    let drawnN = -1;
    function render() {
      const items = R.list();
      drawnN = items.length;
      const byName = new Map(items.map((i) => [i.name, i]));
      const known = new Set(SECTIONS.flatMap((s) => s.groups));
      const extra = [...new Set(items.map((i) => i.group).filter((g) => !known.has(g)))].map((g) => ({ key: 'g-' + g, title: g, groups: [g] }));
      groupsBox.textContent = '';
      const counts = { live: 0, made: 0, missing: 0, idea: 0 };
      for (const sec of SECTIONS.concat(extra)) {
        const list = items.filter((i) => sec.groups.includes(i.group) && !(i.sub === 'take'));
        if (!list.length && sec.key !== 'table' && sec.key !== 'looks') continue;
        const d = el('details'); d.dataset.sec = sec.key; d.open = store.get('open.' + sec.key, sec.key === 'table' || sec.key === 'looks');   // (the films open by default: Pierce, 2026-10-10, "a special effects preview")
        d.addEventListener('toggle', () => store.set('open.' + sec.key, d.open));
        const tally = {}; for (const i of items.filter((i) => sec.groups.includes(i.group))) { tally[i.status] = (tally[i.status] || 0) + 1; counts[i.status] = (counts[i.status] || 0) + 1; }
        const sum = el('summary'); sum.append(el('span', null, sec.title), el('span', 'n', Object.entries(tally).map(([s, n]) => n + ' ' + (CHIP[s] || s)).join(' · ') || 'nothing registered yet'));
        d.append(sum);
        if (!list.length) d.append(el('p', 'what', sec.key === 'table' ? 'No prop is registered: the props package has not landed in this build (it registers prop:* when it does).' : 'No look is registered: the looks package has not landed in this build (it registers look:* and cut:* when it does).'));
        let lastSub = null;
        for (const it of list) {
          if (it.sub && it.sub !== lastSub) { d.append(el('div', 'sub', it.sub)); lastSub = it.sub; }
          d.append(row(it, items));
        }
        groupsBox.append(d);
      }
      foot.textContent = items.length + ' tricks registered: ' + Object.entries(counts).map(([s, n]) => n + ' ' + CHIP[s]).join(', ') + '. Packages that land later add theirs here by themselves.';
      panel.dataset.items = String(items.length);
      void byName;
    }
    function row(it, items) {
      const r = el('div', 'row'); r.dataset.name = it.name; r.dataset.status = it.status;
      const top = el('div', 'top');
      const label = it.label || (it.what && it.what.length <= 48 ? it.what : it.name.replace(/^[a-z]+:/, '').replace(/[-_:]/g, ' '));
      const sides = Array.isArray(it.sides) && it.sides.length ? it.sides : null;
      if (it.can && !sides) { const b = el('button', 'fire', label); b.type = 'button'; b.dataset.fire = it.name; b.addEventListener('click', () => fireItem(it.name, undefined, r)); top.append(b); }
      else top.append(el('span', 'label', label));
      top.append(el('span', 'chip c-' + it.status, CHIP[it.status] || it.status));
      r.append(top);
      // the film behind a prop or a look, as a plain link (Pierce, 2026-10-10: "where are all my other videos? ... i need to see these in action")
      try {
        const place = GB.place || {}, m = /^(prop|look):([^:]+)/.exec(it.name);
        if (m) {
          const files = [];
          if (m[1] === 'prop' && place.props && place.props[m[2]] && place.props[m[2]].clip) files.push(['the take', place.props[m[2]].clip]);
          if (m[1] === 'look' && place.looks && place.looks[m[2]]) { const L = place.looks[m[2]]; for (const [k, lab] of [['in', 'in'], ['hold', 'hold'], ['out', 'out'], ['clip', 'the take']]) if (L[k] && L[k].src) files.push([lab, L[k].src]); }
          if (files.length) { const f = el('div', 'what'); f.append('film: '); files.forEach(([lab, src], i) => { const a = el('a', null, lab); a.href = (/^(assets\/|https?:)/.test(src) ? '' : 'assets/clips/' + (place.id || 'farmhouse') + '/') + src; a.target = '_blank'; a.rel = 'noopener'; a.style.color = '#c9a86a'; if (i) f.append(' · '); f.append(a); }); r.append(f); }
        }
      } catch (e) { /* no film to link */ }
      if (sides && it.can) {
        const s = el('div', 'sides');
        for (const w of sides) { const b = el('button', null, w); b.type = 'button'; b.dataset.fire = it.name; b.dataset.arg = w; b.addEventListener('click', () => fireItem(it.name, w, r)); s.append(b); }
        r.append(s);
      }
      if (it.what && it.what !== label) r.append(el('p', 'what', it.what));
      if (Array.isArray(it.files) && it.files.length) {
        const t = el('div', 'takes');
        for (const f of it.files) {
          const tk = items.find((x) => x.name === 'take:' + f); if (!tk) continue;
          const line = el('div', 'take'); line.dataset.name = tk.name;
          const b = el('button', null, 'play'); b.type = 'button'; b.dataset.fire = tk.name; b.addEventListener('click', () => fireItem(tk.name, undefined, r));
          const fn = el('span', 'fn', f);
          if (tk.tag) { const tg = el('span', 'tag ' + (tk.tag === 'kept' ? 'kept' : tk.tag === 'rejected' ? 'rejected' : tk.tag === 'switched off' ? 'off' : ''), tk.tag); fn.append(tg); }
          line.append(b, fn); t.append(line);
        }
        r.append(t);
      }
      r.append(el('p', 'res', ''));
      return r;
    }
    render();
    // packages that register late, and the state line
    setInterval(() => {
      if (R.items.size !== drawnN) render();
      try {
        const M = ARC.M, L = M - 4, band = L < 0 ? (ARC.B < 0.999 ? 'asleep' : 'awake') : ['shy', 'sympathy', 'uneasy', 'hungry', 'angry'][L < 3 ? 0 : L < 6 ? 1 : L < 9 ? 2 : L < 12 ? 3 : 4];
        const S = GB.S, c = GB.G.candleOutT || [0, 0];
        const where = !S.started ? 'the title' : S.possessing ? 'the taking' : S.struggling ? 'the fight' : S.ending ? 'the ending' : live() ? 'the table' : 'on the way in';
        if (now.dataset.msg && now.dataset.msgAt !== now.dataset.msg) { now.dataset.msgAt = now.dataset.msg; now.dataset.msgT = String(Date.now()); }
        if (now.dataset.msg && Date.now() - (+now.dataset.msgT || 0) > 6000) { now.dataset.msg = ''; now.dataset.msgAt = ''; }
        now.textContent = where + ' · minute ' + M.toFixed(1) + ' (' + band + ') · dread ' + (+S.dread).toFixed(1) + ' · candles ' + (c[0] >= 1 ? 'out' : 'lit') + '/' + (c[1] >= 1 ? 'out' : 'lit') + ' · clock ' + A.clockState() + (S.haunted ? ' · haunted' : '') + ' · faces ' + GB.FACE.sun.expr + '/' + GB.FACE.moon.expr + (now.dataset.msg ? ' · ' + now.dataset.msg : '');
      } catch (e) { /* between nights */ }
    }, 500);
    window.__reel = { NET, KEPT, render, fire: fireItem, start, panel };
  }
})();
