// ContextMenu.tsx
import { createSignal, createEffect, Show, For, onCleanup, JSX } from "solid-js";
import { Portal } from "solid-js/web";

export type MenuItemProps = {
  label: string;
  icon?: string;
  onClick?: () => void;
  disabled?: boolean;
  children?: MenuItemProps[];
};

export type ContextMenuProps = {
  items: MenuItemProps[];
  onClose?: () => void;
};

// Create a global store for managing context menu state
const [isOpen, setIsOpen] = createSignal(false);
const [position, setPosition] = createSignal({ x: 0, y: 0 });
const [menuItems, setMenuItems] = createSignal<MenuItemProps[]>([]);
const [activeSubmenuPath, setActiveSubmenuPath] = createSignal<number[]>([]);

// Public API for controlling the context menu from outside
export const ContextMenuAPI = {
  show: (x: number, y: number) => {
    setPosition({ x, y });
    setActiveSubmenuPath([]);
    setIsOpen(true);
  },
  hide: () => {
    setIsOpen(false);
    setActiveSubmenuPath([]);
  },
  isOpen
};

const MenuItem = (props: {
  item: MenuItemProps;
  path: number[];
}) => {
  const [isHovered, setIsHovered] = createSignal(false);
  const hasSubmenu = () => props.item.children && props.item.children.length > 0;
  
  const isSubmenuActive = () => {
    const activePath = activeSubmenuPath();
    if (activePath.length <= props.path.length) return false;
    
    // Check if this item's path is a prefix of the active submenu path
    return props.path.every((value, index) => value === activePath[index]);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    
    if (hasSubmenu()) {
      setActiveSubmenuPath(props.path);
    }
  };

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    
    if (props.item.disabled) return;
    
    if (!hasSubmenu() && props.item.onClick) {
      props.item.onClick();
      ContextMenuAPI.hide();
    }
  };

  return (
    <div 
      class={`flex items-center px-4 py-2 text-sm cursor-pointer relative ${
        props.item.disabled ? "text-gray-400 cursor-not-allowed" : "hover:bg-gray-100"
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {props.item.icon && (
        <span class="mr-2 text-gray-500">
          {props.item.icon}
        </span>
      )}
      <span class="flex-grow">{props.item.label}</span>
      {hasSubmenu() && (
        <span class="ml-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 12L10 8L6 4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      )}
      
      <Show when={hasSubmenu() && isSubmenuActive()}>
        <SubMenu 
          items={props.item.children || []}
          parentPath={props.path}
        />
      </Show>
    </div>
  );
};

const SubMenu = (props: {
  items: MenuItemProps[];
  parentPath: number[];
}) => {
  return (
    <div
      class="absolute left-full top-0 mt-0 bg-white rounded shadow-lg border border-gray-200 min-w-max py-1 z-10"
      onClick={(e) => e.stopPropagation()}
    >
      <For each={props.items}>
        {(item, index) => (
          <MenuItem
            item={item}
            path={[...props.parentPath, index()]}
          />
        )}
      </For>
    </div>
  );
};

export const ContextMenu = (props: ContextMenuProps) => {
  // Close menu when clicking outside
  const handleGlobalClick = () => {
    ContextMenuAPI.hide();
    props.onClose?.();
  };

  // Handle escape key to close menu
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      ContextMenuAPI.hide();
      props.onClose?.();
    }
  };

  createEffect(() => {
    if (isOpen()) {
      document.addEventListener("click", handleGlobalClick);
      document.addEventListener("keydown", handleKeyDown);
      
      onCleanup(() => {
        document.removeEventListener("click", handleGlobalClick);
        document.removeEventListener("keydown", handleKeyDown);
      });
    }
  });

  return (
    <Show when={isOpen()}>
      <Portal>
        <div
          class="fixed z-50"
          style={{
            top: `${position().y}px`,
            left: `${position().x}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div class="bg-white rounded shadow-lg border border-gray-200 min-w-max py-1">
            <For each={menuItems()}>
              {(item, index) => (
                <MenuItem 
                  item={item}
                  path={[index()]} 
                />
              )}
            </For>
          </div>
        </div>
      </Portal>
    </Show>
  );
};

// Usage example component
export const ContextMenuExample = () => {
  const handleRightClick = (e: MouseEvent) => {
    e.preventDefault();
    
    const items = [
      {
        label: "New",
        icon: "📄",
        children: [
          { label: "File", onClick: () => console.log("New file") },
          { label: "Folder", onClick: () => console.log("New folder") }
        ]
      },
      {
        label: "Open",
        icon: "📂",
        onClick: () => console.log("Open clicked")
      },
      {
        label: "Save",
        icon: "💾",
        onClick: () => console.log("Save clicked")
      },
      { 
        label: "Disabled Item", 
        disabled: true 
      },
      { 
        label: "Share",
        icon: "🔗",
        children: [
          { label: "Twitter", onClick: () => console.log("Twitter") },
          { label: "Facebook", onClick: () => console.log("Facebook") },
          {
            label: "More Options",
            children: [
              { label: "LinkedIn", onClick: () => console.log("LinkedIn") },
              { label: "Email", onClick: () => console.log("Email") }
            ]
          }
        ]
      }
    ];
    
    ContextMenuAPI.show(e.clientX, e.clientY, items);
  };

  const handleCustomShowClick = () => {
    // Example of programmatically showing the context menu
    const items = [
      { label: "Custom Option 1", onClick: () => console.log("Custom 1") },
      { label: "Custom Option 2", onClick: () => console.log("Custom 2") }
    ];
    
    // Show in the middle of the screen as an example
    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;
    
    ContextMenuAPI.show(x, y, items);
  };

  return (
    <div class="flex flex-col gap-4 items-center justify-center h-screen">
      <div 
        class="bg-gray-100 p-8 rounded border border-gray-300 text-center"
        onContextMenu={handleRightClick}
      >
        Right-click here to show the context menu
      </div>
      
      <button
        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={handleCustomShowClick}
      >
        Show Custom Context Menu
      </button>
      
      {/* The ContextMenu component is used once in the app */}
      <ContextMenu items={[]} />
    </div>
  );
};