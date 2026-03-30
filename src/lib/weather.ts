// ============================================================================
// Weather Service
// Supports Open-Meteo (free, no auth) and OpenWeather (with API key) providers
// ============================================================================

export interface WeatherData {
  temperature: number
  feelsLike?: number
  humidity?: number
  description: string
  icon?: string
  windSpeed?: number
  rain: boolean
  rainVolume?: number
  condition: 'CLEAR' | 'CLOUDY' | 'RAINY' | 'STORMY' | 'FOGGY'
}

export interface HistoricalWeatherData {
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
 * Maps a WMO weather code to condition enum value.
 * Returns: CLEAR | CLOUDY | RAINY | STORMY | FOGGY
 */
export function wmoCodeToWeatherCondition(code: number): 'CLEAR' | 'CLOUDY' | 'RAINY' | 'STORMY' | 'FOGGY' {
  if (code === 0 || code === 1) return 'CLEAR'
  if (code === 2 || code === 3) return 'CLOUDY'
  if (code === 45 || code === 48) return 'FOGGY'
  if (code >= 51 && code <= 67) return 'RAINY'
  if (code >= 71 && code <= 77) return 'CLOUDY' // Snow
  if (code >= 80 && code <= 82) return 'RAINY'
  if (code === 95 || code === 96 || code === 99) return 'STORMY'
  return 'CLOUDY'
}

/**
 * Maps OpenWeather code to condition enum value
 */
function openWeatherCodeToCondition(code: number, description: string): 'CLEAR' | 'CLOUDY' | 'RAINY' | 'STORMY' | 'FOGGY' {
  const mainLower = description.toLowerCase()

  if (code >= 200 && code < 300) return 'STORMY' // Thunderstorm
  if (code >= 300 && code < 400) return 'RAINY'  // Drizzle
  if (code >= 500 && code < 600) return 'RAINY'  // Rain
  if (code >= 600 && code < 700) return 'RAINY'  // Snow
  if (code >= 700 && code < 800) {              // Atmosphere
    if (mainLower.includes('fog') || mainLower.includes('mist')) return 'FOGGY'
    return 'CLOUDY'
  }
  if (code === 800) return 'CLEAR'              // Clear
  if (code === 801 || code === 802) return 'CLOUDY' // Few/Scattered clouds
  return 'CLOUDY'                               // Broken clouds
}

class WeatherService {
  private openWeatherApiKey: string | null
  private openMeteoEnabled: boolean

  constructor() {
    this.openWeatherApiKey = process.env.OPENWEATHER_API_KEY || null
    this.openMeteoEnabled = true // Open-Meteo is free and doesn't require auth
  }

  get isConfigured(): boolean {
    return this.openWeatherApiKey !== null || this.openMeteoEnabled
  }

  // ============================================================================
  // CURRENT WEATHER
  // ============================================================================

  async getCurrentWeather(lat: number, lon: number): Promise<WeatherData | null> {
    // Try OpenWeather first if configured
    if (this.openWeatherApiKey) {
      try {
        return await this.getCurrentWeatherOpenWeather(lat, lon)
      } catch (error) {
        console.warn('[Weather] OpenWeather failed, falling back to Open-Meteo:', error)
      }
    }

    // Fall back to Open-Meteo
    if (this.openMeteoEnabled) {
      try {
        return await this.getCurrentWeatherOpenMeteo(lat, lon)
      } catch (error) {
        console.error('[Weather] Open-Meteo error:', error)
      }
    }

    return null
  }

  private async getCurrentWeatherOpenWeather(lat: number, lon: number): Promise<WeatherData> {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.openWeatherApiKey}&units=metric&lang=pt_br`
    const response = await fetch(url)

    if (!response.ok) throw new Error(`OpenWeather API error: ${response.status}`)

    const data = await response.json() as {
      main: { temp: number; feels_like: number; humidity: number }
      weather: Array<{ main: string; description: string; icon: string }>
      wind: { speed: number }
      rain: { '1h'?: number; '3h'?: number }
    }

    const mainWeather = data.weather?.[0]?.main?.toLowerCase() || ''
    const description = data.weather?.[0]?.description || ''

    let condition: WeatherData['condition'] = 'CLEAR'
    if (mainWeather.includes('rain') || mainWeather.includes('drizzle')) condition = 'RAINY'
    else if (mainWeather.includes('thunder') || mainWeather.includes('storm')) condition = 'STORMY'
    else if (mainWeather.includes('cloud') || mainWeather.includes('overcast')) condition = 'CLOUDY'
    else if (mainWeather.includes('fog') || mainWeather.includes('mist')) condition = 'FOGGY'

    return {
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      description,
      icon: data.weather?.[0]?.icon,
      windSpeed: data.wind?.speed || 0,
      rain: condition === 'RAINY' || condition === 'STORMY',
      rainVolume: data.rain?.['1h'] || data.rain?.['3h'] || 0,
      condition
    }
  }

  private async getCurrentWeatherOpenMeteo(lat: number, lon: number): Promise<WeatherData> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=America/Sao_Paulo`
    const response = await fetch(url)

