'use client'
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { fetchWeatherForDate, HistoricalWeatherData } from '@/lib/weather'

interface WeatherDisplayProps {
  date: string       // YYYY-MM-DD
  latitude: number
  longitude: number
  onWeatherLoaded?: (weather: HistoricalWeatherData) => void
}

export function WeatherDisplay({ date, latitude, longitude, onWeatherLoaded }: WeatherDisplayProps) {
  const [weather, setWeather] = useState<HistoricalWeatherData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!date || !latitude || !longitude) return
    setLoading(true)
    fetchWeatherForDate(latitude, longitude, date).then(w => {
      setWeather(w)
      if (w) onWeatherLoaded?.(w)
    }).finally(() => setLoading(false))
  }, [date, latitude, longitude, onWeatherLoaded])

  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" /> Buscando clima...
    </div>
  )
  if (!weather) return null

  return (
    <div className="flex flex-wrap gap-2 items-center text-sm">
      <Badge variant="secondary">Temp: {weather.tempMin}°C – {weather.tempMax}°C</Badge>
      <Badge variant="secondary">{weather.condition}</Badge>
      {weather.precipitation > 0 && (
        <Badge variant="destructive">Chuva: {weather.precipitation}mm</Badge>
      )}
    </div>
  )
}
