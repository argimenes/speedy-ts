import { v4 as uuidv4 } from 'uuid';
import _ from 'underscore';
import { updateElement } from './svg';
import { BlockProperty } from './block-property';
import { KEYS } from './keyboard';
import { IBlock, BlockType, Overlay, InputAction, InputEvent, IBlockPropertySchema, Commit, IAbstractBlockConstructor, Platform, IKeyboardInput, InputEventSource, BlockPropertyDto, GUID, IBlockDto } from './types';

export abstract class AbstractBlock implements IBlock {
    id: string;
    type: BlockType;
    blocks: IBlock[];
    overlays: Overlay[];
    inputEvents: InputEvent[];
    inputActions: InputAction[];
    modes: string[];
    owner?: IBlock;
    blockProperties: BlockProperty[];
    blockSchemas: IBlockPropertySchema[];
    container: HTMLDivElement;
    relation: Record<string, IBlock>;
    metadata: Record<string, any>;
    commitHandler: (commit: Commit) => void;
    constructor(args: IAbstractBlockConstructor) {
        this.id = args?.id || uuidv4();
        this.owner = args.owner;
        this.relation = {};
        this.type = BlockType.RootBlock;
        this.container = args?.container || document.createElement("DIV") as HTMLDivElement;
        this.commitHandler = () => { };
        this.metadata = {};
        this.blockProperties =[];
        this.blockSchemas = [];
        this.commitHandler = () => { };
        this.blocks=[];
        this.overlays = [];
        this.inputEvents = [];
        this.inputActions = [];
        
        this.modes = ["default"];
    }
    
    getOrSetOverlay(name: string) {
        const overlay = this.overlays.find(x=> x.name == name);
        if (overlay) return overlay;
        return this.addOverlay(name);
    }
    removeOverlay(name: string) {
        const o = this.overlays.find(x => x.name == name);
        if (!o) return;
        o.container.remove();
    }
    addOverlay(name: string) {
        const blockIndex = 100;
        const container = document.createElement("DIV") as HTMLDivElement;
        const indexes = this.overlays.map(x=> x.index);
        const lastIndex = Math.max(...indexes);
        const newIndex = lastIndex + 1;
        updateElement(container, {
            attribute: {
                position: "absolute",
                x: 0,
                y: 0,
                width: "100%",
                height: "100%",
                "z-index": newIndex + blockIndex
            }
        })
        const overlay = { name, container, index: newIndex };
        this.overlays.push(overlay);
        return overlay;
    }
    getKeyCode(name: string) {
        const code = KEYS[name].find(x => x.platform == Platform.Windows)?.code as number;
        return code;
    }
    protected toChord(match: string) {
        let chord: IKeyboardInput = {} as any;
        const _match = match.toUpperCase();
        chord.control = (_match.indexOf("CONTROL") >= 0);
        chord.option = (_match.indexOf("ALT") >= 0);
        chord.command = (_match.indexOf("META") >= 0);
        chord.shift = (_match.indexOf("SHIFT") >= 0);
        const parts = _match.split("-"), len = parts.length;
        chord.key = parts[len-1];
        return chord;
    }
    protected compareChords(input: IKeyboardInput, trigger: IKeyboardInput) {
        if (input.command != trigger.command) return false;
        if (input.option != trigger.option) return false;
        if (input.shift != trigger.shift) return false;
        if (input.control != trigger.control) return false;
        if (input.key.toUpperCase() != trigger.key.toUpperCase()) return false;
        return true;
    }
    protected getFirstMatchingInputEvent(input: IKeyboardInput) {
        const self = this;
        const modeEvents = _.groupBy(this.inputEvents.filter(x => x.trigger.source == InputEventSource.Keyboard), x => x.mode);
        const maxIndex = this.modes.length -1;
        for (let i = maxIndex; i >= 0; i--) {
            let mode = this.modes[i];
            let events = modeEvents[mode];
            let match = events.find(x => {
                let trigger = self.toChord(x.trigger.match as string);
                return self.compareChords(input, trigger);
            });
            if (match) return match;
        }
        return null;
    }
    protected toKeyboardInput(e: KeyboardEvent): IKeyboardInput {
        const input: IKeyboardInput = {
            shift: e.shiftKey,
            control: e.ctrlKey,
            command: e.metaKey,
            option: e.altKey,
            key: e.key,
            keyCode: parseInt(e.code || e.keyCode)
        };
        return input;
    }
    setBlockSchemas(schemas: IBlockPropertySchema[]) {
        this.blockSchemas.push(...schemas);
    }
    addBlockProperties(properties: BlockPropertyDto[]) {
        const self = this;
        const props = properties.map(x => new BlockProperty({
                type: x.type,
                block: self,
                value: x.value,
                schema: self.blockSchemas.find(x2 => x2.type == x.type) as IBlockPropertySchema
            }),
        );
        this.blockProperties.push(...props);
    }
    applyBlockPropertyStyling() {
        if (this.blockProperties) {
            this.blockProperties.forEach(p => {
                p.applyStyling();
            });
        }
    }
    getBlock(id: GUID) {
        return this.blocks.find(x => x.id == id) as IBlock;
    }
    setCommitHandler(handler: (commit: Commit) => void) {
        this.commitHandler = handler;
    }
    protected commit(msg: Commit) {
        this.commitHandler(msg);
    }
    // updateView() {

    // }
    setFocus(){
        this.container.focus();
    }
    abstract serialize():IBlockDto;
    abstract deserialize(json: any|any[]): IBlock;
    abstract destroy(): void;
}