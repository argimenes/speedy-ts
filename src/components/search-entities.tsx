import { createStore } from "solid-js/store";
import { autofocus } from "@solid-primitives/autofocus";

type Model = {
    search: string;
}

export function SearchEntitiesWindow(props: any) {
    const [model, setModel] = createStore<Model>({
        search: ""
    });
    const handleSubmit = (e: Event) => {
        e.preventDefault();
        if (props.onSelected) {
            props.onSelected({
                Text: model.search, Value: model.search
            });
        }
    }
    const handleClose = (e:Event) => {
        e.preventDefault();
        if (props.onClose) {
            props.onClose();
        }
    }
    return (
        <>
            <div class="search-entities-window">
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        tabIndex={1}
                        value={model.search}
                        use:autofocus autofocus
                        class="form-control"
                        onInput={(e) => setModel("search", e.currentTarget.value)}
                    />
                    <button type="submit" class="btn btn-primary">SELECT</button>
                    <button type="button" class="btn btn-default" onClick={handleClose}>Close</button>
                </form>
            </div>
        </>
    )
}