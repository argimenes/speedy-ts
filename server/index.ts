import express, { Request, Response } from "express";
import path from "path";
import multer, { FileFilterCallback } from 'multer';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import fs from "fs";
import { BlockType, IBlockDto, IndexedBlock } from "./types";
import { IBlock } from "../src/library/types";
import { RecordId, Surreal } from "surrealdb";
let db: Surreal | undefined;

type Document ={
  id: string;
  name: string;
  filename: string;
  metadata: {};
}

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

export async function restoreDatabase() {
  await db.query("REMOVE DATABASE IF EXISTS `codex-db`;");
  await db.query("DEFINE DATABASE `codex-db`;");
  const agents = await loadAgents();
  await saveAgents(agents);
  const claims = await loadClaims();
  await saveClaims(claims);
  const concepts = await loadConcepts();
  await saveConcepts(concepts);
  /**
   * Insert relationships
   */
  const subsetOfConcepts = await loadSubsetOfConcepts();
  await saveSubsetOfConcepts(subsetOfConcepts);
}
interface IConceptDto {
  Guid: string;
  Name: string;
  Code: string;
  IsDeleted: boolean;
}
interface IClaimDto {
  Guid: string;
  Name: string;
  Role: string|null;
  IsDeleted: boolean;
}
interface IAgentDto {
  Guid: string;
  Name: string;
  AgentType: string;
  IsDeleted: boolean;
}
type Agent = {
  id: string;
  name: string;
  type: string;
  deleted: boolean;
}
type Concept = {
  id: string;
  name: string;
  code: string;
  deleted: boolean;
}
type Claim = {
  id: string;
  name: string;
  role: string;
  deleted: boolean;
}

const toId = (guid: string) => guid;

export async function saveConcepts(claims: IConceptDto[]) {
  for (const node of claims) {
    const recordId = new RecordId("Concept", toId(node.Guid));
    const data = {
      name: node.Name,
      code: node.Code,
      deleted: node.IsDeleted
    } as any;
    await db.create<Concept>(recordId, data);
  }
}

type ConceptDto = {
  Guid: string;
  Name: string;
  Code: string;
}

type SubsetOfConceptDto = {
  IsPrimary: boolean;
  Source: ConceptDto;
  Target: ConceptDto;
}

type SubsetOfConcept = {
	//id: RecordId<"SubsetOfConcept">;
	in: RecordId<"Concept">;
	out: RecordId<"Concept">;
  primary: boolean;
};

export async function saveSubsetOfConcepts(relations: SubsetOfConceptDto[]) {
  for (const relation of relations) {
    const sourceId = new RecordId("Concept", toId(relation.Source.Guid));
    const targetId = new RecordId("Concept", toId(relation.Target.Guid));
    await db.insert_relation<SubsetOfConcept>('subset_of_concept', {
      in: sourceId,
      out: targetId,
      primary: relation.IsPrimary
    });
  }
}

export async function saveClaims(claims: IClaimDto[]) {
  for (const node of claims) {
    const recordId = new RecordId("Claim", toId(node.Guid));
    const data = {
      name: node.Name,
      role: node.Role,
      deleted: node.IsDeleted
    } as any;
    await db.create<Claim>(recordId, data);
  }
}

export async function saveAgents(agents: IAgentDto[]) {
  for (const node of agents) {
    const recordId = new RecordId("Agent", toId(node.Guid));
    const data = {
      name: node.Name,
      type: node.AgentType,
      deleted: node.IsDeleted
    } as any;
    await db.create<Agent>(recordId, data);
  }
}

export async function closeDb(): Promise<void> {
  if (!db) return;
  await db.close();
  db = undefined;
}

await initDb();

const app = express();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('dist'));
app.use("/templates", express.static('templates'));
app.use('/uploads', express.static('uploads'));
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));


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
  const folder = (req.query?.folder as string) || ".";
  fs.readdir(path.join(__dirname, baseDocumentPath, folder), (err, files) => {
    res.send({ files: files });
  });
});

app.get("/api/listFolders", function (req: Request, res: Response) {
  const folders = listFolders();
  res.send({ folders });
});

const baseGraphPath = "../../../codex-data";
const baseDocumentPath = "../../../codex-data/data";

app.post('/api/graph/update-entity-references', async (req: Request, res: Response) => {
  const { filename, nodes, edges } = req.body;
  const filepath = path.join(__dirname, baseGraphPath, filename);
  const data = fs.readFileSync(filepath, 'utf8') || "{ \"nodes\": [], \"edges\": [] }";
  const json: GraphData = JSON.parse(data);
  json.edges.push(...edges);
  json.nodes.push(...nodes);
  fs.writeFileSync(filepath, JSON.stringify(json));
  res.send({ Success: true });
});

