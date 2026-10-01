import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { goalProgress } from '../lib/goals.js'
import { fmtNum, fmtDate, weekKey } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import LineChart from '../components/LineChart.jsx'
import { GoalProgressBar } from '../components/GoalCard.jsx'
import { confirmSheet } from '../sheets.jsx'

export default function GoalDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)

  const goal = (S.goals || []).find(g => g.id === id)
  if (!goal) {
    return (
      <div className="hdr">
        <button className="iconbtn" onClick={() => nav('/goals')}>
          <Icon name="chevronLeft" />
        </button>
        <div style={{ flex: 1, marginLeft: 12 }}>
          <h1>{t('Goal not found')}</h1>
        </div>
      </div>
    )
  }

  const prog = goalProgress(S, goal)

  let name = ''
  if (goal.type === 'strength') {
    name = goal.exerciseName || goal.title || t('Strength goal')
  } else if (goal.type === 'bodyweight') {
    name = t('Body weight')
  } else if (goal.type === 'frequency') {
    name = t('Workout frequency')
  } else if (goal.type === 'custom') {
    name = goal.title || t('Custom goal')
  }

  // Check-ins shared by strength + custom goals
  const goalCheckIns = (S.goalCheckIns || [])
    .filter(c => c.goalId === goal.id)
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))

  // Chart data
  let chartPoints = []
  if (goal.type === 'strength') {
    chartPoints = goalCheckIns.map(c => ({
      t: c.timestamp,
      y: Number(c.value),
      d: c.date
    }))
  } else if (goal.type === 'bodyweight') {
    chartPoints = (S.bodyweight || []).map(b => ({
      t: b.t || new Date(b.d).getTime(),
      y: b.w,
      d: b.d
    }))
  } else if (goal.type === 'frequency') {
    const weeks = {}
    ;(S.workouts || []).forEach(w => {
      const wk = weekKey(w.d)
      weeks[wk] = (weeks[wk] || 0) + 1
    })
    chartPoints = Object.keys(weeks)
      .sort()
      .map(wk => {
        const [y, w] = wk.split('-')
        const d = new Date(parseInt(y), 0, 1 + (parseInt(w) - 1) * 7)
        return { t: d.getTime(), y: weeks[wk], d: wk }
      })
  } else if (goal.type === 'custom') {
    chartPoints = goalCheckIns.map(c => ({
      t: c.timestamp,
      y: Number(c.value),
      d: c.date
    }))
  }

  // Milestones
  const milestones = []
  if (prog && prog.hasData) {
    const thresholds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5]
    thresholds.forEach(pct => {
      milestones.push({
        pct,
        reached: prog.progress >= pct,
        label: Math.round(pct * 100) + '%'
      })
    })
  }

  const markCompleted = () => {
    if (goal.status === 'completed') return
    update(s => {
      const g = s.goals.find(x => x.id === goal.id)
      if (g) {
        g.status = 'completed'
        if (!g.completedAt) g.completedAt = Date.now()
      }
    })
    nav('/goals')
  }

  const archiveGoal = () => {
    update(s => {
      const g = s.goals.find(x => x.id === goal.id)
      if (g) g.status = 'archived'
    })
    nav('/goals')
  }

  const deleteGoal = () => {
    confirmSheet({
      title: t('Delete goal?'),
      message: t('This cannot be undone.'),
      confirmText: t('Delete'),
      danger: true,
      onConfirm: () => {
        update(s => {
          s.goals = s.goals.filter(g => g.id !== goal.id)
          s.goalCheckIns = (s.goalCheckIns || []).filter(c => c.goalId !== goal.id)
        })
        nav('/goals')
      }
    })
  }

  const chartUnit =
    goal.type === 'strength' || goal.type === 'bodyweight'
      ? S.unit
      : goal.type === 'custom'
        ? goal.unit || ''
        : ''

  return (
    <>
      <div className="hdr">
        <button className="iconbtn" onClick={() => nav('/goals')}>
          <Icon name="chevronLeft" />
        </button>
        <div style={{ flex: 1, marginLeft: 12 }}>
          <h1 className="capitalize">{name}</h1>
          <div className="sub">
            {t(goal.type.charAt(0).toUpperCase() + goal.type.slice(1) + ' goal')}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>{t('Overview')}</h2>
        <div className="tiles">
          <div className="tile">
            <div className="l">{t('Created')}</div>
            <div className="v">
              {goal.createdAt
                ? fmtDate(new Date(goal.createdAt).toISOString().split('T')[0], true)
                : '—'}
            </div>
          </div>
          <div className="tile">
            <div className="l">{t('Start')}</div>
            <div className="v">{prog ? fmtNum(prog.start) : '—'}</div>
          </div>
          <div className="tile">
            <div className="l">{t('Current')}</div>
            <div className="v">{prog ? fmtNum(prog.current) : '—'}</div>
          </div>
          <div className="tile">
            <div className="l">{t('Target')}</div>
            <div className="v">{prog ? fmtNum(prog.target) : '—'}</div>
          </div>
        </div>

        {prog && prog.hasData && (
          <>
            <div style={{ marginTop: 14 }}>
              <GoalProgressBar progress={prog.progress} achieved={prog.achieved} />
            </div>
            <div className="row between small muted" style={{ marginTop: 8 }}>
              <span>
                {Math.round(prog.progress * 100)}% {t('complete')}
              </span>
              <span>
                {prog.achieved
                  ? t('Target reached!')
                  : fmtNum(Math.abs(prog.target - prog.current)) + ' ' + t('to go')}
              </span>
            </div>
          </>
        )}
      </div>

      {chartPoints.length > 0 && (
        <div className="card">
          <h2>{t('Progress')}</h2>
          <div className="chart">
            <LineChart
              points={chartPoints}
              h={160}
              unit={chartUnit}
              goal={prog ? prog.target : null}
            />
          </div>
        </div>
      )}

      {milestones.length > 0 && (
        <div className="card">
          <h2>{t('Milestones')}</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {milestones.map((m, i) => (
              <div key={i} className={m.reached ? 'tag acc' : 'tag'}>
                {m.reached && (
                  <Icon name="check" style={{ fontSize: 11, marginRight: 3 }} />
                )}
                {m.label}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2>{t('Actions')}</h2>
        {goal.status === 'active' && (
          <Button
            variant="primary"
            icon="checkCircle"
            onClick={markCompleted}
            style={{ marginTop: 10 }}
          >
            {t('Mark as completed')}
          </Button>
        )}
        {goal.status !== 'archived' && (
          <>
            <div style={{ height: 8 }} />
            <Button icon="archive" onClick={archiveGoal}>
              {t('Archive')}
            </Button>
          </>
        )}
        <div style={{ height: 8 }} />
        <Button variant="danger" icon="trash" onClick={deleteGoal}>
          {t('Delete goal')}
        </Button>
      </div>
    </>
  )
}