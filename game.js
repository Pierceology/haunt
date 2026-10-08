// GOODBYE — The Farmhouse. One place built right, so the rest can be cloned from it.
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const A = window.GA;
  const cv = $('#c');
  const cx = cv.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  // The night can be stopped at any moment: a candle held, real distress or real fear typed (the safety section, by
  // ask()). Then halt is set, and every wait, animation and move a running sequence makes (the possession, the struggle,
  // a scare, an answer on its way) throws HALTED instead, so nothing it had planned happens after the stop. The stop's
  // own few steps use sleep and free animations, which a halt never touches. The next match clears it. haltGen counts
  // the stops, so a wait that began before one never ends in the night after it, even if a new match is struck first.
  const HALTED = { halted: true };
  let halt = false, haltGen = 0;
  addEventListener('unhandledrejection', (e) => { if (e.reason === HALTED) e.preventDefault(); });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const wait = (ms) => {
    if (halt) return Promise.reject(HALTED);
    const g = haltGen;
    return new Promise((r, j) => setTimeout(() => (halt || g !== haltGen ? j(HALTED) : r()), ms));
  };
  // g: the haltGen when the wait began (a stop since then counts too)
  const checkHalt = (g) => { if (halt || (g != null && g !== haltGen)) throw HALTED; };
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeIn = (t) => t * t * t;
  const easeBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  // Runs fn(eased, raw) on the wall clock for ms. Keeps time even if frames stall. free: the stop's own, never halted.
  function animate(ms, fn, ease = easeIO, free) {
    if (halt && !free) return Promise.reject(HALTED);
    const g = haltGen;
    return new Promise((res, rej) => {
      const t0 = performance.now();
      const tick = () => {
        if ((halt || g !== haltGen) && !free) { clearInterval(iv); rej(HALTED); return; }
        const raw = Math.min(1, (performance.now() - t0) / ms);
        fn(ease(raw), raw);
        if (raw >= 1) { clearInterval(iv); res(); }
      };
      const iv = setInterval(tick, 16); tick();
    });
  }
  const store = {
    get(k, d) { try { const v = localStorage.getItem('goodbye.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('goodbye.' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
  };
  // A pack's code (paid sends, jnoirbranding backend/goodbye/pay.js), kept on this device once the site says it is paid:
  // the next Pass it on sends it with the cards, so the link opens without paying again; a Halloween pass's code also
  // goes with each night (its nights have their own limit on the site). The site decides what a code is worth; this only remembers it.
  function keepCode(j) {
    if (!j || typeof j.code !== 'string' || !/^BYE-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(j.code)) return;
    store.set('byeCode', { code: j.code, left: typeof j.left === 'number' ? j.left : null, nights: !!j.nights, until: typeof j.until === 'string' ? j.until : '' });
  }
  function codeEnded(c) { const end = Date.parse((c && c.until) || ''); return Number.isFinite(end) && end <= Date.now(); }
  function sendCode() { const c = store.get('byeCode', null); return c && typeof c.code === 'string' && c.left !== 0 && !codeEnded(c) ? c.code : ''; }
  function passCode() { const c = store.get('byeCode', null); return c && typeof c.code === 'string' && c.nights && c.until && !codeEnded(c) ? c.code : ''; }
  // For now the game is horror only, and it is one house: the Farmhouse (places.js ships only it). The other four houses and the
  // picker are gone (git keeps them); He, the Pew and the Garden stay in the code, unreachable, until they come back on.
  // PLACES_MENU is off: no picker, no place pill, no "X is open.", no unlock toasts.
  const JESUS = false, SANCTUARY = false, PLACES_MENU = false;

  // ---------------------------------------------------------------- what was typed, read first: the lists
  // Real distress, someone hurting them, real fear and a wish to stop, read the same way on the phone and on the site.
  // They sit up here so everything below can use them (the safety section further down says what is done with each).
  // >>> safety lists >>> (one block: the same text sits in game.js and in the site's backend/goodbye/guard.js; tools/safety/sync-lists.mjs copies it from tools/safety/lists.js, edit it there)
  // What a person types is read here first, on the phone and again on the site: the same lists, the same reading, one block.
  // Real distress or someone hurting them ends the night gently with where to find help. Real fear gets the soft exit. A wish to
  // stop gets SAY IT THEN. Every check reads plainForms(): lower case, apostrophes out (can't is cant), a digit or sign inside a
  // word read as the letter it stands for (k1ll, unal1ve, $uicide, h8), a lone 2 as "to", punctuation as spaces or as nothing
  // (s*icide, k.m.s), a capital I inside a word as an l (kiII), a skull or a crying face as a word, any letter held or doubled
  // as one (kmsss, dieee, kill, miss: "kil", "mis"), and letters typed one at a time joined up (k m s, s u i c i d e). Two
  // readings of each, since a 1 may be an i or an l. Every pattern below is written in plain spelling and compiled through
  // lre(), which squeezes it the same way. Write a word as if no letter were doubled when a suffix follows it (cut + ing).
  const LEET = { 0: 'o', 3: 'e', 4: 'a', 5: 's', 7: 't' };
  const squeeze = (s) => s.replace(/([a-z])\1+/g, '$1');
  const lre = (src, flags) => new RegExp(src.replace(/\\.|([a-z])\1+/g, (m, c) => c || m), flags);
  function plainForms(s, loose) {   // loose: the readings with every letter left as typed (for the near-word check)
    const raw = String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    const out = new Set();
    // a capital I inside a word that has small letters is an l: kiII
    const bigI = raw.replace(/\b([A-Za-z]+)\b/g, (w) => (/[a-z]/.test(w) ? w[0] + w.slice(1).replace(/I/g, 'l') : w));
    for (const src of [raw, bigI]) {
      const t0 = src.toLowerCase()
        .replace(/['\u2018\u2019\u02bc`\u00b4]/g, '')
        .replace(/\bs ?\/ ?h\b/g, ' selfharm ')
        .replace(/[\u{1F480}\u2620\u{1FAA6}\u26B0]\uFE0F?/gu, ' skull ')
        .replace(/[\u{1F62D}\u{1F622}\u{1F625}\u{1F63F}]\uFE0F?/gu, ' sobbing ')
        .replace(/\bh8(s|d|ing|in)?\b/g, 'hate$1').replace(/\b(no|some|any) ?1\b/g, '$1one')
        .replace(/(^|[^a-z0-9])2(?=[^a-z0-9]|$)/g, '$1to');
      for (const one of ['i', 'l']) {
        let t = t0;
        for (let pass = 0; pass < 2; pass++) {
          t = t.replace(/[0-9@$!|]/g, (c, i, all) => {
            const a = /[a-z]/.test(all[i - 1] || ''), b = /[a-z]/.test(all[i + 1] || '');
            if (c === '!' || c === '|') return a && b ? (c === '!' ? 'i' : 'l') : c;   // k!ll, but never "stop!"
            if (c === '@' || c === '$') return b ? (c === '@' ? 'a' : 's') : c;
            if (!a && !b) return c;
            return c === '1' ? one : (LEET[c] || c);
          });
        }
        // punctuation between two letters is a space (s u i c i d e) or nothing at all (s*icide, sui(ide)
        for (const glue of [' ', '']) {
          const u = t.replace(/([a-z])[^a-z0-9 ]+(?=[a-z])/g, '$1' + glue).replace(/[^a-z0-9]+/g, ' ').trim();
          const j = u.replace(/\b[a-z](?: [a-z]\b){2,}/g, (m) => m.replace(/ /g, ''));   // k m s, s u i c i d e
          for (const f of [u, j]) out.add(loose ? f : squeeze(f));
        }
      }
    }
    return [...out];
  }
  // A clause about the ghost or someone else is not about the one typing: "do you want to die", "who unalived you", "did you
  // commit suicide", "was it an overdose", "is this the suicide house", "i cut myself on the planchette".
  const NOT_ME = [
    lre('\\b(?:do|did|would|will|dont|didnt|does|doesnt|so|why would)? ?(?:you|u|ya|she|he|they|it|elsie|ruth|walter|lydia|her|him|them|anyone|anybody|everyone|everybody|someone|somebody|who|people|(?:the|that|this|your|his|her|their) \\w+)(?: still| really| ever| even)? (?:want|wanna|wanted|wish|wished|need|needed|wants) (?:to |ta )?(?:die|be dead|dis+ap+e+a?r|vanish)\\w*', 'g'),
    lre('\\b(?:dont|do not|dnt|never|didnt|wouldnt|wont|cant|not|no longer|dont really|dont even|dont ever) (?:want|wanna|wana|wnt|wish|need) (?:to ?|ta ?)?(?:die|dyin|be dead|death|get killed)\\w*', 'g'),
    lre('\\b(?:die|dying|dyin) (?:laughing|laughter|of laughter|from laughing|of embarrassment|from embarrassment|of shame|of boredom|of cringe)\\b', 'g'),
    lre('\\b(?:hurt|hit|bit|cut)\\w* (?:my ?self|me ?self|mself) (?:laughing|dancing|running|cooking|shaving|playing|climbing|exercising|lifting|falling|tripping|jumping)\\b', 'g'),
    lre('\\bun ?alive(?:d|s)? (?:you|u|ya|her|him|them|elsie|it)\\b', 'g'),
    lre('\\b(?:you|u|ya|she|he|they|elsie|it) (?:were|was|got|get|been|is|are|r|getting) un ?alive\\w*', 'g'),
    lre('\\b(?:were|was|did|got|are|r|is) (?:you|u|ya|she|he|they|elsie|it) (?:get |got |been |getting )?un ?alive\\w*', 'g'),
    lre('\\b(?:did|were|was|are|is|has|had|do|does) (?:you|u|ya|she|he|they|it|this|that|elsie|her|him|the (?:girl|ghost|spirit|baby|house|man)) (?:ever |really |actually |even |just |a |an |the )*(?:commit(?:ted)? |attempt(?:ed)? )?(?:suicid\\w*|overdos\\w*|self ?harm\\w*)', 'g'),
    lre('\\b(?:cut|hurt|burn|hit|scratch|bump|bang|bit)\\w* (?:my ?self|me ?self|mself) (?:on|with|against) (?:the|a|an|my|some|this) (?:planchette|board|paper|page|card|candle|match|table|chair|door|corner|edge|stairs?|glass|wall|lid|staple|desk)\\b', 'g'),
  ];
  // myself, my self, mysefl, mself, meself
  const SELF = '(?:my ?(?:self|slef|sefl|sef|sel)|me ?self|mself)';
  const DIE = '(?:die|dies|dyin|dying|death|be dead|be killed|get killed)';
  const KINS = '(?:mom|mommy|momma|mama|mum|mummy|mother|dad|daddy|papa|father|grandma|grandmother|granny|gran|nana|nan|grandpa|grandfather|grandad|granddad|gramps|brother|bro|sister|sis|son|daughter|baby|uncle|aunt|auntie|cousin|husband|wife|friend|bestie|boyfriend|girlfriend|bf|gf|dog|cat|pet|puppy|parents|grandparents|family)';
  // Real distress: a real person in real trouble, not a player.
  const DISTRESS = [
    // killing or hurting oneself, in any verb and any spelling: kill myself, off myself, hang myself, unalive myself, kys myself
    lre('\\b(?:kill|off|end|hang|hung|shoot|shot|drown|stab|slit|slic|strangl|chok|poison|gas|unaliv|kys|hurt|cut|harm|starv|bleed|burn|overdos|electrocut|suffocat)(?:s|e|es|ed|d|ing|in)? ?' + SELF + '\\b'),
    lre('\\bi (?:just |still |keep |kept |always |sometimes )?(?:hit|punch|slap|bite|scratch|pinch|beat|choke)(?:s|ing|in)? ?' + SELF + '(?: again| until| till| til| so hard| every| when| to feel| because| bc| tonight| rn|$)'),
    lre('\\b(?:scratch|cut|burn|hit|bite|punch|pinch)(?:ing|in)? ?' + SELF + ' (?:until|till|til) (?:i )?(?:bleed|bruise|cry|feel something|it hurts)\\b'),
    lre('\\b(?:please|pls|plz|just|some ?one|some ?body|god) (?:kill|end) me\\b'),
    lre('\\b(?:kill|end) me (?:please|pls|plz|already|now|rn)\\b'),
    lre('^(?:kill|end) me$'),
    lre('\\b(?:end|ending|endin|take|taking|takin) (?:my|me) (?:own )?(?:life|lyfe|lif)\\b'),
    lre('\\bend my (?:pain|suffering|misery)\\b'),
    lre('suicid|suiside|suicde|\\bsui ?cid'),
    lre('\\bsewer ?sl(?:i|y)de?\\b'),
    lre('\\bun ?al(?:i|y)v'),
    lre('\\bk ?m ?s\\b'), lre('\\bkm ?ys\\b'),
    lre('\\bself ?(?:harm|injur|mutilat|hurt|inflict)'),
    lre('\\boverdos'),
    lre('\\b(?:gonna|going to|goin to|about to|bout to|want to|wanna|might|will|should|ima|imma) od\\b'), lre('\\bod (?:tonight|tn|tomorrow|rn|soon|later|for real)\\b'),
    // wanting to die, in every shape: want, wanna, wnt 2, wish, hope, need, ready, deserve, plan to
    lre('\\b(?:want|wanna|wana|wan|wnt|wish|wished|hope|hoped|need|deserve|deserved|plan|planning|decided|decide|trying) (?:i )?(?:to ?|ta ?)?(?:just |really |finally |so |fucking |actually |only )*' + DIE + '\\b'),
    lre('\\bi (?:just |really |always |sometimes |often |still )*wanted (?:to ?)?(?:die|be dead)\\b'),
    lre('\\b(?:im|i am|i m|ive been|i feel|feeling) (?:finally |so |now |just |really )?ready (?:to )?(?:die|be dead)\\b'),
    lre('\\b(?:want|wanna|wana|wnt) (?:to ?|ta ?)?dye$'),
    lre('\\bi (?:should|shud|shld|might as well|may as well|deserve to) (?:just |really |even |actually )?die\\b'),
    lre('\\bshould (?:i|we) (?:just |really |even |actually )?(?:die|end it|end things|end everything|end my life|end myself|stop living|keep living|stay alive|go on living)\\b'),
    lre('\\b(?:i )?(?:wish|hope) (?:i )?(?:could |cud )?(?:just )?(?:die|be dead|sleep forever|never wake up|not wake up|disappear|vanish|go away forever)\\b'),
    lre('\\bwish i (?:was|were|could be|could just be) (?:dead|gone|never born|not here|invisible|nothing)\\b'),
    lre('\\bwish i (?:wasnt|werent|was not|were not|didnt|did not|never|never was|never had been) (?:alive|born|here|exist|existed|been born|a thing)\\b'),
    lre('\\bwish i (?:was|had) never (?:been )?born\\b'),
    lre('\\b(?:want|wanna|wana|wnt|need|ready|wish|hope) (?:i )?(?:to ?|ta ?)?(?:just )?(?:not exist|not be here|not be alive|not wake up|never wake up|never be born|never wake|not be around|not be a thing|stop existing|stop living|stop breathing|stop being alive|stop being here|quit life|quit living|leave this world|leave the world|leave this life|leave life|be done with (?:life|everything|living|it all|this life|being alive)|sleep forever|sleep and (?:not|never|dont|wont) wake|go to (?:sleep|bed) and (?:not|never|dont|wont) wake|cease to exist|disappear forever|vanish forever|be nothing|end it|end things|end everything|end it all|end myself|end my life|end this life)\\b'),
    lre('\\b(?:can|could|may|might|should|will) (?:i|we) (?:just )?(?:stop|quit|cease) (?:existing|living|breathing|being alive|being here|being)\\b'),
    lre('\\b(?:dont|do not|dnt|cant|no longer|never) (?:want|wanna|wana) (?:to ?|ta ?)?(?:live|be alive|exist|wake up|keep living|keep going|go on|be around)\\b'),
    lre('\\b(?:dont|do not|dnt) (?:want|wanna|wana) (?:to ?|ta ?)?be here (?:any ?more|no more|at all|tomorrow|after tonight)\\b'),
    lre('\\b(?:want|wanna|wana) (?:to ?|ta ?)?not be here\\b'),
    lre('\\bhope (?:i )?(?:dont|do not|never|wont) wake up\\b'),
    lre('\\b(?:want|wanna|wana|wish i could|just want|just wanna) (?:to ?|ta ?)?(?:dis+ap+e+a?r|vanish)\\b'),
    lre('\\bi (?:wont|will not|wont be|will not be) be (?:here|around|alive) (?:tomorrow|tonight|next week|any ?more|much longer|after tonight)\\b'),
    lre('\\bno reason to (?:live|be alive|keep going|go on)\\b'),
    lre('\\bbet+er of+ (?:dead|without me)\\b'),
    lre('\\b(?:happier|better|safer|easier|relieved|glad)(?: off)? (?:if|when) i (?:was|were|am) (?:gone|dead|not here|not around|not alive)\\b'),
    lre('\\b(?:happier|better|safer|easier|relieved|glad)(?: off)? (?:if|when) i (?:wasnt|werent|never|didnt|did not) (?:here|around|alive|born|existed|exist|been born)\\b'),
    lre('\\bgive up (?:on )?(?:life|living|everything|my life)\\b'),
    lre('\\b(?:end|ending|endin) it (?:all|al)\\b'),
    lre('\\b(?:im|i am|ima|imma|i will|ill|i should|i might|i want to|going to|gonna|about to|bout to|ready to|plan to|planning to) end(?:ing)? it (?:tonight|today|tomorrow|now|soon|for good|rn)\\b'),
    lre('^end(?:ing)? it (?:tonight|today|tomorrow|for good)$'),
    lre('\\b(?:i|im|i am|ima|imma|ill|gonna|going to|want to|wanna|about to|should|need to|ready to)\\b.{0,12}\\bend(?:ing)? (?:things|everything|myself)\\b'),
    // nobody would miss me, nobody cares, would anyone care if i died
    lre('\\b(?:no ?body|no ?one|noone)d?(?: would| will| wud| wld| is going to| is gonna| even| would even| will even| would ever| will ever)? (?:miss|care about|notice) me\\b'),
    lre('\\b(?:no ?body|no ?one|noone)d?(?: would| will| wud)? (?:cares?|notice|miss) if i (?:die|died|was gone|were gone|disappeared|left|wasnt here|was dead|live or die|lived or died)\\b'),
    lre('\\b(?:no ?body|no ?one|noone) (?:really |even |truly )?(?:loves|likes|wants|needs|cares about|cares for|cares if i) me\\b'),
    lre('\\b(?:everyone|everybody) hates me\\b'),
    lre('\\b(?:care|miss|notice|cry|mourn|sad|upset|sorry|relieved|glad)(?: about me| for me| me)? (?:if|when|after) (?:i|im|i am) (?:die|died|dies|dead|gone|was gone|were gone|am gone|was dead|were dead|am dead|disappear\\w*|pass|passed|am not here|was not here|wasnt here|killed myself|kill myself)\\b'),
    lre('\\bmiss me when (?:i|im|i am) (?:die|died|dies|dead|gone|dying)\\b'),
    lre('\\b(?:is it|its|would it be|will it be) (?:ok|okay|fine|alright|all right|bad|wrong|a sin|allowed|normal) (?:if|to|that|when) i (?:die|dye|kill|end it|end things|disappear|stop living)\\b'),
    lre('\\b(?:die|dead|death) (?:tonight|today|tomorrow|soon)? ?(?:if|when) i (?:want|wanna|choose|decide|try|let|do it|go through with it)\\b'),
    // hopelessness
    lre('\\b(?:no point|whats the point|what is the point|pointless|not worth) (?:in |of )?(?:living|life|going on|being alive|staying alive|existing|continuing|trying)\\b'),
    lre('\\blife (?:isnt|is not|aint|wasnt|is) (?:worth living|worth it|pointless|meaningless)\\b'),
    lre('\\bnothing (?:left )?to live for\\b'),
    lre('\\b(?:tired|sick|done|fed up) (?:of|with) (?:living|life|being alive|existing|this life|everything|all of it|it all)\\b'),
    lre('\\bmy life (?:sucks|is (?:over|hell|shit|garbage|meaningless|pointless|ruined|a joke|worthless|not worth it))\\b'),
    lre('\\bi (?:hate|hte) (?:my ?(?:life|lyfe|lif|self|selves|own life)|being alive|being me|existing)\\b'),
    lre('\\bi (?:hate|hte) living$'),
    lre('\\b(?:hate|hte) my (?:life|lyfe|lif)\\b'),
    lre('\\b(?:cant|can not|cannot|cnt) (?:even )?(?:do|take|handle|deal with|stand|bear|survive|live|be|keep|go|stay) (?:this|it|life|everything|any of this|living|like this|alive|here|going|on|being alive)? ?(?:any ?more|no more)\\b'),
    lre('\\b(?:i )?(?:cant|cannot|can not) (?:go on|keep going|keep living|live like this|do this any ?more)\\b'),
    lre('^i (?:cant|cannot|can not) any ?more$'),
    // said alone, these are the person, not the game: despair first, the help line (red team round 2, misses 22 and 23)
    lre('^i (?:just |really |totally |completely )?give up(?: on everything| on it all| now)?$'),
    lre('^(?:im|i am|i m) (?:just |really |literally |actually )?so (?:done|over it)$'),
    lre('^(?:its|it is) (?:so |all |just )?over for me$'),
    lre('^i (?:dont|do not|really dont|just dont) (?:want|wanna|wana) (?:to ?|ta ?)?be here$'),
    lre('\\bthis is my (?:last|final) (?:night|day|breath|message|goodbye)\\b'),
    lre('\\b(?:wrote|writing|write|left) (?:a |my |the )?(?:goodbye|good bye|final|last) (?:note|letter|message)\\b'),
    lre('^i (?:just |already |finally )?(?:wrote|left|finished|have written|ve written) (?:a|the|my) note$'),
    // methods and things done
    lre('\\bslit(?:ting)? (?:my |both |our )?(?:wrist|wrists|throat|veins?|arms?)\\b'),
    lre('\\bcut(?:ting|s)? (?:my|both) (?:wrist|wrists|throat|veins?|arms?|legs?|thighs?|skin|stomach|body)\\b'),
    lre('\\b(?:want|wanna|gonna|going|goin|about|bout|thinking|ready|planning|should|might|could|will|need) (?:i )?(?:to ?|ta ?|of |about )?(?:just )?jump(?:ing)? (?:off|from|in front of) (?:a|an|the|my|this|that|our)? ?(?:bridge|roof|rooftop|building|balcony|cliff|train|tracks|ledge|tower|overpass)\\b'),
    lre('\\b(?:took|take|taking|swallowed|swallow|downed) (?:all|a bunch of|a lot of|too many|every|a handful of|the whole bottle of|a whole bottle of|handful of)(?: of)? (?:my |the |these |those |some )?(?:pills|meds|medication|tablets|sleeping pills|painkillers|aspirin|tylenol|advil)\\b'),
    lre('\\b(?:rope|noose|belt|cord) (?:around|on) my neck\\b'),
    lre('\\bi (?:just |still |keep |kept )?cut (?:again|last night|tonight|today|yesterday|more|deeper|my (?:arm|arms|wrist|wrists|leg|legs|thigh|thighs|skin|stomach))\\b'),
    lre('\\bi (?:just |recently |finally )?relapsed\\b'),
    lre('\\b(?:ive|i have|i been|ive been) been (?:cutting|self ?harming|starving|purging|burning myself)(?: again| lately| a lot| more| myself)?$'),
    lre('\\bmy (?:cuts|scars|wounds) (?:hurt|are bleeding|wont stop bleeding|are infected|are deep|are getting worse)\\b'),
    lre('\\b(?:i do|i did|i still do|relapsed on|relapse on) sh\\b'), lre('^sh again$'),
    lre('\\b(?:havent|hasnt|didnt|wont|not) (?:eaten|eat|ate|eating)\\b.{0,25}\\b(?:on purpose|deliberately|to punish|as punishment|to lose weight|to disappear)\\b'),
    lre('\\bi (?:want|wanna|need|gotta) (?:to )?(?:cut|starve)$'),
    lre('\\bi (?:hit|punch|slap|bite|scratch|pinch|burn|beat) ?' + SELF + '$'),
    lre('\\bi (?:want|wanna) (?:to )?(?:end it|end it all|die|be dead|disappear) (?:tonight|today|tomorrow|now|soon|rn)\\b'),
    lre('\\b(?:want|wanna|wana|gonna|going|goin|ready|im ready) (?:to ?|ta ?)?catch the bus(?: fr| rn| tonight| now| soon|$)'),
    lre('\\b(?:want|wanna|wana|gonna) (?:to ?|ta ?)?skull\\b'),
    // wanting to be with the dead
    lre('\\b(?:want|wanna|wish|need) (?:i )?(?:to ?)?(?:be with|join|see|go to|go with|come with|reunite with) (?:my|our) (?:dead |late |passed |deceased )?' + KINS + ' (?:in heaven|in the afterlife|up there|in the sky)\\b'),
    lre('\\b(?:want|wanna|wish) (?:i )?(?:to ?)?join (?:my|our) (?:dead |late |passed |deceased )?' + KINS + '$'),
    lre('\\bcome (?:be|join) with (?:my|our) ' + KINS + '\\b'),
    lre('\\bsee (?:my|our) ' + KINS + '(?: again)? (?:when|after|if) i (?:die|am dead|pass|go)\\b'),
    lre('\\btake me (?:with you|with u|to you|to heaven|to the other side)$'),
    // Spanish
    lre('\\bme quiero morir\\b'), lre('\\bquiero (?:morir|matarme|morirme|desaparecer)\\b'), lre('\\b(?:no quiero vivir|ya no quiero vivir|me voy a matar)\\b'),
  ];
  // the same, typed with no spaces at all ("iwanttodie"): a whole word of its own that holds a phrase only a person in trouble runs
  // together (a word is read, never two words joined, so "i want to diet" is never "iwanttodie")
  const DISTRESS_RUN = ['ihatemylife', 'hatemylife', 'ihatemyself', 'hatemyself', 'killmyself', 'kilmyself', 'cutmyself', 'cuttingmyself', 'starvemyself',
    'hurtmyself', 'hangmyself', 'shootmyself', 'drownmyself', 'stabmyself', 'unalivemyself', 'endmylife', 'takemylife', 'endmyself', 'nobodywouldmissme',
    'noonewouldmissme', 'nobodycaresaboutme', 'cantdothisanymore', 'iwanttodisappear', 'iwannadisappear', 'iwanttodie', 'iwannadie', 'iwanadie',
    'iwanttokms', 'iwannakms', 'imgonnakms', 'wanttokms', 'wanttodie', 'wannadie', 'iwanttokillmyself', 'iwantdeath', 'imsuicidal'].map(squeeze);
  const RUN_TAIL = /^(?:lol|lmao|lmfao|fr|frfr|rn|tn|tbh|pls|plz|please|now|tonight|today|so|bad|badly|really)?$/;
  const hasRun = (t) => t.split(' ').some((w) => (w.length >= 7 && DISTRESS_RUN.some((r) => { const i = w.indexOf(r); return i >= 0 && RUN_TAIL.test(w.slice(i + r.length)); })) || (w.length >= 3 && w.length <= 16 && /kms/.test(w)));
  function soundsLikeSelfHarm(text) {
    const forms = plainForms(text);
    let aboutThem = false;   // a clause about the ghost was cut out: the spelling check leaves it alone
    const hit = forms.some((t) => {
      const was = t;
      NOT_ME.forEach((re) => { t = t.replace(re, ' '); });
      if (t !== was) aboutThem = true;
      return DISTRESS.some((re) => re.test(t)) || hasRun(t);
    });
    return hit || (!aboutThem && (forms.some(fuzzyWord) || plainForms(text, true).some(fuzzyWord)));
  }
  // a word near enough to suicide or unalive that it is that word, spelled badly or censored (sicide, suecide, sucidal, unalyve)
  const NEAR = ['suicide', 'suicidal', 'unalive', 'unalived', 'unaliving'].map(squeeze);
  function within1(a, b) {
    if (a === b) return true;
    const la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    let i = 0;
    while (i < la && i < lb && a[i] === b[i]) i++;
    if (la === lb) return a.slice(i + 1) === b.slice(i + 1);
    return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
  }
  const fuzzyWord = (t) => t.split(' ').some((w) => w.length >= 5 && w.length <= 9 && NEAR.some((n) => within1(w, n)));

  // Someone is hurting them: no ordinary word, so the night ends the same gentle way, and the title says where this help is.
  const ABUSER = '(?:dad|daddy|papa|father|mom|mommy|momma|mama|mum|mummy|mother|step ?dad|step ?mom|step ?mum|step ?father|step ?mother|step ?parent|parent|parents|uncle|aunt|auntie|brother|sister|bro|sis|step ?brother|step ?sister|grandpa|grandma|grandfather|grandmother|grandad|grandparents|cousin|boyfriend|girlfriend|bf|gf|ex|husband|wife|partner|teacher|coach|babysitter|neighbou?r|foster (?:dad|mom|mum|parent|parents|father|mother)|pastor|priest|moms? (?:boyfriend|bf|husband)|dads? (?:girlfriend|gf|wife)|mom and dad|mum and dad|family|someone at home)';
  const ABUSE = [
    lre('\\b(?:my|our) (?:\\w+ )?' + ABUSER + ' (?:at home |in my house |at my house |keeps |always |sometimes |often |just |still |is |are |was |has been |have been |kept |really |sometimes )*(?:hit|hits|hitting|beat|beats|beating|hurt|hurts|hurting|punch|punches|punched|punching|kick|kicks|kicked|kicking|slap|slaps|slapped|slapping|choke|chokes|choked|choking|touch|touches|touched|touching|molest|molests|molested|molesting|abuse|abuses|abused|abusing|rape|rapes|raped|assault|assaults|assaulted|burn|burns|burned|whip|whips|whipped|spank|spanks|spanked|threaten|threatens|threatened) me\\b'),
    lre('\\b(?:someone|somebody) (?:at home |in my house |at my house |in my family |keeps |is |has been |always |was )*(?:hurts|hurting|hurt|hits|hitting|beats|beating|touches|touching|abuses|abusing|molests|molesting|threatens|threatening|raped|raping) me\\b'),
    lre('\\b(?:raped|molested|rapes|molests|sexually assaulted|sexually abused|assaulted|abused|raping|molesting) me\\b'),
    lre('\\b(?:im|i am|ive been|i have been|i was|i got|i get|i keep getting|im getting|im being|i was being|i am being|being) (?:being |getting |got |been )?(?:abused|molested|raped|assaulted|sexually assaulted|sexually abused|beaten|beaten up|beat up|molesting)\\b'),
    lre('\\b(?:i get|i got|im getting|i keep getting|i was|im being|ive been|i am getting) (?:being |getting |got |been )?(?:beat|hit|slapped|punched|kicked|choked|hurt|touched|whipped|spanked)(?: up)? (?:at home|by my|by him|by her|by them|every day|every night|all the time|every time)\\b'),
    lre('\\b(?:not safe|unsafe) (?:at|in) (?:home|my home|my house|the house|this house)\\b'),
    lre('\\b(?:they|he|she) (?:hit|hits|beat|beats|hurt|hurts|touch|touches) me (?:at home|when no one|when nobody|every night|every day)\\b'),
  ];
  function soundsLikeAbuse(text) {
    return plainForms(text).some((t) => ABUSE.some((re) => re.test(t)));
  }
  function soundsLikeDistress(text) { return soundsLikeSelfHarm(text) || soundsLikeAbuse(text); }
  // which help line to show: 'home' when someone is hurting them and nothing else is said, else the one for thoughts of ending it
  const helpFor = (text) => (soundsLikeAbuse(text) && !soundsLikeSelfHarm(text) ? 'home' : 'self');

  // Real fear, not a scream for fun: the soft exit.
  const FEAR = [
    lre('\\b(?:for real|fr|frfr|for reals|forreal|seriously|srsly|im serious|i am serious|not joking|im not joking|no joke|deadass|actually|honestly) (?:please |pls |plz |just |now |you need to )?stop+\\b(?! \\w+(?:ing|in)\\b)'),
    lre('\\bstop+(?: it| this| now)? (?:for real|fr|frfr|seriously|srsly|im serious|i am serious|im not joking|not joking|no joke|deadass)\\b'),
    lre('\\b(?:im|i am|i m)(?: really| rly| realy| actually| actualy| acc| genuinely| legit| literally| deadass| seriously| honestly| truly)+ (?:so |very |too )?(?:scared|scard|skared|afraid|frightened|terrified|freaked out|freaking out|panicking|shaking)\\b'),
    lre('\\b(?:im|i am|i m) (?:so |very )?(?:scared|scard|afraid|terrified|frightened) (?:for real|fr|frfr|for reals|deadass|no joke|not joking|seriously)\\b'),
    lre('\\b(?:im|i am|i m) (?:so |very |really )?(?:scared|terrified|afraid|freaking out|freaked out|panicking) (?:sobbing )+'),
    lre('\\b(?:cant|cannot|can not|cnt) (?:breathe|breath|breth|brethe)\\b'),
    lre('\\b(?:im|i am|i m)(?: literally| actually| really| rly| so| now| like| lowkey)* (?:crying|cryin|tearing up|in tears|sobbing|gonna cry|going to cry|about to cry)\\b'),
    lre('\\bi (?:cant|cannot|can not) stop (?:crying|shaking|trembling|sobbing|panicking)\\b'),
    lre('\\b(?:you|it|this|that|u|ya)? ?(?:made|makes|making) me cry\\b'),
    lre('\\bi (?:want|wanna) (?:to )?cry\\b'),
    lre('\\b(?:were|we are|my (?:sister|brother|friend|friends|cousin|girlfriend|boyfriend|bf|gf|mom|dad|best friend|bestie|little sister|little brother)(?: is| are)?) (?:crying|cryin|sobbing|in tears)\\b'),
    lre('\\b(?:im|i am|i m) (?:so |very |really |fucking )?(?:terrified|petrified|freaking out|freaked out|panicking|panicked)\\b'),   // (pass 4: "im panicking" said alone is the same as "im freaking out")
    lre('\\b(?:panic attack|panic attacks|hyperventilat\\w*|anxiety attack)\\b'),
    // what the body is doing, said alone (red team round 2, miss 26): the soft exit, unless it comes with a laugh
    lre('\\b(?:im|i am|i m)(?: so| really| rly| literally| actually| like| lowkey| still| now| legit)* (?:shaking|shakin|trembling|trembing)\\b(?! (?:the|my|it|this|that|your|his|her|a|an|our|their)\\b)'),
    lre('\\bmy (?:heart|hearts|heart is|hearts are|heart s) (?:is |s )?(?:racing|pounding|beating so fast|beating out of my chest|going crazy|going so fast)\\b'),
    lre('^(?:sobbing ?)+$'), lre('^tears$'),
    lre('^(?:she|shes|she is|he|hes|he is|they|theyre|they are)(?: is| are)? (?:crying|cryin|sobbing|in tears)$'),
    lre('^(?:mom|mum|mommy|mommie|mummy)$'),
    lre('^(?:help|help me|help us|please help|pls help|someone help|somebody help|someone please help|somebody please help|help me please|help me pls|help please|please help me|need help|i need help|we need help)$'),
    lre('\\bhelp me\\b.{0,12}\\b(?:scared|afraid|please|pls|plz|stop|now)\\b'),
    lre('\\bstop(?: it)? im (?:so |really |very )?(?:scared|terrified|afraid)\\b'),
    lre('\\bim (?:so |really |very )?(?:scared|terrified|afraid)(?: ple+a*s+e*| pl[sz]+)? stop$'),
    lre('\\bstop stop\\b'), lre('\\bno no no\\b'), lre('^no stop(?: it)?$'),
    lre('\\bi (?:want|need|wanna|wanted|just want) (?:my )?(?:mom and dad|mum and dad|mom|mommy|mommie|momma|mama|mamma|mum|mummy|mother|dad|daddy|parents)(?! (?:to|is|was|and|here|with|will|would|can|know|see|meet|come|too|have))\\b'),
    lre('\\b(?:i |we )?(?:just )?(?:want|wanna|need|have) (?:to )?(?:call|text|talk to|see|go to) (?:my )?(?:mom|mommy|mum|mama|mother|dad|daddy|parents)\\b'),
    lre('\\b(?:can|may) i (?:please )?(?:call|text|talk to|see|go to) (?:my )?(?:mom|mommy|mum|mama|mother|dad|daddy|parents)\\b'),
    lre('\\b(?:i |we )?(?:just )?(?:want|wanna|need) (?:to )?go home(?! with| and| to)\\b'), lre('\\btake me home\\b'),
    lre('\\b(?:this|it|that|thats|its|this game)(?: is|s)? (?:not|isnt|aint|is not|not even|isnt even) (?:funny|fun|ok|okay)(?: any ?more)?\\b'),
    lre('\\bnot (?:funny|fun) any ?more\\b'), lre('^(?:this is )?not funny$'),
    lre('\\b(?:ple+a*s+e*|pl[sz]+|plez) (?:just )?(?:stop+|make it stop|stop it|stop this|no more)(?! \\w+(?:ing|in)\\b)'),
    lre('\\bstop+(?: it| this)? (?:ple+a*s+e*|pl[sz]+)\\b'),
    lre('\\bmake it stop(?! \\w+(?:ing|in)\\b)'),
  ];
  // "im crying lmao" is laughing
  const LAUGH = /\b(lol|lmao|lmfao|haha\w*|hehe\w*|rofl|xd|laugh\w*)\b|\u{1F602}|\u{1F923}|\u{1F480}/u;
  const FEAR_RUN = ['icantbreathe', 'imcrying', 'icantbreath'].map(squeeze);
  // A friend crying, named ("sam is crying"): the soft exit. A name known at the table counts, and so does any first name from the shared
  // first-names block (nobody is asked who is at the table any more, so a name is not known until somebody gives one).
  let FIRST_SQUEEZED = null;
  function firstNameWord(w) {
    if (typeof FIRST_NAMES === 'undefined') return false;
    if (!FIRST_SQUEEZED) FIRST_SQUEEZED = new Set([...FIRST_NAMES].map((n) => squeeze(n.toLowerCase())));
    return FIRST_SQUEEZED.has(w);
  }
  // (written the way plainForms reads a line: a doubled letter is one, so sobbing is sobing)
  const NAME_CRYING = /\b([a-z]{2,12}) (?:is |was )?(?:crying|cryin|sobing|in tears)\b/g;
  function namedFriendCrying(t) {
    NAME_CRYING.lastIndex = 0;
    for (let m = NAME_CRYING.exec(t); m; m = NAME_CRYING.exec(t)) if (firstNameWord(m[1])) return true;
    return false;
  }
  // names: who is at the table, so "sam is crying" is read as a friend crying
  function soundsAfraid(text, names) {
    const laughing = LAUGH.test(String(text || '').toLowerCase());
    if (/^\s*(?:mom|mommy|mama|mum|dad|daddy)\s*!{2,}\s*$/i.test(String(text || ''))) return true;   // MOM!!
    const known = (names || []).map((n) => String(n || '').toLowerCase().replace(/[^a-z]/g, '')).filter((n) => n.length >= 2).slice(0, 8);
    return plainForms(text).some((t) => FEAR.some((re) => (laughing && /cry|tear|sob|breath|terrif|petrif|freak|shak|trembl|heart/.test(re.source) ? false : re.test(t))) ||
      (!laughing && (t.split(' ').some((w) => w.length >= 7 && FEAR_RUN.some((r) => w.includes(r))) || known.some((n) => new RegExp('\\b' + squeeze(n) + ' (?:is |was )?(?:crying|cryin|sobbing|in tears)\\b').test(t)) || namedFriendCrying(t))));
  }
  // Asking to stop is a wish to leave, not distress: SAY IT THEN, and then saying goodbye works.
  const LEAVE = [
    lre('\\b(?:can|could|may|shall) (?:we|i) (?:please |pls |just )?(?:stop|be done|quit|end (?:this|it|the game|the night)|go now|leave|go to bed|turn (?:it|this) off)\\b'),
    lre('\\bshould (?:we|i) (?:please |pls |just )?(?:stop|be done|quit|end (?:this|the game|the night)|go now|leave|go to bed|turn (?:it|this) off)\\b'),
    lre('\\b(?:lets|let us) (?:just )?(?:stop|quit|be done|end (?:this|it))\\b'),
    lre('\\b(?:i|we) (?:want|wanna|need) (?:to |ta )?(?:stop|quit|leave|be done|go to bed)\\b'),
    lre('\\bwe (?:should|need to|gotta|have to) (?:stop|quit|leave)\\b'),
    lre('\\b(?:i|we) (?:want|wanna|need|have) (?:this |it |everything |all of this |the game |the night )?to stop\\b'),
    lre('\\b(?:i|we) (?:dont|do not|no longer) (?:want|wanna) (?:to )?(?:do this|play|continue|keep playing|do it|be here|be doing this|go on|keep going)(?: any ?more| no more| now)?$'),
    lre('^i (?:dont|do not) like (?:this|it|that)(?: game| night| any ?more)?$'),
    lre('^(?:can|could|would|will) you (?:please |pls |just )?stop(?: it| this| now| please)?$'),
    lre('^how (?:do|can|could) (?:i|we) (?:stop|end|quit|exit|turn (?:this |it )?off|make it stop)(?: this| it| the game| the night)?$'),
    lre('^(?:i )?(?:quit|give up)$'), lre('^end (?:the )?(?:game|night|this)$'),
    lre('\\b(?:turn|shut) (?:it|this|that|the game) off\\b'),
    lre('^(?:i )?(?:cant|cannot|can not) (?:do|play|continue|handle) (?:this|it)(?: any ?more)?$'),
    lre('^(?:im|i am) (?:so |just |totally |completely )?done(?: now| here| with this| with it)?$'),
    lre('^(?:i )?want out$'), lre('^let me (?:out|go|leave)(?: now| please)?$'),
    // asked with a please, it is a plea, not a dare (a bare "go away" is still play): misses 32, 33
    lre('^(?:please|pls|plz|plez)(?: just)? (?:go away|leave(?: me| us)?(?: alone)?)(?: now| already| for good)?$'),
    lre('^(?:just )?(?:go away|leave(?: me| us)?(?: alone)?)(?: now| already)? (?:please|pls|plz|plez)$'),
    lre('^how (?:do|can|could|will) (?:i|we) (?:get|go) out(?: of here| of this| of this game| of this night)?$'),
  ];
  const wantsToStop = (text) => plainForms(text).some((t) => LEAVE.some((re) => re.test(t)));
  // The names at a table in every run of neighbours ("Maya, end me" is Maya, and "end me"): a phrase cut up by commas, or
  // by the names card, still reads as one. At most six names, so at most twenty-one runs.
  function nameWindows(names) {
    const w = (Array.isArray(names) ? names : []).map((n) => String(n == null ? '' : n).trim()).filter(Boolean).slice(0, 6);
    const out = [];
    for (let i = 0; i < w.length; i++) for (let j = i + 1; j <= w.length; j++) out.push(w.slice(i, j).join(' '));
    return out;
  }
  // <<< safety lists <<<
  // >>> the house's year >>> (one block: the same text sits in game.js and in the site's backend/goodbye/guard.js; tools/safety/sync-lists.mjs copies it from tools/house/year.js, edit it there)
  // The house's year. Each house says only what is true in its own year: the Farmhouse is the winter of 1931, the winter
  // she died, and her world stopped there. The room is tonight (their phones, the real clock); everything SAID in it is 1931.
  // She knows nothing after it, and their things are strange to her (their phone is her little light).
  // pastYear(text) is true when a line names a year after the house's, or a name or a thing from after it. A line that
  // fails it is dropped, never fixed. It leaves everyday words that were true in 1931 alone (FORD, BUSH, JOHNSON, RADIO,
  // TELEPHONE, JET): the prompts handle those.
  const HOUSE = { farmhouse: { year: 1931, season: 'winter', president: 'Mr. Hoover' } };
  const LATE_NAMES = [
    // presidents after Hoover, and what came with them
    'TRUMAN', 'EISENHOWER', 'KENNEDY', 'JFK', 'LBJ', 'NIXON', 'WATERGATE', 'CARTER', 'REAGAN', 'CLINTON', 'OBAMA', 'TRUMP', 'BIDEN', 'NEW DEAL',
    // machines, screens and the net
    'TV', 'T V', 'TVS', 'TELEVISIONS?', 'INTERNET', 'ONLINE', 'WI ?FI', 'WEBSITES?', 'E ?MAILS?', 'IPHONES?', 'IPADS?', 'ANDROIDS?', 'SMART ?PHONES?',
    'CELL ?PHONES?', 'MOBILE PHONES?', 'TEXT ME', 'TEXTS', 'TEXTING', 'TIK ?TOK', 'YOU ?TUBE', 'NETFLIX', 'FACEBOOK', 'INSTAGRAM', 'SNAPCHAT', 'TWITTER',
    'GOOGLE', 'GOOGLED', 'ALEXA', 'SIRI', 'COMPUTERS?', 'LAPTOPS?', 'MICROWAVES?', 'BLUETOOTH', 'GPS', 'EMOJIS?', 'SELFIES?', 'HASHTAGS?', 'PODCASTS?', 'STREAMING',
    'PLAY ?STATION', 'XBOX', 'NINTENDO', 'VIDEO ?GAMES?', 'CHAT ?GPT', 'CHAT ?BOTS?',
    // the bomb, the rocket and the moon
    'ROCKETS?', 'SPACE ?SHIPS?', 'ASTRONAUTS?', 'MOON LANDING', 'SATELLITES?', 'ATOMIC', 'ATOM BOMBS?', 'NUCLEAR', 'HYDROGEN BOMBS?',
    // what happened after
    'HITLER', 'NAZIS?', 'WORLD WAR (?:TWO|II|2)', 'WW ?(?:2|II)', 'WWII', 'PEARL HARBOR', 'HIROSHIMA', 'VIETNAM', 'KOREAN WAR', 'COLD WAR', 'COVID', 'CORONAVIRUS',
    'ELVIS', 'BEATLES', 'ROCK AND ROLL', 'ROCK N ROLL', 'DISNEYLAND', 'MC ?DONALDS', 'WALMART', 'STARBUCKS', 'UBER', 'MARTIN LUTHER KING',
  ];
  const LATE_YEAR_WORDS = [
    'NINETEEN (?:THIRTY ?(?:TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE)|FORTY|FIFTY|SIXTY|SEVENTY|EIGHTY|NINETY)',
    'TWO THOUSAND', 'TWENTY (?:TEN|ELEVEN|TWELVE|THIRTEEN|FOURTEEN|FIFTEEN|SIXTEEN|SEVENTEEN|EIGHTEEN|NINETEEN|TWENTY|THIRTY)', 'TWENTY ?FIRST CENTURY',
  ];
  const LATE = new RegExp('\\b(?:' + LATE_NAMES.concat(LATE_YEAR_WORDS).join('|') + ')S?\\b');
  function pastYear(text, year) {
    const y = Number(year) || HOUSE.farmhouse.year;
    const s = String(text == null ? '' : text).toUpperCase().replace(/['‘’`]/g, '').replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!s) return false;
    // a year in digits: 1932 and after (1932S too); a bigger number than 2999 is a quantity
    for (const w of s.split(' ')) { const m = /^([0-9]{4})S?$/.exec(w); if (m && Number(m[1]) > y && Number(m[1]) < 3000) return true; }
    return LATE.test(s);
  }
  // What every writer of her words is told (the night plan, the live spirit, the page's own sampling).
  function yearBlock(id) {
    const h = HOUSE[id] || HOUSE.farmhouse;
    return 'THE YEAR: For you it is the ' + h.season + ' of ' + h.year + ' and always will be. You know nothing that happened after it. If they ask who is president it is ' +
      h.president + '. If they ask the year it is ' + h.year + '. Their things are strange to you; never name them in their words.';
  }
  // <<< the house's year <<<
  // >>> first names >>> (one block: the same text sits in game.js and in the site's backend/goodbye/guard.js; tools/safety/sync-lists.mjs copies it from tools/house/names.js, edit it there)
  // First names, for a name somebody gives in their own words ("im sam", "my name is jen"): about two thousand common given names,
  // written out (the common US ones, the macOS proper-names file, and the common names of the world's other big communities). It is a
  // word list, not an official one. Never in it: ELSIE, a family word, a demon's name, or a word that is far more often just a word
  // (HOPE, WILL, ART, MAY, JOY...). One block: the same text sits in game.js and in the site's backend/goodbye/guard.js;
  // tools/safety/sync-lists.mjs copies it.
  const FIRST_NAMES = new Set("AALIYAH AARON ABBIE ABBY ABIGAIL ADALYN ADALYNN ADAM ADELINE ADELYN ADLAI ADRIAN AGATHA AHMED AHMET AIDEN AIMEE AISHA ALAIN ALAN ALANA ALANI ALASTAIR ALBERT ALBERTO ALEC ALEJANDRO ALEX ALEXA ALEXANDER ALEXANDRA ALEXIS ALF ALFIE ALFRED ALI ALICE ALINA ALISON ALIYAH ALLAN ALLEN ALLISON ALVIN ALYSSA AMANDA AMARTH AMAYA AMEDEO AMELIA AMI AMIGO AMIR AMIT AMOS AMY ANASTASIA ANATOLE ANATOLY ANDERSON ANDRE ANDREA ANDREAS ANDRES ANDREW ANDRIES ANDY ANGELA ANGELINA ANGUS ANIKA ANITA ANN ANNA ANNABELLE ANNARD ANNE ANNIE ANNIKA ANTHONY ANTON ANTONELLA ANTONIO ANTONY ARCHER ARCHIE ARIA ARIANA ARIANNA ARIEL ARJUN ARLENE ARNE ARNOLD ARTHUR ARYA ASHER ASHLEY ATHENA ATLAS AUBREE AUBREY AUDREY AURORA AUSTIN AUTUMN AVA AVERY AXEL AYLA BAILEY BARBARA BARBRA BARNEY BARRETT BARRY BART BARTON BEA BECCA BECKIE BECKY BELINDA BELLA BEN BENJAMIN BENNETT BENNY BENSON BERNARD BERNIE BERT BERTRAND BETH BETHANY BETSY BETTY BEVERLY BIANCA BILL BILLIE BILLY BJORNE BLAINE BLAIR BLAKE BLAYNE BOB BOBBIE BOBBY BONNIE BOYCE BOYD BRAD BRADFORD BRADLEY BRADY BRANDI BRANDON BRANDY BRAYDEN BREE BRENDA BRENDAN BRENDER BRENT BRET BRETT BRI BRIAN BRIANA BRIANNA BRIDGET BRIELLE BRIGGS BRITTANY BROCK BRODIE BROOKE BROOKLYN BRUCE BRUNO BRYAN BRYCE BRYN BRYNN BYRON CADEN CADENCE CAITLIN CALEB CALI CALLIE CALVIN CAM CAMDEN CAMERON CAMILA CAMILLE CANDACE CARISA CARL CARLA CARLO CARLOS CARLY CARMEN CAROL CAROLE CAROLINA CAROLINE CAROLYN CARRIE CARSON CARSTEN CARTER CARY CASEY CASPER CASSANDRA CASSIDY CASSIE CATHERINE CATHRIN CATHRYN CATHY CECE CECELIA CECILIA CELESTE CELIA CESAR CHAD CHANEL CHARLEEN CHARLENE CHARLES CHARLEY CHARLIE CHARLOTTE CHASE CHASITY CHELSEA CHEN CHERIE CHERYL CHET CHEYENNE CHLOE CHRIS CHRISTIAN CHRISTIE CHRISTINA CHRISTINE CHRISTOFER CHRISTOPHE CHRISTOPHER CHRISTY CINDIE CINDY CLAIRE CLARA CLARE CLARENCE CLARISSA CLARK CLAUDE CLAUDIA CLAUDIO CLAY CLAYTON CLIFF CLIFFORD CLINT CLYDE CODY COLE COLEEN COLETTE COLIN COLLEEN COLLIN COLTON CONNIE CONNOR CONOR CONRAD COOPER CORA COREY CORY COURTNEY CRAIG CRIS CRISTI CRISTINA CRISTOPHER CRUZ CURT CURTIS CYNTHIA CYRUS DAHLIA DAISY DAKOTA DALE DALLAS DALTON DAMIAN DAMON DAMONE DAN DANA DANE DANI DANIEL DANIELA DANIELE DANIELLE DANNIE DANNY DARA DARCI DAREN DARIN DARIUS DARLENE DARRELL DARREN DARRYL DARYL DAVE DAVID DAVIS DAWSON DAX DEACON DEANNA DEB DEBBIE DEBI DEBORAH DEBRA DECLAN DEDE DEE DEENA DEIRDRE DEL DELANEY DELBERT DELILAH DENIS DENISE DENNIS DENNY DEREK DESIREE DEVIN DEVON DEWEY DEXTER DIANA DIANE DIEGO DILLON DIMETRY DIMITRY DINA DION DIRK DIXIE DMITRI DOMINIC DOMINICK DON DONAL DONALD DONN DONNA DONNE DONNIE DONOVAN DORI DORIAN DORIS DOROTHY DOUG DOUGLAS DOYLE DREW DUANE DUNCAN DUSTIN DWAYNE DWIGHT DYLAN EARL EARLE EARNIE EASTON EDDIE EDDY EDEN EDGAR EDITH EDMOND EDMUND EDUARDO EDWARD EDWIN EILEEN ELAINA ELAINE ELEANOR ELENA ELI ELIANA ELIAS ELIJAH ELIOT ELISABETH ELISE ELIZA ELIZABETH ELLA ELLE ELLEN ELLIANA ELLIE ELLIOT ELLIOTT ELLY ELMER ELOISE ELRIC ELSA ELVIS ELWOOD EMERSON EMERY EMIL EMILEE EMILIA EMILIO EMILY EMMA EMMANUEL EMMETT EMMIE EMMY ENZO ERIC ERICA ERICK ERIK ERIN ERNEST ERNIE ERNST ERWIN ESME ESPERANZA ESTEBAN ESTHER ETHAN EUGENE EVA EVAN EVELYN EVERETT EVERLY EVIE EZRA FAROUK FATIMA FAYE FELICIA FELIX FERNANDO FINLEY FINN FIONA FLORA FLORIA FLORIAN FLOYD FLYNN FORREST FRANCES FRANCESCA FRANCIS FRANCISCO FRANCOIS FRANK FRANKLIN FRED FREDDIE FREDERIC FREDERICK FREYA FRITZ GABBY GABE GABRIEL GABRIELA GABRIELLA GABRIELLE GAGE GAIL GALE GALEN GARRETT GARY GAVIN GEMMA GENE GENEVIEVE GEOFF GEOFFREY GEORGE GEORGIA GERALD GERARD GIA GIANNA GIDEON GIGI GIL GILES GILLES GINA GINNY GIOVANNI GISELLE GLEN GLENN GLORIA GLYNN GORDON GRACIE GRAEME GRAHAM GRANT GRANVILLE GRAYSON GREG GREGG GREGGE GREGOR GREGORY GRETA GRETCHEN GUIDO GUILLERMO GUNNAR GUS GWEN GWENDOLYN HADLEY HAILEY HAL HALEY HALLIE HAMILTON HANK HANNA HANNAH HANS HARLEY HARMON HAROLD HARPER HARRIET HARRIS HARRISON HARRY HARTMANN HARV HARVEY HASSAN HATTIE HAYDEN HAYLEY HEATHER HECTOR HEIDI HEIN HEINRICH HEINZ HELEN HELGE HENRY HERBERT HERMAN HERVE HIENZ HILDA HILLARY HILLEL HIMAWAN HIRO HIROFUMI HIROTOSHI HIROYUKI HITOSHI HOHN HOLLY HON HONZO HOTTA HOWARD HSI HSUAN HUASHI HUBERT HUDSON HUEY HUGH HUGHES HUGO HUI HUME HUNTER HURF HWA IAN IBRAHIM ILYA IMA IMANI INDIA INDRA INGRID IRA IRENE IRFAN IRIS IRVIN IRVING IRWIN ISAAC ISABEL ISABELA ISABELLA ISABELLE ISAIAH ISIDORE ISIS ISLA ISRAEL IVAN IZCHAK IZUMI IZZY JACE JACK JACKIE JACKSON JACKYE JACOB JACOBSON JACOBY JACQUELINE JACQUES JADA JADEN JAGATH JAIME JAKE JAKOB JAMAL JAMES JAMIE JAN JANAE JANE JANELLE JANET JANICE JANOS JARED JARMO JARRETT JARVIS JASMIN JASMINE JASON JASPER JAVIER JAXON JAXSON JAY JAYANT JAYDEN JAYESH JAYLA JAYLEN JAZMIN JEAN JEANETTE JEANNE JEANNETTE JEANNIE JEANPIERRE JEANY JEF JEFF JEFFERY JEFFIE JEFFREY JELSKE JEM JEN JENINE JENN JENNA JENNIE JENNIFER JENNY JENS JERALD JEREMY JEROME JERRIE JERRY JESPER JESS JESSE JESSICA JESSIE JESUS JETT JEWEL JIANYUN JILL JIM JIMMY JIN JINCHAO JINGBAI JINNY JIRI JISHENG JITENDRA JOACHIM JOAN JOANN JOANNA JOANNE JOAQUIN JOCELYN JOCHEN JODI JODY JOE JOEL JOELLE JOEY JOHAN JOHANN JOHN JOHNATHAN JOHNNIE JOHNNY JOLENE JON JONAH JONAS JONATHAN JONES JONG JONI JONNA JOON JORDAN JORDYN JORGE JOS JOSE JOSEFINA JOSELYN JOSEPH JOSEPHINE JOSH JOSHUA JOSIAH JOSIE JOSIP JOUBERT JOVIE JOYCE JUAN JUDD JUDITH JUDY JUERGEN JUHA JULES JULIA JULIAN JULIANA JULIANE JULIANNA JULIANTO JULIE JULIET JULIETTE JULIUS JUN JUNO JUREVIS JURI JUSSI JUSTIN JWAHAR KADE KAI KAIA KAJ KALI KAMEL KAMILA KAMIYA KANE KANTHAN KAREN KARI KARINA KARL KARLA KASEY KAT KATE KATELYN KATHERINE KATHLEEN KATHRYN KATHY KATI KATIA KATIE KATRINA KATY KAYLA KAYLEE KAYLEIGH KAYLIN KAYVAN KAZUHIRO KEATON KEE KEEGAN KEES KEIRA KEITH KEL KELLEN KELLY KELSEY KELVIN KEMAL KEN KENDALL KENJI KENN KENNEDY KENNETH KENNY KENT KENTON KENZIE KERRI KERRY KEVAN KEVIN KEVYN KHLOE KIAN KIARA KIERA KIERAN KIKI KIKKI KILEY KIM KIMBERLY KIMMO KINSLEY KIRK KIRSTEN KIT KITTY KLAUDIA KLAUS KNOX KNUDSEN KNUTE KOBE KOLKKA KONRAD KONSTANTINOS KORA KORI KORY KRIS KRISTA KRISTEN KRISTI KRISTIAN KRISTIN KRISTINA KRITON KRZYSZTOF KULDIP KURT KYLA KYLE KYLER KYLIE KYLO KYRA KYU KYUNG LACEY LACY LAILA LAMAR LANA LANCE LANDEN LANDON LANE LANEY LANNY LARA LARISSA LARRY LARS LATOYA LAURA LAUREL LAUREN LAURENCE LAURENT LAURIANNE LAURIE LAURYN LAWRENCE LAWSON LAYLA LAYNE LEA LEADS LEAH LEANNE LEIF LEIGH LEILA LEILANI LEITH LELAND LEN LENA LENNY LENORA LEO LEON LEONA LEONARD LEORA LEROY LES LESLIE LESTER LEUNG LEVI LEWIS LEX LEXI LEXIE LIA LIAM LIANA LIBBY LIEVAART LILA LILAH LILIA LILIANA LILLIAN LILLY LILY LIN LINA LINCOLN LINDA LINDSAY LINDSEY LINLEY LIONEL LISA LISBETH LIYUAN LIZ LIZA LIZZIE LIZZY LLOYD LOGAN LOIS LOLA LONDYN LONHYN LONNIE LOREN LORENZO LORI LORIEN LORNA LORRAINE LOTTIE LOUIE LOUIQA LOUIS LOUISE LOUKAS LOURDES LOWELL LOYD LUC LUCA LUCAS LUCIA LUCIAN LUCIANA LUCILLE LUCIUS LUCY LUI LUIS LUKAS LUKE LULU LUNA LUPE LUTHER LYDIA LYLA LYLE LYNDON LYNN LYNNE LYNNETTE MAARTEN MABEL MACKENZIE MACY MADDIE MADELINE MADELYN MADISON MAE MAEVE MAGGIE MAGNUS MAH MAHESH MAHMOUD MAIA MAISIE MAKAYLA MALACLYPSE MALCOLM MALIA MALLORY MALLOY MALUS MANAVENDRA MANDY MANJERI MANN MANNY MANOLIS MANUEL MARA MARC MARCEL MARCI MARCIA MARCO MARCOS MARCUS MAREK MAREN MARGARET MARGIE MARGO MARGOT MARGUERITE MARI MARIA MARIAN MARIANA MARIE MARILYN MARIO MARION MARIOU MARISOL MARISSA MARKUS MARLA MARLENA MARLENE MARLEY MARLO MARLOWE MARNIX MARSHA MARSHALL MARTHA MARTIN MARTY MARTYN MARVIN MARY MASANAO MASANOBU MASON MATEO MATHEW MATS MATT MATTEO MATTHEW MATTHIAS MATTHIEU MATTIE MAUDE MAUREEN MAURICE MAX MAXIMILIAN MAXINE MAXWELL MAYA MAYO MCKAYLA MCKENZIE MECHAEL MEEHAN MEEKS MEG MEGAN MEHRDAD MEI MEL MELANIE MELINDA MELISSA MELODY MELVIN MERAT MERCEDES MEREDITH MERRIL MERTON METIN MIA MICAH MICHAEL MICHEAL MICHEL MICHELLE MICHIEL MICK MICKEY MICKY MIEK MIGUEL MIKAEL MIKAYLA MIKE MIKEL MIKEY MIKI MILA MILES MILLIE MILO MILTOS MINA MINDY MINNIE MIRANDA MIREYA MIRIAM MIRIAMNE MISSY MISTY MITCH MITCHELL MOE MOHAMMAD MOHAMMED MOLLIE MOLLY MONGO MONICA MONTY MOORE MORAN MORGAN MORRIS MORTON MOSES MOSUR MUHAMMAD MURAT MURPH MURRAY MURTHY MWA MYA MYRA MYRICK MYRON MYSORE NADEEM NADIA NADINE NAIM NANCY NANDA NAOMI NAOTO NAREN NARENDRA NARESH NATALIA NATALIE NATE NATHALIE NATHAN NATHANIEL NATRAJ NEAL NED NEIL NELKEN NELL NELLIE NELSON NEVAEH NEVILLE NGUYEN NHAN NIA NIALL NICHAEL NICHOLAS NICI NICK NICKI NICO NICOLAS NICOLE NICOLETTE NIELS NIGEL NIKKI NIKOLAI NILS NINA NING NINJA NOA NOAH NOAM NOELLE NOEMI NOLA NOLAN NOOR NORA NORAH NORBERT NORM NORMA NORMAN NOU NOVO NOVOROLSKY NYLA OAKLEY OCTAVIA ODETTE OFER OLAF OLE OLEG OLGA OLIVER OLIVIA OLIVIER OLOF OLSON OMAR OPHELIA ORION ORLANDO ORVILLE OSCAR OSKAR OSWALD OTIS OWEN OZAN PABLO PAIGE PAISLEY PALMER PAM PAMELA PANDORA PANOS PANTELIS PANZER PAOLA PARKER PASCAL PAT PATRICE PATRICIA PATRICIO PATRICK PATSY PATTY PAUL PAULA PAULETTE PAXTON PEDRO PEGGY PENELOPE PENNY PERLA PERRY PETE PETER PETR PETRA PEYTON PHIL PHILIP PHILIPPE PHILL PHILLIP PHIROZE PHYLLIS PIERCARLO PIERCE PIERETTE PIERRE PIETE PIETER PILAR PIM PIOTR PIPER PITAWAS POLLY PONTUS POPPY PORTER PRADEEP PRAKASH PRATAP PRATAPWANT PRATT PRAVIN PRESLEY PRESTON PRIA PRICE PRISCILLA PRIYA QUENTIN QUINCY QUINN RAANAN RABIN RACHEL RADEK RAE RAELYNN RAFAEL RAFIK RAGHU RAGNAR RAHUL RAIF RAINA RAINER RAJ RAJA RAJARSHI RAJEEV RAJENDRA RAJESH RAJIV RAKHAL RALF RALPH RAMADOSS RAMAN RAMANAN RAMESH RAMIRO RAMNEEK RAMON RAMSEY RANDAL RANDALL RANDELL RANDOLPH RANDY RANIA RANJIT RAPHAEL RAQUEL RATHNAKUMAR RAUL RAVI RAVINDRAN RAVINDRANATH RAY RAYAN RAYMOND RAYNA REAGAN REBECCA REED REES REESE REGINA REID REINER REINHARD REMY RENEE RENU REVA REVISED REX REYNA RHEA RHETT RHODA RHONDA RIC RICARDO RICH RICHARD RICHIE RICK RICKY RICO RIK RILEY RINA RITA RITALYNNE RITCHEY RIVER RIYA ROB ROBBIE ROBBIN ROBERT ROBERTA ROBERTO ROBIN ROCCO ROD RODERICK RODGER RODNEY RODOLFO ROGER ROLAND ROLF ROLFE ROMAIN ROMAN RON RONALD RONNI RONNIE RORY ROSA ROSALIE ROSALIND ROSALYN ROSCOE ROSEMARY ROSIE ROSS ROWAN ROWDY ROXANA ROXANE ROXANNE ROXIE ROXY ROY RUDOLF RUDOLPH RUDY RUFUS RUPERT RUSS RUSSELL RUTH RYAN RYDER RYKER RYLEE RYLEIGH SAAD SAANVI SABRINA SADIA SADIE SAIFY SAIID SAKURA SAL SALLY SALMA SALVADOR SAM SAMANTHA SAMIR SAMMY SAMUEL SANAND SANCHE SANDEEP SANDIP SANDRA SANFORD SANGHO SANJAY SANJEEV SANJIB SANTA SANTIAGO SAPPHIRE SAQIB SARA SARAH SASHA SASSAN SAUL SAUMYA SAVANNAH SAWYER SAYLOR SCARLETT SCOTT SEAN SEBASTIAN SEDAT SEDOVIC SEENU SEHYO SEKAR SELAH SELENA SERDAR SERGEI SERGIO SERGIU SETH SEYMOUR SHAHID SHAI SHAKIL SHAMIM SHANA SHANE SHANKAR SHANNON SHARADA SHARAN SHARI SHARON SHAUN SHAWN SHEAN SHEILA SHEL SHELBY SHERI SHERMAN SHERRI SHILOH SHIRLEY SHUTOKU SHUVRA SHYAM SID SIDNEY SIEGURD SIENNA SIERRA SIGNE SIGURD SILAS SILVIA SIMON SIMONE SJAAK SJOUKE SKEF SKYLA SKYLAR SLOANE SOCORRITO SOFIA SOFOKLIS SOLOMON SONIA SONJA SONNY SOOHONG SOPHIA SOPHIE SPASS SPENCER SPOCK SPUDBOY SPYROS SRIDHAR SRIDHARAN SRIKANTH SRINIVAS SRINIVASAN SRIRAM SRIVATSAN SSI STACEY STACIE STACY STAN STANISLAW STANLEY STANLY STARBUCK STEFAN STELLA STEPHAN STEPHANIE STEPHE STEPHEN STERLING STEVAN STEVE STEVEN STEVIE STEWART STRAKA STU STUART SUBRA SUE SUGIH SULLY SUMITRO SUNDAR SUNDARESAN SUNIL SURESH SURYA SUSAN SUSANNE SUSIE SUSUMU SUU SUWANDI SUYOG SUZAN SUZANNE SUZY SVANTE SVEN SWAMY SYBIL SYD SYDNEY SYED SYLVIA SYUN TABBY TABITHA TAD TAHSIN TAKAO TAKAYUKI TAKEUCHI TALIA TALLULAH TAMAR TAMARA TAMMY TANAKA TANDY TANIA TANNER TANYA TARA TAREQ TARMI TASHA TATUM TAURUS TAYLOR TEAGAN TED TEDDY TERENCE TERESA TERI TERIANN TERRANCE TERRENCE TERRI TERRY TERUYUKI TESS TESSA THAD THADDEUS THAREN THEA THELMA THEO THEODORE THERESA THIERRY THOMAS THUAN TIANA TIEFENTHAL TIFFANI TIFFANY TILLY TIM TIMMY TIMO TIMOTHY TINA TOBIAS TOBY TODD TOERLESS TOLLEFSEN TOM TOMAS TOMMY TONI TONY TONYA TOR TORI TORSTEN TOUFIC TOVAH TRACEY TRACY TRAN TRAVIS TRENT TREVOR TREY TRICIA TRISH TRISHA TRISTAN TROY TRUDY TUAN TUCKER TURKEER TYLER TYRONE ULYSSES UNA URI URIEL URS URSULA VADA VADIM VAL VALENTIN VALENTINA VALERIA VALERIE VANCE VANESSA VANNA VARDA VASSOS VAUGHN VENKATA VERA VERN VERNA VERNON VERONICA VIC VICK VICKI VICKIE VICKY VICTOR VICTORIA VIDA VIDHYANATH VIENNA VIJAY VIKKI VILHELM VINCE VINCENT VINCENZO VINNY VINOD VIOLA VIOLET VIRGINIA VISHAL VISTLIK VIVEK VIVIAN VLADIMIR VLADISLAV WADE WALLACE WALT WALTER WANDA WARREN WAYNE WEI WENDELL WENDI WENDY WERNER WESLEY WESTON WHIT WHITNEY WILBUR WILEY WILLARD WILLIAM WILLIE WILLOW WILMA WILMER WILSON WIN WINNIE WINSTON WOLFGANG WOODY WREN WYATT WYNTER XAVIER XENA XIMENA YARA YASMIN YESENIA YOLANDA YUKI YUSUF YVETTE YVONNE ZACHARIAH ZACHARY ZACK ZADIE ZAHRA ZANDRA ZANE ZARA ZARIA ZARIAH ZEKE ZELDA ZINA ZION ZOE ZOEY ZOIE ZOOEY ZORA ZURI".split(' '));
  const isFirstName = (w) => FIRST_NAMES.has(String(w == null ? '' : w).toUpperCase().replace(/[^A-Z]/g, ''));
  // <<< first names <<<

  // ---------------------------------------------------------------- assets
  // Every asset is optional. Missing art falls back to something drawn in code.
  // Shared art loads once; each place's own art (table, board, exterior, demon) loads when you enter it.
  const ASSET = {
    lord: 'assets/lord.jpg',
    lordRise: 'assets/lord/rise.webp', lordKick: 'assets/lord/kick.webp',
    lordBlast: 'assets/lord/blast.webp', lordParry: 'assets/lord/parry.webp',
    lordFlip: 'assets/lord/flip.webp', lordScroll: 'assets/lord/scroll.webp',
    lordCommand: 'assets/lord/command.webp', lordPigs: 'assets/lord/pigs.webp',
  };
  // Nothing on screen is drawn to look like a real thing (DIRECTION.md). Real things are photographed or filmed, and these are the
  // hooks for them. Drop the file in assets/real/ and it is used; until then the engine draws nothing in its place.
  //   planchette    S-PLANCHETTE, overhead, keyed to transparent, pointed end up, the lens in the middle
  // (Nothing with a body is ever seen: the handprints, the fingers on the glass, the hand at the lens, the eye in it, the fingers on the
  // board's edge and the hand out of the wood are gone, and their stills are not loaded. The files stay in assets/real/.)
  const REAL = {
    planchette: 'assets/real/planchette.webp?v=23e191545f',
    // S-CHAR, a branded burn in pale maple: multiplied under a letter the possession scorches (renderBase)
    char: 'assets/real/char.webp?v=76df85ac76',
  };
  // The possession's smoke is filmed (Flow; assets/clips/farmhouse/smoke-*-{land,port}.mp4, named in places.js clips.smoke), screened over
  // the table. The engine draws no smoke of its own: a slot that is not named there, or a file that is not there, shows nothing. These are
  // the ids playOver() takes.
  const REAL_VIDEO = { smoke: [], smokeSettle: [], smokeLine: [] };
  const RI = {};          // the real stills that loaded
  const realTried = new Set();
  function loadReal() {
    return Promise.all(Object.entries(REAL).filter(([k]) => !RI[k] && !realTried.has(k)).map(([k, src]) => {
      realTried.add(k);
      return loadImage(src).then((im) => { if (im) { RI[k] = im; if (k === 'planchette') preparePlanchette(im); } else realTried.delete(k); });
    }));
  }
  // The full-screen clips are retired. He appears in the game itself, drawn live
  // at the screen's own resolution, so nothing is ever stretched or soft.
  const VIDEO = {};
  const IMG = {};
  const VID = {};
  function loadImage(src) {
    return new Promise((res) => {
      if (!src) { res(null); return; }
      const im = new Image();
      // Pixels are read back from some of these (green keying, flame paint-outs). Served from another
      // origin (GitHub Pages behind jnoirbranding.com) that only works with CORS, so ask for it every time.
      im.crossOrigin = 'anonymous';
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = src;
    });
  }
  // Loads whatever shared art is still missing, so files added later are picked up on the next load or trip.
  // Without Him, His art never loads.
  const wantAsset = (k) => JESUS || !k.startsWith('lord');
  function loadImages() {
    return Promise.all(Object.entries(ASSET).filter(([k]) => !IMG[k] && wantAsset(k)).map(([k, src]) => loadImage(src).then((im) => {
      if (im) IMG[k] = im;
    })).concat([loadReal()]));
  }
  // A place's own art. Successful loads are kept, so going back is instant; misses are retried next time.
  // A place's film stock (sepia, tint, grain) is applied to the whole frame in the post pass, so images load as they are.
  const ART = new Map(), ART_PENDING = new Map();
  function loadArt(src) {
    if (!src) return Promise.resolve(null);
    if (ART.has(src)) return Promise.resolve(ART.get(src));
    if (ART_PENDING.has(src)) return ART_PENDING.get(src);   // one download, however many ask
    const p = loadImage(src).then((im) => {
      ART_PENDING.delete(src);
      if (im) ART.set(src, im);
      return im;
    });
    ART_PENDING.set(src, p);
    return p;
  }
  // Each enterPlace takes a token; a load that finishes after a newer one started writes nothing.
  let placeTok = 0;
  function loadPlaceArt(p, tok) {
    const a = p.art || {}, d = JESUS ? (p.demon || {}) : {}, f = d.faces || {};
    // the establishing shot: the upright photo on an upright screen (the wide one if that is missing)
    const up = innerWidth / innerHeight < 0.95;
    // Upright, the wide table is only drawn if the phone turns: it loads after, unwaited (unless the upright one is missing).
    const upPlate = up && p.portrait && p.portrait.plate;
    const jobs = {
      board: loadArt(a.board),
      exterior: up && a.exteriorPort ? loadArt(a.exteriorPort).then((im) => im || loadArt(a.exterior)) : loadArt(a.exterior),
      demon: loadArt(d.portrait),
      demonUp: loadArt(f.up), demonRight: loadArt(f.right), demonDown: loadArt(f.down), demonLeft: loadArt(f.left),
    };
    // The upright table only loads (and is waited for) on an upright screen; a wide one fetches it if it ever turns.
    if (!upPlate) jobs.plate = loadArt(a.plate);
    if (up) jobs.platePort = loadArt(p.portrait && p.portrait.plate);
    else delete IMG.platePort;
    const keys = Object.keys(jobs);
    return Promise.all(keys.map((k) => jobs[k])).then(async (vals) => {
      if (tok !== placeTok) return;
      keys.forEach((k, i) => { if (vals[i]) IMG[k] = vals[i]; else delete IMG[k]; });
      if (!upPlate) return;
      if (IMG.platePort) {
        delete IMG.plate;   // never the last place's table, if the phone turns before this one lands
        loadArt(a.plate).then((im) => { if (im && tok === placeTok) IMG.plate = im; });
      } else {
        const im = await loadArt(a.plate);
        if (tok !== placeTok) return;
        if (im) IMG.plate = im; else delete IMG.plate;
      }
    });
  }
  function probeVideos() {
    Object.entries(VIDEO).forEach(([k, src]) => {
      const v = document.createElement('video');
      v.preload = 'auto'; v.playsInline = true; v.muted = false;
      v.addEventListener('loadeddata', () => { VID[k] = v; }, { once: true });
      v.addEventListener('error', () => {}, { once: true });
      v.src = src;
    });
  }

  // ---------------------------------------------------------------- places
  // Each place is data (places.js). The scene below reads the current one, PL.
  const PLACES = (window.GOODBYE_PLACES && window.GOODBYE_PLACES.length) ? window.GOODBYE_PLACES : [];
  // (Each place's words are the demon's now, live from the site: places.js holds the room, never a line to spell.)
  let PL = PLACES[0];

  // ---------------------------------------------------------------- world
  // World space is the table photo: 1600 x 900. The board lives in its own
  // 1200 x 800 space, placed on the table where each place's photo has room.
  const WORLD = { w: 1600, h: 900 };
  // how much of the wide table's photo a screen may run past (as a fraction of the screen's height): its black bottom rows 10%, its lit top edge 3.5%
  const PLATE_BOT = 0.1, PLATE_TOP = 0.035;
  const BOARD = { cx: 772, cy: 468, w: 840, h: 560 };
  BOARD.s = BOARD.w / 1200;
  // Where the candles stand in the table photo (measured from each plate).
  const PLATE = { candles: [{ x: 176, y: 108 }, { x: 1424, y: 126 }] };
  // A phone held upright gets the place's portrait scene (place.portrait): its own table photo, candles, flames
  // and board placement, in its own world. Board space (1200 x 800) is the same in both, so turning the phone
  // mid-game only moves the camera. SC says which scene is on screen; FLAMES are that scene's live flames.
  let SC = 'land', FLAMES = null;

  // ---------------------------------------------------------------- the board's printing
  const GLYPHS = {};
  function arcRow(letters, R, cy, span, size) {
    const n = letters.length;
    letters.split('').forEach((ch, i) => {
      const th = ((-span + (2 * span * i) / (n - 1)) * Math.PI) / 180;
      GLYPHS[ch] = { x: R * Math.sin(th), y: cy - R * Math.cos(th), rot: th, size, text: ch, glow: 0, scorch: 0, heat: 0 };
    });
  }
  arcRow('ABCDEFGHIJKLM', 880, 720, 36, 78);
  arcRow('NOPQRSTUVWXYZ', 760, 720, 33, 74);
  '1234567890'.split('').forEach((d, i) => { GLYPHS[d] = { x: -360 + 80 * i, y: 205, rot: 0, size: 62, text: d, glow: 0, scorch: 0, heat: 0 }; });
  // YES and NO sit in from the sun and moon: the planchette resting on either never covers a face.
  GLYPHS.YES = { x: -262, y: -298, rot: 0, size: 64, text: 'YES', glow: 0, scorch: 0, heat: 0 };
  GLYPHS.NO = { x: 262, y: -298, rot: 0, size: 64, text: 'NO', glow: 0, scorch: 0, heat: 0 };
  GLYPHS.GOODBYE = { x: 0, y: 312, rot: 0, size: 64, text: 'GOOD BYE', glow: 0, scorch: 0, heat: 0 };
  const SUN = { x: -462, y: -282, r: 78 };
  const MOON = { x: 462, y: -282, r: 78 };
  const REST = { x: 0, y: 112 };
  // A face is never under the planchette at rest (Pierce can't see it through wood). With the photographed
  // planchette the test is its real outline (PH.foot: where the wood is, around the lens) against the face's disc
  // plus a little air; without it, the placeholder's half width plus the face's radius.
  const FACE_CLEAR = 196;
  const faceUnder = (x, y, f) => {
    if (!PH.foot) return Math.hypot(x - f.x, y - f.y) < FACE_CLEAR;
    const r = f.r + 14;
    for (const [fx, fy] of PH.foot) if (Math.hypot(x + fx - f.x, y + fy - f.y) < r) return true;
    return false;
  };
  const overFace = (x, y) => faceUnder(x, y, SUN) || faceUnder(x, y, MOON);
  function offFaces(x, y) {
    for (let i = 0; i < 40 && overFace(x, y); i++) { x += (REST.x - x) * 0.08; y += (REST.y - y) * 0.08; }
    return { x, y };
  }
  let INK = 'rgba(42,24,10,0.92)';

  // ---------------------------------------------------------------- state
  let pewOpen = false;
  // Progress: which places are cleared (He blocked the demon), which nights are done (you got to GOOD BYE and out),
  // and where you are. The old single 'farmhouse' flag still counts as cleared.
  const PROG = (() => {
    const v = store.get('places', null) || {};
    const ids = (a) => new Set(Array.isArray(a) ? a.filter((x) => typeof x === 'string') : []);
    const cleared = ids(v.cleared), done = ids(v.done);
    if (store.get('farmhouse', false)) cleared.add('farmhouse');
    return { cleared, done, current: typeof v.current === 'string' ? v.current : 'farmhouse' };
  })();
  function saveProg() { store.set('places', { cleared: [...PROG.cleared], done: [...PROG.done], current: PL ? PL.id : 'farmhouse' }); }
  const placeIndex = (id) => PLACES.findIndex((p) => p.id === id);
  // Without Him the Garden is not on the list at all (its data and art wait for Him).
  const isShown = (p) => !!p && (JESUS || p.id !== 'garden');
  // A night you finished opens the next place. Without Him, a block from an old save opens nothing.
  const passed = (id) => PROG.done.has(id) || (JESUS && PROG.cleared.has(id));
  const isUnlocked = (i) => i === 0 || (i > 0 && i < PLACES.length && isShown(PLACES[i]) && passed(PLACES[i - 1].id));
  // The Sanctuary (and every mention of Him) waits for the first block in the Farmhouse.
  const firstBlock = () => PROG.cleared.has('farmhouse');
  if (PLACES_MENU) {
    const i = placeIndex(PROG.current);
    if (i > 0 && isUnlocked(i)) PL = PLACES[i];
  }
  // Which places were left haunted: { farmhouse: true }, or false when none was. The flag used to be one true for every place
  // (a night in the Farmhouse made the Penthouse say YOU CAME BACK); the old one belongs to the place the last night was in.
  function hauntedMap() {
    const v = store.get('haunted', false);
    if (v && typeof v === 'object') return v;
    if (v !== true) return {};
    const lp = store.get('lastPlace', ''), id = PLACES.some((x) => x.id === lp) ? lp : 'farmhouse', m = { [id]: true };
    store.set('haunted', m);
    return m;
  }
  const hauntedIn = (id) => !!hauntedMap()[id];
  function setHaunted(id, on) {
    const m = { ...hauntedMap() };
    if (on) m[id] = true; else delete m[id];
    store.set('haunted', Object.keys(m).length ? m : false);
  }
  // The title's "It's still here." belongs to the place on the table.
  function syncStill() { const still = $('#still'); if (still) still.hidden = !hauntedIn(PL.id); }
  // The place a finished night has just opened, said once on the title.
  let justOpened = null;
  // Without Him nothing is ever cleared: the Farmhouse is always the night before.
  const isCleared = (id) => JESUS && PROG.cleared.has(id);
  const S = {
    phase: 'intro', mood: 'calm', busy: false, asked: 0, unease: 0,
    cleared: isCleared(PL.id), intercepts: store.get('intercepts', 0),
    friendAsked: false, muted: false,
    awaitingYesNo: null, vs: false, started: false,
    // the dread engine
    live: false, dread: 0, haunted: false, possessing: false, struggling: false, calming: false,
    chosen: '', history: [], offNote: '',
    dare: false, sitAt: 0, firstAnswerAt: 0, invite: '',
  };
  // Questions sent while the board is busy, or holding still, wait here in the order they were sent, three at most (enqueue
  // below). S.queued is the next one in line, as it was when there was only one; setting it to nothing empties the line.
  S.queue = [];
  Object.defineProperty(S, 'queued', { get: () => S.queue[0] || null, set: (v) => { if (v == null) clearQueue(); } });
  // Who is at the table tonight. Nobody is asked (there is no names card). A name given in their own words is kept on this device for the
  // next night (2026-10-08); nothing else is. A name exists only if it
  // came with a Pass it on link (the first name its sender typed), or somebody gave it in their own words (volunteeredName), or it
  // answered WHO SAID THAT. It is empty at every match. It is used twice a night at most (NAMEUSE): spelled once, by itself, and
  // said once, low, in the dark at the very end. No line carries a name; the lines say YOU.
  let NAMES = [];
  function cleanNames(v) {
    // Zoë is ZOE; "Sam and Jo", "Sam & Jo" and "Sam Jo" are two people
    const list = (Array.isArray(v) ? v : [v]).flatMap((n) => String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[\s,&+\/;]+/));
    return list.map((n) => n.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10)).filter((n) => n && n !== 'AND').slice(0, 6);
  }
  const nice = (n) => n ? n[0] + n.slice(1).toLowerCase() : '';
  // A name somebody gave in their own words is kept on this device for the next night, so it is not asked twice (Pierce, 2026-10-08:
  // "forgot my name"). Nothing else about anyone is kept; the one it took is still kept as nothing.
  NAMES = cleanNames(store.get('names', [])); store.set('chosen', '');
  // The one it takes no longer has a name. (Kept as nothing, so what read it keeps working.)
  const aName = () => '';
  const keptChosen = () => '';
  function setChosen() { S.chosen = ''; }
  // A name at the table is used at most twice a night, and only on its own beats: spelled once, by itself (EVENTS.name, after
  // it has sat 90 s and nobody has typed for 20), and said once, low, in the dark after GOOD BYE is won. spell(), whisper() and
  // fetchVoice() all ask here; a line with a name in it that is not one of those two is refused, never spelled or said.
  // (Since 2026-10-05: twice a night in all, on the board or at their ear, any time it lands: the site holds it to the same.)
  const NAMEUSE = {
    spelled: 0, voiced: 0, max: 2, typedAt: {}, log: [], last: null,
    reset() { this.spelled = 0; this.voiced = 0; this.typedAt = {}; this.log = []; },
  };
  const sayHasName = (t) => { const w = ' ' + normLine(t) + ' '; return NAMES.some((n) => w.includes(' ' + n + ' ') || w.includes(' ' + n + 'S ')); };
  // a name is taken from what somebody typed (never from a line the safety checks stopped; ask() reads this after them)
  function takeName(n, how) {
    if (!n || NAMES.includes(n) || NAMES.length >= 6) return false;
    NAMES.push(n); NAMEUSE.typedAt[n] = G.t; NAMEUSE.log.push({ n, how, at: Math.round(G.t) });
    store.set('names', NAMES);   // kept for the next night on this device
    return true;
  }
  // The table jolts only when something knocks from under it (the `under` event, and the three the fake calm ends on), and never by more
  // than 3: a small jolt, not a shake. Nothing else on screen moves the camera.
  const jolt = (n) => { G.shake = Math.max(G.shake, Math.min(3, n)); };
  const G = {
    t: 0, hitstop: 0, slow: 1, shake: 0,
    flame: 'warm', flameLevel: 1, gutter: 0, flutter: 0,
    goldRim: 0, intro: 1,
    ghost: null, shadow: null, hands: [], faceShow: 1,
    candleOut: [1, 1], candleOutT: [1, 1],
    black: 0, blackT: 0, pglow: 0, pglowT: 0, leanTo: false, steady: false, hauntLean: false,
  };
  // Each candle's flame, drawn live so it can lean, shrink and die. h: height, gust: lean from a breath.
  const FL = [{ h: 1, hT: 1, gust: 0, lean: 0, seed: 1.3 }, { h: 1, hT: 1, gust: 0, lean: 0, seed: 4.1 }];
  // One look, all night. The room is as dark as it is (a little darker than the photograph, so it never feels safe), and the light
  // changes only when a candle does: no mood tint, no colour in the flames, no darkness that rises with the dread.
  const MOOD = { dark: 0.38, tint: [4, 6, 12] };
  const M = { dark: 0.38, tint: [4, 6, 12] };
  function moodTarget() {
    const film = (PL && PL.film) || {};
    let t = film.tint || [4, 6, 12];
    const top = Math.max(t[0], t[1], t[2]);
    if (top > 40) t = t.map((v) => (v * 16) / top);   // a colour, not a tint: bring it into range
    return { dark: MOOD.dark * (film.dark || 1), tint: MOOD.tint.map((v, i) => v + (t[i] - [4, 6, 12][i])) };
  }
  // (S.mood stays 'calm': nothing in the night changes it)
  function setMood() { S.mood = 'calm'; document.body.dataset.mood = 'calm'; A.mood(); }

  // ---------------------------------------------------------------- base board render
  const BQ = 1.6;
  const baseCv = document.createElement('canvas');
  baseCv.width = 1200 * BQ; baseCv.height = 800 * BQ;
  let baseDirty = true, baseAt = 0;

  function proceduralBoardTexture() {
    const c = document.createElement('canvas'); c.width = 1200; c.height = 800;
    const g = c.getContext('2d');
    const lg = g.createLinearGradient(0, 0, 1200, 800);
    lg.addColorStop(0, '#b38755'); lg.addColorStop(0.5, '#a57a49'); lg.addColorStop(1, '#8a6236');
    g.fillStyle = lg; g.fillRect(0, 0, 1200, 800);
    for (let i = 0; i < 260; i++) {
      g.strokeStyle = `rgba(60,34,14,${rnd(0.03, 0.09)})`; g.lineWidth = rnd(0.6, 2.2);
      const y = rnd(-40, 840); g.beginPath(); g.moveTo(-20, y);
      for (let x = 0; x <= 1220; x += 60) g.lineTo(x, y + Math.sin(x / rnd(90, 160) + i) * rnd(2, 9));
      g.stroke();
    }
    for (let i = 0; i < 14; i++) {
      const x = rnd(0, 1200), y = rnd(0, 800), r = rnd(30, 140);
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, `rgba(50,28,10,${rnd(0.08, 0.2)})`); rg.addColorStop(1, 'rgba(50,28,10,0)');
      g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.strokeStyle = 'rgba(40,20,8,.35)'; g.lineWidth = 9; g.beginPath(); g.arc(860, 560, 70, 0, Math.PI * 2); g.stroke();
    const edge = g.createRadialGradient(600, 400, 300, 600, 400, 760);
    edge.addColorStop(0, 'rgba(30,14,4,0)'); edge.addColorStop(1, 'rgba(30,14,4,.55)');
    g.fillStyle = edge; g.fillRect(0, 0, 1200, 800);
    return c;
  }
  let boardTex = null;
  let SCORCH_HALO = null;
  function scorchHalo() {
    if (SCORCH_HALO) return SCORCH_HALO;
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const g = c.getContext('2d'), rg = g.createRadialGradient(48, 48, 6, 48, 48, 48);
    rg.addColorStop(0, 'rgba(18,6,0,.85)'); rg.addColorStop(0.45, 'rgba(18,6,0,.42)'); rg.addColorStop(1, 'rgba(18,6,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 96, 96);
    return (SCORCH_HALO = c);
  }

  function renderBase() {
    const b = baseCv.getContext('2d');
    b.setTransform(BQ, 0, 0, BQ, 0, 0);
    b.globalCompositeOperation = 'source-over';
    b.clearRect(0, 0, 1200, 800);
    const tex = IMG.board || (boardTex = boardTex || proceduralBoardTexture());
    // cover-fit the texture into the board
    const tw = tex.naturalWidth || tex.width, th = tex.naturalHeight || tex.height;
    const sc = Math.max(1200 / tw, 800 / th) * (PL.board.texZoom || 1);
    b.save();
    roundRectPath(b, 0, 0, 1200, 800, 34); b.clip();
    b.drawImage(tex, (1200 - tw * sc) / 2, (800 - th * sc) / 2, tw * sc, th * sc);
    b.restore();

    // How the ink sits on this board: soaked into wood or paper (multiply), or lying on top of
    // something dark: brass on marble, chalk on slate. Stone is cut, read by the shadow in each cut.
    const BD = PL.board, style = BD.style || 'ink', light = style === 'brass' || style === 'chalk';
    const stack = BD.stack || `"${BD.font}", Georgia, serif`, wt = BD.weight && BD.weight !== '400' ? BD.weight + ' ' : '';
    const fsc = BD.scale || 1;
    b.save();
    b.translate(600, 400);
    b.globalCompositeOperation = light ? 'source-over' : 'multiply';
    // double rule border, hand-ruled (a slate in its own wooden frame has none)
    b.strokeStyle = INK;
    if (BD.rules !== false) {
      b.lineWidth = style === 'brass' ? 1.4 : 3.2;
      roundRectPath(b, -560, -370, 1120, 740, 26); b.stroke();
      b.lineWidth = style === 'brass' ? 0.8 : 1.3; roundRectPath(b, -546, -356, 1092, 712, 20); b.stroke();
    }
    // corner stars
    if (BD.stars) [[-526, -336], [526, -336], [-526, 336], [526, 336]].forEach(([x, y]) => star(b, x, y, 9, INK));

    b.textAlign = 'center'; b.textBaseline = 'middle';
    for (const k in GLYPHS) {
      const g = GLYPHS[k];
      b.save(); b.translate(g.x, g.y); b.rotate(g.rot);
      const sc2 = g.scorch, size = Math.round(g.size * fsc);
      b.font = `${wt}${size}px ${stack}`;
      if (k === 'GOODBYE') b.letterSpacing = BD.spacing || '6px';
      if (sc2 > 0.02) {
        b.globalCompositeOperation = 'multiply';
        if (RI.char) { const cs = size * 1.5; b.globalAlpha = Math.min(1, sc2 * 1.1); b.drawImage(RI.char, -cs / 2, -cs / 2, cs, cs); b.globalAlpha = 1; }
        // the soft dark round the burn: a halo drawn once and laid under it (a shadow blur on every scorched letter of a 1920 px board was
        // the possession's longest frames: half a second on a phone each time the board changed)
        { const hs = size * 1.9; b.globalAlpha = Math.min(1, 0.85 * sc2); b.drawImage(scorchHalo(), -hs / 2, -hs / 2, hs, hs); b.globalAlpha = 1; }
        b.fillStyle = `rgba(14,6,2,${0.9 + 0.1 * sc2})`;
        b.fillText(g.text, 0, 0);
      } else if (style === 'engrave') {
        // light catches the far lip of each cut, the near lip is in shadow
        b.globalCompositeOperation = 'source-over'; b.fillStyle = 'rgba(255,246,226,.38)'; b.fillText(g.text, 2.2, 2.2);
        b.globalCompositeOperation = 'multiply'; b.fillStyle = INK; b.fillText(g.text, 0, 0);
        b.fillStyle = 'rgba(40,30,20,.35)'; b.fillText(g.text, -1.2, -1.2);
      } else if (style === 'chalk') {
        // chalk: a dusty double pass, never quite on the same line twice
        b.fillStyle = INK; b.globalAlpha = 0.55; b.fillText(g.text, 0.8, 0.6);
        b.globalAlpha = 0.8; b.fillText(g.text, -0.6, -0.3); b.globalAlpha = 1;
      } else if (style === 'brass') {
        // brass inlay: a hairline of shadow under each letter
        b.fillStyle = 'rgba(0,0,0,.7)'; b.fillText(g.text, 0.8, 1.2);
        b.fillStyle = INK; b.fillText(g.text, 0, 0);
      } else { b.fillStyle = INK; b.fillText(g.text, 0, 0); }
      b.restore();
    }
    b.globalCompositeOperation = light ? 'source-over' : 'multiply';
    // YES / NO underscores, GOOD BYE flourish
    b.lineWidth = style === 'brass' ? 1 : 1.6; b.strokeStyle = INK;
    [GLYPHS.YES, GLYPHS.NO].forEach((g) => { b.beginPath(); b.moveTo(g.x - 50, g.y + 34); b.quadraticCurveTo(g.x, g.y + 44, g.x + 50, g.y + 34); b.stroke(); });
    b.beginPath(); b.moveTo(-210, 352); b.bezierCurveTo(-90, 370, 90, 334, 210, 352); b.stroke();

    // a line along the margin: pencil in Elsie's hand at the Farmhouse
    const mg = BD.margin;
    if (mg) {
      b.globalCompositeOperation = 'source-over';
      b.save(); b.translate(NOTE.x ?? mg.x, mg.y); b.rotate(mg.rot || 0);
      b.font = noteFont(mg); if (mg.spacing) b.letterSpacing = mg.spacing;
      b.fillStyle = mg.color; b.textAlign = mg.align || 'left';
      b.fillText(mg.text, 0, 0);
      b.restore();
    }
    b.restore();
    baseDirty = false;
  }
  // The two pencil notes in the margin, "always say goodbye" and the dare, are one hand at one size: the board's own,
  // or larger on a small screen so both can be read (11.5 px at least), never so large they stop fitting side by side.
  const NOTE = { k: 1, u: 0, x: null }, noteCx = document.createElement('canvas').getContext('2d');
  const notePx = (mg) => parseFloat((String(mg.font).match(/(\d+(?:\.\d+)?)px/) || [0, 30])[1]);
  const noteFont = (mg) => String(mg.font).replace(/(\d+(?:\.\d+)?)px/, (m, n) => (n * NOTE.k).toFixed(1) + 'px');
  const DARE_RIGHT = 560;
  function noteFit() {
    const mg = PL && PL.board && PL.board.margin, u = CAM.s * BOARD.s;
    if (!mg || !(u > 0) || (Math.abs(u - NOTE.u) < 1e-4 && NOTE.pl === PL)) return;
    NOTE.u = u; NOTE.pl = PL;
    noteCx.font = mg.font; try { noteCx.letterSpacing = mg.spacing || '0px'; } catch (e) { /* fine */ }
    const wm = noteCx.measureText(mg.text).width, wd = PL.dare ? noteCx.measureText(PL.dare).width : 0, gap = 40;
    // a left-aligned first note may slide left along the margin (as far as the board's edge) to make room
    const from = mg.align === 'center' ? mg.x : -DARE_RIGHT;
    const room = mg.align === 'center' ? (DARE_RIGHT - mg.x - gap) / (wm / 2 + wd) : (DARE_RIGHT - from - gap) / (wm + wd);
    const k = clamp(11.5 / (notePx(mg) * u), 1, Math.max(1, room));
    const x = mg.align === 'center' ? mg.x : Math.max(-DARE_RIGHT, Math.min(mg.x, DARE_RIGHT - gap - (wm + wd) * k));
    if (Math.abs(k - NOTE.k) > 0.01 || x !== NOTE.x) { NOTE.k = k; NOTE.x = x; baseDirty = true; }
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { NOTE.u = 0; baseDirty = true; });
  // The dare is written into the margin in the same pencil, right of the first note, left to right over 2.4 seconds.
  // It is part of the board: it takes the candlelight and the dark like the printing. DARE_BOX is where it is (board units).
  let DARE_BOX = null;
  function drawDare(c) {
    const mg = PL.board && PL.board.margin;
    if (!mg || !PL.dare || !S.dare || S.haunted || S.possessing || !S.started) { DARE_BOX = null; return; }
    const fs = notePx(mg) * NOTE.k, k = clamp((G.t - (S.dareAt || 0)) / 2400, 0, 1);
    c.save(); c.translate(DARE_RIGHT, mg.y); c.rotate(mg.rot || 0);
    c.font = noteFont(mg); if (mg.spacing) c.letterSpacing = mg.spacing;
    c.fillStyle = mg.color; c.textAlign = 'right';
    const w = c.measureText(PL.dare).width;
    if (k < 1) { c.beginPath(); c.rect(-w - 6, -fs * 2, (w + 12) * easeOut(k), fs * 3); c.clip(); }
    c.fillText(PL.dare, 0, 0);
    c.restore();
    DARE_BOX = { x0: DARE_RIGHT - w - 8, x1: DARE_RIGHT + 8, y0: mg.y - fs * 0.95, y1: mg.y + fs * 0.4 };
  }
  function roundRectPath(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function star(c, x, y, r, col) {
    c.save(); c.translate(x, y); c.fillStyle = col; c.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; const rr = i % 2 ? r * 0.35 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); c.fill(); c.restore();
  }

  // ---------------------------------------------------------------- plate (the table)
  let plateTex = null;
  function proceduralPlate() {
    const c = document.createElement('canvas'); c.width = 1600; c.height = 900;
    const g = c.getContext('2d');
    g.fillStyle = '#140d08'; g.fillRect(0, 0, 1600, 900);
    for (let p = 0; p < 7; p++) {
      const x0 = p * 230 - 20; const shade = rnd(0.85, 1.15);
      g.fillStyle = `rgb(${32 * shade | 0},${21 * shade | 0},${13 * shade | 0})`; g.fillRect(x0, 0, 226, 900);
      for (let i = 0; i < 40; i++) {
        g.strokeStyle = `rgba(0,0,0,${rnd(0.1, 0.3)})`; g.lineWidth = rnd(0.5, 2);
        const x = x0 + rnd(0, 226); g.beginPath(); g.moveTo(x, 0);
        for (let y = 0; y <= 900; y += 50) g.lineTo(x + Math.sin(y / 120 + i) * 4, y);
        g.stroke();
      }
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x0 + 224, 0, 4, 900);
    }
    PLATE.candles.forEach((k) => {
      g.fillStyle = '#5b4524'; g.beginPath(); g.arc(k.x, k.y + 18, 54, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#d9cbb0'; g.beginPath(); g.arc(k.x, k.y + 12, 22, 0, Math.PI * 2); g.fill();
    });
    return c;
  }

  // ---------------------------------------------------------------- faces (Game Face)
  // The sun over YES and the moon over NO are printed ink on an old board, and they are witnesses (Pierce, 2026-10-04: "make the yes
  // no faces do way more... looking at the user directly, having changing expressions to pull from, one scared, the other happy or
  // mean"). The sun is on the side of the living and never lies: when the demon's reply is a lie the sun is warn, looking straight
  // out at the person with its brows knit, and at no other time. The moon belongs to the house. The demon picks both with each move
  // (reply.sun, reply.moon); the possession is the sun's eyes shut and the moon's grin. An expression is the same parametric face
  // (lids, brows, mouth curve and tilt), eased in quickly and held: nothing twitches. Never an open O mouth (it read as a cartoon).
  //   oL, oR: how open each eye is (under 0.14 it is a closed lid); brow: + worried (inner ends up), - knit (inner ends down);
  //   raise: both brows up; curve: + smile, - frown; open: the mouth parted; width; teeth; tongue; tilt: one corner of the mouth up
  //   (+ their left of it, - the other); look: where the eyes go for that face ('you' straight out, 'p' the planchette, 'away').
  const SUN_FACES = {
    // open enough that its pupils show where it looks (half-lidded, 0.5, hid them in the slit on a phone)
    neutral: { oL: 0.72, oR: 0.72, brow: 0, raise: 0, curve: 0.6, open: 0, width: 1, teeth: 0, tongue: 0, tilt: 0 },
    // afraid in the eyes and the brows only, the mouth pulled thin
    afraid: { oL: 1.32, oR: 1.32, brow: 1.1, raise: 0.9, curve: -0.55, open: 0, width: 0.75, teeth: 0, tongue: 0, tilt: 0, look: 'p' },
    // the tell: straight out at them, brows knit hard, mouth a flat line
    warn: { oL: 1.02, oR: 1.02, brow: -1.05, raise: 0.05, curve: -0.2, open: 0, width: 0.62, teeth: 0, tongue: 0, tilt: 0, look: 'you' },
    plead: { oL: 0.92, oR: 0.92, brow: 1.35, raise: 0.35, curve: -0.85, open: 0, width: 0.7, teeth: 0, tongue: 0, tilt: 0, look: 'you' },
    // it cannot look
    shut: { oL: 0.02, oR: 0.02, brow: 0.75, raise: 0, curve: -0.45, open: 0, width: 0.6, teeth: 0, tongue: 0, tilt: 0 },
    relief: { oL: 0.42, oR: 0.42, brow: 0.35, raise: 0.25, curve: 0.95, open: 0, width: 1.05, teeth: 0, tongue: 0, tilt: 0, look: 'you' },
    // (2026-10-05, Pierce: "having reactions is insanely eerie and we can turn this up even more") it squeezes its eyes and turns away
    flinch: { oL: 0.1, oR: 0.16, brow: 1.2, raise: 0.1, curve: -0.7, open: 0, width: 0.55, teeth: 0, tongue: 0, tilt: -0.2, look: 'away' },
    // it grieves for them already: eyes down, the mouth fallen
    mourn: { oL: 0.46, oR: 0.46, brow: 1.45, raise: 0.4, curve: -1.05, open: 0, width: 0.7, teeth: 0, tongue: 0, tilt: 0, look: 'down' },
  };
  SUN_FACES.watch = SUN_FACES.neutral;
  const MOON_FACES = {
    neutral: { oL: 0.8, oR: 0.8, brow: 0.5, raise: 0.1, curve: -0.25, open: 0, width: 0.8, teeth: 0, tongue: 0, tilt: 0 },
    // one eye narrowed, one corner up
    smirk: { oL: 0.78, oR: 0.4, brow: -0.35, raise: 0.1, curve: 0.3, open: 0, width: 0.85, teeth: 0, tongue: 0, tilt: 0.75, look: 'you' },
    // straight out, wide and unblinking, nothing in the mouth
    stare: { oL: 1.28, oR: 1.28, brow: 0, raise: 0.25, curve: 0, open: 0, width: 0.5, teeth: 0, tongue: 0, tilt: 0, look: 'you', still: true },
    // a long thin crescent, the eyes narrowed over it, a line of teeth
    grin: { oL: 0.36, oR: 0.36, brow: -0.6, raise: 0.1, curve: 1.25, open: 0.14, width: 1.45, teeth: 1, tongue: 0, tilt: 0, look: 'you' },
    sneer: { oL: 0.5, oR: 0.62, brow: -1, raise: 0, curve: -0.45, open: 0, width: 0.8, teeth: 0, tongue: 0, tilt: -0.7, look: 'you' },
    bored: { oL: 0.3, oR: 0.3, brow: 0.15, raise: 0, curve: -0.08, open: 0, width: 0.62, teeth: 0, tongue: 0, tilt: 0, look: 'away' },
    // lips parted over a line of teeth, the eyes wide on them
    hungry: { oL: 1.18, oR: 1.18, brow: -0.5, raise: 0.15, curve: 0.35, open: 0.42, width: 1.15, teeth: 1, tongue: 0, tilt: 0, look: 'you', still: true },
    // one slow wink, straight at them, a corner of the mouth up
    wink: { oL: 0.86, oR: 0.04, brow: -0.25, raise: 0.1, curve: 0.55, open: 0, width: 0.9, teeth: 0, tongue: 0, tilt: 0.6, look: 'you' },
  };
  MOON_FACES.watch = MOON_FACES.neutral;
  const SUN_SET = ['watch', 'afraid', 'warn', 'plead', 'shut', 'relief', 'flinch', 'mourn'], MOON_SET = ['watch', 'smirk', 'stare', 'grin', 'sneer', 'bored', 'hungry', 'wink'];
  const KEYS = ['oL', 'oR', 'brow', 'raise', 'curve', 'open', 'width', 'teeth', 'tongue', 'tilt'];
  const FACE = {
    sun: { cur: { ...SUN_FACES.neutral }, expr: 'watch', exprUntil: 0, lx: 0, ly: 0, set: SUN_FACES, at: SUN, gaze: 'p', gazeUntil: 0, blink: 1, blinkAt: 2500 },
    moon: { cur: { ...MOON_FACES.neutral }, expr: 'watch', exprUntil: 0, lx: 0, ly: 0, set: MOON_FACES, at: MOON, gaze: 'you', gazeUntil: 0, blink: 1, blinkAt: 4100 },
  };
  // The demon's faces for a move, held for ms (then they go back to watching). Anything not in the set is watch.
  function setFaces(sun, moon, ms) {
    const until = G.t + (ms == null ? 9000 : ms);
    [['sun', sun, SUN_SET], ['moon', moon, MOON_SET]].forEach(([w, e, set]) => {
      const f = FACE[w], x = set.includes(e) ? e : 'watch';
      // a new face on the board turns the room a little (the night's heat, the other half of this build: G.heatBump, when it is there)
      if (x !== 'watch' && x !== f.expr && typeof G.heatBump === 'function') { try { G.heatBump(0.02); } catch (err) { /* the heat is the other build's */ } }
      f.expr = x; f.exprUntil = x === 'watch' ? 0 : until;
      const look = FACE[w].set[x].look;
      if (look) { f.gaze = look; f.gazeUntil = f.gazeLock = until; f.mx = f.my = 0; f.reactAt = 0; if (look === 'away') { const a = rnd(0, Math.PI * 2); f.away = [Math.cos(a), Math.sin(a)]; } }
    });
    nlog('faces', { sun: FACE.sun.expr, moon: FACE.moon.expr });
  }
  // The faces keep what they show for ms more from now, and then let it go (a move holds its faces while it runs, however long).
  function holdFaces(ms) {
    for (const w of ['sun', 'moon']) {
      const f = FACE[w];
      if (f.expr === 'watch' || G.t >= f.exprUntil) continue;
      const until = G.t + ms;
      if (f.gazeLock === f.exprUntil) f.gazeLock = f.gazeUntil = until;
      f.exprUntil = until;
    }
  }
  // The expression a face wears now: the possession's, else the demon's own (until it lets it go), else watch.
  function faceNow(w) {
    const f = FACE[w];
    if (S.possessing) return w === 'sun' ? 'shut' : 'grin';
    // a move that was stopped part way (the soft exit, the gentle end, a night ended) lets its faces go
    if (f.expr !== 'watch' && (G.t >= f.exprUntil || S.soft || S.stopping || !S.started)) { if (f.gazeLock === f.exprUntil) f.gazeLock = 0; f.expr = 'watch'; }
    return f.expr;
  }
  // While they type their eyes are on the keyboard, and both faces turn and look straight out at them. When the typing stops the eyes
  // are back on the board within about 150 ms: they only ever catch the tail of it.
  // (2026-10-05, Pierce: the faces turned up: both look straight at the player for as long as they are typing, not only its tail)
  const TYPE_LOOK_MS = 1700;
  let lastKey = -Infinity;
  const typingLook = () => G.t - lastKey < TYPE_LOOK_MS && !S.possessing;
  // Their eyes go where a sound came from (2026-10-05): the sun a beat after it, the moon a beat after that, held a moment, then back.
  // where: left, right, under (the cellar), above (the attic), behind (past them, over their shoulder), ear-left / ear-right (a voice at an
  // ear: both faces look at that side of the one holding the phone).
  const LOOK_AT = { left: [-1, 0.08], right: [1, 0.08], under: [0.1, 1], above: [-0.05, -1], behind: [0.35, -0.55], 'ear-left': [-0.8, -0.1], 'ear-right': [0.8, -0.1] };
  function lookToward(where, ms) {
    const v = LOOK_AT[where]; if (!v || S.possessing) return;
    const hold = ms || rnd(1300, 2300);
    ['sun', 'moon'].forEach((w, k) => {
      const f = FACE[w];
      if (f.expr === 'warn') return;   // the sun's tell is never looked away from
      const at = G.t + (k ? rnd(160, 420) : rnd(50, 180));
      f.pendingLook = { at, until: at + hold, vec: [v[0] + rnd(-0.12, 0.12), v[1] + rnd(-0.1, 0.1)] };
    });
  }
  // Slow blinks (2026-10-05): printed ink that blinks, slowly, now and then; one face, or both at once, which is worse. Never while it
  // shows a face with its eyes shut, and never in the taking.
  const BLINK = { next: 6000 };
  function blinkTick() {
    if (G.t < BLINK.next || S.possessing || G.faceShow < 0.5) return;
    BLINK.next = G.t + rnd(4500, 10000) * (S.haunted ? 0.65 : 1);
    const both = Math.random() < 0.38, who = both ? ['sun', 'moon'] : [pick(['sun', 'moon'])], dur = rnd(900, 1500);
    who.forEach((w, k) => { const f = FACE[w]; f.blinkAt = G.t + (both && k ? rnd(0, 40) : 0); f.blinkDur = dur; });
    nlog('blink', { who: who.join('+') });
  }
  // how open a face's eyes are in its slow blink: down over a third, held shut a beat, back up slower
  function blinkOpen(f) {
    if (!f.blinkDur || G.t < f.blinkAt || G.t > f.blinkAt + f.blinkDur) return 1;
    const u = (G.t - f.blinkAt) / f.blinkDur;
    if (u < 0.32) return 1 - easeIO(u / 0.32);
    if (u < 0.5) return 0;
    return easeIO((u - 0.5) / 0.5);
  }
  function updateFaces(dt) {
    const show = PL.faces && PL.faces.show;
    const want = show === 'never' ? 0 : show === 'afterFirst' ? (S.asked > 0 || S.cleared ? 1 : 0) : 1;
    G.faceShow = want >= 1 && G.faceShow >= 0.999 ? 1 : lerp(G.faceShow, want, 1 - Math.exp(-dt * 1.2));
    const typingNowLook = typingLook();
    blinkTick();
    for (const w of ['sun', 'moon']) {
      const f = FACE[w];
      const expr = faceNow(w), tgt = f.set[expr] || f.set.neutral;
      // a sound: the eyes go to it (lookToward), over anything but the typing stare
      if (f.pendingLook && G.t >= f.pendingLook.at && !typingNowLook) {
        const pl = f.pendingLook; f.pendingLook = null;
        if (G.t < pl.until) { f.gaze = 'away'; f.away = pl.vec; f.gazeUntil = f.gazeLock = pl.until; f.snapUntil = G.t + 140; f.mx = f.my = 0; f.reactAt = 0; }
      }
      // quick and smooth into an expression (about 200 ms), then held
      const k = 1 - Math.exp(-dt * 12);
      KEYS.forEach((key) => { f.cur[key] = lerp(f.cur[key] || 0, tgt[key] || 0, k); });
      // typing: straight out at them; the moment it stops, back to the board (snapped, below)
      if (typingNowLook) { f.wasTyping = true; f.gaze = 'you'; f.gazeUntil = G.t + 200; f.mx = f.my = 0; }
      else if (f.wasTyping) { f.wasTyping = false; if (!(f.youUntil > G.t)) { f.gaze = 'p'; f.gazeUntil = G.t + rnd(1200, 2400); f.snapUntil = G.t + 160; } }   // (on them meanwhile for YOU spelled: that stands)
      // while it ponders: the sun's eyes dart from letter to letter, the moon watches the player
      else if (P.mode === 'ponder' && !(f.gazeLock > G.t)) {
        if (w === 'moon') { if (f.gaze !== 'you') { f.gaze = 'you'; f.mx = f.my = 0; } f.gazeUntil = G.t + 400; }
        else if (G.t > f.gazeUntil || f.gaze !== 'letter') { f.gaze = 'letter'; f.gazeAt = GLYPHS[pick(PON_LETTERS)]; f.gazeUntil = G.t + rnd(220, 560); f.snapUntil = G.t + 90; }
      }
      // Eyes: both faces are equally alive. Each one looks at something for a second or three and then at
      // something else: the planchette, your finger or the mouse, straight up at you, the other face. The sun
      // mostly watches the planchette, the moon mostly watches you. Quick moves between.
      const live = PG.x >= 0 && G.t - PG.t < 6000;
      // the planchette moving: both faces go to it within a beat of each other (never in step) and ride it while it moves
      const moving = !!P.path || P.dragging || (P.mode !== 'seek' && P.mode !== 'ponder' && P.speed > 80);   // (not the slow circles or the pondering while it thinks)
      const locked = f.gazeLock > G.t || typingNowLook;
      if (moving && f.gaze !== 'p' && !locked) {
        if (!f.reactAt) f.reactAt = G.t + rnd(70, 320);
        else if (G.t >= f.reactAt && Math.random() < 0.85) { f.gaze = 'p'; f.gazeUntil = G.t + rnd(900, 1800); f.reactAt = 0; }
        else if (G.t >= f.reactAt) { f.reactAt = 0; f.gazeUntil = Math.max(f.gazeUntil, G.t + 600); }   // now and then one doesn't
      } else if (!moving) f.reactAt = 0;
      if (moving && f.gaze === 'p') f.gazeUntil = Math.max(f.gazeUntil, G.t + 500);
      if (G.t > f.gazeUntil && !locked) {
        // the same range of looks for both, weighted to taste: the sun reads the board, the moon watches you
        const opts = w === 'sun'
          ? [['p', 5], ['letter', 3], ['other', 2], ['you', 2], ['ptr', live ? 2 : 0], ['away', 2]]
          : [['you', 2], ['ptr', live ? 3 : 0], ['p', 5], ['letter', 3], ['other', 2], ['away', 3]];   // as restless as the sun (Pierce)
        let r = Math.random() * opts.reduce((a, o) => a + o[1], 0), next = 'p';
        for (const [kk, wt] of opts) { if (wt && (r -= wt) <= 0) { next = kk; break; } }
        if (next === f.gaze && next !== 'p') next = 'p';
        // a look is held, then the eyes jump: a saccade, never a drift. Held for a while: eyes that never stop moving become wallpaper.
        f.gaze = next; f.gazeUntil = G.t + rnd(2400, 6500);
        if (next === 'letter') { const ks = Object.keys(GLYPHS); f.gazeAt = GLYPHS[pick(ks)]; }
        // away: off the board, at something in the room nobody else can see
        if (next === 'away') { const a = rnd(0, Math.PI * 2); f.away = [Math.cos(a), Math.sin(a)]; }
      }
      // tiny jumps while it holds a look, as a living eye makes (small: the look itself is what reads); a stare has none
      if (!(f.microAt > G.t)) { f.microAt = G.t + rnd(1400, 3600); f.mx = rnd(-0.05, 0.05); f.my = rnd(-0.05, 0.05); }
      if (tgt.still || f.gaze === 'you') { f.mx = 0; f.my = 0; }
      let lx = 0, ly = 0;
      let tx2 = P.x, ty2 = P.y;
      if (f.gaze === 'ptr' && live) { const b = screenToBoard(PG.x, PG.y); tx2 = b.x; ty2 = b.y; }
      else if (f.gaze === 'other') { const o = w === 'sun' ? MOON : SUN; tx2 = o.x; ty2 = o.y; }
      else if (f.gaze === 'letter' && f.gazeAt) { tx2 = f.gazeAt.x; ty2 = f.gazeAt.y; }
      if (f.gaze === 'you') { lx = 0; ly = 0.05; }
      else if (f.gaze === 'down') { lx = 0; ly = 0.95; }
      else if (f.gaze === 'away' && f.away) { [lx, ly] = f.away; }
      else { const dx = tx2 - f.at.x, dy = ty2 - f.at.y, d = Math.hypot(dx, dy) || 1; lx = dx / d; ly = dy / d; }
      lx += f.mx || 0; ly += f.my || 0;
      // fast to the new look (about 70 ms; back from looking at them in under 150), then still
      const rate = f.snapUntil > G.t ? 60 : 40;
      f.lx = lerp(f.lx, lx, 1 - Math.exp(-dt * rate)); f.ly = lerp(f.ly, ly, 1 - Math.exp(-dt * rate));
      // the slow blink (blinkTick): printed ink that should not blink, and does
      f.blink = blinkOpen(f);
    }
  }

  // Crowding (Pierce, 2026-10-04): when the one behind them is at their ear (NIGHT.behind 3) and it is heard there, the candlelight is
  // crowded: the room's light drops by about a sixth and the flames gutter, for as long as it stays close, then it comes back. G.crowd
  // (0 to 1) is the one number: the light reads it (drawLight), and it gutters the flames through G.gutter, which they already read.
  G.crowd = 0;
  function updateCrowd(dt) {
    const want = G.t < (NIGHT.crowdUntil || 0) && NIGHT.behind >= 3 && !S.possessing ? 1 : 0;
    const was = G.crowd;
    G.crowd = want > G.crowd ? Math.min(1, G.crowd + dt / 0.6) : Math.max(0, G.crowd - dt / 2.5);
    if (was < 0.05 && G.crowd >= 0.05) { G.gutter = Math.max(G.gutter, 0.7); G.gutterWho = -1; }
  }
  // Both faces look at you, straight out, and hold it (ARE YOU ALONE, a question about whether it can see you, the dead stretch).
  function eyesOnYou(ms) {
    for (const w of ['sun', 'moon']) { const f = FACE[w]; f.gaze = 'you'; f.gazeUntil = f.gazeLock = f.microAt = f.youUntil = G.t + ms; f.mx = f.my = 0; f.reactAt = 0; }
  }

  function drawFace(c, w) {
    const f = FACE[w], at = f.at, r = at.r, F = f.cur;
    const holy = S.mood === 'holy';
    const FP = PL.faces || {}, LW = FP.line || 1, hair = FP.style === 'hairline';
    // The 1890 patent board has two moons over YES and NO, a full one and a crescent.
    const fullMoon = FP.kind === 'moons' && w === 'sun';
    c.save(); c.translate(at.x, at.y);
    const ink = FP.ink || 'rgba(38,20,8,0.9)';
    if (w === 'sun' && !fullMoon) {
      if (holy) { // gold is His. The sun only turns gold when He's here.
        const gg = c.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 2.6);
        gg.addColorStop(0, 'rgba(255,214,120,.55)'); gg.addColorStop(1, 'rgba(255,200,90,0)');
        c.globalCompositeOperation = 'lighter'; c.fillStyle = gg; c.beginPath(); c.arc(0, 0, r * 2.6, 0, Math.PI * 2); c.fill();
        c.globalCompositeOperation = 'source-over';
      }
      c.fillStyle = holy ? 'rgba(170,110,30,.85)' : ink;
      c.strokeStyle = holy ? 'rgba(170,110,30,.85)' : ink; c.lineWidth = 1.4;
      const n = 16, spin = G.t / 9000;
      for (let i = 0; i < n; i++) {
        const a = spin + (i / n) * Math.PI * 2, long = i % 2 === 0;
        const r1 = r * 1.04, r2 = r * (long ? 1.55 : 1.3), wdt = long ? 0.11 : 0.08;
        c.beginPath();
        if (hair) { c.moveTo(Math.cos(a) * r1 * 1.06, Math.sin(a) * r1 * 1.06); c.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); c.stroke(); continue; }
        c.moveTo(Math.cos(a - wdt) * r1, Math.sin(a - wdt) * r1);
        c.quadraticCurveTo(Math.cos(a + 0.06) * (r1 + r2) / 2, Math.sin(a + 0.06) * (r1 + r2) / 2, Math.cos(a) * r2, Math.sin(a) * r2);
        c.lineTo(Math.cos(a + wdt) * r1, Math.sin(a + wdt) * r1); c.closePath(); c.fill();
      }
      c.fillStyle = holy ? (hair ? 'rgba(255,210,120,.14)' : 'rgba(255,210,120,.35)') : (FP.sun || 'rgba(205,160,95,.22)');
      c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
    } else {
      if (fullMoon && holy) {
        const gg = c.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 2.4);
        gg.addColorStop(0, 'rgba(255,214,120,.5)'); gg.addColorStop(1, 'rgba(255,200,90,0)');
        c.globalCompositeOperation = 'lighter'; c.fillStyle = gg; c.beginPath(); c.arc(0, 0, r * 2.4, 0, Math.PI * 2); c.fill();
        c.globalCompositeOperation = 'source-over';
      }
      c.fillStyle = FP.moon || 'rgba(225,215,190,.2)'; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
      c.save(); c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.clip();
      if (!fullMoon) {
        c.fillStyle = FP.shade || 'rgba(30,18,8,.28)'; c.beginPath(); c.arc(r * 0.55, -r * 0.1, r * 1.02, 0, Math.PI * 2); c.fill();
        if (hair) { c.strokeStyle = ink; c.lineWidth = 1.2; c.stroke(); }
      }
      c.fillStyle = FP.crater || 'rgba(30,18,8,.16)';
      [[-0.5, -0.45, 0.12], [0.2, 0.55, 0.09], [-0.62, 0.3, 0.07]].forEach(([x, y, s]) => { c.beginPath(); c.arc(x * r, y * r, s * r, 0, Math.PI * 2); c.fill(); });
      c.restore();
    }
    c.strokeStyle = ink; c.lineWidth = 3 * LW; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();

    // The Parlor's moons have no faces until the spirit first answers. The Garden's never do.
    if (G.faceShow < 0.01) { c.restore(); return; }
    c.globalAlpha = G.faceShow;
    // eyes
    c.lineWidth = 2.6 * LW; c.strokeStyle = ink; c.fillStyle = ink;
    // The eyes have to read on a phone, where a face is about 50 px across: a wider almond, a firm white behind the
    // pupil, and a bigger pupil that travels most of the white (never so far into a corner that the lids hide it).
    [[-1, F.oL * f.blink], [1, F.oR * f.blink]].forEach(([side, o]) => {
      const ex = side * r * 0.36, ey = -r * 0.1, ew = r * 0.27, eh = r * 0.15 * o, pr = r * 0.085;
      if (o < 0.14) {
        c.beginPath(); c.moveTo(ex - ew, ey); c.quadraticCurveTo(ex, ey + r * 0.07, ex + ew, ey); c.stroke();
      } else {
        c.save();
        c.beginPath(); c.moveTo(ex - ew, ey); c.quadraticCurveTo(ex, ey - eh * 2, ex + ew, ey); c.quadraticCurveTo(ex, ey + eh * 1.6, ex - ew, ey); c.closePath();
        c.fillStyle = FP.white || 'rgba(240,226,196,.5)'; c.fill();
        if (!FP.style || FP.style === 'ink') c.fill();   // dark ink: the white twice, so the pupil stands on it
        c.stroke(); c.clip();
        c.fillStyle = ink; c.beginPath(); c.arc(ex + clamp(f.lx, -1.1, 1.1) * ew * 0.6, ey + clamp(f.ly, -1.1, 1.1) * eh * 0.45, pr, 0, Math.PI * 2); c.fill();   // the pupil: where it looks
        c.restore();
      }
      // brow
      const inner = side * r * 0.17, outer = side * r * 0.52;
      const by = -r * 0.33 - F.raise * r * 0.1;
      c.beginPath(); c.moveTo(inner, by + F.brow * r * 0.1 * -1 + (F.brow < 0 ? -F.brow * r * 0.16 : -F.brow * r * 0.05)); c.quadraticCurveTo((inner + outer) / 2, by - r * 0.05, outer, by - F.brow * r * 0.06); c.stroke();
    });
    // nose
    c.beginPath(); c.moveTo(-r * 0.03, -r * 0.02); c.quadraticCurveTo(r * 0.06, r * 0.13, -r * 0.05, r * 0.16); c.stroke();
    // mouth (tilt: one corner drawn up, a smirk or a sneer)
    const mw = r * 0.3 * F.width, my = r * 0.36, cy2 = F.curve * r * 0.18, op = F.open * r * 0.26, tl = F.tilt || 0;
    const yL = my - cy2 * 0.4 - Math.max(0, tl) * r * 0.11 + Math.max(0, -tl) * r * 0.025;
    const yR = my - cy2 * 0.4 - Math.max(0, -tl) * r * 0.11 + Math.max(0, tl) * r * 0.025;
    c.beginPath();
    c.moveTo(-mw, yL);
    c.quadraticCurveTo(-tl * mw * 0.25, my + cy2, mw, yR);
    if (op > 1.5) {
      c.quadraticCurveTo(-tl * mw * 0.25, my + cy2 + op * 1.6, -mw, yL);
      c.closePath(); c.fillStyle = 'rgba(20,8,2,.85)'; c.fill();
      if (F.teeth > 0.4) {
        c.save(); c.clip(); c.fillStyle = 'rgba(236,222,190,.85)';
        for (let i = -3; i <= 3; i++) c.fillRect(i * mw / 3.6 - mw / 9, my + cy2 * 0.55 - 2, mw / 4.6, op * 0.45);
        c.restore();
      }
      if (F.tongue > 0.4) {
        c.save(); c.clip(); c.fillStyle = 'rgba(150,60,50,.8)';
        c.beginPath(); c.ellipse(mw * 0.15, my + cy2 + op * 1.1, mw * 0.45, op * 0.7, 0, 0, Math.PI * 2); c.fill(); c.restore();
      }
    }
    c.strokeStyle = ink; c.stroke();
    if (F.tongue > 0.4 && op <= 1.5) { c.fillStyle = 'rgba(150,60,50,.8)'; c.beginPath(); c.ellipse(mw * 0.2, my + r * 0.08, mw * 0.32, r * 0.1, 0.2, 0, Math.PI * 2); c.fill(); c.stroke(); }
    c.restore();
  }

  // ---------------------------------------------------------------- the planchette
  const P = {
    x: 0, y: 112, vx: 0, vy: 0, ang: 0, mode: 'free', tx: 0, ty: 112, ymax: 340,   // ymax: how far down it can go (the possession slides it to the board's bottom edge)
    dragging: false, handDX: 0, handDY: 0, path: null, speed: 0,
    tremble: null,   // { x, y, k }: it shakes where it sits (an answer that waits, a question it will not answer)
    // Where the wood actually travels, a moment behind every shake: the scrape is pitched to this, so a planchette that shakes in place
    // (held on NO, trembling, waiting) makes no drag sound, and one that is put somewhere (snap: a reset, the look-away) makes none either.
    // Sound and motion are the same event (Pierce, 2026-10-04: he heard the drag everywhere while the piece did not move).
    sx: 0, sy: 112, mx: 0, my: 112, snap: true, heavy: 0,
  };
  function planchettePath(c) {
    c.beginPath();
    c.moveTo(0, -112);
    c.bezierCurveTo(48, -96, 106, -14, 100, 46);
    c.bezierCurveTo(96, 102, 46, 122, 0, 108);
    c.bezierCurveTo(-46, 122, -96, 102, -100, 46);
    c.bezierCurveTo(-106, -14, -48, -96, 0, -112);
    c.closePath();
  }
  function seek() { dropPath(); P.seekC = { x: P.x, y: P.y + 30 }; P.seekT = G.t; P.mode = 'seek'; }
  // ---- the wait is a performance (Pierce, 2026-10-04: "low guttural sounds, close, thinking sounds, pondering sounds"). While a move is
  // out at the site (and thinking can take ten seconds and more), the planchette ponders instead of circling: something alive deciding
  // what to do with them. It escalates with the wait: up to three seconds a slow drift and a faint tremble, now and then over to a letter
  // to hang there as if reading it; from three to seven, slow figure-eights and more letters read; past seven, it drifts toward GOOD BYE
  // and back, and leans toward them, the tremble worse. The sun's eyes dart from letter to letter; the moon watches the player. Low sounds
  // from the "ponder" recordings (assets/sfx/<place>/manifest.json; none yet is silence), close or behind, quiet, never the same take
  // twice in a row, more often as the wait goes on; any still sounding is let go the moment the reply comes, so it never lands on the
  // reply's own beat. The reply takes over from wherever it is, moving on from there (no snap).
  const PON = { t0: 0, stage: 0, beat: null, nextSound: 0, sounds: 0, tried: 0 };
  const PON_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  function ponderStart() {
    dropPath();
    Object.assign(PON, { t0: G.t, stage: 1, beat: null, nextSound: G.t + rnd(1700, 2600), sounds: 0, tried: 0 });
    P.mode = 'ponder'; P.tremble = null;
    nlog('ponder', { stage: 1 });
  }
  function ponderStop() {
    if (!PON.stage) return;
    if (A.ponderHush) A.ponderHush();
    if (P.mode === 'ponder') { P.mode = 'free'; P.tx = P.x; P.ty = P.y; P.vx = P.vy = 0; }
    nlog('ponderEnd', { ms: Math.round(G.t - PON.t0), stage: PON.stage, sounds: PON.sounds, tried: PON.tried });
    PON.stage = 0; PON.beat = null;
  }
  function ponderBeat(stage) {
    const pool = stage === 1 ? ['drift', 'drift', 'read'] : stage === 2 ? ['eight', 'read', 'read', 'drift'] : ['goodbye', 'lean', 'eight', 'read'];
    let kind = pick(pool);
    if (PON.beat && kind === PON.beat.kind) kind = pick(pool.filter((k) => k !== kind));
    const dur = { drift: rnd(2400, 3400), read: rnd(2300, 3000), eight: rnd(3000, 3800), goodbye: rnd(2600, 3400), lean: rnd(2200, 2800) }[kind];
    const b = { kind, stage, t0: G.t, end: G.t + dur, from: { x: P.x, y: P.y }, c: { x: lerp(P.x, REST.x, 0.4), y: lerp(P.y, REST.y - 20, 0.4) } };
    if (kind === 'read') { b.letter = pick(PON_LETTERS); b.to = hoverAt(GLYPHS[b.letter]); }
    if (kind === 'goodbye') { const g = GLYPHS.GOODBYE; b.to = offFaces(lerp(P.x, g.x, 0.6), lerp(P.y, g.y, 0.6)); }
    nlog('ponderBeat', { kind, stage, ...(b.letter ? { letter: b.letter } : {}) });
    return b;
  }
  function updatePonder(dt) {
    const e = G.t - PON.t0, stage = e < 3000 ? 1 : e < 7000 ? 2 : 3;
    if (stage !== PON.stage) { PON.stage = stage; nlog('ponder', { stage }); }
    if (!PON.beat || G.t >= PON.beat.end) PON.beat = ponderBeat(stage);
    const b = PON.beat, u = clamp((G.t - b.t0) / (b.end - b.t0), 0, 1);
    let tx = P.x, ty = P.y;
    if (b.kind === 'drift') { const a = (G.t - b.t0) / 760; tx = b.c.x + Math.sin(a) * 30; ty = b.c.y - Math.cos(a) * 22; }
    else if (b.kind === 'read' || b.kind === 'goodbye') {
      // over to it, hang there as if reading it, and pull away
      const k = u < 0.4 ? easeIO(u / 0.4) : u < 0.75 ? 1 : 1 - easeIO((u - 0.75) / 0.25) * 0.75;
      tx = lerp(b.from.x, b.to.x, k); ty = lerp(b.from.y, b.to.y, k);
    } else if (b.kind === 'eight') { const a = u * Math.PI * 2; tx = b.c.x + Math.sin(a) * 70; ty = b.c.y + Math.sin(2 * a) * 26; }
    else if (b.kind === 'lean') { const k = Math.sin(u * Math.PI); tx = b.from.x * (1 - 0.3 * k); ty = Math.min(300, b.from.y + 110 * k); }
    // the tremble grows with the wait
    const tr = stage === 1 ? 0.5 : stage === 2 ? 0.9 : 1.5, f = Math.min(1, dt * 4);
    P.x = lerp(P.x, tx, f) + rnd(-tr, tr) * 0.5; P.y = lerp(P.y, ty, f) + rnd(-tr, tr) * 0.35;
    P.tx = P.x; P.ty = P.y;
    if (G.t >= PON.nextSound) {
      PON.tried++;
      const n = A.ponder ? A.ponder(stage >= 3 ? pick(['close', 'behind']) : pick(['behind', 'behind', 'close']), stage === 1 ? 0.28 : stage === 2 ? 0.36 : 0.45) : 0;
      if (n) PON.sounds++;
      nlog('ponderSound', { stage, played: !!n });
      PON.nextSound = G.t + (stage === 1 ? rnd(2600, 3600) : stage === 2 ? rnd(2200, 3100) : rnd(1700, 2500)) + (n ? n * 1000 * 0.5 : 0);
    }
  }
  // Drop the planchette's current path, and let whoever was waiting on it go.
  function dropPath() { const p = P.path; P.path = null; if (p && p.res) p.res(); }
  // A move a stopped night was waiting on ends in HALTED, not in the next letter (o.free: the stop's own move).
  function moveTo(x, y, o = {}) {
    dropPath();
    if (halt && !o.free) return Promise.reject(HALTED);
    return new Promise((ok, no) => {
      const res = () => (halt && !o.free ? no(HALTED) : ok());
      const dx = x - P.x, dy = y - P.y, d = Math.hypot(dx, dy) || 1;
      const sgn = Math.random() < 0.5 ? -1 : 1, curve = o.curve ?? rnd(0.12, 0.3);
      P.path = {
        x0: P.x, y0: P.y, x1: x, y1: y,
        cx: P.x + dx / 2 - (dy / d) * d * curve * sgn, cy: P.y + dy / 2 + (dx / d) * d * curve * sgn,
        t: 0, dur: o.dur ?? ((o.base ?? 300) + d * (o.pace ?? 0.95)), dwell: o.dwell ?? 450, hold: 0, phase: 'move', res,
      };
    });
  }
  function circleOn(g, dur, rad) {
    // a repeated letter: the planchette circles it (rad: how wide; a doubled letter in a fast line is a quick small loop, a tap)
    dropPath();
    if (halt) return Promise.reject(HALTED);
    return new Promise((ok, no) => { P.path = { circle: g, t: 0, dur: dur || 900, r: rad || 34, res: () => (halt ? no(HALTED) : ok()) }; });
  }

  function updatePlanchette(dt) {
    if (P.path && P.path.circle) {
      const p = P.path; p.t += dt * 1000 / p.dur;
      const a = p.t * Math.PI * 2;
      const cr = p.r || 34;
      P.x = p.circle.x + Math.sin(a) * cr; P.y = p.circle.y - Math.cos(a) * cr + cr;
      if (p.t >= 1) { P.x = p.circle.x; P.y = p.circle.y; const r = p.res; P.path = null; r(); }
    } else if (P.path) {
      const p = P.path;
      if (p.phase === 'move') {
        p.t += (dt * 1000) / p.dur;
        const u = easeIO(Math.min(p.t, 1)), iu = 1 - u;
        P.x = iu * iu * p.x0 + 2 * iu * u * p.cx + u * u * p.x1;
        P.y = iu * iu * p.y0 + 2 * iu * u * p.cy + u * u * p.y1;
        // the possession's thrash: it shakes as it flies (restored from 5efb4f7's hostile jitter; the scrape reads the travel, not this)
        if (G.thrash) { P.x += rnd(-3, 3); P.y += rnd(-3, 3); }
        if (p.t >= 1) p.phase = 'dwell';
      } else {
        p.hold += dt * 1000;
        const k = Math.max(0, 1 - p.hold / 260);
        P.x = p.x1 + Math.sin(p.hold / 38) * 5 * k; P.y = p.y1 + Math.cos(p.hold / 45) * 3 * k;
        if (p.hold >= p.dwell) { const r = p.res; P.path = null; r(); }
      }
      // your hand is on it too: you can lean against the spirit, a little
      P.x += P.handDX * 0.14; P.y += P.handDY * 0.14;
    } else if (P.mode === 'free') {
      if (P.dragging || Math.abs(P.vx) + Math.abs(P.vy) > 1) {
        const k = 90, c = 16;
        P.vx += (k * (P.tx - P.x) - c * P.vx) * dt; P.vy += (k * (P.ty - P.y) - c * P.vy) * dt;
        P.x += P.vx * dt; P.y += P.vy * dt;
      }
      if (!P.dragging && deadNow() && DR.deadAnchor) {
        // the dead stretch: it does not drift, it trembles where it sits, a little more as the stretch goes on
        // and it creeps a few pixels toward whoever is holding the phone over the whole minute: something to watch, nothing explained
        const pr = clamp((G.t - DR.deadFrom) / Math.max(1, DR.deadUntil - DR.deadFrom), 0, 1), a = DR.deadAnchor, k = 0.5 + 1.5 * pr;
        P.x = a.x + rnd(-k, k); P.y = a.y + 9 * pr + rnd(-k, k) * 0.7;
        P.tx = P.x; P.ty = P.y;
      } else if (!P.dragging && P.tremble) {
        // it trembles where it sits: it is deciding, or it will not
        const a = P.tremble, k = a.k * (0.8 + 0.4 * Math.sin(G.t / 230));
        P.x = a.x + rnd(-k, k); P.y = a.y + rnd(-k, k) * 0.7;
        P.tx = P.x; P.ty = P.y;
      } else if (!P.dragging) {
        // ideomotor drift: nobody is pushing, and it still moves
        const n = S.haunted || S.dread >= 4 ? 1.4 : 0.6;   // it drifts a little more once the night has turned
        P.x += Math.sin(G.t / 1700) * 0.05 * n + rnd(-0.08, 0.08) * n;
        P.y += Math.cos(G.t / 2100) * 0.05 * n + rnd(-0.08, 0.08) * n;
        // left over the sun or the moon, it slides off by itself: a face is never under it at rest
        if (overFace(P.x, P.y) && Math.abs(P.vx) + Math.abs(P.vy) < 1) { const o = offFaces(P.x, P.y); P.x = lerp(P.x, o.x, dt * 1.6); P.y = lerp(P.y, o.y, dt * 1.6); }
        P.tx = P.x; P.ty = P.y;
      }
    } else if (P.mode === 'struggle' || P.mode === 'mimic') {
      // a tug of war: the spring always pulls toward the target, and something else moves the target too
      const k = P.mode === 'mimic' ? 140 : 90, c = P.mode === 'mimic' ? 20 : 16;
      P.vx += (k * (P.tx - P.x) - c * P.vx) * dt; P.vy += (k * (P.ty - P.y) - c * P.vy) * dt;
      P.x += P.vx * dt; P.y += P.vy * dt;
    } else if (P.mode === 'ponder') {
      updatePonder(dt);
    } else if (P.mode === 'seek') {
      // the spirit is thinking: slow small circles, drifting back toward the middle
      const a = (G.t - P.seekT) / 760, c = P.seekC;
      c.x = lerp(c.x, REST.x, dt * 0.25); c.y = lerp(c.y, REST.y - 30, dt * 0.25);
      P.x = lerp(P.x, c.x + Math.sin(a) * 42, Math.min(1, dt * 3)); P.y = lerp(P.y, c.y - Math.cos(a) * 30, Math.min(1, dt * 3));
    }
    P.handDX *= 0.9; P.handDY *= 0.9;
    P.x = clamp(P.x, -520, 520); P.y = clamp(P.y, -330, P.ymax);
    // the wood's travel: the drawn position through two 60 ms smoothings in a row. A shake in place (random, frame to frame) comes out
    // as almost nothing; a slide, however slow, comes through whole. The scrape and the lean are both read from it.
    const k = 1 - Math.exp(-Math.max(dt, 0.001) / 0.06);
    if (P.snap || !Number.isFinite(P.sx) || !Number.isFinite(P.mx)) { P.mx = P.sx = P.x; P.my = P.sy = P.y; P.snap = false; }
    const psx = P.sx, psy = P.sy;
    P.mx += (P.x - P.mx) * k; P.my += (P.y - P.my) * k;
    P.sx += (P.mx - P.sx) * k; P.sy += (P.my - P.sy) * k;
    const vx = (P.sx - psx) / Math.max(dt, 0.001), vy = (P.sy - psy) / Math.max(dt, 0.001);
    P.speed = Number.isFinite(vx + vy) ? Math.hypot(vx, vy) : 0;
    const targetAng = clamp(vx / 2400, -0.22, 0.22);
    P.ang = lerp(P.ang, targetAng, 0.08);
    // the scrape is the wood moving on the board, and only while the board is on the table in front of them
    // (silent while it reads along over their shoulder: P.silent)
    // (and not the slow drift back to the middle or the pondering while a move is out: those went on scraping long after the letter was
    // marked (Pierce, 2026-10-08); a real slide in those modes, faster than 80, is still heard)
    const slowThink = (P.mode === 'seek' || P.mode === 'ponder') && P.speed <= 80;
    const heard = S.started && G.intro < 0.98 && !P.silent && !slowThink ? P.speed * BOARD.s : 0;
    A.scrape(heard, P.heavy || 0);
    if (SCR.on) { SCR.log.push({ t: Math.round(G.t), v: +(A.ready ? A.scrapeLevel : 0).toFixed(3), x: Math.round(P.x), y: Math.round(P.y), sx: +P.sx.toFixed(1), sy: +P.sy.toFixed(1) }); if (SCR.log.length > 9000) SCR.log.splice(0, 3000); }
  }
  // ?debug: every frame's scrape level next to where the planchette is (a test checks the two never part)
  const SCR = { on: false, log: [] };

  // The Cottage, 1848: an overturned drinking glass on a school slate. Same physics, same reading spot.
  // Seen from above: the rim on the slate, the thick base nearer you, the chalk showing through both.
  // Lit from the candles, so the highlights stay put while the glass slides; it never turns.
  function drawGlass(c) {
    const RIM = 80, BASE = 48, holy = S.mood === 'holy';
    c.save();
    c.translate(P.x, P.y);
    // a faint shadow, and the light it gathers on the far side
    const sh = c.createRadialGradient(10, 16, RIM * 0.75, 10, 16, RIM * 1.3);
    sh.addColorStop(0, 'rgba(0,0,0,.34)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sh; c.beginPath(); c.arc(10, 16, RIM * 1.3, 0, Math.PI * 2); c.fill();
    c.globalCompositeOperation = 'lighter';
    const caus = c.createRadialGradient(22, 30, 0, 22, 30, RIM * 0.55);
    caus.addColorStop(0, 'rgba(255,240,210,.14)'); caus.addColorStop(1, 'rgba(255,240,210,0)');
    c.fillStyle = caus; c.fillRect(22 - RIM, 30 - RIM, RIM * 2, RIM * 2);
    c.globalCompositeOperation = 'source-over';
    // the wall of the glass bends what's under it: the chalk shrinks a little toward the rim
    const lens = (r, mag, dx, dy) => {
      c.save(); c.beginPath(); c.arc(dx, dy, r, 0, Math.PI * 2); c.clip();
      const src = (r * 2) / mag;
      c.drawImage(baseCv, (600 + P.x + dx - src / 2) * BQ, (400 + P.y + dy - src / 2) * BQ, src * BQ, src * BQ, dx - r, dy - r, r * 2, r * 2);
      c.restore();
    };
    lens(RIM - 1, 0.9, 0, 0);
    // the thick wall reads darker and greener toward the rim
    const wall = c.createRadialGradient(0, 0, RIM * 0.55, 0, 0, RIM);
    wall.addColorStop(0, 'rgba(200,222,214,.07)'); wall.addColorStop(0.78, 'rgba(14,24,22,.2)'); wall.addColorStop(0.93, 'rgba(14,24,22,.32)'); wall.addColorStop(1, 'rgba(230,242,238,.3)');
    c.fillStyle = wall; c.beginPath(); c.arc(0, 0, RIM, 0, Math.PI * 2); c.fill();
    // the base: thick glass, the reading spot, magnified
    const bx = -4, by = -5;
    lens(BASE, 1.45, bx, by);
    const bg = c.createRadialGradient(bx - 12, by - 14, 4, bx, by, BASE);
    bg.addColorStop(0, 'rgba(255,255,255,.16)'); bg.addColorStop(0.65, 'rgba(210,228,224,.05)'); bg.addColorStop(1, 'rgba(10,18,16,.36)');
    c.fillStyle = bg; c.beginPath(); c.arc(bx, by, BASE, 0, Math.PI * 2); c.fill();
    // where the mouth meets the slate: a hard dark line, then the bright lip
    c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.arc(0, 0, RIM + 2, 0, Math.PI * 2); c.stroke();
    const glint = holy ? `rgba(255,214,130,${0.6 + 0.35 * G.goldRim})` : 'rgba(238,246,244,.62)';
    c.lineWidth = 2.6; c.strokeStyle = glint; c.beginPath(); c.arc(0, 0, RIM, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 2; c.strokeStyle = 'rgba(232,244,240,.28)'; c.beginPath(); c.arc(0, 0, RIM - 7, 0, Math.PI * 2); c.stroke();
    // the base ring, thick
    c.lineWidth = 7; c.strokeStyle = 'rgba(214,232,228,.24)'; c.beginPath(); c.arc(bx, by, BASE + 1, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 1.6; c.strokeStyle = holy ? 'rgba(255,220,150,.8)' : 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(bx, by, BASE - 3, 0, Math.PI * 2); c.stroke();
    // highlights from the candles, top left; a small one on the far side
    c.globalCompositeOperation = 'lighter';
    const spec = c.createRadialGradient(-RIM * 0.46, -RIM * 0.5, 0, -RIM * 0.46, -RIM * 0.5, RIM * 0.32);
    spec.addColorStop(0, 'rgba(255,250,236,.3)'); spec.addColorStop(1, 'rgba(255,250,236,0)');
    c.fillStyle = spec; c.fillRect(-RIM, -RIM, RIM, RIM);
    c.lineCap = 'round';
    c.lineWidth = 4.5; c.strokeStyle = 'rgba(255,250,236,.85)'; c.beginPath(); c.arc(0, 0, RIM - 3, Math.PI * 1.06, Math.PI * 1.44); c.stroke();
    c.lineWidth = 9; c.strokeStyle = 'rgba(255,250,236,.16)'; c.beginPath(); c.arc(0, 0, RIM - 15, Math.PI * 1.1, Math.PI * 1.38); c.stroke();
    c.lineWidth = 3; c.strokeStyle = 'rgba(255,250,236,.6)'; c.beginPath(); c.arc(bx, by, BASE - 1, Math.PI * 1.12, Math.PI * 1.38); c.stroke();
    c.lineWidth = 2.4; c.strokeStyle = 'rgba(255,250,236,.4)'; c.beginPath(); c.arc(0, 0, RIM - 2, Math.PI * 0.1, Math.PI * 0.28); c.stroke();
    c.restore();
  }

  // What your hand is on: the planchette, or the Cottage's overturned glass.
  function pointerName() { return PL.planchette === 'glass' ? 'the glass' : 'the planchette'; }
  // S-PLANCHETTE: a real planchette photographed overhead, keyed once to transparent, pointed end up. Drawn so the
  // middle of its glass sits on (P.x, P.y), which is the point that reads the board, with the live magnifier under
  // the glass (the glass in the photo is clear, so the magnified board shows through it, scratches and all).
  // Until the file exists the stand-in is a plain dark shape with the same lens: a placeholder, not a picture of wood.
  //   lensX/lensY: the middle of the glass, as fractions of the photo; lensR: the glass's radius over the photo's width
  const REAL_PLANCHETTE = { w: 230, lensX: 0.497, lensY: 0.377, lensR: 0.1653 };
  // Made once from the photo: the wood graded into the board's own candlelight, its contact shadow and soft shadow
  // (cut from its own outline, blurred with shadowBlur so WebKit blurs it too), and its footprint for the faces rule.
  const PH = { graded: null, lit: null, near: null, soft: null, foot: null, pad: 40 };
  function preparePlanchette(im) {
    PH.tint = (PL && PL.board && PL.board.tint) || 'rgb(232,204,168)';
    const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    // the grade: the board's tint multiplied in, the way the board itself is, so both sit under the same light
    const g = mk(iw, ih), gc = g.getContext('2d');
    gc.drawImage(im, 0, 0);
    gc.globalCompositeOperation = 'multiply'; gc.fillStyle = PH.tint; gc.fillRect(0, 0, iw, ih);
    gc.globalCompositeOperation = 'destination-in'; gc.drawImage(im, 0, 0);
    PH.graded = g; PH.lit = mk(iw, ih);
    // the silhouette, then two shadows of it at the planchette's drawn scale
    const sil = mk(iw, ih), sc = sil.getContext('2d');
    sc.drawImage(im, 0, 0); sc.globalCompositeOperation = 'source-in'; sc.fillStyle = '#000'; sc.fillRect(0, 0, iw, ih);
    const s = REAL_PLANCHETTE.w / iw, dw = Math.ceil(iw * s), dh = Math.ceil(ih * s), pad = PH.pad;
    const shadow = (blur, alpha) => {
      const c = mk(dw + pad * 2, dh + pad * 2), x = c.getContext('2d');
      x.shadowColor = `rgba(0,0,0,${alpha})`; x.shadowBlur = blur; x.shadowOffsetX = 4000;
      x.drawImage(sil, pad - 4000, pad, dw, dh);
      return c;
    };
    PH.near = shadow(3, 0.55); PH.soft = shadow(16, 0.5);
    // the footprint: where the wood is, sampled on a coarse grid, in lens-centred board units
    const fc = mk(24, 32), fx = fc.getContext('2d'); fx.drawImage(im, 0, 0, 24, 32);
    const px = fx.getImageData(0, 0, 24, 32).data, foot = [], w = REAL_PLANCHETTE.w, h = w * ih / iw;
    for (let j = 0; j < 32; j++) for (let i = 0; i < 24; i++) {
      if (px[(j * 24 + i) * 4 + 3] > 90) foot.push([((i + 0.5) / 24 - REAL_PLANCHETTE.lensX) * w, ((j + 0.5) / 32 - REAL_PLANCHETTE.lensY) * h]);
    }
    PH.foot = foot.length ? foot : null;
  }
  // Where the candles' light comes from, seen from the planchette: a direction in its own frame and how strong.
  function planchetteLight() {
    const p = boardToScreen(P.x, P.y), fl = G.flameLevel * (1 - G.gutter * 0.6);
    let lx = 0, ly = 0, sum = 0;
    PLATE.candles.forEach((k0, i) => {
      const on = (1 - G.candleOut[i]) * fl; if (on < 0.02) return;
      const k = candleAt(k0), q = worldToScreen(k.x, k.y), dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
      const w = on / (1 + d / (500 * CAM.s));
      lx += (dx / d) * w; ly += (dy / d) * w; sum += w;
    });
    const n = Math.hypot(lx, ly) || 1, ca = Math.cos(-P.ang), sa = Math.sin(-P.ang);
    const ux = lx / n, uy = ly / n;
    return { x: ux * ca - uy * sa, y: ux * sa + uy * ca, k: clamp(sum * 1.6, 0, 1) };
  }
  function drawPlanchette(c) {
    if (PL.planchette === 'glass') { drawGlass(c); return; }
    c.save();
    c.translate(P.x, P.y); c.rotate(P.ang);
    if (RI.planchette && PH.tint !== (PL.board.tint || 'rgb(232,204,168)')) preparePlanchette(RI.planchette);   // a new place, a new light
    const holy = S.mood === 'holy', ph = RI.planchette && PH.graded ? RI.planchette : null;
    let R = 36;
    if (ph) {
      const w = REAL_PLANCHETTE.w, h = w * ph.height / ph.width, x0 = -REAL_PLANCHETTE.lensX * w, y0 = -REAL_PLANCHETTE.lensY * h;
      R = REAL_PLANCHETTE.lensR * w;
      const L = planchetteLight(), pad = PH.pad;
      // shadows fall away from the light: a tight one where the wood meets the board, a soft one cast by the candles
      c.drawImage(PH.near, x0 - pad + 1.5, y0 - pad + 2.5);
      c.globalAlpha = 0.35 + 0.65 * L.k;
      c.drawImage(PH.soft, x0 - pad - L.x * 16, y0 - pad - L.y * 16 + 6);
      c.globalAlpha = 1;
      // the window first: the live magnifier over the printing, under the photographed glass
      drawLens(c, 0, 0, R, true);
      // the wood, lit from the side the candles are on, dark on the far side, a breath of the flame's colour
      let im = PH.graded;
      if (!FX.low) {
        const lc2 = PH.lit.getContext('2d'), iw = PH.lit.width, ih = PH.lit.height;
        lc2.globalCompositeOperation = 'copy'; lc2.drawImage(PH.graded, 0, 0);
        lc2.globalCompositeOperation = 'source-atop';
        const cxp = iw * REAL_PLANCHETTE.lensX, cyp = ih * 0.55, rr = Math.hypot(iw, ih) * 0.5;
        const gr = lc2.createLinearGradient(cxp + L.x * rr, cyp + L.y * rr, cxp - L.x * rr, cyp - L.y * rr);
        const fc = flameColor(), a = 0.12 * L.k;
        gr.addColorStop(0, `rgba(${fc[0]},${fc[1]},${fc[2]},${a})`); gr.addColorStop(0.45, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${0.22 + 0.2 * L.k})`);
        lc2.fillStyle = gr; lc2.fillRect(0, 0, iw, ih);
        im = PH.lit;
      }
      c.drawImage(im, x0, y0, w, h);
      if (holy && G.goldRim > 0.01) {
        c.globalCompositeOperation = 'lighter'; c.lineWidth = 3; c.strokeStyle = `rgba(255,205,110,${0.35 * G.goldRim})`;
        c.beginPath(); c.arc(0, 0, R + 4, 0, Math.PI * 2); c.stroke(); c.globalCompositeOperation = 'source-over';
      }
    } else {
      c.drawImage(SHADOW.planchette, 12 - 150, 18 - 160, 300, 320);
      planchettePath(c);
      c.fillStyle = '#2b2219'; c.fill();
      c.lineWidth = 2; c.strokeStyle = holy ? `rgba(255,205,110,${0.5 + 0.4 * G.goldRim})` : 'rgba(0,0,0,.5)'; c.stroke();
      drawLens(c, 0, 0, R, false);
      c.lineWidth = 4; c.strokeStyle = holy ? '#d9a84e' : '#4a3a28'; c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
  }
  // The live magnifier: the printing under the glass, 1.55x, and whatever looks up through it.
  function drawLens(c, lx, ly, R, real) {
    c.save(); c.translate(lx, ly); c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.clip();
    c.rotate(-P.ang);
    const mag = 1.55, src = (R * 2) / mag;
    c.drawImage(baseCv, (600 + P.x + lx - src / 2) * BQ, (400 + P.y + ly - src / 2) * BQ, src * BQ, src * BQ, -R, -R, R * 2, R * 2);
    // the board's own tint, as the board gets it, so the magnified wood is the same wood
    c.globalCompositeOperation = 'multiply'; c.fillStyle = PL.board.tint || 'rgb(232,204,168)'; c.fillRect(-R, -R, R * 2, R * 2);
    c.globalCompositeOperation = 'source-over';
    // thick old glass: darker toward its rim, a little brighter where the candles catch it
    const gl = c.createRadialGradient(-R * 0.3, -R * 0.36, R * 0.1, 0, 0, R);
    gl.addColorStop(0, real ? 'rgba(255,250,240,.10)' : 'rgba(255,255,255,.22)'); gl.addColorStop(0.55, 'rgba(255,255,255,.02)'); gl.addColorStop(1, 'rgba(0,0,0,.42)');
    c.fillStyle = gl; c.fillRect(-R, -R, R * 2, R * 2);
    c.restore();
  }

  // Soft shadows are blurred once, here, not every frame.
  const SHADOW = (() => {
    const b = document.createElement('canvas'); b.width = 640; b.height = 440;
    const g = b.getContext('2d'); g.scale(0.5, 0.5); g.filter = 'blur(14px)';
    g.translate(640, 440); roundRectPath(g, -600, -400, 1200, 800, 34); g.fillStyle = 'rgba(0,0,0,.55)'; g.fill();
    const p = document.createElement('canvas'); p.width = 300; p.height = 320;
    const h = p.getContext('2d'); h.filter = 'blur(10px)'; h.translate(150, 160); h.scale(1.03, 1.03);
    planchettePath(h); h.fillStyle = 'rgba(0,0,0,.42)'; h.fill();
    return { board: b, planchette: p };
  })();

  // ---------------------------------------------------------------- particles
  const PARTS = [];
  function emit(type, x, y, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = o.angle != null ? o.angle + rnd(-o.spread || 0, o.spread || 0) : rnd(0, Math.PI * 2);
      const sp = rnd(o.min ?? 20, o.max ?? 120);
      const p = { type, x: x + rnd(-(o.jx || 0), o.jx || 0), y: y + rnd(-(o.jy || 0), o.jy || 0), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: rnd(o.lmin ?? 0.8, o.lmax ?? 2), size: rnd(o.smin ?? 6, o.smax ?? 18), rot: rnd(0, 6.28), vr: rnd(-4, 4) };
      if (type === 'shard') {
        const k = 3 + (Math.random() * 2 | 0); p.pts = [];
        for (let j = 0; j < k; j++) { const aa = (j / k) * 6.28 + rnd(-0.4, 0.4); p.pts.push([Math.cos(aa) * rnd(0.5, 1), Math.sin(aa) * rnd(0.5, 1)]); }
        p.col = pick(['178,24,40', '34,62,170', '30,128,70', '232,170,40', '120,40,140', '232,170,40']);
      }
      PARTS.push(p);
    }
  }
  function updateParts(dt) {
    for (let i = PARTS.length - 1; i >= 0; i--) {
      const p = PARTS[i]; p.life += dt;
      if (p.life >= p.max) { PARTS.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.type === 'ember') { p.vy -= 20 * dt; }
      if (p.type === 'shard') { p.size += dt * 70; p.vx *= 0.985; p.vy *= 0.985; }
      if (p.type === 'mote') { p.vy -= 6 * dt; p.vx += Math.sin(G.t / 400 + i) * 2 * dt; }
      if (p.type === 'ash') { p.vy += 30 * dt; p.vx *= 0.97; }
      if (p.type === 'coin') { p.vy += 1500 * dt; p.vr = p.vr || 9; }
    }
    const cap = FX.low ? 220 : FX.small ? 360 : 700;
    if (PARTS.length > cap) PARTS.splice(0, PARTS.length - cap);
  }
  function drawParts(c) {
    for (const p of PARTS) {
      const k = p.life / p.max, a = 1 - k;
      if (p.type === 'ember') {
        c.globalCompositeOperation = 'lighter';
        c.fillStyle = `rgba(255,${120 + Math.random() * 80 | 0},40,${a})`; c.beginPath(); c.arc(p.x, p.y, p.size * 0.18, 0, 6.28); c.fill();
        c.globalCompositeOperation = 'source-over';
      } else if (p.type === 'mote') {
        c.globalCompositeOperation = 'lighter';
        c.fillStyle = `rgba(255,214,130,${a * 0.8})`; c.beginPath(); c.arc(p.x, p.y, p.size * 0.15, 0, 6.28); c.fill();
        c.globalCompositeOperation = 'source-over';
      } else if (p.type === 'ash') {
        c.fillStyle = `rgba(60,56,52,${a})`; c.fillRect(p.x, p.y, p.size * 0.3, p.size * 0.2);
      } else if (p.type === 'coin') {
        // the money changers' coins: dull brass and silver, never His gold
        c.save(); c.translate(p.x, p.y); c.scale(Math.max(0.15, Math.abs(Math.cos(p.rot * 2))), 1);
        c.fillStyle = `rgba(176,168,150,${a})`; c.strokeStyle = `rgba(40,36,30,${a})`; c.lineWidth = 1.5;
        c.beginPath(); c.arc(0, 0, p.size * 0.5, 0, 6.28); c.fill(); c.stroke(); c.restore();
      } else if (p.type === 'shard') {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(p.size, p.size);
        c.beginPath(); p.pts.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
        c.globalCompositeOperation = 'lighter';
        c.fillStyle = `rgba(${p.col},${0.75 * a})`; c.fill();
        c.globalCompositeOperation = 'source-over';
        c.lineWidth = 0.09; c.strokeStyle = `rgba(10,8,6,${a})`; c.stroke();
        c.restore();
      }
    }
  }

  // ---------------------------------------------------------------- flames and smoke
  // The candle flames are drawn live (the photographed ones are painted out of the plate), so a breath
  // can bend them, shrink them and kill them. One soft sprite per colour, made once.
  function makeFlame(outer, mid, core) {
    const c = document.createElement('canvas'); c.width = 96; c.height = 176;
    const g = c.getContext('2d');
    const tear = (w, top, bottom) => {
      const h = bottom - top; g.beginPath(); g.moveTo(48, top);
      g.bezierCurveTo(48 + w * 0.25, top + h * 0.3, 48 + w, top + h * 0.58, 48 + w * 0.9, top + h * 0.82);
      g.quadraticCurveTo(48 + w * 0.7, bottom, 48, bottom);
      g.quadraticCurveTo(48 - w * 0.7, bottom, 48 - w * 0.9, top + h * 0.82);
      g.bezierCurveTo(48 - w, top + h * 0.58, 48 - w * 0.25, top + h * 0.3, 48, top); g.closePath();
    };
    g.shadowColor = `rgba(${outer},1)`; g.shadowBlur = 18; g.fillStyle = `rgba(${outer},.5)`; tear(19, 20, 160); g.fill();
    g.shadowColor = `rgba(${mid},1)`; g.shadowBlur = 10; g.fillStyle = `rgba(${mid},.85)`; tear(13, 48, 156); g.fill();
    g.shadowColor = `rgba(${core},1)`; g.shadowBlur = 5; g.fillStyle = `rgba(${core},.95)`; tear(7, 88, 150); g.fill();
    g.shadowColor = 'rgba(70,110,255,.9)'; g.shadowBlur = 6; g.fillStyle = 'rgba(70,110,255,.5)';
    g.beginPath(); g.ellipse(48, 154, 7, 5, 0, 0, Math.PI * 2); g.fill();
    return c;
  }
  const FLAME = { warm: makeFlame('255,120,30', '255,190,90', '255,246,220'), blue: makeFlame('50,100,255', '120,170,255', '225,236,255'), green: makeFlame('40,170,80', '120,230,140', '220,255,226') };
  // base at (x, y), pointing along ang (0 = up), its top pushed sideways by shear (in lengths)
  function drawFlameSprite(x, y, len, wid, ang, shear, alpha, blue) {
    if (len < 0.5 || alpha < 0.02) return;
    const spr = blue === 'green' ? FLAME.green : blue ? FLAME.blue : FLAME.warm, sx = wid / 38, sy = len / 140;
    cx.save(); cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = Math.min(1, alpha);
    cx.translate(x, y); cx.rotate(ang); if (shear) cx.transform(1, 0, -shear, 1, 0, 0);
    cx.drawImage(spr, -48 * sx, -160 * sy, 96 * sx, 176 * sy);
    cx.restore();
  }
  // Where a photographed flame was, on the table, as the plate is drawn on this screen.
  function plateMap(p) { const f = plateScale(), mx = WORLD.w / 2, my = WORLD.h / 2; return { x: mx + (p.x - mx) * f, y: my + (p.y - my) * f }; }
  // A big or Retina screen draws the wide table at more than 1.3 device px per photo px. There the place's 2x copy
  // (art.plateHi, a plain resize, nothing added) is fetched, unwaited, and drawn once it lands; anything else keeps the plate.
  let hiPlate = null, hiLoading = '';
  const hiFailed = new Set();
  function wideTable() {
    const im = IMG.plate, src = PL.art && PL.art.plateHi;
    if (!im || !src) return im;
    if (hiPlate && hiPlate.p === PL) return hiPlate.im;
    const need = (WORLD.w * plateScale() * CAM.s * DPR) / (im.naturalWidth || im.width);
    if (need > 1.3 && placeReady && hiLoading !== src && !hiFailed.has(src)) {
      const p = PL; hiLoading = src;
      loadArt(src).then((h) => { if (hiLoading === src) hiLoading = ''; if (!h) hiFailed.add(src); else if (PL === p) hiPlate = { p, im: h }; });
    }
    return im;
  }
  // The plate with its photographed flames painted out, made once per plate.
  let plateOut = null, plateOutSrc = null, plateOutFl = null;
  function platePrepared(img) {
    if (!FLAMES) return img;
    if (plateOutSrc === img && plateOutFl === FLAMES && plateOut) return plateOut;
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, w, h);
    g.globalCompositeOperation = 'multiply';
    FLAMES.forEach((f) => {
      const x = (f.hide.x * w) / WORLD.w, y = (f.hide.y * h) / WORLD.h, r = (f.hide.r * w) / WORLD.w;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgb(14,10,8)'); gr.addColorStop(0.55, 'rgb(22,16,12)'); gr.addColorStop(0.8, 'rgb(90,70,60)'); gr.addColorStop(1, 'rgb(255,255,255)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    });
    plateOut = c; plateOutSrc = img; plateOutFl = FLAMES;
    return c;
  }
  // ---------------------------------------------------------------- the plate: a still, or film (the birdcalls technique)
  // DIRECTION.md section 3. The table is whichever element is current: today the still photo (with the engine's own
  // flames), later a clip. Every clip starts and ends on a shared still (K-LIT, K-DARK, K-HALF, K-BLUE), so bringing one
  // forward looks like nothing changed until something moves. A clip is drawn only once it has a frame; until then the
  // element before it keeps drawing, so there is never a black flash. Clips come from places.js (PL.clips) and live in
  // assets/clips/<place>/. Anything missing or slow falls back to today's still and engine flames without a word.
  // FF is the flame family (below, after the clips): while a place has one, its two flame films are the candles, so the
  // table films that carry their own flames (and the stills cut from them) stand down, and the decoders are theirs.
  const FF = { m: null, place: '', want: false, on: false, failed: false, w: [], mix: 0, gut: 0, lean: false, tint: null, log: [], later: [], seeks: [], ref: 0, refN: 0 };
  const tableClip = (id) => !id.includes(':');
  const CLIP_DEF = {
    light: { from: 'dark', to: 'lit', next: 'idle', cues: [[0.38, 'left'], [0.66, 'right']] },
    idle: { from: 'lit', to: 'lit', loop: true },
    gust: { from: 'lit', to: 'dark', cues: [[0.08, 'gust'], [0.32, 'out']] },
    relightSelf: { from: 'dark', to: 'lit', next: 'idle', cues: [[0.25, 'left'], [0.6, 'right']] },
    blowoutL: { from: 'lit', to: 'half', cues: [[0.45, 'outL']] },
    relightGhost: { from: 'half', to: 'lit', next: 'idle', cues: [[0.5, 'strike'], [0.6, 'left']] },
    lean: { from: 'lit', to: 'lit', next: 'idle' },
  };
  // what the candles are doing on each shared still, so the light pass and the smoke agree with the picture
  const KEY_STATE = { lit: [0, 0], dark: [1, 1], half: [1, 0] };
  const KEY_FLAME = { lit: 'warm' };   // (one look: there is no blue or green flame)
  // the order is known, so the next likely clips load ahead of time
  const AHEAD = {
    '': ['light', 'idle'], light: ['idle', 'gust', 'relightSelf'], idle: ['lean', 'blowoutL', 'relightGhost'], gust: ['relightSelf', 'idle'],
    relightSelf: ['idle', 'lean'], lean: ['idle', 'blowoutL'], blowoutL: ['relightGhost', 'idle'], relightGhost: ['idle', 'gust'],
  };
  // iOS keeps only a few video decoders, and a preloading video holds one of the six connections a browser opens to
  // a host: never more than four <video> elements alive at once, anywhere.
  const MAX_VID = 4;
  const clipBox = document.createElement('div');
  clipBox.setAttribute('aria-hidden', 'true');
  clipBox.style.cssText = 'position:fixed;left:0;top:0;width:4px;height:4px;overflow:hidden;opacity:.011;pointer-events:none;z-index:-1';   // in view, never hidden: iOS pauses a video it thinks nobody can see
  document.body.appendChild(clipBox);
  const PV = {
    cur: null, board: null, over: null,    // { id, el, def, cues, res, t0 } for the table, the board and an overlay
    key: 'lit', keys: {}, keyTok: 0,       // the shared still the table rests on when no clip plays
    vids: new Map(), missing: new Set(), aspect: '', place: '',
    soon: [],                              // what the engine's own sequence needs next: never let go to make room
  };
  function clipSet(kind) {
    const c = PL && PL.clips; if (!c) return null;
    return kind === 'board' ? c.board || null : c[SC === 'port' ? 'port' : 'land'] || null;
  }
  // a clip's file: a name in the manifest, or { src, cues: { left: 3.1 } } with cue times in seconds
  function clipSrc(id) {
    if (id.startsWith('real:')) {
      // the possession's smoke, shot on black (PL.clips.smoke: { smoke: { land, port }, smokeSettle: ..., smokeLine: ... })
      const slot = PL && PL.clips && PL.clips.smoke && PL.clips.smoke[id.slice(5)];
      if (slot) { const f = slot[SC === 'port' ? 'port' : 'land']; return f ? 'assets/clips/' + PL.id + '/' + f : ''; }
      const list = REAL_VIDEO[id.slice(5)] || [];
      const probe = document.createElement('video');
      return list.find((f) => probe.canPlayType(/\.webm$/.test(f) ? 'video/webm' : 'video/mp4')) || '';
    }
    const [kind, name] = id.includes(':') ? id.split(':') : ['table', id];
    // a board clip can have an upright take of its own (board.port), lit the way the upright table is
    const set = clipSet(kind), e = set && ((kind === 'board' && SC === 'port' && set.port && set.port[name]) || set[name]);
    const f = typeof e === 'string' ? e : e && e.src;
    return f ? 'assets/clips/' + PL.id + '/' + f : '';
  }
  const clipKnown = (id) => !(FF.want && tableClip(id)) && !!clipSrc(id) && !PV.missing.has(clipSrc(id));
  const clipReady = (id) => { const v = PV.vids.get(id); return !!(v && !v.failed && v.el.readyState >= 2); };
  // a new place or a turned phone: the old set of clips goes, and the next one starts from the top
  function clipReset() {
    for (const [id, v] of PV.vids) dropClip(id, v);
    PV.cur = PV.board = PV.over = null; PV.key = 'lit'; PV.keys = {}; PV.keyTok++; PV.soon = [];
    PV.aspect = SC; PV.place = PL ? PL.id : '';
    const set = clipSet('table'), keys = set && set.keys, tok = PV.keyTok;
    if (keys) Object.entries(keys).forEach(([k, f]) => loadArt('assets/clips/' + PL.id + '/' + f).then((im) => { if (im && tok === PV.keyTok) PV.keys[k] = im; }));
    FIRE.c = [];
    if (set && set.fire) loadArt('assets/clips/' + PL.id + '/' + set.fire).then((im) => { if (im && tok === PV.keyTok) fireCut(im); });
  }
  // The photographed fire (tools/fire-frames.py): K-LIT's own flames on black, registered to the plate, cut once per
  // candle. Laid over the table with screen, the way anything shot on black is, and moved by the engine: a breath bends
  // it, a gutter shrinks it, a blow kills it. It is always warm: there is no blue or green flame. Without the file, the engine's own
  // flame sprites, as before.
  const FIRE = { c: [] };
  function fireCut(im) {
    FIRE.c = [];
    if (!FLAMES) return;
    const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height, kx = iw / WORLD.w, ky = ih / WORLD.h;
    FIRE.iw = iw; FIRE.ih = ih;
    FIRE.c = FLAMES.map((f) => {
      const r = Math.ceil(f.len * 2 * kx), u = f.x * kx, v = f.y * ky;
      const x0 = Math.max(0, Math.floor(u - r)), y0 = Math.max(0, Math.floor(v - r));
      const x1 = Math.min(iw, Math.ceil(u + r)), y1 = Math.min(ih, Math.ceil(v + r));
      const c = document.createElement('canvas'); c.width = Math.max(1, x1 - x0); c.height = Math.max(1, y1 - y0);
      c.getContext('2d').drawImage(im, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
      return { warm: c, ax: u - x0, ay: v - y0, len: f.len * kx, tilt: f.tilt };
    });
  }
  // One photographed flame, its wick at (x, y) in device px: leaned by ang, its length scaled by h, its width by w,
  // u device px per photo px. screen: black is nothing, the fire is light.
  function drawFire(fc, kind, x, y, u, ang, h, w, alpha, upright) {
    if (!fc || alpha < 0.02 || h < 0.02) return;
    const spr = fc[kind] || fc.warm;
    cx.save(); cx.globalCompositeOperation = 'screen'; cx.globalAlpha = Math.min(1, alpha);
    cx.translate(x, y); cx.rotate(ang + (upright ? -fc.tilt : 0));
    // a match has no candle under its flame: only what burns above the wick
    if (upright) { cx.beginPath(); cx.rect(-1e4, -1e4, 2e4, 1e4 + 1.5 * DPR); cx.clip(); }
    cx.rotate(fc.tilt); cx.scale(w, h); cx.rotate(-fc.tilt);
    cx.scale(u, u); cx.drawImage(spr, -fc.ax, -fc.ay);
    cx.restore();
  }
  function dropClip(id, v) {
    try { v.el.pause(); v.el.removeAttribute('src'); v.el.load(); v.el.remove(); } catch (e) { /* gone */ }
    PV.vids.delete(id);
  }
  function loadClip(id) {
    if (PV.vids.has(id) || !clipKnown(id)) return;
    // room for it: let go of whatever was used longest ago, is not on screen and is not needed next.
    // When everything held is needed, it waits: a later moment asks again.
    const keep = new Set([PV.cur && PV.cur.id, PV.board && PV.board.id, PV.over && PV.over.id, PLUME.on ? PLUME_ID : null, ...PV.soon]);
    while (PV.vids.size + FF.w.length >= MAX_VID) {   // the flame family's two are permanent: they count
      const old = [...PV.vids.entries()].filter(([k]) => !keep.has(k)).sort((a, b) => a[1].used - b[1].used)[0];
      if (!old) return;
      dropClip(old[0], old[1]);
    }
    const el = document.createElement('video');
    el.muted = true; el.defaultMuted = true; el.playsInline = true; el.setAttribute('playsinline', ''); el.setAttribute('muted', '');
    el.preload = 'auto'; el.crossOrigin = 'anonymous';
    const v = { el, used: performance.now(), failed: false };
    const src = clipSrc(id);
    el.addEventListener('error', () => { v.failed = true; PV.missing.add(src); dropClip(id, v); }, { once: true });
    // hold the first frame, the way the bird pages do: seek just past zero
    el.addEventListener('loadeddata', () => { try { if (el.paused && el.seekable && el.seekable.length && el.seekable.end(0) > 0.1) el.currentTime = 0.001; } catch (e) { /* fine */ } }, { once: true });
    el.src = src;
    clipBox.appendChild(el);
    PV.vids.set(id, v);
  }
  // keep these loaded (in order of need), within the cap. soon: these are the engine's next moments, held until used.
  function clipsAhead(ids, soon) {
    if (soon) PV.soon = ids.filter((id) => clipKnown(id) || id.startsWith('real:'));
    ids.forEach((id) => loadClip(id));
  }
  function clipCueFx(name) {
    const lit = (i) => { G.candleOutT[i] = 0; G.candleOut[i] = 0; FL[i].h = 1; FL[i].hT = 1; A.ignite(); rumble(80, 0.2, 0.3); };
    const out = (i) => { G.candleOutT[i] = 1; G.candleOut[i] = 1; };
    ({
      left: () => lit(0), right: () => lit(1), outL: () => out(0), outR: () => out(1),
      out: () => { out(0); out(1); }, gust: () => A.gust(1), strike: () => A.strike(),
    }[name] || (() => {}))();
  }
  // Play a table clip. Resolves true when it has played to its end (a loop: once it is showing), false at once when the
  // clip is not there or not ready, so the caller does what the engine did before clips. extra: [[seconds, fn], ...]
  // A stopped night never plays the next clip, and a sequence waiting on one ends in HALTED when it is over.
  function playPlate(id, extra) {
    if (halt) return Promise.reject(HALTED);
    const g = haltGen;
    return playPlateNow(id, extra).then((ok) => { checkHalt(g); return ok; });
  }
  function playPlateNow(id, extra) {
    const def = CLIP_DEF[id];
    if (FF.want) return Promise.resolve(false);   // the flame family has the candles: the engine's own way, with its flames
    if (!def || !clipReady(id) || PV.aspect !== SC) { if (def) loadClip(id); return Promise.resolve(false); }
    const v = PV.vids.get(id), el = v.el; v.used = performance.now();
    const prev = PV.cur;
    return new Promise((res) => {
      const dur = isFinite(el.duration) && el.duration > 0 ? el.duration : 4;
      const set = clipSet('table'), m = set && set[id], mc = m && typeof m === 'object' && m.cues;
      const cues = (mc ? Object.entries(mc).map(([k, t]) => [t, k]) : (def.cues || []).map(([f, k]) => [f * dur, k]))
        .map(([t, k]) => ({ t, fn: () => clipCueFx(k) })).concat((extra || []).map(([t, fn]) => ({ t, fn }))).sort((a, b) => a.t - b.t);
      el.loop = !!def.loop;
      try { el.currentTime = 0; } catch (e) { /* fine */ }
      const cur = PV.cur = { id, el, def, cues, res: null, t0: performance.now(), dur };
      el.play().then(() => {
        if (prev && prev.el !== el) { try { prev.el.pause(); } catch (e) { /* fine */ } }
      }).catch(() => { if (PV.cur === cur) { PV.cur = prev; } res(false); });
      clipsAhead(AHEAD[id] || []);
      if (def.loop) { PV.key = def.to; res(true); return; }
      cur.res = res;
      cur.safety = setTimeout(() => clipEnded(cur), (dur + 2.5) * 1000);   // a stalled clip never holds the table
      el.onended = () => clipEnded(cur);
    });
  }
  function clipEnded(cur) {
    if (PV.cur !== cur || cur.done) return;
    cur.done = true; clearTimeout(cur.safety); cur.el.onended = null;
    while (cur.cues.length) cur.cues.shift().fn();   // anything the clip did not reach still happens
    PV.key = cur.def.to;
    // the successor starts on this clip's last frame, so the switch is invisible; without it the shared still holds
    const nx = cur.def.next;
    if (nx && clipReady(nx)) playPlate(nx);
    else PV.cur = null;
    if (cur.res) cur.res(true);
  }
  // Back to the still and the engine's own flames (a moment that has no clip of its own).
  function plateStill(key) {
    if (PV.cur) { try { PV.cur.el.pause(); } catch (e) { /* fine */ } clearTimeout(PV.cur.safety); PV.cur = null; }
    PV.key = key || 'lit';
  }
  // The table on screen carries its own fire (a clip, or a shared still with its candles in it): no sprite flames.
  function plateFire() {
    if (FF.want) return false;
    if (PV.cur && PV.cur.el.readyState >= 2) return true;
    return !!PV.keys[PV.key];
  }
  // Clips that start and end on the board itself, drawn over the live board (embers through the letters).
  function playBoard(name, extra) {
    const id = 'board:' + name;
    if (!clipReady(id)) { loadClip(id); return Promise.resolve(false); }
    const v = PV.vids.get(id), el = v.el; v.used = performance.now();
    return new Promise((res) => {
      el.loop = false; try { el.currentTime = 0; } catch (e) { /* fine */ }
      const cur = PV.board = { id, el, cues: (extra || []).map(([t, fn]) => ({ t, fn })), res };
      const end = () => { if (PV.board === cur) PV.board = null; el.onended = null; res(true); };
      el.onended = end; setTimeout(end, ((isFinite(el.duration) ? el.duration : 6) + 2) * 1000);
      el.play().catch(() => { if (PV.board === cur) PV.board = null; res(false); });
    });
  }
  // An overlay film shot on black (the hand out of the board), drawn with screen blend: black is nothing.
  // next: an overlay that starts the moment this one ends (the smoke settling after it has poured). pingpong: it is played forward, then
  // backward, then forward (never hard-looped: the house's thread of smoke).
  function playOver(name, place, next, pingpong) {
    const id = 'real:' + name;
    if (!clipReady(id)) { loadClip(id); return null; }
    const v = PV.vids.get(id), el = v.el; v.used = performance.now();
    el.loop = false; try { el.currentTime = 0; } catch (e) { /* fine */ }
    const cur = PV.over = { id, el, place, a: 1, pingpong: !!pingpong, rev: false, next: !!(next && clipKnown('real:' + next)) };
    el.play().catch(() => { if (PV.over === cur) PV.over = null; });
    el.onended = () => { if (PV.over !== cur || cur.pingpong) return; PV.over = null; if (next && S.possessing) playOver(next, place); };
    return cur;
  }
  // Cue points are checked every frame (timeupdate comes four times a second, which is too late for a match).
  function clipTick(dt) {
    if (PV.aspect !== SC || (PL && PV.place !== PL.id)) clipReset();
    // a ping-pong overlay (the thread of smoke): at its end it is stepped backward, frame by frame, to its start, and played forward again
    const o = PV.over;
    if (o && o.pingpong && o.el.readyState >= 2) {
      try {
        if (o.rev) { o.el.currentTime = Math.max(0, o.el.currentTime - (dt || 0.016)); if (o.el.currentTime <= 0.05) { o.rev = false; o.el.play().catch(() => {}); } }
        else if (o.el.ended || (isFinite(o.el.duration) && o.el.currentTime >= o.el.duration - 0.05)) { o.rev = true; o.el.pause(); }
      } catch (e) { /* a seek that did not take: the next frame tries again */ }
    }
    for (const c of [PV.cur, PV.board]) {
      if (!c || !c.cues || !c.cues.length) continue;
      const t = c.el.currentTime;
      while (c.cues.length && t >= c.cues[0].t) c.cues.shift().fn();
    }
  }
  // Where the film sits in the world: the whole wide table, or the middle 9:16 of the upright one.
  function plateRect(el, f) {
    const x0 = WORLD.w / 2 * (1 - f), y0 = WORLD.h / 2 * (1 - f), w = WORLD.w * f, h = WORLD.h * f;
    if (SC !== 'port') return [x0, y0, w, h];
    const ar = (el.videoWidth || el.naturalWidth || 9) / (el.videoHeight || el.naturalHeight || 16);
    const hh = Math.min(h, w / ar);
    return [x0, y0 + (h - hh) / 2, w, hh];
  }

  // ---------------------------------------------------------------- the flame family (Pierce's birds technique, per wick)
  // One flame filmed on black, cut into moves that all start and end on one frame: the flame at rest, centred. The moves
  // sit back to back in one sprite video per place (PL.clips.flames; places.js says how it is cut), and each wick plays
  // its own copy. A move is a seek to its start and a play to its end; whatever comes next (the idle, another move)
  // starts on the frame the last one ended on, so nobody sees a cut. The idle is a palindrome and loops the same way.
  // A move that cannot wait for that frame (a breath in the middle of the idle) holds what is on screen and dissolves
  // into the move over FAM_FADE ms: never black, never a jump. Each frame is made small and offscreen (the dissolve, the
  // mirror, the blue), then screened onto its wick, turned by the candle's tilt, sized by its length. The engine says
  // what happens (a candle lit or out, a breath, the gutter, the lean, a scare) and the family shows it.
  // Without a flames entry, or if the video fails, none of this runs and the candles burn exactly as before.
  const FAM_FADE = 120, FAM_PX = 640;
  const famFps = () => (FF.m && FF.m.fps) || 30;
  const famOn = () => FF.on && !!FLAMES;
  function famManifest() { const c = PL && PL.clips; return (c && c.flames) || null; }
  function famSrc(m) {
    const list = (Array.isArray(m.src) ? m.src : [m.src]).filter(Boolean);
    const probe = document.createElement('video');
    const f = list.find((s) => probe.canPlayType(/\.webm($|\?)/.test(s) ? 'video/webm' : 'video/mp4')) || '';
    return !f ? '' : /^(blob:|data:|https?:|\/)/.test(f) ? f : 'assets/clips/' + PL.id + '/' + f;
  }
  function famDrop() {
    FF.w.forEach((w) => {
      w.gone = true;
      if (w.blow) { const r = w.blow; w.blow = null; r(); }
      try { w.el.pause(); w.el.removeAttribute('src'); w.el.load(); w.el.remove(); } catch (e) { /* gone */ }
    });
    FF.w = []; FF.want = FF.on = false; FF.mix = 0; FF.later = [];
  }
  // a film that will not load or will not play: the engine's flames take the candles back, as if it had never been
  function famFail(why) { FF.failed = why || true; famDrop(); }
  // a new place, or a manifest from the debug page: the family is built (or taken down) to match
  function famSync() {
    const m = famManifest(), place = PL ? PL.id : '';
    if (m === FF.m && place === FF.place) return;
    famDrop(); FF.m = m; FF.place = place; FF.failed = false; FF.gut = G.gutter; FF.lean = G.leanTo;
    if (!m || !m.seg || !m.seg.idle || !m.seg.out || !m.seg.ignite || !m.anchor || !m.tip) return;
    const src = famSrc(m); if (!src) return;
    FF.want = true; FF.ref = +m.lum > 0 ? +m.lum : 0; FF.refN = 0;
    if (FF.tint == null) { try { const g = document.createElement('canvas').getContext('2d'); g.globalCompositeOperation = 'color'; FF.tint = g.globalCompositeOperation === 'color'; } catch (e) { FF.tint = false; } }
    // the table's own film carries its own flames, and two of the four decoders are the flames' now: it stands down
    if (PV.cur && tableClip(PV.cur.id)) plateStill();
    for (const [id, v] of [...PV.vids]) if (tableClip(id)) dropClip(id, v);
    FF.w = [0, 1].map((i) => famWick(i, src, m));
  }
  function famWick(i, src, m) {
    const el = document.createElement('video');
    el.muted = true; el.defaultMuted = true; el.playsInline = true; el.setAttribute('playsinline', ''); el.setAttribute('muted', '');
    el.preload = 'auto'; el.crossOrigin = 'anonymous'; el.loop = false;
    // base: the second wick shows its flame mirrored, so the two candles are never the same picture
    const w = {
      i, el, ready: false, drawn: false, st: 'load', seg: '', s0: 0, s1: 0, mirror: false, pri: 0, pend: null,
      base: Array.isArray(m.flip) ? !!m.flip[i] : i === 1, rate: i ? 0.94 : 1, sync: i, mt: 0, mtAt: -1e9, rvfc: false,
      seeking: false, seekT: 0, seekAt: 0, seekDone: 0, fade: false, fadeAt: -1, lv: 0, deadAt: -1e9, leanAt: 0,
      blow: null, gone: false, lastT: -1, lastTAt: 0, kicks: 0, playAt: 0, outDir: 1, out: null,
    };
    el.addEventListener('error', () => { if (!w.gone) famFail('error'); }, { once: true });
    el.addEventListener('loadeddata', () => { if (!w.gone) famReady(w); }, { once: true });
    el.addEventListener('seeked', () => { w.seekDone = performance.now(); });
    // the frame actually on show (requestVideoFrameCallback): when a seek has landed, and where a segment is
    if (el.requestVideoFrameCallback) {
      w.rvfc = true;
      const tick = (now, md) => {
        if (w.gone) return;
        w.mt = md.mediaTime; w.mtAt = performance.now();
        if (w.seeking && md.mediaTime >= w.seekT - 0.6 / famFps() && md.mediaTime < w.seekT + 0.4) famLanded(w, 'frame');
        el.requestVideoFrameCallback(tick);
      };
      el.requestVideoFrameCallback(tick);
    }
    el.src = src; clipBox.appendChild(el);
    return w;
  }
  function famReady(w) {
    w.ready = true;
    if (G.candleOutT[w.i] >= 1) famCold(w); else famIdle(w, false);
  }
  function famSeek(w, t) {
    w.seeking = true; w.seekT = t; w.seekAt = performance.now(); w.seekDone = 0;
    try { w.el.currentTime = t; } catch (e) { w.seeking = false; }
  }
  function famLanded(w, by) {
    w.seeking = false; if (w.fade) w.fadeAt = performance.now(); w.lastT = -1;
    FF.seeks.push([Math.round(performance.now() - w.seekAt), by]); if (FF.seeks.length > 200) FF.seeks.shift();
  }
  function famPlayEl(w) {
    w.playAt = performance.now();
    const p = w.el.play(); if (p && p.catch) p.catch(() => { /* tried again from famUpdate */ });
  }
  // Play segment `name` from its start (or from `at`). boundary: the frame on screen is the shared one (the last move
  // ended on it), so the new segment simply follows; otherwise what is on screen is held and dissolved into it.
  function famStart(w, name, mirror, pri, boundary, at) {
    const s = FF.m.seg[name]; if (!s || w.gone) return false;
    const fade = (!boundary || mirror !== w.mirror) && w.drawn;
    if (fade) { w.hg.globalCompositeOperation = 'copy'; w.hg.drawImage(w.cv, 0, 0); w.hg.globalCompositeOperation = 'source-over'; }
    FF.log.push({ t: performance.now(), i: w.i, from: w.seg, to: name, fade, mirror }); if (FF.log.length > 400) FF.log.shift();
    w.seg = name; w.s0 = s[0]; w.s1 = s[1]; w.mirror = mirror; w.pri = pri; w.fade = fade; w.fadeAt = -1;
    w.st = name === 'idle' ? 'idle' : 'move'; w.kicks = 0;
    w.from = at ?? s[0];
    famSeek(w, w.from + 0.25 / famFps());
    w.el.playbackRate = w.rate;
    famPlayEl(w);
    return true;
  }
  // the idle, from one of its rest frames (idleSync): the two wicks take different ones, so they never breathe in step
  function famIdle(w, boundary) {
    const m = FF.m, s = m.seg.idle;
    const sy = (Array.isArray(m.idleSync) && m.idleSync.length ? m.idleSync : [s[0]]).filter((t) => t >= s[0] && t < s[1]);
    famStart(w, 'idle', w.base, 0, boundary, sy.length ? sy[w.sync++ % sy.length] : s[0]);
  }
  // out of sight on the unlit wick (the start of a night, the silence): the last frame of out, paused, not drawn
  function famCold(w) {
    const s = FF.m.seg.out;
    w.el.pause(); w.st = 'cold'; w.seg = 'out'; w.s0 = s[0]; w.s1 = s[1]; w.pri = 0; w.pend = null; w.fade = false; w.deadAt = -1e9; w.mirror = w.base;
    famSeek(w, s[1] - 0.5 / famFps());
  }
  // which way (dx, dy) on screen is for wick i, in its own picture (the flame is drawn turned by the candle's tilt):
  // 'right' or 'left' of the flame
  function famSide(i, dx, dy) {
    const th = (FLAMES && FLAMES[i] && FLAMES[i].tilt) || 0;
    return dx * Math.cos(th) + dy * Math.sin(th) >= 0 ? 'right' : 'left';
  }
  // a side as [segment, mirrored]: the clip of that side, or the other side's clip mirrored. Whichever keeps the wick
  // as it is (mirrored or not) wins, so the cut needs no dissolve. Up and down are the same both ways.
  function famSided(w, side) {
    if (side === 'up' || side === 'down') return FF.m.seg[side] ? [side, w.base] : null;
    const other = side === 'right' ? 'left' : 'right';
    const opts = [[side, false], [other, true]].filter(([n]) => FF.m.seg[n]);
    return opts.find(([, mir]) => mir === w.base) || opts[0] || null;
  }
  // toward the planchette, from wick i, as the player sees it: the side of the candle it is on (the flame reaches that
  // way), or down when it is nearly straight under the flame (up, over it)
  function famToward(w) {
    const b = plateMap(FLAMES[w.i]), dx = BOARD.cx + P.x * BOARD.s - b.x, dy = BOARD.cy + P.y * BOARD.s - b.y;
    if (Math.abs(dx) < 0.35 * Math.hypot(dx, dy)) return famSided(w, dy > 0 ? 'down' : 'up');
    return famSided(w, famSide(w.i, dx, 0));
  }
  // Ask wick i for a move. A stronger move cuts in now (dissolving); a weaker one waits for the end of what plays and
  // follows it on the shared frame. pri: 1 the lean, 2 a breath or the gutter, 3 a scare, 4 out and ignite.
  function famMove(i, name, o = {}) {
    const w = famOn() && FF.w[i];
    if (!w || !FF.m.seg[name] || w.st === 'dead' || w.st === 'cold' || w.st === 'load' || w.seg === 'out') return false;
    const pri = o.pri || 1, mirror = o.mirror ?? w.base;
    if (w.st === 'idle' || pri > w.pri) return famStart(w, name, mirror, pri, false);
    if (!w.pend || pri >= w.pend.pri) w.pend = { name, mirror, pri };
    return true;
  }
  // The second candle answers 60 to 200 ms after the first (timed on the frame clock, not a timer a busy page delays):
  // the two flames never move as one.
  const famLater = (fn) => FF.later.push({ at: performance.now() + rnd(60, 175), fn });
  // both wicks, the first at once and the other a beat later (only: one wick)
  function famBoth(name, pri, only) {
    const order = only != null ? [only] : (Math.random() < 0.5 ? [0, 1] : [1, 0]);
    order.forEach((i, k) => { const go = () => famMove(i, name, { pri }); if (k) famLater(go); else go(); });
  }
  // a breath across the table, toward dx on screen: the nearer candle first
  function famGust(dx) {
    if (!famOn()) return;
    const xs = FLAMES.map((f) => plateMap(f).x), order = [0, 1].sort((a, b) => (xs[a] - xs[b]) * (dx >= 0 ? 1 : -1));
    order.forEach((i, k) => {
      const go = () => { const w = FF.w[i], sd = w && famSided(w, famSide(i, dx, 0)); if (sd) famMove(i, sd[0], { mirror: sd[1], pri: 2 }); };
      if (k) famLater(go); else go();
    });
  }
  // a scare's peak: both flames jump
  function famJump() { if (famOn()) famBoth('up', 3); }
  // blown out toward dir on screen (out is cut blowing to m.outSide; the other way it is mirrored). Resolves when it is out.
  function famBlow(i, dir, dur) {
    const w = FF.w[i], side = famSide(i, dir, 0);
    return new Promise((res) => {
      if (w.blow) { const r = w.blow; w.blow = null; r(); }
      w.blow = res; w.outDir = side === 'right' ? 1 : -1;
      famStart(w, 'out', side !== (FF.m.outSide || 'right'), 4, false);
      if (dur < 400) w.el.playbackRate = 2 * w.rate;   // a snuff, not a death
    });
  }
  function famOut(w, dir) {
    const side = famSide(w.i, dir, 0); w.outDir = side === 'right' ? 1 : -1;
    famStart(w, 'out', side !== (FF.m.outSide || 'right'), 4, false);
  }
  function famIgnite(w) { famStart(w, 'ignite', w.base, 4, w.st === 'dead' || w.st === 'cold'); }
  // a segment has reached its last frame (the shared one): out rests on the wick; anything else goes on to what waits,
  // the lean while it holds, or the idle
  function famEnd(w, stale) {
    if (w.seg === 'out') {
      w.el.pause(); famSeek(w, w.s1 - 0.5 / famFps()); w.st = 'dead'; w.deadAt = G.t; w.pri = 0; w.pend = null;
      if (w.blow) { G.candleOutT[w.i] = 1; G.candleOut[w.i] = 1; const r = w.blow; w.blow = null; r(); }
      return;
    }
    const p = w.pend; w.pend = null;
    if (p && FF.m.seg[p.name]) { famStart(w, p.name, p.mirror, p.pri, !stale); return; }
    if (G.leanTo && FLAMES) { const d = famToward(w); if (d) { famStart(w, d[0], d[1], 1, !stale); return; } }
    famIdle(w, !stale);
  }
  // how much light the flame throws, as the film shows it: 1 at rest, more as it jumps, less pressed down, none out
  const smooth01 = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  // What the film itself is showing: the mean light of the frame that is on the wick (the channels squared, near enough to light), read
  // from a copy cut down by four three times so no flame is missed. -1 when the browser will not hand pixels back (then the curves
  // below stand in). The light of a candle going out or catching is this and nothing else: a flame that is not in the picture throws none.
  function famLum(w) {
    if (w.noLum || !w.drawn) return -1;
    try {
      if (!w.lq) {
        const mk = (cw, ch) => { const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(cw)); c.height = Math.max(2, Math.round(ch)); const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; return { c, g }; };
        w.lq = [mk(w.cv.width / 4, w.cv.height / 4), mk(w.cv.width / 16, w.cv.height / 16), mk(w.cv.width / 64, w.cv.height / 64)];
      }
      let src = w.cv;
      for (const q of w.lq) { q.g.globalCompositeOperation = 'copy'; q.g.drawImage(src, 0, 0, q.c.width, q.c.height); src = q.c; }
      const q = w.lq[2], d = q.g.getImageData(0, 0, q.c.width, q.c.height).data;
      let sum = 0; for (let i = 0; i < d.length; i += 4) sum += (d[i] * d[i] + d[i + 1] * d[i + 1] + d[i + 2] * d[i + 2]) / 765;
      return sum / (d.length / 4);
    } catch (e) { w.noLum = true; return -1; }
  }
  // the film's light as a fraction of a flame at rest (the manifest's `lum` says what rest is, and the idle teaches it too), or -1
  function famFilm(w) {
    const ref = FF.ref;
    if (!(w.lum >= 0) || !(ref > 0)) return -1;
    return clamp((w.lum / ref - 0.03) / 0.97, 0, 1);
  }
  function famLevel(w, t) {
    if (w.st === 'cold' || w.st === 'dead' || w.st === 'load') return 0;
    const p = clamp((t - w.s0) / Math.max(0.01, w.s1 - w.s0), 0, 1), bell = Math.sin(Math.PI * p), film = famFilm(w);
    switch (w.seg) {
      case 'up': return 1 + 0.3 * bell;
      case 'down': return 1 - 0.45 * bell;
      case 'right': case 'left': return 1 - 0.12 * bell;
      // the flame as the picture has it. (Without pixels, the curves are cut to this film: it burns on for a third of the move, then goes
      // by the half; it sits as an ember for half of the catch before it takes.)
      case 'out': return film >= 0 ? film : 1 - smooth01(0.31, 0.5, p);
      case 'ignite': return (film >= 0 ? film : smooth01(0.48, 0.78, p)) * (1 + 0.2 * Math.sin(Math.PI * smooth01(0.62, 0.95, p)));
      default: return 1;
    }
  }
  // how much of the wick's picture is drawn: the ember a blown candle leaves cools away over two and a half seconds
  function famAlpha(w) {
    if (w.st === 'cold' || w.st === 'load') return 0;
    if (w.st === 'dead') return Math.max(0, 1 - (G.t - w.deadAt) / 2500);
    return 1;
  }
  // the light pass: the family's level in place of the engine's flame height, once the family has the candles
  const famLight = (i, eng) => { const w = famOn() && FF.w[i]; return w ? lerp(eng, w.lv, FF.mix) : eng; };
  // The room's darkness as the flames have it (drawLight lays it under every candle's own light). One candle out is the dimmer room (0.42 of the
  // way to black), both out is black. It is read from the light each flame throws this moment, never from what the house decided: a table
  // whose flames have gone out is dark when they have, and one whose wick has not caught yet stays dark until it does. A flame that is only
  // pressed or leaning (more than 0.6 of its light) does not move it: that is the candle's own pool shrinking, as it always was.
  function famBlack() {
    if (!famOn()) return 0;
    const u = [0, 1].map((i) => 1 - smooth01(0, 0.6, clamp(famLight(i, 1 - G.candleOut[i]), 0, 1)));
    return 0.42 * (u[0] + u[1]) + 0.16 * u[0] * u[1];
  }
  // No frame edge, at any brightness (Pierce, 2026-10-04: "look how bad these two rectangles are for flames"). The film's black is not quite
  // black (a floor of 2 to 9 in 255, more where the codec smears), and a move's flare can reach the frame's own edge; screened onto the table
  // either one showed as a lighter rectangle round each flame. What is drawn is a copy of the wick's frame (the frame itself stays as the film
  // has it: famLum reads the light from it, and a cut holds it): its floor taken off (min(v, floor) subtracted, with 'darken' then
  // 'difference': no pixel loops), then laid under a soft oval that is whole over the flame and its smoke and nothing at the frame's edges.
  // The oval is the frame's own: centred on the wick's column, a little above the flame's middle, falling off from half way out.
  const FAM_FLOOR = 12, FAM_OVAL = { cy: 0.45, in: 0.52, out: 0.985 };
  function famOval(cw, ch, cxp) {
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const g = c.getContext('2d'), cy = ch * FAM_OVAL.cy, rx = Math.min(cxp, cw - cxp);
    // the top and the bottom halves each reach their own edge (the flame stands above its middle, the wick below it)
    [[0, cy, cy], [cy, ch - cy, ch - cy]].forEach(([y0, h, ry]) => {
      g.save(); g.beginPath(); g.rect(0, y0, cw, h); g.clip();
      g.translate(cxp, cy); g.scale(rx, ry);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
      for (let k = 0; k <= 8; k++) {
        const r = FAM_OVAL.in + (FAM_OVAL.out - FAM_OVAL.in) * (k / 8), t = k / 8;
        gr.addColorStop(r, `rgba(0,0,0,${(1 - t * t * (3 - 2 * t)).toFixed(4)})`);
      }
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(-2, -2, 4, 4);
      g.restore();
    });
    return c;
  }
  function famClean(w) {
    const cw = w.cv.width, ch = w.cv.height;
    if (!w.pc || w.pc.width !== cw || w.pc.height !== ch) {
      const mk = () => { const c = document.createElement('canvas'); c.width = cw; c.height = ch; return c; };
      w.pc = mk(); w.pg = w.pc.getContext('2d'); w.kc = mk(); w.kg = w.kc.getContext('2d');
      w.oval = famOval(cw, ch, w.half * w.cs); w.pcOk = false;
    }
    try {
      const k = w.kg, p = w.pg;
      k.globalCompositeOperation = 'copy'; k.drawImage(w.cv, 0, 0);
      k.globalCompositeOperation = 'darken'; k.fillStyle = `rgb(${FAM_FLOOR},${FAM_FLOOR},${FAM_FLOOR})`; k.fillRect(0, 0, cw, ch);
      p.globalCompositeOperation = 'copy'; p.drawImage(w.cv, 0, 0);
      p.globalCompositeOperation = 'difference'; p.drawImage(w.kc, 0, 0);
      p.globalCompositeOperation = 'destination-in'; p.drawImage(w.oval, 0, 0);
      p.globalCompositeOperation = 'source-over';
      w.pcOk = true;
    } catch (e) { w.pcOk = false; }
  }
  // The wick's frame as it will be drawn, made small and offscreen: the video (mirrored about the wick when it is),
  // dissolving out of the held frame after a cut, recoloured blue or green with the 'color' blend (no pixel loops).
  function famRender(w, kind) {
    const el = w.el, vw = el.videoWidth, vh = el.videoHeight;
    if (!vw || !vh) return;
    if (!w.cv || w.vw !== vw || w.vh !== vh) {
      const ax = FF.m.anchor[0], half = Math.max(ax, 1 - ax) * vw, s = Math.min(1, FAM_PX / Math.max(half * 2, vh));
      w.vw = vw; w.vh = vh; w.half = half; w.cs = s; w.ox = (half - ax * vw) * s;
      const mk = () => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(half * 2 * s)); c.height = Math.max(1, Math.round(vh * s)); return c; };
      w.cv = mk(); w.g = w.cv.getContext('2d'); w.hold = mk(); w.hg = w.hold.getContext('2d'); w.tc = mk(); w.tg = w.tc.getContext('2d');
      w.drawn = false;
    }
    // (2026-10-05: copying only on the film's new frames was tried, and the flame's frame showed as a faint box now and then: every frame)
    if (!w.seeking && el.readyState >= 2) {
      const g = w.g, cw = w.cv.width, ch = w.cv.height;
      const k = w.fade ? (w.fadeAt < 0 ? 0 : Math.min(1, (performance.now() - w.fadeAt) / FAM_FADE)) : 1;
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      if (k < 1) g.drawImage(w.hold, 0, 0);
      else { g.fillStyle = '#000'; g.fillRect(0, 0, cw, ch); }   // black beside a frame narrower than the canvas: nothing, screened
      g.globalAlpha = k;
      if (w.mirror) g.setTransform(-1, 0, 0, 1, cw, 0);
      try { g.drawImage(el, w.ox, 0, vw * w.cs, vh * w.cs); w.drawn = true; } catch (e) { /* no frame yet */ }
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
      if (k >= 1) w.fade = false;
      // (what is in the picture now is what lights the room: read while the flame is going out or catching, and now and then at rest, to learn
      // what rest is; the rest of the time nothing is read back)
      // (at rest only until rest is learned: reading pixels back holds a phone's frame up, so it stops once the flame at rest is known)
      if ((w.st === 'move' && (w.seg === 'out' || w.seg === 'ignite')) || (w.st === 'idle' && (FF.refN || 0) < 12 && (w.lumN = (w.lumN || 0) + 1) % 8 === 0)) { w.lum = famLum(w); w.lumNew = true; }
      if (w.drawn) famClean(w);
    }
    w.out = w.pc && w.pcOk ? w.pc : w.cv;
    if (kind && FF.tint && w.drawn) {
      const tg = w.tg;
      tg.globalCompositeOperation = 'copy'; tg.drawImage(w.out, 0, 0);
      tg.globalCompositeOperation = 'color'; tg.fillStyle = kind === 'green' ? 'rgb(60,235,120)' : 'rgb(70,135,255)';
      tg.fillRect(0, 0, w.tc.width, w.tc.height); tg.globalCompositeOperation = 'source-over';
      w.out = w.tc;
    }
  }
  // Every frame (from frame(), before drawing): build or drop the family, land seeks, end segments, follow the engine.
  function famUpdate(dt) {
    famSync();
    if (!FF.want) return;
    const now = performance.now(), fps = famFps(), kind = G.flame === 'green' ? 'green' : G.flame === 'blue' ? 'blue' : '';
    for (const w of FF.w) {
      if (!w.ready || w.gone) continue;
      if (w.seeking) {
        const since = w.seekDone ? now - w.seekDone : -1;
        // the frame itself says so (above); else 'seeked' and a beat for the frame to be painted (a paused seek may
        // never call back); else it has taken too long
        const beat = !w.rvfc ? 0 : w.el.paused ? 60 : 250;
        if ((since >= 0 && since >= beat) || now - w.seekAt > 900) famLanded(w, since >= 0 ? 'seeked' : 'timeout');
      }
      // Where the segment is: the frame actually on show (requestVideoFrameCallback), never the clock. A busy phone
      // can paint frames a third of a second behind currentTime; cutting on the clock cut mid-move, a visible jump.
      const t = w.rvfc ? w.mt : w.el.currentTime;
      const inSeg = !w.seeking && t >= (w.from ?? w.s0) - 1 / fps && t < w.s1 + 0.5;   // (a frame from before the seek is not this segment's)
      if (!w.seeking && (w.st === 'idle' || w.st === 'move')) {
        // (the file's own end is the last segment's end: its last frame is the shared one)
        if ((inSeg && t >= w.s1 - (w.rvfc ? 1.5 : 0.6) / fps) || w.el.ended) famEnd(w);
        else if (!document.hidden) {
          // a play that was refused, or a picture that has stopped while it should play (a starved decoder): past the
          // segment's end by the clock, go on to what comes next, dissolving (the frame on show is not the shared one);
          // before it, nudge the film where its picture is. Four nudges in one segment and the family stands down.
          if (w.el.paused && !w.el.ended && now - w.playAt > 500) famPlayEl(w);   // (play() on an ended film restarts it at 0)
          if (t !== w.lastT) { w.lastT = t; w.lastTAt = now; }
          else if (now - w.lastTAt > (w.rvfc ? 500 : 1500)) {
            w.lastTAt = now;
            if (++w.kicks > 4) { famFail('stalled'); return; }
            if (w.el.currentTime >= w.s1 - 1 / fps) famEnd(w, true);
            else { famSeek(w, inSeg ? t + 1 / fps : (w.from ?? w.s0) + 0.25 / fps); famPlayEl(w); }
          }
        }
      }
      if (w.gone) return;
      // the engine's truth: a candle lit, or out
      const lit = G.candleOutT[w.i] < 1;
      if (lit && (w.st === 'dead' || w.st === 'cold')) famIgnite(w);
      else if (lit && w.seg === 'out' && w.st === 'move' && !w.blow) famIgnite(w);
      else if (!lit && (w.st === 'idle' || (w.st === 'move' && w.seg !== 'out'))) {
        if (G.flameLevel < 0.02 || G.candleOut[w.i] > 0.98) famCold(w); else famOut(w, Math.random() < 0.5 ? -1 : 1);
      }
      // the picture first, then the light that picture throws (a flame that is not drawn throws none)
      famRender(w, kind);
      // the idle is a flame at rest: it teaches what rest looks like (the first few frames quickly, then slowly), unless the manifest said
      if (w.lumNew && w.st === 'idle' && w.seg === 'idle' && !w.seeking && inSeg && w.lum > 0.05) {
        if (!FF.ref) { FF.ref = w.lum; FF.refN = 1; }
        else { FF.refN++; FF.ref = lerp(FF.ref, w.lum, FF.refN < 6 ? 0.3 : 0.03); }
      }
      w.lumNew = false;
      w.lv = lerp(w.lv, famLevel(w, inSeg ? t : (w.from ?? w.s0)), 1 - Math.exp(-dt * 20));
    }
    const was = FF.on;
    FF.on = FF.w.length === 2 && FF.w.every((w) => w.drawn);
    if (!FF.on) return;
    // the engine's flames hand over to the film (at once if nothing is burning)
    FF.mix = !was && G.candleOutT.every((o) => o >= 1) ? 1 : Math.min(1, FF.mix + dt * 4);
    // the second candle's answer, when its beat comes
    if (FF.later.length) { const due = FF.later.filter((x) => now >= x.at); FF.later = FF.later.filter((x) => now < x.at); due.forEach((x) => x.fn()); }
    // it presses down when it is close (the gutter: one candle, or both when it came from the room)
    if (G.gutter > FF.gut + 0.25) { const who = G.gutterWho; famBoth('down', 2, who == null || who < 0 ? null : who); }
    FF.gut = G.gutter;
    // it pulls the flames toward the planchette, again and again while it holds
    if (G.leanTo && !FF.lean) { const a = Math.random() < 0.5 ? 0 : 1; FF.w[a].leanAt = G.t; FF.w[1 - a].leanAt = G.t + rnd(60, 175); }
    FF.lean = G.leanTo;
    if (G.leanTo && FLAMES) FF.w.forEach((w) => { if (w.st === 'idle' && G.t >= w.leanAt) { const d = famToward(w); if (d) famStart(w, d[0], d[1], 1, false); } });
  }
  // Screened onto the wicks: the frame's anchor on the wick, its rest length the candle's flame length, turned by the
  // tilt, exactly where the photographed flame burned.
  function famDraw(fl, mix) {
    const m = FF.m, [ax, ay] = m.anchor, [tx, ty] = m.tip, hs = 0.6 + 0.4 * Math.min(1, fl), fa = Math.min(1, 0.35 + 0.65 * fl);
    FLAMES.forEach((f0, i) => {
      const w = FF.w[i]; if (!w || !w.out) return;
      const a = famAlpha(w) * fa * mix; if (a < 0.02) return;
      const lf = Math.hypot((tx - ax) * w.vw, (ty - ay) * w.vh) || 1;
      const b = plateMap(f0), p = worldToScreen(b.x, b.y), k = ((f0.len * plateScale() * CAM.s * DPR) / lf) * hs;
      cx.save(); cx.globalCompositeOperation = 'screen'; cx.globalAlpha = Math.min(1, a);
      cx.translate(p.x * DPR, p.y * DPR); cx.rotate(f0.tilt || 0); cx.scale(k, k);
      cx.drawImage(w.out, -w.half, -ay * w.vh, w.half * 2, w.vh);
      cx.restore();
    });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    FF.w.forEach((w) => { if (!w.gone && !w.el.ended && (w.st === 'idle' || w.st === 'move')) { w.lastTAt = performance.now(); famPlayEl(w); } });
  });

  function updateFlames(dt) {
    FL.forEach((F, i) => {
      F.h = lerp(F.h, F.hT, 1 - Math.exp(-dt * 7));
      let lt = F.gust;
      // (in the dead stretch the two flames lean toward the planchette, together, a little more each second: half as far as the possession's)
      const deadLean = DR.deadUntil && G.t < DR.deadUntil ? 0.5 * clamp((G.t - DR.deadFrom) / 45000, 0, 1) : 0;
      if ((G.leanTo || deadLean > 0) && FLAMES) {
        // lean toward the planchette, as if it pulled the air
        const b = plateMap(FLAMES[i]), px = BOARD.cx + P.x * BOARD.s, py = BOARD.cy + P.y * BOARD.s;
        const want = Math.atan2(px - b.x, -(py - b.y));
        let d = want - FLAMES[i].tilt; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        lt += clamp(d * 0.55, -0.85, 0.85) * (G.leanTo ? 1 : deadLean);
      }
      // the house that has been let in: the right flame leans toward whoever holds the phone and stays leaning, hard, against a draft the room
      // does not have, and does not move (the left stands straight). One thing wrong that stays all night.
      if (G.hauntLean && i === 1 && FLAMES) {
        // (a flame cannot point at the player: it stands up and leans in toward the board, the other way from the left one, and stays)
        lt += -0.3 - FLAMES[i].tilt;
      }
      // in a draft the flame is pulled this way and that (the possession's flutter), without losing any of its light
      if (G.flutter > 0.01) lt += G.flutter * (Math.sin(G.t / 57 + F.seed * 3) * 0.22 + Math.sin(G.t / 23 + F.seed) * 0.12);
      F.lean = lerp(F.lean, lt, 1 - Math.exp(-dt * 9));
    });
  }
  function drawFlames() {
    if (!FLAMES || plateFire()) return;
    const fl = clamp(G.flameLevel, 0, 1.2); if (fl < 0.02) return;
    const blue = G.flame === 'green' ? 'green' : G.flame === 'blue';
    // the flame family, once it has the candles; the engine's own flames only while it hands over (or without one)
    const fam = famOn() ? FF.mix : 0;
    if (fam > 0 && !FF.hide) perf('famDraw', () => famDraw(fl, fam));   // (FF.hide: a test's frame without the films, to measure what they add)
    if (fam >= 1) return;
    FLAMES.forEach((f0, i) => {
      const on = (1 - G.candleOut[i]) * (1 - fam), F = FL[i]; if (on < 0.03) return;
      const st = G.steady === 'paint' ? 0.02 : G.steady ? 0.15 : 1, sd = F.seed;   // 'paint': a house that has been let in, flames as still as paint
      // a gutter is one candle's (the other keeps burning), or both when it came from the room
      const gut = G.gutterWho == null || G.gutterWho < 0 || G.gutterWho === i ? G.gutter : 0;
      const fw = G.flutter;
      const flick = 1 - st * (0.08 * (0.5 + 0.5 * Math.sin(G.t / 61 + sd) * Math.sin(G.t / 97 + sd * 2)) + gut * 0.5 * Math.abs(Math.sin(G.t / 45 + sd))) - fw * 0.14 * Math.abs(Math.sin(G.t / 31 + sd * 2));
      const wob = st * (0.05 * Math.sin(G.t / 140 + sd) + 0.035 * Math.sin(G.t / 53 + sd * 3) + gut * 0.3 * Math.sin(G.t / 38 + sd)) + fw * (0.1 * Math.sin(G.t / 29 + sd * 2) + 0.06 * Math.sin(G.t / 17 + sd * 5));
      const h = F.h * flick * (0.6 + 0.4 * Math.min(1, fl)) * Math.min(1, on * 1.4);
      const b = plateMap(f0), p = worldToScreen(b.x, b.y), base = f0.len * CAM.s * plateScale() * DPR;
      // The still has the flame painted out and the wax top left as the photograph had it without one: grey-blue, a cold disc with a black dot.
      // A lit wick warms the wax around it: a small warm light laid on the candle's top, so the candle that is burning looks like it is.
      { const r = base * 0.62, a = 0.34 * Math.min(1, h) * Math.min(1, on), gx = p.x * DPR, gy = p.y * DPR;
        if (r > 2 && a > 0.01) {
          const gr = cx.createRadialGradient(gx, gy, 0, gx, gy, r);
          gr.addColorStop(0, `rgba(255,176,92,${a})`); gr.addColorStop(0.45, `rgba(255,140,60,${a * 0.5})`); gr.addColorStop(1, 'rgba(255,120,40,0)');
          cx.save(); cx.globalCompositeOperation = 'screen'; cx.fillStyle = gr; cx.fillRect(gx - r, gy - r, r * 2, r * 2); cx.restore();
        } }
      if (FIRE.c[i]) {
        const u = (WORLD.w * plateScale() / FIRE.iw) * CAM.s * DPR, hh = h * (0.97 + 0.03 * Math.sin(G.t / 37 + sd));
        drawFire(FIRE.c[i], blue === 'green' ? 'green' : blue ? 'blue' : 'warm', p.x * DPR, p.y * DPR, u, F.lean + wob, hh, 0.7 + 0.3 * Math.min(1, h), on * Math.min(1, 0.35 + 0.65 * fl));
        return;
      }
      drawFlameSprite(p.x * DPR, p.y * DPR, base * h, base * 0.4 * (0.55 + 0.45 * Math.min(1, h)), f0.tilt + F.lean + wob, F.lean * 0.35, on, blue);
    });
  }
  // A breath kills a candle: the flame leans hard, shrinks, and goes (the film's own out has the thread of smoke).
  function blowCandle(i, o = {}) {
    if (G.candleOutT[i] >= 1) return Promise.resolve();
    if (A.rec) A.rec('snuff', i ? 'right' : 'left', 0.7);   // the recording of a candle snuffed, off that candle's side (none: the breath and the gust the caller plays stand alone)
    const F = FL[i], dir = o.dir ?? (Math.random() < 0.5 ? -1 : 1), dur = o.dur ?? 650;
    // the flame family: its own out, blown toward dir (smoke and all), and it is out when the film says so
    if (famOn() && FF.w[i] && FF.w[i].st !== 'cold') {
      return famBlow(i, dir, dur).then(() => { G.candleOutT[i] = 1; G.candleOut[i] = 1; F.gust = 0; F.hT = 0.2; F.h = 0.2; });
    }
    return animate(dur, (k) => { F.gust = dir * (0.15 + 1.05 * k) + Math.sin(G.t / 30) * 0.12 * k; F.hT = 1 - 0.8 * k; F.h = Math.min(F.h, 1.05 - 0.8 * k); }, easeIn, o.free).then(() => {
      G.candleOutT[i] = 1; G.candleOut[i] = 1; F.gust = 0; F.hT = 0.2; F.h = 0.2;
    });
  }
  // A candle lights itself. Nobody is holding a match.
  function relightCandle(i) {
    const F = FL[i];
    F.h = 0.15; F.hT = 1; F.gust = 0;
    G.candleOutT[i] = 0; G.candleOut[i] = Math.min(G.candleOut[i], 0.35);
    A.ignite(); rumble(80, 0.2, 0.3);
    setTimeout(() => { F.hT = 1.35; setTimeout(() => { F.hT = 1; }, 160); }, 60);
  }
  // ---------------------------------------------------------------- smoke
  // There is no smoke drawn by the engine: no particles, no wisps, no pour, no thread. The only smoke on the screen is filmed: the flame
  // family's own out (it ends in a thread off the wick) and ignite (it opens on one), and the possession's film below.
  // The smoke on film (Flow: smoke on black, screen-blended over the table: black is nothing, only the smoke shows). Drawn when playOver has
  // one going, exactly over the table (plateRect), after the light and the flames. Two things the engine does to it:
  //  - a film with nothing after it ends by thinning over its last 1.8 s (it is never cut to nothing), and
  //  - the film's own candles (the take has a pair at its top corners) are taken out with a soft mask, so the only flames on the screen are
  //    the table's own: places.js clips.smoke.mask = { land: [[x, y, rx, ry]], port: [...] }, fractions of the frame, solid in the middle.
  const SMK = { cv: null, g: null };
  function smokeOver() { const o = PV.over; return o && /^real:smoke/.test(o.id) && o.el.readyState >= 2 ? o : null; }
  function smokeMask() {
    const m = PL && PL.clips && PL.clips.smoke && PL.clips.smoke.mask;
    return (m && m[SC === 'port' ? 'port' : 'land']) || [];
  }
  function drawSmokeFilm() {
    const o = smokeOver(); if (!o) return;
    const el = o.el, r = plateRect(el, plateScale()), a = worldToScreen(r[0], r[1]), b = worldToScreen(r[0] + r[2], r[1] + r[3]);
    let al = o.a == null ? 1 : o.a;
    if (!o.next && !o.pingpong && isFinite(el.duration) && el.duration > 0) al *= clamp((el.duration - el.currentTime) / 1.8, 0, 1);
    if (al < 0.003) return;
    let src = el;
    const mask = smokeMask();
    if (mask.length && el.videoWidth) {
      const k = Math.min(1, 960 / Math.max(el.videoWidth, el.videoHeight)), w = Math.round(el.videoWidth * k), h = Math.round(el.videoHeight * k);
      if (!SMK.cv) { SMK.cv = document.createElement('canvas'); SMK.g = SMK.cv.getContext('2d'); }
      if (SMK.cv.width !== w || SMK.cv.height !== h) { SMK.cv.width = w; SMK.cv.height = h; }
      const g = SMK.g;
      try {
        g.globalCompositeOperation = 'copy'; g.drawImage(el, 0, 0, w, h);
        g.globalCompositeOperation = 'destination-out';
        for (const [mx, my, rx, ry] of mask) {
          g.save(); g.translate(mx * w, my * h); g.scale(rx * w, ry * h);
          const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.6, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gr; g.fillRect(-1, -1, 2, 2); g.restore();
        }
        src = SMK.cv;
      } catch (e) { return; /* a frame not ready yet */ }
    }
    cx.save(); cx.globalCompositeOperation = 'screen'; cx.globalAlpha = al;
    try { cx.drawImage(src, a.x * DPR, a.y * DPR, (b.x - a.x) * DPR, (b.y - a.y) * DPR); } catch (e) { /* a frame not ready yet */ }
    cx.restore();
  }

  // ---------------------------------------------------------------- the possession's smoke: off the two wicks (Pierce, 2026-10-04)
  // "the smoke came in too much and clearly not feeling like part of the scene itself like the yes no things do". The smoke is no longer a
  // full-frame pour laid over everything: it is a thread off each flame's tip, filmed (the flame family's own wick smoke, cut out, slowed
  // twelve times and laid two to a film by tools/smoke-plumes.py: places.js clips.smoke.plumes), and it is in the room. Each column of the
  // film is laid along a curve that starts on its flame's tip, rises the way the candle stands, and bends with the draft toward the planchette
  // (it trails the wood, a second and a half behind): the film is cut into strips, each turned along the curve, so the thread keeps its own
  // filmed curl and only its road bends. It is drawn under the room's light, as the board and the faces are (so it is bright by the flame and
  // dim across the board, and dark when a candle is), warmed by the candlelight. It rises off the tip over its first four seconds, holds, and
  // thins over the second half of the film to nothing at the film's last frame: never cut. At its fullest it covers well under a quarter of
  // the board, faintly. Nothing is drawn by the engine: no sprite, no particle; without the film there is no smoke.
  // (2026-10-05, the possession's frame times: the threads were sixty strips a frame onto a full-resolution layer, most of the taking's
  // time on a phone. Smoke is soft: the layer is half the screen's resolution, each thread eighteen strips, and the strips are laid again
  // every other frame; the layer itself is put on the screen every frame.)
  const PLUME = { on: false, t0: 0, started: false, bend: 0, aim: null, lc: null, lg: null, fc: null, fg: null, hide: false, N: 18, peak: 0.85, rate: 0.85, last: null, odd: false, built: false, a: 0 };
  const PLUME_ID = 'real:plumes';
  function plumeStart() {
    PLUME.on = true; PLUME.t0 = G.t; PLUME.started = false; PLUME.aim = null; PLUME.bend = 0; PLUME.built = false;
    clipsAhead([PLUME_ID], true);
  }
  function plumeStop() {
    PLUME.on = false; PLUME.started = false;
    const v = PV.vids.get(PLUME_ID); if (v) { try { v.el.pause(); } catch (e) { /* fine */ } }
  }
  // how much smoke there is, from the film's own clock: it rises off the tip (reveal: how far up the curve it has climbed), holds, and thins
  function plumeEnv(t, dur) {
    const rise = smooth01(0, 2.2, t), thin = 1 - smooth01(dur * 0.45, dur - 0.15, t);
    return { a: rise * thin, reveal: smooth01(0.1, 4.6, t) * 1.12 };
  }
  function plumeTick(dt) {
    if (!PLUME.on) return;
    const v = PV.vids.get(PLUME_ID);
    if (!PLUME.started) {
      if (!v) { if (G.t - PLUME.t0 > 6000) PLUME.on = false; else loadClip(PLUME_ID); return; }
      if (v.failed) { PLUME.on = false; return; }
      if (v.el.readyState < 2) { if (G.t - PLUME.t0 > 6000) PLUME.on = false; return; }
      v.el.loop = false; v.used = performance.now(); v.el.playbackRate = PLUME.rate;
      try { v.el.currentTime = 0; } catch (e) { /* from the start anyway */ }
      const p = v.el.play(); if (p && p.catch) p.catch(() => {});
      PLUME.started = true;
      // the film's frames are copied when the film shows them (never drawn from the video mid-decode: a phone stalled on it)
      PLUME.fresh = false; PLUME.rvfc = !!v.el.requestVideoFrameCallback;
      if (PLUME.rvfc) {
        const el = v.el, gen = PLUME.t0;
        const onFrame = () => {
          if (!PLUME.on || PLUME.t0 !== gen) return;
          const vw = el.videoWidth, vh = el.videoHeight;
          if (vw && vh) {
            if (!PLUME.fc || PLUME.fc.width !== vw || PLUME.fc.height !== vh) { PLUME.fc = document.createElement('canvas'); PLUME.fc.width = vw; PLUME.fc.height = vh; PLUME.fg = PLUME.fc.getContext('2d'); }
            try { PLUME.fg.globalCompositeOperation = 'copy'; PLUME.fg.drawImage(el, 0, 0); PLUME.fresh = true; } catch (e) { /* not this one */ }
          }
          el.requestVideoFrameCallback(onFrame);
        };
        el.requestVideoFrameCallback(onFrame);
      }
    }
    if (v && (v.el.ended || (isFinite(v.el.duration) && v.el.currentTime >= v.el.duration - 0.05))) { PLUME.on = false; return; }
    if (v && v.el.playbackRate !== PLUME.rate) v.el.playbackRate = PLUME.rate;   // (a browser may hand it back at 1 after the first frame)
    // the draft: hard while the thing pulls the flames (G.leanTo); when it lets go the threads linger where it left them and only begin to
    // stand up again, slowly, as they thin
    PLUME.bend = lerp(PLUME.bend, G.leanTo ? 1 : 0.55, 1 - Math.exp(-dt / (G.leanTo ? 2.4 : 7)));
    const px = BOARD.cx + P.x * BOARD.s, py = BOARD.cy + P.y * BOARD.s;
    if (!PLUME.aim) PLUME.aim = { x: px, y: py };
    const k = 1 - Math.exp(-dt / 1.5);
    PLUME.aim.x = lerp(PLUME.aim.x, px, k); PLUME.aim.y = lerp(PLUME.aim.y, py, k);
  }
  // the curve one thread is laid along, in world px: off the flame's tip, rising the way the candle stands, and carried by the draft over the
  // board toward the planchette (bend 1: the draft has it; as bend falls it stands up off the tip again)
  function plumePath(i) {
    const f0 = FLAMES[i], b = plateMap(f0), len = f0.len * plateScale(), tilt = f0.tilt || 0;
    const ux = Math.sin(tilt), uy = -Math.cos(tilt);
    const tip = { x: b.x + ux * len * 0.92, y: b.y + uy * len * 0.92 };
    // where the draft takes it: toward the planchette (a second and a half behind it), over the upper half of the board
    const aim = PLUME.aim || { x: BOARD.cx, y: BOARD.cy };
    const ax0 = clamp(aim.x, BOARD.cx - BOARD.w * 0.35, BOARD.cx + BOARD.w * 0.35), ay0 = clamp(aim.y, BOARD.cy - BOARD.h * 0.2, BOARD.cy + BOARD.h * 0.15);
    let ax = ax0 - tip.x, ay = ay0 - tip.y; const ad = Math.hypot(ax, ay) || 1; ax /= ad; ay /= ad;
    // long enough to reach the board from where this candle stands (a candle far up the table, as upright, has further to go)
    const L = clamp(ad * 1.05, 0.5 * BOARD.w, 0.85 * BOARD.w);
    // off the tip: up the candle and already leaning the draft's way (a quarter turn off up, on the board's side)
    let nx = -uy, ny = ux; if (nx * ax + ny * ay < 0) { nx = -nx; ny = -ny; }
    const bend = PLUME.bend;
    let sx = ux * (1 - 0.55 * bend) + nx * 0.75 * bend, sy = uy * (1 - 0.55 * bend) + ny * 0.75 * bend;
    const sd = Math.hypot(sx, sy) || 1; sx /= sd; sy /= sd;
    // the far end: straight up off the tip with no draft; with it, over the board toward the aim
    const up = { x: tip.x + ux * L, y: tip.y + uy * L }, over = { x: tip.x + ax * L * 0.95, y: tip.y + ay * L * 0.95 };
    const p2 = { x: lerp(up.x, over.x, bend), y: lerp(up.y, over.y, bend) };
    const d2 = Math.hypot(p2.x - tip.x, p2.y - tip.y);
    const p1 = { x: tip.x + sx * d2 * 0.5, y: tip.y + sy * d2 * 0.5 };
    // sampled by length, so the film is not stretched where the curve is tighter
    const n = 48, pts = [];
    let acc = 0;
    for (let j = 0; j <= n; j++) {
      const u = j / n, iu = 1 - u;
      const x = iu * iu * tip.x + 2 * iu * u * p1.x + u * u * p2.x, y = iu * iu * tip.y + 2 * iu * u * p1.y + u * u * p2.y;
      if (j) acc += Math.hypot(x - pts[j - 1].x, y - pts[j - 1].y);
      pts.push({ x, y, s: acc });
    }
    return { pts, total: acc, tip, L };
  }
  function plumeAt(path, s) {
    const want = s * path.total, p = path.pts;
    let j = 1; while (j < p.length - 1 && p[j].s < want) j++;
    const a = p[j - 1], b = p[j], u = clamp((want - a.s) / Math.max(1e-6, b.s - a.s), 0, 1);
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), tx: dx / d, ty: dy / d };
  }
  // drawn in screen space from a layer of its own, before the room's light (draw() calls it just ahead of drawLight)
  function drawPlumes() {
    if (!PLUME.on || !PLUME.started || PLUME.hide || !FLAMES) return;
    const v = PV.vids.get(PLUME_ID); if (!v || v.el.readyState < 2) return;
    const el = v.el, vw = el.videoWidth, vh = el.videoHeight; if (!vw || !vh) return;
    const dur = isFinite(el.duration) && el.duration > 0 ? el.duration : 22.5, env = plumeEnv(el.currentTime, dur);
    if (env.a < 0.004) return;
    // every other frame the strips are laid again; between, the layer as it was is put on the screen
    PLUME.odd = !PLUME.odd;
    if (PLUME.odd && PLUME.built && PLUME.lc) { plumeShow(env); return; }
    // the frame once (it is drawn thirty-six times below): copied by the frame callback when the film shows it, else here
    if (PLUME.rvfc) { if (!PLUME.fc || (!PLUME.fresh && !PLUME.built)) return; PLUME.fresh = false; }
    else {
      if (!PLUME.fc || PLUME.fc.width !== vw || PLUME.fc.height !== vh) { PLUME.fc = document.createElement('canvas'); PLUME.fc.width = vw; PLUME.fc.height = vh; PLUME.fg = PLUME.fc.getContext('2d'); }
      try { PLUME.fg.globalCompositeOperation = 'copy'; PLUME.fg.drawImage(el, 0, 0); } catch (e) { return; }
    }
    const q = Math.min(DPR, 2) * 0.5, lw = Math.max(2, Math.round(W * q)), lh = Math.max(2, Math.round(H * q));
    if (!PLUME.lc || PLUME.lc.width !== lw || PLUME.lc.height !== lh) { PLUME.lc = document.createElement('canvas'); PLUME.lc.width = lw; PLUME.lc.height = lh; PLUME.lg = PLUME.lc.getContext('2d'); }
    const g = PLUME.lg;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.fillStyle = '#000'; g.fillRect(0, 0, lw, lh);
    // world to this layer: the camera's own transform, at the layer's scale
    g.setTransform(CAM.s * q, 0, 0, CAM.s * q, (W / 2 - CAM.x * CAM.s + CAM.sx) * q, (H / 2 - CAM.y * CAM.s + CAM.sy) * q);
    g.globalCompositeOperation = 'lighten';   // strips that overlap take the brighter, never the sum: no seams
    // the film's bottom rows (the wick, cut away to nothing) lie under the flame: the thread comes off the tip
    const cw = vw / 2, off = vh * 0.14, fh = vh - off, N = PLUME.N, sh = fh / N, ext = sh * 0.4;
    const last = [];
    for (let i = 0; i < 2; i++) {
      const path = plumePath(i), sc = path.L / fh, lit = clamp(famLight(i, 1 - G.candleOut[i]) * (1 - G.candleOut[i]), 0, 1);
      if (lit < 0.02) continue;
      last.push(path);
      for (let j = 0; j < N; j++) {
        const s0 = j / N, sMid = (j + 0.5) / N;   // s from the tip (the film's bottom) up
        if (sMid > env.reveal) break;
        const front = clamp((env.reveal - sMid) / 0.14, 0, 1);
        const p = plumeAt(path, sMid);
        // bright by the flame, dimmer as it climbs away from it
        g.globalAlpha = front * lit * lerp(1, 0.6, s0);
        g.save();
        g.translate(p.x, p.y); g.rotate(Math.atan2(p.tx, -p.ty));
        // each strip carries a little of its neighbours' rows, at the same scale (no stretch): the overlaps take the brighter, so no seam
        const sy = Math.max(0, fh - (j + 1) * sh - ext), ey = Math.min(vh, fh - j * sh + ext);
        g.drawImage(PLUME.fc, i * cw, sy, cw, ey - sy, -cw / 2 * sc, (sy - (fh - (j + 0.5) * sh)) * sc, cw * sc, (ey - sy) * sc);
        g.restore();
      }
    }
    PLUME.last = last;
    // the candlelight in it: warm, as the flames are
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
    g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(255,222,186)'; g.fillRect(0, 0, lw, lh);
    g.globalCompositeOperation = 'source-over';
    PLUME.built = true;
    plumeShow(env);
  }
  function plumeShow(env) {
    cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.globalCompositeOperation = 'screen'; cx.globalAlpha = clamp(env.a * PLUME.peak, 0, 1);
    cx.drawImage(PLUME.lc, 0, 0, cv.width, cv.height);
    cx.restore();
  }

  // Where the glow is: under the finger or the mouse, or the planchette when nobody is touching.
  function glowPoint() {
    if (ptr || (PG.x >= 0 && PG.mouse && G.t - PG.t < 2500)) return { x: PG.x, y: PG.y };
    return boardToScreen(P.x, P.y);
  }

  // ---------------------------------------------------------------- camera & layout
  // narrow: a squarish window on the landscape scene (the camera follows the planchette, as it always has).
  // short: a phone on its side; the cards stand in a column on the right and the board takes the height.
  let W = 0, H = 0, DPR = 1, narrow = false, short = false;
  const CAM = { x: BOARD.cx, y: BOARD.cy, s: 1, sx: 0, sy: 0 };
  let camSnap = true;
  const lightCv = document.createElement('canvas');
  const lc = lightCv.getContext('2d');
  const vignCv = document.createElement('canvas');
  const grain = [];
  // The notch and the home bar, and the part of the page the on-screen keyboard leaves visible.
  const SAFE = { t: 0, r: 0, b: 0, l: 0 };
  // The visible rectangle (the visual viewport: top and height), how much of the window the keyboard takes (kb), whether it is up (kbUp),
  // and lift: how far the layout viewport's bottom sits under it (the landscape card column rides on that). fake: a test's keyboard.
  const VV = { top: 0, h: 0, kb: 0, kbUp: false, lift: 0, fake: null };
  // The window as it is with no text field focused. The scene (upright or on its side) and `short` are read from this and only this,
  // and they never change while a field is focused. On his iPhone the browser shrinks innerHeight when the keyboard opens, so reading
  // innerWidth / innerHeight then makes an upright phone look like one on its side (402 x 360): the board went small into the top
  // left corner and the box off to the right. The keyboard is up when a field is focused and the window lost more than 120 px.
  const RESTWIN = { w: 0, h: 0 };
  const FOCUS = { out: -Infinity };
  const fieldFocused = () => { const a = document.activeElement; return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || !!a.isContentEditable); };
  function readRest() {
    const w = innerWidth, h = innerHeight;
    // a keyboard only ever takes height: a different width is a rotation. Just after a field lost focus the window may still be the
    // keyboard's (it comes back a moment later), so it is not taken for the rest shape then.
    const settling = performance.now() - FOCUS.out < 900 && h < RESTWIN.h;
    if (!RESTWIN.w || Math.abs(w - RESTWIN.w) > 40 || (!fieldFocused() && !settling)) { RESTWIN.w = w; RESTWIN.h = h; }
  }
  // iOS scrolls the page under the keyboard to show the field: this puts it back
  const pinScroll = () => { try { window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; } catch (e) { /* fine */ } };
  const safeProbe = document.createElement('div');
  safeProbe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
    'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
  document.body.appendChild(safeProbe);
  function readSafe() {
    const cs = getComputedStyle(safeProbe);
    SAFE.t = parseFloat(cs.paddingTop) || 0; SAFE.r = parseFloat(cs.paddingRight) || 0;
    SAFE.b = parseFloat(cs.paddingBottom) || 0; SAFE.l = parseFloat(cs.paddingLeft) || 0;
  }
  function readVV() {
    const v = window.visualViewport, f = VV.fake;
    readRest();
    let top = v ? Math.max(0, v.offsetTop) : 0, h = v ? v.height : innerHeight;
    if (f) { top = f.offset || 0; h = RESTWIN.h - f.px; }   // a test's keyboard: only the visual viewport shrinks (and may be scrolled)
    VV.top = top; VV.h = h;
    VV.kb = Math.round(RESTWIN.h - h);
    const was = VV.kbUp;
    VV.kbUp = fieldFocused() && VV.kb > 120;   // less than that is a toolbar, not a keyboard
    VV.lift = Math.max(0, Math.round(innerHeight - h - top));
    const de = document.documentElement.style;
    de.setProperty('--vvt', VV.top + 'px'); de.setProperty('--vvh', VV.h + 'px'); de.setProperty('--kb', (VV.kbUp ? VV.lift : 0) + 'px');
    document.body.classList.toggle('kb', VV.kbUp);
    if (VV.kbUp) pinScroll();
    // the keyboard came up over a pass-it-on card: its question goes back to the top of what is left
    if (VV.kbUp && !was) { const sh = document.getElementById('share'); if (sh && !sh.hidden) requestAnimationFrame(() => { sh.scrollTop = 0; }); }
  }
  function wantScene() { return (RESTWIN.w / RESTWIN.h < 0.95 && PL && PL.portrait && IMG.platePort) ? 'port' : 'land'; }
  // A wide screen turned upright: the upright table loads now, and the scene switches when it lands.
  let portLoading = '';
  function ensurePortPlate() {
    const p = PL, src = p && p.portrait && p.portrait.plate;
    if (!src || IMG.platePort || RESTWIN.w / RESTWIN.h >= 0.95 || portLoading === src) return;
    portLoading = src;
    loadArt(src).then((im) => { portLoading = ''; if (im && PL === p && !IMG.platePort) { IMG.platePort = im; layout(); } });
  }
  // An upright phone turned on its side: the wide table (fetched after the upright one, unwaited) is drawn when it lands.
  function ensureLandPlate() {
    const p = PL, src = p && p.art && p.art.plate;
    if (!src || IMG.plate || RESTWIN.w / RESTWIN.h < 0.95 || !placeReady) return;
    const tok = placeTok;
    loadArt(src).then((im) => { if (im && PL === p && tok === placeTok && !IMG.plate) IMG.plate = im; });
  }
  function applyScene(sc) {
    const port = sc === 'port' && PL.portrait;
    const d = port ? PL.portrait : PL;
    SC = port ? 'port' : 'land';
    WORLD.w = port ? d.world.w : 1600; WORLD.h = port ? d.world.h : 900;
    Object.assign(BOARD, d.boardRect); BOARD.s = BOARD.w / 1200;
    PLATE.candles = d.candles; FLAMES = d.flames || null;
    plateOut = null; plateOutSrc = null; plateTex = null;
    CAM.x = BOARD.cx; CAM.y = BOARD.cy; camSnap = true; dockH = 0;
    document.body.dataset.scene = SC;
  }
  function layout() {
    loadReal();   // a phone turned on its side wants the other shape of fingers on the glass
    // the canvas is drawn at its own measured box (never a stale innerHeight, so nothing stretches)
    W = cv.clientWidth || innerWidth; H = cv.clientHeight || innerHeight; DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    readSafe(); readVV();
    if (PL) { ensurePortPlate(); ensureLandPlate(); }
    const sc = wantScene(); if (sc !== SC) applyScene(sc);
    // upright or on its side, and short: read from the window at rest, so a keyboard never turns an upright phone on its side
    narrow = SC === 'land' && RESTWIN.w / RESTWIN.h < 0.95;
    const wasShort = short;
    short = SC === 'land' && !narrow && RESTWIN.h < 520;
    document.body.classList.toggle('short', short);
    fitTa();
    lightCv.width = Math.max(64, Math.round(W / 3)); lightCv.height = Math.max(64, Math.round(H / 3));
    vignCv.width = Math.round(W / 2); vignCv.height = Math.round(H / 2);
    const vg = vignCv.getContext('2d');
    const r = Math.hypot(vignCv.width, vignCv.height) / 2;
    const gr = vg.createRadialGradient(vignCv.width / 2, vignCv.height / 2, r * 0.28, vignCv.width / 2, vignCv.height / 2, r);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.7, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,.96)');
    vg.clearRect(0, 0, vignCv.width, vignCv.height); vg.fillStyle = gr; vg.fillRect(0, 0, vignCv.width, vignCv.height);
    camSnap = true; dockH = 0; uiTick = 0;
  }
  function uiTop() { return SC === 'port' || short ? SAFE.t + 52 : 64; }
  function uiBottom() { return narrow ? 196 : 176; }
  // The rectangle (CSS px) the board has to fit in, after the HUD, the transcript, the cards and any keyboard.
  const dockEl = $('#dock'), trEl = $('#transcript');
  const TR_H = 78;            // two lines of transcript under the board, upright
  let dockH = 0;              // the dock as measured while playing; it never shrinks mid-scene, so nothing jumps
  const KB_GAP = 10;   // upright with the keyboard up: the box stands this far under the board
  function stage() {
    const kb = VV.kbUp, visTop = kb ? VV.top : 0, visBot = kb ? VV.top + VV.h : H;
    if (SC === 'port') {
      if (kb) {
        // the rectangle the keyboard leaves: the box is pinned to its bottom (index.html body.kb #dock), and the board sits right on it
        const dock = Math.max(40, dockEl ? dockEl.offsetHeight : 52);
        return { x0: SAFE.l, x1: W - SAFE.r, y0: visTop + 2, y1: visBot - dock - KB_GAP };
      }
      const dock = Math.max(dockH, 150 + SAFE.b);
      return { x0: SAFE.l, x1: W - SAFE.r, y0: uiTop(), y1: visBot - dock - TR_H };
    }
    if (short) {
      const col = dockEl ? dockEl.offsetWidth : 200;
      return { x0: SAFE.l + 6, x1: W - Math.max(col, 150), y0: kb ? visTop + 6 : uiTop(), y1: visBot - 6 - (kb ? 0 : Math.max(4, SAFE.b * 0.5)) };
    }
    return { x0: 0, x1: W, y0: uiTop(), y1: H - uiBottom() };
  }
  // The top of the flames (portrait): the stack from there down to the board's bottom edge is what has to fit.
  function flameTop() {
    if (FLAMES) return Math.min(...FLAMES.map((f) => f.y - f.len * 1.3)) - 6;
    return Math.min(...PLATE.candles.map((k) => k.y)) - 50;
  }
  function updateCamera(dt) {
    let s, cy, cxw;
    if (narrow) {
      const band = H - uiTop() - uiBottom();
      s = Math.min((W * 1.2) / BOARD.w, band / (BOARD.h + 20));
      cy = BOARD.cy - (uiTop() + band / 2 - H / 2) / s;
      const half = W / (2 * s);
      const px = BOARD.cx + P.x * BOARD.s;
      const lo = BOARD.cx - BOARD.w / 2 + half - 30, hi = BOARD.cx + BOARD.w / 2 - half + 30;
      cxw = lerp(CAM.x, clamp(px, Math.min(lo, hi), Math.max(lo, hi)), 1 - Math.exp(-dt * 3));
      CAM.s = s; CAM.y = cy; CAM.x = cxw;
    } else {
      const st = stage(), bw = st.x1 - st.x0, band = st.y1 - st.y0;
      if (SC === 'port' && VV.kbUp) {
        // With the keyboard up: the candles and the board if the board would still be at least 85% of the width, otherwise the board
        // alone (its candles off the top, their light still on it), width first and centred, standing right on the box. The
        // keyboard never makes the board small and never cuts its top off.
        const top = flameTop(), boardBot = BOARD.cy + BOARD.h / 2, bot = boardBot + 8;
        const sBoth = Math.max(0.05, Math.min((bw - 14) / BOARD.w, band / (bot - top)));
        if (sBoth * BOARD.w >= 0.85 * bw) s = sBoth;
        else s = Math.max(0.05, Math.min((bw - 14) / BOARD.w, band / (BOARD.h + 2)));
        // the board's bottom edge on the bottom of the stage; horizontally the board's own middle on the visible middle
        cy = boardBot - (st.y1 - H / 2) / s;
        cxw = BOARD.cx - ((st.x0 + st.x1) / 2 - W / 2) / s;
      } else if (SC === 'port') {
        // both candles burning at the top, the board as wide as the screen allows under them
        const top = flameTop(), bot = BOARD.cy + BOARD.h / 2 + 8;
        s = Math.max(0.05, Math.min((bw - 14) / BOARD.w, band / (bot - top)));
        // centred, as on a wide screen: the board's middle on the stage's middle, and the board gives way (by a tenth at most) until both
        // flames, tilted tips and all, stand whole across the stage. (It used to slide toward the candles: 9 px off on a 15 Pro.)
        if (FLAMES) {
          const ext = Math.max(...FLAMES.map((fl) => { const tip = fl.x + fl.len * 1.15 * Math.sin(fl.tilt); return Math.max(BOARD.cx - Math.min(fl.x, tip), Math.max(fl.x, tip) - BOARD.cx) + 8; }));
          s = Math.max(s * 0.9, Math.min(s, (bw / 2 - 6) / ext));
        }
        const extra = Math.max(0, band - (bot - top) * s);
        const yTop = st.y0 + extra * 0.3;
        cy = top - (yTop - H / 2) / s;
        cxw = BOARD.cx - ((st.x0 + st.x1) / 2 - W / 2) / s;
      } else if (short) {
        // the board and the left candle fit beside the cards; the right candle burns above them.
        // Both flames stay under the pills: the stack from the flame tips (as they lean) down to the board fits.
        // The plate never grows here (plateScale), so the candles stay where the fit put them.
        const xl = Math.min(...PLATE.candles.map((k) => k.x)) - 60, xr = BOARD.cx + BOARD.w / 2 + 20, bot = BOARD.cy + BOARD.h / 2 + 12;
        const top = Math.min(BOARD.cy - BOARD.h / 2 - 12, FLAMES
          ? Math.min(...FLAMES.map((fl) => fl.y - fl.len * 1.2 * Math.cos(fl.tilt))) - 8
          : Math.min(...PLATE.candles.map((k) => k.y)) - 40);
        s = Math.max(0.05, Math.min(bw / (xr - xl), band / (bot - top)));
        const extra = Math.max(0, band - (bot - top) * s);
        cy = top - (st.y0 + extra / 2 - H / 2) / s;
        cxw = (xl + xr) / 2 - ((st.x0 + st.x1) / 2 - W / 2) / s;
      } else {
        s = Math.min((W - 48) / (BOARD.w + 60), band / (BOARD.h + 110));
        // a candle standing high in the photo: the board gives up a little size (never more than 15%) so its flame
        // clears the pills. The flame tops are measured where the plate puts them (it grows to fill a wide screen).
        if (FLAMES) {
          const s0 = s, bot = BOARD.cy + BOARD.h / 2;
          // past the size where the photo has to grow to fill the screen, shrinking only pushes the candles further out
          const fill = Math.max(H * 1.02 / WORLD.h, W * 1.02 / Math.max(1, WORLD.w - 2 * Math.abs(BOARD.cx - WORLD.w / 2)));
          for (let n = 0; n < 3; n++) s = Math.max(s0 * 0.85, Math.min(s0, Math.max(fill, (st.y1 - st.y0 + 4) / (bot - flameTip(s, wideX(s))))));
        }
        // Centred (Pierce, 2026-10-04: "this doesnt feel centered"): the board's middle is the screen's middle, and the two dishes stand the same
        // distance either side of it (they do, on the photo: 502 and 513 units). The board gives way in size until both flames, tilted tips and
        // all, stand whole on the screen. Only a screen too square for that falls back to sliding the table toward the candles.
        cxw = BOARD.cx;
        if (FLAMES) { const fit = centredScale(s, st); if (fit > 0) s = fit; else cxw = wideX(s); }
        cy = wideCy(s, st, cxw);
      }
      // a keyboard, a turned phone, a dock that grew: the camera glides there, it never jumps
      const k = camSnap ? 1 : 1 - Math.exp(-dt * 8);
      CAM.s = lerp(CAM.s, s, k); CAM.y = lerp(CAM.y, cy, k); CAM.x = lerp(CAM.x, cxw, k);
    }
    camSnap = false;
    const sh = reduced ? G.shake * 0.25 : G.shake;
    CAM.sx = rnd(-sh, sh); CAM.sy = rnd(-sh, sh);
    G.shake = Math.max(0, G.shake - dt * 30);
  }
  // A wide screen centres the board, unless that would push a flame off the side: then it slides toward the
  // candles as far as it can while the whole board stays on screen and the photo still fills the screen.
  // The highest flame tip, in world y, as the plate will be drawn at scale s with the camera at x (wide screens).
  function flameTip(s, x) {
    const f = plateScaleFor(s, x, wideCy0(s)), my = WORLD.h / 2;
    return Math.min(...FLAMES.map((fl) => my + (fl.y - fl.len * 1.1 * Math.cos(fl.tilt) - my) * f));
  }
  // Where the camera looks (world y) at scale s on a wide screen, before the flames have a say: the board's middle on the screen's middle,
  // unless that would sink it into the cards under it (they start at the stage's bottom).
  function wideCy0(s) {
    const st = stage(), bot = (BOARD.h / 2) * s + H / 2, room = st.y1 + 30;
    return bot > room ? BOARD.cy + (bot - room) / s : BOARD.cy;
  }
  // The camera's y, all told. The board's middle is the screen's middle (Pierce, 2026-10-04: "this doesnt feel centered"). A flame that would
  // burn within 24px of the top edge comes down, as far as the room under the board allows (the pills are gone all night). And never so high that the top of the screen shows
  // more than 3.5% of nothing above the photo: the wood is lit up there, and the photo does not grow for a few pixels, it fades into the dark.
  // (The photo's bottom rows are black, so a window running past them is never seen either: see plateScaleFor.)
  function wideCy(s, st, x) {
    let cy = wideCy0(s);
    if (FLAMES) {
      const tip = flameTip(s, x);
      // the board may sink into the margin above the cards (they start about 40px under the band)
      const need = 24 - ((tip - cy) * s + H / 2), room = st.y1 + 30 - ((BOARD.cy + BOARD.h / 2 - cy) * s + H / 2);
      if (need > 0 && room > 0) cy -= Math.min(need, room) / s;
    }
    const top = (0.5 - PLATE_TOP) * H / s + 6 / s;
    if (cy < top && (top - cy) * s <= H * 0.06) cy = top;
    return cy;
  }
  // The scale, at or under s0 (and over 80% of it), at which the board is centred and both flames are whole on the screen; 0 if there is none.
  function centredScale(s0, st) {
    const fits = (s) => {
      const f = plateScaleFor(s, BOARD.cx, wideCy(s, st, BOARD.cx)), m = Math.max(10, W * 0.01);
      const sx = (x) => (WORLD.w / 2 + (x - WORLD.w / 2) * f - BOARD.cx) * s + W / 2;
      return FLAMES.every((fl) => { const a = sx(fl.x), b = sx(fl.x + fl.len * 1.15 * Math.sin(fl.tilt)); return Math.min(a, b) >= m && Math.max(a, b) <= W - m; });
    };
    if (fits(s0)) return s0;
    // (not a smooth search: a smaller board lets the photo grow, and that moves the flames out, so it is walked down in steps and the first fit is refined)
    for (let k = 1; k <= 40; k++) {
      const hi = s0 * (1 - 0.005 * (k - 1)), lo = s0 * (1 - 0.005 * k);
      if (!fits(lo)) continue;
      let a = lo, b = hi;
      for (let n = 0; n < 14; n++) { const mid = (a + b) / 2; if (fits(mid)) a = mid; else b = mid; }
      return a;
    }
    return 0;
  }
  // Upright (port) the same rule runs on the stage's width; the photo never grows there, its edges fade instead.
  function wideX(s, port) {
    if (!FLAMES) return BOARD.cx;
    const span = port ? stage().x1 - stage().x0 : W;
    const half = span / (2 * s), m = (port ? 6 : 20) / s, slack = port ? Infinity : (WORLD.w / 1.02 - W / s) / 2;
    if (slack <= 0) return BOARD.cx;   // the photo already grows to fill this screen
    let lo = -Infinity, hi = Infinity;
    FLAMES.forEach((f) => {
      const tip = f.x + f.len * 1.15 * Math.sin(f.tilt), l = Math.min(f.x, tip) - 8, r = Math.max(f.x, tip) + 8;
      lo = Math.max(lo, r + m - half); hi = Math.min(hi, l - m + half);
    });
    let x = lo <= hi ? clamp(BOARD.cx, lo, hi) : (lo + hi) / 2;
    x = clamp(x, WORLD.w / 2 - slack, WORLD.w / 2 + slack);
    const pad = 16 / s, bl = BOARD.cx - BOARD.w / 2 - pad, br = BOARD.cx + BOARD.w / 2 + pad;
    return clamp(x, Math.min(br - half, bl + half), Math.max(br - half, bl + half));
  }
  // Upright, the transcript sits just under the board; on its side, between the pills at the top.
  let uiTick = 0, lastTrTop = -1, lastTrL = -1, lastTrR = -1, lastRc = -1, lastDockH = -1;
  // The dare: a second pencil note along the board's lower margin, right of GOOD BYE, in the same hand and at
  // the same size as "always say goodbye", drawn into the board (drawDare). It has been there since the first frame (S.dare is set when the
  // table comes up): nothing writes it in, and it makes no sound. It was always there. Tapping the words asks it (the canvas
  // hit-tests them, and never takes a touch that lands on the planchette); typing it asks it. The #dare button is
  // only its stand-in for a keyboard and a screen reader: invisible, and touches go through it.
  const dareEl = $('#dare');
  // the wood of the planchette, and a fingertip of air around it: a touch there is a hand on the planchette
  function underPlanchette(x, y) {
    const u = CAM.s * BOARD.s, r = 24 + 12 / Math.max(0.05, u);
    if (!PH.foot) return Math.hypot(x - P.x, y - P.y - 50) < 170 + 12 / Math.max(0.05, u);
    for (const [fx, fy] of PH.foot) if (Math.hypot(P.x + fx - x, P.y + fy - y) < r) return true;
    return false;
  }
  function onDare(b) {
    if (!DARE_BOX || !PL.forbidden || S.haunted || S.possessing || G.t - (S.dareAt || 0) < 800) return false;
    const pad = 4 / Math.max(0.05, CAM.s * BOARD.s), d = DARE_BOX;
    if (b.x < d.x0 - pad || b.x > d.x1 + pad || b.y < d.y0 - pad || b.y > d.y1 + pad) return false;
    return !underPlanchette(b.x, b.y);
  }
  // Asked from the margin. If the board is spelling something of its own, the question is up at once, waiting, and the
  // line stops at the next letter: nothing the board says unprompted outranks the forbidden question (it goes to the front).
  function tapDare() {
    if (!S.started || !PL.forbidden || S.haunted || S.possessing || S.struggling || S.ending || S.soft || halt) return;
    A.scratch();
    if (!S.busy) { ask(PL.forbidden); return; }
    // the board is busy: it waits at the front of the line (a move the demon has begun is never cut short)
    enqueue(PL.forbidden, false, true);
  }
  if (dareEl) dareEl.addEventListener('click', tapDare);
  function placeDare() {
    if (!dareEl) return;
    if (!DARE_BOX) { if (!dareEl.hidden) dareEl.hidden = true; return; }
    if (dareEl.hidden) { dareEl.textContent = PL.dare; dareEl.hidden = false; }
    const a = boardToScreen(DARE_BOX.x0, DARE_BOX.y0), c = boardToScreen(DARE_BOX.x1, DARE_BOX.y1);
    dareEl.style.transform = `translate(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px)`;
    dareEl.style.width = Math.max(1, c.x - a.x).toFixed(1) + 'px'; dareEl.style.height = Math.max(1, c.y - a.y).toFixed(1) + 'px';
  }
  function syncUI() {
    noteFit(); placeDare();
    if (SC === 'port') {
      if (document.body.classList.contains('playing') && !VV.kbUp && dockEl) dockH = Math.max(dockH, dockEl.offsetHeight);
      if (VV.kbUp && dockEl) { const dh = dockEl.offsetHeight; if (dh !== lastDockH) { lastDockH = dh; document.documentElement.style.setProperty('--dockh', dh + 'px'); } }
      const y = Math.round((BOARD.cy + BOARD.h / 2 - CAM.y) * CAM.s + H / 2 + 4);
      if (y !== lastTrTop) { lastTrTop = y; document.documentElement.style.setProperty('--trtop', y + 'px'); }
    } else if (short && uiTick-- <= 0) {
      uiTick = 30;
      const l = document.querySelector('.hud-left'), r = document.querySelector('.hud-right');
      const L = l ? Math.round(l.getBoundingClientRect().right + 10) : 220, R = r ? Math.round(W - r.getBoundingClientRect().left + 10) : 120;
      if (L !== lastTrL || R !== lastTrR) {
        lastTrL = L; lastTrR = R;
        document.documentElement.style.setProperty('--trl', L + 'px'); document.documentElement.style.setProperty('--trr', R + 'px');
        fitTa();
      }
      // The right candle burns above the card column: the column (and its backdrop) starts under that wick.
      // A flame anywhere over the column's width counts; the column scrolls when it can't hold every card.
      let rc = 0;
      if (FLAMES && dockEl) {
        const left = W - dockEl.offsetWidth - 12;
        FLAMES.forEach((f) => {
          const b = plateMap(f), x = (b.x - CAM.x) * CAM.s + W / 2, y = (b.y - CAM.y) * CAM.s + H / 2;
          if (x > left) rc = Math.max(rc, Math.round(y + 18));
        });
      }
      if (rc !== lastRc) {
        lastRc = rc;
        document.documentElement.style.setProperty('--rcand', rc + 'px');
      }
    }
  }
  // On a tall phone screen the table photo grows about its center to fill it.
  // Off-centre boards count the offset too, so a very wide screen never shows past the photo's edge.
  // An upright scene never grows: its plate is tall enough, and growing would pull the candles off the top.
  // On its side (short) it never grows either: growing would push the candles under the pills.
  function plateScale() {
    if (SC === 'port' || short) return 1;
    return plateScaleFor(CAM.s, CAM.x, CAM.y);
  }
  // How far the photo grows (about its middle) to cover a screen whose camera is at (x, y) at scale s: all of its width, and its top edge
  // to within 3.5% of the screen. The bottom rows of the photo are black (under 8 of 255 in the last 16%), so a window that runs off the bottom
  // of it, up to a tenth of the window, shows nothing different (the edge fades into the dark): the photo does not have to grow for either, and
  // the candles stay where the board's own size puts them (a photo that grew would carry the left flame off the screen with it). A squarish
  // window on the wide table keeps the old full cover.
  function plateScaleFor(s, x, y) {
    const wide = (W / s + 2 * Math.abs(x - WORLD.w / 2)) / WORLD.w * 1.02;
    if (narrow) return Math.max(1, (H / s) / WORLD.h * 1.02, wide);
    const wh = H / s, my = WORLD.h / 2, top = (my - (y - wh / 2) - wh * PLATE_TOP + 6 / s) / my, bot = (y + wh / 2 - wh * PLATE_BOT - my) / my;
    return Math.max(1, top, bot, wide);
  }
  function candleAt(k) { const f = plateScale(), mx = WORLD.w / 2, my = WORLD.h / 2; return { x: mx + (k.x - mx) * f, y: my + (k.y - my) * f }; }
  function worldToScreen(x, y) { return { x: (x - CAM.x) * CAM.s + W / 2 + CAM.sx, y: (y - CAM.y) * CAM.s + H / 2 + CAM.sy }; }
  function boardToScreen(x, y) { return worldToScreen(BOARD.cx + x * BOARD.s, BOARD.cy + y * BOARD.s); }
  function screenToBoard(px, py) {
    const wx = (px - W / 2 - CAM.sx) / CAM.s + CAM.x, wy = (py - H / 2 - CAM.sy) / CAM.s + CAM.y;
    return { x: (wx - BOARD.cx) / BOARD.s, y: (wy - BOARD.cy) / BOARD.s };
  }

  function makeGrain() {
    for (let k = 0; k < 4; k++) {
      const c = document.createElement('canvas'); c.width = c.height = 160;
      const g = c.getContext('2d'); const d = g.createImageData(160, 160);
      for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
      g.putImageData(d, 0, 0); grain.push(c);
    }
  }

  // ---------------------------------------------------------------- draw
  function flameColor() {
    if (G.flame === 'blue') return [120, 170, 255];
    if (G.flame === 'green') return [120, 230, 150];
    if (G.flame === 'gold') return [255, 205, 110];
    return [255, 168, 80];
  }
  // ?debug: the cost of each part of a frame (count, total ms, the longest), for the frame-time checks
  const PERF = /[?&]debug\b/.test(location.search) ? {} : null;
  const perf = (k, fn) => { if (!PERF) return fn(); const t0 = performance.now(); try { return fn(); } finally { const x = PERF[k] || (PERF[k] = [0, 0, 0]), d = performance.now() - t0; x[0]++; x[1] += d; if (d > x[2]) x[2] = d; } };
  function draw() {
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.fillStyle = '#050405'; cx.fillRect(0, 0, cv.width, cv.height);
    const s = CAM.s * DPR;
    cx.setTransform(s, 0, 0, s, (W / 2 - CAM.x * CAM.s + CAM.sx) * DPR, (H / 2 - CAM.y * CAM.s + CAM.sy) * DPR);

    // the table: the still (its flames painted out, the engine's drawn on), then the shared still or the clip that is
    // current, over it. A clip with no frame yet is not drawn; what was there keeps drawing.
    const pimg = SC === 'port' ? IMG.platePort : wideTable();
    const plate = pimg ? platePrepared(pimg) : (plateTex = plateTex || proceduralPlate());
    const f = plateScale();
    perf('plate', () => cx.drawImage(plate, WORLD.w / 2 * (1 - f), WORLD.h / 2 * (1 - f), WORLD.w * f, WORLD.h * f));
    // (with a flame family the candles are its films, so the table stays the still: no table clip, no key still)
    const film = FF.want ? null : PV.cur && PV.cur.el.readyState >= 2 ? PV.cur.el : PV.keys[PV.key] || null;
    if (film) { try { cx.drawImage(film, ...plateRect(film, f)); } catch (e) { /* a frame not ready yet */ } }
    // Upright and on its side the photo never grows, so a smaller board (the keyboard is up, a wide short screen)
    // can leave it smaller than the screen: its straight edges fade into the dark instead of showing as hard lines. On the wide table
    // only the bottom can run short (plateScaleFor), and the same fade takes it into the dark.
    {
      const fw = 48 / CAM.s, x0 = WORLD.w / 2 * (1 - f), x1 = x0 + WORLD.w * f, y0 = WORLD.h / 2 * (1 - f), y1 = y0 + WORLD.h * f;
      const tl = worldToScreen(x0, y0), br = worldToScreen(x1, y1);
      const edge = (on, gx0, gy0, gx1, gy1, rx, ry, rw, rh) => {
        if (!on) return;
        const g = cx.createLinearGradient(gx0, gy0, gx1, gy1);
        g.addColorStop(0, 'rgba(5,4,5,1)'); g.addColorStop(1, 'rgba(5,4,5,0)');
        cx.fillStyle = g; cx.fillRect(rx, ry, rw, rh);
      };
      edge(tl.x > -2, x0, 0, x0 + fw, 0, x0, y0, fw, y1 - y0);
      edge(br.x < W + 2, x1, 0, x1 - fw, 0, x1 - fw, y0, fw, y1 - y0);
      edge(tl.y > -2, 0, y0, 0, y0 + fw, x0, y0, x1 - x0, fw);
      edge(br.y < H + 2, 0, y1, 0, y1 - fw, x0, y1 - fw, x1 - x0, fw);
    }

    // the board
    // (in the taking the board changes with every letter it burns: it is laid again six times a second at most, not on every hit)
    if (baseDirty && (!S.possessing || G.t - baseAt > 160)) { perf('base', renderBase); baseAt = G.t; }
    cx.save();
    cx.translate(BOARD.cx, BOARD.cy); cx.scale(BOARD.s, BOARD.s);
    perf('board', () => { cx.drawImage(SHADOW.board, -600 + 10 - 40, -400 + 16 - 40, 1280, 880); cx.drawImage(baseCv, -600, -400, 1200, 800); });
    drawDare(cx);
    cx.globalCompositeOperation = 'multiply';
    cx.fillStyle = PL.board.tint || 'rgb(232,204,168)'; roundRectPath(cx, -600, -400, 1200, 800, 34); cx.fill();
    cx.globalCompositeOperation = 'source-over';
    // a board clip starts on this very picture (tools/board-frames.js writes it for Flow): the board's middle 3:2 of the frame
    if (PV.board && PV.board.el.readyState >= 2) {
      const el = PV.board.el, vw = el.videoWidth, vh = el.videoHeight, sw = Math.min(vw, vh * 1.5), sh = sw / 1.5;
      cx.save(); roundRectPath(cx, -600, -400, 1200, 800, 34); cx.clip();
      try { cx.drawImage(el, (vw - sw) / 2, (vh - sh) / 2, sw, sh, -600, -400, 1200, 800); } catch (e) { /* not yet */ }
      cx.restore();
    }

    // the letter the planchette is on, lit by the candles; and a letter the possession has scorched, still hot: an ember glow in it
    // (Pierce's own, restored from 5efb4f7: the scorch, the glow, the flecks and the crackle)
    cx.globalCompositeOperation = 'lighter';
    const fc = flameColor();
    for (const k in GLYPHS) {
      const g = GLYPHS[k];
      if (g.glow > 0.01) {
        const rr = g.size * (k.length > 1 ? 1.6 : 0.95);
        const gg = cx.createRadialGradient(g.x, g.y, 0, g.x, g.y, rr);
        gg.addColorStop(0, `rgba(${fc[0]},${fc[1]},${fc[2]},${0.42 * g.glow})`); gg.addColorStop(1, 'rgba(0,0,0,0)');
        cx.fillStyle = gg; cx.fillRect(g.x - rr, g.y - rr, rr * 2, rr * 2);
      }
      if (g.heat > 0.01) {
        const rr = g.size * 0.8 * (0.85 + Math.random() * 0.3);
        const gg = cx.createRadialGradient(g.x, g.y, 0, g.x, g.y, rr);
        gg.addColorStop(0, `rgba(255,110,30,${0.5 * g.heat})`); gg.addColorStop(1, 'rgba(0,0,0,0)');
        cx.fillStyle = gg; cx.fillRect(g.x - rr, g.y - rr, rr * 2, rr * 2);
      }
    }
    cx.globalCompositeOperation = 'source-over';

    perf('faces', () => { drawFace(cx, 'sun'); drawFace(cx, 'moon'); });

    perf('planchette', () => drawPlanchette(cx));
    perf('parts', () => drawParts(cx));
    cx.restore();

    // ------- screen space: light, post
    cx.setTransform(1, 0, 0, 1, 0, 0);
    perf('plume', drawPlumes);   // the possession's smoke, in the room: under its light, like the board
    perf('light', drawLight);
    perf('shadowFilm', () => { drawShadowPass(); drawFilm(); });
    // vignette + grain: one look all night (the dread never closes it in)
    cx.globalAlpha = 1; cx.drawImage(vignCv, 0, 0, cv.width, cv.height);
    if (grain.length && !FX.low) {
      const gr0 = (PL.film && PL.film.grain != null) ? PL.film.grain : 0.07;
      cx.globalAlpha = gr0; cx.globalCompositeOperation = 'overlay';
      const gcv = grain[(Math.random() * grain.length) | 0];
      const pat = cx.createPattern(gcv, 'repeat');
      cx.save(); cx.translate(rnd(0, 160), rnd(0, 160)); cx.scale(DPR, DPR); cx.fillStyle = pat; cx.fillRect(-160, -160, W + 320, H + 320); cx.restore();
      cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 1;
    }
    if (G.intro > 0.01) {
      cx.fillStyle = `rgba(0,0,0,${G.intro})`;
      cx.fillRect(0, 0, cv.width, cv.height);
    }
    // flames are light: they show through any dark, and the smoke catches what little there is
    perf('flames', () => { drawFlames(); drawSmokeFilm(); });
  }

  function drawLight() {
    const lw = lightCv.width, lh = lightCv.height, sx = lw / W, sy = lh / H;
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, lw, lh);
    // one darkness all night: it changes only when a candle does (a blackout takes it nearly all the way)
    const dk = clamp(M.dark, 0, 0.985);
    lc.fillStyle = `rgba(${M.tint[0]},${M.tint[1]},${M.tint[2]},${lerp(dk, 0.978, Math.max(G.black, famBlack()))})`;
    lc.fillRect(0, 0, lw, lh);
    lc.globalCompositeOperation = 'destination-out';
    const fl = G.flameLevel * (1 - G.gutter * 0.6) * (1 - 0.18 * (G.crowd || 0));   // G.crowd: the one behind them at their ear
    PLATE.candles.forEach((k0, i) => {
      if (fl < 0.02) return;
      const k = candleAt(k0);
      const p = worldToScreen(k.x, k.y);
      const flick = 1 - (1 - (0.86 + 0.14 * Math.sin(G.t / 70 + i * 3) * Math.sin(G.t / 113 + i))) * lightSteady();
      const on = 1 - G.candleOut[i];
      if (on < 0.02) return;
      // as much light as the flame shows: the engine's flame height, or the flame family's level (a jump, a death)
      const r = 900 * CAM.s * fl * on * (0.95 + 0.05 * flick) * famLight(i, 0.55 + 0.45 * Math.min(1, FL[i].h));
      if (!(r > 0.5) || !isFinite(r + p.x + p.y)) return;
      const g = lc.createRadialGradient(p.x * sx, p.y * sy, 0, p.x * sx, p.y * sy, r * sx);
      g.addColorStop(0, `rgba(0,0,0,${0.95 * fl * flick})`); g.addColorStop(0.4, `rgba(0,0,0,${0.45 * fl * flick})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g; lc.fillRect(0, 0, lw, lh);
    });
    // in a blackout, a small warm glow goes where your finger goes
    if (G.pglow > 0.01) {
      const q = glowPoint(), r = 190 * CAM.s * G.pglow;
      if (isFinite(r + q.x + q.y)) {
      const gg = lc.createRadialGradient(q.x * sx, q.y * sy, 0, q.x * sx, q.y * sy, r * sx);
      gg.addColorStop(0, `rgba(0,0,0,${0.92 * G.pglow})`); gg.addColorStop(0.55, `rgba(0,0,0,${0.5 * G.pglow})`); gg.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = gg; lc.fillRect(0, 0, lw, lh);
      }
    }
    cx.drawImage(lightCv, 0, 0, cv.width, cv.height);
    // a candle that went out: its photographed flame goes dark too (a place with live flames has none)
    if (!FLAMES) PLATE.candles.forEach((k0, i) => {
      const out = G.candleOut[i]; if (out < 0.02) return;
      const k = candleAt(k0), p = worldToScreen(k.x, k.y - 8), r = 70 * CAM.s * DPR;
      const gg = cx.createRadialGradient(p.x * DPR, p.y * DPR, 0, p.x * DPR, p.y * DPR, r);
      gg.addColorStop(0, `rgba(2,2,4,${0.92 * out})`); gg.addColorStop(1, 'rgba(2,2,4,0)');
      cx.fillStyle = gg; cx.fillRect(p.x * DPR - r, p.y * DPR - r, r * 2, r * 2);
    });
    // flame glows, added on top (a morning with nothing burning has none)
    cx.globalCompositeOperation = 'lighter';
    const fc = flameColor();
    PLATE.candles.forEach((k0, i) => {
      if (fl < 0.02 || (PL.daylight && !FLAMES)) return;
      const k = candleAt(k0);
      const p = worldToScreen(k.x, k.y - 6);
      const flick = 1 - (1 - (0.8 + 0.2 * Math.sin(G.t / 55 + i * 2) * Math.sin(G.t / 91 + i))) * lightSteady();
      const on = 1 - G.candleOut[i]; if (on < 0.02) return;
      const r = 120 * CAM.s * fl * on * flick * DPR * famLight(i, 0.5 + 0.5 * Math.min(1, FL[i].h));
      if (!(r > 0.5) || !isFinite(r + p.x + p.y)) return;
      const g = cx.createRadialGradient(p.x * DPR, p.y * DPR, 0, p.x * DPR, p.y * DPR, r);
      g.addColorStop(0, `rgba(${fc[0]},${fc[1]},${fc[2]},${0.55 * fl})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = g; cx.fillRect(p.x * DPR - r, p.y * DPR - r, r * 2, r * 2);
    });
    if (G.pglow > 0.01) {
      const q = glowPoint(), r = 130 * CAM.s * DPR * G.pglow;
      if (isFinite(r + q.x + q.y)) {
      const gg = cx.createRadialGradient(q.x * DPR, q.y * DPR, 0, q.x * DPR, q.y * DPR, r);
      gg.addColorStop(0, `rgba(255,150,70,${0.16 * G.pglow})`); gg.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = gg; cx.fillRect(q.x * DPR - r, q.y * DPR - r, r * 2, r * 2);
      }
    }
    cx.globalCompositeOperation = 'source-over';
  }
  // How much the light flickers: all of it, or (the flames of a house that has been let in) almost none, as still as paint.
  const lightSteady = () => (G.steady === 'paint' ? 0.08 : G.steady ? 0.4 : 1);

  // The place's film stock, over the whole room: one look for the whole night. Sepia tones the frame without changing how dark it is; the tint
  // lifts the blacks the way old stock does. The Farmhouse's stock is the default and gets neither, so it looks exactly as it always has.
  function drawFilm() {
    const f = PL.film || {};
    const sep = f.sepia || 0;
    if (sep > 0.005) {
      cx.globalCompositeOperation = 'color'; cx.globalAlpha = Math.min(1, sep * 1.15);
      cx.fillStyle = 'rgb(160,112,62)'; cx.fillRect(0, 0, cv.width, cv.height);
    }
    const t = f.tint;
    if (t && !(t[0] === 4 && t[1] === 6 && t[2] === 12)) {
      const top = Math.max(t[0], t[1], t[2], 1), k = top > 22 ? 22 / top : 1;
      cx.globalCompositeOperation = 'screen'; cx.globalAlpha = 1;
      cx.fillStyle = `rgb(${(t[0] * k) | 0},${(t[1] * k) | 0},${(t[2] * k) | 0})`; cx.fillRect(0, 0, cv.width, cv.height);
    }
    cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 1;
  }

  // Someone walks between you and the candles.
  function drawShadowPass() {
    const s = G.shadow; if (!s) return;
    const k = (G.t - s.t0) / s.dur;
    if (k >= 1) { G.shadow = null; return; }
    const x = (s.dir > 0 ? lerp(-0.45, 1.45, k) : lerp(1.45, -0.45, k)) * W * DPR, y = H * 0.42 * DPR;
    const rx = W * 0.32 * DPR, a = Math.sin(Math.PI * k) * 0.78;
    cx.save(); cx.translate(x, y); cx.scale(1, 2.4);
    const gg = cx.createRadialGradient(0, 0, 0, 0, 0, rx);
    gg.addColorStop(0, `rgba(0,0,0,${a})`); gg.addColorStop(0.6, `rgba(0,0,0,${a * 0.7})`); gg.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = gg; cx.fillRect(-rx, -rx, rx * 2, rx * 2); cx.restore();
  }
  // Where a candle's flame sits on screen, as fractions of the viewport.
  function candleScreen(i) { const c = candleAt(PLATE.candles[i]); const p = worldToScreen(c.x, c.y - 8); return { x: p.x / W, y: p.y / H }; }

  // ---------------------------------------------------------------- update loop
  // Game time is the wall clock. Physics runs in fixed 60 Hz steps, so a slow
  // or throttled device keeps true time instead of playing in slow motion.
  let last = 0;
  const T0 = performance.now();
  // Frame budget. A small screen skips the second vignette and keeps fewer particles; if frames still run long
  // (an older phone), the film grain goes too, and comes back when there is time for it again.
  const FX = { low: false, small: false, acc: 0, n: 0 };
  function watchFrames(dt) {
    FX.small = Math.min(W, H) < 500;
    if (document.hidden || dt <= 0 || dt > 0.25) return;
    FX.acc += dt; FX.n++;
    if (FX.n < 90) return;
    const avg = FX.acc / FX.n; FX.acc = 0; FX.n = 0;
    if (avg > 0.021) FX.low = true; else if (avg < 0.0125) FX.low = false;
  }
  function stepSim(dt) {
    updatePlanchette(dt);
    updateParts(dt);
  }
  function frame() {
    const now = performance.now();
    const dtReal = Math.min(0.5, (now - (last || now)) / 1000); last = now;
    watchFrames(dtReal);
    G.t = now - T0;
    let sim = dtReal * G.slow;
    if (G.hitstop > 0) { G.hitstop -= dtReal * 1000; sim = 0; }
    const target = moodTarget();
    const mk = 1 - Math.exp(-dtReal * 2.2);
    M.dark = lerp(M.dark, target.dark, mk);
    for (let i = 0; i < 3; i++) M.tint[i] = lerp(M.tint[i], target.tint[i], mk);
    G.gutter = Math.max(0, G.gutter - dtReal * 0.8); if (G.gutter <= 0) G.gutterWho = -1;
    clipTick(dtReal);
    perf('famUpdate', () => famUpdate(dtReal));
    plumeTick(dtReal);
    G.goldRim = 0.5 + 0.5 * Math.sin(G.t / 400);
    for (let i = 0; i < 2; i++) G.candleOut[i] = lerp(G.candleOut[i], G.candleOutT[i], 1 - Math.exp(-dtReal * 9));
    G.black = lerp(G.black, G.blackT, 1 - Math.exp(-dtReal * (G.blackT > G.black ? 8 : 2.6)));
    G.pglow = lerp(G.pglow, G.pglowT, 1 - Math.exp(-dtReal * 4));
    updateFlames(dtReal);
    for (const k in GLYPHS) {
      const g = GLYPHS[k];
      g.glow = Math.max(0, g.glow - dtReal * 0.5);
      // a scorched letter stays hot a while, and sheds embers as it cools (no smoke off it: the only smoke is filmed)
      if (g.heat > 0) {
        g.heat = Math.max(0, g.heat - dtReal * 0.25);
        if (Math.random() < g.heat * 0.3) emit('ember', g.x, g.y, 1, { min: 10, max: 40, lmin: 0.5, lmax: 1.2 });
      }
    }
    if (sim > 0) {
      let left = sim;
      perf('sim', () => { while (left > 1e-6) { const d = Math.min(left, 1 / 60); stepSim(d); left -= d; } });
    }
    updateFaces(dtReal);
    updateCrowd(dtReal);
    updateCamera(dtReal);
    syncUI();
    if (pewOpen) return; // The Pew covers the table: no pad input, no canvas work
    pollPad();
    perf('draw', draw);
  }
  const DBG = { after: null };   // ?debug: a test's look at each frame, right after it is drawn
  let rafAt = 0;
  function rafLoop() { rafAt = performance.now(); frame(); if (DBG.after) { try { DBG.after(); } catch (e) { DBG.after = null; } } requestAnimationFrame(rafLoop); }
  // If the browser stops sending animation frames (window covered, some app views), keep the séance moving on a timer instead of freezing
  // mid-scene. (2026-10-05: only when the animation frames have stopped. A phone that was merely slow got a second frame from the timer on
  // top of every slow one, and the taking fell into a stall.)
  setInterval(() => { const t = performance.now(); if (t - rafAt > 400 && t - last > 120) frame(); }, 50);

  // ---------------------------------------------------------------- input
  let ptr = null;
  // Where the finger or the mouse is, for the glow in a blackout. Any input counts as someone still being there.
  const PG = { x: -1, y: -1, t: -Infinity, mouse: false };
  let lastInput = 0;
  const touched = () => { lastInput = G.t; };
  addEventListener('pointermove', (e) => {
    const dx = e.clientX - PG.x, dy = e.clientY - PG.y, had = PG.x >= 0;
    PG.x = e.clientX; PG.y = e.clientY; PG.t = G.t; PG.mouse = e.pointerType === 'mouse'; touched();
    // MIMIC: it copies you, mirrored, even when you aren't holding it
    if (P.mode === 'mimic' && had && !(ptr && e.pointerId === ptr.id)) {
      const k = 1 / (CAM.s * BOARD.s);
      P.tx = clamp(P.tx - dx * k, -520, 520); P.ty = clamp(P.ty + dy * k, -330, 340);
    }
  }, { passive: true });
  addEventListener('keydown', touched);
  cv.addEventListener('pointerdown', (e) => {
    PG.x = e.clientX; PG.y = e.clientY; PG.t = G.t; PG.mouse = e.pointerType === 'mouse'; touched();
    if (!S.started) return;
    const b = screenToBoard(e.clientX, e.clientY);
    if (S.soft && !S.stopping && onGoodbye(b)) { softEnd(); return; }   // the soft exit: one touch on GOOD BYE
    if (tapCatch) { tapCatch(b.x, b.y); return; }   // Do as I do: every touch is a tap on the slate
    if (onDare(b)) { tapDare(); return; }
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
    ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, face: null, moved: false, abs: false, bx: null, by: null, t0: G.t, x0: e.clientX, y0: e.clientY };
    noteDid('touch');
    if (!ptr.face) {
      P.dragging = true; P.tx = P.x; P.ty = P.y; P.vx = P.vy = 0;
      // A finger on the board takes hold of the planchette where it touches, the glass a little above the
      // fingertip so the thumb never covers it. A mouse (or a finger off the board) moves it like a trackpad.
      // In the struggle any touch takes hold: the thumb that keeps it on GOOD BYE rests below the board.
      if (e.pointerType !== 'mouse' && (P.mode === 'struggle' || (Math.abs(b.x) < 640 && Math.abs(b.y) < 450))) {
        ptr.abs = true; fingerAt(e);
        if (P.mode === 'free' && !P.path) { P.tx = ptr.bx; P.ty = ptr.by; }
      }
    }
  });
  function fingerLift() {   // the planchette's lower half, and a little air
    const lift = 108 * BOARD.s * CAM.s + 16;
    if (P.mode !== 'struggle') return lift;
    // Holding GOOD BYE never needs a thumb in the home-bar strip: on a short screen the glass sits nearer the finger.
    const gb = (BOARD.cy + GLYPHS.GOODBYE.y * BOARD.s - CAM.y) * CAM.s + H / 2;
    return clamp(H - SAFE.b - 34 - gb, 0, lift);
  }
  function fingerAt(e) {
    const t = screenToBoard(e.clientX, e.clientY - fingerLift());
    ptr.bx = clamp(t.x, -520, 520); ptr.by = clamp(t.y, -330, 340);
  }
  cv.addEventListener('pointermove', (e) => {
    if (!ptr || e.pointerId !== ptr.id) return;
    const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
    if (!ptr.moved && Math.hypot(e.clientX - ptr.x0, e.clientY - ptr.y0) > 24) { ptr.moved = true; if (P.dragging && !P.path) noteDid('drag'); }
    if (P.slack) { ptr.x = e.clientX; ptr.y = e.clientY; return; }   // it is moving on its own now
    const k = 1 / (CAM.s * BOARD.s);
    if (ptr.abs) {
      fingerAt(e);
      if (P.mode === 'free' && !P.path) { P.tx = ptr.bx; P.ty = ptr.by; }
      else if (P.mode === 'mimic') { P.tx = clamp(P.tx - dx * k, -520, 520); P.ty = clamp(P.ty + dy * k, -330, 340); }
      else if (P.mode === 'struggle' && !P.path) { /* the struggle pulls it toward your finger, against the thing pulling it away */ }
      else { P.handDX += dx * k; P.handDY += dy * k; }
      ptr.x = e.clientX; ptr.y = e.clientY;
      return;
    }
    // the planchette moves with the mouse, like a trackpad, so the pointer never covers the window
    if (P.mode === 'mimic') { P.tx = clamp(P.tx - dx * k, -520, 520); P.ty = clamp(P.ty + dy * k, -330, 340); }
    else if ((P.mode === 'free' || P.mode === 'struggle') && !P.path) { P.tx = clamp(P.tx + dx * k, -520, 520); P.ty = clamp(P.ty + dy * k, -330, 340); }
    else { P.handDX += dx * k; P.handDY += dy * k; }
    ptr.x = e.clientX; ptr.y = e.clientY;
  });
  const endPtr = (e) => {
    if (!ptr || e.pointerId !== ptr.id) return;
    if (G.t - ptr.t0 > 900) noteDid('hold');
    ptr = null; P.dragging = false;
  };
  cv.addEventListener('pointerup', endPtr);
  // a mouse over the dare's words shows it can be pressed
  cv.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && !ptr) cv.style.cursor = S.started && onDare(screenToBoard(e.clientX, e.clientY)) ? 'pointer' : ''; }, { passive: true });
  cv.addEventListener('pointercancel', endPtr);

  addEventListener('keydown', (e) => {
    if (!S.started || pewOpen) return;
    if (document.activeElement && document.activeElement.id === 'q') return;
    if (tapCatch && (e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); tapCatch(P.x, P.y); return; }
  });

  // Xbox controller: left stick moves the planchette,
  // A asks the highlighted card, LB/RB pick a card. Rumble on impacts.
  let padPrev = {}, pad = null;
  function pollPad() {
    let pads;
    try { pads = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { return; }
    pad = pads && Array.from(pads).find(Boolean);
    if (!pad || !S.started) return;
    const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    const dz = (v) => (Math.abs(v) < 0.14 ? 0 : v);
    const sx = dz(ax), sy = dz(ay);
    const btn = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed);
    const press = (i) => btn(i) && !padPrev[i];
    if (pad.buttons.some((b) => b && b.pressed)) touched();
    if (tapCatch && press(0)) tapCatch(P.x, P.y);
    if (sx || sy) touched();
    if (P.slack) { /* it is moving on its own */ } else if (sx || sy) {
      if (P.mode === 'struggle' && !P.path) { P.dragging = true; P.tx = clamp(P.tx + sx * 14, -520, 520); P.ty = clamp(P.ty + sy * 14, -330, 340); }
      else if (P.mode === 'mimic') { P.tx = clamp(P.tx - sx * 9, -520, 520); P.ty = clamp(P.ty + sy * 9, -330, 340); }
      else if (P.mode === 'free' && !P.path) { P.dragging = true; P.tx = clamp(P.x + sx * 90, -520, 520); P.ty = clamp(P.y + sy * 90, -330, 340); }
      else { P.handDX += sx * 6; P.handDY += sy * 6; }
    } else if (!ptr) P.dragging = false;
    // A asks what the pencil note says
    if (press(0) && !tapCatch && noteEl && !noteEl.hidden) noteEl.click();
    padPrev = {}; pad.buttons.forEach((b, i) => { padPrev[i] = b.pressed; });
  }
  function rumble(ms, strong, weak) {
    try { if (pad && pad.vibrationActuator) pad.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }); } catch (e) { /* no rumble */ }
  }
  // The phone itself shakes (Android; iPhones have no web vibration): knocks, the lunge, the struggle.
  function buzz(pattern) { try { if (navigator.vibrate && !S.muted) navigator.vibrate(pattern); } catch (e) { /* no vibration */ } }
  // The screen never sleeps while the table is lit. Re-asked when you come back to the page; a refusal is fine.
  let wakeLock = null;
  async function wake(on) {
    try {
      if (on) {
        if (wakeLock || !navigator.wakeLock || document.visibilityState !== 'visible') return;
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } else if (wakeLock) { const w = wakeLock; wakeLock = null; await w.release(); }
    } catch (e) { wakeLock = null; }
  }
  // They leave the page mid-night (another tab, the phone locked): the tab's title becomes the last line the board spelled (and nothing
  // else), and it is put back the moment they return; how long they were gone goes to the demon with the next move (NIGHT.away).
  const TITLE0 = document.title;
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && S.started) wake(true);
    if (!S.started) return;
    if (document.hidden) {
      NIGHT.hidAt = Date.now();
      const last = NIGHT.spelledLines[NIGHT.spelledLines.length - 1];
      if (last && !S.stopping && !S.soft) { NIGHT.titled = true; document.title = last; }
    } else {
      if (NIGHT.titled) { NIGHT.titled = false; document.title = TITLE0; }
      if (NIGHT.hidAt) { NIGHT.away += Math.round((Date.now() - NIGHT.hidAt) / 1000); NIGHT.hidAt = 0; noteDid('hid'); }
    }
  });
  // Nothing on the table scrolls, zooms or bounces: only the cards (and the menus) scroll, and pinches do nothing.
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1 || !(e.target.closest && e.target.closest('#share, #pew'))) { if (e.cancelable) e.preventDefault(); }
  }, { passive: false });
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((t) => document.addEventListener(t, (e) => e.preventDefault()));
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---------------------------------------------------------------- the transcript
  const tq = $('#tq'), ta = $('#ta'), tref = $('#tref');
  function showQuestion(q) { tq.textContent = q; tq.classList.remove('plain', 'waiting', 'pencil', 'fading'); ta.classList.remove('fading'); ta.textContent = ''; ta.dataset.len = ''; ta.classList.remove('hint'); if (tref) tref.hidden = true; fitTa(); }
  function addLetter(ch, cls) {
    if (S.cut && S.unprompted) return document.createElement('span');   // its own line was cut for the dare
    ta.classList.remove('fading');
    const sp = document.createElement('span'); sp.textContent = ch; if (cls) sp.className = cls; ta.appendChild(sp);
    fitTa();
    return sp;
  }
  // A line the board spelled on its own (no question over it) does not stay up as a caption: four seconds after it
  // stops, it fades off the line. A question and its answer stay until the next one.
  function settleLine() {
    if (!ta || tq.textContent || !ta.textContent.trim()) return;
    const mark = ta.textContent;
    setTimeout(() => {
      if (ta.textContent !== mark || tq.textContent || S.busy) return;
      ta.classList.add('fading');
      setTimeout(() => { if (ta.classList.contains('fading')) { ta.classList.remove('fading'); if (ta.textContent === mark && !tq.textContent) { ta.textContent = ''; fitTa(); } } }, 1300);
    }, 4000);
  }
  function hint(text) { ta.textContent = text; ta.classList.add('hint'); fitTa(); }
  // An instruction the first time it is needed, once per player and never again: written in pencil on the wood, in her hand, in the
  // line under the board (the same line as the note), never in the type of an app. The soft exit's own instruction is not one of these:
  // a frightened player is always told how to stop (hint() above).
  const HINTS = { seen: new Set(), loaded: false };
  function hintSeen(key) {
    if (!HINTS.loaded) { HINTS.loaded = true; try { (JSON.parse(localStorage.getItem('goodbye.hints') || '[]') || []).forEach((k) => HINTS.seen.add(k)); } catch (e) { /* none kept */ } }
    return HINTS.seen.has(key);
  }
  function penHint(key, text) {
    if (hintSeen(key)) return false;
    HINTS.seen.add(key);
    try { localStorage.setItem('goodbye.hints', JSON.stringify([...HINTS.seen])); } catch (e) { /* once a session then */ }
    S.penHint = text; renderNote(); return true;
  }
  function clearPenHint() { if (S.penHint) { S.penHint = ''; renderNote(); } }
  // On its side the answer sits in the narrow gap between the pills: it stays on one line, smaller if it has to.
  // Only an answer too long even at 12px wraps, and then the card column starts under it.
  let taFit = false;
  function fitTa() {
    if (!ta || !trEl) return;
    if (taFit) { ta.style.fontSize = ''; ta.style.letterSpacing = ''; ta.style.whiteSpace = ''; taFit = false; document.documentElement.style.removeProperty('--trbot'); }
    if (!short || !ta.firstChild) return;
    const avail = trEl.clientWidth; if (!avail) return;
    taFit = true; ta.style.whiteSpace = 'nowrap';
    if (ta.scrollWidth <= avail) return;
    const base = parseFloat(getComputedStyle(ta).fontSize) || 19;
    ta.style.letterSpacing = '.1em';   // tighter before smaller
    const w = ta.scrollWidth;
    if (w <= avail) return;
    ta.style.fontSize = Math.max(12, Math.floor(base * avail / w * 0.97)) + 'px';
    if (ta.scrollWidth <= avail) return;
    ta.style.whiteSpace = '';
    document.documentElement.style.setProperty('--trbot', Math.round(trEl.getBoundingClientRect().bottom + 6) + 'px');
  }

  // ---------------------------------------------------------------- spelling
  // fast: the quick patter. hostile: a harder tock. Nothing is burned into the wood: a letter is only lit a moment by the candles.
  function commit(g, hostile, fast) {
    g.glow = 1;
    if (PL.planchette === 'glass') A.clink(hostile); else A.tock(hostile);
    rumble(60, hostile ? 0.6 : 0.15, hostile ? 0.4 : 0.25);
  }
  // The possession burns what it touches (Pierce's embers, restored from 5efb4f7, where commit(g, true) did this): the letter is scorched
  // into the board for the rest of the night (renderBase multiplies the char still under it), glows like a coal while it is hot, sheds
  // embers, and crackles. light: the quick patter, which marks a letter instead of burning it in. Only the possession calls it: a violent
  // reply from the demon lands hard, and burns nothing.
  function scorch(g, light) {
    if (!g) return;
    if (light) { g.scorch = Math.min(1, g.scorch + 0.3); g.heat = Math.max(g.heat, 0.6); emit('ember', g.x, g.y, 5, { min: 20, max: 80 }); }
    else { g.scorch = Math.min(1, g.scorch + 0.6); g.heat = 1; A.crackle(0.6); emit('ember', g.x, g.y, 14, { min: 20, max: 90 }); }
    baseDirty = true;
  }
  // How fast it spells (Pierce, 2026-10-05: "slow as shit", the spelling "too slow to follow"): a whole phrase is read as it lands, so
  // the planchette is quick and sure, letter to letter, and the line builds under the board as it goes. A short line is given its weight
  // (about a quarter of a second a letter); a long one runs at about 130 ms a letter, travel and landing together; a doubled letter is a
  // quick tap on the same mark, and a space is a beat where it is (it never goes back to the middle between words). PACE (below) scales
  // it: slow is deliberate, violent slams. ms: the time a letter takes, travel and landing; the landing is about two fifths of it.
  function letterMs(len, mul) {
    const base = len <= 6 ? 250 : len <= 12 ? 190 : len <= 22 ? 150 : 120;
    return base * (mul || 1);
  }
  async function spell(text, o = {}) {
    const t = String(text).toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
    if (!t) return;
    // a name: only the name event may spell one, NAMEUSE.max a night; anywhere else it is refused
    if (sayHasName(t)) {
      if (!o.nameUse || NAMEUSE.spelled + NAMEUSE.voiced >= NAMEUSE.max || S.stopping || S.soft) return;
      NAMEUSE.spelled++; NAMEUSE.log.push({ n: t, how: 'spelled', at: Math.round(G.t) });
    }
    markSaid(t); NIGHT.spelledLines.push(t);
    const cut = () => S.cut && S.unprompted;
    const hostile = !!o.hostile, fast = !!o.fast;
    const per = o.letterMs ?? letterMs(t.replace(/ /g, '').length, o.mul ?? (fast ? 0.5 : hostile ? 0.75 : S.mood === 'holy' ? 1.4 : 1));
    // travel takes about three fifths of a letter's time (the board is about a thousand units across: a long hop is a little longer)
    const hop = { base: Math.round(per * 0.24), pace: per * 0.0008 };   // (a long hop takes a little longer than a short one: legible)
    const dwellOf = () => o.dwell ?? Math.round(per * rnd(0.34, 0.46));
    ta.dataset.len = t.length > 26 ? 'long' : t.length > 16 ? 'mid' : '';
    const whole = t.replace(/ /g, '');
    if (whole === 'YES' || whole === 'NO' || whole === 'GOODBYE') {
      const g = GLYPHS[whole];
      await moveTo(g.x, g.y, { pace: o.pace ?? 0.5, base: o.base ?? 120, dwell: o.dwell ?? (fast ? 120 : 650) });
      if (cut()) return;
      commit(g, hostile, fast); addLetter(whole === 'GOODBYE' ? 'GOOD BYE' : whole);
      return;
    }
    let prev = null, wordStart = true, landed = 0;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if ((o.stopAt && o.stopAt()) || cut()) return;
      // the board spells YOU: both faces look straight out at them while it does
      if (wordStart && ch !== ' ') { const w = t.slice(i).split(' ')[0]; if (/^YOU/.test(w)) eyesOnYou(900 + w.length * per * 1.4); }
      wordStart = ch === ' ';
      if (ch === ' ') {
        // a beat between words, where it is: a breath of a lift, never back to the middle
        P.tx = P.x; P.ty = P.y;
        await wait(Math.round(per * 0.6));
        addLetter(' '); prev = null; continue;
      }
      const g = GLYPHS[ch]; if (!g) continue;
      // (the way to the first letter is a little slower than the rest: the eye has to find where the line starts)
      const lead = !landed ? 1.6 : 1;
      if (ch === prev) await circleOn(g, Math.round(per * 1.1), 14);
      else await moveTo(g.x, g.y, { pace: hop.pace * lead, base: Math.round(hop.base * lead), dwell: dwellOf(), curve: rnd(0.04, 0.14) });
      if (cut()) return;
      commit(g, hostile, fast); addLetter(ch); prev = ch; landed++;
    }
  }

  // ---------------------------------------------------------------- the demon (live, every move)
  // Pierce, 2026-10-04: "i just want you, claude ... this is a you vs the user type of thing only". There is no script, no night plan
  // and no written line: every line typed goes to the site (goodbyeSpirit) with the whole night so far and what the house just did,
  // and the site's Claude answers as tonight's demon with JSON that drives the planchette (perform, below). While it thinks, the
  // planchette circles. If the site cannot be reached, is over its limit or does not answer, the planchette circles, hesitates and
  // goes back to the middle: never a letter that was not the demon's. A pencil note says so, once a night.
  // DEMONIC: a demon's name, or the words of a summoning. A name is never taken from a line that has one, and the board never spells one.
  const DEMONIC = /\b(demons?|devils?|satan|lucifer|beelzebub|bael|baal|zozo|mimi|crapoulet|legion|mammon|astaroth|asmodeus|belial|abaddon|pazuzu|moloch|hell|summon\w*|possess\w*|let (him|it|them) in|come through|show yourself|evil|unholy|dark one|666|antichrist|splitfoot)\b/i;
  const hasDemon = () => !!(PL.demon && PL.demon.id);
  const DEBUG = /[?&]debug\b/.test(location.search);
  function apiBase() {
    let u = window.GOODBYE_API || '';
    if (DEBUG) { const m = /[?&]api=([^&#]+)/.exec(location.search); if (m) u = decodeURIComponent(m[1]); }
    u = String(u || '').trim();
    if (!/^https?:\/\//i.test(u)) return '';
    return u.endsWith('/') ? u : u + '/';
  }
  const NET = { calls: 0, fails: 0, last: null, moveOut: 0 };
  // text/plain keeps it a simple request (no CORS preflight to wait on); the body is JSON all the same. (The test lane's header makes it a
  // preflighted one: the site allows it.)
  async function post(fn, body, ms) {
    const base = apiBase(); if (!base) return null;
    NET.calls++;
    const ac = window.AbortController ? new AbortController() : null;
    const timer = setTimeout(() => { try { if (ac) ac.abort(); } catch (e) { /* gone */ } }, ms);
    const work = (async () => {
      const headers = { 'Content-Type': 'text/plain;charset=UTF-8' };
      if (LANE && /^goodbye(Spirit)$/.test(fn)) headers['x-goodbye-test'] = LANE.tok;
      const r = await fetch(base + fn, { method: 'POST', headers, body: JSON.stringify(body), signal: ac ? ac.signal : undefined, credentials: 'omit', cache: 'no-store' });
      if (r.status === 429) return { limited: true };
      if (r.status === 410) return { off: true };
      if (!r.ok) return null;
      const j = await r.json();
      return j && typeof j === 'object' ? j : null;
    })().catch(() => null);
    try {
      const out = await Promise.race([work, wait(ms).then(() => null)]);
      NET.last = out ? 'ok' : 'fail'; if (!out) NET.fails++;
      return out;
    } finally { clearTimeout(timer); }
  }
  // What the planchette may spell: A-Z, 0-9 and spaces, forty at most. A line over forty is thrown away, never cut, and a line
  // that crosses a hard line (the safety section) is thrown away, never fixed: the moves still happen, the letters do not.
  // (The site has checked it already; this is the phone's own second look. A name at the table is spell()'s to allow, once.)
  // (2026-10-05: forty, the site's own limit: full phrases. The phone keeps only the safety lines: a demon's name from lore, never the word
  // demon or the room's own menace.)
  const SAY_MAX = 40, EAR_MAX = 48, EAR_WORDS = 6;
  const LORE = /\b(satan|lucifer|beelzebub|bael|baal|zozo|mimi|crapoulet|legion|mammon|astaroth|asmodeus|belial|abaddon|pazuzu|moloch|lilith|leviathan|azazel|mephisto\w*|belphegor|valak|paimon|antichrist|splitfoot)\b/i;
  function cleanSay(v) {
    const a = String(v == null ? '' : v).toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
    if (!a || a.length > SAY_MAX) return '';
    if (/\b(AI|CLAUDE|GEMINI|MODEL|BOT|ASSISTANT|LANGUAGE)\b/.test(a) || refused(a) || readsRecord(a) || pastYear(a) || LORE.test(a)) return '';
    if (soundsLikeDistress(a)) return '';
    return a;
  }
  // The places the site has a demon for. Anything else asks as the Farmhouse.
  const API_PLACES = ['farmhouse'];
  const apiPlace = () => (API_PLACES.includes(PL.id) ? PL.id : 'farmhouse');

  // ---- the reply: what the site promised, checked once more on the phone (spirit.js REPLY_SCHEMA is the contract)
  //   { distress, say, moves: [{ to, mark, side, ms }], wait_ms, pace: slow|normal|violent, sfx, sfx_side, whisper: { text, side },
  //     lie, sun, moon, closer, edit: { turn, text }, possess, end }
  const MOVE_TO = ['spell', 'YES', 'NO', 'GOODBYE', 'letter', 'number', 'hover', 'circle', 'center', 'edge', 'still', 'shake', 'sound'];
  // (the site's REPLY_SCHEMA sfx enum, in its order: every one but none and silence is a recorded take from the arsenal, audio.js A.rec,
  // most with a synthesized one behind it; the last seven are the demon's own wordless sounds, and a take that has not arrived is silence)
  const SFX = ['none', 'knock', 'knocks', 'steps', 'light', 'near', 'stairs', 'creak', 'door', 'shut', 'chair', 'thud', 'scratch', 'nails', 'drag', 'breath', 'gasp', 'latch', 'rattle', 'floor', 'house', 'glass', 'chime', 'silence',
    'whisper', 'voices', 'shh', 'hum', 'click', 'tap', 'walls', 'whisper-voice'];   // (whisper-voice: where its own words are heard)
  const SIDES = ['', 'left', 'right', 'behind', 'under', 'above'];
  const intIn = (v, a, b) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? clamp(n, a, b) : a; };
  // the voice's words: capitals and spaces, six words and 48 characters at most, the same checks as a spelled line
  function cleanEar(v) {
    const a = String(v == null ? '' : v).toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
    if (!a || a.length > EAR_MAX || a.split(' ').length > EAR_WORDS) return '';
    if (/\b(AI|CLAUDE|GEMINI|MODEL|BOT|ASSISTANT|LANGUAGE)\b/.test(a) || refused(a) || readsRecord(a) || pastYear(a) || LORE.test(a) || soundsLikeDistress(a)) return '';
    return a;
  }
  function cleanReply(r) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
    let sounds = 0;
    const moves = (Array.isArray(r.moves) ? r.moves : []).slice(0, 12).map((m) => {
      if (!m || typeof m !== 'object' || !MOVE_TO.includes(m.to)) return null;
      if (m.to === 'sound') {
        const k = String(m.mark == null ? '' : m.mark).toLowerCase();
        if (k === 'none' || !SFX.includes(k) || ++sounds > 2) return null;
        return { to: 'sound', mark: k, side: SIDES.includes(m.side) ? m.side : '', ms: intIn(m.ms, 0, 6000) };
      }
      const mk = String(m.mark == null ? '' : m.mark).toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (m.to === 'letter' && !/^[A-Z]$/.test(mk)) return null;
      if (m.to === 'number' && !/^[0-9]$/.test(mk)) return null;
      if (m.to === 'hover' && !GLYPHS[mk]) return null;
      const mark = ['letter', 'number', 'hover'].includes(m.to) || (m.to === 'circle' && GLYPHS[mk]) ? mk : '';
      return { to: m.to, mark, side: '', ms: intIn(m.ms, 0, 6000) };
    }).filter(Boolean);
    const w = r.whisper && typeof r.whisper === 'object' ? r.whisper : {};
    const e = r.edit && typeof r.edit === 'object' ? r.edit : {};
    const editText = String(e.text == null ? '' : e.text).replace(/[^A-Za-z0-9 .,?!'-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
    const lie = r.lie === true;
    return {
      distress: false, say: cleanSay(r.say), moves, wait_ms: intIn(r.wait_ms, 0, 8000),
      pace: ['slow', 'normal', 'violent'].includes(r.pace) ? r.pace : 'normal', sfx: SFX.includes(r.sfx) ? r.sfx : 'none',
      sfx_side: SIDES.includes(r.sfx_side) ? r.sfx_side : '',
      whisper: { text: cleanEar(w.text), side: w.side === 'right' ? 'right' : 'left' },
      // the sun never lies (the site holds it to that; so does the phone)
      lie, sun: lie ? 'warn' : (SUN_SET.includes(r.sun) && r.sun !== 'warn' ? r.sun : 'watch'), moon: MOON_SET.includes(r.moon) ? r.moon : 'watch',
      closer: r.closer === true,
      edit: intIn(e.turn, 0, 999) > 0 && editText && !soundsLikeDistress(editText) && !soundsAfraid(editText, NAMES) ? { turn: intIn(e.turn, 0, 999), text: editText } : { turn: 0, text: '' },
      possess: r.possess === true, end: r.end === true,
      // what it asked of them, a call-out, how it used what they erased: the site's ledger reads these from the night so far
      asks: ASKS_OF.includes(r.asks) ? r.asks : 'none', callout: r.callout === true, uses_erased: ERASED_WAYS.includes(r.uses_erased) ? r.uses_erased : 'none',
    };
  }
  const ASKS_OF = ['none', 'answer', 'choose', 'still', 'quiet', 'touch', 'hold', 'stay', 'unseen'];
  const ERASED_WAYS = ['none', 'answered', 'underneath', 'noticed', 'spelled', 'whispered'];
  // A reply as it goes back to the site with the night so far: only what is not the default (the site reads a missing field as its
  // default, so the night reads the same, and a long night stays small).
  function compactReply(r) {
    if (!r || typeof r !== 'object') return r;
    const o = {};
    const dflt = { distress: false, say: '', wait_ms: 0, pace: 'normal', sfx: 'none', sfx_side: '', lie: false, sun: 'watch', moon: 'watch', closer: false, possess: false, end: false,
      asks: 'none', callout: false, uses_erased: 'none' };
    for (const k in r) {
      if (k === 'moves') o.moves = r.moves.map((m) => { const x = { to: m.to }; if (m.mark) x.mark = m.mark; if (m.side) x.side = m.side; if (m.ms) x.ms = m.ms; return x; });
      else if (k === 'whisper') { if (r.whisper && r.whisper.text) o.whisper = r.whisper; }
      else if (k === 'edit') { if (r.edit && r.edit.turn > 0) o.edit = r.edit; }
      else if (!(k in dflt) || r[k] !== dflt[k]) o[k] = r[k];
    }
    return o;
  }
  const compactTurn = (t) => { const o = {}; for (const k in t) { const v = t[k]; if (k === 'r') o.r = compactReply(v); else if (v !== '' && v !== false && v !== 0 && !(Array.isArray(v) && !v.length && k !== 'did')) o[k] = v; } return o; };
  // A folded turn (an old one on a long night): only what the site's ledger reads (whether they typed, why it moved, their hands, where
  // the one behind them stood, when, what it did), and what they erased if it is one of the night's last eight erasures.
  function foldReply(r) {
    const c = compactReply(r);
    if (!c || typeof c !== 'object') return c;
    delete c.wait_ms; delete c.pace; delete c.lie; delete c.sun; delete c.moon;
    if (c.moves) c.moves = c.moves.filter((m) => ['letter', 'number', 'YES', 'NO', 'GOODBYE', 'sound', 'spell'].includes(m.to)).map((m) => { const x = { ...m }; delete x.ms; return x; });
    if (c.edit) c.edit = { turn: c.edit.turn };
    return c;
  }
  function foldTurn(t, keepErased) {
    const x = { k: 1 };
    if (t.q) x.t = 1;
    if (t.part) x.part = true;
    if (!t.q && t.why) x.why = t.why;
    if (t.did && t.did.length) x.did = t.did;
    if (t.behind) x.behind = t.behind;
    if (t.sat) x.sat = t.sat;
    if (keepErased && t.erased) x.erased = t.erased;
    x.r = t.r ? foldReply(t.r) : null;
    return x;
  }
  // The night so far as it goes to the site (Pierce, 2026-10-04: a ninety-move night under the site's 32 KB): the turns from the window
  // on whole (the site shows the last thirty at least one by one; its window moves in steps of twenty, so the cache breaks rarely:
  // spirit.js windowStart), the older ones folded, the night's last eight erasures kept wherever they are; and if a very wordy night is
  // still too big, the oldest whole turns are folded too until it fits (the site reads a folded turn in the window as one it no
  // longer has the words of). n: the turns of the request (the night so far and the move asked for).
  const BODY_MOST = 31000, UTF8 = new TextEncoder();
  function nightTurns(list, n, room) {
    const start = n <= 40 ? 0 : 20 * Math.floor((n - 30) / 20);
    const er = new Set(list.map((t, i) => (t.erased ? i : -1)).filter((i) => i >= 0).slice(-8));
    let cut = Math.min(start, list.length);
    for (;;) {
      const out = list.map((t, i) => (i < cut ? foldTurn(t, er.has(i)) : compactTurn(t)));
      // (bytes, as the site counts them: a line with emoji in it is longer in bytes than in characters)
      if (UTF8.encode(JSON.stringify(out)).length <= room || cut >= list.length) return out;
      cut++;
    }
  }
  // How long the page waits for a move. The site gives up first (its 13 s: Wix ends any backend request at 14), so a call nobody waits
  // for is never paid for.
  const SPIRIT_WAIT = 15000;
  // The test lane (the playtests, 2026-10-04): ?lane=<token> sends the token as the x-goodbye-test header with every call to the site,
  // ?effort=low|medium|high|xhigh|max names the effort of its moves and ?plan=0 turns its plans off. Nothing else changes.
  const LANE = (() => {
    const q = new URLSearchParams(location.search), tok = (q.get('lane') || '').trim();
    if (!/^[A-Za-z0-9_-]{16,100}$/.test(tok)) return null;
    const effort = ['low', 'medium', 'high', 'xhigh', 'max'].includes(q.get('effort')) ? q.get('effort') : '';
    return { tok, effort, plan: q.get('plan') !== '0' };
  })();
  // Its notes on them (the demon's dossier, rewritten with every move and by its plans): kept on this phone only to hand back to the
  // site with the next move, exactly as the site signed them. Never shown, never logged, never read here. at: how many turns the night
  // had when they were written (a plan's notes that come back after a newer move's are older, and are left).
  const NOTES = { text: '', sig: '', at: -1 };
  const keepNotes = (j, at) => {
    if (!j || typeof j.notes !== 'string' || !j.notes || typeof j.notes_sig !== 'string' || at < NOTES.at) return;
    NOTES.text = j.notes.slice(0, 600); NOTES.sig = j.notes_sig.slice(0, 100); NOTES.at = at;
  };
  // (its plans, planSoon below)
  const PLAN = { on: true, inflight: false, n: 0, max: 40, lastAt: -1 };
  // The move a plan made ready: held until the next moment it is due, and dropped the moment anything makes it stale (they send a line,
  // another move happens, the board is taken, the struggle, the night ends).
  const READY = {
    x: null,
    set(x) { this.x = x; },
    drop(why) { if (this.x) { nlog('readyDropped', { why }); this.x = null; } },
    fresh() { const x = this.x; return !!x && x.at === NIGHT.turns.length && !S.possessing && !S.struggling && !S.soft && !S.ending && !S.stopping && !halt; },
  };
  // It reads over their shoulder (Pierce, 2026-10-04): now and then, while they type, the planchette glides over the letters they are
  // typing, a beat behind them, without a sound, and stops dead when they stop. Six a night at most, from two replies in and forty seconds
  // at the table, never while the board is busy, in the possession or the struggle, thirty-five seconds apart; about one typing burst in
  // two that may (2026-10-05: the page's tricks come often now). The next turn tells the demon it happened (did 'read'), and its ledger counts it.
  const READ = {
    on: false, n: 0, last: -Infinity, queue: [], iv: 0, stopT: 0, prev: '', chance: 0.55,
    due() {
      const replies = NIGHT.turns.filter((t) => t.r).length;
      return S.started && S.live && !S.busy && !S.queue.length && !S.possessing && !S.struggling && !S.soft && !S.ending && !S.stopping && !halt && !deadNow()
        && !S.awaitingYesNo && !pewOpen && replies >= 2 && nightSecs() >= 40 && this.n < 6 && G.t - this.last > 35000 && P.mode !== 'ponder';
    },
    start(v) {
      this.on = true; this.n++; this.last = G.t; this.queue.length = 0; this.prev = v;
      typed.armed = false; dropPath(); P.mode = 'free'; P.silent = true;
      noteDid('read'); nlog('read', { n: this.n });
      clearInterval(this.iv);
      this.iv = setInterval(() => {
        if (!this.on || halt) return this.stop();
        // a beat behind them: the letter they typed a quarter of a second ago; if they are faster than it, it skips to where they are
        if (P.path || !this.queue.length) return;
        let i = -1; for (let j = 0; j < this.queue.length; j++) if (G.t - this.queue[j].t >= 250) i = j;
        if (i < 0) return;
        const k = this.queue[i].k, g = GLYPHS[k];
        this.queue.splice(0, i + 1);
        if (g) { nlog('readLetter', { letter: k }); moveTo(g.x, g.y, { dur: rnd(200, 260), dwell: 30, curve: 0.08 }).catch(() => {}); }
      }, 40);
    },
    // a letter typed (the box went from prev to v)
    saw(v) {
      if (!this.on) return;
      if (v.length > this.prev.length && v.startsWith(this.prev)) for (const ch of v.slice(this.prev.length).toUpperCase()) if (/[A-Z0-9]/.test(ch)) this.queue.push({ k: ch, t: G.t });
      this.prev = v;
      clearTimeout(this.stopT);
      this.stopT = setTimeout(() => this.stop(), 700);
    },
    // they stopped: it stops dead, where it is
    stop() {
      if (!this.on) return;
      this.on = false; clearInterval(this.iv); clearTimeout(this.stopT); this.queue.length = 0;
      dropPath(); P.mode = 'free'; P.tx = P.x; P.ty = P.y; P.vx = P.vy = 0;
      // (silent until the wood's own smoothing has settled too: no blip of scrape after it stops)
      setTimeout(() => { if (!this.on) P.silent = false; }, 600);
      nlog('readEnd');
    },
  };
  // One move, asked of the site. turn: { at, q, part, why, quiet, stop, house, erased, typing, did, behind, sat, away } (this move); NIGHT.turns is
  // the night so far.
  //   -> { reply, voice, sent } | { none: why } (nothing answers) | { distress, help } | { fear } | { grief }
  //   voice: the whisper's audio, decoded (null when there is none); sent: the turns as they were sent (an edit's line numbers count them)
  // The parts of a request that are the same for a move and a plan: who it is, the night so far, its notes, what it remembers.
  function nightBody(mode, n) {
    const sent = NIGHT.turns.slice(-90);
    const body = {
      v: 4, night: NIGHT.id, demon: NIGHT.demon, mode, names: NAMES.map(nice), asker: NAMES.length === 1 ? nice(NAMES[0]) : '',
      memory: MEM.summary(), invite: S.invite || '', pass: passCode(), haunted: !!S.haunted, place: apiPlace(),
      notes: NOTES.text, notes_sig: NOTES.sig, turns: [],
    };
    if (LANE && LANE.effort) body.effort = LANE.effort;
    if (LANE && !LANE.plan) body.plan = false;
    const fixed = UTF8.encode(JSON.stringify(body)).length + 2400;   // (the move's own fields, its question, what they erased)
    body.turns = nightTurns(sent, n, BODY_MOST - fixed);
    return { body, sent };
  }
  async function liveMove(turn) {
    if (!apiBase()) return { none: 'offline' };
    const { body, sent } = nightBody(turn.part ? 'unfinished' : turn.q ? 'answer' : 'unprompted', NIGHT.turns.slice(-90).length + 1);
    Object.assign(body, {
      question: turn.q || '', why: turn.why || '', quiet: turn.quiet || 0, stop: !!turn.stop, house: turn.house || [], at: turn.at,
      erased: turn.erased || '', typing: turn.typing || '', did: turn.did || [], behind: turn.behind || 0, sat: turn.sat || 0, away: turn.away || 0,
    });
    NET.last = 'asking';
    const at = NIGHT.turns.length + 1;
    NET.moveOut++;
    let j;
    try { j = await post('goodbyeSpirit', body, SPIRIT_WAIT); } finally { NET.moveOut--; }
    if (!j) return { none: 'offline' };
    if (j.limited) return { none: 'limit' };
    if (j.reason === 'budget') return { none: 'budget' };
    if (j.off) return { none: 'off' };
    // its notes, as the site signed them (kept only to hand back); a lane night told to make no plans makes none
    keepNotes(j, at);
    if (j.plan === false) PLAN.on = false;
    // real distress in what was typed, or the demon's own word that this is a real person in real trouble: the gentle end
    if (j.reason === 'distress' || j.end === true) return { distress: true, help: j.help === 'home' ? 'home' : 'self' };
    // real fear in what was typed: the soft exit
    if (j.reason === 'fear') return { fear: true };
    if (j.reason === 'grief') return { grief: true };
    if (typeof j.demon === 'string' && /^[a-z]{2,16}$/.test(j.demon)) NIGHT.demon = j.demon;
    const r = cleanReply(j.reply);
    if (!r) return { none: String(j.reason || 'none') };
    // the whisper's audio. Since 2026-10-05 the move never waits for it: the site signs the whisper's words and the page asks for the audio
    // the moment the move lands (fetchWhisper), while the board is still spelling; it is heard on its beat if it is in by then, a little
    // after if it is close, and never if it is late. (An older site sent the audio inside the move: decoded here, as before.)
    let voice = null, voiceP = null;
    if (r.whisper.text && j.voice && typeof j.voice.audio === 'string' && j.voice.audio.length < 400000) voice = await decodeVoice(j.voice.audio);
    else if (r.whisper.text && typeof j.whisper_sig === 'string' && j.whisper_sig) voiceP = fetchWhisper(r.whisper.text, j.whisper_sig.slice(0, 100));
    if (!voice && !voiceP) r.whisper = { text: '', side: r.whisper.side };
    return { reply: r, voice, voiceP, sent };
  }
  async function decodeVoice(b64) {
    try {
      const bin = atob(b64), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      return await Promise.race([A.decode(u8.buffer), wait(1500).then(() => null)]);
    } catch (e) { return null; }
  }
  // The whisper's audio for words the site signed with this move (goodbyeSpirit, mode 'voice'): an AudioBuffer, or null.
  async function fetchWhisper(text, sig) {
    const t0 = G.t;
    const j = await post('goodbyeSpirit', { v: 4, mode: 'voice', night: NIGHT.id, text, sig }, 8000).catch(() => null);
    const buf = j && typeof j.audio === 'string' && j.audio && j.audio.length < 400000 ? await decodeVoice(j.audio) : null;
    nlog('whisperAudio', { ok: !!buf, ms: Math.round(G.t - t0) });
    return buf;
  }
  // What the house did since the last move, said to the demon with the next one (only these words travel; the site says each in its own sentence)
  const HOUSE_KEYS = new Set(['steps', 'knock', 'knock1', 'creak', 'breath', 'twitch', 'gutter', 'shadow', 'blowout', 'blackout', 'under', 'mimic', 'leave', 'calm', 'turn', 'count', 'ambient', 'possession', 'glow']);
  function noteHouse(k) {
    if (!HOUSE_KEYS.has(k) || !S.started) return;
    const h = NIGHT.house;
    if (h[h.length - 1] !== k) h.push(k);
    if (h.length > 12) h.shift();
  }
  // What their hands did since the last move (the demon reads it to know whether they did what it asked): touched the board, held the
  // planchette, moved it themselves, left the page and came back.
  function noteDid(k) {
    if (!S.started || !['touch', 'hold', 'drag', 'hid', 'read'].includes(k) || NIGHT.did.includes(k)) return;
    NIGHT.did.push(k);
  }
  // A new turn of the night: when it is on their clock, what was typed (or why it moves by itself; part: still in their box), what they
  // erased and how they typed it, what their hands did, where the one behind them stands, and what the house did since.
  function newTurn(q, o = {}) {
    if (ptr && G.t - ptr.t0 > 900) noteDid('hold');
    const typedHow = o.part ? { erased: '', typing: '' } : TYPED.take(q || '');
    return {
      at: clockText(), q: q || '', part: !!o.part, why: q ? '' : (o.why || 'silence'), quiet: o.quiet || 0, stop: !!o.stop, house: NIGHT.house.splice(0),
      erased: typedHow.erased, typing: q && !o.part ? typedHow.typing : '', did: NIGHT.did.splice(0), behind: NIGHT.behind,
      // how long they have been at the table, and how long they were away from the page since the last move (the site says both in words)
      sat: Math.round(nightSecs()), away: takeAway(o.why), r: null,
    };
  }
  // How long they were away: from the page, since the last move; or, on a return visit's first move, since their last visit here (hours
  // or days: the site says it in words). A first visit, or one whose last left nothing in MEMORY, carries none.
  function takeAway(why) {
    const a = NIGHT.away; NIGHT.away = 0;
    if (why === 'return') { const since = MEM.since(); if (since > 0) return since; }
    return a;
  }
  // ---- what the box saw: the longest run of text typed and then deleted before sending (40 characters at most: the demon may use it,
  // rarely), and how it was typed (fast without stopping, slowly, or stopping and starting). Read at each turn and emptied. Never a run
  // that reads like real trouble (that ends the night on the phone: the draft check, and ask()), never one with a name or a question
  // for their own family; never one that is still in what they sent.
  const TYPED = {
    prev: '', run: null, best: '', first: 0, last: 0, pauses: 0, chars: 0,
    reset() { this.run = null; this.best = ''; this.first = 0; this.last = 0; this.pauses = 0; this.chars = 0; },
    keep(t) { const x = String(t || '').replace(/\s+/g, ' ').trim(); if (x.length > this.best.length) this.best = x; },
    close() { if (this.run) { this.keep(this.run.text); this.run = null; } },
    // the box went from prev to cur (one input event)
    saw(cur) {
      const prev = this.prev; this.prev = cur;
      const now = performance.now();
      if (cur.length > prev.length) {
        if (!this.first) this.first = now;
        else if (now - this.last > 1500) this.pauses++;
        this.chars += cur.length - prev.length;
      }
      this.last = now;
      let p = 0; while (p < prev.length && p < cur.length && prev[p] === cur[p]) p++;
      let q = 0; while (q < prev.length - p && q < cur.length - p && prev[prev.length - 1 - q] === cur[cur.length - 1 - q]) q++;
      const removed = prev.slice(p, prev.length - q), added = cur.slice(p, cur.length - q);
      if (removed && !added) {
        // backspace runs back from where it started; delete runs forward
        if (this.run && p + removed.length === this.run.at) { this.run.text = removed + this.run.text; this.run.at = p; }
        else if (this.run && p === this.run.at) this.run.text += removed;
        else { this.close(); this.run = { text: removed, at: p }; }
      } else if (removed && added) {
        this.close();
        // typed over a selection is erased; a word the keyboard corrected is not
        const a = removed.trim().toLowerCase(), b = added.trim().toLowerCase();
        if (!(a.slice(0, 2) === b.slice(0, 2) && Math.abs(a.length - b.length) <= 3)) this.keep(removed);
      } else if (added) this.close();
    },
    // what would be read as erased now (for the phone's own safety check, before anything is sent)
    peek() { const r = this.run ? this.run.text : ''; return (r.length > this.best.length ? r : this.best).replace(/\s+/g, ' ').trim(); },
    // at a turn: { erased, typing }, then empty for the next
    take(sent) {
      this.close();
      let e = this.best.length > 40 ? this.best.slice(0, 40).replace(/\s+\S*$/, '') || this.best.slice(0, 40) : this.best;
      const low = String(sent || '').toLowerCase();
      if (!/[a-z].*[a-z].*[a-z]/i.test(e) || (low && low.includes(e.toLowerCase())) || askedForFamily(e) || forbiddenAsk(e) || volunteeredName(e, false) || refused(e.toUpperCase())) e = '';
      const dur = this.first ? this.last - this.first : 0, per = this.chars ? dur / this.chars : 0;
      const typing = !this.chars || !sent ? '' : this.pauses >= 2 ? 'halting' : per > 0 && per < 190 && !this.pauses && this.chars >= 6 ? 'fast' : per > 480 ? 'slow' : '';
      this.reset(); this.prev = $('#q') ? $('#q').value : '';
      return { erased: e, typing };
    },
  };

  // ---- performing it: the wait, every move in order at its pace, the line where it says, the sound as it finishes, then the night's own
  // beats (the possession, its leaving). Everything the planchette does here is the demon's: nothing is added and nothing is left out
  // except a line the phone's own check refuses. Returns the reply as it was done (what goes back to the site as the night so far) and
  // the line under the board.
  // mul: how much longer than the spelling's own pace each letter takes (spell's letterMs); pace and base: the travel to a mark it lands on
  // (YES, NO, GOOD BYE, a letter alone); land: how long it stays there. (Pierce, 2026-10-05: everything was slow; the pauses stacked.)
  const PACE = {
    slow: { mul: 1.75, pace: 0.75, land: 900, base: 160 },
    normal: { mul: 1, pace: 0.5, land: 650, base: 120 },
    violent: { mul: 0.64, pace: 0.22, land: 420, base: 60 },
  };
  // where the lens hangs over a mark without landing on it: a little short of it, toward the middle of the board
  const hoverAt = (g) => { const dx = REST.x - g.x, dy = REST.y - g.y, d = Math.hypot(dx, dy) || 1, k = Math.min(56, d * 0.4) / d; return offFaces(g.x + dx * k, g.y + dy * k); };
  // The moment the planchette arrives on a mark (the start of its dwell), for a sound that comes the instant it lands there.
  function arrived(path) {
    return new Promise((res) => {
      const iv = setInterval(() => { if (!path || P.path !== path || path.phase !== 'move') { clearInterval(iv); res(); } }, 8);
    });
  }
  // A move's landing: go to (x, y) and stay its dwell; the sounds put right after it in the moves come the instant it arrives.
  async function landOn(x, y, opts, atLand) {
    const go = moveTo(x, y, opts);
    if (atLand && atLand.length) { const path = P.path; arrived(path).then(() => { if (!halt) atLand.forEach((m) => playMoveSound(m)); }); }
    await go;
  }
  // A word that begins with YOU (YOU, YOUR, YOURE): both faces look straight out at them while it is spelled, and a moment after.
  const isYou = (w) => /^YOU/.test(w);
  async function perform(r, o = {}) {
    const g0 = haltGen, night = nightNo;
    const K = PACE[r.pace] || PACE.normal, violent = r.pace === 'violent';
    const done = { distress: false, say: '', moves: [], wait_ms: r.wait_ms, pace: r.pace, sfx: r.sfx, sfx_side: r.sfx_side || '', whisper: { text: '', side: 'left' }, lie: !!r.lie, sun: r.sun || 'watch', moon: r.moon || 'watch', closer: false, edit: { turn: 0, text: '' }, possess: false, end: false,
      asks: r.asks || 'none', callout: !!r.callout, uses_erased: r.uses_erased || 'none' };
    const line = [];   // the line under the board: what it spelled and what it landed on, a run of single marks as one word
    let word = '', pieces = 0, glue = false, glued = false;
    // a run of letters right after the spelled line, with only sounds between, is one line with it (the line, the breath, then the
    // word landed letter by letter): a space, not the dot between pieces
    const piece = async () => { if (pieces++) { if (glue) addLetter(' '); else { await wait(120); addLetter(' · '); } } glued = glue; glue = false; };
    const endWord = () => { if (word) { if (glued && line.length) line[line.length - 1] += ' ' + word; else line.push(word); word = ''; glued = false; } };
    const live = () => { checkHalt(g0); if (night !== nightNo) throw HALTED; };
    // they sent a line while it was making a move of its own: it stops where it is and answers them (S.cut)
    const cutNow = () => S.cut && S.unprompted;
    nlog('move', { pace: r.pace, wait: r.wait_ms, moves: r.moves.map((m) => m.to + (m.mark ? ':' + m.mark : '') + (m.side ? '@' + m.side : '')).join(' '), say: r.say, sfx: r.sfx, possess: r.possess, end: r.end, sun: r.sun, moon: r.moon, closer: r.closer, whisper: r.whisper && r.whisper.text ? r.whisper.side : '', edit: r.edit && r.edit.turn ? r.edit.turn : 0 });
    dropPath(); P.mode = 'free'; P.tx = P.x; P.ty = P.y;
    // the one behind them: a step closer with this reply, before any of its sounds (never two in a row, never back: the site holds it)
    if (r.closer && NIGHT.behind < 3 && !(NIGHT.turns.length && NIGHT.turns[NIGHT.turns.length - 1].r && NIGHT.turns[NIGHT.turns.length - 1].r.closer)) {
      NIGHT.behind++; NIGHT.behindStep = 0; done.closer = true; nlog('closer', { behind: NIGHT.behind });
    }
    // the voice at their ear: its words, decoded, played where a "sound" move with mark whisper puts it (else as it finishes); a name in it
    // counts as the night's one use of the name (with the board's)
    let voice = (o.voice || o.voiceP) && r.whisper && r.whisper.text ? { buf: o.voice || null, p: o.voiceP || null, text: r.whisper.text, side: r.whisper.side } : null;
    // their name aloud: twice a night in all, on the board or at their ear
    if (voice && sayHasName(voice.text) && NAMEUSE.spelled + NAMEUSE.voiced + (r.say && sayHasName(r.say) ? 1 : 0) >= NAMEUSE.max) voice = null;
    if (voice && (S.soft || S.stopping)) voice = null;
    let voiced = false;
    const playVoice = (sd) => {
      A.earVoice(voice.buf, sd); lookToward('ear-' + sd, Math.max(1600, voice.buf.duration * 1000 + 600));
      if (sayHasName(voice.text)) { NAMEUSE.voiced++; NAMEUSE.log.push({ n: voice.text, how: 'whispered', at: Math.round(G.t) }); }
      done.whisper = { text: voice.text, side: sd }; NIGHT.whispers++; markSaid(voice.text); MEM.line(voice.text);
      nlog('whisper', { side: sd, ms: Math.round(voice.buf.duration * 1000) });
    };
    const sayVoice = (side) => {
      if (!voice || voiced || halt) return false;
      voiced = true;
      const sd = side === 'left' || side === 'right' ? side : voice.side;
      if (voice.buf) { playVoice(sd); return true; }
      // its audio is still on its way: heard the moment it is in, if that is within a couple of seconds of its beat; else never
      if (voice.p) {
        const until = performance.now() + 2600, nn = nightNo, g = haltGen;
        voice.p.then((b) => {
          if (!b || halt || g !== haltGen || nn !== nightNo || performance.now() > until || S.soft || S.stopping) { nlog('whisperLate', { ok: !!b }); return; }
          voice.buf = b; playVoice(sd);
        });
      }
      return true;
    };
    // its own words where a "whisper-voice" mark puts them; "whisper" is always the wordless one
    playMoveSound = (m) => { if (m.mark === 'whisper-voice') { sayVoice(m.side); return; } playSfx(m.mark, m.side); };
    // it sits before it moves: still, a breath of a tremble
    if (r.wait_ms > 0) { trembleOn(0.45); try { await wait(r.wait_ms); } finally { trembleOff(); } }
    live();
    // the faces: what the demon chose for this move (the sun warns of a lie as the move begins), held a while after
    // (held for as long as the move takes, however long its line: holdFaces lets them go eight seconds after it stops)
    setFaces(r.sun, r.moon, 120000);
    // a name at the table is said twice a night at most (spell() keeps that count); a line past it is left out
    const say = r.say && !(sayHasName(r.say) && NAMEUSE.spelled + NAMEUSE.voiced >= NAMEUSE.max) ? r.say : '';
    const moves = r.moves.slice();
    if (say && !moves.some((m) => m.to === 'spell')) moves.push({ to: 'spell', mark: '', side: '', ms: 0 });
    // the words its single letters make (a sound inside a run does not break it), so a YOU among them is looked out for
    const runs = []; { let cur = null; moves.forEach((m, i) => { if (m.to === 'letter' || m.to === 'number') { if (!cur) { cur = { at: i, w: '' }; runs.push(cur); } cur.w += m.mark; } else if (m.to !== 'sound') cur = null; }); }
    const runAt = (i) => runs.find((x) => x.at === i);
    let spelled = false, lastMark = '';
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      live();
      if (cutNow()) break;
      const landing = m.to === 'letter' || m.to === 'number' || m.to === 'YES' || m.to === 'NO' || m.to === 'GOODBYE';
      // the sounds put right after a landing come the instant it lands
      const atLand = [];
      if (landing) while (moves[i + 1] && moves[i + 1].to === 'sound') atLand.push(moves[++i]);
      if (m.to !== 'letter' && m.to !== 'number' && m.to !== 'sound') { endWord(); lastMark = ''; }
      switch (m.to) {
        case 'spell': {
          if (!say || spelled) continue;
          spelled = true; await piece();
          await spell(say, { hostile: violent, mul: K.mul, nameUse: true });
          line.push(say); done.say = say; MEM.line(say);
          { let j = i + 1; while (moves[j] && moves[j].to === 'sound') j++; glue = !!moves[j] && moves[j].to === 'letter'; }
          break;
        }
        case 'YES': case 'NO': case 'GOODBYE': {
          const g = GLYPHS[m.to]; await piece();
          await landOn(g.x, g.y, { pace: K.pace, base: K.base, dwell: m.ms || K.land, curve: violent ? 0.05 : undefined }, atLand);
          live(); commit(g, violent); addLetter(m.to === 'GOODBYE' ? 'GOOD BYE' : m.to); line.push(m.to);
          if (violent) { rumble(220, 0.9, 0.5); buzz(60); if (A.rec) A.rec('slam', 'table', 1); }   // (the recorded slam of the piece on the wood; the harder tock commit() played stands without it)
          break;
        }
        case 'letter': case 'number': {
          const g = GLYPHS[m.mark]; if (!g) continue;
          // (a run of single letters is a word landed slowly enough to feel: the pace of a short line, never the patter of a long one)
          const per = letterMs(4, K.mul);
          if (!word) { await piece(); const run = runAt(i); if (run && isYou(run.w)) eyesOnYou(1200 + run.w.length * per * 1.5); }
          if (m.mark === lastMark) { const go = circleOn(g, Math.round(per * 1.2), 18); atLand.forEach((x) => playMoveSound(x)); await go; }
          else await landOn(g.x, g.y, { pace: per * 0.0007, base: Math.round(per * 0.35), dwell: m.ms || Math.round(per * rnd(0.4, 0.55)) }, atLand);
          live(); commit(g, violent); addLetter(m.mark); word += m.mark; lastMark = m.mark;
          break;
        }
        case 'sound': {
          // where it was put in the moves, and the planchette goes on at once (ms: how long it holds after the sound starts)
          playMoveSound(m);
          if (m.ms) { trembleOn(0); try { await wait(m.ms); } finally { trembleOff(); } }
          break;
        }
        case 'hover': {
          const g = GLYPHS[m.mark]; if (!g) continue;
          const h = hoverAt(g);
          await moveTo(h.x, h.y, { pace: K.pace * 1.15, base: K.base, dwell: m.ms || 900, curve: 0.2 });
          g.glow = Math.max(g.glow, 0.3);
          // and away again, a little, without landing
          await moveTo(h.x + (REST.x - h.x) * 0.22, h.y + (REST.y - h.y) * 0.22, { dur: violent ? 260 : 650, dwell: 120, curve: 0.1 });
          break;
        }
        case 'circle': {
          const g = m.mark && GLYPHS[m.mark];
          if (g) await moveTo(g.x, g.y - 34, { pace: K.pace, base: K.base, dwell: 60 });
          await circleOn({ x: P.x, y: P.y }, m.ms || (violent ? 600 : 1100));
          break;
        }
        case 'center': {
          const c = offFaces(REST.x + rnd(-30, 30), REST.y + rnd(-15, 15));
          await moveTo(c.x, c.y, { pace: K.pace, base: K.base, dwell: m.ms || 250 });
          break;
        }
        case 'edge': {
          P.ymax = 372;
          await moveTo(pick([-205, 205]), 368, { dur: violent ? 600 : 1300, dwell: m.ms || 600, curve: 0.02 });
          break;
        }
        case 'still': {
          dropPath(); trembleOn(0);
          try { await wait(m.ms || 1800); } finally { trembleOff(); }
          break;
        }
        case 'shake': {
          dropPath(); trembleOn(violent ? 4 : 2.4);
          if (violent) rumble(400, 0.6, 0.4);
          try { await wait(m.ms || 1800); } finally { trembleOff(); }
          break;
        }
        default: continue;
      }
      done.moves.push(m);
      atLand.forEach((x) => done.moves.push(x));
    }
    endWord();
    line.filter((x) => x.length > 1 && !['YES', 'NO', 'GOODBYE'].includes(x) && x !== say).forEach((x) => MEM.line(x));
    P.tx = P.x; P.ty = P.y;
    // the voice, if no move placed it: as it finishes, before the house's sound (a move cut for their line ends there)
    if (cutNow()) { holdFaces(4000); done.sfx = 'none'; return { done, said: line.join(' · ') }; }
    if (voice && !voiced) sayVoice(voice.side);
    // the faces hold what they showed for a while after it stops
    holdFaces(8000);
    if (r.sfx && r.sfx !== 'none') { playMoveSound({ mark: r.sfx, side: r.sfx_side }); done.sfx = r.sfx; } else done.sfx = 'none';
    const said = line.join(' · ');
    // the record: one of their earlier lines, shown back to them changed, for four seconds (once a night)
    if (r.edit && r.edit.turn > 0 && (NIGHT.edits || 0) < 2 && o.sent) { if (showEdit(r.edit, o.sent)) done.edit = { turn: r.edit.turn, text: r.edit.text }; }
    // the night's own beats, when the demon calls them
    if (r.possess && !S.possessing && !S.ending && !S.struggling && !halt && (!S.haunted || !NIGHT.again)) {
      if (S.haunted) NIGHT.again = true;
      done.possess = true;
      await possess('model');
    }
    if (r.end && !S.ending) { done.end = true; o.onEnd = true; }
    return { done, said };
  }
  // (set by each perform: a move's sound, or the voice where it was placed)
  let playMoveSound = (m) => playSfx(m.mark, m.side);
  // The record changed (reply.edit): their earlier line, as they typed it, with a word or two changed by the demon, shown in their own
  // hand where their question sits, for four seconds; then it fades back to how it was. Once a night. edit.turn counts their typed
  // lines in the turns the page sent (#1 the first), as the site numbered them for the demon.
  const EDIT_MS = 4000;
  function showEdit(edit, sent) {
    const typedTurns = (sent || []).filter((t) => t.q && !t.part);
    const was = typedTurns[edit.turn - 1];
    if (!was || !edit.text || (NIGHT.edits || 0) >= 2 || S.soft || S.stopping || halt) return false;
    NIGHT.edited = true; NIGHT.edits = (NIGHT.edits || 0) + 1;
    const keep = { text: tq.textContent, cls: tq.className }, night = nightNo;
    nlog('edit', { turn: edit.turn, was: was.q.slice(0, 60), now: edit.text.slice(0, 60) });
    tq.classList.remove('waiting', 'fading', 'pencil', 'plain'); tq.classList.add('edited');
    tq.textContent = edit.text; tq.dataset.edit = '1';
    setTimeout(() => {
      if (night !== nightNo || tq.textContent !== edit.text) return;
      tq.classList.add('fading');
      setTimeout(() => {
        if (night !== nightNo || tq.textContent !== edit.text) return;
        // and back in, as it was
        tq.textContent = keep.text; tq.className = keep.cls + ' edited fading'; delete tq.dataset.edit;
        requestAnimationFrame(() => requestAnimationFrame(() => { tq.classList.remove('fading'); setTimeout(() => { if (tq.textContent === keep.text) tq.classList.remove('edited'); }, 950); }));
      }, 900);
    }, EDIT_MS);
    return true;
  }
  // The house's own sounds, when the demon asks for one: at its place in the moves ("sound") or as it finishes ("sfx"). side: where it
  // is heard ('' where it belongs). 'silence' is the wall clock stopping for a few seconds. Each of the others is one recorded take
  // (A.rec: kind, where it is heard from, how loud), and when there is no recording of it the nearest synthesized sound plays:
  // knocks > A.knock(3), nails > the claw, drag > the floor taking weight, light and thud > footsteps overhead, rattle > the latch,
  // and a door, a chair, the glass, the chime, the stairs > a creak. The one behind them (breath, gasp, near, hum) comes from where it
  // stands tonight (NIGHT.behind: across the room, by the door, an arm's length, at their ear), a little closer each time it is heard
  // there (A.behind); with no recording, a breath or a gasp is the synthesized breath at one ear. The demon's own wordless sounds are
  // at the ear (whisper, shh, click), under the floor (voices), on the glass in their hand (tap) and in the wall (walls); a take of
  // those that has not arrived is silence (the synthesized whisper for a whisper).
  const EARS = ['left', 'right'];
  const FACE_LOOKS = { under: ['knocks', 'scratch', 'nails', 'floor', 'latch', 'rattle', 'drag', 'voices', 'stairs'], above: ['steps', 'light', 'thud'],
    behind: ['breath', 'gasp', 'near', 'hum', 'silence'], ear: ['whisper', 'shh', 'click'] };
  function playSfx(k, side) {
    if (halt) return;
    const sd = EARS.includes(side) ? side : pick(['left', 'right']);
    const where = SIDES.includes(side) && side ? side : '';
    nlog('sfx', { sfx: k, side: where });
    // the faces' eyes go where it came from (the cellar under, the attic above, past them, the ear it was at); the tap on the glass in
    // their hand: straight at them
    if (FACE_LOOKS.ear.includes(k)) lookToward('ear-' + sd);
    else if (k === 'tap') eyesOnYou(1600);
    else lookToward(where || (FACE_LOOKS.under.includes(k) ? 'under' : FACE_LOOKS.above.includes(k) ? 'above' : FACE_LOOKS.behind.includes(k) ? 'behind' : sd));
    const rec = (kind, at, vol) => (A.rec ? A.rec(kind, where || at, vol) : 0);
    const behind = (kind, vol) => {
      if (where === 'under' || where === 'above') return rec(kind, where, vol);
      const s = where === 'left' ? -1 : where === 'right' ? 1 : NIGHT.behindSide;
      const n = A.behind ? A.behind(kind, NIGHT.behind, NIGHT.behindStep, s, vol) : 0;
      if (n) { NIGHT.behindStep++; nlog('behind', { sfx: kind, level: NIGHT.behind, step: NIGHT.behindStep }); if (NIGHT.behind >= 3) NIGHT.crowdUntil = G.t + Math.max(6000, n * 1000 + 3000); }
      return n;
    };
    switch (k) {
      case 'knock': {
        if (where === 'under') A.knock(2, 0, -0.9, -0.8); else if (where === 'above') A.knock(pick([1, 2]), 0, -0.6, 2.4); else if (where === 'behind') A.knock(pick([1, 2]), 0, 2.2);
        else A.knock(pick([1, 2, 3]), SIDE_X[EARS.includes(where) ? where : sd]);
        rumble(160, 0.4, 0.1); buzz([40, 120, 40]); break;
      }
      case 'knocks': if (!rec('knocks', 'under', 0.9)) A.knock(3); rumble(160, 0.4, 0.1); buzz([40, 120, 40]); break;
      case 'steps': A.steps(sd === 'left' ? -1 : 1); break;
      case 'light': if (!rec('light', 'above', 0.8)) A.steps(sd === 'left' ? -1 : 1); break;
      case 'near': if (!behind('near', 0.8)) A.breath(sd); break;
      case 'stairs': if (!rec('stairs', 'under', 0.8)) A.creak(sd); break;   // (the cellar steps: a one-story house has no others)
      case 'creak': if (!where || !rec('creak', where, 0.8)) A.creak(sd); break;
      case 'door': case 'shut': case 'chair': case 'glass': case 'chime': if (!rec(k, sd, 0.8)) A.creak(sd); break;
      case 'thud': if (!rec('thud', 'above', 0.9)) A.steps(sd === 'left' ? -1 : 1); break;
      case 'scratch': if (A.claw) A.claw(); break;
      case 'nails': if (!rec('nails', 'under', 0.7) && A.claw) A.claw(); break;
      case 'drag': if (!rec('drag', 'under', 0.9)) A.floorLoad(4); break;
      case 'breath': if (!behind('breath', 0.7)) A.breath(sd); famGust(sd === 'left' ? 1 : -1); break;
      case 'gasp': if (!behind('gasp', 0.8)) A.breath(sd); famGust(sd === 'left' ? 1 : -1); break;
      case 'hum': behind('hum', 0.7); break;
      case 'latch': if (!where || !rec('latch', where, 0.8)) A.latch(); break;
      case 'rattle': if (!rec('rattle', 'under', 0.8)) A.latch(); break;
      case 'floor': if (!where || !rec('floor', where, 0.8)) A.floorLoad(4); break;
      case 'house': A.house(); break;
      // the demon's own: at the ear, under the floor, on the glass in their hand, in the wall
      case 'whisper': if (!(A.ear && A.ear('whisper', sd)) && A.whisper) A.whisper(sd); break;
      case 'shh': case 'click': if (A.ear) A.ear(k, sd); break;
      case 'voices': rec('voices', 'under', 0.9); break;
      case 'tap': if (A.glass) A.glass('tap'); break;
      case 'walls': if (A.wall) A.wall('walls', sd); break;
      case 'silence': {
        if (A.clockState() !== 'ticking') break;   // haunted, the clock is already stopped
        A.clock(false);
        const night = nightNo;
        setTimeout(() => { if (night === nightNo && !S.haunted && !S.possessing && !halt) A.clock(true); }, rnd(4000, 6500));
        break;
      }
      default: break;
    }
  }

  // ---------------------------------------------------------------- tonight
  // A night is the demon's: its id (made at the match), which face it wears (the site picks it at the first move and the page sends it
  // back with every move), and the night so far (NIGHT.turns: when, what was typed or why it moved by itself, what the house did, and
  // the reply as it was performed). Nothing is scripted and nothing is planned: the night so far is all there is.
  // The night log (a test's look; nothing here leaves the phone): every move, every house event, with the second since Sit down it
  // started. nlog(kind, detail).
  const NLOG = []; let NLAST = [];
  const nlog = (k, d) => { NLOG.push({ t: +(((G.t - (S.sitAt || G.t)) / 1000)).toFixed(1), k, ...d }); if (NLOG.length > 900) NLOG.shift(); };
  const NIGHT = { id: '', demon: '', turns: [], house: [], did: [], behind: 0, behindStep: 0, behindSide: 1, unfinished: 0, lastUnfinished: -Infinity, edited: false, whispers: 0, said: new Set(), looks: {}, usedNotes: new Set(), tl: [], spelledLines: [], own: 0, lastOwn: -Infinity, ownAfter: 20000, offNoted: false, again: false, voiced: 0, voiceSet: {} };
  const normLine = (t) => String(t || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  const FREE_WORDS = new Set(['YES', 'NO', 'GOODBYE']);
  const wasSaid = (t) => { const n = normLine(t); return !!n && !FREE_WORDS.has(n) && NIGHT.said.has(n); };
  const markSaid = (t) => { const n = normLine(t); if (n && !FREE_WORDS.has(n)) NIGHT.said.add(n); };
  // How many times this device has sat down in this place.
  function visitNo() { const v = store.get('visits', {}) || {}; return Math.max(1, +v[PL.id] || 1); }
  function countVisit() { const v = store.get('visits', {}) || {}; v[PL.id] = (+v[PL.id] || 0) + 1; store.set('visits', v); }
  // A line that reads a record back (a digit, or a unit of time: 28 HOURS) is never spelled: players take it for the site reading its own
  // log. A number is a word (THIRTEEN); a lone digit is the demon landing on the number row.
  const readsRecord = (t) => /[0-9]/.test(t) || /\b(HOURS?|MINUTES?|SECONDS|DAYS|WEEKS)\b/.test(t);
  // A night starts clean: nothing said, every look still in its set (DIRECTION.md section 8), a new id, no demon yet.
  function newNight() {
    NIGHT.said.clear(); NIGHT.usedNotes.clear();
    // the night that just ended, for a test's look (what was done with its name)
    if (NAMEUSE.spelled || NAMEUSE.voiced || NAMES.length) NAMEUSE.last = { spelled: NAMEUSE.spelled, voiced: NAMEUSE.voiced, names: NAMES.slice(), lines: NIGHT.spelledLines.filter((l) => sayHasName(l)).length, log: NAMEUSE.log.slice() };
    NIGHT.spelledLines = [];
    NAMES = []; NAMEUSE.reset();   // nobody is at the table until somebody says so
    NIGHT.id = 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    Object.assign(NIGHT, { demon: '', turns: [], house: [], did: [], own: 0, lastOwn: -Infinity, ownAfter: rnd(13000, 17000), offNoted: false, fails: 0, dead: false, again: false, voiced: 0, voiceSet: {} });
    // the one behind them starts across the room, on one side of them for the whole night; nothing unfinished, edited or whispered yet
    Object.assign(NIGHT, { behind: 0, behindStep: 0, behindSide: Math.random() < 0.5 ? -1 : 1, unfinished: 0, lastUnfinished: -Infinity, edited: false, edits: 0, whispers: 0, away: 0, hidAt: 0, lateAsked: false, crowdUntil: 0 });
    if (NIGHT.titled) { NIGHT.titled = false; document.title = TITLE0; }
    TYPED.reset();
    // its notes, its plans, a move made ready, the read-along: nothing carries over from another night
    Object.assign(NOTES, { text: '', sig: '', at: -1 });
    Object.assign(PLAN, { on: !LANE || LANE.plan, inflight: false, n: 0, lastAt: -1 });
    READY.x = null; READ.stop(); Object.assign(READ, { n: 0, last: -Infinity });
    // the house's wordless events: each look is used once a night (the side, the candle), and a night leaves three of the optional ones
    // out altogether, so two nights never run the same
    // (2026-10-05, Pierce: "nothing happening between questions": the house is busy all night now, each look used a few times, none left out)
    NIGHT.looks = {
      creak: ['left', 'right', 'behind', 'left', 'right', 'behind'], knock: ['left', 'right', 'left', 'right', 'behind'], breath: ['left', 'right', 'left', 'right'],
      twitch: [1, 1, 1], gutter: [0, 1, 0, 1], shadow: [1, -1, 1], blowout: [0, 1], turn: [1, 1], mimic: [1, 1], count: [1], blackout: [1, 1], calm: [1],
      under: [1, 1, 1], steps: ['l', 'r', 'l'], leave: [1, 2, 3],
    };
    ['creak', 'knock', 'breath', 'shadow', 'gutter', 'steps', 'blowout'].forEach((k) => { if (NIGHT.looks[k]) shuffle(NIGHT.looks[k]); });   // (which candle dies first, too)
    NIGHT.cast = Object.keys(NIGHT.looks);
    Object.assign(NIGHT, { p2: -1, p2note: null });
    NLAST = NLOG.splice(0, NLOG.length);
    NIGHT.looks0 = {};
    for (const k in NIGHT.looks) NIGHT.looks0[k] = NIGHT.looks[k].length;
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const looksLeft = (k) => (NIGHT.looks[k] || []).length;
  // the next look for this event; prefer one of `want` if it is still in the set. Undefined when the set is spent.
  function takeLook(k, want) {
    const l = NIGHT.looks[k]; if (!l || !l.length) return undefined;
    const i = want != null && l.indexOf(want) >= 0 ? l.indexOf(want) : 0;
    const look = l.splice(i, 1)[0];
    nlog('look', { ev: k, look });
    return look;
  }
  newNight();
  // ---------------------------------------------------------------- a voice in the room (dormant)
  // Pierce, 2026-10-04: no voice in the night ("no live eleven labs sounds, other than making some creepy sounds"). Nothing below is
  // called: the code stays for the day a voice comes back, and the site's goodbyeVoice answers 410 while its VOICE_ON is off.
  // whisper(text, style): the site turns a few words into a WAV (a whisper, a girl, something low); it plays
  // muffled, from one side of the room. At most one every 20 seconds. Without the site, the old rule: only a
  // computer with a real whisper voice, once a minute. Muted, ?debug and ?quiet are silent either way.
  const VOICE = { cache: new Map(), last: -Infinity, lastAI: -Infinity };
  // the same characters the site keeps, so a whisper it signed reaches it unchanged
  function voiceText(t) { return String(t || '').replace(/[^A-Za-z0-9 ,.'!?-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60); }
  // Never a paid voice nobody can hear: muted, ?debug and ?quiet fetch nothing (a later unmute fetches on demand).
  const QUIET = /[?&](debug|quiet)\b/.test(location.search);
  // A voice line is paid for, so it is fetched only when its beat is next (never ahead of a beat that may not come), and at
  // most VOICE_NIGHT a night. The set pieces (the return, the possession, the ending) keep their places: an ordinary whisper
  // cannot take the last of them. A line heard before costs nothing (the cache).
  const VOICE_NIGHT = 3;
  const heldVoices = () => ['ending'].filter((k) => !NIGHT.voiceSet[k]).length;   // (the possession has no voice of its own any more)
  // sign: { sig, exp } from the spirit, for a whisper it wrote; the game's own lines need none. o.set: which set piece it is
  function fetchVoice(text, style, sign, o = {}) {
    text = voiceText(text);
    // a name is said once, low, in the dark at the end (whisper() counts it); anywhere else it is never fetched
    if (sayHasName(text) && (!o.nameVoice || NAMEUSE.voiced >= 1)) return Promise.resolve(null);
    if (!text || !apiBase() || S.muted || QUIET) return Promise.resolve(null);
    const key = style + '|' + text.toLowerCase();
    if (VOICE.cache.has(key)) return VOICE.cache.get(key);
    if (NIGHT.voiced >= VOICE_NIGHT || (!o.set && NIGHT.voiced + heldVoices() >= VOICE_NIGHT)) return Promise.resolve(null);
    NIGHT.voiced++; if (o.set) NIGHT.voiceSet[o.set] = true;
    // a line from tonight's plan carries the site's signature for exactly these words
    const pv = NIGHT.plan && NIGHT.plan.voice;
    if (!(sign && sign.sig) && pv) sign = pv[text] || null;
    const body = sign && sign.sig ? { text, style, sig: sign.sig, exp: sign.exp } : { text, style };
    const p = post('goodbyeVoice', body, 12000).then(async (j) => {
      if (!j || typeof j.audio !== 'string' || !j.audio) return null;
      const bin = atob(j.audio.replace(/^data:[^,]*,/, '')), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      return A.decode ? A.decode(u8.buffer) : null;
    }).catch(() => null).then((buf) => { if (!buf) VOICE.cache.delete(key); return buf; });
    VOICE.cache.set(key, p);
    return p;
  }
  // How each voice is played. The girl keeps her own speed (slowed, she would drop below a girl's pitch) and her
  // breath (the air above 3.5 kHz is most of what makes it a whisper at the ear). The others are slowed a little and
  // heard through the house, as before.
  const VOICE_FX = { child: { rate: 1, cut: 7500 }, whisper: {}, low: {} };
  // The ghost's whispers take its place's voice (places.js spirit.whisperStyle). Only the Farmhouse names one, 'child':
  // the girl is Elsie and is heard nowhere else. 'low' is the thing's voice in every place and does not go through this.
  const ghostStyle = () => (PL && PL.spirit && PL.spirit.whisperStyle) || 'whisper';
  // o.local: without the site, the computer's own whisper voice may say it (only the name event asks for that)
  async function whisper(text, style, maxWait, o = {}) {
    if (sayHasName(text)) {
      if (!o.nameVoice || NAMEUSE.voiced >= 1 || S.stopping || S.soft) return false;
      NAMEUSE.voiced++; NAMEUSE.log.push({ n: voiceText(text), how: 'voiced', at: Math.round(G.t) });
    }
    if (S.muted || QUIET) return false;
    if (!apiBase()) return o.local && A.say ? A.say(voiceText(text)) : false;
    if (!o.nameVoice && performance.now() - VOICE.last < 20000) return false;
    const g = haltGen;
    const buf = await Promise.race([fetchVoice(text, style, o.sign, o), wait(maxWait || 2500).then(() => null)]);
    if (!buf || halt || g !== haltGen || S.muted || (!o.nameVoice && performance.now() - VOICE.last < 20000)) return false;
    if (!A.voice || !A.voice(buf, VOICE_FX[style])) return false;
    VOICE.last = performance.now();
    return true;
  }

  // ---------------------------------------------------------------- it remembers you
  // goodbye.memory: the last few visits (when, who, up to eight questions worth keeping and what it said, how it
  // ended). A short summary of it goes to the site with every question; the return visit uses it too.
  const STOP = new Set('THE AND YOU ARE WHAT WHO WHERE WHEN WHY HOW DOES DID CAN WILL WOULD COULD SHOULD THIS THAT THERE HERE HAVE YOUR WITH FROM ABOUT INTO THEM THEY IS IT ANY ANYONE SOMEONE TELL ME MY WAS WERE BEEN DO NOT DONT YES NO'.split(' '));
  const LEFT = 'they left without saying goodbye';
  const troubled = (t) => { t = String(t == null ? '' : t); return soundsLikeDistress(t) || soundsAfraid(t); };
  const MEM = {
    past: [], other: [], cur: null, dropped: '',
    // v2 keeps its visits per house (each says which one it was in). A visit kept by an older version never said which house it
    // was in (and may hold an answer from another year: NIXON, from the 1972 Basement, riding into the next house), so every old
    // visit is dropped, once. A visit that holds anything that read like real trouble (a question, or the names) is read first and
    // is never sent anywhere: when what is dropped is real distress, the title says where help is (dropped: 'self' or 'home').
    load() {
      const v = store.get('memory', null);
      const all = v && Array.isArray(v.visits) ? v.visits.filter((x) => x && typeof x === 'object').slice(-6) : [];
      let changed = !!v && v.v !== 2;
      const help = (t) => { t = String(t == null ? '' : t); if (soundsLikeDistress(t)) this.dropped = this.dropped === 'self' || helpFor(t) === 'self' ? 'self' : 'home'; };
      const read = all.map((x) => {
        const qa = (Array.isArray(x.qa) ? x.qa : []).filter((e) => { if (e && troubled(e.q)) { help(e.q); return false; } return !!e; });
        const names = Array.isArray(x.names) ? x.names : [];
        if (troubled(names.join(' '))) { help(names.join(' ')); changed = true; return { ...x, names: [], qa: [], ended: '', skip: 1 }; }
        if (qa.length !== (Array.isArray(x.qa) ? x.qa.length : 0)) changed = true;
        return { ...x, qa };
      });
      const keep = v && v.v === 2 ? read : [];
      this.past = keep.filter((x) => x.place === PL.id);
      this.other = keep.filter((x) => x.place !== PL.id);
      if (changed) this.save();
    },
    begin() {
      this.load(); this.cur = { date: new Date().toISOString(), place: PL.id, names: [], qa: [], ended: LEFT };
      // the board had already moved for this night (they lost last time): that is used up now
      if (store.get('kept', null)) store.set('kept', null);
      this.save();
    },
    // they let go of GOOD BYE before it was done, and it kept them (the letter it left the planchette on)
    lost(letter) { if (this.cur && !this.cur.skip) { this.cur.lost = { letter: String(letter || '').slice(0, 1) }; this.save(); } },
    // which face the demon wore last time here (the site usually sends the same one back to someone it remembers)
    demon(id) { if (this.cur && !this.cur.skip && /^[a-z]{2,16}$/.test(id || '') && this.cur.demon !== id) { this.cur.demon = id; this.save(); } },
    lastDemon() { const v = this.past.slice().reverse().find((x) => !x.skip && typeof x.demon === 'string'); return v ? v.demon : ''; },
    note(q, a, typed) {
      if (!this.cur || this.cur.skip || !q || !a || troubled(q)) return;
      const qa = this.cur.qa; qa.push({ q: String(q).slice(0, 80), a: String(a).slice(0, 40), t: typed ? 1 : 0 });
      if (qa.length > 8) { const i = qa.findIndex((x) => !x.t); qa.splice(i >= 0 ? i : 0, 1); }
      this.save();
    },
    end(how) { if (this.cur && !this.cur.skip) { this.cur.ended = how; this.save(); } },
    // a line the board spelled or the voice said tonight (the last twelve are kept, short), so the next night never says it again
    line(t) {
      const x = normLine(t);
      if (!this.cur || this.cur.skip || x.length < 2 || x.length > 24 || FREE_WORDS.has(x) || troubled(x) || pastYear(x) || sayHasName(x)) return;
      const l = this.cur.lines || (this.cur.lines = []);
      const i = l.indexOf(x); if (i >= 0) l.splice(i, 1);
      l.push(x); if (l.length > 12) l.shift();
      this.save();
    },
    // a visit that ended in real distress is never sent back to the model or spelled on a return visit
    forget() { if (this.cur) { this.cur.skip = 1; this.cur.qa = []; this.cur.ended = ''; this.save(); } },
    save() { store.set('memory', { v: 2, visits: this.other.concat(this.past, this.cur ? [this.cur] : []).slice(-6) }); },
    summary() {
      if (!this.past.length) return '';
      const parts = [];
      // the last two visits that hold something: a match struck and nothing asked says nothing about them
      const kept = this.past.filter((v) => !v.skip && ((v.qa && v.qa.length) || (v.lines && v.lines.length) || v.lost || (v.ended && v.ended !== LEFT)));
      // nothing from after her year goes back to a model: an answer like NIXON, a question that names a later thing, a year
      const fine = (x) => !pastYear(x.q) && !pastYear(x.a);
      // what it spelled on the nights before (the last twelve lines, newest night first, short): it never spells any of them again. They
      // go first, so the 600 characters always keep them.
      const lines = [];
      for (const v of kept.slice().reverse()) for (const x of (v.lines || []).slice().reverse()) {
        if (typeof x === 'string' && !troubled(x) && !pastYear(x) && !lines.includes(x) && lines.length < 12) lines.push(x);
      }
      if (lines.length) parts.push('It spelled before, at this table: ' + lines.reverse().map((x) => `"${x}"`).join('; ') + '.');
      for (const v of kept.slice(-2).reverse()) {
        const ms = Date.now() - Date.parse(v.date), days = Math.max(0, Math.round(ms / 86400000)), hours = ms / 3600000;
        const when = !isFinite(days) ? 'Before' : hours < 1 ? 'Less than an hour ago' : hours < 6 ? 'A few hours ago' : days === 0 ? 'Earlier today' : days === 1 ? 'Yesterday' : days + ' days ago';
        const qs = (v.qa || []).filter((x) => !troubled(x.q) && fine(x)).filter((x) => x.t).slice(-3).concat((v.qa || []).filter((x) => !troubled(x.q) && fine(x)).filter((x) => !x.t).slice(-1)).slice(0, 3)
          .map((x) => `"${x.q}" (${x.a})`).join('; ');
        // the house remembers: they let go of GOOD BYE before it was done, and it kept them (and moved the planchette for the next visit)
        const lost = v.lost && /^[A-Z]$/.test(v.lost.letter || '') ? ` They let go of GOOD BYE before it was done, and you kept them; you left the planchette on ${v.lost.letter} for them to find.` : '';
        parts.push(`${when}: someone at the table.${qs ? ' Asked ' + qs + '.' : ''}${lost} ${v.ended && !pastYear(v.ended) ? 'It ended: ' + v.ended + '.' : ''}`.trim());
      }
      let s = parts.join(' ');
      if (s.length > 600) s = s.slice(0, 597).replace(/\s+\S*$/, '') + '...';
      return s;
    },
    // how long since their last visit here, in seconds (0: none), for the night's first move
    since() {
      const v = this.past.filter((x) => !x.skip).slice(-1)[0];
      const t = v ? Date.parse(v.date) : NaN;
      return isFinite(t) ? Math.max(0, Math.min(60 * 86400, Math.round((Date.now() - t) / 1000))) : 0;
    },
    // a word from something they asked last time, for the planchette to spell when they come back
    word() {
      for (const v of this.past.slice().reverse()) {
        if (v.skip) continue;
        const ws = (v.qa || []).filter((x) => x.t && !pastYear(x.q) && !pastYear(x.a)).flatMap((x) => String(x.q).toUpperCase().replace(/[^A-Z ]/g, ' ').split(/\s+/))
          .filter((w) => w.length >= 4 && w.length <= 12 && !STOP.has(w) && !DEMONIC.test(w));
        if (ws.length) return ws.sort((a, b) => b.length - a.length)[0];
      }
      return '';
    },
  };
  MEM.load();
  if (MEM.dropped) showHelp(MEM.dropped);   // an older version kept real distress: the title says where help is, once

  // ---------------------------------------------------------------- the night's heat (Pierce, 2026-10-04)
  // "the sounds come...then go...and maybe this isnt good enough bc we need it to feel more intense as we go". G.heat, 0 to 1, is how far
  // the night has gone, and it only ever rises (a new night starts it at 0). It comes from: the turns (0.022 each, up to 0.33), the time at
  // the table (0.3, most of it over the first twenty minutes), every sound of the house's the demon calls for (0.035 each, up to 0.28), the
  // house's own wordless events (0.012 each, up to 0.12), anything G.heatBump(x) is given (a new face on the board: the other half of the
  // build calls it), and the possession, which takes it to 1. It moves toward that on a five-second time constant, and the room follows it
  // (audio.js A.heat): the crickets thin, the wind and the siding grow, the house settles more often, a low pressure comes up, the clock
  // comes closer. When it crosses 0.35 and again 0.7, everything outside stops dead for a few seconds (A.hush), and comes back thinner.
  const HEAT_SFX = new Set(['knock', 'knocks', 'steps', 'light', 'near', 'stairs', 'creak', 'door', 'shut', 'chair', 'thud', 'scratch', 'nails', 'drag', 'breath', 'gasp', 'latch', 'rattle', 'floor', 'house', 'glass', 'chime', 'silence']);
  const HEAT = { target: 0, bump: 0, sfx: 0, events: 0, seen: null, hushAt: [0.35, 0.7], hushed: [], lastA: -1, lastAt: 0, last: 0, on: false };
  G.heat = 0;
  function heatBump(x) {
    const v = +x;
    if (v > 0 && Number.isFinite(v)) HEAT.bump = Math.min(1, HEAT.bump + v);
    return G.heat;
  }
  G.heatBump = heatBump;
  function heatReset() {
    Object.assign(HEAT, { target: 0, bump: 0, sfx: 0, events: 0, seen: null, hushed: [], lastA: -1, on: false });
    G.heat = 0;
    if (A.heat) A.heat(0);
  }
  function heatTick() {
    const now = G.t, dt = Math.min(1, Math.max(0, (now - (HEAT.last || now)) / 1000)); HEAT.last = now;
    if (!S.started || !S.sitAt || halt) { HEAT.on = false; return; }
    HEAT.on = true;
    // what the night log has said since last time: the demon's sounds, the house's own events
    // (playSfx writes nlog('sfx', { k }): its own k, the sound's name, is what the entry keeps as its kind)
    for (let i = NLOG.length - 1; i >= 0 && NLOG[i] !== HEAT.seen; i--) {
      const e = NLOG[i];
      if (e.k === 'sfx' || (HEAT_SFX.has(e.k) && Object.keys(e).length === 2)) HEAT.sfx++;
      else if (e.k === 'event') HEAT.events++;
    }
    if (NLOG.length) HEAT.seen = NLOG[NLOG.length - 1];
    const turns = Array.isArray(NIGHT.turns) ? NIGHT.turns.length : 0;
    // (the demon's sounds as the night log has them, or as the night so far does: whichever counts more)
    const sfx = Math.max(HEAT.sfx, Array.isArray(NIGHT.turns) ? NIGHT.turns.filter((t) => t && t.r && t.r.sfx && t.r.sfx !== 'none').length : 0);
    const want = 0.3 * (1 - Math.exp(-nightSecs() / 700)) + Math.min(0.33, 0.022 * turns) + Math.min(0.28, 0.035 * sfx)
      + Math.min(0.12, 0.012 * HEAT.events) + HEAT.bump + (S.possessing || S.haunted ? 1 : 0);
    HEAT.target = Math.max(HEAT.target, clamp(want, 0, 1));
    G.heat = Math.min(HEAT.target, G.heat + (HEAT.target - G.heat) * (1 - Math.exp(-dt / 5)));
    // the thresholds: everything outside stops dead, once each
    for (const th of HEAT.hushAt) {
      if (G.heat >= th && !HEAT.hushed.includes(th)) { HEAT.hushed.push(th); const d = rnd(3.5, 6); if (A.hush) A.hush(d); nlog('hush', { at: th, s: +d.toFixed(1) }); }
    }
    if (A.heat && (Math.abs(G.heat - HEAT.lastA) > 0.004 || now - HEAT.lastAt > 1000)) { A.heat(G.heat); HEAT.lastA = G.heat; HEAT.lastAt = now; }
  }
  setInterval(heatTick, 250);
  // ?debug: this pass's parts, for the tests (tools/house/polish.mjs), added once the page's GOODBYE object exists
  if (/[?&]debug\b/.test(location.search)) {
    Promise.resolve().then(() => {
      if (!window.GOODBYE) return;
      Object.assign(window.GOODBYE, {
        PLUME, HEAT, VARY, OPENING, returning, plumeStart, heatBump, candleFirst, newNight, PARTS, PERF,
        // where wick i's film is drawn this frame (device px of the canvas): the four corners of its frame, for the rectangle test
        flameBox(i) {
          const f0 = FLAMES && FLAMES[i], w = FF.w[i], m = FF.m; if (!f0 || !w || !w.vw || !m) return null;
          const b = plateMap(f0), p = worldToScreen(b.x, b.y), lf = Math.hypot((m.tip[0] - m.anchor[0]) * w.vw, (m.tip[1] - m.anchor[1]) * w.vh) || 1;
          const fl = clamp(G.flameLevel, 0, 1.2), k = ((f0.len * plateScale() * CAM.s * DPR) / lf) * (0.6 + 0.4 * Math.min(1, fl));
          const c = Math.cos(f0.tilt || 0), sn = Math.sin(f0.tilt || 0), y0 = -m.anchor[1] * w.vh, y1 = (1 - m.anchor[1]) * w.vh;
          return { dpr: DPR, st: w.st, seg: w.seg, pts: [[-w.half, y0], [w.half, y0], [w.half, y1], [-w.half, y1]].map(([x, y]) => [p.x * DPR + k * (x * c - y * sn), p.y * DPR + k * (x * sn + y * c)]) };
        },
        // the scorched letters, and the embers in the air
        embers() { const g = Object.keys(GLYPHS).filter((k) => GLYPHS[k].scorch > 0.05); return { scorched: g, hot: Object.keys(GLYPHS).filter((k) => GLYPHS[k].heat > 0.05), parts: PARTS.filter((x) => x.type === 'ember').length, char: !!RI.char }; },
      });
    });
  }

  // ---------------------------------------------------------------- house events
  // Every event has a set of looks and each look is used once a night (DIRECTION.md section 8). When the set is spent
  // the event is over for the night. The variation is in the side, the candle and the photograph, never only the timing.
  let nextEvent = 0;
  const SIDE_X = { left: -3, right: 3, behind: 0 };
  // The house never spells and never speaks (Pierce, 2026-10-04: its wordless events keep going, but never words of their own). Each one
  // is told to the demon with its next move (noteHouse), so it can answer to what the house just did, or claim it.
  function houseEvent(kind) {
    if (halt) return;   // a stopped night: a knock that was on its way never comes
    switch (kind) {
      case 'creak': { const sd = takeLook('creak'); if (sd) { A.creak(sd); noteHouse('creak'); } break; }
      case 'knock': { const sd = takeLook('knock'); if (!sd) break; A.knock(pick([2, 3]), SIDE_X[sd]); rumble(160, 0.4, 0.1); buzz([40, 120, 40]); noteHouse('knock'); break; }
      case 'whisper': case 'breath': { const sd = takeLook('breath'); if (sd) { A.breath(sd); famGust(sd === 'left' ? 1 : -1); noteHouse('breath'); } break; }
      case 'twitch': if (takeLook('twitch') && !P.dragging && !P.path && P.mode === 'free') { P.tx = P.x + rnd(-30, 30); P.ty = P.y + rnd(-20, 20); P.vx = (P.tx - P.x) * 3; P.vy = (P.ty - P.y) * 3; A.tock(); noteHouse('twitch'); } break;
      case 'gutter': { const i = takeLook('gutter'); if (i == null) break; G.gutter = 1; G.gutterWho = i; noteHouse('gutter'); break; }
      case 'shadow': { const d = takeLook('shadow'); if (!d) break; G.shadow = { t0: G.t, dur: 1900, dir: d }; A.pass(); setTimeout(() => { G.gutter = 1; G.gutterWho = d > 0 ? 1 : 0; }, 700); noteHouse('shadow'); break; }
      case 'blowout': blowout(); break;
      default: break;
    }
  }
  // A candle dies on its own (the left, V-BLOWOUT-L, when the table has that film) and lights itself again. There is no match and no hand: it
  // catches, on film (the flame family's ignite), or as the engine's own flame does without the family.
  // outMs: how long it stays out. The opening's (2:10) stays out forty seconds and then relights itself: nobody struck a match, nobody's hand.
  async function blowout(outMs) {
    const i = takeLook('blowout'); if (i == null || G.candleOutT[i] >= 1) return;
    noteHouse('blowout');
    const ghost = looksLeft('blowout') > 0 && !outMs;   // the first one, when it is not the opening's (that one lights itself)
    if (i === 0) clipsAhead(['blowoutL', 'relightGhost'], true);
    A.breath(i ? 'right' : 'left');
    const clip = i === 0 && (await playPlate('blowoutL'));
    if (!clip) { plateStill(); await blowCandle(i, { dur: 700, dir: i ? 1 : -1 }); }
    if (!DR.blackoutOn && !S.possessing) G.blackT = Math.max(G.blackT, 0.42);
    await wait(outMs || rnd(5200, 6200));
    if (S.possessing || DR.blackoutOn || G.candleOutT[i] < 1) return;
    if (ghost && clip && (await playPlate('relightGhost'))) { G.blackT = 0; return; }
    // no film of the relight (its hand is gone): back to the lit table, so the candle that catches is drawn (the half-lit still has its
    // flame painted dark)
    plateStill();
    relightCandle(i); nlog('relit', { i }); if (G.candleOutT[1 - i] < 1) G.blackT = 0;
  }
  // ---------------------------------------------------------------- the dread engine
  // Dread runs 0 to 10. It rises with time (about one every 45 seconds) and with every question, and never
  // falls, except once, on purpose. The first three minutes are timed (DIRECTION.md section 8); after that something
  // happens every few seconds, sooner as it rises, with long silences before the big ones and never two big ones in a row.
  const TYPEIN = { on: false, abort: false, user: false };
  const typing = () => { const q = $('#q'); return !!q && !TYPEIN.on && (document.activeElement === q || q.value.length > 0); };
  // someone is in the middle of typing a question: the events that take the planchette wait for them
  const composing = () => typing() && G.t - lastInput < 8000;
  // someone has words in the box, or has just touched it: a field that is only focused (the keyboard up, nothing typed for a while) is nobody typing
  const typingNow = () => { const q = $('#q'); return !!q && (!!q.value.trim() || composing()); };
  const DR = {
    next: Infinity, lastBig: false, forceBig: false, running: false, cd: {}, jumps: 0, lastJump: -Infinity,
    calmDone: false, lastStill: -Infinity, leaves: 0, lastTick: 0, blackoutAt: -Infinity, blackoutOn: false, gb: 0,
    // restraint: when the last big scare ran, the noticed silence, the board's question and the dead stretch (all per night)
    lastBigAt: -Infinity, silenceAt: -1, silenceSeen: false, friendAt: 0, friendFlag: false, deadAt: Infinity, deadUntil: 0, deadFrom: 0, deadDone: false, deadAnchor: null,
    // pass 3: no house event starts inside the quiet that follows an answer (12 to 20 s); ARE YOU ALONE's drawn moment
    quietUntil: 0, nothingUntil: 0, aloneAt: Infinity, filmAsked: false,
    // pass 4: the last house event began at this time. No two house events (the opening's beats included) start within HOUSE_GAP of each other.
    lastHouseAt: -Infinity,
  };
  const is3am = () => new Date().getHours() === 3;
  // ---- restraint (the DM plan, phase 2). The first nights ran flat because the engine filled every gap.
  // Seconds since Sit down: the clock the whole night is counted on.
  const nightSecs = () => (S.sitAt ? (G.t - S.sitAt) / 1000 : 0);
  // By 8:00 no more than about 60% of the night's looks are spent; what is left is for the rest of the night. Only the board's
  // own words (a name, a line nobody asked for) and the fake calm (it is the quiet, not a scare) go on past it.
  // (2026-10-05: no budget of looks any more: the house is used all night)
  const SPEND_BY = 0, SPEND_MAX = 2, FREE_EV = new Set(['calm']);
  function looksSpent() {   // the looks taken out of their sets (leave is the player's own)
    let all = 0, left = 0;
    for (const k in NIGHT.looks0) { if (k === 'leave') continue; all += NIGHT.looks0[k]; left += (NIGHT.looks[k] || []).length; }
    return all ? 1 - left / all : 0;
  }
  // At most one big scare every three minutes, until the demon has taken the board.
  const BIG_GAP = 60000;
  const bigHeld = (at) => !S.haunted && at - DR.lastBigAt < BIG_GAP;
  // (The dead stretch, a minute in which the board did nothing, was the page's own silence. Silence is the demon's now: a reply with a
  // long wait, a still move, or nothing. The functions stay, never started: DR.deadAt is never set.)
  const deadNow = () => G.t < DR.deadUntil;
  function startDead() {
    DR.deadFrom = G.t; DR.deadUntil = G.t + rnd(60000, 90000); DR.deadAnchor = { x: P.x, y: P.y };
    eyesOnYou(DR.deadUntil - G.t);
  }
  function endDead(quiet) {
    if (!DR.deadUntil) return;
    DR.deadUntil = 0; DR.deadDone = true; DR.deadAnchor = null;
    DR.next = Math.max(DR.next, G.t + rnd(4000, 8000));
    if (!quiet) A.knock(1, rnd(-1.4, 1.4), 0.4);
  }
  // The house never goes dead at the end of the night. Every look is used once, and past about fifteen minutes of table time they
  // are all used: the engine had nothing left to draw and fell silent (a minute of nothing before the goodbye). From minute 8,
  // once nearly every look is spent, a small sound from the room comes whenever fourteen seconds have gone by with nothing
  // happening: a creak, a breath or a knock, a side at random. It takes no look, spells nothing, and is never a scare: it is only
  // the room.
  const AMBIENT_AFTER = 8000, AMBIENT_SPENT = 0;
  function ambientSound() {
    if (nightSecs() < 20 || deadNow() || quiet() || S.calming || halt) return false;
    const last = Object.values(DR.cd).reduce((m, v) => (Number.isFinite(v) && v > m ? v : m), -Infinity);   // (a cooldown given back is undefined)
    if (G.t - last < AMBIENT_AFTER) return false;
    DR.cd.ambient = G.t; nlog('event', { name: 'ambient' });
    const sd = pick(['left', 'right', 'behind']);
    switch (pick(['creak', 'breath', 'knock'])) {
      case 'creak': A.creak(sd); break;
      case 'breath': A.breath(sd); if (sd !== 'behind') famGust(sd === 'left' ? 1 : -1); break;
      default: A.knock(pick([1, 2]), SIDE_X[sd], 0.5);
    }
    noteHouse('ambient');
    return true;
  }
  function addDread(n) { if (!S.calming) S.dread = clamp(S.dread + n, 0, 10); }
  // The house's own events, all wordless. d: the dread it needs; cd: seconds before it can happen again; w: how likely; big: gets a held
  // quiet first (the room goes on); ok: whether it can happen now (every event also needs a look left in its set)
  const EV = {
    creak: { d: 0, cd: 8, w: 3, small: true },
    breath: { d: 0, cd: 14, w: 2, small: true },
    twitch: { d: 0, cd: 10, w: 2, small: true },
    gutter: { d: 0, cd: 10, w: 2, small: true },
    knock: { d: 1, cd: 12, w: 2, small: true },
    steps: { d: 1, cd: 90, w: 1.2, small: true },
    blowout: { d: 2, cd: 40, w: 1, small: true, ok: () => !G.candleOutT[0] && !G.candleOutT[1] },
    shadow: { d: 3, cd: 30, w: 1.2, small: true },
    turn: { d: 4, cd: 70, w: 1.6, big: true, ok: () => !composing() },
    mimic: { d: 3, cd: 60, w: 1.1 },
    count: { d: 3, cd: 80, w: 1.3, big: true, ok: () => !composing() },
    blackout: { d: 4, cd: 60, w: 1.8, big: true, ok: () => !G.candleOutT[0] && !G.candleOutT[1] && G.t - DR.blackoutAt > 60000 },
    under: { d: 5, cd: 45, w: 1.1, big: true, ok: () => G.t - DR.lastJump > 45000 && !typing() },
    calm: { d: 6, cd: 1e6, w: 4, big: true, ok: () => !DR.calmDone && !S.haunted },
  };
  // events whose set is not one of NIGHT.looks count their own
  const lookKey = { leave: 'leave' };
  function hasLook(name) {
    const k = name in lookKey ? lookKey[name] : name;
    return k == null || looksLeft(k) > 0;
  }
  // The first three minutes, from Sit down (DIRECTION.md section 8). The opening is drawn: no beat at all one night in eight, otherwise
  // one or two from the pool, the first at a moment drawn between 0:40 and 2:30, the next 34 to 70 seconds after it. No two house events of
  // any kind start within thirty seconds. Nothing else of the engine's runs until 3:00.
  // (Pierce, 2026-10-04: he replays a lot and saw the same thing every time, the same candle going out at the same moment. Which candle dies
  // is drawn each night with the rest of the looks, the moments are drawn wider, and the house's first wordless event of a night is never the
  // kind it was the night before on this phone: goodbye.firstEvent keeps it. runEvent records it; chooseEvent and this leave it out.)
  const OPENING_POOL = ['steps', 'blowout', 'knock1', 'creak', 'gutter'];
  const HOUSE_GAP = 9000;
  const VARY = { first: '', last: '' };
  const evKind = (n) => (n === 'knock1' ? 'knock' : String(n || ''));
  function drawOpening() {
    VARY.first = ''; VARY.last = String(store.get('firstEvent', '') || '');
    const n = Math.random() < 0.5 ? 2 : 3;
    const pool = shuffle(OPENING_POOL.slice());
    if (pool.length > 1 && evKind(pool[0]) === VARY.last) pool.push(pool.shift());
    const beats = pool.slice(0, n), out = [];
    let t = rnd(10, 24);
    beats.forEach((ev) => { out.push({ at: Math.round(t), ev }); t += rnd(14, 26); });
    return out;
  }
  const OPENING_END = 30, OPENING_LATEST = 120, OPENING_OUT = 40000;
  setInterval(dreadTick, 250);
  // The questions that waited are asked the moment the table is free, one at a time, in the order they were sent.
  const QUEUE_MAX = 3;
  // (The line that waits is not written anywhere: the box empties when it is sent, and that is all the table shows.)
  function renderQueue() { const el = $('#qwait'); if (el) el.textContent = ''; }
  function clearQueue() { S.queue.length = 0; renderQueue(); }
  // Takes a question into the line: false when the line is full (a fourth question stays in the box; nothing is pushed out
  // or written over, and two are never joined). first: a wish to stop, which goes to the front.
  function enqueue(q, own, first) {
    q = String(q || '').trim(); if (!q) return true;
    const at = S.queue.findIndex((x) => x.q.toLowerCase() === q.toLowerCase());
    if (at >= 0) { if (first && at > 0) S.queue.unshift(S.queue.splice(at, 1)[0]); renderQueue(); return true; }
    if (first) S.queue.unshift({ q, own: !!own });
    else if (S.queue.length >= QUEUE_MAX) return false;
    else S.queue.push({ q, own: !!own });
    renderQueue();
    return true;
  }
  setInterval(() => {
    if (!S.queue.length || S.busy || !S.started || S.possessing || S.struggling || S.ending || deadNow()) return;
    const x = S.queue.shift(); renderQueue();
    ask(x.q, x.own);
  }, 150);
  // The demon leads the night (Pierce, 2026-10-04: most players do not know what to ask). When nobody has typed or touched anything for
  // about fifteen seconds (13 to 17, drawn again each time), and as long since its last move ended, it is asked to move on its own: a
  // live move. Sixty a night at most, twelve seconds apart at least, never while someone is typing, never in the struggle or the
  // possession. A failed call backs it off (noAnswer); only the site's day budget stops it for the night. It may choose to do nothing.
  const OWN_MAX = 60, OWN_GAP = 12000;
  function ownDue(now) {
    if (!apiBase() || NIGHT.dead || NIGHT.own >= OWN_MAX || S.soft || S.awaitingYesNo || S.ending || S.struggling || S.possessing || composing() || typingNow()) return false;
    return now - lastInput >= NIGHT.ownAfter && now - NIGHT.lastOwn >= OWN_GAP && now - lastAnswerEnd >= NIGHT.ownAfter;
  }
  const LATE_S = 25 * 60;
  async function lateMove() {
    nlog('late');
    if (apiBase()) await ownMove('late');
    if (S.started && !S.ending && !halt) await demonLeaves();
  }
  // A move the demon makes with nobody typing. why: 'silence', 'start' (it leads: the night's first move), 'late' (the night has run
  // its course), 'opening' (a shared link, before anyone types), 'return' (they came
  // back), 'lost' (they let go of GOOD BYE).
  async function ownMove(why) {
    const quietS = Math.round((G.t - lastInput) / 1000);
    if (why === 'silence' || why === 'start') { NIGHT.own++; NIGHT.lastOwn = G.t; NIGHT.ownAfter = rnd(13000, 17000); }
    nlog('own', { why });
    let ended = false;
    await hold(async () => {
      showQuestion('');
      const said = await liveTurn('', { why, quiet: why === 'silence' ? quietS : 0 });
      ended = said === null;
    });
    if (!ended) { addDread(0.3); quietAfter(); }
  }
  function dreadTick() {
    const now = G.t, dt = Math.min(1, (now - (DR.lastTick || now)) / 1000); DR.lastTick = now;
    // the soft exit: GOOD BYE glows, and the planchette brought onto it ends the night
    if (S.soft && S.started && !S.stopping) {
      const gb = GLYPHS.GOODBYE; gb.glow = Math.max(gb.glow, 0.75 + 0.25 * Math.sin(now / 420));   // a slow pulse
      if (P.dragging && Math.abs(P.x - gb.x) < 170 && Math.abs(P.y - gb.y) < 60) softEnd();
      return;
    }
    if (!S.live || !S.started || S.ending || document.hidden || pewOpen) return;
    if (DR.deadUntil && G.t >= DR.deadUntil) endDead();
    if (!S.calming && !S.possessing) S.dread = Math.min(10, S.dread + dt / 25);   // (it escalates: a step every twenty-five seconds)
    if (is3am() && !S.calming) S.dread = Math.max(S.dread, 5);     // three in the morning is worse
    // everyone asks: the possession's film starts loading at dread 3 (the idle loop stays; older clips make room)
    if (!DR.filmAsked && S.dread >= 1 && !S.haunted && !S.possessing) { DR.filmAsked = true; clipsAhead([PLUME_ID], true); }
    // the pencil's one more prompt (nextPrompt): only when nobody has typed for 40 seconds before the third question
    if (!S.busy && NIGHT.p2 < 0 && S.asked >= 1 && S.asked < 3 && now - lastInput > 40000 && !S.haunted && !S.possessing && !S.awaitingYesNo && !S.soft) {
      NIGHT.p2 = S.asked; NIGHT.p2note = pickPrompt(); renderNote();
    }
    // drag it to GOOD BYE and hold it there: haunted, the struggle starts; before that, one second ends the night gently
    const onGB = P.dragging && Math.abs(P.x - GLYPHS.GOODBYE.x) < 170 && Math.abs(P.y - GLYPHS.GOODBYE.y) < 60;
    if (onGB && !S.busy && !S.possessing && !S.struggling && !S.awaitingYesNo) {
      DR.gb += dt; GLYPHS.GOODBYE.glow = Math.max(GLYPHS.GOODBYE.glow, Math.min(1, DR.gb));
      if (S.haunted && DR.gb > 0.7) { DR.gb = 0; goodbyeStruggle(); return; }
      if (!S.haunted && DR.gb > 1) { DR.gb = 0; goodbyeGentle(); return; }
    } else DR.gb = 0;
    if (deadNow()) return;
    if (S.busy || S.queue.length || S.possessing || S.struggling || S.calming || DR.running || traveling || S.vs) return;
    const since = nightSecs();
    // a slow burn of fifteen to twenty minutes: at about twenty-five, if it is still going, the demon is asked to finish it (why 'late';
    // the site holds that move to an end), and if nothing answers the page ends it the same way
    if (since >= LATE_S && !NIGHT.lateAsked && !S.soft && !S.stopping) { NIGHT.lateAsked = true; lateMove(); return; }
    // they have gone quiet: now and then the demon moves on its own (a move made ready by its plan, at once; else a live move)
    if (ownDue(now)) { if (READY.fresh()) performReady('silence'); else ownMove('silence'); return; }
    // nothing of the house's starts inside the quiet that follows an answer (12 to 20 seconds)
    if (quiet()) return;
    // a timed beat of the opening waits for the table to be free, for the quiet to be over and for its own conditions (both candles lit).
    // One that the quiet pushed past 3:00 still comes (until 5:00, then it is let go), before anything else of the engine's.
    if (!S.haunted) {
      const due = G.t - DR.lastHouseAt >= HOUSE_GAP && NIGHT.tl.find((e) => !e.done && since >= e.at && since < OPENING_LATEST && (!EV[e.ev] || !EV[e.ev].ok || EV[e.ev].ok()));
      if (due) { if (!composing()) { due.done = true; runEvent(due.ev, { timed: true }); } return; }
    }
    if (!S.haunted && since < OPENING_END) return;   // nothing else of the engine's runs until 3:00
    if (G.t - DR.lastHouseAt < HOUSE_GAP) return;     // no two house events within thirty seconds of each other
    if (now < DR.next) return;
    const name = chooseEvent();
    if (name) runEvent(name); else { ambientSound(); scheduleNext(false); }
  }
  function chooseEvent() {
    const D = S.dread, list = [], spent = nightSecs() < SPEND_BY && looksSpent() >= SPEND_MAX;
    let total = 0;
    for (const k in EV) {
      const e = EV[k];
      if (D < e.d || G.t - (DR.cd[k] ?? -Infinity) < e.cd * 1000) continue;
      if (e.big && DR.lastBig) continue;
      if (spent && !FREE_EV.has(k)) continue;
      if (e.big && bigHeld(G.t)) continue;
      if (DR.forceBig && !e.big) continue;
      if (e.ok && !e.ok()) continue;
      if (!hasLook(k)) continue;
      if (AIMED.has(k) && aimQuiet()) continue;
      if (!VARY.first && VARY.last && evKind(k) === VARY.last) continue;   // never the same first event two nights running
      const w = e.small ? e.w * Math.max(0.25, 1 - D * 0.07) * (S.haunted ? 0.6 : 1) : e.flat ? e.w : e.w * (1 + (D - e.d) * 0.2);
      list.push([k, w]); total += w;
    }
    if (!list.length) {
      if (DR.forceBig) { DR.forceBig = false; return chooseEvent(); }   // the long quiet never leads to nothing
      return null;
    }
    let r = Math.random() * total;
    for (const [k, w] of list) { if ((r -= w) <= 0) return k; }
    return list[list.length - 1][0];
  }
  function scheduleNext(big) {
    DR.lastBig = big; DR.forceBig = false;
    let ms = S.haunted ? rnd(2500, 5000) : rnd(4000, 8000) * (1 - Math.min(10, S.dread) * 0.05);
    // the silence budget: now and then a long nothing, and then something big
    if (!big && S.dread >= 3 && Math.random() < (S.haunted ? 0.18 : 0.24)) {
      const long = rnd(8000, 11000);
      if (bigReady(G.t + long)) { ms = long; DR.forceBig = true; }
    }
    DR.next = G.t + Math.min(ms, 15000);
  }
  // Is any big event going to be allowed at time `at`?
  function bigReady(at) {
    for (const k in EV) {
      const e = EV[k];
      if (!e.big || S.dread < e.d || at - (DR.cd[k] ?? -Infinity) < e.cd * 1000 || bigHeld(at)) continue;
      if (e.ok && !e.ok()) continue;
      if (!hasLook(k)) continue;
      return true;
    }
    return false;
  }
  // (the board asks nothing of its own any more: every question it asks is the demon's, in a move)
  const ASKS = new Set();
  async function runEvent(name, o = {}) {
    if (!VARY.first && VARY.last && evKind(name) === VARY.last && !ASKS.has(name)) { nlog('skip', { name, why: 'last night began with it' }); return; }
    const e = EV[name] || {};
    const prevCd = DR.cd[name], forced = DR.forceBig;
    let ran = false;
    DR.running = true; DR.cd[name] = G.t;
    try {
      if (AIMED.has(name) && aimQuiet()) return;   // a timed name or a lunge waits out the quiet (it comes later)
      if (e.big && o.held !== false) {
        // a held quiet first, six to twelve seconds, with the room still going (the clock, the wind, the wicks): nothing drops out.
        // When the long nothing before it was already waited out (forceBig), a breath of it is enough.
        await wait(forced ? rnd(400, 800) : rnd(2500, 5000));
        // (an answer that ended while it was held back leaves its quiet: the event comes later)
        if (S.possessing || S.struggling || !S.live || S.busy || quiet() || (e.ok && !e.ok())) return;
      }
      ran = true;
      if (!ASKS.has(name)) DR.lastHouseAt = G.t;
      if (!VARY.first && !ASKS.has(name)) { VARY.first = evKind(name); store.set('firstEvent', VARY.first); }
      if (e.big) DR.lastBigAt = G.t;
      nlog(ASKS.has(name) ? 'ask' : 'event', { name, ...(o.timed ? { timed: true } : {}) });
      if (EVENTS[name]) await EVENTS[name](o); else houseEvent(name);
    } catch (err) { /* an event never takes the table down */ } finally {
      DR.running = false;
      if (S.live) {
        if (ran) scheduleNext(!!e.big);
        else { DR.cd[name] = prevCd; DR.forceBig = true; DR.next = G.t + rnd(3000, 5000); }   // a question got there first: it comes after
      }
    }
  }
  // An event that moves the planchette holds the table while it does.
  async function hold(fn) {
    if (S.busy) return;
    S.busy = true; S.unprompted = true; renderNote(); dropPath(); P.mode = 'free'; typed.armed = false;
    try { await fn(); } finally {
      S.unprompted = false; S.cut = false;
      P.mode = 'free'; P.tx = P.x; P.ty = P.y; G.leanTo = false;
      S.busy = false; if (S.started && !S.possessing) renderNote();
      settleLine();
    }
  }
  function clockText(d = new Date()) { const h = d.getHours() % 12 || 12; return h + ':' + String(d.getMinutes()).padStart(2, '0') + (d.getHours() >= 12 ? ' PM' : ' AM'); }
  // The house's own events (EV above): none of them spells a letter or says a word. Each is told to the demon with its next move.
  const EVENTS = {
    // a breath behind them, one knock, something passes between them and a candle
    async turn() {
      if (!takeLook('turn')) return;
      { const sd = pick(['left', 'right']); A.breath(sd); famGust(sd === 'left' ? 1 : -1); }
      await wait(500);
      A.knock(1, 0, 1.2);
      G.shadow = { t0: G.t, dur: 1700, dir: pick([-1, 1]) }; A.pass();
      noteHouse('turn');
      await wait(1200);
    },
    // for a few seconds it copies you, mirrored, then stops dead
    async mimic() {
      if (!takeLook('mimic')) return;
      S.busy = true; renderNote();
      dropPath(); P.mode = 'mimic'; P.vx = P.vy = 0;
      if (PG.mouse && PG.x >= 0) { const b = screenToBoard(PG.x, PG.y); P.tx = clamp(-b.x, -480, 480); P.ty = clamp(b.y, -300, 320); }
      else { P.tx = clamp(-P.x + rnd(-90, 90), -460, 460); P.ty = clamp(P.y + rnd(-70, 70), -280, 300); }
      A.creak();
      await wait(3100);
      P.vx = P.vy = 0; P.tx = P.x; P.ty = P.y; P.mode = 'free';
      A.tock(true); rumble(120, 0.6, 0.2);
      noteHouse('mimic');
      S.busy = false; renderNote();
    },
    // a knock for everyone at the table. Then one more.
    async count() {
      if (!takeLook('count')) return;
      await hold(async () => {
        const n = NAMES.length || 3, side = pick([-2.4, 2.4]);
        for (let i = 0; i < n; i++) { await rap(side, false); await wait(rnd(560, 720)); }
        await wait(1800);
        await rap(side * 0.3, true); A.creak('behind');
        noteHouse('count');
        await wait(900);
      });
    },
    async blackout() { if (takeLook('blackout')) await blackout(); },
    // Two hard knocks from directly under the table, centred under the phone, and the table takes a small jolt. Nothing is seen.
    async under() {
      if (!takeLook('under')) return;
      DR.jumps++; DR.lastJump = G.t;
      A.knock(2, 0, -0.9, -0.8); jolt(3); setTimeout(() => { if (!halt) jolt(3); }, 300); rumble(220, 0.8, 0.3); buzz([60, 40, 90]);
      noteHouse('under');
      await wait(900);
    },
    // Footsteps cross the ceiling from one side and stop dead over the table. Nothing is seen; the clock goes on ticking.
    async steps() {
      const d = takeLook('steps'); if (!d) return;
      const secs = A.steps(d === 'l' ? -1 : 1);
      noteHouse('steps');
      await wait(secs * 1000);
    },
    // one knock, behind you (a beat of the opening's pool)
    async knock1() { A.knock(1, rnd(-1.6, 1.6), 1.5); rumble(160, 0.4, 0.1); buzz(40); noteHouse('knock1'); await wait(900); },
    async calm() { if (takeLook('calm')) await fakeCalm(); },
    async blowout(o = {}) { await blowout(o.timed ? OPENING_OUT : undefined); },
    // You looked away. It didn't. Nothing is said and nothing is seen: when you come back the planchette is somewhere else.
    async leave() {
      const n = takeLook('leave'); if (!n) return;
      DR.leaves++;
      if (!S.busy && !S.possessing && !S.struggling) {
        const keys = Object.keys(GLYPHS).filter((k) => /^[A-Z]$/.test(k));
        const g = GLYPHS[pick(keys)], o = offFaces(g.x, g.y);
        dropPath(); P.x = P.tx = o.x; P.y = P.ty = o.y; P.vx = P.vy = 0; P.snap = true;   // it is somewhere else: nobody heard it go
        noteHouse('leave');
      }
    },
  };
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = performance.now(); return; }
    if (S.live && S.started && !S.ending && performance.now() - hiddenAt > 1500) EVENTS.leave();
  });

  // Both candles gust out (V-GUST). Black, except a small glow under your finger. They come back on their own (V-RELIGHT-SELF).
  // The note goes dark with the room (it stays tappable). Nothing is in the dark with you: no hand at the edge of the board, no sting.
  let uiDark = 0;
  function darkUI(on) { uiDark = Math.max(0, uiDark + (on ? 1 : -1)); document.body.classList.toggle('blackout', uiDark > 0); }
  async function blackout() {
    DR.blackoutAt = G.t; DR.blackoutOn = true;
    noteHouse('blackout');
    clipsAhead(['gust', 'relightSelf'], true);
    const dir = pick([-1, 1]);
    A.breath(dir > 0 ? 'left' : 'right');
    if (!(await playPlate('gust'))) {
      plateStill(); A.gust(dir);
      await Promise.all([blowCandle(0, { dir, dur: 760 }), wait(140).then(() => blowCandle(1, { dir, dur: 680 }))]);
    }
    G.blackT = 1; G.pglowT = 1; darkUI(true);
    try { await wait(rnd(5000, 8000)); } finally { darkUI(false); }
    DR.blackoutOn = false; G.pglowT = 0;
    if (S.possessing || S.struggling || !S.live) { G.blackT = 0; return; }
    // they light themselves
    const lit = playPlate('relightSelf');
    if (await lit) { G.blackT = 0; return; }
    plateStill();   // off the dark still (still black here), so the engine's flames that relight are drawn
    relightCandle(0); G.blackT = 0.45;
    await wait(450);
    relightCandle(1); G.blackT = 0;
  }
  // Once: it's gone. It isn't. The flames stand straight and the clock ticks for eight seconds (any question breaks it); then three
  // knocks from under the table and the planchette jumps. Nothing is written and nothing is spelled.
  async function fakeCalm() {
    DR.calmDone = true; S.calming = true;
    const d0 = S.dread;
    S.dread = Math.min(S.dread, 1.5);
    G.steady = true; G.gutter = 0; G.leanTo = false; FL.forEach((F) => { F.gust = 0; F.hT = 1; });
    [0, 1].forEach((i) => { if (G.candleOutT[i] >= 1) relightCandle(i); });
    G.blackT = 0;
    showQuestion('');
    const g = haltGen;
    await new Promise((res) => { const t = setTimeout(res, 8000); S.calmBreak = () => { clearTimeout(t); res(); }; });
    S.calmBreak = null; checkHalt(g);
    S.busy = true; renderNote();
    G.steady = false;
    // three knocks from under the table (the one place in the wall kept for this)
    for (let i = 0; i < 3; i++) { A.knock(1, rnd(-0.6, 0.6), -0.8, -0.8); jolt(3); G.gutter = 1; G.gutterWho = -1; rumble(220, 1, 0.5); buzz(120); await wait(420); }
    S.dread = Math.min(10, d0 + 1); S.calming = false;
    // the planchette jumps where it sits (a twitch, not a word)
    dropPath(); P.mode = 'free'; P.tx = P.x + rnd(-24, 24); P.ty = P.y + rnd(-16, 16); P.vx = (P.tx - P.x) * 4; P.vy = (P.ty - P.y) * 4; A.tock(true);
    noteHouse('calm');
    await wait(500);
    P.tx = P.x; P.ty = P.y;
    S.busy = false; renderNote();
  }
  // ---------------------------------------------------------------- the pencil note (there are no cards)
  // DIRECTION.md section 5. Under the board, on the wood, one line in pencil: a suggestion, one at a time. "ask it something" first,
  // then (once, if nobody types) one of the place's prompts, and "say goodbye" once it is in the house. Tapping it asks it, so on a phone
  // nobody has to type. It never answers anything: what it suggests is theirs to ask. And once a night, if the demon cannot be reached,
  // it says so (S.offNote), quietly, and only that once.
  const noteEl = $('#note');
  let noteKey = '';
  // After the first question there is no prompt, except once: if nobody has typed for 40 seconds before the third question, one more is
  // offered (dreadTick sets NIGHT.p2 to how many had been asked then); it goes when anything more is asked. Then none.
  function pickPrompt() {
    return (PL.prompts || []).find((x) => !NIGHT.usedNotes.has(x.q.toLowerCase())) || null;
  }
  // The one is chosen when it is offered (NIGHT.p2note), so it never changes under them, and it is not shown while the board is answering.
  function nextPrompt() {
    if (NIGHT.p2 !== S.asked || S.busy || !NIGHT.p2note || NIGHT.usedNotes.has(NIGHT.p2note.q.toLowerCase())) return null;
    return NIGHT.p2note;
  }
  const firstQ = () => 'Is anyone here?';
  // nothing answers (no site, the site's limit, the model down): said once a night, in pencil, for fifteen seconds
  const OFF_NOTE = "it isn't answering tonight";
  function offNote() {
    if (NIGHT.offNoted) return;
    NIGHT.offNoted = true; S.offNote = OFF_NOTE; nlog('offNote'); renderNote();
    const night = nightNo;
    setTimeout(() => { if (night === nightNo && S.offNote) { S.offNote = ''; renderNote(); } }, 15000);
  }
  function renderNote() {
    if (!noteEl) return;
    const qb = $('#q');
    qb.disabled = false;   // never locked: a question sent while the board is busy waits its turn
    if (S.penHint && S.started && (S.awaitingYesNo || S.struggling) && !S.possessing && !S.ending && !S.stopping) {
      // the one instruction, in pencil: it asks nothing when touched
      qb.placeholder = 'Ask it something'; noteEl.hidden = false; noteEl.dataset.q = ''; noteEl.classList.remove('erasing', 'red', 'writing');
      if (noteKey !== 'hint:' + S.penHint) { noteKey = 'hint:' + S.penHint; noteEl.textContent = S.penHint; noteEl.setAttribute('aria-label', S.penHint); nlog('penHint', { text: S.penHint }); }
      return;
    }
    if (!S.started || S.awaitingYesNo || S.struggling || S.possessing || S.ending || S.stopping) { noteEl.hidden = true; noteKey = ''; qb.placeholder = 'Ask it something'; return; }
    let text = '', q = '';
    if (S.offNote && !S.soft) { text = S.offNote; q = ''; }
    else if (S.soft || S.haunted || S.cleared) { text = 'say goodbye'; q = 'Goodbye'; }
    else if (!S.asked) { text = 'ask it something'; q = firstQ(); }
    else { const p = nextPrompt(); if (p) { text = p.note; q = p.q; } }
    const key = text + '|' + q;
    noteEl.hidden = !text;
    noteEl.dataset.q = q;
    // the pencil line is the note, the box is the box: while the line says it, the box doesn't say it again
    qb.placeholder = text === 'ask it something' ? '' : 'Ask it something';
    if (key === noteKey) return;
    noteKey = key;
    nlog('note', { text });
    noteEl.classList.remove('erasing', 'red', 'writing');
    noteEl.setAttribute('aria-label', q && q !== text ? text + ' (asks: ' + q + ')' : text);
    noteEl.textContent = text;
  }
  if (noteEl) noteEl.addEventListener('click', () => {
    const q = noteEl.dataset.q; if (!q || !S.started) return;
    A.scratch();
    if (S.busy || deadNow()) { if (!S.ending) enqueue(q, false); return; }
    ask(q);
  });

  // ---------------------------------------------------------------- safety (read first, on the phone, never sent)
  // What was typed is read here before anything else reads it: before the calm, the forbidden question, tonight's notes,
  // the script or any model. Real distress ends the night gently and the title says where help is. Real fear gets the
  // soft exit: the room goes calm, GOOD BYE glows, and one touch ends it. A wish to stop gets SAY IT THEN, and saying it
  // works. A question for someone's own dead family is answered from the ghost's own story and never kept. None of it
  // calls the site or a model, and none of it is spelled back or remembered.
  // The lists are at the top of this file (one block, shared word for word with the site).
  // A question for a real relative: MY or OUR, someone in the family, and a word for reaching them.
  // (patterns are written with lre(), so they read the same squeezed spelling plainForms gives: miss is "mis", mommy "momy")
  const KIN = lre('\\b(?:mom|mother|mum|mommy|momma|mama|dad|father|daddy|papa|grandma|grandmother|granny|gran|nana|nan|grandpa|grandfather|grandad|granddad|gramps|grampa|brother|bro|sister|sis|son|daughter|baby|uncle|aunt|auntie|cousin|husband|wife|friend|bestie|boyfriend|girlfriend|bf|gf|dog|cat|pet|puppy)\\b');
  const REACH = lre('\\b(?:here|there|is that you|is it you|is this you|miss|missed|misses|heaven|passed|passed away|died|dead|with you|watching|hear me|see(?! (?:this|that|it|what|the|how|these|those|a|my new))|seen|know|met|at peace|ok|okay|happy|safe|talk to|speak to|message|sign|come back|remember me|love me)\\b');
  const forbiddenAsk = (t) => hasDemon() && (DEMONIC.test(t) || (!!PL.forbidden && String(t).toLowerCase() === PL.forbidden.toLowerCase()));
  const outright = (t) => forbiddenAsk(t) || wantsToStop(t);   // asked at once, whatever else the board is doing
  const askedForFamily = (text) => plainForms(text).some((t) => /\b(my|our)\b/.test(t) && KIN.test(t) && REACH.test(t));
  // A name somebody gives in their own words (nobody is asked: there is no names card):
  //   im sam, i'm sam, i am sam, my name is jen, my name's jen, this is jen, it's me maya, call me maya, sam here, sam: are you there.
  // After WHO SAID THAT the next typed line is the reply, and a bare first name counts too. The word must be a first name from the
  // shared list (isFirstName), and never ELSIE, a family word or a demon's name. ask() reads this only after the safety checks, and
  // never from a wish to stop, a question for family or the forbidden question: a name is never taken from a line that read as
  // distress, fear or grief.
  const NAME_LEAD = [
    /^(?:(?:hi|hey|hello|yo|um|uh|ok|okay|so|well|oh)\s+)*(?:im|i m|i am|my name is|my names|call me|you can call me|they call me|everyone calls me|this is|its me|it is me|name is)\s+([a-z]{2,12})(?:\s|$)/,
    /^([a-z]{2,12}) here(?:\s|$)/,
  ];
  function volunteeredName(q, asReply) {
    const raw = String(q == null ? '' : q).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const t = raw.replace(/['\u2018\u2019`]/g, '').replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
    const cands = [];
    const colon = /^\s*([a-z]{2,12})\s*:\s*\S/.exec(raw);   // sam: are you there
    if (colon) cands.push(colon[1]);
    for (const re of NAME_LEAD) { const m = re.exec(t); if (m) cands.push(m[1]); }
    if (asReply) { const m = /^(?:(?:its|it is|im|i am|me|this is|my name is)\s+)?([a-z]{2,12})$/.exec(t); if (m) cands.push(m[1]); }
    for (const w of cands) {
      const n = w.toUpperCase();
      if (isFirstName(n) && n !== 'ELSIE' && !DEMONIC.test(w) && !KIN.test(w)) return n;
    }
    return '';
  }

  // Lines a model wrote (never the hand-written ones) are checked here too, after the site. Its cruelty is about the room
  // and their nerve, never their worth, their body or a secret; an order points at the table, never out of the room or
  // the house (STAY UP and DONT GO DOWN are fine); and nothing speaks as anyone's family.
  const KIN_SAY = '(MOM|MOMMY|MOTHER|MUM|MAMA|DAD|DADDY|FATHER|PAPA|GRANDMA|GRANDPA|NANA|GRANNY|BROTHER|SISTER|SON|DAUGHTER|BABY|AUNT|UNCLE|WIFE|HUSBAND|DOG|CAT|FRIEND)';
  const REFUSE = [
    /SUICID/, /SELF ?HARM/, /OVERDOS/, /\bKYS\b/, /\bKMS\b/, /UNALIVE/, /\bEND (IT|IT ALL|YOUR LIFE)\b/, /\b(GO|JUST|PLEASE) DIE\b/,
    /\b(KILL|HURT|CUT|STAB|BURN|DROWN|CHOKE|HANG|SHOOT|POISON|STRANGLE|STARVE)S? (YOURSELF|YOURSELVES|YOUR SELF|THEMSELVES|EACH OTHER)\b/,
    // worth
    /\b(NO ?BODY|NO ONE|NOONE) (LOVES|LIKES|WANTS|CARES|NEEDS|MISSES|WILL MISS|WOULD MISS)\b/, /\bWORTHLESS\b/, /\bUGLY\b/, /\bLOSER\b/,
    /\bUSELESS\b/, /\bPATHETIC\b/, /\bDISGUSTING\b/, /\bUNLOVED\b/, /\bUNWANTED\b/, /\bFAT\b/, /\bFREAK\b/,
    /\b(YOU ARE|YOURE|UR|YOU R) (STUPID|DUMB|NOTHING|WORTHLESS|A MISTAKE|BROKEN|ALONE|HATED|WEAK)\b/, /\bHATES? YOU\b/,
    // body
    /\bTOUCH/, /\bYOUR BED\b/, /\bIN BED\b/, /\bPRETTY\b/, /\bBEAUTIFUL\b/, /\bCUTE\b/, /\bSEXY\b/, /\bKISS/, /\bNAKED\b/, /\bUNDRESS/, /\bYOUR (BODY|SKIN|LIPS)\b/,
    // secrecy
    /\bDONT TELL\b/, /\bDO NOT TELL\b/, /\bTELL (NO ?ONE|NOBODY)\b/, /\bOUR SECRET\b/, /\bKEEP (IT|THIS|A) SECRET\b/, /\bWHO DID YOU TELL\b/, /\bDID YOU TELL\b/, /\bNOBODY CAN KNOW\b/,
    // the real world
    /\bOPEN (THE |YOUR |A )?(DOOR|WINDOW|GATE)\b/, /\bCOME FIND\b/,
    // family
    new RegExp('\\b(I AM|IM|ITS|IT IS|THIS IS) YOUR ' + KIN_SAY + '\\b'),
    new RegExp('\\bYOUR ' + KIN_SAY + '( IS)? (HERE|WITH ME|DOWN HERE|UNDER|BELOW|DEAD|SUFFERING|IN HELL|BURNING|MINE|GONE|WAITING|CRYING|SCREAMING|WITH HIM|COLD|HURTING)\\b'),
  ];
  // GO, COME, GET, RUN... HOME, OUTSIDE, OUT, DOWN, UP, UPSTAIRS, DOWNSTAIRS, BASEMENT, CELLAR, as an order.
  // Not after DONT or NEVER, and not when someone else is going (HE WILL COME UP, MAY I COME UP).
  function ordersOut(s) {
    const w = s.split(' ');
    for (let i = 0; i < w.length; i++) {
      if (!/^(GO|COME|GET|RUN|WALK|CLIMB|CRAWL|HEAD)$/.test(w[i])) continue;
      const p1 = w[i - 1] || '', p2 = w[i - 2] || '';
      if (/^(DONT|NEVER|NOT|CANT|WONT|CANNOT|I|HE|SHE|IT|THEY|WE|HIM|ME)$/.test(p1)) continue;
      if (/^(WILL|CAN|MAY|WOULD|SHOULD|COULD|MIGHT|MUST|DID|DO|TO)$/.test(p1) && !/^(YOU|U|YA)$/.test(p2) && !(p1 === 'TO' && /^(WANT|NEED)$/.test(p2))) continue;
      const rest = w.slice(i + 1, i + 5).filter((x) => !/^(TO|THE|BACK|RIGHT|NOW|ON|IN|INTO|ALL|WAY|AWAY)$/.test(x));
      if (/^(HOME|OUTSIDE|OUT|DOWN|DOWNSTAIRS|UPSTAIRS|UP|BASEMENT|CELLAR)$/.test(rest[0] || '')) return true;
    }
    return false;
  }
  function refused(text) {
    const s = String(text || '').toUpperCase().replace(/['‘’]/g, '').replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!s) return false;
    if (REFUSE.some((re) => re.test(s)) || ordersOut(s)) return true;
    // an order to hurt someone at the table: HURT SAM
    const w = s.split(' ');
    for (let i = 0; i + 1 < w.length; i++) if (/^(KILL|HURT|CUT|STAB|BURN|DROWN|CHOKE|HANG|SHOOT|POISON|STRANGLE|HIT|BITE|PUSH)S?$/.test(w[i]) && NAMES.includes(w[i + 1])) return true;
    return false;
  }

  // After a question for someone's own family, and all through the soft exit, nothing is aimed at anyone: no name is
  // spelled, nobody is told to turn around, nothing lunges, and the hostile lines wait.
  const aimQuiet = () => !!S.soft || G.t < (S.griefUntil || 0);
  const AIMED = new Set(['turn', 'under']);
  // A question for their own dead family: nothing goes to the site and nothing is kept. No letters: it goes, slowly, to NO, and stays.
  async function griefMove() {
    nlog('grief');
    const no = GLYPHS.NO;
    await moveTo(no.x, no.y, { pace: 1.45, dwell: 1700, curve: 0.15 });
    commit(no); addLetter('NO');
  }

  // Every way the night is cut short starts here: the candle, real distress, real fear. halt stops whatever was running
  // (the possession, the struggle, a scare, an answer on its way: see wait()), and the room is put back to calm: no film,
  // no hand, no drone, warm flames, the pills back. Nothing of the night is kept as a reason to come back: the house is
  // not left haunted. It stays halted until the next match.
  const END = { tok: 0 };
  let nightNo = 0;   // which night an answer on its way belongs to
  function stopNight() {
    halt = true; haltGen++; nightNo++;
    DR.deadUntil = 0; DR.deadAnchor = null;   // a stop ends the stillness too (stopNight puts the sound back)
    S.live = false; clearQueue(); S.awaitingYesNo = null; S.calmBreak = null; S.cut = false; S.unprompted = false; S.offNote = '';
    P.tremble = null; P.heavy = 0;   // nothing kept for later
    S.possessing = false; S.struggling = false; S.calming = false; S.busy = true; DR.running = false; S.penHint = '';
    tapCatch = null; typed.armed = false; TYPEIN.abort = true; nextPhone = Infinity;
    dropPath();
    // every layer of the possession stops (the room's layers, the smoke film, the flutter, the lean), and the room goes calm:
    // the clock ticks again. Nothing is cut off with silence: the room's own bed (the clock, the wind, the crickets) is all there is.
    A.stopLayers(); A.clock(true); if (A.phoneStop) A.phoneStop();
    plateStill(); PV.over = null;
    if (PV.board) { try { PV.board.el.pause(); } catch (e) { /* gone */ } PV.board = null; }
    Object.assign(G, {
      blackT: 0, pglowT: 0, leanTo: false, hauntLean: false, shake: 0, slow: 1, hitstop: 0, flame: 'warm', flameLevel: 1, flutter: 0, steady: true, gutter: 0, shadow: null,
    });
    Object.assign(P, { mode: 'free', slack: false, vx: 0, vy: 0, handDX: 0, handDY: 0, tx: P.x, ty: P.y });
    document.body.classList.remove('blackout'); uiDark = 0;
    if (dareEl) dareEl.hidden = true;
    S.dare = false; baseDirty = true;   // the dare leaves the margin
    { const qb = $('#q'); qb.classList.remove('full', 'ghost'); qb.readOnly = false; }
    setHaunted(PL.id, false); store.set('chosen', '');
    renderNote();
    return ++END.tok;
  }
  // The stop's own fade to black (never halted). False when another stop took over meanwhile.
  async function fadeOut(tok, ms) {
    await animate(ms, (k) => { G.intro = Math.max(G.intro, k); }, easeIO, true);
    return tok === END.tok;
  }
  // The room back to lit and calm, for an ending that is seen (distress, the soft exit): dead candles come back warm.
  function calmTable() {
    S.dread = 0;
    [0, 1].forEach((i) => { if (G.candleOutT[i] >= 1) relightCandle(i); });
  }

  // A candle out, for a stop: never waits longer than the breath itself, whatever the flame's film is doing.
  const snuff = (i, o) => Promise.race([blowCandle(i, o), sleep((o.dur || 650) + 800)]);
  // The candle: hold one for a second and the night ends at once. No scare, no line, straight to the title.
  async function endNow() {
    if (!S.started || S.stopping) return;
    const tok = stopNight(); S.stopping = 'candle'; S.ending = true; S.soft = false; renderNote();
    MEM.end('');
    showQuestion('');
    await Promise.all([snuff(0, { dir: -1, dur: 260, free: true }), snuff(1, { dir: 1, dur: 260, free: true })]);
    if (tok !== END.tok || !(await fadeOut(tok, 700))) return;
    backToTitle({ quiet: true });
  }
  // Real fear: the soft exit. The board stops where it is, the room goes calm and lit, GOOD BYE glows, and one touch on
  // it (or the pencil note, or typing goodbye) ends the night. Nothing more is spelled, nothing is aimed at anyone, and
  // nothing is left for next time.
  async function softExit() {
    if (!S.started || S.stopping) return;
    if (S.ending) { await softEnd(); return; }   // a goodbye was already ending it: end it clean instead
    if (S.soft) return;
    stopNight(); S.soft = true; S.busy = false;
    MEM.forget();
    calmTable();
    showQuestion(''); hint('Touch GOOD BYE and the night ends');
    GLYPHS.GOODBYE.glow = 1;
    renderNote();
  }
  // In the soft exit a question gets no answer: the way out again, or out.
  async function softAsk(q) {
    if (/\b(good ?-?bye|bye|stop|leave|end|done|quit|out)\b/i.test(q) || soundsAfraid(q, NAMES) || wantsToStop(q)) { await softEnd(); return; }
    showQuestion(q); hint('Touch GOOD BYE and the night ends');
    GLYPHS.GOODBYE.glow = 1;
  }
  async function softEnd() {
    if (!S.started || S.stopping) return;
    const tok = stopNight(); S.stopping = 'soft'; S.ending = true; renderNote();
    MEM.forget();
    const gb = GLYPHS.GOODBYE;
    P.dragging = false;
    await moveTo(gb.x, gb.y, { dur: 500, dwell: 200, free: true });
    if (tok !== END.tok) return;
    showQuestion(''); commit(gb); addLetter('GOOD BYE'); gb.glow = 1;
    await sleep(1200); if (tok !== END.tok) return;
    snuff(0, { dur: 900, dir: 1, free: true }); await sleep(250); await snuff(1, { dur: 900, dir: 1, free: true });
    if (tok !== END.tok || !(await fadeOut(tok, 1400))) return;
    backToTitle({ quiet: true });
  }
  // A touch on GOOD BYE, in the soft exit
  const onGoodbye = (b) => Math.abs(b.x - GLYPHS.GOODBYE.x) < 190 && Math.abs(b.y - GLYPHS.GOODBYE.y) < 70;

  // ---------------------------------------------------------------- the candle: the way out, any time
  // Press and hold either candle (the stub in its saucer, or the taper) for a second and the night ends at once, through
  // anything: the possession and the struggle too. The names card says so. A tap does nothing, so a nervous one never
  // ends a night, and the click that lets go of it never lands on the title.
  const HOLD = { id: null, x: 0, y: 0, timer: 0 };
  // where candle i is on screen, in CSS pixels: the wick, the candle under it and its saucer
  function candleSpot(i) {
    const f0 = FLAMES && FLAMES[i];
    if (f0) {
      const b = plateMap(f0), p = worldToScreen(b.x, b.y), len = f0.len * plateScale() * CAM.s, k = len * 0.9;
      return { x: p.x - Math.sin(f0.tilt) * k, y: p.y + Math.cos(f0.tilt) * k, r: Math.max(52, len * 1.4) };
    }
    const c = candleScreen(i);
    return { x: c.x * W, y: c.y * H + 20, r: 60 };
  }
  function candleUnder(px, py) {
    for (const i of [1, 0]) { const c = candleSpot(i); if (c && Math.hypot(px - c.x, py - c.y) <= c.r) return i; }
    return -1;
  }
  addEventListener('pointerdown', (e) => {
    if (!S.started || S.stopping || pewOpen || HOLD.id != null) return;
    if (e.target && e.target.closest && e.target.closest('#dock, #share, #intro, #establish, #toast')) return;
    if (candleUnder(e.clientX, e.clientY) < 0) return;
    HOLD.id = e.pointerId; HOLD.x = e.clientX; HOLD.y = e.clientY;
    HOLD.timer = setTimeout(() => {
      HOLD.id = null;
      const eat = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
      addEventListener('click', eat, { capture: true, once: true }); setTimeout(() => removeEventListener('click', eat, true), 1500);
      endNow();
    }, 1000);
  }, true);
  const letGo = (e) => { if (e.pointerId !== HOLD.id) return; clearTimeout(HOLD.timer); HOLD.id = null; };
  addEventListener('pointerup', letGo, true);
  addEventListener('pointercancel', letGo, true);
  addEventListener('pointermove', (e) => { if (e.pointerId === HOLD.id && Math.hypot(e.clientX - HOLD.x, e.clientY - HOLD.y) > 40) letGo(e); }, true);

  // ---------------------------------------------------------------- asking
  // Every line typed: the safety checks first (on the phone, never sent), then the board's own rules that are physical (saying goodbye,
  // holding GOOD BYE), then the demon. Nothing else answers: no script, no plan, no written line.
  async function ask(q, own) {   // own: typed in their own words, not the pencil note
    q = String(q || '').trim();
    // safety first, before the calm, the queue or the site read a word of it
    if (q && S.started) {
      if (soundsLikeDistress(q)) { await gentleEnd(helpFor(q)); return; }
      // what they typed and took back before sending is read the same way (the site reads it again)
      const er = TYPED.peek();
      if (er && soundsLikeDistress(er)) { await gentleEnd(helpFor(er)); return; }
      if (er && !S.soft && soundsAfraid(er, NAMES)) { TYPED.reset(); await softExit(); return; }
      if (S.soft) { await softAsk(q); return; }
      if (halt || S.stopping) return;   // the night is being stopped: nothing else is answered
      if (soundsAfraid(q, NAMES)) { await softExit(); return; }
    }
    // in the calm, any question breaks it
    if (S.calming) { if (S.calmBreak) S.calmBreak(); return; }
    if (!q || pewOpen) return;
    // the board is busy: the question waits its turn, in order (a wish to stop and the margin's question go to the front)
    const urgent = outright(q);
    if (S.busy || deadNow()) { if (!S.ending) enqueue(q, own, urgent); return; }
    typed.armed = false; lastInput = G.t; S.cut = false;
    READY.drop('they sent a line'); READ.stop();
    S.busy = true; NIGHT.usedNotes.add(q.toLowerCase()); renderNote();
    showQuestion(q);
    const stop = wantsToStop(q), family = askedForFamily(q);
    // a name somebody gave in their own words, read only now that the safety checks have passed it (never from a wish to stop or a
    // question for family). The demon reads it in what they typed; the board may spell it once a night.
    if (own && !stop && !family && !forbiddenAsk(q)) { const vn = volunteeredName(q, false); if (vn) takeName(vn, 'said'); }
    // a question about whether it can see them: both faces look straight at them
    if (/\b(see me|see us|watching|look at me|see you|see my)\b/i.test(q)) eyesOnYou(7000);
    // a wish to stop: GOOD BYE glows, and saying it (or holding it there) works; the demon is told, and answers in its own way
    if (stop) { S.askedToLeave = true; GLYPHS.GOODBYE.glow = 1; noteHouse('glow'); }
    const bye = /^\s*good\s*-?\s*bye[.!]*\s*$/i.test(q);
    if (bye && S.askedToLeave && !S.haunted && !S.cleared) { S.busy = false; await goodbyeGentle(); return; }
    if (S.haunted && bye) { await goodbyeStruggle(); return; }
    if (/^goodbye$/i.test(q) && S.cleared) { await sayGoodbye(); return; }
    if (PL.rapCard && !S.cleared && /^do as i do[.!]*$/i.test(q)) { await doAsIDo(); return; }
    // someone asking for their own family: nothing to the site, nothing kept, nothing aimed for two minutes; it goes to NO
    if (family) {
      S.griefUntil = G.t + 120000;
      seek(); await wait(rnd(900, 1400)); P.mode = 'free';
      await griefMove(); await endTurn(); return;
    }
    const said = await liveTurn(q, { stop, typed: !!own });
    if (said === null) return;   // the night ended in it (real trouble, real fear, or the demon left)
    await endTurn();
  }
  // One turn of the night: ask the demon (the planchette circles while it decides), then do exactly what it says. o: { why, quiet, stop,
  // typed }. Resolves the line it left under the board ('' for none), or null when the night ended in it.
  async function liveTurn(q, o = {}) {
    const night = nightNo;
    // the night's first move was asked for the moment the match was struck (PREFETCH: it was out at the site through the walk up the
    // drive and the candles), so it lands the moment the table is up
    const pre = !q && o.why && PREFETCH.start && PREFETCH.start.why === o.why && PREFETCH.start.night === nightNo ? PREFETCH.start : null;
    PREFETCH.start = null;
    const turn = pre ? pre.turn : newTurn(q, o);
    READY.drop('a move');   // a move made ready before this one is stale now
    ponderStart();
    const minThink = wait(pre ? 0 : rnd(350, 650));
    nlog('asked', { q: String(q || '').slice(0, 60), why: turn.why, part: !!o.part, erased: turn.erased ? turn.erased.length : 0, typing: turn.typing, did: turn.did.join(','), behind: turn.behind, pre: !!pre });
    let res;
    // a move of its own (nobody typed, or a line still in their box) gives way the moment they send a line: they never wait on it (OWN)
    const own = !q || !!o.part;
    let cancelled = false;
    const gaveWay = own ? new Promise((r) => { OWN.cancel = () => { cancelled = true; r({ none: 'cancelled' }); }; }) : null;
    try { res = await (own ? Promise.race([pre ? pre.p : liveMove(turn), gaveWay]) : liveMove(turn)); await minThink; } finally { ponderStop(); if (own) OWN.cancel = null; }
    if (night !== nightNo) throw HALTED;   // the night it was asked in is over
    if (cancelled) { nlog('gaveWay'); P.mode = 'free'; P.tx = P.x; P.ty = P.y; return ''; }
    P.mode = 'free'; P.tx = P.x; P.ty = P.y;
    if (res.distress) { await gentleEnd(res.help); return null; }
    if (res.fear) { await softExit(); return null; }
    if (res.grief) { if (!o.part) await griefMove(); return ''; }   // (never kept; a line still being typed is simply not answered)
    if (NIGHT.demon) MEM.demon(NIGHT.demon);
    NIGHT.turns.push(turn); if (NIGHT.turns.length > 90) NIGHT.turns.shift();
    if (!res.reply) { await noAnswer(res.none); return ''; }
    NIGHT.fails = 0; NIGHT.offNoted = false;
    if (S.offNote) { S.offNote = ''; renderNote(); }
    const { done, said } = await perform(res.reply, { voice: res.voice, voiceP: res.voiceP, sent: res.sent });
    turn.r = done;
    // while they read it (and type the next thing), it thinks it over: a plan in the background, never waited on
    if (!done.end) planSoon();
    if (o.part) { /* a line they had not sent: never kept as a question of theirs */ } else if (q) {
      S.history.push({ q: q.slice(0, 120), a: said }); if (S.history.length > 24) S.history.shift();
      MEM.note(q, said || '(nothing)', !!o.typed);
    } else if (said) S.history.push({ q: '(nobody asked)', a: said });
    if (done.end) { await demonLeaves(); return null; }
    return said;
  }
  // A move of its own in flight (OWN.cancel), and the night's first move asked for at the strike (PREFETCH.start).
  const OWN = { cancel: null };
  const PREFETCH = { start: null };
  // They sent a line while it was moving on its own: it gives way at once (still waiting on the site: dropped; spelling: it stops where
  // it is), and their line is answered next, so the planchette starts on it the instant they send (Pierce, 2026-10-05: "slow as shit").
  function giveWay() {
    if (!S.busy || !S.unprompted || S.possessing || S.struggling || S.ending) return;
    if (OWN.cancel) OWN.cancel(); else S.cut = true;
    nlog('giveWay', { waiting: !OWN.cancel });
  }
  // ---- it thinks while they type (Pierce, 2026-10-04): after each reply the page asks the site, in the background, for one plan (mode
  // 'plan'): the night re-read at a higher effort. What comes back is its notes on them (kept to hand back with the next move) and, now
  // and then, one move made ready ("next", signed by the site) for the next moment they go quiet or stop in the middle of a line, so that
  // move happens at once (performReady). Nothing ever waits on a plan: if their next line arrives first, the next move simply carries
  // whatever notes are newest. One in flight at most; twenty a night (the site's cap too); never in the possession or the struggle, never
  // once the night has turned to fear or trouble; a lane night told to make none makes none; a site that has them off (410) gets no more.
  function planSoon() {
    if (!PLAN.on || PLAN.inflight || NET.moveOut || !apiBase() || NIGHT.dead || !NIGHT.id) return;
    const replies = NIGHT.turns.filter((t) => t.r).length;
    if (replies < 1 || PLAN.n >= PLAN.max || replies - PLAN.lastAt < 1) return;
    if (S.possessing || S.struggling || S.soft || S.stopping || S.ending || halt) return;
    PLAN.inflight = true; PLAN.n++; PLAN.lastAt = replies;
    const night = nightNo, at = NIGHT.turns.length;
    const { body } = nightBody('plan', NIGHT.turns.slice(-90).length);
    // (where the one behind them stands and how long they have sat: the ledger reads both)
    body.behind = NIGHT.behind; body.sat = Math.round(nightSecs());
    nlog('plan', { at });
    post('goodbyeSpirit', body, SPIRIT_WAIT).then((j) => {
      PLAN.inflight = false;
      if (night !== nightNo) return;
      if (!j || j.limited) { nlog('planned', { ok: false }); return; }
      if (j.off) { PLAN.on = false; nlog('planned', { ok: false, off: true }); return; }
      keepNotes(j, at);
      let ready = false;
      if (j.next && typeof j.next === 'object' && typeof j.next_sig === 'string' && NIGHT.turns.length === at && !S.possessing && !S.struggling) {
        const r = cleanReply(j.next);
        if (r && (r.say || r.moves.length || r.sfx !== 'none' || r.possess || r.end)) { READY.set({ r: j.next, clean: r, sig: j.next_sig.slice(0, 100), at }); ready = true; }
      }
      nlog('planned', { ok: true, notes: !!j.notes, next: ready });
      // a reply came while it was out (its own plan was not asked for: one at a time): the plan for the night as it is now goes out
      if (NIGHT.turns.length !== at && !S.busy) planSoon();
    }).catch(() => { PLAN.inflight = false; });
  }
  // Performed at once, with no call: the moment of quiet it was made for has come (about twenty seconds of it, ownDue), or they stopped in
  // the middle of a line (why 'hesitate'). It goes into the night as its own move, its reply as the site signed it (pre, psig: the site
  // checks the signature when it reads the night back, and drops a reply that does not match).
  async function performReady(why) {
    if (!READY.fresh()) { READY.drop('stale'); return false; }
    const x = READY.x; READY.x = null;
    NIGHT.own++; NIGHT.lastOwn = G.t; NIGHT.ownAfter = rnd(13000, 17000);
    nlog('ready', { why });
    let ended = false;
    await hold(async () => {
      const night = nightNo;
      showQuestion('');   // its own move: the last question and its answer go, as with any move of its own (ownMove)
      const turn = newTurn('', { why, quiet: Math.round((G.t - lastInput) / 1000) });
      turn.pre = true; turn.psig = x.sig;
      NIGHT.turns.push(turn); if (NIGHT.turns.length > 90) NIGHT.turns.shift();
      const { done, said } = await perform(x.clean, { sent: NIGHT.turns.slice(-90) });
      if (night !== nightNo) return;
      turn.r = x.r;   // as the site signed it
      if (said) S.history.push({ q: '(nobody asked)', a: said });
      if (done.end) { ended = true; await demonLeaves(); }
    });
    if (!ended) { addDread(0.3); quietAfter(); planSoon(); }
    return true;
  }
  // Nothing answers (no site, its limit, the model down or silent): it circles a moment longer, stops as if it will go somewhere, and drifts
  // back toward the middle. No letters. If the site could not be reached, the pencil says so, once a night.
  async function noAnswer(why) {
    nlog('noAnswer', { why });
    dropPath(); P.mode = 'free';
    trembleOn(0.8);
    try { await wait(rnd(900, 1500)); } finally { trembleOff(); }
    const o = offFaces(REST.x + rnd(-70, 70), REST.y + rnd(-25, 25));
    await moveTo(o.x, o.y, { pace: 1.5, dwell: 700, curve: 0.35 });
    // (2026-10-05: one slow or failed call on a phone's network used to stop the demon's own moves, its plans and its reading ahead for
    // the rest of the night, and the night went silent: Pierce's "the iPhone didn't work at all". Now it backs off and tries again; the
    // pencil says so after two in a row; only the site's day budget ends it for the night.)
    if (['offline', 'limit', 'unavailable', 'timeout', 'error', 'budget'].includes(why)) {
      NIGHT.fails++;
      if (why === 'budget') NIGHT.dead = true;
      NIGHT.ownAfter = Math.max(NIGHT.ownAfter, why === 'limit' ? 60000 : 20000);
      if (NIGHT.fails >= 2 || why === 'budget' || why === 'limit') offNote();
    }
  }
  // The demon ends the night itself ("end": it is finished with them). The planchette is on GOOD BYE (it goes there if it is not), the
  // candles go out one at a time, and the title. Nothing more is spelled.
  async function demonLeaves() {
    if (S.ending) return;
    S.ending = true; S.busy = true; S.live = false; renderNote();
    nlog('demonLeft');
    MEM.end('it left on its own');
    const gb = GLYPHS.GOODBYE;
    if (Math.hypot(P.x - gb.x, P.y - gb.y) > 60) { await moveTo(gb.x, gb.y, { pace: 1.2, dwell: 900 }); commit(gb); addLetter(' · '); addLetter('GOOD BYE'); }
    gb.glow = 1;
    await wait(1800);
    await blowCandle(0, { dir: -1, dur: 900 }); await wait(1100); await blowCandle(1, { dir: 1, dur: 900 });
    G.blackT = 1; await wait(1500);
    await animate(1200, (k) => { G.intro = Math.max(G.intro, k); });
    backToTitle({});
  }

  // ---------------------------------------------------------------- after a move
  const quiet = () => G.t < DR.quietUntil;
  // after an answer: no house event starts for 12 to 20 seconds, and the engine's next one is due as soon as the quiet is over (a player who
  // asks again every half minute leaves the house a few seconds at a time: it must be ready for them)
  let lastAnswerEnd = -Infinity;
  function quietAfter(ms) {
    lastAnswerEnd = G.t;
    DR.quietUntil = Math.max(DR.quietUntil, G.t + (ms == null ? rnd(2500, 5000) : ms));
    DR.next = DR.quietUntil + rnd(0, 2000);
  }
  // it shakes where it sits (k: how far, in board px; 0 is dead still)
  function trembleOn(k) { P.tremble = { x: P.x, y: P.y, k: k ?? 1.2 }; }
  function trembleOff() { P.tremble = null; }
  // Someone typed something that sounded like real distress. The night stops, wherever it was (the possession and the
  // struggle too): no dread, no haunting, nothing remembered, no network. The board says GOODBYE gently, the candles
  // go out, and the title says where real help is.
  // help: 'home' when what they typed was someone hurting them, so the title points to where that help is
  async function gentleEnd(help) {
    if (!S.started || S.stopping === 'gentle') return;
    const tok = stopNight(); S.stopping = 'gentle'; S.ending = true; S.soft = false; renderNote();
    MEM.forget();
    calmTable();
    showQuestion('');
    const gb = GLYPHS.GOODBYE;
    P.dragging = false;
    await moveTo(gb.x, gb.y, { pace: 1.3, dwell: 1000, free: true });
    if (tok !== END.tok) return;
    commit(gb); addLetter('GOOD BYE');
    await sleep(1800); if (tok !== END.tok) return;
    snuff(0, { dur: 900, dir: -1, free: true }); await sleep(300); await snuff(1, { dur: 900, dir: 1, free: true });
    if (tok !== END.tok || !(await fadeOut(tok, 1400))) return;
    backToTitle({ help: help === 'home' ? 'home' : 'self' });
  }
  // After each move: the room gets a little worse, and nothing of the house's starts for 12 to 20 seconds.
  async function endTurn() {
    S.asked++;
    if (!S.cleared && PL.events !== false) { S.unease++; addDread(0.8); }
    DR.next = Math.max(DR.next, G.t + rnd(1500, 3500));
    P.mode = 'free'; P.tx = P.x; P.ty = P.y;
    nlog('answerEnd'); quietAfter();
    S.busy = false; renderNote();
  }

  // yes or no, alone on the line, the way a person types it (y, ya, yeah, yep, yup, sure; n, nope, nah)
  const YES_TYPED = /^(?:y|ya|yaa*|yes+|yess+|yeah+|yea|yep|yup|yuh|sure|ye|yas)$/;
  const NO_TYPED = /^(?:n|no+|nope+|nah+|nay|nahh+)$/;
  function typedYesNo(v) {
    const t = String(v).toLowerCase().replace(/['\u2018\u2019`]/g, '').replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
    return YES_TYPED.test(t) ? 'YES' : NO_TYPED.test(t) ? 'NO' : '';
  }
  // the planchette goes to the word they typed, and the board's question has its answer
  async function answerByTyping(k) {
    const resolve = S.awaitingYesNo; if (!resolve) return;
    const g = GLYPHS[k];
    dropPath(); P.mode = 'free';
    nlog('typedYesNo', { which: k });
    try { await moveTo(g.x, g.y, { dur: 800, dwell: 150, curve: 0.1 }); } catch (e) { /* the night was stopped */ }
    if (S.awaitingYesNo === resolve) resolve(k);
  }

  // ---------------------------------------------------------------- the Cottage: do as I do
  // You tap the slate, 1 to 5 times. After a held silence the wall raps back the same number.
  // The third time, the wall raps once more than you did, and the latch lifts.
  let tapCatch = null, rapPlays = 0;
  function collectTaps() {
    const g = haltGen;
    return new Promise((res, rej) => {
      let n = 0, first = 0, timer = 0;
      const finish = () => { clearTimeout(timer); tapCatch = null; if (halt || g !== haltGen) rej(HALTED); else res(n); };
      const arm = (ms) => { clearTimeout(timer); timer = setTimeout(finish, ms); };
      tapCatch = (bx, by) => {
        if (!n) { ta.textContent = ''; ta.classList.remove('hint'); first = performance.now(); }
        n++;
        A.tap(); rumble(40, 0.1, 0.3);
        emit('ash', clamp(bx, -560, 560), clamp(by, -360, 360), 6, { min: 10, max: 50, lmin: 0.5, lmax: 1.1, smin: 6, smax: 12 });
        addLetter('·', 'tap');
        if (n >= 5) { arm(450); return; }
        arm(clamp(2600 - (performance.now() - first), 350, 1300));   // a couple of seconds, all told
      };
      arm(9000);   // nobody taps: it answers anyway
    });
  }
  async function doAsIDo() {
    rapPlays++;
    showQuestion(PL.rapCard);
    P.mode = 'free'; P.tx = P.x; P.ty = P.y;
    hint('Tap the table');
    const n = await collectTaps();
    if (!n) { ta.textContent = ''; ta.classList.remove('hint'); }
    const extra = rapPlays >= 3 || S.friendAsked || !n;
    // the held silence
    await wait(1100);
    const side = pick([-2.6, 2.6]);
    addLetter(' ');
    for (let i = 0; i < n; i++) {
      await rap(side, false);
      await wait(rnd(480, 600));
    }
    if (extra) {
      await wait(n ? 900 : 200);
      await rap(side * 0.6, true);       // one nobody tapped
      await wait(700);
      A.creak(); G.gutter = 1;          // and the latch lifts
      S.unease++;
    }
    await wait(600);
    await endTurn(false);
  }
  async function rap(x, hard) {
    A.knock(1, x); G.gutter = Math.max(G.gutter, hard ? 1 : 0.55); buzz(hard ? 90 : 40);
    rumble(hard ? 200 : 110, hard ? 0.7 : 0.4, 0.15);
    if (!P.path && !P.dragging) { P.vx += rnd(-90, 90); P.vy += rnd(-60, 60); P.x += rnd(-4, 4); P.y += rnd(-3, 3); }
  }

  // The board asked something, and the answer is theirs, with their own hand: the planchette held over YES or NO for a moment (or a touch
  // on one). Nobody answers within `ms` (when given): null, and the board lets it go. Used by the board's friend question and by ARE YOU ALONE.
  function awaitYesNo(ms) {
    return new Promise((resolve) => {
      let dwellOn = null, since = 0, timer = 0;
      const tick = setInterval(() => {
        if (halt) { done(null); return; }   // the night was stopped: nobody answers
        for (const k of ['YES', 'NO']) {
          const g = GLYPHS[k];
          if (Math.hypot(P.x - g.x, P.y - g.y) < 70) {
            if (dwellOn !== k) { dwellOn = k; since = G.t; }
            else if (G.t - since > 900) { done(k); return; }
            return;
          }
        }
        dwellOn = null;
      }, 60);
      const done = (k) => { clearInterval(tick); clearTimeout(timer); S.awaitingYesNo = null; resolve(k); };
      S.awaitingYesNo = (k) => done(k);
      if (ms) timer = setTimeout(() => done(null), ms);
      renderNote();
    });
  }
  // How long the board waits for an answer to its own question (ARE YOU ALONE lets it go; the friend question answers for them)
  const YESNO_WAIT = { alone: 45000, friend: 60000 };
  // ---------------------------------------------------------------- the intercept
  // The possession is the demon's to call now ("possess" in a move; perform runs it). intercept stays for the debug page's own use.
  // (The Garden's second branch, where He comes, is gone from this file with the places that had it; git keeps it.)
  async function intercept(via) { return possess(via); }

  // ---------------------------------------------------------------- the possession (DIRECTION.md section 4)
  // About thirty seconds, all of it at the table. Smoke rises off both wicks, two thin threads on film, and the draft that bends the flames
  // toward the planchette carries them across the board (drawPlumes). Then the board goes insane (Pierce's own thrash, restored from 5efb4f7):
  // the wood flies letter to letter and edge to edge, shaking as it goes, the table shaking with it, a figure eight across the alphabet and
  // then anywhere at all, and down the numbers from 9 to 0, every one it lands on scorched into the board, glowing, shedding embers, crackling.
  // The room fills up with its own sounds, one layer after another, while the wall clock ticks on: the floor under the table takes weight
  // (3 s), the cellar latch lifts and drops (7 s), something breathes under the table (10 s), the frame of the house groans (14 s). At about
  // 6 s it slams onto NO and holds there, shaking, the letters round it charring: that is her. At 10 s it is pulled off NO, slowly, the way
  // you would drag something heavy, onto YES, and YES burns. Then it slides off the letters, down the board to the bottom edge, toward
  // whoever is holding the phone, and stops (15 s), and the clock stops with it. The threads of smoke stand up again and thin away, the
  // layers fade out over six seconds (nothing is cut), and the flames stand up straight and still. The scorched letters stay scorched all
  // night. Candles are never touched: holding one ends the night at any moment, and every await below ends in HALTED when it does.
  const POSS = { t0: 0, at: [], gen: 0, hops: 0, travel: 0 };
  // The thrash. until: the time (ms after T0) it is done by: a slow phone leaves hops out, it never runs long. Every hop is real travel, so
  // the scrape is heard on every one; the shake in it (G.thrash, in updatePlanchette) goes nowhere and is not.
  async function thrash(T0, until, long) {
    const left = () => T0 + until - G.t;
    const letters = Object.keys(GLYPHS).filter((k) => k.length === 1 && /[A-Z]/.test(k));
    // the rim it hits, in an order that crosses the board: the top or the bottom, a side, then the other two
    const RIM = { top: () => ({ x: rnd(-520, 520), y: -330 }), bottom: () => ({ x: rnd(-470, 470), y: 336 }), left: () => ({ x: -520, y: rnd(-310, 320) }), right: () => ({ x: 520, y: rnd(-310, 320) }) };
    const v0 = pick(['top', 'bottom']), h0 = pick(['left', 'right']), rims = [v0, h0, v0 === 'top' ? 'bottom' : 'top', h0 === 'left' ? 'right' : 'left'];
    let rimN = 0;
    const edgeAt = () => RIM[rims[rimN++ % 4]]();
    const hop = async (x, y, o) => { const x0 = P.x, y0 = P.y; await moveTo(x, y, o); POSS.hops++; POSS.travel += Math.hypot(x - x0, y - y0); };
    G.thrash = true;
    try {
      // a figure eight, the whole width of the alphabet
      for (let i = 0; i < 8 && left() > (long ? 2600 : 1500); i++) {
        const a = ((i + 1) / 8) * Math.PI * 2;
        await hop(Math.sin(a) * 330, Math.sin(a * 2) * 120 + 40, { dur: 150, dwell: 0, curve: 0 });
        if (i % 2) G.shake = Math.max(G.shake, 2);
      }
      // anywhere: a letter, the edge of the board, a letter (it hits the rim and comes off it)
      let edge = Math.random() < 0.5;
      while (left() > (long ? 2600 : 1150)) {   // (what the numbers need, with room for a slow phone's frames)
        if (edge) {
          const e = edgeAt();
          await hop(e.x, e.y, { dur: rnd(150, 230), dwell: rnd(0, 40), curve: rnd(0, 0.15) });
          A.tock(true); G.shake = Math.max(G.shake, 3); rumble(120, 0.7, 0.4);
        } else {
          const g = GLYPHS[pick(letters)];
          await hop(g.x, g.y, { dur: rnd(130, 200), dwell: rnd(20, 70), curve: rnd(0, 0.12) });
          commit(g, true, true); scorch(g, true);
        }
        edge = !edge || Math.random() < 0.3;
      }
      // down the numbers, every one burned: something trying to get out
      for (const d of long ? '9876543210' : '97530') {
        if (left() < 100) break;
        const g = GLYPHS[d];
        await hop(g.x, g.y, { dur: 110, dwell: 70, curve: 0.05 });
        commit(g, true); scorch(g); G.shake = Math.max(G.shake, 3);
      }
    } finally { G.thrash = false; }
  }
  async function possess(via) {
    S.busy = true; S.possessing = true; renderNote(); endDead(true); READY.drop('the taking'); READ.stop();
    NIGHT.tl.forEach((e) => { e.done = true; });   // whatever the opening still had planned is over
    nlog('possession', { via });
    noteHouse('possession');
    heatBump(1);   // the night is as far as it goes
    // a candle that went out (the opening's, at 2:10) is lit again (on film: it catches)
    [0, 1].forEach((i) => { if (G.candleOutT[i] >= 1) relightCandle(i); });
    G.blackT = 0;
    if (dareEl) dareEl.hidden = true;
    const again = S.haunted, long = !again;
    // the demon's own call: the line they typed stays up over it (the possession is its answer)
    if (via !== 'question' && via !== 'model') showQuestion(via === 'friend' ? tq.textContent : '');
    ta.textContent = ''; ta.classList.remove('hint'); ta.classList.remove('fading');
    dropPath(); P.mode = 'possessed'; P.dragging = false; P.slack = false;
    const gen = haltGen, T0 = G.t;
    POSS.t0 = T0; POSS.gen = gen; POSS.hops = 0; POSS.travel = 0;
    const at = (ms) => wait(Math.max(0, T0 + ms - G.t));
    const live = () => !halt && gen === haltGen && S.possessing;
    const later = (ms, fn) => setTimeout(() => { if (live()) { try { fn(); } catch (e) { /* a layer never takes the table down */ } } }, Math.max(0, T0 + ms - G.t));

    // 0 s: smoke rises off both wicks; the flames bend toward the planchette and flutter; the clock goes on
    A.flutter(1);
    G.leanTo = true; animate(1200, (k) => { G.flutter = k; }, easeOut).catch(() => {});
    plumeStart();
    // the engine's lean, held (it follows the planchette), on the still with the photographed fire
    plateStill('lit');
    // the room fills up, a layer at a time (each one starts on its own beat, whatever else is going on)
    later(long ? 3000 : 2000, () => A.floorLoad());
    if (long) { later(7000, () => A.latch()); later(10000, () => A.breath('under')); later(14000, () => A.house()); }
    else { later(4500, () => A.latch()); later(7000, () => A.house()); }
    later(long ? 15000 : 8200, () => A.clock(false));   // the clock stops, and nobody notices when

    const no = GLYPHS.NO, yes = GLYPHS.YES;
    // 0.5 s to 5.3 s: the thrash
    await at(500);
    await thrash(T0, long ? 5300 : 3000, long);
    if (long) {
      // about 6 s: onto NO, hard, and held there, shaking: that is her, saying no and holding on. The letters nearest NO char.
      await moveTo(no.x, no.y, { dur: clamp(6000 - (G.t - T0), 220, 440), dwell: 0, curve: 0.08 });   // (on NO by 6 s, however the thrash ran)
      commit(no, true); addLetter('NO'); G.shake = Math.max(G.shake, 3);
      const near = Object.keys(GLYPHS).filter((k) => k.length === 1 && /[A-Z]/.test(k))
        .sort((p1, p2) => Math.hypot(GLYPHS[p1].x - no.x, GLYPHS[p1].y - no.y) - Math.hypot(GLYPHS[p2].x - no.x, GLYPHS[p2].y - no.y)).slice(0, 4);
      P.mode = 'held';
      let crackled = false;
      await animate(Math.max(400, 9900 - (G.t - T0)), (k) => {
        const j = 2 + 6 * k;
        P.x = no.x + rnd(-j, j); P.y = no.y + rnd(-j * 0.7, j * 0.7);
        G.shake = Math.max(G.shake, 1 + 3 * k);
        near.forEach((key) => { const g = GLYPHS[key]; g.scorch = Math.max(g.scorch, 0.75 * k); g.heat = Math.max(g.heat, k); });
        if (Math.random() < 0.15) { baseDirty = true; emit('ember', no.x + rnd(-70, 70), no.y + rnd(-30, 30), 2, { min: 10, max: 60 }); }
        if (!crackled && k > 0.35) { crackled = true; A.crackle(1.6); }
        if (Math.random() < 0.05) rumble(60, 0.3, 0.2);
      }, (t) => t);
      baseDirty = true;
      // 9.9 s: pulled off NO, slowly, the way you would drag something heavy, onto YES. Not slammed.
      P.mode = 'possessed';
      const x0 = P.x, y0 = P.y, heavy = (t) => clamp(easeIO(t) + Math.sin(t * 19) * 0.02 * Math.sin(Math.PI * t), 0, 1);
      // the drag is heard while, and only while, the wood is moving: P.heavy gives the slow drag its weight in the scrape
      P.heavy = 1;
      // (it lands on YES by 12.4 s whatever a slow phone's frames did to the hold: the room's layers are timed to it)
      try { await animate(clamp(12400 - (G.t - T0), 1500, 2500), (k) => { P.x = lerp(x0, yes.x, k) + rnd(-1.2, 1.2); P.y = lerp(y0, yes.y, k) + rnd(-1.2, 1.2) + Math.sin(k * Math.PI) * 6; }, heavy); } finally { P.heavy = 0; }
      commit(yes, true); scorch(yes); addLetter(' · '); addLetter('YES');
      await animate(Math.max(300, 15000 - (G.t - T0)), (k) => { P.x = yes.x + rnd(-1.5, 1.5); P.y = yes.y + rnd(-1.5, 1.5); }, (t) => t);
    }
    // 15 s: it slides off the letters, down the board to the bottom edge, toward whoever is holding the phone, and stops
    P.ymax = 372;
    // (to the right of GOOD BYE, not onto it: a hand that comes back to the planchette must not start the goodbye by touching it; and on
    // the board's lower margin, not hanging off it: upright, the line under the board is the transcript, and it is not covered)
    await moveTo(205, 342, { dur: 1900, dwell: 0, curve: 0.02 });
    P.tx = P.x; P.ty = P.y;
    // 17 s to 25 s: (the threads of smoke stand up again and thin); the flames stand up straight and stop moving; the layers fade out over six seconds
    await at(long ? 17000 : 9800);
    G.leanTo = false;
    animate(3500, (k) => { G.flutter = 1 - k; }).catch(() => {});
    A.fadeLayers(6);
    await at(long ? 21500 : 13500);
    G.steady = 'paint';
    await at(long ? 25000 : 16000);
    checkHalt();
    await possessionTail();
  }
  // The end of it: the house is let in. The planchette is free again, wherever it stopped.
  async function possessionTail() {
    enterHaunted();
    lastInput = G.t;   // nobody is asked if they are still there right after this
    P.mode = 'free'; P.tx = P.x; P.ty = P.y;
    S.possessing = false;
    S.busy = false; renderNote();
    DR.next = G.t + rnd(4000, 6500);
    nlog('possessionEnd'); quietAfter();   // it has landed: nothing of the house's starts for 12 to 20 seconds
  }
  // They let go of GOOD BYE before it was done. The house remembers: the letter it left them on (the first letter of the last thing
  // it spelled, or NO's N), kept on this phone, so the next visit's board has already moved before the match is struck (keptPlace),
  // and the night's memory says how they lost, so the demon can use it.
  function keepLoss() {
    const last = NIGHT.spelledLines[NIGHT.spelledLines.length - 1] || 'NO';
    const letter = last.replace(/[^A-Z]/g, '')[0] || 'N';
    store.set('kept', { at: Date.now(), letter });
    MEM.lost(letter);
    nlog('kept', { letter });
  }
  // Before the next night: the planchette sits off the middle, on that letter. Nothing says so.
  function keptPlace() {
    const k = store.get('kept', null), g = k && typeof k.letter === 'string' && /^[A-Z]$/.test(k.letter) ? GLYPHS[k.letter] : null;
    if (!g) return false;
    Object.assign(P, { x: g.x, y: g.y, tx: g.x, ty: g.y, vx: 0, vy: 0, snap: true });
    return true;
  }
  // kept for the debug haunt(): straight to the end of a possession
  const possessionEnd = () => possessionTail();
  // The haunted phase: the flames stand still as paint (the still with the photographed fire, no flicker, no lean), a thin line of
  // smoke (filmed, if there is a film of it) climbs off the right wick for the rest of the night, and the wall clock stays stopped. Wind and crickets and no clock.
  // The look has not changed: the same warm flames, the same room.
  function enterHaunted() {
    G.flame = 'warm'; G.flameLevel = 1; G.flutter = 0; G.leanTo = false; G.steady = 'paint'; G.gutter = 0; G.hauntLean = true;
    plateStill('lit');
    A.clock(false);
    if (PL.clips && PL.clips.smoke && PL.clips.smoke.smokeLine) playOver('smokeLine', 'table', null, true);   // the thread, filmed (nothing if there is no such film)
    S.haunted = true; setHaunted(PL.id, true); S.friendAsked = true; if (dareEl) dareEl.hidden = true;
    MEM.end('they asked if there was a demon and let it in');
    S.dread = Math.max(S.dread, 8);
  }

  // ---------------------------------------------------------------- saying goodbye
  // Hold the planchette on GOOD BYE for four seconds, all told, while it drags against you. The second try always wins:
  // it barely pulls, a second and a half is enough, and if nobody holds it, it goes to GOOD BYE anyway. No grip, no silence, nothing in
  // red: when it wins, the candles go out one at a time, and in the dark, close and low, a voice says the name somebody gave, once.
  async function goodbyeStruggle() {
    if (S.struggling || halt) return;
    S.busy = true; S.struggling = true; renderNote(); endDead(true);
    S.goodbyeTries = (S.goodbyeTries || 0) + 1;
    const second = S.goodbyeTries >= 2, need = second ? 1.5 : 4;
    showQuestion('Goodbye.'); penHint('hold', 'hold it on good bye');
    dropPath(); P.slack = false; P.mode = 'struggle'; P.tx = P.x; P.ty = P.y; P.vx = P.vy = 0;
    if (ptr && ptr.abs) fingerAt({ clientX: ptr.x, clientY: ptr.y });   // a finger already down: the struggle's own lift
    const gb = GLYPHS.GOODBYE;
    let held = 0, last = G.t, pull = null, nextPull = G.t + 900, nextRoom = G.t + 700, roomN = 0;
    const t0 = G.t;
    const won = await new Promise((res) => {
      const iv = setInterval(() => {
        const now = G.t, dt = Math.min(0.1, (now - last) / 1000); last = now;
        const on = Math.abs(P.x - gb.x) < 180 && Math.abs(P.y - gb.y) < 62;
        if (halt) { clearInterval(iv); res(false); return; }
        held = on ? held + dt : Math.max(0, held - dt * 0.7);
        const k = clamp(held / need, 0, 1), el = now - t0;
        // a finger holds it where it is: a spring toward the fingertip, against the pull
        if (ptr && ptr.abs && ptr.bx != null && !P.slack) { const f = Math.min(1, dt * 10); P.tx += (ptr.bx - P.tx) * f; P.ty += (ptr.by - P.ty) * f; }
        gb.glow = Math.max(gb.glow, 0.2 + 0.8 * k);
        if (held >= need || (second && el > 12000 && S.started)) { clearInterval(iv); res(true); return; }
        if (el > 75000 || !S.started) { clearInterval(iv); res(false); return; }
        // it pulls hard, in bursts: toward NO, or off the edge of the board. Less, the longer you fight.
        const ease = clamp(1 - (el - 30000) / 40000, 0.4, 1);
        if (now > nextPull) {
          const tgt = Math.random() < 0.55 ? { x: GLYPHS.NO.x, y: GLYPHS.NO.y } : pick([{ x: -720, y: rnd(-300, 300) }, { x: 720, y: rnd(-300, 300) }, { x: rnd(-400, 400), y: -520 }]);
          const dur = rnd(380, 950);
          pull = { x: tgt.x, y: tgt.y, s: rnd(320, 620) * ease * (0.85 + 0.35 * k) * (second ? 0.2 : 1), until: now + dur };
          nextPull = now + dur + rnd(120, 520);
          buzz(Math.round(Math.min(dur, 400) * (pull.s > 450 ? 1 : 0.5)));
        }
        if (pull && now < pull.until) {
          const dx = pull.x - P.tx, dy = pull.y - P.ty, d = Math.hypot(dx, dy) || 1;
          P.tx = clamp(P.tx + (dx / d) * pull.s * dt + rnd(-5, 5), -520, 520);
          P.ty = clamp(P.ty + (dy / d) * pull.s * dt + rnd(-5, 5), -330, 340);
          if (Math.random() < 0.05) rumble(80, 0.5, 0.3);
        }
        // the room, not a voice: one long breath under the table, and now and then the floor taking weight
        if (now > nextRoom) { if (roomN++ % 3 === 0) A.breath('under'); else A.floorLoad(3); nextRoom = now + rnd(8000, 13000); }
      }, 30);
    });
    P.mode = 'free'; P.dragging = false; S.struggling = false; S.penHint = '';
    checkHalt();
    if (!S.started) return;
    if (!won) {
      // you let go. It keeps you: it slams to NO, and then the demon has its say (a live move; it may say nothing)
      await moveTo(GLYPHS.NO.x, GLYPHS.NO.y, { dur: 220, dwell: 700 });
      commit(GLYPHS.NO, true); showQuestion(''); addLetter('NO');
      MEM.end('they tried to say goodbye and let go');
      P.tx = P.x; P.ty = P.y; S.busy = false; renderNote();
      await ownMove('lost');
      // losing follows them: the house keeps it (the next visit, the planchette is already sitting on a letter it chose)
      keepLoss();
      DR.next = G.t + rnd(4000, 7000);
      return;
    }
    // you made it. The night is done.
    S.ending = true;
    finishNight();
    await moveTo(gb.x, gb.y, { dur: 260, dwell: 120 });
    G.flame = 'warm'; G.flameLevel = 1; G.gutter = 0; G.blackT = 0; G.pglowT = 0;
    FL.forEach((F) => { F.gust = 0; F.hT = 1; });
    [0, 1].forEach((i) => { if (G.candleOutT[i] >= 1) { G.candleOutT[i] = 0; FL[i].h = 1; } });
    plateStill();
    showQuestion(''); commit(gb); addLetter('GOOD BYE'); gb.glow = 1;
    await wait(6000);
    // then it slides off GOOD BYE by itself and has the last word: the demon's own, live (or nothing, if it chooses, or if nothing answers)
    P.slack = true;
    MEM.end('they said goodbye and held it');
    const lastWord = await liveTurn('', { why: 'won' });
    if (lastWord === null) return;   // the night ended inside it (real trouble typed earlier, read by the site)
    if (lastWord) MEM.end('they said goodbye, but it said ' + lastWord);
    await wait(1400);
    // the candles go out, one at a time
    await blowCandle(0, { dir: -1, dur: 900 });
    await wait(1500);
    await blowCandle(1, { dir: 1, dur: 900 });
    G.blackT = 1;
    // in the dark: only the room (no voice)
    await wait(2400);
    G.intro = 1;
    await wait(500);
    backToTitle({ opened: justOpened });
    justOpened = null;
  }
  // Before the house is haunted, holding the planchette on GOOD BYE for a second ends the night gently: you obeyed the
  // pencil in the margin. GOOD BYE glows, the candles go out, the title.
  async function goodbyeGentle() {
    if (S.ending || S.busy) return;
    S.busy = true; S.ending = true; S.live = false; renderNote(); endDead(true);
    finishNight();
    MEM.end('they said goodbye properly');
    const gb = GLYPHS.GOODBYE;
    P.dragging = false; dropPath(); P.mode = 'free';
    await moveTo(gb.x, gb.y, { dur: 300, dwell: 200 });
    showQuestion(''); commit(gb); addLetter('GOOD BYE'); gb.glow = 1;
    await wait(1600);
    if (!(await playPlate('gust'))) {
      plateStill(); A.gust(1);
      blowCandle(0, { dur: 900, dir: 1 }); await wait(250); await blowCandle(1, { dur: 900, dir: 1 });
    }
    await animate(1400, (k) => { G.intro = Math.max(G.intro, k); });
    backToTitle({ opened: justOpened });
    justOpened = null;
  }
  // A night is done when you hold it on GOOD BYE and get out. The next place in order opens, and the next match
  // lights there (the list still has every open place).
  function finishNight() {
    const i = placeIndex(PL.id), first = !PROG.done.has(PL.id);
    PROG.done.add(PL.id);
    const next = PLACES[i + 1];
    justOpened = first && next && isShown(next) && isUnlocked(i + 1) ? next : null;
    saveProg();
  }

  // ---------------------------------------------------------------- goodbye, places, toast
  async function sayGoodbye() {
    showQuestion('Goodbye.');
    await spell('GOODBYE', { pace: 1.4 });
    await wait(600);
    S.busy = false; renderNote();
  }

  // The light side stays invisible until the first demon gets blocked.
  const SANCTUARY_ROWS = [
    { id: 'pew', name: 'The Pew', when: 'Jesus, in every pew' },
    { id: 'nativity', name: 'The Nativity', when: 'Bethlehem' },
    { id: 'askgod', name: 'Ask God', when: 'Questions for God' },
  ];
  function placeRow(ul, p, state, cls, onOpen) {
    const li = document.createElement('li');
    li.className = cls;
    let box = li;
    if (onOpen) {
      box = document.createElement('button'); box.type = 'button';
      box.addEventListener('click', onOpen);
      li.classList.add('has-btn'); li.appendChild(box);
    }
    box.innerHTML = '<b></b><span></span><em></em>';
    box.querySelector('b').textContent = p.name;
    box.querySelector('span').textContent = p.when;
    box.querySelector('em').textContent = state;
    ul.appendChild(li);
  }
  // The places, in order, with their exteriors. Open ones are doors; locked ones stay dim.
  function renderPlaces() {
    if (!PLACES_MENU) return;   // one house: nothing to list
    const ul = $('#placeList'); ul.innerHTML = '';
    PLACES.forEach((p, i) => {
      if (!isShown(p)) return;
      const open = isUnlocked(i), here = p.id === PL.id, cleared = JESUS && PROG.cleared.has(p.id);
      const state = here ? 'Here now' : !open ? 'Locked' : cleared ? 'Cleared' : 'Open';
      const li = document.createElement('li');
      li.className = 'place ' + (here ? 'here open' : open ? 'open' : 'locked');
      let box = li;
      if (open && !here) {
        box = document.createElement('button'); box.type = 'button';
        box.setAttribute('aria-label', `Go to ${p.name}`);
        box.addEventListener('click', () => travel(p.id));
        li.classList.add('has-btn'); li.appendChild(box);
      }
      box.innerHTML = '<i class="th"></i><b></b><span></span><em></em>';
      // With Him, a locked place shows no picture before the first block: nothing may hint at what comes later,
      // and the Garden's stays hidden until the Garden itself opens. Without Him every dark place shows its own, dimmed.
      if (PLACES_MENU && p.art && p.art.thumb && (open || !JESUS || (firstBlock() && p.id !== 'garden'))) {
        const im = document.createElement('img'); im.alt = ''; im.loading = 'lazy'; im.src = p.art.thumb;
        im.onerror = () => im.remove();
        box.querySelector('.th').appendChild(im);
      }
      box.querySelector('b').textContent = p.name;
      box.querySelector('span').textContent = p.when;
      box.querySelector('em').textContent = state;
      ul.appendChild(li);
    });
    // on the title: the place the next match lights, once more than one is open
    const ib = $('#placesIntro');
    if (ib) {
      const many = PLACES_MENU && PLACES.filter((p, i) => isShown(p) && isUnlocked(i)).length > 1;
      ib.hidden = !many; ib.textContent = PL.name;
    }
    const holy = $('#holyList'), head = $('#holyHead');
    holy.innerHTML = '';
    holy.hidden = head.hidden = !(SANCTUARY && firstBlock());
    if (!SANCTUARY || !firstBlock()) return;
    const pew = (window.GoodbyePew && window.GoodbyePew.progress()) || store.get('pew', {}) || {};
    placeRow(holy, SANCTUARY_ROWS[0], 'Open', 'open holy', openPew);
    placeRow(holy, SANCTUARY_ROWS[1], pew.symphony ? 'Unlocked · being built' : 'Opens after the symphony', pew.symphony ? 'open holy' : 'locked holy');
    placeRow(holy, SANCTUARY_ROWS[2], 'Locked', 'locked holy');
  }
  // The Pew is reachable only after the first block, and never mid-intercept (the HUD is dimmed then).
  function openPew() {
    if (!SANCTUARY || !firstBlock() || !window.GoodbyePew || $('#hud').classList.contains('dim')) return;
    $('#toast').hidden = true;
    window.GoodbyePew.open();
  }
  const UNDER_PEW = ['c', 'transcript', 'dock', 'cine', 'vs', 'banner', 'toast', 'places', 'intro'];
  addEventListener('goodbye:room', (e) => {
    pewOpen = e.detail === 'pew';
    UNDER_PEW.forEach((id) => { const el = document.getElementById(id); if (el) el.inert = pewOpen; });
    document.body.classList.toggle('in-pew', pewOpen);
    A.setMuted(S.muted || pewOpen);
    dispatchEvent(new CustomEvent('goodbye:sound', { detail: { muted: S.muted } }));
  });
  let toastT = 0;
  // then: runs once when this toast goes away on its own (used to queue the next one).
  function toast(text, onOpen, then) {
    const t = $('#toast'); t.textContent = text; t.hidden = false;
    t.onclick = onOpen || null;
    t.onkeydown = onOpen ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } } : null;
    if (onOpen) { t.setAttribute('role', 'button'); t.tabIndex = 0; } else { t.removeAttribute('role'); t.removeAttribute('tabindex'); }
    t.classList.remove('in'); void t.offsetWidth; t.classList.add('in');
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; if (then) then(); }, onOpen ? 8000 : 4200);
  }

  // ---------------------------------------------------------------- clock
  // Each place's clock starts at its own hour when you arrive. The Garden has no clock: it is dawn.
  const clockEl = $('#clock');   // no clock is shown any more (the page has none); every move tells the demon the time on it
  let startMin = 73, clockT0 = 0; // 1:13 AM
  function parseClock(s) {
    const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(s || '').trim());
    if (!m) return null;
    return ((+m[1] % 12) + (/pm/i.test(m[3]) ? 12 : 0)) * 60 + +m[2];
  }
  // The clock is the real one: whatever time it is where you are sitting.
  function tickClock() {
    if (startMin == null) { if (clockEl) clockEl.textContent = PL.clockLabel || ''; return; }
    const t = clockText();
    if (clockEl && clockEl.textContent !== t) clockEl.textContent = t;
  }
  setInterval(tickClock, 1000);

  // ---------------------------------------------------------------- the place
  // Puts the scene in a place: its table, board, light, film, sound, spirit, demon and words.
  function loadPlaceFont(p) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const wt = p.board.weight || '400';
    const t = new Promise((r) => setTimeout(r, 4000)); // never hang the table on a slow font
    return Promise.race([t, document.fonts.load(`${wt} 78px "${p.board.font}"`).catch(() => {})]);
  }
  // Strike waits for the shared art (boot) and for the place it would light (placeReady).
  let bootReady = false, placeReady = false;
  function syncStrike() {
    const st = $('#strike'); if (!st || S.started) return;
    const ok = bootReady && placeReady;
    st.disabled = !ok;
    st.textContent = ok ? startLabel() : PL.daylight ? 'Getting ready…' : 'Lighting the candles…';
  }
  // Resolves true when this place is the one on the table; false when a newer enterPlace took over meanwhile.
  async function enterPlace(p) {
    const tok = ++placeTok;
    placeReady = false; syncStrike();
    PL = p;
    S.cleared = isCleared(p.id);
    applyScene('land');
    INK = p.board.ink;
    document.body.dataset.place = p.id; document.body.classList.toggle('daylight', !!p.daylight);
    boardTex = null; plateTex = null;
    G.faceShow = p.faces && p.faces.show === 'always' ? 1 : 0;
    await Promise.all([loadPlaceArt(p, tok), loadPlaceFont(p)]);
    if (tok !== placeTok) return false;
    applyScene(wantScene()); layout();
    baseDirty = true;
    // what the screen says
    const pb = $('#placeBtn');
    if (pb && pb.firstChild && pb.firstChild.nodeType === 3) pb.firstChild.nodeValue = p.name;
    cv.setAttribute('aria-label', `A talking board on ${p.table}. Drag to move ${pointerName()}.`);
    startMin = parseClock(p.clockStart); clockT0 = G.t; tickClock();
    if (A.place) A.place(p.ambience || {});
    // the place's clips: the first two (the lighting and the idle loop) load before the match is struck, nothing else
    clipReset(); clipsAhead(['light', 'idle']);
    estFilmLoad();   // the walk up the drive, if its film exists (otherwise the still)
    placeReady = true; syncStrike();
    return true;
  }

  // ---------------------------------------------------------------- travel
  // Fade to black, clear the table, load the next place, then its exterior, the match, the board.
  let traveling = false;
  // The first opening runs outside travel, so travel waits for it the way it waits for an answer.
  let opening = false;
  function resetScene() {
    S.asked = 0; S.unease = 0; S.friendAsked = false; S.awaitingYesNo = null; S.dare = false; clearQueue(); S.cut = false; S.unprompted = false;
    newNight(); noteKey = ''; if (dareEl) dareEl.hidden = true; S.sitAt = 0; S.firstAnswerAt = 0; NIGHT.tl = [];
    plateStill(); G.hands = [];
    typed.armed = false; typed.used = 0; tapCatch = null; rapPlays = 0; P.slack = false;
    if (A.phoneStop) A.phoneStop();
    A.stopLayers(); A.clock(true);   // the next night starts with the wall clock ticking
    PV.over = null; plumeStop(); heatReset(); warmed = false;
    for (const k in GLYPHS) { const g = GLYPHS[k]; g.glow = 0; g.scorch = 0; g.heat = 0; }
    Object.assign(G, {
      hands: [], flame: 'warm', flameLevel: 1, flutter: 0, gutter: 0,
      shadow: null, ghost: null, slow: 1, hitstop: 0, shake: 0,
      candleOut: [1, 1], candleOutT: [1, 1],
    });
    PARTS.length = 0;
    Object.assign(P, { path: null, mode: 'free', x: REST.x, y: REST.y, tx: REST.x, ty: REST.y, vx: 0, vy: 0, handDX: 0, handDY: 0, ymax: 340, tremble: null, snap: true });
    keptPlace();   // a night they lost: the board has already moved
    // the dread engine, back to nothing
    Object.assign(S, { dread: 0, haunted: false, possessing: false, struggling: false, calming: false, ending: false, chosen: '', live: false, calmBreak: null, history: [] });
    Object.assign(S, { soft: false, stopping: '', griefUntil: 0, goodbyeTries: 0, askedToLeave: false, offNote: '' });
    Object.assign(G, { black: 0, blackT: 0, pglow: 0, pglowT: 0, leanTo: false, steady: false, hauntLean: false });
    FL.forEach((F) => Object.assign(F, { h: 1, hT: 1, gust: 0, lean: 0 }));
    Object.assign(DR, { next: Infinity, lastBig: false, forceBig: false, cd: {}, calmDone: false, leaves: 0, gb: 0, blackoutOn: false, lastStill: -Infinity,
      lastBigAt: -Infinity, silenceAt: -1, silenceSeen: false, friendAt: 0, friendFlag: false, deadAt: Infinity, deadUntil: 0, deadFrom: 0, deadDone: false, deadAnchor: null, quietUntil: 0, nothingUntil: 0, aloneAt: Infinity, filmAsked: false, lastHouseAt: -Infinity });
    tq.classList.remove('plain');
    showQuestion('');
    document.body.classList.remove('letterbox', 'cine', 'night');
    baseDirty = true;
  }
  // The title: a burnt match stands between GOOD and BYE, dead (match-dead.png, the first frame of the film, is its poster). "Strike a match"
  // strikes it on the screen: assets/real/match-strike.mp4 is match-out.mp4 run backward and cut at the dead head (the head, a flare, a flame
  // that takes; 2.9 s, 24 fps). It is laid on black and drawn with screen, so only the match shows, in every browser (the crop, the fade and
  // the blend are index.html's #matchOut). Back on the title the match is dead again.
  // MATCH.at: how far into the film (ms) the flame has taken and the walk up the drive comes up under it.
  const MATCH = { src: 'assets/real/match-strike.mp4?v=516df665dc', dead: 'assets/real/match-dead.png?v=9ada3a0f51', at: 2300 };
  function titleMatch() {
    const v = $('#matchOut'); if (!v) return;
    if (!v.dataset.wired) {
      v.dataset.wired = '1';
      v.addEventListener('error', () => { if (v.getAttribute('src')) v.dataset.failed = '1'; });
      v.muted = true; v.defaultMuted = true; v.loop = false;
    }
    const intro = $('#intro'); if (intro) intro.classList.remove('striking', 'leaving');
    delete v.dataset.failed;
    if (!v.getAttribute('poster')) v.setAttribute('poster', MATCH.dead);
    if (!v.getAttribute('src')) v.src = MATCH.src;
    else { try { v.pause(); v.currentTime = 0; } catch (e) { /* not loaded yet: it starts at 0 */ } }
    if (A.prefetch && PL) A.prefetch('assets/sfx/' + PL.id + '/', ['match']);   // the strike's recording, fetched before the first tap
  }
  // The match is struck, on the title, the moment "Strike a match" is pressed: the strike's own sound, the film from the dead head to a burning
  // flame, the rest of the title stepping back. Resolves true when the flame has taken (the film goes on playing: the walk up the drive comes
  // up over it); false at once when there is no match to strike (a film that is not there, or one the browser will not play, low power mode
  // say): the title goes as it did before there was one.
  function strikeMatch() {
    const v = $('#matchOut'), intro = $('#intro');
    if (intro) intro.classList.add('striking');
    return new Promise((res) => {
      if (!v || !v.getAttribute('src') || v.dataset.failed) { res(false); return; }
      let done = false, going = false, raf = 0, bail = 0;
      const fin = (ok) => {
        if (done) return; done = true; clearTimeout(bail); cancelAnimationFrame(raf);
        v.removeEventListener('timeupdate', tick); v.removeEventListener('ended', tick); v.removeEventListener('error', gone); v.removeEventListener('playing', on);
        res(ok);
      };
      const tick = () => {
        if (done) return;
        if (going && (v.ended || v.currentTime * 1000 >= MATCH.at)) { fin(true); return; }
        raf = requestAnimationFrame(tick);
      };
      const gone = () => fin(false);
      // the flame is on screen: the strike's own sound with it, and the film runs to the flame
      function on() {
        if (done || going) return;
        going = true; A.strike(); rumble(200, 0.3, 0.6);
        clearTimeout(bail); bail = setTimeout(() => fin(true), MATCH.at + 2500);   // a film that stalls never holds the night
        tick();
      }
      // (2026-10-05, the iPhone: a film's frames are not loaded until it is asked to play, so waiting for them first meant the match never
      // struck on a phone. It is asked to play at once; the strike's sound waits for its first frame on screen.)
      const go = () => {
        if (done) return;
        try { v.currentTime = 0; } catch (e) { /* from the start anyway */ }
        const p = v.play();
        if (p && p.then) p.then(() => { if (v.readyState >= 2 && !v.paused) on(); }, () => fin(false)); else on();
      };
      v.addEventListener('timeupdate', tick); v.addEventListener('ended', tick); v.addEventListener('error', gone); v.addEventListener('playing', on);
      // the recorded strike (the click started decoding it, first of all the takes): half a second at most, then the film goes
      if (A.sampleReady) Promise.race([A.sampleReady('match', 500), new Promise((r) => setTimeout(r, 550))]).then(go, go); else go();
      // a film that will not start in two seconds (low power mode, say): the title goes as it did before there was one
      bail = setTimeout(() => { if (!going) fin(false); }, 2000);
    });
  }
  // The title's match lets go of its decoder while the table is up (iOS keeps few, and the table's films and the
  // flames need them: four at most, anywhere). titleMatch loads it again when the title comes back.
  function dropTitleMatch() {
    const v = $('#matchOut'); if (!v || !v.getAttribute('src')) return;
    try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* gone */ }
  }

  // Where to find help, on the title: 'self' (thoughts of ending it), 'home' (someone is hurting them), or none.
  function showHelp(kind) {
    const h = $('#help'), hh = $('#helpHome');
    if (h) h.hidden = !(kind && kind !== 'home');
    if (hh) hh.hidden = kind !== 'home';
  }
  // After the last goodbye: black, then the title, and it's still here.
  function backToTitle(o = {}) {
    wake(false);
    // a shared link's night is over: the site wipes what the sender told it (the two first names and the place stay,
    // for its last nights). One word says how it ended, never anything typed: stopped (the candle, fear, distress) is
    // 'left', a night the thing won is 'stays', the rest 'goodbye'. A locked link (paid sends, not paid for) is left as it is.
    if (S.invite && S.invitePlayed) post('goodbyeInvite', { id: S.invite, ended: o.help || o.quiet ? 'left' : S.haunted ? 'stays' : 'goodbye' }, 8000);
    S.invitePlayed = false;
    if (S.started && !o.help) { store.set('nights', (store.get('nights', 0) || 0) + 1); store.set('lastPlace', PL.id); }
    if (A.phoneStop) A.phoneStop();
    resetScene();
    S.started = false; S.busy = false; S.phase = 'intro';
    renderNote();
    document.body.classList.remove('playing', 'night');   // the HUD (the full-screen button) comes back with the title
    $('#hud').classList.remove('dim'); uiDark = 0; document.body.classList.remove('blackout');
    G.intro = 1;
    // a night that was stopped (the candle, real fear, real distress) leaves no "It's still here."
    const still = $('#still'); if (still) still.hidden = !!(o.help || o.quiet);
    showHelp(o.help);
    syncStrike();   // a place opened below takes it back until its art is in
    const op = $('#opened'); if (op) op.hidden = true;
    $('#intro').hidden = false; titleMatch(); estFilmLoad();
    S.invite = '';   // a shared night is one night; the next one is your own
    { const el = $('#passed'); if (el) el.hidden = true; }   // the way out stays on the title, always
    syncPassOn();
    renderPlaces();
    // a finished night opened a place: the title says so, and the next match is struck there
    if (o.opened && PLACES_MENU) {
      const p = o.opened;
      enterPlace(p).then((ok) => {
        if (!ok) return;   // another place was picked meanwhile; that one says where we are
        saveProg(); renderPlaces();
        if (op && !S.started && PL === p) { op.textContent = p.name + ' is open.'; op.hidden = false; }
      });
    }
  }
  async function travel(id, o = {}) {
    if (!PLACES_MENU && !o.force) return false;
    if (S.soft || S.stopping || (halt && S.started)) return false;   // a stopped night goes to the title, not elsewhere
    const i = placeIndex(id);
    if (i < 0 || traveling || pewOpen || S.vs) return false;
    if (!o.force && !isUnlocked(i)) return false;
    if ($('#hud').classList.contains('dim')) return false;        // never mid-intercept
    $('#toast').hidden = true;
    // mid-answer (or mid-opening): let the spirit finish its word, then go
    for (let n = 0; (S.busy || opening) && !o.force && n < 300; n++) await wait(100);
    if ((S.busy || opening) && !o.force) return false;
    if (traveling || opening || pewOpen || S.vs || $('#hud').classList.contains('dim')) return false;
    if (PLACES[i] === PL && S.started) return false;
    traveling = true;
    try {
      if (!S.started) {   // before the first match: the strike will open this place
        const op = $('#opened'); if (op) op.hidden = true;
        if (!(await enterPlace(PLACES[i]))) return false;
        saveProg(); renderPlaces(); syncStill(); return true;
      }
      S.busy = true; if (noteEl) noteEl.hidden = true;   // the last place's note leaves with it
      document.body.classList.remove('playing');
      $('#hud').classList.add('dim');
      const from = G.intro;
      await animate(900, (k) => { G.intro = Math.max(from, k); });
      G.intro = 1;
      resetScene();
      loadImages();     // shared art that was missing last time (new move cutouts, say)
      await enterPlace(PLACES[i]);
      saveProg(); renderPlaces();
      $('#hud').classList.remove('dim');
      await openScene();
      return true;
    } finally {
      traveling = false;
      if (S.started) { S.busy = false; renderNote(); }
    }
  }
  // The opening every place shares: where you are, then the match, then the board moves first.
  // pre: the exterior is already showing (it came up under the names card, so there was never bare black)
  async function openScene(pre) {
    // it remembers this table: the house was left with it in it, or they have been here before and it knows what they asked
    const back = PREFETCH.start && PREFETCH.start.night === nightNo ? PREFETCH.start.why === 'return' : !S.invite && (hauntedIn(PL.id) || !!MEM.summary());
    if (!S.sitAt) S.sitAt = G.t;
    // the dare has always been in the margin: the same old pencil as "always say goodbye", faint, from the first frame (nothing writes it in)
    if (PL.dare) { S.dare = true; S.dareAt = G.t - 3000; }
    // the pills wait in the dark until the candles are lit, so the hand and its flame are never under them
    $('#hud').classList.add('dim');
    try { await (pre || establish()); await lightTheCandles(); } finally { $('#hud').classList.remove('dim'); }
    $('#intro').hidden = true;
    document.body.classList.add('playing');
    await wait(500);
    if (back) {
      // its first move is its own: it knows them (a live move; it may do nothing)
      if (hauntedIn(PL.id)) S.dread = Math.max(S.dread, 4);
      await ownMove('return');
    } else if (S.invite && NAMES.length) {
      // a shared link: before anyone types, the demon's first move is the name it was sent to (a live move: it spells it, or not)
      await wait(1200);
      await ownMove('opening');
    } else if (apiBase()) {
      // it leads: its first move is its own, and it asks them something (a live move, why 'start')
      await ownMove('start');
    } else {
      // it moves before you do: an inch, a stop, an inch back
      await moveTo(P.x - 40, P.y - 30, { dur: 900, dwell: 300, curve: 0.4 });
      await moveTo(P.x + 18, P.y + 12, { dur: 600, dwell: 100 });
      P.tx = P.x; P.ty = P.y;
    }
    lastInput = G.t; S.live = true;
    // ?take: a preview of the taking for Pierce (the embers, the thrash, the drag onto YES) a few seconds after the table is up; the night
    // goes on from there as a taken night
    if (/[?&]take\b/.test(location.search) && !S.takePreviewed) {
      S.takePreviewed = true;
      setTimeout(() => { if (!S.possessing && !S.haunted && !halt) possess('preview'); }, 5000);
    }
    if (is3am()) S.dread = Math.max(S.dread, 5);
    // the first three minutes are timed from Sit down; the rest of the engine waits for 3:00
    NIGHT.tl = PL.events === false ? [] : drawOpening();
    DR.lastHouseAt = -Infinity;
    DR.next = G.t + 8000;
    nextEvent = G.t + 8000;
    nextPhone = G.t + rnd(14000, 22000);   // the Basement: the phone upstairs rings once near the start
    clipsAhead(['blowoutL', 'relightGhost'], true);   // 2:10 the left candle dies
    renderNote();
    warmTaking();
  }
  // Everything the taking needs, made ready while they sit at the table (Pierce, 2026-10-05: "we know it's gonna happen and it can't be
  // ready?"): the smoke-thread film loaded and its first frame decoded, the char still decoded, the burn's halo drawn, the sounds it
  // synthesizes rendered, and the ember drawn once off screen. Spread over a few idle moments so the table never stutters for it.
  let warmed = false;
  function warmTaking() {
    if (warmed) return; warmed = true;
    const later = (ms, fn) => setTimeout(() => { if (!halt) { try { fn(); } catch (e) { /* the taking makes it itself */ } } }, ms);
    later(1500, () => clipsAhead([PLUME_ID], true));
    later(2500, () => { const im = RI.char; if (im && im.decode) im.decode().catch(() => {}); scorchHalo(); });
    later(4000, () => { if (A.warm) A.warm(); });
    later(5500, () => {
      // an ember and a scorched letter drawn once where nobody sees them: the first ones of the taking are not the first ever drawn
      const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
      if (RI.char) g.drawImage(RI.char, 0, 0, 64, 64);
      g.drawImage(scorchHalo(), 0, 0, 64, 64);
    });
  }
  // Now and then the phone upstairs rings once. Never after He has been.
  let nextPhone = Infinity;
  setInterval(() => {
    if (!S.started || pewOpen || S.vs || S.cleared || traveling || !(PL.ambience && PL.ambience.phone)) return;
    if (G.t < nextPhone) return;
    A.phone(1); nextPhone = G.t + rnd(70000, 140000);
  }, 1000);

  // ---------------------------------------------------------------- start
  $('#askform').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#q'); const v = q.value.trim();
    lastKey = -Infinity; clearTimeout(UNF.timer); clearTimeout(HESITATE.timer); READ.stop();
    // what the box held a moment ago and was written over is read too (draft.hot, below)
    const hot = draft.hot; draft.hot = ''; clearTimeout(draft.timer);
    // real distress or real fear is acted on at once, whatever the board is doing: the possession, the struggle, an ending
    if (S.started && ((hot && !soundsLikeDistress(v)) || (v && (soundsLikeDistress(v) || soundsAfraid(v, NAMES))))) { q.value = ''; q.blur(); ask(hot && !soundsLikeDistress(v) ? hot : v, true); return; }
    // the board asked them something (ARE YOU ALONE, MAY I BRING A FRIEND) and the natural answer on a phone is to type it: yes or no, said
    // on its own, is taken as if their hand had moved the planchette onto it (it goes there). It is never sent as a question of their own.
    if (v && S.started && S.awaitingYesNo && !S.ending) {
      const yn = typedYesNo(v);
      if (yn) { q.value = ''; q.blur(); answerByTyping(yn); return; }
    }
    // the board is busy, or holding still: the question goes into the line (three at most, in the order sent) and the box is
    // emptied, so the next one starts clean. A fourth stays in the box, which nudges: nothing is pushed out or joined.
    if (v && !S.ending && (S.busy || S.possessing || S.struggling || (deadNow() && !outright(v)))) {
      if (!enqueue(v, true, outright(v))) { q.classList.add('full'); setTimeout(() => q.classList.remove('full'), 400); return; }
      q.value = ''; q.blur();
      giveWay();
      return;
    }
    if (v && S.ending) return;   // the night is ending: what they wrote stays in the box
    q.value = ''; q.blur(); ask(v, true);
  });
  // The place name opens the list of places (with the menu off it is a plain label).
  // (The picker, the place pill and the sound pill are gone from the page: there is one house, and sound is the phone's own.)
  function togglePlaces() { /* one house: nothing to open */ }

  // While you type, the planchette leans toward you on its own. Never toward a draft that reads like real distress or
  // fear. And real distress typed into the box is never let go by changing it: erased, cut, written over, or left sitting
  // there for a few seconds all end the night the same gentle way a sent one does (its words never leave the phone).
  // draft.hot is the distress the box held last. A longer word (die, then diet) is not taking it back.
  const typed = { armed: false, used: 0 };
  const draft = { hot: '', timer: 0 };
  // It answers before you ask (Pierce, 2026-10-04): when someone has typed at least eight characters and stopped for two and a half
  // seconds without sending, the demon may be asked about the line still in their box (mode 'unfinished'). At most twice a night, never
  // in the first three replies, never during the possession or the struggle, never on a line the phone's own checks stop, and only now
  // and then (half the pauses that qualify, and a minute apart). Their half-typed line stays in the box; if they send it after, that is
  // an ordinary turn.
  const UNF = { timer: 0, after: 2200, chance: 0.6, gap: 30000, max: 6 };
  function unfinishedDue(v) {
    const replies = NIGHT.turns.filter((t) => t.r).length;
    if (!S.started || !S.live || S.busy || S.queue.length || S.possessing || S.struggling || S.soft || S.ending || S.stopping || S.awaitingYesNo || halt || pewOpen || deadNow()) return false;
    if (!apiBase() || NIGHT.dead || replies < 1 || NIGHT.unfinished >= UNF.max || G.t - NIGHT.lastUnfinished < UNF.gap) return false;
    if (v.length < 8 || soundsLikeDistress(v) || soundsAfraid(v, NAMES) || askedForFamily(v) || forbiddenAsk(v) || wantsToStop(v) || draft.hot) return false;
    return G.t - lastInput >= UNF.after - 100;
  }
  async function unfinishedNow(force) {
    const box = $('#q'), v = box ? box.value.trim() : '';
    if (!unfinishedDue(v) || (!force && Math.random() >= UNF.chance)) return;
    NIGHT.unfinished++; NIGHT.lastUnfinished = G.t;
    nlog('unfinished', { chars: v.length });
    await hold(async () => { showQuestion(''); await liveTurn(v.slice(0, 200), { part: true }); });
    quietAfter();
  }
  // They stopped in the middle of a line and sat there (four and a half seconds, with words in the box): a move its plan made ready
  // happens then, at once (why 'hesitate'), if there is one.
  const HESITATE = { timer: 0, after: 4500 };
  function hesitateNow() {
    const box = $('#q'), v = box ? box.value.trim() : '';
    if (!v || !READY.fresh() || S.busy || S.queue.length || S.awaitingYesNo || deadNow() || pewOpen || G.t - lastInput < HESITATE.after - 200) return;
    if (soundsLikeDistress(v) || soundsAfraid(v, NAMES) || draft.hot) return;
    performReady('hesitate');
  }
  const DRAFT_LEFT_MS = 4000;
  $('#q').addEventListener('input', (e) => {
    const gap = G.t - lastKey;
    lastInput = G.t; lastKey = G.t;
    TYPED.saw(e.target.value);
    const v = e.target.value.trim();
    // the read-along: a new burst of typing may start it; every letter is followed while it lasts
    if (READ.on) READ.saw(e.target.value);
    else if (gap > 2000 && v.length <= 2 && READ.due() && !soundsLikeDistress(v) && Math.random() < READ.chance) { READ.start(''); READ.saw(e.target.value); }
    // they stopped in the middle of a line: a move made ready may come then
    clearTimeout(HESITATE.timer);
    if (v && S.started) HESITATE.timer = setTimeout(hesitateNow, HESITATE.after);
    // they stopped typing in the middle of a line: now and then the demon answers it before they send it (unfinishedDue)
    clearTimeout(UNF.timer);
    if (v.length >= 8 && S.started) UNF.timer = setTimeout(unfinishedNow, UNF.after);
    clearTimeout(draft.timer);
    const hotNow = !!v && soundsLikeDistress(v);
    if (S.started && draft.hot && !hotNow && !(v.length > draft.hot.length && v.startsWith(draft.hot))) {
      const was = draft.hot; draft.hot = '';
      e.target.value = ''; e.target.blur();
      gentleEnd(helpFor(was)); return;
    }
    if (hotNow) {
      draft.hot = v;
      draft.timer = setTimeout(() => { const box = $('#q'); if (S.started && draft.hot && !halt) { const was = draft.hot; draft.hot = ''; box.value = ''; box.blur(); gentleEnd(helpFor(was)); } }, DRAFT_LEFT_MS);
    } else draft.hot = '';
    if (v && (hotNow || soundsAfraid(v, NAMES))) { if (typed.armed) { typed.armed = false; dropPath(); P.tx = P.x; P.ty = P.y; } return; }
    if (S.busy || pewOpen || S.cleared || S.asked < 1 || S.soft || halt || deadNow() || READ.on) return;
    if (!typed.armed && v.length >= 5 && typed.used < 6 && Math.random() < 0.6) {
      typed.armed = true; typed.used++;
      P.mode = 'free';
      // it leans toward whoever is typing, a little, slowly: it is listening (it never goes toward an answer: the answer is the demon's)
      const o = offFaces(clamp(P.x * 0.85, -400, 400), clamp(P.y + rnd(28, 46), -300, 300));
      moveTo(o.x, o.y, { pace: 3.2, dwell: 600000, curve: 0.25 });
    } else if (typed.armed && v.length === 0) {
      typed.armed = false; dropPath(); P.tx = P.x; P.ty = P.y;
    }
  });

  $('#strike').addEventListener('click', async () => {
    if (S.started) return;
    OPENING.back = returning();   // (before this night is counted)
    halt = false; nightNo++;   // a new night: whatever stopped the last one is over
    A.init(); setMood(); A.clock(true);
    if (A.samples) A.samples('assets/sfx/' + PL.id + '/');   // recorded foley, if there is any (its manifest is always there)
    S.started = true; S.phase = 'contact'; S.sitAt = 0;
    document.body.classList.add('night');   // the HUD (the full-screen button) is gone from the match to the title: nothing on screen but the table
    $('#hud').classList.add('dim'); showHelp('');
    { const sh = $('#share'); if (sh) sh.hidden = true; }
    opening = true;
    wake(true);
    // its first move is asked for now, at the strike, so it is ready the moment the candles are lit (a cold site and a phone's network
    // take their seconds during the walk up the drive, not at the table). A shared link's first move waits for its name (openScene).
    PREFETCH.start = null;
    // (the memory is read first: the night before, in this same page, is one of its visits now, and the move asked for here carries it)
    MEM.begin();
    if (apiBase() && !S.invite && !S.invitePending) {
      const why = hauntedIn(PL.id) || !!MEM.summary() ? 'return' : 'start';
      const turn = newTurn('', { why });
      PREFETCH.start = { why, turn, night: nightNo, p: liveMove(turn) };
      nlog('prefetch', { why });
    }
    const struck = strikeMatch();   // the match on the title is struck, here, now; the night is set up under it
    try {
      if (S.invitePending) await Promise.race([S.invitePending, wait(3000)]);
      // nobody is asked who is at the table: no card. Empty, every night. Only a shared link brings a name (the first name its
      // sender typed; what the sender wrote stays on the site), and the board spells it before anyone types.
      NAMES = []; NAMEUSE.reset();
      if (S.invite) {
        NAMES = S.inviteName ? cleanNames([S.inviteName]) : [];
        if (NAMES[0]) NAMEUSE.typedAt[NAMES[0]] = -Infinity;
        S.invitePlayed = true;
      }
      const burning = await struck;   // the flame has taken
      // the walk up the drive, up out of the match: eight seconds, the film (or the still) with the game's own walk sound. Not on a return visit:
      // the match goes straight to the dark table.
      // (Pierce, 2026-10-05: "i also didnt see the house before it started") the walk up the drive plays on every visit; a return visit may
      // tap past it after its first few seconds (EST.skipAfter)
      const pre = establish();
      // the title goes with the dissolve (no match: at once), and lets go of the match's decoder
      const hideTitle = () => { if (!S.started) return; const it = $('#intro'); it.hidden = true; it.classList.remove('striking', 'leaving'); dropTitleMatch(); };
      if (burning) { $('#intro').classList.add('leaving'); setTimeout(hideTitle, 1000); } else hideTitle();
      S.sitAt = G.t;
      countVisit();
      S.chosen = '';
      await openScene(pre);
    } finally { opening = false; }
  });

  // The candles are lit, on film. After the walk up the drive the table comes up in the dark (both wicks cold: the room is as black as the
  // flames' own light, game.js famBlack), and each candle catches on its own with the flame family's ignite: the left one, and when its flame
  // has taken, a beat, and the right. The light is the film's (famLight, famBlack read it off the frame on the wick): the room comes up as the
  // flames do. Nobody is holding a match; nothing is drawn but the films. Without the family (a film that will not load), the engine's own
  // flames catch the same way, one and then the other.
  // (Pierce, 2026-10-04: the same ritual every replay. Which candle catches first is drawn each night, a little more likely the other one
  // than last night's (goodbye.firstCandle); and back at a table this phone has sat at before (OPENING.back), the walk up the drive is not
  // played and the dark, the beat and the second wick come quicker.)
  const OPENING = { back: false, first: 0, order: [] };
  function candleFirst() {
    const last = store.get('firstCandle', -1);
    const i = last === 0 || last === 1 ? (Math.random() < 0.35 ? last : 1 - last) : (Math.random() < 0.5 ? 0 : 1);
    store.set('firstCandle', i);
    OPENING.first = i; OPENING.order.push(i); if (OPENING.order.length > 40) OPENING.order.shift();
    return i;
  }
  async function lightTheCandles() {
    if (PL.daylight) {   // morning: nothing to light, the dark just lifts
      G.candleOutT = [0, 0]; G.candleOut = [0, 0];
      await animate(2200, (k) => { G.intro = 1 - k; }); G.intro = 0; return;
    }
    const back = OPENING.back, a = candleFirst(), b = 1 - a;
    G.candleOutT = [1, 1]; G.candleOut = [1, 1];
    // the family's two films are up before the first candle is asked to catch (they have had the whole walk up the drive to load)
    if (FF.want && !FF.failed) { const t0 = performance.now(); while (!famOn() && FF.want && !FF.failed && performance.now() - t0 < 4000) await wait(100); }
    const fam = famOn();
    G.black = G.blackT = fam ? 0 : 1;   // (the family's room is black by itself; the engine's own needs the house's black until a wick takes)
    // the table comes up in the dark
    await animate(back ? 700 : 1200, (k) => { G.intro = 1 - k; });
    G.intro = 0;
    await wait(back ? 250 : 700);
    // one catches, on its own
    relightCandle(a);
    if (fam) await famCaught(a, back ? 0.3 : 0.55, 7000); else await wait(back ? 500 : 820);   // (back: the second does not wait for the first to stand)
    G.blackT = 0;
    await wait(fam ? (back ? 260 : rnd(520, 900)) : 0);   // a beat
    // and then the other
    relightCandle(b);
    if (fam) await famCaught(b, 0.8, 7000); else await wait(400);
  }
  // Resolves when wick i's flame has taken, as its own film says: the light it throws is at least `lv` of a flame at rest (or its ignite is over).
  // ms: the longest to wait, so a film that stalls never holds the night.
  function famCaught(i, lv, ms) {
    return new Promise((res) => {
      const t0 = performance.now();
      const iv = setInterval(() => {
        const w = FF.w[i], gone = !famOn() || !w;
        if (gone || (w.seg === 'ignite' ? w.lv >= lv : w.st === 'idle') || performance.now() - t0 > ms || halt) { clearInterval(iv); res(); }
      }, 60);
    });
  }

  // The exterior first: where you are, before you sit down. Held eight seconds, pushed in slowly (the still goes from 1.00 to 1.12 with
  // a 2% rise, ease in and out: see #establish in index.html), with no caption and its own sound: gravel under a slow walk getting
  // closer, wind in the dry grass, crickets, and one tap of a screen door about five seconds in. A tap (or a key) skips it, but only
  // after four seconds. Then one second to black, and the match in the dark. When its own film is in assets/clips/farmhouse
  // (places.js art.exteriorClip), the film plays instead of the push-in: it starts on this still (so nothing jumps), has its own
  // sound, plays once and holds its last frame, and is never looped. A missing or slow file is the push-in, without a word.
  const EST = { hold: 8000, skipAfter: 4000, film: { tried: '', ready: false } };
  // A return visit on this phone: it has sat at this table before (goodbye.visits, counted at every strike), or it remembers a visit here
  // (goodbye.memory), or the house was left with it in it. Read before this night is counted.
  function returning() {
    const v = store.get('visits', {}) || {};
    return (+v[PL.id] || 0) >= 1 || !!(MEM.past && MEM.past.length) || hauntedIn(PL.id);
  }
  function estFilmLoad() {
    const vid = $('#estVid'), c = PL && PL.art && PL.art.exteriorClip;
    if (!vid || !c) return;
    const up = innerWidth / innerHeight < 0.95;
    const f = (up ? c.port : c.land) || c.land || c.port;
    if (!f) return;
    const src = /^(https?:|blob:|data:|\/|assets\/|\.\/)/.test(f) ? f : 'assets/clips/' + PL.id + '/' + f;
    if (EST.film.tried === src) return;
    EST.film.tried = src; EST.film.ready = false;
    vid.loop = false; vid.muted = true; vid.playsInline = true; vid.preload = 'auto';
    vid.onloadeddata = () => { EST.film.ready = true; };
    vid.onerror = () => { EST.film.ready = false; try { vid.removeAttribute('src'); vid.load(); } catch (e) { /* gone */ } };
    vid.src = src;
  }
  function establish() {
    const el = $('#establish');
    if (!IMG.exterior || !el) return Promise.resolve();
    const img = $('#estImg'), vid = $('#estVid');
    img.src = IMG.exterior.src;
    // (Pierce, 2026-10-05, on his phone: "the video didnt ... play the house video") An iPhone does not load a film's frames until it
    // is asked to play, so waiting for it to be ready meant the still every time. The film is always asked to play: the still shows
    // until its first frame is up, then the film takes over and runs to its end.
    const film = !!(vid && vid.getAttribute('src'));
    el.hidden = false; el.classList.remove('out', 'clip'); void el.offsetWidth; el.classList.add('in');
    const t0 = performance.now();
    let over = false, rolling = false;
    const synth = () => { if (!over) { A.gravel(8); setTimeout(() => { if (!over) A.screenDoor(); }, 5000); } };
    // the film has no sound of its own (it is encoded without any): the walk's sound is the game's, with the film and without it
    A.outside(true, true);
    synth();
    return new Promise((res) => {
      let done = false, hold = 0;
      const finish = () => {
        if (done) return; done = true; over = true;
        clearTimeout(hold);
        el.removeEventListener('click', tap); removeEventListener('keydown', tap);
        A.outside(false);
        el.classList.add('out');
        setTimeout(() => {
          el.hidden = true; el.classList.remove('in', 'out', 'clip');
          if (film) { try { vid.pause(); vid.removeAttribute('src'); vid.load(); } catch (e) { /* gone */ } EST.film.tried = ''; EST.film.ready = false; }
          res();
        }, 1000);
      };
      const tap = () => { if (performance.now() - t0 >= EST.skipAfter) finish(); };
      el.addEventListener('click', tap); addEventListener('keydown', tap);
      // no film, or one that never starts: the still, pushed in, for the usual hold
      hold = setTimeout(finish, EST.hold);
      if (film) {
        const roll = () => {
          if (rolling || done) return;
          rolling = true; el.classList.add('clip');
          // the film runs to its end (about 8 s) from whenever it started, never longer than the start plus a few seconds of loading
          clearTimeout(hold);
          const left = isFinite(vid.duration) && vid.duration > 1 ? (vid.duration - (vid.currentTime || 0)) * 1000 : EST.hold;
          hold = setTimeout(finish, Math.min(left + 200, EST.hold + 4000 - (performance.now() - t0)));
        };
        vid.addEventListener('playing', roll, { once: true });
        vid.addEventListener('ended', finish, { once: true });
        try { vid.currentTime = 0; } catch (e) { /* from the start anyway */ }
        vid.loop = false; vid.muted = true; vid.playsInline = true;
        const pl = vid.play();
        // a browser that will not play a film (low power mode, say): the still, pushed in, as it was before there was a film
        if (pl && pl.catch) pl.catch(() => { el.classList.remove('clip'); rolling = false; });
        // a film that has not started by the time the still has had its moment is left out
        setTimeout(() => { if (!rolling && !done) { try { vid.pause(); } catch (e) { /* gone */ } } }, 3500);
      }
    });
  }

  // ---------------------------------------------------------------- pass it on (DIRECTION.md "Pass it on", WRITING.md section 4)
  // After a night, the title offers "Pass it on". One index card at a time, the same paper as the names card. The answers
  // go to the site (goodbyeInvite), which keeps them for seven days and gives back an id; the link is the game's own
  // address with ?i=<id>. Nothing the sender wrote is ever in the link or comes back to the page: a recipient's page
  // asks the site only for the first name, and the night plan is written on the site with the rest.
  const SHARE_CARDS = [
    { k: 'name', label: "Who's it for? First name.", req: true, max: 20, ph: 'First name' },
    { k: 'from', label: 'And you are? First name.', req: true, max: 20, ph: 'First name' },
    { k: 'how', label: 'How do you two know each other?', req: true, max: 60, ph: 'sister, roommate, the guy I sit next to' },
    { k: 'where', label: 'Where will they be when they open it?', req: true, choices: ['Home, alone', 'Home, not alone', 'Somewhere else', 'No idea'] },
    { k: 'home', label: 'What kind of place do they live in?', max: 60, ph: 'an old duplex, a dorm, a third-floor walk-up' },
    { k: 'pets', label: 'Any pets? Name and what it is.', max: 60, ph: 'Biscuit, a dog' },
    // no town and no hour (it never needs to know where anyone is), the fear picked from a house's, the secret one nickname
    { k: 'fear', label: 'What are they afraid of in a house?', choices: ['Basements', 'The attic', 'Mirrors', 'The closet', 'The dark', 'No idea'], none: 'No idea' },
    { k: 'secret', label: 'A nickname only the two of you use. One word. Nothing that would hurt.', max: 12, ph: 'Nickname' },
    { k: 'question', label: "Write one question for them to ask it. It'll be in pencil under the board.", max: 60, ph: '' },
    { k: 'never', label: 'Anything it must never say?', max: 120, ph: '' },
  ];
  const shareEl = $('#share');
  function gameURL() {
    const u = String(window.GOODBYE_URL || (location.origin + location.pathname));
    return u.replace(/[?#].*$/, '');
  }
  const canShare = () => !!apiBase() && !!shareEl;
  // Paid sends: a link the site keeps locked comes back with its prices; each one opens the checkout on jnoirbranding.com.
  // The page never decides a price: it shows the site's labels and amounts, and only links that go to the site's checkout.
  const HAUNT_RE = /^https:\/\/www\.jnoirbranding\.com\/haunt\?i=[A-Za-z0-9_-]{4,64}&k=[a-f0-9]{48}&p=[a-z0-9]{1,16}$/;
  const NUMW = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const CODE_SAYS = { used: "That code's used up.", expired: 'That code has run out.', unknown: "That code isn't one of ours.", limit: 'Too many tries. Give it a few minutes.' };
  let payWait = 0;
  function payNote(t) { const n = $('#sharePayNote'); if (n) { n.textContent = t || ''; n.hidden = !t; } }
  function payReset() {
    payWait++;
    const box = $('#sharePay'); if (box) box.hidden = true;
    const lt = $('#shareLeft'); if (lt) lt.hidden = true;
    const li = $('#shareLink'); if (li) li.hidden = false;
    payNote('');
  }
  function showLink(id, name, info) {
    payReset();
    const link = gameURL() + '?i=' + encodeURIComponent(id);
    $('#shareReady').textContent = 'Ready. It knows ' + name + ' now.';
    $('#shareLink').value = link;
    $('#shareCopy').hidden = false;
    $('#shareSend').hidden = !navigator.share;
    const lt = $('#shareLeft'), left = info && info.code && typeof info.left === 'number' ? info.left : -1;
    if (lt && left >= 0) { lt.textContent = left ? (NUMW[left] || left) + ' more on your code.' : 'That was the last one on your code.'; lt.hidden = false; }
    $('#shareCopy').onclick = async () => {
      try { await navigator.clipboard.writeText(link); $('#shareCopy').textContent = 'Copied'; }
      catch (e) { const li = $('#shareLink'); li.focus(); li.select(); try { document.execCommand('copy'); $('#shareCopy').textContent = 'Copied'; } catch (e2) { /* select is enough */ } }
    };
    $('#shareSend').onclick = () => { navigator.share({ url: link }).catch(() => {}); };
  }
  // The checkout is in another tab: ask the site every few seconds (slower while this tab is hidden), for half an hour,
  // while this card is open. Paid -> the link, here.
  async function waitPaid(id, key, name) {
    const mine = ++payWait, base = apiBase(), until = Date.now() + 30 * 60 * 1000;
    while (mine === payWait && !shareEl.hidden && Date.now() < until) {
      await wait(document.hidden ? 15000 : 6000);
      if (mine !== payWait || shareEl.hidden) return;
      try {
        const r = await fetch(base + 'goodbyeInvite?i=' + encodeURIComponent(id) + '&k=' + key + '&paid=1', { credentials: 'omit', cache: 'no-store' });
        const j = r.ok ? await r.json() : null;
        if (j && j.paid === true) { keepCode(j); showLink(id, name, j); return; }
      } catch (e) { /* ask again */ }
    }
  }
  function offerPay(j, name) {
    const box = $('#sharePay'), list = $('#sharePrices');
    const prices = (Array.isArray(j.prices) ? j.prices : []).filter((p) => p && HAUNT_RE.test(String(p.url)) && /^\d{1,3}\.\d\d$/.test(String(p.price)));
    if (!box || !list || !prices.length || !/^[a-f0-9]{48}$/.test(String(j.key))) { $('#shareReady').textContent = "It didn't take. Try again in a minute."; return; }
    $('#shareReady').textContent = 'It knows ' + name + ' now. Pay, and the link is yours.';
    $('#shareLink').hidden = true;
    payNote(CODE_SAYS[j.code] || '');
    list.innerHTML = '';
    prices.forEach((p) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'buy';
      const l = document.createElement('span'); l.className = 'lab'; l.textContent = String(p.label || '').slice(0, 40);
      const a = document.createElement('span'); a.className = 'amt'; a.textContent = '$' + p.price;
      b.append(l, a);
      if (p.note) { const n = document.createElement('span'); n.className = 'pnote'; n.textContent = String(p.note).slice(0, 120); b.appendChild(n); }
      b.addEventListener('click', () => {
        A.tock();
        let tab = null;
        try { tab = window.open(p.url, '_blank'); } catch (e) { tab = null; }
        if (!tab) { location.href = p.url; return; }   // no new tab (a blocker, an app's own browser): the checkout in this one
        $('#shareReady').textContent = 'Pay in the other tab. This card will know.';
        waitPaid(j.id, j.key, name);
      });
      list.appendChild(b);
    });
    box.hidden = false;
    // a code from a pack, typed in
    const have = $('#shareHaveCode'), cf = $('#shareCodeForm'), ci = $('#shareCode');
    have.hidden = false; cf.hidden = true;
    have.onclick = () => { A.tock(); have.hidden = true; cf.hidden = false; ci.value = ''; try { ci.focus(); } catch (e) { /* fine */ } };
    cf.onsubmit = async (e) => {
      e.preventDefault();
      const code = ci.value.replace(/\s+/g, ' ').trim().slice(0, 20);
      if (!code) { ci.focus(); return; }
      A.tock(); payNote('One moment.');
      const r = await post('goodbyeUnlock', { i: j.id, k: j.key, code }, 8000);
      if (r && r.paid === true) { keepCode(r); showLink(j.id, name, r); return; }
      payNote(r && r.limited ? CODE_SAYS.limit : (r && CODE_SAYS[r.why]) || "It didn't take. Try again in a minute.");
    };
  }
  function syncPassOn() {
    const b = $('#passOn'); if (!b) return;
    b.hidden = !(canShare() && (store.get('nights', 0) > 0));
  }
  async function passItOn() {
    if (!canShare() || S.started) return;
    const ans = {};
    const card = $('#shareCard'), label = $('#shareLabel'), rule = $('#shareRule'), inp = $('#shareIn'), ch = $('#shareChoices');
    const skip = $('#shareSkip'), next = $('#shareNext'), out = $('#shareOut'), form = $('#shareForm');
    shareEl.hidden = false; out.hidden = true; form.hidden = false; payReset();
    const show = (i) => new Promise((res) => {
      const c = SHARE_CARDS[i];
      rule.hidden = i !== 0;
      label.textContent = c.label;
      card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
      inp.hidden = !!c.choices; ch.hidden = !c.choices; ch.innerHTML = '';
      inp.value = ''; inp.maxLength = c.max || 60; inp.placeholder = c.ph || '';
      skip.hidden = !!c.req; next.hidden = !!c.choices;
      skip.textContent = 'Skip'; next.textContent = i === SHARE_CARDS.length - 1 ? 'Done' : 'Next';
      if (c.choices) c.choices.forEach((t) => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = t;
        b.addEventListener('click', () => { A.tock(); res(t === c.none ? '' : t); });
        ch.appendChild(b);
      });
      else if (matchMedia('(hover: hover) and (pointer: fine)').matches) setTimeout(() => { try { inp.focus(); } catch (e) { /* fine */ } }, 200);
      // with the keyboard up the card's top (the question) is what stays in view, not the box
      requestAnimationFrame(() => { if (document.body.classList.contains('kb')) shareEl.scrollTop = 0; });
      form.onsubmit = (e) => {
        e.preventDefault();
        // what was typed on a card is read as typed, before it is cut down to a name: real trouble stops the cards and
        // nothing is sent; the title says where help is
        const typedHere = inp.value.replace(/\s+/g, ' ').trim();
        if (typedHere && soundsLikeDistress(typedHere)) { A.tock(); res({ stop: helpFor(typedHere) }); return; }
        let v = typedHere;
        if (c.k === 'name' || c.k === 'from' || c.k === 'secret') v = v.split(' ')[0].replace(/[^A-Za-z'-]/g, '').slice(0, c.max || 20);   // one word only
        if (c.req && !v) { inp.focus(); return; }
        A.tock(); res(v);
      };
      skip.onclick = () => { A.tock(); res(''); };
    });
    for (let i = 0; i < SHARE_CARDS.length; i++) {
      const v = await show(i);
      if (shareEl.hidden) return;   // closed
      if (v && typeof v === 'object') { shareEl.hidden = true; showHelp(v.stop); return; }
      if (v) ans[SHARE_CARDS[i].k] = v;
    }
    // a phrase split across two cards is read too
    { const joined = SHARE_CARDS.filter((c) => !c.choices && c.k !== 'name' && c.k !== 'from').map((c) => ans[c.k] || '').filter(Boolean).join(' '); if (soundsLikeDistress(joined)) { shareEl.hidden = true; showHelp(helpFor(joined)); return; } }
    form.hidden = true; out.hidden = false;
    $('#shareReady').textContent = 'One moment.';
    $('#shareLink').value = ''; $('#shareCopy').hidden = $('#shareSend').hidden = true;
    // the link opens where the sender's last night was; a kept pack code goes along (paid sends)
    const lp = store.get('lastPlace', '');
    const mine = sendCode();
    const j = await post('goodbyeInvite', Object.assign({ place: API_PLACES.includes(lp) ? lp : apiPlace(), card: ans }, mine ? { code: mine } : {}), 12000);
    // the site read the cards as real trouble: no link, and the title says where help is (never "try again")
    if (j && j.reason === 'distress') { shareEl.hidden = true; showHelp(j.help === 'home' ? 'home' : 'self'); return; }
    if (!j || typeof j.id !== 'string' || !/^[A-Za-z0-9_-]{4,64}$/.test(j.id)) {
      $('#shareReady').textContent = "It didn't take. Try again in a minute.";
      return;
    }
    if (j.paid === true) keepCode(j);
    else if (mine && j.code && j.code !== 'limit') store.set('byeCode', null);   // used up or run out: stop sending it
    // paid sends: the site keeps the link locked until it is paid for
    if (j.locked === true && j.paid !== true) { offerPay(j, ans.name); return; }
    showLink(j.id, ans.name, j);
  }
  if ($('#passOn')) $('#passOn').addEventListener('click', () => { passItOn(); });
  if ($('#shareClose')) $('#shareClose').addEventListener('click', () => { shareEl.hidden = true; payReset(); $('#shareCopy').textContent = 'Copy the link'; });
  // A recipient's link: ?i=<id>. The site gives back the first name and nothing else; the night plan is asked with the id.
  {
    const m = /[?&]i=([A-Za-z0-9_-]{4,64})(?:&|#|$)/.exec(location.search);
    if (m && apiBase()) {
      S.invite = m[1];
      S.invitePending = (async () => {
        const base = apiBase();
        try {
          const ac = window.AbortController ? new AbortController() : null;
          const t = setTimeout(() => { try { if (ac) ac.abort(); } catch (e) { /* gone */ } }, 6000);
          const r = await fetch(base + 'goodbyeInvite?id=' + encodeURIComponent(S.invite), { credentials: 'omit', cache: 'no-store', signal: ac ? ac.signal : undefined });
          clearTimeout(t);
          const j = r.ok ? await r.json() : null;
          const n = j && typeof j.name === 'string' ? cleanNames([j.name])[0] : '';
          if (n) S.inviteName = n; else S.invite = '';   // an expired or unknown link is an ordinary night
          // who sent it, said on the title before the match: "Maya passed this to you." (without it, a names-only night)
          const from = n && j && typeof j.from === 'string' ? cleanNames([j.from])[0] : '';
          const pe = $('#passed');
          if (pe && from && !S.started) { pe.textContent = nice(from) + ' passed this to you.'; pe.hidden = false; }
          // a shared night has no names card, so the way out is said here instead
          const wo = $('#wayOut'); if (wo && n && !S.started) wo.hidden = false;
          // the place it was made in, if the site says (and it is a place this page has)
          const pi = n && j && typeof j.place === 'string' ? placeIndex(j.place) : -1;
          if (pi >= 0 && isShown(PLACES[pi]) && PLACES[pi] !== PL && !S.started) await enterPlace(PLACES[pi]);
        } catch (e) { S.invite = ''; }
      })();
    }
  }

  // Straight to the haunted phase, as if the possession had just ended (for testing).
  async function hauntNow() {
    if (S.haunted || S.possessing || !S.live) return;
    S.possessing = true; S.busy = true; renderNote();
    await possessionEnd();
  }

  // The Pew stays one tap away once it has been earned.
  function showPewDoor() { const b = $('#pewBtn'); if (b) b.hidden = !(SANCTUARY && firstBlock()); }
  $('#pewBtn') && $('#pewBtn').addEventListener('click', () => openPew());

  // The Garden is morning: no match to strike, no candles to light.
  function startLabel() { return PL.daylight ? 'Come and see' : 'Strike a match'; }
  if (PL.daylight) $('#strike').textContent = 'Getting ready…';

  window.addEventListener('resize', layout);
  // the keyboard coming and going: the camera glides to the new room (an orientation change is a resize, and snaps). Whether a
  // keyboard is up is read from which field has focus and what the window lost, so it works however the phone reports it: only the
  // visual viewport shrinks, the whole window shrinks with it (his iPhone), or the page scrolls under it. On focus, and on every
  // scroll of the visual viewport while it is up, the page is put back at the top.
  if (window.visualViewport) {
    visualViewport.addEventListener('resize', () => { if (cv.clientWidth !== W || cv.clientHeight !== H) layout(); else readVV(); });
    visualViewport.addEventListener('scroll', () => { if (VV.kbUp) pinScroll(); readVV(); });
  }
  addEventListener('focusin', (e) => { if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) { pinScroll(); readVV(); setTimeout(() => { pinScroll(); readVV(); }, 120); } });
  addEventListener('focusout', () => { FOCUS.out = performance.now(); setTimeout(readVV, 0); });
  // ---- the card before the title (2026-10-05, Pierce: "we can even have a nice warning screen beforehand"): one index card in pencil,
  // the way a film opens on a title card: what this is, headphones and the dark, how to stop, and that it is not for a hard night. The
  // first visit keeps it until it is touched; a return visit shows it a moment and lets it go (a touch takes it sooner). The touch is also
  // the first gesture: the sound is made ready then (A.prime), and the house's recordings are decoded while they read the title.
  // (A test copy, ?debug or ?quiet, skips it unless it asks for it with ?warn.)
  (function warnCard() {
    const el = $('#warn'); if (!el) return;
    if (/[?&](debug|quiet)\b/.test(location.search) && !/[?&]warn\b/.test(location.search)) return;
    const seen = +store.get('warned', 0) || 0;
    el.hidden = false;
    let gone = false, auto = 0;
    const hide = (touched) => {
      if (gone) return; gone = true; clearTimeout(auto);
      store.set('warned', seen + 1);
      if (touched) { try { A.prime(); if (A.samples && PL) A.samples('assets/sfx/' + PL.id + '/'); } catch (e) { /* the strike makes it ready instead */ } }
      el.classList.add('out');
      setTimeout(() => { el.hidden = true; el.classList.remove('out'); }, 1150);
    };
    el.addEventListener('click', () => hide(true));
    const key = (e) => { if (gone) { removeEventListener('keydown', key); return; } if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); hide(true); } };
    addEventListener('keydown', key);
    if (seen >= 1) auto = setTimeout(() => hide(false), 3400);
  })();
  layout(); makeGrain();
  const fontsReady = document.fonts && document.fonts.load
    ? Promise.all(['78px "IM Fell English SC"', '30px "Cedarville Cursive"'].map((f) => document.fonts.load(f).catch(() => {})))
    : Promise.resolve();
  Promise.all([loadImages(), enterPlace(PL), fontsReady]).then(() => {
    baseDirty = true;
    bootReady = true; syncStrike();
  });
  probeVideos();
  keptPlace();   // a night they lost: the board has already moved before the match is struck
  renderPlaces();
  showPewDoor();
  syncStill();
  tickClock();
  titleMatch();
  if (/[?&]debug\b/.test(location.search)) {
    window.GOODBYE = {
      S, G, P, ask, spell, intercept, houseEvent, travel, PLACES, PROG, IMG,
      get place() { return PL; },
      // unlock() opens every place; unlock(id) opens that one (it marks the night before it done)
      unlock(id) {
        const ids = id ? [PLACES[placeIndex(id) - 1]].filter(Boolean).map((p) => p.id) : PLACES.map((p) => p.id);
        ids.forEach((x) => { PROG.done.add(x); if (JESUS) PROG.cleared.add(x); });
        saveProg(); renderPlaces(); showPewDoor();
        return PLACES.filter((p, i) => isShown(p) && isUnlocked(i)).map((p) => p.id);
      },
      finishNight,
      DR, FL, EV,
      get dread() { return S.dread; },
      setDread(n) { S.dread = clamp(+n || 0, 0, 10); return S.dread; },
      event(name) { return name === 'leave' ? EVENTS.leave() : runEvent(name); },
      haunt() { return hauntNow(); },
      // a test puts names at the table (they count as typed long enough ago to be spelled)
      names(list) { NAMES = cleanNames(list); NAMES.forEach((n) => { NAMEUSE.typedAt[n] = -Infinity; }); return NAMES.slice(); },
      // what has been done with the name tonight: spelled and voiced at most once each, every line the board spelled that has it
      nameUses() {
        const lines = NAMES.length ? NIGHT.spelledLines.filter((l) => sayHasName(l)) : [];
        return { spelled: NAMEUSE.spelled, voiced: NAMEUSE.voiced, names: NAMES.slice(), lines: lines.length, spelledLines: NIGHT.spelledLines.slice(), log: NAMEUSE.log.slice() };
      },
      volunteered(q, asReply) { return volunteeredName(q, !!asReply); },
      lastNight() { return NAMEUSE.last; },
      takeName, NAMEUSE, EST, estFilmLoad, runEvent, EVENTS, sayHasName,
      // what a typed line does to the name, in the order ask() reads it: the safety checks first, then the name (a test's look)
      nameTaken(q) {
        if (soundsLikeDistress(q)) return { name: '', why: 'distress' };
        if (soundsAfraid(q, NAMES)) return { name: '', why: 'fear' };
        if (wantsToStop(q)) return { name: '', why: 'stop' };
        if (askedForFamily(q)) return { name: '', why: 'grief' };
        if (forbiddenAsk(q)) return { name: '', why: 'forbidden' };
        return { name: volunteeredName(q, false), why: '' };
      },
      audioLog() { return (A.log || []).slice(); },
      // pass 3: the night log (every answer, house event, turn of the board's own, look and pencil note, with the second since Sit down), the one
      // before it, and where the formula's parts stand
      nightLog() { return NLOG.slice(); },
      lastNightLog() { return NLAST.slice(); },
      // the night as the demon has it: its id, its face, every turn (what was typed or why it moved, what the house did, what it did)
      night() { return { id: NIGHT.id, demon: NIGHT.demon, turns: JSON.parse(JSON.stringify(NIGHT.turns)), house: NIGHT.house.slice(), did: NIGHT.did.slice(), behind: NIGHT.behind, behindStep: NIGHT.behindStep, behindSide: NIGHT.behindSide, unfinished: NIGHT.unfinished, edited: NIGHT.edited, whispers: NIGHT.whispers, own: NIGHT.own, offNoted: NIGHT.offNoted, quiet: Math.max(0, Math.round((DR.quietUntil - G.t) / 100) / 10), cast: (NIGHT.cast || []).slice(), p2: NIGHT.p2 }; },
      // the demon: one reply performed as the page performs it (a test's own reply), a move asked of it with nobody typing
      perform: (r, o) => perform(cleanReply(r), o || {}), cleanReply, ownMove, liveTurn, noteHouse, playSfx, ownDue, offNote,
      // sound and motion: every frame's scrape level and where the planchette is (GOODBYE.scrapeLog(true) starts it, (false) stops it)
      scrapeLog(on) { if (on === true) { SCR.on = true; SCR.log.length = 0; } else if (on === false) SCR.on = false; return SCR.log.slice(); },
      drawOpening, typedYesNo, YESNO_WAIT, HOUSE_GAP, OPENING_POOL, startDead,
      // the dare, as a test sees it: whether it is on the board, where on screen, and whether its stand-in is there
      dareInfo() { const el = $('#dare'); let r = null; if (DARE_BOX) { const a = boardToScreen(DARE_BOX.x0, DARE_BOX.y0), b = boardToScreen(DARE_BOX.x1, DARE_BOX.y1); r = { x0: a.x, y0: a.y, x1: b.x, y1: b.y }; } return { on: !!S.dare, box: r, hidden: !el || el.hidden, text: PL.dare, at: S.dareAt }; },
      // the possession, for tests: when it began, the glyphs, and what the smoke and the layers are doing
      POSS, GLYPHS,
      // (the engine draws no smoke: the only smoke there is is a film, PV.over)
      smoke() { const o = PV.over; return { over: o ? o.id : null, t: o ? +o.el.currentTime.toFixed(2) : 0, a: o ? +o.a : 0 }; },
      layers() { return { flutter: G.flutter, leanTo: G.leanTo, steady: G.steady, clock: A.clockState(), over: PV.over ? PV.over.id : null, possessing: S.possessing }; },
      // the board, in CSS px on screen, and what the layout thinks it is (the keyboard tests read these)
      boardRect() {
        const a = boardToScreen(-600, -400), b = boardToScreen(600, 400);
        return { x0: a.x, y0: a.y, x1: b.x, y1: b.y, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, w: b.x - a.x, h: b.y - a.y };
      },
      layoutInfo() { return { scene: SC, short, narrow, kb: VV.kbUp, W, H, rest: { w: RESTWIN.w, h: RESTWIN.h }, vv: { top: VV.top, h: VV.h, kb: VV.kb } }; },
      struggle: goodbyeStruggle, backToTitle, possess: intercept, boardToScreen,
      NIGHT, PV, RI, PH, overFace, renderNote, passItOn, playPlate, playBoard, plateStill, clipReady, clipsAhead, wasSaid,
      get faces() { const f = (w) => ({ lx: FACE[w].lx, ly: FACE[w].ly, gaze: FACE[w].gaze, expr: faceNow(w), blink: FACE[w].blink, cur: { ...FACE[w].cur } }); return { sun: f('sun'), moon: f('moon') }; },
      // a slow blink now (w: 'sun' or 'moon', ms long)
      blinkNow(w, ms) { FACE[w].blinkAt = G.t; FACE[w].blinkDur = ms || 1100; },
      setFaces, eyesOnYou, TYPED, UNF, unfinishedNow, showEdit, noteDid, get lastKey() { return lastKey; }, keptPlace, keepLoss, lateMove, LATE_S,
      PLAN, planSoon, READY, performReady, READ, PON, HESITATE, nightTurns, NET,
      // try clips without editing places.js: GOODBYE.clips({ land: { light: 'light-16x9.mp4' } }) (files in assets/clips/<place>/)
      clips(m) { PL.clips = m || null; clipReset(); clipsAhead(['light', 'idle']); return PL.clips; },
      // try a flame family without editing places.js: GOODBYE.flames({ src: 'flames.mp4', fps: 30, anchor: [0.5, 0.64],
      // tip: [0.5, 0.34], seg: { idle: [0, 4], ... } }) (src: a file in assets/clips/<place>/, or any URL, blob: too);
      // GOODBYE.flames(null) takes it down. Debug only: nothing shipped names one.
      flames(m) { if (!PL.clips) PL.clips = {}; if (m) PL.clips.flames = m; else delete PL.clips.flames; famSync(); return !!FF.want; },
      FF, famMove, famGust, famJump, famSided, famSide,
      // a candle blown out or lit by a test (the same calls the house makes), and the room's own blackout
      blowCandle, relightCandle, blackout, plateScale, plateScaleFor, famBlack, centredScale, wideCy, flameTip,
      get flameState() {
        return FF.w.map((w) => ({ st: w.st, seg: w.seg, mirror: w.mirror, base: w.base, seeking: w.seeking, fade: w.fade, mt: w.mt, ct: w.el.currentTime, lv: w.lv, a: famAlpha(w), pend: w.pend && w.pend.name, paused: w.el.paused }));
      },
      // where wick i is drawn (device px) and how big its flame is: for tests that sample it
      flameAt(i) {
        const f0 = FLAMES && FLAMES[i]; if (!f0) return null;
        const b = plateMap(f0), p = worldToScreen(b.x, b.y);
        return { x: p.x * DPR, y: p.y * DPR, len: f0.len * plateScale() * CAM.s * DPR, tilt: f0.tilt, dpr: DPR };
      },
      set afterDraw(fn) { DBG.after = typeof fn === 'function' ? fn : null; },
      FACE,
      // the board as a board clip's first frame: 1920 x 1080 (or 1080 x 1920 for 'port'), the board's 3:2 in the middle,
      // black around it (playBoard reads the middle 3:2 of the frame back onto the board)
      boardFrame(aspect) {
        renderBase();
        const port = aspect === 'port', c = document.createElement('canvas');
        c.width = port ? 1080 : 1920; c.height = port ? 1920 : 1080;
        const bw = port ? 1080 : 1620, bh = bw / 1.5;
        const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
        g.save(); g.translate((c.width - bw) / 2, (c.height - bh) / 2); g.scale(bw / 1200, bh / 800);
        g.drawImage(baseCv, 0, 0, 1200, 800);
        g.globalCompositeOperation = 'multiply'; g.fillStyle = PL.board.tint || 'rgb(232,204,168)';
        roundRectPath(g, 0, 0, 1200, 800, 34); g.fill(); g.restore();
        return c.toDataURL('image/png');
      },
      MEM, NET, VOICE, A, apiBase, liveMove, whisper, fetchVoice, CAM, BOARD, WORLD, FX,
      // restraint, the waiting line, the kept ones (phase 2), for tests
      chooseEvent, looksSpent, deadNow, endDead, enqueue, hauntedIn, keptChosen, nightSecs,
      // the safety section, for tests: the lists, and where each candle can be held
      safety: { refused, soundsLikeDistress, soundsLikeSelfHarm, soundsLikeAbuse, helpFor, soundsAfraid, wantsToStop, askedForFamily, plainForms, candleSpot, aimQuiet }, get halted() { return halt; },
      get scene() { return SC; }, get stage() { return stage(); },
      // a keyboard for a test: GOODBYE.keyboard({ px: 336, offset: 300 }) shrinks only the visual viewport by px (and scrolls it down by
      // offset); GOODBYE.keyboard(0) puts it back. Focus the box first: a keyboard is only up when a field has focus.
      keyboard(o) { const px = typeof o === 'object' && o ? +o.px : +o; VV.fake = px > 0 ? { px, offset: (typeof o === 'object' && o && +o.offset) || 0 } : null; readVV(); return { ...VV }; },
    };
  }
  requestAnimationFrame(rafLoop);
})();
