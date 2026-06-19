import React, { useState, useEffect } from 'react';
import './App.css';

// ─── DATA LAYER ───
const getUsers = () => {
  try { return JSON.parse(localStorage.getItem('wellness_users')) || {}; } catch(e) { return {}; }
};
const saveUsers = (u) => { localStorage.setItem('wellness_users', JSON.stringify(u)); };
const getActivities = (email) => {
  try { return JSON.parse(localStorage.getItem('wellness_activities_' + email)) || []; } catch(e) { return []; }
};
const saveActivities = (email, acts) => { localStorage.setItem('wellness_activities_' + email, JSON.stringify(acts)); };

// ─── HELPERS ───
const getToday = () => new Date().toISOString().split('T')[0];
const formatDate = (d) => {
  if (!d) return '';
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  const dt = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
  return dt.toLocaleDateString('en-US', { month:'short', day:'numeric' });
};
const iconForType = (type) => {
  const map = { steps:'👣', calories:'🔥', water:'💧', sleep:'😴', workout:'💪' };
  return map[type] || '📊';
};
const getWeekDates = () => {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today);
  monday.setDate(diff);
  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    week.push(d.toISOString().split('T')[0]);
  }
  return week;
};

// ─── TOAST (global) ───
const showToast = (msg) => {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; setTimeout(() => t.remove(), 400); }, 3000);
};

