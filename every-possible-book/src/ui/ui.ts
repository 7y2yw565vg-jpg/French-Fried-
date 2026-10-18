// The interface around the stage: the counters at the top, your desk on the left,
// the tabs on the right, the proof strip at the bottom, and everything that pops up.
import { h, clear, setText, toggle, escapeHtml } from './dom';
import type { Game, UiEvent } from '../game';
import type { Scene } from '../render/scene';
import { makePanels, type Panel } from './panels';
import { initModals, openReader, openPuzzle, openModal, closeModal, modalOpen, confirmBox, openEnding, openOffline, FINAL_SENTENCE, FINAL_WORDS } from './modals';
import { TEXT_BY_ID } from '../content';
import { fillTemplate } from '../core/story';
import { fmt, fmtInt, fmtRate } from '../core/format';
import { ACHIEVEMENTS } from '../core/achievements';
import { SECTION_BY_ID, STACK_LEVEL_NAMES, BUILDINGS } from '../core/defs';
import { printPage } from '../core/text';
import { LIBRARY_WORDS } from '../core/words';
import { audio } from '../audio/audio';
import { settings } from './settings';
import { machinesBuilt as E_machines } from '../core/engine';
import { C } from '../render/palette';

export class UI {
  root: HTMLElement;
  private top!: HTMLElement;
  private desk!: HTMLElement;
  private side!: HTMLElement;
  private tabs!: HTMLElement;
  private host!: HTMLElement;
  private toasts!: HTMLElement;
  private proof!: HTMLElement;
  private panels: Panel[] = [];
  private active = 'presses';
  private tabButtons = new Map<string, HTMLButtonElement>();
  private refs: Record<string, HTMLElement> = {};
  private overheard: string[] = [];
  private proofAcc = 0;
  private lastProphecyKey = '';

  constructor(
    private game: Game,
    private scene: Scene,
    root: HTMLElement,
  ) {
    this.root = root;
  }

  build(): void {
    const r = this.refs;
    r.meaning = h('span', { class: 'meaning-num' });
    r.rate = h('span', { class: 'rate' });
    r.books = h('span');
    r.currencies = h('div', { class: 'currencies' });
    r.boost = h('span', { class: 'boost hidden' });
    this.top = h('header', { class: 'hud-top' }, h('div', { class: 'meaning' }, r.meaning, h('span', { class: 'unit' }, 'meaning'), r.rate, r.boost), h('div', { class: 'hud-sub' }, r.books, r.currencies));

    r.readBtn = h('button', { class: 'btn read-btn', onclick: () => this.read() }, h('span', { class: 'read-label' }, 'Read a book'), h('span', { class: 'read-sub' }));
    r.lucid = h('button', { class: 'btn lucid-btn hidden', onclick: () => this.openLucid() }, 'A lucid page is shining on the shelf');
    r.unread = h('button', { class: 'btn ghost unread-btn hidden', onclick: () => this.openNextUnread() });
    r.prophecy = h('div', { class: 'desk-book hidden' });
    r.overheard = h('ul', { class: 'overheard' });
    r.door = h('div', { class: 'small muted door-note' });
    r.hint = h('div', { class: 'hint hidden' });
    this.desk = h(
      'aside',
      { class: 'desk' },
      h('div', { class: 'desk-title' }, 'The Desk'),
      r.readBtn,
      r.hint,
      r.lucid,
      r.unread,
      r.prophecy,
      h('div', { class: 'desk-sub' }, 'Overheard'),
      r.overheard,
      r.door,
    );

    this.tabs = h('nav', { class: 'tabs' });
    this.host = h('div', { class: 'panel-host' });
    this.side = h('aside', { class: 'side' }, this.tabs, this.host);
    this.toasts = h('div', { class: 'toasts' });
    this.proof = h('div', { class: 'proof' });
    this.root.append(this.top, this.desk, this.side, this.toasts, this.proof);
    initModals(this.root);

    this.panels = makePanels(this.game, {
      readBook: () => this.readTheBook(),
      burn: () => this.burn(),
      abandon: () => this.abandon(),
      mirror: () => this.mirror(),
      resetView: () => this.scene.resetView(),
    });
    for (const p of this.panels) {
      const b = h('button', { class: 'tab', onclick: () => this.show(p.id) }, p.label, h('span', { class: 'badge hidden' })) as HTMLButtonElement;
      this.tabButtons.set(p.id, b);
      this.tabs.appendChild(b);
      p.el.classList.add('hidden');
      this.host.appendChild(p.el);
    }
    this.show('presses');

    this.game.on((e) => this.onEvent(e));
    window.addEventListener('keydown', (e) => this.key(e));
    window.addEventListener('resize', () => this.layout());
    setInterval(() => this.update(), 200);
    setInterval(() => this.tickProof(), 90);
    this.layout();
    this.update();
  }

