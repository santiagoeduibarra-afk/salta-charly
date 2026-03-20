const portraitWidth = 480;
const portraitHeight = 800;
const BACKEND_URL = 'https://salta-charly-backend.onrender.com';
let gameState = { score: 0, meters: 0, lives: 3, baseSpeed: 450, multiplier: 1, currentRoom: null };
let bgMusic;
const socket = io(BACKEND_URL, { transports: ['websocket', 'polling'] });

socket.on('connect', () => {
    console.log('✅ Socket conectado exitosamente al Backend:', socket.id);
});
socket.on('connect_error', (error) => {
    console.error('❌ Error de conexión del Socket:', error.message);
});
let otherPlayers = {};

const charlyWords = [
    'seminare', 'invierno', 'dinosaurio', 'nosiguas', 'promesas', 
    'cerca', 'rezo', 'yendo', 'cama', 'living', 'clic', 'moderno', 
    'demoliendo', 'hoteles', 'fanky', 'hablando', 'corazon', 
    'pecado', 'mortal', 'loco', 'fantasma', 'ruido', 'magia', 
    'chipi', 'raras', 'peperina', 'grasa', 'capital', 'llorando', 'espejos'
];

function generateCharlyCode() {
    const word1 = Phaser.Utils.Array.GetRandom(charlyWords);
    let word2 = Phaser.Utils.Array.GetRandom(charlyWords);
    while (word1 === word2) { word2 = Phaser.Utils.Array.GetRandom(charlyWords); }
    return word1 + word2;
}

function createPinkButton(scene, x, y, width, height, textStr, callback, bgColor = 0xff69b4, textColor = '#FFFF00') {
    const btnContainer = scene.add.container(x, y);
    const bg = scene.add.rectangle(0, 0, width, height, bgColor);
    const txt = scene.add.text(0, 0, textStr, { 
        fontSize: '14px', fontFamily: '"Press Start 2P"', color: textColor, align: 'center' 
    }).setOrigin(0.5);
    btnContainer.add([bg, txt]);
    btnContainer.setSize(width, height);
    btnContainer.setInteractive({ useHandCursor: true });
    btnContainer.on('pointerdown', () => {
        btnContainer.setScale(0.95);
        if (callback) callback();
    });
    btnContainer.on('pointerup', () => btnContainer.setScale(1));
    btnContainer.on('pointerout', () => btnContainer.setScale(1));
    return btnContainer;
}

class BootScene extends Phaser.Scene {
    constructor() { super('BootScene'); }
    
    preload() {
        // FIX: Cambio de son.wav a song.mp3
        this.load.audio('bgm', 'sounds/song.mp3');
        this.load.audio('splash', 'sounds/splash.mp3');
        // this.load.audio('fail_sound', 'sounds/fail.mp3');
        this.load.audio('ufo_sound', 'sounds/ufo.mp3'); 
        this.load.audio('ufo_away', 'sounds/ufoaway.mp3'); 
        this.load.audio('moo_sound', 'sounds/mooo.mp3'); 
        
        for (let i = 1; i <= 27; i++) {
            this.load.audio(`audio${i}`, `sounds/audio${i}.mp3`);
        }
        
        this.load.image('charly', 'assets/charly.png');
        this.load.image('pool', 'assets/POOL.png');
        this.load.image('peace', 'assets/PEACE.PNG'); 
        
        this.load.image('ufo1', 'assets/ufo1.png');
        this.load.image('ufo2', 'assets/ufo2.png');
        
        this.load.image('vaca1', 'assets/VACA1.png');
        this.load.image('vaca2', 'assets/VACA2.png');

        this.load.image('banana1', 'assets/BANANA1.png');
        this.load.image('banana2', 'assets/BANANA2.png');
        this.load.image('banana3', 'assets/BANANA3.png');

        this.load.image('wall2', 'assets/wall2.png');
        
        // REQ 3: OHM ASSETS
        this.load.image('ohm1', 'assets/ohm1.png');
        this.load.image('ohm2', 'assets/ohm2.png');
        this.load.audio('ohmSound', 'sounds/ohm.mp3');
    }

    create() {
        const g = this.add.graphics();
        
        g.fillStyle(0xFFFFFF, 1);
        g.fillCircle(30, 50, 30);
        g.fillCircle(70, 45, 40);
        g.fillCircle(110, 50, 30);
        g.fillCircle(70, 65, 30);
        g.generateTexture('fluffy_cloud', 140, 100);
        g.clear();

        g.fillStyle(0xFFFF00, 1); 
        const pts = [10, 0, 12, 7, 20, 7, 14, 11, 16, 20, 10, 15, 4, 20, 6, 11, 0, 7, 8, 7];
        g.fillPoints(pts.map((p, i) => i % 2 === 0 ? p * 2 : p * 2)); 
        g.generateTexture('estrella_fugaz', 40, 40);
        g.clear();

        const drawArt = (key, width, height, scale, palette, artArray) => {
            g.clear();
            for (let y = 0; y < artArray.length; y++) {
                for (let x = 0; x < artArray[y].length; x++) {
                    const char = artArray[y][x];
                    if (char !== ' ') {
                        g.fillStyle(palette[char]);
                        g.fillRect(x * scale, y * scale, scale, scale);
                    }
                }
            }
            g.generateTexture(key, width * scale, height * scale);
        };
        drawArt('heart', 5, 5, 5, { '2': 0xff69b4 }, [" 2 2 ", "22222", "22222", " 222 ", "  2  "]);

        if (!this.anims.exists('cow_fly')) {
            this.anims.create({ key: 'cow_fly', frames: [{ key: 'vaca1' }, { key: 'vaca2' }], frameRate: 10, repeat: -1 });
        }

        const loadingDiv = document.getElementById('loading');
        if (loadingDiv) loadingDiv.style.display = 'none';

        // REQ 1: Universal audio unlock on first touch (runs in BootScene before any other scene)
        this.input.once('pointerdown', () => {
            if (this.sound && this.sound.context && this.sound.context.state === 'suspended') {
                this.sound.context.resume();
            }
        });

        // Check for room in URL
        const urlParams = new URLSearchParams(window.location.search);
        const roomToJoin = urlParams.get('room');
        if (roomToJoin) {
            gameState.currentRoom = roomToJoin.toLowerCase();
            this.scene.start('LobbyScene');
        } else {
            this.scene.start('MenuScene');
        }
    }
}

class MenuScene extends Phaser.Scene {
    constructor() { super('MenuScene'); }
    create() {
        this.cameras.main.setBackgroundColor('#87CEEB');
        gameState.currentRoom = null; 

        this.add.text(portraitWidth/2, 200, 'SALTA\nCHARLY', { 
            fontSize: '50px', fontFamily: '"Press Start 2P"', 
            color: '#FFFF00', align: 'center', 
            stroke: '#ff69b4', strokeThickness: 10 
        }).setOrigin(0.5);
        
        createPinkButton(this, portraitWidth/2, 450, 180, 50, 'JUGAR', () => {
            // Unlock audio context on first real user interaction
            if (this.sound && this.sound.context && this.sound.context.state === 'suspended') {
                this.sound.context.resume();
            }
            // Start music if not already playing
            if (!bgMusic) { bgMusic = this.sound.add('bgm', { loop: true, volume: 0.5 }); }
            if (!bgMusic.isPlaying) { try { bgMusic.play(); } catch(e) {} }
            this.scene.start('GameScene');
        });

        // "SALAS" button — white bg, pink text to distinguish from JUGAR
        createPinkButton(this, portraitWidth/2, 530, 180, 50, 'SALAS', () => {
            if (this.sound && this.sound.context && this.sound.context.state === 'suspended') { this.sound.context.resume(); }
            if (!bgMusic) { bgMusic = this.sound.add('bgm', { loop: true, volume: 0.5 }); }
            if (!bgMusic.isPlaying) { try { bgMusic.play(); } catch(e) {} }
            this.scene.start('RoomMenuScene');
        }, 0xFFFFFF, '#ff69b4');

        // REQ 1: EDITOR button
        createPinkButton(this, portraitWidth/2, 610, 180, 50, 'EDITOR', () => {
            this.scene.start('LevelEditorScene');
        }, 0xFFFFFF, '#ff69b4');
    }
}

// ── Phaser Modal helpers ──────────────────────────────────────────────

// Simple info/error modal (replaces alert)
function showModal(scene, message, onClose) {
    const cx = scene.cameras.main.centerX;
    const cy = scene.cameras.main.centerY;
    const mod = scene.add.container(cx, cy).setDepth(100);
    const bg = scene.add.rectangle(0, 0, 360, 260, 0x1a1a2e, 1).setStrokeStyle(5, 0xff69b4);
    const msg = scene.add.text(0, -50, message, { fontSize: '13px', fontFamily: '"Press Start 2P"', color: '#FFFF00', align: 'center', wordWrap: { width: 310 } }).setOrigin(0.5);
    const okBtn = scene.add.rectangle(0, 80, 160, 50, 0xff69b4).setInteractive({ useHandCursor: true });
    const okTxt = scene.add.text(0, 80, 'OK', { fontSize: '14px', fontFamily: '"Press Start 2P"', color: '#FFFF00' }).setOrigin(0.5);
    mod.add([bg, msg, okBtn, okTxt]);
    okBtn.on('pointerdown', () => { mod.destroy(); if (onClose) onClose(); });
}

// Text input modal (replaces window.prompt)
function showPromptModal(scene, question, defaultVal, onDone, onCancel) {
    const cx = scene.cameras.main.centerX;
    const cy = scene.cameras.main.centerY;
    const mod = scene.add.container(cx, cy).setDepth(100);
    const bg = scene.add.rectangle(0, 0, 380, 300, 0x1a1a2e, 1).setStrokeStyle(5, 0xff69b4);
    const qTxt = scene.add.text(0, -100, question, { fontSize: '12px', fontFamily: '"Press Start 2P"', color: '#FFFF00', align: 'center', wordWrap: { width: 340 } }).setOrigin(0.5);
    let inputVal = defaultVal || '';
    const inputDisplay = scene.add.text(0, -30, inputVal || '|', { fontSize: '14px', fontFamily: '"Press Start 2P"', color: '#ff69b4', backgroundColor: '#111', padding: { x: 12, y: 8 } }).setOrigin(0.5);
    mod.add([bg, qTxt, inputDisplay]);

    // Keyboard input
    const onKey = (event) => {
        if (event.key === 'Enter') { finish(); return; }
        if (event.key === 'Escape') { cancel(); return; }
        if (event.key === 'Backspace') { inputVal = inputVal.slice(0,-1); }
        else if (event.key.length === 1) { inputVal += event.key; }
        inputDisplay.setText(inputVal || '|');
    };
    window.addEventListener('keydown', onKey);

    const finish = () => { window.removeEventListener('keydown', onKey); mod.destroy(); if (onDone) onDone(inputVal); };
    const cancel = () => { window.removeEventListener('keydown', onKey); mod.destroy(); if (onCancel) onCancel(); };

    const okBtn = scene.add.rectangle(-70, 90, 130, 48, 0xff69b4).setInteractive({ useHandCursor: true });
    const okTxt = scene.add.text(-70, 90, 'OK', { fontSize: '12px', fontFamily: '"Press Start 2P"', color: '#FFFF00' }).setOrigin(0.5);
    const cancelBtn = scene.add.rectangle(80, 90, 130, 48, 0x555555).setInteractive({ useHandCursor: true });
    const cancelTxt = scene.add.text(80, 90, 'CANCELAR', { fontSize: '9px', fontFamily: '"Press Start 2P"', color: '#FFFFFF' }).setOrigin(0.5);
    mod.add([okBtn, okTxt, cancelBtn, cancelTxt]);
    okBtn.on('pointerdown', finish);
    cancelBtn.on('pointerdown', cancel);
}

