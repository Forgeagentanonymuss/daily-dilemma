/**
 * Daily Dilemma — embeddable would-you-rather habit game.
 *
 * State shape (v2, localStorage key dailyDilemma_v2):
 * {
 *   version: 2,
 *   streak, longestStreak, lastPlayDate,
 *   isPremium, shields, onboarded, shareCount,
 *   quickPlaysToday: { date, count },
 *   daily: { [dateKey]: { choice, dilemmaId, pctA } },
 *   history: [{ id, date, dilemmaId, choice, pctA, mode, category }],
 *   customDilemmas: [{ id, category, a, b, locked, createdAt }],
 *   achievements: { [id]: unlockDate },
 *   categoryCompleted: { family, adult, absurd },
 *   devIdx (dev only)
 * }
 * v1 keys (date strings at root) are migrated gently on first load.
 */

const STORAGE_KEY = "dailyDilemma_v2";
const STORAGE_KEY_LEGACY = "dailyDilemma_v1";
const TAGLINE = "Pick a side. Argue about it later.";
const TAGLINE_SUB = "One impossible choice. Every day.";
const QUICK_FREE_LIMIT = 5;
const FREE_CUSTOM_LIMIT = 2;
const CATEGORY_SESSION_SIZE = 4;
const PREMIUM_SHIELDS = 3;
const SHARE_SITE_URL = "https://the-daily-dilemma.com";

const CATEGORIES = [
  { id: "family", label: "Family", icon: "cat_family", blurb: "Table-friendly debates" },
  { id: "adult", label: "Adult", icon: "cat_adult", blurb: "Life, work & grown-up chaos" },
  { id: "absurd", label: "Absurd", icon: "cat_absurd", blurb: "Delightfully unhinged" },
];

const ACHIEVEMENTS = [
  { id: "first_play", icon: "ach_first_play", title: "First Play", desc: "Answer your first dilemma" },
  { id: "streak_3", icon: "ach_streak_3", title: "Warming Up", desc: "3-day streak" },
  { id: "streak_7", icon: "ach_streak_7", title: "Week Warrior", desc: "7-day streak" },
  { id: "streak_30", icon: "ach_streak_30", title: "Monthly Legend", desc: "30-day streak" },
  { id: "family_10", icon: "ach_family_10", title: "Family Expert", desc: "10 family picks" },
  { id: "adult_10", icon: "ach_adult_10", title: "Grown-Up Guru", desc: "10 adult picks" },
  { id: "absurd_10", icon: "ach_absurd_10", title: "Absurd Adventurer", desc: "10 absurd picks" },
  { id: "contrarian", icon: "ach_contrarian", title: "Bold Contrarian", desc: "Pick the minority 10 times" },
  { id: "crowd", icon: "ach_crowd", title: "Crowd Favorite", desc: "Pick the majority 20 times" },
  { id: "sharer", icon: "ach_sharer", title: "Sharer", desc: "Share 3 times" },
  { id: "creator", icon: "ach_creator", title: "Creator", desc: "Save a custom dilemma (Premium)" },
  { id: "quick_25", icon: "ach_quick_25", title: "Quick Thinker", desc: "25 Quick Play answers" },
  { id: "explorer", icon: "ach_explorer", title: "Category Explorer", desc: "Complete all three categories" },
  { id: "total_50", icon: "ach_total_50", title: "Dilemma Devotee", desc: "50 total answers" },
  { id: "premium", icon: "ach_premium", title: "Premium Member", desc: "Unlock Premium" },
];

const STREAK_MILESTONES = [3, 7, 30, 100];

