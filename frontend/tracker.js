/* =========================================================
   NerdLume — tracker.js
   Central Tracking Engine for sessions, uploads, and generations
   ========================================================= */

const NB_Tracker = (function () {
  function _getCurrentUserEmail() {
    try {
      const s = localStorage.getItem('nb_session');
      if (s) {
        const session = JSON.parse(s);
        if (session && session.email) {
          return session.email.trim().toLowerCase();
        }
      }
    } catch (e) {}
    return 'guest';
  }

  function _getUserKey(baseKey) {
    const email = _getCurrentUserEmail();
    return `${baseKey}_${email}`;
  }

  function _seedDemoDataIfNeeded(email) {
    return { generations: [], uploads: [], sessions: [] };
  }

  // Helper to get raw data
  function _getData() {
    try {
      const email = _getCurrentUserEmail();
      const key = _getUserKey('nb_stats');
      const data = localStorage.getItem(key);
      if (!data && (email === 'demo@nerdlume.in' || email === 'demo@nerdybro.in')) {
        return _seedDemoDataIfNeeded(email);
      }
      return data ? JSON.parse(data) : { generations: [], uploads: [], sessions: [] };
    } catch (e) {
      return { generations: [], uploads: [], sessions: [] };
    }
  }

  // Helper to save raw data
  function _saveData(data) {
    try {
      const key = _getUserKey('nb_stats');
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save tracking data', e);
    }
  }

  // Helper to get date string in YYYY-MM-DD
  function _getDateString(date = new Date()) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return {
    getCurrentUserEmail: _getCurrentUserEmail,

    // ── Track Daily Session ──
    trackSession: function () {
      const data = _getData();
      const todayStr = _getDateString();
      if (!data.sessions) data.sessions = [];
      if (!data.sessions.includes(todayStr)) {
        data.sessions.push(todayStr);
        _saveData(data);
      }
      if (typeof window !== 'undefined') {
        try { window.dispatchEvent(new CustomEvent('nb-session-updated')); } catch(e){}
      }
    },

    // ── Track File Upload ──
    trackUpload: function (file) {
      const data = _getData();
      if (!data.uploads) data.uploads = [];

      // Avoid tracking duplicates
      if (data.uploads.some(u => u.name === file.name)) return;

      const sizeStr = file.size >= 1024 * 1024
        ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
        : Math.round(file.size / 1024) + ' KB';

      data.uploads.unshift({
        name: file.name,
        ext: file.name.split('.').pop().toLowerCase() || 'txt',
        size: sizeStr,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        ts: new Date().toISOString()
      });
      _saveData(data);
      if (typeof window !== 'undefined') {
        try { window.dispatchEvent(new CustomEvent('nb-file-uploaded', { detail: { file } })); } catch(e){}
      }
    },

    // ── Track Generation ──
    trackGeneration: function (type, topic, mode) {
      const data = _getData();
      if (!data.generations) data.generations = [];

      // type is 'notes', 'practice', 'explain', 'quick'
      data.generations.unshift({
        id: Math.random().toString(36).substring(2, 9),
        type: type,
        topic: topic,
        mode: mode,
        ts: new Date().toISOString()
      });
      _saveData(data);
      if (typeof window !== 'undefined') {
        try { window.dispatchEvent(new CustomEvent('nb-generation-created', { detail: { type, topic, mode } })); } catch(e){}
      }
    },

    getGenerations: function () {
      const data = _getData();
      return (data.generations || []).filter(g => g && (!g.id || !String(g.id).startsWith('demo')));
    },

    // ── Get All Stats ──
    getStats: function (targetEmail) {
      const email = (targetEmail || _getCurrentUserEmail()).trim().toLowerCase();
      const statsKey = `nb_stats_${email}`;
      const mockKey  = `nb_mock_history_${email}`;

      let data = { generations: [], uploads: [], sessions: [] };
      try {
        const raw = localStorage.getItem(statsKey);
        if (raw) data = JSON.parse(raw);
      } catch (e) {}

      let mockHistory = [];
      try {
        mockHistory = JSON.parse(localStorage.getItem(mockKey) || '[]');
      } catch (e) { }

      // Streak calculation
      let streak = 0;
      if (data.sessions && data.sessions.length > 0) {
        const sortedSessions = [...new Set(data.sessions)].sort((a, b) => new Date(b) - new Date(a));
        const todayStr = _getDateString();
        const yesterdayStr = _getDateString(new Date(Date.now() - 86400000));

        const latest = sortedSessions[0];
        if (latest === todayStr || latest === yesterdayStr) {
          streak = 1;
          let currentRef = new Date(latest);
          for (let i = 1; i < sortedSessions.length; i++) {
            const prevRef = new Date(sortedSessions[i]);
            const diffTime = Math.abs(currentRef - prevRef);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
              streak++;
              currentRef = prevRef;
            } else if (diffDays > 1) {
              break;
            }
          }
        }
      }

      const realGenerations = (data.generations || []).filter(g => g && (!g.id || !String(g.id).startsWith('demo')));
      const realUploads = (data.uploads || []).filter(u => u && (!u.id || !String(u.id).startsWith('demo')) && !String(u.name || '').includes('Syllabus'));
      const realMockHistory = (mockHistory || []).filter(h => h && (!h.id || !String(h.id).startsWith('demo')) && !String(h.topic || '').includes('MCQ Quiz'));

      const notesCount = realGenerations.filter(g => g.type === 'notes' || g.type === 'explain' || g.type === 'quick').length;
      const testsCount = realMockHistory.length;
      const filesCount = realUploads.length;
      const sessionsCount = (data.sessions || []).length;

      const avgScore = mockHistory.length
        ? Math.round(mockHistory.reduce((sum, h) => sum + (h.pct || 0), 0) / mockHistory.length)
        : 0;

      const bestScore = mockHistory.length
        ? Math.max(...mockHistory.map(h => h.pct || 0))
        : 0;

      return {
        notesCount,
        testsCount,
        filesCount,
        sessionsCount,
        streak,
        avgScore,
        bestScore
      };
    },

    // ── Get Daily Activity Map (For LeetCode Heatmap) ──
    getDailyActivityMap: function (customHistoryEntries = []) {
      const data = _getData();
      let mockHistory = [];
      try {
        const mockKey = _getUserKey('nb_mock_history');
        mockHistory = JSON.parse(localStorage.getItem(mockKey) || '[]');
      } catch (e) { }

      const map = {};

      function inc(dateStr, kind) {
        if (!dateStr) return;
        if (!map[dateStr]) {
          map[dateStr] = { total: 0, notes: 0, practice: 0, uploads: 0, sessions: 0 };
        }
        if (kind) {
          map[dateStr][kind] = (map[dateStr][kind] || 0) + 1;
        }
        map[dateStr].total += 1;
      }

      // Add backend history entries if provided
      if (customHistoryEntries && customHistoryEntries.length > 0) {
        customHistoryEntries.forEach(entry => {
          if (entry.createdAt) {
            const dStr = _getDateString(entry.createdAt);
            if (['notes', 'explain', 'quick', 'video', 'video-notes'].includes(entry.kind)) {
              inc(dStr, 'notes');
            } else {
              inc(dStr, 'practice');
            }
          }
        });
      } else {
        // Fallback to local generations
        (data.generations || []).forEach(g => {
          if (g.ts) {
            const dStr = _getDateString(g.ts);
            if (g.type === 'notes' || g.type === 'explain' || g.type === 'quick') {
              inc(dStr, 'notes');
            } else {
              inc(dStr, 'practice');
            }
          }
        });
      }

      // Add sessions
      (data.sessions || []).forEach(dateStr => {
        if (dateStr) inc(dateStr, 'sessions');
      });

      // Add uploads
      (data.uploads || []).forEach(u => {
        if (u.ts) {
          const dStr = _getDateString(u.ts);
          inc(dStr, 'uploads');
        }
      });

      // Add mock tests
      mockHistory.forEach(h => {
        if (h.date) {
          const dStr = _getDateString(h.date);
          inc(dStr, 'practice');
        }
      });

      return map;
    },

    // ── Get Activity Feed ──
    getActivity: function () {
      const data = _getData();
      let mockHistory = [];
      try {
        const mockKey = _getUserKey('nb_mock_history');
        mockHistory = JSON.parse(localStorage.getItem(mockKey) || '[]');
      } catch (e) { }

      const activity = [];

      // Add generations
      (data.generations || []).forEach(g => {
        let icon = '';
        let typeName = 'Note Making';
        if (g.type === 'explain') { icon = ''; typeName = 'Explain Mode'; }
        if (g.type === 'quick') { icon = ''; typeName = 'Quick Mode'; }
        if (g.type === 'practice') { icon = ''; typeName = 'Practice'; }

        activity.push({
          type: g.type,
          icon: icon,
          title: `${g.mode} — ${g.topic}`,
          meta: `${typeName} · ${g.mode}`,
          score: null,
          badge: null,
          ts: g.ts,
          btn: g.type === 'quick' ? 'Download' : g.type === 'explain' ? 'Reuse' : 'View'
        });
      });

      // Add uploads
      (data.uploads || []).forEach(u => {
        activity.push({
          type: 'file',
          icon: '',
          title: `Uploaded: ${u.name}`,
          meta: `File upload · ${u.size} · Used for note generation`,
          score: null,
          badge: null,
          ts: u.ts,
          btn: 'Remove'
        });
      });

      // Add mock tests
      mockHistory.forEach(h => {
        activity.push({
          type: 'mock',
          icon: '',
          title: `Mock Test: ${h.topic} — ${h.count} Questions`,
          meta: `MCQ + MSQ + Descriptive · ${h.diff} · ${h.syl}`,
          score: h.pct,
          badge: h.pct >= 70 ? 'good' : h.pct >= 50 ? 'mid' : 'low',
          ts: h.date,
          btn: 'Review'
        });
      });

      // Sort by timestamp descending
      return activity.sort((a, b) => new Date(b.ts) - new Date(a.ts));
    },

    // ── Get Generations ──
    getGenerations: function () {
      const data = _getData();
      return (data.generations || []).map(g => ({
        text: `Generate ${g.mode} for ${g.topic}`,
        type: g.type,
        mode: g.mode,
        time: new Date(g.ts).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })
      }));
    },

    // ── Get Uploads ──
    getUploads: function () {
      const data = _getData();
      return data.uploads || [];
    },

    // ── Clear All Data ──
    clearAll: function () {
      const data = _getData();
      data.generations = [];
      _saveData(data);
    },

    // ── Plan Tracking ──
    getPlan: function () {
      // Prioritize active session plan first
      try {
        const s = localStorage.getItem('nb_session');
        if (s) {
          const plan = JSON.parse(s).plan;
          if (plan) return plan;
        }
      } catch (e) { }

      const data = _getData();
      if (data.plan) return data.plan;

      return 'free';
    },

    setPlan: function (plan) {
      const data = _getData();
      data.plan = plan;
      _saveData(data);

      // Synchronize back to session
      try {
        const s = localStorage.getItem('nb_session');
        if (s) {
          const sessionObj = JSON.parse(s);
          sessionObj.plan = plan;
          localStorage.setItem('nb_session', JSON.stringify(sessionObj));
        }
      } catch (e) { }
    }
  };
})();

// Automatic session track on inclusion
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    NB_Tracker.trackSession();
  });
}
