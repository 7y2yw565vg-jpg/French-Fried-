// Desks and echoes in the Infinite Stacks: four per level, seven levels down.
import { dedent, type Draft } from './types';

const T = (s: TemplateStringsArray) => dedent(s[0]);

export const STACK_TEXTS: Draft[][] = [
  [
    {
      id: 'st0_1',
      title: 'A Desk in the First Gallery',
      cat: 'marginalia',
      body: T`
        A desk, a cold lamp, a cup with a ring of something long dried in the bottom. A note under the cup: "Start counting the galleries. You'll lose count by forty. Count anyway."`,
    },
    {
      id: 'st0_2',
      title: 'An Echo',
      cat: 'fragment',
      note: 'A voice from the next gallery. There is no one in the next gallery.',
      body: T`
        "—just one more page—"`,
    },
    {
      id: 'st0_3',
      title: 'A Book Left Open',
      cat: 'mirror',
      body: T`
        The page reads: "...and walked into the first gallery with a lamp, which was not enough lamp, and not enough oil, and kept walking anyway..."`,
    },
    {
      id: 'st0_4',
      title: 'Chalk on the Floor',
      cat: 'map',
      body: T`
        An arrow, chalked, pointing down the stair. Beside it: "the keys go in the order you found them." Beside that, in a different chalk: "the order you were given them."`,
    },
  ],
  [
    {
      id: 'st1_1',
      title: 'Unbound Pages',
      cat: 'fragment',
      body: T`
        Loose pages drift across this level like leaves. Each one has a single real sentence on it. You catch one: "The beans have gone into next door's tree again."`,
    },
    {
      id: 'st1_2',
      title: 'An Echo',
      cat: 'fragment',
      body: T`
        "—in a minute—"

        Your own voice. Younger.`,
    },
    {
      id: 'st1_3',
      title: 'A Desk With Two Chairs',
      cat: 'story',
      body: T`
        Two chairs at one desk, side by side. One worn, one barely sat in. On the barely-sat-in one, a cushion, plumped, as if someone had been expected any moment for years.`,
    },
    {
      id: 'st1_4',
      title: 'Marginalia, Deep',
      cat: 'marginalia',
      body: T`
        The Section of Things Unsaid was only the start. Down here are things unheard. They are much quieter and much heavier.

        — {initial}.`,
    },
  ],
  [
    {
      id: 'st2_1',
      title: 'Low Ceilings',
      cat: 'map',
      body: T`
        The galleries here are so low you have to stoop. The shelves are full of books about bending: reeds, backs, rules, the light at the bottom of a glass of water.`,
    },
    {
      id: 'st2_2',
      title: 'An Echo',
      cat: 'fragment',
      body: T`
        "—come and look—"

        Not your voice.`,
    },
    {
      id: 'st2_3',
      title: 'A Child’s Drawing',
      cat: 'story',
      body: T`
        Crayon on the back of a catalog card: a house with a red door, a garden, a sun with a face. In the window, a tiny figure at a desk, with a speech bubble from outside the house pointing in: "COME OUT."`,
    },
    {
      id: 'st2_4',
      title: 'Lamp-Oil Ledger',
      cat: 'account',
      body: T`
        Oil used, this level: more than the last. Oil remaining: less. The ledger notes that the lamp will always have exactly enough oil to keep going, and never enough to stop worrying.`,
    },
  ],
  [
    {
      id: 'st3_1',
      title: 'The Flooded Stacks',
      cat: 'map',
      body: T`
        Water to the ankle, still and black. The lowest shelves are swollen and the books on them have fused into blocks, pages and pages pressed into a single thick silence.`,
    },
    {
      id: 'st3_2',
      title: 'An Echo',
      cat: 'fragment',
      body: T`
        "—what?—"

        "—never mind—"

        Over and over, like water against a step.`,
    },
    {
      id: 'st3_3',
      title: 'A Note in a Bottle',
      cat: 'letter',
      body: T`
        Corked, floating between two shelves:

        "If anyone finds this, I'm on the fourth level, and I've stopped. Not given up. Stopped. There's a difference, and I'm only just beginning to see it."

        The handwriting is yours.`,
    },
    {
      id: 'st3_4',
      title: 'Reflections',
      cat: 'mirror',
      body: T`
        In the black water, the galleries go down as well as up. You look at your reflection a long time. It looks tired. It looks like it would like very much to be told it can stop.`,
    },
  ],
  [
    {
      id: 'st4_1',
      title: 'The Gallery of Sleepers',
      cat: 'story',
      body: T`
        People at desks, heads on their arms, asleep. All of them librarians. All of them, when you look closely, you — at different ages, with different lamps, holding open different books. None of them wakes. Their breathing is very slow and very even.`,
    },
    {
      id: 'st4_2',
      title: 'An Echo',
      cat: 'fragment',
      body: T`
        "—it's a lovely day—"`,
    },
    {
      id: 'st4_3',
      title: 'A Sleeper’s Note',
      cat: 'marginalia',
      body: T`
        Pinned to one sleeper's sleeve: "I came this far and got tired and sealed myself, the way we seal shelves. I'm all right. Don't wake me. Do keep going."

        — {initial}.`,
    },
    {
      id: 'st4_4',
      title: 'Count of Sleepers',
      cat: 'account',
      body: T`
        You try to count them. You lose count at forty. You count anyway. There are, as far as you can tell, {cycle} of you that made it this far, this time — and many, many more that didn't.`,
    },
  ],
  [
    {
      id: 'st5_1',
      title: 'The Gallery Without Lamps',
      cat: 'map',
      body: T`
        No lamps at all. Your own is the only light, and it lights only you. The books here are read by touch: raised letters, worn smooth by fingers. Yours fit the grooves.`,
    },
    {
      id: 'st5_2',
      title: 'An Echo',
      cat: 'fragment',
      body: T`
        "—don't spend it—"

        The rest is lost in the stacks.`,
    },
    {
      id: 'st5_3',
      title: 'Braille, Worn',
      cat: 'poem',
      body: T`
        Here I read with my hands, as if the words were a face
        I was trying to remember in the dark.
        It's easier than you'd think.
        I knew it all along.
        I just needed to stop looking.`,
    },
    {
      id: 'st5_4',
      title: 'The Last Marginalia',
      cat: 'marginalia',
      body: T`
        This is the last one I'll leave. The Center is just below. I've been there many times. I always come back up and seal everything and start again, because I couldn't bear what I'd have to choose.

        You can bear it. I think. I hope.

        — {initial}.`,
    },
  ],
  [
    {
      id: 'st6_1',
      title: 'The Center',
      cat: 'map',
      body: T`
        The last gallery is round, not hexagonal. In the middle, a lectern, and on it a book. Somewhere to one side, the low red breathing of a furnace. Somewhere to the other, a door, ordinary, swollen in its frame, with daylight around its edges.`,
    },
    {
      id: 'st6_2',
      title: 'An Echo',
      cat: 'fragment',
      body: T`
        Nothing. For the first time since you came in, nothing at all. The presses, far above, have stopped. Or you have stopped hearing them.`,
    },
    {
      id: 'st6_3',
      title: 'Three Things',
      cat: 'fragment',
      body: T`
        A book you could read.
        A match you could strike.
        A door you could open.
        You could do all three. People have. They always end at the door.`,
    },
    {
      id: 'st6_4',
      title: 'The Lectern',
      cat: 'mirror',
      body: T`
        The book on the lectern has no title. On the spine, where the title would be, there is a small worn place, the size of a thumb, where someone has touched it every time they came here, and every time decided not to open it.`,
    },
  ],
];
