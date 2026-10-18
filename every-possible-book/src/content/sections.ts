// The forbidden sections. Each is read slowly, under dread, and gives up a key at the end.
import type { SectionId } from '../core/defs';
import { dedent, type Draft } from './types';

const T = (s: TemplateStringsArray) => dedent(s[0]);

export const SECTION_TEXTS: Record<SectionId, Draft[]> = {
  unsaid: [
    {
      id: 'sx_unsaid1',
      title: 'Things Unsaid: I',
      cat: 'fragment',
      body: T`
        "I'm sorry," said by a man on a station platform, a moment after the train had gone.
        "Stay," thought very loudly by a woman holding a door.
        "I was wrong about the house," almost said, every year, at the same dinner.`,
    },
    {
      id: 'sx_unsaid2',
      title: 'Things Unsaid: II',
      cat: 'fragment',
      body: T`
        The shelves here are deeper than the others. The books are thin, a single page each, and on each page a single sentence that somebody, somewhere, decided not to say.

        There are more of them than there are of anything else in the library. Unsaid things are the most common things there are.`,
    },
    {
      id: 'sx_unsaid3',
      title: 'Things Unsaid: III',
      cat: 'poem',
      body: T`
        The thing I didn't say to you
        has been living in my mouth for years.
        It knows my teeth. It's learned the shape of my tongue.
        If I said it now it would come out
        speaking with my accent, and you wouldn't know it.`,
    },
    {
      id: 'sx_unsaid4',
      title: 'Things Unsaid: IV',
      cat: 'mirror',
      body: T`
        You are looking for one unsaid thing among all of them. The shelf you need is near the end. The books on it are not things someone chose not to say. They are things someone said, that nobody heard.

        It's a much smaller shelf. You'd be surprised how small.`,
    },
    {
      id: 'sx_unsaid5',
      title: 'Things Unsaid: V',
      cat: 'story',
      body: T`
        On the last shelf, a book with one line, and the line is "what?" — your own word, written in your own hand, the answer you gave instead of listening.

        Inside the back cover, taped there, a key. It is shaped like a breath held too long.`,
    },
  ],
  doors: [
    {
      id: 'sx_doors1',
      title: 'Doors: I',
      cat: 'fragment',
      body: T`
        A catalog of doors: front, back, trap, stable, cellar, revolving, false, secret, garden, the door of a car in the rain, the door of an oven, the door in a hedge, the door of the room you were born in, the door of the room you will die in, the door on the south wall.`,
    },
    {
      id: 'sx_doors2',
      title: 'Doors: II',
      cat: 'story',
      body: T`
        Some of the books in this section are doors. You open one and there is a draught, and a smell of cut grass, and then it is only a book again, and your fingers are cold.`,
    },
    {
      id: 'sx_doors3',
      title: 'Doors: III',
      cat: 'poem',
      body: T`
        A door is a wall that has agreed to listen.
        A locked door is a wall that has stopped.
        A stuck door is a wall that would like to,
        but has forgotten how,
        and is waiting for someone to remind it.`,
    },
    {
      id: 'sx_doors4',
      title: 'Doors: IV',
      cat: 'mirror',
      body: T`
        You have tried the door in the first room {door}. Each time, the library made a note. The notes are here, in a ledger, in a column headed ATTEMPTS. The column next to it is headed DESIRE, and in that column, beside every entry, someone has written: "not yet."`,
    },
    {
      id: 'sx_doors5',
      title: 'Doors: V',
      cat: 'story',
      body: T`
        The last book in the section is not a book. It is a door, small, the size of a book, with a brass handle. You turn it, and it opens, and behind it is a key, hanging on a nail, and a little light that looks like afternoon.`,
    },
  ],
  mirrors: [
    {
      id: 'sx_mirrors1',
      title: 'Mirrors: I',
      cat: 'mirror',
      body: T`
        Every book in this section is about the person reading it. You open one and it begins: "{name} opened this book and began to read." You close it. You open another. "{name} closed the first book and opened this one."`,
    },
    {
      id: 'sx_mirrors2',
      title: 'Mirrors: II',
      cat: 'mirror',
      body: T`
        {name} has been in the library for {playtime}, by the library's count. {name} has sealed {shelves} shelves, {floors} floors and {wings} wings. {name} has found {texts} pages that make sense, and solved {puzzles} lucid pages, and been overrun by dread {overruns} times.

        {name} is a very good librarian. That was never the question.`,
    },
    {
      id: 'sx_mirrors3',
      title: 'Mirrors: III',
      cat: 'mirror',
      body: T`
        It is {clock}. {name} is reading this. {name} is aware, suddenly, of their own breathing, and of the room they are in — not the library, the other room, the real one, with its chair and its light and its door.

        {name} should look up. Just for a moment. The page will still be here.`,
    },
    {
      id: 'sx_mirrors4',
      title: 'Mirrors: IV',
      cat: 'poem',
      body: T`
        I looked so long into the glass
        it learned my face by heart
        and when I turned away at last
        it went on looking
        at the place where I had been,
        as if I'd only stepped into the next room.`,
    },
    {
      id: 'sx_mirrors5',
      title: 'Mirrors: V',
      cat: 'mirror',
      body: T`
        The last mirror shows the desk on the first floor, with a lamp, and someone sitting at it, reading. Behind them, at the window, a second figure, waving, trying to get their attention.

        The reader doesn't look up. Under the mirror, on a hook: a key, silvered, cold.`,
    },
  ],
  fire: [
    {
      id: 'sx_fire1',
      title: 'Fire: I',
      cat: 'story',
      body: T`
        Accounts of libraries that burned. Alexandria, perhaps, or perhaps not all at once. Small libraries in large wars. A shed at the bottom of a garden where a boy kept his comics. A shoebox of letters on a grate, on purpose.`,
    },
    {
      id: 'sx_fire2',
      title: 'Fire: II',
      cat: 'fragment',
      body: T`
        Paper burns at a temperature that has a number, and the number has been printed in every library that ever burned, which is to say, in every library.

        It is the most-read fact in the world. Nobody remembers it when it counts.`,
    },
    {
      id: 'sx_fire3',
      title: 'Fire: III',
      cat: 'poem',
      body: T`
        Some things you can't keep by keeping.
        You keep them by letting them be gone,
        the way a field keeps last year's wheat
        by having been burned and ploughed and sown.
        I know this. I have read it a thousand times.
        I have never once believed it.`,
    },
    {
      id: 'sx_fire4',
      title: 'Fire: IV',
      cat: 'story',
      body: T`
        A librarian once set fire to her library on purpose. When they asked her why, she said she had read every book in it and was tired of knowing how things ended. She wanted to find out about something without being told first.

        She lived another forty years, and was surprised by almost all of them.`,
    },
    {
      id: 'sx_fire5',
      title: 'Fire: V',
      cat: 'fragment',
      body: T`
        At the end of the section, in a small tin box: one match.

        On the lid, scratched with a pin: "For when you've decided. Not before. There's only the one."`,
    },
  ],
  elsewhere: [
    {
      id: 'sx_else1',
      title: 'Elsewhere: I',
      cat: 'map',
      body: T`
        Descriptions of places outside the library. A beach in October, the sand cold and hard as a floor. A market at seven in the morning. A hill with one tree on it, where people go to be alone together.

        The clerks file these under FICTION. Nobody has ever corrected them.`,
    },
    {
      id: 'sx_else2',
      title: 'Elsewhere: II',
      cat: 'poem',
      body: T`
        Weather. Do you remember weather?
        The way it happens to everyone at once,
        so that strangers say "isn't it" to each other
        and mean the whole sky.`,
    },
    {
      id: 'sx_else3',
      title: 'Elsewhere: III',
      cat: 'story',
      body: T`
        A description of a garden: beans on the fence, gone over into next door's apple tree. A window facing west. In the afternoon, a quarter of an hour of a particular light.

        It is described with such love that you put the book down and have to sit for a moment.`,
    },
    {
      id: 'sx_else4',
      title: 'Elsewhere: IV',
      cat: 'fragment',
      body: T`
        Outside still exists. It has been going on all this time. It has had {hours} hours of weather since you came in, by your count, and many more by its own.

        It has not been waiting for you. That isn't a cruelty. It's a kind of freedom. It means you can come back whenever you like, and it will simply be there.`,
    },
    {
      id: 'sx_else5',
      title: 'Elsewhere: V',
      cat: 'letter',
      body: T`
        The last book in the section is a postcard. On the front, a picture of the tower from the garden gate, on a fine afternoon. On the back, in handwriting you know better than your own:

        "Wish you were here."

        Tucked behind the stamp, a small key that smells of rain.`,
    },
  ],
  name: [
    {
      id: 'sx_name1',
      title: 'Your Name: I',
      cat: 'mirror',
      body: T`
        Every book in this section has {name} on the spine. Some are very old. Some are so new the ink smudges on your thumb.

        You take one down at random. It is about a child in a house with a red door, whose father reads in the big chair.`,
    },
    {
      id: 'sx_name2',
      title: 'Your Name: II',
      cat: 'mirror',
      body: T`
        Another. It is about a young person who loves reading more than anything, more than people, which is not true, but which they will believe for a long time, and which will cost them.`,
    },
    {
      id: 'sx_name3',
      title: 'Your Name: III',
      cat: 'mirror',
      body: T`
        Another. It is about two people in a house with a window facing west. One of them reads. One of them stands at the window in the afternoons and calls through the wall. This book is very short. You know how it ends before you get there.`,
    },
    {
      id: 'sx_name4',
      title: 'Your Name: IV',
      cat: 'mirror',
      body: T`
        Another. It is about someone who builds a library to find one sentence, and seals it in shelves, and floors, and wings, so they will forget how long they've been looking, so that looking can still feel like hope.

        It is about {name}. You have known that for a while.`,
    },
    {
      id: 'sx_name5',
      title: 'Your Name: V',
      cat: 'mirror',
      body: T`
        The last book with your name on it is blank. Every page. You flip through it twice to be sure.

        In the spine, where the thread should be, there is a key, very thin, and engraved along it, in tiny letters, all the times you were asked to come and look, and didn't.`,
    },
  ],
  builder: [
    {
      id: 'sx_builder1',
      title: 'The Builder: I',
      cat: 'story',
      body: T`
        The section is a single room. A desk. A chair, still warm. A lamp. On the desk, plans of the library, drawn in pencil, rubbed out and redrawn so many times the paper has gone soft as cloth.`,
    },
    {
      id: 'sx_builder2',
      title: 'The Builder: II',
      cat: 'account',
      body: T`
        The builder's notes, in the margin of the plans:

        "Presses — must never repeat."
        "Shelves — must never fill. (Impossible. Add more floors.)"
        "Forgetting — every seal. Build it into the mortar."
        "Door — leave it. Don't lock it. Just don't make it easy."`,
    },
    {
      id: 'sx_builder3',
      title: 'The Builder: III',
      cat: 'letter',
      body: T`
        A letter, from the builder, to the librarian:

        You won't remember writing this, so let me tell you. You did this to yourself, and you did it out of love, and you were right to, for a while. Grief needs somewhere to live. This was a good place. But it was supposed to be a place to stay a while. Not a place to stay.`,
    },
    {
      id: 'sx_builder4',
      title: 'The Builder: IV',
      cat: 'poem',
      body: T`
        I built it so the sentence would exist.
        Then I built it so big I couldn't find it.
        Then I forgot I'd built it, so it wouldn't hurt.
        I was very thorough.
        I was always very thorough.
        That was the trouble, wasn't it — that, and the not looking up.`,
    },
    {
      id: 'sx_builder5',
      title: 'The Builder: V',
      cat: 'story',
      body: T`
        In the desk drawer, the last key, and a slip of paper giving directions: down, through the galleries, seven times, to the Center. The book is there. The builder put it there on the first day, before building anything else, and then built everything else around it so it would be very, very hard to reach.`,
    },
  ],
};
