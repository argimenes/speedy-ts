// Import essential libraries 
import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import fs from "fs";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express(); 
app.use(bodyParser.json());
app.use(express.static('public'));
app.get('/api/textJson', function(req, res) {
     const text = req.query.text;
     res.send(text);
});
app.get("/api/listDocuments", function (req, res) {
     fs.readdir(path.join(__dirname + "/data/"), (err, files) => {
          res.send({ files: files });
     });
});
app.get('/api/loadGraphJson', function(req, res) {
     const filename = req.query.filename;
     const filepath = path.join(__dirname + "/data/" + filename);
     const data = fs.readFileSync(filepath);
     const json = JSON.parse(data);
     res.send({
          Success: true,
          Data: {
               document: json
          }
     });
});
app.get('/api/loadDocumentJson', function(req, res) {
     const filename = req.query.filename;
     const filepath = path.join(__dirname + "/data/" + filename);
     const data = fs.readFileSync(filepath);
     const json = JSON.parse(data);
     res.send({
          Success: true,
          Data: {
               document: json
          }
     });
});
app.post('/api/saveDocumentJson', function(req, res) {
     const json = req.body;
     const filepath = path.join(__dirname + "/data/" + json.filename);
     const document = JSON.stringify(json.document);
     fs.writeFileSync(filepath, document);
     res.send({
          Success: true
     });
});
app.get('/', function(req, res) { 
     res.sendFile(path.join(__dirname + '/public/index.html')); 
}); 
const port = process.env.port || 3002
app.listen(port); 
console.log('Running at Port ' + port); 