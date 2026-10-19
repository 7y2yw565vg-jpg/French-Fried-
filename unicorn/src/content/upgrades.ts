// One-time upgrades. Fork lines only appear for the option you picked; the others show as closed.
import type { Adds, Mods, Phase } from '../core/types';

export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
  phase: Phase;
  /** Fork line: only buyable if this fork took this option. */
  fork?: { id: string; option: string };
  minFeatures?: number;
  mods?: Mods;
  adds?: Adds;
  /** Special unlocks handled by the engine. */
  unlock?: 'autoShip' | 'refactor';
}

export const UPGRADES: UpgradeDef[] = [
  // Garage
  { id: 'monitor', name: 'Second Monitor', desc: 'Development ×1.25', cost: 25, phase: 'garage', mods: { dp: 1.25 } },
  { id: 'whiteboard', name: 'Whiteboard', desc: 'Ideas ×1.5', cost: 40, phase: 'garage', mods: { ideas: 1.5 } },
  { id: 'portfolio', name: 'Freelance Portfolio', desc: 'Contract work pays ×1.5', cost: 60, phase: 'garage', mods: { contract: 1.5 } },
  { id: 'coldemail', name: 'Cold Email Templates', desc: 'Pitch clicks ×2, outreach ×1.25', cost: 80, phase: 'garage', mods: { clickUsers: 2, outreach: 1.25 } },
  { id: 'keyboard', name: 'Mechanical Keyboard', desc: 'Code clicks ×2 (your roommate hates it)', cost: 120, phase: 'garage', mods: { clickDp: 2 } },
  { id: 'landing', name: 'Landing Page', desc: 'Word of mouth ×1.5', cost: 150, phase: 'garage', minFeatures: 1, mods: { wom: 1.5 } },
  { id: 'coffee', name: 'Espresso Machine', desc: 'Development ×1.25, ideas ×1.25', cost: 400, phase: 'garage', mods: { dp: 1.25, ideas: 1.25 } },
  { id: 'bugtracker', name: 'Bug Tracker', desc: 'Unlocks refactor sprints (pay down Tech Debt)', cost: 300, phase: 'garage', minFeatures: 2, unlock: 'refactor' },
  { id: 'usergroup', name: 'Beta Tester Group', desc: 'Churn −15%', cost: 900, phase: 'garage', minFeatures: 2, mods: { churn: 0.85 } },
  { id: 'cloud', name: 'Cloud Credits', desc: 'Development ×1.5', cost: 2500, phase: 'garage', mods: { dp: 1.5 } },

  // Seed
  { id: 'pm', name: 'Product Manager', desc: 'Features ship automatically when affordable', cost: 15e3, phase: 'seed', unlock: 'autoShip' },
  { id: 'standing', name: 'Standing Desks', desc: 'Development ×1.25', cost: 8e3, phase: 'seed', mods: { dp: 1.25 } },
  { id: 'crm', name: 'CRM Software', desc: 'Sales ×1.5', cost: 20e3, phase: 'seed', mods: { sales: 1.5 } },
  { id: 'analytics', name: 'Analytics Dashboard', desc: 'Acquisition ×1.2', cost: 40e3, phase: 'seed', mods: { acq: 1.2 } },
  { id: 'onboarding', name: 'Onboarding Flow', desc: 'Conversion ×1.25', cost: 60e3, phase: 'seed', minFeatures: 6, mods: { conv: 1.25 } },
  { id: 'statuspage', name: 'Status Page', desc: 'Churn −15%', cost: 90e3, phase: 'seed', mods: { churn: 0.85 } },
  { id: 'brand', name: 'Brand Refresh', desc: 'Hype gains ×1.3, word of mouth ×1.2', cost: 150e3, phase: 'seed', mods: { hype: 1.3, wom: 1.2 } },
  { id: 'offsite', name: 'Team Offsite', desc: 'Development ×1.3, ideas ×1.3', cost: 300e3, phase: 'seed', mods: { dp: 1.3, ideas: 1.3 } },

  // Build philosophy
  { id: 'hotfix', name: 'Hot Fixes', desc: 'Development ×1.3', cost: 200, phase: 'garage', fork: { id: 'build', option: 'fast' }, mods: { dp: 1.3 } },
  { id: 'flags', name: 'Feature Flags', desc: 'Feature cost ×0.8', cost: 1500, phase: 'garage', fork: { id: 'build', option: 'fast' }, mods: { featureCost: 0.8 } },
  { id: 'launchweek', name: 'Launch Week', desc: 'Hype gains ×1.5', cost: 25e3, phase: 'seed', fork: { id: 'build', option: 'fast' }, mods: { hype: 1.5 } },
  { id: 'designsys', name: 'Design System', desc: 'Quality cap +15', cost: 400, phase: 'garage', fork: { id: 'build', option: 'polish' }, adds: { qualityCap: 15 } },
  { id: 'qa', name: 'QA Checklist', desc: 'Churn −20%', cost: 1800, phase: 'garage', fork: { id: 'build', option: 'polish' }, mods: { churn: 0.8 } },
  { id: 'interviews', name: 'User Interviews', desc: 'Conversion ×1.2, word of mouth ×1.2', cost: 25e3, phase: 'seed', fork: { id: 'build', option: 'polish' }, mods: { conv: 1.2, wom: 1.2 } },

  // Pricing model lines
  { id: 'adnet', name: 'Ad Network', desc: 'Revenue ×1.5', cost: 1200, phase: 'garage', fork: { id: 'pricing', option: 'ads' }, mods: { revenue: 1.5 } },
  { id: 'retarget', name: 'Retargeting', desc: 'Acquisition ×1.2', cost: 30e3, phase: 'seed', fork: { id: 'pricing', option: 'ads' }, mods: { acq: 1.2 } },
  { id: 'premium', name: 'Premium Tier', desc: 'Conversion ×1.3', cost: 1200, phase: 'garage', fork: { id: 'pricing', option: 'freemium' }, mods: { conv: 1.3 } },
  { id: 'viral', name: 'Viral Loops', desc: 'Word of mouth ×1.5', cost: 30e3, phase: 'seed', fork: { id: 'pricing', option: 'freemium' }, mods: { wom: 1.5 } },
  { id: 'annual', name: 'Annual Plans', desc: 'Churn −20%', cost: 1200, phase: 'garage', fork: { id: 'pricing', option: 'subscription' }, mods: { churn: 0.8 } },
  { id: 'winback', name: 'Win-back Emails', desc: 'Churn −15%, revenue ×1.1', cost: 30e3, phase: 'seed', fork: { id: 'pricing', option: 'subscription' }, mods: { churn: 0.85, revenue: 1.1 } },
  { id: 'packs', name: 'Upgrade Packs', desc: 'Revenue ×1.4', cost: 1200, phase: 'garage', fork: { id: 'pricing', option: 'onetime' }, mods: { revenue: 1.4 } },
  { id: 'bundles', name: 'Bundle Deals', desc: 'Conversion ×1.25', cost: 30e3, phase: 'seed', fork: { id: 'pricing', option: 'onetime' }, mods: { conv: 1.25 } },
  { id: 'soc2', name: 'Security Certification', desc: 'Deal value ×1.5', cost: 1200, phase: 'garage', fork: { id: 'pricing', option: 'enterprise' }, mods: { dealValue: 1.5 } },
  { id: 'accounts', name: 'Account Managers', desc: 'Sales ×1.4', cost: 30e3, phase: 'seed', fork: { id: 'pricing', option: 'enterprise' }, mods: { sales: 1.4 } },
  { id: 'metered', name: 'Metered API', desc: 'Revenue ×1.4', cost: 1200, phase: 'garage', fork: { id: 'pricing', option: 'usage' }, mods: { revenue: 1.4 } },
  { id: 'volume', name: 'Volume Discounts', desc: 'Churn −15%, conversion ×1.1', cost: 30e3, phase: 'seed', fork: { id: 'pricing', option: 'usage' }, mods: { churn: 0.85, conv: 1.1 } },

  // Funding lines
  { id: 'growthhack', name: 'Growth Hackers', desc: 'Acquisition ×1.3', cost: 50e3, phase: 'seed', fork: { id: 'funding', option: 'vc' }, mods: { acq: 1.3 } },
  { id: 'lunch', name: 'Free Lunch', desc: 'Development ×1.3, wages ×1.1', cost: 80e3, phase: 'seed', fork: { id: 'funding', option: 'vc' }, mods: { dp: 1.3, wages: 1.1 } },
  { id: 'frugal', name: 'Frugal Ops', desc: 'Wages ×0.8', cost: 10e3, phase: 'seed', fork: { id: 'funding', option: 'bootstrap' }, mods: { wages: 0.8 } },
  { id: 'profit', name: 'Profit First', desc: 'Revenue ×1.25', cost: 30e3, phase: 'seed', fork: { id: 'funding', option: 'bootstrap' }, mods: { revenue: 1.25 } },
  { id: 'forum', name: 'Backer Forum', desc: 'Word of mouth ×1.4', cost: 15e3, phase: 'seed', fork: { id: 'funding', option: 'crowdfund' }, mods: { wom: 1.4 } },
  { id: 'stretch', name: 'Stretch Goals', desc: 'Hype gains ×1.4, ideas ×1.2', cost: 40e3, phase: 'seed', fork: { id: 'funding', option: 'crowdfund' }, mods: { hype: 1.4, ideas: 1.2 } },

  // SaaS go-to-market and market lines
  { id: 'trial', name: 'Free Trial Funnel', desc: 'Conversion ×1.3', cost: 120e3, phase: 'seed', fork: { id: 'gtm', option: 'selfserve' }, mods: { conv: 1.3 } },
  { id: 'docs', name: 'Docs Site', desc: 'Word of mouth ×1.3', cost: 200e3, phase: 'seed', fork: { id: 'gtm', option: 'selfserve' }, mods: { wom: 1.3 } },
  { id: 'playbook', name: 'Sales Playbook', desc: 'Sales ×1.5', cost: 120e3, phase: 'seed', fork: { id: 'gtm', option: 'salesled' }, mods: { sales: 1.5 } },
  { id: 'demos', name: 'Enterprise Demos', desc: 'Deal value ×1.3', cost: 200e3, phase: 'seed', fork: { id: 'gtm', option: 'salesled' }, mods: { dealValue: 1.3 } },
  { id: 'conference', name: 'Industry Conference', desc: 'Deal value ×1.5', cost: 300e3, phase: 'seed', fork: { id: 'market', option: 'vertical' }, mods: { dealValue: 1.5 } },
  { id: 'directory', name: 'App Directory', desc: 'Acquisition ×1.3', cost: 300e3, phase: 'seed', fork: { id: 'market', option: 'horizontal' }, mods: { acq: 1.3 } },
];

export const UPGRADE_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
