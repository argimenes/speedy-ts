(function (factory) {
    define("parts/metadata-manager", ["knockout", "jquery", "app/helpers"], factory);
}(function (ko, $, Helper, Utils) {

    var openModal = Helper.openModal;
    var setList = Helper.setList;

    var Manager = (function () {
        function Manager(cons) {
            var _ = this;
            cons = cons || {};
            this.properties = cons.properties;
            this.handler = {
                onAccepted: cons.handler.onAccepted,
                onCancel: cons.handler.onCancel
            };
            this.results = ko.observableArray([]); // { index: number; type: string; value: string; attributes: {}; }
        }
        Manager.prototype.formatAttributes = function (item) {
            var list = [];
            for (var key in item.attributes) {
                list.push("{key}|{value}".fmt({ key: key, value: item.attributes[key] }));
            }
            return list.join("; ");
        };
        Manager.prototype.addClicked = function () {
            console.log("addClicked");
        };
        Manager.prototype.removeClicked = function (item) {
            console.log("removeClicked", item);
        };
        Manager.prototype.viewClicked = function (item) {
            console.log("viewClicked", item);
        };
        Manager.prototype.editClicked = function (item) {
            console.log("editClicked", item);
        };
        Manager.prototype.closeClicked = function () {
            this.handler.onCancel();
        };
        Manager.prototype.submitClicked = function () {
            this.handler.onAccepted(this.properties);
        };
        return Manager;
    })();

    return Manager;
}));