// Where is every kid right now? Pure function of the kid's routine, the clock,
// and a little save state (team practices).
import { HOOD_BY_NAME, PLAYER_LUNCH, RECESS_ZONES, parseSpot, classFor } from '../data/world.js';
import { KIDS } from '../data/kids.js';
import { dayInfo, schoolBlockAt, nextClassBlock, DOW } from './time.js';
import { kidGradeNow } from './stats.js';
import { hashString } from './rng.js';

const PUBLIC = new Set(['Grubbsville Elementary', 'Grubbsville Middle']);

export function schoolKind(kid, grade) {
  if (!PUBLIC.has(kid.routine.school)) return kid.routine.school === 'Homeschooled' ? 'home' : 'private';
  if (grade <= 5) return 'elem';
  if (grade <= 8) return 'middle';
  return 'high';
}

/** The school location id a public-school kid attends at a grade. */
export function schoolLocFor(grade) {
  return grade <= 5 ? 'school' : grade <= 8 ? 'middleschool' : 'highschool';
}

const sectionCache = new Map();
/**
 * Class section (0 or 1) for a public-school kid. Each grade's kids are split
 * evenly, so both sections fill their classrooms.
 */
export function sectionOf(kid, grade) {
  if (!PUBLIC.has(kid.routine.school)) return null;
  const key = `${kid.grade_at_start}:${grade}`;
  let map = sectionCache.get(key);
  if (!map) {
    const cohort = KIDS.filter((k) => k.grade_at_start === kid.grade_at_start && PUBLIC.has(k.routine.school))
      .sort((a, b) => hashString(a.id + grade) - hashString(b.id + grade) || a.id.localeCompare(b.id));
    map = new Map(cohort.map((k, i) => [k.id, i % 2]));
    sectionCache.set(key, map);
  }
  return map.get(kid.id) ?? 0;
}

/** The classroom a kid is in during a class period (1-4). */
export function kidClass(kid, grade, period) {
  const sec = sectionOf(kid, grade);
  if (sec == null) return null;
  return classFor(grade, sec, period);
}

export function kidHood(kid) {
  return HOOD_BY_NAME[kid.residence.neighborhood];
}

function evening(kid, day, salt) {
  // Out in the front yard some evenings, inside on others.
  return hashString(`${kid.id}${day}${salt}`) % 10 < 6 ? { loc: kidHood(kid), zone: 'front yard', activity: 'hanging out at home' } : null;
}

/**
 * @returns {{loc:string, zone:string, activity:string}|null} null = indoors / unreachable
 */
