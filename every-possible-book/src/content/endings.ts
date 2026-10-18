// The three ways out.
import { dedent, type Draft } from './types';

const T = (s: TemplateStringsArray) => dedent(s[0]);

/** The book on the lectern at the Center: the Finish ending. Pages separated by "\n---\n". */
export const END_FINISH: Draft = {
  id: 'end_finish',
  title: 'The Book Nobody Printed',
  cat: 'story',
  note: 'Handwritten. All of it.',
  body: T`
    This is the book of {name}, who built the library.

    You were a reader. You loved it more than almost anything. There was one person you loved more, and you lived with them in a house with a red door and a window facing west, and in the afternoons they stood at that window and called you to come and look at the light.
    ---
    You always said "in a minute." You always meant it.

    One afternoon they called through the wall, and their voice went up the way a voice goes up at the end of a sentence that matters, and you said "what?" without looking up. And they said "never mind." And you finished your page.

    That was the last thing they said to you that you didn't hear. There wasn't a later. There wasn't another afternoon.
    ---
    You couldn't bear not knowing. So you built a place where every sentence would exist, because if every sentence existed, theirs would too. You built presses that would never repeat. You built shelves that would never fill. And when you understood how long it would take, you built the forgetting, so that every morning you could start over and hope.

    You have been here for {playtime}, as far as you know. You have been here much longer than that.
    ---
    Here is what they said. It was never hidden. It was the most ordinary thing in the world:

    "Come and look — it's a lovely day. Don't spend it all waiting for me."

    That's all. That's the whole sentence. They weren't going anywhere, that afternoon. They meant: don't wait for me to stop talking, come now. They meant: the light won't last. They meant you.
    ---
    The presses have stopped. The library is complete: it has every possible book in it now, because now it has this one.

    The last page is blank. It's yours. You don't have to fill it here.`,
};

export const END_BURN: Draft = {
  id: 'end_burn',
  title: 'Ash',
  cat: 'story',
  body: T`
    You strike the match. It catches on the first try, as if it had been waiting.

    The book on the lectern goes first. You don't read it. You find you don't need to: whatever it says, you have been living inside it for {playtime}, and that is long enough.
    ---
    The fire goes up through the galleries like a reader in a hurry. Every book you found, every word, every sentence, every page that made sense, every page that didn't: all of it, lifting, going pale, coming down as ash, slowly, like letters falling out of a sentence.

    Somewhere in there, the sentence you were looking for. It burns like all the others. It weighs exactly as much.
    ---
    When it's over, there is no library. There is a field, warm underfoot, and a sky with ordinary weather in it, and you, holding a spent match, not knowing what happens next.

    It is the first thing in a very long time you haven't already read about.`,
};

export const END_ABANDON: Draft = {
  id: 'end_abandon',
  title: 'Outside',
  cat: 'story',
  body: T`
    The door is stuck, swollen in its frame. You put your shoulder to it. It needs someone who has decided.

    You have decided.
    ---
    It opens onto a garden. Beans on the fence, gone over into next door's apple tree. A path. A gate. The light is coming in sideways, and it is doing something to the air that you can't describe, and for once you don't try.

    Behind you, the library keeps printing. You can hear it, faintly, the way you hear the sea in a shell. It will print every possible book. It will print one about you walking out of it. You won't read that one.
    ---
    You leave the door open, in case anyone else is in there. Then you walk down the path, and through the gate, and into the afternoon, which is lovely, and which you are not spending waiting for anyone.`,
};

export const ENDINGS: Draft[] = [END_FINISH, END_BURN, END_ABANDON];
