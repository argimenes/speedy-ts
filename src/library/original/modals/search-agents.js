(function (factory) {
    define("modals/search-agents", ["knockout", "jquery", "parts/agent-search", "parts/agent-add", "services/remote-agents", "services/local-agents"], factory);
}(function (ko, $, Search, QuickAdd, remoteService, localService) {

    var Modal = (function () {
        function Modal(cons) {
            this.prepare(cons);
            this.popup = cons.popup;
            this.tabs = cons.tabs || ["search", "recentlyUsed", "sourceAgents", "quickAdd"];
            this.currentTab = ko.observable(cons.currentTab || "search");
            this.handler = cons.handler;
            this.tab = {
                quickAdd: new QuickAdd({
                    _parent: this,
                    popup: cons.popup,
                    handler: cons.handler,
                    service: remoteService,
                    model: cons.tab.quickAdd.model
                }),
                search: new Search({
                    _parent: this,
                    popup: cons.popup,
                    mode: cons.mode,
                    filter: cons.tab.search.filter,
                    service: remoteService,
                    handler: cons.handler
                }),
                recentlyUsed: new Search({
                    popup: cons.popup,
                    mode: "modal",
                    service: localService,
                    handler: cons.handler
                }),
                sourceAgents: new Search({
                    popup: cons.popup,
                    mode: cons.mode,
                    filter: cons.tab.sourceAgents.filter,
                    service: remoteService,
                    handler: cons.handler
                })
            };
            this.fade = false;
            this.isModal = cons.mode == "modal";
        }
        Modal.prototype.isActiveTab = function (tab) {
            return this.tabs.indexOf(tab) >= 0;
        }
        Modal.prototype.fadeClicked = function () {
            this.fade = !this.fade;
            if (this.fade) {
                $(".modal").css("opacity", "0.3");
                $(".modal-backdrop").hide();
            }
            else {
                $(".modal").css("opacity", "1");
                $(".modal-backdrop").show();
            }
        };
        Modal.prototype.prepare = function (cons) {
            cons = cons || {};
            cons.tab = cons.tab || {};
            cons.tab.quickAdd = cons.tab.quickAdd || {};
            cons.tab.search = cons.tab.search || {};
            cons.tab.sourceAgents = cons.tab.sourceAgents || {};
        };
        Modal.prototype.tabClicked = function (tab) {
            this.currentTab(tab);
        };
        Modal.prototype.start = function () {
            this.loadLists();
            if (this.currentTab() == "search") {
                this.tab.search.start();
            } else if (this.currentTab() == "recentlyUsed") {
                this.tab.recentlyUsed.start();
            } else if (this.currentTab() == "sourceAgents") {
                this.tab.sourceAgents.start();
            }
        };
        Modal.prototype.loadLists = function () {
            var _ = this;
            remoteService.GetLists(function (response) {
                console.log("response", response);
                if (!response.Success) {
                    return;
                }
                var data = response.Data;
                _.tab.search.setLists(data);
                _.tab.recentlyUsed.setLists(data);
                _.tab.quickAdd.setLists(data);
            });
        };
        Modal.prototype.closeClicked = function () {
            this.close();
        };
        Modal.prototype.close = function () {
            if (this.handler) {
                if (this.handler.closeClicked) {
                    this.handler.closeClicked();
                    return;
                }
            }
            $(this.popup).modal("hide");
        };
        return Modal;
    })();

    return Modal;
}));