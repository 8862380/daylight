(function () {
  var URL = 'https://upvjucspjcobqkoxmzli.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwdmp1Y3NwamNvYnFrb3htemxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NjI0MDUsImV4cCI6MjEwMzIzODQwNX0.ZtsE985-71TVp3bSTiOmHnjfTFkm-B4l7OtLA3_u-TU';
  var ADMIN_EMAIL = ''; // 管理员邮箱（填好后后台可看全部用户）
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

  function signIn(email, password) {
    return api('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: { email: email, password: password },
    }).then(function (res) {
      if (res.status === 200 && res.json && res.json.access_token) {
        applySession(res);
        return { ok: true, user: currentUser };
      }
      return { ok: false, error: (res.json && res.json.error_description) || res.json.error || '登录失败' };
    }).catch(function () { return { ok: false, error: '网络错误' }; });
  }

  function signUp(name, email, password) {
    return api('/auth/v1/signup', {
      method: 'POST',
      body: { email: email, password: password, data: { name: name } },
    }).then(function (res) {
      if (res.status === 200 && res.json) {
        var u = applySession(res);
        if (u) return { ok: true, user: u, confirmed: true };
        return { ok: true, confirmed: false, user: res.json.user || null };
      }
      return { ok: false, error: (res.json && (res.json.msg || res.json.error_description)) || '注册失败' };
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
  };
})();
