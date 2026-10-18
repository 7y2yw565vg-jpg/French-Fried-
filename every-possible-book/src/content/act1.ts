// Act I: one room, one shelf. Most of what the presses make is noise; some of it is ordinary life.
// The first hints that someone was here before you.
import { dedent, type Draft } from './types';

const T = (s: TemplateStringsArray) => dedent(s[0]);

export const ACT1: Draft[] = [
  {
    id: 'a1_list',
    title: 'A List',
    cat: 'fragment',
    body: T`
      eggs
      lamp oil
      thread (black)
      the good scissors
      ask about the window`,
  },
  {
    id: 'a1_weather',
    title: 'Weather, Tuesday',
    cat: 'fragment',
    body: T`
      Fair in the morning with a light wind from the west. Showers by evening. Those who must travel are advised to carry a coat, and to leave before the light goes.`,
  },
  {
    id: 'a1_rhyme',
    title: 'Counting Rhyme',
    cat: 'poem',
    body: T`
      One for the press and two for the page,
      three for the reader grown grey with age,
      four for the shelf and five for the stair,
      six for the door that is never there.`,
  },
  {
    id: 'a1_recipe',
    title: 'Bread, for Two',
    cat: 'account',
    body: T`
      Flour, a good deal of it. Water, warm as a wrist. Salt. Yeast if you have it; patience if you do not.

      Knead until it stops sticking to you. Leave it covered by the window, where it is warm. It will double while you are not looking. Everything good does.

      Bake. Break it while it is too hot. Give the larger half away.`,
  },
  {
    id: 'a1_margin1',
    title: 'Pencil, in a Margin',
    cat: 'marginalia',
    note: 'Written faintly beside a column of nonsense.',
    body: T`
      not this one either

      — {initial}.`,
  },
  {
    id: 'a1_love',
    title: 'Half a Letter',
    cat: 'letter',
    body: T`
      ...and I keep meaning to tell you, but you are always reading when I come in, and you look so far away I don't like to call you back. So I'll write it instead, and leave it in the book you're on, and you'll find it when you get to the end. You always get to the end.`,
  },
  {
    id: 'a1_inventory',
    title: 'Inventory of a Room',
    cat: 'account',
    body: T`
      One shelf (pine).
      One press (iron, oak).
      One desk. One chair.
      One lamp, unlit.
      One door, locked.
      One window, painted over.
      One occupant.`,
  },
  {
    id: 'a1_sparrow',
    title: 'Sparrow',
    cat: 'poem',
    body: T`
      A sparrow came in through a crack in the roof
      and sat on the press as if it were a branch.
      It looked at me the way you look at a word
      you think you know.
      Then it left, and the crack was gone.`,
  },
  {
    id: 'a1_rules',
    title: 'Rules for Librarians (Fragment)',
    cat: 'fragment',
    body: T`
      III. Do not read aloud.
      IV. Do not shelve a book you have not finished.
      V. Do not try to finish every book.
      VI. If a book describes the room you are in, close it gently and set it face down.`,
  },
  {
    id: 'a1_fable',
    title: 'The Fox and the Ladder',
    cat: 'story',
    body: T`
      A fox found a ladder leaning against nothing at all. It climbed, because that is what ladders are for, and at the top there was another ladder, and at the top of that one, another.

      After many days the fox looked down and could not see the ground. "Well," it said, "I suppose I live here now." And it did, and it was not unhappy, though it sometimes dreamt of grass.`,
  },
  {
    id: 'a1_margin2',
    title: 'Ink, Pressed Hard',
    cat: 'marginalia',
    note: 'The pen went through the page.',
    body: T`
      Count the presses. If there is only one, you have just arrived. If there is only one and you have been here a long time, something is wrong.

      — {initial}.`,
  },
  {
    id: 'a1_hymn',
    title: 'A Hymn for Evening',
    cat: 'poem',
    body: T`
      Now the lamps are lit in every window,
      now the bread is broken, now the door is barred.
      Keep us, little light, through the long hours,
      and if we must wake, wake us gently, and not alone.`,
  },
  {
    id: 'a1_receipt',
    title: 'Receipt',
    cat: 'account',
    body: T`
      RECEIVED with thanks:
      one (1) library, furnished.
      Paid in full.
      The undersigned waives all claim to the world outside.

      Signed: an ink blot, very carefully made.`,
  },
  {
    id: 'a1_child',
    title: 'Composition',
    cat: 'story',
    note: 'In a child’s round hand.',
    body: T`
      MY HOUSE by me

      My house has a red door and a garden with beans. My mother sings in the kitchen. My father reads in the big chair and when you call him he says "mm" and keeps reading. My sister says one day he will read himself all the way into the book and we will have to put him on the shelf. I think that would be all right because then we would always know where he is.`,
  },
  {
    id: 'a1_borges',
    title: 'On the Size of the Collection',
    cat: 'fragment',
    body: T`
      If the alphabet has twenty-five symbols, and every book has four hundred and ten pages, and every page has forty lines of eighty letters, then the number of possible books is a number with more than a million digits. Writing the number down would take a book. Not a large book. But a book, and then it would be on the shelf with the others.`,
  },
  {
    id: 'a1_letter2',
    title: 'Letter, Unsent',
    cat: 'letter',
    body: T`
      Dear —,

      The garden is doing well. The beans have climbed the fence and gone on into next door's apple tree, and nobody has the heart to stop them. I have started leaving the window open in the afternoons. I don't know why I'm telling you this. I suppose because you always asked, and I always said "fine," and now I have something to say and no one to say "fine" to.`,
  },
  {
    id: 'a1_margin3',
    title: 'A Crossed-Out Line',
    cat: 'marginalia',
    body: T`
    I found the sentence. I found it. It was on the

    — the rest is scraped away with a blade.`,
  },
  {
    id: 'a1_proverb',
    title: 'Proverbs',
    cat: 'fragment',
    body: T`
      A shelf is a wall that has learned to hold things.
      The press does not know what it says; neither does the river.
      Read slowly in the dark. Read quickly in the light. Read.
      Whatever you are looking for is on the next page, which is why there is always a next page.`,
  },
  {
    id: 'a1_lantern',
    title: 'The Lamplighter',
    cat: 'story',
    body: T`
      In the town there was a lamplighter who lit the lamps at dusk and put them out at dawn. One evening a child asked her what she did all night.

      "I walk the streets," she said, "and make sure the lamps are still lit."

      "And are they?"

      "Always," she said. "But I have to look. That's the job. Not the lighting. The looking."`,
  },
  {
    id: 'a1_index',
    title: 'Index (Partial)',
    cat: 'account',
    body: T`
      Absence, 4, 17, 202–209
      Afternoon, light in the, 33
      Apples, see also Neighbours, 61
      Asking, the last time, 410
      Door, the, passim`,
  },
  {
    id: 'a1_poem2',
    title: 'Small Hours',
    cat: 'poem',
    body: T`
      At three in the morning the house is a ship
      and every room is below the waterline.
      You lie and listen to the timbers think.
      Somewhere a tap is counting to infinity
      one drop at a time, and losing count, and beginning again.`,
  },
  {
    id: 'a1_rules2',
    title: 'Rules for Librarians (Another Fragment)',
    cat: 'fragment',
    body: T`
      XI. The press is not to be stopped. If the press stops, write down the time.
      XII. There is no XIII.
      XIV. If you find a book with your name on the spine, see XIII.`,
  },
  {
    id: 'a1_margin4',
    title: 'Under the Last Line',
    cat: 'marginalia',
    body: T`
      You will want to seal the shelf soon. It's all right. It doesn't hurt. You will forget the shelf, and the forgetting is the kindest thing in the building.

      — {initial}.`,
  },
  {
    id: 'a1_knot',
    title: 'Instructions for a Knot',
    cat: 'account',
    body: T`
      Make a loop. Pass the end behind, then through. Draw it tight against itself. A good knot holds because each part is pulling on another part, and none of them can let go first.`,
  },
  {
    id: 'a1_well',
    title: 'The Well',
    cat: 'story',
    body: T`
      There was a well in the middle of the village that answered questions. You leaned over and asked, and your voice came back changed.

      A woman asked, "Will he come home?" and the well said, "home."

      A man asked, "What did she say, at the end?" and the well said, "the end."

      A child asked, "Are you just repeating us?" and the well was quiet a long while, and then it said, "yes," and the child was the only one who went away satisfied.`,
  },
  {
    id: 'a1_poem3',
    title: 'Inventory',
    cat: 'poem',
    body: T`
      What I kept: a button, a ticket, a ring of keys to doors that are no longer doors.
      What I lost: the sound of the gate, the smell of the kitchen, the third verse.
      What I would trade the first list for: the third verse.`,
  },
  {
    id: 'a1_margin5',
    title: 'Written Small, Along the Spine',
    cat: 'marginalia',
    body: T`
      The window was never painted over from this side.

      — {initial}.`,
  },
  {
    id: 'a1_almanac',
    title: 'Almanac',
    cat: 'fragment',
    body: T`
      The first frost will come early. Plant garlic before it. The birds will leave in the second week; do not take it personally. On the longest night, sit up with someone. On the shortest, go out.`,
  },
  {
    id: 'a1_ledger',
    title: 'Ledger, Page One',
    cat: 'account',
    body: T`
      Day 1. One press. It prints a book in two seconds. Every book is nonsense.
      Day 2. Still nonsense. Found the word "door."
      Day 9. "The door."
      Day 40. Bought a second press.
      Day 400. Stopped counting days.`,
  },
  {
    id: 'a1_owl',
    title: 'Lullaby',
    cat: 'poem',
    body: T`
      Hush, the owl is on the roof,
      hush, the moon is in the well,
      hush, the books are on the shelf
      and none of them will tell.`,
  },
  {
    id: 'a1_letter3',
    title: 'Letter, Folded Very Small',
    cat: 'letter',
    body: T`
      I don't mind the reading. Truly. I like that you love it. I only wish you'd look up sometimes, when the light comes in sideways in the afternoon, because it does something to the room that I can't describe, and you're always missing it. One day I'll make you look.`,
  },
  {
    id: 'a1_mapping',
    title: 'Survey of the Room',
    cat: 'map',
    body: T`
      North wall: the shelf.
      East wall: the press.
      South wall: the door.
      West wall: the window, painted.
      Ceiling: higher than expected.
      Floor: worn smooth in a line from the shelf to the press and back, as if someone had walked it for a very long time.`,
  },
  {
    id: 'a1_parable',
    title: 'The Tailor',
    cat: 'story',
    body: T`
      A tailor was asked to make a coat that would fit anyone. He worked for a year and made a coat of such cleverness that it fit everyone who tried it, the tall and the short, the broad and the thin.

      But no one wanted it. "It fits," they said, "but it isn't mine."

      So he made one coat for each of them instead, and that took the rest of his life, and he said afterwards it was the better use of it.`,
  },
  {
    id: 'a1_margin6',
    title: 'Pencil, Rubbed Almost Away',
    cat: 'marginalia',
    body: T`
      How long have you been here? Don't answer that. You'll be wrong.

      — {initial}.`,
  },
  {
    id: 'a1_psalm',
    title: 'A Psalm of the Shelf',
    cat: 'poem',
    body: T`
      I have set every word before me
      and none of them is the word.
      I have numbered the pages of the morning
      and the evening has more pages.
      Yet I will read, for reading is a kind of waiting,
      and waiting is a kind of love.`,
  },
  {
    id: 'a1_question',
    title: 'Examination Paper',
    cat: 'fragment',
    body: T`
      1. If a press prints every possible book, does it print this one? Show your working.
      2. If it prints this one, did anyone write it?
      3. If no one wrote it, who are you answering?`,
  },
  {
    id: 'a1_neighbour',
    title: 'Note Left on a Step',
    cat: 'letter',
    body: T`
      Took the apples from the tree that hangs over — hope you don't mind — there were far too many for us. Have left a pie on your step. Knocked but you must have been reading. Your lamp was on all night again.`,
  },
  {
    id: 'a1_clock',
    title: 'Horology',
    cat: 'fragment',
    body: T`
      The library has no clock. This is deliberate. A clock would tell you how long you have been here, and then you would have to decide what to do about it.`,
  },
  {
    id: 'a1_margin7',
    title: 'In Red Ink',
    cat: 'marginalia',
    body: T`
      The presses print everything, which means they print lies. Don't trust a book because it knows things. Especially then.

      — {initial}.`,
  },
  {
    id: 'a1_seafarer',
    title: 'The Sailor’s Wife',
    cat: 'poem',
    body: T`
      She learned the sea by heart, every wave,
      reckoned the tides on the kitchen table,
      so that when the ship came in she would know it.
      The ship came in. She knew it.
      She had forgotten what he looked like,
      but she knew the ship.`,
  },
  {
    id: 'a1_pattern',
    title: 'A Pattern Noticed',
    cat: 'account',
    body: T`
      The words you find are not random. Count them. "Door" turns up more than it should. So does "window." So does "afternoon."

      Either the press has a preference, or you do.`,
  },
  {
    id: 'a1_story_bell',
    title: 'The Bell-Founder',
    cat: 'story',
    body: T`
      The bell-founder cast a bell so large that it took the whole town to raise it. On the first morning they rang it, and it was so loud that everyone in the town forgot what they had been saying.

      They never recovered the conversation. They agreed, afterwards, that it had probably not been important. But some of them still stop, sometimes, in the middle of a sentence, and listen.`,
  },
  {
    id: 'a1_margin8',
    title: 'On the Endpaper',
    cat: 'marginalia',
    body: T`
      Seal it. Then seal the next one. You'll have to go up eventually; the shelves will run out of room for what you've forgotten.

      — {initial}.`,
  },
  {
    id: 'a1_last',
    title: 'A Page That Describes This Room',
    cat: 'mirror',
    note: 'You set it face down, as the rules say. Then you turn it over again.',
    body: T`
      There is a room with one shelf and a press. Someone sits at the desk reading this sentence. They have bought {first1}, and then {first2}, and then {first3}. They think they are the first one here.`,
  },
];
