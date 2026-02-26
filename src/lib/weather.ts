export interface WeatherData {
  tempMax: number
  tempMin: number
  precipitation: number
  condition: string
  conditionCode: number
}

const WMO_CODES: Record<number, string> = {
  0: 'Céu limpo',
  1: 'Principalmente limpo',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Nevoeiro',
  48: 'Nevoeiro com geada',
  51: 'Garoa fraca',
  53: 'Garoa moderada',
  55: 'Garoa forte',
  61: 'Chuva fraca',
  63: 'Chuva moderada',
  65: 'Chuva forte',
  71: 'Neve fraca',
  73: 'Neve moderada',
  75: 'Neve forte',
  80: 'Pancadas de chuva',
  81: 'Pancadas fortes',
  82: 'Chuva torrencial',
  95: 'Tempestade',
  96: 'Tempestade com granizo',
  99: 'Tempestade com granizo forte',
}

export function getWeatherCondition(code: number): string {
  return WMO_CODES[code] ?? `Código ${code}`
}

/**
 * Maps a WMO weather code to the Prisma WeatherCondition enum value.
 * WeatherCondition: SUNNY | CLOUDY | RAINY | STORMY | WINDY
 */
export function wmoCodeToWeatherCondition(code: number): string {
  if (code === 0 || code === 1) return 'SUNNY'
  if (code === 2 || code === 3 || code === 45 || code === 48) return 'CLOUDY'
  if (code >= 51 && code <= 67) return 'RAINY'
  if (code >= 80 && code <= 82) return 'RAINY'
  if (code === 95 || code === 96 || code === 99) return 'STORMY'
  if (code >= 71 && code <= 77) return 'CLOUDY' // Snow – closest to cloudy
  return 'CLOUDY'
}

export async function fetchWeatherForDate(
  lat: number,
  lng: number,
  date: string // YYYY-MM-DD
): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=America/Sao_Paulo&start_date=${date}&end_date=${date}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.daily?.weathercode?.[0] && data.daily?.weathercode?.[0] !== 0) return null
    return {
      tempMax: Math.round(data.daily.temperature_2m_max[0] ?? 0),
      tempMin: Math.round(data.daily.temperature_2m_min[0] ?? 0),
      precipitation: data.daily.precipitation_sum[0] ?? 0,
      condition: getWeatherCondition(data.daily.weathercode[0]),
      conditionCode: data.daily.weathercode[0],
    }
  } catch {
    return null
  }
}
