import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodeProperty, type DecoratorNodeValueMap} from '../../generate-decorator-node.js';
import {renderHomeComponentNode} from './home-component-renderer.js';
import {parseHomeComponentNode} from './home-component-parser.js';

const homeComponentProperties = [
    {name: 'component', default: 'content-table'},
    {name: 'params', default: ''}
] as const satisfies readonly DecoratorNodeProperty[];

export type HomeComponentData = DecoratorNodeData<typeof homeComponentProperties>;

export interface HomeComponentNode extends DecoratorNodeValueMap<typeof homeComponentProperties> {}

// TheoR: a first-class editor card for Home-native components authored as
// `::name{attrs}` directive shortcodes (content-table, notes-feed, link-cards).
export class HomeComponentNode extends generateDecoratorNode({
    nodeType: 'home-component',
    properties: homeComponentProperties,
    defaultRenderFn: renderHomeComponentNode
}) {
    static importDOM() {
        return parseHomeComponentNode(this);
    }
}

export function $createHomeComponentNode(dataset: HomeComponentData = {}) {
    return new HomeComponentNode(dataset);
}

export function $isHomeComponentNode(node: unknown): node is HomeComponentNode {
    return node instanceof HomeComponentNode;
}
