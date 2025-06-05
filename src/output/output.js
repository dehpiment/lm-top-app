// ===============================
// LIVEMESTRE OVERLAY - OUTPUT LOGIC
// Canvas 1920x1080 para OBS Browser Source
// ===============================

const { ipcRenderer } = require('electron');

class OverlayOutput {
    constructor() {
        this.data = {
            score: { home: 0, away: 0 },
            teams: { home: 'TIME CASA', away: 'TIME VISITANTE' },
            clock: { time: '00:00', period: '1º TEMPO', isRunning: false },
            isVisible: false,
            theme: 'light'
        };
        
        this.backgroundVideos = {
            in: null,
            out: null
        };
        
        this.sponsorsData = [];
        this.currentSponsorIndex = 0;
        this.sponsorInterval = null;
        
        this.isEditMode = false;
        this.isDragging = false;
        this.dragElement = null;
        this.dragOffset = { x: 0, y: 0 };
        
        this.init();
    }

    init() {
        this.setupIPC();
        this.setupEventListeners();
        this.requestInitialData();
        this.setupDragAndDrop();
        
        // Log inicial
        console.log('LiveMestre Overlay Output inicializado!');
        this.updateDebugInfo();
    }

    setupIPC() {
        // Receber atualizações do processo principal
        ipcRenderer.on('data-update', (event, data) => {
            console.log('Dados recebidos:', data);
            this.data = { ...this.data, ...data };
            this.updateDisplay();
            this.updateDebugInfo();
        });

        // Comandos específicos
        ipcRenderer.on('show-overlay', () => {
            this.showOverlay();
        });

        ipcRenderer.on('hide-overlay', () => {
            this.hideOverlay();
        });

        ipcRenderer.on('play-background-in', (event, videoPath) => {
            this.playBackgroundVideo('in', videoPath);
        });

        ipcRenderer.on('play-background-out', (event, videoPath) => {
            this.playBackgroundVideo('out', videoPath);
        });

        ipcRenderer.on('toggle-edit-mode', () => {
            this.toggleEditMode();
        });
    }

