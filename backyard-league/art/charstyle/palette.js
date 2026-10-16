// Character Design Bible palette (Recess Rivals). Every color a generated
// character uses comes from here. Entries marked "addition" are not in the
// bible yet: the roster needed them and they should be added there.

export const INK = '#2A1E1A';
export const BROW_DARK = '#3B2416';

// Skin: [base, shade, blush]. Roster tone -> bible tone.
export const SKIN = {
  porcelain: ['#F6D7C3', '#E3AE9A', '#F2A7A0'], // S1
  fair: ['#EEC1A1', '#D69877', '#EE9A8A'], // S2
  light: ['#E0A57E', '#C47E5C', '#E2876F'], // S3
  'light-olive': ['#D9A877', '#BC8456', '#DE8A6E'], // addition: between S3 and S4
  tan: ['#C98B5E', '#A9663F', '#D27760'], // S4
  olive: ['#B9875A', '#976438', '#C9735A'], // S5
  'golden-brown': ['#AE7446', '#8B5430', '#BF6650'], // addition: between S5 and S6
  brown: ['#9C6640', '#7A4628', '#B45E48'], // S6
  'deep-brown': ['#77492C', '#57301B', '#9A4A3A'], // S7
  ebony: ['#4E2E1C', '#361C0F', '#7E3A2E'], // S8
};

// Hair: [base, shade, highlight]
export const HAIR = {
  black: ['#23201F', '#121010', '#5A5560'],
  'dark brown': ['#4A2E1F', '#2F1C12', '#7D5A44'],
  brown: ['#7A4A2A', '#573219', '#A9774E'],
  'light brown': ['#9C6B3F', '#74492A', '#C99A6A'], // addition
  auburn: ['#9B3D22', '#702713', '#CC6A45'],
  ginger: ['#D46A2A', '#A84A16', '#F29A5E'],
  'strawberry blonde': ['#E0955A', '#B8703A', '#F6C08E'], // addition
  blonde: ['#E8C25A', '#C49A35', '#FBE6A0'],
  'platinum blonde': ['#F2E6C2', '#D2C29A', '#FFF8E6'],
  gray: ['#B8B6B2', '#8E8C88', '#E2E0DC'],
  white: ['#ECEAE4', '#C9C6BE', '#FFFFFA'],
};
// Fun dye colors for streaks and tips.
export const DYE = { green: ['#57CC99', '#36A275'], blue: ['#3A86FF', '#2563C9'], pink: ['#FF6FAE', '#D9468A'] };

export const EYES = {
  'dark brown': '#2E1F18', brown: '#5A3A22', hazel: '#8A6A30', green: '#4E8A4A',
  blue: '#3F7FC0', gray: '#7B8A96', amber: '#B07A2A', // amber: addition
};

// Clothing: [base, shade]
export const CLOTH = {
  red: ['#E63946', '#B72235'],
  orange: ['#F4A261', '#D27A3C'],
  yellow: ['#FFD23F', '#DDA821'],
  green: ['#57CC99', '#36A275'],
  lime: ['#9BD13B', '#74A82A'], // addition
  teal: ['#2A9D8F', '#1B7569'],
  sky: ['#74C0F2', '#4E9DD4'], // addition
  blue: ['#3A86FF', '#2563C9'],
  navy: ['#1D3557', '#12223A'],
  purple: ['#8E6CE6', '#6A49C2'],
  pink: ['#FF7EB6', '#DA5791'],
  white: ['#F7F4EA', '#DCD5C2'],
  denim: ['#4A6FA5', '#33507D'],
  khaki: ['#C8B48A', '#A48F66'],
  gray: ['#9AA3AD', '#76808A'], // addition
  charcoal: ['#3A3A44', '#26262E'], // addition (stands in for black)
  olive: ['#6B8E3A', '#4F6C28'], // addition (camo)
  brownc: ['#8B5E3C', '#6A4428'], // addition (camo, leather)
};

// Roster favorite color -> [main cloth, pattern]
export const FAVORITE = {
  lime: ['lime'], white: ['white'], teal: ['teal'], 'sky blue': ['sky'], yellow: ['yellow'], red: ['red'],
  orange: ['orange'], green: ['green'], purple: ['purple'], pink: ['pink'], black: ['charcoal'], navy: ['navy'],
  gray: ['gray'], striped: ['red', 'stripes'], plaid: ['red', 'plaid'], camo: ['olive', 'camo'],
  'polka dot': ['navy', 'dots'], 'tie-dye': ['pink', 'tiedye'],
};

export const MUD = '#6B4A2E';
export const METAL = ['#C9D1D9', '#9AA5B1'];
export const PAPER = '#FFFDF6';
