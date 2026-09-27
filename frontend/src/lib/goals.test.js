import { describe, it, expect } from 'vitest'
import {
  activeGoals,
  completedGoals,
  archivedGoals,
  goalsForExercise,
  goalProgress,
  isGoalAchieved,
  newlyAchievedGoals,
  isGoalOverdue,
  daysUntilDeadline
} from './goals.js'

// Helper to build minimal state
const baseState = () => ({
  goals: [],
  workouts: [],
  bodyweight: [],
  exWeights: {}
})

describe('activeGoals', () => {
  it('returns only active goals', () => {
    const S = baseState()
    S.goals = [
      { id: '1', status: 'active', type: 'strength' },
      { id: '2', status: 'completed', type: 'strength' },
      { id: '3', status: 'active', type: 'bodyweight' },
      { id: '4', status: 'archived', type: 'frequency' }
    ]
    const active = activeGoals(S)
    expect(active).toHaveLength(2)
    expect(active.map(g => g.id)).toEqual(['1', '3'])
  })

  it('returns empty array when no goals exist', () => {
    const S = baseState()
    expect(activeGoals(S)).toEqual([])
  })

  it('handles missing goals array gracefully', () => {
    const S = { workouts: [], bodyweight: [] }
    expect(activeGoals(S)).toEqual([])
  })
})

describe('completedGoals', () => {
  it('returns only completed goals', () => {
    const S = baseState()
    S.goals = [
      { id: '1', status: 'active', type: 'strength' },
      { id: '2', status: 'completed', type: 'strength', completedAt: 1000 },
      { id: '3', status: 'completed', type: 'bodyweight', completedAt: 2000 }
    ]
    const completed = completedGoals(S)
    expect(completed).toHaveLength(2)
    expect(completed.map(g => g.id)).toEqual(['2', '3'])
  })
})

describe('archivedGoals', () => {
  it('returns only archived goals', () => {
    const S = baseState()
    S.goals = [
      { id: '1', status: 'active', type: 'strength' },
      { id: '2', status: 'archived', type: 'strength' }
    ]
    const archived = archivedGoals(S)
    expect(archived).toHaveLength(1)
    expect(archived[0].id).toBe('2')
  })
})

describe('goalsForExercise', () => {
  it('returns all goals for a specific exercise', () => {
    const S = baseState()
    S.goals = [
      { id: '1', type: 'strength', exerciseId: 'bench-press', status: 'active' },
      { id: '2', type: 'strength', exerciseId: 'squat', status: 'active' },
      { id: '3', type: 'strength', exerciseId: 'bench-press', status: 'completed' },
      { id: '4', type: 'bodyweight', status: 'active' }
    ]
    const benchGoals = goalsForExercise(S, 'bench-press')
    expect(benchGoals).toHaveLength(2)
    expect(benchGoals.map(g => g.id)).toEqual(['1', '3'])
  })

  it('returns empty array when no goals exist for exercise', () => {
    const S = baseState()
    S.goals = [{ id: '1', type: 'strength', exerciseId: 'squat', status: 'active' }]
    expect(goalsForExercise(S, 'deadlift')).toEqual([])
  })
})

