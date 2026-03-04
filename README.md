# HN Verify App

A customer verification system with a public-facing verification page and a private admin dashboard.

---

## What It Does

- **Public page** (`/`): Customers enter their name + code. If found, you get an SMS with their name, tag, Gmail account, and code. If not found, they can submit an enrollment request.
- **Private dashboard** (`/dashboard`): Password-protected. View all customers, filter by tag, see the live activity log, and manage enrollment requests.

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Copy the example file and fill in your credentials:
```bash
cp .env.example .env
```

Edit `.env`:
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+1XXXXXXXXXX     # Your Twilio phone number
TWILIO_TO_NUMBER=+1XXXXXXXXXX       # Your personal number (where SMS goes)

DASHBOARD_PASSWORD=your_secure_password_here

SESSION_SECRET=any_random_string_here

PORT=3000
```

### 3. Start the app
```bash
node server.js
```

The app will be running at:
- **Public page**: http://localhost:3000/
- **Dashboard login**: http://localhost:3000/login
- **Dashboard**: http://localhost:3000/dashboard

---

## Deploying (Recommended: Railway or Render)

### Railway (easiest)
1. Push this folder to a GitHub repo
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add your environment variables in the Railway dashboard under **Variables**
4. Railway will give you a public URL automatically

### Render
1. Push to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo, set Build Command: `npm install`, Start Command: `node server.js`
4. Add environment variables under **Environment**

---

## File Structure
```
hn-verify-app/
├── server.js               # Express backend
├── customers_data.json     # Your customer database (152 customers)
├── verification_log.json   # Auto-created: log of all verify attempts
├── enrollment_requests.json # Auto-created: enrollment requests
├── .env                    # Your credentials (never commit this)
├── .env.example            # Template
├── package.json
└── public/
    ├── index.html          # Customer-facing verification page
    ├── login.html          # Dashboard login
    └── dashboard.html      # Private admin dashboard
```

---

## SMS Format
When a customer verifies successfully, you'll receive:
```
📋 HN Verify
Customer: John Smith
Account: Vc01
Gmail: horizonnet.tv01@gmail.com
Code: 123456
```

When a new enrollment request comes in:
```
📝 New Enrollment Request
Name: Jane Doe
Phone: (555) 123-4567
Address: 123 Main St, Enid, OK
```

---

## Adding Customers
You can add customers directly from the dashboard (Customers tab → Add Customer button), or edit `customers_data.json` directly and restart the server.
