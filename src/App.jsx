import React from 'react'
import { getApiBase, setApiBase, apiGet } from './lib.api'

function useInput(init='') {
  const [v, set] = React.useState(init)
  return { v, set, bind: { value: v, onChange: e => set(e.target.value) } }
}

function Tab({label, active, onClick}){
  return <button className={'tab' + (active ? ' active' : '')} onClick={onClick}>{label}</button>
}

export default function App(){
  const [tab, setTab] = React.useState('Settings')
  const apiInit = getApiBase()
  const api = useInput(apiInit)

  const [health, setHealth] = React.useState(null)
  const [version, setVersion] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState('')

  const saveApi = () => setApiBase(api.v)

  const testHealth = async () => {
    setErr(''); setLoading(true); setHealth(null); setVersion(null);
    try { 
      const h = await apiGet('/health')
      setHealth(h)
      // also grab version right after health succeeds
      const v = await apiGet('/version')
      setVersion(v)
    }
    catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="container">
      <div className="header">
        <h1>TSF Frontend <span className="badge">v1.2</span></h1>
        <div className="small">Shows backend version in Checks</div>
      </div>

      <div className="tabs">
        <Tab label="Settings" active={tab==='Settings'} onClick={()=>setTab('Settings')} />
        <Tab label="Checks" active={tab==='Checks'} onClick={()=>setTab('Checks')} />
      </div>

      {tab === 'Settings' && (
        <div className="card">
          <h2>Settings</h2>
          <div className="kv" style={{marginTop: 12}}>
            <label>Backend API URL</label>
            <input className="input" placeholder="https://your-backend.onrender.com" {...api.bind} />
          </div>
          <div className="row" style={{marginTop: 12}}>
            <button className="button primary" onClick={saveApi}>Save</button>
            <div className="small">Saved to your browser only.</div>
          </div>
          <hr className="sep" />
          <div className="small">Tip: paste your backend URL exactly as it appears in Render. No trailing slash required.</div>
        </div>
      )}

      {tab === 'Checks' && (
        <div className="card">
          <h2>Connectivity Checks</h2>
          <div className="row" style={{marginTop: 12}}>
            <button className="button primary" onClick={testHealth} disabled={loading}>Check /health + /version</button>
          </div>
          <div style={{marginTop: 16}}>
            <div className="small">API Base: <span className="code">{getApiBase() || '(not set)'}</span></div>
            {!!health && (
              <div style={{marginTop: 10}}>
                <div>Health: <span className="status ok">{JSON.stringify(health)}</span></div>
              </div>
            )}
            {!!version && (
              <div style={{marginTop: 10}}>
                <div>Backend Version: <span className="status">{version.version}</span></div>
              </div>
            )}
            {!!err && <div style={{marginTop: 10, color:'var(--err)'}}>Error: {err}</div>}
          </div>
        </div>
      )}
    </div>
  )
}
