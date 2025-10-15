import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'https://json.freeastrologyapi.com/western/natal-wheel-chart';
const PLANETS_URL = 'https://json.freeastrologyapi.com/western/planets';
const HOUSES_URL = 'https://json.freeastrologyapi.com/western/houses';
const ASPECTS_URL = 'https://json.freeastrologyapi.com/western/aspects';
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

const proxyUrls = [
  'https://corsproxy.io/?',
  'https://thingproxy.freeboard.io/fetch/',
  'https://cors-anywhere.herokuapp.com/'
];

async function fetchWithFallback(url, options) {
  for (let proxy of proxyUrls) {
    try {
      const res = await fetch(proxy + url, options);
      if (res.status === 429) continue;
      if (!res.ok) continue;
      return await res.json();
    } catch {
      // Intenta el siguiente proxy
    }
  }
  throw new Error('No se pudo acceder a la API (todos los proxies fallaron o están saturados).');
}

const PROFILE_KEY = 'cartaAstralProfile';

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
  const [planets, setPlanets] = useState([]);
  const [houses, setHouses] = useState([]);
  const [aspects, setAspects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  // Guardar nombre en localStorage cuando cambia
  React.useEffect(() => {
    if (form.name && form.name.trim()) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: form.name }));
    }
  }, [form.name]);

  // Cargar nombre de perfil al montar
  React.useEffect(() => {
    try {
      const storedProfile = localStorage.getItem(PROFILE_KEY);
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        if (profile.name) {
          setForm(f => ({ ...f, name: profile.name }));
        }
      }
    } catch {}
  }, []);

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

  // Calcula la carta astral, planetas, casas y aspectos usando corsproxy.io como proxy
  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setSvgUrl('');
    setPlanets([]);
    setHouses([]);
    setAspects([]);
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
      // Carta natal SVG
      const data = await fetchWithFallback(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify(payload)
      });
      if (data.output && data.output.endsWith('.svg')) {
        setSvgUrl(data.output);
      } else {
        setError('No se pudo generar la carta astral.');
      }

      // Planetas
      const planetsData = await fetchWithFallback(PLANETS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify(payload)
      });
      if (planetsData.output && Array.isArray(planetsData.output)) {
        setPlanets(planetsData.output);
      }

      // Casas
      const housesData = await fetchWithFallback(HOUSES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify(payload)
      });
      if (
        housesData.output &&
        housesData.output.Houses &&
        Array.isArray(housesData.output.Houses)
      ) {
        setHouses(housesData.output.Houses);
      }

      // Aspectos
      const aspectsData = await fetchWithFallback(ASPECTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify(payload)
      });
      if (aspectsData.output && Array.isArray(aspectsData.output)) {
        setAspects(aspectsData.output);
      }
    } catch {
      setError('Error al calcular la carta astral. Los proxies gratuitos pueden estar saturados, intenta de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  // Construye el prompt para Gracia
  const buildPromptForGracia = () => {
    let prompt = `Mi nombre es ${form.name}.\n`;
    prompt += `Mi carta astral:\n`;
    if (planets.length > 0) {
      prompt += `Planetas:\n`;
      planets.forEach(p => {
        prompt += `- ${p.planet?.es || p.planet?.en}: ${p.zodiac_sign?.name?.es || p.zodiac_sign?.name?.en} (${p.normDegree ? p.normDegree.toFixed(2) : ''}°)${String(p.isRetro).toLowerCase() === 'true' ? ' retrógrado' : ''}\n`;
      });
    }
    if (houses.length > 0) {
      prompt += `Casas:\n`;
      houses.forEach(h => {
        prompt += `- Casa ${h.House}: ${h.zodiac_sign?.name?.es || h.zodiac_sign?.name?.en} (${h.normDegree ? h.normDegree.toFixed(2) : ''}°)\n`;
      });
    }
    if (aspects.length > 0) {
      prompt += `Aspectos:\n`;
      aspects.forEach(a => {
        prompt += `- ${a.planet_1?.es || a.planet_1?.en} y ${a.planet_2?.es || a.planet_2?.en}: ${a.aspect?.es || a.aspect?.en}\n`;
      });
    }
    return prompt;
  };

  // Envía el prompt a Gracia Chat
  const handleSendToGracia = () => {
    const prompt = buildPromptForGracia();
    // Guarda el prompt en localStorage para que Gracia Chat lo lea como nuevo prompt
    const SYSTEM_PROMPTS_KEY = 'deepseekSystemPrompts';
    let stored = {};
    try {
      const storedRaw = localStorage.getItem(SYSTEM_PROMPTS_KEY);
      stored = storedRaw ? JSON.parse(storedRaw) : { prompts: [], current: '' };
    } catch {
      stored = { prompts: [], current: '' };
    }
    // Añade el nuevo prompt y lo selecciona como actual
    stored.prompts = [prompt, ...(Array.isArray(stored.prompts) ? stored.prompts : [])];
    stored.current = prompt;
    localStorage.setItem(SYSTEM_PROMPTS_KEY, JSON.stringify(stored));
    // Navega a Gracia Chat
    navigate('/gracia-chat');
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
          disabled={
            loading ||
            !coords // Solo habilitado si hay coordenadas
          }
        >
          {loading ? 'Calculando...' : 'Obtener carta astral'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {svgUrl && (
        <div style={{ marginTop: 24 }}>
          <h2>Tu carta natal</h2>
          <img src={svgUrl} alt="Carta natal" style={{ width: '100%', maxWidth: 400, background: '#fff' }} />
          <button
            style={{ marginTop: 24, marginBottom: 24, padding: '0.5em 1.5em', fontSize: 16, background: '#4e4', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'block' }}
            onClick={handleSendToGracia}
          >
            Enviar a Gracia
          </button>
        </div>
      )}
      {planets.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2>Planetas</h2>
          <table style={{ width: '100%', fontSize: 14, background: '#222', color: '#fff', borderRadius: 8 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Planeta</th>
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
          <button
            style={{ marginTop: 24, padding: '0.5em 1.5em', fontSize: 16, background: '#4e4', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
            onClick={handleSendToGracia}
          >
            Enviar a Gracia
          </button>
        </div>
      )}
    </div>
  );
};

export default CartaAstral;
