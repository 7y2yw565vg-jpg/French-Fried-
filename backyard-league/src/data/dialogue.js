// Kid-friendly, silly dialogue keyed by personality. {p} = player name,
// {like} = something the kid likes, {team} = player's team name.

export const LINES = {
  'Class Clown': {
    greet: ['Knock knock. Who\'s there? Not your homework, because the dog ate it!', 'Hey {p}! Pull my finger. ...No? Your loss.', 'I\'m practicing my chicken walk. Rate it 1 to 10.'],
    chat: ['I told Mrs. Bramblebee I\'m allergic to quizzes. She did not laugh.', 'Did you know if you say "gullible" slowly it sounds like "oranges"?', 'I can burp the alphabet up to Q. Q is the hardest letter.'],
    yes: ['A team?! Only if I can do a goofy goal dance. Deal!', 'I\'m in! I\'ll bring the jokes AND the snacks!'],
    no: ['Maybe! Make me laugh first. Or, like, be better friends with me.'],
  },
  Troublemaker: {
    greet: ['Psst. You didn\'t see me here.', 'What do YOU want? ...Kidding. Mostly.', 'If anybody asks, I was at the library.'],
    chat: ['The vending machine in the gym gives two snacks if you kick it just right.', 'Mr. Fussbudget has a secret drawer of confiscated yo-yos. Forty-one of them.', 'I got sent to the office so many times they gave me a chair with my name on it.'],
    yes: ['Fine. But I\'m not wearing a dorky shirt. ...Okay, I\'ll wear the dorky shirt.', 'Your team? Sure. Rules are more like suggestions, right?'],
    no: ['Prove you\'re not a goody-goody first.'],
  },
  "Teacher's Pet": {
    greet: ['Hi {p}! Did you finish the reading log? I finished mine twice.', 'Good morning! Ms. Valdez says I have excellent posture.'],
    chat: ['I color-code my folders. Blue is math, because math is calm.', 'I already did next week\'s worksheet. For fun.', 'If you need help studying for Friday\'s quiz, I make flash cards!'],
    yes: ['A team? Is it supervised? ...Okay! I\'ll make a team binder!', 'Yes! Teamwork is on my report card goals!'],
    no: ['My mom says I can only join if my grades stay up. Ask me again soon!'],
  },
  Shy: {
    greet: ['...oh! Hi.', 'Um. Hi {p}.', '*waves very small*'],
    chat: ['I like {like}. ...Is that weird?', 'I eat lunch by the window. It\'s quiet there.', 'Thanks for talking to me. Most people don\'t.'],
    yes: ['R-really? You want ME? ...Okay. Okay! Yes!', 'I\'ll try my best. Promise.'],
    no: ['I don\'t know... I don\'t really know you yet.'],
  },
  Jock: {
    greet: ['Yo {p}! Race you to the fence!', 'What\'s up! I did 200 push-ups this morning. Okay, 12.', 'Bro. Dude. Buddy. Hi.'],
    chat: ['I sleep in my cleats so I\'m always ready.', 'Protein is in everything if you believe hard enough.', 'My dad says I\'ll go pro. In which sport? All of them.'],
    yes: ['LET\'S GOOO! When\'s practice? Is it now? Can it be now?', 'Finally, a real team! I\'m in!'],
    no: ['Your team any good? Win some games and we\'ll talk.'],
  },
  Bookworm: {
    greet: ['Oh, hello. I was on chapter twelve.', 'Did you know octopuses have three hearts?', 'Shh. Oh wait, we\'re not in the library. HI.'],
    chat: ['I\'ve read every book in the kids\' corner. Twice. Except the one about feelings.', 'Sports are just physics with snacks.', 'I\'m writing a novel about a hamster detective.'],
    yes: ['I\'ve read three books about this sport. Practically a pro. Yes!', 'Okay, but I\'m bringing a book for halftime.'],
    no: ['Sports? I\'m more of an indoor kid. Convince me.'],
  },
  Gamer: {
    greet: ['Hold on, I\'m on the last level. ...Okay, hi.', 'GG, {p}. That means "good greeting."', 'Ugh, my controller died. What\'s up?'],
    chat: ['Real life has terrible graphics, but the frame rate is amazing.', 'I found a secret level in the claw machine at the mall.', 'If life had a respawn button I\'d be so good at skateboarding.'],
    yes: ['Sports, but in real life? Fine, I\'ll unlock it.', 'Joining your party. Player 2 has entered the game!'],
    no: ['Your team needs better stats first. Grind a little.'],
  },
  Artist: {
    greet: ['Hold still, I\'m drawing you. ...Okay, you can move.', 'Hi {p}! Your shirt is a very brave color today.'],
    chat: ['I painted a sunset on my bedroom ceiling. Mom said "WHY."', 'Everything is art. Even the cafeteria meatloaf. Especially the meatloaf.'],
    yes: ['Can I design the team logo? Yes? Then YES!', 'Okay! I\'ll paint the field lines straight. Ish.'],
    no: ['I\'d need to feel inspired. Maybe your team needs a better look first.'],
  },
  'Drama Kid': {
    greet: ['{p}! At LAST we meet again! *gasp*', 'Ahem. *bows* Hello, my adoring public.'],
    chat: ['I was a tree in the school play. A very emotional tree.', 'Every day is a performance and the cafeteria is my stage.'],
    yes: ['A sports drama starring ME? I accept this role!', 'I\'ll cry dramatically if we lose. And if we win. Yes!'],
    no: ['I only accept leading roles. Do we have a deal or not? ...Not yet!'],
  },
  'Know-It-All': {
    greet: ['Actually, it\'s pronounced "hello."', 'Hi {p}. Fun fact: I know a lot of facts.'],
    chat: ['Technically a tomato is a fruit, so ketchup is a smoothie.', 'I calculated our odds of winning anything. You don\'t want to know.'],
    yes: ['Statistically, joining you is a good idea. Fine!', 'You\'ll need my strategy brain. I accept.'],
    no: ['My research says your team isn\'t ready. Get more data.'],
  },
  Sweetheart: {
    greet: ['Hi {p}!! I like your face! In a nice way!', 'Hiii! Do you want half my granola bar?'],
    chat: ['I made friendship bracelets for the whole class. Even Mr. Fussbudget.', 'My grandma says I give the best hugs in Grubbsville.'],
    yes: ['Of course! I\'ll cheer for everybody, even the other team!', 'Yay! Teams are just friends with matching shirts!'],
    no: ['Aww, I want to! I just need to know you better first!'],
  },
  Hothead: {
    greet: ['WHAT. Oh. Hi. Sorry. Hi.', 'Somebody took my swing at recess. I\'m FINE.'],
    chat: ['I lost at four square and I\'m still mad about it. That was last year.', 'I\'m only yelling because I\'m passionate!'],
    yes: ['YES. Let\'s CRUSH them! Who are we crushing?', 'I\'m in! I hate losing more than I love winning!'],
    no: ['Your team would lose and I\'d get mad. No thanks. For now.'],
  },
  Daydreamer: {
    greet: ['...huh? Oh! Hi {p}. I was thinking about clouds.', 'Do you ever wonder if fish get thirsty?'],
    chat: ['I saw a cloud shaped like a soccer ball. Or a cheeseburger.', 'Sometimes I forget what I was say- ...wait, what?'],
    yes: ['A team? That sounds dreamy. Okay!', 'Sure! Wait, what did I just agree to? ...Okay, still yes!'],
    no: ['Hmm? Maybe later. I\'m busy staring at that bird.'],
  },
  'Social Butterfly': {
    greet: ['{p}!!! Oh my gosh, did you hear about the thing?!', 'Hiiii! I know literally everybody here.'],
    chat: ['I know who likes who, who\'s mad at who, and who sneezed in music class.', 'If you want to find someone, ask me. I know everyone\'s schedule!'],
    yes: ['Yes! Who else is on it? I\'ll get all my friends to come watch!', 'Count me in! This is going to be SO fun!'],
    no: ['Maybe if more of my friends were on it!'],
  },
  'Rule Follower': {
    greet: ['Hello. Walking feet, please.', 'Hi {p}. Did you sign in at the front office?'],
    chat: ['Running in the halls is how accidents happen. I saw one once. It was a pudding cup.', 'I\'m the line leader on Tuesdays. It\'s a big responsibility.'],
    yes: ['As long as everything is official. Then yes.', 'Okay. I read the league rulebook. All of it.'],
    no: ['Is your team even registered with the league? I need paperwork.'],
  },
  Prankster: {
    greet: ['Hey {p}, your shoe\'s untied. ...Made you look!', 'Want a gum? *snap* It\'s a fake gum. Classic.'],
    chat: ['I replaced the teacher\'s dry-erase markers with permanent ones. Just kidding. Or am I?', 'Whoopee cushions are a science.'],
    yes: ['I\'m in! The other team won\'t know what hit \'em.', 'Sure! I\'ll put a rubber chicken in every goal.'],
    no: ['Prank somebody with me first, then we\'ll talk.'],
  },
  Collector: {
    greet: ['Got any {like}? I\'m collecting.', 'Hi {p}! I have 412 bottle caps. Want to see?'],
    chat: ['I have every trading card except one. The ONE.', 'I collect rocks shaped like states. Ohio is my best one.'],
    yes: ['A team! I\'m collecting jerseys now. Yes!', 'Okay! Do we get trophies? I\'d love to collect a trophy.'],
    no: ['Bring me something for my collection first.'],
  },
  Entrepreneur: {
    greet: ['{p}! Want to invest in my slime business? Low risk.', 'Time is money, and I charge by the minute. Kidding! Mostly.'],
    chat: ['I sell pencils at a markup during test week. Supply and demand.', 'My lemonade stand made eleven dollars once. ELEVEN.'],
    yes: ['What\'s in it for me? ...Fine, the exposure is worth it.', 'Partnership accepted. Let\'s make money. I mean friends.'],
    no: ['I need to see a business plan. And maybe a snack.'],
  },
  'Animal Lover': {
    greet: ['Did you see the squirrel? Its name is Gerald now.', 'Hi {p}! I smell like hamster. On purpose.'],
    chat: ['I have two cats, a lizard, and a goldfish named Mr. Bubbles the Third.', 'Dogs are just friends who love you no matter what.'],
    yes: ['Can our mascot be a real animal? Okay! I\'m in!', 'I\'ll run fast like a cheetah! Yes!'],
    no: ['Maybe! Does your team have a mascot? It should.'],
  },
  'Conspiracy Kid': {
    greet: ['Keep your voice down. The lunch ladies are listening.', 'Hi {p}. Have you noticed the school has NO thirteenth classroom?'],
    chat: ['Birds are real, but are they REALLY real?', 'The museum dinosaur moves at night. I have proof. I lost the proof.'],
    yes: ['Your team is a cover for something bigger. I\'m in.', 'Okay. But I sit on the bench facing the trees. For surveillance.'],
    no: ['How do I know you\'re not working for THEM?'],
  },
};

