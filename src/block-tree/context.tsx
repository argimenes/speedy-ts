import { Component, createContext, JSX, useContext } from "solid-js";
import { BlockActions } from "./store";

// context.ts
const BlockContext = createContext<BlockActions>();

export const BlockProvider: Component<{ 
  actions: BlockActions; 
  children: JSX.Element 
}> = (props) => {
  return (
    <BlockContext.Provider value={props.actions}>
      {props.children}
    </BlockContext.Provider>
  );
};

export function useBlockActions() {
  const context = useContext(BlockContext);
  if (!context) {
    throw new Error("useBlockActions must be used within a BlockProvider");
  }
  return context;
}

