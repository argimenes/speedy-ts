import express, { Request, Response } from "express";
import path from "path";
import multer, { FileFilterCallback } from 'multer';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import fs from "fs";
import { Surreal } from "surrealdb";
import { BlockType, IBlockDto, IndexedBlock } from "./types";

let db: Surreal | undefined;

type Document ={
  id: string;
  name: string;
  filename: string;
  metadata: {};
}

export async function initDb(): Promise<Surreal | undefined> {
    if (db) return db;
    db = new Surreal();
    try {
        await db.connect("http://127.0.0.1:8000/rpc", {
          namespace: "codex-ns", database: "codex-db",
          auth: {
            username: "root",
            password: "root"
          }
        });
        return db;
    } catch (err) {
        console.error("Failed to connect to SurrealDB:", err);
        throw err;
    }
}

export async function closeDb(): Promise<void> {
  if (!db) return;
  await db.close();
  db = undefined;
}

export function getDb(): Surreal | undefined {
  return db;
}

await initDb();

type MulterRequest = Request & { files: Express.Multer.File[] };

interface GraphData {
  nodes: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  edges: Array<any>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(bodyParser.json());
app.use(express.static('dist'));
app.use("/templates", express.static('templates'));
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
  destination: function (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) {
    cb(null, 'uploads');
  },
  filename: function (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
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

app.post('/upload', function(req: Request, res: Response) {
  uploadImages(req, res, function (err: any) {
    if (err) {
      return res.status(400).send({ message: err.message });
    }
    const files = (req as MulterRequest).files;
    res.json(files);
  });
});

app.get('/api/textJson', function(req: Request, res: Response) {
  const text = req.query.text as string;
  res.send(text);
});

app.get("/api/listDocuments", function (req: Request, res: Response) {
  const folder = (req.query?.folder as string) || "data";
  console.log("/api/listDocuments", { __dirname, folder });
  fs.readdir(path.join(__dirname, "../../" + folder), (err, files) => {
    res.send({ files: files });
  });
});

app.post('/api/graph/update-entity-references', async (req: Request, res: Response) => {
  const { filename, nodes, edges } = req.body;
  const filepath = path.join(__dirname, "../../data", filename);
  const data = fs.readFileSync(filepath, 'utf8') || "{ \"nodes\": [], \"edges\": [] }";
  const json: GraphData = JSON.parse(data);
  json.edges.push(...edges);
  json.nodes.push(...nodes);
  fs.writeFileSync(filepath, JSON.stringify(json));
  res.send({ Success: true });
});

app.post('/api/addToGraph', async (req: Request, res: Response) => {
  const { filename, id, name } = req.body;
  const filepath = path.join(__dirname, "../../data", filename);
  const data = fs.readFileSync(filepath, 'utf8') || "{ \"nodes\": [], \"edges\": [] }";
  const json: GraphData = JSON.parse(data);
  json.nodes.push({ id, name, type: "Entity" });
  fs.writeFileSync(filepath, JSON.stringify(json));
  res.send({
    Success: true,
    Data: {
      document: json
    }
  });
});

app.get('/api/loadGraphJson', function(req: Request, res: Response) {
  const filename = req.query.filename as string;
  const filepath = path.join(__dirname, "../../data", filename);
  const data = fs.readFileSync(filepath, 'utf8');
  const json: GraphData = JSON.parse(data || "{ \"nodes\": [], \"edges\": [] }");
  res.send({
    Success: true,
    Data: {
      document: json
    }
  });
});

app.get('/api/loadDocumentJson', function(req: Request, res: Response) {
  const filename = req.query.filename as string;
  const folder = (req.query?.folder as string) || "data";
  const filepath = path.join(__dirname, "../../", folder, filename);
  const data = fs.readFileSync(filepath, 'utf8');
  const json = JSON.parse(data);
  res.send({
    Success: true,
    Data: {
      document: json
    }
  });
});

app.post('/api/saveDocumentJson', async function(req: Request, res: Response) {
  const json = req.body;
  const filepath = path.join(__dirname, "../../data", json.filename);
  const document = JSON.stringify(json.document);
  fs.writeFileSync(filepath, document);
  const doc = json.document as IBlockDto;
  doc.metadata = { filepath };
  doc.lastUpdated = new Date();
  await saveDocumentToGraph(doc);
  res.send({
    Success: true
  });
});

const generateIndex = (doc: IBlockDto): IndexedBlock[] => {
  const result: IndexedBlock[] = [];
  function traverse(block: IBlockDto, depth: number = 0, path: string = '0'): void {
      // Visit the current node
      result.push({ block, index: result.length, depth, path });
      // Recursively traverse all children
      block.children.forEach((child, index) => {
          traverse(child, depth + 1, `${path}.${index + 1}`);
      });
  }
  traverse(doc);
  return result;
}

const saveDocumentToGraph = async (doc: IBlockDto) => {
  /**
   * 
   * 
   */
  const blocks = generateIndex(doc);
  await saveDocumentBlock(doc);
  // await updateDocument();
  await selectDocuments();
}

const selectDocuments = async () => {
  const result = await db.query(`
      SELECT * FROM Document;
    `)
  console.log("selectDocuments", { result: result[0][0] });
}

const updateDocument = async () => {
  const result = await db.query(`
UPDATE Document:\`Document:abc\` CONTENT {
    type: "main-list-item-3"
};`);
    console.log("updateDocument", { result: result[0][0] });
}

const saveDocumentBlock = async (doc: IBlockDto) => {
  const find = await db.query(
    `SELECT id FROM type::thing("Document",$blockId);`
  , { blockId: doc.id })[0];
  console.log("saveDocumentBlock", { id: find, doc });

  if (find) {
    const update = await db.query(
      `UPDATE type::thing("Document",$blockId) CONTENT {
          type: $type,
          metadata: $metadata,
          blockProperties: $blockProperties
       };`, {
        blockId: doc.id,
        type: doc.type,
        metadata: doc.metadata,
        blockProperties: doc.blockProperties
      });
      console.log("saveDocumentBlock", { update: update[0][0], doc });
  } else {
    const create = await db.query(
      `CREATE type::thing("Document",$blockId) CONTENT {
        type: $type,
        metadata: $metadata,
        blockProperties: $blockProperties
    }`, {
        blockId: doc.id,
        type: doc.type,
        metadata: doc.metadata,
        blockProperties: doc.blockProperties
      });
      console.log("saveDocumentBlock", { create: create[0][0], doc });
  }
}

app.get('/', function(req: Request, res: Response) {
  res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/graph/get-documents', async function(req: Request, res: Response) {
  const _db = await getDb();
  const results = await _db.query<Document[]>("SELECT * FROM Document");
  const json = JSON.stringify(results);
  res.send({
    Success: true,
    Data: json
  });
});

const port = process.env.PORT || 3002;
app.listen(port);
console.log('Running at Port ' + port);