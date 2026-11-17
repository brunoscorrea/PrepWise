# M365 Study Tracker

An offline, installable study tracker (PWA) for a 4-week Microsoft 365 & AI services certification programme. It's built with vanilla JavaScript, HTML and CSS, and has no backend. All data stays on your device in `localStorage`.

## Files

```
index.html          App shell
styles.css          Mobile-first dark theme
app.js              All logic (state, timer, stats, views, import/export)
manifest.json       PWA manifest (name, icons, standalone display)
service-worker.js   Offline cache
icons/              192px, 512px and maskable 512px icons
```

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
