import KoenigComposerContext from '../context/KoenigComposerContext';
import Portal from '../components/ui/Portal';
import React from 'react';
import trackEvent from '../utils/analytics';
import {
    $createAtLinkNode,
    $createAtLinkSearchNode,
    $createZWNJNode,
    $isAtLinkNode,
    $isAtLinkSearchNode,
    $isZWNJNode,
    AtLinkNode,
    AtLinkSearchNode
} from '@tryghost/kg-default-nodes';
import {$createBookmarkNode} from '../nodes/BookmarkNode';
import {$createLinkNode} from '@lexical/link';
import {
    $createTextNode,
    $getSelection,
    $isRangeSelection,
    $isTextNode,
    $nodesOfType,
    COMMAND_PRIORITY_HIGH,
    DELETE_CHARACTER_COMMAND,
    FORMAT_ELEMENT_COMMAND,
    FORMAT_TEXT_COMMAND,
    KEY_ESCAPE_COMMAND,
    PASTE_COMMAND
} from 'lexical';
import {$insertFirst, mergeRegister} from '@lexical/utils';
import {AtLinkResultsPopup} from '../components/ui/AtLinkResultsPopup';
import {isInternalUrl} from '../utils/isInternalUrl';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useSearchLinks} from '../hooks/useSearchLinks';

function $removeAtLink(node, {focus = false, trigger = '@'} = {}) {
    if (!$isAtLinkNode(node)) {

        console.warn('$removeAtLink called on a non-at-link node', node);
        return;
    }

    const searchNode = node.getChildAtIndex(1);

    const textNode = $createTextNode(trigger + searchNode.getTextContent());
    textNode.setFormat(node.getLinkFormat());
    node.replace(textNode);

    if (focus) {
        textNode.selectEnd();
    }
}

// Insert a fresh at-link node (zwnj + empty search node) at the current selection
// and place the caret inside the search node so typing populates the query.
function $insertAtLinkNode(linkFormat) {
    const atLinkNode = $createAtLinkNode();
    atLinkNode.setLinkFormat(linkFormat);
    const zwnjNode = $createZWNJNode();
    atLinkNode.append(zwnjNode);
    const atLinkSearchNode = $createAtLinkSearchNode('');
    atLinkNode.append(atLinkSearchNode);

    const selection = $getSelection();
    selection.insertNodes([atLinkNode]);

    // ensure we still have a cursor and it's inside the search node
    atLinkNode.select(1, 1);
    const searchNode = atLinkNode.getChildAtIndex(1);
    const rangeSelection = $getSelection();
    if ($isRangeSelection(rangeSelection)) {
        rangeSelection.anchor.set(searchNode.getKey(), 0, 'element');
        rangeSelection.focus.set(searchNode.getKey(), 0, 'element');
    }
}

function noResultOptions() {
    return [{
        label: 'No results found'
    }];
}