// ── Phaser Numpad ────────────────────────────────────────────────
// showNumpad(scene, title, onDone, onCancel, confirmMode)
// confirmMode=true: asks for PIN twice and validates match before calling onDone
function showNumpad(scene, title, onDone, onCancel, confirmMode = false) {
    const cx = scene.cameras.main.centerX;
    const cy = scene.cameras.main.centerY;
    let firstPin = null;

    const buildPad = (currentTitle, onPinEntry) => {
        // Destroy previous pad if exists
        if (scene._activePad) { scene._activePad.destroy(); }
        const pad = scene.add.container(cx, cy).setDepth(50);
        scene._activePad = pad;

        const bg = scene.add.rectangle(0, 0, 340, 490, 0x1a1a2e, 0.98).setStrokeStyle(4, 0xff69b4);
        const titleTxt = scene.add.text(0, -210, currentTitle, { fontSize: '12px', fontFamily: '"Press Start 2P"', color: '#FFFF00', align: 'center', wordWrap: { width: 300 } }).setOrigin(0.5);
        // Show asterisks for PIN (masked)
        const pinDisplay = scene.add.text(0, -155, '_ _ _ _', { fontSize: '22px', fontFamily: '"Press Start 2P"', color: '#ff69b4', backgroundColor: '#111', padding: { x: 14, y: 8 } }).setOrigin(0.5);
        pad.add([bg, titleTxt, pinDisplay]);

        let pin = '';
        const refresh = () => {
            // Show asterisks for entered digits, underscores for remaining
            const chars = ['_', '_', '_', '_'];
            for (let i = 0; i < pin.length; i++) chars[i] = '*';
            pinDisplay.setText(chars.join(' '));
        };

        const layout = [
            ['1','2','3'],
            ['4','5','6'],
            ['7','8','9'],
            ['DEL','0','OK']
        ];
        const btnW = 80, btnH = 58, gapX = 10, gapY = 10;
        const startX = -((btnW * 3 + gapX * 2) / 2) + btnW / 2;
        const startY = -85;

        layout.forEach((row, ri) => {
            row.forEach((label, ci) => {
                const bx = startX + ci * (btnW + gapX);
                const by = startY + ri * (btnH + gapY);
                const isOk = label === 'OK';
                const isDel = label === 'DEL';
                const btnBg = scene.add.rectangle(bx, by, btnW, btnH, isOk ? 0xff69b4 : isDel ? 0x662222 : 0x223366)
                    .setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
                const btnTxt = scene.add.text(bx, by, label, { fontSize: isOk||isDel ? '10px' : '18px', fontFamily: '"Press Start 2P"', color: '#FFFFFF' }).setOrigin(0.5);
                pad.add([btnBg, btnTxt]);

                btnBg.on('pointerdown', () => {
                    btnBg.setScale(0.92);
                    if (isOk) {
                        if (pin.length === 4) {
                            pad.destroy();
                            onPinEntry(pin);
                        } else {
                            pinDisplay.setColor('#ff0000');
                            scene.time.delayedCall(400, () => pinDisplay.setColor('#ff69b4'));
                        }
                    } else if (isDel) {
                        pin = pin.slice(0, -1); refresh();
                    } else {
                        if (pin.length < 4) { pin += label; refresh(); }
                    }
                });
                btnBg.on('pointerup', () => btnBg.setScale(1));
            });
        });

        const cancelTxt = scene.add.text(0, 200, '[ CANCELAR ]', { fontSize: '11px', fontFamily: '"Press Start 2P"', color: '#888' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        cancelTxt.on('pointerdown', () => { pad.destroy(); if (onCancel) onCancel(); });
        pad.add(cancelTxt);
    };

    if (confirmMode) {
        // Step 1: enter PIN
        buildPad(title, (pin1) => {
            firstPin = pin1;
            // Step 2: confirm PIN
            buildPad('CONFIRMA\nTU PIN:', (pin2) => {
                if (pin1 === pin2) {
                    onDone(pin1);
                } else {
                    showModal(scene, 'LOS PINES\nNO COINCIDEN.\nIntenta de nuevo.', () => {
                        firstPin = null;
                        showNumpad(scene, title, onDone, onCancel, true);
                    });
                }
            });
        });
    } else {
        buildPad(title, onDone);
    }
}

class RoomMenuScene extends Phaser.Scene {
    constructor() { super('RoomMenuScene'); }
    create() {
        if (socket && !socket.connected) { socket.connect(); }
        this.cameras.main.setBackgroundColor('#87CEEB');
        const cx = this.cameras.main.centerX;

        this.add.text(cx, 120, 'SALAS', { fontSize: '30px', fontFamily: '"Press Start 2P"', color: '#FFFF00', stroke: '#ff69b4', strokeThickness: 6 }).setOrigin(0.5);
        this.add.text(cx, 175, 'PRIVADAS', { fontSize: '18px', fontFamily: '"Press Start 2P"', color: '#FFFF00', stroke: '#ff69b4', strokeThickness: 4 }).setOrigin(0.5);

        // CREAR SALA
        createPinkButton(this, cx, 320, 300, 60, 'CREAR SALA', () => {
            showPromptModal(this, 'NOMBRE DE\nLA SALA:', '', (roomName) => {
                if (!roomName || roomName.trim() === '') return;
                const cleanName = roomName.trim().toLowerCase();
                showNumpad(this, 'ELIGE UN\nPIN (4 DIGITOS):', (pin) => {
                    if (!socket || !socket.connected) { showModal(this, 'SIN CONEXION\nAL SERVIDOR.'); return; }
                    // REQ 2: roomError = name already taken
                    const onError = (msg) => { showModal(this, msg); };
                    socket.once('roomError', onError);
                    socket.once('roomCreated', (code) => {
                        socket.off('roomError', onError);
                        gameState.currentRoom = code;
                        this.scene.start('LobbyScene', { isHost: true });
                    });
                    socket.emit('createRoom', { roomName: cleanName, roomPin: pin });
                }, null, true);
            });
        });

        // ENTRAR A SALA
        createPinkButton(this, cx, 420, 300, 60, 'ENTRAR A SALA', () => {
            showPromptModal(this, 'NOMBRE DE\nLA SALA:', '', (roomName) => {
                if (!roomName || roomName.trim() === '') return;
                const cleanName = roomName.trim().toLowerCase();
                showNumpad(this, `PIN DE LA SALA\n${cleanName.toUpperCase()}:`, (pin) => {
                    if (!socket || !socket.connected) { showModal(this, 'SIN CONEXIÓN\nAL SERVIDOR.'); return; }
                    gameState.currentRoom = cleanName;
                    socket.once('joinedRoom', (code) => {
                        gameState.currentRoom = code;
                        this.scene.start('LobbyScene');
                    });
                    socket.once('joinError', (msg) => {
                        gameState.currentRoom = null;
                        showModal(this, msg.toUpperCase());
                    });
                    socket.emit('joinRoom', { roomName: cleanName, roomPin: pin });
                });
            });
        });

        // VOLVER
        createPinkButton(this, cx, 540, 200, 55, 'VOLVER', () => {
            this.scene.start('MenuScene');
        }, 0xFFFFFF, '#ff69b4');
    }
}

class LobbyScene extends Phaser.Scene {
    constructor() { super('LobbyScene'); }
    create() {
        this.cameras.main.setBackgroundColor('#87CEEB');
        const cx = this.cameras.main.centerX;

        const box = this.add.graphics();
        box.fillStyle(0xFFFFFF, 0.9); 
        box.fillRoundedRect(30, 100, portraitWidth - 60, 580, 16);
        box.lineStyle(6, 0xff69b4, 1); 
        box.strokeRoundedRect(30, 100, portraitWidth - 60, 580, 16);

        // REQ 7: Show room code prominently
        this.add.text(cx, 60, 'LOBBY PRIVADO', { fontSize: '18px', fontFamily: '"Press Start 2P"', color: '#FFFF00', stroke: '#ff69b4', strokeThickness: 5 }).setOrigin(0.5);
        this.add.text(cx, 125, `SALA: ${gameState.currentRoom.toUpperCase()}`, { fontSize: '18px', fontFamily: '"Press Start 2P"', color: '#333', backgroundColor: '#FFD700', padding: { x: 14, y: 8 } }).setOrigin(0.5);

        // Dynamic player count
        const playersText = this.add.text(cx, 165, 'CONECTADOS: 1', { fontSize: '10px', fontFamily: '"Press Start 2P"', color: '#555' }).setOrigin(0.5);

        // REQ 7: Show room-specific scores
        const scoresTitle = this.add.text(cx, 200, 'TOP SALA', { fontSize: '11px', fontFamily: '"Press Start 2P"', color: '#ff69b4' }).setOrigin(0.5);
        const scoresLoading = this.add.text(cx, 225, 'Cargando...', { fontSize: '10px', fontFamily: '"Press Start 2P"', color: '#999' }).setOrigin(0.5);

        fetch(`${BACKEND_URL}/api/scores?room=${encodeURIComponent(gameState.currentRoom)}`)
            .then(r => r.json())
            .then(data => {
                scoresLoading.destroy();
                if (!data || data.length === 0) {
                    this.add.text(cx, 225, '¡Seé el primero!', { fontSize: '10px', fontFamily: '"Press Start 2P"', color: '#777' }).setOrigin(0.5);
                } else {
                    data.slice(0, 5).forEach((e, i) => {
                        this.add.text(cx, 225 + (i * 28), `${i+1}. ${e.name} ${e.score}pts`, { fontSize: '10px', fontFamily: '"Press Start 2P"', color: '#333' }).setOrigin(0.5);
                    });
                }
            }).catch(() => { scoresLoading.setText('Error de servidor'); });

        // Socket logic 
        socket.emit('join_room', { room: gameState.currentRoom });
        
        const updatePlayers = (data) => {
            if (data && data.players) {
                playersText.setText(`CONECTADOS: ${data.players}`);
            }
        };
        socket.on('room_players_update', updatePlayers);

        this.events.on('shutdown', () => {
            socket.off('room_players_update', updatePlayers);
        });

        createPinkButton(this, cx, 430, 240, 50, 'EMPEZAR JUEGO', () => {
            if (this.sound && this.sound.context && this.sound.context.state === 'suspended') { this.sound.context.resume(); }
            if (!bgMusic) { bgMusic = this.sound.add('bgm', { loop: true, volume: 0.5 }); }
            if (!bgMusic.isPlaying) { try { bgMusic.play(); } catch(e) {} }
            this.scene.start('GameScene');
        });

        createPinkButton(this, cx, 510, 240, 50, 'COMPARTIR LINK', () => {
            if (navigator.clipboard) {
                const url = window.location.href.split('?')[0] + '?room=' + gameState.currentRoom;
                navigator.clipboard.writeText(url).then(() => { alert('¡Link de invitación copiado!'); });
            }
        });

        createPinkButton(this, cx, 590, 180, 50, 'SALIR', () => {
            if (socket) socket.disconnect();
            this.scene.start('RoomMenuScene');
        });
    }
}

class LevelEditorScene extends Phaser.Scene {
    constructor() { super('LevelEditorScene'); }

    preload() {
        // PRELOAD BLINDADO (Fix: Cajas grises)
        this.load.image('wall1', 'assets/wall1.png');
        this.load.image('wall2', 'assets/wall2.png');
        this.load.image('pool', 'assets/POOL.png');
        this.load.image('peace', 'assets/PEACE.PNG');
        this.load.image('vaca1', 'assets/VACA1.png');
        this.load.image('vaca2', 'assets/VACA2.png');
        this.load.image('ufo1', 'assets/ufo1.png');
        this.load.image('charly', 'assets/charly.png');
        this.load.image('banana1', 'assets/BANANA1.png');
        this.load.image('ohm1', 'assets/ohm1.png');
        this.load.image('ohm2', 'assets/ohm2.png');
        this.load.audio('ohmSound', 'sounds/ohm.mp3');

        // Handle Image for Resize
        const canvas = document.createElement('canvas');
        canvas.width = 10; canvas.height = 10;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,10,10);
        ctx.strokeStyle = '#007bff'; ctx.strokeRect(0,0,10,10);
        this.textures.addCanvas('handle', canvas);
    }

    create() {
        // 1. WYSIWYG ENVIRONMENT
        this.sky = this.add.graphics();
        this.sky.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x4169E1, 0x4169E1, 1);
        this.sky.fillRect(0, 0, portraitWidth, 100000); 

        this.bgClouds = this.add.group();
        for(let i=0; i<30; i++) {
            const cy = i * 400 + Phaser.Math.Between(-100, 100);
            const cloud = this.add.sprite(Phaser.Math.Between(0, portraitWidth), cy, 'fluffy_cloud');
            cloud.setScale(Phaser.Math.FloatBetween(0.8, 1.5)).setAlpha(0.2).setDepth(0);
            this.bgClouds.add(cloud);
        }

        // GRUPOS Y SELECCIÓN
        this.walls = this.add.group();
        this.pools = this.add.group();
        this.cows = this.add.group();
        this.ufos = this.add.group();
        this.ohms = this.add.group();
        this.bananas = this.add.group();
        this.peace = this.add.group(); 

        this.lastPlacedConfig = null;

        this.selectionGraphics = this.add.graphics();
        this.selectionHandles = this.add.group();
        this.selectedObject = null;

        this.selectedType = 'pool';
        this.currentKey = 'pool';
        this.GRID_SIZE = 40;

        // 2. GHOST BRUSH
        this.ghostBrush = this.add.sprite(0, 0, 'pool').setAlpha(0.5).setDepth(1001).setScale(0.4);

        // 3. UI - EXTERNAL HTML
        this.meterText = this.add.text(portraitWidth/2, 100, '0m', { fontSize: '28px', fontFamily: '"Press Start 2P"', color: '#FFFF00', stroke: '#ff69b4', strokeThickness: 5 }).setScrollFactor(0).setOrigin(0.5).setDepth(2002);
        
        const uiMain = document.createElement('div');
        uiMain.id = 'editor-main-ui';
        document.body.appendChild(uiMain);
        ['EXPORTAR', 'PROBAR'].forEach(txt => {
            const btn = document.createElement('button');
            btn.innerText = txt;
            btn.className = 'editor-btn-fixed';
            if (txt === 'PROBAR') { btn.style.background = '#4CAF50'; btn.onclick = () => this.playTest(); }
            else { btn.onclick = () => this.exportLevel(); }
            uiMain.appendChild(btn);
        });

        const toolSelector = document.createElement('div');
        toolSelector.id = 'editor-tool-selector';
        document.body.appendChild(toolSelector);
        const tools = ['wall', 'pool', 'peace', 'ohm', 'cow', 'ufo', 'banana'];
        tools.forEach(t => {
            const btn = document.createElement('button');
            btn.innerText = t.toUpperCase();
            btn.className = 'tool-btn' + (t === this.selectedType ? ' active' : '');
            btn.onclick = () => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedType = t;
                this.ghostBrush.setVisible(true); // Re-show brush
                this.updateToolState();
            };
            toolSelector.appendChild(btn);
        });

        const attrPanel = document.createElement('div');
        attrPanel.id = 'editor-attr-panel';
        document.body.appendChild(attrPanel);

        // 4. INPUTS
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // RECUPERAR PERSISTENCIA (REQ 4) - Antes de los eventos de click
        const saved = localStorage.getItem('editor_test_level');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                data.forEach(obj => {
                    this.selectedType = obj.type;
                    this.currentKey = obj.texture || (obj.type === 'wall' ? 'wall1' : obj.type);
                    const s = this.placeObject(obj.x, obj.y);
                    if (obj.scaleX) s.setScale(obj.scaleX, obj.scaleY || obj.scaleX);
                    if (obj.config) s.setData('config', obj.config);
                });
                // RESET STATE AFTER RESTORING
                this.selectedType = null;
                this.selectedObject = null;
                this.ghostBrush.setVisible(false);
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                this.clearSelectionFramework();
                const panel = document.getElementById('editor-attr-panel');
                if (panel) panel.style.display = 'none';
            } catch(e) { console.error("Persistence error:", e); }
        }

        this.input.on('pointerdown', (pointer) => {
            if (this.selectedType) {
                this.placeObject(pointer.worldX, pointer.worldY);
                // AUTO-DESELECT TOOL (QoL 1)
                this.selectedType = null;
                this.ghostBrush.setVisible(false);
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            }
        });

        // ESCALA CON TECLADO (REQ 3)
        this.input.keyboard.on('keydown-LEFT', () => {
            if (this.selectedObject) {
                this.selectedObject.setScale(Math.max(0.1, this.selectedObject.scaleX - 0.05));
                this.updateSelectionFramework();
                this.syncScaleUI();
            }
        });
        this.input.keyboard.on('keydown-RIGHT', () => {
            if (this.selectedObject) {
                this.selectedObject.setScale(Math.min(2.5, this.selectedObject.scaleX + 0.05));
                this.updateSelectionFramework();
                this.syncScaleUI();
            }
        });

        // 3. ELIMINAR OBJETO (DELETE / BACKSPACE) (QoL Proactiva)
        this.input.keyboard.on('keydown-DELETE', () => this.deleteSelected());
        this.input.keyboard.on('keydown-BACKSPACE', () => this.deleteSelected());

        this.input.keyboard.on('keydown-SPACE', () => {
            if (!this.lastPlacedConfig) return;

            let ptr = this.input.activePointer;
            let clone = this.add.sprite(ptr.worldX, ptr.worldY, this.lastPlacedConfig.key);
            clone.setScale(this.lastPlacedConfig.scaleX, this.lastPlacedConfig.scaleY);
            clone.setInteractive({ draggable: true });

            // Asignación estricta de físicas y grupos según el tipo
            switch(this.lastPlacedConfig.type) {
                case 'wall':
                    this.walls.add(clone);
                    this.physics.add.existing(clone);
                    clone.body.setImmovable(true);
                    clone.body.setAllowGravity(false);
                    clone.x = Phaser.Math.Snap.To(clone.x, 40); // Forzar Snap
                    clone.y = Phaser.Math.Snap.To(clone.y, 40);
                    break;
                case 'pool': this.pools.add(clone); this.physics.add.existing(clone); break;
                case 'peace': this.peace.add(clone); this.physics.add.existing(clone); break;
                case 'ohm': this.ohms.add(clone); this.physics.add.existing(clone); clone.play('ohm_pulse'); break;
                case 'cow': this.cows.add(clone); this.physics.add.existing(clone); break;
                case 'banana': this.bananas.add(clone); this.physics.add.existing(clone); break;
                case 'ufo': this.ufos.add(clone); this.physics.add.existing(clone); break;
            }
            
            // Re-setup events for cloned object
            clone.on('pointerdown', (p) => { p.event.stopPropagation(); this.openPropertiesPanel(clone); });
            clone.on('drag', (ptr, dx, dy) => {
                clone.x = Phaser.Math.Snap.To(dx, 40);
                clone.y = Phaser.Math.Snap.To(dy, 40);
                this.updateSelectionFramework();
            });
            clone.on('dragend', () => {
                clone.x = Phaser.Math.Snap.To(clone.x, 40);
                clone.y = Phaser.Math.Snap.To(clone.y, 40);
                this.updateSelectionFramework();
            });
        });

        // TRACKPAD / WHEEL SCROLL (QoL 3)
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            this.cameras.main.scrollY += deltaY * 1.5;
        });

        this.events.on('shutdown', () => { 
            [uiMain, toolSelector, attrPanel].forEach(el => { if(el) el.remove(); }); 
            const hint = document.querySelector('.editor-hint'); if(hint) hint.remove();
        });

        this.updateToolState();
    }

    syncScaleUI() {
        if (!this.selectedObject) return;
        const sx = document.getElementById('lbl-sx'); if(sx) sx.innerText = this.selectedObject.scaleX.toFixed(2);
        const rng = document.getElementById('rng-sx'); if(rng) rng.value = this.selectedObject.scaleX;
    }

    updateToolState() {
        this.currentKey = this.selectedType === 'wall' ? 'wall1' : 
                          this.selectedType === 'ohm' ? 'ohm1' : 
                          this.selectedType === 'cow' ? 'vaca1' : 
                          this.selectedType === 'ufo' ? 'ufo1' : 
                          this.selectedType === 'banana' ? 'banana1' :
                          this.selectedType === 'pool' ? 'pool' : 'peace';
        this.ghostBrush.setTexture(this.currentKey);
        const scale = this.selectedType === 'pool' || this.selectedType === 'ufo' ? 0.4 : 
                      this.selectedType === 'peace' || this.selectedType === 'ohm' || this.selectedType === 'banana' ? 0.6 : 0.8;
        this.ghostBrush.setScale(scale);
        if (this.selectedType === 'wall') this.ghostBrush.setDisplaySize(60, 40);
    }

    placeObject(x, y) {
        // SNAPPING INICIAL
        x = Phaser.Math.Snap.To(x, this.GRID_SIZE);
        y = Phaser.Math.Snap.To(y, this.GRID_SIZE);

        const sprite = this.add.sprite(x, y, this.currentKey);
        sprite.setInteractive({ draggable: true });
        sprite.setData('type', this.selectedType);
        sprite.setData('config', { velocityY: 0 });

        if (this.selectedType === 'wall') sprite.setDisplaySize(60, 40);
        else if (this.selectedType === 'pool' || this.selectedType === 'ufo') sprite.setScale(0.4);
        else if (this.selectedType === 'peace' || this.selectedType === 'ohm' || this.selectedType === 'banana') sprite.setScale(0.6);
        else sprite.setScale(0.8);

        sprite.on('pointerdown', (ptr) => { ptr.event.stopPropagation(); this.openPropertiesPanel(sprite); });
        sprite.on('drag', (ptr, dragX, dragY) => {
            sprite.x = Phaser.Math.Snap.To(dragX, this.GRID_SIZE);
            sprite.y = Phaser.Math.Snap.To(dragY, this.GRID_SIZE);
            this.updateSelectionFramework();
        });
        sprite.on('dragend', () => {
            sprite.x = Phaser.Math.Snap.To(sprite.x, this.GRID_SIZE);
            sprite.y = Phaser.Math.Snap.To(sprite.y, this.GRID_SIZE);
            this.updateSelectionFramework();
        });

        // AUTO SELECT
        this.openPropertiesPanel(sprite);

        // REQ 2A: Memoria Desvinculada
        this.lastPlacedConfig = { key: this.currentKey, type: this.selectedType, scaleX: sprite.scaleX, scaleY: sprite.scaleY };

        // GROUPS
        switch(this.selectedType) {
            case 'wall': this.walls.add(sprite); break;
            case 'pool': this.pools.add(sprite); break;
            case 'peace': this.peace.add(sprite); break;
            case 'ohm': this.ohms.add(sprite); break;
            case 'cow': this.cows.add(sprite); break;
            case 'ufo': this.ufos.add(sprite); break;
            case 'banana': this.bananas.add(sprite); break;
        }
        return sprite;
    }

    openPropertiesPanel(sprite) {
        if (this.selectedObject) this.selectedObject.clearTint();
        this.selectedObject = sprite;
        this.selectedObject.setTint(0x00ff00);

        this.updateSelectionFramework();

        const panel = document.getElementById('editor-attr-panel');
        panel.style.display = 'flex';
        const type = sprite.getData('type').toUpperCase();
        const cfg = sprite.getData('config');

        panel.innerHTML = `
            <div style="color:#ff69b4; margin-bottom:5px;">PROP: ${type}</div>
            <label>ESCALA: <span id="lbl-sx">${sprite.scaleX.toFixed(2)}</span></label>
            <input type="range" min="0.1" max="2.5" step="0.05" value="${sprite.scaleX}" id="rng-sx">
            <label>VELOCIDAD: <span id="lbl-vy">${cfg.velocityY}</span></label>
            <input type="range" min="-15" max="15" step="1" value="${cfg.velocityY}" id="rng-vy">
            <div style="display:flex; gap:5px; margin-top:5px;">
                <button id="btn-close-attr" style="flex:1">OK</button>
                <button id="btn-del-attr" style="background:#f00; flex:1">DEL</button>
            </div>
        `;

        const sx = document.getElementById('rng-sx');
        sx.oninput = (e) => { 
            const val = parseFloat(e.target.value); 
            sprite.setScale(val); 
            document.getElementById('lbl-sx').innerText = val.toFixed(2);
            this.updateSelectionFramework();
        };
        const vy = document.getElementById('rng-vy');
        vy.oninput = (e) => { 
            const val = parseInt(e.target.value); 
            cfg.velocityY = val; 
            document.getElementById('lbl-vy').innerText = val;
        };
        document.getElementById('btn-close-attr').onclick = () => { 
            panel.style.display = 'none'; 
            sprite.clearTint(); 
            this.selectedObject = null;
            this.clearSelectionFramework();
        };
        document.getElementById('btn-del-attr').onclick = () => { 
            sprite.destroy(); 
            panel.style.display = 'none'; 
            this.selectedObject = null; 
            this.clearSelectionFramework();
        };
    }

    updateSelectionFramework() {
        if (!this.selectedObject) return;
        const obj = this.selectedObject;
        this.selectionGraphics.clear();
        this.selectionGraphics.lineStyle(2, 0x007bff, 1);
        this.selectionGraphics.strokeRectShape(obj.getBounds());

        this.selectionHandles.clear(true, true);
        const bounds = obj.getBounds();
        const positions = [
            {x: bounds.left, y: bounds.top, originX: 1, originY: 1},
            {x: bounds.centerX, y: bounds.top, originX: 0.5, originY: 1},
            {x: bounds.right, y: bounds.top, originX: 0, originY: 1},
            {x: bounds.left, y: bounds.centerY, originX: 1, originY: 0.5},
            {x: bounds.right, y: bounds.centerY, originX: 0, originY: 0.5},
            {x: bounds.left, y: bounds.bottom, originX: 1, originY: 0},
            {x: bounds.centerX, y: bounds.bottom, originX: 0.5, originY: 0},
            {x: bounds.right, y: bounds.bottom, originX: 0, originY: 0}
        ];

        positions.forEach(p => {
            const h = this.add.sprite(p.x, p.y, 'handle').setInteractive({ draggable: true }).setDepth(2000);
            h.on('drag', (ptr) => {
                // Cálculo suave basado en distancia al centro (QoL 2)
                const newWidth = Math.abs(ptr.worldX - obj.x) * 2;
                const newHeight = Math.abs(ptr.worldY - obj.y) * 2;

                if (p.x !== bounds.centerX) obj.setDisplaySize(Math.max(10, newWidth), obj.displayHeight);
                if (p.y !== bounds.centerY) obj.setDisplaySize(obj.displayWidth, Math.max(10, newHeight));
                
                this.updateSelectionFramework();
                const sx = document.getElementById('lbl-sx'); if(sx) sx.innerText = obj.scaleX.toFixed(2);
                const rng = document.getElementById('rng-sx'); if(rng) rng.value = obj.scaleX;
            });
            this.selectionHandles.add(h);
        });
    }

    clearSelectionFramework() {
        this.selectionGraphics.clear();
        this.selectionHandles.clear(true, true);
    }

    deleteSelected() {
        if (this.selectedObject) {
            this.selectedObject.destroy();
            this.selectedObject = null;
            this.clearSelectionFramework();
            const panel = document.getElementById('editor-attr-panel');
            if (panel) panel.style.display = 'none';
        }
    }

    exportLevelData() {
        let cleanData = [];
        
        // Función auxiliar para extraer solo la data segura
        const extractData = (obj, type) => {
            if (!obj) return;
            cleanData.push({ 
                type: type, 
                x: Math.round(obj.x), 
                y: Math.round(obj.y), 
                texture: obj.texture.key,
                scaleX: obj.scaleX, 
                scaleY: obj.scaleY,
                config: obj.getData('config') || {}
            });
        };

        // Mapea TODOS los grupos activos. ¡No omitas ninguno! (REQ 1)
        if (this.walls) this.walls.getChildren().forEach(w => extractData(w, 'wall'));
        if (this.pools) this.pools.getChildren().forEach(p => extractData(p, 'pool'));
        if (this.peace) this.peace.getChildren().forEach(p => extractData(p, 'peace'));
        if (this.cows) this.cows.getChildren().forEach(c => extractData(c, 'cow'));
        if (this.bananas) this.bananas.getChildren().forEach(b => extractData(b, 'banana'));
        if (this.ohms) this.ohms.getChildren().forEach(o => extractData(o, 'ohm')); 
        if (this.ufos) this.ufos.getChildren().forEach(u => extractData(u, 'ufo'));

        // Guarda el JSON limpio
        localStorage.setItem('editor_test_level', JSON.stringify(cleanData));
        console.log("Nivel guardado. Elementos totales:", cleanData.length);
        return cleanData;
    }

    exportLevel() {
        this.exportLevelData();
        const saved = localStorage.getItem('editor_test_level');
        if (!saved) return;
        const blob = new Blob([saved], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'level.json'; a.click();
    }

    playTest() {
        this.exportLevelData();
        this.scene.start('GameScene', { testMode: true, startY: this.cameras.main.scrollY });
    }

    update() {
        if (this.cursors.up.isDown) this.cameras.main.scrollY -= 12;
        if (this.cursors.down.isDown) this.cameras.main.scrollY += 12;
        this.meterText.setText(Math.floor(this.cameras.main.scrollY * 0.1) + 'm');
        
        // PINCEL SNAP
        this.ghostBrush.x = Phaser.Math.Snap.To(this.input.activePointer.worldX, this.GRID_SIZE);
        this.ghostBrush.y = Phaser.Math.Snap.To(this.input.activePointer.worldY, this.GRID_SIZE);
    }
}



