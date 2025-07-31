import { JSX } from "solid-js";
import { render } from "solid-js/web";
import { IndexedBlock } from "../blocks/page-block";
import { IBlock, BlockType } from "./types";
const cache = {};

export const renderToNode2 = (jsx: JSX.Element) => {
    const node = document.createElement("DIV");
    render(() => jsx, node);
    return node;
};
export const renderToNode = (jsx: JSX.Element): HTMLElement => {
  const container = document.createElement("div");
  render(() => jsx, container);
  const rendered = container.firstElementChild as HTMLElement;
  return rendered ?? container; // fallback
};

export const fetchGetCache = async (url: string, params: any) => {
    const key = url + "?" + toQueryString(params);
    if (cache[key]) {
        return cache[key];
    } else {
        const res = await fetch(url + "?" + toQueryString(params));
        const value = await res.json();
        cache[key] = value;
        return value;
    }
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
export const flattenTree = (root: IBlock): IndexedBlock[] => {
    const index: IndexedBlock[] = [];
    function traverse(block: IBlock, depth: number = 0, path: string = '0'): void {
        // Visit the current node
        index.push({ block, index: index.length, depth, path });
        // Recursively traverse all children
        block.blocks.forEach((child, index) => {
            traverse(child, depth + 1, `${path}.${index + 1}`);
        });
    }
    traverse(root);
    return index;
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