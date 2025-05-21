import { Component, For, JSX, Show, createEffect, createSignal, onCleanup } from "solid-js";
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
          "flex items-center justify-between px-3 py-2 hover:bg-gray-100 cursor-pointer transition-all",
          item.disabled && "opacity-50 pointer-events-none"
        )}
        onClick={() => {
          if (!item.disabled && item.onClick) {
            item.onClick();
            props.onClose();
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
          onMouseEnter={() => clearTimeout(closeTimeout)}
          onMouseLeave={() => {
            closeTimeout = window.setTimeout(() => {
              setOpen(false);
            }, 300);
          }}
        >
          <For each={item.children}>
            {(child) => <MenuItem item={child} onClose={props.onClose} />}
          </For>
        </div>
      </Show>
    </div>
  );
};

interface ContextMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  items: ContextMenuItem[];
};

export const ContextMenu2 : Component<ContextMenuProps> = (props) => {
  const [openIndex, setOpenIndex] = createSignal<number | null>(null);
  let closeTimeout: number | undefined;

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
          class="fixed z-50 bg-white shadow-lg rounded-md border border-gray-200 text-sm overflow-hidden"
          style={{
            top: `${props.position.y}px`,
            left: `${props.position.x}px`,
            "min-width": "200px",
          }}>
          <For each={props.items}>{ (item, i) => {
              if (item.type === "separator") {
                return <div class="my-1 border-t border-gray-200" />;
              }

              const isDisabled = item.disabled;
              const hasChildren = !!item.children?.length;

              return (
                  <div
                    class="context-menu-container fixed z-50 bg-white border border-gray-300 shadow-xl rounded-md min-w-[200px] text-sm">
                    <MenuItem item={item} onClose={props.onClose} />
                  </div>
              );
            }}</For>
          </div>
    </Show>
  );
}