describe('goalProgress - strength goals', () => {
  it('calculates progress from 1RM history', () => {
    const S = baseState()
    S.workouts = [
      {
        d: '2026-09-20',
        start: Date.now() - 7 * 86400000,
        entries: [
          { id: 'bench-press', sets: [{ w: 70, r: 5, done: true }] }
        ]
      }
    ]
    const goal = {
      type: 'strength',
      exerciseId: 'bench-press',
      startWeight: 70,
      targetWeight: 80,
      status: 'active'
    }

    const progress = goalProgress(S, goal)
    expect(progress).not.toBeNull()
    expect(progress.hasData).toBe(true)
    expect(progress.start).toBe(70)
    expect(progress.target).toBe(80)
    // 70kg × 5 reps ≈ 81.7kg 1RM (using Epley formula)
    expect(progress.current).toBeGreaterThan(70)
    expect(progress.achieved).toBe(true)
    expect(progress.progress).toBeGreaterThan(0.9)
  })

  it('returns zero progress when no workout data exists', () => {
    const S = baseState()
    const goal = {
      type: 'strength',
      exerciseId: 'bench-press',
      startWeight: 70,
      targetWeight: 80,
      status: 'active'
    }

    const progress = goalProgress(S, goal)
    expect(progress.hasData).toBe(false)
    expect(progress.current).toBe(0)
    expect(progress.progress).toBe(0)
    expect(progress.achieved).toBe(false)
  })

  it('handles same start and target weight', () => {
    const S = baseState()
    S.workouts = [
      {
        d: '2026-09-20',
        start: Date.now(),
        entries: [{ id: 'bench-press', sets: [{ w: 80, r: 1, done: true }] }]
      }
    ]
    const goal = {
      type: 'strength',
      exerciseId: 'bench-press',
      startWeight: 80,
      targetWeight: 80,
      status: 'active'
    }

    const progress = goalProgress(S, goal)
    expect(progress.achieved).toBe(true)
    expect(progress.progress).toBeGreaterThanOrEqual(0)
  })
})

describe('goalProgress - bodyweight goals', () => {
  it('calculates progress from bodyweight history', () => {
    const S = baseState()
    S.bodyweight = [
      { d: '2026-09-01', w: 75, t: Date.now() - 26 * 86400000 },
      { d: '2026-09-27', w: 72, t: Date.now() }
    ]
    const goal = {
      type: 'bodyweight',
      startBodyweight: 75,
      targetBodyweight: 70,
      status: 'active'
    }

    const progress = goalProgress(S, goal)
    expect(progress.hasData).toBe(true)
    expect(progress.current).toBe(72)
    expect(progress.start).toBe(75)
    expect(progress.target).toBe(70)
    expect(progress.progress).toBeCloseTo(0.6) // 3kg of 5kg = 0.6
    expect(progress.achieved).toBe(false)
  })

  it('handles weight gain goals', () => {
    const S = baseState()
    S.bodyweight = [{ d: '2026-09-27', w: 72, t: Date.now() }]
    const goal = {
      type: 'bodyweight',
      startBodyweight: 70,
      targetBodyweight: 75,
      status: 'active'
    }

    const progress = goalProgress(S, goal)
    expect(progress.current).toBe(72)
    expect(progress.progress).toBeCloseTo(0.4) // 2kg of 5kg
    expect(progress.achieved).toBe(false)
  })

  it('marks achieved when target reached for weight loss', () => {
    const S = baseState()
    S.bodyweight = [{ d: '2026-09-27', w: 69, t: Date.now() }]
    const goal = {
      type: 'bodyweight',
      startBodyweight: 75,
      targetBodyweight: 70,
      status: 'active'
    }

    const progress = goalProgress(S, goal)
    expect(progress.achieved).toBe(true)
    expect(progress.current).toBe(69)
  })

  it('returns no data when bodyweight array is empty', () => {
    const S = baseState()
    const goal = {
      type: 'bodyweight',
      startBodyweight: 75,
      targetBodyweight: 70,
      status: 'active'
    }

    const progress = goalProgress(S, goal)
    expect(progress.hasData).toBe(false)
    expect(progress.current).toBe(0)
  })
})