const ICONS = {
  flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c-2 5-5 7-5 11a5 5 0 0010 0c0-3-2-5-4-7 1 3 3 4 3 7 4-2 6-6 6-11 0-5-4-8-7-11-1 3-2 5-3 8z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>',
  scroll: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 012-2z"/><path d="M8 8h8"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5"/><path d="M4 19h16"/><rect x="7" y="10" width="3" height="9" rx="1.5"/><rect x="12" y="6" width="3" height="13" rx="1.5"/><rect x="17" y="13" width="3" height="6" rx="1.5"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v3a4 4 0 01-8 0V4z"/><path d="M6 4H4v1a3 3 0 003 3"/><path d="M18 4h2v1a3 3 0 01-3 3"/><path d="M12 14v3"/><path d="M8 21h8"/><path d="M9 17h6"/></svg>',
  pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 3.9M15.4 6.6L8.6 10.5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4L19 6"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l2.9 6.9L22 9.2l-5.2 4.5L18.2 22 12 18.2 5.8 22l1.4-8.3L2 9.2l7.1-0.3L12 2z"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  quest: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 014.5 1.5c0 2-2.5 2-2.5 4"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></svg>',
  cat_family: '<svg viewBox="0 0 48 48" fill="none"><ellipse cx="24" cy="40" rx="15" ry="3" fill="#e8f0ec"/><rect x="9" y="30" width="30" height="5" rx="2.5" fill="#4d7d6e" opacity="0.2"/><circle cx="15" cy="23" r="4.5" fill="#fff8e8" stroke="#f4c95f" stroke-width="1.75"/><circle cx="24" cy="21" r="5" fill="#fff8e8" stroke="#f4c95f" stroke-width="1.75"/><circle cx="33" cy="23" r="4.5" fill="#fff8e8" stroke="#f4c95f" stroke-width="1.75"/><path d="M13 27.5v5M22 25.5v7M31 27.5v5" stroke="#4d7d6e" stroke-width="1.75" stroke-linecap="round"/><circle cx="37" cy="13" r="7" fill="#fff8e8" stroke="#f4c95f" stroke-width="1.75"/><path d="M37 10.5c0-1.8 1.2-3 2.8-3 1.5 0 2.5 1 2.5 2.5 0 1.8-2.2 2.2-2.5 4" stroke="#d4a84a" stroke-width="1.4" stroke-linecap="round"/><circle cx="37" cy="17.5" r="1" fill="#d4a84a"/></svg>',
  cat_adult: '<svg viewBox="0 0 48 48" fill="none"><path d="M14 17h18v20c0 2.2-1.8 4-4 4H18c-2.2 0-4-1.8-4-4V17z" fill="#e8f0ec" stroke="#4d7d6e" stroke-width="1.75" stroke-linejoin="round"/><path d="M32 21h5a3.5 3.5 0 010 7h-5" stroke="#4d7d6e" stroke-width="1.75" stroke-linecap="round"/><path d="M17 13h12" stroke="#4d7d6e" stroke-width="1.75" stroke-linecap="round"/><path d="M20 17v3M26 17v3" stroke="#4d7d6e" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/><path d="M34 9l-5 9h4l-4 8" stroke="#f4c95f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  cat_absurd: '<svg viewBox="0 0 48 48" fill="none"><ellipse cx="23" cy="31" rx="13" ry="10" fill="#e8f0ec" stroke="#4d7d6e" stroke-width="1.75"/><circle cx="30" cy="19" r="8" fill="#f4c95f" stroke="#d4a84a" stroke-width="1.75"/><circle cx="32.5" cy="18" r="1.8" fill="#4d7d6e"/><path d="M37 19.5l5 2.5-5 2.5V19.5z" fill="#d4a84a"/><path d="M14 28c-3 1-5 3-5 5" stroke="#4d7d6e" stroke-width="1.75" stroke-linecap="round"/><circle cx="11" cy="12" r="6" fill="#fff8e8" stroke="#f4c95f" stroke-width="1.75"/><path d="M11 9.5c0-1.5 1-2.5 2.2-2.5" stroke="#d4a84a" stroke-width="1.3" stroke-linecap="round"/><circle cx="11" cy="14.5" r="0.9" fill="#d4a84a"/><path d="M8 8l1.5 3M6.5 6.5h3" stroke="#4d7d6e" stroke-width="1.3" stroke-linecap="round"/></svg>',
  ach_first_play: '<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="14" fill="#e8f0ec" stroke="#4d7d6e" stroke-width="1.75"/><circle cx="24" cy="24" r="8" fill="#fff8e8" stroke="#f4c95f" stroke-width="1.75"/><circle cx="24" cy="24" r="2.5" fill="#f4c95f"/><path d="M24 10v6M24 32v6M10 24h6M32 24h6" stroke="#4d7d6e" stroke-width="1.5" stroke-linecap="round" opacity="0.45"/></svg>',
  ach_streak_3: '<svg viewBox="0 0 48 48" fill="none"><path d="M24 38V30" stroke="#4d7d6e" stroke-width="1.75" stroke-linecap="round"/><path d="M16 32c0-8 4-14 8-18 4 4 8 10 8 18" fill="#fff8e8" stroke="#f4c95f" stroke-width="1.75" stroke-linejoin="round"/><path d="M20 34c0-5 2-9 4-12 2 3 4 7 4 12" fill="#f4c95f" opacity="0.35" stroke="#d4a84a" stroke-width="1.5"/><rect x="11" y="11" width="3.5" height="11" rx="1.75" fill="#4d7d6e" opacity="0.45"/><rect x="17" y="9" width="3.5" height="13" rx="1.75" fill="#f4c95f"/><rect x="23" y="11" width="3.5" height="11" rx="1.75" fill="#4d7d6e" opacity="0.45"/></svg>',
  ach_streak_7: '<svg viewBox="0 0 48 48" fill="none"><path d="M24 38V30" stroke="#4d7d6e" stroke-width="1.75" stroke-linecap="round"/><path d="M14 32c0-10 5-16 10-20 5 4 10 10 10 20" fill="#fff8e8" stroke="#f4c95f" stroke-width="1.75" stroke-linejoin="round"/><path d="M18 34c0-6 2.5-11 6-15 3.5 4 6 9 6 15" fill="#f4c95f" opacity="0.4" stroke="#d4a84a" stroke-width="1.5"/><path d="M32 10l-4 7h3.5l-4.5 9" stroke="#4d7d6e" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ach_streak_30: '<svg viewBox="0 0 48 48" fill="none"><path d="M24 38V30" stroke="#4d7d6e" stroke-width="1.75" stroke-linecap="round"/><path d="M12 32c0-12 6-18 12-22 6 4 12 10 12 22" fill="#fff8e8" stroke="#f4c95f" stroke-width="1.75" stroke-linejoin="round"/><path d="M17 34c0-7 3-13 7-17 4 4 7 10 7 17" fill="#f4c95f" opacity="0.45" stroke="#d4a84a" stroke-width="1.5"/><circle cx="24" cy="11" r="7" fill="#e8f0ec" stroke="#4d7d6e" stroke-width="1.75"/><path d="M20 12.5l1.5 3 3.5-4 3.5 4 1.5-3" stroke="#f4c95f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ach_family_10: '<svg viewBox="0 0 48 48" fill="none"><ellipse cx="24" cy="38" rx="12" ry="2.5" fill="#e8f0ec"/><rect x="12" y="30" width="24" height="4" rx="2" fill="#4d7d6e" opacity="0.2"/><circle cx="16" cy="24" r="3.5" fill="#fff8e8" stroke="#f4c95f" stroke-width="1.75"/><circle cx="24" cy="22" r="4" fill="#fff8e8" stroke="#f4c95f" stroke-width="1.75"/><circle cx="32" cy="24" r="3.5" fill="#fff8e8" stroke="#f4c95f" stroke-width="1.75"/><path d="M14 28v6M22 26v8M30 28v6" stroke="#4d7d6e" stroke-width="1.5" stroke-linecap="round"/><circle cx="36" cy="14" r="6" fill="#f4c95f" opacity="0.25" stroke="#d4a84a" stroke-width="1.5"/><path d="M33.5 14h5M36 11.5v5" stroke="#d4a84a" stroke-width="1.4" stroke-linecap="round"/></svg>',
  ach_adult_10: '<svg viewBox="0 0 48 48" fill="none"><path d="M15 18h16v18c0 2-1.6 3.5-3.5 3.5h-9c-1.9 0-3.5-1.5-3.5-3.5V18z" fill="#e8f0ec" stroke="#4d7d6e" stroke-width="1.75" stroke-linejoin="round"/><path d="M31 21h4a3 3 0 010 6h-4" stroke="#4d7d6e" stroke-width="1.75" stroke-linecap="round"/><path d="M18 14h10" stroke="#4d7d6e" stroke-width="1.75" stroke-linecap="round"/><circle cx="36" cy="14" r="6" fill="#fff8e8" stroke="#f4c95f" stroke-width="1.75"/><path d="M36 11.5c0-1.2.8-2 1.8-2" stroke="#d4a84a" stroke-width="1.3" stroke-linecap="round"/><circle cx="36" cy="15.5" r="0.8" fill="#d4a84a"/></svg>',
  ach_absurd_10: '<svg viewBox="0 0 48 48" fill="none"><ellipse cx="22" cy="30" rx="11" ry="8" fill="#e8f0ec" stroke="#4d7d6e" stroke-width="1.75"/><circle cx="28" cy="20" r="7" fill="#f4c95f" stroke="#d4a84a" stroke-width="1.75"/><circle cx="30" cy="19" r="1.5" fill="#4d7d6e"/><path d="M34 20.5l4 2-4 2v-4z" fill="#d4a84a"/><circle cx="36" cy="12" r="5" fill="#f4c95f" opacity="0.3" stroke="#d4a84a" stroke-width="1.5"/><path d="M34 12h4M36 10v4" stroke="#d4a84a" stroke-width="1.3" stroke-linecap="round"/></svg>',
  ach_contrarian: '<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="14" fill="#e8f0ec" stroke="#4d7d6e" stroke-width="1.75"/><path d="M30 18l-6 6 6 6" stroke="#4d7d6e" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" opacity="0.35"/><path d="M18 30l6-6-6-6" stroke="#f4c95f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18" cy="24" r="2" fill="#d4a84a"/></svg>',
  ach_crowd: '<svg viewBox="0 0 48 48" fill="none"><circle cx="16" cy="20" r="5" fill="#fff8e8" stroke="#4d7d6e" stroke-width="1.75"/><circle cx="32" cy="20" r="5" fill="#fff8e8" stroke="#4d7d6e" stroke-width="1.75"/><circle cx="24" cy="16" r="6" fill="#fff8e8" stroke="#f4c95f" stroke-width="1.75"/><path d="M10 36c0-5 2.5-9 6-9M22 36c0-6 2-10 6-10s6 4 6 10M32 36c0-5 2.5-9 6-9" stroke="#4d7d6e" stroke-width="1.75" stroke-linecap="round"/><path d="M24 10l1 2.5 2.5.5-2 1.8.6 2.5-2.1-1.3-2.1 1.3.6-2.5-2-1.8 2.5-.5L24 10z" fill="#f4c95f" opacity="0.6"/></svg>',
  ach_sharer: '<svg viewBox="0 0 48 48" fill="none"><circle cx="34" cy="14" r="5" fill="#fff8e8" stroke="#f4c95f" stroke-width="1.75"/><circle cx="14" cy="24" r="5" fill="#fff8e8" stroke="#4d7d6e" stroke-width="1.75"/><circle cx="34" cy="34" r="5" fill="#fff8e8" stroke="#4d7d6e" stroke-width="1.75"/><path d="M18.5 22l12-6M18.5 26l12 6" stroke="#4d7d6e" stroke-width="1.75" stroke-linecap="round"/><path d="M30 12l3-2 1 3.5" stroke="#d4a84a" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ach_creator: '<svg viewBox="0 0 48 48" fill="none"><rect x="10" y="14" width="22" height="26" rx="3" fill="#e8f0ec" stroke="#4d7d6e" stroke-width="1.75"/><path d="M15 22h12M15 27h9M15 32h11" stroke="#4d7d6e" stroke-width="1.5" stroke-linecap="round" opacity="0.45"/><path d="M30 10l8 8-14 14-6 2 2-6 14-14z" fill="#fff8e8" stroke="#f4c95f" stroke-width="1.75" stroke-linejoin="round"/><path d="M34 14l4 4" stroke="#d4a84a" stroke-width="1.5" stroke-linecap="round"/></svg>',
  ach_quick_25: '<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="14" fill="#e8f0ec" stroke="#4d7d6e" stroke-width="1.75"/><path d="M26 12L16 26h7l-2 10 12-16h-7l0-8z" fill="#fff8e8" stroke="#f4c95f" stroke-width="1.75" stroke-linejoin="round"/></svg>',
  ach_explorer: '<svg viewBox="0 0 48 48" fill="none"><rect x="10" y="10" width="28" height="28" rx="4" fill="#e8f0ec" stroke="#4d7d6e" stroke-width="1.75"/><rect x="14" y="14" width="8" height="8" rx="2" fill="#fff8e8" stroke="#f4c95f" stroke-width="1.5"/><rect x="26" y="14" width="8" height="8" rx="2" fill="#e8f0ec" stroke="#4d7d6e" stroke-width="1.5"/><rect x="14" y="26" width="8" height="8" rx="2" fill="#e8f0ec" stroke="#4d7d6e" stroke-width="1.5"/><rect x="26" y="26" width="8" height="8" rx="2" fill="#fff8e8" stroke="#f4c95f" stroke-width="1.5"/><path d="M24 8v4M24 36v4M8 24h4M36 24h4" stroke="#d4a84a" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/></svg>',
  ach_total_50: '<svg viewBox="0 0 48 48" fill="none"><path d="M14 14h20v6a8 8 0 01-16 0v-6z" fill="#fff8e8" stroke="#f4c95f" stroke-width="1.75"/><path d="M12 14H10v2a4 4 0 004 4M36 14h2v2a4 4 0 01-4 4" stroke="#4d7d6e" stroke-width="1.75" stroke-linecap="round"/><path d="M24 28v4M18 36h12" stroke="#4d7d6e" stroke-width="1.75" stroke-linecap="round"/><rect x="17" y="32" width="14" height="4" rx="2" fill="#e8f0ec" stroke="#4d7d6e" stroke-width="1.5"/><circle cx="24" cy="10" r="3" fill="#f4c95f" opacity="0.5"/></svg>',
  ach_premium: '<svg viewBox="0 0 48 48" fill="none"><path d="M24 8l3.5 8.5 9 1-6.5 5.5 2 8.5-8-4.5-8 4.5 2-8.5-6.5-5.5 9-1L24 8z" fill="#fff8e8" stroke="#f4c95f" stroke-width="1.75" stroke-linejoin="round"/><circle cx="24" cy="24" r="14" fill="none" stroke="#4d7d6e" stroke-width="1.75" opacity="0.35"/><path d="M24 3v3M24 42v3M3 24h3M42 24h3" stroke="#d4a84a" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/></svg>',
  social_fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.41H7.08v-3.53h3.05V9.43c0-3 1.79-4.66 4.53-4.66 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87v2.25h3.32l-.53 3.53h-2.79V24C19.61 23.1 24 18.1 24 12.07z"/></svg>',
  social_ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
  social_x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-6.8 7.8L23.5 22h-6.7l-5.2-6.8L5.8 22H2.7l7.3-8.4L1 2h6.9l4.7 6.2L18.9 2zm-1.2 18h1.7L7.2 3.9H5.4l12.3 16.1z"/></svg>',
  social_wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.5 2 2 6.06 2 11.25c0 2.73 1.09 5.19 2.84 7.01L3.5 22l3.93-1.28A9.8 9.8 0 0012.04 20.5C17.58 20.5 22 16.44 22 11.25S17.58 2 12.04 2zm0 1.8c4.55 0 8.24 3.56 8.24 7.95 0 4.39-3.69 7.95-8.24 7.95a8.1 8.1 0 01-4.1-1.12l-.29-.17-2.33.76.77-2.27-.19-.3a7.5 7.5 0 01-1.17-4.05c0-4.39 3.69-7.95 8.24-7.95zm-2.9 3.78c-.17 0-.5.06-.76.3-.26.24-1 1-1 2.43 0 1.43 1.03 2.81 1.17 3 .14.2 2 3.2 5 4.36 2.47.97 2.97.78 3.5.73.53-.05 1.72-.7 1.96-1.38.24-.68.24-1.26.17-1.38-.07-.12-.26-.2-.55-.35-.29-.14-1.72-.85-1.99-.95-.26-.1-.46-.15-.65.15-.2.29-.75.95-.92 1.14-.17.2-.34.22-.63.07-.29-.14-1.23-.45-2.34-1.44-.87-.77-1.45-1.72-1.62-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.43-.51.14-.17.19-.29.29-.48.1-.2.05-.37-.02-.51-.07-.14-.65-1.57-.89-2.15z"/></svg>',
  social_li: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 0H3.55A3.55 3.55 0 000 3.55v16.9A3.55 3.55 0 003.55 24h16.9A3.55 3.55 0 0024 20.45V3.55A3.55 3.55 0 0020.45 0zM7.12 20.45H3.56V9h3.56v11.45zM5.34 7.43a2.07 2.07 0 110-4.14 2.07 2.07 0 010 4.14zm15.11 13.02h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.95v5.66H9.44V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28z"/></svg>',
};

const SOCIAL_PLATFORMS = [
  { id: "facebook", label: "Facebook", icon: "social_fb" },
  { id: "whatsapp", label: "WhatsApp", icon: "social_wa" },
  { id: "x", label: "X", icon: "social_x" },
  { id: "linkedin", label: "LinkedIn", icon: "social_li" },
  { id: "instagram", label: "Instagram", icon: "social_ig" },
];

