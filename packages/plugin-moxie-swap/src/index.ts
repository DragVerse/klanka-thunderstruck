export * from "./actions/tokenSwapAction";

import type { Plugin } from "@moxie-protocol/core";
import { tokenSwapAction } from "./actions/tokenSwapAction";

export const moxieSwapPlugin: Plugin = {
    name: "moxieSwapPlugin",
    description: "Moxie Swap plugin",
    providers: [],
    evaluators: [],
    services: [],
    actions: [tokenSwapAction],
};

export default moxieSwapPlugin;
