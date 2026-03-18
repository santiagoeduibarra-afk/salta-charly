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

function createPinkButton(scene, x, y, width, height, textStr, callback) {
    const btnContainer = scene.add.container(x, y);
    const bg = scene.add.rectangle(0, 0, width, height, 0xff69b4);
    const txt = scene.add.text(0, 0, textStr, { 
        fontSize: '14px', fontFamily: '"Press Start 2P"', color: '#FFFF00', align: 'center' 
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
        
        for (let i = 1; i <= 13; i++) {
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

        this.scene.start('MenuScene');
    }
}

class MenuScene extends Phaser.Scene {
    constructor() { super('MenuScene'); }
    create() {
        this.cameras.main.setBackgroundColor('#87CEEB');
        gameState.currentRoom = null; 
        
        try {
            if (!bgMusic) { bgMusic = this.sound.add('bgm', { loop: true, volume: 0.5 }); }
            if (!bgMusic.isPlaying) { bgMusic.play(); }
        } catch(e) {}

        this.add.text(portraitWidth/2, 200, 'SALTA\nCHARLY', { fontSize: '50px', fontFamily: '"Press Start 2P"', color: '#FFFF00', align: 'center', stroke: '#ff69b4', strokeThickness: 10 }).setOrigin(0.5);
        
        // FIX: Botón JUGAR unificado
        createPinkButton(this, portraitWidth/2, 450, 180, 50, 'JUGAR', () => {
            if (this.sound.context.state === 'suspended') { this.sound.context.resume(); }
            if (bgMusic && !bgMusic.isPlaying) { bgMusic.play(); }
            this.scene.start('GameScene');
        });

        // Botón SALAS PRIVADAS unificado
        createPinkButton(this, portraitWidth/2, 530, 280, 50, 'SALAS PRIVADAS', () => {
            this.scene.start('RoomsScene');
        });
    }
}

class RoomsScene extends Phaser.Scene {
    constructor() { super('RoomsScene'); }
    create() {
        console.log("Estado del Socket:", socket ? socket.connected : "No inicializado aún");
        this.cameras.main.setBackgroundColor('#87CEEB');

        this.add.text(portraitWidth/2, 100, 'SALAS', { fontSize: '30px', fontFamily: '"Press Start 2P"', color: '#FFFF00', stroke: '#ff69b4', strokeThickness: 6 }).setOrigin(0.5);

        createPinkButton(this, portraitWidth/2, 250, 300, 50, 'CREAR SALA NUEVA', () => {
            console.log("Clic detectado. Emitiendo createRoom...");
            console.log('Click en crear sala');
            
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let newCode = '';
            for (let i = 0; i < 4; i++) {
                newCode += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            const roomCode = newCode;
            gameState.currentRoom = roomCode;
            
            if (!socket || !socket.connected) { 
                alert("Error: No hay conexión con el servidor multijugador."); 
                return; 
            }
            
            socket.once('roomCreated', (code) => {
                this.scene.start('GameScene', { room: code, isHost: true });
            });
            
            socket.emit('createRoom', roomCode);
        });

        this.add.text(portraitWidth/2, 380, '- O UNITE A UNA -', { fontSize: '12px', fontFamily: '"Press Start 2P"', color: '#333' }).setOrigin(0.5);

        const domHTML = `
            <div style="text-align:center; width: 100%; margin: 0 auto; display: flex; flex-direction: column; align-items: center; pointer-events: none;">
                <input type="text" id="roomCodeIn" placeholder="CÓDIGO CHARLY" style="pointer-events: auto; padding:15px; width:220px; font-family:'Press Start 2P'; text-align:center; font-size:12px; border: 4px solid #ff69b4; outline: none; text-transform: lowercase; margin-bottom: 20px;">
                <button id="joinBtn" style="pointer-events: auto; padding:15px 30px; background:#ff69b4; color:#FFFF00; border: none; font-family:'Press Start 2P'; cursor:pointer; font-size: 14px;">UNIRSE</button>
            </div>
        `;
        this.domContainer = this.add.dom(portraitWidth/2, 500).createFromHTML(domHTML);

        document.getElementById('joinBtn').onclick = () => {
            const code = document.getElementById('roomCodeIn').value.trim().toLowerCase();
            if (code.length > 3) {
                gameState.currentRoom = code;
                this.scene.start('LobbyScene');
            } else {
                document.getElementById('roomCodeIn').style.borderColor = 'red';
            }
        };

        createPinkButton(this, portraitWidth/2, 700, 160, 50, 'VOLVER', () => {
            this.scene.start('MenuScene');
        });
    }
}

class LobbyScene extends Phaser.Scene {
    constructor() { super('LobbyScene'); }
    create() {
        this.cameras.main.setBackgroundColor('#87CEEB');

        const box = this.add.graphics();
        box.fillStyle(0xFFFFFF, 0.9); 
        box.fillRoundedRect(30, 150, portraitWidth - 60, 400, 16);
        box.lineStyle(6, 0xff69b4, 1); 
        box.strokeRoundedRect(30, 150, portraitWidth - 60, 400, 16);

        this.add.text(portraitWidth/2, 80, 'LOBBY PRIVADO', { fontSize: '20px', fontFamily: '"Press Start 2P"', color: '#FFFF00', stroke: '#ff69b4', strokeThickness: 5 }).setOrigin(0.5);
        
        // Prominent Code Display
        this.add.text(portraitWidth/2, 130, `${gameState.currentRoom.toUpperCase()}`, { fontSize: '26px', fontFamily: '"Press Start 2P"', color: '#FFFFFF', backgroundColor: '#333', padding: { x: 20, y: 10 } }).setOrigin(0.5);

        // Dynamic player count
        const playersText = this.add.text(portraitWidth/2, 180, 'JUGADORES: 1', { fontSize: '10px', fontFamily: '"Press Start 2P"', color: '#333' }).setOrigin(0.5);

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

        // Add pink buttons
        createPinkButton(this, portraitWidth/2, 350, 240, 50, 'EMPEZAR JUEGO', () => {
            if (this.sound.context.state === 'suspended') { this.sound.context.resume(); }
            if (bgMusic && !bgMusic.isPlaying) { bgMusic.play(); }
            this.scene.start('GameScene');
        });

        createPinkButton(this, portraitWidth/2, 450, 200, 50, 'COPIAR LINK', () => {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(`¡Sumate a mi sala en Salta Charly! Código: ${gameState.currentRoom.toUpperCase()}`);
            }
        });

        createPinkButton(this, portraitWidth/2, 600, 180, 50, 'SALIR', () => {
            if (socket) socket.disconnect();
            socket = null;
            this.scene.start('RoomsScene');
        });
    }
}

class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }
    
    create() {
        gameState.score = 0; 
        gameState.meters = 0;
        gameState.lives = 3;
        gameState.baseSpeed = 450;
        gameState.multiplier = 1;
        this.isInvulnerable = false;
        
        this.isTrippyMode = false;
        this.isAbducted = false; 
        this.ufoActive = false;
        this.pendingUfo = false; 
        
        this.isPushed = false; 
        this.lastCowSpawnMeter = 0; 
        this.ufoHoverY = 150; 

        this.hasParachute = false;
        this.lastBananaSpawnMeter = 0;
        this.parachuteTimer = null;

        this.cameras.main.setBackgroundColor('#87CEEB');

        try {
            if (!bgMusic) { bgMusic = this.sound.add('bgm', { loop: true, volume: 0.5 }); }
            if (!bgMusic.isPlaying) { bgMusic.play(); }
        } catch(e) {}

        this.player = this.physics.add.sprite(portraitWidth/2, 200, 'charly');
        this.player.setDisplaySize(75, 100);
        this.player.setOrigin(0.5, 0.5); 
        this.player.setDepth(20); 
        this.player.body.setSize(35, 80); 
        this.player.body.setOffset(20, 10); 
        this.player.lastX = this.player.x; 

        this.player.lastParachuteTexture = 'banana3'; 

        this.pools = this.physics.add.group();
        this.peaceItems = this.physics.add.group();
        this.clouds = this.physics.add.group();
        this.cows = this.physics.add.group(); 
        this.bananas = this.physics.add.group(); 
        this.effects = this.add.group(); 

        this.heartIcons = this.add.group();
        this.updateHeartsUI();
        
        if (gameState.currentRoom) {
            this.add.text(portraitWidth/2, 15, `SALA: ${gameState.currentRoom.toUpperCase()}`, { fontSize: '10px', fontFamily: '"Press Start 2P"', color: '#333' }).setOrigin(0.5).setDepth(30);
        }

        this.meterText = this.add.text(20, 30, '0m', { fontSize: '24px', fontFamily: '"Press Start 2P"', color: '#FFFF00', stroke: '#ff69b4', strokeThickness: 4 }).setDepth(30);
        this.scoreText = this.add.text(20, 65, 'SCORE: 0', { fontSize: '16px', fontFamily: '"Press Start 2P"', color: '#FFFF00', stroke: '#ff69b4', strokeThickness: 3 }).setDepth(30);

        // Multiplayer UI indicator
        if (gameState.currentRoom && socket) {
            this.otherMetersText = this.add.text(portraitWidth - 20, 30, '', { fontSize: '12px', fontFamily: '"Press Start 2P"', color: '#FFF', stroke: '#000', strokeThickness: 2, align: 'right' }).setOrigin(1, 0).setDepth(30);
            
            socket.on('game_state_update', (data) => {
                otherPlayers[data.id] = data;
                this.updateOtherPlayersUI();
            });

            // Emit our state every 1 second
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

        this.time.addEvent({ delay: 2200, callback: this.spawnObstacles, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 600, callback: this.spawnCloud, callbackScope: this, loop: true });
        
        this.time.addEvent({ delay: 60000, callback: () => {
            if (!this.ufoActive && !this.isTrippyMode && !this.isAbducted) {
                this.pendingUfo = true;
            }
        }, callbackScope: this, loop: true });

        this.input.on('pointermove', (pointer) => {
            const isUfoBlocking = this.ufoActive && this.ufo && (this.ufo.state === 'approaching' || this.ufo.state === 'abducting');
            if (!this.isInvulnerable && !this.isAbducted && !isUfoBlocking && !this.isPushed) { 
                this.player.x = Phaser.Math.Clamp(pointer.x, 37.5, portraitWidth - 37.5);
            }
        });
        this.cursors = this.input.keyboard.createCursorKeys();
        
        this.physics.add.overlap(this.player, this.cows, this.hitCow, null, this);
        this.physics.add.overlap(this.player, this.bananas, this.collectBanana, null, this); 
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
            this.heartIcons.create(portraitWidth - 40 - (i*40), 50, 'heart').setScale(1.5).setDepth(30);
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
        if (!banana.active) return;
        banana.active = false;
        banana.destroy();
        
        try { this.sound.play('splash'); } catch(e) {} 
        
        this.hasParachute = true;

        let deltaX = this.player.x - this.player.lastX;
        if (deltaX < -0.1 || this.cursors.left.isDown) {
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
        try { this.sound.play('moo_sound'); } catch(e) {}
        
        const fromLeft = Phaser.Math.Between(0, 1) === 0;
        const startX = fromLeft ? -50 : portraitWidth + 50;
        const startY = portraitHeight + Phaser.Math.Between(50, 150);
        
        const cow = this.cows.create(startX, startY, 'vaca1');
        cow.setDisplaySize(130, 130); 
        cow.setDepth(25); 
        
        const angle = Phaser.Math.Angle.Between(startX, startY, this.player.x, this.player.y);
        const speed = Phaser.Math.Between(350, 450); 
        cow.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed); 
        
        if (cow.body.velocity.x < 0) { cow.setFlipX(true); }
        
        cow.play('cow_fly');
    }

    hitCow(player, cow) {
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
        if (this.ufoActive || this.isTrippyMode) return;
        
        try { this.sound.play('ufo_sound'); } catch(e) {}
        
        if (!this.textures.exists('ufo1')) { 
            console.error('Falta textura UFO'); 
            return; 
        }

        this.ufoActive = true;
        this.ufo = this.physics.add.sprite(this.player.x, -100, 'ufo1'); 
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
                                    
                                    this.player.x = this.ufo.x;
                                    this.player.y = this.ufo.y + 5; 
                                    
                                    if (this.player.clearTint) { this.player.clearTint(); }
                                    
                                    this.tweens.add({
                                        targets: this.player,
                                        y: 200, 
                                        displayWidth: 75,
                                        displayHeight: 100,
                                        angle: 0,
                                        alpha: 1, 
                                        duration: 600,
                                        ease: 'Cubic.out',
                                        onComplete: () => {
                                            this.isAbducted = false;
                                            this.ufo.state = 'leaving';

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

    spawnObstacles() {
        if (this.ufoActive) return;

        const currentSpeed = gameState.baseSpeed + (gameState.meters * 0.05);

        if (Phaser.Math.Between(1, 10) <= 7) {
            const poolX = portraitWidth/2 + Phaser.Math.Between(-100, 100); 
            const pool = this.pools.create(poolX, 900, 'pool');
            pool.evaluated = false; 
            pool.isSafe = false;
            pool.cleared = false; 
            pool.setDepth(1); 

            let scaleDrops = Math.floor(gameState.meters / 1000);
            let poolScale = Math.max(0.16, 0.33 - (scaleDrops * 0.05)); 
            pool.setScale(poolScale);

            pool.isMoving = Phaser.Math.Between(1, 10) <= 4;
            if (pool.isMoving) {
                pool.moveDir = Phaser.Math.Between(0, 1) === 0 ? 1 : -1;
                pool.moveSpeed = Phaser.Math.FloatBetween(2, 4);
            }
        }

        if (Phaser.Math.Between(1, 10) <= 4) {
            const peaceX = Phaser.Math.Between(50, portraitWidth - 50);
            const peace = this.peaceItems.create(peaceX, 1000, 'peace');
            const scaleFactor = 45 / peace.width;
            peace.setScale(scaleFactor);
            peace.setDepth(6);
            peace.active = true;
        }
    }

    spawnCloud() {
        const edgeX = Phaser.Math.Between(-50, portraitWidth + 50);
        const cloud = this.clouds.create(edgeX, 900, 'fluffy_cloud');
        
        cloud.speedMult = Phaser.Math.FloatBetween(0.6, 1.1); 
        cloud.setScale(Phaser.Math.FloatBetween(0.8, 2.5)); 
        
        const cloudDepth = Phaser.Math.Between(1, 25);
        cloud.setDepth(cloudDepth);
        
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
        
        const randomAudio = Phaser.Math.Between(1, 13);
        try { this.sound.play(`audio${randomAudio}`); } catch(e) {}
        
        peace.destroy(); 
        
        const points = 10 * gameState.multiplier;
        gameState.score += points;
        this.scoreText.setText('SCORE: ' + gameState.score + (gameState.multiplier > 1 ? ' (10X)' : ''));
        
        const popup = this.add.text(px, py - 40, '+' + points, { fontSize: '16px', fontFamily: '"Press Start 2P"', color: '#FFFF00', stroke: '#ff69b4', strokeThickness: 4 }).setOrigin(0.5).setDepth(30);
        this.tweens.add({ targets: popup, y: popup.y - 50, alpha: 0, duration: 600, onComplete: () => popup.destroy() });
    }

    update(time, delta) {
        if (this.isInvulnerable) return;

        if (gameState.meters - this.lastBananaSpawnMeter >= 800) {
            this.lastBananaSpawnMeter = gameState.meters;
            if (!this.ufoActive && !this.pendingUfo && !this.isTrippyMode && !this.isAbducted && !this.hasParachute) {
                this.spawnBanana();
            }
        }

        if (gameState.meters - this.lastCowSpawnMeter >= 500) {
            this.lastCowSpawnMeter = gameState.meters;
            if (!this.ufoActive && !this.pendingUfo && !this.isTrippyMode && !this.isAbducted) {
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
            if (this.cursors.left.isDown) this.player.x -= 6;
            if (this.cursors.right.isDown) this.player.x += 6;
            this.player.x = Phaser.Math.Clamp(this.player.x, 37.5, portraitWidth - 37.5);
            deltaX = this.player.x - this.player.lastX;
        }

        let currentSpeed = gameState.baseSpeed + (gameState.meters * 0.05);
        const speedMod = this.hasParachute ? 0.5 : 1; 
        const actualSpeed = currentSpeed * speedMod;

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

        this.pools.getChildren().forEach(pool => pool.setVelocityY(-actualSpeed));
        this.peaceItems.getChildren().forEach(peace => peace.setVelocityY(-actualSpeed));
        this.bananas.getChildren().forEach(banana => banana.setVelocityY(-actualSpeed));
        this.clouds.getChildren().forEach(cloud => cloud.setVelocityY(-(actualSpeed * cloud.speedMult)));

        [...this.peaceItems.getChildren()].forEach(peace => {
            if (!peace.active) return;
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, peace.x, peace.y);
            if (dist < 65) {
                this.collectPeace(this.player, peace);
            }
        });

        const charlyBottom = this.player.y + (this.player.displayHeight / 2);
        const charlyTop = this.player.y - (this.player.displayHeight / 2);

        [...this.pools.getChildren()].forEach(pool => {
            if (pool.isMoving && !pool.evaluated) {
                pool.x += pool.moveDir * pool.moveSpeed;
                const halfWidth = (pool.displayWidth / 2);
                if (pool.x - halfWidth < 0) {
                    pool.moveDir = 1;
                } else if (pool.x + halfWidth > portraitWidth) {
                    pool.moveDir = -1;
                }
            }

            const poolTop = pool.y - (pool.displayHeight / 2);
            const poolBottom = pool.y + (pool.displayHeight / 2);

            if (!pool.evaluated && charlyBottom >= poolTop && charlyTop <= poolBottom) {
                pool.evaluated = true;
                
                const charlyLeft = this.player.x - (this.player.body.width / 2);
                const charlyRight = this.player.x + (this.player.body.width / 2);
                const safeWaterWidth = pool.displayWidth * 0.80;
                const waterLeft = pool.x - (safeWaterWidth / 2); 
                const waterRight = pool.x + (safeWaterWidth / 2);

                if (this.isAbducted || this.hasParachute || (charlyLeft >= waterLeft && charlyRight <= waterRight)) {
                    pool.isSafe = true; 
                    this.handleSuccess(pool);

                    if (!this.isAbducted) {
                        this.tweens.add({
                            targets: this.player,
                            displayWidth: 0,
                            displayHeight: 0,
                            alpha: 0,
                            duration: 350,
                            ease: 'Cubic.out'
                        });
                    }
                } else {
                    pool.isSafe = false; 
                    this.triggerFail(this.player, pool, "CRASH");
                }
            }

            if (pool.evaluated && pool.isSafe && !pool.cleared && poolBottom < charlyTop) {
                pool.cleared = true;
                
                if (!this.isAbducted) {
                    this.tweens.add({ 
                        targets: this.player, 
                        displayWidth: this.hasParachute ? 170 : 75,
                        displayHeight: this.hasParachute ? 170 : 100,
                        alpha: 1, 
                        duration: 300,
                        ease: 'Cubic.out',
                        onComplete: () => {
                            if (this.hasParachute) {
                                this.player.setDisplaySize(170, 170);
                            } else {
                                this.player.setDisplaySize(75, 100);
                            }

                            if (this.pendingUfo && !this.hasParachute) {
                                this.pendingUfo = false;
                                this.spawnUFO();
                            }
                        }
                    });
                } else {
                    if (this.pendingUfo && !this.hasParachute) {
                        this.pendingUfo = false;
                        this.spawnUFO();
                    }
                }
            }
        });
        
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
        garbageCollectGroup(this.peaceItems);
        garbageCollectGroup(this.bananas);
        garbageCollectGroup(this.clouds);
        garbageCollectGroup(this.cows);
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
        
        this.domMenu = this.add.dom(portraitWidth/2, portraitHeight/2).createFromHTML(domHTML);

        document.getElementById('saveBtn').onclick = async () => {
            const btn = document.getElementById('saveBtn');
            const name = document.getElementById('nameIn').value.toUpperCase() || 'ANON';
            localStorage.setItem('charlyName', name); 
            
            btn.innerText = 'GUARDANDO...';
            
            try {
                const req = await fetch(`${BACKEND_URL}/api/scores`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ 
                        playerName: name, 
                        score: gameState.score,
                        meters: Math.floor(gameState.meters)
                    })
                });
                
                if (!req.ok) throw new Error('Fetch failed');

                if (gameState.currentRoom && socket) {
                    socket.emit('game_over_request_sync', { room: gameState.currentRoom });
                }
                
                this.domMenu.destroy();
                this.showLeaderboard();
            } catch (e) {
                btn.innerText = 'ERROR AL GUARDAR';
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
                
                // Cargar Top Room
                const dataRoom = await resRoom.json();
                const topRoom = dataRoom.slice(0, 5);
                topRoom.forEach((e, i) => {
                    const t = this.add.text(portraitWidth/2, 120 + (i*30), `${i+1}. ${e.name} - ${e.score}`, { fontSize: '12px', fontFamily: '"Press Start 2P"', color: '#333' }).setOrigin(0.5);
                    this.leaderboardTexts.push(t);
                });
                
                // Cargar Top Global
                const dataGlobal = await resGlobal.json();
                const topGlobal = dataGlobal.slice(0, 5);
                topGlobal.forEach((e, i) => {
                    const t = this.add.text(portraitWidth/2, 320 + (i*30), `${i+1}. ${e.name} - ${e.score}`, { fontSize: '12px', fontFamily: '"Press Start 2P"', color: '#333' }).setOrigin(0.5);
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
            const t = this.add.text(portraitWidth/2, 250, 'NO CONNECTION', { fontSize: '14px', fontFamily: '"Press Start 2P"', color: '#333', align: 'center' }).setOrigin(0.5);
            this.leaderboardTexts.push(t);
        }
    }
}

const config = {
    type: Phaser.CANVAS,
    clearBeforeRender: true,
    width: portraitWidth,
    height: portraitHeight,
    parent: 'game-container',
    backgroundColor: '#87CEEB',
    dom: { createContainer: true },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: { default: 'arcade' },
    scene: [BootScene, MenuScene, RoomsScene, LobbyScene, GameScene, GameOverScene]
};
const game = new Phaser.Game(config);
