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

    default:
      return null
  }
}

// Check if a goal has been achieved (simpler than computing full progress)
export function isGoalAchieved(S, goal) {
  const progress = goalProgress(S, goal)
  return progress ? progress.achieved : false
}
