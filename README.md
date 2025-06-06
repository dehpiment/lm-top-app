# 🏆 LiveMestre Overlay

**Sistema profissional de overlays esportivos para transmissões ao vivo**

[![Version](https://img.shields.io/badge/version-1.0.2-red.svg)](https://github.com/dehpiment/lm-top-app)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/electron-25.0.0-blue.svg)](https://electronjs.org/)
[![Status](https://img.shields.io/badge/status-stable-green.svg)](https://github.com/dehpiment/lm-top-app)

Sistema multiesportivo "coringa" que funciona com **qualquer modalidade esportiva**. Interface dock compacta ideal para OBS Studio com sincronização em tempo real entre todas as telas.

## 🚀 Características

### ⚡ **Sistema Coringa**
- **Funciona com qualquer esporte:** Futsal, Basquete, Vôlei, Futebol, etc.
- **Configurável:** Timer progressivo/regressivo, períodos customizáveis
- **Modular:** Usuário monta o placar que precisar

### 🎛️ **Interface Profissional**
- **Dock compacta:** 450x280px ideal para OBS dock
- **Output transparente:** 1920x1080 para Browser Source
- **Interface completa:** Controle avançado com todas as opções
- **Sincronização perfeita:** Todas as interfaces sempre sincronizadas

### ⏰ **Timer Centralizado v1.0.1**
- **Progressivo:** 00:00 → 45:00 (Futsal/Futebol)
- **Regressivo:** 20:00 → 00:00 (Basquete)
- **Configurável:** Duração e modo personalizáveis
- **Hotkeys globais:** F1-F5 para operação rápida
- **Sincronização total:** Entre dock, control e output

### 🔄 **Swap Completo v1.0.2**
- **Troca tudo:** Placar, nomes e cores dos times
- **Visual imediato:** Cores trocam na interface
- **Preparado:** Para futuras implementações (sets, faltas, timeouts)

### 🎨 **Visual LiveMestre**
- **Cores customizáveis:** Para cada time
- **Tema claro/escuro:** Adapta ao ambiente
- **Animações suaves:** Transições profissionais
- **Design responsivo:** Funciona em qualquer resolução

## 📸 Screenshots

### Interface Dock Compacta
*Perfeita para usar como dock no OBS Studio*

### Output Transparente para OBS
*1920x1080 com transparência total para Browser Source*

### Interface de Controle Completa
*Controle avançado com todas as configurações*

## 🎮 Como Usar

### **1. Instalação**
```bash
# Clonar repositório
git clone https://github.com/dehpiment/lm-top-app.git

# Instalar dependências
cd lm-top-app
npm install

# Executar em desenvolvimento
npm run dev
```

### **2. Configuração no OBS**
1. **Adicionar Browser Source**
2. **URL:** `http://localhost:8080/output`
3. **Resolução:** 1920x1080
4. **Marcar:** "Shutdown source when not visible"

### **3. Interface Dock (Recomendado)**
1. **Adicionar Custom Browser Dock no OBS**
2. **URL:** `http://localhost:8080/dock`
3. **Dimensões:** 450x280px

## ⌨️ Hotkeys Globais

| Tecla | Ação |
|-------|------|
| **F1** | +1 Time Casa |
| **F2** | +1 Time Visitante |
| **F3** | -1 Time Casa |
| **F4** | -1 Time Visitante |
| **F5** | Mostrar/Esconder Overlay |
| **Space** | Play/Pause Timer |
| **F8** | Trocar Times (completo) |

## 🏗️ Arquitetura

```
┌─────────────┐    ┌──────────────┐
│   CONTROL   │    │    DOCK      │
│ (interface  │    │  (compacta   │
│  completa)  │    │   p/ OBS)    │
└──────┬──────┘    └──────┬───────┘
       │                  │
       ▼                  ▼
┌─────────────────────────────────┐
│          MAIN.JS                │
│    Timer Master + HTTP Server   │
│         Electron + IPC          │
└─────────────┬───────────────────┘
              │
              ▼
         ┌─────────┐
         │ OUTPUT  │
         │ (OBS)   │
         └─────────┘
```

### **Componentes Principais:**
- **main.js:** Timer Master + Servidor HTTP + IPC
- **dock.html:** Interface compacta para OBS dock
- **output-standalone.html:** Output transparente para OBS
- **control.html:** Interface completa de controle

## 🌐 URLs de Acesso

| Interface | URL | Descrição |
|-----------|-----|-----------|
| **Dock** | `http://localhost:8080/dock` | Interface compacta (450x280) |
| **Output** | `http://localhost:8080/output` | Overlay para OBS (1920x1080) |
| **Control** | `http://localhost:8080/control` | Interface completa |
| **API** | `http://localhost:8080/data` | Dados JSON em tempo real |

## 🏀 Modalidades Suportadas

### **⚽ Futsal/Futebol**
- ✅ Placar + Timer progressivo
- ✅ Períodos: 1º/2º tempo, prorrogação, pênaltis
- ✅ Cronômetro 00:00 → 45:00
- ✅ Swap completo (placar + cores)

### **🏀 Basquete** *(Em desenvolvimento)*
- 🔄 Placar + Timer regressivo
- 🔄 Períodos: 1º/2º/3º/4º quarto
- 🔄 Cronômetro 20:00 → 00:00
- 🔄 Timeouts por time

### **🏐 Vôlei** *(Em desenvolvimento)*
- 🔄 Placar + Sets
- 🔄 Indicador de saque
- 🔄 Histórico de sets

### **🤾 Handebol** *(Em desenvolvimento)*
- 🔄 Placar + Timer progressivo
- 🔄 Exclusões temporárias
- 🔄 Timeouts por time

## 🛠️ Desenvolvimento

### **Scripts Disponíveis:**
```bash
npm run dev          # Desenvolvimento com DevTools
npm start            # Produção
npm run build        # Build completo (Mac + Windows)
npm run build:mac    # Build apenas macOS
npm run build:win    # Build apenas Windows
```

### **Estrutura do Projeto:**
```
lm-top-app/
├── src/
│   ├── main/
│   │   └── main.js              # Timer Master + HTTP Server
│   ├── control/
│   │   ├── control.html         # Interface completa
│   │   ├── dock.html           # ⭐ Interface compacta
│   │   └── control.css         # Estilos
│   ├── output/
│   │   └── output-standalone.html # ⭐ Output para OBS
│   └── shared/
│       └── utils.js             # Funções compartilhadas
├── assets/
│   └── icon.png                 # Ícone da aplicação
└── package.json
```

## 🎯 Roadmap Técnico

### **📦 VISÃO FUTURA: SISTEMA DE PRESETS MODULARES**

O LiveMestre está evoluindo para um **sistema completo de broadcast profissional** com:

#### **🎬 Pacotes de Scoreboards:**
```
PRESET "LM FUTSAL PREMIUM"
├── 🎬 background.webm (animação personalizada)
├── 📐 layout.json (posições de todos elementos)
├── 🎨 theme.json (cores, fontes, estilos)
├── ⚙️ config.json (módulos ativos, regras)
└── 📄 metadata.json (nome, autor, modalidade)
```

#### **📐 Editor Visual:**
- Drag & drop de elementos (score, timer, nomes)
- Customização de posições para cada WebM
- Sistema de layers e sobreposições

#### **🛒 Marketplace de Layouts:**
- Import/Export de presets
- Sharing entre criadores
- Templates profissionais premium

### **v1.2 - Módulos Esportivos** *(Próximo)*
- [ ] 🏐 **Vôlei:** Sets + Indicador de saque
- [ ] ⚽ **Futsal:** Contador de faltas + Cartões
- [ ] 🤾 **Handebol:** Timeouts + Exclusões temporárias
- [ ] 🏀 **Basquete:** Timeouts + Botões +2/+3 pontos

### **v1.5 - CRUD & Programming**
- [ ] 👥 **Gerenciamento de times:** Logos, cores, histórico
- [ ] 📅 **Programming de jogos:** "Dar play no jogo X"
- [ ] 🗄️ **Banco de dados local:** SQLite para persistência
- [ ] 📊 **Estatísticas:** Histórico de partidas

### **v2.0 - Editor Visual & Backgrounds**
- [ ] 📐 **Drag & drop editor:** Posicionar elementos livremente
- [ ] 🎬 **Sistema de backgrounds:** WebM IN/STILL/OUT
- [ ] 🎨 **Customização avançada:** Fontes, cores, tamanhos
- [ ] 👁️ **Preview em tempo real:** Ver mudanças instantaneamente

### **v2.5 - Preset System & Marketplace**
- [ ] 📦 **Import/Export de presets:** Compartilhar layouts
- [ ] 🛒 **Marketplace integrado:** Download de templates
- [ ] 🔄 **Sistema de versionamento:** Updates automáticos
- [ ] 💰 **Monetização:** Presets premium para venda

### **v3.0 - Recursos Avançados**
- [ ] 🌐 **Multi-language:** Suporte a idiomas
- [ ] 📱 **Mobile control:** App para controle remoto
- [ ] 🎥 **Multi-camera:** Integração com switching
- [ ] ☁️ **Cloud sync:** Backup automático na nuvem

## 🎯 Roadmap Imediato

### **v1.0.2** - Próxima Release
- [x] ✅ **Fix:** Swap de cores funcionando
- [x] ✅ **Docs:** Roadmap técnico documentado
- [ ] 🔄 **Refactor:** Preparação para módulos esportivos

### **v1.1** - Módulo Vôlei
- [ ] 📊 Sets counter (home/away)
- [ ] 🏐 Serving indicator
- [ ] 📈 Set history tracking
- [ ] 🔄 Swap completo incluindo sets

## 🤝 Contribuindo

1. **Fork** o projeto
2. **Crie** uma branch: `git checkout -b minha-feature`
3. **Commit** suas mudanças: `git commit -m 'Add: Nova feature'`
4. **Push** para a branch: `git push origin minha-feature`
5. **Abra** um Pull Request

## 📝 Changelog

### **v1.0.2** - Swap Colors Fix
- 🔧 **Fix:** updateDisplay() agora aplica cores no swap
- 🎨 **New:** Swap de times inclui troca visual de cores
- 📝 **Docs:** Roadmap técnico completo adicionado
- 🏗️ **Prep:** Estrutura preparada para módulos esportivos

### **v1.0.1** - Timer Sync Fix
- 🔧 **Fix:** Timer sincronizado entre dock e output
- ⚡ **New:** Timer Master centralizado no main.js
- 🎛️ **New:** Interface dock compacta (450x280px)
- ✅ **Fix:** Sincronização bidirecional entre todas as interfaces
- ⌨️ **Maintained:** Hotkeys F1-F5 funcionando

### **v1.0.0** - Release Inicial
- 🎉 **New:** Sistema base do LiveMestre Overlay
- 🏆 **New:** Conceito "coringa" multiesportivo
- ⚡ **New:** Interface de controle completa
- 🎛️ **New:** Output transparente para OBS
- ⌨️ **New:** Hotkeys globais F1-F5

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

**dehpiment** - [GitHub](https://github.com/dehpiment)

---

## 🎯 Links Úteis

- 📺 **OBS Studio:** [obsproject.com](https://obsproject.com/)
- ⚡ **Electron:** [electronjs.org](https://electronjs.org/)
- 📦 **Node.js:** [nodejs.org](https://nodejs.org/)

---

**🏆 LiveMestre Overlay - Sistema Profissional de Overlays Esportivos**

*Feito com ❤️ para streamers e produtores de conteúdo esportivo*

**🚀 Evoluindo para o futuro do broadcast esportivo**
