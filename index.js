// Import essential libraries 
import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import fs from "fs";
import cors from "cors";

const app = express(); 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static('public'));
app.use(bodyParser.json());
app.get('/api/textJson', function(req, res) {
     const text = req.query.text;
     res.send(text);
});
app.get("/api/listDocuments", function (req, res) {
     fs.readdir(path.join(__dirname + "/data/"), (err, files) => {
          res.send({ files: files });
     });
});
app.get('/api/loadDocumentJson', function(req, res) {
     const filename = req.query.filename;
     const filepath = path.join(__dirname + "/data/" + filename);
     const data = fs.readFileSync(filepath);
     const json = JSON.parse(data);
     res.send({
          Success: true,
          Data: json
     });
});
app.post('/api/saveDocumentJson', function(req, res) {
     const json = req.body;
     fs.writeFileSync(json.filename, json.document);
});
app.get('/', function(req, res) { 
     res.sendFile(path.join(__dirname + '/public/index.html')); 
}); 
app.listen(process.env.port || 3002); 
console.log('Running at Port 3002'); 