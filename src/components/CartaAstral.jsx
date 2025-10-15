import React, { useState } from 'react';

const API_URL = 'https://json.freeastrologyapi.com/western/natal-wheel-chart';
const API_KEY = '3d1Yxfgy176rMzllZzSVK86bNhj54Uq160Kq412n'; // Tu API Key de FreeAstrologyAPI

const defaultConfig = {
  observation_point: "topocentric",
  ayanamsha: "tropical",
  house_system: "Placidus",
  language: "es",
  exclude_planets: [],
  allowed_aspects: ["Conjunction", "Opposition", "Trine", "Square", "Sextile"],
  wheel_chart_colors: {
    zodiac_sign_background_color: "#303036",
    chart_background_color: "#303036",
    zodiac_signs_text_color: "#FFFFFF",
    dotted_line_color: "#FFFAFF",
    planets_icon_color: "#FFFAFF"
  },
  orb_values: { Conjunction: 3, Opposition: 5, Square: 5, Trine: 5, Sextile: 5 }
};

const CartaAstral = () => {
  const [form, setForm] = useState({
    name: '',
    date: '',
    time: '',
    place: 'Guadalajara, Mexico'
  });

  const [coords, setCoords] = useState(null);
  const [tz, setTz] = useState(-6);
  const [svgUrl, setSvgUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  // 🌎 Geolocaliza usando Nominatim (OpenStreetMap)
  const handleGeoLocate = async () => {
    setGeoLoading(true);
    setError('');
    setCoords(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.place)}`
      );
      const data = await res.json();
      if (data.length > 0) {
        const loc = data[0];
        setCoords({ lat: parseFloat(loc.lat), lon: parseFloat(loc.lon) });

        // Obtiene zona horaria (usando WorldTimeAPI)
        const tzRes = await fetch(`https://worldtimeapi.org/api/timezone`);
        const tzList = await tzRes.json();
        const tzName = tzList.find(t => t.toLowerCase().includes("mexico")) || "America/Mexico_City";

        const tzRes2 = await fetch(`https://worldtimeapi.org/api/timezone/${tzName}`);
        const tzData = await tzRes2.json();
        setTz(tzData.utc_offset ? parseFloat(tzData.utc_offset.split(":")[0]) : -6);
      } else {
        setError('No se encontró la ubicación. Intenta escribir el nombre más completo.');
      }
    } catch (err) {
      setError('Error al buscar la ubicación.');
    } finally {
      setGeoLoading(false);
    }
  };

  // 🔮 Calcula la carta astral
  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setSvgUrl('');
    setError('');

    if (!coords) {
      setError('Primero localiza el lugar de nacimiento.');
      setLoading(false);
      return;
    }

    const [year, month, day] = form.date.split('-').map(Number);
    const [hours, minutes] = form.time.split(':').map(Number);

    const payload = {
      year,
      month,
      date: day,
      hours,
      minutes,
      seconds: 0,
      latitude: coords.lat,
      longitude: coords.lon,
      timezone: tz,
      config: defaultConfig
    };

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.output && data.output.endsWith('.svg')) {
        setSvgUrl(data.output);
      } else {
        setError('No se pudo generar la carta astral.');
      }
    } catch {
      setError('Error al calcular la carta astral.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2em', maxWidth: 500 }}>
      <h1>Carta Astral</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input type="text" name="name" placeholder="Nombre" value={form.name} onChange={handleChange} required />
        <input type="date" name="date" value={form.date} onChange={handleChange} required />
        <input type="time" name="time" value={form.time} onChange={handleChange} required />
        <input type="text" name="place" placeholder="Lugar de nacimiento" value={form.place} onChange={handleChange} required />
        <button type="button" onClick={handleGeoLocate} disabled={geoLoading}>
          {geoLoading ? 'Buscando...' : 'Geolocalizar'}
        </button>

        {coords && (
          <div style={{ fontSize: 12 }}>
            📍 Lat: {coords.lat.toFixed(3)}, Lon: {coords.lon.toFixed(3)}, TZ: {tz}
          </div>
        )}
        <button type="submit" disabled={loading}>
          {loading ? 'Calculando...' : 'Obtener carta astral'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {svgUrl && (
        <div style={{ marginTop: 24 }}>
          <h2>Tu carta natal</h2>
          <img src={svgUrl} alt="Carta natal" style={{ width: '100%', maxWidth: 400, background: '#fff' }} />
        </div>
      )}
    </div>
  );
};

export default CartaAstral;
