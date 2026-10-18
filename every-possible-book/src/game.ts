// The running game: owns the state, steps the simulation and tells everyone what happened.
import * as E from './core/engine';
import type { GameEvent, Stats } from './core/engine';
import type { BuildingId, DrawerId, LangId, SectionId } from './core/defs';
import { newState, type EndingId, type GameState } from './core/state';
import { loadGame, saveGame } from './core/save';
import { queueScripted, deliverText } from './core/story';
import * as Stacks from './core/stacks';
import { checkAchievements } from './core/achievements';
import { gainMeaning } from './core/engine';
import { puzzleReward } from './core/puzzle';

export type UiEvent =
  | GameEvent
  | { type: 'read'; books: number; meaning: number; sentence: string | null }
  | { type: 'purchase'; id: string }
  | { type: 'seal'; layer: 'shelf' | 'floor' | 'wing'; gain: number }
  | { type: 'step'; result: Stacks.StepResult }
  | { type: 'descend'; level: number }
  | { type: 'door' }
  | { type: 'ending'; ending: EndingId }
  | { type: 'reset' }
  | { type: 'loaded'; offline: E.OfflineReport | null };

type Listener = (e: UiEvent) => void;

const STEP = 0.1;

export class Game {
  s: GameState = newState();
  stats: Stats = E.computeStats(this.s);
  private listeners: Listener[] = [];
  private acc = 0;
  private saveTimer = 0;
  paused = false;

  on(fn: Listener): () => void {
    this.listeners.push(fn);
    return () => (this.listeners = this.listeners.filter((l) => l !== fn));
  }

  emit(e: UiEvent): void {
    for (const l of this.listeners) l(e);
    if (e.type === 'achievement') {
      const n = (globalThis as unknown as { libraryNative?: { unlockAchievement?: (id: string) => void } }).libraryNative;
      n?.unlockAchievement?.(e.id);
    }
  }

  async load(): Promise<void> {
    const saved = await loadGame();
    let offline: E.OfflineReport | null = null;
    if (saved) {
      this.s = saved;
      const away = (Date.now() - saved.lastSaved) / 1000;
      if (away > 60 && !saved.ending) {
        offline = E.applyOffline(this.s, away);
        if (away > 3600 && this.s.wingPrestiges > 0) queueScripted(this.s, 'event_away');
      }
    }
    this.refresh();
    this.emit({ type: 'loaded', offline });
  }

  get isNew(): boolean {
    return !this.s.name;
  }

  begin(name: string): void {
    this.s.name = name.trim().slice(0, 24) || 'Librarian';
    if (deliverText(this.s, 'event_register')) this.emit({ type: 'text', id: 'event_register' });
    this.save();
  }

  refresh(): void {
    this.stats = E.computeStats(this.s);
  }

  update(dt: number): void {
    if (this.paused || this.isNew) return;
    this.acc += Math.min(dt, 1);
    const events: GameEvent[] = [];
    while (this.acc >= STEP) {
      this.acc -= STEP;
      E.tick(this.s, STEP, events);
    }
    this.refresh();
    for (const e of events) this.emit(e);
    this.saveTimer += dt;
    if (this.saveTimer > 30) this.save();
  }

  save(): void {
    this.saveTimer = 0;
    saveGame(this.s);
  }

  // --- actions -------------------------------------------------------------------------------

  read(): void {
    const r = E.clickRead(this.s, this.stats);
    this.refresh();
    this.emit({ type: 'read', ...r });
  }

  buyBuilding(id: BuildingId, count: number): void {
    const events: GameEvent[] = [];
    if (E.buyBuilding(this.s, id, count, events) > 0) this.purchased(id, events);
  }

  buyUpgrade(id: string): void {
    const events: GameEvent[] = [];
    if (E.buyUpgrade(this.s, id, events)) this.purchased(id, events);
  }

  buyPrestige(id: string): void {
    const events: GameEvent[] = [];
    if (E.buyPrestige(this.s, id, events)) this.purchased(id, events);
  }

