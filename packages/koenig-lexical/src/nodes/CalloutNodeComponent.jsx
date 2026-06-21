import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {CalloutCard, ICON_TO_TYPE} from '../components/ui/cards/CalloutCard';
import {EDIT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu.jsx';
import {sanitizeHtml} from '../utils/sanitize-html';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

const TYPE_DEFAULT_ICON = {
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

export function CalloutNodeComponent({nodeKey, textEditor, textEditorInitialState, backgroundColor, calloutIcon}) {
    const [editor] = useLexicalComposerContext();

    const {isSelected, isEditing, setEditing} = React.useContext(CardContext);
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);
    const calloutIcons = cardConfig.theorCalloutIcons || [];
    const effectiveIcon = calloutIcon || TYPE_DEFAULT_ICON[backgroundColor] || calloutIcons[0]?.name || 'info';

    const handleTypeChange = (iconName) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (!node) {
                return;
            }
            node.calloutIcon = iconName;
            node.backgroundColor = ICON_TO_TYPE[iconName] || node.backgroundColor || 'info';
        });
    };

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey, focusEditor: false});
    };

    React.useEffect(() => {
        textEditor.setEditable(isEditing);
    }, [isEditing, textEditor]);

    return (
        <>
            <CalloutCard
                calloutIcon={effectiveIcon}
                calloutIcons={calloutIcons}
                color={backgroundColor}
                handleTypeChange={handleTypeChange}
                isEditing={isEditing}
                nodeKey={nodeKey}
                sanitizeHtml={sanitizeHtml}
                textEditor={textEditor}
                textEditorInitialState={textEditorInitialState}
            />
            <ActionToolbar
                data-kg-card-toolbar="callout"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="callout"
                isVisible={isSelected && !isEditing && !showSnippetToolbar}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem dataTestId="edit-callout-card" icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
                    <ToolbarMenuSeparator hide={!cardConfig.createSnippet} />
                    <ToolbarMenuItem
                        dataTestId="create-snippet"
                        hide={!cardConfig.createSnippet}
                        icon="snippet"
                        isActive={false}
                        label="Save as snippet"
                        onClick={() => setShowSnippetToolbar(true)}
                    />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}
