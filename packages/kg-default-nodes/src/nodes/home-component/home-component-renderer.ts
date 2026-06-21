import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions} from '../../export-dom.js';

interface HomeComponentNodeData {
    component: string;
    params: string;
}

interface RenderOptions extends ExportDOMOptions {}

// TheoR: Home-native components (content-table, notes-feed, link-cards, ...) are
// authored as `::name{attrs}` directive shortcodes that home.theor.net's
// shortcode renderer parses out of the post body. We render the card to a single
// paragraph holding that directive text so the existing Home parser picks it up.
export function renderHomeComponentNode(node: HomeComponentNodeData, options: RenderOptions = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    const component = (node.component || '').trim();
    const params = (node.params || '').trim();

    const element = document.createElement('p');
    if (!component) {
        return {element, type: 'outer' as const};
    }

    element.textContent = `::${component}{${params}}`;
    return {element, type: 'outer' as const};
}