class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }
    
    create(data) {
        try {
        const startY = (data && data.startY) ? data.startY : 0;
        
        gameState.score = 0; 
        gameState.meters = startY * 0.1;
        gameState.lives = 3;
        gameState.baseSpeed = 450;
        gameState.multiplier = 1;
        this.isInvulnerable = false;
        
        this.isTrippyMode = false;
        this.isAbducted = false; 
        this.ufoActive = false;
        this.pendingUfo = false;
        
        this.isTestMode = data && data.testMode; // REQ 3

        // REQ 3: OHM ANIMATION
        if (!this.anims.exists('ohm_pulse')) {
            this.anims.create({ 
                key: 'ohm_pulse', 
                frames: [{key: 'ohm1'}, {key: 'ohm2'}], 
                frameRate: 2, 
                repeat: -1 
            });
        }

        this.ufoTargets = [
            Phaser.Math.Between(800, 1200),
            Phaser.Math.Between(2700, 4000),
            Phaser.Math.Between(5500, 8000)
        ];
        this.currentUfoIndex = 0;
        this.ufoState = 'IDLE'; 
        
        this.isPushed = false; 
        this.lastCowSpawnMeter = 0; 
        this.ufoHoverY = 150; 

        this.hasParachute = false;
        this.lastBananaSpawnMeter = 0;
        this.parachuteTimer = null;
        this.lastPeaceAudio = 0;
        this.lastWallY = 0; 
        this.isWallsGracePeriod = false; 
        this.savedX = portraitWidth / 2; 
        this.savedRelativeY = 200; 

        this.cameras.main.setBackgroundColor('#87CEEB');
        this.cameras.main.scrollY = startY;

        try {
            if (!bgMusic) { bgMusic = this.sound.add('bgm', { loop: true, volume: 0.5 }); }
            if (!bgMusic.isPlaying) { bgMusic.play(); }
        } catch(e) {}

        this.player = this.physics.add.sprite(portraitWidth/2, startY + 200, 'charly');
        this.player.setScale(1); // RESET ABSOLUTO (QoL 4A)
        this.player.setDisplaySize(75, 100);
        this.player.setOrigin(0.5, 0.5); 
        this.player.setDepth(20); // REQ 2: Charly siempre arriba de los objetos piletas/walls
        this.player.body.setSize(35, 80); 
        this.player.body.setOffset(20, 10); 

        // HUD DE TEST (QoL 4B)
        if (data && data.startY !== undefined) {
            const exitBtn = document.createElement('button');
            exitBtn.innerText = '🛑 TERMINAR TEST';
            exitBtn.className = 'editor-test-exit';
            exitBtn.onclick = () => {
                exitBtn.remove();
                this.scene.start('LevelEditorScene');
            };
            document.body.appendChild(exitBtn);
            this.events.on('shutdown', () => { if(exitBtn) exitBtn.remove(); });
        }
        this.player.lastX = this.player.x; 
        this.player.lastParachuteTexture = 'banana3'; 

        this.pools = this.physics.add.group();
        this.peace = this.physics.add.group();
        this.clouds = this.physics.add.group();
        this.cows = this.physics.add.group(); 
        this.bananas = this.physics.add.group(); 
        this.walls = this.physics.add.group();
        this.effects = this.add.group(); 

        this.heartIcons = this.add.group();
        this.updateHeartsUI();
        
        if (gameState.currentRoom) {
            // REQ 5: Sala badge at BOTTOM-CENTER — pink bar, white text, never overlaps gameplay
            const badgeY = this.cameras.main.height - 30;
            this.add.rectangle(portraitWidth/2, badgeY, 320, 40, 0xff69b4)
                .setOrigin(0.5).setScrollFactor(0).setDepth(100);
            this.add.text(portraitWidth/2, badgeY, 'SALA: ' + gameState.currentRoom.toUpperCase(), {
                fontSize: '11px', fontFamily: '"Press Start 2P", Courier', color: '#FFFFFF'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
        }

        this.meterText = this.add.text(20, 30, '0m', { fontSize: '24px', fontFamily: '"Press Start 2P"', color: '#FFFF00', stroke: '#ff69b4', strokeThickness: 4 }).setScrollFactor(0).setDepth(100);
        this.scoreText = this.add.text(20, 65, 'SCORE: 0', { fontSize: '16px', fontFamily: '"Press Start 2P"', color: '#FFFF00', stroke: '#ff69b4', strokeThickness: 3 }).setScrollFactor(0).setDepth(100);

        // Multiplayer UI indicator
        if (gameState.currentRoom && socket) {
            this.otherMetersText = this.add.text(portraitWidth - 20, 30, '', { fontSize: '12px', fontFamily: '"Press Start 2P"', color: '#FFF', stroke: '#000', strokeThickness: 2, align: 'right' }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
            
            socket.on('game_state_update', (data) => {
                otherPlayers[data.id] = data;
                this.updateOtherPlayersUI();
            });

            this.time.addEvent({ delay: 1000, callback: () => {
                const myName = localStorage.getItem('charlyName') || 'ANON';
                socket.emit('game_state_update', { 
                    room: gameState.currentRoom, 
                    id: socket.id,
                    name: myName, 
                    meters: Math.floor(gameState.meters) 
                });
            }, callbackScope: this, loop: true });
        }

        this.physics.add.overlap(this.player, this.ohms, (p, ohm) => {
            gameState.score += 28;
            try { this.sound.play('ohmSound'); } catch(e) {}
            
            this.tweens.add({
                targets: ohm,
                scale: 2,
                alpha: 0,
                duration: 200,
                onComplete: () => ohm.destroy()
            });
            
            const pointsText = this.add.text(ohm.x, ohm.y, '+28', { fontSize: '18px', fontFamily: '"Press Start 2P"', color: '#FFFFFF', stroke: '#ff69b4', strokeThickness: 4 }).setOrigin(0.5).setDepth(100);
            this.tweens.add({ targets: pointsText, y: pointsText.y - 50, alpha: 0, duration: 600, onComplete: () => pointsText.destroy() });
        });

        // PROCEDURAL VS TEST (REQ 1 - FIXED NAMES)
        if (this.isTestMode) {
            this.loadLevelFromJSON(); 
        } else {
            this.startProceduralSpawners(); 
        }
        
        this.time.addEvent({ delay: 60000, callback: () => {
            if (!this.isTestMode && !this.ufoActive && !this.isTrippyMode && !this.isAbducted) {
                this.pendingUfo = true;
            }
        }, callbackScope: this, loop: true });

        this.input.on('pointermove', (pointer) => {
            const isUfoBlocking = this.ufoActive && this.ufo && (this.ufo.state === 'approaching' || this.ufo.state === 'abducting');
            if (pointer.isDown && !this.isInvulnerable && !this.isAbducted && !isUfoBlocking && !this.isPushed) { 
                const dx = pointer.x - pointer.prevPosition.x;
                this.player.x = Phaser.Math.Clamp(this.player.x + dx, 37.5, portraitWidth - 37.5);
            }
        });

        this.cursors = this.input.keyboard ? this.input.keyboard.createCursorKeys() : null;
        this.physics.add.overlap(this.player, this.cows, this.hitCow, null, this);
        this.physics.add.overlap(this.player, this.bananas, this.collectBanana, null, this);
        this.physics.add.overlap(this.player, this.pools, this.onPoolOverlap, null, this);
        this.wallCollider = this.physics.add.collider(this.player, this.walls, this.onWallHit, null, this);

        this.isLevelLoaded = false;
        const testData = localStorage.getItem('level_test');
        if (testData) {
            this.loadJSONLevel(JSON.parse(testData));
            this.isLevelLoaded = true;
            localStorage.removeItem('level_test');
        }

        } catch (error) {
            console.error('❌ Error GameScene.create:', error);
        }
    }

    startProceduralSpawners() {
        this.time.addEvent({ delay: 2500, callback: this.spawnPeaceSigns, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 1500, callback: this.spawnPools, callbackScope: this, loop: true }); 
        this.time.addEvent({ delay: 600, callback: this.spawnCloud, callbackScope: this, loop: true });
        this.wallsTimer = this.time.addEvent({ delay: 3500, callback: this.spawnWalls, callbackScope: this, loop: true });
    }

    loadJSONLevel(objects) {
        console.log("Loading Deterministic Level:", objects.length, "objects");
        objects.forEach(obj => {
            const cfg = obj.config || {};
            let sprite;
            
            if (obj.texture === 'wall1' || obj.texture === 'wall2') {
                sprite = this.walls.create(obj.x, obj.y, obj.texture);
                sprite.body.setImmovable(true);
                sprite.body.setAllowGravity(false);
                sprite.setDepth(10);
            } else if (obj.texture === 'pool') {
                sprite = this.pools.create(obj.x, obj.y, 'pool');
                sprite.setDepth(5);
            } else if (obj.texture === 'peace') {
                sprite = this.peace.create(obj.x, obj.y, 'peace');
                sprite.active = true;
                sprite.setDepth(6);
            } else if (obj.texture === 'vaca1') {
                sprite = this.cows.create(obj.x, obj.y, 'vaca1');
                sprite.play('cow_fly');
            } else if (obj.texture === 'ufo1') {
                // UFOs in fixed levels behave like regular obstacles or triggers
                sprite = this.add.sprite(obj.x, obj.y, 'ufo1');
            }

            if (sprite) {
                sprite.setScale(cfg.scale || 1);
                if (sprite.body) {
                    sprite.body.setAllowGravity(false);
                    if (sprite.texture.key === 'pool') {
                        sprite.body.setSize(sprite.width * 0.8, sprite.height * 0.8);
                        sprite.body.setOffset(sprite.width * 0.1, sprite.height * 0.1);
                    }
                }
                sprite.refreshBody ? sprite.refreshBody() : null;
                // Movement
                if (!cfg.isStatic && cfg.speed > 0) {
                    sprite.moveSpeed = cfg.speed;
                    sprite.moveDir = cfg.dir || 1;
                    sprite.isMoving = true;
                }
            }
        });
    }

    updateOtherPlayersUI() {
        if (!this.otherMetersText) return;
        let text = '';
        const limit = 3;
        let count = 0;
        
        // Show up to top 3 other players
        const activePlayers = Object.values(otherPlayers).sort((a,b) => b.meters - a.meters);
        for(let p of activePlayers) {
            if (count >= limit) break;
            text += `${p.name}: ${p.meters}m\n`;
            count++;
        }
        this.otherMetersText.setText(text);
    }

    updateHeartsUI() {
        this.heartIcons.clear(true, true);
        for(let i=0; i<gameState.lives; i++) {
            this.heartIcons.create(portraitWidth - 40 - (i*40), 50, 'heart')
                .setScale(1.5).setScrollFactor(0).setDepth(100);
        }
    }

    spawnBanana() {
        const xPos = Phaser.Math.Between(50, portraitWidth - 50);
        const banana = this.bananas.create(xPos, 1000, 'banana1'); 
        banana.setDisplaySize(170, 170); 
        banana.setDepth(15);
        banana.active = true;
    }

    collectBanana(player, banana) {
        // Fix 1: strict physics guard
        if (!banana || !banana.scene || !banana.active || !banana.body) return;
        banana.body.enable = false;
        banana.destroy();
        
        try { this.sound.play('splash'); } catch(e) {} 
        
        this.hasParachute = true;

        let deltaX = this.player.x - this.player.lastX;
        // Guard: cursors is null on mobile
        const leftDown = this.cursors && this.cursors.left.isDown;
        if (deltaX < -0.1 || leftDown) {
            this.player.lastParachuteTexture = 'banana2';
        } else {
            this.player.lastParachuteTexture = 'banana3'; 
        }
        
        this.player.setTexture(this.player.lastParachuteTexture);
        this.player.setDisplaySize(170, 170); 
        this.player.rotation = 0;

        this.triggerShootingStar();
        
        if (this.parachuteTimer) this.parachuteTimer.remove();
        
        this.parachuteTimer = this.time.delayedCall(8000, () => {
            this.hasParachute = false;
            this.player.setTexture('charly');
            if (this.player.alpha === 1) {
                this.player.setDisplaySize(75, 100);
            }
        });
    }

    triggerShootingStar() {
        const estrella = this.add.sprite(this.player.x, this.player.y, 'estrella_fugaz');
        estrella.setDepth(10); 
        estrella.setScale(0);
        estrella.setAlpha(1);

        this.tweens.add({
            targets: estrella,
            scaleX: 3, 
            scaleY: 3,
            alpha: 0, 
            y: estrella.y + 100, 
            duration: 500, 
            ease: 'Cubic.out',
            onComplete: () => estrella.destroy() 
        });
    }

    spawnCow() {
        // REQ 3: Vacas respetan espacio aéreo
        if (this.ufoState !== 'IDLE') return;

        try { this.sound.play('moo_sound'); } catch(e) {}
        
        const fromLeft = Phaser.Math.Between(0, 1) === 0;
        // REQ 2: Garantizar visibilidad inicial (dentro o al borde exacto)
        const startX = fromLeft ? 0 : portraitWidth;
        const startY = this.cameras.main.scrollY + portraitHeight + 50;
        
        const cow = this.cows.create(startX, startY, 'vaca1');
        cow.setVisible(true).setAlpha(1); // Forzar visibilidad
        cow.setDisplaySize(130, 130); 
        cow.setDepth(25); 
        
        const angle = Phaser.Math.Angle.Between(startX, startY, this.player.x, this.player.y);
        const speed = Phaser.Math.Between(350, 450); 
        cow.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed); 
        
        if (cow.body.velocity.x < 0) { cow.setFlipX(true); }
        
        cow.play('cow_fly');
    }

    hitCow(player, cow) {
        // Fix 1: strict physics guard
        if (!cow || !cow.scene || !cow.active || !cow.body) return;
        if (this.isInvulnerable || this.isAbducted || this.isPushed) return;
        
        this.isPushed = true; 
        this.cameras.main.shake(150, 0.02);
        
        const pushDir = cow.body.velocity.x > 0 ? 1 : -1;
        
        this.tweens.add({
            targets: this.player,
            x: Phaser.Math.Clamp(this.player.x + (120 * pushDir), 37.5, portraitWidth - 37.5), 
            y: this.player.y - 60, 
            duration: 250,
            ease: 'Cubic.out',
            yoyo: true, 
            onComplete: () => { this.isPushed = false; }
        });
    }

    spawnUFO() {
        if (this.ufoState !== 'ACTIVE') return; // Only spawn when state machine is in ACTIVE
        if (this.isTrippyMode) return;

        // Ensure player is at least visible when event starts
        this.player.setAlpha(1);
        this.player.setVisible(true);
        this.player.body.enable = true;

        try { this.sound.play('ufo_sound'); } catch(e) {}
        
        if (!this.textures.exists('ufo1')) { 
            console.error('Falta textura UFO'); 
            this.ufoState = 'IDLE'; // Reset state if texture is missing
            return; 
        }

        // Clear Airspace — by the time spawnUFO() is called, WARNING phase
        // has already silenced spawners for 200m so obstacles left screen naturally.
        // No forced destruction needed here.

        const spawnY = this.cameras.main.scrollY - 100; 
        const spawnX = Phaser.Math.Between(50, portraitWidth - 50);
        
        this.ufo = this.physics.add.sprite(spawnX, spawnY, 'ufo1'); 
        if (!this.ufo) return;

        this.ufoActive = true;
        this.ufoHoverY = this.cameras.main.scrollY + 150;
        this.ufo.setDepth(5); 
        this.ufo.setScale(0); 
        this.ufo.state = 'approaching'; 

        this.tweens.add({
            targets: this.ufo,
            scaleX: 0.35, 
            scaleY: 0.35,
            y: this.ufoHoverY, 
            duration: 2000,
            ease: 'Cubic.out',
            onComplete: () => this.startAbduction()
        });
    }

    startAbduction() {
        if (!this.ufo) return;
        
        if (this.hasParachute) {
            this.hasParachute = false;
            this.player.setTexture('charly');
            this.player.setDisplaySize(75, 100);
            if (this.parachuteTimer) this.parachuteTimer.remove();
        }

        this.ufo.state = 'abducting';
        this.ufo.x = this.player.x;
        this.ufo.setTexture('ufo2'); 
        this.isAbducted = true;
        
        if (this.player.setTintFill) { this.player.setTintFill(0xffffff); }
        
        // REQ 1: Memorizar X absoluta, altura relativa y escala para evitar glitches
        this.savedX = this.player.x;
        this.savedRelativeY = this.player.y - this.cameras.main.scrollY;
        this.savedScaleX = this.player.scaleX;
        this.savedScaleY = this.player.scaleY;

        this.tweens.add({
            targets: this.player,
            y: this.ufo.y + 5, 
            displayWidth: 10,
            displayHeight: 13, 
            angle: 360, 
            alpha: 0, 
            duration: 1200,
            ease: 'Cubic.in',
            onComplete: () => {
                // REQ 3: NUNCA destruir al jugador. Usar disableBody para apagar físicas pero mantenerlo vivo.
                this.player.disableBody(true, true);
                
                this.ufo.setTexture('ufo1');
                this.ufo.state = 'leaving_temp'; 
                try { this.sound.play('ufo_away'); } catch(e) {}
                
                this.tweens.add({
                    targets: this.ufo,
                    scaleX: 0,
                    scaleY: 0,
                    y: -100, 
                    duration: 1000,
                    ease: 'Cubic.in',
                    onComplete: () => {

                        this.time.delayedCall(1000, () => {
                            if (!this.ufo) return;
                            
                            this.ufo.state = 'returning';
                            this.ufo.y = -100;
                            try { this.sound.play('ufo_sound'); } catch(e) {}
                            
                            this.tweens.add({
                                targets: this.ufo,
                                scaleX: 0.35,
                                scaleY: 0.35,
                                y: this.ufoHoverY,
                                duration: 1000,
                                ease: 'Cubic.out',
                                onComplete: () => {
                                    this.ufo.state = 'abducting'; 
                                    
                                    // REQ 3: Restaurar cuerpo físico antes del tween de reaparición
                                    this.player.enableBody(true, this.ufo.x, this.ufo.y + 5, true, true);
                                    this.player.alpha = 0; // Se vuelve visible en el tween siguiente
                                    
                                    if (this.player.clearTint) { this.player.clearTint(); }
                                    
                                    this.tweens.add({
                                        targets: this.player,
                                        y: this.cameras.main.scrollY + (this.savedRelativeY || 200), 
                                        x: this.savedX || (portraitWidth / 2),
                                        displayWidth: 75,
                                        displayHeight: 100,
                                        angle: 0,
                                        alpha: 1, 
                                        duration: 600,
                                        ease: 'Cubic.out',
                                        onComplete: () => {
                                            // REQ 1: Restaurar escala original exacta
                                            this.player.setScale(this.savedScaleX || (75/this.player.width), this.savedScaleY || (100/this.player.height));
                                            this.player.alpha = 1;
                                            this.player.refreshBody();
                                            
                                            // REQ 3: Sincronización del Bonus Mode (UfoState -> IDLE primero)
                                            this.isAbducted = false;
                                            this.ufoState = 'IDLE'; // Reactiva spawners de fondo
                                            this.ufo.state = 'leaving';

                                            // Forzar oleada inmediata para aprovechar el 10X
                                            this.spawnPools();
                                            this.spawnPeaceSigns();
                                            this.spawnCow();

                                            const popup = this.add.text(portraitWidth/2, portraitHeight/2, '10X MODE!', { fontSize: '40px', fontFamily: '"Press Start 2P"', color: '#FFFF00', stroke: '#ff69b4', strokeThickness: 8 }).setOrigin(0.5).setDepth(30);
                                            this.tweens.add({ targets: popup, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 2000, onComplete: () => popup.destroy() });

                                            this.isTrippyMode = true;
                                            gameState.multiplier = 10;
                                            this.scoreText.setText('SCORE: ' + gameState.score + ' (10X)');

                                            try { this.sound.play('ufo_away'); } catch(e) {}
                                            
                                            this.tweens.add({
                                                targets: this.ufo,
                                                scaleX: 0,
                                                scaleY: 0,
                                                y: -100,
                                                duration: 1500,
                                                ease: 'Cubic.in',
                                                onComplete: () => {
                                                    if (this.ufo) {
                                                        this.ufo.destroy();
                                                        this.ufo = null;
                                                    }
                                                    this.ufoActive = false;
                                                }
                                            });

                                            this.time.delayedCall(10000, () => {
                                                this.isTrippyMode = false;
                                                gameState.multiplier = 1;
                                                this.cameras.main.setBackgroundColor('#87CEEB'); 
                                                this.scoreText.setText('SCORE: ' + gameState.score);
                                            });
                                        }
                                    });
                                }
                            });
                        });
                    }
                });
            }
        });
    }

    spawnPools() {
        if (this.isTestMode) return;
        if (this.ufoState !== 'IDLE') return;

        const spawnY_Pool = 900;
        
        // REGLA 3: Prohibición Total de Overlapping (300px buffer vertical)
        let canSpawn = true;
        this.walls.getChildren().forEach(wall => {
            if (Math.abs(wall.y - spawnY_Pool) < 300) {
                canSpawn = false;
            }
        });
        if (!canSpawn) return;

        // Frecuencia ~85%
        if (Phaser.Math.Between(1, 100) <= 85) {
            const poolX = portraitWidth/2 + Phaser.Math.Between(-100, 100); 
            const pool = this.pools.create(poolX, spawnY_Pool, 'pool');
            pool.setDepth(5); 
            
            let scaleDrops = Math.floor(gameState.meters / 1000);
            let poolScale = Math.max(0.16, 0.33 - (scaleDrops * 0.05)); 
            pool.setScale(poolScale);
            
            // REQ 2: Hitbox al 80% y centrada
            pool.body.setSize(pool.width * 0.8, pool.height * 0.8);
            pool.body.setOffset(pool.width * 0.1, pool.height * 0.1);
            
            pool.refreshBody(); // Asegurar físicas

            pool.isMoving = Phaser.Math.Between(1, 10) <= 4;
            if (pool.isMoving) {
                pool.moveDir = Phaser.Math.Between(0, 1) === 0 ? 1 : -1;
                pool.moveSpeed = Phaser.Math.FloatBetween(2, 4);
            }
        }
    }

    spawnPeaceSigns() {
        if (this.isTestMode) return;
        // REQ 3: Aumentar frecuencia ~20% (era 4/10, ahora 5/10 aprox)
        if (Phaser.Math.Between(1, 10) <= 5) {
            const peaceX = Phaser.Math.Between(50, portraitWidth - 50);
            const peace = this.peace.create(peaceX, 1000, 'peace');
            const scaleFactor = 45 / peace.width;
            peace.setScale(scaleFactor);
            peace.setDepth(6);
            peace.active = true;
        }
    }

    spawnCloud() {
        // Clouds always spawn (no UFO restriction)
        const edgeX = Phaser.Math.Between(-50, portraitWidth + 50);
        const cloud = this.clouds.create(edgeX, 900, 'fluffy_cloud');
        cloud.setDepth(0); // REQ 2: Nubes siempre al fondo de todo
        
        cloud.speedMult = Phaser.Math.FloatBetween(0.6, 1.1); 
        cloud.setScale(Phaser.Math.FloatBetween(0.8, 2.5)); 
        
        const cloudDepth = Phaser.Math.Between(1, 25);
        // cloud.setDepth(cloudDepth); // Sobreescrito por depth 0 per requirement
        
        if (cloudDepth > 5) {
            cloud.setAlpha(Phaser.Math.FloatBetween(0.1, 0.25));
        } else {
            cloud.setAlpha(Phaser.Math.FloatBetween(0.4, 0.7));
        }
    }

    collectPeace(player, peace) {
        if (!peace.active) return;
        peace.active = false; 
        
        const px = peace.x;
        const py = peace.y;
        
        // Randomized sound selector (1 to 27, no repeat)
        let nextAudio;
        do {
            nextAudio = Phaser.Math.Between(1, 27);
        } while (nextAudio === this.lastPeaceAudio);
        this.lastPeaceAudio = nextAudio;
        try { this.sound.play('audio' + nextAudio); } catch(e) {}
        
        peace.destroy(); 
        
        const points = 10 * gameState.multiplier;
        gameState.score += points;
        this.scoreText.setText('SCORE: ' + gameState.score + (gameState.multiplier > 1 ? ' (10X)' : ''));
        
        const popup = this.add.text(px, py - 40, '+' + points, { fontSize: '16px', fontFamily: '"Press Start 2P"', color: '#FFFF00', stroke: '#ff69b4', strokeThickness: 4 }).setOrigin(0.5).setDepth(30);
        this.tweens.add({ targets: popup, y: popup.y - 50, alpha: 0, duration: 600, onComplete: () => popup.destroy() });
    }

    update(time, delta) {
        if (this.isInvulnerable) return;

        // --- UFO STATE MACHINE ---
        if (this.currentUfoIndex < this.ufoTargets.length) {
            const targetMeters = this.ufoTargets[this.currentUfoIndex];

            // FASE WARNING: 200m antes del target, frenar spawners
            if (gameState.meters >= targetMeters && this.ufoState === 'IDLE') {
                console.log('STATE CHANGE: IDLE -> WARNING');
                this.ufoState = 'WARNING';
                this.currentUfoIndex++; 
                
                // REGLA 4: Limpieza del Espacio Aéreo para el UFO
                if (this.cows) this.cows.clear(true, true);
                if (this.walls) this.walls.clear(true, true);
            }

            if (this.ufoState === 'WARNING') {
                console.log('STATE CHANGE: WARNING -> ACTIVE');
                this.ufoState = 'ACTIVE';
                this.spawnUFO();
            }
        }

        // REQ 2: Failsafe post-UFO (Evitar el Vacío)
        if (!this.ufo || !this.ufo.active) {
            if (this.ufoState !== 'IDLE') {
                console.warn('Failsafe estricto: UFO inactivo, forzando IDLE');
                this.ufoState = 'IDLE'; 
            }
        }

        if (gameState.meters - this.lastBananaSpawnMeter >= 800) {
            this.lastBananaSpawnMeter = gameState.meters;
            if (!this.isTrippyMode && !this.isAbducted && !this.hasParachute) {
                this.spawnBanana();
            }
        }

        if (gameState.meters - this.lastCowSpawnMeter >= 500) {
            this.lastCowSpawnMeter = gameState.meters;
            if (!this.isTrippyMode && !this.isAbducted) {
                const cowCount = Phaser.Math.Between(1, 3);
                for (let i = 0; i < cowCount; i++) {
                    this.time.delayedCall(i * 600, () => { this.spawnCow(); });
                }
            }
        }

        [...this.cows.getChildren()].forEach(cow => {
            if (cow.y < -150 || cow.x > portraitWidth + 150 || cow.x < -150) cow.destroy();
        });
        
        [...this.bananas.getChildren()].forEach(banana => {
            if (banana.y < -100) banana.destroy();
        });

        if (this.ufoActive && this.ufo) {
            if (this.ufo.state !== 'leaving' && this.ufo.state !== 'leaving_temp') {
                this.ufo.x = this.player.x;
            }
            if (this.ufo.state === 'abducting') {
                this.ufo.y = this.ufoHoverY;
            }
        }

        if (this.isTrippyMode) {
            const hue = (time * 0.1) % 360;
            const color = Phaser.Display.Color.HSVToRGB(hue / 360, 0.6, 1).color;
            this.cameras.main.setBackgroundColor(color);
        }

        const isUfoBlocking = this.ufoActive && this.ufo && (this.ufo.state === 'approaching' || this.ufo.state === 'abducting' || this.ufo.state === 'leaving_temp' || this.ufo.state === 'returning');
        
        let deltaX = 0;

        if (!this.isAbducted && !isUfoBlocking && !this.isPushed) {
            // Guard: cursors is null on mobile (no physical keyboard)
            if (this.cursors) {
                if (this.cursors.left.isDown) this.player.x -= 6;
                if (this.cursors.right.isDown) this.player.x += 6;
            }
            this.player.x = Phaser.Math.Clamp(this.player.x, 37.5, portraitWidth - 37.5);
            deltaX = this.player.x - this.player.lastX;
            // REQ 1: Asegurar que la cámara no se desplace en X
            this.cameras.main.scrollX = 0;
        }

        let currentSpeed = gameState.baseSpeed + (gameState.meters * 0.05);
        const difficultyLevel = Math.floor(gameState.meters / 1000);
        const speedMult = 1 + (difficultyLevel * 0.1); // REQ 4: +10% cada 1000m
        const speedMod = this.hasParachute ? 0.5 : 1; 
        const actualSpeed = currentSpeed * speedMod * speedMult;

        gameState.meters += (actualSpeed * delta) / 10000;
        this.meterText.setText(Math.floor(gameState.meters) + 'm');
        
        if (this.hasParachute && !this.isAbducted) {
            this.player.rotation = 0; 
            this.player.setDisplaySize(170, 170); 
            
            if (deltaX < -0.5 || this.cursors.left.isDown) {
                this.player.lastParachuteTexture = 'banana2'; 
            } else if (deltaX > 0.5 || this.cursors.right.isDown) {
                this.player.lastParachuteTexture = 'banana3'; 
            }

            if (this.player.texture.key !== this.player.lastParachuteTexture) {
                this.player.setTexture(this.player.lastParachuteTexture);
            }
        } else if (!this.isAbducted && !this.isPushed) {
            this.player.rotation = Math.sin(time * 0.005) * 0.15;
            
            if (this.player.texture.key !== 'charly') {
                const isBeingAbducted = this.ufo && this.ufo.state === 'abducting';
                if (!isBeingAbducted) {
                    this.player.setTexture('charly');
                }
            }
            if (this.player.alpha === 1 && !this.tweens.isTweening(this.player) && this.player.texture.key === 'charly') {
                this.player.setDisplaySize(75, 100);
            }
        }

        this.player.lastX = this.player.x;

        // REQ 4: Disable timers if level is loaded
        if (this.isLevelLoaded) {
            if (this.wallsTimer) this.wallsTimer.paused = true;
        }

        // REQ 2: Movimiento estrictamente por velocidad (Arcade Physics)
        if (this.walls) {
            this.walls.getChildren().forEach(w => {
                const wallSpeed = this.isLevelLoaded ? 0 : -actualSpeed; // Adjust if needed
                if (w.active) w.body.setVelocityY(wallSpeed);
            });
        }
        
        // Items velocity
        if (!this.isLevelLoaded) {
            this.pools.getChildren().forEach(pool => pool.setVelocityY(-actualSpeed));
            this.peace.getChildren().forEach(p => p.setVelocityY(-actualSpeed));
            this.bananas.getChildren().forEach(banana => banana.setVelocityY(-actualSpeed));
        } else {
            this.pools.getChildren().forEach(pool => pool.body.setVelocityY(0));
            this.peace.getChildren().forEach(p => p.body.setVelocityY(0));
            this.walls.getChildren().forEach(w => w.body.setVelocityY(0));
            // Camera movement handles the "falling"
            this.cameras.main.scrollY += actualSpeed * (delta/1000);
        }
        
        this.clouds.getChildren().forEach(cloud => cloud.setVelocityY(-(actualSpeed * cloud.speedMult)));

        [...this.peace.getChildren()].forEach(p => {
            if (!p.active) return;
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
            if (dist < 65) {
                this.collectPeace(this.player, p);
            }
        });

        // Pools: update lateral movement only (collision handled by overlap → collectPool)
        [...this.pools.getChildren()].forEach(pool => {
            if (!pool.active) return;
            if (pool.isMoving) {
                pool.x += pool.moveDir * pool.moveSpeed;
                const halfWidth = (pool.displayWidth / 2);
                if (pool.x - halfWidth < 0) pool.moveDir = 1;
                else if (pool.x + halfWidth > portraitWidth) pool.moveDir = -1;
            }
        });

        // REQ 2: Movimiento estrictamente por velocidad (Arcade Physics)
        if (this.walls) {
            this.walls.getChildren().forEach(w => {
                if (w.active) w.body.setVelocityY(-actualSpeed);
            });
        }
        
        // --- MASTER GARBAGE COLLECTOR (Memory Leak Fix) ---
        // Destroys all objects that go out of the camera bounds
        // Usually objects spawn around Y: 800-1200 and move towards Y: -150 depending on velocity.
        // If the player falls, objects could also spawn below or above.
        const gcCamTop = this.cameras.main.scrollY - 150;
        const gcCamBottom = this.cameras.main.scrollY + portraitHeight + 350; 
        
        const garbageCollectGroup = (group) => {
            [...group.getChildren()].forEach(obj => {
                if (obj.y < gcCamTop || obj.y > gcCamBottom || obj.x < -200 || obj.x > portraitWidth + 200) {
                    obj.destroy();
                }
            });
        };

        garbageCollectGroup(this.pools);
        garbageCollectGroup(this.peace);
        garbageCollectGroup(this.bananas);
        garbageCollectGroup(this.clouds);
        garbageCollectGroup(this.cows);
        if (this.walls) garbageCollectGroup(this.walls);

        // --- UFO LIFECYCLE WATCHER ---
        if (this.ufoState === 'ACTIVE') {
            const ufoGone = !this.ufo || !this.ufo.active;
            const ufoOutOfBounds = this.ufo && this.ufo.active &&
                this.ufo.y > this.cameras.main.scrollY + this.cameras.main.height + 150;

            if (ufoGone || ufoOutOfBounds) {
                if (this.ufo && this.ufo.active) { this.ufo.destroy(); }
                this.ufo = null;
                this.ufoActive = false;
                
                console.log('STATE CHANGE: ACTIVE -> IDLE');
                this.ufoState = 'IDLE';            // Vuelven vacas y piletas
                this.lastWallY = 0;                 // REQ 2: Limpiar conciencia espacial
                                
                // BUG FIX: Asegurar restauración completa del jugador
                                if (this.player) {
                                    // REQ 1: Usar altura memorizada y X absoluta
                                    const relY = (this.savedRelativeY !== undefined) ? this.savedRelativeY : (this.cameras.main.height * 0.25);
                                    const safeY = this.cameras.main.scrollY + relY;
                                    const safeX = (this.savedX !== undefined) ? this.savedX : this.cameras.main.centerX;
                                    
                                    this.player.enableBody(true, safeX, safeY, true, true);
                                    
                                    // REQ 1: Usar escala memorizada para evitar el scale glitch
                                    if (this.savedScaleX && this.savedScaleY) {
                                        this.player.setScale(this.savedScaleX, this.savedScaleY);
                                    } else {
                                        this.player.setScale(1);
                                    }
                                    this.player.refreshBody();

                                    this.player.setAlpha(1);
                                    this.player.setVisible(true);
                                    this.player.setActive(true);
                                    this.player.setVelocity(0, 0); // Reset inercia
                                    this.player.isInvulnerable = false; // Limpiar I-Frames

                                    // REQ 1: startFollow(player, true, 0, 1) con offset vertical para evitar saltos
                                    // El offsetY compensa la diferencia para que no pegue el tirón al centro
                                    const offsetY = this.player.y - this.cameras.main.centerY;
                                    this.cameras.main.startFollow(this.player, true, 0, 1, 0, offsetY);
                                    
                                    console.log('UFO TERMINADO, ESTADO:', this.ufoState);
                                }

                // REQ 2: NUNCA pausar timers. Usar flag de gracia.
                this.isWallsGracePeriod = true;
                this.time.delayedCall(2500, () => {
                    this.isWallsGracePeriod = false;
                });
            }
        }
    }

    handleSuccess(pool) {
        const basePoints = pool.isMoving ? 40 : 20;
        const pointsAwarded = basePoints * gameState.multiplier;
        
        gameState.score += pointsAwarded;
        this.scoreText.setText('SCORE: ' + gameState.score + (gameState.multiplier > 1 ? ' (10X)' : ''));
        
        try { this.sound.play('splash'); } catch(e) {}
        
        const popup = this.add.text(pool.x, pool.y - 40, '+' + pointsAwarded, { fontSize: '20px', fontFamily: '"Press Start 2P"', color: '#FFFF00', align: 'center', stroke: '#ff69b4', strokeThickness: 4 }).setOrigin(0.5).setDepth(30);
        this.tweens.add({ targets: popup, y: popup.y - 50, alpha: 0, duration: 800, onComplete: () => popup.destroy() });
    }

    // REGLA 2: Piletas = Sumar Puntos (Cero Daño)
    onPoolOverlap(player, pool) {
        if (!pool || !pool.active || pool.used) return;
        pool.used = true;
        
        // Sumar puntos
        gameState.score += 50;
        this.scoreText.setText('SCORE: ' + gameState.score + (gameState.multiplier > 1 ? ' (10X)' : ''));
        try { this.sound.play('splash'); } catch(e) {}

        const popup = this.add.text(player.x, player.y - 50, '+50', { fontSize: '22px', fontFamily: '"Press Start 2P"', color: '#00BFFF', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(101);
        this.tweens.add({ targets: popup, y: popup.y - 60, alpha: 0, duration: 700, onComplete: () => popup.destroy() });

        pool.disableBody(true, false);

        // Animación de Charly (Inmersión visual únicamente)
        this.tweens.add({
            targets: player,
            scaleX: (this.savedScaleX || 1) * 0.6,
            scaleY: (this.savedScaleY || 1) * 0.6,
            alpha: 0.6,
            duration: 200,
            yoyo: true,
            onComplete: () => {
                const defaultSX = 75 / player.width;
                const defaultSY = 100 / player.height;
                player.setScale(this.savedScaleX || defaultSX, this.savedScaleY || defaultSY);
                player.alpha = 1;
            }
        });

        // Animación y destrucción de la pileta
        this.tweens.add({
            targets: pool,
            scale: pool.scale * 2.0,
            alpha: 0,
            duration: 300,
            onComplete: () => { pool.destroy(); }
        });
    }

    // New obstacle: wall segments with progress difficulty
    spawnWalls(yInput = null) {
        if (this.isTestMode && !yInput) return;
        if (this.ufoState !== 'IDLE' || this.isWallsGracePeriod) return;

        // Pacing Dinámico REQ 4: Reducir delay de spawn con la distancia
        const baseDelay = 3500;
        const difficultyLevel = Math.floor(gameState.meters / 1000);
        const newDelay = Math.max(1500, baseDelay - (difficultyLevel * 250));
        
        if (this.wallsTimer) {
            this.wallsTimer.reset({ delay: newDelay, callback: this.spawnWalls, callbackScope: this, loop: true });
        }

        const wallKey = Phaser.Math.Between(0, 1) === 0 ? 'wall1' : 'wall2';
        const spawnY = 950;
        this.lastWallY = spawnY;
        const wallW = 60;
        const wallH = 40;

        // Pasaje Garantizado REQ 1
        const gapWidth = (75 * 1.0) * 1.1; // Charly width * scale * 1.1

        const layoutType = Phaser.Math.Between(1, 7);
        
        const createBlock = (bx, by) => {
            const b = this.walls.create(bx, by, wallKey);
            b.setOrigin(0.5);
            b.setDisplaySize(wallW, wallH);
            this.physics.add.existing(b); // REQ 1: ¡FUERZA EXISTENCIA FÍSICA!
            b.body.setSize(wallW * 0.9, wallH * 0.9);
            b.body.setImmovable(true);
            b.body.setAllowGravity(false);
            b.body.setVelocityY(-(gameState.baseSpeed || 400)); // REQ 2: Velocidad inicial
            b.refreshBody(); // Sincroniza hitbox
            b.setDepth(10);
            return b;
        };

        switch(layoutType) {
            case 1: // Bloque simple
                createBlock(Phaser.Math.Between(50, portraitWidth-50), spawnY);
                break;
            case 2: // Bloque horizontal mediano
                const b2x = Phaser.Math.Between(100, portraitWidth-100);
                createBlock(b2x - 30, spawnY);
                createBlock(b2x + 30, spawnY);
                break;
            case 3: // Cruz
                createBlock(portraitWidth/2, spawnY);
                createBlock(portraitWidth/2 - wallW, spawnY);
                createBlock(portraitWidth/2 + wallW, spawnY);
                createBlock(portraitWidth/2, spawnY - wallH);
                createBlock(portraitWidth/2, spawnY + wallH);
                break;
            case 4: // Barra con hueco lateral
                const sideLeft = Phaser.Math.Between(0, 1) === 0;
                let x4 = sideLeft ? (gapWidth + wallW/2) : wallW/2;
                const maxX4 = sideLeft ? portraitWidth : (portraitWidth - gapWidth);
                while (x4 < maxX4) {
                    createBlock(x4, spawnY);
                    x4 += wallW;
                }
                break;
            case 5: // Gran barra con hueco mínimo
                const gapX5 = Phaser.Math.Between(50, portraitWidth - gapWidth - 50);
                let x5 = wallW/2;
                while (x5 < portraitWidth + wallW) {
                    if (x5 < gapX5 || x5 > gapX5 + gapWidth) {
                        createBlock(x5, spawnY);
                    }
                    x5 += wallW;
                }
                break;
            case 6: // Pasillo central estrecho
                let x6 = wallW/2;
                const hallwayW = gapWidth + 20;
                while (x6 < portraitWidth + wallW) {
                    if (x6 < (portraitWidth/2 - hallwayW/2) || x6 > (portraitWidth/2 + hallwayW/2)) {
                        createBlock(x6, spawnY);
                    }
                    x6 += wallW;
                }
                break;
            case 7: // Bloque macizo
                const b7x = Phaser.Math.Between(100, portraitWidth-100);
                for(let row=0; row<2; row++) {
                    for(let col=0; col<2; col++) {
                        createBlock(b7x + (col*wallW), spawnY + (row*wallH));
                    }
                }
                break;
        }
    }

    // REQ 2: onWallHit (Safe-Hit)
    onWallHit(player, wall) {
        if (player.isInvulnerable) return;
        player.isInvulnerable = true;
        gameState.lives -= 1;
        this.updateHeartsUI();

        // EFECTO VISUAL SEGURO: Parpadeo sin ocultar
        this.tweens.add({
            targets: player,
            alpha: { from: 1, to: 0.3 },
            duration: 100,
            yoyo: true,
            repeat: 10,
            onComplete: () => {
                player.alpha = 1;
                player.isInvulnerable = false;
            }
        });

        if (gameState.lives <= 0) {
            this.scene.start('GameOverScene');
            return;
        }

        // Feedback extra: CRASH text
        const crashText = this.add.text(player.x, player.y - 20, 'CRASH!!!', { fontSize: '20px', fontFamily: '"Press Start 2P"', fill: '#39FF14' }).setOrigin(0.5).setDepth(200);
        this.tweens.add({ targets: crashText, y: crashText.y - 40, alpha: 0, duration: 800, onComplete: () => crashText.destroy() });
        this.cameras.main.shake(100, 0.01);
    }

    triggerFail(player, obstacle, customText = "CRASH") {
        if (this.isInvulnerable) return;
        this.isInvulnerable = true;
        
        if (this.player.clearTint) { this.player.clearTint(); } 
        this.isTrippyMode = false;
        this.isAbducted = false;
        this.pendingUfo = false;
        this.isPushed = false;
        
        if (this.parachuteTimer) this.parachuteTimer.remove();
        this.hasParachute = false;

        gameState.multiplier = 1;
        this.cameras.main.setBackgroundColor('#87CEEB');
        if(this.ufoActive && this.ufo) { this.ufo.destroy(); this.ufoActive = false; }
        
        gameState.lives--;
        this.updateHeartsUI();

        if (gameState.lives <= 0) {
            this.physics.pause();
            this.player.setVisible(false);
            if (bgMusic) bgMusic.stop(); 
            this.scene.start('GameOverScene');
            return;
        }

        const popup = this.add.text(player.x, player.y, customText, { fontSize: '24px', fontFamily: '"Press Start 2P"', color: '#FFFF00', stroke: '#ff69b4', strokeThickness: 6 }).setOrigin(0.5).setDepth(30);
        this.tweens.add({ targets: popup, y: popup.y - 100, alpha: 0, duration: 1500, onComplete: () => popup.destroy() });
        
        try { this.sound.play('fail_sound'); } catch(e) {}

        this.cameras.main.shake(300, 0.04);
        
        this.tweens.add({
            targets: this.player,
            angle: 360 * 3, 
            scaleX: 0.5,
            scaleY: 0.5,
            alpha: 0,
            duration: 800,
            onComplete: () => {
                this.player.setAngle(0);
                this.player.y = 200; 
                this.player.setTexture('charly');
                this.player.setDisplaySize(75, 100);
                this.player.setAlpha(1);
                this.isInvulnerable = false;
            }
        });
    }

    loadLevelFromJSON() {
        const saved = localStorage.getItem('editor_test_level');
        if (!saved) return;
        try {
            const data = JSON.parse(saved);
            data.forEach(obj => {
                let sprite;
                switch(obj.type) {
                    case 'wall':
                        sprite = this.walls.create(obj.x, obj.y, obj.texture || 'wall1');
                        sprite.body.setAllowGravity(false);
                        sprite.body.setImmovable(true);
                        sprite.body.setVelocityY(-350); 
                        break;
                    case 'pool':
                        sprite = this.pools.create(obj.x, obj.y, 'pool');
                        break;
                    case 'peace':
                        sprite = this.peace.create(obj.x, obj.y, 'peace');
                        break;
                    case 'ohm':
                        sprite = this.ohms.create(obj.x, obj.y, 'ohm1'); 
                        sprite.play('ohm_pulse');
                        break;
                    case 'cow':
                        sprite = this.cows.create(obj.x, obj.y, 'vaca1');
                        break;
                    case 'ufo':
                        sprite = this.ufos.create(obj.x, obj.y, 'ufo1');
                        break;
                    case 'banana':
                        sprite = this.bananas.create(obj.x, obj.y, 'banana1');
                        break;
                }
                if (sprite) {
                    if (obj.scaleX) sprite.setScale(obj.scaleX, obj.scaleY || obj.scaleX);
                    sprite.setData('type', obj.type);
                    if (obj.config) sprite.setData('config', obj.config);
                    if (sprite.body && sprite.refreshBody) sprite.refreshBody();
                }
            });
        } catch(e) { console.error("Test load error:", e); }
    }
}

class GameOverScene extends Phaser.Scene {
    constructor() { super('GameOverScene'); }
    create() {
        this.cameras.main.setBackgroundColor('#87CEEB'); 
        
        const savedName = localStorage.getItem('charlyName') || '';

        const domHTML = `
            <div class="input-container" style="background:rgba(255,255,255,0.95); padding:20px; border:4px solid #ff69b4; border-radius:10px; text-align:center; width: 280px; margin: 0 auto; box-shadow: 0 0 20px rgba(0,0,0,0.5);">
                <h2 style="font-family:'Press Start 2P'; color:#FFFF00; text-shadow: -2px -2px 0 #ff69b4, 2px -2px 0 #ff69b4, -2px 2px 0 #ff69b4, 2px 2px 0 #ff69b4; margin-top:0; font-size: 20px;">GAME OVER</h2>
                <p style="font-family:'Press Start 2P'; font-size:12px; color:#333;">FALL: ${Math.floor(gameState.meters)}m</p>
                <p style="font-family:'Press Start 2P'; font-size:16px; color:#333; margin-bottom: 20px;">SCORE: ${gameState.score}</p>
                
                <input type="text" id="nameIn" placeholder="NOMBRE" maxlength="10" value="${savedName}" style="padding:10px; width:150px; font-family:'Press Start 2P'; text-align:center; margin-bottom: 15px; border: 3px solid #ff69b4; outline: none; background-color: #FAFAFA; text-transform: uppercase;"><br>
                
                <div style="display: flex; justify-content: space-between; gap: 10px;">
                    <button id="saveBtn" style="flex: 1; padding:10px; background:#ff69b4; color:#FFFF00; border:none; font-family:'Press Start 2P'; cursor:pointer; font-size: 10px;">SAVE</button>
                    <button id="retryBtn" style="flex: 1; padding:10px; background:#ff69b4; color:#FFFF00; border:none; font-family:'Press Start 2P'; cursor:pointer; font-size: 10px;">RETRY</button>
                </div>
            </div>
        `;
        
        // REQ 4: Use camera center coordinates to avoid mobile offset
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;
        this.domMenu = this.add.dom(cx, cy).createFromHTML(domHTML);

        const nameIn = document.getElementById('nameIn');
        if (nameIn) {
            // REQ 3: Fix mobile keyboard viewport shift
            nameIn.addEventListener('blur', () => { window.scrollTo(0, 0); });
        }

        document.getElementById('saveBtn').onclick = async () => {
            const btn = document.getElementById('saveBtn');
            const name = document.getElementById('nameIn').value.toUpperCase() || 'ANON';
            localStorage.setItem('charlyName', name); 
            
            btn.innerText = 'GUARDANDO...';
            
            try {
                const nombre = name;
                const puntos = gameState.score;
                const roomName = gameState.currentRoom;
                
                const payload = { 
                    playerName: nombre, 
                    score: puntos, 
                    meters: Math.floor(gameState.meters),
                    room_name: roomName || null 
                };
                
                const req = await fetch(`${BACKEND_URL}/api/scores`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                
                if (!req.ok) {
                    const errBody = await req.json().catch(() => ({}));
                    throw new Error(errBody.error || `HTTP ${req.status}`);
                }

                if (gameState.currentRoom && socket) {
                    socket.emit('game_over_request_sync', { room: gameState.currentRoom });
                }
                
                this.domMenu.destroy();
                this.showLeaderboard();
            } catch (e) {
                console.error('Score save error:', e.message);
                btn.innerText = 'ERR: ' + (e.message || 'GUARDAR');
                btn.style.backgroundColor = '#cc0000';
            }
        };

        if (socket) {
            socket.on('force_leaderboard_refresh', () => {
                if (!this.domMenu.active && this.leaderboardBox) {
                    this.refreshLeaderboardData();
                }
            });
        }

        document.getElementById('retryBtn').onclick = () => {
            this.domMenu.destroy();
            if (gameState.currentRoom) {
                this.scene.start('LobbyScene');
            } else {
                this.scene.start('GameScene'); 
            }
        };
    }

    update(time, delta) {
        // Obsolete background chars and clouds removed
    }

    // FIX: Doble Leaderboard para salas privadas usando Promise.all
    async showLeaderboard() {
        if (this.leaderboardBox) {
            this.leaderboardBox.destroy();
            this.leaderboardTexts.forEach(t => t.destroy());
        }
        
        this.leaderboardTexts = [];
        this.leaderboardBox = this.add.graphics();
        this.leaderboardBox.fillStyle(0xFFFFFF, 0.9); 
        this.leaderboardBox.fillRoundedRect(40, 40, portraitWidth - 80, 580, 16);
        this.leaderboardBox.lineStyle(6, 0xff69b4, 1); 
        this.leaderboardBox.strokeRoundedRect(40, 40, portraitWidth - 80, 580, 16);

        this.refreshLeaderboardData();
        
        const r = this.add.text(portraitWidth/2, 730, gameState.currentRoom ? 'VOLVER AL LOBBY' : 'RETRY', { 
            fontSize: '18px', fontFamily: '"Press Start 2P"', backgroundColor: '#ff69b4', color: '#FFFF00', padding: 15 
        }).setOrigin(0.5).setInteractive();
        
        this.leaderboardTexts.push(r);
        
        r.on('pointerdown', () => {
            if (socket) socket.off('force_leaderboard_refresh');
            if (gameState.currentRoom) {
                this.scene.start('LobbyScene');
            } else {
                this.scene.start('GameScene');
            }
        });
    }

    async refreshLeaderboardData() {
        // Clear previous texts except the retry button
        if (this.leaderboardTexts) {
            this.leaderboardTexts.forEach(t => {
                if (t.text !== 'VOLVER AL LOBBY' && t.text !== 'RETRY') t.destroy();
            });
            this.leaderboardTexts = this.leaderboardTexts.filter(t => t.text === 'VOLVER AL LOBBY' || t.text === 'RETRY');
        }

        try {
            if (gameState.currentRoom) {
                // TÍTULO SALA
                const t1 = this.add.text(portraitWidth/2, 80, `TOP 5 SALA: ${gameState.currentRoom.toUpperCase()}`, { fontSize: '14px', fontFamily: '"Press Start 2P"', color: '#FFFF00', stroke: '#ff69b4', strokeThickness: 4 }).setOrigin(0.5);
                
                // TÍTULO GLOBAL
                const t2 = this.add.text(portraitWidth/2, 280, 'TOP 5 GLOBAL', { fontSize: '14px', fontFamily: '"Press Start 2P"', color: '#FFFF00', stroke: '#ff69b4', strokeThickness: 4 }).setOrigin(0.5);
                
                this.leaderboardTexts.push(t1, t2);

                // Llamadas simultáneas
                const [resRoom, resGlobal] = await Promise.all([
                    fetch(`${BACKEND_URL}/api/scores`), // Removed query room since instructed to rewrite completely
                    fetch(`${BACKEND_URL}/api/scores`)
                ]);
                
                // Cargar Top Room — purple color to differentiate from global
                const dataRoom = await resRoom.json();
                const topRoom = dataRoom.slice(0, 5);
                topRoom.forEach((e, i) => {
                    const t = this.add.text(portraitWidth/2, 120 + (i*30), `${i+1}. ${e.name} - ${e.score}`, { fontSize: '12px', fontFamily: '"Press Start 2P"', color: '#6a0dad' }).setOrigin(0.5);
                    this.leaderboardTexts.push(t);
                });
                
                // Visual separator between sala and global
                const sep = this.add.graphics();
                sep.lineStyle(2, 0xff69b4, 0.8);
                sep.lineBetween(60, 290, portraitWidth - 60, 290);
                this.leaderboardTexts.push(sep);

                // Cargar Top Global — black color
                const dataGlobal = await resGlobal.json();
                const topGlobal = dataGlobal.slice(0, 5);
                topGlobal.forEach((e, i) => {
                    const t = this.add.text(portraitWidth/2, 330 + (i*32), `${i+1}. ${e.name} - ${e.score}`, { fontSize: '12px', fontFamily: '"Press Start 2P"', color: '#222' }).setOrigin(0.5);
                    this.leaderboardTexts.push(t);
                });

            } else {
                // LEADERBOARD ESTÁNDAR GLOBAL
                const t1 = this.add.text(portraitWidth/2, 80, 'TOP SCORERS', { fontSize: '20px', fontFamily: '"Press Start 2P"', color: '#FFFF00', stroke: '#ff69b4', strokeThickness: 5 }).setOrigin(0.5);
                this.leaderboardTexts.push(t1);
                
                const res = await fetch(`${BACKEND_URL}/api/scores`);
                const data = await res.json();
                
                if (data.length === 0) {
                    const t = this.add.text(portraitWidth/2, 200, 'AÚN NO HAY PUNTAJES', { fontSize: '12px', fontFamily: '"Press Start 2P"', color: '#333' }).setOrigin(0.5);
                    this.leaderboardTexts.push(t);
                } else {
                    const topScores = data.slice(0, 12);
                    topScores.forEach((e, i) => {
                        const t = this.add.text(portraitWidth/2, 130 + (i*35), `${i+1}. ${e.name} - ${e.score}`, { fontSize: '13px', fontFamily: '"Press Start 2P"', color: '#333' }).setOrigin(0.5);
                        this.leaderboardTexts.push(t);
                    });
                }
            }
        } catch (e) {
            const t = this.add.text(portraitWidth/2, 250, 'No se pudo conectar con\nel servidor de puntajes', { fontSize: '10px', fontFamily: '"Press Start 2P"', color: '#333', align: 'center' }).setOrigin(0.5);
            this.leaderboardTexts.push(t);
        }
    }
}

const config = {
    type: Phaser.CANVAS,
    pixelArt: true,
    roundPixels: true,
    clearBeforeRender: true,
    width: portraitWidth,
    height: portraitHeight,
    parent: 'game-container',
    backgroundColor: '#87CEEB',
    dom: {
        createContainer: true
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        orientation: Phaser.Scale.Orientation.PORTRAIT
    },
    physics: { 
        default: 'arcade', 
        arcade: { gravity: { y: 0 }, debug: false } 
    },
    scene: [BootScene, MenuScene, RoomMenuScene, LobbyScene, LevelEditorScene, GameScene, GameOverScene]
};
const game = new Phaser.Game(config);
