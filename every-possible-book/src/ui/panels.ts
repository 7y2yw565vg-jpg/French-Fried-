// The tabs on the right: presses, improvements, sealing, translation, catalog, forbidden,
// the stacks, the archive, the ledger and the settings.
import { h, clear, setText, toggle } from './dom';
import type { Game } from '../game';
import * as E from '../core/engine';
import {
  BUILDINGS,
  DRAWERS,
  LANGUAGES,
  PRESTIGE_UPGRADES,
  SECTIONS,
  OIL_REGEN,
  STACK_LEVEL_NAMES,
  UPGRADES,
  fmtMult,
  type Layer,
} from '../core/defs';
import { fmt, fmtInt, fmtRate, fmtTime } from '../core/format';
import { ACHIEVEMENTS } from '../core/achievements';
import { ALL_TEXTS, CAT_NAMES, TEXT_BY_ID, type TextCat } from '../content';
import { fillTemplate } from '../core/story';
import { FOREIGN_WORDS } from '../core/text';
import * as Stacks from '../core/stacks';
import { audio } from '../audio/audio';
import { confirmBox, openReader, textNumber } from './modals';
import { settings, saveSettings } from './settings';
import { exportString, importString, wipeSave } from '../core/save';
import { newState } from '../core/state';

export interface Panel {
  id: string;
  label: string;
  el: HTMLElement;
  visible: (g: Game) => boolean;
  update: (g: Game) => void;
  badge?: (g: Game) => number;
}

/** Calls `fn` with seconds spent hovering an element; feeds the prophecy. */
function hoverable(el: HTMLElement, game: Game, id: string): void {
  let since = 0;
  el.addEventListener('pointerenter', () => (since = performance.now()));
  el.addEventListener('pointerleave', () => {
    if (since) game.hover(id, (performance.now() - since) / 1000);
    since = 0;
  });
}

// ---------------------------------------------------------------------------------------------

function buildingsPanel(game: Game): Panel {
  const el = h('div', { class: 'panel-body' });
  const rows = BUILDINGS.map((b) => {
    const count = h('span', { class: 'count' });
    const cost = h('span', { class: 'cost' });
    const effect = h('div', { class: 'effect muted small' });
    const buy1 = h('button', { class: 'btn buy', onclick: () => { game.buyBuilding(b.id, 1); audio.click(); } }, 'Buy');
    const buy10 = h('button', { class: 'btn buy ghost', onclick: () => { game.buyBuilding(b.id, 10); audio.click(); } }, '×10');
    const buyMax = h('button', { class: 'btn buy ghost', onclick: () => { game.buyBuilding(b.id, Infinity); audio.click(); } }, 'Max');
    const row = h(
      'div',
      { class: 'card building', title: b.flavor },
      h('div', { class: 'card-head' }, h('span', { class: 'name' }, b.name), count),
      h('div', { class: 'desc small' }, b.desc),
      effect,
      h('div', { class: 'card-foot' }, cost, h('span', { class: 'buys' }, buy1, buy10, buyMax)),
    );
    hoverable(row, game, b.id);
    el.appendChild(row);
    return { b, row, count, cost, buy1, buy10, buyMax, effect };
  });
  const full = h('div', { class: 'notice warn' }, 'The shelves are full. The presses are waiting. Build shelf bays, or read faster.');
  el.prepend(full);
  return {
    id: 'presses',
    label: 'Presses',
    el,
    visible: () => true,
    update: (g) => {
      const s = g.s;
      const st = g.stats;
      const mods = st.mods;
      toggle(full, 'hidden', !(s.books >= st.capacity - 0.5 && st.printRate > 0));
      for (const r of rows) {
        const unlocked = E.isBuildingUnlocked(s, r.b.id);
        toggle(r.row, 'hidden', !unlocked);
        if (!unlocked) continue;
        setText(r.count, fmtInt(s.buildings[r.b.id]));
        const c1 = E.buildingCost(s, r.b.id, 1, mods);
        setText(r.cost, `${fmt(c1)} meaning`);
        r.buy1.disabled = s.meaning < c1;
        r.buy10.disabled = s.meaning < E.buildingCost(s, r.b.id, 10, mods);
        r.buyMax.disabled = s.meaning < c1;
        toggle(r.row, 'affordable', s.meaning >= c1);
        toggle(r.row, 'predicted', s.prophecy.current === r.b.id);
        let eff = '';
        const n = s.buildings[r.b.id];
        if (r.b.id === 'press') eff = `Printing ${fmtRate(st.printRate)} books/s`;
        else if (r.b.id === 'librarian') eff = `Reading ${fmtRate(st.readRate)} books/s`;
        else if (r.b.id === 'bay') eff = `Room for ${fmtInt(st.capacity)} books`;
        else if (r.b.id === 'indexer') eff = `+${fmtInt(n * 15)}% meaning per book`;
        else if (r.b.id === 'binder') eff = `+${fmtInt(n * 10)}% print speed`;
        else if (r.b.id === 'lexicographer') eff = `Sentence chance ${(st.sentenceChance * 100).toFixed(1)}% per book`;
        else if (r.b.id === 'clerk') eff = `${fmtRate(st.cardRate)} cards/s`;
        else if (r.b.id === 'nightreader') eff = `Forbidden reading ×${st.forbiddenRate.toFixed(2)}`;
        setText(r.effect, eff);
      }
    },
  };
}

