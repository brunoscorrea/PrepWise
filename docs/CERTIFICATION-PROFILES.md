# Creating and sharing certification profiles

PrepWise keeps two kinds of data apart:

| Kind | What it contains | Shared when you export a profile? |
|---|---|---|
| **Certification content** | Name, code, provider, links, exam domains and weightings, objectives, study-plan template, learning resources, question bank | Yes |
| **Personal progress** | Session statuses and logged time, notes, bookmarks, quiz attempts and answers, statistics, streaks, achievements, schedule dates | Only with **Export my progress** |

A friend who imports your AB-650 profile gets the study content and questions. They don't get your results, notes or study history.

## Quick start

**Share a certification with a friend**
1. Open **My Certifications**, choose **Details** on the certification, then **Export profile**.
2. Send them the `prepwise-<id>-profile-<date>.json` file.
3. They open PrepWise, go to **My Certifications → Import**, and pick the file. The app shows a preview before anything is added.

**Create a new certification by hand**
1. **My Certifications → New certification**.
2. Enter the name, code and provider, and add the exam domains and weightings from the **official** exam outline.
3. Add questions in **Details → Questions → Add question**, or import a question bank (JSON).

Don't invent objectives or weightings. Copy them from the provider's official study guide, and link it in the profile.

## File formats

Every file is JSON with a `format` and a `schemaVersion`. PrepWise rejects files with an unknown format or an unsupported version, and it validates everything before showing the preview. Nothing is changed until you confirm.

| `format` | `schemaVersion` | Made by |
|---|---|---|
| `prepwise.certification` | 1 | Export profile |
| `prepwise.questionbank` | 1 | Export questions |
| `prepwise.studyplan` | 1 | Export study plan |
| `prepwise.progress` | 1 | Export my progress (private) |
| `prepwise.backup` | 2 | Settings → Export backup (everything on the device) |

Backups from the original *M365 Study Tracker* (v1) can still be imported. They go into the AB-650 profile.

A complete, valid example is in [`certifications/template-profile.json`](../certifications/template-profile.json).

### Certification profile

```json
{
  "format": "prepwise.certification",
  "schemaVersion": 1,
  "certification": {
    "id": "az-104",                 // required. 1–48 chars: a-z, 0-9, hyphens. Stable: links progress to the profile.
    "code": "AZ-104",               // required
    "name": "Microsoft Azure Administrator", // required
    "provider": "Microsoft",
    "description": "",
    "website": "https://…",         // official certification page
    "studyGuideUrl": "https://…",   // official study guide
    "exam": { … },                  // see below
    "plan": { … },                  // see below
    "resources": [ … ]              // see below
  },
  "questions": [ … ]                // optional
}
```

### `exam`

| Field | Meaning |
|---|---|
| `domains` | List of `{ "id", "short", "title", "weight": [min, max] }`. `weight` is the official percentage range. Leave it out to weight domains equally. |
| `objectives` | Map of objective code to text, e.g. `"2.1.3": "Create and manage groups"`. Optional. |
| `sections` | Map of section code to title, e.g. `"2.1": "Manage users and groups"`. Optional. |
| `refs` | Map of key to `["https://url", "Title"]`. Questions point to these with `"ref"`. |
| `weekSections` | Map of programme week to section codes, used by Week revision quizzes. Optional. |
| `masteryTarget` | Default target score in %, 85 if omitted. |
| `minCoverage` | Share of a domain's questions you must answer before mastery can reach 100% (default 0.6). |
| `modes` | `{ "mock": { "count", "minutes" }, "final": { "count", "minutes" } }` |
| `passingScore`, `passingScoreNote`, `disclaimer` | Information shown in the app. |

### `plan`

```json
{
  "dailyTargets": [60, 60, 60, 60, 60, 120, 120],   // minutes for Day 1–7 of each week
  "studyDays": [true, true, true, true, true, true, false],
  "weeks": [
    { "title": "Identity and governance",
      "objectives": ["Assign RBAC roles"],
      "sessions": [ { "day": 0, "topic": "Entra ID basics", "kind": "study", "plannedMin": 60 } ] }
  ]
}
```

`day` is 0–6 (Day 1–7 of the week, counted from the start date). `kind` is `study`, `practical`, `revision` or `assessment`. If no week has sessions, PrepWise creates one session per study day.

### `resources`

`{ "id", "title", "url", "type", "notes" }`, where `type` is `course`, `documentation`, `study-guide`, `video`, `lab`, `practice-test`, `book` or `other`.

### Questions

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Unique within the bank (max 64 characters). |
| `domain` | yes* | A domain `id`. *Can be left out if `obj` starts with the domain id (`"2.1.3"` → domain `2`). |
| `type` | yes | `single`, `multi`, `order` or `match`. |
| `q` | yes | Question text. |
| `opts` + `ans` | single/multi | 2–8 options. `ans` lists the correct option indexes, starting at 0. Single needs exactly one. |
| `opts` | order | 2–10 steps listed **in the correct order**. The app shuffles them. |
| `pairs` | match | 2–10 `["left", "right"]` pairs, listed correctly matched. |
| `exp` | recommended | Why the answer is right. |
| `why` | optional | One entry per option explaining why it's wrong (empty string for correct options). |
| `obj`, `topic`, `diff`, `scenario`, `feat` | optional | Objective code, topic (used for weak-topic analysis), `easy`/`intermediate`/`advanced`, scenario flag, technology name. |
| `ref` or `refUrl` + `refTitle` | optional | A key in `exam.refs`, or a direct link. |

### Question bank file

```json
{ "format": "prepwise.questionbank", "schemaVersion": 1, "certificationId": "az-104",
  "exam": { "domains": [ … ] },   // optional: used if the target certification has no domains yet
  "questions": [ … ] }
```

When importing a bank you can **add only new questions** (IDs already in the bank are skipped) or **replace the whole bank**. Quiz history is kept either way.

## What the importer checks

Invalid JSON · unknown format · unsupported `schemaVersion` · missing `id`, `name` or `code` · invalid certification IDs · duplicate question IDs · answers that point to options that don't exist · questions in domains the certification doesn't have · malformed ordering and matching questions · non-https links.

If anything fails, you see the list of problems and nothing on the device changes.

## Overwrite safety

- A profile whose `id` already exists can be imported **as a new certification** (it gets a new ID) or can **replace that certification's content**. Replacing content never touches your progress.
- Replacing a study plan that has logged time, importing progress, restoring a backup, resetting, and deleting all need an explicit confirmation (some ask you to type the code).
- Before each of those, PrepWise keeps an automatic snapshot (the last three) under **Settings → Data Management → Automatic snapshots**.

## Adding a built-in profile to the app (for developers)

1. Create `certifications/<id>/profile.js` that pushes `{ certification, questions: () => [...] }` onto `window.PrepWiseBuiltins` (see `certifications/ab-650/profile.js`).
2. Add the script tags to `index.html` before `app.js`, and the files to `APP_SHELL` in `service-worker.js`.
3. Bump `CACHE_VERSION` in `service-worker.js`.

Built-in exam outlines and banks are read-only in the app so updates can keep them current. Duplicate a built-in profile to customise it.
