# PushUp Template (Local Storage)

This is a template version of the PushUp Challenge app that uses browser local storage only.
No Firebase, no accounts, no backend.

---

## What It Does

- Anonymous login using a simple username
- One-tap rep logging (+1, +10, +20, +25)
- Safe undo of last action
- Daily progress tracking
- Monthly contribution calendar
- Streak and average stats
- Local leaderboard (based on users stored in your browser)

---

## Local Data Model

Data is stored in `localStorage` under the key `pushup_users_v1`.

```
{
  "alice": {
    "displayName": "Alice",
    "training_reps": 120,
    "official_reps": 560,
    "created_at": 1738320000000,
    "last_active": 1738406400000,
    "logs": [
      {
        "amount": 20,
        "timestamp": 1738406400000,
        "season": "TRAINING"
      }
    ]
  }
}
```

To reset everything, clear the `pushup_users_v1` key in your browser’s local storage.

---

## Getting Started

```
npm install
npm run dev
```

---

## Notes

- All data is per-browser. There is no sync across devices.
- Multiple users can be tracked on the same browser by using different names.
