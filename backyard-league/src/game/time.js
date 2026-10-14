// Calendar and clock. Day 1 is Monday, September 1 of 3rd grade.
import { SCHOOL_BLOCKS } from '../data/world.js';

export const DAY_START = 7 * 60;
export const CURFEW = 21 * 60 + 30;
export const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DOW_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const SEASON_NAMES = ['Fall', 'Winter', 'Spring'];
export const WEEKS_PER_SEASON = 15;
export const SCHOOL_WEEKS = 45; // weeks 46-52 are summer vacation

const MONTHS = [['September', 30], ['October', 31], ['November', 30], ['December', 31], ['January', 31], ['February', 28],
  ['March', 31], ['April', 30], ['May', 31], ['June', 30], ['July', 31], ['August', 31]];

export function dayInfo(day) {
  const dow = (day - 1) % 7;
  const year = Math.floor((day - 1) / 364) + 1;
  const dayOfYear = (day - 1) % 364; // 0-based
  const weekOfYear = Math.floor(dayOfYear / 7) + 1;
  const isWeekend = dow >= 5;
  const isSummer = weekOfYear > SCHOOL_WEEKS;
  let season = null;
  if (!isSummer) {
    const index = Math.floor((weekOfYear - 1) / WEEKS_PER_SEASON);
    season = { index, name: SEASON_NAMES[index], week: ((weekOfYear - 1) % WEEKS_PER_SEASON) + 1 };
  }
  let rem = dayOfYear;
  let m = 0;
  while (m < 11 && rem >= MONTHS[m][1]) rem -= MONTHS[m++][1];
  return {
    day, dow, dowName: DOW[dow], dowLong: DOW_LONG[dow], year, weekOfYear, isWeekend, isSummer,
    isSchoolDay: !isWeekend && !isSummer, season,
    dateLabel: `${DOW_LONG[dow]}, ${MONTHS[m][0]} ${rem + 1}`,
  };
}

/** Stable id for a sports season, counting from the start of the game. */
export function seasonId(day) {
  const info = dayInfo(day);
  if (!info.season) return null;
  return (info.year - 1) * 3 + info.season.index + 1;
}

export function formatTime(minute) {
  const h = Math.floor(minute / 60);
  const m = Math.floor(minute % 60);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`;
}

export function schoolBlockAt(minute) {
  return SCHOOL_BLOCKS.find((b) => minute >= b.start && minute < b.end) || null;
}

/** The class block in progress at `minute`, or the next one today (null after the last). */
export function nextClassBlock(minute) {
  return SCHOOL_BLOCKS.find((b) => b.kind === 'class' && minute < b.end) || null;
}

/** Hours of daylight shading for the 3D sun: 0 = midnight, 1 = noon. */
export function sunAmount(minute) {
  const x = (minute - 6 * 60) / (14 * 60); // 6am..8pm
  if (x <= 0 || x >= 1) return 0;
  return Math.sin(Math.PI * x);
}
