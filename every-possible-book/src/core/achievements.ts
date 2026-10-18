// Achievements, mirrored to Steam by id (upper-cased) when the Steamworks bridge is present.
import { SECTIONS } from './defs';
import type { GameState } from './state';
import type { GameEvent } from './engine';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  hidden?: boolean;
  check: (s: GameState) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_word', name: 'A Word', desc: 'Read your first book.', check: (s) => s.booksRead >= 1 },
  { id: 'first_sentence', name: 'Subject, Verb, Object', desc: 'Find a sentence in the noise.', check: (s) => s.sentences >= 1 },
  { id: 'hundred_books', name: 'Bookish', desc: 'Read 100 books.', check: (s) => s.booksRead >= 100 },
  { id: 'ten_k_books', name: 'Voracious', desc: 'Read 10,000 books.', check: (s) => s.booksRead >= 1e4 },
  { id: 'million_books', name: 'A Rounding Error', desc: 'Read a million books. That is almost none of them.', check: (s) => s.booksRead >= 1e6 },
  { id: 'billion_books', name: 'Still Almost None', desc: 'Read a billion books.', check: (s) => s.booksRead >= 1e9 },
  { id: 'ten_presses', name: 'Clatter', desc: 'Own 10 printing presses.', check: (s) => s.buildings.press >= 10 },
  { id: 'hundred_presses', name: 'Thunder', desc: 'Own 100 printing presses.', check: (s) => s.buildings.press >= 100 },
  { id: 'staff', name: 'Staffed', desc: 'Employ 25 librarians.', check: (s) => s.buildings.librarian >= 25 },
  { id: 'meaning_1m', name: 'Meaningful', desc: 'Find a million meaning in total.', check: (s) => s.lifetimeMeaning >= 1e6 },
  { id: 'meaning_1t', name: 'Significant', desc: 'Find a trillion meaning in total.', check: (s) => s.lifetimeMeaning >= 1e12 },
  { id: 'meaning_1e30', name: 'Profound', desc: 'Find 1e30 meaning in total.', check: (s) => s.lifetimeMeaning >= 1e30 },
  { id: 'meaning_1e60', name: 'Unfathomable', desc: 'Find 1e60 meaning in total.', check: (s) => s.lifetimeMeaning >= 1e60 },
  { id: 'first_text', name: 'A Page That Makes Sense', desc: 'Find a text among the noise.', check: (s) => s.texts.found.some((t) => !t.startsWith('event_')) },
  { id: 'texts_50', name: 'Anthology', desc: 'Find 50 texts.', check: (s) => s.texts.found.length >= 50 },
  { id: 'texts_100', name: 'Collected Works', desc: 'Find 100 texts.', check: (s) => s.texts.found.length >= 100 },
  { id: 'texts_150', name: 'Complete Works', desc: 'Find 150 texts.', check: (s) => s.texts.found.length >= 150 },
  { id: 'texts_200', name: 'Every Possible Page', desc: 'Find 200 texts.', check: (s) => s.texts.found.length >= 200 },
  { id: 'lucid_1', name: 'Lucid', desc: 'Solve a lucid page.', check: (s) => s.puzzlesSolved >= 1 },
  { id: 'lucid_25', name: 'Clear-Eyed', desc: 'Solve 25 lucid pages.', check: (s) => s.puzzlesSolved >= 25 },
  { id: 'lucid_perfect', name: 'Nothing Missed', desc: 'Find every word on a lucid page.', check: (s) => s.puzzlesPerfect >= 1 },
  { id: 'lucid_perfect_10', name: 'Hawk-Eyed', desc: 'Find every word on 10 lucid pages.', check: (s) => s.puzzlesPerfect >= 10 },
  { id: 'shelf_1', name: 'Sealed', desc: 'Seal a shelf.', check: (s) => s.shelfPrestiges >= 1 },
  { id: 'shelf_25', name: 'Habitual', desc: 'Seal 25 shelves.', check: (s) => s.shelfPrestiges >= 25 },
  { id: 'translate', name: 'Polyglot', desc: 'Reach fluency 1 in any language.', check: (s) => Object.values(s.translation.fluency).some((f) => f >= 1) },
  { id: 'translate_all', name: 'Babel', desc: 'Reach fluency 1 in all six languages at once.', check: (s) => Object.values(s.translation.fluency).every((f) => f >= 1) },
  { id: 'floor_1', name: 'Up the Stair', desc: 'Seal a floor.', check: (s) => s.floorPrestiges >= 1 },
  { id: 'floor_10', name: 'Tower', desc: 'Seal 10 floors.', check: (s) => s.floorPrestiges >= 10 },
  { id: 'cards_1000', name: 'Cross-Referenced', desc: 'Write 1,000 catalog cards.', check: (s) => s.catalog.cardsLifetime >= 1000 },
  { id: 'wing_1', name: 'No Walls', desc: 'Open a wing.', check: (s) => s.wingPrestiges >= 1 },
  { id: 'section_1', name: 'Forbidden', desc: 'Finish reading a forbidden section.', check: (s) => s.forbidden.keys.length >= 1 },
  { id: 'section_all', name: 'Seven Keys', desc: 'Finish every forbidden section.', check: (s) => s.forbidden.keys.length >= SECTIONS.length },
  { id: 'dread_75', name: 'Something Behind You', desc: 'Let dread reach 75.', check: (s) => s.forbidden.peakDread >= 75 },
  { id: 'overrun', name: 'Read Back', desc: 'Be overrun by dread.', hidden: true, check: (s) => s.forbidden.overruns >= 1 },
  { id: 'prophecy_5', name: 'As It Was Written', desc: 'Fulfil 5 prophecies.', check: (s) => s.prophecy.fulfilled >= 5 },
  { id: 'defy_5', name: 'Free Will (Probably)', desc: 'Defy 5 prophecies.', check: (s) => s.prophecy.defied >= 5 },
  { id: 'door_10', name: 'Knock Knock', desc: 'Try the door 10 times.', hidden: true, check: (s) => s.door >= 10 },
  { id: 'stacks', name: 'Infinite', desc: 'Enter the Infinite Stacks.', check: (s) => !!s.stacks },
  { id: 'stacks_deep', name: 'Deep Reader', desc: 'Descend to the fourth level of the stacks.', check: (s) => (s.stacks?.level || 0) >= 3 },
  { id: 'center', name: 'The Center', desc: 'Reach the Center.', check: (s) => (s.stacks?.level || 0) >= 6 },
  { id: 'end_finish', name: 'Finish', desc: 'Read the book nobody printed.', hidden: true, check: (s) => s.endingsSeen.includes('finish') },
  { id: 'end_burn', name: 'Burn', desc: 'Strike the match.', hidden: true, check: (s) => s.endingsSeen.includes('burn') },
  { id: 'end_abandon', name: 'Abandon', desc: 'Open the door.', hidden: true, check: (s) => s.endingsSeen.includes('abandon') },
  { id: 'all_endings', name: 'Every Possible Ending', desc: 'See all three endings.', hidden: true, check: (s) => s.endingsSeen.length >= 3 },
  { id: 'hours_10', name: 'Long Shift', desc: 'Spend 10 hours in the library.', check: (s) => s.playTime >= 36000 },
];

export function checkAchievements(s: GameState, events?: GameEvent[]): void {
  for (const a of ACHIEVEMENTS) {
    if (s.achievements[a.id]) continue;
    if (a.check(s)) {
      s.achievements[a.id] = Date.now();
      events?.push({ type: 'achievement', id: a.id });
    }
  }
}
