# M365 Study Tracker

An offline, installable study tracker (PWA) for a 4-week Microsoft 365 & AI services certification programme. It's built with vanilla JavaScript, HTML and CSS, and has no backend. All data stays on your device in `localStorage`.

## Files

```
index.html            App shell
styles.css            Mobile-first dark theme (tracker + Quiz Centre)
app.js                Study tracker logic (state, timer, stats, views, import/export, plugin API)
quiz-centre.js        AB-650 Quiz Centre (modes, exam player, scoring, analytics)
ab650/meta.js         Exam domains, official objectives and Microsoft Learn references
ab650/questions-d1.js Domain 1 question bank
ab650/questions-d2.js Domain 2 question bank
ab650/questions-d3.js Domain 3 question bank
manifest.json         PWA manifest (name, icons, standalone display)
service-worker.js     Offline cache
icons/                192px, 512px and maskable 512px icons
```

## AB-650 Quiz Centre

The **Quiz** tab is a practice centre for exam AB-650: Administering Microsoft 365 and AI Services. It's organised around the [official study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ab-650).

- **167 original practice questions** mapped to all 55 objectives in the study guide (skills outline dated 27 July 2026). There are single-answer, multiple-answer, ordering and matching questions, most of them scenario-based, at three difficulty levels.
- Every question has an explanation, a reason why each wrong option is wrong, the related technology and exam objective, and a Microsoft Learn link.
- **Modes:** Quick (10), Standard (25), Full Mock Exam (50, weighted 11/21/18 to the official domain percentages, 100-minute timer), Domain, Weak Areas, Flagged, Daily Challenge (5 a day, with a streak), Week revision assessments, and a Final Mock Assessment (60 questions) that unlocks at the end of Week 4.
- **Practice mode** shows the answer and explanation straight away. **Exam mode** is timed and shows answers only after you submit.
- Scoring is all-or-nothing per question, like the real exam: a multiple-answer question needs exactly the right set.
- **Mastery:** a domain counts as mastered at 85% latest-answer accuracy with at least 60% of its questions answered. Certification prep only shows as complete when all three domains are mastered.

**Important:** these are original learning questions, not Microsoft exam questions. Newer features such as Agent 365, Entra Agent ID and Copilot Cowork change often, so always check the linked Learn page.

### Adding or editing questions
Add objects to the relevant `ab650/questions-d*.js` file. Each question has `id`, `obj` (study-guide objective such as `2.2.5`), `topic`, `diff` (`easy`/`intermediate`/`advanced`), `type` (`single`/`multi`/`order`/`match`), `scenario`, `q`, `opts` + `ans` (option indexes) or `pairs` (for matching), `exp`, `why` (one reason per option, with an empty string for correct options), `feat` and `ref` (a key in `ab650/meta.js` refs). For `order` questions, list `opts` in the correct order and the app shuffles them. Remember to bump `CACHE_VERSION` in `service-worker.js` afterwards.

## Run locally

A service worker only works over `http://localhost` or HTTPS. It won't work if you open `index.html` directly from disk.

```bash
cd study-tracker
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy free with GitHub Pages (recommended)

1. Create a new **public** repository on GitHub, e.g. `study-tracker`.
2. Upload the contents of this folder to the root of the repository. Use **Add file → Upload files** and drag in everything, including the `icons` folder. You can also push with git:
   ```bash
   git init && git add . && git commit -m "Study tracker"
   git branch -M main
   git remote add origin https://github.com/<your-username>/study-tracker.git
   git push -u origin main
   ```
3. In the repository, go to **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a branch**, select **main** and **/ (root)**, then click **Save**.
4. After about a minute, your app is live at `https://<your-username>.github.io/study-tracker/`.

All paths are relative, so the app works from a sub-folder like this without changes.

### Alternatives
- **Netlify Drop**: go to app.netlify.com/drop and drag the folder onto the page.
- **Cloudflare Pages**: create a project, choose *Direct upload* and upload the folder.

## Install on Android

1. Open your GitHub Pages URL in **Chrome**.
2. Tap **Install** on the dashboard banner. If the banner doesn't appear, open Chrome's **⋮** menu and tap **Install app** or **Add to Home screen**.
3. Launch the app from your home screen. It opens full screen and works offline from then on.

## Updating the app after changes

Whenever you edit any file, change `CACHE_VERSION` in `service-worker.js` (e.g. `v1.0.1`) before you deploy. The next time you open the installed app, it will show **"A new version is available → Update"**. Your study data is not affected by updates.

## Your data

- Everything saves automatically to this browser on this device. Nothing is sent anywhere.
- Use **Settings → Export JSON** regularly. Clearing Chrome's site data, or uninstalling the app, deletes your progress.
- To move to a new phone, export on the old phone and use **Import JSON** on the new one.
- The app never signs in to or scrapes Udemy. You enter your lecture and progress details manually.
