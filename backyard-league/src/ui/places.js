// Interactions with spots in the world (doors, shops, parents, desks...).
import { h, modal, btn, toast, money, ask } from './dom.js';
import { ITEMS, SHOPS, JOBS, SPORTS, FIELDS } from '../data/world.js';
import { KID_BY_ID, kidName } from '../data/kids.js';
import { rivalryRecord, hilltopRoster, HILLTOP_TEAM } from '../game/rivalry.js';
import { askParents, askChance, askQuestions, doChore, choresLeft, buy, recycleCans, jobUnlocked, jobReady, mowJobs, lemonadeCheck, generosityLimit, PITCH_ROUNDS, ASK_MAX, ASK_REASON_MIN, ASK_BIG_MAX } from '../game/economy.js';
import { addItem, hasItem, itemCount, playerGrade } from '../game/state.js';
import { register, canRegister, registrationChecklist, isRegistered, placeTrophy, TROPHY_SLOTS, kidOverall } from '../game/team.js';
import { askPrincipal, addPrep, SUBJECTS, makeQuiz } from '../game/school.js';
import { doTask } from '../game/social.js';
import { dayInfo, schoolBlockAt, formatTime } from '../game/time.js';
import { standings, joinLeague, teamOverall } from '../game/league.js';
import { SCIENCE } from '../data/questions.js';
import { openPhone } from './phone.js';
import { openMap } from './mapview.js';
import { claw, quiz } from './minigames.js';
import { startLemonade, startPaperRoute, startMowing } from './jobs.js';
import { sfx } from './audio.js';
import { openWait } from './wait.js';

export function handleSpot(game, kind, data, spot) {
  const s = game.state;
  const H = HANDLERS[kind];
  if (H) H(game, data, spot);
  else toast(`(${kind})`);
  game.hud.render();
}

