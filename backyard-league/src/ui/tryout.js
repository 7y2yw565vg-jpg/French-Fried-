// Tryouts in the backyard: invited kids line up, run the drills you've unlocked
// (Sprints is a real 3D race), and you decide who makes the team.
import { $, h, clear, btn, modal, toast, gradeChip } from './dom.js';
import { KID_BY_ID, shortName } from '../data/kids.js';
import { STAT_NAMES } from '../data/world.js';
import { availableDrills, runDrill, sprintTime, signKid, MAX_ROSTER } from '../game/team.js';
import { addFriendship } from '../game/social.js';
import { kidGrade, heightOf, playerGrade } from '../game/state.js';
import { lookFromKid } from '../world2d/looks.js';
import { sfx } from './audio.js';

export function startTryout(game) {
  const s = game.state;
  const t = s.team.tryout;
  if (!t || t.done) return;
  t.done = true;
  if (s.school.sportsBan) { toast('You\'re grounded from sports. Tryout canceled!', 'bad'); return; }
  const ids = s.team.invites.filter((id) => KID_BY_ID.get(id));
  if (!ids.length) { toast('Nobody was invited, so nobody came. Invite kids first!', 'bad'); return; }
  if (game.mode === 'class') return;
  game.mode = 'tryout';
  game.desired = new Map();
  game.engine.clearNPCs();
  const f = game.desc.fieldInfo;
  const lineX = f.cx - 8;
  ids.forEach((id, i) => {
    const k = KID_BY_ID.get(id);
    const z = f.cz - (ids.length - 1) * 0.75 + i * 1.5;
    game.engine.addNPC({ id, look: lookFromKid(k, kidGrade(s, id), heightOf(s, id)), tag: k.first_name, x: lineX, z, rot: Math.PI / 2, mode: 'stand' });
  });
  game.engine.teleport(lineX - 2.5, f.cz, Math.PI / 2);
  game.engine.cinematic({ x: f.cx - 2, z: f.cz }, 16, { height: 9, spin: 0.02, angle: -0.6 });
  const results = new Map(ids.map((id) => [id, {}]));
  const ran = new Set();
  const panel = clear($('#panel'));
  const table = h('div', {});
  const drillRow = h('div', { class: 'btn-row' });
  const draw = () => {
    const codes = [...new Set([...ran].flatMap((d) => availableDrills(s).find((x) => x.id === d)?.stats || []))];
    table.replaceChildren(h('table', { class: 'list' },
      h('tr', {}, h('th', {}, 'Kid'), h('th', {}, 'Gr'), ...codes.map((c) => h('th', {}, STAT_NAMES[c])), h('th', {}, 'Notes')),
      ...ids.map((id) => h('tr', {}, h('td', {}, shortName(KID_BY_ID.get(id))), h('td', {}, kidGrade(s, id)),
        ...codes.map((c) => h('td', {}, results.get(id)[c] ? gradeChip(results.get(id)[c].label, 1) : '')),
        h('td', { class: 'muted' }, results.get(id).sprint ? `${results.get(id).sprint}s sprint` : '')))));
    drillRow.replaceChildren(...availableDrills(s).map((d) => btn(`${ran.has(d.id) ? '✓ ' : ''}${d.name}`, () => runOne(d), `small ${ran.has(d.id) ? 'white' : 'green'}`, ran.has(d.id) || busy ? { disabled: true } : {})),
      btn('Done with drills ➜ Pick your team', () => picks(), 'small', busy ? { disabled: true } : {}));
  };
  let busy = false;
  const runOne = async (d) => {
    busy = true; draw();
    const res = runDrill(s, d.id, ids);
    try {
      if (d.id === 'sprints') await sprintRace(game, ids, res, lineX, results);
      else await genericDrill(game, ids, d);
    } catch (err) { console.error(err); }
    for (const r of res) for (const [c, v] of Object.entries(r.values)) results.get(r.id)[c] = v;
    ran.add(d.id);
    game.skip(10);
    busy = false; draw();
  };
  const picks = () => {
    const box = h('div', {});
    const drawPicks = () => {
      box.replaceChildren(h('p', {}, `Roster: ${s.team.roster.length}/${MAX_ROSTER}. Kids you pass on will be a little sad.`),
        ...ids.map((id) => {
          const k = KID_BY_ID.get(id);
          const on = s.team.roster.includes(id);
          return h('div', { class: 'row', style: { margin: '6px 0' } }, h('b', { style: { flex: 1 } }, shortName(k)),
            ...Object.entries(results.get(id)).filter(([c]) => STAT_NAMES[c]).map(([c, v]) => h('span', { class: 'row' }, c, gradeChip(v.label, 1))),
            on ? h('span', { class: 'pill good' }, 'On the team!') : btn('✍️ Sign', () => {
              const r = signKid(s, id);
              if (r.ok) { addFriendship(s, id, 6); sfx('cheer'); const n = game.engine.npc(id); if (n) n.animOverride = 'cheer'; } else toast(r.reason, 'bad');
              drawPicks();
            }, 'small green'));
        }));
    };
    drawPicks();
    modal({ title: 'Pick your team', body: box, wide: true, dismissable: false, buttons: [{ label: 'Finish tryout', cls: 'green', onClick: finish }] });
  };
  const finish = () => {
    for (const id of ids) if (!s.team.roster.includes(id)) addFriendship(s, id, -3);
    s.team.invites = s.team.invites.filter((id) => !ids.includes(id));
    clear($('#panel'));
    game.mode = 'free';
    game.engine.follow();
    game.skip(30);
    game.refreshPresence(true);
    toast(`Tryout over! Your roster has ${s.team.roster.length} kid${s.team.roster.length === 1 ? '' : 's'}.`, 'good');
  };
  panel.appendChild(h('div', { class: 'card' }, h('h3', {}, `🏃 Tryout Day! ${ids.length} kid${ids.length > 1 ? 's' : ''} showed up.`),
    h('p', { class: 'muted' }, 'Run the drills you have unlocked. Each one reveals a stat. (Buy more drill equipment to learn more about the kids.)'), drillRow, table));
  draw();
}

async function sprintRace(game, ids, res, lineX, results) {
  const s = game.state;
  const e = game.engine;
  sfx('whistle');
  const runs = ids.map((id) => {
    const r = res.find((x) => x.id === id);
    const t = sprintTime(r.values.SPD.value, kidGrade(s, id));
    results.get(id).sprint = t.toFixed(2);
    const n = e.npc(id);
    if (!n) return Promise.resolve();
    const sp = 16 / (t * 0.65);
    return e.walkNPC(id, lineX + 16, n.char.root.position.z, sp);
  });
  await Promise.all(runs);
  sfx('cheer');
  await wait(600);
  await Promise.all(ids.map((id) => { const n = e.npc(id); return n ? e.walkNPC(id, lineX, n.char.root.position.z, 3) : null; }));
  for (const id of ids) { const n = e.npc(id); if (n) n.char.root.rotation.y = Math.PI / 2; }
}

async function genericDrill(game, ids, d) {
  const e = game.engine;
  sfx('whistle');
  for (const id of ids) {
    const n = e.npc(id);
    if (!n) continue;
    n.animOverride = d.id === 'jump' || d.id === 'pressure' ? 'cheer' : d.id === 'longtoss' || d.id === 'bucket' || d.id === 'catch' ? 'throw' : 'run';
    await wait(Math.max(250, 900 / ids.length));
    n.animOverride = null;
  }
  sfx('pop');
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

export { playerGrade };
