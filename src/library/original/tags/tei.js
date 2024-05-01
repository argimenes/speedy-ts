(function (factory) {
    define("speedy/tags/tei", [], factory);
}(function () {

    const tags = {
        "tei/core/label": {
            format: "decorate",
            className: "tei-core-label",
            labelRenderer: (p) => {
                return "label";
            },
            attributes: {
                place: {
                    renderer: function (prop) {
                        return "place [" + (prop.attributes.place || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                    },
                    selector: function (prop, process) {
                        var place = prompt("Place?", prop.attributes.place);
                        process(place);
                    }
                }
            }
        },
        "tei/core/name": {
            format: "decorate",
            className: "tei-core-name",
            labelRenderer: (p) => {
                return "name";
            },
            attributes: {
                type: {
                    renderer: function (prop) {
                        return "type [" + (prop.attributes.type || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                    },
                    selector: function (prop, process) {
                        var type = prompt("Type?", prop.attributes.type);
                        process(type);
                    }
                }
            }
        },
        "tei/core/date": {
            format: "decorate",
            className: "tei-core-date",
            labelRenderer: (p) => {
                return "date";
            },
            attributes: {
                when: {
                    renderer: function (prop) {
                        return "when [" + (prop.attributes.when || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                    },
                    selector: function (prop, process) {
                        var when = prompt("When?", prop.attributes.when);
                        process(when);
                    }
                }
            }
        },
        "tei/core/item": {
            format: "decorate",
            className: "tei-core-item",
            attributes: {
                n: {
                    renderer: function (prop) {
                        return "n [" + (prop.attributes.n || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                    },
                    selector: function (prop, process) {
                        var n = prompt("When?", prop.attributes.n);
                        process(n);
                    }
                }
            }
        },
        "tei/core/list": {
            format: "decorate",
            className: "tei-core-list",
            attributes: {
                rend: {
                    renderer: function (prop) {
                        return "rend [" + (prop.attributes.rend || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                    },
                    selector: function (prop, process) {
                        var rend = prompt("rend?", prop.attributes.rend);
                        process(rend);
                    }
                }
            }
        },
        "tei/core/measure": {
            format: "decorate",
            className: "tei-core-measure",
            labelRenderer: (p) => {
                return "measure";
            },
            attributes: {
                type: {
                    renderer: function (prop) {
                        return "type [" + (prop.attributes.type || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                    },
                    selector: function (prop, process) {
                        var type = prompt("Type?", prop.attributes.type);
                        process(type);
                    }
                },
                quantity: {
                    renderer: function (prop) {
                        return "quantity [" + (prop.attributes.quantity || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                    },
                    selector: function (prop, process) {
                        var quantity = prompt("Quantity?", prop.attributes.quantity);
                        process(quantity);
                    }
                },
                unit: {
                    renderer: function (prop) {
                        return "unit [" + (prop.attributes.unit || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                    },
                    selector: function (prop, process) {
                        var unit = prompt("Unit?", prop.attributes.unit);
                        process(unit);
                    }
                }
            }
        },
        "tei/core/num": {
            format: "decorate",
            className: "tei-core-num",
            labelRenderer: (p) => {
                return "num";
            },
            attributes: {
                type: {
                    renderer: function (prop) {
                        return "type [" + (prop.attributes.type || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                    },
                    selector: function (prop, process) {
                        var type = prompt("type?", prop.attributes.type);
                        process(type);
                    }
                }
            }
        },
        "tei/core/quote": {
            format: "decorate",
            className: "tei-core-quote",
            labelRenderer: (p) => {
                return "quote";
            },
            attributes: {
                lang: {
                    renderer: function (prop) {
                        return "lang [" + (prop.attributes.lang || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                    },
                    selector: function (prop, process) {
                        var lang = prompt("Lang?", prop.attributes.lang);
                        process(lang);
                    }
                }
            }
        },
        "tei/core/said": {
            format: "decorate",
            className: "tei-core-said"
        },
        "tei/core/time": {
            format: "decorate",
            className: "tei-core-time",
            labelRenderer: (p) => {
                return "time";
            },
            attributes: {
                when: {
                    renderer: function (prop) {
                        return "when [" + (prop.attributes.when || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                    },
                    selector: function (prop, process) {
                        var when = prompt("When?", prop.attributes.when);
                        process(when);
                    }
                }
            }
        },
        "tei/core/unclear": {
            format: "decorate",
            className: "tei-core-unclear",
            labelRenderer: (p) => {
                return "unclear";
            },
            attributes: {
                reason: {
                    renderer: function (prop) {
                        return "reason [" + (prop.attributes.reason || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                    },
                    selector: function (prop, process) {
                        var reason = prompt("Reason?", prop.attributes.reason);
                        process(reason);
                    }
                }
            }
        },
        "tei/core/unit": {
            format: "decorate",
            className: "tei-core-unit",
            labelRenderer: (p) => {
                return "unit";
            },
            attributes: {
                type: {
                    renderer: function (prop) {
                        return "type [" + (prop.attributes.type || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                    },
                    selector: function (prop, process) {
                        var type = prompt("Type?", prop.attributes.type);
                        process(type);
                    }
                },
                unit: {
                    renderer: function (prop) {
                        return "unit [" + (prop.attributes.unit || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                    },
                    selector: function (prop, process) {
                        var unit = prompt("Unit?", prop.attributes.unit);
                        process(unit);
                    }
                }
            }
        },
        "tei/namesdates/birth": {
            format: "decorate",
            className: "tei-namesdates-birth",
            labelRenderer: (p) => {
                return "DOB";
            }
        },
        "tei/namesdates/forename": {
            format: "decorate",
            className: "tei-namesdates-forename",
            labelRenderer: (p) => {
                return "forename";
            }
        },
        "tei/namesdates/surname": {
            format: "decorate",
            className: "tei-namesdates-surname",
            labelRenderer: (p) => {
                return "surname";
            }
        },
        "tei/textstructure/argument": {
            format: "decorate",
            className: "tei-textstructure-argument",
            labelRenderer: (p) => {
                return "argument";
            }
        },
        "tei/textstructure/closer": {
            format: "decorate",
            className: "tei-textstructure-closer",
            labelRenderer: (p) => {
                return "closer";
            }
        },
        "tei/textstructure/dateline": {
            format: "decorate",
            className: "tei-textstructure-dateline",
            labelRenderer: (p) => {
                return "dateline";
            }
        },
        "tei/textstructure/postscript": {
            format: "decorate",
            className: "tei-textstructure-postscript",
            labelRenderer: (p) => {
                return "postscript";
            }
        },
        "tei/textstructure/opener": {
            format: "decorate",
            className: "tei-textstructure-opener",
            labelRenderer: (p) => {
                return "opener";
            }
        },
        "tei/textstructure/salute": {
            format: "decorate",
            className: "tei-textstructure-salute"
        },
        "tei/textstructure/signed": {
            format: "decorate",
            className: "tei-textstructure-signed",
            labelRenderer: (p) => {
                return "signed";
            }
        },
        "tei/verse/caesura": {
            format: "decorate",
            zeroPoint: {
                className: "tei-verse-caesura"
            },
            className: "caesura",
            content: "|"
        },
        "tei/verse/metDecl": {
            format: "decorate",
            className: "tei-verse-metDecl",
            attributes: {
                type: {
                    renderer: function (prop) {
                        return "type [" + (prop.attributes.type || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                    },
                    selector: function (prop, process) {
                        var type = prompt("Type?", prop.attributes.type);
                        process(type);
                    }
                }
            }
        },
        "tei/verse/metSym": {
            format: "decorate",
            className: "tei-verse-metSym"
        },
        "tei/verse/rhyme": {
            format: "decorate",
            className: "tei-verse-rhyme",
            attributes: {
                label: {
                    renderer: function (prop) {
                        return "label [" + (prop.attributes.label || "") + "] <button data-toggle='tooltip' data-original-title='Set' class='btn btn-sm'><span class='fa fa-pencil'></span></button>";
                    },
                    selector: function (prop, process) {
                        var label = prompt("Label?", prop.attributes.label);
                        process(label);
                    }
                }
            }
        },
        "attitude/admonition": {
            format: "decorate",
            className: "attitude-admonition"
        },
        "attitude/advice": {
            format: "decorate",
            className: "attitude-advice"
        },
        "attitude/belief": {
            format: "decorate",
            className: "attitude-belief"
        },
        "attitude/consolation": {
            format: "decorate",
            className: "attitude-consolation"
        },
        "attitude/cynicism": {
            format: "decorate",
            className: "attitude-cynicism"
        },
        "attitude/derogatory": {
            format: "decorate",
            className: "attitude-derogatory"
        },
        "attitude/explanation": {
            format: "decorate",
            className: "attitude-explanation"
        },
        "attitude/distrust": {
            format: "decorate",
            className: "attitude-distrust"
        },
        "attitude/grief": {
            format: "decorate",
            className: "attitude-grief"
        },
        "attitude/happiness": {
            format: "decorate",
            className: "attitude-happiness"
        },
        "attitude/irony": {
            format: "decorate",
            className: "attitude-irony"
        },
        "attitude/justification": {
            format: "decorate",
            className: "attitude-justification"
        },
        "attitude/paranoia": {
            format: "decorate",
            className: "attitude-paranoia"
        },
        "attitude/praise": {
            format: "decorate",
            className: "attitude-praise"
        },
        "attitude/request": {
            format: "decorate",
            className: "attitude-request"
        },
        "attitude/sarcasm": {
            format: "decorate",
            className: "attitude-sarcasm"
        },
        "attitude/thanks": {
            format: "decorate",
            className: "attitude-thanks"
        },
        "figurative/analogy": {
            format: "decorate",
            className: "figurative-analogy"
        },
        "figurative/argument": {
            format: "decorate",
            className: "figurative-argument"
        },
        "figurative/hyperbole": {
            format: "decorate",
            className: "figurative-hyperbole"
        },
        "figurative/idiom": {
            format: "decorate",
            className: "figurative-idiom"
        },
        "figurative/imagery": {
            format: "decorate",
            className: "figurative-imagery"
        },
        "figurative/metaphor": {
            format: "decorate",
            className: "figurative-metaphor"
        },
        "figurative/personification": {
            format: "decorate",
            className: "figurative-personification"
        },
        "figurative/simile": {
            format: "decorate",
            className: "figurative-simile"
        },
        "figurative/symbolism": {
            format: "decorate",
            className: "figurative-symbolism"
        },
        "dexter/defining": {
            format: "decorate",
            className: "dexter-defining"
        },
        "dexter/directive": {
            format: "decorate",
            className: "dexter-directive"
        },
        "dexter/evaluation": {
            format: "decorate",
            className: "dexter-evaluation"
        },
        "dexter/intentions": {
            format: "decorate",
            className: "dexter-intentions"
        },
        "dexter/question": {
            format: "decorate",
            className: "dexter-question"
        },
        "dexter/rhetorical": {
            format: "decorate",
            className: "dexter-rhetorical"
        },
        "dexter/WH-question": {
            format: "decorate",
            className: "dexter-WH-question"
        },
        "dexter/yes-no": {
            format: "decorate",
            className: "dexter-yes-no"
        },
        "empson/A(B)": {
            format: "decorate",
            className: "empson-"
        },
        "empson/A/i": {
            format: "decorate",
            className: "empson-"
        },
        "empson/-A": {
            format: "decorate",
            className: "empson-"
        },
        "empson/A-": {
            format: "decorate",
            className: "empson-"
        },
        "empson/A+": {
            format: "decorate",
            className: "empson-"
        },
        "empson/A$1": {
            format: "decorate",
            className: "empson-"
        },
        "prosody/tone-group": {
            format: "decorate",
            className: "prosody-tone-group"
        },
        "prosody/rising-nuclear-tone": {
            format: "zero-point",
            zeroPoint: {
                className: "prosody-rising-nuclear-tone-zero"
            },
            className: "prosody-rising-nuclear-tone",
            content: "/"
        },
        "prosody/falling-nuclear-tone": {
            format: "zero-point",
            zeroPoint: {
                className: "prosody-falling-nuclear-tone-zero"
            },
            className: "prosody-falling-nuclear-tone",
            content: "\\"
        },
        "prosody/rise-fall-nuclear-tone": {
            format: "zero-point",
            zeroPoint: {
                className: "prosody-rise-fall-nuclear-tone-zero"
            },
            className: "prosody-rise-fall-nuclear-tone",
            content: "/\\"
        },
        "prosody/level-nuclear-tone": {
            format: "zero-point",
            zeroPoint: {
                className: "prosody-level-nuclear-tone-zero"
            },
            className: "prosody-level-nuclear-tone",
            content: "_"
        },
        "prosody/normal-stress": {
            format: "zero-point",
            zeroPoint: {
                className: "prosody-normal-stress-zero"
            },
            className: "prosody-normal-stress",
            content: "."
        },
        "prosody/booster-higher-pitch": {
            format: "zero-point",
            zeroPoint: {
                className: "prosody-booster-higher-pitch-zero"
            },
            className: "prosody-booster-higher-pitch",
            content: "!"
        },
        "prosody/booster-continuance": {
            format: "zero-point",
            zeroPoint: {
                className: "prosody-booster-continuance-zero"
            },
            className: "prosody-booster-continuance",
            content: "="
        },
        "prosody/unclear": {
            format: "decorate",
            className: "prosody-unclear"
        },
        "prosody/pause-of-one-stress-unit": {
            format: "zero-point",
            className: "prosody-pause-of-one-stress-unit",
            zeroPoint: {
                className: "prosody-pause-of-one-stress-unit-zero"
            },
            content: " - "
        },
        "prosody/simultaneous-speech": {
            format: "decorate",
            className: "prosody-simultaneous-speech"
        },
        "prosody/partial": {
            format: "decorate",
            className: "prosody-partial"
        },
        "richards/query": {
            format: "decorate",
            className: "richards-query",
            bracket: {
                left: {
                    className: "richards-query-bracket",
                    content: "?"
                },
                right: {
                    className: "richards-query-bracket",
                    content: "?"
                }
            },
            labelRenderer: function () {
                return "<span style='richards-query'>query (?)</span>";
            }
        },
        "richards/astonishment": {
            format: "decorate",
            className: "richards-astonishment",
            bracket: {
                left: {
                    className: "richards-astonishment-bracket",
                    content: "!"
                },
                right: {
                    className: "richards-astonishment-bracket",
                    content: "!"
                }
            },
            labelRenderer: function () {
                return "<span style='richards-astonishment'>astonishment (!)</span>";
            }
        },
        "richards/said-with": {
            format: "decorate",
            className: "richards-said-with",
            bracket: {
                left: {
                    className: "richards-said-with-bracket",
                    content: "sw"
                },
                right: {
                    className: "richards-said-with-bracket",
                    content: "sw"
                }
            },
            labelRenderer: function () {
                return "<span style='richards-said-with'>said with (sw)</span>";
            }
        },
        "richards/word": {
            format: "decorate",
            className: "richards-word",
            bracket: {
                left: {
                    className: "richards-word-bracket",
                    content: "(w)"
                },
                right: {
                    className: "richards-word-bracket",
                    content: "(w)"
                }
            },
            labelRenderer: function () {
                return "<span style='said-with'>word (w)</span>";
            }
        },
        "richards/occurrence": {
            format: "decorate",
            className: "richards-occurrence",
            bracket: {
                left: {
                    className: "richards-occurrence-bracket",
                    content: "oc"
                },
                right: {
                    className: "richards-occurrence-bracket",
                    content: "oc"
                }
            },
            labelRenderer: function () {
                return "<span style='richards-occurrence'>occurrence (oc)</span>";
            }
        },
        "richards/refer-to": {
            format: "decorate",
            className: "richards-refer-to",
            bracket: {
                left: {
                    className: "richards-refer-to-bracket",
                    content: "r"
                },
                right: {
                    className: "richards-refer-to-bracket",
                    content: "r"
                }
            },
            labelRenderer: function () {
                return "<span style='richards-refer-to'>refer to (r)</span>";
            }
        },
        "richards/technical-term": {
            format: "decorate",
            className: "richards-technical-term",
            bracket: {
                left: {
                    className: "richards-technical-term-bracket",
                    content: "t"
                },
                right: {
                    className: "richards-technical-term-bracket",
                    content: "t"
                }
            },
            labelRenderer: function () {
                return "<span style='richards-technical-term'>technical term (t)</span>";
            }
        },
        "leiden/expansion": {
            format: "decorate",
            className: "leiden__expansion",
            labelRenderer: function () {
                return "<span style='expansion'>leiden/expansion</span>";
            }
        },
        "leiden/emphasis": {
            format: "decorate",
            className: "leiden__emphasis",
            labelRenderer: function () {
                return "<span style='leiden__emphasis'>leiden/emphasis</span>";
            }
        },
        "leiden/sic": {
            format: "overlay",
            className: "leiden__sic",
            labelRenderer: function () {
                return "<span style='leiden__sic'>leiden/sic</span>";
            }
        },
        "leiden/repetition": {
            format: "overlay",
            className: "leiden__repetition",
            labelRenderer: function () {
                return "<span style='leiden__repetition'>leiden/repetition</span>";
            }
        },
        "leiden/rewritten": {
            format: "overlay",
            className: "leiden__rewritten",
            labelRenderer: function () {
                return "<span style='leiden__rewritten'>leiden/rewritten</span>";
            }
        },
        "leiden/supra-lineam": {
            format: "decorate",
            className: "leiden__supra_lineam",
            labelRenderer: function () {
                return "<span style='leiden__supra_lineam'>leiden/supra-lineam</span>";
            }
        },
        "leiden/marginalia": {
            format: "decorate",
            className: "leiden__marginalia",
            labelRenderer: function () {
                return "<span style='leiden__marginalia'>leiden/marginalia</span>";
            }
        },
        "leiden/correction": {
            format: "overlay",
            className: "leiden__correction",
            labelRenderer: function () {
                return "<span style='leiden__correction'>leiden/correction</span>";
            }
        },
        "leiden/striked-out": {
            format: "decorate",
            className: "leiden__striked_out",
            labelRenderer: function () {
                return "<span style='leiden__striked_out'>leiden/striked-out</span>";
            }
        },
        "leiden/striked-out": {
            format: "decorate",
            className: "leiden__striked_out",
            labelRenderer: function () {
                return "<span style='leiden__striked_out'>leiden/striked-out</span>";
            }
        },
        "leiden/commentary": {
            format: "decorate",
            className: "leiden__commentary",
            labelRenderer: function () {
                return "<span style='leiden__commentary'>leiden/commentary</span>";
            }
        },
        "leiden/line": {
            format: "decorate",
            bracket: {
                right: {
                    className: "expansion-bracket",
                    content: "/"
                }
            },
            labelRenderer: function (prop) {
                return "line " + prop.value;
            },
            propertyValueSelector: function (prop, process) {
                const { editor } = prop;
                const { client } = editor;
                var defaultValue = prop.value || !!client.lastLineNumber ? client.lastLineNumber + 1 : 1;
                var num = prompt("Line number?", defaultValue);
                if (!!num) {
                    num = client.lastLineNumber = parseInt(num); // need to find a wa
                }
                process(num);
            }
        }
    };

    return tags;

}));