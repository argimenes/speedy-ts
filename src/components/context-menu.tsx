import { Component, For, JSX, Show, createEffect, createSignal, onCleanup } from "solid-js";
import clsx from "clsx";

interface ContextMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  items: ContextMenuItem[];
}

const submenuCloseTimeouts = new Map<number, number>();

export const ContextMenu: Component<ContextMenuProps> = (props) => {
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


type InputItemType = {
  type: "input";
  label: string;
  placeholder?: string;
  value?: () => string;
  onInput: (value: string) => void;
};

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

export type ContextMenuItem = MenuItemType | SeparatorType | InputItemType;

type MenuItemProps = {
  item: ContextMenuItem;
  level: number;
  onClose: () => void;
};

export const MenuItem: Component<MenuItemProps> = (props) => {
  const [open, setOpen] = createSignal(false);
  let closeTimeout: number;

  // Handle separators early
  if (props.item.type === "separator") {
    return <div class="my-1 border-t border-gray-200" />;
  }

  // Handle input field items
  if (props.item.type === "input") {
    const [value, setValue] = createSignal((props.item.value && props.item.value()) || "");
    let inputRef: HTMLInputElement | undefined;

    createEffect(() => {
      requestAnimationFrame(() => {
        inputRef?.focus();
      });
    });

    const submit = () => {
      if (value().trim()) {
        props.item.onInput(value().trim());
        props.onClose();
      }
    };

    return (
      <div class="flex items-center gap-2 px-3 py-2">
        <input
          ref={inputRef}
          type="text"
          autofocus
          value={value()}
          onMouseDown={(e) => e.stopPropagation()}
          onInput={(e) => setValue(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            e.stopPropagation();
          }}
          placeholder={props.item.placeholder}
          class="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          class="text-blue-600 text-sm font-medium px-2 py-1 hover:underline"
          onClick={submit}
        >
          OK
        </button>
      </div>
    );
  }

  // Handle standard items
  const item = props.item;

  return (
    <div
      class="relative"
      onMouseEnter={() => {
        clearTimeout(submenuCloseTimeouts.get(props.level) ?? 0);
        setOpen(true);
      }}
      onMouseLeave={() => {
        const timeoutId = window.setTimeout(() => {
          setOpen(false);
        }, 300);
        submenuCloseTimeouts.set(props.level, timeoutId);
      }}
    >
      <div
        class={clsx(
          "flex items-center justify-between px-3 py-2 hover:bg-gray-100  transition-all whitespace-nowrap",
          item.disabled && "opacity-50 pointer-events-none"
        )}
        onClick={(e) => {
          if (!item.disabled && item.onClick) {
            item.onClick();
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
          onMouseEnter={() => clearTimeout(closeTimeout)}
          onMouseLeave={() => {
            closeTimeout = window.setTimeout(() => {
              setOpen(false);
            }, 300);
          }}
        >
          <For each={item.children}>
            {(child) => (
              <MenuItem
                item={child}
                level={props.level + 1}
                onClose={props.onClose}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

