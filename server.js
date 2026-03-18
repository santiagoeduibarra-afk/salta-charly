const express = require('express');
const http = require('http');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Use a fallback for local testing, or environment variables in production
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.error('⚠️ ALERTA: Faltan credenciales de Supabase en el entorno. Los puntajes fallarán, pero Sockets seguirá activo.');
}
const supabaseUrl = process.env.SUPABASE_URL || 'https://eebmkgkuwpnqgublhkal.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_8gWuo2HOVJp68me-xvtuDw_b3XVesZq';
const supabase = createClient(supabaseUrl, supabaseKey);

const io = new Server(server, {
    cors: { origin: "*", methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => { 
    res.status(200).send('Backend de Salta Charly VIVO y escuchando.'); 
});

app.get('/api/scores', async (req, res) => {
    const { room } = req.query;
    let query = supabase.from('scores').select('*').order('score', { ascending: false }).limit(10);
    if (room && room.trim() !== '') {
        query = query.eq('room_code', room.trim().toLowerCase());
    }
    const { data, error } = await query;
    if (error) { return res.status(500).json({ error: error.message }); }
    res.json(data);
});

app.post('/api/scores', async (req, res) => {
    const { playerName, score, meters } = req.body;
    let fallbackMeters = typeof meters === 'number' ? meters : 0;
    
    if (!playerName || typeof score !== 'number') return res.status(400).json({ error: 'Invalid input' });
    
    const cleanName = playerName.substring(0, 10).toUpperCase();
    
    const { data, error } = await supabase.from('scores').insert([
        { 
            player_name: cleanName, 
            name: cleanName, 
            score: score, 
            meters: fallbackMeters
        }
    ]).select();

    if (error) {
        console.error("Supabase Error saving score:", error);
        return res.status(500).json({ error: error.message });
    }
    res.json({ success: true, id: data[0].id });
});

app.post('/api/room', async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Missing code' });
    const cleanCode = code.trim().toLowerCase();
    
    const { error } = await supabase.from('rooms').insert([{ code: cleanCode }]);
    
    res.json({ success: true, code: cleanCode });
});

// Socket.io Logic
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    const broadcastRoomPlayers = async (roomCode) => {
        const sockets = await io.in(roomCode).fetchSockets();
        io.to(roomCode).emit('room_players_update', { players: sockets.length });
    };

    socket.on('createRoom', async ({ roomName, roomPin }) => {
        if (!roomName || !roomPin) return;
        const name = roomName.trim().toLowerCase();
        const pin = String(roomPin).trim();
        
        console.log(`Socket ${socket.id} creating room '${name}' with PIN ${pin}`);
        socket.join(name);
        socket.emit('roomCreated', name);
        
        if (supabase) {
            // Upsert: if room exists, update pin; if not, create it
            const { error } = await supabase.from('rooms')
                .upsert([{ code: name, name: name, pin: pin }], { onConflict: 'code' });
            if (error) console.error("Supabase Error room creation:", error);
        }
        
        await broadcastRoomPlayers(name);
    });

    socket.on('joinRoom', async ({ roomName, roomPin }) => {
        if (!roomName || !roomPin) return;
        const name = roomName.trim().toLowerCase();
        const pin = String(roomPin).trim();
        
        if (supabase) {
            const { data, error } = await supabase.from('rooms')
                .select('pin').eq('code', name).single();
            
            if (error || !data) {
                socket.emit('joinError', 'Sala no encontrada.');
                return;
            }
            if (data.pin !== pin) {
                socket.emit('joinError', 'PIN incorrecto.');
                return;
            }
        }
        
        socket.join(name);
        console.log(`Socket ${socket.id} joined room '${name}'`);
        socket.emit('joinedRoom', name);
        await broadcastRoomPlayers(name);
    });

    socket.on('join_room', async (data) => {
        if (!data || !data.room) return;
        const roomCode = data.room.trim().toLowerCase();
        socket.join(roomCode);
        console.log(`Socket ${socket.id} joined room ${roomCode}`);
        await broadcastRoomPlayers(roomCode);
    });

    socket.on('game_state_update', (data) => {
        if (!data || !data.room) return;
        const roomCode = data.room.trim().toLowerCase();
        socket.to(roomCode).emit('game_state_update', data);
    });

    socket.on('game_over_request_sync', (data) => {
        if (!data || !data.room) return;
        const roomCode = data.room.trim().toLowerCase();
        console.log(`Triggering leaderboard refresh for room ${roomCode}`);
        io.to(roomCode).emit('force_leaderboard_refresh');
    });

    socket.on('disconnecting', async () => {
        for (const room of socket.rooms) {
            if (room !== socket.id) {
                const sockets = await io.in(room).fetchSockets();
                io.to(room).emit('room_players_update', { players: Math.max(0, sockets.length - 1) });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

server.listen(PORT, '0.0.0.0', () => { 
    console.log(`✅ Servidor levantado en puerto ${PORT}`); 
});