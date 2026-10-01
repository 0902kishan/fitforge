// Pure goal-related helper functions (issue: Workout Goals feature).
//
// Goals track user fitness targets across multiple types:
//   - strength: manually tracked target weight for an exercise (uses check-ins)
//   - bodyweight: target body weight (uses bodyweight history)
//   - frequency: target workout count per week (uses workout history)
//   - custom: manually tracked measurable goals with check-ins
//
// All functions are pure, taking state S as input and returning derived values.

import { lastBW } from './history.js'
import { todayISO, weekKey } from './format.js'

// Filter goals by status
export const activeGoals = S => (S.goals || []).filter(g => g.status === 'active')
export const completedGoals = S => (S.goals || []).filter(g => g.status === 'completed')
export const archivedGoals = S => (S.goals || []).filter(g => g.status === 'archived')

// Compute current progress for a goal. Returns:
//   {
//     current: number,      // Current value
//     target: number,       // Target value
//     start: number,        // Starting value
//     progress: number,     // 0.0 to 1.0
//     achieved: boolean,    // True when target reached or exceeded
//     hasData: boolean      // False when no data exists yet to measure progress
//   }
export function goalProgress(S, goal) {
    if (!goal) return null

    switch (goal.type) {
        case 'strength':
            {
                const checkIns = (S.goalCheckIns || [])
                    .filter(c => c.goalId === goal.id)
                    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))

                const start = Number(goal.startValue)
                const target = Number(goal.targetValue)
                const latest = checkIns[checkIns.length - 1]
                const current = latest ? Number(latest.value) : start

                if (!Number.isFinite(start) ||
                    !Number.isFinite(target) ||
                    !Number.isFinite(current)
                ) {
                    return {
                        current: 0,
                        target: 0,
                        start: 0,
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
                        progress: current === target ? 1 : 0,
                        achieved: current === target,
                        hasData: true
                    }
                }

                const progressRaw = (current - start) / range
                const progress = Math.max(0, Math.min(1, progressRaw))
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

        case 'bodyweight':
            {
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

        case 'frequency':
            {
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

        case 'custom':
            {
                // Use latest check-in for current value
                const checkIns = (S.goalCheckIns || [])
                    .filter(c => c.goalId === goal.id)
                    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                const latest = checkIns[0]
                const current = latest ? latest.value : (goal.startValue || 0)
                const start = goal.startValue || 0
                const target = goal.targetValue

                if (!latest && start === 0) {
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
                const progress = Math.max(0, progressRaw)

                // 'increasing' boolean determines direction
                const achieved = goal.increasing ? current >= target : current <= target

                return {
                    current,
                    target,
                    start,
                    progress,
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