    setupEventListeners() {
        // Teste de clique para debug
        document.addEventListener('click', (e) => {
            if (e.ctrlKey && e.shiftKey) {
                this.toggleDebugMode();
            }
        });

        // Redimensionar para teste
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    setupDragAndDrop() {
        const handles = document.querySelectorAll('.position-handle');
        
        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                this.startDrag(e, handle);
            });
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.handleDrag(e);
            }
        });

        document.addEventListener('mouseup', () => {
            this.endDrag();
        });
    }

    requestInitialData() {
        ipcRenderer.send('get-initial-data');
    }

    // ===============================
    // OVERLAY DISPLAY MANAGEMENT
    // ===============================

    updateDisplay() {
        this.updateScore();
        this.updateTeams();
        this.updateClock();
        this.updateVisibility();
    }

    updateScore() {
        document.getElementById('homeScore').textContent = this.data.score.home;
        document.getElementById('awayScore').textContent = this.data.score.away;
    }

    updateTeams() {
        document.getElementById('homeTeamName').textContent = this.data.teams.home;
        document.getElementById('awayTeamName').textContent = this.data.teams.away;
    }

    updateClock() {
        document.getElementById('clockTime').textContent = this.data.clock.time;
        document.getElementById('clockPeriod').textContent = this.data.clock.period;
    }

    updateVisibility() {
        const overlayElements = [
            document.getElementById('scoreOverlay'),
            document.getElementById('clockOverlay'),
            document.getElementById('infoOverlay')
        ];

        overlayElements.forEach(element => {
            if (this.data.isVisible) {
                element.classList.remove('hidden');
                element.classList.add('visible');
            } else {
                element.classList.remove('visible');
                element.classList.add('hidden');
            }
        });
    }

    showOverlay() {
        this.data.isVisible = true;
        this.playBackgroundVideo('in');
        
        // Delay para sincronizar com a animação de entrada
        setTimeout(() => {
            this.updateVisibility();
        }, 100);
    }

    hideOverlay() {
        this.updateVisibility();
        
        // Delay para a animação de saída antes do vídeo OUT
        setTimeout(() => {
            this.playBackgroundVideo('out');
            this.data.isVisible = false;
        }, 500);
    }

    // ===============================
    // BACKGROUND VIDEO MANAGEMENT
    // ===============================

    playBackgroundVideo(type, videoPath = null) {
        const video = document.getElementById('backgroundVideo');
        const source = document.getElementById('backgroundSource');
        
        if (videoPath) {
            source.src = videoPath;
            video.load();
        }
        
        if (video.src) {
            video.classList.add('playing');
            
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log(`Background ${type} playing`);
                }).catch(error => {
                    console.error(`Erro ao reproduzir background ${type}:`, error);
                });
            }
            
            // Quando o vídeo terminar
            video.onended = () => {
                if (type === 'in') {
                    // Vídeo IN terminou, manter no último frame
                    video.currentTime = video.duration;
                    video.classList.add('playing');
                } else if (type === 'out') {
                    // Vídeo OUT terminou, esconder tudo
                    video.classList.remove('playing');
                    video.currentTime = 0;
                }
            };
        }
    }

    loadBackgroundVideo(type, file) {
        const video = document.getElementById('backgroundVideo');
        const source = document.getElementById('backgroundSource');
        
        if (file && file.type === 'video/webm') {
            const url = URL.createObjectURL(file);
            this.backgroundVideos[type] = url;
            
            if (type === 'in') {
                source.src = url;
                video.load();
            }
            
            console.log(`Background ${type} carregado:`, file.name);
        }
    }

    // ===============================
    // SPONSORS MANAGEMENT
    // ===============================

    startSponsorsCarousel() {
        if (this.sponsorsData.length === 0) return;
        
        this.showCurrentSponsor();
        
        this.sponsorInterval = setInterval(() => {
            this.nextSponsor();
        }, 5000); // 5 segundos por sponsor
    }

    stopSponsorsCarousel() {
        if (this.sponsorInterval) {
            clearInterval(this.sponsorInterval);
            this.sponsorInterval = null;
        }
        
        document.getElementById('sponsorsOverlay').style.display = 'none';
    }

    showCurrentSponsor() {
        if (this.sponsorsData.length === 0) return;
        
        const sponsorOverlay = document.getElementById('sponsorsOverlay');
        const sponsorImage = document.getElementById('sponsorImage');
        
        const currentSponsor = this.sponsorsData[this.currentSponsorIndex];
        sponsorImage.src = currentSponsor.url;
        sponsorImage.alt = currentSponsor.name;
        
        sponsorOverlay.style.display = 'block';
        sponsorOverlay.classList.add('visible');
        
        // Fade out após 4.5 segundos
        setTimeout(() => {
            sponsorOverlay.classList.remove('visible');
            sponsorOverlay.classList.add('hidden');
        }, 4500);
    }

    nextSponsor() {
        this.currentSponsorIndex = (this.currentSponsorIndex + 1) % this.sponsorsData.length;
        
        setTimeout(() => {
            this.showCurrentSponsor();
        }, 500);
    }

    addSponsor(name, imageUrl) {
        this.sponsorsData.push({ name, url: imageUrl });
        console.log('Sponsor adicionado:', name);
    }

    // ===============================
    // EDIT MODE & POSITIONING
    // ===============================

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        const positioningOverlay = document.getElementById('positioningOverlay');
        
        if (this.isEditMode) {
            positioningOverlay.style.display = 'block';
            console.log('Modo de edição ativado');
        } else {
            positioningOverlay.style.display = 'none';
            this.savePositions();
            console.log('Modo de edição desativado');
        }
    }

    startDrag(e, handle) {
        if (!this.isEditMode) return;
        
        this.isDragging = true;
        this.dragElement = handle;
        
        const rect = handle.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        handle.classList.add('dragging');
        e.preventDefault();
    }

    handleDrag(e) {
        if (!this.isDragging || !this.dragElement) return;
        
        const canvas = document.getElementById('overlayCanvas');
        const canvasRect = canvas.getBoundingClientRect();
        
        const x = e.clientX - canvasRect.left - this.dragOffset.x;
        const y = e.clientY - canvasRect.top - this.dragOffset.y;
        
        // Limitar às bordas do canvas
        const maxX = canvasRect.width - this.dragElement.offsetWidth;
        const maxY = canvasRect.height - this.dragElement.offsetHeight;
        
        const clampedX = Math.max(0, Math.min(x, maxX));
        const clampedY = Math.max(0, Math.min(y, maxY));
        
        this.dragElement.style.left = clampedX + 'px';
        this.dragElement.style.top = clampedY + 'px';
        this.dragElement.style.transform = 'none';
        
        // Atualizar posição do elemento correspondente
        this.updateElementPosition(this.dragElement.dataset.element, clampedX, clampedY);
    }

    endDrag() {
        if (this.isDragging && this.dragElement) {
            this.dragElement.classList.remove('dragging');
            this.isDragging = false;
            this.dragElement = null;
        }
    }

    updateElementPosition(elementId, x, y) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.position = 'absolute';
            element.style.left = x + 'px';
            element.style.top = y + 'px';
            element.style.transform = 'none';
        }
    }

    savePositions() {
        const positions = {};
        const handles = document.querySelectorAll('.position-handle');
        
        handles.forEach(handle => {
            const elementId = handle.dataset.element;
            const rect = handle.getBoundingClientRect();
            
            positions[elementId] = {
                x: parseInt(handle.style.left) || 0,
                y: parseInt(handle.style.top) || 0
            };
        });
        
        // Salvar no localStorage
        localStorage.setItem('lm-overlay-positions', JSON.stringify(positions));
        console.log('Posições salvas:', positions);
    }

    loadPositions() {
        const saved = localStorage.getItem('lm-overlay-positions');
        if (saved) {
            const positions = JSON.parse(saved);
            
            Object.keys(positions).forEach(elementId => {
                const pos = positions[elementId];
                this.updateElementPosition(elementId, pos.x, pos.y);
                
                // Atualizar handle também
                const handle = document.querySelector(`[data-element="${elementId}"]`);
                if (handle) {
                    handle.style.left = pos.x + 'px';
                    handle.style.top = pos.y + 'px';
                    handle.style.transform = 'none';
                }
            });
            
            console.log('Posições carregadas:', positions);
        }
    }

    // ===============================
    // DEBUG & UTILITIES
    // ===============================

    toggleDebugMode() {
        const debugInfo = document.getElementById('debugInfo');
        debugInfo.style.display = debugInfo.style.display === 'none' ? 'block' : 'none';
        console.log('Debug mode toggled');
    }

    updateDebugInfo() {
        document.getElementById('debugStatus').textContent = 'Conectado';
        document.getElementById('debugOverlay').textContent = this.data.isVisible ? 'ON' : 'OFF';
        document.getElementById('debugTheme').textContent = this.data.theme;
        document.getElementById('debugData').textContent = JSON.stringify(this.data, null, 2);
    }

    handleResize() {
        // Ajustar scale para testes em janelas menores
        const canvas = document.getElementById('overlayCanvas');
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        if (windowWidth < 1920 || windowHeight < 1080) {
            const scaleX = windowWidth / 1920;
            const scaleY = windowHeight / 1080;
            const scale = Math.min(scaleX, scaleY, 1);
            
            canvas.style.transform = `scale(${scale})`;
            canvas.style.transformOrigin = 'top left';
        } else {
            canvas.style.transform = 'none';
        }
    }

    // ===============================
    // PUBLIC API METHODS
    // ===============================

    // Métodos que podem ser chamados externamente
    showElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('hidden');
            element.classList.add('visible');
        }
    }

    hideElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('visible');
            element.classList.add('hidden');
        }
    }

    updateElement(elementId, data) {
        switch (elementId) {
            case 'score':
                this.data.score = { ...this.data.score, ...data };
                this.updateScore();
                break;
            case 'teams':
                this.data.teams = { ...this.data.teams, ...data };
                this.updateTeams();
                break;
            case 'clock':
                this.data.clock = { ...this.data.clock, ...data };
                this.updateClock();
                break;
        }
    }

    // Método para testes
    simulateData() {
        const testData = {
            score: { home: 2, away: 1 },
            teams: { home: 'FLAMENGO', away: 'VASCO' },
            clock: { time: '38:42', period: '1º TEMPO' },
            isVisible: true
        };
        
        this.data = { ...this.data, ...testData };
        this.updateDisplay();
        console.log('Dados de teste aplicados');
    }

    // Método para preview de animações
    previewAnimation(type) {
        if (type === 'in') {
            this.showOverlay();
        } else if (type === 'out') {
            this.hideOverlay();
        }
    }
}

