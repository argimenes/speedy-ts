(function (factory) {
    define("parts/agent-value-selector", ["knockout", "app/helpers"], factory);
}(function (ko, Helper) {

    var openModal = Helper.openModal;

    function closeModal(element) {
        $(element).modal("hide");
        ko.cleanNode(element);
        element.remove();
    }

    var selector = function (prop, process) {
        openModal("/Static/Templates/Agent/SearchModal.html", {
            name: "Agents",
            ajaxContentAdded: function (element) {
                require(["modals/search-agents"], function (AgentModal) {
                    var modal = new AgentModal({
                        popup: element,
                        tabs: ["search", "recentlyUsed", "quickAdd"],
                        currentTab: "search",
                        tab: {
                            search: {
                                filter: {
                                    Guid: prop.value,
                                    Name: !prop.value ? prop.text : null
                                }
                            },
                            quickAdd: {
                                model: {
                                    Entity: {
                                        Name: prop.text ? prop.text : null
                                    }
                                }
                            }
                        },
                        handler: {
                            onSelected: function (guid, name) {
                                process(guid, name);
                                closeModal(element);
                            }
                        }
                    });
                    ko.applyBindings(modal, element);
                    modal.start();
                });
            }
        });
    };

    return selector;

}));