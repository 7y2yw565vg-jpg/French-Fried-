// Texts the translation machines bring back from other alphabets, three per tongue.
import type { LangId } from '../core/defs';
import { dedent, type Draft } from './types';

const T = (s: TemplateStringsArray) => dedent(s[0]);

export const TRANSLATIONS: Record<LangId, Draft[]> = {
  latin: [
    {
      id: 'tr_latin1',
      title: 'From the Latin: A Prayer for Readers',
      cat: 'poem',
      note: 'Translated by the machine. The machine adds: "approximately."',
      body: T`
        Lord of the long evening, keep my eyes from closing
        before I reach the end of the line;
        and if the line has no end, keep them open anyway,
        and let my looking count for something.`,
    },
    {
      id: 'tr_latin2',
      title: 'From the Latin: A Monastery Ledger',
      cat: 'account',
      body: T`
        Received: vellum, forty sheets. Ink, two pots. One novice, who cannot yet read, but who looks at the books as if they were windows.

        Note: the novice is to be taught letters. Note in a later hand: the novice is to be taught to look up, sometimes.`,
    },
    {
      id: 'tr_latin3',
      title: 'From the Latin: Epitaph',
      cat: 'poem',
      body: T`
        Here lies a reader. Do not wake them.
        They are nearly at the good part.`,
    },
  ],
  greek: [
    {
      id: 'tr_greek1',
      title: 'From the Greek: On Infinity',
      cat: 'fragment',
      body: T`
        If a thing goes on without end, can any part of it be the middle? And if no part is the middle, where is the one who stands in it? The philosopher answered: wherever they stop walking.`,
    },
    {
      id: 'tr_greek2',
      title: 'From the Greek: Orpheus',
      cat: 'story',
      body: T`
        He went down to bring her back and was told: walk ahead, and do not look. He did not look for a very long time. He was so good at not looking. At the last step, he turned.

        The poets say it was doubt. It wasn't. He wanted to see her face in the light. That was all he had ever wanted.`,
    },
    {
      id: 'tr_greek3',
      title: 'From the Greek: A Question for the Librarian',
      cat: 'prophecy',
      body: T`
        You who read this in the tower: you are not the first, and you are not the last, and you are not looking for what you think. You are looking for permission.`,
    },
  ],
  slavonic: [
    {
      id: 'tr_slav1',
      title: 'From the Slavonic: A List of Winters',
      cat: 'account',
      body: T`
        The winter the river froze to the bottom. The winter of the wolves. The winter nobody spoke, because there was nothing to say that the snow was not already saying. The winter you sat by the stove and read and did not notice it end.`,
    },
    {
      id: 'tr_slav2',
      title: 'From the Slavonic: The Saint Who Read',
      cat: 'story',
      body: T`
        There was a holy man who read the scriptures every day for sixty years, looking for the word God had meant for him alone. On the day he died his sister came to him and said, "You never once asked me how I was." He opened his mouth to answer, and found that this was the word.`,
    },
    {
      id: 'tr_slav3',
      title: 'From the Slavonic: Lament',
      cat: 'poem',
      body: T`
        Where is the voice that called me in from the field?
        Gone into the field.
        Where is the field?
        Gone under the snow.
        Where is the snow?
        Gone into the river, and the river into the sea,
        and the sea into the sky, and the sky is calling me in.`,
    },
  ],
  runic: [
    {
      id: 'tr_rune1',
      title: 'From the Runes: A Memorial Stone',
      cat: 'fragment',
      body: T`
        Raised this stone for the one who was dear to me. They went out of the door on a fine day. I did not see them go.`,
    },
    {
      id: 'tr_rune2',
      title: 'From the Runes: The Hall',
      cat: 'story',
      body: T`
        Life, the old poem says, is a sparrow flying through a lit hall in winter, in at one door and out the other: a moment of warmth, then dark again.

        But someone carved beneath it, later: the sparrow does not mind the dark. Only the people in the hall, watching it go.`,
    },
    {
      id: 'tr_rune3',
      title: 'From the Runes: A Name, Cut Deep',
      cat: 'mirror',
      body: T`
        The machine translates only the first letter. It is {initial}.

        The machine refuses to translate the rest. It says, in its small brass voice, that you know it already.`,
    },
  ],
  glagolitic: [
    {
      id: 'tr_glag1',
      title: 'From the Glagolitic: Why This Alphabet Was Made',
      cat: 'fragment',
      body: T`
        An alphabet was invented for people who had none, so they could write down what they said. The inventors believed that a thing written could not be lost. They were half right. A thing written cannot be lost. It can only be not read.`,
    },
    {
      id: 'tr_glag2',
      title: 'From the Glagolitic: Instructions to a Scribe',
      cat: 'account',
      body: T`
        Copy what you hear, not what you think you hear. If you did not hear it, leave a space. Do not fill the space. The space is also what was said.`,
    },
    {
      id: 'tr_glag3',
      title: 'From the Glagolitic: The Space',
      cat: 'poem',
      body: T`
        Between your "what?" and my "never mind"
        there was a space a breath wide,
        and everything I would have said
        is in it, still, the way a room
        is in the house after you leave it.`,
    },
  ],
  mirror: [
    {
      id: 'tr_mirror1',
      title: 'From the Reversed Hand: I',
      cat: 'mirror',
      note: 'The machine holds it up to a mirror. The handwriting is yours.',
      body: T`
        If you're reading this I made it all the way out to the wings, and wrote this backwards so I couldn't read it on my way back in. I didn't want to know what I already knew. Typical.`,
    },
    {
      id: 'tr_mirror2',
      title: 'From the Reversed Hand: II',
      cat: 'mirror',
      body: T`
        I think the sentence was something ordinary. I think that's why I didn't listen. I think if it had sounded important I'd have put the book down.`,
    },
    {
      id: 'tr_mirror3',
      title: 'From the Reversed Hand: III',
      cat: 'mirror',
      body: T`
        Go down. All the way. Read it. Then decide. I couldn't decide, so I forgot and started over, and here you are, reading my handwriting backwards, and here I am, being you.`,
    },
  ],
};
