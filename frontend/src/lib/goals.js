// Pure goal-related helper functions (issue: Workout Goals feature).
//
// Goals track user fitness targets across multiple types:
//   - strength: target weight for a specific exercise (uses 1RM estimation)
//   - bodyweight: target body weight (uses bodyweight history)
//   - frequency: target workout count per week (uses workout history)
//   - custom: manually tracked measurable goals with check-ins
//
// All functions are pure, taking state S as input and returning derived values.
// Progress is computed from existing workout/bodyweight data, never stored.

import { best1RM } from './onerm.js'
import { lastBW } from './history.js'
import { todayISO, weekKey } from './format.js'

// Filter goals by status
export const activeGoals = S => (S.goals || []).filter(g => g.status === 'active')
export const completedGoals = S => (S.goals || []).filter(g => g.status === 'completed')
export const archivedGoals = S => (S.goals || []).filter(g => g.status === 'archived')

// All goals for a specific exercise (useful for showing related goals in exercise detail)
export const goalsForExercise = (S, exerciseId) =>
  (S.goals || []).filter(g => g.type === 'strength' && g.exerciseId === exerciseId)

// Compute current progress for a goal. Returns:
//   {
//     current: number,      // Current value (1RM, weight, workout count, or manual value)
//     target: number,       // Target value
//     start: number,        // Starting value
//     progress: number,     // 0.0 to 1.0+ (can exceed 1.0 if target surpassed)
//     achieved: boolean,    // True when target reached or exceeded
//     hasData: boolean      // False when no data exists yet to measure progress
//   }
export function goalProgress(S, goal) {
  if (!goal) return null

  switch (goal.type) {
    case 'strength': {
      // Use estimated 1RM from workout history
      const rm = best1RM(S, goal.exerciseId)
      const current = rm ? rm.est : 0
      const start = goal.startWeight || 0
      const target = goal.targetWeight

      if (!rm) {
        return {
          current: 0,
          target,
          start,
          progress: 0,
          achieved: false,
          hasData: false
        }
      }

      // Direction matters: increasing strength vs maintaining/decreasing
      const range = target - start
      if (range === 0) {
        return {
          current,
          target,
          start,
          progress: current >= target ? 1.0 : 0,
          achieved: current >= target,
          hasData: true
        }
      }

      const progressRaw = range !== 0 ? (current - start) / range : 0
      const progress = Math.max(0, progressRaw) // Don't show negative progress

      return {
        current,
        target,
        start,
        progress,
        achieved: range > 0 ? current >= target : current <= target,
        hasData: true
      }
    }

    case 'bodyweight': {
      // Use latest bodyweight entry
      const bw = lastBW(S)
      const current = bw ? bw.w : 0
      const start = goal.startBodyweight || current
      const target = goal.targetBodyweight

      if (!bw) {
        return {
          current: 0,
          target,
          start,
          progress: 0,
          achieved: false,
          hasData: false
        }
      }

      const range = target - start
      if (range === 0) {
        return {
          current,
          target,
          start,
          progress: 1.0,
          achieved: true,
          hasData: true
        }
      }

      const progressRaw = (current - start) / range
      const progress = Math.max(0, Math.min(1.0, progressRaw))

      // For bodyweight, direction matters: gaining vs losing
      const achieved = range > 0 ? current >= target : current <= target

      return {
        current,
        target,
        start,
        progress,
        achieved,
        hasData: true
      }
    }

    case 'frequency': {
      // Count workouts in the current week
      const thisWeek = weekKey(todayISO())
      const workoutsThisWeek = (S.workouts || []).filter(w => weekKey(w.d) === thisWeek).length
      const target = Number(goal.targetWorkoutsPerWeek)

      if (!Number.isFinite(target) || target <= 0) {
        return {
          current: workoutsThisWeek,
          target,
          start: 0,
          progress: 0,
          achieved: false,
          hasData: false
        }
      }

      const progress = Math.min(1.0, workoutsThisWeek / target)

      return {
        current: workoutsThisWeek,
        target,
        start: 0,
        progress,
        achieved: workoutsThisWeek >= target,
        hasData: true // Always has data (can be 0)
      }
    }

    case 'custom': {
      // Use manually entered current value
      const current = goal.currentValue || 0
      const start = goal.startValue || 0
      const target = goal.targetValue

      const range = target - start
      if (range === 0) {
        const hasData = goal.currentValue != null || (goal.checkIns && goal.checkIns.length > 0)
        if (!hasData) {
          return { current: 0, target, start, progress: 0, achieved: false, hasData: false }
        }
        return {
          current,
          target,
          start,
          progress: 1.0,
          achieved: true,
          hasData: true
        }
      }

      const progressRaw = (current - start) / range
      const progress = Math.max(0, progressRaw)

      // Custom goals can be directional (increase or decrease)
      const achieved = range > 0 ? current >= target : current <= target


      const hasData = goal.currentValue != null || (goal.checkIns && goal.checkIns.length > 0)
      if (!hasData) {
        return { current: 0, target, start, progress: 0, achieved: false, hasData: false }
      }

      return {
        current,
        target,
        start,
        progress: Math.min(1.0, progress),
        achieved,
        hasData: true
      }
    }

    default:
      return null
  }
}

// Check if a goal has been achieved (simpler than computing full progress)
export function isGoalAchieved(S, goal) {
  const progress = goalProgress(S, goal)
  return progress ? progress.achieved : false
}

// Get all goals that were just achieved (for post-workout celebration)
// This should be called with the updated state after a workout is saved
export function newlyAchievedGoals(S) {
  return activeGoals(S).filter(g => isGoalAchieved(S, g))
}

// Check if a goal deadline has passed
export function isGoalOverdue(goal) {
  if (!goal.targetDate) return false
  return Date.now() > goal.targetDate
}

// Days remaining until goal deadline (negative if overdue)
export function daysUntilDeadline(goal) {
  if (!goal.targetDate) return null
  const msRemaining = goal.targetDate - Date.now()
  return Math.ceil(msRemaining / (24 * 60 * 60 * 1000))
}