function upgradesPanel(game: Game): Panel {
  const el = h('div', { class: 'panel-body' });
  const empty = h('p', { class: 'muted' }, 'Nothing to improve yet. Keep reading.');
  const list = h('div', { class: 'grid-cards' });
  const owned = h('details', { class: 'owned' }, h('summary', null, 'Already in the library'));
  const ownedList = h('div', { class: 'owned-list small muted' });
  owned.appendChild(ownedList);
  el.append(empty, list, owned);
  const cards = new Map<string, { row: HTMLElement; btn: HTMLButtonElement }>();
  let ownedKey = '';
  for (const u of UPGRADES) {
    const btn = h('button', { class: 'btn buy', onclick: () => { game.buyUpgrade(u.id); audio.click(); } }, `${fmt(u.cost)}`) as HTMLButtonElement;
    const row = h('div', { class: 'card upgrade', title: u.flavor }, h('div', { class: 'name' }, u.name), h('div', { class: 'desc small' }, u.desc), h('div', { class: 'flavor small' }, u.flavor), h('div', { class: 'card-foot' }, btn));
    hoverable(row, game, u.id);
    cards.set(u.id, { row, btn });
  }
  return {
    id: 'improve',
    label: 'Improvements',
    el,
    visible: (g) => g.s.booksRead >= 10 || g.s.shelfPrestiges > 0,
    badge: (g) => UPGRADES.filter((u) => E.upgradeAvailable(g.s, u.id) && g.s.meaning >= u.cost).length,
    update: (g) => {
      const s = g.s;
      const avail = UPGRADES.filter((u) => E.upgradeAvailable(s, u.id)).sort((a, b) => a.cost - b.cost);
      toggle(empty, 'hidden', avail.length > 0);
      const want = avail.map((u) => u.id);
      const have = [...list.children].map((c) => (c as HTMLElement).dataset.id);
      if (want.join() !== have.join()) {
        clear(list);
        for (const id of want) {
          const c = cards.get(id)!;
          c.row.dataset.id = id;
          list.appendChild(c.row);
        }
      }
      for (const u of avail) {
        const c = cards.get(u.id)!;
        c.btn.disabled = s.meaning < u.cost;
        toggle(c.row, 'affordable', s.meaning >= u.cost);
        toggle(c.row, 'predicted', s.prophecy.current === u.id);
      }
      const ok = Object.keys(s.upgrades).join();
      if (ok !== ownedKey) {
        ownedKey = ok;
        clear(ownedList);
        for (const id of Object.keys(s.upgrades)) {
          const u = UPGRADES.find((x) => x.id === id);
          if (u) ownedList.appendChild(h('div', null, h('b', null, u.name), ' — ', u.desc));
        }
      }
    },
  };
}

// ---------------------------------------------------------------------------------------------

const LAYER_INFO: Record<Layer, { title: string; currency: string; verb: string; resets: string; flavor: string }> = {
  shelf: {
    title: 'Seal the Shelf',
    currency: 'Shelves',
    verb: 'Seal the shelf',
    resets: 'Resets meaning, books, buildings and improvements.',
    flavor: 'Press the wax. The shelf goes dark, and so does a little of what you remember.',
  },
  floor: {
    title: 'Seal the Floor',
    currency: 'Floors',
    verb: 'Seal the floor and climb',
    resets: 'Also resets shelves, shelf upgrades and translation.',
    flavor: 'Every shelf on the floor at once. Then the stair that was always behind them.',
  },
  wing: {
    title: 'Open a Wing',
    currency: 'Wings',
    verb: 'Open a wing',
    resets: 'Also resets floors, floor upgrades and the catalog.',
    flavor: 'At the top of the tower, a door, and more library going out sideways over nothing.',
  },
};

