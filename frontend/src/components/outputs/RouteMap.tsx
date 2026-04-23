import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface WeatherData {
  icon: string;
  label_ms: string;
  label_en: string;
  temperature_c: number;
  precipitation_mm: number;
  windspeed_kmh: number;
  code: number;
}

interface RouteData {
  origin: { address: string; lat: number; lng: number };
  destination: { address: string; lat: number; lng: number };
  nearest_pasar_borong: { name: string; lat: number; lng: number };
  route: {
    distance_km: number;
    duration_min: number;
    traffic_delay_min: number;
    summary: string;
  };
  weather: WeatherData | null;
  maps_url: string;
}

interface Props {
  eventLocation: string;
  language?: 'ms' | 'en';
}

export function RouteMap({ eventLocation, language = 'ms' }: Props) {
  const [data, setData] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  const t = language === 'en'
    ? {
        title: 'Supply Route & Weather',
        from: 'From',
        to: 'To',
        distance: 'Distance',
        driveTime: 'Drive Time',
        traffic: 'Traffic',
        openMap: 'Open in Bing Maps →',
        nearestPasar: 'Supply origin',
        loading: 'Calculating route…',
        noKey: 'Azure Maps not configured',
        mins: 'min',
        km: 'km',
        weather: 'Weather at venue',
        wind: 'wind',
        rain: 'rain',
      }
    : {
        title: 'Laluan Bekalan & Cuaca',
        from: 'Dari',
        to: 'Ke',
        distance: 'Jarak',
        driveTime: 'Masa Memandu',
        traffic: 'Trafik',
        openMap: 'Buka di Bing Maps →',
        nearestPasar: 'Sumber bekalan',
        loading: 'Mengira laluan…',
        noKey: 'Azure Maps tidak dikonfigurasi',
        mins: 'min',
        km: 'km',
        weather: 'Cuaca di lokasi majlis',
        wind: 'angin',
        rain: 'hujan',
      };

  useEffect(() => {
    fetch('/api/maps/config')
      .then((r) => r.json())
      .then((d) => setEnabled(d.enabled))
      .catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    if (!enabled || !eventLocation) return;
    setLoading(true);
    setError(null);

    fetch(`/api/maps/route?destination=${encodeURIComponent(eventLocation)}`)
      .then((r) => {
        if (!r.ok) throw new Error('Route fetch failed');
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError('Could not load route'); setLoading(false); });
  }, [enabled, eventLocation]);

  if (!enabled) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-400 flex items-center gap-2">
        <span>🗺️</span>
        <span>{t.noKey} — add AZURE_MAPS_KEY to .env</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white px-4 py-4 flex items-center gap-3 text-xs text-stone-500">
        <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        {t.loading}
      </div>
    );
  }

  if (error || !data) return null;

  const trafficBadge = data.route.traffic_delay_min > 10
    ? { cls: 'bg-red-100 text-red-700', label: `+${data.route.traffic_delay_min} ${t.mins}` }
    : data.route.traffic_delay_min > 3
    ? { cls: 'bg-amber-100 text-amber-700', label: `+${data.route.traffic_delay_min} ${t.mins}` }
    : { cls: 'bg-emerald-100 text-emerald-700', label: language === 'en' ? 'Clear' : 'Lancar' };

  const isRainy = data.weather != null && data.weather.code >= 51;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-blue-100 bg-white shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-blue-50 bg-blue-50 flex items-center gap-2">
        <span>🗺️</span>
        <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-widest flex-1">
          {t.title}
        </h4>
        <span className="text-xs text-blue-400">Azure Maps</span>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Route: origin → destination */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="w-0.5 h-8 bg-stone-200" />
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <div>
              <p className="text-xs text-stone-400">{t.from}</p>
              <p className="text-xs font-semibold text-stone-700 leading-tight">{data.origin.address}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">{t.to}</p>
              <p className="text-xs font-semibold text-stone-700 leading-tight">{data.destination.address}</p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center text-center p-2 rounded-xl bg-stone-50">
            <span className="text-base">📍</span>
            <span className="text-xs font-bold text-stone-800 tabular-nums">{data.route.distance_km} {t.km}</span>
            <span className="text-xs text-stone-400">{t.distance}</span>
          </div>
          <div className="flex flex-col items-center text-center p-2 rounded-xl bg-stone-50">
            <span className="text-base">🚗</span>
            <span className="text-xs font-bold text-stone-800 tabular-nums">{data.route.duration_min} {t.mins}</span>
            <span className="text-xs text-stone-400">{t.driveTime}</span>
          </div>
          <div className="flex flex-col items-center text-center p-2 rounded-xl bg-stone-50">
            <span className="text-base">🚦</span>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${trafficBadge.cls}`}>
              {trafficBadge.label}
            </span>
            <span className="text-xs text-stone-400">{t.traffic}</span>
          </div>
        </div>

        {/* Weather at event location */}
        {data.weather && (
          <div className={`rounded-lg border px-3 py-2 flex items-center gap-3 text-xs ${
            isRainy ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100'
          }`}>
            <span className="text-2xl leading-none flex-shrink-0">{data.weather.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-stone-400 mb-0.5">{t.weather}</p>
              <p className="font-semibold text-stone-800 truncate">
                {language === 'en' ? data.weather.label_en : data.weather.label_ms}
                {' · '}{data.weather.temperature_c}°C
              </p>
              <p className="text-stone-400">
                {t.wind}: {data.weather.windspeed_kmh} km/h
                {data.weather.precipitation_mm > 0 && (
                  <> · {t.rain}: {data.weather.precipitation_mm} mm</>
                )}
              </p>
            </div>
            {isRainy && (
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-200 text-blue-800 flex-shrink-0 whitespace-nowrap">
                {language === 'en' ? '☔ Plan shelter' : '☔ Sediakan khemah'}
              </span>
            )}
          </div>
        )}

        {/* Nearest Pasar Borong */}
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 flex items-center gap-2 text-xs">
          <span>🛒</span>
          <div>
            <span className="text-stone-400">{t.nearestPasar}: </span>
            <span className="font-semibold text-emerald-700">{data.nearest_pasar_borong.name}</span>
          </div>
        </div>

        {/* Open in maps */}
        <a
          href={data.maps_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 text-center py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
        >
          {t.openMap}
        </a>
      </div>
    </motion.div>
  );
}
