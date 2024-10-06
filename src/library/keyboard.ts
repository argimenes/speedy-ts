import { TKEYS, Platform } from "./types";

export const getCursorPos = (input: HTMLInputElement|HTMLTextAreaElement) => {
    // Source: https://stackoverflow.com/questions/7745867/how-do-you-get-the-cursor-position-in-a-textarea
    if ("selectionStart" in input && document.activeElement == input) {
        return {
            start: input.selectionStart,
            end: input.selectionEnd
        };
    }
    // else if (input.createTextRange) {
    //     var sel = document.selection.createRange();
    //     if (sel.parentElement() === input) {
    //         var rng = input.createTextRange();
    //         rng.moveToBookmark(sel.getBookmark());
    //         for (var len = 0;
    //                  rng.compareEndPoints("EndToStart", rng) > 0;
    //                  rng.moveEnd("character", -1)) {
    //             len++;
    //         }
    //         rng.setEndPoint("StartToStart", input.createTextRange());
    //         for (var pos = { start: 0, end: len };
    //                  rng.compareEndPoints("EndToStart", rng) > 0;
    //                  rng.moveEnd("character", -1)) {
    //             pos.start++;
    //             pos.end++;
    //         }
    //         return pos;
    //     }
    // }
    return -1;
}


export const KEYS: TKEYS  = {
    BACKSPACE: [
        { code: 8, platform: Platform.Windows }
    ],
    CAPSLOCK: [
        { code: 20, platform: Platform.Windows }
    ],
    PAGE_UP: [
        { code: 33, platform: Platform.Windows }
    ],
    PAGE_DOWN: [
        { code: 34, platform: Platform.Windows }
    ],
    DELETE: [
        { code: 46, platform: Platform.Windows }
    ],
    HOME: [
        { code: 36, platform: Platform.Windows }
    ],
    END: [
        { code: 35, platform: Platform.Windows }
    ],
    INSERT: [
        { code: 45, platform: Platform.Windows }
    ],
    PRINT_SCREEN: [
        { code: 44, platform: Platform.Windows }
    ],
    PAUSE: [
        { code: 19, platform: Platform.Windows }
    ],
    SELECT_KEY: [
        { code: 93, platform: Platform.Windows }
    ],
    NUM_LOCK: [
        { code: 144, platform: Platform.Windows }
    ],
    LEFT_ARROW: [
        { code: 37, platform: Platform.Windows }
    ],
    RIGHT_ARROW: [
        { code: 39, platform: Platform.Windows }
    ],
    UP_ARROW: [
        { code: 38, platform: Platform.Windows }
    ],
    DOWN_ARROW: [
        { code: 40, platform: Platform.Windows }
    ],
    SPACE: [
        { code: 32, platform: Platform.Windows }
    ],
    ESCAPE: [
        { code: 27, platform: Platform.Windows }
    ],
    SHIFT: [
        { code: 16, platform: Platform.Windows }
    ],
    CTRL: [
        { code: 17, platform: Platform.Windows }
    ],
    ALT: [
        { code: 18, platform: Platform.Windows }
    ],
    ENTER: [
        { code: 13, platform: Platform.Windows }
    ],
    LINE_FEED: [
        { code: 10, platform: Platform.Windows }
    ],
    TAB: [
        { code: 9, platform: Platform.Windows }
    ],
    LEFT_WINDOW_KEY: [
        { code: 91, platform: Platform.Windows }
    ],
    CONTEXT_MENU: [
        { code: 93, platform: Platform.Windows }
    ],
    SCROLL_LOCK: [
        { code: 145, platform: Platform.Windows }
    ],
    RIGHT_WINDOW_KEY: [
        { code: 92, platform: Platform.Windows }
    ],
    F1: [
        { code: 112, platform: Platform.Windows }
    ]
};