const ACTION_CARDS = [
  { action: "quick-play", icon: "bolt", title: "Quick Play", desc: "Lightning-round dilemmas", badge: true },
  { action: "categories", icon: "grid", title: "Categories", desc: "Family, adult & absurd packs" },
  { action: "history", icon: "scroll", title: "History", desc: "Every brave pick you've made" },
  { action: "stats", icon: "chart", title: "My Stats", desc: "Your debate personality" },
  { action: "achievements", icon: "trophy", title: "Achievements", desc: "Badges for the bold" },
  { action: "create-dilemma", icon: "pencil", title: "Create", desc: "Craft your own impossible choice", locked: true },
];

function brandMarkHtml(cls = "brand-mark") {
  return `<div class="${cls}" aria-hidden="true"><span class="brand-ring"></span><span class="brand-q">?</span><span class="brand-glow"></span></div>`;
}

function revealBoltHtml() {
  return `<div class="reveal-bolt" aria-hidden="true">${icon("bolt", "ico-bolt-reveal")}</div>`;
}

function streakWatermarkHtml() {
  return `<div class="streak-watermark" aria-hidden="true"><span class="streak-q">?</span></div>`;
}

function icon(name, cls = "ico") {
  return `<span class="${cls}" aria-hidden="true">${ICONS[name] || ""}</span>`;
}

function achIconHtml(iconKey, unlocked) {
  const inner = icon(iconKey, "ico-ach");
  if (unlocked) return `<div class="ach-icon-wrap">${inner}</div>`;
  return `<div class="ach-icon-wrap locked">${inner}${icon("lock", "ico-ach-lock")}</div>`;
}

function nextStreakMilestone(streak) {
  return STREAK_MILESTONES.find((m) => m > (streak || 0)) || 100;
}

function streakProgress(streak) {
  const next = nextStreakMilestone(streak);
  const prev = STREAK_MILESTONES.filter((m) => m <= (streak || 0)).pop() || 0;
  const span = next - prev || next;
  return Math.min(100, Math.round(((streak - prev) / span) * 100));
}

/* ── Core logic (preserved) ───────────────────────────────────────── */

function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayIndex(d = new Date(), total) {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d - start;
  const oneDay = 86400000;
  const doy = Math.floor(diff / oneDay);
  return doy % total;
}

function randomIndex(total, avoid = -1) {
  if (total <= 1) return 0;
  if (avoid < 0 || avoid >= total) return Math.floor(Math.random() * total);
  return (avoid + 1 + Math.floor(Math.random() * (total - 1))) % total;
}

