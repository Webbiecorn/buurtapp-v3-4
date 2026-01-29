import { GoogleGenerativeAI } from '@google/generative-ai';
import { Melding, Project, Urenregistratie, User, WoningDossier } from '../types';
import { format, startOfToday, startOfWeek, differenceInDays, subDays, subWeeks } from 'date-fns';
import { nl } from 'date-fns/locale';
import { getLelystadWeather } from './weatherService';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

interface DailyUpdateData {
  newMeldingen: Melding[];
  newProjects: Project[];
  newDossiers: WoningDossier[];
  todayUren: Urenregistratie[];
  completedProjects: Project[];
  resolvedMeldingen: Melding[];
  activeUsers: User[];
  allMeldingen: Melding[]; // Voor vergelijkingen
  allProjects: Project[]; // Voor vergelijkingen
  allUsers: User[]; // Voor nieuwe medewerker detectie
}

interface WeeklyUpdateData extends DailyUpdateData {
  allMeldingen: Melding[];
  allProjects: Project[];
  allUren: Urenregistratie[];
}

interface PriorityItem {
  type: 'melding' | 'project';
  id: string;
  title: string;
  reason: string;
  urgency: 'high' | 'medium';
  daysSince: number;
}

export async function generateDailyUpdate(data: DailyUpdateData, userName?: string, greeting?: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const today = startOfToday();
  const todayStr = format(today, 'EEEE d MMMM yyyy', { locale: nl });
  const greetingText = greeting || 'Goedemorgen';
  const nameText = userName || 'daar';

  // 1. WEER INFORMATIE
  const weather = await getLelystadWeather();
  const weatherText = weather
    ? `${weather.icon} **Weer in Lelystad:** ${weather.temperature}°C, ${weather.weatherDescription}. Wind: ${weather.windSpeed} km/u. ${weather.suggestion}`
    : '';

  // 2. SLIMME PRIORITEITEN DETECTIE
  const priorities = identifyPriorities(data.allMeldingen, data.allProjects);
  const prioritiesText = priorities.length > 0
    ? `\n**⚠️ Aandachtspunten:**\n${priorities.slice(0, 3).map(p =>
        `- ${p.urgency === 'high' ? '🔴' : '🟡'} ${p.type === 'melding' ? 'Melding' : 'Project'}: ${p.title} (${p.reason})`
      ).join('\n')}`
    : '';

  // 3. VERGELIJKINGEN MET VORIGE PERIODES
  const yesterday = subDays(today, 1);

  const yesterdayMeldingen = data.allMeldingen.filter(m =>
    format(m.timestamp, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')
  ).length;

  const lastWeekMeldingen = data.allMeldingen.filter(m => {
    const weekAgo = subWeeks(today, 1);
    return m.timestamp >= weekAgo && m.timestamp < today;
  }).length;

  const avgMeldingenPerDay = lastWeekMeldingen / 7;
  const comparison = data.newMeldingen.length > avgMeldingenPerDay * 1.2
    ? '📈 Meer dan gemiddeld'
    : data.newMeldingen.length < avgMeldingenPerDay * 0.8
    ? '📉 Rustiger dan gemiddeld'
    : '📊 Gemiddelde drukte';

  // 4. WIJK-FOCUS ANALYSE
  const wijkStats = [...new Set(data.allMeldingen.map(m => m.wijk))]
    .map(wijk => ({
      wijk,
      count: data.allMeldingen.filter(m => m.wijk === wijk &&
        format(m.timestamp, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')).length
    }))
    .sort((a, b) => b.count - a.count);

  const focusWijk = wijkStats[0]?.count > 0
    ? `\n**🏘️ Wijk Focus:** Meeste activiteit vandaag in ${wijkStats[0].wijk} (${wijkStats[0].count} meldingen)`
    : '';

  const quietWijken = wijkStats.filter(w => w.count === 0).map(w => w.wijk);
  const quietWijkText = quietWijken.length > 0
    ? ` • Rustig in: ${quietWijken.slice(0, 3).join(', ')}`
    : '';

  // 5. TEAM INSIGHTS & NIEUWE MEDEWERKERS (alleen vandaag aangemaakt)
  const newUsers = data.allUsers.filter(u => {
    const createdAt = (u as any).createdAt;
    if (!createdAt) return false;
    const userDate = createdAt instanceof Date ? createdAt : new Date(createdAt);
    return format(userDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'); // Alleen vandaag
  });

  const newUserWelcome = newUsers.length > 0
    ? `\n\n**👋 Welkom nieuwe teamleden!**\n${newUsers.map(u => `- ${u.name} (${u.role})`).join('\n')}\nWe heten jullie van harte welkom in het team!`
    : '';

  const totalHoursToday = data.todayUren.reduce((acc, u) => {
    if (u.eind) {
      const start = u.start instanceof Date ? u.start : new Date(u.start);
      const end = u.eind instanceof Date ? u.eind : new Date(u.eind);
      return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }
    return acc;
  }, 0);

  const teamMotivation = data.activeUsers.length > 0
    ? `\n**👥 Team vandaag:** ${data.activeUsers.length} medewerker${data.activeUsers.length > 1 ? 's' : ''} actief${totalHoursToday > 0 ? ` (${totalHoursToday.toFixed(1)} uur geregistreerd)` : ''}`
    : '';

  const prompt = `Je bent een AI-assistent voor een buurtconciërge app die dagelijkse updates genereert.

**Gebruiker: ${nameText}**
**Begroeting: ${greetingText}**
**Vandaag is ${todayStr}**

${weatherText}

**📊 Activiteiten Vandaag:**
- 📝 Nieuwe meldingen: ${data.newMeldingen.length} (${comparison})
${data.newMeldingen.length > 0 ? `  Categorieën: ${[...new Set(data.newMeldingen.map(m => m.categorie))].join(', ')}` : ''}
- 🚀 Nieuwe projecten: ${data.newProjects.length}
- ✅ Opgeloste meldingen: ${data.resolvedMeldingen.length}
- 🎉 Afgeronde projecten: ${data.completedProjects.length}

${focusWijk}${quietWijkText}

${teamMotivation}
${prioritiesText}
${newUserWelcome}

**Context & Vergelijkingen:**
- Gisteren: ${yesterdayMeldingen} meldingen
- Gemiddeld deze week: ${avgMeldingenPerDay.toFixed(1)} meldingen per dag
- Vandaag: ${data.newMeldingen.length} meldingen ${comparison}

Geef een **korte, persoonlijke en motiverende** dagelijkse update in het Nederlands speciaal voor ${nameText}.

**Instructies:**
1. Begin met persoonlijke begroeting (${greetingText} ${nameText}) en weer-context
2. Geef een korte, positieve samenvatting van de dag
3. Noem belangrijkste cijfers en vergelijking met gemiddelde
4. Als er prioriteiten zijn, noem kort de 1-2 belangrijkste
5. Zo relevant: welkom nieuwe teamleden hartelijk
6. Eindig met een motiverende opmerking, praktische tip, of positieve noot voor vandaag

**Stijl:**
- Persoonlijk en direct (spreek ${nameText} aan)
- Gebruik emojis om het levendiger te maken
- Bondig (max 120 woorden)
- Positief en motiverend
- Praktisch en actionable
- Focus op het werk en de resultaten, geen persoonlijke complimenten

Focus op: hoogtepunten, context, en wat aandacht verdient vandaag.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating daily update:', error);

    // Fallback response met nieuwe features
    let fallback = `${greetingText} ${nameText}! 📊\n\n`;

    if (weather) {
      fallback += `${weather.icon} ${weather.temperature}°C in Lelystad. ${weather.suggestion}\n\n`;
    }

    fallback += `**Vandaag:**\n`;
    fallback += `- ${data.newMeldingen.length} nieuwe melding(en) ${comparison}\n`;

    if (data.newMeldingen.length > 0 || data.newProjects.length > 0) {
      fallback += `- ${data.newProjects.length} nieuw(e) project(en)\n`;
    }

    if (data.completedProjects.length > 0) {
      fallback += `\n🎉 ${data.completedProjects.length} project(en) afgerond!\n`;
    }

    if (priorities.length > 0) {
      fallback += `\n⚠️ Let op: ${priorities[0].title} (${priorities[0].reason})\n`;
    }

    if (focusWijk) {
      fallback += focusWijk + '\n';
    }

    if (newUsers.length > 0) {
      fallback += `\n👋 Welkom ${newUsers.map(u => u.name).join(' en ')}!\n`;
    }

    fallback += `\n\n💪 Succes vandaag, ${nameText}!`;

    return fallback;
  }
}

// Generate weekly update with trends
export async function generateWeeklyUpdate(data: DailyUpdateData): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const today = startOfToday();
  const weekStart = startOfWeek(today, { locale: nl });
  const weekStr = format(weekStart, 'd MMMM', { locale: nl }) + ' - ' + format(today, 'd MMMM yyyy', { locale: nl });

  const prompt = `Je bent een AI-assistent voor een buurtconciërge app die wekelijkse updates genereert.

**Week van ${weekStr}**

**Deze week:**
- 📝 Nieuwe meldingen: ${data.newMeldingen.length}
- 🚀 Nieuwe projecten: ${data.newProjects.length}
- ✅ Afgeronde projecten: ${data.completedProjects.length}
- ⏱️ Urenregistraties: ${data.todayUren.length}

**Top wijken met activiteit:**
${[...new Set(data.allMeldingen.map(m => m.wijk))]
  .map(wijk => ({
    wijk,
    count: data.allMeldingen.filter(m => m.wijk === wijk).length
  }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 3)
  .map(w => `- ${w.wijk}: ${w.count} meldingen`)
  .join('\n')}

**Meest voorkomende categorieën:**
${[...new Set(data.allMeldingen.map(m => m.categorie))]
  .map(cat => ({
    cat,
    count: data.allMeldingen.filter(m => m.categorie === cat).length
  }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 3)
  .map(c => `- ${c.cat}: ${c.count} meldingen`)
  .join('\n')}

Geef een wekelijkse samenvatting in het Nederlands. Gebruik emojis. Focus op:
1. Belangrijkste trends deze week
2. Prestaties van het team
3. Aanbevelingen voor volgende week

Houd het bondig (max 200 woorden).`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating weekly update:', error);
    return `📅 **Wekelijkse Update**\n\nDeze week: ${data.newMeldingen.length} meldingen, ${data.newProjects.length} projecten. Goed bezig team! 💪`;
  }
}

// Identify priority items that need attention
export function identifyPriorities(meldingen: Melding[], projecten: Project[]): PriorityItem[] {
  const priorities: PriorityItem[] = [];
  const today = new Date();

  // High priority: Meldingen in behandeling ouder dan 7 dagen
  meldingen
    .filter(m => m.status === 'In behandeling')
    .forEach(m => {
      const daysSince = differenceInDays(today, m.timestamp);
      if (daysSince >= 7) {
        priorities.push({
          type: 'melding',
          id: m.id,
          title: m.omschrijving.substring(0, 50) + '...',
          reason: `${daysSince} dagen in behandeling`,
          urgency: daysSince >= 14 ? 'high' : 'medium',
          daysSince,
        });
      }
    });

  // High priority: Lopende projecten zonder recente updates
  projecten
    .filter(p => p.status === 'Lopend')
    .filter(p => !p.title.includes('Jolande Wold 17-10')) // Exclusief specifiek oud project
    .filter(p => !p.title.toLowerCase().includes('coloriet')) // Exclusief Coloriet projecten
    .forEach(p => {
      const daysSince = differenceInDays(today, p.startDate);
      if (daysSince >= 30) {
        priorities.push({
          type: 'project',
          id: p.id,
          title: p.title,
          reason: `Al ${daysSince} dagen actief zonder afronden`,
          urgency: daysSince >= 60 ? 'high' : 'medium',
          daysSince,
        });
      }
    });

  // Sorteer op urgency en dan op daysSince
  return priorities.sort((a, b) => {
    if (a.urgency !== b.urgency) {
      return a.urgency === 'high' ? -1 : 1;
    }
    return b.daysSince - a.daysSince;
  }).slice(0, 5); // Top 5 prioriteiten
}

