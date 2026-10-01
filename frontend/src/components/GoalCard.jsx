import { useStore } from '../store/useStore.js'
import { goalProgress } from '../lib/goals.js'
import { EXIDX } from '../lib/exercises.js'
import { fmtNum } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'

// Reusable progress bar component
export function GoalProgressBar({ progress, achieved, small }) {
  const pct = Math.min(100, Math.max(0, (progress || 0) * 100))
  const color = achieved ? 'var(--yellow)' : 'var(--acc)'
  return (
    <div className={small ? 'gprog-sm' : 'gprog'}>
      <i style={{ width: pct + '%', background: color }} />
    </div>
  )
}

// Goal card component
export default function GoalCard({ goal, onClick }) {
  const S = useStore(s => s.S)
  const prog = goalProgress(S, goal)
  
  let name = ''
  let detail = ''
  
  if (goal.type === 'strength') {
    const ex = EXIDX[goal.exerciseId]
    name = ex ? ex.n : goal.exerciseId
    detail = prog ? fmtNum(prog.current) + ' / ' + fmtNum(prog.target) + ' ' + S.unit : '—'
  } else if (goal.type === 'bodyweight') {
    name = t('Body weight')
    detail = prog ? fmtNum(prog.current) + ' / ' + fmtNum(prog.target) + ' ' + S.unit : '—'
  } else if (goal.type === 'frequency') {
    name = t('Workout frequency')
    detail = prog ? prog.current + ' / ' + prog.target + ' ' + t('per week') : '—'
  } else if (goal.type === 'custom') {
    name = goal.title || t('Custom goal')
    detail = prog ? fmtNum(prog.current) + ' / ' + fmtNum(prog.target) + (goal.unit ? ' ' + goal.unit : '') : '—'
  }
  
  const statusTag = goal.status === 'completed' ? (
    <span className="tag" style={{ background: 'var(--yellow)', color: '#000' }}>
      <Icon name="checkCircle" style={{ fontSize: 11, marginRight: 3 }} />{t('Completed')}
    </span>
  ) : goal.status === 'archived' ? (
    <span className="tag">{t('Archived')}</span>
  ) : prog && prog.achieved ? (
    <span className="tag acc"><Icon name="trophy" style={{ fontSize: 11, marginRight: 3 }} />{t('Achieved')}</span>
  ) : null
  
  return (
    <div className="card" onClick={onClick} style={{ cursor: 'pointer', transition: 'background var(--fast)' }}
      onMouseDown={e => e.currentTarget.style.background = 'var(--surface-2)'}
      onMouseUp={e => e.currentTarget.style.background = ''}
      onMouseLeave={e => e.currentTarget.style.background = ''}>
      <div className="row between" style={{ marginBottom: 8 }}>
        <div className="capitalize" style={{ fontWeight: 600, fontSize: 17 }}>{name}</div>
        {statusTag}
      </div>
      <div className="small muted" style={{ marginBottom: 10 }}>{detail}</div>
      {prog && prog.hasData && (
        <>
          <GoalProgressBar progress={prog.progress} achieved={prog.achieved} />
          <div className="small muted" style={{ marginTop: 6 }}>
            {Math.round(prog.progress * 100)}% {t('complete')}
          </div>
        </>
      )}
      {prog && !prog.hasData && (
        <div className="small muted">{t('No data yet')}</div>
      )}
    </div>
  )
}