  /** Tells the scene which part of the screen is not covered by panels. */
  layout(): void {
    const w = window.innerWidth;
    const hgt = window.innerHeight;
    const left = this.desk.getBoundingClientRect().right;
    const right = this.side.getBoundingClientRect().left;
    const top = this.top.getBoundingClientRect().bottom;
    const bottom = this.proof.getBoundingClientRect().top;
    this.scene.setViewport({ x: left + 10, y: top + 10, w: Math.max(200, (right || w) - left - 20), h: Math.max(200, (bottom || hgt) - top - 20) });
  }

  show(id: string): void {
    this.active = id;
    for (const p of this.panels) {
      toggle(p.el, 'hidden', p.id !== id);
      toggle(this.tabButtons.get(p.id)!, 'active', p.id === id);
    }
    const p = this.panels.find((x) => x.id === id);
    p?.update(this.game);
  }

  private read(): void {
    this.game.read();
  }

  private update(): void {
    const g = this.game;
    const s = g.s;
    const st = g.stats;
    const r = this.refs;
    setText(r.meaning, fmt(s.meaning));
    setText(r.rate, `+${fmtRate(st.meaningPerSec)}/s`);
    const boosted = s.boost.until > s.playTime;
    toggle(r.boost, 'hidden', !boosted);
    if (boosted) setText(r.boost, `lucid ×${s.boost.mult} · ${Math.ceil(s.boost.until - s.playTime)}s`);
    setText(r.books, `${fmtInt(s.books)} / ${fmtInt(st.capacity)} books on the shelves · printing ${fmtRate(st.printRate)}/s · reading ${fmtRate(st.readRate)}/s`);
    const cur: string[] = [];
    if (s.shelfPrestiges > 0 || s.shelves > 0) cur.push(`${fmtInt(s.shelves)} shelves`);
    if (s.floorPrestiges > 0 || s.floors > 0) cur.push(`${fmtInt(s.floors)} floors`);
    if (s.wingPrestiges > 0 || s.wings > 0) cur.push(`${fmtInt(s.wings)} wings`);
    if (s.wingPrestiges > 0) cur.push(`dread ${s.forbidden.dread.toFixed(0)}`);
    setText(r.currencies, cur.join(' · '));
    toggle(r.currencies, 'dreadful', s.forbidden.dread > 60);

    setText(r.readBtn.querySelector('.read-sub')!, s.books >= 1 ? `${fmtInt(s.books)} waiting · ${fmtInt(Math.min(s.books, st.clickPower))} per turn` : 'The shelf is empty. The press is working.');
    toggle(r.lucid, 'hidden', !s.lucid.available);
    const unread = s.texts.unread.length;
    toggle(r.unread, 'hidden', unread === 0);
    setText(r.unread, unread === 1 ? 'A page that makes sense is waiting' : `${unread} pages that make sense are waiting`);
    const pk = `${s.prophecy.active}|${s.prophecy.current}|${s.prophecy.fulfilled}|${s.prophecy.defied}`;
    if (pk !== this.lastProphecyKey) {
      this.lastProphecyKey = pk;
      toggle(r.prophecy, 'hidden', !s.prophecy.active);
      if (s.prophecy.active)
        r.prophecy.innerHTML = `<div class="desk-sub">The desk book</div><p>${s.prophecy.current ? `The librarian will buy <b>${escapeHtml((s.prophecy.currentName || '').replace(/^The /, 'the '))}</b> next.` : 'The page is blank. It is waiting to see what you look at.'}</p><div class="small muted">Fulfilled ${s.prophecy.fulfilled} · defied ${s.prophecy.defied}</div>`;
    }
    const hint = this.hint();
    toggle(r.hint, 'hidden', !hint);
    if (hint) setText(r.hint, hint);
    setText(r.door, s.door > 0 ? `You have tried the door ${s.door === 1 ? 'once' : `${s.door} times`}.` : '');

    for (const p of this.panels) {
      const vis = p.visible(g);
      const btn = this.tabButtons.get(p.id)!;
      toggle(btn, 'hidden', !vis);
      const n = vis && p.badge ? p.badge(g) : 0;
      const badge = btn.querySelector('.badge') as HTMLElement;
      toggle(badge, 'hidden', n <= 0);
      setText(badge, n > 99 ? '99+' : String(n));
      if (p.id === this.active && vis) p.update(g);
    }
    if (!this.panels.find((p) => p.id === this.active)?.visible(g)) this.show('presses');

    const depth = Math.min(1, (s.shelfPrestiges > 0 ? 0.15 : 0) + s.floorPrestiges * 0.03 + s.wingPrestiges * 0.05 + (s.stacks ? 0.3 + s.stacks.level * 0.05 : 0));
    audio.setAtmosphere(depth, s.forbidden.dread / 100);
    this.scene.reducedMotion = settings.reducedMotion;
  }

