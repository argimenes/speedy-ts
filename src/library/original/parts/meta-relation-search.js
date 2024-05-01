(function (factory) {
    define("parts/meta-relation-search", ["knockout", "jquery", "app/utils", "app/helpers", "modals/search-agents"], factory);
}(function (ko, $, Utils, Helper, AgentModal) {

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
                Agent: ko.observable(cons.filter.Agent),
                MetaRelationType: ko.observable(cons.filter.MetaRelationType),

                Page: ko.observable(cons.filter.Page || 1),
                PageRows: ko.observable(cons.filter.PageRows || 5),
                Order: ko.observable(cons.filter.Order || "ByName"),
                Direction: ko.observable(cons.filter.Direction || "Ascending"),
            };
            this.list = {
                SelectedAgents: ko.observableArray(cons.list.SelectedAgents || [emptyItem]),
                Pages: ko.observableArray([1]),
                SortOptions: ko.observableArray(cons.list.SortOptions),
                Records: ko.observableArray(cons.list.Records || [5, 10, 20]),
                Directions: ko.observableArray(cons.list.Directions),
                MetaRelationTypes: ko.observableArray(cons.list.MetaRelationTypes),
            };
            this.handler = {
                onSelected: cons.handler.onSelected
            }
        }
        Search.prototype.prepare = function (cons) {
            cons.filter = cons.filter || {};
            cons.list = cons.list || {};
        };
        Search.prototype.start = function () {
            this.loadPage();
        };
        Search.prototype.toDate = function (json) {
            var date = new Date(json.match(/\d+/)[0] * 1);
            return "{yyyy}/{MM}/{dd}".fmt({ yyyy: date.getFullYear(), MM: date.getMonth() + 1, dd: date.getDate() });
        };
        Search.prototype.setLists = function (data) {
            setList(this.filter.Order, this.list.SortOptions, data.SortOptions);
            setList(this.filter.Direction, this.list.Directions, data.Directions);
            setList(this.filter.MetaRelationType, this.list.MetaRelationTypes, data.MetaRelationTypes);
            //this.updateSelectedAgents();
        };
        Search.prototype.updateSelectedAgents = function () {
            var agents = JSON.parse(sessionStorage.getItem("selected/agents")) || [];
            agents.splice(0, 0, emptyItem);
            this.list.SelectedAgents(agents);
        };
        Search.prototype.addSelectedAgent = function (item) {
            addToList("selected/agents", item);
        };
        Search.prototype.searchAgentClicked = function () {
            var _ = this;
            openModal("/Static/Templates/Agent/SearchModal.html", {
                name: "Find Agent",
                ajaxContentAdded: function (element) {
                    var Search = new AgentModal({
                        popup: element,
                        tabSearch: "search",
                        handler: {
                            onSelected: function (guid, name) {
                                $(element).modal("hide");
                                _.addSelectedAgent({ Text: name, Value: guid });
                                _.updateSelectedAgents();
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
            $.get("/Admin/MetaRelation/SearchJson", filter, function (response) {
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
        Search.prototype.deleteClicked = function (item) {
            var _this = this;
            var proceed = confirm("This action is permanent. Proceed?");
            if (false == proceed) {
                return false;
            }            
            var params = {
                id: item.Entity.Guid
            };
            $.get("/Admin/MetaRelation/Purge", params, function (response) {
                _this.loadPage();
            });
        };
        Search.prototype.isRelatedClicked = function (item) {
            window.open("/Admin/Agent/Index/{id}".fmt({ id: item.Source.Guid }), '_blank');
        };
        Search.prototype.selectClicked = function (item) {
            this.selected(item.Entity.Guid);
        };
        Search.prototype.selected = function (guid) {
            this.handler.onSelected(guid);
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
            this.filter.Agent(null);
            this.filter.MetaRelationType(null);
            this.filter.Order(null);
            this.filter.PageRows(null);
            this.filter.Page(null);
            this.filter.Direction("Ascending");
        };
        return Search;
    })();

    return Search;

}));