function pseudoSplit(dilemmaId, dateStr) {
  let h = 0;
  const s = `${dilemmaId}-${dateStr}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return 38 + (h % 25);
}

function dayGap(fromDate, toDate) {
  const prev = new Date(fromDate + "T12:00:00");
  const cur = new Date(toDate + "T12:00:00");
  return Math.round((cur - prev) / 86400000);
}

function updateStreak(state, today, opts = {}) {
  if (opts.shieldUsed) {
    state.streak = Math.max(state.streak || 1, 1);
    state.lastPlayDate = today;
    return state.streak;
  }
  const last = state.lastPlayDate;
  if (!last) return 1;
  const diff = dayGap(last, today);
  if (diff === 1) return (state.streak || 1) + 1;
  if (diff === 0) return state.streak || 1;
  return 1;
}

function shareText(dilemma, choice, pctA, mode = "daily") {
  const picked = choice === "a" ? dilemma.a : dilemma.b;
  const prefix = mode === "daily" ? "Daily Dilemma" : "Daily Dilemma Quick Play";
  return `${prefix} · I picked: "${picked}" (${pctA}% chose A)`;
}

function normalizeShareSiteUrl(raw) {
  try {
    const url = new URL(raw);
    if (url.pathname === "/play" || url.pathname.startsWith("/play/")) {
      url.pathname = "/";
    }
    url.search = "";
    url.hash = "";
    const href = url.href.replace(/\/$/, "");
    return href || SHARE_SITE_URL;
  } catch {
    return SHARE_SITE_URL;
  }
}

function getShareSiteUrl() {
  if (typeof window !== "undefined" && window.DD_SHARE_URL) {
    return normalizeShareSiteUrl(String(window.DD_SHARE_URL));
  }
  return SHARE_SITE_URL;
}

function buildResultShareUrl() {
  return normalizeShareSiteUrl(getShareSiteUrl());
}

function buildSocialShareUrls(message, url) {
  const payload = `${message}\n\nPlay at: ${url}`;
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(payload)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(payload)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  };
}

/* ── State ───────────────────────────────────────────────────────── */

function defaultState() {
  return {
    version: 2,
    streak: 0,
    longestStreak: 0,
    lastPlayDate: null,
    isPremium: false,
    shields: PREMIUM_SHIELDS,
    onboarded: false,
    shareCount: 0,
    quickPlaysToday: { date: dateKey(), count: 0 },
    daily: {},
    history: [],
    customDilemmas: [],
    achievements: {},
    categoryCompleted: { family: false, adult: false, absurd: false },
    devIdx: null,
  };
}

function migrateState(raw) {
  if (!raw || typeof raw !== "object") return defaultState();
  if (raw.version >= 2) return normalizeState(raw);

  const s = defaultState();
  if (raw.streak) s.streak = raw.streak;
  if (raw.longestStreak) s.longestStreak = raw.longestStreak;
  else s.longestStreak = raw.streak || 0;
  if (raw.lastPlayDate) s.lastPlayDate = raw.lastPlayDate;
  if (raw.isPremium) s.isPremium = raw.isPremium;
  if (raw.devIdx != null) s.devIdx = raw.devIdx;

  for (const [key, val] of Object.entries(raw)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(key) && val?.choice) {
      const pctA = pseudoSplit(val.dilemmaId, key);
      s.daily[key] = { choice: val.choice, dilemmaId: val.dilemmaId, pctA };
      s.history.push({
        id: `${key}-daily-migrated`,
        date: key,
        dilemmaId: val.dilemmaId,
        choice: val.choice,
        pctA,
        mode: "daily",
        category: null,
      });
    }
  }
  if (s.history.length) s.onboarded = true;
  return normalizeState(s);
}

function normalizeState(s) {
  const base = defaultState();
  const merged = { ...base, ...s, version: 2 };
  merged.daily = s.daily || {};
  merged.history = Array.isArray(s.history) ? s.history : [];
  merged.customDilemmas = Array.isArray(s.customDilemmas) ? s.customDilemmas : [];
  merged.achievements = s.achievements || {};
  merged.categoryCompleted = { ...base.categoryCompleted, ...(s.categoryCompleted || {}) };
  merged.quickPlaysToday = s.quickPlaysToday || { date: dateKey(), count: 0 };
  return merged;
}

function loadState() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = localStorage.getItem(STORAGE_KEY_LEGACY);
      if (legacy) {
        const migrated = migrateState(JSON.parse(legacy));
        saveState(migrated);
        return migrated;
      }
    }
    return migrateState(JSON.parse(raw || "{}"));
  } catch {
    return defaultState();
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (state.longestStreak < (state.streak || 0)) state.longestStreak = state.streak;
}

function resetState(scope = "today", today = dateKey(), opts = {}) {
  if (scope === "all") {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_LEGACY);
    return defaultState();
  }
  const state = loadState();
  const prevIdx = state.devIdx;
  delete state.daily[today];
  state.history = state.history.filter((h) => !(h.date === today && h.mode === "daily"));
  if (typeof opts.total === "number" && isDevHost()) {
    state.devIdx = randomIndex(opts.total, opts.avoidIdx ?? prevIdx);
  } else if (isDevHost()) {
    delete state.devIdx;
  }
  saveState(state);
  return state;
}

function isDevHost() {
  if (typeof location === "undefined") return false;
  const host = location.hostname;
  return host === "localhost" || host === "127.0.0.1" ||
    new URLSearchParams(location.search).has("dev");
}

function getQuickPlayRemaining(state, today = dateKey()) {
  if (state.isPremium) return Infinity;
  const q = state.quickPlaysToday || { date: today, count: 0 };
  if (q.date !== today) return QUICK_FREE_LIMIT;
  return Math.max(0, QUICK_FREE_LIMIT - q.count);
}

function bumpQuickPlay(state, today = dateKey()) {
  if (state.isPremium) return;
  if (!state.quickPlaysToday || state.quickPlaysToday.date !== today) {
    state.quickPlaysToday = { date: today, count: 0 };
  }
  state.quickPlaysToday.count += 1;
}

/* ── Stats & personality ───────────────────────────────────────────── */

function computeStats(state, dilemmas) {
  const byCat = { family: 0, adult: 0, absurd: 0 };
  let pickA = 0;
  let pickB = 0;
  let minorityPicks = 0;
  let majorityPicks = 0;
  let quickCount = 0;
  const days = new Set();

  for (const h of state.history) {
    days.add(h.date);
    if (h.choice === "a") pickA++;
    else pickB++;
    if (h.mode === "quick") quickCount++;
    const d = dilemmas.find((x) => x.id === h.dilemmaId) ||
      state.customDilemmas.find((x) => x.id === h.dilemmaId);
    const cat = h.category || d?.category;
    if (cat && byCat[cat] != null) byCat[cat]++;
    const mine = h.choice === "a" ? h.pctA : 100 - h.pctA;
    const maj = h.pctA >= 50 ? "a" : "b";
    if (h.choice === maj) majorityPicks++;
    else minorityPicks++;
  }

  return {
    total: state.history.length,
    pickA,
    pickB,
    byCat,
    daysPlayed: days.size,
    minorityPicks,
    majorityPicks,
    quickCount,
    streak: state.streak || 0,
    longestStreak: state.longestStreak || state.streak || 0,
  };
}

function computePersonality(stats) {
  const total = stats.total || 1;
  const absurdPct = (stats.byCat.absurd || 0) / total;
  const familyPct = (stats.byCat.family || 0) / total;
  const adultPct = (stats.byCat.adult || 0) / total;
  const aPct = stats.pickA / total;
  const minorityPct = stats.minorityPicks / total;

  let title = "Balanced Debater";
  let desc = "You spread your picks evenly across categories and choices. The room stays guessing when you walk in.";

  if (absurdPct >= 0.45) {
    title = "Chaos Coordinator";
    desc = "You gravitate toward the weird option like it's a calling. Normal dilemmas bore you; absurd ones get your best thinking.";
  } else if (familyPct >= 0.45) {
    title = "Household Diplomat";
    desc = "You think in dinner-table terms — fairness, fun, and who picks the movie. Your picks sound like someone who hosts game night.";
  } else if (adultPct >= 0.45) {
    title = "Practical Visionary";
    desc = "Work, life, and trade-offs are your playground. You pick like someone who reads the fine print then chooses the bold option anyway.";
  } else if (minorityPct >= 0.55) {
    title = "Lone Wolf";
    desc = "You love the road less traveled — or at least the button fewer people press. Crowd consensus is suspicious to you.";
  } else if (aPct >= 0.65) {
    title = "Option A Loyalist";
    desc = "First button energy. You trust the top choice more than the universe probably intended.";
  } else if (aPct <= 0.35) {
    title = "Team B Believer";
    desc = "Second options feel right to you. While others rush to A, you're already building a case for B.";
  }

  return { title, desc };
}

/* ── Achievements ──────────────────────────────────────────────────── */

function checkAchievements(state, dilemmas, newlyUnlocked = []) {
  const stats = computeStats(state, dilemmas);
  const unlock = (id) => {
    if (!state.achievements[id]) {
      state.achievements[id] = dateKey();
      newlyUnlocked.push(ACHIEVEMENTS.find((a) => a.id === id));
    }
  };

  if (stats.total >= 1) unlock("first_play");
  if (stats.total >= 50) unlock("total_50");
  if ((state.streak || 0) >= 3) unlock("streak_3");
  if ((state.streak || 0) >= 7) unlock("streak_7");
  if ((state.streak || 0) >= 30) unlock("streak_30");
  if (stats.byCat.family >= 10) unlock("family_10");
  if (stats.byCat.adult >= 10) unlock("adult_10");
  if (stats.byCat.absurd >= 10) unlock("absurd_10");
  if (stats.minorityPicks >= 10) unlock("contrarian");
  if (stats.majorityPicks >= 20) unlock("crowd");
  if ((state.shareCount || 0) >= 3) unlock("sharer");
  if (stats.quickCount >= 25) unlock("quick_25");
  if (state.categoryCompleted?.family && state.categoryCompleted?.adult && state.categoryCompleted?.absurd) {
    unlock("explorer");
  }
  if (state.isPremium && state.customDilemmas.some((c) => !c.locked)) unlock("creator");
  if (state.isPremium) unlock("premium");

  return newlyUnlocked.filter(Boolean);
}

/* ── Dilemma helpers ───────────────────────────────────────────────── */

function allOfficial(dilemmas) {
  return dilemmas;
}

function playablePool(dilemmas, state) {
  const customs = state.isPremium
    ? state.customDilemmas.filter((c) => !c.locked)
    : [];
  return [...dilemmas, ...customs];
}

function resolveDailyDilemma(dilemmas, state, today) {
  const played = state.daily[today];
  if (played?.dilemmaId != null) {
    const saved = dilemmas.find((d) => d.id === played.dilemmaId);
    if (saved) return saved;
  }
  if (isDevHost()) {
    if (state.devIdx == null || state.devIdx >= dilemmas.length) {
      state.devIdx = randomIndex(dilemmas.length);
      saveState(state);
    }
    return dilemmas[state.devIdx];
  }
  return dilemmas[dayIndex(new Date(), dilemmas.length)];
}

function pickRandomDilemma(pool, avoidId = null) {
  if (!pool.length) return null;
  if (pool.length === 1) return pool[0];
  let tries = 0;
  let pick;
  do {
    pick = pool[randomIndex(pool.length)];
    tries++;
  } while (pick.id === avoidId && tries < 12);
  return pick;
}

function pickCategoryQueue(dilemmas, category, size = CATEGORY_SESSION_SIZE) {
  const pool = dilemmas.filter((d) => d.category === category);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(size, shuffled.length));
}

function dilemmaById(dilemmas, state, id) {
  return dilemmas.find((d) => d.id === id) ||
    state.customDilemmas.find((d) => d.id === id) || null;
}

const SHARE_CATEGORIES = new Set(CATEGORIES.map((c) => c.id));

function encodeSharePayload(dilemma) {
  const payload = { c: dilemma.category, a: dilemma.a, b: dilemma.b };
  const json = JSON.stringify(payload);
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeSharePayload(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
    const json = decodeURIComponent(escape(atob(b64 + pad)));
    const data = JSON.parse(json);
    if (!SHARE_CATEGORIES.has(data.c)) return null;
    const a = String(data.a || "").trim();
    const b = String(data.b || "").trim();
    if (!a || !b || a.length > 120 || b.length > 120) return null;
    return { category: data.c, a, b };
  } catch {
    return null;
  }
}

function buildCustomShareUrl(dilemma) {
  const url = new URL(getShareSiteUrl());
  url.searchParams.delete("share");
  url.searchParams.delete("reset");
  url.searchParams.set("share", encodeSharePayload(dilemma));
  return url.href;
}

function customShareMessage(dilemma) {
  return `Someone sent you a Daily Dilemma: "${dilemma.a}" or "${dilemma.b}" — which would you pick?`;
}

function ephemeralSharedDilemma(imported) {
  return {
    id: `shared-${Date.now()}`,
    category: imported.category,
    a: imported.a,
    b: imported.b,
  };
}

function saveImportedDilemma(imported) {
  const { state } = app;
  if (!state.isPremium && state.customDilemmas.length >= FREE_CUSTOM_LIMIT) {
    showUpsellModal(() => {
      if (app.state.isPremium || app.state.customDilemmas.length < FREE_CUSTOM_LIMIT) {
        saveImportedDilemma(imported);
      }
    });
    return null;
  }
  const id = `c${Date.now()}`;
  state.customDilemmas.unshift({
    id,
    category: imported.category,
    a: imported.a,
    b: imported.b,
    locked: !state.isPremium,
    createdAt: dateKey(),
  });
  const unlocked = [];
  if (state.isPremium) checkAchievements(state, app.dilemmas, unlocked);
  saveState(state);
  if (unlocked.length) launchConfetti();
  return id;
}

function playCustomDilemma(dilemma) {
  app.session = { mode: "quick", dilemma };
  renderVoteScreen(dilemma, `Your dilemma · <span class="tag">${dilemma.category}</span>`, (choice) => {
    const { pctA } = recordPlay(app.state, dilemma, choice, "quick", app.today);
    saveState(app.state);
    renderResultsScreen(dilemma, choice, pctA, { meta: "Your creation", mode: "quick" });
  });
}

function playImportedOnce(imported) {
  const dilemma = ephemeralSharedDilemma(imported);
  app.session = { mode: "quick", dilemma, ephemeral: true };
  renderVoteScreen(
    dilemma,
    `Shared dilemma · <span class="tag">${dilemma.category}</span>`,
    (choice) => {
      const { pctA } = recordPlay(app.state, dilemma, choice, "quick", app.today);
      saveState(app.state);
      renderResultsScreen(dilemma, choice, pctA, { meta: "Shared with you", mode: "quick" });
    },
  );
}

function finishCustomShare(btn) {
  app.state.shareCount = (app.state.shareCount || 0) + 1;
  const unlocked = [];
  checkAchievements(app.state, app.dilemmas, unlocked);
  saveState(app.state);
  if (unlocked.length) launchConfetti();
  if (btn) markCopyButtonCopied(btn);
}

function markCopyButtonCopied(btn, doneLabel = "Copied!") {
  if (!btn || btn.dataset.copying === "1") return;
  const original = btn.innerHTML;
  btn.dataset.copying = "1";
  btn.classList.add("copied");
  btn.innerHTML = `${icon("check", "ico-btn")} ${doneLabel}`;
  setTimeout(() => {
    btn.classList.remove("copied");
    btn.innerHTML = original;
    delete btn.dataset.copying;
  }, 2200);
}

function isEmbedded() {
  return typeof window !== "undefined" && window.self !== window.top;
}

function copyViaExecCommand(text, onSuccess, onFail) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  Object.assign(ta.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "1px",
    height: "1px",
    opacity: "0",
    padding: "0",
    border: "none",
    outline: "none",
  });
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  if (ok) onSuccess?.();
  else onFail?.();
}

function copyText(text, btn, onDone, opts = {}) {
  const done = () => { onDone?.(btn); };
  const fail = () => {
    if (opts.silentFail) showToast("Select the text above, then copy manually");
    else showShareFallbackModal(text);
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text)
      .then(done)
      .catch(() => copyViaExecCommand(text, done, fail));
    return;
  }
  copyViaExecCommand(text, done, fail);
}

function finishResultShare(btn, label = "Copied!") {
  app.state.shareCount = (app.state.shareCount || 0) + 1;
  const unlocked = [];
  checkAchievements(app.state, app.dilemmas, unlocked);
  saveState(app.state);
  if (btn) markCopyButtonCopied(btn, label);
  showToast(label === "Shared!" ? "Shared!" : "Copied — spread the debate!");
  if (unlocked.length) launchConfetti();
}

function buildResultSharePayload(dilemma, choice, pctA, mode) {
  const text = shareText(dilemma, choice, pctA, mode);
  const url = buildResultShareUrl();
  return `${text}\n\nPlay at: ${url}`;
}

function recordShareAction(label) {
  app.state.shareCount = (app.state.shareCount || 0) + 1;
  const unlocked = [];
  checkAchievements(app.state, app.dilemmas, unlocked);
  saveState(app.state);
  if (unlocked.length) launchConfetti();
  showToast(label);
}

function openExternalShare(url, platform) {
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    showToast(`Allow popups to share on ${platform}, or use Copy`);
    return false;
  }
  return true;
}

function socialShareButtonsHtml() {
  return `<div class="social-share-section">
    <span class="field-label">Share on social</span>
    <div class="social-share-grid">
      ${SOCIAL_PLATFORMS.map((p) => `
        <button type="button" class="social-share-btn social-${p.id}" data-social="${p.id}" aria-label="Share on ${p.label}">
          <span class="social-share-ico">${icon(p.icon, "ico-social")}</span>
          <span class="social-share-label">${p.label}</span>
        </button>`).join("")}
    </div>
    <p class="social-share-hint soft">Instagram has no web share — tap it to copy your caption, then paste in Stories or a DM.</p>
  </div>`;
}

function bindSocialShareButtons(backdrop, getPayload, getShareParts) {
  backdrop.querySelectorAll("[data-social]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const platform = btn.dataset.social;
      const { message, url } = getShareParts();
      const payload = getPayload();
      const links = buildSocialShareUrls(message, url);

      if (platform === "instagram") {
        copyText(payload, btn, () => {
          recordShareAction("Caption copied — paste in Instagram");
        }, { silentFail: true });
        return;
      }

      const link = links[platform];
      if (!link) return;
      const label = SOCIAL_PLATFORMS.find((p) => p.id === platform)?.label || platform;
      if (openExternalShare(link, label)) {
        recordShareAction(`Opening ${label}…`);
      }
    });
  });
}

function showResultShareModal(dilemma, choice, pctA, mode) {
  const message = shareText(dilemma, choice, pctA, mode);
  const url = buildResultShareUrl();
  const payload = buildResultSharePayload(dilemma, choice, pctA, mode);
  const backdrop = openModal("Share your pick", `
    <p class="modal-lead">Send your result to friends — they'll land on <strong>the-daily-dilemma.com</strong>.</p>
    ${socialShareButtonsHtml()}
    <label class="field share-message-field">
      <span class="field-label">Your share message</span>
      <textarea class="input share-message-input share-message-editable" id="resultShareText" rows="5">${escapeHtml(payload)}</textarea>
    </label>
    <button type="button" class="btn primary glow copy-link-btn full" id="resultShareCopy">${icon("share", "ico-btn")} Copy to clipboard</button>
    <p class="share-trust-note soft">${icon("share", "ico-chip")} Or paste anywhere — text, DM, or group chat.</p>`,
  `<button class="btn ghost" data-close>Done</button>`,
  { premium: true });
  backdrop.querySelector("[data-close]")?.addEventListener("click", () => backdrop.remove());
  const ta = backdrop.querySelector("#resultShareText");
  const copyBtn = backdrop.querySelector("#resultShareCopy");
  const readPayload = () => ta?.value || payload;
  const getShareParts = () => {
    const full = readPayload();
    const marker = "\n\nPlay at: ";
    const idx = full.lastIndexOf(marker);
    if (idx >= 0) {
      return { message: full.slice(0, idx), url: full.slice(idx + marker.length) || url };
    }
    return { message: shareText(dilemma, choice, pctA, mode), url };
  };
  const selectAll = () => {
    ta?.focus();
    ta?.select();
  };
  ta?.addEventListener("click", selectAll);
  ta?.addEventListener("focus", selectAll);
  copyBtn?.addEventListener("click", () => {
    copyText(readPayload(), copyBtn, () => finishResultShare(copyBtn), { silentFail: true });
  });
  bindSocialShareButtons(backdrop, readPayload, getShareParts);
  requestAnimationFrame(selectAll);
}

function showShareFallbackModal(text) {
  const backdrop = openModal("Copy your pick", `
    <p class="modal-lead">Your browser blocked automatic copy. Select the text below and copy it manually.</p>
    <textarea class="input share-message-input share-message-editable" id="shareFallbackText" rows="4">${escapeHtml(text)}</textarea>
    <p class="soft">Paste it in a message, post, or group chat to invite friends.</p>`,
  `<button class="btn ghost" data-close>Close</button>
   <button class="btn primary glow" id="shareFallbackRetry">Try copy again</button>`);
  backdrop.querySelector("[data-close]")?.addEventListener("click", () => backdrop.remove());
  const ta = backdrop.querySelector("#shareFallbackText");
  ta?.addEventListener("focus", () => ta.select());
  backdrop.querySelector("#shareFallbackRetry")?.addEventListener("click", () => {
    copyText(ta?.value || text, backdrop.querySelector("#shareFallbackRetry"), () => {
      backdrop.remove();
      finishResultShare(null);
    }, { silentFail: true });
  });
  requestAnimationFrame(() => ta?.select());
}

function recordPlay(state, dilemma, choice, mode, today = dateKey()) {
  const salt = mode === "daily" ? today : `${today}-${mode}-${Date.now()}`;
  const pctA = pseudoSplit(dilemma.id, salt);
  const entry = {
    id: `${Date.now()}-${dilemma.id}`,
    date: today,
    dilemmaId: dilemma.id,
    choice,
    pctA,
    mode,
    category: dilemma.category,
  };
  state.history.unshift(entry);
  if (state.history.length > 400) state.history.length = 400;
  return { pctA, pctB: 100 - pctA, entry };
}

function resultHeadline(choice, pctA) {
  const mine = choice === "a" ? pctA : 100 - pctA;
  const maj = pctA >= 50 ? "a" : "b";
  if (mine >= 65) return "The crowd stands with you!";
  if (choice !== maj && mine <= 35) return "A lone lightning bolt — magnificent.";
  if (choice !== maj) return "You picked the road less traveled.";
  if (Math.abs(pctA - 50) <= 5) return "Perfectly, beautifully divided.";
  return "A fine pick — the room approves.";
}

function resultMessage(choice, pctA) {
  const mine = choice === "a" ? pctA : 100 - pctA;
  const maj = pctA >= 50 ? "a" : "b";
  if (choice === maj && mine >= 60) return `${mine}% chose the same side. You found your people.`;
  if (choice !== maj) return `Only ${mine}% dared agree. Tell them why they're wrong.`;
  if (Math.abs(pctA - 50) <= 5) return "Fifty-fifty. The table will never agree. Perfect.";
  return `${mine}% saw it your way — worth a friendly argument.`;
}

