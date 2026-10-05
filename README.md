# Fly Radar Israel ✈️ (Flightradar24-Style ADSB Flight Tracker)

אפליקציית מעקב טיסות בזמן אמת בסגנון **Flightradar24**, עם איקונים וצלליות וקטוריות מדויקות לכל סוג מטוס, זיהוי קוד חירום, מפה כהה אינטראקטיבית וכיסוי גלובלי.

---

## 🌟 תכונות עיקריות (Features)

* **מעקב טיסות בזמן אמת**: קבלת נתוני מיקום, גובה, מהירות, כיוון וסקווק ברשת ADS-B.
* **איקונים מדויקים לפי סוג מטוס (Flightradar24 Icons)**:
  * 🚁 **מסוקים** (Helicopter)
  * 🪂 **דאונים** (Glider)
  * 🛩️ **מטוסי תעופה כללית / קלים** (Light Aircraft)
  * 🛫 **דו-מנועי מדחף (Turboprop)** – כולל AT76 / ATR 72 / Dash 8 עם מנועים בולטים
  * ✈️ **מטוסי סילון צרי-גוף** (Narrowbody - B738 / A320)
  * ✈️ **מטוסי סילון רחבי-גוף** (Widebody - B789 / B772 / A359)
  * 🐘 **מטוסי ענק 4-מנועי/כבד** (Heavy / Jumbo - A380 / B747)
  * 🚀 **מטוסי קרב / צבאיים** (Military)
* **אזורים מוגדרים מראש**: מעבר בלחיצה בין נתב"ג, ירושלים, חיפה, אילת, ביירות, עמאן, לרנקה וקהיר.
* **מנגנון סימולציה אזורית חכמה**: באזורים דלילי קליטה או בעת עומס רשת, המערכת מציגה מכ"ם אזורי פעיל עם כל סוגי המטוסים.
* **גרירה וניווט חלק**: מבוסס Debounce ו-AbortController למניעת עומס על השרת.
* **התראות קוליות וחירום**: זיהוי אותות קוד חירום 7700, 7600 ו-7500.

---

## 🚀 התקנה והרצה מקומית (Quick Start)

### 1. שכפול המאגר (Clone)
```bash
git clone https://github.com/YOUR_USERNAME/fly-radar-israel.git
cd fly-radar-israel
```

### 2. התקנת תלויות (Install Dependencies)
```bash
npm install
```

### 3. הגדרת משתני סביבה (Environment Variables)
צור קובץ `.env` מתוך `.env.example`:
```bash
cp .env.example .env
```
ערוך את הקובץ `.env` והזן את מפתח ה-Google Maps שלך:
```env
VITE_GOOGLE_MAPS_API_KEY="your_google_maps_api_key_here"
```

### 4. הרצת שרת הפיתוח (Run Dev Server)
```bash
npm run dev
```
פתח את הדפדפן בכתובת: `http://localhost:3000`

---

## 📦 בנייה ופריסה (Build & Deploy)

### בניית הפרויקט לפרודקשן (Build for Production)
```bash
npm run build
```

### פריסה ב-GitHub Pages (Deployment on GitHub Pages)
הפרויקט כולל Workflows מוכנים של GitHub Actions בק תיקיית `.github/workflows/deploy-gh-pages.yml`.
1. בהגדרות המאגר ב-GitHub: **Settings -> Pages -> Build and deployment -> Source -> GitHub Actions**.
2. הוסף את המפתח שלך ב-**Settings -> Secrets and variables -> Actions**:
   * שם המפתח: `VITE_GOOGLE_MAPS_API_KEY`
3. בצע `git push` לענף ה-`main` והאתר יעלה אוטומטית!

### פריסה כפול-סטאק (Render / Vercel / Railway)
כדי להריץ את שרת ה-Express + React יחד:
* **Command**: `npm start`
* **Node Version**: 20.x

---

## 🛠️ טכנולוגיות (Tech Stack)

* **Frontend**: React 19, Vite, TypeScript, Tailwind CSS
* **Maps**: `@vis.gl/react-google-maps`, Google Maps JavaScript API
* **Backend**: Express.js, Node.js (`server.ts`)
* **Icons**: Custom SVG Vector Aircraft Silhouettes + Lucide Icons

---

## 📄 רישיון (License)

Apache License 2.0