function App() {
  // ─── STATE ───
  const [currentUser, setCurrentUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activePage, setActivePage] = useState('dashboard');
  const [isOn, setIsOn] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  // ─── AUTH ───
  const handleLogin = (email, password) => {
    const users = getUsers();
    if (!email || !password) { showToast('⚠️ Enter email and password'); return; }
    const user = users[email];
    if (!user) { showToast('⚠️ User not found. Register first.'); return; }
    if (user.password !== password) { showToast('⚠️ Incorrect password'); return; }
    setCurrentUser(email);
    const acts = getActivities(email);
    setActivities(acts);
    showToast('✅ Welcome, ' + user.name + '!');
  };

  const handleRegister = (name, email, password, password2) => {
    if (!name || !email || !password || !password2) { showToast('⚠️ All fields required'); return; }
    if (password !== password2) { showToast('⚠️ Passwords do not match'); return; }
    if (password.length < 4) { showToast('⚠️ Password min 4 chars'); return; }
    const users = getUsers();
    if (users[email]) { showToast('⚠️ Email already registered'); return; }
    users[email] = { name, password };
    saveUsers(users);
    showToast('✅ Account created! Please sign in.');
    setIsLogin(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActivities([]);
    showToast('👋 Signed out');
  };

  // ─── ACTIVITIES ───
  const addActivity = (type, value, date, note) => {
    if (!currentUser) return;
    const acts = getActivities(currentUser);
    acts.push({ type, value, date, note: note || '', timestamp: Date.now() });
    saveActivities(currentUser, acts);
    setActivities(acts);
  };

  const quickLog = (type, value) => {
    addActivity(type, value, getToday(), 'Quick log');
    showToast(`✅ Quick log: ${type} +${value}`);
  };

  // ─── WATCH INTEGRATION ───
  useEffect(() => {
    if (!currentUser) return;
    let lastTimestamp = 0;
    const interval = setInterval(() => {
      const key = 'wellness_watch_data';
      const raw = localStorage.getItem(key);
      if (!raw) return;
      try {
        const data = JSON.parse(raw);
        if (data.timestamp && data.timestamp > lastTimestamp && data.user === currentUser) {
          lastTimestamp = data.timestamp;
          const acts = getActivities(currentUser);
          const today = getToday();
          if (data.steps) {
            acts.push({ type: 'steps', value: data.steps, date: today, note: '⌚ Synced from watch', timestamp: Date.now() });
          }
          if (data.calories) {
            acts.push({ type: 'calories', value: data.calories, date: today, note: '⌚ Synced from watch', timestamp: Date.now() });
          }
          if (data.heartRate) {
            acts.push({ type: 'workout', value: Math.round(data.heartRate / 10), date: today, note: `❤️ Heart rate: ${data.heartRate} BPM`, timestamp: Date.now() });
          }
          if (data.steps || data.calories || data.heartRate) {
            saveActivities(currentUser, acts);
            setActivities(acts);
            showToast(`⌚ Watch synced: ${data.steps || 0} steps, ❤️ ${data.heartRate || 0} BPM`);
          }
          localStorage.removeItem(key);
        }
      } catch(e) {}
    }, 2000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // ─── RENDER HELPERS ───
  const today = getToday();
  const todayActs = activities.filter(a => a.date === today);
  const steps = todayActs.filter(a => a.type === 'steps').reduce((s, a) => s + a.value, 0);
  const calories = todayActs.filter(a => a.type === 'calories').reduce((s, a) => s + a.value, 0);
  const water = todayActs.filter(a => a.type === 'water').reduce((s, a) => s + a.value, 0);
  const sleep = todayActs.filter(a => a.type === 'sleep').reduce((s, a) => s + a.value, 0);
  const recent = activities.slice(-3).reverse();

  const weekDates = getWeekDates();
  const weekSteps = weekDates.map(d => activities.filter(a => a.date === d && a.type === 'steps').reduce((s, a) => s + a.value, 0));
  const maxWeekStep = Math.max(...weekSteps, 1);
  const weekCalories = weekDates.map(d => activities.filter(a => a.date === d && a.type === 'calories').reduce((s, a) => s + a.value, 0));
  const maxCal = Math.max(...weekCalories, 1);

  const stepGoal = 10000, waterGoal = 2000, sleepGoal = 8;
  const stepPct = Math.min(100, (steps / stepGoal) * 100);
  const waterPct = Math.min(100, (water / waterGoal) * 100);
  const sleepPct = Math.min(100, (sleep / sleepGoal) * 100);

  // ─── RENDER LOGIN ───
  if (!currentUser) {
    return (
      <div className="page login-page">
        <div className="bg-grid"></div>
        <div className="lamp-glow-blob" id="glowBlob"></div>
        <div className="scene">
          <div className="lamp-col">
            <div className="lamp-mount"></div>
            <div className="lamp-wrap" onClick={() => setIsOn(!isOn)}>
              <div className="lamp-cord"></div>
              <div className="lamp-body">
                <div className={`lamp-shade ${isOn ? 'on' : ''}`}></div>
                <div className={`lamp-bulb ${isOn ? 'on' : ''}`}></div>
              </div>
              <div className={`lamp-hint ${isOn ? 'on' : ''}`}>Click to turn on</div>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            {isLogin ? (
              <LoginForm onLogin={handleLogin} onSwitch={() => setIsLogin(false)} isOn={isOn} />
            ) : (
              <RegisterForm onRegister={handleRegister} onSwitch={() => setIsLogin(true)} isOn={isOn} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER DASHBOARD ───
  const userName = getUsers()[currentUser]?.name || currentUser.split('@')[0];
  const initials = userName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

  return (
    <div className="page home-page active">
      <nav className="hn">
        <div className="hn-logo">Wellness<span>Track</span></div>
        <ul className="hn-links">
  <li><a href="#" className={activePage === 'dashboard' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActivePage('dashboard'); }}>Dashboard</a></li>
  <li><a href="#" className={activePage === 'log' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActivePage('log'); }}>Log Activity</a></li>
  <li><a href="#" className={activePage === 'progress' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActivePage('progress'); }}>Progress</a></li>
  <li><a href="#" className={activePage === 'history' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActivePage('history'); }}>History</a></li>
</ul>
        <div className="hn-right">
  <div className="hn-avatar">{initials}</div>
  <button 
    className="hn-logout" 
    style={{ 
      background: 'transparent', 
      border: '1px solid #3EC97E', 
      color: '#3EC97E', 
      marginRight: '8px' 
    }}
    onClick={() => window.open('/watch.html', '_blank')}
  >
    ⌚ Watch
  </button>
  <button className="hn-logout" onClick={handleLogout}>Sign out</button>
</div>
      </nav>

      {activePage === 'dashboard' && (
        <Dashboard
          userName={userName}
          steps={steps}
          calories={calories}
          water={water}
          sleep={sleep}
          recent={recent}
          todayActs={todayActs}
          weekDates={weekDates}
          weekSteps={weekSteps}
          maxWeekStep={maxWeekStep}
          stepPct={stepPct}
          waterPct={waterPct}
          sleepPct={sleepPct}
        />
      )}

      {activePage === 'log' && (
        <LogPage
          todayActs={todayActs}
          onAddActivity={addActivity}
          onQuickLog={quickLog}
        />
      )}

      {activePage === 'progress' && (
        <ProgressPage
          weekDates={weekDates}
          weekSteps={weekSteps}
          maxWeekStep={maxWeekStep}
          weekCalories={weekCalories}
          maxCal={maxCal}
          activities={activities}
        />
      )}

      {activePage === 'history' && (
        <HistoryPage activities={activities} />
      )}
    </div>
  );
}

// ─── COMPONENTS ───

const LoginForm = ({ onLogin, onSwitch, isOn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className={`login-form ${isOn ? 'active' : ''}`}>
      <div className="form-logo"><div className="logo-icon">🏃</div><div className="logo-text">Wellness<span>Track</span></div></div>
      <div className="form-heading">Student Wellness</div>
      <div className="form-sub">Track your fitness &amp; health</div>
      <div className="input-group">
        <label className="input-label">Email</label>
        <span className="input-icon">📧</span>
        <input className="input-field" type="email" placeholder="student@college.edu" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div className="input-group">
        <label className="input-label">Password</label>
        <span className="input-icon">🔒</span>
        <input className="input-field" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
      </div>
      <div className="remember-row">
        <label className="remember-label"><input type="checkbox" /> Remember me</label>
        <a href="#" className="forgot-link">Forgot password?</a>
      </div>
      <button className="submit-btn" onClick={() => onLogin(email, password)}>Sign In →</button>
      <div className="divider">or continue with</div>
      <button className="social-btn">🔑 Google</button>
      <button className="social-btn">🍎 Apple</button>
      <div className="signup-row">New student? <a onClick={onSwitch}>Register here</a></div>
    </div>
  );
};

const RegisterForm = ({ onRegister, onSwitch, isOn }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');

  return (
    <div className={`register-form ${isOn ? 'active' : ''}`}>
      <div className="form-logo"><div className="logo-icon">🏃</div><div className="logo-text">Wellness<span>Track</span></div></div>
      <div className="form-heading">Create Account</div>
      <div className="form-sub">Join the wellness community</div>
      <div className="input-group">
        <label className="input-label">Full Name</label>
        <span className="input-icon">👤</span>
        <input className="input-field" type="text" placeholder="Alex Johnson" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="input-group">
        <label className="input-label">Email</label>
        <span className="input-icon">📧</span>
        <input className="input-field" type="email" placeholder="student@college.edu" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div className="input-group">
        <label className="input-label">Password</label>
        <span className="input-icon">🔒</span>
        <input className="input-field" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
      </div>
      <div className="input-group">
        <label className="input-label">Confirm Password</label>
        <span className="input-icon">✓</span>
        <input className="input-field" type="password" placeholder="••••••••" value={password2} onChange={e => setPassword2(e.target.value)} />
      </div>
      <button className="submit-btn" onClick={() => onRegister(name, email, password, password2)}>Create Account →</button>
      <div className="auth-toggle">Already have an account? <a onClick={onSwitch}>Sign in here</a></div>
    </div>
  );
};

const Dashboard = ({ userName, steps, calories, water, sleep, recent, todayActs, weekDates, weekSteps, maxWeekStep, stepPct, waterPct, sleepPct }) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="inner-page active" id="inner-dashboard">
      <div className="h-hero">
        <div className="h-hero-inner">
          <div className="h-hero-tag">Live · {dateStr}</div>
          <h1>Hello, <em>{userName}</em> 👋</h1>
          <p>Stay active, stay healthy. Here's your daily wellness snapshot.</p>
        </div>
      </div>
      <div className="h-main">
        <div className="sec-label">Today's Stats</div>
        <div className="stat-grid">
          <div className="sc g"><span className="sc-chg up">+12%</span><div className="sc-icon">👣</div><div className="sc-val">{steps}</div><div className="sc-lbl">Steps</div></div>
          <div className="sc t"><span className="sc-chg up">+5%</span><div className="sc-icon">🔥</div><div className="sc-val">{calories}</div><div className="sc-lbl">Calories</div></div>
          <div className="sc a"><span className="sc-chg nu">⏳</span><div className="sc-icon">💧</div><div className="sc-val">{water}</div><div className="sc-lbl">Water (ml)</div></div>
          <div className="sc p"><span className="sc-chg up">↑ 8%</span><div className="sc-icon">😴</div><div className="sc-val">{sleep.toFixed(1)}</div><div className="sc-lbl">Sleep (hrs)</div></div>
        </div>
        <div className="two-col">
          <div className="hcard">
            <div className="hcard-header">
              <div><div className="hcard-title">Recent Activity</div><div className="hcard-sub">Last 3 entries</div></div>
              <span className="badge badge-g">{todayActs.length} today</span>
            </div>
            <div id="recentActivities">
              {recent.length === 0 ? (
                <div style={{ padding: '1rem 0', color: '#6B7066', fontSize: '.9rem' }}>No activities logged yet.</div>
              ) : (
                recent.map((a, i) => (
                  <div className="act-item" key={i}>
                    <div className="act-icon" style={{ background: '#E8FAF1' }}>{iconForType(a.type)}</div>
                    <div className="act-info">
                      <div className="act-name">{a.type.charAt(0).toUpperCase() + a.type.slice(1)}</div>
                      <div className="act-meta">{formatDate(a.date)}{a.note ? ' · ' + a.note : ''}</div>
                    </div>
                    <div className="act-value">{a.value}</div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="hcard">
            <div className="hcard-title" style={{ marginBottom: '.25rem' }}>Daily Goals</div>
            <div className="hcard-sub">Today's progress</div>
            <div className="progress-bar-wrap">
              <div className="progress-label"><span>Steps (10k)</span><span>{Math.round(stepPct)}%</span></div>
              <div className="progress-track"><div className="progress-fill" style={{ width: stepPct + '%' }}></div></div>
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-label"><span>Water (2000ml)</span><span>{Math.round(waterPct)}%</span></div>
              <div className="progress-track"><div className="progress-fill" style={{ width: waterPct + '%' }}></div></div>
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-label"><span>Sleep (8hrs)</span><span>{Math.round(sleepPct)}%</span></div>
              <div className="progress-track"><div className="progress-fill" style={{ width: sleepPct + '%' }}></div></div>
            </div>
          </div>
        </div>
        <div className="sec-label">This Week</div>
        <div className="hcard" style={{ marginBottom: '3rem' }}>
          <div className="hcard-header">
            <div><div className="hcard-title">Weekly Activity</div><div className="hcard-sub">Steps per day</div></div>
            <span className="badge badge-g">Last 7 days</span>
          </div>
          <div id="weeklyChart" style={{ display: 'flex', gap: '1rem', justifyContent: 'space-around', padding: '1rem 0' }}>
            {weekDates.map((d, i) => {
              const pct = (weekSteps[i] / maxWeekStep) * 100;
              const dayLabel = new Date(d).toLocaleDateString('en', { weekday: 'short' });
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{ height: Math.max(20, pct) + 'px', width: '24px', background: '#3EC97E', borderRadius: '6px 6px 0 0', transition: 'height .4s' }}></div>
                  <span style={{ fontSize: '.7rem', color: '#6B7066', marginTop: '4px' }}>{dayLabel}</span>
                  <span style={{ fontSize: '.6rem', color: '#1A1E16' }}>{weekSteps[i]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const LogPage = ({ todayActs, onAddActivity, onQuickLog }) => {
  const [type, setType] = useState('steps');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(getToday());
  const [note, setNote] = useState('');

  return (
    <div className="inner-page active" id="inner-log">
      <div className="h-hero" style={{ background: 'linear-gradient(135deg,#0D2318,#1A3828 60%,#0F2220)' }}>
        <div className="h-hero-inner">
          <div className="h-hero-tag">Log your progress</div>
          <h1>Log <em>Activity</em></h1>
          <p>Add workouts, meals, water, or sleep – every entry counts.</p>
        </div>
      </div>
      <div className="h-main">
        <div className="sec-label">New Entry</div>
        <div className="log-grid">
          <div className="form-section">
            <div className="hcard-title" style={{ marginBottom: '.3rem' }}>Activity Details</div>
            <div className="hcard-sub">Fill in below</div>
            <div className="form-row">
              <label>Type</label>
              <select value={type} onChange={e => setType(e.target.value)}>
                <option value="steps">Steps</option>
                <option value="calories">Calories Burned</option>
                <option value="water">Water (ml)</option>
                <option value="sleep">Sleep (hours)</option>
                <option value="workout">Workout (mins)</option>
              </select>
            </div>
            <div className="form-row">
              <label>Value</label>
              <input type="number" placeholder="e.g. 5000" value={value} onChange={e => setValue(e.target.value)} />
            </div>
            <div className="form-row">
              <label>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="form-row">
              <label>Note (optional)</label>
              <textarea placeholder="Any extra info…" value={note} onChange={e => setNote(e.target.value)}></textarea>
            </div>
            <button className="log-btn" onClick={() => {
              if (!value || parseFloat(value) <= 0) { showToast('⚠️ Enter a valid value'); return; }
              onAddActivity(type, parseFloat(value), date, note);
              setValue('');
              setNote('');
            }}>✅ Log Entry</button>
          </div>
          <div className="form-section">
            <div className="hcard-title" style={{ marginBottom: '.3rem' }}>Quick Log</div>
            <div className="hcard-sub">Common entries</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginTop: '1rem' }}>
              <button className="log-btn" style={{ flex: 1, minWidth: '80px', padding: '.5rem' }} onClick={() => onQuickLog('steps', 5000)}>+5000 Steps</button>
              <button className="log-btn" style={{ flex: 1, minWidth: '80px', padding: '.5rem' }} onClick={() => onQuickLog('water', 500)}>+500ml Water</button>
              <button className="log-btn" style={{ flex: 1, minWidth: '80px', padding: '.5rem' }} onClick={() => onQuickLog('sleep', 1)}>+1hr Sleep</button>
              <button className="log-btn" style={{ flex: 1, minWidth: '80px', padding: '.5rem' }} onClick={() => onQuickLog('calories', 200)}>+200 Cal</button>
            </div>
          </div>
        </div>
        <div className="sec-label">Today's Log</div>
        <div className="hcard" style={{ marginBottom: '3rem' }}>
          <div id="todayLog">
            {todayActs.length === 0 ? (
              <div style={{ padding: '1rem 0', color: '#6B7066', fontSize: '.9rem' }}>Nothing logged today. Start now!</div>
            ) : (
              todayActs.map((a, i) => (
                <div className="act-item" key={i}>
                  <div className="act-icon" style={{ background: '#E8FAF1' }}>{iconForType(a.type)}</div>
                  <div className="act-info">
                    <div className="act-name">{a.type.charAt(0).toUpperCase() + a.type.slice(1)}</div>
                    <div className="act-meta">{a.note || ''}</div>
                  </div>
                  <div className="act-value">{a.value}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProgressPage = ({ weekDates, weekSteps, maxWeekStep, weekCalories, maxCal, activities }) => {
  const thisWeekSteps = weekSteps.reduce((a,b) => a+b, 0);
  const avgThis = Math.round(thisWeekSteps / 7);
  const lastWeekDates = weekDates.map(d => {
    const dt = new Date(d);
    dt.setDate(dt.getDate() - 7);
    return dt.toISOString().split('T')[0];
  });
  const lastWeekSteps = lastWeekDates.map(d => activities.filter(a => a.date === d && a.type === 'steps').reduce((s,a) => s + a.value, 0));
  const avgLast = Math.round(lastWeekSteps.reduce((a,b) => a+b, 0) / 7);
  const change = avgLast === 0 ? 0 : Math.round(((avgThis - avgLast) / avgLast) * 100);

  return (
    <div className="inner-page active" id="inner-progress">
      <div className="h-hero" style={{ background: 'linear-gradient(135deg,#1E1A2E,#2D1E3A 60%,#1A1428)' }}>
        <div className="h-hero-inner">
          <div className="h-hero-tag" style={{ background: 'rgba(123,97,255,.15)', borderColor: 'rgba(123,97,255,.3)', color: '#7B61FF' }}>Analytics</div>
          <h1>Your <em style={{ color: '#7B61FF' }}>Progress</em></h1>
          <p>See how you're improving week by week.</p>
        </div>
      </div>
      <div className="h-main">
        <div className="sec-label">Weekly Summary</div>
        <div className="two-col-eq">
          <div className="hcard">
            <div className="hcard-title">Steps</div>
            <div id="weeklySteps" style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '8px', paddingTop: '1rem' }}>
              {weekDates.map((d, i) => {
                const pct = (weekSteps[i] / maxWeekStep) * 100;
                const dayLabel = new Date(d).toLocaleDateString('en', { weekday: 'short' });
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div style={{ height: Math.max(20, pct) + 'px', width: '24px', background: '#0BCBD4', borderRadius: '6px 6px 0 0', transition: 'height .4s' }}></div>
                    <span style={{ fontSize: '.7rem', color: '#6B7066', marginTop: '4px' }}>{dayLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="hcard">
            <div className="hcard-title">Calories</div>
            <div id="weeklyCalories" style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '8px', paddingTop: '1rem' }}>
              {weekDates.map((d, i) => {
                const pct = (weekCalories[i] / maxCal) * 100;
                const dayLabel = new Date(d).toLocaleDateString('en', { weekday: 'short' });
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div style={{ height: Math.max(20, pct) + 'px', width: '24px', background: '#F5A623', borderRadius: '6px 6px 0 0', transition: 'height .4s' }}></div>
                    <span style={{ fontSize: '.7rem', color: '#6B7066', marginTop: '4px' }}>{dayLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="sec-label">Monthly Trends</div>
        <div className="full-card">
          <div className="hcard-title">Average Daily Steps</div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <div><span style={{ color: '#6B7066' }}>This week</span><br /><strong>{avgThis}</strong></div>
            <div><span style={{ color: '#6B7066' }}>Last week</span><br /><strong>{avgLast}</strong></div>
            <div><span style={{ color: '#6B7066' }}>Change</span><br /><strong>{(change >= 0 ? '+' : '') + change + '%'}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HistoryPage = ({ activities }) => {
  return (
    <div className="inner-page active" id="inner-history">
      <div className="h-hero" style={{ background: 'linear-gradient(135deg,#1E1A2E,#2D1E3A 60%,#1A1428)' }}>
        <div className="h-hero-inner">
          <div className="h-hero-tag" style={{ background: 'rgba(123,97,255,.15)', borderColor: 'rgba(123,97,255,.3)', color: '#7B61FF' }}>Records</div>
          <h1>Activity <em style={{ color: '#7B61FF' }}>History</em></h1>
          <p>Every workout, step, and sip – all in one place.</p>
        </div>
      </div>
      <div className="h-main">
        <div className="sec-label">All Entries</div>
        <div className="full-card">
          <div id="historyList">
            {activities.length === 0 ? (
              <div style={{ padding: '1rem 0', color: '#6B7066', fontSize: '.9rem' }}>No entries yet.</div>
            ) : (
              activities.slice().reverse().map((a, i) => (
                <div className="act-item" key={i}>
                  <div className="act-icon" style={{ background: '#E8FAF1' }}>{iconForType(a.type)}</div>
                  <div className="act-info">
                    <div className="act-name">{a.type.charAt(0).toUpperCase() + a.type.slice(1)}</div>
                    <div className="act-meta">{formatDate(a.date)}{a.note ? ' · ' + a.note : ''}</div>
                  </div>
                  <div className="act-value">{a.value}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;