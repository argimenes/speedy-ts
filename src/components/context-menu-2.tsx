import { Component, For, Show, createEffect, onCleanup } from "solid-js";
import { ContextMenuItem, MenuItem } from "./menu-item";


interface ContextMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  items: ContextMenuItem[];
}

export const ContextMenu2: Component<ContextMenuProps> = (props) => {
  let menuRef: HTMLDivElement | undefined;

  const handleClickOutside = (e: MouseEvent) => {
    if (menuRef && !menuRef.contains(e.target as Node)) {
      console.log("handleClickOutside", { e });
      props.onClose();
    }
  };

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
        ref={menuRef}
        class="absolute z-50 bg-white shadow-lg rounded-md border border-gray-200 text-sm overflow-visible"
        style={{
          top: `${props.position.y}px`,
          left: `${props.position.x}px`,
          "min-width": "200px",
        }}
      >
        <For each={props.items}>
          {(item) => <MenuItem item={item} level={1} onClose={props.onClose} />}
        </For>
      </div>
    </Show>
  );
};
