import React, { useState } from 'react';

const API_URL = 'https://abundis.com.mx/brujula/natal-wheel-chart.php';
const ASPECTS_URL = 'https://abundis.com.mx/brujula/aspects.php';
const HOUSES_URL = 'https://abundis.com.mx/brujula/houses.php';
const PLANETS_URL = 'https://abundis.com.mx/brujula/planets.php';

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
  const [aspects, setAspects] = useState([]);
  const [houses, setHouses] = useState([]);
  const [planets, setPlanets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  // Geolocaliza usando Nominatim (OpenStreetMap)
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

  // Solo hace la petición a tu PHP y muestra el SVG
  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setSvgUrl('');
    setError('');
    setAspects([]);
    setHouses([]);
    setPlanets([]);

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
      // Carta natal SVG
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.output && data.output.endsWith('.svg')) {
        setSvgUrl(data.output);
      } else {
        setError('No se pudo generar la carta astral.');
      }

      // Aspectos
      const aspectsRes = await fetch(ASPECTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const aspectsData = await aspectsRes.json();
      if (aspectsData.output && Array.isArray(aspectsData.output)) {
        setAspects(aspectsData.output);
      }

      // Casas
      const housesRes = await fetch(HOUSES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const housesData = await housesRes.json();
      if (
        housesData.output &&
        housesData.output.Houses &&
        Array.isArray(housesData.output.Houses)
      ) {
        setHouses(housesData.output.Houses);
      }

      // Planetas
      const planetsRes = await fetch(PLANETS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const planetsData = await planetsRes.json();
      if (planetsData.output && Array.isArray(planetsData.output)) {
        setPlanets(planetsData.output);
      }
    } catch {
      setError('Error al calcular la carta astral, aspectos, casas o planetas.');
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
        <button
          type="button"
          onClick={handleGeoLocate}
          disabled={geoLoading}
        >
          {geoLoading ? 'Buscando...' : 'Geolocalizar'}
        </button>
        {coords && (
          <div style={{ fontSize: 12 }}>
            📍 Lat: {coords.lat.toFixed(3)}, Lon: {coords.lon.toFixed(3)}, TZ: {tz}
          </div>
        )}
        <button
          type="submit"
          disabled={loading || !coords}
        >
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
      {planets.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2>Planetas</h2>
          <table style={{ width: '100%', fontSize: 14, background: '#222', color: '#fff', borderRadius: 8 }}>
            <thead>
              <tr>
                <th>Planeta</th>
                <th>Signo</th>
                <th>Grados</th>
                <th>Retrógrado</th>
              </tr>
            </thead>
            <tbody>
              {planets.map((p, i) => (
                <tr key={i}>
                  <td>{p.planet?.es || p.planet?.en}</td>
                  <td>{p.zodiac_sign?.name?.es || p.zodiac_sign?.name?.en}</td>
                  <td>{p.normDegree ? p.normDegree.toFixed(2) : ''}</td>
                  <td>{String(p.isRetro).toLowerCase() === 'true' ? 'Sí' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {aspects.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2>Aspectos</h2>
          <table style={{ width: '100%', fontSize: 14, background: '#222', color: '#fff', borderRadius: 8 }}>
            <thead>
              <tr>
                <th>Planeta 1</th>
                <th>Planeta 2</th>
                <th>Aspecto</th>
              </tr>
            </thead>
            <tbody>
              {aspects.map((a, i) => (
                <tr key={i}>
                  <td>{a.planet_1?.es || a.planet_1?.en}</td>
                  <td>{a.planet_2?.es || a.planet_2?.en}</td>
                  <td>{a.aspect?.es || a.aspect?.en}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {houses.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2>Casas astrológicas</h2>
          <table style={{ width: '100%', fontSize: 14, background: '#222', color: '#fff', borderRadius: 8 }}>
            <thead>
              <tr>
                <th>Casa</th>
                <th>Signo</th>
                <th>Grados</th>
              </tr>
            </thead>
            <tbody>
              {houses.map((h, i) => (
                <tr key={i}>
                  <td>{h.House}</td>
                  <td>{h.zodiac_sign?.name?.es || h.zodiac_sign?.name?.en}</td>
                  <td>{h.normDegree ? h.normDegree.toFixed(2) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CartaAstral;
