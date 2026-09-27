import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'

export default function Goals() {
  return <>
    <div className="hdr"><div><h1>{t('Goals')}</h1><div className="sub">{t('Track the goals you want to achieve')}</div></div></div>
    <div className="empty"><div className="ico"><Icon name="target" /></div>{t('No goals yet.')}</div>
  </>
}