function sealPanel(game: Game): Panel {
  const el = h('div', { class: 'panel-body' });
  const sections = (['shelf', 'floor', 'wing'] as Layer[]).map((layer) => {
    const info = LAYER_INFO[layer];
    const have = h('span', { class: 'big-num' });
    const gain = h('div', { class: 'gain' });
    const req = h('div', { class: 'muted small' });
    const bonus = h('div', { class: 'small' });
    const btn = h('button', { class: 'btn primary seal-btn' }, info.verb) as HTMLButtonElement;
    btn.addEventListener('click', () => {
      const g = layer === 'shelf' ? E.shelfGain(game.s) : layer === 'floor' ? E.floorGain(game.s) : E.wingGain(game.s);
      const first = layer === 'shelf' ? game.s.shelfPrestiges === 0 : layer === 'floor' ? game.s.floorPrestiges === 0 : game.s.wingPrestiges === 0;
      const go = () => game.seal(layer);
      if (settings.confirmSeal || first) confirmBox(info.title, `${info.flavor}\n\nYou will gain ${fmtInt(g)} ${info.currency.toLowerCase()}. ${info.resets}`, info.verb, go);
      else go();
    });
    const ups = PRESTIGE_UPGRADES.filter((u) => u.layer === layer).map((u) => {
      const lvl = h('span', { class: 'count' });
      const desc = h('div', { class: 'desc small' });
      const b = h('button', { class: 'btn buy', onclick: () => { game.buyPrestige(u.id); audio.click(); } }) as HTMLButtonElement;
      const row = h('div', { class: 'card pupgrade', title: u.flavor }, h('div', { class: 'card-head' }, h('span', { class: 'name' }, u.name), lvl), desc, h('div', { class: 'flavor small' }, u.flavor), h('div', { class: 'card-foot' }, b));
      hoverable(row, game, u.id);
      return { u, row, lvl, desc, b };
    });
    const upList = h('div', { class: 'grid-cards' }, ...ups.map((x) => x.row));
    const box = h(
      'section',
      { class: `layer layer-${layer}` },
      h('h3', null, info.title),
      h('div', { class: 'row between' }, h('div', null, have, h('span', { class: 'muted' }, ` ${info.currency.toLowerCase()} to spend`)), btn),
      gain,
      req,
      bonus,
      upList,
    );
    el.appendChild(box);
    return { layer, box, have, gain, req, btn, ups, bonus };
  });
  return {
    id: 'seal',
    label: 'Seal',
    el,
    visible: (g) => g.s.runMeaning >= 2000 || g.s.shelfPrestiges > 0,
    badge: (g) => (E.shelfGain(g.s) >= Math.max(1, g.s.floorShelves) ? 1 : 0),
    update: (g) => {
      const s = g.s;
      const mods = g.stats.mods;
      for (const sec of sections) {
        const shown = sec.layer === 'shelf' || (sec.layer === 'floor' ? s.shelfPrestiges >= 3 || s.floorPrestiges > 0 : s.floorPrestiges >= 3 || s.wingPrestiges > 0);
        toggle(sec.box, 'hidden', !shown);
        if (!shown) continue;
        const cur = E.layerCurrency(s, sec.layer);
        setText(sec.have, fmtInt(cur));
        const gain = sec.layer === 'shelf' ? E.shelfGain(s, mods) : sec.layer === 'floor' ? E.floorGain(s, mods) : E.wingGain(s, mods);
        sec.btn.disabled = gain <= 0;
        setText(sec.gain, gain > 0 ? `Sealing now would give ${fmtInt(gain)} ${LAYER_INFO[sec.layer].currency.toLowerCase()}.` : '');
        setText(
          sec.req,
          sec.layer === 'shelf'
            ? gain > 0 ? `This shelf: ${fmt(s.runMeaning)} meaning found. Sealed so far this floor: ${fmtInt(s.floorShelves)}.` : `Find ${fmt(1e4)} meaning on this shelf to seal it (${fmt(s.runMeaning)} so far).`
            : sec.layer === 'floor'
              ? `Shelves sealed on this floor: ${fmtInt(s.floorShelves)}${gain > 0 ? '' : ` of ${fmtInt(E.FLOOR_REQ)} needed`}.`
              : `Floors sealed in this wing: ${fmtInt(s.wingFloors)}${gain > 0 ? '' : ` of ${fmtInt(E.WING_REQ)} needed`}.`,
        );
        setText(
          sec.bonus,
          sec.layer === 'shelf'
            ? `Sealed shelves multiply meaning by ${fmtMult(Math.sqrt(1 + s.floorShelves))}.`
            : sec.layer === 'floor'
              ? `Sealed floors multiply meaning by ${fmtMult((1 + s.wingFloors) * (1 + 0.05 * s.floorsLifetime))}.`
              : `Wings multiply meaning by ${fmtMult(1 + s.wingsLifetime)} and floors by ${fmtMult(1 + 0.25 * s.wingsLifetime)}.`,
        );
        for (const u of sec.ups) {
          const shownU = !u.u.req || u.u.req(s);
          toggle(u.row, 'hidden', !shownU);
          const l = E.level(s, u.u.id);
          setText(u.lvl, `${l}/${u.u.max}`);
          setText(u.desc, u.u.desc(Math.max(l, 1)));
          const maxed = l >= u.u.max;
          u.b.textContent = maxed ? 'Complete' : `${fmtInt(E.prestigeUpgradeCost(s, u.u.id))} ${LAYER_INFO[sec.layer].currency.toLowerCase()}`;
          u.b.disabled = !E.canBuyPrestige(s, u.u.id);
          toggle(u.row, 'affordable', E.canBuyPrestige(s, u.u.id));
          toggle(u.row, 'predicted', s.prophecy.current === u.u.id);
        }
      }
    },
  };
}

