// GOODBYE — the places. One scene template in game.js; each place is data.
// There is one house now, the Farmhouse (the winter of 1931). The Penthouse, the Basement, the Parlor, the Cottage and the
// Garden are gone from this file (git keeps them): five skins of one engine repeated each other, and a night in one of them
// said things from the wrong decade. All the work goes into this one.
// A place is the room: its photographs, board, candles, light, sound and film. It holds no words for the board: every word the board
// spells is the demon's, live (game.js liveMove; the site's backend/goodbye/demons.js). The question scripts, the room's lines, the
// spirit and the night plan are gone (git keeps them).
(function () {
  'use strict';

  // art.plateHi: the same table photo resized to twice its size (Lanczos, nothing added), for big and Retina screens.
  const FARMHOUSE = {
    id: 'farmhouse', name: 'The Farmhouse', when: 'Tonight, in Kansas',
    caption: 'Kansas · 1:13 AM', clockStart: '1:13 AM', table: 'a farmhouse table',
    art: { exterior: 'assets/places/farmhouse-exterior.jpg?v=9d21f78d84', exteriorPort: 'assets/places/farmhouse-exterior-port.jpg?v=a95be30410',
      // the walk up the drive (Flow, image to video, first frame = the still; played once, never looped, encoded without sound: the walk's own
      // sound is the game's, audio.js A.gravel / A.screenDoor / the crickets): files in assets/clips/farmhouse/. A file that is not there, or
      // is slow, gives the push-in still without a word.
      exteriorClip: { land: 'exterior-land.mp4', port: 'exterior-port.mp4' }, thumb: 'assets/places/thumb-farmhouse.jpg?v=8f93fe68ae', plate: 'assets/places/farmhouse-plate.jpg?v=0b7898fa24', plateHi: 'assets/places/farmhouse-plate-2x.jpg?v=e179255f18', board: 'assets/places/farmhouse-board.jpg?v=efcffa0b28' },
    candles: [{ x: 131, y: 76 }, { x: 1368, y: 146 }],
    // the live flames: wick (x, y), lean of the photographed flame (tilt, radians from up), length, and the spot
    // darkened on the wick. The photographed flames are painted out of the plate files, so hide only chars the wick.
    flames: [
      { x: 152.3, y: 91.4, tilt: -0.95, len: 76.0, hide: { x: 153.5, y: 92.0, r: 3 } },
      { x: 1353.5, y: 158.2, tilt: 0.88, len: 53.0, hide: { x: 1353.5, y: 158.8, r: 3 } },
    ],
    boardRect: { cx: 807, cy: 433, w: 772, h: 514.7 },
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
  FARMHOUSE.clips = {
    land: {
      idle: 'idle-land.mp4', gust: 'gust-land.mp4', blowoutL: 'blowout-l-land.mp4',
      keys: { dark: 'keys/dark-land.jpg', half: 'keys/half-land.jpg' },
      fire: 'frames/fire-16x9.png',
    },
    port: {
      idle: 'idle-port.mp4', gust: 'gust-port.mp4', blowoutL: 'blowout-l-port.mp4',
      keys: { dark: 'keys/dark-port.jpg', half: 'keys/half-port.jpg' },
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
