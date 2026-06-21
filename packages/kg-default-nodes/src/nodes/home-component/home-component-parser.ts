import type {LexicalNode} from 'lexical';

// Known Home component directives. Keep in sync with home.theor.net's
// `parseHomeShortcodes` so we only convert directives Home can actually render.
export const HOME_COMPONENTS = ['content-table', 'notes-feed', 'link-cards'];

const directivePattern = /^::([a-z][a-z0-9-]*)\{([^}]*)\}$/;

export function parseHomeComponentNode(HomeComponentNode: new (data: Record<string, unknown>) => LexicalNode) {
    return {
        p: (nodeElem: HTMLElement) => {
            if (nodeElem.tagName !== 'P') {
                return null;
            }

            const match = nodeElem.textContent?.trim().match(directivePattern);
            if (!match || !HOME_COMPONENTS.includes(match[1])) {
                return null;
            }

            return {
                conversion(domNode: HTMLElement) {
                    const inner = domNode.textContent?.trim().match(directivePattern);
                    const payload: Record<string, unknown> = {
                        component: inner?.[1] || '',
                        params: inner?.[2]?.trim() || ''
                    };
                    return {node: new HomeComponentNode(payload)};
                },
                // higher than the default paragraph handler so the directive
                // paragraph becomes a card rather than plain text
                priority: 2 as const
            };
        }
    };
}
