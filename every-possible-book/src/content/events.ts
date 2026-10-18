// Scripted texts: delivered the moment something happens, rather than found by chance.
import { dedent, type Draft } from './types';

const T = (s: TemplateStringsArray) => dedent(s[0]);

export const EVENT_TEXTS: Draft[] = [
  {
    id: 'event_register',
    title: 'The Register',
    cat: 'account',
    note: 'The first page of the first book on the shelf.',
    body: T`
      LIBRARIAN ON DUTY: {name}

      The ink is still wet. Above your name the page is full of names, crossed out, one after another, all the way to the top. They are all in your handwriting. You decide not to look at them too closely.`,
  },
  {
    id: 'event_first_sentence',
    title: 'The First Sentence',
    cat: 'fragment',
    body: T`
      Among the noise, a line that holds together. Subject, verb, object. It means nothing in particular. It is the most beautiful thing you have ever seen.

      You read it four times. Then you put the book on the shelf, and pick up the next one.`,
  },
  {
    id: 'event_full',
    title: 'The Shelves Are Full',
    cat: 'fragment',
    body: T`
      The presses have stopped. Not broken: waiting. There is nowhere left to put what they make.

      It is very quiet without them. You find you do not like it. Build more shelves, or read faster. The library does not care which.`,
  },
  {
    id: 'event_first_lucid',
    title: 'On Lucid Pages',
    cat: 'fragment',
    body: T`
      Some pages are lucid. They shine, a little, on the shelf. The words in them are hidden like faces in a crowd, and if you are quick you can pick them all out before the page goes dull again.

      Nobody knows why some pages are lucid. The clerks think the library is trying to help. The night readers think it is trying to keep you busy.`,
  },
  {
    id: 'event_first_shelf',
    title: 'Sealed',
    cat: 'story',
    note: 'Written on the back of the wax seal.',
    body: T`
      You pressed the seal and the shelf went dark, and the books on it went somewhere you can't follow, and so did a little of whatever you were thinking about a moment ago.

      There is one press again, and one shelf. The room is exactly the same. Except that you are a little better at this, somehow, and do not know why, and there is a new machine in the corner, all lenses and gears, waiting to be told which alphabet to read.`,
  },
  {
    id: 'event_first_floor',
    title: 'A Floor Is Sealed',
    cat: 'story',
    body: T`
      All the shelves of the first floor go dark at once. You climb the stair that was always behind them. The second floor is identical to the first, down to the scratch on the desk.

      In the corner: a card catalog, a wall of small drawers, and a clerk with ink-stained fingers who looks up when you come in, and seems very relieved to see you, as if you had been gone for years.`,
  },
  {
    id: 'event_first_wing',
    title: 'A Wing Opens',
    cat: 'story',
    body: T`
      At the top of the tower there are no more stairs. There is a door, and beyond it, sideways, more library: a wing, going out over nothing, held up by nothing, lit by lamps nobody tends.

      Along the first corridor, set into the shelves, there are doors with locks, and over each door a name. The first says THINGS UNSAID. The last says THE BUILDER. One of them says your name.`,
  },
  {
    id: 'event_overrun',
    title: 'Overrun',
    cat: 'mirror',
    note: 'You do not remember the last few minutes.',
    body: T`
      You came to on the floor of the corridor with every forbidden door shut and your hands pressed flat against the boards. The books you were holding are gone. Some of what you had is gone with them.

      There is a smell of ink. There is the sound of pages turning, a long way off, too fast, then slowing, then stopping. The night readers will not say what they saw. One of them has written, on a card, in shaking letters: "it was reading you back."`,
  },
  {
    id: 'event_stacks',
    title: 'The Keys',
    cat: 'map',
    body: T`
      Seven keys on a ring. When the last one goes on, the walls of every wing fold down flat, like the sides of a box, and there is nothing around you but galleries, hexagonal, infinite, a stair in the middle of each going down.

      You have a lamp, and a little oil. Somewhere below is the Center. The keys are heavy and warm, as if someone else has been holding them.`,
  },
  {
    id: 'event_door1',
    title: 'The Door',
    cat: 'fragment',
    body: T`
      You try the door on the south wall. It does not open. It does not rattle, either: it is solid as the wall around it, as if it were only a picture of a door.

      Behind it, very faintly, you think you hear birds.`,
  },
  {
    id: 'event_door_many',
    title: 'The Door, Again',
    cat: 'fragment',
    body: T`
      You have tried the door {door} now. Your hand knows the shape of the handle so well it could be your own hand.

      It still does not open. But this time, for a moment, there was a line of light along the bottom of it, like afternoon.`,
  },
  {
    id: 'event_prophecy',
    title: 'The Desk Book Opens',
    cat: 'prophecy',
    body: T`
      There is a book open on your desk that you did not leave there. Its pages are in the future tense. The top line says what you will buy next.

      You look at the line. You look at the shelves. You find you were already going to.`,
  },
  {
    id: 'event_defied',
    title: 'Defiance',
    cat: 'prophecy',
    body: T`
      You bought something else, on purpose, to see what the book would do.

      The book has not changed. You read the line again and it says, in ink that is perfectly dry, exactly what you bought. You are sure it did not say that before. You are almost sure.`,
  },
  {
    id: 'event_away',
    title: 'While You Were Away',
    cat: 'mirror',
    body: T`
      You were gone a while. The library was not. The presses printed; the librarians read; the desk book kept writing, and the last line it wrote before you came back is: "{name} returns at {clock}."`,
  },
  {
    id: 'event_descend',
    title: 'Down',
    cat: 'map',
    body: T`
      The key turns in the stair-lock with a sound like a word being said very quietly, and the stair goes down, and you go with it.

      The air is colder. The books are older. Your lamp is the brightest thing for a long way in every direction.`,
  },
  {
    id: 'event_remembered',
    title: 'Again',
    cat: 'mirror',
    note: 'The register. Your name is already on it.',
    body: T`
      One shelf. One press. One door. One window, painted over.

      You have been here before. You know it the way you know a tune before you can name it. This time, the first thing you notice is not the press. It is the door.`,
  },
];
