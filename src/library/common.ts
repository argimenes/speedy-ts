import { JSX } from "solid-js";
import { render } from "solid-js/web";

export const renderToNode = (jsx: JSX.Element) => {
    const node = document.createElement("DIV");
    render(() => jsx, node);
    return node;
};
export const fetchGet = async (url: string, params: any) => {
    return await fetch(url + "?" + toQueryString(params));
};
export const toQueryString = (data: {}): string =>{
    let _data = {};
    for (let key in data) {
        let value = data[key];
        if (value === null || value === "null") {
            continue;
        }
        _data[key] = value;
    }
    const queryString = new URLSearchParams(_data);
    return queryString.toString();
}
export const fetchPost = async (url: string, data: any) => {
    const form = toFormData(nullSafety(data));
    const response = await fetch(url, {
        method: 'POST',
        body: form
    });
    return response;
};
function nullSafety<TModel = Record<string, any>>(obj: TModel): TModel {
    var result: any = {};
    const keys = Object.keys(obj) as (keyof TModel)[];
    keys.forEach(key => {
        const value = obj[key as keyof TModel];
        if (value === undefined || value === null) return;
        if (typeof value === "object") return;
        if (key == "Id" && (value == "0" || value == 0)) return;
        result[key] = typeof value === "string" ? nullSafe(obj, key as keyof TModel) : value;
    });
    return result as TModel;
};
function nullSafe<TModel>(model: TModel, key: keyof TModel) {
    return model[key] && model[key] != "undefined" && model[key] != "null" ? model[key] : "";
};
export const toFormData = (obj: any) => {
    let formData = new FormData();
    for (let key in obj) {
        let value = obj[key];
        formData.append(key, value);
    }
    return formData;
};