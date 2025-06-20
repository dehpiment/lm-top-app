const { app, BrowserWindow, ipcMain, globalShortcut, Menu } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const isDev = process.argv.includes('--dev');

let controlWindow;
let outputWindow;
let httpServer;
const PORT = 8080;

// ===============================
// TIMER CENTRALIZADO
// ===============================
let timerMaster = {
  currentSeconds: 0,
  isRunning: false,
  mode: 'progressive', // 'progressive' ou 'regressive'
  maxTime: 2700, // 45 min default
  interval: null
};

// 🆕 TIMER FORMATTING FUNCTION
function formatTimerDisplay(seconds, milliseconds = 0) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    // 🔧 REGRA DOS MILLISECONDS: Só quando < 1:00 (menos de 60 segundos)
    const showMilliseconds = overlayData.timer.millisecondsMode && 
                            overlayData.timer.isRunning && 
                            seconds < 60; // ← Menos de 60 segundos
    
    let timeString;
    
    if (showMilliseconds) {
        // 🆕 FORMATO ESPECIAL: Só segundos + milliseconds (sem minutos)
        const cs = Math.floor(milliseconds / 10); // Centésimos (0-99)
        timeString = `${secs}.${cs.toString().padStart(2, '0')}`;
        
        console.log(`⏱️ Milliseconds mode: ${seconds}s → ${timeString}`);
    } else {
        // FORMATO NORMAL MM:SS
        if (overlayData.timer.removeLeadingZero && minutes < 10) {
            // Remove leading zero: 5:35 instead of 05:35
            timeString = `${minutes}:${secs.toString().padStart(2, '0')}`;
        } else {
            // Standard format: 05:35
            timeString = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }
    
    return timeString;
}

function startMasterTimer() {
    // Verificar se timer está habilitado
    if (!overlayData.timer.enabled) {
        console.log('⚠️ Tentativa de iniciar timer - Timer desabilitado');
        return false;
    }
    
    if (timerMaster.interval) {
        console.log('⚠️ Timer já está rodando');
        return false;
    }
    
    timerMaster.isRunning = true;
    let lastTime = Date.now();
    let currentIntervalDuration = null;
    
    // 🆕 FUNÇÃO PARA CALCULAR INTERVAL NECESSÁRIO
    const getRequiredInterval = () => {
        const needsPrecision = overlayData.timer.millisecondsMode && timerMaster.currentSeconds < 60;
        return needsPrecision ? 33 : 1000;
    };
    
    // 🆕 FUNÇÃO RECURSIVA QUE AJUSTA O INTERVAL DINAMICAMENTE
    const timerLoop = () => {
        if (!timerMaster.isRunning) return; // Safety check
        
        const currentTime = Date.now();
        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;
        
        // Determinar se usa precision
        const usePrecision = overlayData.timer.millisecondsMode && timerMaster.currentSeconds < 60;
        
        if (usePrecision) {
            // HIGH PRECISION MODE (< 60 segundos com 30fps)
            overlayData.timer.currentMilliseconds += deltaTime;
            
            // Convert ms to seconds when needed
            if (overlayData.timer.currentMilliseconds >= 1000) {
                const secondsToAdd = Math.floor(overlayData.timer.currentMilliseconds / 1000);
                overlayData.timer.currentMilliseconds %= 1000;
                
                if (timerMaster.mode === 'progressive') {
                    timerMaster.currentSeconds += secondsToAdd;
                } else {
                    timerMaster.currentSeconds -= secondsToAdd;
                }
            }
        } else {
            // NORMAL MODE: 1 second increments
            if (timerMaster.mode === 'progressive') {
                timerMaster.currentSeconds++;
            } else {
                timerMaster.currentSeconds--;
            }
            
            // Resetar milliseconds quando não está abaixo de 60s
            overlayData.timer.currentMilliseconds = 0;
        }
        
        // Check limits
        if (timerMaster.mode === 'progressive') {
            if (timerMaster.currentSeconds >= timerMaster.maxTime) {
                timerMaster.currentSeconds = timerMaster.maxTime;
                pauseMasterTimer();
                console.log('⏰ Timer: Tempo esgotado (progressivo)');
                return;
            }
        } else {
            if (timerMaster.currentSeconds <= 0) {
                timerMaster.currentSeconds = 0;
                overlayData.timer.currentMilliseconds = 0;
                pauseMasterTimer();
                console.log('⏰ Timer: Tempo esgotado (regressivo)');
                return;
            }
        }
        
        updateTimerInOverlayData();
        broadcastUpdate();
        
        // 🔧 CALCULAR PRÓXIMO INTERVAL DINAMICAMENTE
        const requiredInterval = getRequiredInterval();
        
        // 🔧 LOG QUANDO MUDA DE PRECISÃO
        if (requiredInterval !== currentIntervalDuration) {
            currentIntervalDuration = requiredInterval;
            const mode = requiredInterval === 33 ? '30FPS' : 'NORMAL';
            console.log(`⏱️ Timer interval mudou para: ${requiredInterval}ms (${mode}) em ${timerMaster.currentSeconds}s`);
        }
        
        // 🆕 AGENDAR PRÓXIMA EXECUÇÃO COM INTERVAL CORRETO
        timerMaster.interval = setTimeout(timerLoop, requiredInterval);
    };
    
    // 🆕 INICIAR PRIMEIRO CICLO
    currentIntervalDuration = getRequiredInterval();
    console.log(`▶️ Timer Master iniciado (${timerMaster.mode}, interval inicial: ${currentIntervalDuration}ms)`);
    
    timerLoop();
    
    return true;
}

