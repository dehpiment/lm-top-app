// ===============================
// LIVEMESTRE OVERLAY - SHARED UTILITIES
// Funções compartilhadas entre Control e Output
// ===============================

// ===============================
// CONSTANTS
// ===============================

const LM_CONSTANTS = {
    COLORS: {
        RED: '#E31E24',
        WHITE: '#FFFFFF',
        GRAY: '#2C2C2C',
        GRAY_LIGHT: '#4A4A4A',
        YELLOW: '#FFD700'
    },
    
    CANVAS: {
        WIDTH: 1920,
        HEIGHT: 1080
    },
    
    HOTKEYS: {
        F1: 'F1',
        F2: 'F2', 
        F3: 'F3',
        F4: 'F4',
        F5: 'F5'
    },
    
    ANIMATION_DURATION: {
        FAST: 300,
        NORMAL: 500,
        SLOW: 800
    },
    
    SPONSOR_DISPLAY_TIME: 5000, // 5 segundos
    
    STORAGE_KEYS: {
        THEME: 'lm-overlay-theme',
        POSITIONS: 'lm-overlay-positions',
        SETTINGS: 'lm-overlay-settings',
        PRESETS: 'lm-overlay-presets'
    }
};

// ===============================
// UTILITY FUNCTIONS
// ===============================

class LMUtils {
    
    // ===============================
    // TIME UTILITIES
    // ===============================
    
