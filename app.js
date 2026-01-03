/**
 * Japanese Walking App
 * Core Application Logic
 */

class AudioManager {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.masterGain = null;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }

    playTone(freq, duration, type = 'sine', decay = 0.1) {
        if (this.isMuted && duration < 0.5) return; // Mute only ticks, not alerts
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + decay);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + decay);
    }

    playKnock() {
        if (this.isMuted) return;
        // Woodblock-ish sound: High pitch sine with very short decay
        // Playing two quick taps to simulate "Knock-Knock"
        const now = this.ctx.currentTime;

        [0, 0.15].forEach(offset => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now + offset);

            gain.gain.setValueAtTime(0.8, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.1);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now + offset);
            osc.stop(now + offset + 0.1);
        });
    }

    playTick(isFast) {
        if (isFast) {
            // "Knock Knock" for fast
            this.playKnock();
        } else {
            // Tock for slow
            this.playTone(300, 0.1, 'sine');
        }
    }

    playTransition() {
        // "Gong" sound
        this.playTone(300, 1.5, 'triangle', 1.5);
    }

    playFinish() {
        // Boxing Bell - Complex sound
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const fundamental = 400;
        const ratios = [1, 1.4, 2.1, 2.7, 3.2]; // Ratios for bell-like partials

        ratios.forEach(ratio => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.frequency.value = fundamental * ratio;
            osc.type = 'triangle';

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 3);
        });
    }
}

class ExerciseManager {
    constructor(app, audio, ui, pedometer, history) {
        this.app = app; // Access to i18n
        this.audio = audio;
        this.ui = ui;
        this.pedometer = pedometer;
        this.history = history;

        // Settings
        this.intervals = {
            WARMUP: 0, // Instant start for now
            SLOW: 180, // 3 mins
            FAST: 180  // 3 mins
        };

        this.totalDuration = 30 * 60; // 30 mins
        this.state = 'IDLE'; // IDLE, SLOW, FAST, FINISHED
        this.timer = null;
        this.secondsRemaining = 0;
        this.intervalSecondsRemaining = 0;
        this.currentPhase = 1;
        this.totalPhases = Math.ceil(this.totalDuration / (this.intervals.SLOW + this.intervals.FAST)) * 2;
        this.currentSteps = 0;
        this.sessionStartTime = null;
    }

    start() {
        this.audio.init();
        // Updated: Start with FAST
        this.state = 'FAST';
        this.sessionStartTime = new Date(); // Track start time
        this.secondsRemaining = this.totalDuration;
        this.intervalSecondsRemaining = this.intervals.FAST;
        this.currentPhase = 1;
        this.currentSteps = 0;

        this.ui.updateMode('FAST');
        this.ui.updateTimer(this.intervalSecondsRemaining); // Show interval time or total? Let's show interval.
        this.ui.updateStats(0, this.currentPhase);

        this.pedometer.start((steps) => {
            this.currentSteps = steps;
            this.ui.updateStats(this.currentSteps, null);
        });

        this.startTimer();
    }

    stop() {
        clearInterval(this.timer);
        this.pedometer.stop();
        this.state = 'IDLE';
        this.ui.updateMode('IDLE');

        // Save incomplete session? decided only complete or significant ones maybe.
        // For MVP, save session on manual stop if duration > 1 min
        const durationMin = Math.floor((this.totalDuration - this.secondsRemaining) / 60);
        if (durationMin > 0) {
            this.history.saveSession({
                date: this.sessionStartTime ? this.sessionStartTime.toISOString() : new Date().toISOString(),
                duration: durationMin,
                steps: this.currentSteps,
                completed: false
            });
        }
    }

