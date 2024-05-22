// Import essential libraries 
import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
const app = express(); 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static('public'));
app.get('/', function(req, res) { 
     res.sendFile(path.join(__dirname + '/public/index.html')); 
}); 
app.listen(process.env.port || 3002); 
console.log('Running at Port 3002'); 