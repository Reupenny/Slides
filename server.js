const express = require('express');
const fs = require('fs');
const path = require('path');

const { spawn, exec } = require('child_process');
const app = express();
const port = 3000;

app.use(express.static(__dirname));
app.use(express.json()); // for parsing application/json

app.get('/images', (req, res) => {
    const imagesPath = path.join(__dirname, 'photos');
    fs.readdir(imagesPath, (err, files) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error reading images folder');
        }
        const imageFiles = files.filter(file => ['.jpg', '.jpeg', '.png', '.gif', '.heic'].includes(path.extname(file).toLowerCase()));
        const imagePaths = imageFiles.map(file => 'photos/' + file);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.json(imagePaths);
    });
});

app.get('/start-caffeinate', (req, res) => {
    if (process.platform === 'darwin') {
        const caffeinateProcess = spawn('caffeinate', ['-d']);

        caffeinateProcess.on('error', (err) => {
            console.error('Failed to start caffeinate:', err);
            return res.status(500).json({ error: 'Failed to start caffeinate' });
        });

        console.log('Caffeinate process started');
        res.json({ pid: caffeinateProcess.pid });
    } else {
        console.log('Caffeinate not supported on this platform.');
        res.json({ pid: null, message: 'Caffeinate not supported on this platform.' });
    }
});

app.get('/stop-caffeinate', (req, res) => {
    const pid = req.query.pid;

    if (!pid) {
        return res.status(400).json({ error: 'PID is required' });
    }

    exec(`kill ${pid}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error killing process ${pid}: ${error}`);
            return res.status(500).json({ error: `Failed to kill process ${pid}` });
        }
        console.log(`Process ${pid} killed`);
        res.json({ message: `Process ${pid} killed` });
    });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
