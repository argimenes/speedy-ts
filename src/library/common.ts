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