/* ── UI helpers ────────────────────────────────────────────────────── */

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

let toastTimer;
function showToast(msg) {
  let node = document.getElementById("toast");
  if (!node) {
    node = document.createElement("div");
    node.id = "toast";
    node.className = "toast";
    node.setAttribute("role", "status");
    document.body.appendChild(node);
  }
  node.textContent = msg;
  node.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("show"), 2400);
}

function launchConfetti() {
  const wrap = document.createElement("div");
  wrap.className = "confetti-wrap";
  const colors = ["#f4c95f", "#4d7d6e", "#c45c7a", "#6b5b7a", "#fffaf5", "#d4a84a"];
  for (let i = 0; i < 36; i++) {
    const p = document.createElement("span");
    p.className = "confetti" + (i % 3 === 0 ? " round" : "");
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 0.5}s`;
    p.style.animationDuration = `${1.4 + Math.random() * 0.8}s`;
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 2600);
}

function openModal(title, bodyHtml, actionsHtml = "", opts = {}) {
  const backdrop = el(`
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal card-panel ${opts.premium ? "modal-premium" : ""}">
        ${opts.premium ? `<div class="modal-spark">${icon("spark", "ico-lg")}</div>` : ""}
        <h2 class="modal-title">${title}</h2>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-actions">${actionsHtml}</div>
      </div>
    </div>`);
  document.body.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add("open"));
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) backdrop.remove();
  });
  return backdrop;
}

function premiumBenefitsHtml() {
  const items = [
    "Unlimited Quick Play",
    "Custom dilemmas in random pool",
    `${PREMIUM_SHIELDS} streak shields`,
    "Support new packs & features",
  ];
  return `<ul class="benefits">
    ${items.map((t) => `<li>${icon("check", "ico-check")}<span>${t}</span></li>`).join("")}
  </ul>
  <p class="price-hint"><strong>$2.99/mo</strong> · $19.99/yr · $39.99 lifetime</p>`;
}

function bindChoicePress(root) {
  root.querySelectorAll(".choice").forEach((btn) => {
    btn.addEventListener("pointerdown", () => btn.classList.add("pressed"));
    const up = () => btn.classList.remove("pressed");
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointerleave", up);
  });
}

function unlockPremiumDemo(state, onDone) {
  state.isPremium = true;
  state.shields = PREMIUM_SHIELDS;
  saveState(state);
  checkAchievements(state, app.dilemmas, []);
  openModal("You're Premium! 🎉", `<p class="modal-lead">Demo unlock active. Enjoy unlimited Quick Play, custom dilemmas in the pool, and streak shields.</p>`, `
    <button class="btn premium-cta full" data-close>${icon("spark", "ico-btn")} Let's go</button>`, { premium: true });
  launchConfetti();
  document.querySelector("[data-close]")?.addEventListener("click", () => {
    document.querySelector(".modal-backdrop")?.remove();
    onDone?.();
  });
}

function showUpsellModal(onUnlock) {
  const backdrop = openModal("Unlock the full experience", `
    <p class="modal-lead">Play without limits. Create dilemmas. Protect your streak.</p>
    ${premiumBenefitsHtml()}`, `
    <button class="btn ghost" data-close>Maybe later</button>
    <button class="btn premium-cta" data-unlock>${icon("spark", "ico-btn")} Unlock Premium (Demo)</button>`, { premium: true });
  backdrop.querySelector("[data-close]")?.addEventListener("click", () => backdrop.remove());
  backdrop.querySelector("[data-unlock]")?.addEventListener("click", () => {
    backdrop.remove();
    unlockPremiumDemo(app.state, onUnlock);
  });
}

/* ── App shell ─────────────────────────────────────────────────────── */

const app = {
  dilemmas: [],
  state: defaultState(),
  view: { name: "home", params: {} },
  session: null,
  today: dateKey(),
  root: null,
};

function navigate(name, params = {}) {
  app.view = { name, params };
  render();
  app.root?.scrollIntoView?.({ behavior: "smooth", block: "start" });
}

function headerHtml(sub = "") {
  const prem = app.state.isPremium
    ? `<span class="pill premium-pill">${icon("star", "ico-star")} Premium</span>`
    : `<button type="button" class="premium-btn" data-nav="upsell">${icon("spark", "ico-btn")} Go Premium</button>`;
  return `
    <header class="top app-header">
      <div class="header-row">
        <button type="button" class="logo-btn" data-nav="home" aria-label="Home">Daily Dilemma</button>
        ${prem}
      </div>
      <p class="tagline">${TAGLINE}</p>
      <p class="tagline-sub">${TAGLINE_SUB}</p>
      ${sub ? `<div class="meta">${sub}</div>` : ""}
    </header>`;
}

function backRow(label = "Home") {
  return `<button type="button" class="back-btn" data-nav="home">${icon("chev", "ico-chev")}<span>${escapeHtml(label)}</span></button>`;
}

function parseMetaHtml(meta) {
  return meta || "";
}

function bindCommon() {
  app.root.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dest = btn.dataset.nav;
      if (dest === "upsell") showUpsellModal(() => render());
      else navigate(dest);
    });
  });
  app.root.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => handleAction(btn.dataset.action, btn));
  });
}

function devBarHtml() {
  if (!isDevHost()) return "";
  return `
    <div class="dev-bar">
      <span>Test mode · random daily reset</span>
      <button type="button" class="dev-btn" data-dev="today">New daily</button>
      <button type="button" class="dev-btn" data-dev="all">Reset all</button>
      <button type="button" class="dev-btn" data-dev="premium">Toggle premium</button>
    </div>`;
}

function bindDevBar() {
  if (!isDevHost()) return;
  app.root.querySelectorAll("[data-dev]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.dev === "premium") {
        app.state.isPremium = !app.state.isPremium;
        if (app.state.isPremium) app.state.shields = PREMIUM_SHIELDS;
        saveState(app.state);
        render();
        return;
      }
      resetState(btn.dataset.dev, app.today, { total: app.dilemmas.length, avoidIdx: app.state.devIdx });
      location.reload();
    });
  });
}

function handleAction(action, btn) {
  const map = {
    "daily-play": () => startDaily(),
    "quick-play": () => startQuick(),
    "categories": () => navigate("categories"),
    "stats": () => navigate("stats"),
    "achievements": () => navigate("achievements"),
    "history": () => navigate("history"),
    "settings": () => navigate("settings"),
    "create-dilemma": () => showCreateModal(),
    "onboard": () => { app.state.onboarded = true; saveState(app.state); render(); },
    "share": () => doShare(btn),
    "play-another": () => startQuick(true),
    "use-shield": () => useStreakShield(),
    "skip-shield": () => { app.session = { skippedShield: true }; render(); },
  };
  map[action]?.();
}

