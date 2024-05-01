(function (factory) {
    define("parts/language-selector", ["knockout"], factory);
}(function (ko) {

    var Selector = (function () {
        function Selector(cons) {
            this.prepare(cons);
            this.model = {
                language: ko.observable(cons.model.language),
                italicise: ko.observable(cons.model.italicise)
            };
            this.list = {
                languages: ko.observableArray([{ Text: "English", Value: "en" }, { Text: "French", Value: "fr" }, { Text: "German", Value: "de" }, { Text: "Italian", Value: "it" }, { Text: "Latin", Value: "la" }, { Text: "Spanish", Value: "es" }])
            };
            this.handler = cons.handler;
        }
        Selector.prototype.prepare = function (cons) {
            cons = cons || {};
            cons.model = cons.model || {};
        };
        Selector.prototype.submitClicked = function () {
            this.submit();
        };
        Selector.prototype.closeClicked = function () {
            this.handler.onCancel();
        };
        Selector.prototype.getText = function (value) {
            var item = this.list.languages().find(function (x) {
                return x.Value == value;
            });
            return item.Text;
        };
        Selector.prototype.submit = function () {
            var value = this.model.language();
            var text = this.getText(value);
            this.handler.onSelected(value, text, this.model.italicise());
        };
        return Selector;
    })();

    return Selector;
}));