export const GENERIC = {
  giftLove: ['WHOA. {item}?! I LOVE {like}! You\'re the best!', 'How did you know I like {like}?! Thank you!!'],
  giftOk: ['Oh, {item}. Thanks, I guess!', 'Cool, thanks {p}!'],
  giftFood: ['Yesss, snacks! *nom nom*'],
  loyal: ['I\'m a {team} for life. At least this season.', 'Sorry, I already play for the {team}. They\'d never forgive me.'],
  poachable: ['I\'m on the {team}... but they kinda stink. What would it take?', 'The {team} coach yells too much. Maybe I\'d switch...'],
  tooOld: ['I\'m too old for the Jr League. Unless... nobody checked. *wink*'],
  tooYoung: ['I\'m not old enough for the league yet! Next year!'],
  notSporty: ['Sports? Ehh. I\'m not really a sports kid.'],
  favor: ['Can you do me a favor?'],
  bye: ['See ya!', 'Later, {p}!', 'Bye-bye!'],
};

export const PARENT_LINES = {
  yes: ['Here you go, sweetie. Spend it wisely!', 'Okay, okay. But you\'re doing the dishes tonight.', 'Fine. Don\'t tell your father. *wink*'],
  no: ['Do you think money grows on trees?!', 'Not right now, kiddo. Maybe if your grades were better.', 'We just gave you money! Go recycle some cans!'],
  big: ['{amount}?! When I was your age I had to walk uphill both ways to get a nickel!'],
  cooldown: ['You JUST asked us! Give it a few days.'],
};

export const SNITCH_LINES = ['It was {p}! I saw the whole thing!', '*points at {p}* ...I\'m sorry, I can\'t lie to a teacher!', '{p} did it. Also can I be line leader?'];
