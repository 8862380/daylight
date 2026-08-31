(function () {
  var PROFILES_KEY = 'daylight_profiles';
  var USER_KEY = 'daylight_user';

  function profiles() {
    try { return JSON.parse(localStorage.getItem(PROFILES_KEY)) || []; } catch (e) { return []; }
  }
  function saveProfiles(p) { localStorage.setItem(PROFILES_KEY, JSON.stringify(p)); }
  function user() { return localStorage.getItem(USER_KEY) || ''; }
  function setUser(n) {
    if (n) localStorage.setItem(USER_KEY, n);
    else localStorage.removeItem(USER_KEY);
  }
  function dataKey(u) { return 'daylight_data_' + encodeURIComponent(u); }
  function pinHash(pin) {
    var h = 5381;
    for (var i = 0; i < pin.length; i++) h = ((h << 5) + h + pin.charCodeAt(i)) >>> 0;
    return String(h);
  }
  function login(name, pin) {
    var ps = profiles();
    var p = ps.filter(function (x) { return x.name === name; })[0];
    if (!p) return 'notfound';
    if (p.pin && pinHash(pin || '') !== p.pin) return 'badpin';
    setUser(name);
    return 'ok';
  }
  function enter(name, pin) {
    var ps = profiles();
    var isFirst = ps.length === 0;
    if (!ps.some(function (x) { return x.name === name; })) {
      ps.push({ name: name, pin: pin ? pinHash(pin) : '' });
      saveProfiles(ps);
      var key = dataKey(name);
      if (isFirst && !localStorage.getItem(key)) {
        var legacy = localStorage.getItem('daylight_data');
        if (legacy) {
          localStorage.setItem(key, legacy);
          localStorage.removeItem('daylight_data');
        }
      }
    }
    setUser(name);
    return name;
  }
  function logout() { setUser(''); }

  var ADM_KEY = 'daylight_admin';
  var ADM_SESSION = 'daylight_admin_ok';
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

  function mountLogin(overlayId, onEnter) {
    var ov = document.getElementById(overlayId);
    if (!ov) return;
    ov.style.display = 'flex';
    var list = ov.querySelector('.profile-list');
    if (list) {
      list.innerHTML = '';
      profiles().forEach(function (p) {
        var el = document.createElement('div');
        el.className = 'profile-chip';
        el.innerHTML = '<span class="pc-avatar"></span><span></span>';
        el.querySelector('.pc-avatar').textContent = (p.name || '?').charAt(0);
        el.querySelector('span:last-child').textContent = p.name;
        el.addEventListener('click', function () {
          var pin = ov.querySelector('.login-pin').value;
          var r = login(p.name, pin);
          if (r === 'badpin') { window.toast ? toast('密码不对') : alert('密码不对'); return; }
          onEnter(p.name);
        });
        list.appendChild(el);
      });
    }
    var btn = ov.querySelector('.login-btn');
    if (btn) {
      btn.onclick = function () {
        var name = ov.querySelector('.login-name').value.trim();
        var pin = ov.querySelector('.login-pin').value;
        if (!name) { window.toast ? toast('请输入名字') : alert('请输入名字'); return; }
        var r = login(name, pin);
        if (r === 'badpin') { window.toast ? toast('密码不对') : alert('密码不对'); return; }
        enter(name, pin);
        onEnter(name);
      };
    }
  }

  window.DaylightAuth = {
    profiles: profiles,
    user: user,
    setUser: setUser,
    dataKey: dataKey,
    pinHash: pinHash,
    login: login,
    enter: enter,
    logout: logout,
    mountLogin: mountLogin,
    adminGet: adminGet,
    adminSet: adminSet,
    adminUnlocked: adminUnlocked,
    adminUnlock: adminUnlock,
    adminLock: adminLock,
    verifyAdmin: verifyAdmin,
    setupAdmin: setupAdmin,
  };
})();
