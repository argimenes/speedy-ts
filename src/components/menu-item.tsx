import { Component, For, JSX, Show, createSignal } from "solid-js";
import clsx from "clsx";

type MenuItemType = {
  type: "item";
  label: string;
  icon?: JSX.Element;
  shortcut?: string;
  disabled?: boolean;
  onClick?: () => void;
  children?: MenuItemType[];
};

type SeparatorType = {
  type: "separator";
};

export type ContextMenuItem = MenuItemType | SeparatorType;

type MenuItemProps = {
  item: ContextMenuItem;
  level: number;
  onClose: () => void;
};

export const MenuItem: Component<MenuItemProps> = (props) => {
  const [open, setOpen] = createSignal(false);
  let closeTimeout: number;

  if (props.item.type === "separator") {
    return <div class="my-1 border-t border-gray-200" />;
  }

  const item = props.item;

  return (
    <div
      class="relative"
      onMouseEnter={() => {
        if (!item.disabled) {
          clearTimeout(closeTimeout);
          setOpen(true);
        }
      }}
      onMouseLeave={() => {
        closeTimeout = window.setTimeout(() => {
          setOpen(false);
        }, 300);
      }}
    >
      <div
        class={clsx(
          "flex items-center justify-between px-3 py-2 hover:bg-gray-100 cursor-pointer transition-all whitespace-nowrap",
          item.disabled && "opacity-50 pointer-events-none"
        )}
        onClick={(e) => {
          console.log("onClick", { e });
          if (!item.disabled && item.onClick) {
            item.onClick();
            // Defer closing the menu so handler finishes first
            //setTimeout(() => props.onClose(), 100);
          }
        }}
      >
        <div class="flex items-center gap-2">
          {item.icon && <span>{item.icon}</span>}
          <span>{item.label}</span>
        </div>
        <div class="flex items-center gap-2">
          {item.shortcut && (
            <span class="text-xs text-gray-500">{item.shortcut}</span>
          )}
          {item.children && <span class="text-gray-400">▶</span>}
        </div>
      </div>

      <Show when={open() && item.children}>
        <div
          class="absolute top-0 left-full ml-1 bg-white border border-gray-200 shadow-lg rounded-md min-w-[200px] z-50"
          //style={{ "left": (props.level * 200) + "px", "z-index": 50 + props.level, "height": "auto" }}
          onMouseEnter={() => clearTimeout(closeTimeout)}
          onMouseLeave={() => {
            closeTimeout = window.setTimeout(() => {
              setOpen(false);
            }, 300);
          }}
        >
          <For each={item.children}>
            {(child) => <MenuItem item={child} level={props.level + 1} onClose={props.onClose} />}
          </For>
        </div>
      </Show>
    </div>
  );
};
