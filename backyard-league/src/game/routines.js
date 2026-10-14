// Where is every kid right now? Pure function of the kid's routine, the clock,
// and a little save state (team practices).
import { HOOD_BY_NAME, PLAYER_LUNCH, RECESS_ZONES, SPECIAL_ROOMS, TEACHERS_BY_GRADE, parseSpot } from '../data/world.js';
import { dayInfo, schoolBlockAt, DOW } from './time.js';
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

export function homeroomOf(kid, grade) {
  if (!PUBLIC.has(kid.routine.school)) return null;
  if (grade === kid.grade_at_start && kid.routine.homeroom) return kid.routine.homeroom;
  const list = TEACHERS_BY_GRADE[grade];
  if (!list) return null;
  return list[hashString(kid.id + grade) % list.length];
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
      const room = `room:${homeroomOf(kid, grade)}`;
      if (!block) return { loc: sLoc, zone: room, activity: 'in class' };
      switch (block.kind) {
        case 'class': return { loc: sLoc, zone: room, activity: 'in class' };
        case 'hall': return { loc: sLoc, zone: 'hallway', activity: 'between classes' };
        case 'recess': return { loc: sLoc, zone: RECESS_ZONES[r.recess_spot] || 'playground', activity: `recess (${r.recess_spot})` };
        case 'lunch': return r.lunch === PLAYER_LUNCH ? { loc: sLoc, zone: 'cafeteria', activity: 'lunch' } : { loc: sLoc, zone: room, activity: 'in class (different lunch)' };
        case 'special': {
          const sp = r.specials_day ? r.specials_day[DOW[info.dow]] : 'Art';
          return { loc: sLoc, zone: SPECIAL_ROOMS[sp] || 'art room', activity: `${sp} class` };
        }
        default: return { loc: sLoc, zone: room, activity: 'in class' };
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
  if (kid.routine.homeroom) slots.push('homeroom', 'lunch', 'recess', 'specials');
  slots.push('before');
  for (const d of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']) slots.push(`after:${d}`);
  for (const w of ['Sat AM', 'Sat PM', 'Sun AM', 'Sun PM']) slots.push(`weekend:${w}`);
  return slots;
}

export function describeSlot(kid, slot) {
  const r = kid.routine;
  if (slot === 'homeroom') return `Homeroom: ${r.homeroom}`;
  if (slot === 'lunch') return `Lunch: ${r.lunch}`;
  if (slot === 'recess') return `Recess: ${r.recess_spot}`;
  if (slot === 'specials') return `Specials: ${Object.entries(r.specials_day).map(([d, s]) => `${d} ${s}`).join(', ')}`;
  if (slot === 'before') return `Before school: ${r.before_school}`;
  if (slot.startsWith('after:')) return `${slot.slice(6)} after school: ${r.after_school[slot.slice(6)]}`;
  if (slot.startsWith('weekend:')) return `${slot.slice(8)}: ${r.weekend[slot.slice(8)]}`;
  return slot;
}
