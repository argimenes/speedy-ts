import express, { type Request, type Response } from "express";
import path from "path";
import multer, { type FileFilterCallback } from 'multer';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import fs from "fs";
import { RecordId, Surreal } from "surrealdb";
import type { IBlockDto, StandoffEditorBlockDto, BlockType, IndexedBlock } from "./types";
//import { BlockType } from "./types";
let db: Surreal | undefined;

const basePath = "../../../codex-data";
const baseDocumentPath = basePath + "/data";
const baseWorkspacesPath = basePath + "/workspaces"

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
  // await db.query("REMOVE DATABASE IF EXISTS `codex-db`;");
  // await db.query("DEFINE DATABASE `codex-db`;");
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
  id: RecordId;
  name: string;
  type: string;
  deleted: boolean;
}
type Concept = {
  id: RecordId;
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
type Document = {
  id: string;
  metadata: {};
  deleted: boolean;
}
type TextBlock = {
  id: string;
  documentId: RecordId<"Document">;
  type: string;
  text: string;
  standoffProperties: [];
  blockProperties: [];
  metadata?: {};
}
type StandoffProperty = {
  id: string;
  textBlockId: RecordId<"TextBlock">;
  type: string;
  text: string;
  start: number;
  end: number;
  value: string;
  metadata?: {};
}

const toId = (guid: string) => guid;

export async function saveConcepts(claims: IConceptDto[]) {
  for (const node of claims) {
    const recordId = new RecordId("Concept", node.Guid);
    const data = {
      name: node.Name,
      code: node.Code,
      deleted: node.IsDeleted
    } as any;
    await db.upsert<Concept>(recordId, data);
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
	in: RecordId<"Concept">;
	out: RecordId<"Concept">;
  primary: boolean;
};

type StandoffProperty_RefersTo_Agent = {
	in: RecordId<"StandoffProperty">;
	out: RecordId<"Agent">;
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
    await db.upsert<Claim>(recordId, data);
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
    await db.upsert<Agent>(recordId, data);
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
app.use('/video-backgrounds', express.static(path.join(__dirname, basePath, 'backgrounds/video')));
app.use('/image-backgrounds', express.static(path.join(__dirname, basePath, 'backgrounds/images')));
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

app.get("/api/listWorkspaces", function (req: Request, res: Response) {
  const folder = (req.query?.folder as string) || ".";
  fs.readdir(path.join(__dirname, baseWorkspacesPath), (err, files) => {
    res.send({ workspaces: files });
  });
});

const listJsonFiles = (folder: string = ".") => {
  const folderPath = path.join(__dirname, baseDocumentPath, folder);
  const files = fs.readdirSync(folderPath).filter(file => path.extname(file) === '.json');
  return files;
}

app.get("/api/listFolders", function (req: Request, res: Response) {
  const folders = listFolders();
  res.send({ folders });
});

app.post('/api/graph/update-entity-references', async (req: Request, res: Response) => {
  const { filename, nodes, edges } = req.body;
  const filepath = path.join(__dirname, basePath, filename);
  const data = fs.readFileSync(filepath, 'utf8') || "{ \"nodes\": [], \"edges\": [] }";
  const json: GraphData = JSON.parse(data);
  json.edges.push(...edges);
  json.nodes.push(...nodes);
  fs.writeFileSync(filepath, JSON.stringify(json));
  res.send({ Success: true });
});

app.post('/api/addToGraphJson', async (req: Request, res: Response) => {
  const { id, name } = req.body;
  const results = await db.upsert<Agent>(new RecordId("Agent", id), { name } as Agent);
  console.log('/api/addToGraphJson', { results, id, name });
  res.send({
    Success: true
  });
});

app.post('/api/addToGraph', async (req: Request, res: Response) => {
  const { filename, id, name } = req.body;
  const filepath = path.join(__dirname, basePath, filename);
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
  const filepath = path.join(__dirname, basePath, filename);
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
  const filepath = path.join(__dirname, basePath, "graph", "nodes", "agents.json");
  const data = fs.readFileSync(filepath, 'utf8');
  agents = JSON.parse(data);
}

const loadAgents = () =>{
  const filepath = path.join(__dirname, basePath, "graph", "nodes", "agents.json");
  const data = fs.readFileSync(filepath, 'utf8');
  return JSON.parse(data) as IAgentDto[];
}

const loadClaims = () =>{
  const filepath = path.join(__dirname, basePath, "graph", "nodes", "claims.json");
  const data = fs.readFileSync(filepath, 'utf8');
  return JSON.parse(data) as IClaimDto[];
}

const loadConcepts = () =>{
  const filepath = path.join(__dirname, basePath, "graph", "nodes", "concepts.json");
  const data = fs.readFileSync(filepath, 'utf8');
  return JSON.parse(data) as IConceptDto[];
}

const loadSubsetOfConcepts = () =>{
  const filepath = path.join(__dirname, basePath, "graph", "edges", "subset_of_concept.json");
  const data = fs.readFileSync(filepath, 'utf8');
  return JSON.parse(data) as SubsetOfConceptDto[];
}

app.get('/api/restoreDatabaseJson', async function(req: Request, res: Response) {
  try {
    await restoreDatabase();
    res.send({
      Success: true
    });
  } catch (ex) {
    console.log('/api/restoreDatabaseJson', { ex });
    res.send({
      Success: false
    }); 
  }  
});

app.get('/api/indexAllDocumentsJson', async function(req: Request, res: Response) {
  try {
    const folders = listFolders();
    for (let i = 0; i < folders.length; i++) {
      const folder = folders[i];
      const files = listJsonFiles(folder);
      for (let j = 0; j < files.length; j++) {
        let filename = files[j];
        const filepath = path.join(__dirname, baseDocumentPath, folder, filename);
        const data = fs.readFileSync(filepath, 'utf8');
        const doc = JSON.parse(data) as IBlockDto;
        if (!doc || doc?.type != "main-list-block") {
          console.log("main-list-block not found", { doc })
          continue;
        }
        await saveDocumentIndex(doc);
      }
    }
    res.send({
      Success: true,
      Data: {
        folders
      }
    });
  } catch (ex) {
    console.log('/api/indexAllDocumentsJson', { ex });
    res.send({
      Success: false
    }); 
  }  
});

app.get('/api/loadDocumentJson', async function(req: Request, res: Response) {
  try {
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
  } catch (ex) {
    console.log('/api/loadDocumentJson', { ex });
    res.send({
      Success: false
    }); 
  }
});

type AgentMention = {
  id: string;
  name: string;
  mentions: number;
}

app.get("/api/findAgentsByNameJson", async function(req: Request, res: Response) {
  try {

  } catch (ex) {
    console.log({ ex });
    res.send({
      Success: false
    }); 
  }
  const text = req.query.search as string;
  const byPartial = req.query.byPartial === "true";
  const page: any = req.query.page || 1;
  const order: any = req.query.order || "ByMentions";
  const direction: any = req.query.direction || "Ascending";
  const byMentionsDescending = "mentions DESC, name";
  const orderBy = 
    order == "ByMentions"
      ? direction == "Ascending" ? "mentions, name" : byMentionsDescending
      : order == "ByName"
        ? direction == "Ascending" ? "name, mentions DESC" : "name DESC, mentions DESC"
        : byMentionsDescending
  ;
  const rows: any = 10;
  const where = byPartial ? "WHERE name CONTAINS $text" : "WHERE name = $text";
  const query = `SELECT id, name, count(<-standoff_property_refers_to_agent<-StandoffProperty) as mentions
      FROM Agent 
      ${where}
      ORDER BY ${orderBy}`;
  const pageset = await paginate(query, { text }, page, rows);
  if (!pageset) {
    res.send({ Success: false });
    return;
  }
  res.send(pageset);
});

type AgentAlias = {
  text: string;
  mentions: number;
  id: string;
  name: string;
}

const getCount = async (query: string, props: {}) => {
  const count = (await db.query(`SELECT count() FROM (` + query + `) GROUP BY count`, props))[0][0]?.count;  
  return count;
}

const paginate = async (query: string, props: {}, page: number, rows: number) => {
  const count = await getCount(query, props);
  const maxPage = Math.ceil(count / rows);
  page = page > maxPage ? maxPage : page;
  const pageIndex = (page - 1) * rows;
  const pageset = await db.query(query + ` START $pageIndex LIMIT BY $rows`, { ...props, rows, pageIndex }); 
  const results = pageset[0];
  return {
      Success: true,
      Count: count,
      Page: page,
      Rows: rows,
      MaxPage: maxPage,
      Results: results
  };
}

app.get("/api/findAgentsByAliasJson", async function(req: Request, res: Response) {
  const text = req.query.search as string;
  const byPartial = req.query.byPartial === "true";
  const page: any = req.query.page || 1;
  const order: any = req.query.order || "ByText";
  const direction: any = req.query.direction || "Ascending";
  const byMentionsDescending = "count DESC, in.text";
  const orderBy =
    order == "ByText"
      ? direction == "Ascending" ? "in.text, count DESC" : "in.text DESC, count DESC"
      : order == "ByMentions" 
        ? direction == "Ascending" ? "count, in.text" : byMentionsDescending
        : byMentionsDescending
    ;
  const rows: any = 10;
  const where = byPartial ? "WHERE in.text CONTAINS $text" : "WHERE in.text = $text";
  const query = `SELECT text, count as mentions, out.id as id, out.name as name FROM (
        SELECT in.text as text, out, count()
        FROM standoff_property_refers_to_agent  
        ${where}
        GROUP BY in.text, out
        ORDER BY ${orderBy}
  )`;
  console.log({ query, text, page, rows});
  const pageset = await paginate(query, { text }, page, rows);
  if (!pageset) {
    res.send({ Success: false });
    return;
  }
  res.send(pageset);
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

app.post('/api/saveWorkspaceJson', async function(req: Request, res: Response) {
  try {
    const json = req.body;
    const filename = json?.filename + "";
    const filepath = path.join(__dirname, baseWorkspacesPath, filename);
    const workspace = JSON.stringify(json.workspace);
    await fs.writeFile(filepath, workspace, (err) => {
      console.log('writeFile', { err });
    });
    res.send({
      Success: true
    });
  } catch (ex) {
    console.log('/api/saveWorkspaceJson', { ex });
    res.send({ Success: false });
  }  
});

app.get('/api/loadWorkspaceJson', async function(req: Request, res: Response) {
  try {
    const filename = req.query.filename + "";
    const filepath = path.join(__dirname, baseWorkspacesPath, filename);
    const data = fs.readFileSync(filepath, 'utf8');
    const ws = JSON.parse(data) as IBlockDto;
    res.send({
      Success: true,
      Data: {
        workspace: ws
      }
    });
  } catch (ex) {
    console.log('/api/loadWorkspaceJson', { ex });
    res.send({ Success: false });
  }
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
  await saveDocumentIndex(doc);
  res.send({
    Success: true
  });
});

const saveDocumentIndex = async (doc: IBlockDto) => {
  const blocks = generateIndex(doc);
  /**
   * Delete existing TextBlocks and StandoffProperties
   */
  let documentData = {
      metadata: doc.metadata
  } as Document;
  //console.log({ documentData });
  await db.upsert<Document>(new RecordId("Document", doc.id), documentData);
  const textBlocks = blocks
    .filter(x => x.block.type == "standoff-editor-block")
    .map(x => x.block as any as StandoffEditorBlockDto);
  for (let i = 0; i < textBlocks.length; i++) {
    /**
     * Insert TextBlock
     */
    let textBlock = textBlocks[i];
    let textBlockData = {
        text: textBlock.text,
        standoffProperties: textBlock.standoffProperties,
        blockProperties: textBlock.blockProperties,
        metadata: textBlock.metadata
    } as TextBlock;
    //console.log({ textBlockData });
    await db.upsert<TextBlock>(new RecordId("TextBlock", textBlock.id), textBlockData);
    let properties = textBlock.standoffProperties.filter(x => x.type == "codex/entity-reference");
    for (let j = 0; j < properties.length; j++) {
      /**
       * Insert StandoffProperty
       */
      let property = properties[j];
      let standoffPropertyData = {
        textBlockId: new RecordId("TextBlock", textBlock.id),
        type: property.type,
        text: textBlock.text.substring(property.start, property.end + 1),
        start: property.start,
        end: property.end,
        value: property.value,
        metadata: property.metadata
      } as StandoffProperty;
      //console.log({ standoffPropertyData });
      await db.upsert<StandoffProperty>(new RecordId("StandoffProperty", property.id), standoffPropertyData);
      const sourceId = new RecordId("StandoffProperty", property.id);
      const targetId = new RecordId("Agent", property.value);
      //console.log({ sourceId, targetId });
      await db.insert_relation<StandoffProperty_RefersTo_Agent>('standoff_property_refers_to_agent', {
        in: sourceId,
        out: targetId
      });
    }
  }
}

const generateIndex = (doc: IBlockDto): IndexedBlock[] => {
  const result: IndexedBlock[] = [];
  function traverse(block: IBlockDto, depth: number = 0, path: string = '0'): void {
      // Visit the current node
      result.push({ block, index: result.length, depth, path });
      // Recursively traverse all children
      block.children?.forEach((child, index) => {
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