define("services/search-gnd", ["jquery"], function ($) {

    var Service = {};

    Service.Search = function (params, success, error) {
        params.format = "json";
        $.ajax({
            type: "GET",
            url: "http://lobid.org/gnd/search",
            data: params,
            //dataType: "json",
            success: success,
            error: error
        });
    };

    return Service;
});