function pauseMasterTimer() {
    if (timerMaster.interval) {
        clearTimeout(timerMaster.interval); // ← clearTimeout em vez de clearInterval
        timerMaster.interval = null;
    }
    timerMaster.isRunning = false;
    
    updateTimerInOverlayData();
    broadcastUpdate();
    console.log('⏸️ Timer Master pausado');
}

function resetMasterTimer() {
  pauseMasterTimer();
  
  if (timerMaster.mode === 'progressive') {
    timerMaster.currentSeconds = 0;
  } else {
    timerMaster.currentSeconds = timerMaster.maxTime;
  }
  
  updateTimerInOverlayData();
  broadcastUpdate();
  console.log(`⏹️ Timer Master resetado (${timerMaster.mode})`);
}

function setTimerMode(mode, maxTime = null) {
  const wasRunning = timerMaster.isRunning;
  
  pauseMasterTimer();
  
  timerMaster.mode = mode;
  if (maxTime) timerMaster.maxTime = maxTime;
  
  // Reset para posição inicial
  if (mode === 'progressive') {
    timerMaster.currentSeconds = 0;
  } else {
    timerMaster.currentSeconds = timerMaster.maxTime;
  }
  
  updateTimerInOverlayData();
  broadcastUpdate();
  
  // Retomar se estava rodando
  if (wasRunning) {
    startMasterTimer();
  }
  
  console.log(`⚙️ Timer Mode: ${mode}, Max: ${Math.floor(timerMaster.maxTime/60)}min`);
}

function updateTimerInOverlayData() {
    // 🆕 USE NEW FORMATTING FUNCTION
    const timeString = formatTimerDisplay(
        timerMaster.currentSeconds, 
        overlayData.timer.currentMilliseconds || 0
    );
    
    // Update clock (for compatibility)
    overlayData.clock.time = timeString;
    
    // Preserve enabled state and format settings
    const currentEnabled = overlayData.timer.enabled;
    const currentRemoveZero = overlayData.timer.removeLeadingZero;
    const currentMsMode = overlayData.timer.millisecondsMode;
    
    // Update complete timer structure
    overlayData.timer = {
        time: timeString,
        isRunning: timerMaster.isRunning,
        mode: timerMaster.mode,
        maxTime: timerMaster.maxTime,
        currentSeconds: timerMaster.currentSeconds,
        currentMilliseconds: overlayData.timer.currentMilliseconds || 0,
        enabled: currentEnabled,
        removeLeadingZero: currentRemoveZero,
        millisecondsMode: currentMsMode
    };
    
    console.log(`⏱️ Timer: ${timeString} (zero: ${currentRemoveZero ? 'OFF' : 'ON'}, ms: ${currentMsMode ? 'ON' : 'OFF'})`);
}

