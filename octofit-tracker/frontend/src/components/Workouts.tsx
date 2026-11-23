import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Suggestion = {
  title: string;
  reason: string;
};

const MONA_EMAIL = 'mona@example.com';

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const email = encodeURIComponent(MONA_EMAIL);
    getJson<{ suggestions: Suggestion[] }>(`/api/workouts/suggestions/${email}`)
      .then((data) => setSuggestions(data.suggestions))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unknown error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <CapabilityCard
      title="Workout suggestions"
      description="Recommend workouts from activity patterns."
      loading={loading}
      error={error}
      empty={suggestions.length === 0}
      emptyText="No workout suggestions found."
    >
      <ul className="list-group">
        {suggestions.map((suggestion, index) => (
          <li className="list-group-item" key={`${suggestion.title}-${index}`}>
            <strong>{suggestion.title}</strong>
            {suggestion.reason && <span> - {suggestion.reason}</span>}
          </li>
        ))}
      </ul>
    </CapabilityCard>
  );
}
