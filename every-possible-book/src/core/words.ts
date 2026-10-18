// The library's lexicon: the words a reader can recognise in a page of noise.
// Grouped by part of speech so the sentence generator can build grammatical lines.

const NOUNS = `
abyss account ache acre age air aisle alcove alley almanac altar amber anchor angel angle ankle answer
apple apron arch archive ark arm ash atlas attic autumn axe babel back ball band bank barn basin basket
bay beach beam bean bear bed bee bell belly bench berry bird birth blade blanket blood bloom board boat
body bone book boot border bottle bough bowl box branch bread breath brick bride bridge brother brush
bucket bud bulb bundle burden bush butter button cabin cage cake calendar camp candle canvas cap card
carpet cart case castle cat cave ceiling cellar chain chair chalk chamber chapel chapter charcoal cheek
chest child chimney choir circle city clay cliff clock cloth cloud coal coast coat coffin coin cold
collar comb copper cord corner cotton cough country cradle crane crow crown cup curtain daughter dawn
day debt deer desk dew diary dirt dish distance doctor dog doll door dove dream dress drum dusk dust
ear earth echo edge egg elbow ember end engine envelope error evening eye face fable faith fall family
farm father feather fence fever field finger fire fish flag flame flock floor flour flower fog folio
foot forest fork fountain fox frame friend frost fruit funeral furnace garden gate ghost gift girl
glass glove god gold grain grass grave gravel grief ground guest gull hair hall hammer hand harbor
harvest hat hawk head heart hearth heaven hedge heel hill hinge hive hole home honey hook horizon horn
horse hour house hunger husband hymn ice ink island ivory ivy jar jaw jewel journey key king kiss
kitchen knee knife knot ladder lake lamp lantern law lead leaf ledger leg lens letter library lid
light lily line linen lion lip list lock loom love lung machine maid map mark market mask meadow
memory mercy metal middle midnight milk mill mind mirror mist moment money month moon morning moss
moth mother mountain mouth mud music nail name needle nest net night noise noon north nothing number
nurse oak oar ocean office oil orchard organ oven owl page pail pain palace palm paper parcel past
path pearl pebble pen pencil people piano pier pig pillar pillow pin pipe pit plate plough plum pocket
poem pond porch pot prayer press priest prison promise pulse queen question rain rat raven reader
record reed ribbon rice riddle ring river road robe rock roof room root rope rose rot ruin rust sail
salt sand scale scar school scissors scroll sea seal season seat secret seed shadow shape sheep shelf
shell ship shoe shore shoulder shovel silence silk silver singer sister skin skull sky sleep sleeve
smoke snail snake snow soap soldier son song soul sound soup south spade spark sparrow spider spine
spoon spring stack stair star stem step stitch stone stool storm story stove straw stream street
string summer sun supper swan sword table tail tale tea teacher tear temple thief thimble thing
thread throat throne thumb thunder tide tile timber time toe tomb tongue tooth torch tower town toy
track trail train tree truth tunnel twig umbrella uncle valley vase veil verse vessel village vine
voice volume wagon wall war wardrobe water wave wax way weather web wedding well west whale wheat
wheel whisper widow wife wind window wine wing winter wire wish witness wolf woman wood wool word
work world worm wound wreath wrist yard year yarn youth
`;

const VERBS = `
answers asks awaits begins binds bleeds breaks breathes brings burns buries calls carries catches
climbs closes counts covers crosses cries dances dies digs dreams drinks drowns eats ends enters
fades falls feeds finds flies folds follows forgets forgives gathers gives grows hangs hears hides
holds hunts keeps kills kneels knows laughs leaves lies lifts listens lives locks loses loves marks
mends moves names needs opens prays prints reads remembers rests returns rings rises runs says
searches sees sells sews shakes shines sings sinks sits sleeps speaks spills stays steals sweeps
swims takes teaches tears tells thinks throws touches turns understands visits waits wakes walks
wanders wants watches weaves weeps whispers wins writes
`;

const ADJECTIVES = `
absent ancient ashen autumnal bare bitter black blind blue bright broken brown buried calm careful
cold crooked cruel dark dead deep distant dry dull dusty early empty endless faint false familiar
final first flat foreign forgotten frail free full gentle gilded golden grey green half hollow holy
honest hungry idle inner kind last late lean little lonely long lost loud low mild narrow nameless
new next numb old open orange pale patient plain poor quiet rare raw red rich ripe rotten round
sacred sad salt secret shallow sharp short silent silver simple slow small soft sour still strange
sweet tall tender thin tired true unread unseen vast violet warm weary wet white whole wide wild
young
`;

const OTHER = `
again alone always and because before behind below beneath beside between but down every forever
from here into never nobody nothing once only perhaps since someone somewhere soon then there
through toward under until upon what when where while who why with within without yes yesterday
tomorrow tonight
`;

const split = (s: string) => s.trim().split(/\s+/).filter(Boolean);

export const NOUN_LIST = split(NOUNS);
export const VERB_LIST = split(VERBS);
export const ADJ_LIST = split(ADJECTIVES);
export const OTHER_LIST = split(OTHER);


/** Words that matter to the library itself. They surface more often as the game goes on. */
export const LIBRARY_WORDS = split(`
book shelf press page ink reader library stair door lamp ledger volume index letter word name spine
mirror stack archive catalog silence dust ghost return remember forget builder librarian
`);

/** Words that frighten. Used by the forbidden sections and late puzzles. */
export const DREAD_WORDS = split(`
behind watching wake you here always again remember inside nobody hollow door listen closer
mirror skin teeth breath dark under beneath awake open stay
`);

export const ALL_WORDS: readonly string[] = Array.from(
  new Set([...NOUN_LIST, ...VERB_LIST, ...ADJ_LIST, ...OTHER_LIST, ...LIBRARY_WORDS, ...DREAD_WORDS]),
);
export const WORD_SET: ReadonlySet<string> = new Set(ALL_WORDS);

export function isWord(s: string): boolean {
  return WORD_SET.has(s.toLowerCase());
}
