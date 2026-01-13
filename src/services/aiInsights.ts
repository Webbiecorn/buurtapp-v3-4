import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Melding, Project, Urenregistratie } from '../types';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export interface StatisticsData {
  meldingen: Melding[];
  projecten: Project[];
  urenregistraties: Urenregistratie[];
  period: {
    current: { start: Date; end: Date };
    previous: { start: Date; end: Date };
  };
}

export interface AIInsight {
  type: 'trend' | 'warning' | 'success' | 'info';
  title: string;
  description: string;
  confidence: number;
  priority: number; // Higher = more important
}

export async function generateInsights(data: StatisticsData): Promise<AIInsight[]> {
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not configured');
    return [];
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Prepare statistics summary
    const currentMeldingen = data.meldingen.filter(
      m => m.timestamp >= data.period.current.start && m.timestamp <= data.period.current.end
    );
    const previousMeldingen = data.meldingen.filter(
      m => m.timestamp >= data.period.previous.start && m.timestamp <= data.period.previous.end
    );

    const currentProjecten = data.projecten.filter(
      p => p.startDate >= data.period.current.start && p.startDate <= data.period.current.end
    );
    const previousProjecten = data.projecten.filter(
      p => p.startDate >= data.period.previous.start && p.startDate <= data.period.previous.end
    );

    const meldingenPerWijk = currentMeldingen.reduce((acc, m) => {
      acc[m.wijk] = (acc[m.wijk] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const meldingenPerCategorie = currentMeldingen.reduce((acc, m) => {
      acc[m.categorie] = (acc[m.categorie] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const prompt = `Je bent een data-analist voor een buurtconciërge-app. Analyseer de volgende statistieken en genereer maximaal 3 belangrijke inzichten in het Nederlands.

HUIDIGE PERIODE:
- Aantal meldingen: ${currentMeldingen.length}
- Aantal projecten gestart: ${currentProjecten.length}
- Meldingen per wijk: ${JSON.stringify(meldingenPerWijk)}
- Meldingen per categorie: ${JSON.stringify(meldingenPerCategorie)}

VORIGE PERIODE:
- Aantal meldingen: ${previousMeldingen.length}
- Aantal projecten gestart: ${previousProjecten.length}

Genereer inzichten in het volgende JSON formaat (geef ALLEEN de JSON array terug, geen extra tekst):
[
  {
    "type": "trend|warning|success|info",
    "title": "Korte titel (max 50 tekens)",
    "description": "Duidelijke beschrijving (max 150 tekens)",
    "confidence": 0-100,
    "priority": 1-10
  }
]

Focus op:
1. Significante veranderingen (>20% verschil)
2. Opvallende patronen in wijken of categorieën
3. Aanbevelingen voor actie

Gebruik:
- type "trend" voor significante veranderingen
- type "warning" voor zorgen/problemen
- type "success" voor positieve ontwikkelingen
- type "info" voor neutrale observaties

Zorg dat de inzichten praktisch en actionable zijn.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response:', text);
      return [];
    }

    const insights: AIInsight[] = JSON.parse(jsonMatch[0]);
    
    // Sort by priority and return top 3
    return insights
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);

  } catch (error) {
    console.error('Error generating AI insights:', error);
    return [];
  }
}

// Fallback insights when AI is not available
export function getFallbackInsights(data: StatisticsData): AIInsight[] {
  const insights: AIInsight[] = [];

  const currentMeldingen = data.meldingen.filter(
    m => m.timestamp >= data.period.current.start && m.timestamp <= data.period.current.end
  );
  const previousMeldingen = data.meldingen.filter(
    m => m.timestamp >= data.period.previous.start && m.timestamp <= data.period.previous.end
  );

  // Calculate change percentage
  const changePercent = previousMeldingen.length === 0
    ? (currentMeldingen.length > 0 ? 100 : 0)
    : ((currentMeldingen.length - previousMeldingen.length) / previousMeldingen.length) * 100;

  if (Math.abs(changePercent) >= 20) {
    insights.push({
      type: changePercent > 0 ? 'warning' : 'success',
      title: changePercent > 0 ? 'Stijging in meldingen' : 'Daling in meldingen',
      description: `${Math.abs(changePercent).toFixed(0)}% ${changePercent > 0 ? 'meer' : 'minder'} meldingen vergeleken met vorige periode`,
      confidence: 90,
      priority: 9,
    });
  }

  // Find busiest wijk
  const meldingenPerWijk = currentMeldingen.reduce((acc, m) => {
    acc[m.wijk] = (acc[m.wijk] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const busiestWijk = Object.entries(meldingenPerWijk).sort((a, b) => b[1] - a[1])[0];
  if (busiestWijk && busiestWijk[1] > currentMeldingen.length * 0.3) {
    insights.push({
      type: 'info',
      title: `${busiestWijk[0]} heeft meeste meldingen`,
      description: `${busiestWijk[1]} meldingen (${((busiestWijk[1] / currentMeldingen.length) * 100).toFixed(0)}% van totaal)`,
      confidence: 95,
      priority: 7,
    });
  }

  return insights.slice(0, 3);
}
