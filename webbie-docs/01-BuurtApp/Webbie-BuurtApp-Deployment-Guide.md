# Webbie-BuurtApp-Deployment-Guide.md

**Laatst bijgewerkt:** 17 februari 2026

## 🚀 BuurtApp - Deployment Guide (Firebase Hosting)

Complete guide voor het deployen van BuurtApp naar Firebase Hosting (production).

---

## 📋 Pre-Deployment Checklist

### Code Quality
- [ ] `npm run lint` passes zonder errors
- [ ] `npm run build` succesvol (geen TypeScript errors)
- [ ] Alle features getest lokaal
- [ ] Dark mode getest
- [ ] Mobile responsive getest
- [ ] Browser compatibility getest (Chrome, Firefox, Safari, Edge)

### Firebase
- [ ] Firestore rules up-to-date
- [ ] Storage rules up-to-date
- [ ] Cloud Functions deployed (indien gewijzigd)
- [ ] Environment variables geconfigureerd

### Security
- [ ] Geen API keys in code (alleen env vars)
- [ ] Geen console.log statements met gevoelige data
- [ ] .env.local NIET in git
- [ ] Security rules getest

### Content
- [ ] Alle teksten correct (typo check)
- [ ] Alle images geoptimaliseerd
- [ ] 404 page works
- [ ] Favicon + PWA icons correct

---

## 🔧 Deployment Stappen

### 1. Build Production Bundle

```bash
# Zorg dat je in project root zit
cd ~/Projecten/buurtapp-v3-4

# Clean previous builds (optioneel)
rm -rf dist/

# Build voor production
npm run build

# Expected output:
# ✓ built in [tijd]ms
# dist/index.html
# dist/assets/...
```

**Check build output:**
```bash
ls -lh dist/
# Moet bevatten: index.html, assets/, icons/, etc.
```

### 2. Preview Build Lokaal (Aanbevolen)

```bash
npm run preview

# Opens on http://localhost:4173
```

**Test alles nogmaals:**
- [ ] App laadt correct
- [ ] Login werkt
- [ ] Alle routes werken
- [ ] Data fetch werkt (productie Firebase!)
- [ ] Maps laden
- [ ] Charts renderen

**Stop preview:** Ctrl+C

### 3. Firebase Login (First Time Only)

```bash
firebase login

# Browser opent → login met Google account
# "Firebase CLI Login Successful"
```

**Check login:**
```bash
firebase projects:list

# Moet je projecten tonen
```

### 4. Deploy Firestore Rules (indien gewijzigd)

```bash
firebase deploy --only firestore:rules

# Output:
# ✔ Deploy complete!
```

### 5. Deploy Storage Rules (indien gewijzigd)

```bash
firebase deploy --only storage:rules

# Output:
# ✔ Deploy complete!
```

### 6. Deploy Cloud Functions (indien gewijzigd)

```bash
firebase deploy --only functions

# Dit kan 2-5 minuten duren
# Functions worden gecompileerd en gedeployed

# Output per function:
# ✔ functions[functionName] deployed
```

### 7. Deploy Hosting (Main App)

```bash
firebase deploy --only hosting

# Upload van dist/ folder
# Expected: Upload size ~2-5MB (depends on app)

# Output:
# ✔ hosting: deploy complete
# Hosting URL: https://buurtapp-v3-4.web.app
```

### 8. Deploy Alles Tegelijk (Alternative)

```bash
firebase deploy

# Deployed:
# - Firestore rules
# - Storage rules
# - Functions
# - Hosting

# Duurt langer, maar comprehensive
```

---

## 🌐 Post-Deployment Verificatie

### 1. Open Production URL

```bash
# URL openen
open https://buurtapp-v3-4.web.app
# Of: https://buurtapp-v3-4.firebaseapp.com (alternatief)
```

### 2. Smoke Tests

**Critical Paths:**
- [ ] App laadt zonder errors (check browser console)
- [ ] Login pagina bereikbaar
- [ ] Login werkt met test account
- [ ] Dashboard laadt met data
- [ ] Nieuwe melding maken werkt
- [ ] File upload werkt
- [ ] Maps laden correct
- [ ] Charts renderen
- [ ] Dark mode toggle werkt
- [ ] Logout werkt

