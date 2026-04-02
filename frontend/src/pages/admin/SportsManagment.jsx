import { useEffect, useState } from 'react';

export default function AboutUs() {
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSports = async () => {
      try {
        const res = await fetch('http://localhost:3005/sports');
        if (!res.ok) throw new Error('Failed to fetch sports');
        const data = await res.json();
        setSports(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadSports();
  }, []);

  if (loading) return <p>Loading sports...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h2>Sports from API</h2>
      <ul>
        {sports.map((s) => (
          <li key={s.id}>
            <div><strong>ID:</strong> {s.id}</div>
            <div><strong>Emertimi:</strong> {s.emertimi}</div>
            <div><strong>Pershkrimi:</strong> {s.pershkrimi}</div>
            <div><strong>Numri lojtareve:</strong> {s.numri_lojtareve}</div>
            <div><strong>Lloji:</strong> {s.lloji}</div>
            <hr />
          </li>
        ))}
      </ul>
    </div>
  );
}