describe('goalProgress - frequency goals', () => {
  it('counts workouts in current week', () => {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))

    const formatISO = d => d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0')

    const S = baseState()
    S.workouts = [
      { d: formatISO(new Date(monday.getTime())), entries: [] },
      { d: formatISO(new Date(monday.getTime() + 86400000)), entries: [] },
      { d: formatISO(new Date(monday.getTime() + 2 * 86400000)), entries: [] }
    ]

    const goal = {
      type: 'frequency',
      targetWorkoutsPerWeek: 4,
      status: 'active'
    }

    const progress = goalProgress(S, goal)
    expect(progress.hasData).toBe(true)
    expect(progress.current).toBe(3)
    expect(progress.target).toBe(4)
    expect(progress.progress).toBeCloseTo(0.75)
    expect(progress.achieved).toBe(false)
  })

  it('returns not measurable when targetWorkoutsPerWeek is 0', () => {
    const S = baseState()
    const today = new Date()
    const formatISO = d => d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0')
    S.workouts = [{ d: formatISO(today), entries: [] }]
    const goal = {
      type: 'frequency',
      targetWorkoutsPerWeek: 0,
      status: 'active'
    }

    const progress = goalProgress(S, goal)
    expect(progress.hasData).toBe(false)
    expect(progress.progress).toBe(0)
    expect(progress.achieved).toBe(false)
  })

  it('returns not measurable when targetWorkoutsPerWeek is negative', () => {
    const S = baseState()
    const today = new Date()
    const formatISO = d => d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0')
    S.workouts = [{ d: formatISO(today), entries: [] }]
    const goal = {
      type: 'frequency',
      targetWorkoutsPerWeek: -2,
      status: 'active'
    }

    const progress = goalProgress(S, goal)
    expect(progress.hasData).toBe(false)
    expect(progress.progress).toBe(0)
    expect(progress.achieved).toBe(false)
  })

  it('returns not measurable when targetWorkoutsPerWeek is missing', () => {
    const S = baseState()
    const today = new Date()
    const formatISO = d => d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0')
    S.workouts = [{ d: formatISO(today), entries: [] }]
    const goal = {
      type: 'frequency',
      status: 'active'
    }

    const progress = goalProgress(S, goal)
    expect(progress.hasData).toBe(false)
    expect(progress.progress).toBe(0)
    expect(progress.achieved).toBe(false)
  })

  it('marks achieved when target met', () => {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))

    const formatISO = d => d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0')

    const S = baseState()
    S.workouts = [
      { d: formatISO(new Date(monday.getTime())), entries: [] },
      { d: formatISO(new Date(monday.getTime() + 86400000)), entries: [] },
      { d: formatISO(new Date(monday.getTime() + 2 * 86400000)), entries: [] },
      { d: formatISO(new Date(monday.getTime() + 3 * 86400000)), entries: [] }
    ]

    const goal = {
      type: 'frequency',
      targetWorkoutsPerWeek: 4,
      status: 'active'
    }

    const progress = goalProgress(S, goal)
    expect(progress.current).toBe(4)
    expect(progress.achieved).toBe(true)
  })
})

describe('goalProgress - custom goals', () => {
  it('uses manually entered current value', () => {
    const S = baseState()
    const goal = {
      type: 'custom',
      startValue: 0,
      targetValue: 100,
      currentValue: 60,
      status: 'active'
    }

    const progress = goalProgress(S, goal)
    expect(progress.current).toBe(60)
    expect(progress.target).toBe(100)
    expect(progress.progress).toBeCloseTo(0.6)
    expect(progress.achieved).toBe(false)
  })

  it('marks achieved when target reached', () => {
    const S = baseState()
    const goal = {
      type: 'custom',
      startValue: 0,
      targetValue: 100,
      currentValue: 105,
      status: 'active'
    }

    const progress = goalProgress(S, goal)
    expect(progress.achieved).toBe(true)
    expect(progress.progress).toBe(1.0) // Capped at 1.0
  })

  it('handles decreasing custom goals', () => {
    const S = baseState()
    const goal = {
      type: 'custom',
      startValue: 100,
      targetValue: 50,
      currentValue: 70,
      status: 'active'
    }

    const progress = goalProgress(S, goal)
    expect(progress.progress).toBeCloseTo(0.6) // 30 of 50 reduction
    expect(progress.achieved).toBe(false)
  })
})