function useStreakShield() {
  if (!app.state.isPremium || app.state.shields <= 0) return;
  app.state.shields -= 1;
  app.state.lastPlayDate = app.today;
  saveState(app.state);
  showToast("Streak shield used — you're still on track!");
  app.session = { skippedShield: true };
  render();
}

/* ── Views ─────────────────────────────────────────────────────────── */

function renderHome() {
  const { state, dilemmas, today } = app;
  const daily = state.daily[today];
  const dilemma = resolveDailyDilemma(dilemmas, state, today);
  const remaining = getQuickPlayRemaining(state, today);
  const quickBadge = state.isPremium ? "∞" : `${remaining}/${QUICK_FREE_LIMIT}`;
  const stats = computeStats(state, dilemmas);
  const gap = state.lastPlayDate ? dayGap(state.lastPlayDate, today) : 0;
  const showShield = !daily && gap > 1 && (state.streak || 0) > 0 && !app.session?.skippedShield;

  const streak = state.streak || 0;
  const nextMilestone = nextStreakMilestone(streak);
  const progress = streakProgress(streak);

  let dailyTeaser = "";
  if (daily) {
    const d = dilemmaById(dilemmas, state, daily.dilemmaId) || dilemma;
    const picked = daily.choice === "a" ? d?.a : d?.b;
    dailyTeaser = `
      <div class="teaser card-panel done">
        <div class="teaser-head">
          <span class="status-chip done-chip">${icon("check", "ico-chip")} Today complete</span>
        </div>
        <p class="teaser-text">You chose <strong>${escapeHtml(picked || "?")}</strong> — the debate continues tomorrow.</p>
        <button type="button" class="btn sage-ghost sm" data-action="daily-play">See the split</button>
      </div>`;
  } else {
    dailyTeaser = `
      <div class="teaser card-panel fresh">
        <div class="teaser-head">
          <span class="status-chip fresh-chip">${icon("quest", "ico-chip")} Today's impossible choice</span>
          <span class="tag tag-sage">${dilemma.category}</span>
        </div>
        <div class="dilemma-stack">
          <p class="teaser-opt">${escapeHtml(dilemma.a)}</p>
          <p class="teaser-or" aria-hidden="true">or</p>
          <p class="teaser-opt">${escapeHtml(dilemma.b)}</p>
        </div>
        <button type="button" class="btn sage glow" data-action="daily-play">${icon("bolt", "ico-btn")} Play Daily</button>
      </div>`;
  }

  const onboard = !state.onboarded ? `
    <div class="onboard card-panel">
      ${brandMarkHtml("brand-mark sm")}
      <h2>Welcome, decision-maker</h2>
      <p>One impossible choice lands every day. Pick a side, see how the world voted, and argue about it later.</p>
      <button type="button" class="btn ready-cta sm" data-action="onboard">I'm ready</button>
    </div>` : "";

  const shieldBanner = showShield ? `
    <div class="shield-banner card-panel">
      <p>Your <strong>${streak}-day streak</strong> needs a shield!</p>
      ${state.isPremium && state.shields > 0
    ? `<div class="shield-actions">
           <button type="button" class="btn primary sm" data-action="use-shield">Use shield (${state.shields} left)</button>
           <button type="button" class="btn ghost sm" data-action="skip-shield">Let it reset</button>
         </div>`
    : `<p class="soft">Premium streak shields can save it.</p>
           <button type="button" class="premium-btn sm" data-nav="upsell">${icon("spark", "ico-btn")} Go Premium</button>`}
    </div>` : "";

  const actionCards = ACTION_CARDS.map((c) => {
    const isLocked = c.locked && !state.isPremium;
    const badge = c.badge ? `<span class="badge">${quickBadge} free today</span>` : "";
    const lock = isLocked ? `<span class="lock-tag">${icon("lock", "ico-lock")} Premium</span>` : "";
    return `
      <button type="button" class="action-card accent-${c.icon} ${isLocked ? "locked-card" : ""}" data-action="${c.action}">
        <span class="action-icon-wrap">${icon(c.icon, "ico-action")}${isLocked ? icon("lock", "ico-lock-overlay") : ""}</span>
        <span class="action-title">${c.title}</span>
        <span class="action-desc">${c.desc}</span>
        ${badge}${lock}
      </button>`;
  }).join("");

  app.root.innerHTML = `
    <div class="view view-enter">
      ${headerHtml(`${today} · ${stats.total} played`)}
      ${onboard}
      <div class="streak-hero card-panel ${streak >= 7 ? "streak-glow" : ""}">
        ${streakWatermarkHtml()}
        <div class="streak-center">
          <div class="streak-num-wrap">
            <div class="streak-num" data-streak="${streak}">${streak}</div>
            <div class="streak-num-glow" aria-hidden="true"></div>
          </div>
          <div class="streak-label">day streak</div>
        </div>
        <div class="streak-meta">
          <span class="best-badge">${icon("star", "ico-star")} Best ${state.longestStreak || 0}</span>
          <span class="milestone-hint">Next spark at ${nextMilestone} days</span>
        </div>
        <div class="streak-progress" aria-hidden="true"><div class="streak-progress-fill" style="width:${progress}%"></div></div>
      </div>
      ${shieldBanner}
      ${dailyTeaser}
      <p class="section-label">Play more</p>
      <div class="action-grid">${actionCards}</div>
      <button type="button" class="btn ghost full settings-btn" data-action="settings">${icon("settings", "ico-btn")} Settings</button>
      ${devBarHtml()}
    </div>`;
  bindCommon();
  bindDevBar();
}

function renderVoteScreen(dilemma, meta, onVote) {
  app.root.innerHTML = `
    <div class="view view-enter vote-view">
      ${headerHtml(parseMetaHtml(meta))}
      <div class="vote-zone card-panel">
        ${brandMarkHtml("brand-mark vote")}
        <p class="prompt-lg">Would you rather…</p>
        <p class="prompt-sub">Trust your gut — the split reveals all</p>
        <div class="choices">
          <button class="choice a" data-choice="a">
            <span class="choice-letter">A</span>
            <span class="choice-text">${escapeHtml(dilemma.a)}</span>
          </button>
          <div class="choice-divider"><span>or</span></div>
          <button class="choice b" data-choice="b">
            <span class="choice-letter">B</span>
            <span class="choice-text">${escapeHtml(dilemma.b)}</span>
          </button>
        </div>
      </div>
      ${devBarHtml()}
    </div>`;
  bindChoicePress(app.root);
  app.root.querySelectorAll("[data-choice]").forEach((btn) => {
    btn.addEventListener("click", () => onVote(btn.dataset.choice));
  });
  bindDevBar();
}

function renderResultsScreen(dilemma, choice, pctA, opts = {}) {
  const pctB = 100 - pctA;
  const mine = choice === "a" ? pctA : pctB;
  const headline = resultHeadline(choice, pctA);
  const msg = resultMessage(choice, pctA);
  const actions = opts.actionsHtml || `
    <button type="button" class="btn share glow" data-share>${icon("share", "ico-btn")} Share your pick</button>
    <button type="button" class="btn ghost full" data-nav="home">Back home</button>`;

  app.root.innerHTML = `
    <div class="view view-enter results-view">
      ${headerHtml(parseMetaHtml(opts.meta || ""))}
      <div class="results-hero card-panel reveal-card">
        ${revealBoltHtml()}
        <p class="results-kicker">${opts.title || "The split"}</p>
        <h2 class="results-headline">${headline}</h2>
        <p class="results-sub">${msg}</p>
        <div class="your-pick">
          <span class="pick-badge choice-${choice}">Your pick: ${choice.toUpperCase()}</span>
          <span class="pick-pct">${mine}% agreement</span>
        </div>
      </div>
      <div class="split-card card-panel">
        <div class="bar animate">
          <div class="fill a" style="width:0%" data-w="${pctA}%"></div>
          <div class="fill b" style="width:0%" data-w="${pctB}%"></div>
        </div>
        <div class="split-labels">
          <div class="split-row ${choice === "a" ? "picked-row" : ""}">
            <span class="split-pct">${pctA}%</span>
            <span class="split-text">${escapeHtml(dilemma.a)}</span>
          </div>
          <div class="split-row ${choice === "b" ? "picked-row" : ""}">
            <span class="split-pct">${pctB}%</span>
            <span class="split-text">${escapeHtml(dilemma.b)}</span>
          </div>
        </div>
      </div>
      <div class="results-actions">${actions}</div>
      ${devBarHtml()}
    </div>`;
  setTimeout(() => {
    app.root.querySelectorAll(".fill[data-w]").forEach((f) => {
      f.style.width = f.dataset.w;
    });
  }, 80);
  bindCommon();
  bindDevBar();
  const shareBtn = app.root.querySelector("[data-share]");
  if (shareBtn) {
    shareBtn.addEventListener("click", () => doShare(shareBtn, dilemma, choice, pctA, opts.mode || "daily"));
  }
}

function startDaily() {
  const { state, dilemmas, today } = app;
  const daily = state.daily[today];
  const dilemma = resolveDailyDilemma(dilemmas, state, today);
  if (daily) {
    const d = dilemmaById(dilemmas, state, daily.dilemmaId) || dilemma;
    renderResultsScreen(d, daily.choice, daily.pctA, {
      meta: `${today} · daily`,
      title: "Today's split",
      mode: "daily",
    });
    return;
  }
  renderVoteScreen(dilemma, `${today} · <span class="tag">daily</span> · <span class="tag">${dilemma.category}</span>`, (choice) => {
    const streak = updateStreak(state, today);
    const { pctA } = recordPlay(state, dilemma, choice, "daily", today);
    state.daily[today] = { choice, dilemmaId: dilemma.id, pctA };
    state.streak = streak;
    state.longestStreak = Math.max(state.longestStreak || 0, streak);
    state.lastPlayDate = today;
    const unlocked = [];
    checkAchievements(state, dilemmas, unlocked);
    saveState(state);
    if (unlocked.length) {
      launchConfetti();
      showToast(`Unlocked: ${unlocked[0].title}`);
    }
    renderResultsScreen(dilemma, choice, pctA, {
      meta: `${today} · streak ${streak}`,
      title: "Today's split",
      mode: "daily",
    });
  });
}

