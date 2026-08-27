/**
 * Backfill `groups` (array) from the legacy `group` (string) field on user docs.
 *
 * Context: security rules and newer client code key membership off the `groups`
 * array. Profiles created before the multi-group migration may only carry the
 * singular `group` field, which caused "Missing or insufficient permissions"
 * once the strict rules took effect. This backfill makes those docs consistent
 * so the legacy fallback can eventually be removed.
 *
 * Safety:
 *   - Dry run by default. Pass --apply to actually write.
 *   - Only writes docs whose `groups` is missing/empty AND that have a
 *     non-empty legacy `group`. Never removes or overwrites existing groups.
 *
 * Auth (pick one):
 *   - export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 *   - or run:  gcloud auth application-default login
 *
 * Usage:
 *   npm i -D firebase-admin
 *   node scripts/backfill-groups.mjs            # dry run
 *   node scripts/backfill-groups.mjs --apply    # perform writes
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const APPLY = process.argv.includes('--apply')
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'band-manager-agm'

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID })
const db = getFirestore()

const snap = await db.collection('users').get()
let scanned = 0
let toFix = 0
let written = 0

for (const doc of snap.docs) {
  scanned++
  const data = doc.data()
  const groups = Array.isArray(data.groups) ? data.groups : []
  const legacy = typeof data.group === 'string' ? data.group.trim() : ''

  // Already has a groups array — nothing to do.
  if (groups.length > 0) continue
  // No legacy value to migrate — skip (rules can't authorize these regardless).
  if (!legacy) continue

  toFix++
  const nextGroups = [legacy]
  console.log(
    `${APPLY ? 'FIX ' : 'WOULD FIX'} ${doc.id} (${data.name || 'unnamed'}): ` +
    `group="${legacy}" -> groups=${JSON.stringify(nextGroups)}`
  )

  if (APPLY) {
    await doc.ref.update({ groups: nextGroups })
    written++
  }
}

console.log(
  `\nScanned ${scanned} user(s). ${toFix} need backfill. ` +
  (APPLY ? `${written} updated.` : 'Dry run — re-run with --apply to write.')
)
process.exit(0)