  /** One line of advice for whoever is new here. Goes quiet once the library is running. */
  private hint(): string {
    const s = this.game.s;
    const st = this.game.stats;
    if (s.shelfPrestiges > 2 || s.floorPrestiges > 0) return '';
    if (s.booksRead < 5) return 'The press has printed something. Click the shelves, or press Space, to read it.';
    if (s.buildings.librarian === 0 && s.meaning >= 10) return 'Meaning buys machines. A librarian reads for you; another press prints faster.';
    if (s.books >= st.capacity - 0.5 && st.printRate > 0 && s.buildings.bay < 3) return 'The shelves are full and the press has stopped. Build shelf bays, or read faster.';
    if (st.readRate < st.printRate * 0.5 && s.buildings.librarian < 5) return 'Books are piling up faster than anyone can read them. Hire librarians.';
    if (s.texts.unread.length > 0 && s.texts.found.length < 4) return 'A page that makes sense: open it below, or from the Archive.';
    if (s.shelfPrestiges === 0 && s.runMeaning >= 1e4) return 'You could seal this shelf now (the Seal tab). You will forget it, and come back stronger.';
    if (s.shelfPrestiges === 1 && E_machines(s) === 0) return 'Shelves buy translation machines, in the Seal tab. Assign them in Translation.';
    return '';
  }

  /** The proof strip: a line of whatever the press is printing right now. */
  private tickProof(): void {
    const s = this.game.s;
    const st = this.game.stats;
    if (st.printRate <= 0 || s.books >= st.capacity - 0.5) {
      this.proof.classList.add('idle');
      return;
    }
    this.proof.classList.remove('idle');
    this.proofAcc++;
    if (this.proofAcc % 2) return;
    const words = Math.random() < 0.6 ? 1 : 0;
    const page = printPage(Math.random, 1, 96, words, null, 'latin', s.floorPrestiges > 0 ? LIBRARY_WORDS : []);
    const line = page.lines[0];
    const sp = page.spans[0];
    this.proof.innerHTML = sp
      ? `${escapeHtml(line.slice(0, sp.start))}<mark>${escapeHtml(line.slice(sp.start, sp.end))}</mark>${escapeHtml(line.slice(sp.end))}`
      : escapeHtml(line);
  }

