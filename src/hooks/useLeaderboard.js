import { useEffect, useState } from 'react';
import { getUsersList, subscribeUsers } from '../utils/localStore';

// Local leaderboard subscription.
export const useLeaderboard = ({ isTraining, user }) => {
  const [leaderboardData, setLeaderboardData] = useState([]);

  useEffect(() => {
    if (!user) return undefined;

    const updateLeaderboard = () => {
      const users = getUsersList();
      const sortKey = isTraining ? 'training_reps' : 'official_reps';
      users.sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));
      setLeaderboardData(users);
    };

    updateLeaderboard();
    const unsub = subscribeUsers(updateLeaderboard);
    return () => unsub();
  }, [isTraining, user]);

  return leaderboardData;
};
