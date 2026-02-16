# TypeScript Strict Mode Cleanup Plan

**Status:** Strict mode is enabled in `tsconfig.json`, maar de codebase heeft ~482 errors (vooral @typescript-eslint/no-explicit-any warnings).

## Huidige Situatie

### Error Breakdown
- **ECharts params**: ~30 instances van `(params: any)` in formatter/callback functies
- **Firestore data**: ~15 instances van `doc.data() as any`
- **Type assertions**: ~20 instances van `as any` in event handlers
- **Generic types**: `type Registratie = any` en soortgelijke
- **Tailwind CSS warnings**: ~50 deprecated class names

## Cleanup Strategie

### Phase 1: Type Definitions (Hoge Prioriteit)

#### 1.1 ECharts Types
**Bestand:** `src/types/echarts.ts` (nieuw)
```typescript
// ECharts formatter params types
export interface EChartsFormatterParams {
  name: string;
  value: number | number[];
  dataIndex: number;
  seriesName?: string;
  data?: any; // ECharts internal
  color?: string;
}

export interface ECharts3DFormatterParams extends EChartsFormatterParams {
  value: [number, number, number];
}
```

**Impact:** ~30 fixes in StatisticsPage.tsx, DashboardPage.tsx

#### 1.2 Firestore Document Types
**Bestand:** `src/types/firestore.ts` (nieuw)
```typescript
import { Timestamp } from 'firebase/firestore';

// Helper om Firestore data te typen
export interface FirestoreDocument {
  id: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface FirestoreMelding extends FirestoreDocument {
  titel: string;
  omschrijving: string;
  status: string;
  // ... rest van fields
}
```

**Impact:** ~15 fixes voor `doc.data() as any`

#### 1.3 Achterpad Types
**Bestand:** `src/types.ts` (toevoegen)
```typescript
export interface AchterpadRegistratie {
  id: string;
  wijk: string;
  type?: string;
  typePad?: string;
  registeredBy?: {
    userName?: string;
    userRole?: string;
  };
  timestamp: Date;
  // ... andere fields
}
```

**Impact:** ~10 fixes in AchterpadenStats.tsx

### Phase 2: Event Handler Types (Medium Prioriteit)

#### 2.1 React Event Types
Vervang:
```typescript
onChange={e => setStatus(e.target.value as any)}
```

Met:
```typescript
onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
  setStatus(e.target.value as MeldingStatus)
}
```

**Impact:** ~20 fixes
**Tijd:** ~30 min

### Phase 3: Tailwind CSS Updates (Lage Prioriteit)

Deprecated classes vervangen:
- `bg-gradient-to-r` → `bg-linear-to-r`
- `flex-shrink-0` → `shrink-0`
- `h-[300px]` → `h-75`

**Impact:** ~50 warnings (geen runtime effect)
**Tijd:** ~45 min met find/replace

### Phase 4: Unknown/Catch Block Types (Medium Prioriteit)

Vervang:
```typescript
} catch (err: any) {
  setError(err.message);
}
```

Met:
```typescript
} catch (err) {
  const error = err instanceof Error ? err : new Error('Unknown error');
  setError(error.message);
}
```

**Impact:** ~25 fixes
**Tijd:** ~1 uur

## Implementatie Volgorde

1. **Week 1:** ECharts types (grootste impact, 30+ fixes)
2. **Week 2:** Firestore document types (15+ fixes)
3. **Week 3:** Event handler types (20+ fixes)
4. **Week 4:** Achterpad types + error handling (35+ fixes)
5. **Week 5:** Tailwind CSS cleanup (50+ fixes)

## Voortgang Tracking

| Category       | Total     | Fixed | Remaining |
| -------------- | --------- | ----- | --------- |
| ECharts params | ~30       | 0     | 30        |
| Firestore data | ~15       | 0     | 15        |
| Event handlers | ~20       | 0     | 20        |
| Generic types  | ~10       | 0     | 10        |
| Error handling | ~25       | 0     | 25        |
| Tailwind CSS   | ~50       | 0     | 50        |
| **TOTAAL**     | **~150*** | **0** | **150**   |

*Exclusief duplicaten en minder kritieke warnings

## Quick Wins (Optioneel)

Voor directe impact zonder grote refactor:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = doc.data() as any;
```

**Niet aanbevolen** - dit lost het probleem niet op, maar dempt de warnings. Gebruik alleen voor legacy code die snel deprecated wordt.

## Tools & Resources

- **ESLint:** Gebruik `npm run lint` om huidige errors te zien
- **TypeScript:** `tsc --noEmit` voor compile-time checks
- **VS Code:** Problems panel voor inline errors

## Notes

- Strict mode is **enabled** - dit is goed! Het voorkomt nieuwe 'any' types.
- Build succeeds ondanks errors - Vite gebruikt alleen type checking in VS Code, niet in build.
- Prioriteer runtime errors (undefined access) boven linter warnings.

## Volgende Stappen

1. Create `src/types/echarts.ts` met ECharts types
2. Update StatisticsPage.tsx formatters (top 10 meest gebruikte)
3. Create `src/types/firestore.ts` met document helpers
4. Update DashboardPage.tsx en IssuesPage.tsx Firestore calls

---

**Laatst bijgewerkt:** 16 februari 2026
**Geschatte tijd voor volledige cleanup:** 15-20 uur
