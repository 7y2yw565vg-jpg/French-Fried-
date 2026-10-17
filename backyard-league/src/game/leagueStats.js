// Season stats from every league game (goals, assists, saves... per sport),
// league leaders, team totals, and the end-of-season MVP awards.
import { KID_BY_ID, shortName } from '../data/kids.js';

/** Stat columns shown for each sport: [key, label]. */
export const STAT_COLS = {
  soccer: [['G', 'Goals'], ['A', 'Assists'], ['SV', 'Saves'], ['TK', 'Tackles']],
  basketball: [['PTS', 'Points'], ['3PM', 'Threes'], ['AST', 'Assists'], ['STL', 'Steals']],
  baseball: [['H', 'Hits'], ['HR', 'Home runs'], ['RBI', 'RBI'], ['K', 'Strikeouts']],
  football: [['TD', 'Touchdowns'], ['PTD', 'TD passes'], ['INT', 'Interceptions'], ['FS', 'Flag stops']],
};
// MVP score: what each stat is worth, plus a bonus for team wins.
const MVP_WEIGHTS = {
  soccer: { G: 3, A: 2, SV: 0.6, TK: 0.4 },
  basketball: { PTS: 0.5, '3PM': 0.5, AST: 1, STL: 1.2 },
  baseball: { H: 1, HR: 3, RBI: 1.5, K: 1 },
  football: { TD: 3, PTD: 2, INT: 2.5, FS: 0.8 },
};
// Award names for the leader in each stat.
export const LEADER_AWARDS = {
  soccer: { G: 'Golden Boot (most goals)', A: 'Playmaker (most assists)', SV: 'Golden Glove (most saves)' },
  basketball: { PTS: 'Scoring Title (most points)', AST: 'Dime Dropper (most assists)', STL: 'Pickpocket (most steals)' },
  baseball: { HR: 'Home Run King', H: 'Hit Machine (most hits)', K: 'Strikeout Ace' },
  football: { TD: 'Touchdown Leader', INT: 'Ball Hawk (most interceptions)', FS: 'Flag Snatcher (most flag stops)' },
};

/** [id, stat, amount] credits for one sim event. */
export function eventCredits(sport, e) {
  const out = [];
  const add = (id, k, n = 1) => { if (id) out.push([id, k, n]); };
  if (sport === 'soccer') {
    if (e.type === 'goal') { add(e.actor, 'G'); add(e.assist, 'A'); }
    if (e.type === 'save') add(e.gk, 'SV');
    if (e.type === 'tackle') add(e.actor, 'TK');
  } else if (sport === 'basketball') {
    if (e.type === 'bucket' || e.type === 'three') { add(e.actor, 'PTS', e.points || 2); add(e.assist, 'AST'); }
    if (e.type === 'three') add(e.actor, '3PM');
    if (e.type === 'steal') add(e.actor, 'STL');
  } else if (sport === 'baseball') {
    if (['hit', 'double', 'triple', 'homer'].includes(e.type)) add(e.batter || e.actor, 'H');
    if (e.type === 'homer') add(e.batter || e.actor, 'HR');
    if (e.points && e.batter && e.type !== 'error') add(e.batter, 'RBI', e.points);
    if (e.type === 'strikeout' || e.how === 'k') add(e.pitcher, 'K');
  } else if (sport === 'football') {
    if (e.type === 'td') { add(e.actor, 'TD'); if (e.qb && e.qb !== e.actor) add(e.qb, 'PTD'); }
    if (e.type === 'pick') add(e.actor, 'INT');
    if (e.type === 'stop') add(e.actor, 'FS');
  }
  return out;
}

/** Add one finished game to this season's stat lines. */
export function recordGameStats(state, game, result) {
  const lg = state.league;
  if (!lg || result.forfeit || !result.events) return;
  const sport = lg.sport || state.team.sport;
  lg.stats = lg.stats || {};
  const line = (id, team) => (lg.stats[id] = lg.stats[id] || { team, gp: 0 });
  const teamOf = {};
  for (const [side, name] of [['home', game.home], ['away', game.away]]) {
    for (const id of (result.lineups && result.lineups[side]) || []) { teamOf[id] = name; const l = line(id, name); l.team = name; l.gp += 1; }
  }
  for (const e of result.events) {
    for (const [id, k, n] of eventCredits(sport, e)) {
      const l = line(id, teamOf[id] || (id === 'PLAYER' ? state.team.name : (state.kids[id] && state.kids[id].team) || null));
      l[k] = (l[k] || 0) + n;
    }
  }
}

export function statName(state, id) {
  if (id === 'PLAYER') return state.player.name;
  const k = KID_BY_ID.get(id);
  return k ? shortName(k) : id;
}

/** Top players in one stat: [{id, name, team, n, gp}]. */
export function leagueLeaders(state, key, n = 5) {
  const st = (state.league && state.league.stats) || {};
  return Object.entries(st).filter(([, l]) => l[key]).map(([id, l]) => ({ id, name: statName(state, id), team: l.team, n: l[key], gp: l.gp }))
    .sort((a, b) => b.n - a.n || a.gp - b.gp).slice(0, n);
}

/** One team's season: player stat lines (sorted by games) and the team totals. */
export function teamStats(state, name) {
  const st = (state.league && state.league.stats) || {};
  const players = Object.entries(st).filter(([, l]) => l.team === name).map(([id, l]) => ({ id, name: statName(state, id), ...l })).sort((a, b) => b.gp - a.gp);
  const totals = {};
  for (const p of players) for (const [k, v] of Object.entries(p)) if (typeof v === 'number' && k !== 'gp') totals[k] = (totals[k] || 0) + v;
  return { players, totals };
}

export function mvpScore(state, id) {
  const lg = state.league;
  const l = lg && lg.stats && lg.stats[id];
  if (!l) return 0;
  const w = MVP_WEIGHTS[lg.sport || state.team.sport];
  let score = Object.entries(w).reduce((a, [k, v]) => a + (l[k] || 0) * v, 0);
  const t = lg.teams.find((x) => x.name === l.team);
  if (t) score += t.w * 0.75;
  return +score.toFixed(1);
}

/** End-of-season awards: league MVP plus the leader in each award stat. */
export function seasonAwards(state) {
  const lg = state.league;
  if (!lg || !lg.stats) return null;
  const sport = lg.sport || state.team.sport;
  const ids = Object.keys(lg.stats).filter((id) => lg.stats[id].gp > 0);
  if (!ids.length) return null;
  const ranked = ids.map((id) => ({ id, score: mvpScore(state, id) })).sort((a, b) => b.score - a.score);
  const mvp = { ...ranked[0], name: statName(state, ranked[0].id), team: lg.stats[ranked[0].id].team };
  const leaders = [];
  for (const [k, title] of Object.entries(LEADER_AWARDS[sport] || {})) {
    const top = leagueLeaders(state, k, 1)[0];
    if (top) leaders.push({ key: k, title, ...top });
  }
  return { mvp, leaders };
}