### 3. Performance Check

**Lighthouse Audit:**
```bash
# In Chrome DevTools:
# 1. Open https://buurtapp-v3-4.web.app
# 2. F12 → Lighthouse tab
# 3. "Analyze page load"

Target scores:
- Performance: >80
- Accessibility: >90
- Best Practices: >90
- SEO: >80
```

### 4. Mobile Testing

Test op:
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] Tablet (landscape + portrait)

**Quick test via Chrome DevTools:**
- F12 → Toggle device toolbar (Ctrl+Shift+M)
- Test verschillende schermgroottes

### 5. Cross-Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### 6. Check Firebase Console

**Firestore:**
- Data intact?
- No unexpected Collections?

**Authentication:**
- Users lijst correct?

**Storage:**
- Files uploaden correct?

**Functions Logs:**
- No errors?
```bash
firebase functions:log --limit 50
```

---

## 🔄 Rollback Procedure

### If Something Breaks

**Optie 1: Rollback Hosting**
```bash
# Check deployment history
firebase hosting:channel:list

# Rollback naar vorige versie
firebase hosting:rollback
```

**Optie 2: Re-deploy Previous Version**
```bash
# Checkout previous git commit
git checkout HEAD~1

# Rebuild
npm run build

# Deploy
firebase deploy --only hosting

# Return to latest
git checkout main
```

**Optie 3: Quick Fix**
```bash
# Fix issue
# Edit file(s)

# Rebuild + deploy
npm run build && firebase deploy --only hosting
```

---

## 🔧 Environment Variables in Production

Firebase Hosting gebruikt **automatisch** je `.env.local` variables tijdens build.

**Voor runtime env vars (indien nodig):**

1. **Firebase Hosting Config:**
```bash
firebase functions:config:set app.api_key="value"
```

2. **Check config:**
```bash
firebase functions:config:get
```

---

## 📊 Monitoring & Analytics

### Firebase Hosting Metrics

**Check in Firebase Console:**
- Hosting → Usage
- Bandwidth usage
- Request counts
- Geo distribution

### Performance Monitoring

**Setup (if not already):**
```typescript
// In src/firebase.ts
import { getPerformance } from 'firebase/performance';

const perf = getPerformance(app);
```

**Check in Firebase Console:**
- Performance → Dashboard
- Page load times
- Network requests
- Traces

### Error Tracking

**Check Cloud Functions logs:**
```bash
firebase functions:log

# Or in Firebase Console:
# Functions → Logs
```

### Analytics

**Firebase Analytics:**
- Console → Analytics → Events
- Track:
  - User engagement
  - Feature usage
  - Conversion funnels

---

## 🔐 Security Post-Deployment

### 1. API Key Restrictions

**Google Maps API:**
1. Google Cloud Console → Credentials
2. Edit API Key
3. Application restrictions → HTTP referrers
4. Add: `buurtapp-v3-4.web.app/*` en `buurtapp-v3-4.firebaseapp.com/*`

**Firebase API Key:**
- Firebase keys zijn safe om public te maken
- Real security is in Firestore/Storage rules

### 2. Firestore Rules Verification

```bash
# Test rules tegen live data (careful!)
firebase emulators:start --only firestore --import=./firestore-export

# Or: Manual testing via Firebase Console
```

### 3. CORS Configuration (Storage)

Check `storage.rules` en `cors.json` deployed correct.

**Test CORS:**
```bash
curl -H "Origin: https://buurtapp-v3-4.web.app" \
  -H "Access-Control-Request-Method: GET" \
  https://firebasestorage.googleapis.com/...
```

---

## 📈 Performance Optimization Tips

### Build Optimization

**Check bundle size:**
```bash
npm run build

# Output toont file sizes
# dist/assets/index-[hash].js - [size]
```

**If bundle too large (>500KB):**
1. Code splitting (lazy loading routes)
2. Remove unused dependencies
3. Tree-shaking check

**Analyze bundle:**
```bash
npm install -g webpack-bundle-analyzer
# Or use Vite's rollup-plugin-visualizer
```

### Image Optimization

```bash
# Compress images before deployment
# Use tools: TinyPNG, ImageOptim, etc.

# Or: Serve via Firebase Storage with resize on upload
```

### Caching Strategy