// ---------------------------------------------------------------------------------------------

function translationPanel(game: Game): Panel {
  const el = h('div', { class: 'panel-body' });
  const head = h('div', { class: 'row between' });
  const free = h('span');
  const mult = h('span', { class: 'muted small' });
  head.append(free, mult);
  el.append(
    h('p', { class: 'muted small' }, 'Some books are printed in other alphabets. A translation machine assigned to a tongue slowly learns it, and everything you read is worth more. Build machines with shelves, in the Seal tab.'),
    head,
  );
  const rows = LANGUAGES.map((l) => {
    const fl = h('div', { class: 'fluency' });
    const as = h('span', { class: 'count' });
    const sample = h('div', { class: `sample script-${l.script}` }, FOREIGN_WORDS[l.id === 'mirror' ? 'latin' : (l.id as keyof typeof FOREIGN_WORDS)]?.slice(0, 4).join(' ') || '');
    const minus = h('button', { class: 'btn ghost small', onclick: () => game.assign(l.id, -1) }, '−');
    const plus = h('button', { class: 'btn small', onclick: () => game.assign(l.id, 1) }, '+');
    const lock = h('div', { class: 'muted small' }, `Locked: ${l.unlockText}`);
    const meter = h('div', { class: 'meter' }, h('div', { class: 'meter-fill' }));
    const row = h(
      'div',
      { class: 'card lang' },
      h('div', { class: 'card-head' }, h('span', { class: 'name' }, l.name), h('span', { class: 'assign' }, minus, as, plus)),
      sample,
      h('div', { class: 'desc small' }, l.desc),
      fl,
      meter,
      lock,
    );
    el.appendChild(row);
    return { l, row, fl, as, minus, plus, lock, meter, sample };
  });
  return {
    id: 'translate',
    label: 'Translation',
    el,
    visible: (g) => g.s.shelfPrestiges > 0 || g.s.floorPrestiges > 0,
    update: (g) => {
      const s = g.s;
      setText(free, `Machines: ${E.machinesFree(s)} free of ${E.machinesBuilt(s)}`);
      let m = 1;
      for (const l of LANGUAGES) m *= 1 + l.weight * s.translation.fluency[l.id];
      setText(mult, `All meaning ×${fmtMult(m)}`);
      for (const r of rows) {
        const open = r.l.unlock(s);
        toggle(r.lock, 'hidden', open);
        toggle(r.row, 'locked', !open);
        r.plus.disabled = !open || E.machinesFree(s) <= 0;
        r.minus.disabled = !open || s.translation.assigned[r.l.id] <= 0;
        setText(r.as, String(s.translation.assigned[r.l.id]));
        const f = s.translation.fluency[r.l.id];
        setText(r.fl, `Fluency ${f.toFixed(2)} · meaning ×${(1 + r.l.weight * f).toFixed(2)}`);
        const next = [1, 4, 9].find((x) => x > f) ?? 9;
        (r.meter.firstChild as HTMLElement).style.width = `${Math.min(100, (f / next) * 100)}%`;
        r.sample.style.transform = r.l.id === 'mirror' ? 'scaleX(-1)' : '';
      }
    },
  };
}

// ---------------------------------------------------------------------------------------------