// Dados compartilhados entre as janelas
let overlayData = {
    score: { home: 0, away: 0 },
    teams: { home: 'TIME A', away: 'TIME B' },
    clock: { time: '00:00', period: '1º TEMPO' },
    timer: {
        time: '00:00',
        isRunning: false,
        mode: 'progressive',
        maxTime: 2700,
        currentSeconds: 0,
        enabled: true,
        // 🆕 NEW PROPERTIES v1.2.1
        removeLeadingZero: false,    // 05:35 → 5:35
        millisecondsMode: false,     // Show .ms in last minute
        currentMilliseconds: 0       // For ms precision
    },
    isVisible: false,
    theme: 'light'
};

// ===============================
// SERVIDOR HTTP COMPLETO
// ===============================

function createHTTPServer() {
  httpServer = http.createServer(async (req, res) => {
    // Configurar CORS para OBS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    console.log(`📡 Requisição: ${req.method} ${req.url}`);
    
    try {
      await handleRequest(req, res);
    } catch (error) {
      console.error('❌ Erro no servidor:', error);
      res.writeHead(500);
      res.end('Erro interno do servidor');
    }
  });
  
  httpServer.listen(PORT, () => {
    console.log(`🌐 Servidor HTTP rodando em http://localhost:${PORT}`);
    console.log(`📺 URL para OBS: http://localhost:${PORT}/output`);
    console.log(`🎛️ URL controle: http://localhost:${PORT}/control`);
    console.log(`📄 Dados JSON: http://localhost:${PORT}/data`);
  });
  
  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`❌ Porta ${PORT} em uso. Tentando ${PORT + 1}...`);
      httpServer.close();
      setTimeout(() => {
        httpServer.listen(PORT + 1);
      }, 1000);
    } else {
      console.error('❌ Erro no servidor HTTP:', err);
    }
  });
}

// ===============================
// ROTAS E MANIPULAÇÃO DE REQUISIÇÕES
// ===============================

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  
  console.log(`🔍 Processando: ${pathname}`);
  
  // Rotas principais
  if (pathname === '/' || pathname === '/control') {
    await serveControlPage(res);
  } else if (pathname === '/output') {
    await serveOutputPage(res);
  } else if (pathname === '/data') {
    if (req.method === 'GET') {
      await serveDataJSON(res);
    } else if (req.method === 'POST') {
      await updateDataFromDock(req, res);
    }
  } else if (pathname === '/dock') {
    await serveDockPage(res);
  } 
  // Arquivos CSS/JS específicos
  else if (pathname === '/control.css') {
    await serveFile('control/control.css', res, 'text/css');
  } else if (pathname === '/control.js') {
    await serveFile('control/control.js', res, 'application/javascript');
  } else if (pathname === '/output.css') {
    await serveFile('output/output.css', res, 'text/css');
  } else if (pathname === '/output.js') {
    await serveFile('output/output.js', res, 'application/javascript');
  }
  // Assets gerais
  else if (pathname.startsWith('/assets/')) {
    await serveAsset(pathname, res);
  } 
  // Fallback para outros arquivos
  else if (pathname.endsWith('.css') || pathname.endsWith('.js')) {
    const relativePath = pathname.substring(1); // Remove '/' inicial
    const contentType = pathname.endsWith('.css') ? 'text/css' : 'application/javascript';
    await serveFile(relativePath, res, contentType);
  } 
  else {
    // 404 Not Found
    console.log(`❌ Página não encontrada: ${pathname}`);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`Página não encontrada: ${pathname}`);
  }
}

// ===============================
// SERVIR PÁGINAS PRINCIPAIS
// ===============================

async function serveControlPage(res) {
  try {
    const controlPath = path.join(__dirname, '../control/control.html');
    console.log(`📄 Servindo control.html de: ${controlPath}`);
    
    if (!fs.existsSync(controlPath)) {
      throw new Error(`Arquivo não encontrado: ${controlPath}`);
    }
    
    const content = fs.readFileSync(controlPath, 'utf8');
    
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
    console.log('✅ Control page servida com sucesso');
  } catch (error) {
    console.error('❌ Erro ao servir control.html:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Erro ao carregar interface de controle: ' + error.message);
  }
}

