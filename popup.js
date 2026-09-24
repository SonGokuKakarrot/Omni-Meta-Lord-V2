// Omni Meta Lord — popup control script

(function () {
  'use strict';

  const themeAsset = 'assets/363bc7ce3c45ce75bd795bd0ab88d936.gif';
  const maxTracks = 30;
  const metadataKey = 'omni-player-library';
  const DEFAULTS = {
    enabled: true,
    clearGain: 240,
    masterGain: 1800,
    rageBoost: 1200,
    bitrate: 2500,
    stereoWidth: 1.15,
    eq1: 4, eq2: 3, eq3: 5, eq4: 6, eq5: 4, eq6: 2,
    noiseGate: 0, deEss: 0, bassBoost: 0, autoLevel: 0,
    turboActive: false, ultraTurboActive: false, presetName: 'custom'
  };
  const PRESETS = {
    balanced: { clearGain: 150, masterGain: 800, rageBoost: 500, bitrate: 2500, stereoWidth: 1.0, noiseGate: 20, deEss: 15, bassBoost: 10, autoLevel: 20 },
    loud: { clearGain: 300, masterGain: 3000, rageBoost: 2500, bitrate: 2500, stereoWidth: 1.2, noiseGate: 15, deEss: 20, bassBoost: 20, autoLevel: 30 },
    max: { clearGain: 450, masterGain: 8000, rageBoost: 5000, bitrate: 2500, stereoWidth: 1.4, noiseGate: 10, deEss: 25, bassBoost: 30, autoLevel: 40 },
    ultra: { clearGain: 500, masterGain: 50000, rageBoost: 50000, bitrate: 2500, stereoWidth: 1.6, noiseGate: 5, deEss: 30, bassBoost: 40, autoLevel: 50 }
  };

  const $ = function (id) { return document.getElementById(id); };
  let settings = Object.assign({}, DEFAULTS);
  let library = [];
  let playerState = { currentId: null, playing: false, currentTime: 0, duration: 0 };

  try {
    fetch(chrome.runtime.getURL(themeAsset), { method: 'HEAD' }).then(function (res) {
      if (res.ok) document.body.style.setProperty('--theme-gif', `url("${chrome.runtime.getURL(themeAsset)}")`);
    }).catch(function () {});
  } catch (e) {}

  const enabledToggle = $('enabledToggle');
  const gainSlider = $('gainSlider'), gainValue = $('gainValue');
  const masterSlider = $('masterSlider'), masterValue = $('masterValue');
  const rageSlider = $('rageSlider'), rageValue = $('rageValue');
  const bitrateSlider = $('bitrateSlider'), bitrateValue = $('bitrateValue');
  const stereoSlider = $('stereoSlider'), stereoValue = $('stereoValue');
  const gateSlider = $('gateSlider'), gateValue = $('gateValue');
  const deEssSlider = $('deEssSlider'), deEssValue = $('deEssValue');
  const bassSlider = $('bassSlider'), bassValue = $('bassValue');
  const autoLevelSlider = $('autoLevelSlider'), autoLevelValue = $('autoLevelValue');
  const turboBtn = $('turboBtn'), ultraBtn = $('ultraBtn');
  const statusDot = $('statusDot'), statusText = $('statusText');
  const presetBtns = document.querySelectorAll('.preset-btn');
  const audioPicker = $('audioPicker'), trackList = $('trackList');
  const playerTitle = $('playerTitle'), trackCount = $('trackCount');
  const playPause = $('playPause'), prevTrack = $('prevTrack'), nextTrack = $('nextTrack');
  const playerSeek = $('playerSeek'), playerTime = $('playerTime');

  chrome.storage.sync.get(DEFAULTS, function (stored) {
    settings = Object.assign({}, DEFAULTS, stored);
    applyToUI();
    sendToTab({ type: 'omni-settings', settings: settings });
    updateStatus();
  });
  chrome.storage.local.get({ [metadataKey]: [] }, function (stored) {
    library = Array.isArray(stored[metadataKey]) ? stored[metadataKey].slice(0, maxTracks) : [];
    renderLibrary();
    requestPlayerState();
  });

  function applyToUI() {
    enabledToggle.checked = settings.enabled;
    gainSlider.value = settings.clearGain; gainValue.textContent = settings.clearGain + 'x';
    masterSlider.value = settings.masterGain; masterValue.textContent = settings.masterGain + 'x';
    rageSlider.value = settings.rageBoost; rageValue.textContent = settings.rageBoost + '%';
    bitrateSlider.value = settings.bitrate; bitrateValue.textContent = settings.bitrate;
    stereoSlider.value = settings.stereoWidth; stereoValue.textContent = Number(settings.stereoWidth).toFixed(2) + 'x';
    gateSlider.value = settings.noiseGate; gateValue.textContent = settings.noiseGate + '%';
    deEssSlider.value = settings.deEss; deEssValue.textContent = settings.deEss + '%';
    bassSlider.value = settings.bassBoost; bassValue.textContent = settings.bassBoost + '%';
    autoLevelSlider.value = settings.autoLevel; autoLevelValue.textContent = settings.autoLevel + '%';
    turboBtn.classList.toggle('active', settings.turboActive);
    ultraBtn.classList.toggle('active', settings.ultraTurboActive);
    updatePresetHighlight();
  }

  function updatePresetHighlight() {
    presetBtns.forEach(function (btn) { btn.classList.toggle('active', btn.dataset.preset === settings.presetName); });
  }

  function sendToTab(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs[0] || !tabs[0].id) return;
      chrome.tabs.sendMessage(tabs[0].id, message, function () { void chrome.runtime.lastError; });
    });
  }

  function sendPlayerMessage(message, callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs[0] || !tabs[0].id) { if (callback) callback(null); return; }
      chrome.tabs.sendMessage(tabs[0].id, message, function (response) {
        void chrome.runtime.lastError;
        if (callback && response && response.playerState) callback(response.playerState);
        else if (callback) callback(null);
      });
    });
  }

  function requestPlayerState() { sendPlayerMessage({ type: 'omni-player', action: 'state' }, setPlayerState); }
  setInterval(requestPlayerState, 1500);

  function updateStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const url = tabs[0] ? tabs[0].url || '' : '';
      const supported = /instagram\.com|whatsapp\.com|imo\.im|messenger\.com|facebook\.com|discord\.com|telegram\.org|webogram\.org|telegram\.im|tlgrm\.ru|tel\.onl/.test(url);
      if (!supported) { statusDot.className = 'status-dot'; statusText.textContent = 'Open a supported web call site'; return; }
      if (!settings.enabled) { statusDot.className = 'status-dot'; statusText.textContent = 'Boost disabled'; return; }
      statusDot.className = settings.ultraTurboActive ? 'status-dot ultra' : settings.turboActive ? 'status-dot turbo' : 'status-dot active';
      statusText.textContent = (settings.ultraTurboActive ? 'ULTRA TURBO' : settings.turboActive ? 'TURBO' : 'Boosting') + ' — Gain: ' + settings.clearGain + 'x';
    });
  }

  function save() {
    chrome.storage.sync.set(settings, function () {});
    sendToTab({ type: 'omni-settings', settings: settings });
    updateStatus();
  }

  function setPlayerState(next) {
    playerState = Object.assign({}, playerState, next || {});
    const active = library.find(function (item) { return item.id === playerState.currentId; });
    playerTitle.textContent = active ? active.name : 'No track loaded';
    playPause.textContent = playerState.playing ? 'PAUSE' : 'PLAY';
    playerSeek.value = playerState.duration ? Math.round((playerState.currentTime / playerState.duration) * 1000) : 0;
    playerTime.textContent = formatTime(playerState.currentTime) + ' / ' + formatTime(playerState.duration);
    trackList.querySelectorAll('.track-item').forEach(function (item) { item.classList.toggle('active', item.dataset.id === playerState.currentId); });
  }

  function formatTime(value) {
    if (!Number.isFinite(value) || value < 0) return '0:00';
    const minutes = Math.floor(value / 60); const seconds = Math.floor(value % 60);
    return minutes + ':' + String(seconds).padStart(2, '0');
  }

  function renderLibrary() {
    trackCount.textContent = library.length + '/' + maxTracks;
    trackList.innerHTML = '';
    library.forEach(function (item, index) {
      const row = document.createElement('li'); row.className = 'track-item'; row.dataset.id = item.id;
      const number = document.createElement('span'); number.className = 'track-number'; number.textContent = String(index + 1).padStart(2, '0');
      const name = document.createElement('span'); name.className = 'track-name'; name.textContent = item.name;
      row.append(number, name); row.addEventListener('click', function () { sendPlayerMessage({ type: 'omni-player', action: 'play', id: item.id }, setPlayerState); }); trackList.appendChild(row);
    });
    setPlayerState(playerState);
  }

  function saveMetadata() { chrome.storage.local.set({ [metadataKey]: library.slice(0, maxTracks) }, function () {}); }

  audioPicker.addEventListener('change', function () {
    const files = Array.from(audioPicker.files || []).slice(0, maxTracks - library.length);
    if (!files.length) return;
    Promise.all(files.map(function (file) {
      return file.arrayBuffer().then(function (buf) {
        const bytes = new Uint8Array(buf);
        const arr = Array.from(bytes);
        const item = { id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()), name: file.name, type: file.type || 'audio/*', size: file.size };
        return { item: item, data: arr };
      });
    })).then(function (items) {
      items.forEach(function (entry) { library.push(entry.item); sendPlayerMessage({ type: 'omni-player', action: 'upload', item: entry.item, data: entry.data }, setPlayerState); });
      saveMetadata(); renderLibrary(); audioPicker.value = '';
    });
  });
  playPause.addEventListener('click', function () { sendPlayerMessage({ type: 'omni-player', action: playerState.playing ? 'pause' : 'play', id: playerState.currentId }, setPlayerState); });
  prevTrack.addEventListener('click', function () { sendPlayerMessage({ type: 'omni-player', action: 'previous' }, setPlayerState); });
  nextTrack.addEventListener('click', function () { sendPlayerMessage({ type: 'omni-player', action: 'next' }, setPlayerState); });
  playerSeek.addEventListener('change', function () { sendPlayerMessage({ type: 'omni-player', action: 'seek', value: Number(playerSeek.value) / 1000 }, setPlayerState); });

  enabledToggle.addEventListener('change', function () { settings.enabled = enabledToggle.checked; save(); });
  function bindSlider(input, key, label, suffix, parser) {
    input.addEventListener('input', function () { settings[key] = parser(input.value); label.textContent = settings[key] + suffix; settings.presetName = 'custom'; updatePresetHighlight(); });
    input.addEventListener('change', save);
  }
  bindSlider(gainSlider, 'clearGain', gainValue, 'x', function (v) { return parseInt(v, 10); });
  bindSlider(masterSlider, 'masterGain', masterValue, 'x', function (v) { return parseInt(v, 10); });
  bindSlider(rageSlider, 'rageBoost', rageValue, '%', function (v) { return parseInt(v, 10); });
  bindSlider(bitrateSlider, 'bitrate', bitrateValue, '', function (v) { return parseInt(v, 10); });
  bindSlider(stereoSlider, 'stereoWidth', stereoValue, 'x', function (v) { return Number(v).toFixed(2); });
  bindSlider(gateSlider, 'noiseGate', gateValue, '%', function (v) { return parseInt(v, 10); });
  bindSlider(deEssSlider, 'deEss', deEssValue, '%', function (v) { return parseInt(v, 10); });
  bindSlider(bassSlider, 'bassBoost', bassValue, '%', function (v) { return parseInt(v, 10); });
  bindSlider(autoLevelSlider, 'autoLevel', autoLevelValue, '%', function (v) { return parseInt(v, 10); });

  turboBtn.addEventListener('click', function () { settings.turboActive = !settings.turboActive; if (settings.turboActive) settings.ultraTurboActive = false; save(); applyToUI(); });
  ultraBtn.addEventListener('click', function () { settings.ultraTurboActive = !settings.ultraTurboActive; if (settings.ultraTurboActive) settings.turboActive = false; save(); applyToUI(); });
  presetBtns.forEach(function (btn) {
    btn.addEventListener('click', function () { const preset = PRESETS[btn.dataset.preset]; if (!preset) return; Object.assign(settings, preset, { presetName: btn.dataset.preset }); applyToUI(); save(); });
  });
})();
