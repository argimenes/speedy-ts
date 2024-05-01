(function (factory) {
    define([
        "tinymce"
    ], factory);
}(function (tinymce) {

    function applyTo(selector) {
        tinymce.init({
            selector: selector,
            plugins: [
                //"code", "charmap", "link", "image"
            ],
            toolbar: [
                "undo redo | styleselect | bold italic | link image | alignleft aligncenter alignright | charmap code"
            ]
        });
    }

    function publicForm(selector) {
        tinymce.init({
            selector: selector,
            plugins: [
                //"charmap", "link"
            ],
            toolbar: [
                "undo redo | styleselect | bold italic | link | alignleft aligncenter alignright | charmap"
            ]
        });
    }

    return {
        instance: tinymce,
        applyTo: applyTo,
        publicForm: publicForm
    };

}));