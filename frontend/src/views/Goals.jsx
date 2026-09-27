import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { bodyweightGoalCreateSheet } from '../sheets.jsx'

export default function Goals() {
  return <>
    <div className="hdr"><div><h1>{t('Goals')}</h1><div className="sub">{t('Track the goals you want to achieve')}</div></div></div>
    <div className="empty"><div className="ico"><Icon name="target" /></div>{t('No goals yet.')}</div>
    <div style={{ padding: '10px 2px 0' }}>
      <Button variant="primary" icon="plus" onClick={bodyweightGoalCreateSheet}>{t('Add Goal')}</Button>
    </div>
  </>
}

