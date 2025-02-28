const express = require('express');
const { SerialPort } = require('serialport');
const WebSocket = require('ws');
const http = require('http');
const port = 3000;

const expressApp = express();
const server = http.createServer(expressApp);
const wss = new WebSocket.Server({ noServer: true });

let serialPort;
let isSerialPortOpen = false;

expressApp.use(express.static('public'));

wss.on('connection', (ws) => {
    console.log('Cliente conectado');
    if (serialPort) {
        serialPort.on('data', (data) => {
            try {
                const rawData = data.toString();
                console.log('Datos recibidos: ' + rawData);
                const peso = rawData.match(/[\d.]+/);
                if (peso) {
                    const pesoNumerico = peso[0];
                    console.log('Peso filtrado: ' + pesoNumerico);
                    ws.send(pesoNumerico);
                }
            } catch (error) {
                console.error('Error al procesar los datos:', error);
                ws.send('Error al procesar los datos');
            }
        });
    }
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

function startServer() {
    try {
        // Cambia 'COM6' al puerto correcto donde está conectada tu báscula
        serialPort = new SerialPort({
            path: 'COM6', // Cambia esto al puerto correcto
            baudRate: 9600, // Asegúrate de que coincida con la configuración de la báscula
            autoOpen: false // No abrir automáticamente el puerto
        });

        serialPort.on('error', (err) => {
            console.error('Error en el puerto serial: ', err.message);
        });

        if (!isSerialPortOpen) {
            serialPort.open((err) => {
                if (err) {
                    console.error('Error al abrir el puerto serial: ', err.message);
                } else {
                    console.log('Puerto serial abierto');
                    isSerialPortOpen = true;
                }
            });
        } else {
            console.log('El puerto serial ya está abierto por otra instancia.');
        }

        server.listen(port, () => {
            console.log(`Servidor escuchando en http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Error al iniciar el servidor: ', error.message);
    }
}

function stopServer() {
    // Cerrar el servidor WebSocket
    wss.close(() => {
        console.log('Servidor WebSocket cerrado');
    });

    // Cerrar el servidor HTTP
    server.close(() => {
        console.log('Servidor HTTP cerrado');
    });

    // Cerrar el puerto serial si está abierto
    if (serialPort && serialPort.isOpen) {
        serialPort.close((err) => {
            if (err) {
                console.error('Error al cerrar el puerto serial: ', err.message);
            } else {
                console.log('Puerto serial cerrado');
                isSerialPortOpen = false;
            }
        });
    }
}

module.exports = { startServer, stopServer };