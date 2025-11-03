/**
 * Weather Service - OpenMeteo API Integration
 * Gratis weer API zonder API key voor Lelystad
 */

interface WeatherData {
  temperature: number;
  weatherCode: number;
  weatherDescription: string;
  windSpeed: number;
  precipitationProbability: number;
  suggestion: string;
  icon: string;
}

// Lelystad coördinaten
const LELYSTAD_LAT = 52.5084;
const LELYSTAD_LON = 5.4750;

/**
 * Haalt actuele weer informatie op voor Lelystad
 */
export async function getLelystadWeather(): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LELYSTAD_LAT}&longitude=${LELYSTAD_LON}&current=temperature_2m,weather_code,wind_speed_10m,precipitation_probability&timezone=Europe/Amsterdam&forecast_days=1`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Weather API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    const current = data.current;
    
    const weatherCode = current.weather_code;
    const temperature = Math.round(current.temperature_2m);
    const windSpeed = Math.round(current.wind_speed_10m);
    const precipitationProbability = current.precipitation_probability || 0;
    
    const weatherInfo = getWeatherDescription(weatherCode);
    const suggestion = getWeatherSuggestion(weatherCode, temperature, windSpeed, precipitationProbability);
    
    return {
      temperature,
      weatherCode,
      weatherDescription: weatherInfo.description,
      windSpeed,
      precipitationProbability,
      suggestion,
      icon: weatherInfo.icon,
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    return null;
  }
}

/**
 * WMO Weather interpretation codes
 * https://open-meteo.com/en/docs
 */
function getWeatherDescription(code: number): { description: string; icon: string } {
  const weatherCodes: Record<number, { description: string; icon: string }> = {
    0: { description: 'Helder', icon: '☀️' },
    1: { description: 'Overwegend helder', icon: '🌤️' },
    2: { description: 'Gedeeltelijk bewolkt', icon: '⛅' },
    3: { description: 'Bewolkt', icon: '☁️' },
    45: { description: 'Mist', icon: '🌫️' },
    48: { description: 'Rijpmist', icon: '🌫️' },
    51: { description: 'Lichte motregen', icon: '🌦️' },
    53: { description: 'Motregen', icon: '🌦️' },
    55: { description: 'Dichte motregen', icon: '🌧️' },
    61: { description: 'Lichte regen', icon: '🌧️' },
    63: { description: 'Regen', icon: '🌧️' },
    65: { description: 'Zware regen', icon: '⛈️' },
    71: { description: 'Lichte sneeuw', icon: '🌨️' },
    73: { description: 'Sneeuw', icon: '❄️' },
    75: { description: 'Zware sneeuw', icon: '❄️' },
    77: { description: 'Sneeuwkorrels', icon: '❄️' },
    80: { description: 'Lichte buien', icon: '🌦️' },
    81: { description: 'Buien', icon: '🌧️' },
    82: { description: 'Zware buien', icon: '⛈️' },
    85: { description: 'Lichte sneeuwbuien', icon: '🌨️' },
    86: { description: 'Sneeuwbuien', icon: '❄️' },
    95: { description: 'Onweer', icon: '⛈️' },
    96: { description: 'Onweer met hagel', icon: '⛈️' },
    99: { description: 'Zwaar onweer met hagel', icon: '⛈️' },
  };
  
  return weatherCodes[code] || { description: 'Onbekend', icon: '🌡️' };
}

/**
 * Geeft praktische suggesties op basis van het weer
 */
function getWeatherSuggestion(
  code: number,
  temp: number,
  wind: number,
  precipChance: number
): string {
  const suggestions: string[] = [];
  
  // Temperatuur suggesties
  if (temp < 0) {
    suggestions.push('🧥 Let op gladheid, neem extra tijd voor wijkrondes');
  } else if (temp < 5) {
    suggestions.push('🧥 Kleed je warm aan voor buitenwerk');
  } else if (temp > 25) {
    suggestions.push('☀️ Ideaal weer voor buitenprojecten! Denk aan water');
  } else if (temp >= 15 && temp <= 22) {
    suggestions.push('👌 Perfect weer voor een wijkronde');
  }
  
  // Neerslag suggesties
  if (precipChance > 70 || code >= 61) {
    suggestions.push('☔ Paraplu niet vergeten!');
  } else if (precipChance > 40) {
    suggestions.push('🌂 Kans op regen, misschien een paraplu meenemen');
  }
  
  // Wind suggesties
  if (wind > 40) {
    suggestions.push('💨 Storm waarschuwing - check voor losse objecten in wijken');
  } else if (wind > 25) {
    suggestions.push('🌬️ Flinke wind - pas op met ladders en hoog werk');
  }
  
  // Onweer
  if (code >= 95) {
    suggestions.push('⛈️ Onweer verwacht - wees voorzichtig buiten');
  }
  
  // Sneeuw
  if (code >= 71 && code <= 86) {
    suggestions.push('❄️ Sneeuw - extra aandacht voor strooien en gladheid');
  }
  
  // Default positief bericht als er geen specifieke suggesties zijn
  if (suggestions.length === 0) {
    suggestions.push('🌤️ Prima weer om aan de slag te gaan!');
  }
  
  return suggestions[0]; // Return eerste (belangrijkste) suggestie
}
