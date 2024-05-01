define(["jquery"], function ($) {

    var Service = {};

    Service.GetLists = function (success, error) {
        $.get("/Admin/Agent/SearchModalLists", null, success);
    };
    Service.QuickAdd = function (params, success, error) {
        $.post("/Admin/Agent/QuickAdd", params, success);
    };
    Service.Search = function (params, success, error) {
        $.ajax({
            type: "POST",
            url: "/Admin/Agent/SearchJson",
            cache: false,
            data: params,
            dataType: "json",
            traditional: true,
            success: success
        });
    };

    return Service;
});