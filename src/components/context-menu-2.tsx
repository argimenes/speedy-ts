import { For, JSX, Show, createEffect, createSignal, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";
import clsx from "clsx";

type MenuItem =
  | {
      type?: "item";
      label: string;
      onClick?: () => void;
      icon?: JSX.Element;
      shortcut?: string;
      disabled?: boolean;
      children?: MenuItem[];
    }
  | {
      type: "separator";
    };

type ContextMenuProps = {
  items: MenuItem[];
  visible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
};

export function ContextMenu2(props: ContextMenuProps): JSX.Element {
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
      <Portal>
        <div
          class="fixed z-50 bg-white shadow-lg rounded-md border border-gray-200 text-sm overflow-hidden"
          style={{
            top: `${props.position.y}px`,
            left: `${props.position.x}px`,
            "min-width": "200px",
          }}
        >
          <For each={props.items}>
            {(item, i) => {
              if (item.type === "separator") {
                return <div class="my-1 border-t border-gray-200" />;
              }

              const isDisabled = item.disabled;
              const hasChildren = !!item.children?.length;

              return (
                <div
                  class="relative"
                  onMouseEnter={() => {
                    console.log("mouseenter", i());
                    clearTimeout(closeTimeout);
                    if (!isDisabled) setOpenIndex(i());
                  }}
                  onMouseLeave={() => {
                    console.log("mouseleave", i());
                    closeTimeout = window.setTimeout(() => {
                      console.log("closeTimeout fired");
                      setOpenIndex(null);
                    }, 300);
                  }}

                >
                  <div
                    class={clsx(
                      "flex items-center justify-between gap-2 px-3 py-2",
                      isDisabled
                        ? "text-gray-400 cursor-not-allowed"
                        : "hover:bg-gray-100 cursor-pointer"
                    )}
                    onClick={(e) => {
                      if (isDisabled) return;
                      e.stopPropagation();
                      item.onClick?.();
                      if (!hasChildren) props.onClose();
                    }}
                  >
                    {/* Left: icon + label */}
                    <div class="flex items-center gap-2 overflow-hidden">
                      <Show when={item.icon}>
                        <span class="text-gray-500">{item.icon}</span>
                      </Show>
                      <span class="truncate">{item.label}</span>
                    </div>

                    {/* Right: shortcut + submenu arrow */}
                    <div class="flex items-center gap-2 text-gray-400 ml-2">
                      <Show when={item.shortcut}>
                        <span class="text-xs tabular-nums">{item.shortcut}</span>
                      </Show>
                      <Show when={hasChildren}>
                        <span>▶</span>
                      </Show>
                    </div>
                  </div>

                  {/* Submenu */}
                  <Show when={hasChildren && openIndex() === i() && !isDisabled}>
                    <div
                      class="absolute top-0 left-full ml-1 bg-white border border-gray-200 shadow-lg rounded-md min-w-[200px] z-50"
                    >
                      <For each={item.children}>
                        {(subItem) => {
                          if (subItem.type === "separator") {
                            return <div class="my-1 border-t border-gray-200" />;
                          }

                          const subDisabled = subItem.disabled;

                          return (
                            <div
                              class={clsx(
                                "flex items-center justify-between gap-2 px-3 py-2",
                                subDisabled
                                  ? "text-gray-400 cursor-not-allowed"
                                  : "hover:bg-gray-100 cursor-pointer"
                              )}
                              onClick={(e) => {
                                if (subDisabled) return;
                                e.stopPropagation();
                                subItem.onClick?.();
                                props.onClose();
                              }}
                            >
                              <div class="flex items-center gap-2 overflow-hidden">
                                <Show when={subItem.icon}>
                                  <span class="text-gray-500">{subItem.icon}</span>
                                </Show>
                                <span class="truncate">{subItem.label}</span>
                              </div>
                              <Show when={subItem.shortcut}>
                                <span class="text-xs text-gray-400 tabular-nums">
                                  {subItem.shortcut}
                                </span>
                              </Show>
                            </div>
                          );
                        }}
                      </For>
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>
      </Portal>
    </Show>
  );
}
