#!/bin/bash
# ─────────────────────────────────────────────────────────────────
#  Band Manager — push to GitHub
#  Run this from your terminal inside the BandManager folder.
#
#  Prerequisites:
#    - git   → https://git-scm.com
#    - gh    → https://cli.github.com  (then run: gh auth login)
# ─────────────────────────────────────────────────────────────────

set -e

REPO_NAME="band-manager"
DESCRIPTION="React + Firebase PWA for managing band songs, setlists, rehearsals and team comms"

echo ""
echo "🎵  Band Manager — pushing to GitHub"
echo "────────────────────────────────────"

# ── 1. Check prerequisites ──
if ! command -v git &>/dev/null; then
  echo "❌  git not found. Install from https://git-scm.com"; exit 1
fi
if ! command -v gh &>/dev/null; then
  echo "❌  gh CLI not found. Install from https://cli.github.com"; exit 1
fi
if ! gh auth status &>/dev/null; then
  echo "❌  Not logged in to GitHub. Run: gh auth login"; exit 1
fi

# ── 2. Init git repo if needed ──
if [ ! -d ".git" ]; then
  git init --initial-branch=main
  echo "  ✔ Git initialised (branch: main)"
else
  echo "  ✔ Git repo already exists"
fi

# ── 3. Make sure .env is NOT tracked ──
if git ls-files --error-unmatch .env &>/dev/null 2>&1; then
  git rm --cached .env
  echo "  ✔ Removed .env from tracking (kept locally)"
fi

# ── 4. Stage all files ──
git add .
echo "  ✔ Files staged"

# ── 5. Commit ──
if git diff --cached --quiet; then
  echo "  ℹ  Nothing new to commit (repo already up to date)"
else
  COMMIT_MSG_FILE=$(mktemp)
  cat > "$COMMIT_MSG_FILE" << ENDOFMSG
feat: Band Manager v0.2 — React + Firebase PWA

Full rewrite from single HTML file to a proper React + Vite app.

Features:
- Auth: email/password + Google sign-in, member profile setup
- Song Library: Firestore real-time, search/filter, multi-section
  lyrics & chord charts, Firebase Storage file upload
- Setlist Builder: @dnd-kit drag-and-drop pills, Firestore sync,
  PDF export via jsPDF
- Schedule: rehearsal planner, per-member RSVP (Going/Can't/Maybe)
- Comms: real-time Firestore feed, @all/@band/@vocals audience tags,
  FCM push notifications
- PWA: installable, service worker, manifest
ENDOFMSG
  git commit -F "$COMMIT_MSG_FILE"
  rm -f "$COMMIT_MSG_FILE"
  echo "  ✔ Committed"
fi

# ── 6. Create GitHub repo and push ──
echo ""
echo "  Creating GitHub repo: $REPO_NAME ..."

# Check if remote already exists
if git remote get-url origin &>/dev/null 2>&1; then
  echo "  ℹ  Remote 'origin' already set — pushing to existing repo"
  git push -u origin main
else
  gh repo create "$REPO_NAME" \
    --public \
    --description "$DESCRIPTION" \
    --source=. \
    --remote=origin \
    --push
fi

echo ""
echo "✅  All done! Your repo:"
gh repo view --json url -q .url
echo ""
echo "Next steps:"
echo "  1. cp .env.example .env  →  fill in your Firebase values"
echo "  2. npm install && npm run dev"
echo "  3. Read SETUP.md for the Firebase configuration walkthrough"
