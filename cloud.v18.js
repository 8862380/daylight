(function () {
  var URL = 'https://upvjucspjcobqkoxmzli.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwdmp1Y3NwamNvYnFrb3htemxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NjI0MDUsImV4cCI6MjEwMzIzODQwNX0.ZtsE985-71TVp3bSTiOmHnjfTFkm-B4l7OtLA3_u-TU';
  var ADMIN_EMAIL = '2092307480@qq.com';
  var SESSION_KEY = 'daylight_sb_session';

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch (e) { return null; }
  }
  function setSession(s) {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  }
  function api(path, opts) {
    opts = opts || {};
    var headers = { apikey: ANON, 'Content-Type': 'application/json' };
    if (opts.token) headers.Authorization = 'Bearer ' + opts.token;
    if (opts.prefer) headers.Prefer = opts.prefer;
    return fetch(URL + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    }).then(function (r) {
      return r.text().then(function (t) {
        var j = null;
        try { j = JSON.parse(t); } catch (e) { j = t; }
        return { status: r.status, json: j };
      });
    });
  }

  var currentUser = null;

  function usernameEmail(name) {
    var s = String(name || '').toLowerCase();
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    var hex = ('00000000' + h.toString(16)).slice(-8);
    return 'u' + hex + '@daylight.local';
  }

  function setUser(u) { currentUser = u; }

  function applySession(res) {
    if (res && res.json && res.json.access_token) {
      var s = {
        access_token: res.json.access_token,
        refresh_token: res.json.refresh_token,
        user: res.json.user,
      };
      setSession(s);
      setUser(s.user);
      return s.user;
    }
    return null;
  }

  function refresh(session) {
    if (!session || !session.refresh_token) return Promise.reject(new Error('no session'));
    return api('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: { refresh_token: session.refresh_token },
    }).then(applySession);
  }

  function init() {
    var session = getSession();
    if (!session) return Promise.resolve(null);
    setUser(session.user || null);
    if (!session.access_token) return Promise.resolve(currentUser);
    return api('/auth/v1/user', { token: session.access_token }).then(function (res) {
      if (res.status === 200 && res.json && res.json.id) {
        setUser(res.json);
        return currentUser;
      }
      return refresh(session).catch(function () { setUser(null); return null; });
    }).catch(function () { return currentUser; });
  }

  function signIn(input, password) {
    var email = String(input || '').indexOf('@') >= 0 ? input : usernameEmail(input);
    return api('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: { email: email, password: password },
    }).then(function (res) {
      if (res.status === 200 && res.json && res.json.access_token) {
        applySession(res);
        return { ok: true, user: currentUser };
      }
      return { ok: false, error: '用户名或密码错误' };
    }).catch(function () { return { ok: false, error: '网络错误' }; });
  }

  function signUp(name, password) {
    var email = usernameEmail(name);
    return api('/auth/v1/signup', {
      method: 'POST',
      body: { email: email, password: password, data: { name: name } },
    }).then(function (res) {
      if (res.status === 200 && res.json) {
        var u = applySession(res);
        if (u) return { ok: true, user: u, confirmed: true };
        return { ok: true, confirmed: false, user: res.json.user || null };
      }
      var msg = res.json && (res.json.msg || res.json.error_description || res.json.error) || '';
      if (String(msg).indexOf('already') >= 0) return { ok: false, error: '用户名已被注册' };
      return { ok: false, error: '注册失败：' + msg };
    }).catch(function () { return { ok: false, error: '网络错误' }; });
  }

  function signOut() {
    var session = getSession();
    if (session && session.access_token) {
      api('/auth/v1/logout', { method: 'POST', token: session.access_token }).catch(function () {});
    }
    setSession(null);
    setUser(null);
  }

  function token() {
    var s = getSession();
    return s ? s.access_token : '';
  }

  function uid() { return currentUser ? currentUser.id : ''; }
  function email() { return currentUser ? currentUser.email : ''; }
  function name() {
    return currentUser && currentUser.user_metadata && currentUser.user_metadata.name ? currentUser.user_metadata.name : '';
  }
  function isAdmin() {
    return !!ADMIN_EMAIL && email() === ADMIN_EMAIL;
  }

  function dataKey(uidStr) { return 'daylight_data_' + uidStr; }

  function loadData() {
    var u = uid(), t = token();
    if (!u || !t) return Promise.resolve(null);
    return api('/rest/v1/daylight_data?select=data&user_id=eq.' + u, { token: t }).then(function (res) {
      if (res.status === 200 && res.json && res.json.length) return res.json[0].data || null;
      return null;
    }).catch(function () { return null; });
  }

  function saveData(data) {
    var u = uid(), t = token();
    if (!u || !t) return Promise.resolve();
    return api('/rest/v1/daylight_data', {
      method: 'POST',
      token: t,
      prefer: 'resolution=merge-duplicates',
      body: { user_id: u, data: data, updated_at: new Date().toISOString() },
      headers: {},
    }).catch(function () {});
  }

  function loadProfile() {
    var u = uid(), t = token();
    if (!u || !t) return Promise.resolve(null);
    return api('/rest/v1/profiles?select=name,greeting&id=eq.' + u, { token: t }).then(function (res) {
      if (res.status === 200 && res.json && res.json.length) return res.json[0];
      return null;
    }).catch(function () { return null; });
  }

  function saveProfile(nameStr, greeting) {
    var u = uid(), t = token();
    if (!u || !t) return Promise.resolve();
    return api('/rest/v1/profiles?id=eq.' + u, {
      method: 'PATCH',
      token: t,
      body: { name: nameStr, greeting: greeting },
    }).catch(function () {});
  }

  function adminAll() {
    var t = token();
    if (!t) return Promise.resolve([]);
    return Promise.all([
      api('/rest/v1/profiles?select=id,name,greeting', { token: t }),
      api('/rest/v1/daylight_data?select=user_id,data', { token: t }),
    ]).then(function (rs) {
      var profs = rs[0].status === 200 ? rs[0].json || [] : [];
      var datas = rs[1].status === 200 ? rs[1].json || [] : [];
      var map = {};
      datas.forEach(function (d) { map[d.user_id] = d.data; });
      return profs.map(function (p) {
        return { id: p.id, name: p.name || '', greeting: p.greeting || '', data: map[p.id] || null };
      });
    }).catch(function () { return []; });
  }

  function saveDaySnapshot(data, day) {
    var u = uid(), t = token();
    if (!u || !t) return Promise.resolve();
    return api('/rest/v1/daylight_history', {
      method: 'POST',
      token: t,
      prefer: 'resolution=merge-duplicates',
      body: { user_id: u, day: day, data: data, updated_at: new Date().toISOString() },
    }).catch(function () {});
  }

  function loadHistory(limit) {
    var u = uid(), t = token();
    if (!u || !t) return Promise.resolve([]);
    return api('/rest/v1/daylight_history?select=day,data&order=day.desc&limit=' + (limit || 90), { token: t })
      .then(function (res) {
        if (res.status === 200 && Array.isArray(res.json)) return res.json;
        return [];
      }).catch(function () { return []; });
  }

  window.DaylightCloud = {
    url: URL,
    anonKey: ANON,
    adminEmail: ADMIN_EMAIL,
    setAdminEmail: function (e) { ADMIN_EMAIL = e; },
    init: init,
    signIn: signIn,
    signUp: signUp,
    signOut: signOut,
    uid: uid,
    email: email,
    name: name,
    isAdmin: isAdmin,
    dataKey: dataKey,
    loadData: loadData,
    saveData: saveData,
    loadProfile: loadProfile,
    saveProfile: saveProfile,
    adminAll: adminAll,
    saveDaySnapshot: saveDaySnapshot,
    loadHistory: loadHistory,
  };

  // 北京时间工具（所有页面统一用 Asia/Shanghai）
  function bjParts() {
    var parts = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date());
    var map = {};
    parts.forEach(function (p) { map[p.type] = p.value; });
    if (map.hour === '24') map.hour = '00';
    return map;
  }
  window.DaylightTime = {
    parts: bjParts,
    dayStr: function () {
      var p = bjParts();
      return p.year + '-' + p.month + '-' + p.day;
    },
    fmtDay: function (dayStr) {
      var a = String(dayStr || '').split('-');
      if (a.length < 3) return dayStr || '';
      var y = parseInt(a[0], 10), m = parseInt(a[1], 10), d = parseInt(a[2], 10);
      var names = ['日', '一', '二', '三', '四', '五', '六'];
      var wd = names[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
      return m + '月' + d + '日 星期' + wd;
    },
    fmtHM: function () {
      var p = bjParts();
      return (p.hour || '00') + ':' + (p.minute || '00');
    },
    weekdayIndex: function () {
      var wd = bjParts().weekday || '';
      var names = ['日', '一', '二', '三', '四', '五', '六'];
      for (var i = 0; i < 7; i++) {
        if (wd.indexOf(names[i]) >= 0) return i;
      }
      return new Date().getDay();
    },
  };
})();
