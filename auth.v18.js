(function () {
  var ADM_KEY = 'daylight_admin';
  var ADM_SESSION = 'daylight_admin_ok';

  function pinHash(pin) {
    var h = 5381;
    for (var i = 0; i < pin.length; i++) h = ((h << 5) + h + pin.charCodeAt(i)) >>> 0;
    return String(h);
  }

  function user() { return window.DaylightCloud ? DaylightCloud.email() : ''; }
  function displayName() {
    if (!window.DaylightCloud) return '';
    return DaylightCloud.name() || DaylightCloud.email();
  }
  function uid() { return window.DaylightCloud ? DaylightCloud.uid() : ''; }
  function init() { return window.DaylightCloud ? DaylightCloud.init() : Promise.resolve(null); }
  function login(email, password) { return window.DaylightCloud.signIn(email, password); }
  function signup(name, password) { return window.DaylightCloud.signUp(name, password); }
  function logout() { if (window.DaylightCloud) DaylightCloud.signOut(); }
  function dataKey(u) { return 'daylight_data_' + u; }
  function isAdmin() { return window.DaylightCloud ? DaylightCloud.isAdmin() : false; }

  function mountLogin(overlayId, onEnter) {
    var ov = document.getElementById(overlayId);
    if (!ov) return;
    ov.style.display = 'flex';
    var submit = ov.querySelector('.login-submit');
    var signupBtn = ov.querySelector('.login-signup');
    var status = ov.querySelector('.login-status');
    var idEl = ov.querySelector('.login-id');
    var passEl = ov.querySelector('.login-pass');
    function busy(v) {
      if (submit) submit.disabled = v;
      if (signupBtn) signupBtn.disabled = v;
    }
    function enter() {
      if (!idEl || !passEl) return;
      var id = idEl.value.trim();
      var pass = passEl.value;
      if (!id || !pass) { if (status) status.textContent = '请输入用户名和密码'; return; }
      if (status) status.textContent = '登录中…';
      busy(true);
      login(id, pass).then(function (r) {
        busy(false);
        if (r.ok) { if (status) status.textContent = ''; onEnter(); }
        else if (status) status.textContent = r.error || '登录失败';
      });
    }
    function doSignup() {
      if (!idEl || !passEl) return;
      var name = idEl.value.trim();
      var pass = passEl.value;
      if (name.length < 2) { if (status) status.textContent = '用户名至少 2 个字符'; return; }
      if (pass.length < 6) { if (status) status.textContent = '密码至少 6 位'; return; }
      if (status) status.textContent = '注册中…';
      busy(true);
      signup(name, pass).then(function (r) {
        busy(false);
        if (r.ok) {
          if (r.confirmed) { if (status) status.textContent = ''; onEnter(); }
          else if (status) status.textContent = '注册成功！如无法登录，请到 Supabase 关闭“邮箱确认”开关';
        }
        else if (status) status.textContent = r.error || '注册失败';
      });
    }
    if (submit) submit.onclick = enter;
    if (signupBtn) signupBtn.onclick = doSignup;
    if (idEl) idEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') enter(); });
    if (passEl) passEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') enter(); });
  }

  function adminGet() {
    try { return JSON.parse(localStorage.getItem(ADM_KEY)) || null; } catch (e) { return null; }
  }
  function adminSet(h) { localStorage.setItem(ADM_KEY, JSON.stringify({ h: h })); }
  function adminUnlocked() { return sessionStorage.getItem(ADM_SESSION) === '1'; }
  function adminUnlock() { sessionStorage.setItem(ADM_SESSION, '1'); }
  function adminLock() { sessionStorage.removeItem(ADM_SESSION); }
  function verifyAdmin(pin) {
    var c = adminGet();
    if (!c) return 'nosetup';
    return pinHash(pin || '') === c.h ? 'ok' : 'badpin';
  }
  function setupAdmin(pin) { adminSet(pinHash(pin)); adminUnlock(); }

  window.DaylightAuth = {
    profiles: function () { return []; },
    saveProfiles: function () {},
    user: user,
    displayName: displayName,
    uid: uid,
    init: init,
    login: login,
    signup: signup,
    logout: logout,
    dataKey: dataKey,
    isAdmin: isAdmin,
    mountLogin: mountLogin,
    pinHash: pinHash,
    adminGet: adminGet,
    adminSet: adminSet,
    adminUnlocked: adminUnlocked,
    adminUnlock: adminUnlock,
    adminLock: adminLock,
    verifyAdmin: verifyAdmin,
    setupAdmin: setupAdmin,
  };
})();
