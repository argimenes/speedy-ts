define(["jquery", "app/helpers"], function ($, Helper) {

    var store = Helper.store;
    var retrieve = Helper.retrieve;

    var Service = {};

    function asc(a, b) {
        return a > b ? 1 : a == b ? 0 : -1;
    }
    function desc(a, b) {
        return a < b ? 1 : a == b ? 0 : -1;
    }

    var paginate = function (filter, records) {
        if (filter.Name) {
            records = records.filter(function (x) {
                var name = x.Entity.Name || "";
                return name.toLowerCase().indexOf(filter.Name.toLowerCase()) >= 0;
            });
        }
        if (filter.AgentType) {
            records = records.filter(function (x) {
                return x.Entity.AgentType == filter.AgentType;
            });
        }
        if (filter.Order) {
            if (filter.Order == "ByName") {
                if (filter.Direction == "Ascending") {
                    records = records.sort(function (a, b) { return asc(a.Entity.DisplayName, b.Entity.DisplayName); });
                }
                else {
                    records = records.sort(function (a, b) { return desc(a.Entity.DisplayName, b.Entity.DisplayName); });
                }
            }
            if (filter.Order == "ByDateAdded") {
                if (filter.Direction == "Ascending") {
                    records = records.sort(function (a, b) { return asc(a.Entity.DateAddedUTC, b.Entity.DateAddedUTC); });
                }
                else {
                    records = records.sort(function (a, b) { return desc(a.Entity.DateAddedUTC, b.Entity.DateAddedUTC); });
                }
            }
        }
        var count = records.length;
        var page = filter.Page;
        var pageRows = filter.PageRows || 5;
        var maxPage = Math.floor((count / pageRows) + 1);
        if (page < 1) {
            page = 1;
        }
        if (page > maxPage) {
            page = maxPage;
        }
        var index = (page - 1) * pageRows;
        var pageset = records.slice(index, index + pageRows);
        return {
            Count: count,
            Page: page,
            MaxPage: maxPage,
            Results: pageset
        };
    }

    Service.QuickAdd = function (params, success, error) {

    };
    Service.Search = function (filter, success, error) {
        var data = paginate(filter, retrieve("recent/agents"));
        var response = {
            Success: true,
            Data: data
        }
        success(response);
    };

    return Service;
});