app.post('/api/addToGraph', async (req: Request, res: Response) => {
  const { filename, id, name } = req.body;
  const filepath = path.join(__dirname, baseGraphPath, filename);
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
  const filepath = path.join(__dirname, baseGraphPath, filename);
  const data = fs.readFileSync(filepath, 'utf8');
  const json: GraphData = JSON.parse(data || "{ \"nodes\": [], \"edges\": [] }");
  res.send({
    Success: true,
    Data: {
      document: json
    }
  });
});

let agents: any[] = [];

const setAgents = () =>{
  const filepath = path.join(__dirname, baseGraphPath, "graph", "nodes", "agents.json");
  const data = fs.readFileSync(filepath, 'utf8');
  agents = JSON.parse(data);
}

const loadAgents = () =>{
  const filepath = path.join(__dirname, baseGraphPath, "graph", "nodes", "agents.json");
  const data = fs.readFileSync(filepath, 'utf8');
  return JSON.parse(data) as IAgentDto[];
}

const loadClaims = () =>{
  const filepath = path.join(__dirname, baseGraphPath, "graph", "nodes", "claims.json");
  const data = fs.readFileSync(filepath, 'utf8');
  return JSON.parse(data) as IClaimDto[];
}

const loadConcepts = () =>{
  const filepath = path.join(__dirname, baseGraphPath, "graph", "nodes", "concepts.json");
  const data = fs.readFileSync(filepath, 'utf8');
  return JSON.parse(data) as IConceptDto[];
}

const loadSubsetOfConcepts = () =>{
  const filepath = path.join(__dirname, baseGraphPath, "graph", "edges", "subset_of_concept.json");
  const data = fs.readFileSync(filepath, 'utf8');
  return JSON.parse(data) as SubsetOfConceptDto[];
}

app.get('/api/restoreDatabaseJson', async function(req: Request, res: Response) {
  await restoreDatabase();
  res.send({
    Success: true
  });
});

app.get('/api/loadDocumentJson', async function(req: Request, res: Response) {
  const filename = req.query.filename as string;
  const folder = (req.query?.folder as string) || "data";
  const filepath = path.join(__dirname, baseDocumentPath, folder, filename);
  const data = fs.readFileSync(filepath, 'utf8');
  const dto = JSON.parse(data) as IBlockDto;
  dto.metadata = dto.metadata || {};
  dto.metadata.filename = filename;
  res.send({
    Success: true,
    Data: {
      document: dto
    }
  });
});

app.post('/api/getEntitiesJson', async function(req: Request, res: Response) {
  console.log('/api/getEntitiesJson', { body: req.body });
  const _ids = req.body.ids;
  console.log({ _ids });
  const ids = _ids.split(",").map(id => toId(id));
  const results = await db.query("RETURN SELECT * FROM Agent WHERE record::id(id) IN $ids", { ids: ids });
  const agents = results[0] as Agent[];
  res.send({
    Success: true,
    Data: {
      entities: agents.map(x => ({
        Guid: x.id.toString().split(":")[1].replaceAll("⟨", "").replaceAll("⟩", ""),
        Name: x.name
      }))
    }
  });
});

app.post('/api/saveDocumentJson', async function(req: Request, res: Response) {
  const json = req.body;
  const folder = (json?.folder as string) || "data";
  const filepath = path.join(__dirname, baseDocumentPath, folder, json.filename);
  const document = JSON.stringify(json.document);
  await fs.writeFile(filepath, document, (err) => {
    console.log('writeFile', { err });
  });
  const doc = json.document as IBlockDto;
  doc.metadata = { filepath };
  doc.lastUpdated = new Date();
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

app.get('/', function(req: Request, res: Response) {
  res.sendFile(path.join(__dirname, '../index.html'));
});

function listFolders(): string[] {
  try {
    // Get the current directory path
    // const currentDir = process.cwd();
    const currentDir = path.join(__dirname, baseDocumentPath);

    // Read all entries in the current directory
    const entries = fs.readdirSync(currentDir);

    // Filter out folders (directories)
    const folders = entries.filter(entry => {
      // Get the full path of the entry
      const fullPath = path.join(currentDir, entry);
      
      // Check if it's a directory using fs.statSync
      return fs.statSync(fullPath).isDirectory();
    });

    return folders;
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
}

setAgents();

const port = process.env.PORT || 3002;
app.listen(port, () => {
  console.log('Server running at localhost:' + port);
});
console.log('Running at Port ' + port);