function catalogPanel(game: Game): Panel {
  const el = h('div', { class: 'panel-body' });
  const cards = h('span', { class: 'big-num' });
  const rate = h('span', { class: 'muted small' });
  el.append(
    h('p', { class: 'muted small' }, 'Catalog clerks write cards. File them in a drawer and the drawer lends its strength to the library. Cards are kept until a wing is opened.'),
    h('div', { class: 'row between' }, h('div', null, cards, h('span', { class: 'muted' }, ' cards')), rate),
  );
  const rows = DRAWERS.map((d) => {
    const filed = h('span', { class: 'count' });
    const eff = h('div', { class: 'small' });
    const mk = (label: string, amt: () => number) => h('button', { class: 'btn small ghost', onclick: () => game.file(d.id, amt()) }, label);
    const row = h(
      'div',
      { class: 'card drawer' },
      h('div', { class: 'card-head' }, h('span', { class: 'name' }, d.name), filed),
      h('div', { class: 'desc small muted' }, d.desc),
      eff,
      h('div', { class: 'card-foot' }, mk('10', () => 10), mk('100', () => 100), mk('25%', () => game.s.catalog.cards * 0.25), mk('All', () => game.s.catalog.cards)),
    );
    el.appendChild(row);
    return { d, row, filed, eff };
  });
  const select = h('select', { class: 'select' }, ...(Object.keys(CAT_NAMES) as TextCat[]).map((c) => h('option', { value: c }, CAT_NAMES[c]))) as HTMLSelectElement;
  const qbtn = h('button', { class: 'btn', onclick: () => { if (game.query(select.value)) audio.chime(2); } }, `Search the catalog (${E.QUERY_COST} cards)`) as HTMLButtonElement;
  const qstate = h('div', { class: 'muted small' });
  el.append(h('section', { class: 'layer' }, h('h3', null, 'Search'), h('p', { class: 'muted small' }, 'Ask the clerks for a particular kind of page. The next page that makes sense will be of that kind, if any is waiting to be found.'), h('div', { class: 'row' }, select, qbtn), qstate));
  return {
    id: 'catalog',
    label: 'Catalog',
    el,
    visible: (g) => g.s.floorPrestiges > 0 || g.s.wingPrestiges > 0,
    update: (g) => {
      const s = g.s;
      setText(cards, fmtInt(s.catalog.cards));
      setText(rate, `${fmtRate(g.stats.cardRate)} per second`);
      for (const r of rows) {
        const locked = r.d.id === 'prophecies' && s.wingPrestiges < 1;
        toggle(r.row, 'locked', locked);
        setText(r.filed, fmtInt(s.catalog.drawers[r.d.id]));
        setText(r.eff, locked ? 'Opens with the first wing.' : r.d.effectText(s.catalog.drawers[r.d.id]));
      }
      qbtn.disabled = s.catalog.cards < E.QUERY_COST || !!s.catalog.query;
      setText(qstate, s.catalog.query ? `The clerks are looking for ${CAT_NAMES[s.catalog.query as TextCat].toLowerCase()}.` : '');
    },
  };
}

// ---------------------------------------------------------------------------------------------

function forbiddenPanel(game: Game): Panel {
  const el = h('div', { class: 'panel-body' });
  const dread = h('div', { class: 'meter dread' }, h('div', { class: 'meter-fill' }));
  const dreadText = h('div', { class: 'small' });
  const keys = h('div', { class: 'keys' });
  el.append(
    h('p', { class: 'muted small' }, 'Each forbidden section is read slowly, under dread. While a section is open, everything means more; when one is finished it gives up a key. If dread reaches its limit, the library reads you back.'),
    h('div', { class: 'dread-box' }, h('div', { class: 'row between' }, h('b', null, 'Dread'), dreadText), dread),
    keys,
  );
  const rows = SECTIONS.map((sec) => {
    const prog = h('div', { class: 'meter' }, h('div', { class: 'meter-fill' }));
    const status = h('div', { class: 'small' });
    const btn = h('button', { class: 'btn' }) as HTMLButtonElement;
    btn.addEventListener('click', () => {
      const s = game.s;
      if (!s.forbidden.unlocked[sec.id]) {
        confirmBox(sec.name, `${sec.desc}\n\nUnlocking it costs ${sec.cost} wing${sec.cost > 1 ? 's' : ''}.`, 'Turn the key', () => { game.unlockSection(sec.id); audio.dread(); });
      } else game.toggleSection(sec.id, !s.forbidden.open[sec.id]);
      audio.click();
    });
    const row = h('div', { class: 'card section' }, h('div', { class: 'card-head' }, h('span', { class: 'name' }, sec.name)), h('div', { class: 'desc small muted' }, sec.desc), prog, h('div', { class: 'card-foot' }, status, btn));
    el.appendChild(row);
    return { sec, row, prog, status, btn };
  });
  return {
    id: 'forbidden',
    label: 'Forbidden',
    el,
    visible: (g) => g.s.wingPrestiges > 0,
    update: (g) => {
      const s = g.s;
      const f = s.forbidden;
      (dread.firstChild as HTMLElement).style.width = `${Math.min(100, f.dread)}%`;
      setText(dreadText, `${f.dread.toFixed(0)} / 100${f.overruns ? ` · overrun ${f.overruns}×` : ''}`);
      const kk = f.keys.join('|');
      if (keys.dataset.k !== kk) {
        keys.dataset.k = kk;
        clear(keys);
        if (f.keys.length) keys.append(h('b', null, 'Keys: '), f.keys.join(' · '));
      }
      for (const r of rows) {
        const done = f.progress[r.sec.id] >= 1;
        const unlocked = f.unlocked[r.sec.id];
        const open = f.open[r.sec.id];
        (r.prog.firstChild as HTMLElement).style.width = `${f.progress[r.sec.id] * 100}%`;
        toggle(r.row, 'open', open);
        toggle(r.row, 'done', done);
        if (done) {
          setText(r.status, `Read. ${r.sec.key}.`);
          r.btn.classList.add('hidden');
        } else if (!unlocked) {
          setText(r.status, `${r.sec.cost} wing${r.sec.cost > 1 ? 's' : ''} to unlock`);
          r.btn.textContent = 'Unlock';
          r.btn.disabled = s.wings < r.sec.cost;
        } else {
          setText(r.status, open ? `Reading… ${(f.progress[r.sec.id] * 100).toFixed(1)}% · +${(r.sec.dread * g.stats.dreadRate).toFixed(2)} dread/s` : `${(f.progress[r.sec.id] * 100).toFixed(1)}% read`);
          r.btn.textContent = open ? 'Close the door' : 'Open the door';
          r.btn.disabled = false;
        }
      }
    },
  };
}

