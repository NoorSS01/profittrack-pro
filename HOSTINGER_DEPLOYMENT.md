# Hostinger Deployment Guide - ProfitTrack Pro

This project (**ProfitTrack Pro - Transport Business Tracker**) uses **React + Vite + TypeScript** and is deployed to Hostinger web hosting using **Advanced Git**. Hostinger does **not** run `npm run build` – we commit the built `dist/` folder and let Apache serve it.

---

## Project Details

- **Stack**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Supabase
- **Features**: Dashboard, Vehicles, Daily Entry, Trip History, Reports, Settings
- **PWA**: Yes (installable on mobile)

---

## 1. Repo Layout & Vite Config

Key configuration in `vite.config.ts`:
```typescript
base: mode === "production" ? "/dist/" : "/",
build: {
  outDir: "dist"
}
```

- The **`dist/` folder is committed to Git** (not in `.gitignore`)
- Root **`.htaccess`** rewrites all requests to `/dist/index.html` for React Router

`.htaccess` content:
```apacheconf
RewriteEngine On

# Serve the built React app from /dist
RewriteCond %{REQUEST_URI} !^/dist/
RewriteRule ^$ /dist/index.html [L]

# For client-side routes, send everything to the SPA entry
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ /dist/index.html [L]
```

---

## 2. Build & Deploy Flow

For any code changes:

1. Make your code changes
2. Run `npm run build` locally
3. Commit everything (source + `dist/` + `.htaccess`)
4. Push to `main` branch
5. In Hostinger hPanel → Advanced → Git → Click **Deploy**

```bash
npm run build
git add .
git commit -m "Your commit message"
git push origin main
```

---

## 3. Hostinger Advanced Git Setup

In hPanel:

1. **Advanced → Git** → Connect GitHub repo
2. **Install Path**: `/public_html` (or subdomain folder)
3. **No build command** – just `git pull`
4. After push, click **Deploy**
5. Verify in File Manager:
   - `.htaccess` in root
   - `dist/` folder with `index.html` and `assets/`

---

## 4. Environment Variables

This project uses Supabase. The `.env` file contains:
```
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-key"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
```

**Important**: Environment variables are embedded at build time in Vite. The `.env` file must be present when running `npm run build`.

---

## 5. Troubleshooting

| Issue | Solution |
|-------|----------|
| Blank page | Check `.htaccess` exists in `public_html` |
| Assets not loading | Verify `base: "/dist/"` in vite.config.ts |
| Routes 404 on refresh | `.htaccess` rewrite rules missing |
| Supabase errors | Check `.env` was present during build |

---

## 6. Generic Checklist for Similar Projects

When deploying another React/Vite SPA to Hostinger:

1. **Vite config**: Set `base = "/dist/"` for production
2. **Build artifacts**: Remove `dist` from `.gitignore`, commit after build
3. **Routing**: Add root `.htaccess` with SPA rewrite rules
4. **Hostinger**: Advanced Git → Install Path = `public_html`, no build command
5. **Verify**: Check File Manager for `.htaccess` and `dist/`, test routes

This pattern avoids blank pages caused by Hostinger serving raw source instead of built app.

