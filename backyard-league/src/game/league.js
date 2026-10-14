// League seasons: rival teams, AI recruiting, schedule, games, playoffs, scandals.
import { KIDS, KID_BY_ID, KIDS_META, shortName } from '../data/kids.js';
import { RIVAL_COLORS, SPORTS, FIELDS } from '../data/world.js';
import { addLog, addNews, getKid, kidGrade, playerGrade, statsOf, yearOf } from './state.js';
import { bestLineup, eligibility, isRegistered, leagueBand, playerBand, homeGameRevenue, giveTrophy, attraction } from './team.js';
import { simulateMatch } from './sim.js';
import { positionRating } from './stats.js';
import { dayInfo, seasonId } from './time.js';
import { seeded, shuffle, hashString, clamp } from './rng.js';

// Teams that start the game with no kids; the AI fills their rosters each preseason.
// With the 4 roster teams from the data, every league has 7 rivals (8 teams with yours).
export const EXTRA_JR_TEAMS = {
  Soccer: ['Sunnyside Sprinkler Squad', 'Old Town Owls FC', 'Maple Hollow Mudskippers'],
  Baseball: ['Riverside Rubber Duckies', 'Sunnyside Sluggers', 'Oakridge Acorns'],
  Basketball: ['Pickle Creek Puddle Jumpers', 'Riverside Rim Rockers', 'Oakridge Royals'],
  Football: ['Maple Hollow Monster Trucks', 'Pickle Creek Crunch', 'Old Town Thunderbirds'],
};
const MIDDLE_EXTRA = ['Grubbsville Middle Thunder Turtles (6-8)', 'Grubbsville Middle Night Owls (6-8)', 'Pinecrest Middle Polar Bears (6-8)', 'St. Bart\'s Middle Bulldogs (6-8)', 'Riverside Middle Hurricanes (6-8)'];

export const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function rivalsFor(sport, bandId) {
  const sportName = SPORTS[sport].name.replace('Flag ', '');
  if (bandId === 'jr') return [...KIDS_META.rival_teams.filter((t) => t.sport === sportName && !t.name.includes('6-8')).map((t) => t.name), ...EXTRA_JR_TEAMS[sportName]];
  return [...KIDS_META.rival_teams.filter((t) => t.name.includes('6-8')).map((t) => t.name), ...MIDDLE_EXTRA];
}

/** Uniform bottoms: 'pants' or 'shorts' (your team can choose; rivals follow the sport). */
export function kitBottoms(state, name) {
  const pref = name === state.team.name ? state.team.kitBottoms : null;
  if (pref === 'pants' || pref === 'shorts') return pref;
  return ['baseball', 'football'].includes(state.team.sport) ? 'pants' : 'shorts';
}

export function teamColors(state, name) {
  if (name === state.team.name) return state.team.colors;
  return RIVAL_COLORS[name] || ['#888888', '#ffffff'];
}

export function rosterOf(state, name) {
  if (name === state.team.name) return state.team.roster.slice();
  return Object.keys(state.kids).filter((id) => state.kids[id].team === name);
}

/** Start a new season: rival teams + first wave of AI recruiting. */
export function ensureSeason(state) {
  const sid = seasonId(state.time.day);
  if (!sid) return [];
  if (state.league && state.league.sid === sid) return [];
  const band = playerBand(state);
  const rivals = rivalsFor(state.team.sport, band.id);
  state.league = {
    sid, band: band.id, bandName: band.name, sport: state.team.sport,
    teams: rivals.map((name) => ({ name, w: 0, l: 0, t: 0, pf: 0, pa: 0 })),
    schedule: null, playoffs: null, done: false, ringerGames: [],
  };
  const msgs = aiRecruit(state, 0.5);
  const info = dayInfo(state.time.day);
  addNews(state, `${info.season.name} season is here! ${band.name} registration is open for 3 weeks.`);
  return msgs;
}

