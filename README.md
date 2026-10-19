# BUK-FRAS: Bayero University Kano - Facial Recognition Attendance System

A modern, cloud-native **Facial Recognition Attendance Management System** refactored for **Vercel** serverless hosting and customized for **Bayero University Kano (BUK)**, Nigeria.

> *"Wa fawqa kulli dzi 'ilmin 'alim"* — *"...and above every possessor of knowledge there is one more well-informed"*

---

## 🌟 Key Highlights & Modernization

- **Vercel Serverless Ready**: Replaces legacy XAMPP PHP with a full-stack Next.js 14 App Router, TypeScript, and Prisma ORM architecture.
- **Deep CNN Biometric Face Matching**: Powered by client-side `face-api.js` (SSD MobileNet v1, 68-point landmarks, 128-dimensional embedding vectors) running in the browser.
- **Zero-Latency Database Embeddings**: Facial descriptors are calculated during enrollment and stored directly in the database as 128-float vectors. Attendance sessions load rosters and face matchers instantaneously without downloading heavy image files.
- **BUK Institutional Identity**: Custom Bayero University Kano emblem, institutional Navy Blue (`#002147`) & Academic Gold (`#C5A059`) palette, BUK faculties, degree programmes, and campus venues.
- **Examination Clearance & Defaulter Tracking**: Automatically flags students falling below the mandatory **70% attendance threshold** required for semester examination eligibility.
- **One-Click CSV / Excel Export**: Generate attendance sheets for departmental boards and Senate accreditation.

---

## 🏛️ System Roles & Demo Credentials

### 1. Administrator Portal (`/login?role=admin`)
- **Email**: `admin@buk.edu.ng`
- **Password**: `@admin_`
- **Capabilities**:
  - Manage BUK Faculties, Degree Programmes, Course Units, and Lecture Venues.
  - Register academic teaching staff.
  - Enroll students with **Interactive 5-Angle Webcam Biometric Capture**.
  - Assign course units to lecturers and batch-enroll students.
  - System-wide compliance analytics.

### 2. Lecturer Terminal (`/login?role=lecturer`)
- **Email**: `lecturer@buk.edu.ng`
- **Password**: `@lecturer_`
- **Capabilities**:
  - Launch **Live Facial Recognition Attendance Scanner** with real-time bounding boxes and presence verification.
  - Real-time student roster presence tracking.
  - Historical attendance filtering and CSV export.
  - Attendance Defaulter warning dispatch (<70% attendance threshold).

---

## 🚀 One-Click Deployment to Vercel

### Step 1: Push to GitHub / GitLab / Bitbucket
Push this repository to your preferred Git provider:
```bash
git init
git add .
git commit -m "Refactor BUK-FRAS for Vercel"
git branch -M main
git remote add origin https://github.com/<your-username>/buk-fras.git
git push -u origin main
```

### Step 2: Import Project on Vercel
1. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
2. Select your repository. Vercel automatically detects the **Next.js** framework.

### Step 3: Configure Cloud Database Environment Variables
In the Vercel Project Settings, add your `DATABASE_URL`:
- **For Supabase (PostgreSQL)**:
  ```env
  DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require"
  ```
- **For Neon (Serverless PostgreSQL)**:
  ```env
  DATABASE_URL="postgresql://[USER]:[PASSWORD]@[ENDPOINT].neon.tech/neondb?sslmode=require"
  ```
- **For TiDB Cloud / PlanetScale (Cloud MySQL)**:
  ```env
  DATABASE_URL="mysql://[USER]:[PASSWORD]@[HOST]:3306/buk_attendance?sslaccept=strict"
  ```
- **Session Secret**:
  ```env
  SESSION_SECRET="generate_a_secure_random_string_here"
  ```

### Step 4: Deploy (Zero-Terminal Setup)
1. Click **Deploy**.
2. Vercel automatically runs [`scripts/deploy-db.js`](scripts/deploy-db.js) during the build, which:
   - Pushes the database schema to your PostgreSQL database (`prisma db push`).
   - Seeds the default BUK Administrator (`admin@buk.edu.ng`), Faculties, Programmes, Course Units, Venues, Lecturer, and Students.
   - Compiles and launches your live application without requiring any manual terminal commands!

---

## 💻 Local Development Setup

### 1. Prerequisites
- Node.js 18+ (tested on Node v20/v24)
- npm or yarn

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize Local SQLite Database
```bash
npx prisma db push
node prisma/seed.js
```

### 4. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Architecture

```plaintext
buk-fras/
├── prisma/
│   ├── schema.prisma           # Prisma database schema definition
│   └── seed.js                 # Initializer preloaded with BUK data
├── public/
│   ├── models/                 # Neural network weight shards (face-api.js)
│   └── vendor/
│       └── face-api.min.js     # TensorFlow.js face recognition library
├── src/
│   ├── app/
│   │   ├── admin/              # Administrator portal pages & workflows
│   │   ├── lecturer/           # Lecturer live scanner & report terminals
│   │   ├── login/              # Unified authentication gateway
│   │   ├── api/                # Next.js Serverless API Route Handlers
│   │   ├── layout.tsx          # Root layout & model loader
│   │   └── page.tsx            # BUK institutional landing page
│   ├── components/
│   │   └── BukLogo.tsx         # Bayero University Kano official SVG seal
│   └── lib/
│       ├── auth.ts             # Session & JWT cookie helpers
│       ├── db.ts               # Prisma singleton client
│       └── utils.ts            # Classnames & date utilities
├── legacy_php/                 # Preserved archive of original PHP application
├── vercel.json                 # Vercel deployment configuration & asset headers
├── tailwind.config.js          # BUK color scheme (Navy, Gold, Green)
├── next.config.mjs             # Next.js configuration
└── README.md                   # System documentation
```

---

## 📜 License
Licensed under the [MIT License](LICENSE).

Developed for **Bayero University Kano (BUK)**.
