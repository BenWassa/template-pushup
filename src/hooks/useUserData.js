import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDateString, isValidTimestamp } from "../utils/timestamp";
import { readUsers, subscribeUsers, writeUsers } from "../utils/localStore";

/* eslint-disable react-hooks/preserve-manual-memoization */

const buildUser = (name) => ({
  displayName: name,
  training_reps: 0,
  official_reps: 0,
  created_at: Date.now(),
  logs: [],
});

const getTodayReps = (logs) => {
  if (!logs) return 0;
  const todayDateStr = new Date().toDateString();
  const todayIsoStr = new Date().toISOString().split("T")[0];

  const validLogs = logs.filter((log) => {
    if (log.source === "historical" && log.submitted_date) {
      return log.submitted_date === todayIsoStr;
    }
    if (log.timestamp && isValidTimestamp(log.timestamp)) {
      return getDateString(log.timestamp) === todayDateStr;
    }
    return false;
  });
  return validLogs.reduce((acc, curr) => acc + curr.amount, 0);
};

const setUserInStore = (id, data) => {
  const users = readUsers();
  users[id] = data;
  writeUsers(users);
};

// Handles user profile, logging reps, undo, and derived stats.
export const useUserData = ({ season, isTraining }) => {
  const [userData, setUserData] = useState(null);
  const [todayReps, setTodayReps] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const profileUnsub = useRef(null);

  const syncUser = useCallback((userId) => {
    if (!userId) return;
    const users = readUsers();
    const data = users[userId];
    if (!data) return;
    setUserData({ id: userId, ...data });
    setTodayReps(getTodayReps(data.logs));

    const invalidCount = data.logs
      ? data.logs.filter(
          (log) =>
            log.source !== "historical" && !isValidTimestamp(log.timestamp),
        ).length
      : 0;
    if (invalidCount > 0) {
      console.warn(
        `Data integrity issue: ${invalidCount} logs have invalid timestamps`,
      );
    }
  }, []);

  const clearProfile = useCallback(() => {
    if (profileUnsub.current) profileUnsub.current();
    profileUnsub.current = null;
    setUserData(null);
    setTodayReps(0);
  }, []);

  const loadUserProfile = useCallback(
    (name) => {
      if (!name) return;
      const cleanName = name.toLowerCase().trim();
      setLoadingProfile(true);

      if (profileUnsub.current) profileUnsub.current();

      const users = readUsers();
      if (!users[cleanName]) {
        users[cleanName] = buildUser(name);
        writeUsers(users);
      }

      setUserData({ id: cleanName, ...users[cleanName] });
      setTodayReps(getTodayReps(users[cleanName].logs));
      setLoadingProfile(false);

      profileUnsub.current = subscribeUsers(() => syncUser(cleanName));
    },
    [syncUser],
  );

  useEffect(() => {
    return () => {
      if (profileUnsub.current) profileUnsub.current();
    };
  }, []);

  const addReps = useCallback(
    async (amount) => {
      if (!userData?.id) return;
      const fieldToUpdate = isTraining ? "training_reps" : "official_reps";
      const users = readUsers();
      const currentUser = users[userData.id];
      if (!currentUser) return;

      const updatedUser = {
        ...currentUser,
        [fieldToUpdate]: (currentUser[fieldToUpdate] || 0) + amount,
        last_active: Date.now(),
        logs: [
          ...(currentUser.logs || []),
          {
            amount,
            timestamp: Date.now(),
            season,
          },
        ],
      };

      setUserInStore(userData.id, updatedUser);
      setUserData({ id: userData.id, ...updatedUser });
      setTodayReps(getTodayReps(updatedUser.logs));
    },
    [isTraining, season, userData?.id],
  );

  const undoLastAction = useCallback(async () => {
    if (!userData?.logs?.length) return;
    const logs = [...userData.logs];
    const lastLog = logs.pop();
    if (!lastLog) return;

    const logSeason = lastLog.season || (isTraining ? "TRAINING" : "OFFICIAL");
    const fieldToUpdate =
      logSeason === "TRAINING" ? "training_reps" : "official_reps";

    const updatedUser = {
      ...userData,
      [fieldToUpdate]: (userData[fieldToUpdate] || 0) - lastLog.amount,
      logs,
    };

    const { id, ...storeData } = updatedUser;
    setUserInStore(id, storeData);
    setUserData(updatedUser);
    setTodayReps(getTodayReps(updatedUser.logs));
  }, [isTraining, userData]);

  const deleteLogByIndex = useCallback(
    async (logIndex) => {
      if (!userData?.logs || logIndex < 0 || logIndex >= userData.logs.length)
        return;
      const logs = [...userData.logs];
      const logToDelete = logs[logIndex];
      logs.splice(logIndex, 1);

      const logSeason =
        logToDelete.season || (isTraining ? "TRAINING" : "OFFICIAL");
      const fieldToUpdate =
        logSeason === "TRAINING" ? "training_reps" : "official_reps";

      const updatedUser = {
        ...userData,
        [fieldToUpdate]: (userData[fieldToUpdate] || 0) - logToDelete.amount,
        logs,
      };

      const { id, ...storeData } = updatedUser;
      setUserInStore(id, storeData);
      setUserData(updatedUser);
      setTodayReps(getTodayReps(updatedUser.logs));
    },
    [isTraining, userData],
  );

  const addHistoricalReps = useCallback(
    async (date, amount) => {
      if (!userData?.id || !amount || amount <= 0) return;
      const fieldToUpdate = isTraining ? "training_reps" : "official_reps";

      const updatedUser = {
        ...userData,
        [fieldToUpdate]: (userData[fieldToUpdate] || 0) + amount,
        last_active: Date.now(),
        logs: [
          ...(userData.logs || []),
          {
            amount,
            submitted_date: date.toISOString().split("T")[0],
            source: "historical",
            season,
          },
        ],
      };

      const { id, ...storeData } = updatedUser;
      setUserInStore(id, storeData);
      setUserData(updatedUser);
      setTodayReps(getTodayReps(updatedUser.logs));
    },
    [isTraining, season, userData],
  );

  const calculateStreak = useCallback(() => {
    if (!userData?.logs) return 0;
    const uniqueDays = new Set();

    userData.logs.forEach((log) => {
      if (log.source === "historical" && log.submitted_date) {
        uniqueDays.add(log.submitted_date);
      } else if (log.timestamp && isValidTimestamp(log.timestamp)) {
        const date = new Date(log.timestamp);
        const dateStr = date.toISOString().split("T")[0];
        uniqueDays.add(dateStr);
      }
    });

    return uniqueDays.size;
  }, [userData?.logs]);

  const recentLogs = useMemo(
    () => (userData?.logs ? [...userData.logs].reverse().slice(0, 3) : []),
    [userData?.logs],
  );
  const lastLog = useMemo(
    () =>
      userData?.logs?.length ? userData.logs[userData.logs.length - 1] : null,
    [userData?.logs],
  );
  const lastLogAmount = lastLog ? lastLog.amount : 0;
  const isUndoable = Boolean(userData?.logs?.length);

  return {
    userData,
    todayReps,
    loadingProfile,
    loadUserProfile,
    clearProfile,
    addReps,
    undoLastAction,
    deleteLogByIndex,
    addHistoricalReps,
    calculateStreak,
    recentLogs,
    lastLogAmount,
    isUndoable,
  };
};
