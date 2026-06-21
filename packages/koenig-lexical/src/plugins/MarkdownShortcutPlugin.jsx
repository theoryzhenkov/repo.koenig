import React from 'react';
import {$createCodeBlockNode, $isCodeBlockNode, CodeBlockNode} from '../nodes/CodeBlockNode';
import {$createHorizontalRuleNode, $isHorizontalRuleNode, HorizontalRuleNode} from '../nodes/HorizontalRuleNode';
import {$createNodeSelection, $createTextNode, $getNodeByKey, $setSelection} from 'lexical';
import {
    HEADING,
    ORDERED_LIST,
    QUOTE,
    TEXT_FORMAT_TRANSFORMERS,
    TEXT_MATCH_TRANSFORMERS,
    UNORDERED_LIST
} from '@lexical/markdown';
import {$isHeadingNode} from '@lexical/rich-text';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// A list marker like `1. ` or `- ` at the start of a heading (e.g. a numbered
// heading "1. Introduction") should stay literal text rather than convert the
// heading into a list. `@lexical/markdown` strips the matched marker before
// calling `replace`, so we re-insert it verbatim. We must also avoid an infinite
// loop: the re-inserted marker matches the same regExp and `runElementTransformers`
// fires again synchronously. Placing the caret at offset 1 makes the immediate
// re-run fail its leading checks (the char before the caret is no longer a
// space and the match length no longer equals the caret offset), then a
// `historic`-tagged microtask update (which the markdown listener ignores)
// restores the caret to the end of the heading.
const guardListInHeadings = (transformers, editor) => transformers.map((transformer) => {
    if (transformer !== ORDERED_LIST && transformer !== UNORDERED_LIST) {
        return transformer;
    }
    return {
        ...transformer,
        replace: (parentNode, children, match, isImport) => {
            if (!isImport && $isHeadingNode(parentNode)) {
                const markerNode = $createTextNode(match[0]);
                parentNode.splice(0, 0, [markerNode]);
                markerNode.select(1, 1);

                const headingKey = parentNode.getKey();
                queueMicrotask(() => {
                    editor.update(() => {
                        $getNodeByKey(headingKey)?.selectEnd();
                    }, {tag: 'historic'});
                });
                return;
            }
            return transformer.replace(parentNode, children, match, isImport);
        }
    };
});
import {MarkdownShortcutPlugin as LexicalMarkdownShortcutPlugin} from '@lexical/react/LexicalMarkdownShortcutPlugin';

export const HR = {
    dependencies: [HorizontalRuleNode],
    export: (node) => {
        return $isHorizontalRuleNode(node) ? '---' : null;
    },
    regExp: /^(---|\*\*\*|___)\s?$/,
    replace: (parentNode, _1, _2, isImport) => {
        const line = $createHorizontalRuleNode();

        // TODO: Get rid of isImport flag
        if (isImport || parentNode.getNextSibling() != null) {
            parentNode.replace(line);
        } else {
            parentNode.insertBefore(line);
        }

        line.selectNext();
    },
    type: 'element'
};

export const CODE_BLOCK = {
    dependencies: [CodeBlockNode],
    export: (node) => {
        if (!$isCodeBlockNode(node)) {
            return null;
        }
        const textContent = node.getTextContent();
        return (
            '```' +
            (node.language || '') +
            (textContent ? '\n' + textContent : '') +
            '\n' +
            '```'
        );
    },
    regExp: /^```(\w{1,10})?\s/,
    replace: (textNode, match, text) => {
        const language = text[1];
        const codeBlockNode = $createCodeBlockNode({language, _openInEditMode: true});
        const replacementNode = textNode.replace(codeBlockNode);

        // select node when replacing so it immediately renders in editing mode
        const replacementSelection = $createNodeSelection();
        replacementSelection.add(replacementNode.getKey());
        $setSelection(replacementSelection);
    },
    type: 'element'
};

// custom text format transformers
export const SUBSCRIPT = {
    format: ['subscript'],
    tag: '~',
    type: 'text-format'
};

export const SUPERSCRIPT = {
    format: ['superscript'],
    tag: '^',
    type: 'text-format'
};

export const ELEMENT_TRANSFORMERS = [
    HEADING,
    QUOTE,
    UNORDERED_LIST,
    ORDERED_LIST,
    HR,
    CODE_BLOCK
];

export const CUSTOM_TEXT_FORMAT_TRANSFORMERS = [
    SUBSCRIPT,
    SUPERSCRIPT
];

export const DEFAULT_TRANSFORMERS = [
    ...ELEMENT_TRANSFORMERS,
    ...TEXT_FORMAT_TRANSFORMERS,
    ...CUSTOM_TEXT_FORMAT_TRANSFORMERS,
    ...TEXT_MATCH_TRANSFORMERS
];

export const MINIMAL_TRANSFORMERS = [
    ...TEXT_FORMAT_TRANSFORMERS,
    ...CUSTOM_TEXT_FORMAT_TRANSFORMERS,
    ...TEXT_MATCH_TRANSFORMERS
];

export const BASIC_TRANSFORMERS = [
    UNORDERED_LIST,
    ORDERED_LIST,
    ...TEXT_FORMAT_TRANSFORMERS,
    ...CUSTOM_TEXT_FORMAT_TRANSFORMERS,
    ...TEXT_MATCH_TRANSFORMERS
];

export const EMAIL_TRANSFORMERS = [
    HEADING,
    QUOTE,
    UNORDERED_LIST,
    ORDERED_LIST,
    HR,
    ...TEXT_FORMAT_TRANSFORMERS,
    ...CUSTOM_TEXT_FORMAT_TRANSFORMERS,
    ...TEXT_MATCH_TRANSFORMERS
];

export default function MarkdownShortcutPlugin({transformers = DEFAULT_TRANSFORMERS} = {}) {
    const [editor] = useLexicalComposerContext();
    const guardedTransformers = React.useMemo(() => guardListInHeadings(transformers, editor), [transformers, editor]);
    return LexicalMarkdownShortcutPlugin({transformers: guardedTransformers});
}
