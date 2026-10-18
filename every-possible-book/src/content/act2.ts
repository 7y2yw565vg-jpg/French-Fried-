// Act II: the tower. The books begin to describe the library, and then the choices you made in it.
// Someone built this place. Someone lost something.
import { dedent, type Draft } from './types';

const T = (s: TemplateStringsArray) => dedent(s[0]);

export const ACT2: Draft[] = [
  {
    id: 'a2_stair',
    title: 'The Stair',
    cat: 'map',
    body: T`
      Behind the shelf, where the shelf had been, a stair. It goes up. The treads are worn in the middle, deeply, the way stone wears under centuries of the same feet. You put your foot in the hollow. It fits.`,
  },
  {
    id: 'a2_floorplan',
    title: 'Plan of the Second Floor',
    cat: 'map',
    body: T`
      Identical to the first. One shelf. One press. One desk. One door, locked. One window, painted over.

      Marked in pencil on the plan, at the desk: an X, and the words "you are here," and then, smaller, "again."`,
  },
  {
    id: 'a2_account1',
    title: 'An Account of the First Days',
    cat: 'account',
    body: T`
      In the beginning the librarian had one press, and read by hand, turning the pages with a thumb. The first thing the librarian ever bought was {first1}. Then {first2}. Then {first3}.

      The account does not say whether these were wise choices. It only says that they were made, and that they were remembered, though not by the one who made them.`,
  },
  {
    id: 'a2_builder1',
    title: 'Concerning the Builder',
    cat: 'story',
    body: T`
      Every library has a builder. This one's is not named on any foundation stone. The masons' marks on the lowest courses are all the same mark, repeated: a single letter, cut in a hurry, as if by someone who meant to come back and finish it properly.

      The letter is {initial}.`,
  },
  {
    id: 'a2_poem1',
    title: 'Ascent',
    cat: 'poem',
    body: T`
      Every floor I climb I leave a floor behind,
      and every floor I leave is full,
      and every full floor is a forgetting
      that holds its shape like a hand around a cup
      after the cup is gone.`,
  },
  {
    id: 'a2_clerk',
    title: 'Memorandum to Catalog Clerks',
    cat: 'account',
    body: T`
      Clerks will file all found texts under the appropriate drawer. Texts that describe the library are to be filed under MAPS. Texts that describe the reader are to be filed under MIRRORS. Texts that describe the reader filing this memorandum are to be left on the desk, unfiled, until further notice.`,
  },
  {
    id: 'a2_margin1',
    title: 'Marginalia, Second Floor',
    cat: 'marginalia',
    body: T`
      You climbed. Good. I climbed too. I don't remember the first floor at all now, only that I left something on the desk there that I meant to come back for.

      — {initial}.`,
  },
  {
    id: 'a2_window',
    title: 'The Window',
    cat: 'story',
    body: T`
      In the house there was a window that faced west, and in the afternoons the light came through it sideways and made the dust in the air turn gold.

      Someone used to stand at that window and call into the next room, where someone else was reading. "Come and look," they would say. "Quickly, before it goes."

      And the reader would say "in a minute," and finish the page, and the next page, and by the time they came the light was always gone.`,
  },
  {
    id: 'a2_tally',
    title: 'A Tally on the Wall',
    cat: 'account',
    body: T`
      Scratched into the plaster beside the desk: groups of five, four strokes and a line through. Hundreds of them. Then thousands. The ones near the floor are so old they are almost smooth.

      The newest group has {shelves} strokes in it. That is the number of shelves you have sealed. You do not remember scratching them.`,
  },
  {
    id: 'a2_runes',
    title: 'What the Machines Hear',
    cat: 'fragment',
    body: T`
      The translation machines, left running at night, begin to produce the same phrase in every language they know. In Latin it is a prayer. In Greek it is a question. In the runes it is a name, cut very deep.

      In your own language it comes out as: "What did you say?"`,
  },
  {
    id: 'a2_poem2',
    title: 'Elegy for a Voice',
    cat: 'poem',
    body: T`
      I kept your coat. I kept your shoes.
      I kept the list in your handwriting: eggs, lamp oil, thread.
      I did not keep your voice. Nobody told me
      it was the kind of thing that had to be kept.`,
  },
  {
    id: 'a2_presses',
    title: 'Census of Presses',
    cat: 'account',
    body: T`
      At the time of this census the library contains {presses} printing presses on the current floor, attended by {librarians} librarians. Between them they have read {booksRead} books.

      The census taker notes that this is very nearly no books at all, as a fraction of the whole, and recommends patience.`,
  },
  {
    id: 'a2_builder2',
    title: 'Concerning the Builder (Continued)',
    cat: 'story',
    body: T`
      The builder was not an architect. The builder was a reader, someone who had always preferred the inside of books to the outside of things. When the builder decided to build a library, it was not to keep books. It was to find one.

      "There is a sentence I need," the builder told the masons. "I didn't hear it properly. It must be written down somewhere. If every sentence is written down somewhere, it will be too."`,
  },
  {
    id: 'a2_letter1',
    title: 'Letter Found Between Floors',
    cat: 'letter',
    body: T`
      To whoever has my job now:

      There is a draught on the stair between the second and third floors. I tried for a long time to find where it comes from. It comes from outside. I stopped looking for it. I suggest you do the same.`,
  },
  {
    id: 'a2_catalog',
    title: 'The Catalog Cards',
    cat: 'fragment',
    body: T`
      Every card in the catalog is written in the same hand. The clerks insist each of them wrote their own. When you line the cards up, the handwriting is your handwriting, aged by different amounts: a child's, a young person's, an old one's.`,
  },
  {
    id: 'a2_margin2',
    title: 'Marginalia, Third Floor',
    cat: 'marginalia',
    body: T`
      Stop trying the door. Or don't. I tried it {door}. It doesn't open from in here. But keep trying, perhaps; one of us should.

      — {initial}.`,
  },
  {
    id: 'a2_fable2',
    title: 'The Miller’s Echo',
    cat: 'story',
    body: T`
      A miller shouted into a valley and the valley shouted back. Delighted, he shouted again, and again, until the echoes overlapped and filled the valley with his own voice.

      Then he fell silent to listen, and found that the valley kept talking. It had learned. It went on without him for years, and travellers who passed through heard a man calling, and called back, and never found him.`,
  },
  {
    id: 'a2_poem3',
    title: 'The Reader in the Next Room',
    cat: 'poem',
    body: T`
      Your voice through the wall like weather,
      rising, the way it rises at a question,
      then going down again, letting it go.
      I said "what?" with my eyes still on the line.
      You said "never mind."
      I have minded ever since.`,
  },
  {
    id: 'a2_choices',
    title: 'A Description of Your Habits',
    cat: 'mirror',
    note: 'The page is warm, as if someone has just put it down.',
    body: T`
      The librarian tends to buy {last} when uncertain. The librarian has sealed {shelves} shelves and {floors} floors, and each time hesitated for a moment, and each time did it anyway.

      The librarian has read {texts} pages that made sense, including this one, which the librarian is reading now.`,
  },
  {
    id: 'a2_rules',
    title: 'Rules for Librarians (Revised)',
    cat: 'fragment',
    body: T`
      I. The library has always existed.
      II. The library was built.
      III. Both of the above are true. Do not ask a clerk to reconcile them; it upsets the clerks.`,
  },
  {
    id: 'a2_map2',
    title: 'Elevation, North Face',
    cat: 'map',
    body: T`
      Drawn by someone standing outside. The tower is shown rising floor on floor out of a garden. There are beans on the fence. There is an apple tree. In one window near the bottom, very small, a figure at a desk with a lamp.

      The draughtsman has written beneath: "taken from the gate, on a fine afternoon."`,
  },
  {
    id: 'a2_story3',
    title: 'Two Readers',
    cat: 'story',
    body: T`
      Two readers shared a house and a single lamp. In the evenings they sat on either side of it, and each read their own book, and sometimes one would read a line aloud, and the other would look up and smile.

      After one of them was gone, the other kept reading lines aloud for a while. Then stopped. Then moved the lamp to the middle of the table, so there would be no empty side.`,
  },
  {
    id: 'a2_margin3',
    title: 'Marginalia, Fourth Floor',
    cat: 'marginalia',
    body: T`
      Don't read the Greek ones at night.

      — {initial}.`,
  },
  {
    id: 'a2_account2',
    title: 'Time Sheet',
    cat: 'account',
    body: T`
      Hours worked this shift: {hours}.
      Minutes worked this shift: {minutes}.
      Shifts worked: (illegible — the column runs off the page, and onto the desk, and the desk is covered in it).`,
  },
  {
    id: 'a2_poem4',
    title: 'Tower',
    cat: 'poem',
    body: T`
      I built it tall so I could see out.
      I built it with no windows so I wouldn't.
      Both of these were me, on different days.
      Neither one of me came down.`,
  },
  {
    id: 'a2_letter2',
    title: 'Letter, Water-Stained',
    cat: 'letter',
    body: T`
      ...you're doing it again. You've been in there since breakfast. The kettle's gone cold twice. It's the most beautiful day, and I'm going to stand at the window until you come and see it, and if you don't come, I'll tell you about it afterwards, and you'll pretend you were listening...`,
  },
  {
    id: 'a2_predict1',
    title: 'A Book in the Future Tense',
    cat: 'prophecy',
    body: T`
      The librarian will seal another floor. The librarian will find this page and think it is a coincidence. The librarian will climb. On a floor much higher than this one, the librarian will open a wing, and the wing will have no walls.`,
  },
  {
    id: 'a2_masons',
    title: 'The Masons’ Song',
    cat: 'poem',
    body: T`
      Lay it level, lay it plumb,
      lay it for the one to come,
      cut the mark and set the stone,
      the one to come will come alone.`,
  },
  {
    id: 'a2_margin4',
    title: 'Marginalia, Fifth Floor',
    cat: 'marginalia',
    body: T`
      I've started to recognise the books. Not the words — the books. Their weight in the hand. I think I've read some of them before. I think they think so too.

      — {initial}.`,
  },
  {
    id: 'a2_seal',
    title: 'On Sealing',
    cat: 'fragment',
    body: T`
      When a shelf is sealed, what is on it is not destroyed. It is put somewhere the librarian cannot reach. This is not the same as being lost, the clerks say. It is more like the way a name is still in you, somewhere, on the days you can't think of it.`,
  },
  {
    id: 'a2_builder3',
    title: 'Concerning the Builder (Continued Further)',
    cat: 'story',
    body: T`
      The builder worked out the arithmetic and wept. Even with every press in the world, even reading a thousand books a second, the sentence might not turn up for longer than there had been stars.

      So the builder decided on two things. To build a library that would never stop. And to forget, at regular intervals, how long it had been — so that every morning in it could feel like the first.`,
  },
  {
    id: 'a2_story4',
    title: 'The Locksmith',
    cat: 'story',
    body: T`
      A locksmith was asked to make a lock that could not be opened. He made it, and was proud of it, and then a terrible thought occurred to him, and he went back to the client.

      "From which side," he asked, "should it not be opened?"

      The client had not considered this, and has been considering it ever since.`,
  },
  {
    id: 'a2_mirror1',
    title: 'Portrait of a Reader',
    cat: 'mirror',
    body: T`
      The reader is tired. The reader has been looking at this page for longer than it needed. The reader is wondering whether to read the next one now, or later. It is {clock}, and the reader is wondering whether it is too late to keep going.

      It is.`,
  },
  {
    id: 'a2_margin5',
    title: 'Marginalia, Sixth Floor',
    cat: 'marginalia',
    body: T`
      If you are reading these in order, then I left them in order. I didn't. So someone is putting them in order for you. Think about who.

      — {initial}.`,
  },
  {
    id: 'a2_poem5',
    title: 'Afternoon',
    cat: 'poem',
    body: T`
      There is a kind of light that only happens once a day
      for a quarter of an hour
      in one room of one house
      and I have spent my whole life in the next room.`,
  },
  {
    id: 'a2_inventory2',
    title: 'Inventory of a Tower',
    cat: 'account',
    body: T`
      Floors: {floors} sealed, one open.
      Shelves: {shelves} sealed, one open.
      Doors: one per floor, all locked, all on the south wall, all directly above one another.
      Windows: all painted over. From this side.`,
  },
  {
    id: 'a2_wings',
    title: 'The Top of the Tower',
    cat: 'map',
    body: T`
      At the top of the tower there is no roof. There is more library, going out sideways in every direction: wings, the clerks call them, though they don't fly, and you can't see where they end.

      There are more of them than there were the last time you looked.`,
  },
  {
    id: 'a2_letter3',
    title: 'Letter, Never Folded',
    cat: 'letter',
    body: T`
      You'll laugh. I had a dream that you built a house made entirely of books, so many books that you couldn't find the door, and I was outside calling you, and you could hear me but you were sure that if you just read one more you'd find the page that told you what I was saying.

      It's only a dream. Come to breakfast.`,
  },
  {
    id: 'a2_mirror2',
    title: 'A Book About Someone Reading',
    cat: 'mirror',
    body: T`
      This book is about {name}.

      You stop. You read it again. It still says {name}. You close it and look at the spine, and the spine is blank, and when you open it again it has gone back to noise.`,
  },
  {
    id: 'a2_last',
    title: 'The Clerk’s Warning',
    cat: 'letter',
    body: T`
      Sir, Madam, Librarian —

      Some of the books in the outer wings have begun describing things that haven't happened yet. Some of us have read our own. We are not permitted to tell you what they say. But we would like you to know that a number of the clerks have asked to be transferred to the inner floors, where the books are still only nonsense, and nonsense is restful.`,
  },
];