  private toast(html: string, opts: { cls?: string; onClick?: () => void; ttl?: number } = {}): void {
    const t = h('div', { class: `toast ${opts.cls || ''}`, html });
    if (opts.onClick) {
      t.classList.add('clickable');
      t.addEventListener('click', () => {
        opts.onClick!();
        t.remove();
      });
    }
    this.toasts.prepend(t);
    while (this.toasts.children.length > 3) this.toasts.lastElementChild!.remove();
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => {
      t.classList.remove('in');
      setTimeout(() => t.remove(), 400);
    }, opts.ttl ?? 7000);
  }

  private onEvent(e: UiEvent): void {
    const g = this.game;
    switch (e.type) {
      case 'read':
        if (e.books > 0) {
          audio.pageTurn();
          if (e.sentence) this.sentence(e.sentence);
          else if (Math.random() < 0.35) this.scene.rain.spawnWord(['the', 'and', 'door', 'ink', 'page', 'a', 'of', 'you'][Math.floor(Math.random() * 8)]);
        }
        break;
      case 'sentence':
        this.sentence(e.text);
        break;
      case 'text': {
        const t = TEXT_BY_ID[e.id];
        if (!t) break;
        audio.chime(g.s.texts.found.length);
        if (t.source === 'event' || t.source === 'ending') {
          if (e.id === 'event_register' || e.id === 'event_remembered') setTimeout(() => openReader(g, e.id), 600);
          else this.toast(`<b>${escapeHtml(fillTemplate(g.s, t.title))}</b><br><span class="muted">Click to read.</span>`, { cls: 'text', onClick: () => openReader(g, e.id) });
        } else this.toast(`A page that makes sense:<br><b>${escapeHtml(fillTemplate(g.s, t.title))}</b>`, { cls: 'text', onClick: () => openReader(g, e.id) });
        this.scene.flashScreen(0.25);
        break;
      }
      case 'lucid':
        audio.chime(5);
        this.toast('A <b>lucid page</b> is shining on the shelf.', { cls: 'lucid', onClick: () => this.openLucid() });
        break;
      case 'achievement': {
        const a = ACHIEVEMENTS.find((x) => x.id === e.id);
        if (a) this.toast(`Achievement · <b>${escapeHtml(a.name)}</b>`, { cls: 'ach', ttl: 4500 });
        break;
      }
      case 'dread':
        audio.dread();
        this.toast(e.level >= 75 ? 'Something is reading over your shoulder.' : e.level >= 50 ? 'The pages turn by themselves, a long way off.' : 'The lamps lean away from the forbidden doors.', { cls: 'dread' });
        break;
      case 'overrun':
        audio.dread();
        this.scene.flashScreen(1);
        this.toast('<b>Overrun.</b> The doors slam shut. You lose some of what you had.', { cls: 'dread', ttl: 10000 });
        break;
      case 'key':
        audio.chime(6);
        this.toast(`You have finished ${escapeHtml(SECTION_BY_ID[e.section].name)}.<br><b>${escapeHtml(SECTION_BY_ID[e.section].key)}</b>`, { cls: 'key', ttl: 10000 });
        break;
      case 'stacks':
        audio.seal();
        this.scene.flashScreen(1);
        this.toast('<b>The walls come down.</b> The Infinite Stacks.', { cls: 'key', ttl: 10000, onClick: () => this.show('stacks') });
        this.show('stacks');
        break;
      case 'prophecy':
        if (e.outcome === 'fulfilled') this.toast(`As it was written: <b>${escapeHtml(e.bought)}</b>.`, { cls: 'prophecy' });
        else this.toast(`The desk book was wrong. You look again. It says <b>${escapeHtml(e.bought)}</b>. It always did.`, { cls: 'prophecy' });
        break;
      case 'unlock':
        this.toast(e.what === 'translation' ? 'A <b>translation machine</b> stands in the corner. Build more in the Seal tab.' : e.what === 'catalog' ? 'The <b>catalog</b> opens its drawers.' : 'Doors with names over them: the <b>forbidden sections</b>.', { cls: 'key', ttl: 9000 });
        break;
      case 'autoSeal':
        audio.seal();
        break;
      case 'seal':
        audio.seal();
        this.scene.flashScreen(0.8);
        this.toast(`Sealed. +${fmtInt(e.gain)} ${e.layer === 'shelf' ? 'shelves' : e.layer === 'floor' ? 'floors' : 'wings'}.`, { cls: 'key' });
        break;
      case 'shelvesFull':
        break;
      case 'step':
        if (e.result.ok) {
          audio.step();
          if (e.result.oilFound) this.toast(`A lamp, half full. +${e.result.oilFound} oil.`);
          if (e.result.hex.kind === 'stair' && e.result.firstVisit) this.toast('A stair going down, locked.', { cls: 'key' });
          if ((e.result.hex.kind === 'book' || e.result.hex.kind === 'furnace' || e.result.hex.kind === 'door') && e.result.firstVisit) audio.chime(3);
        } else this.toast(escapeHtml(e.result.reason));
        break;
      case 'descend':
        audio.seal();
        this.scene.flashScreen(0.6);
        this.toast(`Down. <b>${escapeHtml(STACK_LEVEL_NAMES[e.level])}</b>.`, { cls: 'key' });
        break;
      case 'ending':
        break;
      case 'loaded':
        if (e.offline && e.offline.seconds > 120) openOffline(e.offline.seconds, e.offline.meaning, e.offline.books);
        break;
      case 'reset':
        this.overheard = [];
        clear(this.refs.overheard);
        this.show('presses');
        break;
    }
  }

  private sentence(text: string): void {
    this.scene.sentence(text);
    audio.chime(Math.floor(Math.random() * 4));
    this.overheard.unshift(text);
    this.overheard = this.overheard.slice(0, 6);
    clear(this.refs.overheard);
    for (const s of this.overheard) this.refs.overheard.appendChild(h('li', null, s));
  }

  private openNextUnread(): void {
    const id = this.game.s.texts.unread[0];
    if (id) openReader(this.game, id, [...this.game.s.texts.found]);
  }

  openLucid(): void {
    const g = this.game;
    if (!g.s.lucid.available || modalOpen()) return;
    g.s.lucid.available = false;
    openPuzzle(g, {
      onDone: (found, total) => {
        const r = g.solvePuzzle(found, total);
        this.scene.flashScreen(0.4);
        this.toast(found >= total ? `Every word. +${fmt(r.meaning)} meaning, and everything means ${r.boost}× as much for a while.` : found > 0 ? `${found} of ${total} words. +${fmt(r.meaning)} meaning.` : 'The shine faded before you found anything.', { cls: 'lucid' });
      },
    });
  }

  private mirror(): void {
    const g = this.game;
    openPuzzle(g, {
      subtitle: 'The mirror by the stair',
      title: 'Words written backwards in the glass',
      onDone: (found, total) => {
        const st = g.s.stacks;
        if (st && found > 0) {
          st.oil += Math.ceil((found / total) * 3);
          const hx = st.hexes.find((x) => x.q === st.pos.q && x.r === st.pos.r);
          if (hx && hx.kind === 'mirror') hx.kind = 'gallery';
        }
        g.solvePuzzle(found, total);
        this.toast(found > 0 ? 'The mirror clears. Your lamp burns a little brighter.' : 'The mirror fogs over.', { cls: 'lucid' });
      },
    });
  }

  private readTheBook(): void {
    const g = this.game;
    if (!g.s.forbidden.keys.includes('The Builder’s Key')) {
      this.toast('The book is locked. It wants the Builder’s Key.');
      return;
    }
    confirmBox('The book nobody printed', 'The book has no title. There is a worn place on the spine where someone has touched it every time they came here, and every time decided not to open it.', 'Open it', () => {
      openPuzzle(g, {
        words: FINAL_WORDS,
        untimed: true,
        subtitle: 'The first page',
        title: 'The words are in here. They were always in here.',
        sentenceTemplate: FINAL_SENTENCE,
        onDone: (found, total) => {
          if (found < total) {
            this.toast('You close the book again. Not yet.');
            return;
          }
          this.finale('finish');
        },
      });
    }, 'Not yet');
  }

  private burn(): void {
    confirmBox('The Match', 'There is only the one. Everything in the library will burn, including whatever you were looking for.', 'Strike it', () => {
      audio.fire();
      this.scene.startBurn();
      setTimeout(() => this.finale('burn'), 6500);
    });
  }

  private abandon(): void {
    confirmBox('The Door', 'It is stuck, swollen in its frame. It would need a hard push. It would need someone who had decided.', 'Push', () => {
      this.scene.flashScreen(1);
      setTimeout(() => this.finale('abandon'), 1200);
    });
  }

  private finale(ending: 'finish' | 'burn' | 'abandon'): void {
    const g = this.game;
    audio.silence(8);
    g.end(ending);
    document.body.classList.add(`ended`, `ended-${ending}`);
    openEnding(g, ending, (choice) => {
      document.body.classList.remove('ended', 'ended-finish', 'ended-burn', 'ended-abandon');
      audio.restore();
      if (choice === 'center') g.returnToCenter();
      else if (choice === 'again') {
        g.beginAgain();
        location.reload();
      } else g.returnToCenter();
    });
  }

  private key(e: KeyboardEvent): void {
    if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA' || (e.target as HTMLElement)?.tagName === 'SELECT') return;
    if (e.key === 'Escape') {
      closeModal();
      return;
    }
    if (modalOpen() || this.game.isNew) return;
    if (e.key === ' ' || e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      this.read();
    } else if (e.key === 'l' || e.key === 'L') this.openLucid();
    else if (e.key === 'Tab') {
      e.preventDefault();
      const vis = this.panels.filter((p) => p.visible(this.game));
      const i = vis.findIndex((p) => p.id === this.active);
      this.show(vis[(i + (e.shiftKey ? vis.length - 1 : 1)) % vis.length].id);
    } else if (/^[1-8]$/.test(e.key)) {
      const b = BUILDINGS[Number(e.key) - 1];
      if (b) this.game.buyBuilding(b.id, e.shiftKey ? 10 : 1);
    }
  }

  doorClicked(): void {
    const g = this.game;
    g.tryDoor();
    audio.click();
    const lines = ['The door does not open.', 'Locked. Or stuck. It is hard to tell from this side.', 'You lean on it. It leans back.', 'Through the keyhole: nothing. Not darkness. A painted keyhole.', 'You think you hear birds.', 'A line of light under the door, for a moment.'];
    const i = Math.min(lines.length - 1, Math.floor(Math.log2(g.s.door + 1)));
    const L = this.scene.library.layout;
    this.scene.floatText(lines[i], L.doorX + 46, -230, C.paper, 18);
  }

  windowClicked(): void {
    const g = this.game;
    g.s.flags.window = (g.s.flags.window || 0) + 1;
    const lines = ['Painted over. Thickly, many coats.', 'You scratch at the paint with a thumbnail. There is more paint under it.', 'The paint is on the inside.', 'Somewhere behind it, the afternoon.'];
    this.scene.floatText(lines[Math.min(lines.length - 1, g.s.flags.window - 1)], 80, -330, C.paper, 18);
    if (g.s.flags.window >= 4) g.s.flags.windowCrack = 1;
  }

  openSettings(): void {
    this.show('settings');
  }

  modal(content: HTMLElement): void {
    openModal(content);
  }
}