function startQuick(fromResults = false) {
  const remaining = getQuickPlayRemaining(app.state, app.today);
  if (!app.state.isPremium && remaining <= 0) {
    showUpsellModal(() => startQuick(fromResults));
    return;
  }
  const pool = playablePool(app.dilemmas, app.state);
  const avoid = fromResults && app.session?.lastId ? app.session.lastId : null;
  const dilemma = pickRandomDilemma(pool, avoid);
  app.session = { mode: "quick", dilemma, lastId: dilemma.id };
  renderVoteScreen(dilemma, `<span class="tag">quick play</span> · <span class="tag">${dilemma.category}</span>`, (choice) => {
    bumpQuickPlay(app.state, app.today);
    const { pctA } = recordPlay(app.state, dilemma, choice, "quick", app.today);
    const unlocked = [];
    checkAchievements(app.state, app.dilemmas, unlocked);
    saveState(app.state);
    if (unlocked.length) { launchConfetti(); showToast(`Unlocked: ${unlocked[0].title}`); }
    const rem = getQuickPlayRemaining(app.state, app.today);
    const remLabel = app.state.isPremium ? "∞" : `${rem} left today`;
    renderResultsScreen(dilemma, choice, pctA, {
      meta: `Quick Play · ${remLabel}`,
      title: "Quick split",
      mode: "quick",
      actionsHtml: `
        <button type="button" class="btn share glow" data-share>${icon("share", "ico-btn")} Share</button>
        <button type="button" class="btn primary glow" data-action="play-another">${icon("bolt", "ico-btn")} Play Another</button>
        <button type="button" class="btn ghost full" data-nav="home">Home</button>`,
    });
    app.session.lastId = dilemma.id;
    bindCommon();
    app.root.querySelector("[data-action='play-another']")?.addEventListener("click", () => startQuick(true));
  });
}

function renderCategories() {
  app.root.innerHTML = `
    <div class="view view-enter">
      ${headerHtml("Pick a vibe")}
      ${backRow("Home")}
      <div class="cat-grid">
        ${CATEGORIES.map((c) => `
          <button type="button" class="cat-card cat-${c.id}" data-cat="${c.id}">
            <span class="cat-icon">${icon(c.icon, "ico-cat")}</span>
            <div class="cat-body">
              <span class="cat-title">${c.label}</span>
              <span class="cat-blurb">${c.blurb}</span>
              ${app.state.categoryCompleted[c.id]
    ? '<span class="cat-done">Complete ✓</span>'
    : `<span class="cat-meta">${CATEGORY_SESSION_SIZE} dilemmas · ~3 min</span>`}
            </div>
          </button>`).join("")}
      </div>
      ${devBarHtml()}
    </div>`;
  bindCommon();
  bindDevBar();
  app.root.querySelectorAll("[data-cat]").forEach((btn) => {
    btn.addEventListener("click", () => startCategory(btn.dataset.cat));
  });
}

function startCategory(category) {
  const queue = pickCategoryQueue(app.dilemmas, category);
  app.session = { mode: "category", category, queue, index: 0 };
  renderCategoryStep();
}

function renderCategoryStep() {
  const { session, dilemmas, state, today } = app;
  const dilemma = session.queue[session.index];
  const step = session.index + 1;
  const total = session.queue.length;
  renderVoteScreen(
    dilemma,
    `<span class="tag">${session.category}</span> · <span class="session-badge">${step}/${total} session</span>`,
    (choice) => {
      const { pctA } = recordPlay(state, dilemma, choice, "category", today);
      session.results = session.results || [];
      session.results.push({ dilemma, choice, pctA });
      session.index += 1;
      const unlocked = [];
      checkAchievements(state, dilemmas, unlocked);
      if (session.index >= session.queue.length) {
        state.categoryCompleted[session.category] = true;
        checkAchievements(state, dilemmas, unlocked);
        saveState(state);
        if (unlocked.length) { launchConfetti(); showToast(`Unlocked: ${unlocked[0].title}`); }
        renderCategoryComplete();
        return;
      }
      saveState(state);
      if (unlocked.length) showToast(`Unlocked: ${unlocked[0].title}`);
      renderCategoryStep();
    },
  );
}

function renderCategoryComplete() {
  const { session } = app;
  app.root.innerHTML = `
    <div class="view view-enter">
      ${headerHtml(`${session.category} complete`)}
      <div class="card-panel center celebrate-card">
        <div class="big-emoji">🎉</div>
        <h2 class="celebrate-title">Session complete!</h2>
        <p class="soft">You cleared ${session.queue.length} <strong>${session.category}</strong> dilemmas.</p>
        <button type="button" class="btn primary glow" data-nav="categories">Explore more</button>
        <button type="button" class="btn ghost full" data-nav="home">Home</button>
      </div>
      ${devBarHtml()}
    </div>`;
  bindCommon();
  bindDevBar();
  launchConfetti();
}

function renderHistory() {
  const items = app.state.history;
  app.root.innerHTML = `
    <div class="view view-enter">
      ${headerHtml("Your picks")}
      ${backRow("Home")}
      <div class="history-list">
        ${items.length ? items.map((h) => {
    const d = dilemmaById(app.dilemmas, app.state, h.dilemmaId);
    const text = d ? (h.choice === "a" ? d.a : d.b) : "Unknown";
    const mine = h.choice === "a" ? h.pctA : 100 - h.pctA;
    return `
            <button type="button" class="history-item" data-hid="${escapeHtml(h.id)}">
              <div class="history-top">
                <span class="history-date">${h.date}</span>
                <span class="pill">${h.mode}</span>
              </div>
              <p class="history-text">${escapeHtml(text)}</p>
              <span class="history-pill choice-${h.choice}">${h.choice.toUpperCase()} · ${mine}%</span>
            </button>`;
  }).join("") : `<div class="empty-state"><p class="empty-title">No picks yet</p><p class="soft">Your story starts with one impossible choice.</p></div>`}
      </div>
      ${devBarHtml()}
    </div>`;
  bindCommon();
  bindDevBar();
  app.root.querySelectorAll("[data-hid]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const h = app.state.history.find((x) => x.id === btn.dataset.hid);
      if (!h) return;
      const d = dilemmaById(app.dilemmas, app.state, h.dilemmaId);
      if (!d) return;
      renderResultsScreen(d, h.choice, h.pctA, {
        meta: `${h.date} · ${h.mode}`,
        title: "Replay",
        mode: h.mode,
      });
    });
  });
}

function renderStats() {
  const stats = computeStats(app.state, app.dilemmas);
  const personality = computePersonality(stats);
  const totalCat = stats.byCat.family + stats.byCat.adult + stats.byCat.absurd || 1;
  app.root.innerHTML = `
    <div class="view view-enter">
      ${headerHtml("My Stats")}
      ${backRow("Home")}
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-n">${stats.total}</div><div class="stat-l">Answered</div></div>
        <div class="stat-card"><div class="stat-n">${stats.streak}</div><div class="stat-l">Streak</div></div>
        <div class="stat-card"><div class="stat-n">${stats.longestStreak}</div><div class="stat-l">Best streak</div></div>
        <div class="stat-card"><div class="stat-n">${stats.daysPlayed}</div><div class="stat-l">Days played</div></div>
      </div>
      <div class="card-panel section-card">
        <h3 class="section-title">Category breakdown</h3>
        ${["family", "adult", "absurd"].map((c) => {
    const n = stats.byCat[c] || 0;
    const pct = Math.round((n / totalCat) * 100);
    return `<div class="break-row"><span>${c}</span><div class="mini-bar"><div style="width:${pct}%"></div></div><span>${n}</span></div>`;
  }).join("")}
      </div>
      <div class="card-panel section-card">
        <h3 class="section-title">A vs B lean</h3>
        <div class="break-row"><span>A picks</span><div class="mini-bar a"><div style="width:${Math.round((stats.pickA / (stats.total || 1)) * 100)}%"></div></div><span>${stats.pickA}</span></div>
        <div class="break-row"><span>B picks</span><div class="mini-bar b"><div style="width:${Math.round((stats.pickB / (stats.total || 1)) * 100)}%"></div></div><span>${stats.pickB}</span></div>
      </div>
      <div class="card-panel personality section-card">
        <h3 class="section-title">Your Dilemma Personality</h3>
        <p class="personality-title">${escapeHtml(personality.title)}</p>
        <p class="soft">${escapeHtml(personality.desc)}</p>
      </div>
      ${devBarHtml()}
    </div>`;
  bindCommon();
  bindDevBar();
}

function renderAchievements() {
  const unlocked = app.state.achievements || {};
  app.root.innerHTML = `
    <div class="view view-enter">
      ${headerHtml("Achievements")}
      ${backRow("Home")}
      <div class="ach-grid">
        ${ACHIEVEMENTS.map((a) => {
    const date = unlocked[a.id];
    return `
            <div class="ach-card ${date ? "unlocked" : "locked"}" tabindex="0">
              <div class="ach-glow"></div>
              ${achIconHtml(a.icon, !!date)}
              <div class="ach-title">${a.title}</div>
              <div class="ach-desc">${a.desc}</div>
              <div class="ach-meta">${date ? `✓ ${date}` : "Locked"}</div>
            </div>`;
  }).join("")}
      </div>
      ${devBarHtml()}
    </div>`;
  bindCommon();
  bindDevBar();
}

function renderSettings() {
  const { state } = app;
  app.root.innerHTML = `
    <div class="view view-enter">
      ${headerHtml("Settings")}
      ${backRow("Home")}
      <div class="card-panel settings section-card">
        <div class="settings-row"><span>Premium</span><strong>${state.isPremium ? "Active (demo)" : "Free tier"}</strong></div>
        <div class="settings-row"><span>Streak shields</span><strong>${state.shields}</strong></div>
        <div class="settings-row"><span>Custom dilemmas</span><strong>${state.customDilemmas.length}</strong></div>
        <button type="button" class="btn ${state.isPremium ? "ghost" : "premium-cta"} full" data-nav="upsell">
          ${state.isPremium ? "Premium active" : `${icon("spark", "ico-btn")} Unlock Premium (Demo)`}
        </button>
        ${state.isPremium ? `<button type="button" class="btn ghost full" id="revokePremium">Turn off demo premium</button>` : ""}
        <button type="button" class="btn ghost full" id="clearData">Clear all local data</button>
      </div>
      ${devBarHtml()}
    </div>`;
  bindCommon();
  bindDevBar();
  document.getElementById("revokePremium")?.addEventListener("click", () => {
    state.isPremium = false;
    saveState(state);
    showToast("Demo premium off");
    render();
  });
  document.getElementById("clearData")?.addEventListener("click", () => {
    if (confirm("Clear all progress?")) {
      resetState("all");
      location.reload();
    }
  });
}

