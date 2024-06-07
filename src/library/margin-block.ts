import { BlockProperty, BlockPropertyDto, BlockType, Commit, GUID, IBlock, IBlockPropertySchema, IBlockRelation } from "./standoff-editor-block";
import { v4 as uuidv4 } from 'uuid';

interface IMarginBlockConstructor {
    id?: string;
    container?: HTMLDivElement;
    owner: IBlock;
}

export class MarginBlock implements IBlock {
    id: string;
    type: BlockType;
    blocks: IBlock[];
    owner: IBlock;
    blockProperties: BlockProperty[];
    blockSchemas: IBlockPropertySchema[];
    container: HTMLDivElement;
    relations: Record<string, IBlockRelation>;
    metadata: Record<string, any>;
    commitHandler: (commit: Commit) => void;
    constructor(args: IMarginBlockConstructor) {
        this.id = args?.id || uuidv4();
        this.owner = args.owner;
        this.relations = {};
        this.type = BlockType.MarginBlock;
        this.container = args?.container || document.createElement("DIV") as HTMLDivElement;
        this.commitHandler = () => { };
        this.metadata = {};
        this.blockProperties =[];
        this.blockSchemas = [];
        this.blocks=[];
    }
    addBlockProperties(properties: BlockPropertyDto[]) {
        const self = this;
        const props = properties.map(x => new BlockProperty({
            type: x.type,
            block: self,
            schema: self.blockSchemas.find(x2 => x2.type == x.type) as IBlockPropertySchema })
        );
        this.blockProperties.push(...props);
    }
    applyBlockPropertyStyling() {
        this.blockProperties.forEach(p => {
            p.applyStyling();
        });
    }
    getBlock(id: GUID) {
        return this.blocks.find(x => x.id == id) as IBlock;
    }
    setCommitHandler(handler: (commit: Commit) => void) {
        this.commitHandler = handler;
    }
    private commit(msg: Commit) {
        this.commitHandler(msg);
    }
    updateView() {

    }
    removeRelation(name: string, skipCommit?: boolean) {
        const relation = this.getRelation(name);
        delete this.relations[name];
        if (!skipCommit) {
            this.commit({
                redo: {
                    id: this.id,
                    name: "removeRelation",
                    value: { name }
                },
                undo: {
                    id: this.id,
                    name: "addRelation",
                    value: {
                        name,
                        targetId: relation.targetId
                    }
                }
            });
        }
    }
    getRelation(name: string) {
        return this.relations[name];
    }
    addRelation(name: string, targetId: string, skipCommit?: boolean) {
        this.relations[name] = {
            type: name,
            sourceId: this.id,
            targetId: targetId
        };
        if (!skipCommit) {
            this.commit({
                redo: {
                    id: this.id,
                    name: "addRelation",
                    value: { name, targetId }
                },
                undo: {
                    id: this.id,
                    name: "removeRelation",
                    value: { name }
                }
            });
        }
    }
    setFocus(){
        this.container.focus();
    }
    serialize(){
        return {
            id: this.id,
            type: this.type,
            metadata: this.metadata,
            relations: this.relations,
            blockProperties: this.blockProperties.map(x => x.serialize()),
            blocks: this.blocks.map(x => x.serialize())
        }
    }
    deserialize(json: any) {
        return this;
    }
}
