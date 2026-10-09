// GOODBYE — the places. One scene template in game.js; each place is data.
// There is one house now, the Farmhouse: poor, old and peeling, with no date and no era. The Penthouse, the Basement, the Parlor, the Cottage and the
// Garden are gone from this file (git keeps them): five skins of one engine repeated each other. All the work goes into this one.
// A place is the room: its photographs, board, candles, light, sound and film. It holds no words for the board: every word the board
// spells is the demon's, live (game.js liveMove; the site's backend/goodbye/demons.js). The question scripts, the room's lines, the
// spirit and the night plan are gone (git keeps them).
(function () {
  'use strict';

  // art.plateHi: the same table photo resized to twice its size (Lanczos, nothing added), for big and Retina screens.
  const FARMHOUSE = {
    id: 'farmhouse', name: 'The Farmhouse', when: 'Tonight',
    caption: '1:13 AM', clockStart: '1:13 AM', table: 'a farmhouse table',
    art: { exterior: 'assets/places/farmhouse-exterior.jpg?v=9d21f78d84', exteriorPort: 'assets/places/farmhouse-exterior-port.jpg?v=a95be30410',
      // the walk up the drive (Flow, image to video, first frame = the still; played once, never looped, encoded without sound: the walk's own
      // sound is the game's, audio.js A.approach: no footsteps): files in assets/clips/farmhouse/. A file that is not there, or
      // is slow, gives the push-in still without a word.
      exteriorClip: { land: 'exterior-land.mp4', port: 'exterior-port.mp4' }, thumb: 'assets/places/thumb-farmhouse.jpg?v=8f93fe68ae', plate: 'assets/places/farmhouse-plate.jpg?v=faaac2a480', plateHi: 'assets/places/farmhouse-plate-2x.jpg?v=b1a8c042c1', board: 'assets/places/farmhouse-board.jpg?v=efcffa0b28' },
    candles: [{ x: 131, y: 76 }, { x: 1368, y: 146 }],
    // the live flames: wick (x, y), lean of the photographed flame (tilt, radians from up), length, and the spot
    // darkened on the wick. The photographed flames are painted out of the plate files, so hide only chars the wick.
    flames: [
      { x: 152.3, y: 91.4, tilt: -0.95, len: 76.0, hide: { x: 153.5, y: 92.0, r: 3 } },
      { x: 1353.5, y: 158.2, tilt: 0.88, len: 53.0, hide: { x: 1353.5, y: 158.8, r: 3 } },
    ],
    // The board lies on the clear wood in the middle (2026-10-08; Pierce: "my board is on top of the plate and that looks wrong"): the largest 3:2
    // rectangle that covers no prop on the table (the dinner plate and the napkins above it, the mug below, the matches and glasses to the left,
    // the pen and the keys to the right), with the screen's middle as its own. On the 1376 by 768 plate it is x 406 to 982, y 196 to 578; it is
    // 86.8% of the old board (772 wide). frameRect is the old board's rectangle: the camera still frames that, so the photo and the candles sit on
    // the screen exactly where they did (game.js FRAME).
    boardRect: { cx: 807, cy: 453.5, w: 670, h: 446.7 },
    frameRect: { cx: 807, cy: 433, w: 772, h: 514.7 },
    // A phone held upright: the same table photographed 9:16 (cropped to 1:2), the candles at the top, the board under them.
    portrait: {
      plate: 'assets/places/farmhouse-plate-port.jpg?v=38aee62eaf',
      world: { w: 1000, h: 2000 },
      candles: [{ x: 92, y: 168 }, { x: 879, y: 304 }],
      flames: [
        { x: 107.6, y: 197.7, tilt: -0.42, len: 67.0, hide: { x: 107.6, y: 197.7, r: 4.7 } },
        { x: 875.0, y: 328.5, tilt: 0.2, len: 50.5, hide: { x: 875.0, y: 328.5, r: 4.4 } },
      ],
      boardRect: { cx: 503, cy: 858, w: 820, h: 546.5 },
    },
    board: {
      font: 'IM Fell English SC', weight: '400', stack: '"IM Fell English SC", "IM Fell English", Georgia, serif',
      ink: 'rgba(42,24,10,0.92)', style: 'ink', tint: 'rgb(232,204,168)', stars: true, spacing: '6px', scale: 1,
      margin: { text: 'always say goodbye', font: '30px "Cedarville Cursive", "Segoe Script", cursive', color: 'rgba(208,199,182,.55)', x: -300, y: 362, rot: -0.025, align: 'left' },
    },
    faces: { kind: 'sunmoon', show: 'always', style: 'ink', ink: 'rgba(38,20,8,0.9)', sun: 'rgba(205,160,95,.22)', moon: 'rgba(225,215,190,.2)', shade: 'rgba(30,18,8,.28)', crater: 'rgba(30,18,8,.16)', white: 'rgba(240,226,196,.5)', line: 1 },
    film: { tint: [4, 6, 12], grain: 0.07, sepia: 0 },
    ambience: { wind: 0.2, clock: true, crickets: true, extra: '' },
    // There is no spirit written here any more, and no script: every word on the board is the demon's, live from the site (Pierce,
    // 2026-10-04). The site's backend/goodbye/demons.js holds who it can be; this file holds only the room.
    // The pencil line under the board (no cards): one suggestion at a time, in an old hand. Tapping it asks q. They are the player's
    // questions, never an answer: whatever is asked, the demon answers it.
    prompts: [
      { note: 'ask what its name is', q: 'What is your name?' },
      { note: 'ask how old it is', q: 'How old are you?' },
      { note: 'ask how it died', q: 'How did you die?' },
      { note: "ask if it's alone", q: 'Are you alone?' },
      { note: 'ask where it is', q: 'Where are you?' },
      { note: 'ask what it wants', q: 'What do you want?' },
    ],
    // the second pencil note, in the board's lower margin. Typing it or tapping it asks forbidden (the demon may take the board for it).
    dare: "never ask it if there's a demon",
    forbidden: 'Is there a demon here?',
    demon: {
      id: 'bael', name: 'BAEL', display: 'Bael', subtitle: 'King of the East · 66 legions',
     
      portrait: 'assets/bael.jpg',
      faces: { up: 'assets/bael-up.jpg', right: 'assets/bael-right.jpg', down: 'assets/bael-down.jpg', left: 'assets/bael-left.jpg' },
      move: 'kick', moveName: 'Christ Kick', moveRef: '',
    },
  };

  // ---------------------------------------------------------------- clips (DIRECTION.md section 3, the birdcalls technique)
  // A place's table can be film instead of a still. Drop the files in assets/clips/<place id>/ and name them here;
  // nothing in game.js changes. A clip that is not listed, or does not load, is simply not used: the table stays the
  // still photo with the engine's own flames, exactly as it is today.
  //   land: 16:9 files (1280 x 720, H.264, about 2.5 Mbps), drawn as the whole wide table.
  //   port: 9:16 files (720 x 1280), drawn inside the middle 9:16 of the upright table (the still shows outside it).
  //   keys: the shared still frames (K-DARK, K-HALF), shown when a clip ends and no clip follows.
  //   fire: K-LIT's own flames on black (tools/fire-frames.py), screened over the still in place of drawn flames.
  //         K-LIT is the place's own plate. Every clip starts and ends on one of these, so a switch is never seen.
  //   board: clips that start and end on the board itself (tools/board-frames.js writes that frame for Flow), drawn over the live
  //          board. None is listed: the embers, blue and green board clips are gone.
  // Clip names (first frame > last frame; no take may show a hand on the table, Pierce 2026-10-02): light (dark > lit),
  // idle (lit, loops; make it a palindrome), gust (lit > dark), relightSelf (dark > lit), blowoutL (lit > half), relightGhost (half > lit),
  // lean (lit > lit). There is no blue or green flame and no board embers any more (one look all night; the blue, green and embers files
  // are still in assets/clips/farmhouse, and nothing names or loads them).
  // Overlays shot on black: the possession's smoke (below: two threads off the wicks, filmed, never drawn). The hand out of the board and the fingertips on the glass are gone.
  // Example, once the files exist:
  //   FARMHOUSE.clips = {
  //     land: { idle: 'idle-16x9.mp4', gust: 'gust-16x9.mp4', blowoutL: 'blowout-l-16x9.mp4',
  //             keys: { dark: 'k-dark-16x9.jpg', half: 'k-half-16x9.jpg', blue: 'k-blue-16x9.jpg' } },
  //     port: { idle: 'idle-9x16.mp4', gust: 'gust-9x16.mp4' },
  //     board: { embers: 'board-embers.mp4' },
  //   };
  // The lean take is not listed (2026-10-03): it washed the whole candle out to a white blade for the first seconds of the possession, and
  // read as a tube of light, not a flame. The engine's own lean (the flames bend toward the planchette) does that moment.
  // The Farmhouse's film (art-v3/clips, Veo 3.1 in Flow, 2026-10-02). keys are the clips' own last frames, so a clip
  // that ends with nothing after it holds exactly where it stopped. fire: the photographed flames cut out of K-LIT
  // (tools/fire-frames.py), for any moment that has no clip of its own. Upright has no green film: the engine recolours.
  // board: cropped to the board itself (3:2), drawn exactly over the live board, upright too (the upright take moved
  // the numbers into the alphabet halfway through; board.port can hold one that holds still).
  // No hands under the board (Pierce, 2026-10-02): light (a man's hand from the bottom), relightSelf (a hand at the left
  // edge of the wide take) and relightGhost (an old hand from the top) are not listed. The engine does those moments
  // itself: the match in the dark for the opening, the candles relighting on their own, the ghost's match from the far
  // side. The files stay in the folder; nothing loads them.
  // The old table's films are not named any more (Pierce saw it "cuts to black"): idle, gust and blowoutL (idle-*, gust-*, blowout-l-*) and the
  // dark and half stills (keys/) were all made from the first plate (corn, glasses, another table). They played only when the flame film failed to
  // load, and then a candle going out jumped the table to that old photo, or to black. With them gone a candle event on a failed film is the
  // engine's own: the flames drawn (fire, below, K-LIT's own flames on black: the new plate's candles are the old plate's, untouched), blown and
  // relit by the engine (game.js blowout and blackout: plateStill, then blowCandle). The files stay in assets/clips/farmhouse/; a clip comes back
  // here only when it is shot from the current plate.
  FARMHOUSE.clips = {
    land: {
      fire: 'frames/fire-16x9.png',
    },
    port: {
      fire: 'frames/fire-9x16.png',
    },
    // The possession's smoke: two threads off the wicks (Pierce, 2026-10-04: the full-frame pour "came in too much and clearly not feeling like
    // part of the scene itself"). One film, two columns (tools/smoke-plumes.py): the flame family's own wick smoke (its ignite opens on a thread
    // off the unlit wick), cut out, slowed twelve times, the right column mirrored and half a film on. game.js drawPlumes lays each column along
    // a curve from its flame's tip, bending with the draft toward the planchette, under the room's light. A slot that is not named here, or a
    // file that is not there, shows nothing: the engine draws no smoke. (The pour, smoke-pour-*.mp4, is still in the folder; nothing loads it.)
    smoke: {
      plumes: { land: 'smoke-plumes.mp4', port: 'smoke-plumes.mp4' },
    },
    // the flame family (Flow, 2026-10-03; tools/flame-sprite.py): idle 2, up 4, right 4, left 12, down 2, out 10, ignite 8.
    // out is a dwindle with its own smoke trail at the end (and ignite opens on it): the only wick smoke there is.
    flames: {
      src: 'flames-9x16.mp4', fps: 24, anchor: [0.5007, 0.5672], tip: [0.4986, 0.2406],
      seg: { idle: [0, 16], up: [16, 20.1667], right: [20.1667, 24.3333], left: [24.3333, 28.5], down: [28.5, 34.6667], out: [34.6667, 41.0833], ignite: [41.0833, 47.25] },
      idleSync: [0], outSide: 'right',
      // how bright the flame at rest reads to the engine (the mean light of the idle's frames, as game.js famLum measures it: GOODBYE.FF.ref after the
      // idle has played; 2.2 to 2.5 in Chromium and WebKit). The room's light for a flame going out or catching is read off the film against it.
      lum: 2.4,
    },
  };
  // ---------------------------------------------------------------- the production's films (DIRECTION.md 3, 4, 7, 8; SHOTLIST.md, 2026-10-07)
  // Every picture the demon can call, by the name it calls it (spirit.js CLIPS and CUTS), and the ending's own. None of the files exist yet:
  // a slot named null draws nothing and asks the host for nothing (game.js playFilm, cutTo), and tools/build-pages.sh does not walk this
  // block (it walks clips.land, clips.port and clips.board only). When a clip comes back from Flow, name its file here, in assets/clips/
  // farmhouse/, and the engine plays it; nothing else changes. Stills for the cutaways: one each; clips off them start and end on the still.
  //   clips: the table, by trigger (first frame > last frame, SHOTLIST.md A). blue, blueIdle, blueOut: the taking's blue flames (T-BLUE,
  //   T-BLUE-IDLE, T-BLUE-OUT). handRise, glassTap: the ending's, shot on black (D-HAND-RISE, D-GLASS-TAP). cuts: the seven rooms (C).
  //   The taking asks for the blue the moment its countdown ends (game.js thrash: playFilm('blue'), DIRECTION.md 7): T-BLUE (K-LIT > K-BLUE,
  //   both flames shrink and turn a pale cold blue over two seconds, the warm light draining with them) is the one it plays; T-BLUE-IDLE
  //   (K-BLUE > K-BLUE, trembling, a palindrome) holds the haunted phase after it, and T-BLUE-OUT (K-BLUE > K-DARK) is the way they die.
  //   Null, as tonight, the ask is written to the night log and nothing is drawn: the engine's flames stay warm. Name the files here when
  //   Flow has them (day 5 of SHOTLIST.md) and the family plays; the demon's own clip 'blue' (clips.blue, below) is the same shot by its
  //   trigger name.
  FARMHOUSE.films = {
    blue: null, blueIdle: null, blueOut: null,
    handRise: null, glassTap: null,
    clips: {
      cloth: null, 'pencil-turn': null, 'pencil-off': null, 'pencil-back': null, 'pencil-down': null, 'lean-hold': null, lean: null,
      gust: null, relight: null, 'out-l': null, 'out-r': null, 'hands-relight': null, saucer: null, wax: null, 'board-slide': null,
      blue: null, 'blue-out': null, 'relight-blue': null, 'chair-back': null, fingers: null,
    },
    cuts: {
      hallway: { still: null, door: null, shadow: null, lamp: null },
      mantle: { still: null, pendulum: null, photo: null, candle: null },
      bathroom: { still: null, drip: null, mirror: null, curtain: null },
      door: { still: null, knocks: null, handle: null, 'peephole-1': null, 'peephole-2': null, 'peephole-3': null },
      cellar: { still: null, latch: null, open: null },
      stairs: { still: null, step: null, light: null },
      window: { still: null, breath: null },
    },
  };
  // ---------------------------------------------------------------- the table's props and the looks (the wiring of 2026-10-08)
  // FARMHOUSE.props: one entry per thing on the table that can misbehave (DIRECTION.md 13.2), by the name the demon calls it (game.js PROPS). Every
  // number is on the 1376 by 768 plate (plate-v4). game.js propPlay plays it; the props package (game.js) says how.
  //   A film (a region clip, Flow, SHOTLIST.md A3; files in assets/clips/farmhouse/props/):
  //     clip: the take (1920 by 1080, first frame the table), from/to: the seconds of it that are played (the take's dead time and its flaws cut off),
  //     ease: it slows to a stop at `to` instead of stopping dead (a take cut while the thing is still moving).
  //     reg: [sx, tx, sy, ty]: where a plate pixel is in the take (clip x = plate x * sx + tx; y likewise): measured by matching the take's first
  //       frame to the plate it was made against (SIFT, 150 to 280 points, under a pixel of error). It is not a plain scale: the take sits 4.5 px
  //       down. The four takes made against the earlier plate (napkins, matches, match-strike, moth fly) register the same way.
  //     tone: [r, g, b]: what the take is multiplied by to match the plate (the takes come out a little blue and a little bright).
  //     key: the plate after it, pixel for pixel, as a PNG whose alpha is the soft region the take is drawn through (the motion it covers, dilated,
  //       with about 14 plate px of feather); box: that PNG's rectangle on the plate. The take is drawn through the same alpha, so no seam shows,
  //       and the key stays for the rest of the night. chg/chgBox: the part of the key that differs from the plate (the thing itself, moved),
  //       drawn over any later prop's region so a later film never puts back what this one moved.
  //     sound: { kind, at } a manifest kind (assets/sfx/farmhouse/manifest.json) and the second of the played part it starts on; pos: where
  //       on the plate it is heard from.
  //   Code (no film): the flies, the phone, the remote. made: a take exists and is not played tonight; the words say why.
  const PROP_DIR = 'props/';
  FARMHOUSE.props = {
    // a breath lifts the top napkin and sets it down, and the next slides half out and stays (T-NAPKINS, made against the earlier plate: the
    // envelope that plate had below the holder is cut out of the region, so it never shows). Played to 3.0 s, where it is half out; easing.
    napkins: { clip: PROP_DIR + 'T-NAPKINS.mp4', from: 1.4, to: 3.0, ease: true, reg: [1.39522, 0.2, 1.39384, 4.83], tone: [0.99, 0.986, 0.929],
      key: PROP_DIR + 'K-NAPKINS.png', box: [713, 0, 971, 235], chg: PROP_DIR + 'K-NAPKINS-CHG.png', chgBox: [722, 12, 961, 227],
      sound: { kind: 'napkin', at: 0.45 }, pos: [840, 120] },
    // the fork turns on the plate with a small scrape and stops, its handle over the rim (T-FORK; key K-FORK-MOVED)
    fork: { clip: PROP_DIR + 'T-FORK.mp4', from: 1.4, to: 5.83, reg: [1.39553, -0.1, 1.39447, 4.71], tone: [0.978, 0.98, 0.904],
      key: PROP_DIR + 'K-FORK.png', box: [322, 21, 598, 252], chg: PROP_DIR + 'K-FORK-CHG.png', chgBox: [332, 28, 542, 223],
      sound: { kind: 'fork-scrape', at: 0.5 }, pos: [440, 110] },
    // the ring of keys slides toward the middle with a jingle (T-KEYS; key K-KEYS-MOVED)
    keys: { clip: PROP_DIR + 'T-KEYS.mp4', from: 0.7, to: 3.25, reg: [1.39538, -0.06, 1.39505, 4.49], tone: [0.993, 0.998, 0.911],
      key: PROP_DIR + 'K-KEYS.png', box: [899, 488, 1212, 700], chg: PROP_DIR + 'K-KEYS-CHG.png', chgBox: [908, 488, 1207, 693],
      sound: { kind: 'keys', at: 0.45 }, pos: [1100, 610] },
    // the cold mug turns on the planks until its handle points at the player (T-MUG-TURN; key K-MUG-TURNED)
    mug: { clip: PROP_DIR + 'T-MUG-TURN.mp4', from: 0.08, to: 3.92, reg: [1.3955, -0.07, 1.39512, 4.45], tone: [0.996, 0.998, 0.875],
      key: PROP_DIR + 'K-MUG.png', box: [240, 501, 500, 768], chg: PROP_DIR + 'K-MUG-CHG.png', chgBox: [264, 563, 480, 768],
      sound: { kind: 'mug-turn', at: 0.3 }, pos: [370, 660] },
    // one arm of the folded glasses opens, then the other, as if put on a face that is not there (T-GLASSES-OPEN; key K-GLASSES-OPEN)
    glasses: { clip: PROP_DIR + 'T-GLASSES-OPEN.mp4', from: 0.5, to: 3.67, reg: [1.39525, 0.18, 1.39505, 4.42], tone: [1, 0.999, 0.948],
      key: PROP_DIR + 'K-GLASSES.png', box: [0, 400, 377, 733], chg: PROP_DIR + 'K-GLASSES-CHG.png', chgBox: [95, 420, 357, 701],
      sound: { kind: 'glasses-open', at: 0.4 }, pos: [180, 570] },
    // the glass tips over with nothing touching it and rolls toward the board, cracked down its side (T-GLASS-BREAK, 0.75 to 3.0 s, easing to a
    // stop: after 3.0 the take rolls it back and grows a second glass where the first stood, so K-GLASS-BROKEN, which has that second glass, is
    // not used; the key is the take's own frame at 3.0). The crack, then the break as it lands; the picture jumps 4 px (shake 'glass-break'); the
    // water reaches the board and soaks along its grain (the marks' stain, from the glass's side; it dries from the edges over ten minutes).
    glass: { clip: PROP_DIR + 'T-GLASS-BREAK.mp4', from: 0.75, to: 3.0, ease: true, reg: [1.39477, 0.13, 1.39493, 4.57], tone: [0.988, 0.987, 0.922],
      key: PROP_DIR + 'K-GLASS.png', box: [959, 195, 1376, 486], chg: PROP_DIR + 'K-GLASS-CHG.png', chgBox: [968, 195, 1376, 486],
      sound: { kind: 'glass-crack', at: 0.35 }, sound2: { kind: 'glass-break', at: 1.05, shake: 'glass-break' }, pos: [1300, 235],
      water: { x: 1336, y: 233, rx: 30, ry: 34 }, stain: { place: 'glass', at: 1.6 } },
    // the moth: it wakes, spreads its wings and turns (M-WAKE, 6.58 to 7.92 s; key K-MOTH-WINGS), then lifts and goes (M-FLY, 0.58 to 1.42 s,
    // made against the earlier plate; key K-NOMOTH; the take's own flight crosses where that plate had envelopes, so the region stops short of
    // them and the engine takes the moth to the lens itself). After it the moth is gone for the night.
    'moth-wake': { clip: PROP_DIR + 'M-WAKE.mp4', from: 6.58, to: 7.92, reg: [1.39541, -0.01, 1.39377, 5.05], tone: [0.941, 0.923, 0.866],
      key: PROP_DIR + 'K-MOTH-WAKE.png', box: [1161, 270, 1329, 392], chg: PROP_DIR + 'K-MOTH-WAKE-CHG.png', chgBox: [1171, 278, 1323, 377], pos: [1250, 325] },
    'moth-fly': { clip: PROP_DIR + 'M-FLY.mp4', from: 0.58, to: 1.42, fadeIn: 120, reg: [1.39512, 0.02, 1.3945, 4.68], tone: [0.98, 0.968, 0.921],
      key: PROP_DIR + 'K-MOTH-FLY.png', box: [1158, 215, 1336, 420], chg: PROP_DIR + 'K-MOTH-FLY-CHG.png', chgBox: [1197, 279, 1308, 369], pos: [1250, 325] },
    // code: a dozen flies over the apples, a buzz, and then they leave for the nearer candle (the right) and it gutters
    apples: { code: 'flies', at: [1292, 480], sound: { kind: 'flies' }, pos: [1318, 500] },
    // code: the cordless handset's little display lights green and it rings once (the display: four corners on the plate)
    phone: { code: 'phone', display: [[735, 680], [763, 665], [795, 723], [765, 737]], box: [578, 615, 910, 768], sound: { kind: 'phone-ring' }, pos: [745, 700] },
    // code: a click, the red power button glows for a second, and a television comes on in the room to the left
    remote: { code: 'remote', button: [1065, 740, 8], sound: { kind: 'remote-click' }, pos: [1110, 725] },
    // made, not played tonight:
    salt: { made: 'T-SALT-TIP has a third, ghostly shaker that flies in and rolls away, and the real one never tips: it jumps to K-SALT-TIPPED in one frame at 7.1 s',
      clip: PROP_DIR + 'T-SALT-TIP.mp4', from: 0.6, to: 8, reg: [1.39556, -0.14, 1.39476, 4.63], tone: [0.98, 0.98, 0.9], box: [460, 0, 860, 340], sound: { kind: 'salt-tip', at: 6.5 }, pos: [630, 80] },
    pen: { made: 'T-PEN-ROLL rolls the pen left along the plank straight across the middle of the table, where the board lies, and it vanishes there',
      clip: PROP_DIR + 'T-PEN-ROLL.mp4', from: 0.6, to: 4, reg: [1.39549, -0.17, 1.39504, 4.39], tone: [0.98, 0.98, 0.9], box: [300, 300, 1300, 600], sound: { kind: 'pen-roll', at: 0.3 }, pos: [1140, 450] },
    matches: { made: 'T-MATCHES-POINT throws the matches out of their place; they land in a line in the lower middle, half under the board, and K-MATCHES-LINE (three in a row in their own place) is a different picture',
      clip: PROP_DIR + 'T-MATCHES-POINT.mp4', from: 1.4, to: 8, reg: [1.39538, -0.16, 1.39482, 4.61], tone: [0.98, 0.98, 0.9], box: [40, 280, 760, 690], sound: { kind: 'matches-roll', at: 0.5 }, pos: [170, 390] },
    'match-strike': { made: 'T-MATCH-STRIKE strikes the match in the line T-MATCHES-POINT leaves in the lower middle, which is not on this table',
      clip: PROP_DIR + 'T-MATCH-STRIKE.mp4', from: 0, to: 8, reg: [1.39555, -0.1, 1.39537, 4.46], tone: [0.98, 0.98, 0.9], box: [480, 500, 760, 690], pos: [560, 600] },
  };
  // FARMHOUSE.looks: the camera turns (12, 13.3, 13.12) and the cutaways (4), by the name the demon calls them (game.js LOOKS):
  //   The looks package (2026-10-08), every file in assets/clips/farmhouse/looks/, every time in seconds of that file, every point in its own
  //   1920 by 1080 pixels. Only file names are strings here (tools/build-pages.sh copies every string it finds under looks).
  //   A room: in (the turn off the table: from, to), join (seconds of dissolve from the turn's last frame onto the room's still; 0 where the
  //   turn lands on it), still (the room's locked frame: a file and the time of it), the room's own hold clips and quads, out (the turn back).
  //   The transits are Flow's second round (rooms-v4, 2026-10-08), made from the new plate (plate-v4: no envelopes, the small plate, the pen); the
  //   first round's started and ended on the old one. Every transit is still cut at the turn: Flow invents a wider, candlelit table with chairs
  //   in the middle of each (the table pulled back from, a doorway onto it), and the table it starts or ends on has no board on it. So an IN
  //   starts after that table has left the frame and an OUT ends before it comes; the engine carries the live table (with the board) into the
  //   turn and out of it, sliding the way the head turns, over about 400 ms (game.js, the looks). Each IN now ends on its room's still: join is
  //   the dissolve onto the held still (0.5 s where Flow's last frame sits 9 to 12 px off it: the microwave, the abacus, the hall).
  //   A cutaway: cut, a list of { src, from, to } played back to back, hard cut in on the first frame and hard cut out on the last; a segment
  //   with hold is that one frame held that many seconds (the door that does not move).
  FARMHOUSE.looks = {
    // the dining room, to the right. IN: from 3.55 (the pulled-back table gone, the bare corner) to K-CLOCK, which it ends on (5.96). still:
    // T-CAT-SWING at 0.1, eyes and tail dead centre (measured: tail x 1305 at 0.02 to 0.27 and 1.98 to 2.02). face: the dial (centre x, y,
    // radius; the pivot dot). OUT: K-CLOCK to 2.5; the peeling table comes up from 2.8.
    clock: {
      in: { src: 'looks/L-CLOCK-IN.mp4', from: 3.55, to: 5.96 }, join: 0.2,
      still: { src: 'looks/T-CAT-SWING.mp4', at: 0.1 },
      hold: { src: 'looks/T-CAT-SWING.mp4', from: 0.1, centre: [0.1, 2.0] },
      face: [1305, 392, 86],
      out: { src: 'looks/L-CLOCK-OUT.mp4', from: 0.02, to: 2.5 },
    },
    // further right, the kitchen doorway. IN: from 3.15 (the blur past the room) to the microwave. still: L-MICRO-OUT's first frame (K-MICRO).
    // display: its four corners (top left, top right, bottom right, bottom left), inside the bezel. OUT: to 3.3, before the chairs.
    micro: {
      in: { src: 'looks/L-MICRO-IN.mp4', from: 3.15, to: 5.96 }, join: 0.5,
      still: { src: 'looks/L-MICRO-OUT.mp4', at: 0.02 },
      display: [[1126, 451], [1164, 455], [1163, 471], [1126, 467]],
      out: { src: 'looks/L-MICRO-OUT.mp4', from: 0.02, to: 3.3 },
    },
    // diagonal left, the living room. IN: from 3.35 (the rug, the table's corner leaving). hold: TV-BROADCAST, the test pattern from 1.06 and
    // the empty studio with one armchair from 2.1. tear: TV-ROLL's white flash and blocks into snow, 2.36 to 3.42 (the rest of TV-ROLL is the
    // set off). screen: the picture's four corners. OUT: to 3.4, before the table slides up into it.
    tv: {
      in: { src: 'looks/L-TV-IN.mp4', from: 3.35, to: 5.96 }, join: 0.2,
      still: { src: 'looks/TV-BROADCAST.mp4', at: 0.02 },
      hold: { src: 'looks/TV-BROADCAST.mp4', from: 0.02, to: 4.6 },
      tear: { src: 'looks/TV-ROLL.mp4', from: 2.36, to: 3.42 },
      screen: [[812, 270], [1112, 268], [1108, 493], [819, 495]],
      out: { src: 'looks/L-TV-OUT.mp4', from: 0.02, to: 3.4 },
    },
    // right and lower, the sideboard. IN: from 3.75 (the pulled-back table gone). bead: one bead across the second rod, 1.72 (at rest) to 3.38
    // (stopped at the right; at 3.5 Flow snaps it back). rush: every bead flies, 1.9 to 3.5. after: one bead on a lower rod slides across by
    // itself, 2.1 to 4.4. OUT: to 4.3, the chair beside it going out of focus (the clip's focus pull lands on a table with no board).
    abacus: {
      in: { src: 'looks/L-ABACUS-IN.mp4', from: 3.75, to: 5.96 }, join: 0.5,
      still: { src: 'looks/A-BEAD.mp4', at: 0.02 },
      bead: { src: 'looks/A-BEAD.mp4', from: 1.72, to: 3.38 },
      rush: { src: 'looks/A-RUSH.mp4', from: 1.9, to: 3.5 },
      after: { src: 'looks/A-AFTER.mp4', from: 2.1, to: 4.4 },
      out: { src: 'looks/L-ABACUS-OUT.mp4', from: 0.02, to: 4.3 },
    },
    // left, the hall. IN: from 3.7 (the table at the bottom corner, going) into the hall. OUT: to 3.0, before the table rises into it.
    hall: {
      in: { src: 'looks/L-HALL-IN.mp4', from: 3.7, to: 5.96 }, join: 0.5,
      still: { src: 'looks/L-HALL-OUT.mp4', at: 0.02 },
      out: { src: 'looks/L-HALL-OUT.mp4', from: 0.02, to: 3.0 },
    },
    // up. UP: from 2.3 (the table at the bottom edge), the far wall, its door, the plaster: K-CEIL at 7.95. hold: the bulb swings as if
    // pushed, three swings, and settles. moon: where its face is in the plaster (centre x, y; drawn at six times the moon's radius on the
    // board). stain: the water stain the darkening grows from (x, y, radius). DOWN: to 2.4, before the table in the doorway.
    ceiling: {
      in: { src: 'looks/L-CEILING-UP.mp4', from: 2.3, to: 7.95 }, join: 0.15,
      still: { src: 'looks/L-CEIL-LAMP.mp4', at: 0.02 },
      hold: { src: 'looks/L-CEIL-LAMP.mp4', from: 0.02, to: 5.96 },
      moon: [560, 330], stain: [800, 400, 260],
      out: { src: 'looks/L-CEILING-DOWN.mp4', from: 0.02, to: 2.4 },
    },
    // the cutaways (DIRECTION.md 4). The hall door: C-HALL-DOOR-AJAR, about an inch (C-HALL-DOOR, round 2, still opens wide: not used). The
    // front door's knob turns into a lever with the chain hanging off (Flow): only the lever turning, 2.35 to 3.95. The knocks: the door
    // not moving, C-DOOR-HANDLE's first frame held while three knocks land (C-DOOR-KNOCKS was never made). The bathroom clip drips (1.3 to
    // 3.0) and then the curtain swings (from 3.9). The mirror's mist is a grey blur that drifts (Flow's), kept short for him to judge.
    'hallway/door': { cut: [{ src: 'looks/C-HALL-DOOR-AJAR.mp4', from: 0.3, to: 3.9 }] },
    'hallway/lamp': { cut: [{ src: 'looks/C-HALL-LAMP.mp4', from: 0.6, to: 5.1 }] },
    'hallway/shadow': { cut: [{ src: 'looks/C-HALL-SHADOW.mp4', from: 0.2, to: 4.6 }] },
    'door/handle': { cut: [{ src: 'looks/C-DOOR-HANDLE.mp4', from: 2.35, to: 3.95 }] },
    'door/knocks': { cut: [{ src: 'looks/C-DOOR-HANDLE.mp4', from: 0.1, to: 0.1, hold: 3.6 }] },
    'door/peephole-2': { cut: [{ src: 'looks/C-PEEP-2.mp4', from: 0.02, to: 3.96 }] },
    'door/peephole-3': { cut: [{ src: 'looks/C-PEEP-2.mp4', from: 0.02, to: 3.96 }, { src: 'looks/C-PEEP-3.mp4', from: 0.02, to: 3.96 }] },
    'cellar/latch': { cut: [{ src: 'looks/C-CELLAR-LATCH.mp4', from: 0.8, to: 5.6 }] },
    'cellar/open': { cut: [{ src: 'looks/C-CELLAR-OPEN.mp4', from: 0.4, to: 4.4 }] },
    'stairs/step': { cut: [{ src: 'looks/C-STAIR-STEP.mp4', from: 0.8, to: 4.2 }] },
    'stairs/light': { cut: [{ src: 'looks/C-STAIR-LIGHT.mp4', from: 0.5, to: 3.3 }] },
    'window/breath': { cut: [{ src: 'looks/C-WINDOW-BREATH.mp4', from: 0.4, to: 5.2 }] },
    'bathroom/drip': { cut: [{ src: 'looks/C-BATH-DRIP.mp4', from: 0.6, to: 3.5 }] },
    'bathroom/curtain': { cut: [{ src: 'looks/C-BATH-DRIP.mp4', from: 3.7, to: 5.96 }] },
    'bathroom/mirror': { cut: [{ src: 'looks/C-BATH-MIRROR.mp4', from: 0.6, to: 3.4 }] },
  };
  // ---------------------------------------------------------------- the flame family (clips.flames; Pierce, 2026-10-02)
  // His Birds of Winthrop technique, one flame at a time. Each wick gets its own <video> of ONE flame, filmed centred on
  // black, cut into moves that all start and end on the same frame (the flame at rest): the game cuts from any move to
  // any other on that frame and nobody sees a cut. The moves are packed back to back into one sprite file per place, so
  // each wick costs one decoder; the engine screens the frame onto the wick (anchor on the wick, anchor-to-tip drawn as
  // the candle's flame length, turned by its tilt), mirrors the second wick so the candles are never the same picture,
  // and recolours it blue or green itself. While a place has one, the table clips above that carry their own flames
  // (and their key stills) stand down; board clips and the hand overlay still play. Not listed, or a file that fails:
  // the photographed fire and the engine's flames, exactly as before.
  //   clips.flames = {
  //     src: 'flames-9x16.mp4',       // in assets/clips/<place>/ (or ['x.webm', 'x.mp4']: the first this browser plays)
  //     fps: 30,
  //     anchor: [0.5, 0.64],          // the wick, as fractions of the frame (x from the left, y from the top)
  //     tip: [0.5, 0.34],             // the tip of the flame at rest, same units
  //     seg: {                        // seconds; each segment's end is the next one's start; a keyframe at every start
  //       idle: [0, 4],               // rest > drift > rest, a palindrome (twice here, so 2.0 is a rest frame too)
  //       up: [4, 5.2], right: [5.2, 6.6], left: [6.6, 8], down: [8, 9.2],   // rest > the move > rest
  //       out: [9.2, 10.8],           // rest > blown out toward outSide > the unlit wick, held still at the end
  //       ignite: [10.8, 12.2],       // the unlit wick (the same frame out ended on) > catches > rest
  //     },
  //     idleSync: [0, 2],             // the rest frames inside idle (default: its start); the two wicks take different ones
  //     outSide: 'right',             // the way out blows; the other way is the same clip mirrored. A missing left or
  //                                   // right is the other one mirrored.
  //     flip: [false, true],          // which wicks show their film mirrored (default: the second)
  //     lum: 2.4,                     // what the flame at rest reads as in the engine's own measure (GOODBYE.FF.ref after the idle has played): the
  //                                   // light of a candle going out or catching follows the film against it. Left out, the first idle teaches it.
  //   };
  // The engine plays: a breath or a gust from one side > right or left (on screen, after the candle's tilt), staggered
  // 60-200 ms from one candle to the other; blowCandle > out; a relight or the opening's match > ignite; the lean toward
  // the planchette > right, left, up or down toward it, again and again while it holds; the gutter > down; a scare's
  // peak (the jump, a name spelling itself, His super move) > up.
  // Building it: tools/flame-sprite.py <folder of Flow clips> packs them (idle.mp4 up right left down out ignite), checks
  // each one opens (and closes) on the shared frame, holds that frame 4 extra frames at the head of every move (a landing
  // pad: a seek or a late cut still lands on it), puts a keyframe at every segment start, measures the anchor and tip,
  // and prints this entry. The host must answer byte ranges (Safari will not seek a video without them).
  // The Farmhouse names one (clips.flames above, from Flow, 2026-10-03); to try another from the debug page: GOODBYE.flames({ ... }).

  window.GOODBYE_PLACES = [FARMHOUSE];
})();