// ===============================
// INICIALIZAÇÃO E EVENTOS GLOBAIS
// ===============================

let overlayOutput;

document.addEventListener('DOMContentLoaded', () => {
    overlayOutput = new OverlayOutput();
    
    // Carregar posições salvas
    overlayOutput.loadPositions();
    
    // Ajustar tamanho inicial
    overlayOutput.handleResize();
    
    // Atalhos de teclado para debug/teste
    document.addEventListener('keydown', (e) => {
        // Ctrl+Shift+D = Toggle Debug
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
            overlayOutput.toggleDebugMode();
        }
        
        // Ctrl+Shift+E = Toggle Edit Mode
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyE') {
            overlayOutput.toggleEditMode();
        }
        
        // Ctrl+Shift+T = Teste de dados
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyT') {
            overlayOutput.simulateData();
        }
        
        // Ctrl+Shift+I = Preview IN
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyI') {
            overlayOutput.previewAnimation('in');
        }
        
        // Ctrl+Shift+O = Preview OUT
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyO') {
            overlayOutput.previewAnimation('out');
        }
    });
    
    console.log('LiveMestre Overlay Output pronto!');
    console.log('Atalhos disponíveis:');
    console.log('Ctrl+Shift+D = Debug Mode');
    console.log('Ctrl+Shift+E = Edit Mode (posicionamento)');
    console.log('Ctrl+Shift+T = Dados de teste');
    console.log('Ctrl+Shift+I = Preview animação IN');
    console.log('Ctrl+Shift+O = Preview animação OUT');
});

// Expor para o global para debug
window.overlayOutput = overlayOutput;