function renderCreationsListHtml(state) {
  const items = state.customDilemmas;
  if (!items.length) {
    return `<div class="creations-empty"><p class="soft">No saved dilemmas yet — everything you make stays private on this device.</p></div>`;
  }
  return `<ul class="creations-list">
    ${items.map((c) => `
      <li class="creation-item">
        <div class="creation-head">
          <span class="private-pill">${icon("lock", "ico-chip")} Private</span>
          <span class="tag tag-sage">${escapeHtml(c.category)}</span>
          ${c.locked
    ? '<span class="draft-pill">Draft only</span>'
    : '<span class="active-pill">In your Quick Play</span>'}
        </div>
        <p class="creation-text"><span class="creation-opt">A</span> ${escapeHtml(c.a)}</p>
        <p class="creation-text"><span class="creation-opt">B</span> ${escapeHtml(c.b)}</p>
        <div class="creation-actions">
          ${state.isPremium
    ? `<button type="button" class="btn share sm" data-share-custom="${escapeHtml(c.id)}">${icon("share", "ico-btn")} Share</button>`
    : `<button type="button" class="btn ghost sm" data-share-upsell>${icon("lock", "ico-btn")} Share (Premium)</button>`}
        </div>
      </li>`).join("")}
  </ul>`;
}

function bindCreationsList(backdrop, state) {
  backdrop.querySelectorAll("[data-share-custom]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const custom = state.customDilemmas.find((x) => x.id === btn.dataset.shareCustom);
      if (custom) showShareDilemmaModal(custom);
    });
  });
  backdrop.querySelectorAll("[data-share-upsell]").forEach((btn) => {
    btn.addEventListener("click", () => showUpsellModal(() => showCreateModal()));
  });
}

function showShareDilemmaModal(custom) {
  if (!app.state.isPremium) {
    showUpsellModal(() => showShareDilemmaModal(custom));
    return;
  }
  const link = buildCustomShareUrl(custom);
  const message = `${customShareMessage(custom)}\n\n${link}`;
  const backdrop = openModal("Share this dilemma", `
    <p class="share-explainer">This link lets others <strong>play</strong> your dilemma. It will <strong>not</strong> be added to their permanent collection or anyone else's game unless they choose to save it.</p>
    <div class="share-link-field">
      <span class="field-label">Shareable link</span>
      <div class="share-link-row">
        <input class="input share-link-input" readonly value="${escapeHtml(link)}">
        <button type="button" class="btn primary glow copy-link-btn" id="copyShareLink">${icon("share", "ico-btn")} Copy link</button>
      </div>
    </div>
    <div class="share-message-field">
      <span class="field-label">Optional message</span>
      <textarea class="input share-message-input" readonly rows="3">${escapeHtml(message)}</textarea>
      <button type="button" class="btn sage-ghost sm copy-msg-btn" id="copyShareMsg">${icon("share", "ico-btn")} Copy message + link</button>
    </div>
    <p class="share-trust-note">${icon("lock", "ico-chip")} Only share with people you trust. Sharing is intentional — nothing is posted publicly or added to a global list.</p>`,
  `<button class="btn ghost" data-close>Done</button>`,
  { premium: true });
  backdrop.querySelector("[data-close]")?.addEventListener("click", () => backdrop.remove());
  backdrop.querySelector("#copyShareLink")?.addEventListener("click", (e) => {
    copyText(link, e.currentTarget, (btn) => {
      finishCustomShare(btn);
      showToast("Link copied!");
    });
  });
  backdrop.querySelector("#copyShareMsg")?.addEventListener("click", (e) => {
    copyText(message, e.currentTarget, (btn) => {
      finishCustomShare(btn);
      showToast("Message copied!");
    });
  });
  backdrop.querySelector(".share-link-input")?.addEventListener("click", (e) => e.target.select());
}

function showImportedShareModal(imported) {
  const backdrop = openModal("A dilemma for you", `
    <p class="modal-lead">Someone shared a custom dilemma with you. Would you like to play it now?</p>
    <div class="import-preview">
      <span class="private-pill muted">${icon("lock", "ico-chip")} Not saved yet</span>
      <span class="tag tag-sage">${escapeHtml(imported.category)}</span>
      <div class="import-options">
        <p class="import-opt">${escapeHtml(imported.a)}</p>
        <p class="import-or" aria-hidden="true">or</p>
        <p class="import-opt">${escapeHtml(imported.b)}</p>
      </div>
    </div>
    <p class="share-trust-note soft">It won't be saved unless you choose to. No public feed — just a link between friends.</p>`,
  `<button class="btn ghost" data-close>Not now</button>
   <button class="btn sage-ghost" id="saveImport">${icon("pencil", "ico-btn")} Save to My Creations</button>
   <button class="btn primary glow" id="playImport">${icon("bolt", "ico-btn")} Play once</button>`);
  backdrop.querySelector("[data-close]")?.addEventListener("click", () => backdrop.remove());
  backdrop.querySelector("#playImport")?.addEventListener("click", () => {
    backdrop.remove();
    playImportedOnce(imported);
  });
  backdrop.querySelector("#saveImport")?.addEventListener("click", () => {
    const id = saveImportedDilemma(imported);
    if (!id) return;
    backdrop.remove();
    showToast(app.state.isPremium ? "Saved to My Creations!" : "Saved as a private draft");
    showCreateModal();
  });
}

function showCreateModal() {
  const { state } = app;
  const atLimit = !state.isPremium && state.customDilemmas.length >= FREE_CUSTOM_LIMIT;
  if (atLimit) {
    showUpsellModal(() => showCreateModal());
    return;
  }
  const backdrop = openModal("Create a dilemma", `
    <p class="privacy-note">${icon("lock", "ico-chip")} Your creations are <strong>private by default</strong>. They only appear in your game unless you choose to share a link with someone.</p>
    <p class="modal-lead">Write a would-you-rather for friends, family, or your future self.</p>
    <label class="field">Category
      <select id="cCat" class="input">
        <option value="family">Family</option>
        <option value="adult">Adult</option>
        <option value="absurd">Absurd</option>
      </select>
    </label>
    <label class="field">Option A
      <input id="cA" class="input" maxlength="120" placeholder="First choice">
    </label>
    <label class="field">Option B
      <input id="cB" class="input" maxlength="120" placeholder="Second choice">
    </label>
    ${!state.isPremium ? `<p class="soft note-box">Free: up to ${FREE_CUSTOM_LIMIT} private drafts. Premium adds them to Quick Play.</p>` : ""}
    <section class="creations-section">
      <h3 class="creations-title">My Creations</h3>
      <div id="creationsList">${renderCreationsListHtml(state)}</div>
    </section>`,
  `<button class="btn ghost" data-close>Cancel</button>
   <button class="btn primary glow" id="saveCustom">Save dilemma</button>`);
  bindCreationsList(backdrop, state);
  backdrop.querySelector("[data-close]")?.addEventListener("click", () => backdrop.remove());
  backdrop.querySelector("#saveCustom")?.addEventListener("click", () => {
    const a = backdrop.querySelector("#cA").value.trim();
    const b = backdrop.querySelector("#cB").value.trim();
    const category = backdrop.querySelector("#cCat").value;
    if (!a || !b) { showToast("Fill in both options"); return; }
    const id = `c${Date.now()}`;
    state.customDilemmas.unshift({
      id, category, a, b,
      locked: !state.isPremium,
      createdAt: dateKey(),
    });
    const unlocked = [];
    if (state.isPremium) checkAchievements(state, app.dilemmas, unlocked);
    saveState(state);
    backdrop.querySelector("#creationsList").innerHTML = renderCreationsListHtml(state);
    bindCreationsList(backdrop, state);
    backdrop.querySelector("#cA").value = "";
    backdrop.querySelector("#cB").value = "";
    showToast(state.isPremium ? "Added to your pool!" : "Saved privately on this device");
    if (unlocked.length) launchConfetti();
    openModal("Saved!", `<p>Play it now?</p>`, `
      <button class="btn ghost" data-close>Later</button>
      <button class="btn primary" id="playCustom">Play now</button>`);
    document.querySelector("[data-close]")?.addEventListener("click", () => document.querySelector(".modal-backdrop")?.remove());
    document.getElementById("playCustom")?.addEventListener("click", () => {
      document.querySelector(".modal-backdrop")?.remove();
      const custom = state.customDilemmas.find((x) => x.id === id);
      if (custom) playCustomDilemma(custom);
    });
  });
}

function doShare(btn, dilemma, choice, pctA, mode) {
  const d = dilemma || app.session?.dilemma;
  const c = choice ?? app.state.daily[app.today]?.choice;
  const p = pctA ?? app.state.daily[app.today]?.pctA;
  if (!d || !c) {
    showToast("Nothing to share yet");
    return;
  }

  if (isEmbedded()) {
    showResultShareModal(d, c, p, mode);
    return;
  }

  const text = shareText(d, c, p, mode);
  const url = buildResultShareUrl();
  if (typeof navigator !== "undefined" && navigator.share) {
    navigator.share({ title: "Daily Dilemma", text, url })
      .then(() => finishResultShare(btn, "Shared!"))
      .catch((err) => {
        if (err?.name === "AbortError") return;
        showResultShareModal(d, c, p, mode);
      });
    return;
  }

  showResultShareModal(d, c, p, mode);
}

function render() {
  const v = app.view.name;
  if (v === "home") renderHome();
  else if (v === "categories") renderCategories();
  else if (v === "history") renderHistory();
  else if (v === "stats") renderStats();
  else if (v === "achievements") renderAchievements();
  else if (v === "settings") renderSettings();
  else if (v === "upsell") showUpsellModal(() => navigate("home"));
  else renderHome();
}

async function init() {
  const params = new URLSearchParams(location.search);
  if (params.has("reset")) {
    resetState(params.get("reset") === "all" ? "all" : "today", dateKey(), {});
    params.delete("reset");
    const qs = params.toString();
    history.replaceState(null, "", location.pathname + (qs ? `?${qs}` : ""));
  }

  let pendingImport = null;
  if (params.has("share")) {
    pendingImport = decodeSharePayload(params.get("share"));
    params.delete("share");
    const qs = params.toString();
    history.replaceState(null, "", location.pathname + (qs ? `?${qs}` : ""));
  }

  app.root = document.getElementById("app");
  document.body.classList.add("dd-game");
  const res = await fetch("dilemmas.json");
  app.dilemmas = await res.json();
  app.state = loadState();
  app.today = dateKey();

  if (params.has("dev") || isDevHost()) {
    /* dev mode active */
  }

  render();

  if (pendingImport) {
    requestAnimationFrame(() => showImportedShareModal(pendingImport));
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    dateKey, dayIndex, randomIndex, pseudoSplit, updateStreak, shareText, resetState,
    migrateState, computeStats, computePersonality, getQuickPlayRemaining, dayGap,
    defaultState, ACHIEVEMENTS, QUICK_FREE_LIMIT, resultHeadline, nextStreakMilestone,
    encodeSharePayload, decodeSharePayload, buildCustomShareUrl, customShareMessage,
    buildResultShareUrl, getShareSiteUrl, buildSocialShareUrls, normalizeShareSiteUrl,
  };
} else {
  init().catch((e) => {
    document.getElementById("app").innerHTML =
      `<p class="error">Could not load dilemmas: ${escapeHtml(e.message)}</p>`;
  });
}