// ---------------------------------------------------------------------------------------------

const HEX_DESC: Record<string, string> = {
  start: 'The gallery you came down into. A stair goes back up, but you do not take it.',
  gallery: 'A hexagonal gallery: four walls of shelves, two doorways, a stair in the middle. The books are noise.',
  desk: 'A desk, and someone’s things left on it.',
  echo: 'A voice that is not quite here.',
  lamp: 'A lamp, still half full.',
  mirror: 'A small mirror by the stair. Something written in it, backwards.',
  stair: 'The stair down, and a lock on it.',
  book: 'A lectern. On it, the book nobody printed.',
  furnace: 'A furnace, breathing low and red.',
  door: 'A door, ordinary, swollen in its frame. Daylight at its edges.',
  void: 'Nothing. Not darkness: nothing.',
};

function stacksPanel(game: Game, actions: { readBook: () => void; burn: () => void; abandon: () => void; mirror: () => void }): Panel {
  const el = h('div', { class: 'panel-body' });
  const level = h('h3');
  const oil = h('div', { class: 'oil' });
  const warm = h('div', { class: 'meter warm' }, h('div', { class: 'meter-fill' }));
  const warmText = h('div', { class: 'small muted' });
  const here = h('div', { class: 'card' });
  const act = h('div', { class: 'row wrap' });
  const lantern = h('button', { class: 'btn', onclick: () => game.buyStacks('lanterns') }) as HTMLButtonElement;
  const wick = h('button', { class: 'btn', onclick: () => game.buyStacks('wicks') }) as HTMLButtonElement;
  el.append(
    level,
    h('p', { class: 'muted small' }, 'Click a lit gallery next to the lamp to walk into it. Each new gallery uses a measure of oil; the lamp refills slowly. The warmer the light, the nearer you are to what this level hides.'),
    oil,
    h('div', { class: 'row between small' }, h('span', null, 'Warmth'), warmText),
    warm,
    here,
    act,
    h('section', { class: 'layer' }, h('h3', null, 'Lamp'), h('div', { class: 'row wrap' }, lantern, wick)),
  );
  let actKey = '';
  return {
    id: 'stacks',
    label: 'Stacks',
    el,
    visible: (g) => !!g.s.stacks,
    update: (g) => {
      const s = g.s;
      const st = s.stacks;
      if (!st) return;
      setText(level, `${STACK_LEVEL_NAMES[st.level]} — level ${st.level + 1} of 7`);
      const max = Stacks.oilMax(st);
      const pips = '●'.repeat(Math.min(max + 2, Math.floor(st.oil))) + '○'.repeat(Math.max(0, max - Math.floor(st.oil)));
      setText(oil, `Oil ${pips}  ${st.oil < max ? `(next in ${Math.ceil((OIL_REGEN - st.oilTimer) / Math.max(0.01, g.stats.oilRegen))}s)` : ''}`);
      const w = Stacks.warmth(st);
      (warm.firstChild as HTMLElement).style.width = `${w * 100}%`;
      setText(warmText, w > 0.85 ? 'burning' : w > 0.6 ? 'warm' : w > 0.35 ? 'tepid' : 'cold');
      const hx = Stacks.getHex(st, st.pos.q, st.pos.r)!;
      const key = `${hx.q},${hx.r}|${hx.kind}|${s.forbidden.keys.length}|${st.level}`;
      if (key !== actKey) {
        actKey = key;
        clear(here);
        here.append(h('div', { class: 'name' }, hx.kind === 'gallery' || hx.kind === 'start' ? 'A gallery' : hx.kind[0].toUpperCase() + hx.kind.slice(1)), h('div', { class: 'desc small' }, HEX_DESC[hx.kind] || ''));
        clear(act);
        if (hx.kind === 'stair') {
          const k = Stacks.stairKey(st.level);
          const can = Stacks.canDescend(s);
          act.append(h('button', { class: 'btn primary', disabled: !can, onclick: () => game.descend() }, can ? `Use ${k} and go down` : `Locked. It wants ${k}.`));
        }
        if (hx.kind === 'mirror') act.append(h('button', { class: 'btn', onclick: actions.mirror }, 'Read the mirror'));
        if (hx.kind === 'book') act.append(h('button', { class: 'btn primary', onclick: actions.readBook }, 'Open the book'));
        if (hx.kind === 'furnace') {
          const has = s.forbidden.keys.includes('The Match');
          act.append(h('button', { class: 'btn danger', disabled: !has, onclick: actions.burn }, has ? 'Strike the match' : 'You have nothing to light it with'));
        }
        if (hx.kind === 'door') act.append(h('button', { class: 'btn', onclick: actions.abandon }, 'Put your shoulder to the door'));
      }
      const lc = Stacks.upgradeCost(s, 'lanterns');
      const wc = Stacks.upgradeCost(s, 'wicks');
      lantern.textContent = st.lanterns >= Stacks.STACK_UPGRADE_MAX.lanterns ? 'Lanterns: complete' : `Trim the lantern (${st.lanterns}): faster oil — ${fmt(lc)}`;
      lantern.disabled = s.meaning < lc || st.lanterns >= Stacks.STACK_UPGRADE_MAX.lanterns;
      wick.textContent = st.wicks >= Stacks.STACK_UPGRADE_MAX.wicks ? 'Wicks: complete' : `A longer wick (${st.wicks}): more oil, more light — ${fmt(wc)}`;
      wick.disabled = s.meaning < wc || st.wicks >= Stacks.STACK_UPGRADE_MAX.wicks;
    },
  };
}

