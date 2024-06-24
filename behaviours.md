## Functions

### Left arrow navigation within text blocks
If there is a cell to the left, move one cell to the left.
If the caret is at the start of the text block, move the caret to the left of the last character (EOL) in the previous sibling text block.
If there is no previous sibling but there is a parent, move it to above position on the parent.

- Collapse (hide) children of current nested list item.
    - collapse(block: IndentedListBlock)
        - block.metadata.collapsed = true
        - block.renderCollapsedState(block: IndentedListBlock)
- Expand (show) the children of a collapse nested list item.
    - expand(block: IndentedListBlock)
        - block.metadata.collapsed = false
        - block.renderCollapsedState(block: IndentedListBlock)