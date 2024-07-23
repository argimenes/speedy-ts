import { JSX } from "solid-js";
import { render } from "solid-js/web";

export const renderToNode = (jsx: JSX.Element) => {
    const node = document.createElement("DIV");
    render(() => jsx, node);
    return node;
};