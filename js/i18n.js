// =============================================================
// i18n.js — Localization (Turkish / English)
// =============================================================

const I18n = (() => {
    let currentLang = 'tr'; // Default Turkish

    const translations = {
        tr: {
            // Menu
            gameName: 'Connecta',
            start: 'Başla',
            levels: 'Leveller',
            settings: 'Ayarlar',
            // Level select
            levelSelect: 'Level Seç',
            levelSelectSub: 'Başlamak istediğin leveli seç',
            backToMenu: 'Ana Menü',
            // HUD
            level: 'Level',
            // Level complete
            levelComplete: 'Level {n} Tamamlandı!',
            timeLeft: 'Kalan Süre: {n}s',
            score: 'Skor: {n}',
            nextLevel: 'Sonraki Level →',
            mainMenu: 'Ana Menü',
            // Game over
            gameOver: 'Oyun Bitti!',
            retry: 'Tekrar Dene',
            playAgain: 'Tekrar Oyna',
            // All complete
            allComplete: 'Tebrikler!',
            allCompleteSub: 'Tüm levelleri tamamladın!',
            // Settings
            settingsTitle: 'Ayarlar',
            language: 'Dil',
            turkish: 'Türkçe',
            english: 'English',
            back: '← Geri',
            // Mode indicators
            darkMode: 'KARANLIK MODU',
            speedMode: 'HIZ MODU',
            // Level messages
            msg_connect: 'Şekilleri birbirine bağla!',
            msg_obstacles: 'Engellere dikkat!',
            msg_laser: 'Lazer ışınlarına dikkat!',
            msg_blinkLaser: 'Yanıp sönen lazer! Zamanlama!',
            msg_spinner: 'Dönen engel!',
            msg_cage: 'Hapis şekil! Önce kilidini aç!',
            msg_doubleCage: 'Çift kilit! Sıra önemli!',
            msg_dark: 'Karanlık Modu! Şekilleri bul!',
            msg_darkObs: 'Engelli Karanlık Modu!',
            msg_speed: 'Hız Modu! Süren: {n}sn',
            msg_chain: 'Zincirleme kilit!',
            msg_memCage: 'Karanlık + Hapis!',
            msg_final20: 'FİNAL! Yapabilir misin?',
            msg_darkSpin: 'Karanlık + Dönen Engel!',
            msg_darkCage: 'Karanlık + Hapis!',
            msg_speedLaser: 'Hız + Lazer! Süren: {n}sn',
            msg_dark4: 'Karanlık: 4 Çift!',
            msg_darkChain: 'Karanlık + Zincir Kilit!',
            msg_triple: 'Üçlü Tehlike!',
            msg_speedCageSpin: 'Hız + Hapis + Dönen! {n}sn',
            msg_boss: 'SON BOSS! Başarılar!',
            msg_level30: 'MUHTEŞEM! Oyunu bitirdin!',
            credits: 'Tasarım ve Kodlama: Antigravity AI',
            // Shop
            shop: 'Mağaza',
            shopTitle: 'Tema Mağazası',
            theme_default: 'Varsayılan',
            theme_fire: 'Ateş',
            theme_water: 'Su',
            theme_earth: 'Toprak',
            theme_air: 'Hava',
            shopBuy: 'Satın Al',
            shopOwned: 'Seç',
            shopEquipped: 'Aktif',
            shopNotEnough: 'Yeterli yıldız yok!',
        },
        en: {
            // Menu
            gameName: 'Connecta',
            start: 'Start',
            levels: 'Levels',
            settings: 'Settings',
            // Level select
            levelSelect: 'Select Level',
            levelSelectSub: 'Choose a level to play',
            backToMenu: 'Main Menu',
            // HUD
            level: 'Level',
            // Level complete
            levelComplete: 'Level {n} Complete!',
            timeLeft: 'Time Left: {n}s',
            score: 'Score: {n}',
            nextLevel: 'Next Level →',
            mainMenu: 'Main Menu',
            // Game over
            gameOver: 'Game Over!',
            retry: 'Try Again',
            playAgain: 'Play Again',
            // All complete
            allComplete: 'Congratulations!',
            allCompleteSub: 'You completed all levels!',
            // Settings
            settingsTitle: 'Settings',
            language: 'Language',
            turkish: 'Türkçe',
            english: 'English',
            back: '← Back',
            // Mode indicators
            darkMode: 'DARK MODE',
            speedMode: 'SPEED MODE',
            // Level messages
            msg_connect: 'Connect matching shapes!',
            msg_obstacles: 'Watch out for obstacles!',
            msg_laser: 'Watch out for lasers!',
            msg_blinkLaser: 'Blinking laser! Timing!',
            msg_spinner: 'Spinning obstacle!',
            msg_cage: 'Caged shape! Unlock it first!',
            msg_doubleCage: 'Double lock! Order matters!',
            msg_dark: 'Dark Mode! Find the shapes!',
            msg_darkObs: 'Dark Mode + Obstacles!',
            msg_speed: 'Speed Mode! {n} seconds!',
            msg_chain: 'Chain unlock!',
            msg_memCage: 'Dark & Cage!',
            msg_final20: 'FINAL! Can you do it?',
            msg_darkSpin: 'Dark + Spinner!',
            msg_darkCage: 'Dark + Cage!',
            msg_speedLaser: 'Speed + Laser!',
            msg_dark4: 'Dark: 4 Pairs!',
            msg_darkChain: 'Dark + Chain Lock!',
            msg_triple: 'Triple Threat!',
            msg_speedCageSpin: 'Speed + Cage + Spinner!',
            msg_boss: 'FINAL BOSS! Good luck!',
            msg_level30: 'AMAZING! Game Finished!',
            credits: 'Design & Code: Antigravity AI',
            // Shop
            shop: 'Shop',
            shopTitle: 'Theme Shop',
            theme_default: 'Default',
            theme_fire: 'Fire',
            theme_water: 'Water',
            theme_earth: 'Earth',
            theme_air: 'Air',
            shopBuy: 'Buy',
            shopOwned: 'Select',
            shopEquipped: 'Active',
            shopNotEnough: 'Not enough stars!',
        },
    };

    function loadLang() {
        try {
            const saved = localStorage.getItem('connectaLang');
            if (saved && translations[saved]) currentLang = saved;
        } catch (e) { }
    }

    function saveLang() {
        try { localStorage.setItem('connectaLang', currentLang); } catch (e) { }
    }

    loadLang();

    return {
        t(key, params) {
            let str = translations[currentLang]?.[key] || translations.tr[key] || key;
            if (params) {
                Object.keys(params).forEach(k => {
                    str = str.replace(`{${k}}`, params[k]);
                });
            }
            return str;
        },
        getLang() { return currentLang; },
        setLang(lang) {
            if (translations[lang]) {
                currentLang = lang;
                saveLang();
            }
        },
    };
})();