    startTimer() {
        if (this.timer) clearInterval(this.timer);

        this.timer = setInterval(() => {
            if (this.secondsRemaining <= 0) {
                this.finish();
                return;
            }

            this.secondsRemaining--;
            this.intervalSecondsRemaining--;

            // Tick Sound
            const isFast = this.state === 'FAST';
            // Metronome pacing
            // Slow: ~100BPM -> Every 0.6s
            // Fast: ~120BPM -> Every 0.5s
            // We are in a 1s loop, so we can't do perfect BPM here easily without Drift correction or shorter interval.
            // Simplified: Tick every second for now to mark time? 
            // User requested "ambience and pace".
            // Let's rely on the visual timer for second updates, but add a separate metronome loop for audio if needed.
            // For MVP, let's tick on the second.
            this.audio.playTick(isFast);

            // Interval Switch
            if (this.intervalSecondsRemaining <= 0) {
                this.switchPhase();
            } else if (this.intervalSecondsRemaining === 10) {
                // 10s warning?
                // Could implement logic here to change tick sound
            }

            this.ui.updateTimer(this.intervalSecondsRemaining);

        }, 1000);
    }

    switchPhase() {
        this.audio.playTransition();
        if (this.state === 'FAST') {
            this.state = 'SLOW';
            this.intervalSecondsRemaining = this.intervals.SLOW;
        } else {
            this.state = 'FAST';
            this.intervalSecondsRemaining = this.intervals.FAST;
        }
        this.currentPhase++;
        this.ui.updateMode(this.state);
        this.ui.updateStats(null, this.currentPhase);
    }

    finish() {
        clearInterval(this.timer);
        this.pedometer.stop();
        this.audio.playFinish();
        this.state = 'FINISHED';
        this.ui.updateMode('FINISHED');

        const durationMinutes = Math.floor(this.totalDuration / 60);
        this.history.saveSession({
            date: this.sessionStartTime ? this.sessionStartTime.toISOString() : new Date().toISOString(),
            duration: durationMinutes,
            steps: this.currentSteps,
            completed: true
        });
        alert(this.app.i18n.t('alert.complete', { steps: this.currentSteps, duration: durationMinutes }));
    }
}

class StepCounter {
    constructor() {
        this.steps = 0;
        this.lastPeakTime = 0;
        this.threshold = 11; // Acceleration magnitude threshold (approx > 1g + epsilon)
        this.isActive = false;
        this.onStep = null; // Callback
    }

    start(callback) {
        this.steps = 0;
        this.isActive = true;
        this.onStep = callback;

        if (window.DeviceMotionEvent) {
            window.addEventListener('devicemotion', this.handleMotion.bind(this));
        }
    }

    stop() {
        this.isActive = false;
        if (window.DeviceMotionEvent) {
            window.removeEventListener('devicemotion', this.handleMotion.bind(this));
        }
    }

    handleMotion(event) {
        if (!this.isActive) return;

        const acc = event.accelerationIncludingGravity;
        if (!acc) return;

        const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);

        // Simple peak detection
        const now = Date.now();
        if (magnitude > this.threshold && (now - this.lastPeakTime > 400)) { // Min 400ms between steps
            this.steps++;
            this.lastPeakTime = now;
            if (this.onStep) this.onStep(this.steps);
        }
    }
}

class HistoryManager {
    constructor() {
        this.storageKey = 'jwalk_history';
    }

