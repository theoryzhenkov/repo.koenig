import {generateDecoratorNode, type DecoratorNodeProperty} from '../../generate-decorator-node.js';
import {renderCalloutNode} from './callout-renderer.js';
import {parseCalloutNode} from './callout-parser.js';

export interface CalloutData {
    calloutText?: string;
    calloutTitle?: string;
    calloutIcon?: string;
    calloutEmoji?: string;
    backgroundColor?: string;
}

export interface CalloutNode {
    calloutText: string;
    calloutTitle: string;
    calloutIcon: string;
    calloutEmoji: string;
    backgroundColor: string;
}

// TheoR: callout "color" is treated as a semantic type (info/tip/warning/...).
// Legacy Ghost colors map onto the closest type, and each type has a default
// Lucide icon used when the author hasn't picked one explicitly.
const legacyColorToType: Record<string, string> = {
    white: 'note',
    grey: 'note',
    blue: 'info',
    green: 'tip',
    yellow: 'warning',
    red: 'danger',
    pink: 'danger',
    purple: 'important',
    accent: 'important'
};

const typeDefaultIcons: Record<string, string> = {
    note: 'info',
    info: 'info',
    tip: 'lightbulb',
    hint: 'lightbulb',
    important: 'sparkles',
    warning: 'triangle-alert',
    caution: 'triangle-alert',
    attention: 'triangle-alert',
    danger: 'circle-x',
    error: 'circle-x',
    bug: 'circle-x',
    quote: 'message-square-quote',
    cite: 'message-square-quote'
};

const validTypes = new Set([...Object.keys(typeDefaultIcons)]);

function normalizeCalloutType(type: string | undefined): string {
    const normalizedType = (type || '').toLowerCase();
    return validTypes.has(normalizedType) ? normalizedType : legacyColorToType[normalizedType] || 'info';
}

const calloutProperties = [
    {name: 'calloutText', default: '', wordCount: true},
    {name: 'calloutTitle', default: ''},
    {name: 'calloutIcon', default: 'info'},
    {name: 'calloutEmoji', default: ''},
    {name: 'backgroundColor', default: 'info'}
] as const satisfies readonly DecoratorNodeProperty[];

export class CalloutNode extends generateDecoratorNode({
    nodeType: 'callout',
    properties: calloutProperties,
    defaultRenderFn: renderCalloutNode
}) {
    /* override */
    constructor({calloutText, calloutTitle, calloutIcon, calloutEmoji, backgroundColor}: CalloutData = {}, key?: string) {
        super({}, key);
        const type = normalizeCalloutType(backgroundColor);
        this.__calloutText = calloutText || '';
        this.__calloutTitle = calloutTitle || '';
        this.__calloutIcon = calloutIcon || typeDefaultIcons[type] || 'info';
        this.__calloutEmoji = calloutEmoji || '';
        this.__backgroundColor = type;
    }

    static importDOM() {
        return parseCalloutNode(this);
    }
}

export function $isCalloutNode(node: unknown): node is CalloutNode {
    return node instanceof CalloutNode;
}

export const $createCalloutNode = (dataset: CalloutData = {}) => {
    return new CalloutNode(dataset);
};