    static formatTime(minutes, seconds) {
        const m = Math.max(0, parseInt(minutes) || 0);
        const s = Math.max(0, parseInt(seconds) || 0);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    
    static parseTime(timeString) {
        const parts = timeString.split(':');
        return {
            minutes: parseInt(parts[0]) || 0,
            seconds: parseInt(parts[1]) || 0
        };
    }
    
    static addTime(timeString, secondsToAdd) {
        const { minutes, seconds } = this.parseTime(timeString);
        const totalSeconds = (minutes * 60) + seconds + secondsToAdd;
        const newMinutes = Math.floor(totalSeconds / 60);
        const newSeconds = totalSeconds % 60;
        return this.formatTime(newMinutes, newSeconds);
    }
    
    // ===============================
    // ANIMATION UTILITIES
    // ===============================
    
    static fadeIn(element, duration = LM_CONSTANTS.ANIMATION_DURATION.NORMAL) {
        return new Promise(resolve => {
            element.style.transition = `opacity ${duration}ms ease`;
            element.style.opacity = '0';
            element.style.display = 'block';
            
            setTimeout(() => {
                element.style.opacity = '1';
                setTimeout(resolve, duration);
            }, 10);
        });
    }
    
    static fadeOut(element, duration = LM_CONSTANTS.ANIMATION_DURATION.NORMAL) {
        return new Promise(resolve => {
            element.style.transition = `opacity ${duration}ms ease`;
            element.style.opacity = '0';
            
            setTimeout(() => {
                element.style.display = 'none';
                resolve();
            }, duration);
        });
    }
    
    static slideIn(element, direction = 'bottom', duration = LM_CONSTANTS.ANIMATION_DURATION.NORMAL) {
        return new Promise(resolve => {
            const transforms = {
                bottom: 'translateY(50px)',
                top: 'translateY(-50px)',
                left: 'translateX(-50px)',
                right: 'translateX(50px)'
            };
            
            element.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`;
            element.style.transform = transforms[direction];
            element.style.opacity = '0';
            element.style.display = 'block';
            
            setTimeout(() => {
                element.style.transform = 'translate(0)';
                element.style.opacity = '1';
                setTimeout(resolve, duration);
            }, 10);
        });
    }
    
    static slideOut(element, direction = 'bottom', duration = LM_CONSTANTS.ANIMATION_DURATION.NORMAL) {
        return new Promise(resolve => {
            const transforms = {
                bottom: 'translateY(50px)',
                top: 'translateY(-50px)',
                left: 'translateX(-50px)',
                right: 'translateX(50px)'
            };
            
            element.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`;
            element.style.transform = transforms[direction];
            element.style.opacity = '0';
            
            setTimeout(() => {
                element.style.display = 'none';
                resolve();
            }, duration);
        });
    }
    
    // ===============================
    // STORAGE UTILITIES
    // ===============================
    
    static saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            return false;
        }
    }
    
    static loadData(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            return defaultValue;
        }
    }
    
    static removeData(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Erro ao remover dados:', error);
            return false;
        }
    }
    
    // ===============================
    // VALIDATION UTILITIES
    // ===============================
    
    static validateScore(score) {
        const num = parseInt(score);
        return !isNaN(num) && num >= 0 && num <= 999;
    }
    
    static validateTeamName(name) {
        return typeof name === 'string' && name.trim().length > 0 && name.length <= 30;
    }
    
    static validateTime(minutes, seconds) {
        const m = parseInt(minutes);
        const s = parseInt(seconds);
        return !isNaN(m) && !isNaN(s) && m >= 0 && m <= 99 && s >= 0 && s <= 59;
    }
    
    static validateWebMFile(file) {
        return file && file.type === 'video/webm' && file.size <= 100 * 1024 * 1024; // 100MB max
    }
    
    static validateImageFile(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        return file && validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024; // 10MB max
    }
    
    // ===============================
    // STRING UTILITIES
    // ===============================
    
    static sanitizeText(text) {
        return text.replace(/[<>]/g, '').trim().substring(0, 100);
    }
    
    static truncateText(text, maxLength = 20) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
    
    static formatTeamName(name) {
        return this.sanitizeText(name).toUpperCase();
    }
    
    // ===============================
    // POSITION UTILITIES
    // ===============================
    
    static clampPosition(x, y, elementWidth, elementHeight, canvasWidth = LM_CONSTANTS.CANVAS.WIDTH, canvasHeight = LM_CONSTANTS.CANVAS.HEIGHT) {
        const clampedX = Math.max(0, Math.min(x, canvasWidth - elementWidth));
        const clampedY = Math.max(0, Math.min(y, canvasHeight - elementHeight));
        return { x: clampedX, y: clampedY };
    }
    
    static calculateCenter(canvasWidth = LM_CONSTANTS.CANVAS.WIDTH, canvasHeight = LM_CONSTANTS.CANVAS.HEIGHT) {
        return {
            x: canvasWidth / 2,
            y: canvasHeight / 2
        };
    }
    
    static getDefaultPositions() {
        return {
            scoreOverlay: { x: 760, y: 900 }, // Bottom center
            clockOverlay: { x: 860, y: 60 },  // Top center
            infoOverlay: { x: 1720, y: 60 },  // Top right
            sponsorsOverlay: { x: 1620, y: 900 } // Bottom right
        };
    }
    
    // ===============================
    // COLOR UTILITIES
    // ===============================
    
    static hexToRgba(hex, alpha = 1) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    static getThemeColors(theme) {
        if (theme === 'dark') {
            return {
                background: LM_CONSTANTS.COLORS.GRAY,
                text: LM_CONSTANTS.COLORS.WHITE,
                accent: LM_CONSTANTS.COLORS.RED
            };
        }
        return {
            background: LM_CONSTANTS.COLORS.WHITE,
            text: LM_CONSTANTS.COLORS.GRAY,
            accent: LM_CONSTANTS.COLORS.RED
        };
    }
    
    // ===============================
    // FILE UTILITIES
    // ===============================
    
    static async readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    static generateFileName(prefix, extension) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        return `${prefix}-${timestamp}.${extension}`;
    }
    
    // ===============================
    // NOTIFICATION UTILITIES
    // ===============================
    
    static showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `lm-notification lm-notification-${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;
        
        // Cores por tipo
        const colors = {
            info: LM_CONSTANTS.COLORS.GRAY,
            success: '#28A745',
            warning: LM_CONSTANTS.COLORS.YELLOW,
            error: '#DC3545'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Animar entrada
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Remover após duração
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }
    
    // ===============================
    // DEBUG UTILITIES
    // ===============================
    
    static log(message, data = null) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] LiveMestre:`, message, data || '');
    }
    
    static error(message, error = null) {
        const timestamp = new Date().toLocaleTimeString();
        console.error(`[${timestamp}] LiveMestre ERROR:`, message, error || '');
    }
    
    static generateDebugReport() {
        return {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            canvas: LM_CONSTANTS.CANVAS,
            storage: {
                theme: this.loadData(LM_CONSTANTS.STORAGE_KEYS.THEME),
                positions: this.loadData(LM_CONSTANTS.STORAGE_KEYS.POSITIONS),
                settings: this.loadData(LM_CONSTANTS.STORAGE_KEYS.SETTINGS)
            },
            performance: {
                memory: performance.memory || 'N/A',
                timing: performance.timing || 'N/A'
            }
        };
    }
}

// ===============================
// EXPORT
// ===============================

// Para uso em Node.js (Electron)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LMUtils, LM_CONSTANTS };
}

// Para uso no browser
if (typeof window !== 'undefined') {
    window.LMUtils = LMUtils;
    window.LM_CONSTANTS = LM_CONSTANTS;
}