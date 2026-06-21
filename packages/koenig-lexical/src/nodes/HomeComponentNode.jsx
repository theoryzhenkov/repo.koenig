import HomeComponentIcon from '../assets/icons/kg-card-type-collection.svg?react';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {HomeComponentNode as BaseHomeComponentNode} from '@tryghost/kg-default-nodes';
import {HomeComponentNodeComponent} from './HomeComponentNodeComponent';
import {createCommand} from 'lexical';

export const INSERT_HOME_COMPONENT_COMMAND = createCommand();

export class HomeComponentNode extends BaseHomeComponentNode {
    static kgMenu = {
        label: 'Home component',
        desc: 'Embed a home.theor.net component',
        Icon: HomeComponentIcon,
        insertCommand: INSERT_HOME_COMPONENT_COMMAND,
        matches: ['home', 'component', 'table', 'content table', 'notes', 'cards', 'shortcode'],
        priority: 12,
        shortcut: '/home'
    };

    getIcon() {
        return HomeComponentIcon;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()}>
                <HomeComponentNodeComponent
                    component={this.component}
                    nodeKey={this.getKey()}
                    params={this.params}
                />
            </KoenigCardWrapper>
        );
    }
}

export function $createHomeComponentNode(dataset) {
    return new HomeComponentNode(dataset);
}

export function $isHomeComponentNode(node) {
    return node instanceof HomeComponentNode;
}
