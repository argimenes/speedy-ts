import { Component, For, Show, createEffect, onCleanup } from "solid-js";
import { ContextMenuItem, MenuItem } from "./menu-item";


interface ContextMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  items: ContextMenuItem[];
}

export const ContextMenu2: Component<ContextMenuProps> = (props) => {
  const handleClickOutside = () => props.onClose();

  createEffect(() => {
    if (props.visible) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
  });

  onCleanup(() => {
    document.removeEventListener("mousedown", handleClickOutside);
  });

  return (
    <Show when={props.visible}>
      <div
        class="absolute z-50 bg-white shadow-lg rounded-md border border-gray-200 text-sm overflow-hidden"
        style={{
          top: `${props.position.y}px`,
          left: `${props.position.x}px`,
          "min-width": "200px",
        }}
      >
        <For each={props.items}>
          {(item) => <MenuItem item={item} onClose={props.onClose} />}
        </For>
      </div>
    </Show>
  );
};