    getHistory() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : [];
    }

    saveSession(session) {
        const history = this.getHistory();
        history.unshift(session); // Newest first
        localStorage.setItem(this.storageKey, JSON.stringify(history));
    }

    render(containerId) {
        const container = document.getElementById(containerId);
        const history = this.getHistory();

        container.innerHTML = '';

        if (history.length === 0) {
            container.innerHTML = '<div class="empty-state">No sessions yet. Start walking!</div>';
            return;
        }

        history.forEach(session => {
            const date = new Date(session.date).toLocaleDateString();
            const time = new Date(session.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div>
                    <div class="history-date">${date} ${time}</div>
                    <div class="history-details">${session.duration} mins • ${session.steps} steps</div>
                </div>
                <div class="history-mode">${session.completed ? '✅' : '⏹️'}</div>
            `;
            container.appendChild(div);
        });
    }
}

class App {
    constructor() {
        this.i18n = new LocalizationManager(); // Init i18n
        this.audio = new AudioManager();
        this.pedometer = new StepCounter();
        this.history = new HistoryManager();

        this.ui = {
            updateMode: (mode) => {
                const label = document.getElementById('mode-label');
                const body = document.body;

                body.classList.remove('bg-slow', 'bg-fast');
                label.classList.remove('exercise-mode-slow', 'exercise-mode-fast');

                if (mode === 'SLOW') {
                    label.textContent = this.i18n.t('mode.slow');
                    label.classList.add('exercise-mode-slow');
                    body.classList.add('bg-slow');
                } else if (mode === 'FAST') {
                    label.textContent = this.i18n.t('mode.fast');
                    label.classList.add('exercise-mode-fast');
                    body.classList.add('bg-fast');
                } else if (mode === 'FINISHED') {
                    label.textContent = this.i18n.t('mode.finished');
                } else {
                    label.textContent = this.i18n.t('mode.ready');
                }
            },
            updateTimer: (sec) => {
                const m = Math.floor(sec / 60).toString().padStart(2, '0');
                const s = (sec % 60).toString().padStart(2, '0');
                document.getElementById('timer').textContent = `${m}:${s}`;
            },
            updateStats: (steps, phase) => {
                if (steps !== null) document.getElementById('step-count').textContent = steps;
                if (phase !== null) document.getElementById('phase-counter').textContent = phase;
            }
        };

        // Inject dependencies including pedometer and history AND app (for i18n)
        this.exercise = new ExerciseManager(this, this.audio, this.ui, this.pedometer, this.history);

        this.initListeners();
        this.router = new Router(this);

        // Initial render of history
        this.history.render('history-list');

        // Theme initialization
        this.initTheme();

        // Lang initialization
        this.updateLangButton();

        // Listeners
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('lang-toggle').addEventListener('click', () => this.toggleLang());
    }

    initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
            document.getElementById('theme-toggle').textContent = '🌙';
        }
    }

    toggleTheme() {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        document.getElementById('theme-toggle').textContent = isLight ? '🌙' : '🌞';
    }

    toggleLang() {
        const newLang = this.i18n.toggleLanguage();
        this.updateLangButton();
        // Force update UI text that might depend on state
        if (this.exercise.state !== 'IDLE') {
            this.ui.updateMode(this.exercise.state);
        } else {
            this.ui.updateMode('IDLE');
        }

        // Update Buttons dynamic text
        const btnStart = document.getElementById('btn-start');
        if (this.exercise.state === 'IDLE' || this.exercise.state === 'FINISHED') {
            btnStart.textContent = this.i18n.t('btn.start');
        } else {
            btnStart.textContent = this.i18n.t('btn.stop');
        }
    }

    updateLangButton() {
        // Show the info of the NEXT lang to switch to, or current? Usually shows current. 
        // User asked for "EN" and "ID" switch.
        // Let's show current lang.
        document.getElementById('lang-toggle').textContent = this.i18n.lang.toUpperCase();
    }

    initListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = btn.dataset.target;
                this.router.navigate(target);

                if (target === 'history') {
                    this.history.render('history-list');
                }

                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Exercise Controls
        document.getElementById('btn-start').addEventListener('click', () => {
            const btn = document.getElementById('btn-start');
            if (this.exercise.state === 'IDLE' || this.exercise.state === 'FINISHED') {
                this.exercise.start();
                btn.textContent = this.i18n.t('btn.stop');
                btn.style.background = "#ff6b6b";
            } else {
                this.exercise.stop();
                btn.textContent = this.i18n.t('btn.start');
                btn.style.background = ""; // reset
            }
        });

        document.getElementById('btn-sound-toggle').addEventListener('click', (e) => {
            const isMuted = this.audio.toggleMute();
            e.target.textContent = isMuted ? "🔇" : "🔊";
        });
    }
}

class Router {
    constructor(app) {
        this.app = app;
        this.views = document.querySelectorAll('.view');
    }

    navigate(viewId) {
        this.views.forEach(view => {
            if (view.id === viewId) {
                view.classList.remove('hidden');
                view.classList.add('active');
            } else {
                view.classList.remove('active');
                view.classList.add('hidden'); // Use hidden class for layout fix in exercise
            }
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
