import React from 'react';
import {$createHomeComponentNode, HomeComponentNode, INSERT_HOME_COMPONENT_COMMAND} from '../nodes/HomeComponentNode';
import {COMMAND_PRIORITY_LOW} from 'lexical';
import {INSERT_CARD_COMMAND} from './KoenigBehaviourPlugin';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const HomeComponentPlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!editor.hasNodes([HomeComponentNode])) {
            console.error('HomeComponentPlugin: HomeComponentNode not registered'); // eslint-disable-line no-console
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_HOME_COMPONENT_COMMAND,
                async (dataset) => {
                    const cardNode = $createHomeComponentNode(dataset);
                    editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode, openInEditMode: true});
                    return true;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    });

    return null;
};

export default HomeComponentPlugin;
