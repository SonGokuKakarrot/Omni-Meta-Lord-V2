/* __omniUniversalLordAudioGuard: prevents duplicate audio graphs/retry loops without changing gain/settings */
(() => {
  if (globalThis.__omniUniversalLordAudioGuard) return;
  const state = { timer: null, lastRun: 0, running: false, inFlight: null };
  globalThis.__omniUniversalLordAudioGuard = state;
  globalThis.__omniUniversalLordSafeStart = (fn) => {
    const now = Date.now();
    if (state.running || now - state.lastRun < 1200) return state.inFlight;
    state.running = true;
    state.lastRun = now;
    try {
      const result = fn();
      state.inFlight = result && typeof result.then === "function" ? result : Promise.resolve(result);
      return state.inFlight;
    } catch (_) {
      return Promise.resolve(undefined);
    } finally {
      setTimeout(() => { state.running = false; }, 300);
    }
  };
  globalThis.__omniUniversalLordAutoRetry = (fn) => {
    clearTimeout(state.timer);
    state.timer = setTimeout(() => globalThis.__omniUniversalLordSafeStart(fn), 900);
  };
})();

(function () {
  'use strict';

  if (window.__OmniLordExtreme_loaded) return;
  window.__OmniLordExtreme_loaded = true;
  window.__micMaxInjectorReady = true;

  window.addEventListener('click', () => {
    if (window.__OmniLordAudioCtx && window.__OmniLordAudioCtx.state === 'suspended') {
      window.__OmniLordAudioCtx.resume();
    }
  }, { once: true });

  window.addEventListener('touchstart', () => {
    if (window.__OmniLordAudioCtx && window.__OmniLordAudioCtx.state === 'suspended') {
      window.__OmniLordAudioCtx.resume();
    }
  }, { once: true });

  const DEFAULT_CONFIG = Object.freeze({
    clearGain: 240,
    masterGain: 1800,
    rageBoost: 1200,
    bitrate: 2500,
    stereoWidth: 1.15,
    eq1: 4,
    eq2: 3,
    eq3: 5,
    eq4: 6,
    eq5: 4,
    eq6: 2,
    noiseGate: 0,
    deEss: 0,
    bassBoost: 0,
    autoLevel: 0,
    enabled: true,
    themeUrl: "",
    customColor: "#7cf7ff",
    turboActive: false,
    ultraTurboActive: false,
    muteActive: false,
    panelLocked: false,
    collapsed: false,
    panelX: 20,
    panelY: 20,
    presetName: "custom"
  });

  const currentState = Object.seal({ ...DEFAULT_CONFIG });

  const OVERLAY_PRESETS = {
    balanced: { clearGain: 150, masterGain: 800, rageBoost: 500, bitrate: 2500, stereoWidth: 1.0, noiseGate: 20, deEss: 15, bassBoost: 10, autoLevel: 20, eq1: 3, eq2: 2, eq3: 4, eq4: 5, eq5: 3, eq6: 1 },
    loud: { clearGain: 300, masterGain: 3000, rageBoost: 2500, bitrate: 2500, stereoWidth: 1.2, noiseGate: 15, deEss: 20, bassBoost: 20, autoLevel: 30, eq1: 5, eq2: 4, eq3: 6, eq4: 7, eq5: 5, eq6: 3 },
    max: { clearGain: 450, masterGain: 8000, rageBoost: 5000, bitrate: 2500, stereoWidth: 1.4, noiseGate: 10, deEss: 25, bassBoost: 30, autoLevel: 40, eq1: 6, eq2: 5, eq3: 7, eq4: 8, eq5: 6, eq6: 4 },
    ultra: { clearGain: 500, masterGain: 50000, rageBoost: 50000, bitrate: 2500, stereoWidth: 1.6, noiseGate: 5, deEss: 30, bassBoost: 40, autoLevel: 50, eq1: 8, eq2: 6, eq3: 9, eq4: 10, eq5: 7, eq6: 5 }
  };

  let saveStateTimeout = null;
  function debouncedSaveState() {
    if (saveStateTimeout) clearTimeout(saveStateTimeout);
    saveStateTimeout = setTimeout(saveStateToLocalStorage, 200);
  }

  function loadStateFromLocalStorage() {
    try {
      const saved = localStorage.getItem("omniLord-extreme-hybrid-state");
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== "object") return;

      if (typeof parsed.clearGain === "number") currentState.clearGain = Math.min(500, Math.max(1, parsed.clearGain));
      if (typeof parsed.masterGain === "number") currentState.masterGain = Math.min(100000, Math.max(1, parsed.masterGain));
      if (typeof parsed.rageBoost === "number") currentState.rageBoost = Math.min(100000, Math.max(0, parsed.rageBoost));
      if (typeof parsed.bitrate === "number") currentState.bitrate = Math.min(2500, Math.max(1, parsed.bitrate));
      if (typeof parsed.stereoWidth === "number") currentState.stereoWidth = Math.min(2, Math.max(0, parsed.stereoWidth));
      if (typeof parsed.noiseGate === "number") currentState.noiseGate = Math.min(100, Math.max(0, parsed.noiseGate));
      if (typeof parsed.deEss === "number") currentState.deEss = Math.min(100, Math.max(0, parsed.deEss));
      if (typeof parsed.bassBoost === "number") currentState.bassBoost = Math.min(100, Math.max(0, parsed.bassBoost));
      if (typeof parsed.autoLevel === "number") currentState.autoLevel = Math.min(100, Math.max(0, parsed.autoLevel));
      if (typeof parsed.enabled === "boolean") currentState.enabled = parsed.enabled;
      if (typeof parsed.themeUrl === "string") currentState.themeUrl = parsed.themeUrl;
      if (parsed.customColor) currentState.customColor = parsed.customColor;

      for (let i = 1; i <= 6; i++) {
        if (typeof parsed[`eq${i}`] === "number") currentState[`eq${i}`] = Math.min(24, Math.max(-24, parsed[`eq${i}`]));
      }

      currentState.turboActive = Boolean(parsed.turboActive);
      currentState.ultraTurboActive = Boolean(parsed.ultraTurboActive);
      currentState.muteActive = Boolean(parsed.muteActive);
      currentState.panelLocked = Boolean(parsed.panelLocked);
      currentState.collapsed = Boolean(parsed.collapsed);
      if (typeof parsed.presetName === "string") currentState.presetName = parsed.presetName;
      if (typeof parsed.panelX === "number") currentState.panelX = Math.max(0, parsed.panelX);
      if (typeof parsed.panelY === "number") currentState.panelY = Math.max(0, parsed.panelY);
    } catch (e) {}
  }

  function saveStateToLocalStorage() {
    try {
      localStorage.setItem("omniLord-extreme-hybrid-state", JSON.stringify(currentState));
    } catch (e) {}
  }

  loadStateFromLocalStorage();

  function applyExternalConfig(config) {
    if (!config || typeof config !== "object") return;
    const ranges = {
      clearGain: [1, 500], masterGain: [1, 100000], rageBoost: [0, 100000],
      bitrate: [1, 2500], stereoWidth: [0, 2],
      eq1: [-24, 24], eq2: [-24, 24], eq3: [-24, 24],
      eq4: [-24, 24], eq5: [-24, 24], eq6: [-24, 24],
      noiseGate: [0, 100], deEss: [0, 100], bassBoost: [0, 100], autoLevel: [0, 100]
    };
    Object.entries(ranges).forEach(([key, [min, max]]) => {
      if (typeof config[key] === "number" && Number.isFinite(config[key])) {
        currentState[key] = Math.min(max, Math.max(min, config[key]));
      }
    });
    if (typeof config.turboActive === "boolean") currentState.turboActive = config.turboActive;
    if (typeof config.ultraTurboActive === "boolean") currentState.ultraTurboActive = config.ultraTurboActive;
    if (typeof config.muteActive === "boolean") currentState.muteActive = config.muteActive;
    if (typeof config.enabled === "boolean") currentState.enabled = config.enabled;
    if (typeof config.themeUrl === "string") currentState.themeUrl = config.themeUrl;
    if (typeof config.customColor === "string") currentState.customColor = config.customColor;
    if (typeof config.presetName === "string") currentState.presetName = config.presetName;
    saveStateToLocalStorage();
    syncStateToExtension();
    if (window.__OmniLordPanelReady) window.__OmniLordPanelReady.applyFromState();
    if (typeof AudioInterceptor !== "undefined") AudioInterceptor.pushParamsFast();
  }

  let syncTimeout = null;
  function syncStateToExtension() {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      const snapshot = {};
      ["enabled","clearGain","masterGain","rageBoost","bitrate","stereoWidth","eq1","eq2","eq3","eq4","eq5","eq6","noiseGate","deEss","bassBoost","autoLevel","turboActive","ultraTurboActive","muteActive","presetName"].forEach((k) => { snapshot[k] = currentState[k]; });
      window.postMessage({ source: "Omni-Universal-Lord", type: "OMNI_STATE_SYNC", state: snapshot }, "*");
    }, 300);
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== "Omni-Universal-Lord") return;
    if (event.data.type === "OMNI_CONFIG") {
      applyExternalConfig(event.data.config);
    }
    if (event.data.type === "OMNI_THEME" && typeof event.data.themeUrl === "string") {
      currentState.themeUrl = event.data.themeUrl;
      if (window.__OmniLordPanelReady) window.__OmniLordPanelReady.applyTheme(event.data.themeUrl);
    }
    if (event.data.type === "OMNI_PLAYER_REQUEST") {
      PlayerEngine.handleRequest(event.data);
    }
  });

  const NativeAudioContext = window.AudioContext || window.webkitAudioContext;
  let workletPromise = null;

  const workletCode = `
    class OmniLordProcessor extends AudioWorkletProcessor {
        constructor() {
            super();
            this._prevSample = new Float32Array(8);
            this._envLevel = new Float32Array(8);
            this._gateOpen = new Float32Array(8).fill(1);
            this._deEssEnv = 0;
            this._autoLevelEnv = 0;
            this._bassPrev = new Float32Array(8);
        }

        static get parameterDescriptors() {
            return [
                { name: 'clearGain', defaultValue: 200.0, minValue: 1, maxValue: 500 },
                { name: 'masterGain', defaultValue: 1000.0, minValue: 0, maxValue: 100000 },
                { name: 'rage', defaultValue: 0.0, minValue: 0, maxValue: 100000 },
                { name: 'bitrate', defaultValue: 2500, minValue: 1, maxValue: 2500 },
                { name: 'width', defaultValue: 1.0, minValue: 0, maxValue: 2 },
                { name: 'mute', defaultValue: 0, minValue: 0, maxValue: 1 },
                { name: 'noiseGate', defaultValue: 0, minValue: 0, maxValue: 100 },
                { name: 'deEss', defaultValue: 0, minValue: 0, maxValue: 100 },
                { name: 'bassBoost', defaultValue: 0, minValue: 0, maxValue: 100 },
                { name: 'autoLevel', defaultValue: 0, minValue: 0, maxValue: 100 },
            ];
        }

        extremeTanh(x) {
            return Math.tanh(x * 16.0);
        }

        process(inputs, outputs, params) {
            const input = inputs[0];
            const output = outputs[0];
            if (!input || !input.length || !input[0].length) return true;

            const channelCount = input.length;
            const frameLength = input[0].length;
            const hasStereo = channelCount >= 2;

            for (let i = 0; i < frameLength; i++) {
                const clearGain = params.clearGain.length > 1 ? params.clearGain[i] : params.clearGain[0];
                const masterGain = params.masterGain.length > 1 ? params.masterGain[i] : params.masterGain[0];
                const rage = params.rage.length > 1 ? params.rage[i] : params.rage[0];
                const bitrate = params.bitrate.length > 1 ? params.bitrate[i] : params.bitrate[0];
                const widthVal = params.width.length > 1 ? params.width[i] : params.width[0];
                const mute = params.mute.length > 1 ? params.mute[i] : params.mute[0];
                const noiseGate = params.noiseGate.length > 1 ? params.noiseGate[i] : params.noiseGate[0];
                const deEss = params.deEss.length > 1 ? params.deEss[i] : params.deEss[0];
                const bassBoost = params.bassBoost.length > 1 ? params.bassBoost[i] : params.bassBoost[0];
                const autoLevel = params.autoLevel.length > 1 ? params.autoLevel[i] : params.autoLevel[0];

                const megaBoost = (masterGain) * (1.0 + Math.pow(rage / 10, 2.0));
                const step = 1 / (bitrate / 20);

                const processed = new Array(channelCount);

                for (let ch = 0; ch < channelCount; ch++) {
                    let s = input[ch][i];

                    if (mute > 0.5) { processed[ch] = 0; continue; }

                    // Noise gate: attenuate signals below threshold
                    if (noiseGate > 0) {
                        const gateThreshold = noiseGate / 100 * 0.015;
                        const gateAttack = 0.01;
                        const gateRelease = 0.08;
                        const absS = Math.abs(s);
                        if (absS > gateThreshold) {
                            this._gateOpen[ch] = Math.min(1, this._gateOpen[ch] + gateAttack);
                        } else {
                            this._gateOpen[ch] = Math.max(0, this._gateOpen[ch] - gateRelease);
                        }
                        s *= this._gateOpen[ch];
                    }

                    // Bass boost: simple low-frequency emphasis via one-pole filter
                    if (bassBoost > 0) {
                        const bassAmt = bassBoost / 100;
                        const bassAlpha = 0.15;
                        this._bassPrev[ch] = this._bassPrev[ch] + bassAlpha * (s - this._bassPrev[ch]);
                        s = s + this._bassPrev[ch] * bassAmt * 2.0;
                    }

                    s *= clearGain;

                    if (bitrate < 2500) {
                        s = Math.round(s / step) * step;
                    }

                    s *= megaBoost;
                    s = this.extremeTanh(s);

                    s *= 500.0;
                    s = Math.max(-0.9999, Math.min(0.9999, s));

                    // De-esser: detect high-frequency energy and reduce harsh sibilance
                    if (deEss > 0) {
                        const deEssAmt = deEss / 100;
                        const hfAlpha = 0.85;
                        const hf = s - (this._prevSample[ch] || 0);
                        this._prevSample[ch] = s;
                        this._deEssEnv = this._deEssEnv * 0.95 + Math.abs(hf) * 0.05;
                        const deEssThreshold = 0.02;
                        if (this._deEssEnv > deEssThreshold) {
                            const reduction = Math.min(0.8, (this._deEssEnv - deEssThreshold) / deEssThreshold * deEssAmt);
                            s *= (1.0 - reduction);
                        }
                    } else {
                        this._prevSample[ch] = s;
                    }

                    // Auto-leveling: smooth envelope follower to normalize output
                    if (autoLevel > 0) {
                        const levelAmt = autoLevel / 100;
                        const targetLevel = 0.5;
                        const envAlpha = 0.005;
                        this._autoLevelEnv = this._autoLevelEnv * (1 - envAlpha) + Math.abs(s) * envAlpha;
                        if (this._autoLevelEnv > 0.001) {
                            const correction = 1.0 + (targetLevel - this._autoLevelEnv) * levelAmt;
                            s *= Math.max(0.1, Math.min(3.0, correction));
                        }
                    }

                    s = Math.max(-0.9999, Math.min(0.9999, s));
                    processed[ch] = s;
                }

                if (hasStereo) {
                    const L = processed[0];
                    const R = processed[1];
                    const mid = (L + R) * 0.5;
                    const side = (L - R) * 0.5;
                    processed[0] = Math.max(-0.9999, Math.min(0.9999, mid + side * widthVal));
                    processed[1] = Math.max(-0.9999, Math.min(0.9999, mid - side * widthVal));
                }

                for (let ch = 0; ch < channelCount; ch++) {
                    output[ch][i] = processed[ch];
                }
            }
            return true;
        }
    }
    registerProcessor('omniLord-processor', OmniLordProcessor);
  `;

  function ensureProcessingContext() {
    if (window.__OmniLordAudioCtx && window.__OmniLordAudioCtx.state !== "closed") {
      return window.__OmniLordAudioCtx;
    }
    if (!NativeAudioContext) return null;
    let ctx;
    try {
      ctx = new NativeAudioContext({ latencyHint: "interactive", sampleRate: 48000 });
    } catch (_) {
      ctx = new NativeAudioContext({ latencyHint: "interactive" });
    }
    window.__OmniLordAudioCtx = ctx;
    const blobUrl = URL.createObjectURL(new Blob([workletCode], { type: "application/javascript" }));
    workletPromise = ctx.audioWorklet.addModule(blobUrl)
      .then(() => {
        URL.revokeObjectURL(blobUrl);
        if (window.__OmniLordPanelReady) window.__OmniLordPanelReady.setStatus("OMNI BOOST ONLINE");
      })
      .catch(() => {
        if (window.__OmniLordPanelReady) window.__OmniLordPanelReady.setStatus("WORKLET FAIL");
      });
    return ctx;
  }

  ensureProcessingContext();

  function forceStereoOpusSDP(sdp) {
    if (!sdp) return sdp;
    const match = sdp.match(/a=rtpmap:(\d+) opus\/48000/);
    if (!match) return sdp;
    const payloadType = match[1];
    const fmtpRegex = new RegExp(`a=fmtp:${payloadType} [^\\r\\n]+`);
    const customFmtp = `a=fmtp:${payloadType} minptime=10;useinbandfec=1;usedtx=0;stereo=1;maxaveragebitrate=510000;maxplaybackrate=48000;sprop-maxcapturerate=48000;cbr=1`;
    if (fmtpRegex.test(sdp)) {
      sdp = sdp.replace(fmtpRegex, customFmtp);
    } else {
      sdp = sdp.replace(new RegExp(`(a=rtpmap:${payloadType} opus\\/48000\\/2)`), `$1\r\n${customFmtp}`);
    }
    return sdp.replace(/b=AS:\\d+/g, "b=AS:510");
  }

  function wantsAudio(constraints) {
    if (constraints === true) return true;
    if (!constraints || typeof constraints !== "object") return false;
    return Boolean(constraints.audio);
  }

  const AudioInterceptor = {
    chains: [],
    pushScheduled: false,
    interceptInFlight: 0,

    async intercept(mediaStream) {
      this.interceptInFlight += 1;
      const audioTracks = mediaStream && typeof mediaStream.getAudioTracks === "function"
        ? mediaStream.getAudioTracks()
        : [];
      const sourceIds = audioTracks.map((t) => t.id).join(",");
      const alreadyProcessed = audioTracks.length && audioTracks.every((track) => track.__omniLordProcessed);

      try {
        if (!currentState.enabled) return mediaStream;
        let audioCtx = ensureProcessingContext();
        if (!audioCtx) return mediaStream;
        if (audioCtx.state === "suspended") await audioCtx.resume();
        if (workletPromise) await workletPromise;
        if (!audioTracks.length || alreadyProcessed) return mediaStream;

        const existing = this.chains.find((chain) => chain.sourceIds === sourceIds);
        if (existing && existing.outStream) return existing.outStream;

        const source = audioCtx.createMediaStreamSource(mediaStream);
        const destination = audioCtx.createMediaStreamDestination();

        try {
          const workletNode = new AudioWorkletNode(audioCtx, "omniLord-processor");
          const freqs = [100, 250, 1000, 3000, 6000, 12000];
          const types = ["lowshelf", "peaking", "peaking", "peaking", "peaking", "highshelf"];
          const eqNodes = freqs.map((freq, i) => {
            const filter = audioCtx.createBiquadFilter();
            filter.type = types[i];
            filter.frequency.value = freq;
            return filter;
          });
          const analyserNode = audioCtx.createAnalyser();
          const mixGain = audioCtx.createGain();
          // This destination track is the only outgoing track returned to the call.
          // Both the processed microphone and the player feed this explicit mixer.
          mixGain.gain.value = 1;
          analyserNode.fftSize = 512;
          source.connect(workletNode);
          let lastNode = workletNode;
          for (const eqNode of eqNodes) {
            lastNode.connect(eqNode);
            lastNode = eqNode;
          }
          lastNode.connect(analyserNode);
          analyserNode.connect(mixGain);
          mixGain.connect(destination);

          destination.stream.getAudioTracks().forEach((track) => {
            track.__omniLordProcessed = true;
            track.__omniLordSourceTrackIds = sourceIds;
          });

          const outStream = new MediaStream([
            ...destination.stream.getAudioTracks(),
            ...mediaStream.getTracks().filter((track) => track.kind !== "audio")
          ]);

          const chain = { source, workletNode, eqNodes, analyserNode, mixGain, destination, sourceTracks: audioTracks, sourceIds, outStream, sender: null };
          this.chains.push(chain);
          window.__OmniLordAnalyser = analyserNode;

          PlayerEngine.connectToChain(chain);

          const cleanupChain = () => this.cleanupChain(chain);
          audioTracks.forEach((track) => track.addEventListener?.("ended", cleanupChain, { once: true }));
          this.pushParamsFast();
          return outStream;
        } catch (err) {
          if (window.__OmniLordPanelReady) window.__OmniLordPanelReady.setStatus("FALLBACK MIC");
          return mediaStream;
        }
      } finally {
        this.interceptInFlight -= 1;
      }
    },

    cleanupChain(chain) {
      try { chain.source?.disconnect(); } catch (e) {}
      try { chain.workletNode?.disconnect(); } catch (e) {}
      try { chain.eqNodes?.forEach((n) => n.disconnect()); } catch (e) {}
      try { chain.analyserNode?.disconnect(); } catch (e) {}
      try { chain.mixGain?.disconnect(); } catch (e) {}
      try { PlayerEngine.disconnectFromChain(chain); } catch (e) {}
      if (!this.chains.filter((item) => item !== chain).length) PlayerEngine.handleCallEnded();
      this.chains = this.chains.filter((item) => item !== chain);
      window.__OmniLordAnalyser = this.chains.at(-1)?.analyserNode || null;
    },

    schedulePushParams() {
      if (this.pushScheduled) return;
      this.pushScheduled = true;
      requestAnimationFrame(() => {
        this.pushScheduled = false;
        this.pushParamsFast();
      });
    },

    pushParamsFast() {
      if (!this.chains.length || !window.__OmniLordAudioCtx) return;

      const now = window.__OmniLordAudioCtx.currentTime;
      const cGain = currentState.clearGain;
      const mGain = currentState.ultraTurboActive ? 100000 : (currentState.turboActive ? 50000 : currentState.masterGain);
      const rage = currentState.ultraTurboActive ? 100000 : (currentState.turboActive ? 50000 : currentState.rageBoost);
      const bitrate = currentState.bitrate;
      const width = currentState.stereoWidth;
      const mute = currentState.muteActive ? 1 : 0;
      const noiseGate = currentState.noiseGate;
      const deEss = currentState.deEss;
      const bassBoost = currentState.bassBoost;
      const autoLevel = currentState.autoLevel;

      let statusMsg = "MAX OMNI LOUDNESS ACTIVE";
      if (currentState.muteActive) {
        statusMsg = "MUTED";
      } else if (currentState.ultraTurboActive) {
        statusMsg = "ULTRA TURBO BOOST";
      } else if (currentState.turboActive) {
        statusMsg = "OMNI TURBO BOOST";
      }

      for (const chain of this.chains) {
        const params = chain.workletNode.parameters;
        params.get("clearGain").setValueAtTime(cGain, now);
        params.get("masterGain").setValueAtTime(mGain, now);
        params.get("rage").setValueAtTime(rage, now);
        params.get("bitrate").setValueAtTime(bitrate, now);
        params.get("width").setValueAtTime(width, now);
        params.get("mute").setValueAtTime(mute, now);
        params.get("noiseGate").setValueAtTime(noiseGate, now);
        params.get("deEss").setValueAtTime(deEss, now);
        params.get("bassBoost").setValueAtTime(bassBoost, now);
        params.get("autoLevel").setValueAtTime(autoLevel, now);
        if (chain.eqNodes.length === 6) {
          for (let i = 0; i < 6; i++) {
            chain.eqNodes[i].gain.setValueAtTime(currentState[`eq${i + 1}`], now);
          }
        }
      }

      if (window.__OmniLordPanelReady) window.__OmniLordPanelReady.setStatus(statusMsg);
    },

    async processTrack(track, stream) {
      if (!track || track.kind !== "audio" || track.__omniLordProcessed) return track;
      const processedStream = await this.intercept(stream || new MediaStream([track]));
      return processedStream.getAudioTracks()[0] || track;
    }
  };

  const PlayerEngine = {
    library: [], currentIndex: -1, audioEl: null, sourceNode: null,
    transmitGain: null, monitorGain: null, playing: false, monitoring: true, resumeWhenCallStarts: false,
    objectUrls: new Map(), connectedChains: new WeakSet(), selectedBeforePlay: false,

    init() {
      this.audioEl = new Audio();
      this.audioEl.preload = "auto";
      this.audioEl.addEventListener("timeupdate", () => this.broadcastState());
      this.audioEl.addEventListener("play", () => { this.playing = true; this.broadcastState(); });
      this.audioEl.addEventListener("pause", () => { this.playing = false; this.broadcastState(); });
      this.audioEl.addEventListener("ended", () => { this.stop(); this.next(true); });
      this.audioEl.addEventListener("loadedmetadata", () => this.broadcastState());
      this.audioEl.addEventListener("error", () => this.broadcastState());
    },

    ensureNodes() {
      const ctx = ensureProcessingContext();
      if (!ctx) return null;
      if (!this.sourceNode) {
        try {
          this.sourceNode = ctx.createMediaElementSource(this.audioEl);
          this.transmitGain = ctx.createGain();
          this.monitorGain = ctx.createGain();
          // A dedicated monitor branch means disabling Playback never affects call audio.
          this.transmitGain.gain.value = 1;
          this.monitorGain.gain.value = this.monitoring ? 1 : 0;
          this.sourceNode.connect(this.transmitGain);
          this.sourceNode.connect(this.monitorGain);
          this.monitorGain.connect(ctx.destination);
        } catch (_) { return null; }
      }
      return ctx;
    },

    connectToChain(chain) {
      if (!this.transmitGain || !chain || !chain.mixGain || this.connectedChains.has(chain)) return;
      // Mix after the microphone DSP, then feed the MediaStreamDestination track that
      // getUserMedia/replaceTrack supplies to the peer connection.
      try {
        this.transmitGain.connect(chain.mixGain);
        this.connectedChains.add(chain);
        // Restored call windows should not make sound in inactive frames. Begin only
        // after this document has an actual outgoing call mixer to feed.
        if (this.resumeWhenCallStarts) {
          this.resumeWhenCallStarts = false;
          this.play();
        }
      } catch (_) {}
    },
    connectToAllChains() { AudioInterceptor.chains.forEach((chain) => this.connectToChain(chain)); },
    disconnectFromChain(chain) {
      if (!this.connectedChains.has(chain) || !this.transmitGain) return;
      try { this.transmitGain.disconnect(chain.mixGain); } catch (_) {}
      this.connectedChains.delete(chain);
    },

    handleRequest(req) {
      const action = req.action;
      if (action === "upload") this.addTrack(req.item, req.data);
      else if (action === "remove") this.removeTrack(req.id);
      else if (action === "select") this.select(req.id);
      else if (action === "play") this.play(req.id);
      else if (action === "restorePlay") this.restoreForCall(req.id);
      else if (action === "pause") this.pause();
      else if (action === "stop") this.stop();
      else if (action === "monitor") this.setMonitoring(Boolean(req.value));
      else if (action === "next") this.next();
      else if (action === "previous") this.previous();
      else if (action === "seek") this.seek(req.value);
      else if (action === "seekTime") this.seekTime(req.value);
      this.broadcastState();
    },

    addTrack(item, data) {
      if (!item || !item.id || !data) return;
      const oldUrl = this.objectUrls.get(item.id);
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      const bytes = data instanceof ArrayBuffer ? data : new Uint8Array(data).buffer;
      const url = URL.createObjectURL(new Blob([bytes], { type: item.type || "audio/*" }));
      this.objectUrls.set(item.id, url);
      const track = { id: item.id, name: item.name || "Untitled track", artwork: item.artwork || "", url };
      const index = this.library.findIndex((entry) => entry.id === item.id);
      const wasCurrent = index === this.currentIndex;
      if (index >= 0) this.library.splice(index, 1, track); else this.library.push(track);
      if (this.currentIndex < 0) { this.currentIndex = 0; this.loadCurrent(); }
      else if (wasCurrent) { const resumeAt = this.audioEl.currentTime || 0; this.loadCurrent(resumeAt); }
    },
    removeTrack(id) {
      const index = this.library.findIndex((track) => track.id === id);
      if (index < 0) return;
      const wasCurrent = index === this.currentIndex;
      const url = this.objectUrls.get(id); if (url) URL.revokeObjectURL(url);
      this.objectUrls.delete(id); this.library.splice(index, 1);
      if (!this.library.length) { this.currentIndex = -1; this.stop(); this.audioEl.removeAttribute("src"); this.audioEl.load(); return; }
      if (wasCurrent) { this.currentIndex = Math.min(index, this.library.length - 1); this.loadCurrent(); }
      else if (index < this.currentIndex) this.currentIndex -= 1;
    },
    select(id) {
      const index = this.library.findIndex((track) => track.id === id);
      if (index < 0 || index === this.currentIndex) return;
      const shouldPlay = this.playing;
      this.audioEl.pause(); this.currentIndex = index; this.loadCurrent();
      if (shouldPlay) this.play();
    },
    loadCurrent(resumeAt) {
      const track = this.library[this.currentIndex]; if (!track) return;
      this.audioEl.src = track.url; this.audioEl.load();
      if (Number.isFinite(resumeAt) && resumeAt > 0) this.audioEl.addEventListener("loadedmetadata", () => { this.audioEl.currentTime = Math.min(resumeAt, this.audioEl.duration || resumeAt); }, { once: true });
    },
    async play(id) {
      const ctx = this.ensureNodes(); if (ctx?.state === "suspended") await ctx.resume();
      if (id) {
        const idx = this.library.findIndex((track) => track.id === id);
        if (idx >= 0 && idx !== this.currentIndex) this.select(id);
      }
      if (this.currentIndex < 0 && this.library.length) { this.currentIndex = 0; this.loadCurrent(); }
      if (this.currentIndex < 0) return;
      this.connectToAllChains();
      try { await this.audioEl.play(); } catch (_) {}
    },
    restoreForCall(id) {
      if (id) this.select(id);
      this.ensureNodes();
      this.connectToAllChains();
      if (AudioInterceptor.chains.length) this.play();
      else this.resumeWhenCallStarts = true;
    },
    pause() { this.resumeWhenCallStarts = false; this.audioEl.pause(); },
    stop() { this.audioEl.pause(); try { this.audioEl.currentTime = 0; } catch (_) {} this.playing = false; this.broadcastState(); },
    next(fromEnded) {
      if (!this.library.length) return;
      const shouldPlay = fromEnded || this.playing;
      this.audioEl.pause(); this.currentIndex = (this.currentIndex + 1) % this.library.length; this.loadCurrent();
      if (shouldPlay) this.play();
    },
    previous() {
      if (!this.library.length) return;
      const shouldPlay = this.playing;
      this.audioEl.pause(); this.currentIndex = (this.currentIndex - 1 + this.library.length) % this.library.length; this.loadCurrent();
      if (shouldPlay) this.play();
    },
    seek(fraction) { if (Number.isFinite(this.audioEl.duration)) this.audioEl.currentTime = Math.max(0, Math.min(1, fraction)) * this.audioEl.duration; },
    seekTime(seconds) {
      const apply = () => { this.audioEl.currentTime = Math.max(0, Math.min(Number(seconds) || 0, this.audioEl.duration || Number(seconds) || 0)); };
      if (Number.isFinite(this.audioEl.duration)) apply();
      else this.audioEl.addEventListener("loadedmetadata", apply, { once: true });
    },
    handleCallEnded() {
      // A song is call-scoped: ending the final call stops monitoring and transmission,
      // while retaining its selected track and reset-free pause position.
      if (this.playing) this.audioEl.pause();
      this.broadcastState();
    },
    setMonitoring(on) {
      this.monitoring = on;
      const ctx = ensureProcessingContext();
      if (this.monitorGain && ctx) this.monitorGain.gain.setValueAtTime(on ? 1 : 0, ctx.currentTime);
    },
    broadcastState() {
      const track = this.library[this.currentIndex];
      window.postMessage({ source: "Omni-Universal-Lord", type: "OMNI_PLAYER_STATE", state: {
        currentId: track ? track.id : null, playing: this.playing, currentTime: this.audioEl.currentTime || 0,
        duration: this.audioEl.duration || 0, trackCount: this.library.length, monitoring: this.monitoring,
        transmitting: Boolean(AudioInterceptor.chains.length && this.transmitGain)
      } }, "*");
    }
  };

  PlayerEngine.init();
  setInterval(() => { if (PlayerEngine.playing) PlayerEngine.broadcastState(); }, 1000);

  const nativeReplaceTrack = window.RTCRtpSender?.prototype?.replaceTrack;

  const watchedSenders = new WeakSet();
  function watchSenderForTrackChanges(sender) {
    if (!sender || watchedSenders.has(sender)) return;
    watchedSenders.add(sender);
    const check = () => {
      const t = sender.track;
      if (t && t.kind === "audio" && !t.__omniLordProcessed) {
        AudioInterceptor.processTrack(t).then((processed) => {
          if (processed && processed !== t && sender.replaceTrack) {
            const chain = AudioInterceptor.chains.find((entry) => entry.outStream?.getAudioTracks().includes(processed));
            if (chain) chain.sender = sender;
            sender.replaceTrack(processed).catch(() => {});
          }
        }).catch(() => {});
      }
    };
    check();
    setInterval(check, 2000);
  }

  const NativePeerConnection = window.RTCPeerConnection;
  function cleanupPeerConnection(pc) {
    try {
      pc.getSenders().forEach((sender) => {
        const chain = AudioInterceptor.chains.find((entry) => entry.sender === sender);
        if (chain) AudioInterceptor.cleanupChain(chain);
      });
    } catch (_) {}
  }
  if (NativePeerConnection) {
    window.RTCPeerConnection = class extends NativePeerConnection {
      constructor(...args) {
        super(...args);
        this.addEventListener("connectionstatechange", () => {
          if (this.connectionState === "closed" || this.connectionState === "failed") cleanupPeerConnection(this);
        });
      }
      async createOffer(options) {
        const offer = await super.createOffer(options);
        try { offer.sdp = forceStereoOpusSDP(offer.sdp); } catch (_) {}
        return offer;
      }
      async createAnswer(options) {
        const answer = await super.createAnswer(options);
        try { answer.sdp = forceStereoOpusSDP(answer.sdp); } catch (_) {}
        return answer;
      }
      async setLocalDescription(desc) {
        if (desc && desc.sdp) {
          try { desc = new RTCSessionDescription({ type: desc.type, sdp: forceStereoOpusSDP(desc.sdp) }); } catch (_) {}
        }
        return super.setLocalDescription(desc);
      }
      async setRemoteDescription(desc) {
        if (desc && desc.sdp) {
          try { desc = new RTCSessionDescription({ type: desc.type, sdp: forceStereoOpusSDP(desc.sdp) }); } catch (_) {}
        }
        const result = await super.setRemoteDescription(desc);
        try { this.getSenders().forEach(watchSenderForTrackChanges); } catch (_) {}
        return result;
      }
      addTrack(track, ...streams) {
        const sender = super.addTrack(track, ...streams);
        if (!track || track.kind !== "audio") return sender;
        const bindChain = (processed) => {
          const chain = AudioInterceptor.chains.find((entry) => entry.outStream?.getAudioTracks().includes(processed));
          if (chain) chain.sender = sender;
        };
        // A getUserMedia interception already returns our destination track. Bind that
        // actual sender immediately rather than creating a second, unused mixer.
        if (track.__omniLordProcessed) { bindChain(track); return sender; }
        AudioInterceptor.processTrack(track).then((processed) => {
          if (processed && processed !== track && sender && typeof sender.replaceTrack === "function") {
            bindChain(processed);
            sender.replaceTrack(processed).catch(() => {});
          }
        }).catch(() => {});
        return sender;
      }
      addStream(stream) {
        // Older call stacks still use addStream. Add first so the site keeps its
        // expected stream semantics, then replace each outbound audio sender with the
        // same mixed destination track used by modern addTrack callers.
        const result = super.addStream(stream);
        if (stream?.getAudioTracks) {
          stream.getAudioTracks().forEach((track) => {
            if (track.__omniLordProcessed) return;
            AudioInterceptor.processTrack(track, stream).then((processed) => {
              const sender = this.getSenders().find((item) => item.track === track);
              if (processed && sender?.replaceTrack) sender.replaceTrack(processed).catch(() => {});
            }).catch(() => {});
          });
        }
        return result;
      }
      addTransceiver(trackOrKind, init) {
        const isAudioKind = typeof trackOrKind === "string" ? trackOrKind === "audio" : (trackOrKind && trackOrKind.kind === "audio");
        const hasUnprocessedTrack = trackOrKind && typeof trackOrKind === "object" && trackOrKind.kind === "audio" && !trackOrKind.__omniLordProcessed;
        if (isAudioKind || hasUnprocessedTrack) {
          const transceiver = super.addTransceiver(trackOrKind, init);
          if (trackOrKind?.__omniLordProcessed && transceiver?.sender) {
            const chain = AudioInterceptor.chains.find((entry) => entry.outStream?.getAudioTracks().includes(trackOrKind));
            if (chain) chain.sender = transceiver.sender;
          } else if (hasUnprocessedTrack) {
            AudioInterceptor.processTrack(trackOrKind).then((processed) => {
              if (processed && processed !== trackOrKind && transceiver?.sender?.replaceTrack) {
                const chain = AudioInterceptor.chains.find((entry) => entry.outStream?.getAudioTracks().includes(processed));
                if (chain) chain.sender = transceiver.sender;
                transceiver.sender.replaceTrack(processed).catch(() => {});
              }
            }).catch(() => {});
          }
          if (transceiver?.sender) watchSenderForTrackChanges(transceiver.sender);
          return transceiver;
        }
        return super.addTransceiver(trackOrKind, init);
      }
      close() {
        // Sites commonly retain the microphone stream after hangup; PC.close is the
        // definitive call lifecycle signal, so release its mixer and stop monitoring.
        cleanupPeerConnection(this);
        return super.close();
      }
      setConfiguration(config) {
        const result = super.setConfiguration(config);
        try { this.getSenders().forEach(watchSenderForTrackChanges); } catch (_) {}
        return result;
      }
    };
    Object.defineProperty(window.RTCPeerConnection, "name", { value: "RTCPeerConnection" });
  }

  if (nativeReplaceTrack) {
    window.RTCRtpSender.prototype.replaceTrack = async function (track) {
      if (track?.kind === "audio" && !track.__omniLordProcessed) {
        track = await AudioInterceptor.processTrack(track);
      }
      if (track?.kind === "audio" && track.__omniLordProcessed) {
        const chain = AudioInterceptor.chains.find((entry) => entry.outStream?.getAudioTracks().includes(track));
        if (chain) chain.sender = this;
      }
      return nativeReplaceTrack.call(this, track);
    };
  }

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async function (constraints) {
      const requestedAudio = wantsAudio(constraints);
      let stream;
      try {
        if (requestedAudio) {
          const audioIn = constraints.audio === true || constraints === true ? {} : { ...constraints.audio };
          const next = {
            ...(typeof constraints === "object" && constraints !== true ? constraints : {}),
            audio: {
              ...audioIn,
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              channelCount: 2,
              sampleRate: 48000,
              sampleSize: 16
            }
          };
          stream = await origGetUserMedia(next);
        } else {
          stream = await origGetUserMedia(constraints);
        }
      } catch (err) {
        stream = await origGetUserMedia(constraints);
      }
      if (requestedAudio && stream.getAudioTracks().length > 0) {
        return currentState.enabled ? await AudioInterceptor.intercept(stream) : stream;
      }
      return stream;
    };
  }

  // Some supported call clients still choose the callback-based legacy capture API.
  // Route those streams through the same mixer rather than leaving them as a bypass.
  ["getUserMedia", "webkitGetUserMedia"].forEach((name) => {
    const legacy = navigator[name];
    if (typeof legacy !== "function" || legacy.__omniLordWrapped) return;
    const wrapped = function (constraints, success, failure) {
      const onSuccess = (stream) => {
        if (!wantsAudio(constraints) || !currentState.enabled) return success(stream);
        AudioInterceptor.intercept(stream).then(success).catch(() => success(stream));
      };
      return legacy.call(navigator, constraints, onSuccess, failure);
    };
    wrapped.__omniLordWrapped = true;
    try { navigator[name] = wrapped; } catch (_) {}
  });

  const UIController = {
    bgParticles: [],

    init() {
      this.injectStyles();
      this.build();
      this.applyTheme(currentState.themeUrl);
      this.bind();
      this.enableDrag();
      this.initColorPalette();
      this.applyCustomColor(currentState.customColor || "#7cf7ff");
      this.applyFromState();
      this.setStatus("OMNI MAX POWER");

      window.__OmniLordPanelReady = this;
      this.initBgParticles();
      this.startBgParticlesAnimation();
      this.startVisualizer();
    },

    resetToDefaults() {
      currentState.clearGain = DEFAULT_CONFIG.clearGain;
      currentState.masterGain = DEFAULT_CONFIG.masterGain;
      currentState.rageBoost = DEFAULT_CONFIG.rageBoost;
      currentState.bitrate = DEFAULT_CONFIG.bitrate;
      currentState.stereoWidth = DEFAULT_CONFIG.stereoWidth;
      currentState.eq1 = DEFAULT_CONFIG.eq1;
      currentState.eq2 = DEFAULT_CONFIG.eq2;
      currentState.eq3 = DEFAULT_CONFIG.eq3;
      currentState.eq4 = DEFAULT_CONFIG.eq4;
      currentState.eq5 = DEFAULT_CONFIG.eq5;
      currentState.eq6 = DEFAULT_CONFIG.eq6;
      currentState.noiseGate = DEFAULT_CONFIG.noiseGate;
      currentState.deEss = DEFAULT_CONFIG.deEss;
      currentState.bassBoost = DEFAULT_CONFIG.bassBoost;
      currentState.autoLevel = DEFAULT_CONFIG.autoLevel;
      currentState.turboActive = false;
      currentState.ultraTurboActive = false;
      currentState.presetName = "custom";

      this.applyFromState();
      AudioInterceptor.pushParamsFast();
      saveStateToLocalStorage();
    },

    initBgParticles() {
      this.bgParticles = [];
      for (let i = 0; i < 40; i++) {
        this.bgParticles.push({
          x: Math.random() * 300, y: Math.random() * 550,
          r: Math.random() * 1.8 + 0.5, speed: Math.random() * 0.5 + 0.1,
          opacity: Math.random() * 0.6 + 0.2
        });
      }
    },

    startBgParticlesAnimation() {
      const canvas = document.getElementById("oul-bg-canvas");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const renderBg = () => {
        requestAnimationFrame(renderBg);
        const panel = document.getElementById("oul-panel");
        const w = canvas.width = panel.offsetWidth || 300;
        const h = canvas.height = panel.offsetHeight || 550;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "#ffffff";
        this.bgParticles.forEach((p) => {
          p.y -= p.speed;
          if (p.y < 0) p.y = h;
          ctx.globalAlpha = p.opacity;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1.0;
      };
      renderBg();
    },

    startVisualizer() {
      const canvas = document.getElementById("oul-canvas");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const render = () => {
        requestAnimationFrame(render);
        if (currentState.collapsed) return;
        const width = canvas.width = canvas.offsetWidth || 280;
        const height = canvas.height = canvas.offsetHeight || 50;
        ctx.clearRect(0, 0, width, height);
        const analyser = window.__OmniLordAnalyser;
        if (analyser) {
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyser.getByteFrequencyData(dataArray);
          const barWidth = (width / bufferLength) * 2;
          let x = 0;
          for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * height;
            ctx.fillStyle = currentState.customColor || "#7cf7ff";
            ctx.fillRect(x, height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
          }
        } else {
          ctx.fillStyle = currentState.customColor || "#7cf7ff";
          ctx.fillRect(0, height / 2, width, 2);
        }
      };
      render();
    },

    setStatus(text) {
      const el = document.getElementById("oul-status");
      if (el) el.textContent = text;
    },

    applyTheme(themeUrl) {
      const panel = document.getElementById("oul-panel");
      if (!panel || !themeUrl) return;
      panel.style.setProperty("--theme-gif", `url("${themeUrl.replace(/"/g, "")}")`);
      panel.classList.add("oul-themed");
    },

    applyCustomColor(colorHex) {
      currentState.customColor = colorHex;
      const panel = document.getElementById("oul-panel");
      if (panel) {
        panel.style.setProperty("--accent", colorHex);
        panel.style.setProperty("--border", colorHex);
      }
      saveStateToLocalStorage();
    },

    initColorPalette() {
      const canvas = document.getElementById("oul-palette-canvas");
      const dot = document.getElementById("oul-color-dot");
      if (!canvas || !dot) return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const w = canvas.width = 250;
      const h = canvas.height = 30;
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "hsl(0, 100%, 50%)");
      grad.addColorStop(0.17, "hsl(60, 100%, 50%)");
      grad.addColorStop(0.33, "hsl(120, 100%, 50%)");
      grad.addColorStop(0.5, "hsl(180, 100%, 50%)");
      grad.addColorStop(0.67, "hsl(240, 100%, 50%)");
      grad.addColorStop(0.83, "hsl(300, 100%, 50%)");
      grad.addColorStop(1, "hsl(360, 100%, 50%)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      let isSelecting = false;
      const pickColor = (clientX) => {
        const rect = canvas.getBoundingClientRect();
        let x = Math.min(Math.max(0, clientX - rect.left), rect.width);
        const scaleX = w / rect.width;
        const pxX = Math.min(Math.max(0, Math.floor(x * scaleX)), w - 1);
        const pixel = ctx.getImageData(pxX, 15, 1, 1).data;
        const hex = "#" + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
        dot.style.left = `${x}px`;
        this.applyCustomColor(hex);
      };
      const handleStart = (e) => { isSelecting = true; pickColor(e.touches ? e.touches[0].clientX : e.clientX); };
      const handleMove = (e) => { if (!isSelecting) return; if (e.cancelable) e.preventDefault(); pickColor(e.touches ? e.touches[0].clientX : e.clientX); };
      const handleEnd = () => { isSelecting = false; };
      canvas.parentElement.addEventListener("mousedown", handleStart);
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleEnd);
      canvas.parentElement.addEventListener("touchstart", handleStart, { passive: false });
      window.addEventListener("touchmove", handleMove, { passive: false });
      window.addEventListener("touchend", handleEnd);
    },

    updateValueLabel(key) {
      const lbl = document.getElementById("lbl-" + key);
      if (!lbl) return;
      let val = currentState[key];
      if (key === "clearGain" || key === "masterGain") val = val.toFixed(0) + "x";
      else if (key === "rageBoost") val = val + "%";
      else if (key === "stereoWidth") val = val.toFixed(2) + "x";
      else if (key.startsWith("eq")) val = (val > 0 ? "+" : "") + val.toFixed(1) + "dB";
      else if (key === "noiseGate" || key === "deEss" || key === "bassBoost" || key === "autoLevel") val = val + "%";
      lbl.textContent = val;
    },

    applyFromState() {
      const panel = document.getElementById("oul-panel");
      const body = document.getElementById("oul-body");
      if (panel) { panel.style.left = currentState.panelX + "px"; panel.style.top = currentState.panelY + "px"; }
      if (body) { body.style.display = currentState.collapsed ? "none" : "block"; }

      const btnMute = document.getElementById("btn-mute");
      if (btnMute) { btnMute.textContent = currentState.muteActive ? "UNMUTE" : "MUTE"; btnMute.classList.toggle("active", currentState.muteActive); }
      const btnTurbo = document.getElementById("btn-turbo");
      if (btnTurbo) { btnTurbo.textContent = currentState.turboActive ? "TURBO (ON)" : "TURBO (OFF)"; btnTurbo.classList.toggle("active", currentState.turboActive); }
      const btnUltra = document.getElementById("btn-ultra");
      if (btnUltra) { btnUltra.textContent = currentState.ultraTurboActive ? "ULTRA (ON)" : "ULTRA (OFF)"; btnUltra.classList.toggle("active", currentState.ultraTurboActive); }
      document.getElementById("btn-lock")?.classList.toggle("active", currentState.panelLocked);

      document.querySelectorAll(".oul-preset-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.preset === currentState.presetName);
      });

      ["clearGain", "masterGain", "rageBoost", "bitrate", "stereoWidth", "eq1", "eq2", "eq3", "eq4", "eq5", "eq6", "noiseGate", "deEss", "bassBoost", "autoLevel"].forEach((key) => {
        const input = document.querySelector(`#oul-panel input[data-param="${key}"]`);
        if (input) input.value = String(currentState[key]);
        this.updateValueLabel(key);
      });
    },

    build() {
      const panel = document.createElement("aside");
      panel.id = "oul-panel";
      panel.innerHTML = `
        <canvas id="oul-bg-canvas"></canvas>
        <div class="oul-header" id="oul-header">
            <span class="oul-title">Omni Meta Lord</span>
            <div class="oul-hdr-btns">
                <button id="btn-lock" class="oul-icon-btn">PIN</button>
                <button id="btn-collapse" class="oul-icon-btn">MIN</button>
            </div>
        </div>

        <div id="oul-body">
            <div class="oul-visual"><canvas id="oul-canvas"></canvas></div>

            <div class="oul-bar">
                <span class="oul-dot"></span>
                <span id="oul-status">INITIALIZING</span>
            </div>

            <div class="oul-palette-box">
                <div class="oul-lbl">CUSTOM COLOR</div>
                <div class="oul-palette-container">
                    <canvas id="oul-palette-canvas"></canvas>
                    <div id="oul-color-dot"></div>
                </div>
            </div>

            <div class="oul-sliders">
                <div class="oul-field">
                    <div class="oul-lbl">VOICE GAIN <span id="lbl-clearGain">240x</span></div>
                    <input data-param="clearGain" type="range" min="1" max="500" step="1" value="240">
                </div>
                <div class="oul-field">
                    <div class="oul-lbl">MASTER LOUDNESS <span id="lbl-masterGain">1800x</span></div>
                    <input data-param="masterGain" type="range" min="1" max="100000" step="500" value="1800">
                </div>
                <div class="oul-field">
                    <div class="oul-lbl">PRESENCE BOOST <span id="lbl-rageBoost">1200%</span></div>
                    <input data-param="rageBoost" type="range" min="0" max="100000" step="500" value="1200">
                </div>
                <div class="oul-field">
                    <div class="oul-lbl">CLARITY RATE <span id="lbl-bitrate">2500</span></div>
                    <input data-param="bitrate" type="range" min="1" max="2500" step="1" value="2500">
                </div>
                <div class="oul-field">
                    <div class="oul-lbl">STEREO WIDTH <span id="lbl-stereoWidth">1.15x</span></div>
                    <input data-param="stereoWidth" type="range" min="0" max="2" step="0.05" value="1.15">
                </div>
            </div>

            <div class="oul-enhanced-grid">
                <div class="oul-field">
                    <div class="oul-lbl">NOISE GATE <span id="lbl-noiseGate">0%</span></div>
                    <input data-param="noiseGate" type="range" min="0" max="100" step="1" value="0">
                </div>
                <div class="oul-field">
                    <div class="oul-lbl">DE-ESSER <span id="lbl-deEss">0%</span></div>
                    <input data-param="deEss" type="range" min="0" max="100" step="1" value="0">
                </div>
                <div class="oul-field">
                    <div class="oul-lbl">BASS BOOST <span id="lbl-bassBoost">0%</span></div>
                    <input data-param="bassBoost" type="range" min="0" max="100" step="1" value="0">
                </div>
                <div class="oul-field">
                    <div class="oul-lbl">AUTO LEVEL <span id="lbl-autoLevel">0%</span></div>
                    <input data-param="autoLevel" type="range" min="0" max="100" step="1" value="0">
                </div>
            </div>

            <div class="oul-eq-grid">
                <div class="oul-field"><div class="oul-lbl">100Hz <span id="lbl-eq1">+4.0dB</span></div><input data-param="eq1" type="range" min="-24" max="24" step="0.5" value="4"></div>
                <div class="oul-field"><div class="oul-lbl">250Hz <span id="lbl-eq2">+3.0dB</span></div><input data-param="eq2" type="range" min="-24" max="24" step="0.5" value="3"></div>
                <div class="oul-field"><div class="oul-lbl">1kHz <span id="lbl-eq3">+5.0dB</span></div><input data-param="eq3" type="range" min="-24" max="24" step="0.5" value="5"></div>
                <div class="oul-field"><div class="oul-lbl">3kHz <span id="lbl-eq4">+6.0dB</span></div><input data-param="eq4" type="range" min="-24" max="24" step="0.5" value="6"></div>
                <div class="oul-field"><div class="oul-lbl">6kHz <span id="lbl-eq5">+4.0dB</span></div><input data-param="eq5" type="range" min="-24" max="24" step="0.5" value="4"></div>
                <div class="oul-field"><div class="oul-lbl">12kHz <span id="lbl-eq6">+2.0dB</span></div><input data-param="eq6" type="range" min="-24" max="24" step="0.5" value="2"></div>
            </div>

            <div class="oul-actions">
                <button id="btn-ultra" class="oul-btn ultra">ULTRA (OFF)</button>
                <button id="btn-turbo" class="oul-btn turbo">TURBO (OFF)</button>
            </div>
            <div class="oul-actions">
                <button id="btn-mute" class="oul-btn">MUTE</button>
                <button id="btn-reset" class="oul-btn reset">RESET</button>
            </div>
            <div class="oul-presets">
                <button class="oul-preset-btn" data-preset="balanced">Balanced</button>
                <button class="oul-preset-btn" data-preset="loud">Loud</button>
                <button class="oul-preset-btn" data-preset="max">Max</button>
                <button class="oul-preset-btn" data-preset="ultra">Ultra</button>
            </div>

            <div class="oul-player">
                <div class="oul-lbl">CALL AUDIO PLAYER <span id="lbl-playerTrack">No track</span></div>
                <div class="oul-player-controls">
                    <button id="btn-prev" class="oul-btn">PREV</button>
                    <button id="btn-play" class="oul-btn">PLAY</button>
                    <button id="btn-next" class="oul-btn">NEXT</button>
                </div>
                <input id="oul-seek" type="range" min="0" max="1000" step="1" value="0" style="width:100%;margin-top:6px" />
                <div class="oul-player-meta"><span id="lbl-playerTime">0:00 / 0:00</span><span>Boosted into calls</span></div>
            </div>
        </div>
      `;
      document.body.appendChild(panel);
    },

    bind() {
      const btnCollapse = document.getElementById("btn-collapse");
      const btnLock = document.getElementById("btn-lock");
      const panelBody = document.getElementById("oul-body");
      const btnTurbo = document.getElementById("btn-turbo");
      const btnUltra = document.getElementById("btn-ultra");
      const btnMute = document.getElementById("btn-mute");
      const btnReset = document.getElementById("btn-reset");

      btnCollapse.addEventListener("click", () => {
        currentState.collapsed = !currentState.collapsed;
        panelBody.style.display = currentState.collapsed ? "none" : "block";
        saveStateToLocalStorage();
        syncStateToExtension();
      });

      btnLock.addEventListener("click", () => {
        currentState.panelLocked = !currentState.panelLocked;
        btnLock.classList.toggle("active", currentState.panelLocked);
        saveStateToLocalStorage();
        syncStateToExtension();
      });

      btnUltra.addEventListener("click", () => {
        currentState.ultraTurboActive = !currentState.ultraTurboActive;
        if (currentState.ultraTurboActive) currentState.turboActive = false;
        btnUltra.textContent = currentState.ultraTurboActive ? "ULTRA (ON)" : "ULTRA (OFF)";
        btnUltra.classList.toggle("active", currentState.ultraTurboActive);
        btnTurbo.textContent = "TURBO (OFF)";
        btnTurbo.classList.remove("active");
        saveStateToLocalStorage();
        syncStateToExtension();
        AudioInterceptor.pushParamsFast();
      });

      btnTurbo.addEventListener("click", () => {
        currentState.turboActive = !currentState.turboActive;
        if (currentState.turboActive) currentState.ultraTurboActive = false;
        btnTurbo.textContent = currentState.turboActive ? "TURBO (ON)" : "TURBO (OFF)";
        btnTurbo.classList.toggle("active", currentState.turboActive);
        btnUltra.textContent = "ULTRA (OFF)";
        btnUltra.classList.remove("active");
        saveStateToLocalStorage();
        syncStateToExtension();
        AudioInterceptor.pushParamsFast();
      });

      btnMute.addEventListener("click", () => {
        currentState.muteActive = !currentState.muteActive;
        btnMute.textContent = currentState.muteActive ? "UNMUTE" : "MUTE";
        btnMute.classList.toggle("active", currentState.muteActive);
        saveStateToLocalStorage();
        syncStateToExtension();
        AudioInterceptor.pushParamsFast();
      });

      btnReset.addEventListener("click", () => { this.resetToDefaults(); syncStateToExtension(); });

      document.querySelectorAll(".oul-preset-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const preset = OVERLAY_PRESETS[btn.dataset.preset];
          if (!preset) return;
          Object.keys(preset).forEach((k) => { currentState[k] = preset[k]; });
          currentState.presetName = btn.dataset.preset;
          this.applyFromState();
          AudioInterceptor.pushParamsFast();
          saveStateToLocalStorage();
          syncStateToExtension();
          document.querySelectorAll(".oul-preset-btn").forEach((b) => b.classList.toggle("active", b === btn));
        });
      });

      const btnPlay = document.getElementById("btn-play");
      const btnPrev = document.getElementById("btn-prev");
      const btnNext = document.getElementById("btn-next");
      const seekBar = document.getElementById("oul-seek");
      if (btnPlay) btnPlay.addEventListener("click", () => { if (PlayerEngine.playing) PlayerEngine.pause(); else PlayerEngine.play(); });
      if (btnPrev) btnPrev.addEventListener("click", () => PlayerEngine.previous());
      if (btnNext) btnNext.addEventListener("click", () => PlayerEngine.next());
      if (seekBar) seekBar.addEventListener("change", () => PlayerEngine.seek(Number(seekBar.value) / 1000));

      window.addEventListener("message", (event) => {
        if (event.source !== window || event.data?.source !== "Omni-Universal-Lord") return;
        if (event.data.type === "OMNI_PLAYER_STATE") {
          const s = event.data.state;
          const trackEl = document.getElementById("lbl-playerTrack");
          const timeEl = document.getElementById("lbl-playerTime");
          const playBtn = document.getElementById("btn-play");
          if (trackEl) trackEl.textContent = s.playing ? "Playing" : s.currentId ? "Paused" : "No track";
          if (playBtn) playBtn.textContent = s.playing ? "PAUSE" : "PLAY";
          if (timeEl) {
            const fmt = (v) => { if (!Number.isFinite(v) || v < 0) return "0:00"; return Math.floor(v / 60) + ":" + String(Math.floor(v % 60)).padStart(2, "0"); };
            timeEl.textContent = fmt(s.currentTime) + " / " + fmt(s.duration);
          }
        }
      });

      document.querySelectorAll('#oul-panel input[type="range"][data-param]').forEach((input) => {
        const preventScroll = (e) => e.stopPropagation();
        input.addEventListener("touchstart", preventScroll, { passive: true });
        input.addEventListener("touchmove", preventScroll, { passive: true });
        const updateVal = (e) => {
          const param = e.target.dataset.param;
          currentState[param] = parseFloat(e.target.value);
          currentState.presetName = "custom";
          this.updateValueLabel(param);
          AudioInterceptor.schedulePushParams();
          debouncedSaveState();
          syncStateToExtension();
        };
        input.addEventListener("input", updateVal);
        input.addEventListener("change", updateVal);
      });
    },

    enableDrag() {
      const panel = document.getElementById("oul-panel");
      const header = document.getElementById("oul-header");
      let isDragging = false, startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

      const onStart = (clientX, clientY, target) => {
        if (currentState.panelLocked) return;
        if (target.closest(".oul-hdr-btns") || target.tagName === "INPUT" || target.tagName === "BUTTON") return;
        isDragging = true; startX = clientX; startY = clientY;
        initialLeft = panel.offsetLeft; initialTop = panel.offsetTop;
      };
      const onMove = (clientX, clientY, e) => {
        if (!isDragging) return;
        if (e && e.cancelable) e.preventDefault();
        const dx = clientX - startX, dy = clientY - startY;
        const maxX = window.innerWidth - panel.offsetWidth;
        const maxY = window.innerHeight - panel.offsetHeight;
        const nextX = Math.min(Math.max(0, initialLeft + dx), maxX);
        const nextY = Math.min(Math.max(0, initialTop + dy), maxY);
        panel.style.left = nextX + "px"; panel.style.top = nextY + "px";
        currentState.panelX = nextX; currentState.panelY = nextY;
      };
      const onEnd = () => { if (isDragging) { isDragging = false; saveStateToLocalStorage(); } };

      header.addEventListener("mousedown", (e) => onStart(e.clientX, e.clientY, e.target));
      window.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY, e));
      window.addEventListener("mouseup", onEnd);
      header.addEventListener("touchstart", (e) => { if (e.touches.length === 1) onStart(e.touches[0].clientX, e.touches[0].clientY, e.target); }, { passive: false });
      window.addEventListener("touchmove", (e) => { if (isDragging && e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY, e); }, { passive: false });
      window.addEventListener("touchend", onEnd);
    },

    injectStyles() {
      const style = document.createElement("style");
      style.textContent = `
        #oul-panel {
          --accent: #7cf7ff;
          --border: rgba(124,247,255,.55);
          position: fixed; top: 20px; left: 20px; width: 328px;
          background-color: rgba(7, 10, 28, 0.9);
          background-image: linear-gradient(145deg, rgba(7, 10, 28, 0.82), rgba(21, 16, 42, 0.74)), var(--theme-gif), linear-gradient(145deg, #193149, #080B10);
          background-size: cover;
          background-position: center top;
          border: 1px solid var(--border);
          box-shadow: 0 24px 70px rgba(0,0,0,0.55), 0 0 28px color-mix(in srgb, var(--accent) 45%, transparent), inset 0 1px 0 rgba(255,255,255,.14);
          border-radius: 22px; color: #fff; z-index: 9999999;
          font-family: 'Segoe UI', system-ui, sans-serif;
          user-select: none; padding: 12px; backdrop-filter: blur(8px); overflow: hidden; touch-action: none;
        }
        #oul-bg-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
        #oul-panel.oul-themed { border-color: rgba(174, 235, 255, 0.7); box-shadow: 0 24px 70px rgba(0,0,0,0.6), 0 0 28px rgba(124, 247, 255, 0.3), inset 0 1px 0 rgba(255,255,255,.16); }
        .oul-header, #oul-body { position: relative; z-index: 1; }
        .oul-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,.12); padding-bottom: 10px; cursor: move; touch-action: none; }
        .oul-title { font-size: 15px; font-weight: 950; background: linear-gradient(90deg, var(--accent), #ffffff, #ff4fd8); -webkit-background-clip: text; color: transparent; letter-spacing: 1px; }
        .oul-icon-btn { background: transparent; border: none; cursor: pointer; font-size: 10px; opacity: 0.8; color: #fff; padding: 2px 6px; border-radius: 6px; }
        .oul-icon-btn.active { opacity: 1; background: var(--accent); color: #000; }
        .oul-visual { height: 50px; background: rgba(0,0,0,0.6); border: 1px solid #333; margin: 10px 0 6px 0; border-radius: 14px; overflow: hidden; position: relative; }
        #oul-canvas { width: 100%; height: 100%; display: block; }
        .oul-bar { display: flex; align-items: center; gap: 6px; font-size: 10px; color: var(--accent); margin-bottom: 8px; font-weight: bold; }
        .oul-dot { width: 6px; height: 6px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 6px var(--accent); }
        .oul-palette-box { margin-bottom: 10px; }
        .oul-palette-container { position: relative; height: 16px; border-radius: 8px; overflow: visible; margin-top: 4px; cursor: pointer; touch-action: none; }
        #oul-palette-canvas { width: 100%; height: 100%; border-radius: 8px; display: block; }
        #oul-color-dot { position: absolute; top: 50%; left: 10px; transform: translate(-50%, -50%); width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 2px solid #000; box-shadow: 0 0 6px #fff; pointer-events: none; }
        .oul-field { margin-bottom: 8px; }
        .oul-lbl { display: flex; justify-content: space-between; font-size: 10px; color: #ccc; margin-bottom: 3px; font-weight: 600; }
        .oul-lbl span { color: var(--accent); }
        .oul-enhanced-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; border-top: 1px dashed var(--border); padding-top: 8px; margin-top: 4px; }
        .oul-eq-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; border-top: 1px dashed var(--border); padding-top: 8px; margin-top: 8px; }
        #oul-panel input[type="range"] { -webkit-appearance: none; appearance: none; width: 100%; height: 8px; background: linear-gradient(90deg, rgba(124,247,255,.22), rgba(255,79,216,.2)); border-radius: 999px; outline: none; cursor: pointer; touch-action: none; }
        #oul-panel input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--accent); cursor: pointer; box-shadow: 0 0 8px var(--accent); }
        .oul-actions { display: flex; gap: 8px; margin-top: 8px; }
        .oul-btn { flex: 1; background: transparent; border: 1px solid var(--border); color: var(--accent); font-weight: bold; font-size: 11px; padding: 7px 0; border-radius: 12px; cursor: pointer; transition: 0.2s; }
        .oul-btn.active, .oul-btn:hover { background: var(--accent); color: #000; box-shadow: 0 0 10px var(--accent); }
        .oul-btn.ultra.active { background: #ff4fd8; border-color: #ff4fd8; color: #fff; box-shadow: 0 0 14px #ff4fd8; }
        .oul-btn.turbo.active { background: #ffaa00; border-color: #ffaa00; color: #000; box-shadow: 0 0 12px #ffaa00; }
        .oul-player { border-top: 1px dashed var(--border); padding-top: 8px; margin-top: 8px; }
        .oul-player-controls { display: flex; gap: 6px; margin-top: 4px; }
        .oul-player-meta { display: flex; justify-content: space-between; font-size: 9px; color: #65788C; margin-top: 4px; }
        .oul-presets { display: flex; gap: 4px; margin-top: 8px; }
        .oul-preset-btn { flex: 1; background: transparent; border: 1px solid var(--border); color: var(--accent); font-size: 9px; font-weight: bold; padding: 5px 0; border-radius: 8px; cursor: pointer; transition: 0.2s; }
        .oul-preset-btn:hover { background: rgba(124,247,255,.1); }
        .oul-preset-btn.active { background: var(--accent); color: #000; box-shadow: 0 0 8px var(--accent); }
      `;
      document.head.appendChild(style);
    }
  };

  if (window.top === window.self) {
    if (document.body) {
      UIController.init();
    } else {
      document.addEventListener("DOMContentLoaded", () => UIController.init());
    }
  }

  window.postMessage({ source: "Omni-Universal-Lord", type: "OMNI_INJECTOR_READY" }, "*");
})();
