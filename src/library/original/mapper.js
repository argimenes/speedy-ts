define("app/mapper", [], function () {

    var Mapper = {};

    Mapper.toStandoffPropertyText = function (model) {
        model = model || {};
        model.Entity = model.Entity || {};
        model.StandoffProperties = model.StandoffProperties || [];
        var properties = model.StandoffProperties.filter(function (x) { return x.Relation; }).map(function (x) { return x.Target; }).map(function (x) {
            var attributes = {};
            if (x.Attributes.length) {
                x.Attributes.forEach(function (pair) {
                    var parts = pair.split('|'), key = parts[0], value = parts[1];
                    attributes[key] = value;
                });
            }
            return {
                index: x.Index,
                userGuid: x.UserGuid,
                guid: x.Guid,
                type: x.Type,
                startIndex: x.StartIndex,
                endIndex: x.EndIndex,
                value: x.Value,
                text: x.Text,
                layer: x.Layer,
                attributes: attributes,
                isZeroPoint: x.IsZeroPoint,
                isDeleted: x.IsDeleted                
            }
        });
        return {
            text: model.Entity.Value || "",
            properties: properties || []
        };
    };

    return Mapper;

});