// ---------------------------------------------------------------------------------------------

function archivePanel(game: Game): Panel {
  const el = h('div', { class: 'panel-body' });
  const count = h('div', { class: 'muted small' });
  const filter = h('select', { class: 'select' }, h('option', { value: '' }, 'Everything'), ...(Object.keys(CAT_NAMES) as TextCat[]).map((c) => h('option', { value: c }, CAT_NAMES[c]))) as HTMLSelectElement;
  const list = h('ol', { class: 'archive' });
  el.append(h('div', { class: 'row between' }, count, filter), list);
  let key = '';
  filter.addEventListener('change', () => (key = ''));
  return {
    id: 'archive',
    label: 'Archive',
    el,
    visible: (g) => g.s.texts.found.length > 0,
    badge: (g) => g.s.texts.unread.length,
    update: (g) => {
      const s = g.s;
      setText(count, `${s.texts.found.length} of ${ALL_TEXTS.length} pages that make sense`);
      const k = `${s.texts.found.length}|${s.texts.unread.length}|${filter.value}`;
      if (k === key) return;
      key = k;
      clear(list);
      const ids = [...s.texts.found].reverse().filter((id) => !filter.value || TEXT_BY_ID[id]?.cat === filter.value);
      const order = [...s.texts.found];
      for (const id of ids) {
        const t = TEXT_BY_ID[id];
        if (!t) continue;
        const unread = s.texts.unread.includes(id);
        list.appendChild(
          h(
            'li',
            { class: `arch ${unread ? 'unread' : ''}`, onclick: () => { openReader(game, id, order); key = ''; } },
            h('span', { class: 'arch-no' }, `${textNumber(id)}`),
            h('span', { class: 'arch-title' }, fillTemplate(s, t.title)),
            h('span', { class: 'arch-cat muted small' }, CAT_NAMES[t.cat]),
          ),
        );
      }
    },
  };
}

function ledgerPanel(): Panel {
  const el = h('div', { class: 'panel-body' });
  const stats = h('dl', { class: 'stats' });
  const ach = h('div', { class: 'achievements' });
  el.append(h('h3', null, 'The Ledger'), stats, h('h3', null, 'Achievements'), ach);
  let akey = '';
  return {
    id: 'ledger',
    label: 'Ledger',
    el,
    visible: () => true,
    update: (g) => {
      const s = g.s;
      const st = g.stats;
      const rows: [string, string][] = [
        ['Time in the library', fmtTime(s.playTime)],
        ['On this shelf', fmtTime(s.runTime)],
        ['Meaning per second', fmt(st.meaningPerSec)],
        ['Meaning found, all told', fmt(s.lifetimeMeaning)],
        ['Books printed', fmt(s.booksPrinted)],
        ['Books read', fmt(s.booksRead)],
        ['Words recognised', fmt(s.words)],
        ['Sentences overheard', fmt(s.sentences)],
        ['Lucid pages solved', `${s.puzzlesSolved} (${s.puzzlesPerfect} perfect)`],
        ['Shelves / floors / wings sealed', `${s.shelfPrestiges} / ${s.floorPrestiges} / ${s.wingPrestiges}`],
        ['All meaning multiplied by', fmtMult(st.globalMult)],
        ['Pages that make sense', `${s.texts.found.length} of ${ALL_TEXTS.length}`],
        ...(s.prophecy.active ? ([['Prophecies fulfilled / defied', `${s.prophecy.fulfilled} / ${s.prophecy.defied}`]] as [string, string][]) : []),
        ['Fraction of every possible book', `${(s.booksPrinted > 0 ? Math.log10(s.booksPrinted) / 1834097 : 0).toExponential(3)}`],
      ];
      clear(stats);
      for (const [a, b] of rows) stats.append(h('dt', null, a), h('dd', null, b));
      const k = Object.keys(s.achievements).length;
      if (String(k) !== akey) {
        akey = String(k);
        clear(ach);
        for (const a of ACHIEVEMENTS) {
          const got = !!s.achievements[a.id];
          ach.append(h('div', { class: `ach ${got ? 'got' : ''}`, title: got || !a.hidden ? a.desc : 'Hidden' }, h('div', { class: 'ach-name' }, got || !a.hidden ? a.name : '? ? ?'), h('div', { class: 'ach-desc small muted' }, got || !a.hidden ? a.desc : 'Something only you can do.')));
        }
      }
    },
  };
}

