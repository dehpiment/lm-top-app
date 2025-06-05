// ===============================
// LIVEMESTRE OVERLAY - CONTROL LOGIC
// Versão limpa para uso via HTTP
// ===============================

const { ipcRenderer } = require('electron');

class OverlayControl {
    constructor() {
        this.data = {
            score: { home: 0, away: 0 },
            teams: { home: 'TIME CASA', away: 'TIME VISITANTE' },
            clock: { time: '00:00', period: '1º TEMPO', isRunning: false },
            isVisible: false,
            theme: 'light'
        };
        
        this.clockInterval = null;
        this.clockMinutes = 0;
        this.clockSeconds = 0;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupIPC();
        this.loadTheme();
        this.requestInitialData();
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Overlay toggle
        document.getElementById('overlayToggle').addEventListener('click', () => {
            this.toggleOverlay();
        });
        
        document.getElementById('toggleOverlayBtn').addEventListener('click', () => {
            this.toggleOverlay();
        });

        // Score controls
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleScoreAction(e.target.dataset.action);
            });
        });

        // Reset score
        document.getElementById('resetScoreBtn').addEventListener('click', () => {
            this.resetScore();
        });

        // Team name inputs
        document.getElementById('homeTeam').addEventListener('input', (e) => {
            this.updateTeams();
        });
        
        document.getElementById('awayTeam').addEventListener('input', (e) => {
            this.updateTeams();
        });

        // Clock controls
        document.getElementById('startClockBtn').addEventListener('click', () => {
            this.startClock();
        });
        
        document.getElementById('pauseClockBtn').addEventListener('click', () => {
            this.pauseClock();
        });
        
        document.getElementById('resetClockBtn').addEventListener('click', () => {
            this.resetClock();
        });

        // Clock inputs
        document.getElementById('clockMinutes').addEventListener('change', () => {
            this.updateClockFromInputs();
        });
        
        document.getElementById('clockSeconds').addEventListener('change', () => {
            this.updateClockFromInputs();
        });

        // Period select
        document.getElementById('periodSelect').addEventListener('change', (e) => {
            this.handlePeriodChange(e.target.value);
        });

        // Background controls
        document.getElementById('backgroundIn').addEventListener('change', (e) => {
            this.handleBackgroundUpload('in', e.target.files[0]);
        });
        
        document.getElementById('backgroundOut').addEventListener('change', (e) => {
            this.handleBackgroundUpload('out', e.target.files[0]);
        });

        // Preview buttons
        document.getElementById('previewInBtn').addEventListener('click', () => {
            this.previewBackground('in');
        });
        
        document.getElementById('previewOutBtn').addEventListener('click', () => {
            this.previewBackground('out');
        });
    }

    setupIPC() {
        // Receber atualizações do main process
        ipcRenderer.on('data-update', (event, data) => {
            console.log('Dados recebidos:', data);
            this.data = { ...this.data, ...data };
            this.updateUI();
        });
    }

    requestInitialData() {
        ipcRenderer.send('get-initial-data');
    }

    // ===============================
    // THEME MANAGEMENT
    // ===============================

    loadTheme() {
        const savedTheme = localStorage.getItem('lm-overlay-theme') || 'light';
        this.setTheme(savedTheme);
    }

    toggleTheme() {
        const newTheme = this.data.theme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        this.data.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        document.getElementById('themeToggle').textContent = theme === 'light' ? '🌙' : '☀️';
        localStorage.setItem('lm-overlay-theme', theme);
        ipcRenderer.send('update-theme', theme);
    }

    // ===============================
    // OVERLAY CONTROLS
    // ===============================

    toggleOverlay() {
        this.data.isVisible = !this.data.isVisible;
        ipcRenderer.send('toggle-overlay');
        this.updateOverlayStatus();
    }

    updateOverlayStatus() {
        const toggle = document.getElementById('overlayToggle');
        const statusText = toggle.querySelector('.status-text');
        
        if (this.data.isVisible) {
            toggle.classList.add('active');
            statusText.textContent = 'ON';
        } else {
            toggle.classList.remove('active');
            statusText.textContent = 'OFF';
        }
    }

    // ===============================
    // SCORE CONTROLS
    // ===============================

    handleScoreAction(action) {
        switch (action) {
            case 'home-plus':
                this.data.score.home++;
                break;
            case 'home-minus':
                if (this.data.score.home > 0) this.data.score.home--;
                break;
            case 'away-plus':
                this.data.score.away++;
                break;
            case 'away-minus':
                if (this.data.score.away > 0) this.data.score.away--;
                break;
        }
        
        this.updateScore();
    }

    resetScore() {
        this.data.score = { home: 0, away: 0 };
        this.updateScore();
    }

    updateScore() {
        document.getElementById('homeScore').textContent = this.data.score.home;
        document.getElementById('awayScore').textContent = this.data.score.away;
        ipcRenderer.send('update-score', this.data.score);
    }

    updateTeams() {
        const homeTeam = document.getElementById('homeTeam').value || 'TIME CASA';
        const awayTeam = document.getElementById('awayTeam').value || 'TIME VISITANTE';
        
        this.data.teams = { home: homeTeam, away: awayTeam };
        ipcRenderer.send('update-teams', this.data.teams);
    }

    // ===============================
    // CLOCK CONTROLS
    // ===============================

    startClock() {
        if (this.clockInterval) return; // Já está rodando
        
        this.data.clock.isRunning = true;
        this.clockInterval = setInterval(() => {
            this.clockSeconds++;
            if (this.clockSeconds >= 60) {
                this.clockSeconds = 0;
                this.clockMinutes++;
            }
            this.updateClockDisplay();
        }, 1000);
        
        this.updateClockButtons();
    }

    pauseClock() {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }
        this.data.clock.isRunning = false;
        this.updateClockButtons();
    }

    resetClock() {
        this.pauseClock();
        this.clockMinutes = 0;
        this.clockSeconds = 0;
        this.updateClockDisplay();
        this.updateClockInputs();
    }

    updateClockFromInputs() {
        this.clockMinutes = parseInt(document.getElementById('clockMinutes').value) || 0;
        this.clockSeconds = parseInt(document.getElementById('clockSeconds').value) || 0;
        
        // Validar segundos
        if (this.clockSeconds >= 60) {
            this.clockMinutes += Math.floor(this.clockSeconds / 60);
            this.clockSeconds = this.clockSeconds % 60;
        }
        
        this.updateClockDisplay();
        this.updateClockInputs();
    }

    updateClockDisplay() {
        const timeString = `${this.clockMinutes.toString().padStart(2, '0')}:${this.clockSeconds.toString().padStart(2, '0')}`;
        this.data.clock.time = timeString;
        ipcRenderer.send('update-clock', this.data.clock);
    }

    updateClockInputs() {
        document.getElementById('clockMinutes').value = this.clockMinutes;
        document.getElementById('clockSeconds').value = this.clockSeconds;
    }

    updateClockButtons() {
        const startBtn = document.getElementById('startClockBtn');
        const pauseBtn = document.getElementById('pauseClockBtn');
        
        if (this.data.clock.isRunning) {
            startBtn.disabled = true;
            pauseBtn.disabled = false;
        } else {
            startBtn.disabled = false;
            pauseBtn.disabled = false;
        }
    }

    handlePeriodChange(value) {
        const customInput = document.getElementById('customPeriod');
        
        if (value === 'PERSONALIZADO') {
            customInput.style.display = 'block';
            customInput.focus();
            this.data.clock.period = customInput.value || 'PERSONALIZADO';
        } else {
            customInput.style.display = 'none';
            this.data.clock.period = value;
        }
        
        ipcRenderer.send('update-clock', this.data.clock);
    }

    // ===============================
    // BACKGROUND CONTROLS
    // ===============================

    handleBackgroundUpload(type, file) {
        if (!file) return;
        
        if (!file.name.toLowerCase().endsWith('.webm')) {
            alert('Por favor, selecione apenas arquivos .webm');
            return;
        }
        
        // Implementar upload via IPC
        console.log(`Background ${type} uploaded:`, file.name);
        this.showNotification(`Background ${type === 'in' ? 'de entrada' : 'de saída'} carregado: ${file.name}`);
    }

    previewBackground(type) {
        // Implementar preview
        console.log(`Preview background ${type}`);
        this.showNotification(`Preview ${type === 'in' ? 'IN' : 'OUT'} - Em desenvolvimento`);
    }

    // ===============================
    // UI UPDATES
    // ===============================

    updateUI() {
        // Atualizar placar
        document.getElementById('homeScore').textContent = this.data.score.home;
        document.getElementById('awayScore').textContent = this.data.score.away;
        
        // Atualizar times
        document.getElementById('homeTeam').value = this.data.teams.home;
        document.getElementById('awayTeam').value = this.data.teams.away;
        
        // Atualizar status do overlay
        this.updateOverlayStatus();
        
        // Atualizar tema
        if (this.data.theme) {
            document.documentElement.setAttribute('data-theme', this.data.theme);
            document.getElementById('themeToggle').textContent = this.data.theme === 'light' ? '🌙' : '☀️';
        }
    }

    // ===============================
    // UTILITIES
    // ===============================

    showNotification(message) {
        // Criar notificação temporária
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--lm-red);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 6px;
            box-shadow: var(--shadow);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        // Adicionar animação CSS se não existir
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Remover após 3 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// ===============================
// INICIALIZAÇÃO
// ===============================

document.addEventListener('DOMContentLoaded', () => {
    window.overlayControl = new OverlayControl();
    
    // Adicionar evento para input personalizado de período
    document.getElementById('customPeriod').addEventListener('input', (e) => {
        window.overlayControl.data.clock.period = e.target.value || 'PERSONALIZADO';
        ipcRenderer.send('update-clock', window.overlayControl.data.clock);
    });
    
    console.log('LiveMestre Overlay Control inicializado!');
});