const HANDLERS = {
  'hilltop-plaque'(game) {
    const rec = rivalryRecord(game.state);
    modal({ title: 'Hilltop Preparatory Academy', body: `A shiny brass plaque:\n\n"HILLTOP PREPARATORY ACADEMY. Founded 1902. Excellentia, Elegantia, Endowment. Proud keepers of the Crest Cup."\n\nSomebody scratched a tally underneath: Suncrest ${rec.w}, Hilltop ${rec.l}${rec.t ? `, ties ${rec.t}` : ''}.` });
  },
  'hilltop-scout'(game) {
    const s = game.state;
    const hawks = hilltopRoster(s);
    const body = h('div', {}, h('p', {}, `The ${HILLTOP_TEAM} run drills in matching tracksuits. A coach with a whistle made of actual gold yells "AGAIN!" You take notes.`),
      h('p', {}, h('b', {}, `Team OVR: ${teamOverall(s, HILLTOP_TEAM)}`), ` (yours: ${teamOverall(s, s.team.name)})`),
      ...hawks.map((id) => { const k = KID_BY_ID.get(id); const o = kidOverall(s, id); return h('div', { class: 'row' }, h('span', { style: { flex: 1 } }, `${kidName(k)}${k.routine.school.startsWith('Hilltop') ? '' : ' (scholarship)'}`), h('span', { class: 'muted' }, o.pos), h('span', { class: 'ovr' }, Math.round(o.rating))); }));
    modal({ title: '🔭 Scouting the Hawks', body, wide: true });
  },
  trophycase(game, data) {
    const cups = data.cups || [];
    const plate = (c) => h('div', { class: 'plate' }, h('div', { class: 'plate-title' }, 'CREST CUP CHAMPIONS'), h('div', {}, `${c.date ? `${c.date} · ` : ''}${c.label}`),
      h('div', { class: 'plate-score' }, `Suncrest Academy (${c.team}) ${c.score[1]}, Hilltop Prep Hawks ${c.score[0]}`), h('div', { class: 'muted' }, `Grade ${c.grade} League champions`));
    modal({
      title: '🏆 Suncrest Academy trophy case',
      body: h('div', {}, cups.length ? h('div', { class: 'plates' }, ...cups.map(plate)) : h('p', {}, 'Two dusty trophies: "Best Attendance 1998" and "Third Place, Regional Spelling Bee." There\'s an empty spot in the middle with a little sign: RESERVED FOR THE CREST CUP.'),
        h('p', { class: 'muted' }, 'Every time a Suncrest team beats Hilltop Prep in the Crest Cup, the cup goes in this case.')),
      wide: cups.length > 2,
    });
  },
  exit(game) { openMap(game); },
  'go-home'(game) { game.enter('home'); },
  basement(game) { game.engine.teleport(game.desc.spawnBasement.x, game.desc.spawnBasement.z, Math.PI); },
  upstairs(game) { game.engine.teleport(game.desc.spawnUpstairs.x, game.desc.spawnUpstairs.z, 0); },

  parents(game) {
    const s = game.state;
    const lim = generosityLimit(s);
    const amt = h('input', { type: 'range', min: 0, max: ASK_MAX, step: 1, value: Math.min(5, Math.round(lim)) });
    const label = h('div', { class: 'quiz-q' });
    const upd = () => { label.textContent = `Ask for ${money(+amt.value)}`; };
    amt.addEventListener('input', upd);
    upd();
    const ready = s.time.day >= s.parents.nextAskDay;
    const left = choresLeft(s);
    const body = h('div', {},
      h('p', {}, 'Need some money? You can always ask...'),
      ready ? h('div', {}, label, amt) : h('p', {}, `"You JUST asked us! Give it a few days." (Ask again on day ${s.parents.nextAskDay}.)`));
    const done = (r) => {
      sfx(r.ok ? 'coin' : 'bad');
      modal({ title: r.ok ? `+${money(r.amount)}!` : 'Nope.', body: `"${r.text}"` });
      game.hud.render();
    };
    modal({
      title: 'Mom & Dad',
      body,
      buttons: [
        ready ? { label: 'Ask for money', cls: 'green', onClick: () => {
          const v = +amt.value;
          const n = askQuestions(v, s);
          if (!n) { done(askParents(s, v)); return; }
          // $20-$100: answer their questions first.
          let good = 0;
          const round = (i) => {
            if (i >= n) { done(askParents(s, v, good)); return; }
            const R = PITCH_ROUNDS[i];
            modal({ title: `Asking for ${money(v)}${n > 1 ? ` (${i + 1}/${n})` : ''}`, body: R.q, dismissable: false,
              buttons: R.options.map((o) => ({ label: o.text, cls: 'white', onClick: () => { if (o.good) good++; round(i + 1); } })) });
          };
          round(0);
        } } : null,
        { label: left ? `Do a chore (20 min, +$1, ${left} left today)` : 'Chores all done today', cls: 'blue', disabled: !left, onClick: () => { const r = doChore(s); if (r.ok) game.skip(20); toast(r.ok ? `${r.text} It's now ${formatTime(s.time.minute)}.` : r.text, r.ok ? 'good' : ''); game.hud.render(); } },
        { label: 'Bye!', cls: 'white' },
      ].filter(Boolean),
    });
  },

  tv(game) { openWait(game, { tv: true }); },

  bed(game) {
    const s = game.state;
    if (s.time.minute < 19 * 60) {
      modal({ title: 'Bed', body: 'It\'s way too early to sleep. (You can go to bed after 7:00 PM.)', buttons: [{ label: 'Save game', cls: 'green', onClick: () => game.save() }, { label: 'OK', cls: 'white' }] });
      return;
    }
    modal({ title: 'Go to sleep?', body: 'The day ends and the game saves.', buttons: [{ label: 'Goodnight! 😴', cls: 'green', onClick: () => game.goToBed() }, { label: 'Not yet', cls: 'white' }] });
  },

  computer(game) {
    const s = game.state;
    const hwKey = `hw${s.time.day}`;
    modal({
      title: 'Your computer',
      body: 'Team HQ, online shopping for field upgrades, and (ugh) homework.',
      buttons: [
        { label: '🏟️ Team HQ', cls: 'green', onClick: () => openPhone(game, 'team') },
        { label: '🛒 Order upgrades', cls: 'blue', onClick: () => openPhone(game, 'field') },
        { label: s.flags[hwKey] ? 'Homework done ✓' : '📝 Do homework (45 min)', cls: 'purple', disabled: !!s.flags[hwKey] || s.time.minute < 14 * 60, onClick: () => {
          s.flags[hwKey] = true;
          for (const sub of SUBJECTS) addPrep(s, sub, 1);
          game.skip(45);
          toast('Homework done! +1 quiz prep in every subject.', 'good');
        } },
        { label: 'Close', cls: 'white' },
      ],
    });
  },

  garage(game) {
    const s = game.state;
    const items = Object.entries(s.inv.items).filter(([id]) => ITEMS[id] && ['equipment', 'drill'].includes(ITEMS[id].kind));
    modal({ title: 'Garage shelf', body: items.length ? items.map(([id, n]) => `${ITEMS[id].icon} ${ITEMS[id].name}${n > 1 ? ` x${n}` : ''}`).join('\n') : 'Just a dusty bike pump, a deflated pool float, and Dad\'s "fishing stuff." Buy equipment at the grocery store and the mall.' });
  },

  trophy(game) {
    const s = game.state;
    const list = h('div', {});
    const draw = () => {
      list.replaceChildren(...(s.inv.trophies.length ? s.inv.trophies.map((t) => h('div', { class: 'row', style: { margin: '6px 0' } },
        h('span', { style: { flex: 1 } }, `🏆 ${t.name}`, t.slot != null ? h('span', { class: 'pill good' }, `Shelf ${t.slot + 1}`) : h('span', { class: 'pill warn' }, 'In backpack')),
        ...Array.from({ length: TROPHY_SLOTS }, (_, i) => btn(`${i + 1}`, () => { placeTrophy(s, t.id, i); draw(); }, `small ${t.slot === i ? '' : 'white'}`)))) : [h('p', {}, 'No trophies yet. Win your first game to get a game ball!')]));
    };
    draw();
    modal({ title: 'Trophy Shelf (basement)', body: h('div', {}, h('p', { class: 'muted' }, 'Trophies on display make kids want to join your team. Trophies in your backpack don\'t count!'), list), wide: true, buttons: [{ label: 'Done', cls: 'green', onClick: () => { const p = game.engine.playerState; game.enter('home', { x: p.x, z: p.z, rot: p.rot }); } }] });
  },

  field(game) {
    const s = game.state;
    modal({
      title: `${s.team.name} HQ (the backyard)`,
      body: 'Tryouts and practices happen right here. Manage everything from your phone (Tab).',
      buttons: [{ label: '📱 Team tab', cls: 'green', onClick: () => openPhone(game, 'team') }, { label: 'Close', cls: 'white' }],
    });
  },

  lemonade(game) {
    const s = game.state;
    if (s.school.totalBan) { toast('You\'re grounded from jobs until your grades come up.', 'bad'); return; }
    const c = lemonadeCheck(s);
    if (!c.ok) { modal({ title: 'Lemonade stand', body: `${c.text}\n\nYou have: ${itemCount(s, 'lemonade')} cups of lemonade mix, ${itemCount(s, 'cups')} paper cups${hasItem(s, 'pitcher') ? ', a pitcher' : ''}.` }); return; }
    startLemonade(game);
  },

  shop(game, data) { openShop(game, data.shop); },

  claw(game) {
    const s = game.state;
    if (s.money < 0.5) { toast('You need 50¢.', 'bad'); return; }
    s.money -= 0.5;
    claw().then((prize) => {
      if (prize) { addItem(s, prize, 1); sfx('good'); toast(`You won a ${ITEMS[prize].name}! (Great gift.)`, 'good'); }
      else toast('So close! The claw is made of butter.', 'bad');
      game.skip(5);
    });
  },

  fountain(game) {
    const s = game.state;
    const key = `fountain${s.time.day}`;
    if (s.flags[key]) { toast('Mall Cop Randy is watching the fountain now. Better not.'); return; }
    s.flags[key] = true;
    const r = Math.random();
    if (r < 0.35) { s.money += 0.75; sfx('coin'); toast('You fished out 75¢ in wishing-fountain coins. Sorry, wishers.', 'money'); }
    else if (r < 0.6) { toast('"HEY! Out of the fountain!" Mall Cop Randy told your mom.', 'bad'); }
    else toast('Just pennies glued to the bottom. Somebody pranked the fountain.');
  },

  study(game) {
    const s = game.state;
    const pick = h('select', {}, ...SUBJECTS.map((sub) => h('option', { value: sub }, `${sub} (prep ${s.school.prep[sub] || 0})`)));
    modal({ title: 'Study session', body: h('div', {}, h('p', {}, 'Studying gives you hints and more time on quizzes.'), pick), buttons: [
      { label: 'Study 30 min', cls: 'green', onClick: () => { addPrep(s, pick.value, 2); game.skip(30); toast(`${pick.value} prep +2`, 'good'); } },
      { label: 'Never mind', cls: 'white' },
    ] });
  },

  league(game) {
    const s = game.state;
    const sp = SPORTS[s.team.sport];
    const list = registrationChecklist(s);
    const reg = canRegister(s);
    const body = h('div', {},
      h('p', {}, '"Welcome to the Suncrest Youth Sports League. Paperwork, please." - Commissioner Gertrude'),
      ...list.map((c) => h('div', { class: `check ${c.done ? 'done' : ''}` }, h('div', { class: 'mark' }, c.done ? '✓' : ''), h('div', {}, c.label, c.detail ? h('span', { class: 'muted' }, ` (${c.detail})`) : null))),
      isRegistered(s) ? h('p', { class: 'pill good' }, 'You are registered this season!') : null,
      s.league && s.league.schedule ? h('p', { class: 'muted' }, `Standings leader: ${standings(s)[0]?.name || '-'}`) : null);
    modal({
      title: 'League Desk', body, wide: true,
      buttons: [
        !isRegistered(s) ? { label: `Register (${money(sp.entryFee)})`, cls: 'green', disabled: !reg.ok, onClick: () => { const r = register(s); if (r.ok) { sfx('good'); toast(`The ${s.team.name} are registered! 🎉`, 'good'); for (const m of joinLeague(s)) toast(m, 'good'); toast('Set ticket, snack and merch prices in Phone > Field & Staff.', ''); game.hud.render(); } else toast(r.reason, 'bad'); } } : null,
        !s.team.permit ? { label: 'Buy park permit ($15)', cls: 'blue', onClick: () => { if (s.money < 15) { toast('Need $15.', 'bad'); return; } s.money -= 15; s.team.permit = true; toast('You can now rent Old Town Park (Phone > Field).', 'good'); } } : null,
        { label: 'Close', cls: 'white' },
      ].filter(Boolean),
    });
    if (!reg.ok && !isRegistered(s)) toast(reg.reason, '');
  },

  principal(game) {
    const s = game.state;
    modal({ title: 'Principal Plunkett', body: '"Yes? Make it quick, I have a meeting about the vending machine."', buttons: [
      { label: 'Can my team use the school field?', cls: 'green', onClick: () => { const r = askPrincipal(s); modal({ title: r.ok ? 'Yes!' : 'Not yet', body: r.text }); } },
      { label: 'Never mind', cls: 'white' },
    ] });
  },

  nurse(game) {
    const s = game.state;
    const block = dayInfo(s.time.day).isSchoolDay ? schoolBlockAt(s.time.minute) : null;
    const wk = Math.floor(s.time.day / 7);
    if (!block || block.kind !== 'class' || s.flags[`nurse${wk}`]) { modal({ title: 'Nurse Patty', body: s.flags[`nurse${wk}`] ? '"You again? You look FINE. Back to class."' : '"Feeling okay, sweetie? Here\'s a sticker."' }); return; }
    modal({ title: 'Nurse Patty', body: '"Tummy ache? Lie down for a bit." (Once a week you can skip a class here without getting marked absent.)', buttons: [
      { label: 'Lie down (skip this class)', cls: 'purple', onClick: () => { s.flags[`nurse${wk}`] = true; if (game.period) { game.period.excused = true; game.period.attended = true; } game.skip(Math.max(1, block.end - s.time.minute)); toast('You "rested." Nobody suspects a thing.'); } },
      { label: 'Never mind', cls: 'white' },
    ] });
  },

  recycle(game) {
    const r = recycleCans(game.state);
    sfx(r.ok ? 'coin' : 'bad');
    toast(r.text, r.ok ? 'money' : '');
  },

  sample(game) {
    const s = game.state;
    if (s.flags[`sample${s.time.day}`]) { toast('"One sample per customer, sweetie!"'); return; }
    s.flags[`sample${s.time.day}`] = true;
    addItem(s, 'pudding', 1);
    toast('Free sample! The lady slipped you an extra pudding cup for later. (+1 Pudding Cup)', 'good');
  },

  bulletin(game) {
    const s = game.state;
    const jobs = mowJobs(s);
    const lines = h('div', {});
    lines.appendChild(h('p', {}, '📌 Lost cat (answers to "Mr. Whiskers" but not to you). 📌 Garage sale Saturday! 📌 Piano lessons, $10.'));
    if (!jobUnlocked(s, 'mowing')) lines.appendChild(h('p', { class: 'muted' }, `🌱 Lawn mowing jobs need more experience. (Earn $${JOBS.mowing.unlock.earned} total from jobs first. You've earned ${money(s.jobs.earned)}.)`));
    else {
      if (!hasItem(s, 'push_mower')) lines.appendChild(h('p', { class: 'muted' }, 'You need a push mower (Sporting Goods, $60), or you can borrow Dad\'s for a 30% cut.'));
      for (const j of jobs) lines.appendChild(h('div', { class: 'row', style: { margin: '6px 0' } }, h('span', { style: { flex: 1 } }, `🌱 Mow ${j.who}'s lawn in ${j.hood} - $${j.pay}`),
        s.jobs.activeMow && s.jobs.activeMow.id === j.id ? h('span', { class: 'pill good' }, 'Accepted') : btn('Take it', () => { s.jobs.activeMow = j; toast(`Job accepted! Go to ${j.hood} (marked on the lawn).`, 'good'); m.close(); }, 'small green')));
    }
    if (!jobUnlocked(s, 'paper')) lines.appendChild(h('p', { class: 'muted' }, `📰 PAPER ROUTE: needs $${JOBS.paper.unlock.earned} earned.`));
    else lines.appendChild(h('p', {}, `📰 PAPER ROUTE: ${jobReady(s, 'paper') ? 'You\'re all set! Start it from your neighborhood street before school.' : 'You need a bike ($45) and a newspaper bag ($10) from Sporting Goods.'}`));
    const m = modal({ title: 'Community Bulletin Board', body: lines, wide: true });
  },

  trivia(game) {
    const s = game.state;
    const task = s.tasks.find((t) => t.trivia && t.loc === 'museum');
    const qs = makeQuiz(s, ['Science'], 3, 'trivia');
    quiz('Dino Trivia Challenge', qs, { seconds: 15, note: task ? `Win this for ${KID_BY_ID.get(task.kidId).first_name}!` : '' }).then((pct) => {
      game.skip(15);
      if (pct >= 66 && task) { const r = doTask(s, task.id); toast(r.text, 'good'); game.addTaskMarkers(); }
      else toast(pct >= 66 ? `${Math.round(pct)}%! You're a dino genius.` : `${Math.round(pct)}%. The T-Rex is disappointed in you.`, pct >= 66 ? 'good' : '');
    });
  },

  tire(game, data, spot) {
    const s = game.state;
    addItem(s, 'old_tire', 1);
    toast('You rolled home an old tire! The Tire Push drill (Strength) is unlocked.', 'good');
    sfx('good');
    game.removeSpot(spot);
  },

  task(game, data) {
    const s = game.state;
    const t = s.tasks.find((x) => x.id === data.taskId);
    if (!t) return;
    if (t.trivia) { HANDLERS.trivia(game); return; }
    ask(t.label, `This takes about ${t.minutes} minutes.${t.blame ? '\n\nYou\'ll get DETENTION tomorrow for this.' : ''}`, [{ label: 'Do it', value: true, cls: 'green' }, { label: 'Not now', value: false, cls: 'white' }]).then((yes) => {
      if (!yes) return;
      const r = doTask(s, t.id);
      game.skip(r.minutes);
      sfx('good');
      modal({ title: 'Done!', body: r.text });
      game.addTaskMarkers();
      game.refreshPresence(true);
    });
  },

  paper(game) {
    const s = game.state;
    if (!jobReady(s, 'paper')) { toast('You need the paper route equipment first.', 'bad'); return; }
    startPaperRoute(game);
  },

  mow(game) {
    const s = game.state;
    if (!hasItem(s, 'push_mower')) {
      ask('No mower!', 'Borrow Dad\'s mower? He takes 30% of the pay.', [{ label: 'Borrow it', value: true, cls: 'green' }, { label: 'Never mind', value: false, cls: 'white' }]).then((y) => { if (y) startMowing(game, true); });
      return;
    }
    startMowing(game, false);
  },
};

