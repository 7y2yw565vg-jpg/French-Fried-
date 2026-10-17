// The Suncrest Sunday Gazette: every Sunday morning, a newspaper with all of
// Saturday's league results, the standings, the stat leaders, the Crest Cup
// (when it's played) and the week's headlines.
import { h, modal } from './dom.js';
import { dayInfo } from '../game/time.js';
import { standings, weekGames } from '../game/league.js';
import { STAT_COLS, leagueLeaders } from '../game/leagueStats.js';
import { rivalryRecord } from '../game/rivalry.js';

const scoreLine = (g, mine) => {
  const r = g.result;
  const [hs, as] = r.score;
  const winA = as > hs; const winH = hs > as;
  return h('div', { class: `np-score ${mine ? 'mine' : ''}` },
    h('span', { class: winA ? 'w' : '' }, g.away), h('b', {}, `${as}`),
    h('span', { class: 'np-at' }, '@'),
    h('span', { class: winH ? 'w' : '' }, g.home), h('b', {}, `${hs}`),
    r.forfeit ? h('span', { class: 'np-note' }, ' (forfeit)') : g.playoff ? h('span', { class: 'np-note' }, ` (${g.playoff})`) : null);
};

/** Is there a Sunday paper to read this morning? */
export function hasSundayPaper(state) {
  const info = dayInfo(state.time.day);
  return info.dow === 6 && !!info.season && !!state.league;
}

export function openNewspaper(game, after) {
  const s = game.state;
  const info = dayInfo(s.time.day);
  const lg = s.league;
  const week = info.season.week;
  const games = weekGames(s, week).filter((g) => g.result);
  const mine = games.find((g) => g.home === s.team.name || g.away === s.team.name);
  // Headline: your game if you played, otherwise the biggest blowout.
  let headline = `${lg.bandName}: Week ${week} in the books`;
  if (mine) {
    const [hs, as] = mine.result.score;
    const myScore = mine.home === s.team.name ? hs : as; const opp = mine.home === s.team.name ? mine.away : mine.home; const theirs = mine.home === s.team.name ? as : hs;
    headline = mine.result.forfeit ? `${s.team.name.toUpperCase()} FORFEIT TO ${opp.toUpperCase()}`
      : myScore > theirs ? `${s.team.name.toUpperCase()} TOP ${opp.toUpperCase()} ${myScore}-${theirs}!` : myScore < theirs ? `${opp} beat the ${s.team.name} ${theirs}-${myScore}` : `${s.team.name} and ${opp} tie ${myScore}-${theirs}`;
  } else if (games.length) {
    const big = games.slice().sort((a, b) => Math.abs(b.result.score[0] - b.result.score[1]) - Math.abs(a.result.score[0] - a.result.score[1]))[0];
    const [hs, as] = big.result.score;
    headline = hs >= as ? `${big.home} roll past ${big.away}, ${hs}-${as}` : `${big.away} roll past ${big.home}, ${as}-${hs}`;
  }
  const crest = rivalryRecord(s).games[0];
  const crestToday = crest && crest.sid === lg.sid && week >= 15;
  const top = standings(s).slice(0, 5);
  const cols = STAT_COLS[lg.sport || s.team.sport].slice(0, 3);
  const news = s.news.slice(0, 6);
  const paper = h('div', { class: 'newspaper' },
    h('div', { class: 'np-mast' }, h('div', { class: 'np-title' }, 'The Suncrest Sunday Gazette'), h('div', { class: 'np-sub' }, `${info.dateLabel} · ${info.season.name} season, week ${week} · 25¢ (free for kids)`)),
    h('div', { class: 'np-headline' }, headline),
    crestToday ? h('div', { class: 'np-crest' }, `🏆 CREST CUP: ${crest.team} ${crest.score[1]}, Hilltop Prep Hawks ${crest.score[0]}. ${crest.won ? 'The cup comes home to Suncrest Academy!' : 'Hilltop keeps the cup.'}`) : null,
    h('div', { class: 'np-cols' },
      h('div', {}, h('h4', {}, `${lg.bandName} results`), games.length ? h('div', {}, ...games.map((g) => scoreLine(g, g === mine))) : h('p', {}, 'No games this week.')),
      h('div', {}, h('h4', {}, 'Standings'), h('table', { class: 'np-table' }, ...top.map((t, i) => h('tr', { class: t.player ? 'mine' : '' }, h('td', {}, `${i + 1}.`), h('td', {}, t.name), h('td', {}, `${t.w}-${t.l}${t.t ? `-${t.t}` : ''}`)))),
        h('h4', {}, 'Stat leaders'), ...cols.map(([k, label]) => { const l = leagueLeaders(s, k, 1)[0]; return h('div', { class: 'np-leader' }, `${label}: `, l ? h('b', {}, `${l.name} (${l.n})`) : '-'); }))),
    h('h4', {}, 'Around Suncrest'), h('div', { class: 'np-news' }, ...news.map((n) => h('p', {}, n.text))));
  modal({ title: '📰 Sunday paper', body: paper, wide: true, buttons: [{ label: 'Fold it up', cls: 'green', onClick: after }] });
}
