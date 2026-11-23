import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type LeaderboardEntry = {
  teamName: string;
  totalPoints: number;
  rank: number;
};

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard')
      .then((data) => setLeaderboard(data.leaderboard))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unknown error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <CapabilityCard
      title="Leaderboard"
      description="Compare team point totals."
      loading={loading}
      error={error}
      empty={leaderboard.length === 0}
      emptyText="No leaderboard rankings found."
    >
      <ol className="list-group list-group-numbered">
        {leaderboard.map((entry) => (
          <li className="list-group-item" key={entry.teamName}>
            {entry.teamName} - {entry.totalPoints} points
          </li>
        ))}
      </ol>
    </CapabilityCard>
  );
}
