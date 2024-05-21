// Import essential libraries 
import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
const app = express(); 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router(); 
// Setup essential routes 
router.get('/', function(req, res) { 
     res.sendFile(path.join(__dirname + '/public/index.html')); 
    //__dirname : It will resolve to your project folder. 
}); 
//add the router

app.use('/', router); 
app.use(express.static('public'));
app.listen(process.env.port || 3000); 
console.log('Running at Port 3000'); 