describe('isGoalAchieved', () => {
  it('returns true when goal is achieved', () => {
    const S = baseState()
    S.bodyweight = [{ d: '2026-09-27', w: 69, t: Date.now() }]
    const goal = {
      type: 'bodyweight',
      startBodyweight: 75,
      targetBodyweight: 70,
      status: 'active'
    }

    expect(isGoalAchieved(S, goal)).toBe(true)
  })

  it('returns false when goal is not achieved', () => {
    const S = baseState()
    S.bodyweight = [{ d: '2026-09-27', w: 72, t: Date.now() }]
    const goal = {
      type: 'bodyweight',
      startBodyweight: 75,
      targetBodyweight: 70,
      status: 'active'
    }

    expect(isGoalAchieved(S, goal)).toBe(false)
  })

  it('returns false when no data exists', () => {
    const S = baseState()
    const goal = {
      type: 'strength',
      exerciseId: 'bench-press',
      startWeight: 70,
      targetWeight: 80,
      status: 'active'
    }

    expect(isGoalAchieved(S, goal)).toBe(false)
  })
})

describe('newlyAchievedGoals', () => {
  it('returns all active goals that are achieved', () => {
    const S = baseState()
    S.bodyweight = [{ d: '2026-09-27', w: 69, t: Date.now() }]
    S.goals = [
      {
        id: '1',
        type: 'bodyweight',
        startBodyweight: 75,
        targetBodyweight: 70,
        status: 'active'
      },
      {
        id: '2',
        type: 'bodyweight',
        startBodyweight: 80,
        targetBodyweight: 68,
        status: 'active'
      },
      {
        id: '3',
        type: 'bodyweight',
        startBodyweight: 75,
        targetBodyweight: 70,
        status: 'completed'
      }
    ]

    const achieved = newlyAchievedGoals(S)
    expect(achieved).toHaveLength(1)
    expect(achieved[0].id).toBe('1')
  })
})

describe('isGoalOverdue', () => {
  it('returns true when deadline has passed', () => {
    const goal = {
      targetDate: Date.now() - 86400000 // Yesterday
    }
    expect(isGoalOverdue(goal)).toBe(true)
  })

  it('returns false when deadline is in future', () => {
    const goal = {
      targetDate: Date.now() + 86400000 // Tomorrow
    }
    expect(isGoalOverdue(goal)).toBe(false)
  })

  it('returns false when no deadline set', () => {
    const goal = {}
    expect(isGoalOverdue(goal)).toBe(false)
  })
})

describe('daysUntilDeadline', () => {
  it('returns positive days for future deadline', () => {
    const goal = {
      targetDate: Date.now() + 3 * 86400000 // 3 days from now
    }
    const days = daysUntilDeadline(goal)
    expect(days).toBeGreaterThanOrEqual(2)
    expect(days).toBeLessThanOrEqual(4)
  })

  it('returns negative days for past deadline', () => {
    const goal = {
      targetDate: Date.now() - 2 * 86400000 // 2 days ago
    }
    const days = daysUntilDeadline(goal)
    expect(days).toBeLessThan(0)
  })

  it('returns null when no deadline set', () => {
    const goal = {}
    expect(daysUntilDeadline(goal)).toBeNull()
  })
})

describe('edge cases', () => {
  it('handles null goal gracefully', () => {
    const S = baseState()
    expect(goalProgress(S, null)).toBeNull()
  })

  it('handles unknown goal type', () => {
    const S = baseState()
    const goal = { type: 'unknown', status: 'active' }
    expect(goalProgress(S, goal)).toBeNull()
  })

  it('handles negative progress for regression', () => {
    const S = baseState()
    S.bodyweight = [{ d: '2026-09-27', w: 78, t: Date.now() }]
    const goal = {
      type: 'bodyweight',
      startBodyweight: 75,
      targetBodyweight: 70,
      status: 'active'
    }

    const progress = goalProgress(S, goal)
    // User gained weight when trying to lose - progress should be 0, not negative
    expect(progress.progress).toBe(0)
    expect(progress.achieved).toBe(false)
  })
})