export function openShop(game, shopId) {
  const s = game.state;
  const shop = SHOPS[shopId];
  const items = Object.entries(ITEMS).filter(([, it]) => it.shop === shopId);
  const list = h('div', {});
  const draw = () => {
    list.replaceChildren(h('div', { class: 'row', style: { marginBottom: '6px' } }, h('b', {}, `You have ${money(s.money)}`)),
      ...items.map(([id, it]) => {
        const own = itemCount(s, id);
        const qty = id === 'team_shirt' ? Math.max(1, Math.max(SPORTS[s.team.sport].minRoster, s.team.roster.length) - s.team.shirts) : 1;
        const owned = (it.kind === 'equipment' || it.kind === 'drill') && own > 0;
        return h('div', { class: 'row', style: { margin: '6px 0', borderBottom: '1px dashed #d9c7a8', paddingBottom: '6px' } },
          h('span', { style: { fontSize: '24px' } }, it.icon),
          h('div', { style: { flex: 1 } }, h('b', {}, it.name), ' ', h('span', { class: 'muted' }, it.price ? money(it.price) : 'FREE'),
            it.like ? h('div', { class: 'muted' }, `Gift for kids who like ${it.like}`) : null,
            it.desc ? h('div', { class: 'muted' }, it.desc) : null,
            id === 'team_shirt' ? h('div', { class: 'muted' }, `You have ${s.team.shirts} shirts.`) : null,
            own && it.kind === 'gift' ? h('div', { class: 'muted' }, `You have ${own}.`) : null),
          owned ? h('span', { class: 'pill good' }, 'Owned') : h('div', { class: 'btn-row' },
            btn(`Buy${qty > 1 ? ` ${qty} (${money(it.price * qty)})` : ''}`, () => {
              const r = buy(s, id, qty);
              sfx(r.ok ? 'coin' : 'bad');
              toast(r.text, r.ok ? 'good' : 'bad');
              draw(); game.hud.render(); game.addTaskMarkers();
            }, 'small green', s.money + 1e-9 < it.price * qty ? { disabled: true } : {}),
            qty > 1 ? btn('Buy 1', () => { const r = buy(s, id, 1); toast(r.text, r.ok ? 'good' : 'bad'); draw(); game.hud.render(); game.addTaskMarkers(); }, 'small white') : null));
      }));
  };
  draw();
  modal({ title: shop.name, body: list, wide: true, buttons: [{ label: 'Done shopping', cls: 'white' }] });
}

export { FIELDS, playerGrade };

