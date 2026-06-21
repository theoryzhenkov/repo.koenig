import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions} from '../../export-dom.js';
import {cleanDOM} from '../../utils/clean-dom.js';

interface CalloutNodeData {
    backgroundColor: string;
    calloutEmoji: string;
    calloutIcon: string;
    calloutText: string;
    calloutTitle: string;
}

interface RenderOptions extends ExportDOMOptions {}

// TheoR: callouts render as Home-native `[data-callout]` markup (rather than
// Ghost's `kg-callout-card`) so home.theor.net can style them with Lucide icons.
const calloutTypeLabels: Record<string, string> = {
    note: 'Note',
    info: 'Info',
    tip: 'Tip',
    hint: 'Hint',
    important: 'Important',
    warning: 'Warning',
    caution: 'Caution',
    attention: 'Attention',
    danger: 'Danger',
    error: 'Error',
    bug: 'Bug',
    quote: 'Quote',
    cite: 'Citation'
};

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

const lucideIcons: Record<string, string> = {
    info: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>',
    lightbulb: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lightbulb" aria-hidden="true"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path><path d="M9 18h6"></path><path d="M10 22h4"></path></svg>',
    sparkles: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles" aria-hidden="true"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path><path d="M20 2v4"></path><path d="M22 4h-4"></path><circle cx="4" cy="20" r="2"></circle></svg>',
    'triangle-alert': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>',
    'circle-x': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-x" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path></svg>',
    'message-square-quote': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-square-quote" aria-hidden="true"><path d="M14 14a2 2 0 0 0 2-2V8h-2"></path><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"></path><path d="M8 14a2 2 0 0 0 2-2V8H8"></path></svg>'
};

function normalizeCalloutType(type: string): string {
    const normalizedType = (type || '').toLowerCase();
    return calloutTypeLabels[normalizedType] ? normalizedType : legacyColorToType[normalizedType] || 'info';
}

function getCalloutIconName(node: CalloutNodeData, type: string): string {
    if (node.calloutIcon && lucideIcons[node.calloutIcon]) {
        return node.calloutIcon;
    }
    return typeDefaultIcons[type] || 'info';
}

export function renderCalloutNode(node: CalloutNodeData, options: RenderOptions = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    const type = normalizeCalloutType(node.backgroundColor);
    const title = node.calloutTitle || calloutTypeLabels[type] || 'Info';
    const iconName = getCalloutIconName(node, type);

    const element = document.createElement('div');
    element.setAttribute('data-callout', '');
    element.setAttribute('data-callout-type', type);

    const titleElement = document.createElement('div');
    titleElement.setAttribute('data-callout-title', '');
    if (iconName && lucideIcons[iconName]) {
        const iconElement = document.createElement('span');
        iconElement.setAttribute('data-callout-icon', iconName);
        iconElement.innerHTML = lucideIcons[iconName];
        titleElement.appendChild(iconElement);
    }
    titleElement.appendChild(document.createTextNode(title));
    element.appendChild(titleElement);

    const textElement = document.createElement('div');
    textElement.setAttribute('data-callout-body', '');

    const temporaryContainer = document.createElement('div');
    temporaryContainer.innerHTML = node.calloutText;

    const allowedTags = ['A', 'STRONG', 'EM', 'B', 'I', 'BR', 'CODE', 'MARK', 'S', 'DEL', 'U', 'SUP', 'SUB'];
    cleanDOM(temporaryContainer, allowedTags);

    textElement.innerHTML = temporaryContainer.innerHTML;
    element.appendChild(textElement);

    return {element, type: 'outer' as const};
}