    if (!response.ok) throw new Error(`Open-Meteo API error: ${response.status}`)

    const data = await response.json() as {
      current: {
        temperature_2m: number
        apparent_temperature: number
        relative_humidity_2m: number
        precipitation: number
        weather_code: number
        wind_speed_10m: number
      }
    }

    const weatherCode = data.current.weather_code
    const condition = wmoCodeToWeatherCondition(weatherCode)
    const description = getWeatherCondition(weatherCode)

    return {
      temperature: Math.round(data.current.temperature_2m),
      feelsLike: Math.round(data.current.apparent_temperature),
      humidity: data.current.relative_humidity_2m,
      description,
      windSpeed: data.current.wind_speed_10m,
      rain: ['RAINY', 'STORMY'].includes(condition),
      rainVolume: data.current.precipitation,
      condition
    }
  }

  // ============================================================================
  // CITY-BASED LOOKUP
  // ============================================================================

  async getWeatherForCity(city: string, state?: string): Promise<WeatherData | null> {
    try {
      const query = state ? `${city},${state},BR` : `${city},BR`
      const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${this.openWeatherApiKey}`
      const geoRes = await fetch(geoUrl)
      const geoData = await geoRes.json() as Array<{ lat: number; lon: number }>

      if (!geoData?.[0]) {
        // Try Open-Meteo geocoding
        return await this.getWeatherForCityOpenMeteo(city, state)
      }

      return this.getCurrentWeather(geoData[0].lat, geoData[0].lon)
    } catch {
      return null
    }
  }

  private async getWeatherForCityOpenMeteo(city: string, state?: string): Promise<WeatherData | null> {
    const query = state ? `${city}, ${state}, Brazil` : `${city}, Brazil`
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&language=pt&limit=1`

    try {
      const geoRes = await fetch(geoUrl)
      const geoData = await geoRes.json() as { results?: Array<{ latitude: number; longitude: number }> }

      if (!geoData?.results?.[0]) return null
      const { latitude, longitude } = geoData.results[0]
      return this.getCurrentWeather(latitude, longitude)
    } catch {
      return null
    }
  }

  // ============================================================================
  // HISTORICAL/FORECAST DATA
  // ============================================================================

  async fetchWeatherForDate(
    lat: number,
    lng: number,
    date: string // YYYY-MM-DD
  ): Promise<HistoricalWeatherData | null> {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=America/Sao_Paulo&start_date=${date}&end_date=${date}`
      const res = await fetch(url)
      if (!res.ok) return null
      const data = await res.json() as {
        daily: {
          temperature_2m_max: number[]
          temperature_2m_min: number[]
          precipitation_sum: number[]
          weathercode: number[]
        }
      }
      if (data.daily?.weathercode?.[0] === undefined) return null

      const code = data.daily.weathercode[0]!
      return {
        tempMax: Math.round(data.daily.temperature_2m_max[0] ?? 0),
        tempMin: Math.round(data.daily.temperature_2m_min[0] ?? 0),
        precipitation: data.daily.precipitation_sum[0] ?? 0,
        condition: getWeatherCondition(code),
        conditionCode: code,
      }
    } catch (error) {
      console.error('[Weather] Error fetching historical data:', error)
      return null
    }
  }
}

export const weatherService = new WeatherService()

// Export legacy function for backward compatibility
export async function fetchWeatherForDate(
  lat: number,
  lng: number,
  date: string
): Promise<HistoricalWeatherData | null> {
  return weatherService.fetchWeatherForDate(lat, lng, date)
}
