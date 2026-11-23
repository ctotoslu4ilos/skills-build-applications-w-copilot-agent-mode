import { Activity, Team, User, Workout } from '../models/index.js';
import mongoose from 'mongoose';

function httpError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validObjectId(value: unknown): value is string {
  return typeof value === 'string' && mongoose.isObjectIdOrHexString(value);
}

function pointsForActivity(minutes: number) {
  return Math.max(1, minutes);
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!isObject(input)) {
    throw httpError('Valid activity input is required', 400);
  }

  const { userId, teamId, type, minutes } = input;
  if (!validObjectId(userId) || !validObjectId(teamId)) {
    throw httpError('Valid userId and teamId values are required', 400);
  }
  if (typeof type !== 'string' || type.trim().length === 0) {
    throw httpError('Activity type is required', 400);
  }
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1) {
    throw httpError('Minutes must be a positive number', 400);
  }

  const [user, team] = await Promise.all([
    User.findById(userId).lean(),
    Team.findById(teamId).lean(),
  ]);
  if (!user || !team) {
    throw httpError('User or team not found', 404);
  }

  const normalizedType = type.trim();
  const activity = await Activity.create({
    user: userId,
    team: teamId,
    type: normalizedType,
    minutes,
    points: pointsForActivity(minutes),
    occurredAt: new Date(),
  });
  return activity.toJSON();
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!isObject(input)) {
    throw httpError('Valid team input is required', 400);
  }

  const { name, mascot, members = [] } = input;
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw httpError('Team name is required', 400);
  }
  if (typeof mascot !== 'string' || mascot.trim().length === 0) {
    throw httpError('Team mascot is required', 400);
  }
  if (!Array.isArray(members) || !members.every(validObjectId)) {
    throw httpError('Team members must be valid user IDs', 400);
  }

  const memberCount = await User.countDocuments({ _id: { $in: members } });
  if (memberCount !== members.length) {
    throw httpError('One or more team members were not found', 404);
  }

  const team = await Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members,
  });
  return team.toJSON();
}

export async function getLeaderboard() {
  const teams = await Team.find().lean();
  const totals = await Activity.aggregate<{ _id: mongoose.Types.ObjectId; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
  ]);
  const totalByTeam = new Map(totals.map((total) => [total._id.toString(), total.totalPoints]));

  const ranked = teams
    .map((team) => ({
      teamName: team.name,
      totalPoints: totalByTeam.get(team._id.toString()) ?? 0,
    }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return ranked;
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).lean();
  if (!user) {
    throw httpError('User not found', 404);
  }

  const recentActivities = await Activity.find({ user: user._id })
    .sort({ occurredAt: -1 })
    .limit(10)
    .lean();

  const activityCounts = new Map<string, number>();
  for (const activity of recentActivities) {
    const activityType = activity.type.toLowerCase();
    activityCounts.set(activityType, (activityCounts.get(activityType) ?? 0) + 1);
  }
  const recentPattern = [...activityCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];

  const focusForPattern = (pattern: string | undefined) => {
    if (!pattern) return user.fitnessGoal;
    if (pattern === 'strength' || pattern === 'weights') return 'strength';
    if (pattern === 'run' || pattern === 'running' || pattern === 'cycle' || pattern === 'cycling') return 'endurance';
    if (pattern === 'walk' || pattern === 'walking' || pattern === 'yoga') return 'mobility';
    return pattern;
  };

  const preferredFocus = focusForPattern(recentPattern);
  let workouts = await Workout.find({
    focus: { $regex: `^${preferredFocus.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
  }).lean();

  if (workouts.length === 0 && recentPattern) {
    workouts = await Workout.find({
      focus: { $regex: `^${recentPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    }).lean();
  }
  if (workouts.length === 0) {
    workouts = await Workout.find().lean();
  }

  const firstActivity = recentActivities[0];
  const reasonPattern = recentPattern ?? user.fitnessGoal;
  return workouts.map((workout) => ({
    ...workout,
    reason: firstActivity
      ? `Based on your ${reasonPattern} activity pattern`
      : `Based on your ${reasonPattern} fitness goal`,
  })).sort((left, right) => {
    const leftMatch = left.focus.toLowerCase() === preferredFocus.toLowerCase();
    const rightMatch = right.focus.toLowerCase() === preferredFocus.toLowerCase();
    return Number(rightMatch) - Number(leftMatch);
  });
}

export { User };