/** Rival teams sign free agents. fraction = how much of each team's gap to fill now. */
export function aiRecruit(state, fraction) {
  const lg = state.league;
  if (!lg) return [];
  const sp = SPORTS[state.team.sport];
  const sportName = sp.name.replace('Flag ', '');
  const band = leagueBand(playerGrade(state));
  const rng = seeded(state.seed, 'ai', lg.sid, fraction);
  const pool = shuffle(rng, KIDS.filter((k) => {
    const ks = state.kids[k.id];
    const g = kidGrade(state, k.id);
    return !ks.team && g >= band.lo && g <= band.hi && k.recruitment.status !== 'Not Into Sports (Yet)'
      && ks.f < 50 && !state.team.roster.includes(k.id);
  })).sort((a, b) => (b.sport_preferences.includes(sportName) ? 1 : 0) - (a.sport_preferences.includes(sportName) ? 1 : 0));
  const news = [];
  for (const t of lg.teams) {
    const have = rosterOf(state, t.name).filter((id) => eligibility(state, id).ok).length;
    const target = sp.minRoster + 1 + (hashString(t.name) % 2);
    const need = Math.ceil(Math.max(0, target - have) * fraction);
    for (let i = 0; i < need && pool.length; i++) {
      const k = pool.shift();
      state.kids[k.id].team = t.name;
      if (state.kids[k.id].met || state.team.invites.includes(k.id)) {
        const msg = `The ${t.name} signed ${shortName(k)}!${state.team.invites.includes(k.id) ? ' (They were invited to YOUR tryout. Ouch.)' : ''}`;
        news.push(msg);
        addNews(state, msg);
      }
      state.team.invites = state.team.invites.filter((x) => x !== k.id);
    }
  }
  return news;
}

function roundRobin(ids, seed) {
  const list = shuffle(seeded(seed, 'rr'), ids);
  if (list.length % 2) list.push(null);
  const n = list.length;
  const rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const games = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i]; const b = list[n - 1 - i];
      if (a && b) games.push(r % 2 ? { home: a, away: b } : { home: b, away: a });
    }
    rounds.push(games);
    list.splice(1, 0, list.pop());
  }
  return rounds;
}

/** Week 4: lock the schedule (your team is in only if registered). */
export function finalizeSchedule(state) {
  const lg = state.league;
  if (!lg || lg.schedule) return [];
  const msgs = aiRecruit(state, 1);
  const names = lg.teams.map((t) => t.name);
  if (isRegistered(state)) {
    lg.teams.push({ name: state.team.name, w: 0, l: 0, t: 0, pf: 0, pa: 0, player: true });
    names.push(state.team.name);
    msgs.push(`The ${state.team.name} are officially in the ${lg.bandName}! First game is this Saturday.`);
  } else {
    msgs.push(`Registration closed. The ${state.team.name} missed the ${lg.bandName} this season. Keep recruiting for next season!`);
  }
  const first = roundRobin(names, `${state.seed}${lg.sid}`);
  const second = first.map((g) => g.map((x) => ({ home: x.away, away: x.home })));
  const rounds = [...first, ...second].slice(0, 10);
  lg.schedule = rounds.map((games, i) => ({ week: 4 + i, games: games.map((g) => ({ ...g, result: null })) }));
  return msgs;
}

export function weekGames(state, week) {
  const lg = state.league;
  if (!lg) return [];
  if (lg.schedule) {
    const r = lg.schedule.find((x) => x.week === week);
    if (r) return r.games;
  }
  if (lg.playoffs) {
    const r = lg.playoffs.find((x) => x.week === week);
    if (r) return r.games;
  }
  return [];
}

export function playerGameThisWeek(state) {
  const info = dayInfo(state.time.day);
  if (!info.season) return null;
  return weekGames(state, info.season.week).find((g) => (g.home === state.team.name || g.away === state.team.name) && !g.result) || null;
}

// ------------------------------------------------------------- lineups --
export function matchSide(state, name, opts = {}) {
  const ids = rosterOf(state, name);
  let { lineup } = bestLineup(state, ids);
  const isPlayerTeam = name === state.team.name;
  if (isPlayerTeam && state.scandal.downAManSeason === state.league?.sid) {
    lineup = lineup.slice();
    lineup[lineup.length - 1] = { pos: lineup[lineup.length - 1].pos, id: null, rating: 0 };
  }
  const sport = state.team.sport;
  const out = lineup.map((s) => {
    if (!s.id) return { ...s, name: 'nobody', stats: {}, isPlayer: false };
    const k = getKid(state, s.id);
    const stats = statsOf(state, s.id);
    return {
      ...s, name: s.id === 'PLAYER' ? state.player.name : k.first_name, stats, isPlayer: s.id === 'PLAYER',
      bat: sport === 'baseball' ? positionRating(stats, 'baseball', 'BAT') : undefined,
    };
  });
  let bonus = 0;
  if (isPlayerTeam) {
    if (state.team.staff.coach) bonus += state.team.staff.coach.startsWith('adult') ? 4 : 2;
    const tmw = out.filter((p) => p.id).reduce((a, p) => a + p.stats.TMW, 0) / Math.max(1, out.filter((p) => p.id).length);
    bonus += (tmw - 50) / 10;
  }
  if (opts.home) bonus += 1.5;
  return { name, lineup: out, bonus };
}