export function whereIsKid(kid, ctx) {
  const { day, minute, year, practice } = ctx;
  const info = dayInfo(day);
  const grade = kidGradeNow(kid, year);
  const m = minute;
  const r = kid.routine;

  if (practice && practice.ids.has(kid.id) && m >= practice.start && m < practice.end) {
    return { loc: 'home', zone: 'backyard', activity: 'team practice' };
  }
  if (m < 7 * 60 + 15 || m >= 20 * 60) return null;

  if (info.isSchoolDay) {
    const kind = schoolKind(kid, grade);
    const sLoc = schoolLocFor(grade);
    const isPublic = kind === 'elem' || kind === 'middle' || kind === 'high';
    if (m < 7 * 60 + 45) {
      if (['bus stop', 'walks with sibling', 'bikes'].includes(r.before_school)) return { loc: kidHood(kid), zone: 'street', activity: `heading to school (${r.before_school})` };
      if (r.before_school === 'early breakfast club' && isPublic) return { loc: sLoc, zone: 'cafeteria', activity: 'breakfast club' };
      return null;
    }
    if (isPublic && m < 14 * 60) {
      if (m < 8 * 60) {
        if (r.before_school === 'late again') return null;
        return { loc: sLoc, zone: r.before_school === 'early breakfast club' ? 'cafeteria' : 'playground', activity: 'before the bell' };
      }
      if (r.before_school === 'late again' && m < 8 * 60 + 6) return { loc: sLoc, zone: 'hallway', activity: 'running late (again)' };
      const block = schoolBlockAt(m);
      const roomAt = (b) => kidClass(kid, grade, (b && b.period) || 1).room;
      if (!block) return { loc: sLoc, zone: roomAt(null), activity: 'in class' };
      switch (block.kind) {
        case 'class': return { loc: sLoc, zone: roomAt(block), activity: 'in class' };
        case 'pass': { const nc = kidClass(kid, grade, nextClassBlock(m).period); return { loc: sLoc, zone: 'hallway', activity: `heading to ${nc.subject}`, toRoom: nc.room }; }
        case 'recess': return { loc: sLoc, zone: RECESS_ZONES[r.recess_spot] || 'playground', activity: `recess (${r.recess_spot})` };
        case 'lunch': return r.lunch === PLAYER_LUNCH || !r.lunch ? { loc: sLoc, zone: 'cafeteria', activity: 'lunch' } : { loc: sLoc, zone: roomAt(nextClassBlock(m)), activity: 'in class (different lunch)' };
        default: return { loc: sLoc, zone: roomAt(null), activity: 'in class' };
      }
    }
    if (!isPublic && m < 15 * 60 + 30) return null; // at their own school
    if (m < 14 * 60 + 30 && isPublic) {
      const after = r.after_school[DOW[info.dow]];
      if (after.startsWith('School')) return { ...parseSpot(after, kid), loc: sLoc, activity: 'after school' };
      return { loc: sLoc, zone: 'playground', activity: 'dismissal' };
    }
    if (m < 17 * 60 + 45) {
      const spot = parseSpot(r.after_school[DOW[info.dow]], kid);
      if (spot.loc === 'school') spot.loc = isPublic ? sLoc : kidHood(kid);
      if (!isPublic && spot.loc === kidHood(kid) && spot.zone !== 'front yard' && !['cul-de-sac', 'driveway hoop', 'creek'].includes(spot.zone)) spot.zone = 'front yard';
      return { ...spot, activity: 'after school' };
    }
    return evening(kid, day, 'wk');
  }

  // Weekends and summer vacation.
  const sat = info.isWeekend ? info.dow === 5 : day % 2 === 0;
  const prefix = sat ? 'Sat' : 'Sun';
  if (m >= 9 * 60 && m < 12 * 60) return weekendSpot(kid, `${prefix} AM`, grade);
  if (m >= 12 * 60 && m < 17 * 60 + 30) return weekendSpot(kid, `${prefix} PM`, grade);
  return evening(kid, day, 'we');
}

function weekendSpot(kid, slot, grade) {
  const spot = parseSpot(kid.routine.weekend[slot], kid);
  if (spot.loc === 'school') spot.loc = schoolKind(kid, grade) === 'elem' || schoolKind(kid, grade) === 'middle' ? schoolLocFor(grade) : kidHood(kid);
  if (spot.loc === 'school' || spot.loc === 'middleschool') spot.zone = 'playground';
  return { ...spot, activity: slot.endsWith('AM') ? 'weekend morning' : 'weekend afternoon' };
}

/** Routine facts the player can learn about a kid, in the order chat reveals them. */
export function routineSlots(kid) {
  const slots = [];
  if (PUBLIC.has(kid.routine.school)) slots.push('homeroom', 'lunch', 'recess');
  slots.push('before');
  for (const d of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']) slots.push(`after:${d}`);
  for (const w of ['Sat AM', 'Sat PM', 'Sun AM', 'Sun PM']) slots.push(`weekend:${w}`);
  return slots;
}

export function describeSlot(kid, slot, grade = kid.grade_at_start) {
  const r = kid.routine;
  if (slot === 'homeroom') {
    const classes = [1, 2, 3, 4].map((p) => kidClass(kid, grade, p)).filter(Boolean);
    return classes.length ? `Classes: ${classes.map((c, i) => `P${i + 1} ${c.subject} (${c.teacher})`).join(', ')}` : `School: ${r.school}`;
  }
  if (slot === 'lunch') return `Lunch: ${r.lunch}`;
  if (slot === 'recess') return `Recess: ${r.recess_spot}`;
  if (slot === 'specials') return null; // retired (old saves)
  if (slot === 'before') return `Before school: ${r.before_school}`;
  if (slot.startsWith('after:')) return `${slot.slice(6)} after school: ${r.after_school[slot.slice(6)]}`;
  if (slot.startsWith('weekend:')) return `${slot.slice(8)}: ${r.weekend[slot.slice(8)]}`;
  return slot;
}