**Firebase Hosting auto-caches:**
- `index.html` - No cache
- `assets/*` - 1 year cache (hash-based)

**Custom caching (firebase.json):**
```json
{
  "hosting": {
    "headers": [
      {
        "source": "/assets/**",
        "headers": [{
          "key": "Cache-Control",
          "value": "max-age=31536000"
        }]
      }
    ]
  }
}
```

---

## 🚨 Troubleshooting Deployment Issues

### Issue 1: "Build fails with TypeScript errors"

**Oplossing:**
```bash
# Check errors
npm run build

# Fix TypeScript errors in code
# Common: type mismatches, missing properties

# Re-build
npm run build
```

### Issue 2: "Firebase deploy hangs"

**Oplossing:**
```bash
# Cancel (Ctrl+C)
# Check internet connection
# Re-login
firebase logout
firebase login

# Try again
firebase deploy --only hosting
```

### Issue 3: "App shows blank page after deploy"

**Oorzaak:** Vaak routing issue (HashRouter vs BrowserRouter)

**Oplossing:**
1. Check `firebase.json` heeft `"rewrites"` voor SPA:
```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

2. Check `index.html` loads in browser console - kijk naar 404s

### Issue 4: "Firebase rules deny all requests"

**Oplossing:**
```bash
# Check rules deployed
firebase deploy --only firestore:rules

# Test rules in Firebase Console:
# Firestore → Rules → Simulator
```

### Issue 5: "Environment variables not working"

**Oorzaak:** Build time vs runtime confusion

**Oplossing:**
- `VITE_*` vars zijn build-time only
- Rebuild after changing .env.local
- For runtime vars → use Cloud Functions config

---

## 📅 Deployment Schedule Best Practices

### Development Workflow

```
Feature Development (local)
    ↓
Test with Emulators
    ↓
Code Review (if team)
    ↓
Merge to main branch
    ↓
Deploy to Staging (optional)
    ↓
Test on staging
    ↓
Deploy to Production
    ↓
Smoke tests
    ↓
Monitor for 24h
```

### Deployment Frequency

**Suggested:**
- **Hotfixes:** Immediately
- **Minor updates:** Daily (off-peak hours)
- **Major features:** Weekly (after thorough testing)
- **Breaking changes:** Plan maintenance window, notify users

### Rollback Readiness

- Keep previous build accessible
- Document rollback procedure
- Test rollback process quarterly
- Have contact for Firebase support

---

## ✅ Deployment Checklist (Print & Use)

**Pre-Deploy:**
- [ ] Code lints clean
- [ ] Build succeeds
- [ ] Local testing passed
- [ ] Git committed & pushed
- [ ] .env.local up to date

**Deploy Steps:**
- [ ] `npm run build`
- [ ] `npm run preview` (quick test)
- [ ] `firebase deploy --only firestore:rules` (if changed)
- [ ] `firebase deploy --only storage:rules` (if changed)
- [ ] `firebase deploy --only functions` (if changed)
- [ ] `firebase deploy --only hosting`

**Post-Deploy:**
- [ ] Open production URL
- [ ] Login test
- [ ] Critical features test
- [ ] Check browser console (no errors)
- [ ] Mobile test (quick)
- [ ] Lighthouse audit (if major change)
- [ ] Check Firebase Console (Firestore, Auth, Storage)

**Monitor:**
- [ ] Check logs first 30 min
- [ ] User feedback channel
- [ ] Performance metrics (24h)

---

## 📞 Emergency Contacts

**Firebase Support:**
- Console: https://console.firebase.google.com/
- Support: https://firebase.google.com/support

**Rollback Command:**
```bash
firebase hosting:rollback
```

**Status Page:**
- https://status.firebase.google.com/

---

## 📚 Additional Resources

- Firebase Hosting Docs: https://firebase.google.com/docs/hosting
- Vite Build Optimization: https://vitejs.dev/guide/build.html
- Lighthouse: https://developers.google.com/web/tools/lighthouse

---

**Average Deployment Time:**
- Hosting only: ~2 min
- Full deploy (rules + functions + hosting): ~10 min

**Deployment Frequency (BuurtApp):**
[Update met actual deployment stats na verloop van tijd]

Succes met deployen! 🚀
