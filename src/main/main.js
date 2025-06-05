const { app, BrowserWindow, ipcMain, globalShortcut, Menu } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const isDev = process.argv.includes('--dev');

let controlWindow;
let outputWindow;
let httpServer;
const PORT = 8080;

// Dados compartilhados entre as janelas
let overlayData = {
  score: { home: 0, away: 0 },
  teams: { home: 'TIME A', away: 'TIME B' },
  clock: { time: '00:00', period: '1º TEMPO' },
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
    await serveDataJSON(res);
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

// ===============================
// SERVIR DADOS JSON
// ===============================

async function serveDataJSON(res) {
  try {
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
      visible: overlayData.isVisible
    });
  } catch (error) {
    console.error('❌ Erro ao servir dados JSON:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end('{"error": "Erro ao carregar dados"}');
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
// LOGS DE INICIALIZAÇÃO
// ===============================

console.log('');
console.log('🏆 LiveMestre Overlay System');
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
console.log(`   Output: http://localhost:${PORT}/output`);
console.log(`   API: http://localhost:${PORT}/data`);
console.log('=====================================');
console.log('');