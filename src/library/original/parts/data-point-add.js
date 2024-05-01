(function (factory) {
    define("parts/data-point-add", ["knockout", "jquery", "app/helpers", "modals/search-agents", "modals/search-concepts"], factory);
}(function (ko, $, Helpers, AgentModal, ConceptModal) {

    var addToList = Helpers.storeItemInList;
    var openModal = Helpers.openModal;
    var emptyItem = Helpers.emptyItem;

    var QuickAdd = (function () {
        function QuickAdd(cons) {
            this.prepare(cons);
            this.popup = cons.popup;
            this.model = {
                Entity: {
                    Guid: cons.model.Entity.Guid,
                    Value: ko.observable(cons.model.Entity.Value),
                    Description: ko.observable(cons.model.Entity.Description),
                },
                Unit: {
                    Target: {
                        Guid: ko.observable(cons.model.Unit.Target.Guid),
                        Name: ko.observable(cons.model.Unit.Target.Name)
                    }
                },
                DataSet: {
                    Target: {
                        Guid: ko.observable(cons.model.DataSet.Target.Guid),
                        Name: ko.observable(cons.model.DataSet.Target.Name)
                    }
                },
                Place: {
                    Target: {
                        Guid: ko.observable(cons.model.Place.Target.Guid),
                        Name: ko.observable(cons.model.Place.Target.Name)
                    }
                },
                Time: {
                    Target: {
                        Guid: ko.observable(cons.model.Time.Target.Guid),
                        Around: ko.observable(cons.model.Time.Target.Around),
                        Season: ko.observable(cons.model.Time.Target.Season),
                        Section: ko.observable(cons.model.Time.Target.Section),
                        Year: ko.observable(cons.model.Time.Target.Year),
                        Month: ko.observable(cons.model.Time.Target.Month),
                        Day: ko.observable(cons.model.Time.Target.Day),
                        Hour: ko.observable(cons.model.Time.Target.Hour),
                        Minute: ko.observable(cons.model.Time.Target.Minute),
                        Second: ko.observable(cons.model.Time.Target.Second),
                    }
                },
            };
            this.handler = cons.handler;
            this.list = {
                DataSets: ko.observableArray([]),
                Units: ko.observableArray([]),
                Places: ko.observableArray([]),
                Around: ko.observableArray([]),
                Months: ko.observableArray([]),
                Seasons: ko.observableArray([]),
                Sections: ko.observableArray([])
            };
        }
        QuickAdd.prototype.prepare = function (cons) {
            cons = cons || {};
            cons.model = cons.model || {};
            cons.model.Entity = cons.model.Entity || {};
            cons.model.DataSet = cons.model.DataSet || {};
            cons.model.DataSet.Target = cons.model.DataSet.Target || {};
            cons.model.Place = cons.model.Place || {};
            cons.model.Place.Target = cons.model.Place.Target || {};
            cons.model.Time = cons.model.Time || {};
            cons.model.Time.Target = cons.model.Time.Target || {};
            cons.model.Unit = cons.model.Unit || {};
            cons.model.Unit.Target = cons.model.Unit.Target || {};
        };
        QuickAdd.prototype.setLists = function (data) {
            this.list.Around(data.Around);
            this.list.Seasons(data.Seasons);
            this.list.Months(data.Months);
            this.list.Sections(data.Sections);
            this.updateDataSets();
            this.updatePlaces();
            this.updateUnits();
        };
        QuickAdd.prototype.updateDataSets = function () {
            var list = JSON.parse(sessionStorage.getItem("selected/data-sets")) || [];
            list.splice(0, 0, emptyItem);
            this.list.DataSets(list);
        };
        QuickAdd.prototype.addDataSet = function (item) {
            addToList("selected/data-sets", item);
        };
        QuickAdd.prototype.updatePlaces = function () {
            var list = JSON.parse(sessionStorage.getItem("selected/places")) || [];
            list.splice(0, 0, emptyItem);
            this.list.Places(list);
        };
        QuickAdd.prototype.addPlace = function (item) {
            addToList("selected/places", item);
        };
        QuickAdd.prototype.updateUnits = function () {
            var list = JSON.parse(sessionStorage.getItem("selected/units")) || [];
            list.splice(0, 0, emptyItem);
            this.list.Units(list);
        };
        QuickAdd.prototype.addUnit = function (item) {
            addToList("selected/units", item);
        };
        QuickAdd.prototype.searchDataSetClicked = function () {
            this.loadDataSetModal("Find Data Set", "search");
        };
        QuickAdd.prototype.addDataSetClicked = function () {
            this.loadDataSetModal("Add Data Set", "quick-add");
        };
        QuickAdd.prototype.addPlaceClicked = function () {
            this.loadPlaceModal("Add Place", "quick-add");
        };
        QuickAdd.prototype.searchPlaceClicked = function () {
            this.loadPlaceModal("Find Place", "search");
        };
        QuickAdd.prototype.addUnitClicked = function () {
            this.loadUnitModal("Add Unit", "quick-add");
        };
        QuickAdd.prototype.searchUnitClicked = function () {
            this.loadUnitModal("Find Unit", "search");
        };
        QuickAdd.prototype.loadDataSetModal = function (name, tabModal) {
            var _ = this;
            openModal("/Static/Templates/DataSet/SearchModal.html", {
                name: name,
                ajaxContentAdded: function (element) {
                    var DataSetModal = require("modals/search-data-sets");
                    var Search = new DataSetModal({
                        popup: element,
                        tabSearch: tabModal,
                        handler: {
                            onSelected: function (guid, name) {
                                $(element).modal("hide");
                                _.addDataSet({ Text: name, Value: guid });
                                _.updateDataSets();
                                _.model.DataSet.Target.Guid(guid);
                                _.model.DataSet.Target.Name(name);
                            }
                        }
                    });
                    ko.applyBindings(Search, element);
                }
            });
        };
        QuickAdd.prototype.loadUnitModal = function (name, tabModal) {
            var _ = this;
            openModal("/Static/Templates/Concept/SearchModal.html", {
                name: name,
                ajaxContentAdded: function (element) {
                    var modal = new ConceptModal({
                        popup: element,
                        tabModal: tabModal,
                        filter: {
                            ChildrenOfCode: "unit-of-measurement"
                        },
                        handler: {
                            onSelected: function (guid, name) {
                                _.addUnit({ Text: name, Value: guid });
                                _.updateUnits();
                                _.model.Unit.Target.Guid(guid);
                                _.model.Unit.Target.Name(name);
                                $(element).modal("hide");
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                }
            });
        };
        QuickAdd.prototype.loadPlaceModal = function (name, tabModal) {
            var _ = this;
            openModal("/Static/Templates/Agent/SearchModal.html", {
                name: name,
                ajaxContentAdded: function (element) {
                    var modal = new AgentModal({
                        popup: element,
                        tabModal: tabModal,
                        filter: {
                            AgentType: "Place"
                        },
                        handler: {
                            onSelected: function (guid, name) {
                                _.addPlace({ Text: name, Value: guid });
                                _.updatePlaces();
                                _.model.Place.Target.Guid(guid);
                                _.model.Place.Target.Name(name);
                                $(element).modal("hide");
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                    modal.start();
                }
            });
        };
        QuickAdd.prototype.submitClicked = function () {
            this.saveClicked();
        };
        QuickAdd.prototype.closeClicked = function () {
            $(this.popup).modal("hide");
        };
        QuickAdd.prototype.saveClicked = function () {
            this.save();
        };
        QuickAdd.prototype.save = function () {
            var _ = this;
            var data = ko.toJS(this.model);
            $.post("/Admin/DataPoint/QuickAdd", data, function (response) {
                console.log(response);
                if (!response.Success) {
                    alert("There was an error ...");
                    return;
                }
                _.handler.onSelected(response.Data.Guid);
            });
        };
        return QuickAdd;
    })();

    return QuickAdd;
}));