  private purchased(id: string, events: GameEvent[]): void {
    this.refresh();
    this.emit({ type: 'purchase', id });
    for (const e of events) this.emit(e);
  }

  hover(id: string, seconds: number): void {
    if (!this.s.prophecy.active) return;
    this.s.prophecy.hover[id] = (this.s.prophecy.hover[id] || 0) + seconds;
  }

  seal(layer: 'shelf' | 'floor' | 'wing'): void {
    const events: GameEvent[] = [];
    const gain = layer === 'shelf' ? E.sealShelf(this.s, events) : layer === 'floor' ? E.sealFloor(this.s, events) : E.openWing(this.s, events);
    if (gain <= 0) return;
    this.refresh();
    this.emit({ type: 'seal', layer, gain });
    for (const e of events) this.emit(e);
    this.save();
  }

  assign(lang: LangId, delta: number): void {
    E.assignMachine(this.s, lang, delta);
    this.refresh();
  }

  file(drawer: DrawerId, amount: number): void {
    E.fileCards(this.s, drawer, amount);
    this.refresh();
  }

  query(cat: string): boolean {
    return E.queryCatalog(this.s, cat);
  }

  unlockSection(id: SectionId): void {
    if (E.unlockSection(this.s, id)) this.refresh();
  }

  toggleSection(id: SectionId, open: boolean): void {
    E.setSectionOpen(this.s, id, open);
    this.refresh();
  }

  tryDoor(): void {
    this.s.door++;
    if (this.s.door === 1) queueScripted(this.s, 'event_door1');
    if (this.s.door === 7) queueScripted(this.s, 'event_door_many');
    checkAchievements(this.s);
    this.emit({ type: 'door' });
  }

  markRead(id: string): void {
    this.s.texts.unread = this.s.texts.unread.filter((t) => t !== id);
  }

  // --- lucid pages ---------------------------------------------------------------------------

  solvePuzzle(found: number, total: number): { meaning: number; boost: number } {
    const r = puzzleReward(found, total, this.stats.puzzleReward);
    const m = r.seconds * Math.max(this.stats.meaningPerSec, this.s.bestMeaningPerSec * 0.05, 5);
    gainMeaning(this.s, m);
    if (r.boost > 1) this.s.boost = { mult: r.boost, until: this.s.playTime + r.boostTime };
    this.s.puzzlesSolved++;
    if (found >= total) this.s.puzzlesPerfect++;
    this.s.wordsHunted += found;
    this.s.lucid.available = false;
    this.refresh();
    checkAchievements(this.s);
    return { meaning: m, boost: r.boost };
  }

  // --- the stacks ------------------------------------------------------------------------------

  step(q: number, r: number): Stacks.StepResult {
    const result = Stacks.step(this.s, q, r);
    if (result.ok) for (const id of result.texts) deliverText(this.s, id);
    this.emit({ type: 'step', result });
    if (result.ok) for (const id of result.texts) this.emit({ type: 'text', id });
    return result;
  }

  descend(): void {
    if (Stacks.descend(this.s)) {
      this.refresh();
      this.emit({ type: 'descend', level: this.s.stacks!.level });
      this.save();
    }
  }

  buyStacks(kind: 'lanterns' | 'wicks'): void {
    if (Stacks.buyStacksUpgrade(this.s, kind)) this.refresh();
  }

  end(ending: EndingId): void {
    E.chooseEnding(this.s, ending);
    deliverText(this.s, `end_${ending}`);
    checkAchievements(this.s);
    this.save();
    this.emit({ type: 'ending', ending });
  }

  /** After an ending: return to the Center to choose differently. */
  returnToCenter(): void {
    this.s.ending = null;
    this.save();
  }

  beginAgain(): void {
    this.s = E.beginAgain(this.s);
    this.refresh();
    this.save();
    this.emit({ type: 'reset' });
  }

  replace(s: GameState): void {
    this.s = s;
    this.refresh();
    this.save();
    this.emit({ type: 'reset' });
  }
}