export function announcerTier(state) {
  return state.team.upgrades.announcer + (state.team.staff.announcer ? 1 : 0);
}

export function gameSeed(state, game, week) {
  return hashString(`${state.seed}|${state.league.sid}|${week}|${game.home}|${game.away}`);
}

export function simGame(state, game, week, clutch = null) {
  const home = matchSide(state, game.home, { home: true });
  const away = matchSide(state, game.away);
  const involvesPlayer = game.home === state.team.name || game.away === state.team.name;
  const venue = game.home === state.team.name ? FIELDS[state.team.field].name : `${game.home} home field`;
  return simulateMatch({
    sport: state.team.sport, home, away, seed: gameSeed(state, game, week), clutch,
    tier: involvesPlayer ? announcerTier(state) : 2, venue,
  });
}

export function forfeitResult(state, game, loser) {
  const home = loser === 'home' ? 0 : forfeitScore(state);
  const away = loser === 'away' ? 0 : forfeitScore(state);
  return { score: [home, away], forfeit: loser, events: [], winner: loser === 'home' ? 'away' : 'home' };
}

function forfeitScore(state) {
  return { soccer: 3, basketball: 20, baseball: 7, football: 14 }[state.team.sport];
}

export function playerForfeitReason(state) {
  if (state.school.sportsBan) return 'grounded from sports because of grades';
  const ok = state.team.roster.filter((id) => eligibility(state, id).ok).length;
  if (ok < SPORTS[state.team.sport].minRoster) return `only ${ok} eligible players (need ${SPORTS[state.team.sport].minRoster})`;
  return null;
}

