import KoenigComposerContext from '../../../context/KoenigComposerContext.jsx';
import KoenigNestedEditor from '../../KoenigNestedEditor';
import PropTypes from 'prop-types';
import React from 'react';
import {ReadOnlyOverlay} from '../ReadOnlyOverlay';
import {SettingsPanel} from '../SettingsPanel';

// TheoR: callouts render as Home-native `[data-callout]` with a semantic type.
// The editor card is tinted per type and shows the selected Lucide icon.
export const CALLOUT_TYPE_STYLES = {
    note: 'bg-grey/10 border-transparent',
    info: 'bg-blue/10 border-transparent',
    tip: 'bg-green/10 border-transparent',
    important: 'bg-purple/10 border-transparent',
    warning: 'bg-yellow/10 border-transparent',
    danger: 'bg-red/10 border-transparent',
    quote: 'bg-grey/10 border-transparent'
};

const TEXT_BLACK = 'text-black dark:text-grey-300 caret-black dark:caret-grey-300';

// Each selectable Lucide icon maps to the callout type it represents.
export const ICON_TO_TYPE = {
    info: 'info',
    lightbulb: 'tip',
    sparkles: 'important',
    'triangle-alert': 'warning',
    'circle-x': 'danger',
    'message-square-quote': 'quote'
};

function cardStyle(type) {
    return CALLOUT_TYPE_STYLES[type] || CALLOUT_TYPE_STYLES.info;
}

export function CalloutCard({
    color = 'info',
    calloutIcon = 'info',
    calloutIcons = [],
    isEditing,
    handleTypeChange,
    textEditor,
    textEditorInitialState,
    nodeKey
}) {
    const {darkMode} = React.useContext(KoenigComposerContext);

    const effectiveIconName = calloutIcon || calloutIcons[0]?.name || 'info';
    const SelectedIcon = calloutIcons.find(i => i.name === effectiveIconName)?.Icon;

    return (
        <>
            <div className={`flex items-start rounded-md border px-7 py-5 ${cardStyle(color)}`} data-testid={`callout-bg-${color}`}>
                {SelectedIcon && (
                    <span className="mr-3 mt-1 shrink-0 text-grey-700 dark:text-grey-300" data-testid="callout-icon">
                        <SelectedIcon size={20} />
                    </span>
                )}
                <KoenigNestedEditor
                    autoFocus={true}
                    defaultKoenigEnterBehaviour={true}
                    initialEditor={textEditor}
                    initialEditorState={textEditorInitialState}
                    nodes='minimal'
                    placeholderClassName={`font-serif text-xl font-normal tracking-wide text-grey-500 !dark:text-white opacity-30`}
                    placeholderText={'Callout text...'}
                    singleParagraph={true}
                    textClassName={`!my-0 w-full whitespace-normal bg-transparent font-serif text-xl font-normal ${TEXT_BLACK}`}
                />
            </div>
            {
                isEditing ? (
                    <SettingsPanel darkMode={darkMode}>
                        <div className="flex flex-col gap-2 px-4 py-2" data-testid="callout-icon-picker">
                            <div className="text-2xs font-bold uppercase tracking-wide text-grey-700 dark:text-grey-300">Style</div>
                            <div className="flex flex-wrap gap-1">
                                {calloutIcons.map((icon) => {
                                    const Icon = icon.Icon;
                                    const isActive = icon.name === effectiveIconName;
                                    return (
                                        <button
                                            key={icon.name}
                                            aria-label={icon.label}
                                            className={`flex size-8 items-center justify-center rounded-md border text-grey-700 dark:text-grey-300 ${isActive ? 'border-green bg-green/10' : 'border-transparent hover:bg-grey-500/10'}`}
                                            data-testid={icon.dataTestId || `callout-icon-${icon.name}`}
                                            title={icon.label}
                                            type="button"
                                            onClick={() => handleTypeChange(icon.name)}
                                        >
                                            {Icon ? <Icon size={16} /> : icon.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </SettingsPanel>
                ) : (
                    <ReadOnlyOverlay />
                )
            }
        </>
    );
}

CalloutCard.propTypes = {
    color: PropTypes.string,
    calloutIcon: PropTypes.string,
    calloutIcons: PropTypes.array,
    isEditing: PropTypes.bool,
    handleTypeChange: PropTypes.func,
    textEditor: PropTypes.object,
    textEditorInitialState: PropTypes.object,
    nodeKey: PropTypes.string
};
