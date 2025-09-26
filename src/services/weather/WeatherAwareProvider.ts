import { WeatherProvider, WeatherContext } from '../../types/Personalization';

const WEATHER_API_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

export class WeatherAwareProvider implements WeatherProvider {
  private cache: { key: string; value: WeatherContext; expiresAt: number } | null = null;

  public async getWeather(location?: { latitude: number; longitude: number }): Promise<WeatherContext | undefined> {
    const key = location ? `${location.latitude}:${location.longitude}` : 'default';
    const now = Date.now();
    if (this.cache && this.cache.key === key && this.cache.expiresAt > now) {
      return this.cache.value;
    }

    if (!location) {
      return undefined;
    }

    try {
      const url = `${WEATHER_API_ENDPOINT}?latitude=${location.latitude}&longitude=${location.longitude}&hourly=temperature_2m,relative_humidity_2m&current_weather=true`;
      const response = await fetch(url);
      if (!response.ok) {
        return undefined;
      }
      const data = await response.json();
      const context: WeatherContext = {
        condition: data.current_weather?.weathercode ?? 'unknown',
        temperatureC: data.current_weather?.temperature,
        humidity: data.hourly?.relative_humidity_2m?.[0],
        raw: data,
      };
      this.cache = { key, value: context, expiresAt: now + 10 * 60 * 1000 };
      return context;
    } catch (error) {
      console.warn('WeatherAwareProvider: failed to fetch weather', error);
      return undefined;
    }
  }
}
