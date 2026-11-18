# Privacy and local profiles

PrepWise is local-first. It has no backend, no accounts, no analytics and no tracking. Your study data never leaves the browser unless you export it yourself.

> Your study progress and personal notes are stored locally in this browser. They are not automatically shared with other PrepWise users. Use Export Backup to transfer your progress to another device.

## Who can see what

| Situation | Shared? |
|---|---|
| Friends open the same PrepWise link on their own phones or computers | **No.** Each browser has its own separate storage. |
| You use PrepWise in Chrome and in Edge, or on your phone and your laptop | **No.** Each browser and device has its own data. Use Export/Import to move it. |
| Several people use the **same browser profile** (a family laptop) | Each person can create a PrepWise profile, and their data is kept apart. Profiles have no passwords, though: anyone using that browser can open every PrepWise profile in it. |
| The installed app (PWA) and the browser tab on the same device | Same data on Android, Windows, macOS and ChromeOS. On **iPhone and iPad**, the Home Screen app keeps its own storage, separate from Safari. |

## What a profile contains

Each local profile has its own display name, certifications, study plans and completed sessions, quiz history and results, bookmarks, notes, study preferences and settings, readiness scores and analytics. Built-in certification content (AB-650, SC-300, MD-102 and their question banks) ships with the app and contains no personal data.

## Storage layout

All keys live in `localStorage` for the site's origin:

- `prepwise:profiles`: the list of profiles (random id, display name, created and last-used dates) and which one is open.
- `prepwise:p:<id>:store`, `prepwise:p:<id>:bank:<cert>` and `prepwise:p:<id>:snapshots`: everything that belongs to one profile.
- The person who used PrepWise before profiles existed keeps their original keys (`prepwise:v2`, `prepwise:bank:*`, `prepwise:snapshots`, `prepwise:backup:v1`, `m365-study-tracker:v1`). These were adopted as their profile in place, without copying or rewriting.

Switching profiles saves the current profile and reloads the app into the other one, so no data can stay in memory and leak across. A new profile can never read the pre-profile keys, including the original v1 tracker data.

## Backups

**Settings → Profile → Export profile** downloads one profile: its name, certifications, question banks, progress and notes. It never includes other profiles. Treat the file as private.

**Import profile** offers to add the backup as a **new profile** first. Replacing the open profile's data is a separate choice that needs you to type `RESTORE`, and a snapshot is kept first. An import never changes any other profile.

## Resetting and deleting

- **Reset my profile** clears all progress in the open profile but keeps its name. You must type `RESET`.
- **Delete this profile** removes every key that belongs to the profile from this browser. You must type `DELETE`, and it can't be undone.
- Other profiles are never affected.

## Hosting

- Browser storage is per origin. Every site at `https://<user>.github.io/...` shares one origin, so another project hosted under the same GitHub Pages account could read PrepWise's local data. For a public deployment, use its own origin, such as a custom domain or a dedicated host.
- The static host can see ordinary web requests (IP address, user agent, the files requested), as with any website. PrepWise sends no study data in those requests.

## Network use

PrepWise loads its own files from the site it's served from. It contacts nothing else unless you open a link, for example to Microsoft Learn. The service worker caches the app's own files for offline use.
