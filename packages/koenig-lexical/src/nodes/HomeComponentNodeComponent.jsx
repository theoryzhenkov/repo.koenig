import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {DropdownSetting, InputSetting, SettingsPanel} from '../components/ui/SettingsPanel.jsx';
import {EDIT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin';
import {ReadOnlyOverlay} from '../components/ui/ReadOnlyOverlay';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu.jsx';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// Keep in sync with home.theor.net's `parseHomeShortcodes`.
const COMPONENTS = [
    {label: 'Content table', name: 'content-table'},
    {label: 'Notes feed', name: 'notes-feed'},
    {label: 'Link cards', name: 'link-cards'}
];

const COMPONENT_LABELS = Object.fromEntries(COMPONENTS.map(c => [c.name, c.label]));

function parseParams(raw) {
    const attrs = [];
    const re = /([A-Za-z_][A-Za-z0-9_-]*)\s*=\s*"([^"]*)"/g;
    let match;
    while ((match = re.exec(raw || '')) !== null) {
        attrs.push({key: match[1], value: match[2]});
    }
    return attrs;
}

function composeParams(attrs) {
    return attrs
        .filter(({key, value}) => key.trim() && value.trim())
        .map(({key, value}) => `${key.trim()}="${value.replace(/"/g, '')}"`)
        .join(' ');
}

export function HomeComponentNodeComponent({nodeKey, component, params}) {
    const [editor] = useLexicalComposerContext();
    const {isSelected, isEditing, setEditing} = React.useContext(CardContext);
    const {cardConfig, darkMode} = React.useContext(KoenigComposerContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const attrs = React.useMemo(() => parseParams(params), [params]);

    const updateNode = (mutator) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (node) {
                mutator(node);
            }
        });
    };

    const handleComponentChange = (name) => {
        updateNode((node) => {
            node.component = name;
            // notes-feed takes no params; clear them when switching to it
            if (name === 'notes-feed') {
                node.params = '';
            }
        });
    };

    const setAttr = (key, value) => {
        const next = attrs.some(a => a.key === key)
            ? attrs.map(a => (a.key === key ? {key, value} : a))
            : [...attrs, {key, value}];
        updateNode(node => (node.params = composeParams(next)));
    };

    const setRow = (index, patch) => {
        const next = attrs.map((a, i) => (i === index ? {...a, ...patch} : a));
        updateNode(node => (node.params = composeParams(next)));
    };

    const addRow = () => updateNode(node => (node.params = composeParams([...attrs, {key: '', value: ''}])));
    const removeRow = index => updateNode(node => (node.params = composeParams(attrs.filter((_, i) => i !== index))));

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey, focusEditor: false});
    };

    const attrFor = key => attrs.find(a => a.key === key)?.value || '';
    const directive = `::${component || ''}{${composeParams(attrs)}}`;

    return (
        <>
            <div className="bg-grey-100 dark:bg-grey-950" data-testid={`home-component-${component}`}>
                <div className="flex items-center gap-2 px-4 py-3">
                    <span className="rounded bg-grey-200 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-grey-700 dark:bg-grey-900 dark:text-grey-300">
                        {COMPONENT_LABELS[component] || component || 'Home component'}
                    </span>
                </div>
                <div className="px-4 pb-3 font-mono text-sm text-grey-700 dark:text-grey-400">{directive}</div>
            </div>

            {isEditing ? (
                <SettingsPanel darkMode={darkMode}>
                    <DropdownSetting
                        dataTestId="home-component-type"
                        label="Component"
                        menu={COMPONENTS.map(c => ({label: c.label, name: c.name}))}
                        value={component}
                        onChange={handleComponentChange}
                    />

                    {component === 'content-table' && (
                        <>
                            <InputSetting
                                dataTestId="home-component-path"
                                label="Path"
                                placeholder="blog"
                                value={attrFor('path')}
                                onChange={e => setAttr('path', e.target.value)}
                            />
                            <InputSetting
                                dataTestId="home-component-classslug"
                                label="Class slug"
                                placeholder="classes/blog-note"
                                value={attrFor('classSlug')}
                                onChange={e => setAttr('classSlug', e.target.value)}
                            />
                        </>
                    )}

                    {component === 'link-cards' && (
                        <div className="flex flex-col gap-2 px-4 py-2" data-testid="home-component-links">
                            <div className="text-2xs font-bold uppercase tracking-wide text-grey-700 dark:text-grey-300">Links</div>
                            {attrs.map((row, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        aria-label="kind"
                                        className="w-1/3 rounded border border-grey-300 bg-transparent px-2 py-1 text-sm dark:border-grey-800"
                                        placeholder="github"
                                        type="text"
                                        value={row.key}
                                        onChange={e => setRow(index, {key: e.target.value})}
                                    />
                                    <input
                                        aria-label="href"
                                        className="flex-1 rounded border border-grey-300 bg-transparent px-2 py-1 text-sm dark:border-grey-800"
                                        placeholder="https://github.com/…"
                                        type="text"
                                        value={row.value}
                                        onChange={e => setRow(index, {value: e.target.value})}
                                    />
                                    <button
                                        aria-label="Remove link"
                                        className="px-2 text-grey-600 hover:text-red"
                                        type="button"
                                        onClick={() => removeRow(index)}
                                    >×</button>
                                </div>
                            ))}
                            <button
                                className="self-start rounded border border-grey-300 px-2 py-1 text-sm text-grey-700 hover:bg-grey-200 dark:border-grey-800 dark:text-grey-300"
                                data-testid="home-component-add-link"
                                type="button"
                                onClick={addRow}
                            >+ Add link</button>
                        </div>
                    )}

                    {component === 'notes-feed' && (
                        <div className="px-4 py-2 text-sm text-grey-600 dark:text-grey-500">This component has no options.</div>
                    )}
                </SettingsPanel>
            ) : (
                <ReadOnlyOverlay />
            )}

            <ActionToolbar
                data-kg-card-toolbar="home-component"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="home-component"
                isVisible={isSelected && !isEditing && !showSnippetToolbar}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem dataTestId="edit-home-component" icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
                    <ToolbarMenuSeparator hide={!cardConfig?.createSnippet} />
                    <ToolbarMenuItem
                        dataTestId="create-snippet"
                        hide={!cardConfig?.createSnippet}
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