export function recordResult(state, game, result, week) {
  game.result = { score: result.score, forfeit: result.forfeit || null, mvp: result.mvp || null };
  const lg = state.league;
  const H = lg.teams.find((t) => t.name === game.home);
  const A = lg.teams.find((t) => t.name === game.away);
  const [h, a] = result.score;
  if (!game.playoff && H && A) {
    H.pf += h; H.pa += a; A.pf += a; A.pa += h;
    if (h > a) { H.w++; A.l++; } else if (a > h) { A.w++; H.l++; } else { H.t++; A.t++; }
  }
  const mine = game.home === state.team.name ? 'home' : game.away === state.team.name ? 'away' : null;
  const msgs = [];
  if (mine) {
    const won = (mine === 'home' && h > a) || (mine === 'away' && a > h);
    const tie = h === a;
    state.team.recent = [...(state.team.recent || []), won ? 'W' : tie ? 'T' : 'L'].slice(-8);
    if (won) state.team.wins += 1; else if (!tie) state.team.losses += 1;
    if (won && !state.team.firstWin) {
      state.team.firstWin = true;
      giveTrophy(state, `Game Ball: First Ever Win (${game.home === state.team.name ? 'vs' : 'at'} ${mine === 'home' ? game.away : game.home})`, lg.sid);
      msgs.push('You got the GAME BALL from your first win! Put it in your trophy room.');
    }
    if (mine === 'home' && !result.forfeit) {
      const rev = homeGameRevenue(state);
      state.money = +(state.money + rev.net).toFixed(2);
      state.team.fansLast = rev.fans;
      game.result.revenue = rev;
      msgs.push(`Home game: ${rev.fans} fans. Admission $${rev.admission.toFixed(2)} + concessions $${rev.concessions.toFixed(2)}${rev.parents ? ` - Mom & Dad's cut $${rev.parents.toFixed(2)}` : ''}${rev.rent ? ` - rent $${rev.rent}` : ''}${rev.staffPay ? ` - staff $${rev.staffPay}` : ''} = $${rev.net.toFixed(2)}`);
    }
    state.player.rep += won ? 2 : 0.5;
    const ringers = state.team.roster.filter((id) => id !== 'PLAYER' && state.kids[id].ringer);
    if (ringers.length && !result.forfeit) {
      lg.ringerGames.push(week);
      msgs.push(...ringerCheck(state, ringers, won));
    }
  }
  return msgs;
}

/** Simulate every game this week except the player's (which the UI plays live). */
export function simOtherGames(state, week) {
  for (const g of weekGames(state, week)) {
    if (g.result) continue;
    if (g.home === state.team.name || g.away === state.team.name) continue;
    recordResult(state, g, simGame(state, g, week), week);
  }
}

export function standings(state) {
  const lg = state.league;
  if (!lg) return [];
  return lg.teams.slice().sort((a, b) => (b.w * 2 + b.t) - (a.w * 2 + a.t) || (b.pf - b.pa) - (a.pf - a.pa) || b.pf - a.pf);
}

export function startPlayoffs(state) {
  const lg = state.league;
  if (!lg || lg.playoffs || !lg.schedule) return [];
  const sid = lg.sid;
  const ban = state.scandal.playoffBanUntil >= sid;
  const seeds = standings(state).filter((t) => !(t.player && ban)).slice(0, 4).map((t) => t.name);
  if (seeds.length < 4) { lg.playoffs = []; return []; }
  lg.playoffs = [{ week: 14, games: [{ home: seeds[0], away: seeds[3], playoff: 'Semifinal', result: null }, { home: seeds[1], away: seeds[2], playoff: 'Semifinal', result: null }] }];
  const msgs = [`Playoffs! Semifinals: ${seeds[0]} vs ${seeds[3]}, ${seeds[1]} vs ${seeds[2]}.`];
  if (ban && lg.teams.some((t) => t.player)) msgs.push('Your team is BANNED from the playoffs (paperwork scandal). Ouch.');
  return msgs;
}

function winnerOf(g) {
  const [h, a] = g.result.score;
  if (h === a) return hashString(g.home + g.away) % 2 ? g.home : g.away; // "shootout"
  return h > a ? g.home : g.away;
}

export function scheduleFinal(state) {
  const lg = state.league;
  if (!lg || !lg.playoffs || !lg.playoffs.length || lg.playoffs.length > 1) return [];
  const semis = lg.playoffs[0].games;
  if (semis.some((g) => !g.result)) return [];
  const [a, b] = semis.map(winnerOf);
  lg.playoffs.push({ week: 15, games: [{ home: a, away: b, playoff: 'Championship', result: null }] });
  return [`Championship game set: ${a} vs ${b}!`];
}

export function endSeason(state) {
  const lg = state.league;
  if (!lg || lg.done) return [];
  lg.done = true;
  const msgs = [];
  const final = lg.playoffs && lg.playoffs[1] && lg.playoffs[1].games[0];
  const champ = final && final.result ? winnerOf(final) : null;
  const runner = final && final.result ? (champ === final.home ? final.away : final.home) : null;
  const mine = lg.teams.find((t) => t.player);
  const info = dayInfo(state.time.day);
  const label = `${info.season ? info.season.name : 'Season'} ${2026 + yearOf(state) - 1}`;
  if (champ) addNews(state, `The ${champ} are ${lg.bandName} champions! (${label})`);
  if (mine) {
    const place = standings(state).findIndex((t) => t.player) + 1;
    const playoffs = !!(lg.playoffs && lg.playoffs.some((r) => r.games.some((g) => g.home === state.team.name || g.away === state.team.name)));
    state.team.history.push({ sid: lg.sid, label, w: mine.w, l: mine.l, t: mine.t, place, playoffs, champion: champ === state.team.name });
    if (champ === state.team.name) {
      state.team.championships += 1;
      giveTrophy(state, `${lg.bandName} Champions - ${label}`, lg.sid);
      msgs.push(`CHAMPIONS!!! The ${state.team.name} won the ${lg.bandName}! A shiny trophy is in your backpack. Put it in the trophy room!`);
    } else if (runner === state.team.name) {
      giveTrophy(state, `${lg.bandName} Runner-Up - ${label}`, lg.sid);
      msgs.push('Runner-up! So close. You got a (slightly smaller) trophy.');
    } else {
      msgs.push(`Season over. The ${state.team.name} finished ${mine.w}-${mine.l}${mine.t ? `-${mine.t}` : ''} (${ordinal(place)} place).`);
    }
  }
  state.scandal.points = Math.max(0, state.scandal.points - 5);
  state.team.registered = false;
  state.school.tardies = 0;
  return msgs;
}

function ordinal(n) {
  return `${n}${['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : Math.min(n % 10, 4) % 4] || 'th'}`;
}

// ------------------------------------------------------------- scandal --
export function ringerCandidate(state) {
  const band = playerBand(state);
  if (band.id !== 'jr') return null;
  const cands = KIDS.filter((k) => kidGrade(state, k.id) === band.hi + 1 && !state.team.roster.includes(k.id));
  if (!cands.length) return null;
  cands.sort((a, b) => sumStats(state, b.id) - sumStats(state, a.id));
  return cands[hashString(`${state.seed}${state.league?.sid}`) % Math.min(5, cands.length)].id;
}

function sumStats(state, id) {
  return Object.values(statsOf(state, id)).reduce((a, b) => a + b, 0);
}

/** Week 2 of preseason: a shady kid offers to "fix" a ringer's paperwork. */
export function maybeScandalOffer(state) {
  const lg = state.league;
  if (!lg || state.scandal.offerSeason === lg.sid) return null;
  state.scandal.offerSeason = lg.sid;
  const rng = seeded(state.seed, 'scandal', lg.sid);
  if (rng() > 0.65) return null;
  const ringer = ringerCandidate(state);
  if (!ringer) return null;
  const fixer = KIDS.find((k) => k.personality === 'Entrepreneur' && kidGrade(state, k.id) >= 4) || KIDS[0];
  state.scandal.offer = { ringer, fixer: fixer.id, price: 10, sid: lg.sid };
  return state.scandal.offer;
}

export function acceptRinger(state) {
  const o = state.scandal.offer;
  if (!o) return { ok: false };
  if (state.money < o.price) return { ok: false, text: `You need $${o.price}.` };
  if (state.team.roster.length >= 14) return { ok: false, text: 'Your roster is full.' };
  state.money -= o.price;
  const ks = state.kids[o.ringer];
  ks.ringer = true;
  ks.team = state.team.name;
  ks.met = true;
  state.team.roster.push(o.ringer);
  state.scandal.offer = null;
  addLog(state, `${shortName(KID_BY_ID.get(o.ringer))} joined with "fixed" paperwork. Shhh.`);
  return { ok: true };
}

export function declineRinger(state) {
  state.scandal.offer = null;
  state.player.rep += 1;
}

function ringerCheck(state, ringers, won) {
  const lg = state.league;
  const rng = seeded(state.seed, 'ringer', lg.sid, lg.ringerGames.length);
  const band = playerBand(state);
  const suspicion = 0.03 * (state.team.recent || []).filter((r) => r === 'W').length;
  for (const id of ringers) {
    const gap = kidGrade(state, id) - band.hi;
    const p = clamp(0.08 + 0.06 * gap + (won ? 0.04 : 0) + suspicion - (state.player.sneak - 40) / 300, 0.03, 0.8);
    if (rng() < p) return busted(state, id);
  }
  return [];
}

function busted(state, id) {
  const lg = state.league;
  const sid = lg.sid;
  const kid = KID_BY_ID.get(id);
  let flipped = 0;
  for (const round of lg.schedule || []) {
    for (const g of round.games) {
      if (!g.result || !lg.ringerGames.includes(round.week)) continue;
      const mine = g.home === state.team.name ? 'home' : g.away === state.team.name ? 'away' : null;
      if (!mine) continue;
      const [h, a] = g.result.score;
      const won = (mine === 'home' && h > a) || (mine === 'away' && a > h);
      if (won) {
        flipped++;
        const me = lg.teams.find((t) => t.player);
        const opp = lg.teams.find((t) => t.name === (mine === 'home' ? g.away : g.home));
        if (me && opp) { me.w--; me.l++; opp.l--; opp.w++; }
        g.result.forfeit = mine;
      }
    }
  }
  state.team.roster = state.team.roster.filter((x) => x !== id);
  state.kids[id].ringer = false;
  state.kids[id].team = null;
  state.scandal.caught += 1;
  state.scandal.downAManSeason = sid;
  state.scandal.playoffBanUntil = sid + 8; // 3 school years (3 seasons each)
  state.scandal.points += 25;
  if (state.scandal.caught >= 2) state.scandal.expelledUntil = sid + 3;
  state.money = Math.max(0, state.money - 20);
  state.parents.trust = clamp(state.parents.trust - 15, 0, 100);
  state.parents.groundedUntil = state.time.day + 3;
  addNews(state, `SCANDAL! The ${state.team.name} used a ${kidGrade(state, id)}th grader (${shortName(kid)}) with FAKE paperwork!`);
  return [
    `BUSTED! The league found out ${kid.first_name} is a ${kidGrade(state, id)}th grader!`,
    `${flipped} win${flipped === 1 ? '' : 's'} turned into forfeits. You play one kid short for the rest of the season, you're banned from the playoffs for 3 YEARS, a $20 fine, and Mom & Dad grounded you for 3 days.`,
    state.scandal.caught >= 2 ? 'Second offense: the team is EXPELLED from the league for 3 seasons!' : 'Kids are whispering. Recruiting just got a lot harder.',
  ];
}

export { attraction };
