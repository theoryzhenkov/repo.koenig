import type {LexicalNode} from 'lexical';
const getColorTag = (nodeElem: HTMLElement) => {
    const colorClass = nodeElem.classList?.value?.match(/kg-callout-card-(\w+)/);
    return colorClass && colorClass[1];
};

// TheoR: extract the title text from a `[data-callout-title]` element while
// ignoring the icon span so the stored title stays plain text.
const getDataCalloutTitle = (titleNode: Element | null | undefined): string => {
    if (!titleNode) {
        return '';
    }
    const clone = titleNode.cloneNode(true) as Element;
    clone.querySelector('[data-callout-icon]')?.remove();
    return clone.textContent?.trim() || '';
};

export function parseCalloutNode(CalloutNode: new (data: Record<string, unknown>) => LexicalNode) {
    return {
        div: (nodeElem: HTMLElement) => {
            // TheoR: Home-native `[data-callout]` markup takes precedence so
            // pasted/imported Home callouts round-trip back into callout nodes.
            const isHomeCallout = nodeElem.hasAttribute('data-callout');
            if (nodeElem.tagName === 'DIV' && isHomeCallout) {
                return {
                    conversion(domNode: HTMLElement) {
                        const titleNode = domNode?.querySelector('[data-callout-title]');
                        const bodyNode = domNode?.querySelector('[data-callout-body]');
                        const iconNode = domNode?.querySelector('[data-callout-icon]');

                        const payload: Record<string, unknown> = {
                            calloutText: bodyNode && bodyNode.innerHTML.trim() || '',
                            calloutTitle: getDataCalloutTitle(titleNode),
                            calloutIcon: iconNode?.getAttribute('data-callout-icon') || '',
                            backgroundColor: domNode?.getAttribute('data-callout-type') || 'info'
                        };

                        const node = new CalloutNode(payload);
                        return {node};
                    },
                    priority: 1 as const
                };
            }

            const isKgCalloutCard = nodeElem.classList?.contains('kg-callout-card');
            if (nodeElem.tagName === 'DIV' && isKgCalloutCard) {
                return {
                    conversion(domNode: HTMLElement) {
                        const textNode = domNode?.querySelector('.kg-callout-text');
                        const emojiNode = domNode?.querySelector('.kg-callout-emoji');
                        const color = getColorTag(domNode);

                        const payload: Record<string, unknown> = {
                            calloutText: textNode && textNode.innerHTML.trim() || '',
                            calloutEmoji: emojiNode && emojiNode.innerHTML.trim() || '',
                            backgroundColor: color
                        };

                        const node = new CalloutNode(payload);
                        return {node};
                    },
                    priority: 1 as const
                };
            }
            return null;
        }
    };
}
