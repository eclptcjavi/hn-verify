# Deploying HN Verify to GitHub + Railway

## 1. Push to GitHub

**Important:** Your `.env` file is in `.gitignore`, so it will **not** be pushed. You’ll add the same variables in Railway.

1. **Create a new repo on GitHub**
   - Go to [github.com/new](https://github.com/new)
   - Name it (e.g. `hn-verify-app`), leave it empty (no README/license)

2. **Initialize git and push** (from your project folder):

   ```bash
   cd /Users/javieraltamirano/Downloads/hn-verify-app
   git init
   git add .
   git commit -m "Initial commit: HN Verify app"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

   Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your GitHub username and repo name.

---

## 2. Deploy on Railway

1. **Sign up / log in**
   - Go to [railway.app](https://railway.app) and sign in (GitHub is easiest).

2. **New project from GitHub**
   - Click **New Project** → **Deploy from GitHub repo**
   - Choose your `hn-verify-app` repo and deploy.

3. **Add environment variables**
   - Open your project → click the service (your app)
   - Go to **Variables** and add every variable from your local `.env`:

   | Variable | Example / notes |
   |----------|------------------|
   | `TWILIO_ACCOUNT_SID` | From Twilio Console |
   | `TWILIO_AUTH_TOKEN` | From Twilio Console |
   | `TWILIO_FROM_NUMBER` | e.g. `+18663020281` |
   | `TWILIO_TO_NUMBER` | e.g. `+15805714022` |
   | `DASHBOARD_PASSWORD` | Password for `/dashboard` and `/login` |
   | `SESSION_SECRET` | Long random string (e.g. 32+ chars) |
   | `DASHBOARD_BACKUP_CODE` | Optional. If set, login requires password + this code (second factor). |

   **Do not** set `PORT` — Railway sets it automatically.

4. **Generate a domain**
   - In the service, open **Settings** → **Networking** → **Generate Domain**
   - Your app will be at `https://your-app-name.up.railway.app`

5. **Deploy**
   - Railway builds and runs `npm start` (which runs `node server.js`). Each new push to `main` will redeploy.

---

## 3. After deployment

- **Public verification page:** `https://your-app-name.up.railway.app/`
- **Dashboard (login):** `https://your-app-name.up.railway.app/dashboard` (or `/login`)

**Note:** `customers_data.json`, `verification_log.json`, and `enrollment_requests.json` live on the server. On Railway, the filesystem is ephemeral, so logs and enrollments may reset on redeploy. For permanent storage later, you’d use a database or Railway Volumes.
