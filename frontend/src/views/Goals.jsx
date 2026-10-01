import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { activeGoals, completedGoals, archivedGoals } from '../lib/goals.js'
import { t } from '../lib/i18n.js'
import { Segmented, Button } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import GoalCard from '../components/GoalCard.jsx'
import {
  bodyweightGoalCreateSheet,
  strengthGoalCreateSheet,
  frequencyGoalCreateSheet,
  customGoalCreateSheet
} from '../sheets.jsx'

export default function Goals() {
  const nav = useNavigate()
  const openSheet = useUI(s => s.openSheet)
  const S = useStore(s => s.S)
  const [tab, setTab] = useState('active')

  const goals =
    tab === 'active'
      ? activeGoals(S)
      : tab === 'completed'
        ? completedGoals(S)
        : archivedGoals(S)

  const showAddMenu = () => {
    openSheet(close => (
      <div>
        <h3>{t('Add Goal')}</h3>

        <div className="list" style={{ marginTop: 14 }}>
          <button
            className="item"
            onClick={() => {
              close()
              strengthGoalCreateSheet()
            }}
          >
            <div
              className="thumb"
              style={{
                background: 'var(--acc-soft)',
                color: 'var(--acc)'
              }}
            >
              <Icon name="dumbbell" />
            </div>

            <div className="grow">
              <div className="tt">{t('Strength')}</div>
              <div className="ss">
                {t('Target weight for an exercise')}
              </div>
            </div>

            <Icon name="chevronRight" className="chev" />
          </button>

          <button
            className="item"
            onClick={() => {
              close()
              bodyweightGoalCreateSheet()
            }}
          >
            <div
              className="thumb"
              style={{
                background: 'var(--acc-soft)',
                color: 'var(--acc)'
              }}
            >
              <Icon name="scale" />
            </div>

            <div className="grow">
              <div className="tt">{t('Body weight')}</div>
              <div className="ss">
                {t('Target body weight')}
              </div>
            </div>

            <Icon name="chevronRight" className="chev" />
          </button>

          <button
            className="item"
            onClick={() => {
              close()
              frequencyGoalCreateSheet()
            }}
          >
            <div
              className="thumb"
              style={{
                background: 'var(--acc-soft)',
                color: 'var(--acc)'
              }}
            >
              <Icon name="calendar" />
            </div>

            <div className="grow">
              <div className="tt">{t('Frequency')}</div>
              <div className="ss">
                {t('Weekly workout target')}
              </div>
            </div>

            <Icon name="chevronRight" className="chev" />
          </button>

          <button
            className="item"
            onClick={() => {
              close()
              customGoalCreateSheet()
            }}
          >
            <div
              className="thumb"
              style={{
                background: 'var(--acc-soft)',
                color: 'var(--acc)'
              }}
            >
              <Icon name="sparkles" />
            </div>

            <div className="grow">
              <div className="tt">{t('Custom')}</div>
              <div className="ss">
                {t('Track any measurable goal')}
              </div>
            </div>

            <Icon name="chevronRight" className="chev" />
          </button>
        </div>
      </div>
    ))
  }

  return (
    <>
      <div className="hdr">
        <div>
          <h1>{t('Goals')}</h1>
          <div className="sub">
            {t('Track the goals you want to achieve')}
          </div>
        </div>
      </div>

      <Segmented
        className="seg-range"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'active', label: t('Active') },
          { value: 'completed', label: t('Completed') },
          { value: 'archived', label: t('Archived') }
        ]}
      />

      {goals.length === 0 ? (
        <div className="empty">
          <div className="ico">
            <Icon name="target" />
          </div>

          {tab === 'active'
            ? t('No active goals yet.')
            : tab === 'completed'
              ? t('No completed goals yet.')
              : t('No archived goals.')}
        </div>
      ) : (
        <div className="list" style={{ marginTop: 14 }}>
          {goals.map(g => (
            <GoalCard
              key={g.id}
              goal={g}
              onClick={() => nav('/goals/' + g.id)}
            />
          ))}
        </div>
      )}

      <div style={{ padding: '10px 2px 0' }}>
        <Button
          variant="primary"
          icon="plus"
          onClick={showAddMenu}
        >
          {t('Add Goal')}
        </Button>
      </div>
    </>
  )
}