const translations = {
    en: {
        "app.title": "JWalk",
        "app.subtitle": "Japanese Walk Exercise",
        "nav.learn": "Learn",
        "nav.exercise": "Exercise",
        "nav.history": "History",
        "btn.theme": "Toggle Theme",
        "hero.title": "JWalk",
        "hero.subtitle": "Japanese Walk Exercise",
        "card.watch": "📺 Watch the Explanation",
        "card.benefits": "🌟 Benefits",
        "benefit.1": "Boosts metabolism & burns calories",
        "benefit.2": "Improves cardiovascular health",
        "benefit.3": "Strengthens leg muscles without strain",
        "benefit.4": "Reduces lifestyle-related disease risks",
        "card.how": "📋 How to Practice",
        "practice.step1": "FAST Walking (3 mins): Walk briskly.",
        "practice.step2": "SLOW Walking (3 mins): Walk leisurely.",
        "practice.step3": "Repeat for 5 sets (30 mins total).",
        "routine.title": "The Routine",
        "routine.fast": "<strong>3 Mins Fast</strong> (Long strides, arm swings)",
        "routine.slow": "<strong>3 Mins Slow</strong> (Relaxed pace)",
        "routine.repeat": "🔄 Repeat 5 times (30 mins total)",
        "card.ref": "📚 References",
        "mode.ready": "Ready",
        "mode.slow": "Slow Walking",
        "mode.fast": "Fast Walking",
        "mode.finished": "Finished",
        "stat.steps": "Step Count",
        "stat.phase": "Phase",
        "btn.start": "Start Session",
        "btn.stop": "Stop Session",
        "history.empty": "No sessions yet. Start walking!",
        "alert.complete": "Session Complete! You walked {steps} steps in {duration} minutes."
    },
    id: {
        "app.title": "JWalk",
        "app.subtitle": "Latihan Jalan Jepang",
        "nav.learn": "Belajar",
        "nav.exercise": "Latihan",
        "nav.history": "Riwayat",
        "btn.theme": "Ubah Tema",
        "hero.title": "JWalk",
        "hero.subtitle": "Latihan Jalan Jepang",
        "card.watch": "📺 Tonton Penjelasan",
        "card.benefits": "🌟 Manfaat",
        "benefit.1": "Meningkatkan metabolisme & bakar kalori",
        "benefit.2": "Meningkatkan kesehatan jantung",
        "benefit.3": "Menguatkan otot kaki tanpa beban berlebih",
        "benefit.4": "Mengurangi risiko penyakit gaya hidup",
        "card.how": "📋 Cara Berlatih",
        "practice.step1": "Jalan CEPAT (3 menit): Jalan tergesa-gesa.",
        "practice.step2": "Jalan LAMBAT (3 menit): Jalan santai.",
        "practice.step3": "Ulangi 5 set (total 30 menit).",
        "routine.title": "Rutinitas",
        "routine.fast": "<strong>3 Menit Cepat</strong> (Langkah lebar, ayunkan tangan)",
        "routine.slow": "<strong>3 Menit Lambat</strong> (Santai)",
        "routine.repeat": "🔄 Ulangi 5 kali (total 30 menit)",
        "card.ref": "📚 Referensi",
        "mode.ready": "Siap",
        "mode.slow": "Jalan Santai",
        "mode.fast": "Jalan Cepat",
        "mode.finished": "Selesai",
        "stat.steps": "Langkah",
        "stat.phase": "Fase",
        "btn.start": "Mulai Sesi",
        "btn.stop": "Hentikan Sesi",
        "history.empty": "Belum ada sesi. Ayo mulai jalan!",
        "alert.complete": "Sesi Selesai! Anda berjalan {steps} langkah dalam {duration} menit."
    }
};

class LocalizationManager {
    constructor() {
        this.lang = localStorage.getItem('lang') || 'en';
        this.updateUI();
    }

    setLanguage(lang) {
        this.lang = lang;
        localStorage.setItem('lang', lang);
        this.updateUI();
    }

    toggleLanguage() {
        this.setLanguage(this.lang === 'en' ? 'id' : 'en');
        return this.lang;
    }

    t(key, params = {}) {
        let text = translations[this.lang][key] || key;
        for (const [key, value] of Object.entries(params)) {
            text = text.replace(`{${key}}`, value);
        }
        return text;
    }

    updateUI() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            if (translations[this.lang][key]) {
                // Use innerHTML to support <strong> tags in translations
                el.innerHTML = translations[this.lang][key];
            }
        });

        // Update button text if it exists (special case if button text is strictly controlled by logic)
        // We will let the app logic handle dynamic buttons using t()
    }
}
