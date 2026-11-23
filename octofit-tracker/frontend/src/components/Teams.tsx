import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type Team = {
  name: string;
  members: string[];
};

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getJson<{ teams: Team[] }>('/api/teams')
      .then((data) => setTeams(data.teams))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unknown error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <CapabilityCard
      title="Teams"
      description="Manage teams and members."
      loading={loading}
      error={error}
      empty={teams.length === 0}
      emptyText="No teams found."
    >
      <ul className="list-group">
        {teams.map((team, index) => (
          <li className="list-group-item" key={`${team.name}-${index}`}>
            <strong>{team.name}</strong>
            {team.members.length > 0 && <span> - {team.members.join(', ')}</span>}
          </li>
        ))}
      </ul>
    </CapabilityCard>
  );
}
