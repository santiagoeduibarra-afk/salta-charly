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
const supabaseUrl = process.env.SUPABASE_URL || 'https://eebmkgkuwpnqgublhkal.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_8gWuo2HOVJp68me-xvtuDw_b3XVesZq';
const supabase = createClient(supabaseUrl, supabaseKey);

const io = new Server(server, {
    cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/leaderboard', async (req, res) => {
    const room = req.query.room;
    let query = supabase.from('scores').select('name, score').order('score', { ascending: false }).limit(10);

    if (room && room.trim() !== '') {
        query = query.eq('room_code', room.trim().toLowerCase());
    }

    const { data, error } = await query;

    if (error) {
        return res.status(500).json({ error: error.message });
    }
    
    // Map data to match existing frontend expectations if needed, Supabase returns [{name: '...', score: 123}] which matches perfectly.
    res.json(data);
});

app.post('/api/score', async (req, res) => {
    const { name, score, room } = req.body;
    let meters = typeof req.body.meters === 'number' ? req.body.meters : 0;
    
    if (!name || typeof score !== 'number') return res.status(400).json({ error: 'Invalid input' });
    
    const cleanName = name.substring(0, 10).toUpperCase();
    const cleanRoom = room ? room.trim().toLowerCase() : null;
    
    const { data, error } = await supabase.from('scores').insert([
        { 
            player_name: cleanName, // matching Phase 1 schema
            name: cleanName, // storing both for backwards compatibility with GET /api/leaderboard since I explicitly queried 'name'
            score: score, 
            meters: meters, 
            room_code: cleanRoom 
        }
    ]).select();

    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.json({ success: true, id: data[0].id });
});

// Socket.io Logic
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join_room', (data) => {
        if (!data || !data.room) return;
        const roomCode = data.room.trim().toLowerCase();
        socket.join(roomCode);
        console.log(`Socket ${socket.id} joined room ${roomCode}`);
        
        // Broadcast that someone joined (optional, can be used for lobby player counts)
        io.to(roomCode).emit('room_update', { message: 'A player joined the room.' });
    });

    socket.on('game_state_update', (data) => {
        if (!data || !data.room) return;
        const roomCode = data.room.trim().toLowerCase();
        // Broadcast the state (e.g. { name: 'Player', meters: 150 }) to everyone else in the room
        socket.to(roomCode).emit('game_state_update', data);
    });

    socket.on('game_over_request_sync', (data) => {
        if (!data || !data.room) return;
        const roomCode = data.room.trim().toLowerCase();
        console.log(`Triggering leaderboard refresh for room ${roomCode}`);
        // Tell everyone in the room to refresh their leaderboards
        io.to(roomCode).emit('force_leaderboard_refresh');
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running! Open http://localhost:${PORT} in your browser.`);
});