function settingsPanel(game: Game, ui: { resetView: () => void }): Panel {
  const el = h('div', { class: 'panel-body' });
  const slider = (label: string, key: 'master' | 'drone' | 'sfx' | 'textSize', min = 0, max = 1, step = 0.05) => {
    const input = h('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(settings[key]) }) as HTMLInputElement;
    input.addEventListener('input', () => {
      settings[key] = Number(input.value);
      saveSettings();
    });
    return h('label', { class: 'setting' }, h('span', null, label), input);
  };
  const check = (label: string, key: 'muted' | 'reducedMotion' | 'confirmSeal') => {
    const input = h('input', { type: 'checkbox', checked: settings[key] }) as HTMLInputElement;
    input.addEventListener('change', () => {
      settings[key] = input.checked;
      saveSettings();
    });
    return h('label', { class: 'setting check' }, input, h('span', null, label));
  };
  const notation = h('select', { class: 'select' }, h('option', { value: 'words' }, '1.5M, 2.3B…'), h('option', { value: 'scientific' }, '1.50e6, 2.30e9…')) as HTMLSelectElement;
  notation.value = settings.notation;
  notation.addEventListener('change', () => {
    settings.notation = notation.value as 'words' | 'scientific';
    saveSettings();
  });
  const io = h('textarea', { class: 'io', rows: '3', placeholder: 'Paste a save string here to import it.' }) as HTMLTextAreaElement;
  const native = (window as unknown as { libraryNative?: { quit?: () => void; toggleFullscreen?: () => void } }).libraryNative;
  el.append(
    h('h3', null, 'Sound'),
    slider('Master', 'master'),
    slider('Drone', 'drone'),
    slider('Effects', 'sfx'),
    check('Mute everything', 'muted'),
    h('h3', null, 'Display'),
    check('Reduce motion', 'reducedMotion'),
    check('Ask before sealing', 'confirmSeal'),
    slider('Text size', 'textSize', 0.85, 1.3, 0.05),
    h('label', { class: 'setting' }, h('span', null, 'Numbers'), notation),
    h('div', { class: 'row wrap' }, h('button', { class: 'btn ghost', onclick: ui.resetView }, 'Reset the view'), native?.toggleFullscreen ? h('button', { class: 'btn ghost', onclick: () => native.toggleFullscreen!() }, 'Fullscreen (F11)') : h('button', { class: 'btn ghost', onclick: () => void document.documentElement.requestFullscreen?.() }, 'Fullscreen')),
    h('h3', null, 'The register'),
    h(
      'div',
      { class: 'row wrap' },
      h('button', { class: 'btn', onclick: () => { game.save(); audio.click(); } }, 'Save now'),
      h('button', { class: 'btn ghost', onclick: () => { io.value = exportString(game.s); io.select(); void navigator.clipboard?.writeText(io.value).catch(() => undefined); } }, 'Export'),
      h('button', { class: 'btn ghost', onclick: () => { const s = importString(io.value); if (s) game.replace(s); else io.value = 'That is not a register this library recognises.'; } }, 'Import'),
    ),
    io,
    h('button', {
      class: 'btn danger',
      onclick: () =>
        confirmBox('Burn the register?', 'This erases your library entirely: every shelf, every page, every ending. It cannot be undone.', 'Erase everything', () => {
          wipeSave();
          game.replace(newState());
          location.reload();
        }),
    }, 'Erase the library'),
    ...(native?.quit ? [h('button', { class: 'btn ghost', onclick: () => { game.save(); native.quit!(); } }, 'Leave the library (quit)')] : []),
    h('p', { class: 'muted small' }, 'Keys: Space reads · L opens a lucid page · 1–8 buy buildings · Tab cycles tabs · Esc closes.'),
  );
  return { id: 'settings', label: 'Settings', el, visible: () => true, update: () => undefined };
}

export function makePanels(game: Game, actions: { readBook: () => void; burn: () => void; abandon: () => void; mirror: () => void; resetView: () => void }): Panel[] {
  return [
    buildingsPanel(game),
    upgradesPanel(game),
    sealPanel(game),
    translationPanel(game),
    catalogPanel(game),
    forbiddenPanel(game),
    stacksPanel(game, actions),
    archivePanel(game),
    ledgerPanel(),
    settingsPanel(game, actions),
  ];
}
