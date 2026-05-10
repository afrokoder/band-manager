/**
 * ─── Organisation Config ──────────────────────────────────────────────────────
 *
 * This is the single file you change when deploying Band Manager for a new
 * organisation. Every org-specific value lives here — nothing else needs
 * to be touched.
 *
 * Steps for a new deployment:
 *   1. Clone / fork the repo
 *   2. Edit the values below
 *   3. Point VITE_* env vars at the new org's Firebase project (.env.local)
 *   4. Deploy to Vercel / Netlify / Firebase Hosting
 */

const config = {
  // ── Identity ──────────────────────────────────────────────────────────────
  /** Short name shown on the login screen above "Band Manager" */
  orgName:    'Amazing Voices',

  /** Full org name used in PDF exports and the browser tab title */
  orgFullName: 'Amazing Grace Music Dept',

  /** Shown in the browser tab: "<orgName> · Band Manager" */
  appTitle:   'Amazing Voices · Band Manager',

  /** PWA short name (keep ≤ 12 chars for home-screen icons) */
  shortName:  'AmazingVoices',

  /** One-line description used in the PWA manifest */
  description: 'Music team coordination for Amazing Grace Church',

  // ── Access control ───────────────────────────────────────────────────────
  /**
   * Required on the Sign Up screen. Share this privately with your members
   * (e.g. via WhatsApp). Anyone without this code cannot create an account.
   * Existing accounts are unaffected if you change it.
   * Rotate it by updating this value and redeploying.
   */
  accessCode: 'AMAZING2025',

  // ── Brand colour ─────────────────────────────────────────────────────────
  /**
   * Primary accent — used for buttons, links, active tabs, badges.
   * Change this and the whole app re-themes.  Use a hex value.
   */
  accentColor:     '#0071e3',   // Apple blue  (Amazing Voices default)
  accentColorDark: '#0066cc',   // Slightly darker, used for :active states

  // ── Groups & Roles ───────────────────────────────────────────────────────
  /**
   * The groups members can belong to.
   * Each key is the stored value; label is displayed in the UI.
   * "admin" is reserved — don't rename it; it controls admin permissions.
   */
  groups: {
    band:   '🎸 Band',
    vocals: '🎤 Vocals',
    admin:  '⚙️ Admin',       // reserved — do not remove
  },

  /**
   * Available roles per group.
   * Shown during profile setup so members can pick their instrument/part.
   */
  roles: {
    band:   ['Guitar Lead', 'Guitar Rhythm', 'Keys', 'Bass', 'Drums', 'Brass', 'Strings', 'Other Instrument'],
    vocals: ['Lead Vocal', 'Vocal 2', 'Vocal 3', 'Backing Vocal', 'Choir'],
  },

  // ── Service roster sections ───────────────────────────────────────────────
  /**
   * Sections that appear in the Sunday service roster.
   * Each entry becomes a row in the ServiceCard and a slot in the add/edit form.
   * Rename or add entries to match your order of service.
   */
  serviceSections: ['Morning Worship', 'Praise & Worship', 'Offering'],

  // ── Comms ─────────────────────────────────────────────────────────────────
  /**
   * Audience options in the Comms compose box.
   * Key = stored value, value = display label.
   */
  audiences: {
    all:    '@all',
    band:   '@band',
    vocals: '@vocals',
  },
}

export default config