async function serveOutputPage(res) {
  try {
    const outputPath = path.join(__dirname, '../output/output-standalone.html');
    console.log(`📄 Servindo output.html de: ${outputPath}`);
    
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Arquivo não encontrado: ${outputPath}`);
    }
    
    let content = fs.readFileSync(outputPath, 'utf8');
    
    // Garantir que está usando a URL correta para dados
    content = content.replace('../assets/overlay-data.json', '/data');
    
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
    console.log('✅ Output page servida com sucesso');
  } catch (error) {
    console.error('❌ Erro ao servir output.html:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Erro ao carregar página de output: ' + error.message);
  }
}

async function serveDockPage(res) {
  try {
    const dockPath = path.join(__dirname, '../control/dock.html');
    console.log(`📱 Servindo dock.html de: ${dockPath}`);
    
    if (!fs.existsSync(dockPath)) {
      throw new Error(`Arquivo não encontrado: ${dockPath}`);
    }
    
    const content = fs.readFileSync(dockPath, 'utf8');
    
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
    console.log('✅ Dock page servida com sucesso');
  } catch (error) {
    console.error('❌ Erro ao servir dock.html:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Erro ao carregar dock: ' + error.message);
  }
}

// ===============================
// SERVIR DADOS JSON
// ===============================

async function serveDataJSON(res) {
  try {
    // Garantir que timer está atualizado
    updateTimerInOverlayData();
    
    const dataWithTimestamp = {
      ...overlayData,
      lastUpdate: Date.now(),
      serverTime: new Date().toISOString()
    };
    
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(JSON.stringify(dataWithTimestamp, null, 2));
    
    console.log('📊 Dados enviados:', {
      score: `${overlayData.score.home}x${overlayData.score.away}`,
      teams: `${overlayData.teams.home} vs ${overlayData.teams.away}`,
      clock: overlayData.clock.time,
      timer: `${overlayData.timer.time} (${overlayData.timer.isRunning ? 'Rodando' : 'Parado'})`,
      visible: overlayData.isVisible
    });
  } catch (error) {
    console.error('❌ Erro ao servir dados JSON:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end('{"error": "Erro ao carregar dados"}');
  }
}

async function updateDataFromDock(req, res) {
    try {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            console.log('🔍 RAW DATA RECEIVED:', body); // ← DEBUG LOG
            
            const newData = JSON.parse(body);
            console.log('🔍 PARSED DATA:', newData); // ← DEBUG LOG
            
            // Verificar se há comandos de timer
            if (newData.timerCommands) {
                const cmd = newData.timerCommands;
                console.log('🔍 TIMER COMMANDS FOUND:', cmd); // ← DEBUG LOG
                
                // 🆕 PROCESSAR MUDANÇA DO ENABLED PRIMEIRO
                if (cmd.enabled !== undefined) {
                    const oldEnabled = overlayData.timer.enabled;
                    overlayData.timer.enabled = cmd.enabled;
                    
                    console.log(`⏱️ Timer enabled: ${oldEnabled} → ${cmd.enabled}`);
                    
                    // 🔧 SE DESABILITOU O TIMER
                    if (!cmd.enabled && oldEnabled) {
                        pauseMasterTimer();
                        
                        // Reset timer para posição inicial baseado no modo
                        if (timerMaster.mode === 'progressive') {
                            timerMaster.currentSeconds = 0;
                        } else {
                            timerMaster.currentSeconds = timerMaster.maxTime;
                        }
                        
                        // 🆕 RESETAR MILLISECONDS TAMBÉM
                        overlayData.timer.currentMilliseconds = 0;
                        
                        updateTimerInOverlayData();
                        console.log('⏹️ Timer pausado e resetado - Timer desabilitado');
                    }
                    
                    // 🔧 SE HABILITOU O TIMER
                    if (cmd.enabled && !oldEnabled) {
                        console.log('✅ Timer habilitado - Pronto para uso');
                    }
                }
                
                // 🆕 PROCESSAR COMANDOS DE FORMATAÇÃO (sempre processa, mesmo com timer desabilitado)
                if (cmd.action === 'setFormat') {
                    overlayData.timer.removeLeadingZero = cmd.removeLeadingZero || false;
                    overlayData.timer.millisecondsMode = cmd.millisecondsMode || false;
                    
                    // Resetar milliseconds se desabilitado
                    if (!cmd.millisecondsMode) {
                        overlayData.timer.currentMilliseconds = 0;
                    }
                    
                    // Reiniciar timer com nova precisão se estiver rodando
                    if (timerMaster.isRunning) {
                        pauseMasterTimer();
                        startMasterTimer();
                    }
                    
                    updateTimerInOverlayData();
                    console.log('⚙️ Formato do timer atualizado:', cmd);
                }
                
                // 🆕 PROCESSAR COMANDO DE PRECISÃO
                if (cmd.action === 'setPrecision') {
                    const wasRunning = timerMaster.isRunning;
                    
                    if (wasRunning) {
                        pauseMasterTimer();
                    }
                    
                    overlayData.timer.millisecondsMode = cmd.millisecondsMode || false;
                    
                    if (!cmd.millisecondsMode) {
                        overlayData.timer.currentMilliseconds = 0;
                    }
                    
                    if (wasRunning) {
                        startMasterTimer();
                    }
                    
                    updateTimerInOverlayData();
                    console.log('🎯 Precisão do timer atualizada:', cmd.millisecondsMode ? 'ALTA' : 'NORMAL');
                }
                
                // 🆕 PROCESSAR OUTROS COMANDOS APENAS SE TIMER HABILITADO
                if (overlayData.timer.enabled) {
                    if (cmd.action === 'start') {
                        startMasterTimer();
                    } else if (cmd.action === 'pause') {
                        pauseMasterTimer();
                    } else if (cmd.action === 'reset') {
                        resetMasterTimer();
                    } else if (cmd.action === 'setMode') {
                        setTimerMode(cmd.mode, cmd.maxTime);
                    } else if (cmd.action === 'setTime') {
                        // Atualizar tempo manualmente
                        timerMaster.currentSeconds = cmd.seconds || 0;
                        // 🆕 RESETAR MILLISECONDS AO DEFINIR TEMPO MANUAL
                        overlayData.timer.currentMilliseconds = 0;
                        updateTimerInOverlayData();
                    }
                } else {
                    // 🚨 TIMER DESABILITADO - IGNORAR COMANDOS DE CONTROLE
                    if (cmd.action && !['setMode', 'setFormat', 'setPrecision'].includes(cmd.action)) {
                        console.log(`⚠️ Timer command "${cmd.action}" ignorado - Timer desabilitado`);
                    }
                }
            } else {
                console.log('🔍 NO TIMER COMMANDS IN DATA'); // ← DEBUG LOG
            }
            
            // Atualizar outros dados (exceto timer que é centralizado)
            const { timer, timerCommands, ...otherData } = newData;
            overlayData = { ...overlayData, ...otherData };
            
            // 🔧 FORÇAR BROADCAST SEMPRE APÓS MUDANÇAS
            broadcastUpdate();
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: true, 
                timerEnabled: overlayData.timer.enabled,
                currentTimer: overlayData.timer,
                // 🆕 INCLUIR INFO DE FORMATAÇÃO NA RESPOSTA
                timerFormat: {
                    removeLeadingZero: overlayData.timer.removeLeadingZero,
                    millisecondsMode: overlayData.timer.millisecondsMode
                }
            }));
            
            console.log('📡 Dados atualizados pela dock:', {
                timerCommand: newData.timerCommands?.action || 'none',
                timerEnabled: overlayData.timer.enabled,
                timerRunning: overlayData.timer.isRunning,
                // 🆕 LOG DE FORMATAÇÃO
                timerFormat: `zero: ${overlayData.timer.removeLeadingZero ? 'OFF' : 'ON'}, ms: ${overlayData.timer.millisecondsMode ? 'ON' : 'OFF'}`,
                otherUpdates: Object.keys(otherData)
            });
        });
    } catch (error) {
        console.error('❌ Erro ao atualizar dados:', error);
        res.writeHead(500);
        res.end('{"error": "Failed to update data"}');
    }
}

// ===============================
// SERVIR ARQUIVOS ESTÁTICOS
// ===============================

async function serveFile(relativePath, res, contentType) {
  try {
    const filePath = path.join(__dirname, '..', relativePath);
    console.log(`📁 Tentando servir: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Arquivo não encontrado: ${filePath}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`Arquivo não encontrado: ${relativePath}`);
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    res.writeHead(200, { 
      'Content-Type': contentType + '; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(content);
    console.log(`✅ Arquivo servido: ${relativePath}`);
    
  } catch (error) {
    console.error('❌ Erro ao servir arquivo:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`Erro ao carregar arquivo: ${relativePath}`);
  }
}

async function serveAsset(pathname, res) {
  try {
    const assetPath = path.join(__dirname, '..', pathname);
    console.log(`🎨 Tentando servir asset: ${assetPath}`);
    
    if (!fs.existsSync(assetPath)) {
      console.log(`❌ Asset não encontrado: ${assetPath}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`Asset não encontrado: ${pathname}`);
      return;
    }
    
    const ext = path.extname(assetPath).toLowerCase();
    const contentTypes = {
      '.json': 'application/json',
      '.webm': 'video/webm',
      '.mp4': 'video/mp4',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };
    
    const contentType = contentTypes[ext] || 'application/octet-stream';
    const content = fs.readFileSync(assetPath);
    
    res.writeHead(200, { 
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600' // Cache assets por 1 hora
    });
    res.end(content);
    console.log(`✅ Asset servido: ${pathname}`);
    
  } catch (error) {
    console.error('❌ Erro ao servir asset:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`Erro ao carregar asset: ${pathname}`);
  }
}

// ===============================
// JANELAS ELECTRON
// ===============================

function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // Permitir carregamento de recursos locais
    },
    title: 'LiveMestre Overlay - Controle',
    icon: path.join(__dirname, '../assets/icon.png'),
    show: false // Não mostrar até carregar completamente
  });

  // Carregar da URL do servidor HTTP
  controlWindow.loadURL(`http://localhost:${PORT}/control`);
  
  // Mostrar quando estiver pronto
  controlWindow.once('ready-to-show', () => {
    controlWindow.show();
    console.log('✅ Janela de controle carregada');
  });
  
  if (isDev) {
    controlWindow.webContents.openDevTools();
  }

  controlWindow.on('closed', () => {
    controlWindow = null;
  });
}

function createOutputWindow() {
  outputWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    },
    title: `LiveMestre Overlay - Output (URL: http://localhost:${PORT}/output)`,
    alwaysOnTop: false,
    frame: true,
    show: false
  });

  // Carregar da URL do servidor HTTP
  outputWindow.loadURL(`http://localhost:${PORT}/output`);
  
  // Mostrar quando estiver pronto
  outputWindow.once('ready-to-show', () => {
    outputWindow.show();
    console.log('✅ Janela de output carregada');
  });
  
  outputWindow.on('closed', () => {
    outputWindow = null;
  });
}

// ===============================
// INICIALIZAÇÃO DA APLICAÇÃO
// ===============================

app.whenReady().then(() => {
  console.log('🚀 Iniciando LiveMestre Overlay...');
  
  // Inicializar timer master
  updateTimerInOverlayData();
  
  // Criar servidor HTTP primeiro
  createHTTPServer();
  
  // Aguardar servidor inicializar antes de criar janelas
  setTimeout(() => {
    createControlWindow();
    createOutputWindow();
  }, 1500);

  // Registrar hotkeys globais
  registerGlobalShortcuts();

  // Esconder menu padrão
  Menu.setApplicationMenu(null);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createControlWindow();
      createOutputWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Parar timer master
  pauseMasterTimer();
  
  // Fechar servidor HTTP
  if (httpServer) {
    httpServer.close(() => {
      console.log('🔴 Servidor HTTP fechado');
    });
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Limpar hotkeys
  globalShortcut.unregisterAll();
  
  // Parar timer master
  pauseMasterTimer();
  
  // Fechar servidor HTTP
  if (httpServer) {
    httpServer.close();
  }
});

// ===============================
// HOTKEYS GLOBAIS
// ===============================

function registerGlobalShortcuts() {
  try {
    globalShortcut.register('F1', () => {
      overlayData.score.home++;
      broadcastUpdate();
      console.log(`🏠 Score casa: ${overlayData.score.home}`);
    });
    
    globalShortcut.register('F2', () => {
      overlayData.score.away++;
      broadcastUpdate();
      console.log(`🚌 Score visitante: ${overlayData.score.away}`);
    });
    
    globalShortcut.register('F3', () => {
      if (overlayData.score.home > 0) {
        overlayData.score.home--;
        broadcastUpdate();
        console.log(`🏠 Score casa: ${overlayData.score.home}`);
      }
    });
    
    globalShortcut.register('F4', () => {
      if (overlayData.score.away > 0) {
        overlayData.score.away--;
        broadcastUpdate();
        console.log(`🚌 Score visitante: ${overlayData.score.away}`);
      }
    });

    globalShortcut.register('F5', () => {
      overlayData.isVisible = !overlayData.isVisible;
      broadcastUpdate();
      console.log(`👁️ Overlay: ${overlayData.isVisible ? 'Visível' : 'Oculto'}`);
    });
    
    console.log('⌨️ Hotkeys registradas com sucesso');
  } catch (error) {
    console.error('❌ Erro ao registrar hotkeys:', error);
  }
}

function broadcastUpdate() {
  // Garantir que timer está atualizado
  updateTimerInOverlayData();
  
  // Enviar para janelas Electron via IPC
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.webContents.send('data-update', overlayData);
  }
  if (outputWindow && !outputWindow.isDestroyed()) {
    outputWindow.webContents.send('data-update', overlayData);
  }
  
  // Dados ficam disponíveis automaticamente via HTTP /data
}

// ===============================
// IPC HANDLERS (COMUNICAÇÃO COM INTERFACE)
// ===============================

ipcMain.on('update-score', (event, data) => {
  overlayData.score = data;
  broadcastUpdate();
});

ipcMain.on('update-teams', (event, data) => {
  overlayData.teams = data;
  broadcastUpdate();
});

ipcMain.on('update-clock', (event, data) => {
  overlayData.clock = data;
  broadcastUpdate();
});

ipcMain.on('toggle-overlay', (event) => {
  overlayData.isVisible = !overlayData.isVisible;
  broadcastUpdate();
});

ipcMain.on('update-theme', (event, theme) => {
  overlayData.theme = theme;
  broadcastUpdate();
});

ipcMain.on('get-initial-data', (event) => {
  event.reply('data-update', overlayData);
});

// ===============================
// IPC HANDLERS PARA TIMER MASTER
// ===============================

ipcMain.on('timer-start', () => {
  startMasterTimer();
});

ipcMain.on('timer-pause', () => {
  pauseMasterTimer();
});

ipcMain.on('timer-reset', () => {
  resetMasterTimer();
});

ipcMain.on('timer-set-mode', (event, mode, maxTime) => {
  setTimerMode(mode, maxTime);
});

ipcMain.on('timer-set-time', (event, seconds) => {
  timerMaster.currentSeconds = seconds;
  updateTimerInOverlayData();
  broadcastUpdate();
});

// ===============================
// LOGS DE INICIALIZAÇÃO
// ===============================

console.log('');
console.log('🏆 LiveMestre Overlay System v1.0.1');
console.log('=====================================');
console.log('📋 Hotkeys disponíveis:');
console.log('   F1 - +1 Time Casa');
console.log('   F2 - +1 Time Visitante');  
console.log('   F3 - -1 Time Casa');
console.log('   F4 - -1 Time Visitante');
console.log('   F5 - Mostrar/Esconder Overlay');
console.log('');
console.log('🌐 URLs importantes:');
console.log(`   Interface: http://localhost:${PORT}/control`);
console.log(`   Dock: http://localhost:${PORT}/dock`);
console.log(`   Output: http://localhost:${PORT}/output`);
console.log(`   API: http://localhost:${PORT}/data`);
console.log('');
console.log('⏰ Timer Master: Centralizado e Sincronizado');
console.log('');
console.log('🆕 ============================================');
console.log('🆕 LiveMestre Overlay v1.2 - Timer ON/OFF');
console.log('🆕 ============================================');
console.log('🆕 Features:');
console.log('   • Timer pode ser habilitado/desabilitado via dock');
console.log('   • Commands processados apenas se timer.enabled = true');
console.log('   • Estado persistente via localStorage');
console.log('   • Sincronização completa dock ↔ main ↔ output');
console.log('🆕 ============================================');
console.log('');