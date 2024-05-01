(function (factory) {
    define("parts/meta-relation-type-search", ["knockout", "jquery", "app/utils", "app/helpers", "modals/search-concepts"], factory);
}(function (ko, $, Utils, Helper, ConceptModal) {

        var openModal = Helper.openModal;
        var setList = Helper.setList;
        var any = Utils.any;
        var emptyItem = { Text: null, Value: null };
        var addToList = Helper.storeItemInList;

        var Search = (function () {
            function Search(cons) {
                this.prepare(cons);
                this.popup = cons.popup;
                this.results = ko.observableArray([]);
                this.filter = {
                    Guid: ko.observable(cons.filter.Guid),
                    Name: ko.observable(cons.filter.Name),
                    DominantName: ko.observable(cons.filter.DominantName),
                    SubordinateName: ko.observable(cons.filter.SubordinateName),
                    TypeOfMetaRelationType: ko.observable(cons.filter.TypeOfMetaRelationType),

                    Page: ko.observable(cons.filter.Page || 1),
                    PageRows: ko.observable(cons.filter.PageRows || 5),
                    Order: ko.observable(cons.filter.Order || "ByName"),
                    Direction: ko.observable(cons.filter.Direction || "Ascending"),
                };
                this.list = {
                    SelectedTypeOfMetaRelationTypes: ko.observableArray([emptyItem]),

                    Pages: ko.observableArray([1]),
                    SortOptions: ko.observableArray(cons.list.SortOptions),
                    Records: ko.observableArray(cons.list.Records || [5, 10, 20]),
                    Directions: ko.observableArray(cons.list.Directions)                    
                };
                this.handler = {
                    onSelected: cons.handler.onSelected
                }
                this.start();
            }
            Search.prototype.prepare = function (cons) {
                cons.filter = cons.filter || {};
                cons.list = cons.list || {};
            };
            Search.prototype.start = function () {
                this.loadPage();
            };
            Search.prototype.toDate = function (json) {
                return new Date(json.match(/\d+/)[0] * 1);
            };
            Search.prototype.setLists = function (data) {
                setList(this.filter.Order, this.list.SortOptions, data.SortOptions);
                setList(this.filter.Direction, this.list.Directions, data.Directions);
                this.updateTypeOfMetaRelationTypes();
            };
            Search.prototype.updateSelectedTypeOfMetaRelationTypes = function () {
                var list = JSON.parse(sessionStorage.getItem("selected/type-of-meta-relation-types")) || [];
                list.splice(0, 0, emptyItem);
                this.list.SelectedTypeOfMetaRelationTypes(list);
            };
            Search.prototype.addSelectedTypeOfMetaRelationType = function (item) {
                addToList("selected/type-of-meta-relation-types", item);
            };
            Search.prototype.searchTypeOfMetaRelationTypeClicked = function () {
                var _ = this;
                openModal("/Static/Templates/Concept/SearchModal.html", {
                    name: "Find Type of Meta Relation Type",
                    ajaxContentAdded: function (element) {
                        var Search = new ConceptModal({
                            popup: element,
                            tabSearch: "search",
                            handler: {
                                onSelected: function (guid, name) {
                                    $(element).modal("hide");
                                    _.addSelectedTypeOfMetaRelationType({ Text: name, Value: guid });
                                    _.updateSelectedTypeOfMetaRelationTypes();
                                    _.filter.TypeOfMetaRelationType(guid);
                                }
                            }
                        });
                        ko.applyBindings(Search, element);
                        Search.start();
                    }
                });
            };
            Search.prototype.loadPage = function () {
                var _ = this;
                var filter = ko.toJS(this.filter);
                $.get("/Admin/MetaRelationType/SearchJson", filter, function (response) {
                    console.log("response", response);
                    if (!response.Success) {
                        return;
                    }
                    _.results(response.Data.Results);
                    _.list.Pages([]);
                    for (var page = 1; page <= response.Data.MaxPage; page++) {
                        _.list.Pages.push(page);
                    }
                    _.filter.Page(filter.Page);
                });
            };
            Search.prototype.selectClicked = function (item) {
                this.selected(item.Entity.Guid, item.Entity.DisplayName);
            };
            Search.prototype.selected = function (guid, name) {
                this.handler.onSelected(guid, name);
            };
            Search.prototype.submitClicked = function () {
                this.loadPage();
            };
            Search.prototype.clearClicked = function () {
                this.clear();
                this.loadPage();
            };
            Search.prototype.closeClicked = function () {
                this.close();
            };
            Search.prototype.close = function () {
                $(this.popup).Search("hide");
            };
            Search.prototype.clear = function () {
                this.filter.Guid(null);
                this.filter.Name(null);
                this.filter.DominantName(null);
                this.filter.SubordinateName(null);
                this.filter.TypeOfMetaRelationType(null);

                this.filter.Order(null);
                this.filter.PageRows(null);
                this.filter.Page(null);
                this.filter.Direction("Ascending");
            };
            return Search;
        })();

    return Search;

}));