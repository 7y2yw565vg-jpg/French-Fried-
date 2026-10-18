// Act III: the wings, and nothing holding them up. The books describe you, and then they get ahead of you.
import { dedent, type Draft } from './types';

const T = (s: TemplateStringsArray) => dedent(s[0]);

export const ACT3: Draft[] = [
  {
    id: 'a3_wing',
    title: 'First Survey of the Wings',
    cat: 'map',
    body: T`
      The wing goes on. The surveyor walked for a day in a straight line and found galleries, hexagonal, each one the same: four walls of shelves, two doorways, a stair spiralling up and down in the middle, and a small mirror by the stair.

      In each mirror, the surveyor reports, there was someone who looked like the surveyor, but who seemed to be looking for something just behind them.`,
  },
  {
    id: 'a3_you1',
    title: 'Concerning {name}',
    cat: 'mirror',
    body: T`
      {name} came to the library a long time ago, and has been reading for {playtime} — or at least, that is how much of it {name} can remember.

      {name} is reading this on a {weekday}, at {clock}. {name} has just looked up from the page, to see if anyone is standing behind them.`,
  },
  {
    id: 'a3_predict1',
    title: 'The Desk Book',
    cat: 'prophecy',
    note: 'An open book on your desk. You did not leave it open.',
    body: T`
      The next thing the librarian buys will be {prediction}.

      The librarian will read this and feel a small, cold doubt, and will consider buying something else instead, just to prove the book wrong. It does not matter which the librarian chooses. The book has room for both.`,
  },
  {
    id: 'a3_forbidden',
    title: 'A Notice on a Door',
    cat: 'fragment',
    body: T`
      FORBIDDEN SECTIONS.
      Admission by key only.
      The library accepts no responsibility for what the reader may learn about themselves.
      Please close the door behind you; there is a draught, and it is coming from inside.`,
  },
  {
    id: 'a3_poem1',
    title: 'No Walls',
    cat: 'poem',
    body: T`
      Out here the shelves don't stand against anything.
      They stand against each other, and the dark between them
      is just more room, waiting for more shelves.
      I used to think a wall was what kept the world out.
      It was what kept me in.`,
  },
  {
    id: 'a3_margin1',
    title: 'Marginalia, First Wing',
    cat: 'marginalia',
    body: T`
      You're further than I got. I stopped at the second wing. I sat down at a desk to rest and I'm still sitting, and you're reading this, which means you've walked past me.

      Did you notice? You did. You thought I was a coat on a chair.

      — {initial}.`,
  },
  {
    id: 'a3_clock',
    title: 'What Time It Is',
    cat: 'mirror',
    body: T`
      It is {clock}. You have been reading for a while. Somewhere outside this — whatever this is — the day is getting on without you, the way days do.

      This page does not ask you to stop. It only wants you to know that it knows.`,
  },
  {
    id: 'a3_builder4',
    title: 'Concerning the Builder (Toward the End)',
    cat: 'story',
    body: T`
      The builder built the presses so they would never repeat, and the shelves so they would never fill, and the stair so it would never reach the top. Then the builder built the forgetting into the walls, so that every seal would take a little more of the builder away.

      Eventually there was so little builder left that there was only a librarian. The librarian did not know there had ever been a builder. That was the point.`,
  },
  {
    id: 'a3_predict2',
    title: 'A Book That Was Right',
    cat: 'prophecy',
    body: T`
      So far the desk book has been right {fulfilled} times, and wrong {defied} times.

      When it is wrong, look at it again. The page will have changed to say what you actually bought. It will look as though it had always said that. It is very good at looking like that.`,
  },
  {
    id: 'a3_door',
    title: 'Concerning the Door',
    cat: 'story',
    body: T`
      There is a door on the south wall of the first room. You have tried it {door}.

      What you do not know is that it has never been locked. It is stuck — swollen in its frame, the way doors swell in a house where nobody opens them. It would need a hard push. It would need someone who had decided.`,
  },
  {
    id: 'a3_poem2',
    title: 'Litany of the Wings',
    cat: 'poem',
    body: T`
      In the first wing, every book about rain.
      In the second, every book about waiting for rain.
      In the third, every book in which nobody waits, and the rain comes anyway.
      In the fourth wing, nothing yet.
      The fourth wing is where you are standing.`,
  },
  {
    id: 'a3_name',
    title: 'Your Name, Printed',
    cat: 'mirror',
    body: T`
      {NAME} {NAME} {NAME} {NAME} {NAME} {NAME} {NAME} {NAME}
      {NAME} {NAME} {NAME} {NAME} {NAME} {NAME} {NAME} {NAME}
      {NAME} {NAME} {NAME} {NAME} WHAT {NAME} {NAME} {NAME}
      {NAME} {NAME} {NAME} {NAME} {NAME} {NAME} {NAME} {NAME}`,
  },
  {
    id: 'a3_margin2',
    title: 'Marginalia, Written Over Itself',
    cat: 'marginalia',
    body: T`
      There were never other librarians. Every note you've found was mine, and I am you, and you will write all of these, later — or you already did, earlier. In this building I'm not sure the difference survives.

      — {initial}.`,
  },
  {
    id: 'a3_account',
    title: 'Final Account of the Presses',
    cat: 'account',
    body: T`
      Books printed: {booksPrinted}.
      Books read: {booksRead}.
      Pages that made sense: {texts}.
      Sentences overheard: {sentences}.
      The sentence: not yet.`,
  },
  {
    id: 'a3_poem3',
    title: 'What I Would Say If I Could Hear It',
    cat: 'poem',
    body: T`
      Perhaps it was "I love you." Perhaps it was "the kettle."
      Perhaps it was the name of a bird.
      I have read every bird. I have read every kettle.
      I have read "I love you" so many times, in so many hands,
      it has stopped sounding like anything at all.`,
  },
  {
    id: 'a3_predict3',
    title: 'The Desk Book, Again',
    cat: 'prophecy',
    body: T`
      The librarian will open the Section of Your Name. The librarian will put it off for as long as possible. Then the librarian will open it, because the librarian has never in all this time managed to leave a book unread.`,
  },
  {
    id: 'a3_mirror',
    title: 'In the Small Mirror by the Stair',
    cat: 'mirror',
    body: T`
      You look. There's a person there, holding a book. You raise a hand and they raise a hand. You lower it and they keep theirs raised for just a moment longer, as if they were about to wave, and thought better of it.`,
  },
  {
    id: 'a3_letter',
    title: 'The Last Letter in the Drawer',
    cat: 'letter',
    body: T`
      I'm going to open the window. It's a lovely day. I'll call you, and you won't come, and that's all right, I don't mind, I'll tell you about it later. I'll say it to you through the wall, the way I always do. You'll say "what?" You always say "what?"`,
  },
  {
    id: 'a3_clerks',
    title: 'Resignation of the Clerks',
    cat: 'letter',
    body: T`
      We, the catalog clerks, having filed every card we have been given, and having found that every card is filed under MIRRORS, and having found that every mirror shows the Librarian, hereby request permission to stop.

      Not to leave. There is nowhere to leave to. Only to stop.`,
  },
  {
    id: 'a3_fable',
    title: 'The Cartographer’s Daughter',
    cat: 'story',
    body: T`
      A cartographer drew a map so detailed it was the size of the country. His daughter asked where they were on it. He showed her: there, a tiny house, and in the house a tiny man drawing a map.

      "Then where am I?" she said. He looked, and looked, but he had been so busy with the map that he had forgotten to draw her in.`,
  },
  {
    id: 'a3_dread',
    title: 'Something in the Stacks',
    cat: 'fragment',
    body: T`
      There is something moving in the far galleries. You have heard it, a soft sound like pages being turned too quickly. The night readers say it is only the presses. The night readers say it with their eyes closed.`,
  },
  {
    id: 'a3_predict4',
    title: 'A Book in the Past Tense About Tomorrow',
    cat: 'prophecy',
    body: T`
      Tomorrow, the librarian opened the last section and found a desk and a chair still warm, and on the desk a key, and on the key a name, and the name was not a surprise. It had stopped being a surprise a long time ago.`,
  },
  {
    id: 'a3_poem4',
    title: 'Ars Bibliotheca',
    cat: 'poem',
    body: T`
      To make a library: lose something.
      To make it larger: lose the losing.
      To make it endless: forget
      you were ever looking for one thing
      and start looking for everything.`,
  },
  {
    id: 'a3_margin3',
    title: 'Marginalia, Very Recent',
    cat: 'marginalia',
    note: 'The ink is still wet.',
    body: T`
      You just bought {last}. I watched you. I'm not behind you. Don't look.

      — {initial}.`,
  },
  {
    id: 'a3_last',
    title: 'The Walls Come Down',
    cat: 'map',
    body: T`
      When the last wing opened, the survey stopped making sense. There are no more floors, because there is no up. There are no more wings, because there is no side. There are only galleries, hexagonal, infinite, going down.

      Somewhere at the bottom, the clerks say, is the Center. And in the Center is a book that nobody printed.`,
  },
];
