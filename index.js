import express from "express";
import path from "path";
import multer from 'multer'
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express(); 
app.use(bodyParser.json());
app.use(express.static('public'));
app.use("/templates", express.static('templates'));
app.use('/uploads', express.static('uploads'))

const storage = multer.diskStorage({
     destination: function (req, file, cb) {
       cb(null, 'uploads');
     },
     filename: function (req, file, cb) {
       cb(null, Date.now() + path.extname(file.originalname));
     },
});
   
const upload = multer({
     storage: storage,
     fileFilter: (req, file, cb) => {
          if (
               file.mimetype == 'image/png' ||
               file.mimetype == 'image/jpg' ||
               file.mimetype == 'image/jpeg'
          ) {
               cb(null, true);
          } else {
               cb(null, false);
               return cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
          }
     },
});
const uploadImages = upload.array('image');

app.post('/upload', function(req, res) {
     uploadImages(req, res, function (err) {
       if (err) {
         return res.status(400).send({ message: err.message });
       }
       // Everything went fine.
       const files = req.files;
       res.json(files);
     });
   });
   
app.get('/api/textJson', function(req, res) {
     const text = req.query.text;
     res.send(text);
});
app.get("/api/listDocuments", function (req, res) {
     const folder = req?.query?.folder || "data";
     fs.readdir(path.join(__dirname + "/" + folder + "/"), (err, files) => {
          res.send({ files: files });
     });
});
app.post('/api/addToGraph', async (req, res) => {
     const filename = req.body.filename;
     const id = req.body.id;
     const name = req.body.name;
     const filepath = path.join(__dirname + "/data/" + filename);
     const data = fs.readFileSync(filepath) || "{ nodes: [], edges: [] }";
     const json = JSON.parse(data);
     json.nodes.push({ id, name, type: "Entity" });
     console.log({ nodes: json.nodes });
     fs.writeFileSync(filepath, JSON.stringify(json));
     res.send({
          Success: true,
          Data: {
               document: json
          }
     });
});
app.get('/api/loadGraphJson', function(req, res) {
     const filename = req.query.filename;
     const filepath = path.join(__dirname + "/data/" + filename);
     const data = fs.readFileSync(filepath);
     const json = JSON.parse(data || "{ nodes: [], edges: [] }");
     res.send({
          Success: true,
          Data: {
               document: json
          }
     });
});
app.get('/api/loadDocumentJson', function(req, res) {
     const filename = req.query.filename;
     const folder = req.query?.folder || "data";
     const filepath = path.join(__dirname + "/" + folder + "/" + filename);
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