// Manages at-link search nodes and display of the search results panel when appropriate
export const KoenigAtLinkPlugin = ({searchLinks, siteUrl}) => {
    const [editor] = useLexicalComposerContext();
    const [focusedAtLinkNode, setFocusedAtLinkNode] = React.useState(null);
    const [query, setQuery] = React.useState('');
    const searchOptions = React.useMemo(() => ({noResultOptions}), []);
    const {isSearching, listOptions} = useSearchLinks(query, searchLinks, searchOptions);

    // tracks which trigger ('@' or '[[') started the active at-link so the
    // original characters can be restored if the user cancels
    const activeTriggerRef = React.useRef('@');
    const removeAtLink = React.useCallback((node, opts = {}) => {
        $removeAtLink(node, {trigger: activeTriggerRef.current, ...opts});
    }, []);

    // Detect link-search triggers as the user types and convert them into an
    // at-link node:
    // - '[[' fires anywhere (any position, keyboard-layout/IME independent) — we
    //   only inspect the resulting editor text, never the raw key/event data
    // - '@' fires at a word boundary (start of line or after whitespace, and
    //   followed by whitespace/end) so it doesn't hijack emails and handles
    React.useEffect(() => {
        const rootElement = editor.getRootElement();

        const detectAndTrigger = () => {
            let trigger = null;
            let deleteCount = 0;

            editor.getEditorState().read(() => {
                const selection = $getSelection();
                if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
                    return;
                }

                const anchor = selection.anchor;
                if (anchor.type !== 'text') {
                    return;
                }

                const anchorNode = anchor.getNode();
                if (!anchorNode.isSimpleText()) {
                    return;
                }

                const anchorOffset = anchor.offset;
                let textBeforeAnchor = anchorNode.getTextContent().slice(0, anchorOffset);
                let textAfterAnchor = anchorNode.getTextContent().slice(anchorOffset);

                // account for adjacent text nodes at the node boundaries
                const prevSibling = anchorNode.getPreviousSibling();
                const nextSibling = anchorNode.getNextSibling();

                if (anchorOffset === 0 && $isTextNode(prevSibling)) {
                    textBeforeAnchor = prevSibling.getTextContent();
                }

                if (anchorOffset === anchorNode.getTextContent().length && $isTextNode(nextSibling)) {
                    textAfterAnchor = nextSibling.getTextContent();
                }

                // '[[' — robust, position-independent trigger
                if (textBeforeAnchor.endsWith('[[')) {
                    trigger = '[[';
                    deleteCount = 2;
                    return;
                }

                // '@' — word-boundary trigger
                if (/(^|\s)@$/.test(textBeforeAnchor) && /^($|\s|\.)/.test(textAfterAnchor)) {
                    trigger = '@';
                    deleteCount = 1;
                }
            });

            if (!trigger) {
                return;
            }

            activeTriggerRef.current = trigger;

            editor.update(() => {
                const selection = $getSelection();
                if (!$isRangeSelection(selection)) {
                    return;
                }

                // store current node's format so it can be re-applied to the eventual link node
                const linkFormat = selection.anchor.getNode().getFormat();

                // delete the trigger character(s)
                for (let i = 0; i < deleteCount; i++) {
                    selection.deleteCharacter(true);
                }

                $insertAtLinkNode(linkFormat);
            });
        };

        const handleInput = (event) => {
            // composed input (e.g. AltGr/dead-key '@') is handled on compositionend
            if (event.isComposing) {
                return;
            }
            detectAndTrigger();
        };

        const handleCompositionEnd = () => {
            detectAndTrigger();
        };

        // the 'input' event doesn't fire for the very first character typed in an
        // empty paragraph, so re-check after the browser has inserted it
        const handleBeforeInput = (event) => {
            if (event.inputType === 'insertText' && (event.data === '@' || event.data === '[')) {
                requestAnimationFrame(detectAndTrigger);
            }
        };

        rootElement.addEventListener('input', handleInput);
        rootElement.addEventListener('compositionend', handleCompositionEnd);
        rootElement.addEventListener('beforeinput', handleBeforeInput);

        return () => {
            rootElement.removeEventListener('input', handleInput);
            rootElement.removeEventListener('compositionend', handleCompositionEnd);
            rootElement.removeEventListener('beforeinput', handleBeforeInput);
        };
    }, [editor]);

    // register an update listener
    // - update plugin state with a focused at-link node
    // - update plugin state with search query based on at-link-search node text content
    // - remove at-link nodes when they don't have focus (i.e. using arrow keys to move out of them)
    React.useEffect(() => {
        return editor.registerUpdateListener(() => {
            // do nothing if we're in the middle of composing text
            if (editor.isComposing()) {
                return;
            }

            editor.update(() => {
                const atLinkNodes = $nodesOfType(AtLinkNode);
                const selection = $getSelection();

                // we don't have a normal selection so we don't have a cursor inside
                // an at-link node, remove all of them
                if (!$isRangeSelection(selection)) {
                    atLinkNodes.forEach(node => removeAtLink(node));
                    setFocusedAtLinkNode(null);
                    setQuery('');
                    return;
                }

                // we have a collapsed selection, remove any at-link nodes that don't have focus
                // handles cursor movement out of at-link nodes
                if (selection.isCollapsed()) {
                    const anchorNode = selection.anchor.getNode();
                    let selectedAtLinkNode;

                    if ($isAtLinkNode(anchorNode)) {
                        selectedAtLinkNode = anchorNode;
                    }
                    if ($isAtLinkNode(anchorNode.getParent())) {
                        selectedAtLinkNode = anchorNode.getParent();
                    }

                    atLinkNodes.forEach((atLinkNode) => {
                        if (atLinkNode !== selectedAtLinkNode) {
                            removeAtLink(atLinkNode);
                        }
                    });

                    if (selectedAtLinkNode) {
                        // search node is focused, update our search query
                        setFocusedAtLinkNode(selectedAtLinkNode);

                        // at-link nodes always have a ZWNJ node followed by an at-link-search node
                        const searchNode = selectedAtLinkNode.getChildAtIndex(1);
                        const searchNodeText = searchNode?.getTextContent?.();

                        setQuery(searchNodeText);

                        // normalize selection to be inside the search node when on zwnj
                        // - handles case where text is backspaced to empty
                        if ($isZWNJNode(selection.focus.getNode()) && window.getSelection().anchorOffset === 0) {
                            selectedAtLinkNode.select(1, 1);
                            const rangeSelection = $getSelection();
                            if ($isRangeSelection(rangeSelection)) {
                                rangeSelection.anchor.set(searchNode.getKey(), 0, 'element');
                                rangeSelection.focus.set(searchNode.getKey(), 0, 'element');
                            }
                        }

                        // if the search node is already empty but active, remove the at-link node on backspace
                        if (searchNodeText === '' && $isZWNJNode(selection.anchor.getNode())) {
                            removeAtLink(selectedAtLinkNode, {focus: true});
                        }
                    } else {
                        // search node isn't focused, reset plugin state
                        setFocusedAtLinkNode(null);
                        setQuery('');
                    }

                    return;
                }

                // TODO: prevent range selection spanning outside of at-link node
            });
        });
    }, [editor]);

    // register some command handlers to avoid certain actions happening whilst
    // an at-link-search node is focused
    React.useEffect(() => {
        function $skipFormatCommandIfNeeded() {
            const selection = $getSelection();
            if ($isRangeSelection(selection) && $isAtLinkSearchNode(selection.anchor.getNode())) {
                return true;
            }
            return false;
        }

        return mergeRegister(
            // revert to '@' when pressing escape with a focused at-link node
            editor.registerCommand(
                KEY_ESCAPE_COMMAND,
                () => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        const anchorNode = selection.anchor.getNode();
                        if ($isAtLinkNode(anchorNode)) {
                            removeAtLink(anchorNode, {focus: true});
                            return true;
                        }
                        if ($isAtLinkSearchNode(anchorNode) || ($isZWNJNode(anchorNode) && $isAtLinkNode(anchorNode.getParent()))) {
                            removeAtLink(anchorNode.getParent(), {focus: true});
                            return true;
                        }
                    }
                    return false;
                },
                COMMAND_PRIORITY_HIGH
            ),
            // revert to '@' when backspacing or deleting chars at the beginning/end of an at-link node
            editor.registerCommand(
                DELETE_CHARACTER_COMMAND,
                (isBackward) => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        const anchorNode = selection.anchor.getNode();
                        if ($isAtLinkSearchNode(anchorNode) || ($isZWNJNode(anchorNode) && $isAtLinkNode(anchorNode.getParent()))) {
                            const anchorOffset = selection.anchor.offset;
                            if (isBackward && anchorOffset === 0) {
                                removeAtLink(anchorNode.getParent(), {focus: true});
                                return true;
                            }
                            if (!isBackward && anchorOffset === anchorNode.getTextContentSize()) {
                                removeAtLink(anchorNode.getParent(), {focus: true});
                                return true;
                            }
                        }
                    }
                    return false;
                },
                COMMAND_PRIORITY_HIGH
            ),
            // prevent formatting commands when an at-link-search node is focused
            editor.registerCommand(
                FORMAT_TEXT_COMMAND,
                $skipFormatCommandIfNeeded,
                COMMAND_PRIORITY_HIGH
            ),
            editor.registerCommand(
                FORMAT_ELEMENT_COMMAND,
                $skipFormatCommandIfNeeded,
                COMMAND_PRIORITY_HIGH
            ),
            // prevent paste in the search node triggering external paste handlers
            editor.registerCommand(
                PASTE_COMMAND,
                (clipboardEvent) => {
                    const selection = $getSelection();

                    if (!selection || document.activeElement !== editor.getRootElement()) {
                        return false;
                    }

                    const anchorNode = selection.anchor.getNode();
                    if ($isRangeSelection(selection) && ($isAtLinkNode(anchorNode) || $isAtLinkSearchNode(anchorNode))) {
                        clipboardEvent.preventDefault();

                        const atLinkSearchNode = $isAtLinkSearchNode(anchorNode) ? anchorNode : anchorNode.getChildAtIndex(1);
                        const text = clipboardEvent.clipboardData.getData('text/plain');

                        if (text) {
                            atLinkSearchNode.setTextContent(atLinkSearchNode.getTextContent() + text);
                            atLinkSearchNode.selectEnd();
                        }

                        return true;
                    }
                    return false;
                },
                COMMAND_PRIORITY_HIGH
            )
        );
    });

    // register transforms to ensure at-link node trees are valid
    React.useEffect(() => {
        return editor.registerNodeTransform(AtLinkNode, (atLinkNode) => {
            // first child should always be a ZWNJ
            if (!$isZWNJNode(atLinkNode.getFirstChild())) {
                const zwnjNode = $createZWNJNode();
                $insertFirst(atLinkNode, zwnjNode);
            }

            // second child should be a search node
            if (!$isAtLinkSearchNode(atLinkNode.getChildAtIndex(1))) {
                const atLinkSearchNode = $createAtLinkSearchNode('');
                atLinkNode.append(atLinkSearchNode);
            }

            // we only want one search node, remove or replace any non-search nodes
            atLinkNode.getChildren().forEach((child, index) => {
                if (index > 0 && !$isAtLinkSearchNode(child)) {
                    const text = child.getTextContent?.();

                    if (!text) {
                        child.remove();
                    } else {
                        const atLinkSearchNode = $createAtLinkSearchNode(text);
                        child.replace(atLinkSearchNode);
                    }
                }
            });

            // consolidate multiple search nodes from previous step into single node
            const searchNode = atLinkNode.getChildAtIndex(1);
            const currentText = searchNode.getTextContent();
            let consolidatedText = currentText;
            atLinkNode.getChildren().forEach((child, index) => {
                if (index > 1) {
                    consolidatedText += child.getTextContent();
                    child.remove();
                }
            });
            if (consolidatedText !== currentText) {
                searchNode.setTextContent(consolidatedText);
            }
        });
    }, [editor]);

    // when a search result is selected, replace the at-link node with a link node
    const onItemSelect = React.useCallback((item) => {
        editor.update(() => {
            if (!item?.value) {
                removeAtLink(focusedAtLinkNode, {focus: true});
                return;
            }

            const parent = focusedAtLinkNode.getParent();
            // we have to get the children nodes
            const children = parent.getChildren();

            let isTextLink = (children.length !== 1 || !$isAtLinkNode(children[0]));

            if (isTextLink) {
                const linkNode = $createLinkNode(item.value);
                const textNode = $createTextNode(item.label);
                linkNode.append(textNode);
                linkNode.setFormat(focusedAtLinkNode.getLinkFormat());

                focusedAtLinkNode.replace(linkNode);
                linkNode.selectEnd();

                setQuery('');
                setFocusedAtLinkNode(null);
            } else {
                const bookmarkNode = $createBookmarkNode({
                    url: item.value,
                    title: item.label
                });
                focusedAtLinkNode.replace(bookmarkNode);
                bookmarkNode.selectEnd();
            }

            if (item.type === 'internal' || item.type === 'default') {
                trackEvent('Link dropdown: Internal link chosen', {context: 'at-link', fromLatest: item.type === 'default', isBookmark: !isTextLink});
            } else {
                let linkTarget = isInternalUrl(item.value, siteUrl) ? 'internal' : 'external';
                trackEvent('Link dropdown: URL entered', {context: 'at-link', target: linkTarget, isBookmark: !isTextLink});
            }
        });
    }, [editor, focusedAtLinkNode, siteUrl]);

    // render nothing when we don't have a focused at-link node
    if (!focusedAtLinkNode) {
        return null;
    }

    // otherwise render search results popup
    return (
        <Portal data-testid="at-link-popup">
            <AtLinkResultsPopup
                atLinkNode={focusedAtLinkNode}
                isSearching={isSearching}
                listOptions={listOptions}
                query={query}
                onSelect={onItemSelect}
            />
        </Portal>
    );
};

// wrapping KoenigAtLinkPlugin means we can ensure all dependencies are available
// before rendering the plugin, avoiding complex conditionals in the plugin itself
export const AtLinkPlugin = () => {
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const [editor] = useLexicalComposerContext();

    // do nothing if we haven't been passed a way to search internal links
    const enabled = typeof cardConfig?.searchLinks === 'function';
    if (!enabled) {
        return null;
    }

    // do nothing if the required nodes aren't loaded
    if (!editor.hasNodes([AtLinkNode, AtLinkSearchNode])) {
        return null;
    }

    return <KoenigAtLinkPlugin searchLinks={cardConfig.searchLinks} siteUrl={cardConfig.siteUrl} />;
};

export default AtLinkPlugin;
