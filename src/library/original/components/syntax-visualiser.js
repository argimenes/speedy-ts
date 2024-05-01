(function (factory) {
    define("components/syntax-visualiser", ["knockout", "libs/randomColor", "parts/word-cloud", "parts/window-manager", "app/helpers"], factory);
}(function (ko, randomColor, WordCloud, _WindowManager, Helper) {

    const WindowManager = _WindowManager.getWindowManager();
    const { div, distinct } = Helper;

    class SyntaxVisualiser {
        constructor(cons) {
            this.editor = cons.editor;
            const props = this.editor.data.properties.filter(x => x.type == "syntax/part-of-speech");
            const tags = distinct(props.map(x => x.attributes.tag));
            const colours = randomColor({
                count: tags.length,
                seed: "orange",
                luminosity: 'bright',
                format: 'rgb',
                hue: 'random'
            });
            const items = tags.map((t, i) => {
                return {
                    highlighted: ko.observable(false),
                    tag: t,
                    text: t.replace("|", ": "),
                    colour: colours[i]
                };
            });
            this.items = ko.observableArray(items);
            this.cloudWindow = null;
            this.x = null;
            this.y = null;
            this.container = this.createContainer();
            this.window = this.createWindow(this.container);
        }
        itemClicked(item) {
            item.highlighted(!item.highlighted());
            this.highlightPartOfSpeech(item.tag, item.highlighted(), item.colour);
            this.drawWordCloud();
        }
        highlightPartOfSpeech(tag, highlight, colour) {
            this.editor.data.properties
                .filter(x => x.type == "syntax/part-of-speech" && x.attributes.tag == tag)
                .forEach(p => highlight ? p.highlight(colour) : p.unhighlight("inherit"));
        }
        drawWordCloud() {
            const editor = this.editor;
            if (this.cloudWindow) {
                this.cloudWindow.close();
            }
            const highlights = this.items().filter(x => x.highlighted());
            var words = [];
            highlights.forEach(h => {
                const props = editor.data.properties.filter(x => x.type == "syntax/part-of-speech" && x.attributes.tag == h.tag);
                const propWords = props.map(x => x.getText().toLowerCase());
                words = words.concat(propWords);
            });
            const wordCounts = this.toWordCount(words);
            const data = {
                words: wordCounts,
                name: "Syntax",
                settings: {
                    x: this.x,
                    y: this.y + 225,
                    width: 550,
                    height: 400
                }
            };
            const cloud = new WordCloud();
            this.cloudWindow = cloud.load(data);
        }
        toWordCount(words) {
            var cloud = [];
            words.forEach(w => {
                let item = cloud.find(c => c.text == w);
                if (item) {
                    item.weight++;
                } else {
                    cloud.push({
                        text: w,
                        weight: 1
                    });
                }
            });
            return cloud;
        }
        createContainer() {
            const _this = this;
            const rect = this.editor.container.getBoundingClientRect();
            const y = this.y = rect.y;
            const x = this.x = rect.x + rect.width + 20;
            const ul = div({
                template: {
                    view: `
<ul data-bind="foreach: $data.items">
    <li style="display: inline-block; padding: 5px 5px;">
        <span data-bind="style: { backgroundColor: $data.colour }, click: $parent.itemClicked.bind($parent)" style="padding: 6px;">
            <input type="checkbox" data-bind="checked: $data.highlighted" style="margin-right: 5px;" />
            <span data-bind="text: $data.text"></span>
        </span>
    </li>
</ul>
`,
                    model: this
                }
            });
            const container = div({
                classList: ["text-window"],
                style: {
                    position: "absolute",
                    top: y + "px",
                    left: x + "px",
                    width: "400px",
                    height: "200px"
                },
                template: {
                    view: `
<div class="safari_buttons" data-role="handle">
    <div data-bind="click: $data.closeClicked" class="safari_close"></div><div data-bind="click: $data.toggleGlassModeClicked" class="safari_glass"></div>
</div>`,
                    model: {
                        closeClicked: () => {
                            _this.window.close();
                        },
                        toggleGlassModeClicked: function () {
                            this.glass = !this.glass;
                            if (this.glass) {
                                _this.container.classList.add("glass-window");

                            } else {
                                _this.container.classList.remove("glass-window");
                            }
                        }
                    }
                }
            });
            container.appendChild(ul);
            return container;
        }
        createWindow(container) {
            const win = WindowManager.addWindow({
                node: container,
                draggable: {
                    node: container.querySelector('[data-role="handle"]')
                }
            });
            win.addNodeToLayer(container);
            return win;
        }
    }

    return SyntaxVisualiser;

}));