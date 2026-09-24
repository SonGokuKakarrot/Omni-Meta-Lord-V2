// Omni Meta Lord — popup control script

(function () {
  'use strict';

  const themeAsset = 'assets/363bc7ce3c45ce75bd795bd0ab88d936.gif';
  const maxTracks = 30;
  const metadataKey = 'omni-player-library';
  const trackDataKey = 'omni-player-track-data';
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
  let playerState = { currentId: null, playing: false, currentTime: 0, duration: 0, monitoring: true, transmitting: false };

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
  const monitorToggle = $('monitorToggle'), monitorHint = $('monitorHint'), stopTrack = $('stopTrack');
  const nowPlayingArtwork = $('nowPlayingArtwork'), nowPlayingName = $('nowPlayingName');
  const playerStatus = $('playerStatus'), transmitStatus = $('transmitStatus');
  const defaultArtwork = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23003c8f"/><circle cx="50" cy="50" r="28" fill="%2300e5ff"/><circle cx="50" cy="50" r="8" fill="%230b1520"/><path d="M62 23v42a13 13 0 1 1-7-12V30l22-5v35a13 13 0 1 1-7-12V17z" fill="%23e8eef2"/></svg>');

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
    playerTitle.textContent = active ? active.name : 'No track selected';
    nowPlayingName.textContent = active ? active.name : 'Select a song to prepare it for the call';
    nowPlayingArtwork.src = active && active.artwork ? active.artwork : defaultArtwork;
    nowPlayingArtwork.onerror = function () { nowPlayingArtwork.src = defaultArtwork; };
    playPause.textContent = playerState.playing ? 'PAUSE' : 'PLAY';
    playerSeek.value = playerState.duration ? Math.round((playerState.currentTime / playerState.duration) * 1000) : 0;
    playerTime.textContent = formatTime(playerState.currentTime) + ' / ' + formatTime(playerState.duration);
    monitorToggle.checked = playerState.monitoring !== false;
    monitorHint.textContent = monitorToggle.checked ? 'Local monitoring ON' : 'Local monitoring OFF — call transmission continues';
    const status = playerState.playing ? 'Playing' : (playerState.currentTime > 0 ? 'Paused' : 'Stopped');
    playerStatus.textContent = status + (playerState.transmitting ? ' · transmitting to call' : ' · ready for a call');
    transmitStatus.textContent = playerState.transmitting ? 'Transmitting through call audio' : 'Waiting for an active call audio stream';
    trackList.querySelectorAll('.track-item').forEach(function (row) {
      const selected = row.dataset.id === playerState.currentId;
      row.classList.toggle('selected', selected);
      row.classList.toggle('playing', selected && playerState.playing);
      const state = row.querySelector('.track-state');
      if (state) state.textContent = selected ? (playerState.playing ? 'PLAYING' : 'SELECTED') : 'READY';
    });
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
      const art = document.createElement('img'); art.className = 'track-art'; art.alt = ''; art.src = item.artwork || defaultArtwork; art.onerror = function () { art.src = defaultArtwork; };
      const wrap = document.createElement('span'); wrap.className = 'track-name-wrap';
      const name = document.createElement('span'); name.className = 'track-name'; name.textContent = item.name;
      const state = document.createElement('span'); state.className = 'track-state'; state.textContent = 'READY'; wrap.append(name, state);
      const remove = document.createElement('button'); remove.className = 'track-remove'; remove.type = 'button'; remove.title = 'Remove ' + item.name; remove.textContent = '×';
      remove.addEventListener('click', function (event) { event.stopPropagation(); removeTrack(item.id); });
      row.append(number, art, wrap, remove);
      row.addEventListener('click', function () { sendPlayerMessage({ type: 'omni-player', action: 'select', id: item.id }, setPlayerState); });
      trackList.appendChild(row);
    });
    setPlayerState(playerState);
  }

  function saveMetadata() { chrome.storage.local.set({ [metadataKey]: library.slice(0, maxTracks) }, function () {}); }

  function bytesToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    return btoa(binary);
  }

  function saveTrackData(entries) {
    chrome.storage.local.get({ [trackDataKey]: [] }, function (stored) {
      const existing = Array.isArray(stored[trackDataKey]) ? stored[trackDataKey] : [];
      const next = existing.filter(function (saved) { return !entries.some(function (entry) { return entry.item.id === saved.id; }); });
      entries.forEach(function (entry) { next.push({ id: entry.item.id, item: entry.item, data: entry.base64 }); });
      chrome.storage.local.set({ [trackDataKey]: next.slice(0, maxTracks) }, function () {});
    });
  }

  function removeTrack(id) {
    library = library.filter(function (item) { return item.id !== id; });
    chrome.storage.local.get({ [trackDataKey]: [] }, function (stored) {
      chrome.storage.local.set({ [trackDataKey]: (stored[trackDataKey] || []).filter(function (track) { return track.id !== id; }) }, function () {});
    });
    saveMetadata(); renderLibrary();
    sendPlayerMessage({ type: 'omni-player', action: 'remove', id: id }, setPlayerState);
  }

  function readArtwork(bytes) {
    // Best-effort ID3v2 APIC extraction. Unsupported tags and oversized covers use the
    // built-in music artwork, so uploads remain reliable within extension storage limits.
    try {
      const view = new Uint8Array(bytes);
      if (view.length < 10 || String.fromCharCode(view[0], view[1], view[2]) !== 'ID3') return defaultArtwork;
      const tagEnd = 10 + ((view[6] & 0x7f) << 21 | (view[7] & 0x7f) << 14 | (view[8] & 0x7f) << 7 | (view[9] & 0x7f));
      let offset = 10;
      while (offset + 10 < Math.min(tagEnd, view.length)) {
        const id = String.fromCharCode(view[offset], view[offset + 1], view[offset + 2], view[offset + 3]);
        const size = (view[offset + 4] << 24 >>> 0) + (view[offset + 5] << 16) + (view[offset + 6] << 8) + view[offset + 7];
        if (!id || /^\0+$/.test(id) || !size) break;
        if (id === 'APIC') {
          const frame = view.slice(offset + 10, Math.min(offset + 10 + size, view.length));
          let pos = 1; while (pos < frame.length && frame[pos]) pos += 1;
          const mime = new TextDecoder().decode(frame.slice(1, pos)); pos += 2; // mime NUL + picture type
          const encoding = frame[0];
          if (encoding === 0 || encoding === 3) while (pos < frame.length && frame[pos++]) {}
          else while (pos + 1 < frame.length && (frame[pos++] || frame[pos++])) {}
          const image = frame.slice(pos);
          if (/^image\/(jpeg|png|webp)$/i.test(mime) && image.length && image.length < 150000) {
            let binary = ''; for (let i = 0; i < image.length; i += 8192) binary += String.fromCharCode.apply(null, image.subarray(i, i + 8192));
            return 'data:' + mime + ';base64,' + btoa(binary);
          }
          return defaultArtwork;
        }
        offset += 10 + size;
      }
    } catch (_) {}
    return defaultArtwork;
  }

  audioPicker.addEventListener('change', function () {
    const files = Array.from(audioPicker.files || []);
    if (!files.length) return;
    let remainingNewSlots = maxTracks - library.length;
    const accepted = files.filter(function (file) {
      const replacesExisting = library.some(function (track) { return track.name === file.name; });
      if (replacesExisting) return true;
      if (remainingNewSlots <= 0) return false;
      remainingNewSlots -= 1;
      return true;
    });
    Promise.all(accepted.map(function (file) {
      return file.arrayBuffer().then(function (buffer) { const result = [buffer, readArtwork(buffer)];
        const existing = library.find(function (track) { return track.name === file.name; });
        const item = { id: existing ? existing.id : (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()), name: file.name, type: file.type || 'audio/*', size: file.size, artwork: result[1] };
        const bytes = new Uint8Array(result[0]);
        return { item: item, data: Array.from(bytes), base64: bytesToBase64(bytes), replace: Boolean(existing) };
      });
    })).then(function (items) {
      saveTrackData(items);
      items.forEach(function (entry) {
        const oldIndex = library.findIndex(function (track) { return track.id === entry.item.id; });
        if (oldIndex >= 0) library.splice(oldIndex, 1, entry.item); else library.push(entry.item);
        sendPlayerMessage({ type: 'omni-player', action: 'upload', item: entry.item, data: entry.data }, setPlayerState);
      });
      saveMetadata(); renderLibrary(); audioPicker.value = '';
    });
  });
  playPause.addEventListener('click', function () { sendPlayerMessage({ type: 'omni-player', action: playerState.playing ? 'pause' : 'play', id: playerState.currentId }, setPlayerState); });
  stopTrack.addEventListener('click', function () { sendPlayerMessage({ type: 'omni-player', action: 'stop' }, setPlayerState); });
  monitorToggle.addEventListener('change', function () { sendPlayerMessage({ type: 'omni-player', action: 'monitor', value: monitorToggle.checked }, setPlayerState); });
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
